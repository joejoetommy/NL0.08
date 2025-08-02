import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import { UTXOManager } from '../../utils/blockchain';
import { BroadcastService } from '../../services/BroadcastService';
import { imageToBase64 } from './imageUtils';
import { calculateTransactionFee, fetchNetworkFeeRate } from './feeCalculator';
import { BlogEncryption, EncryptionLevel } from './BlogEncryption';

interface CreateInscriptionParams {
  inscriptionType: 'text' | 'image' | 'profile' | 'profile2';
  textData: string;
  imageFile: File | null;
  profileData: {
    username: string;
    title: string;
    bio: string;
    avatar: string;
  };
  profileImageFile: File | null;
  backgroundImageFile: File | null;
  encryptionLevel: EncryptionLevel;
  encryptedData: string;
  keyData: any;
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
  blogKeyHistory: any;
  currentFeeRate: number;
  lastTransactionTime: number;
}

interface CreateInscriptionResult {
  success: boolean;
  txid?: string;
  error?: string;
  message: string;
}

// Create the inscription script with proper handling for large data
export const createInscriptionScript = (
  pubKeyHash: number[], 
  contentType: string, 
  data: Uint8Array
): Script => {
  let scriptHex = '';
  
  try {
    // P2PKH locking script prefix
    scriptHex += '76a914';
    scriptHex += pubKeyHash.map(b => b.toString(16).padStart(2, '0')).join('');
    scriptHex += '88ac';
    
    // Ordinal inscription envelope
    scriptHex += '0063'; // OP_0 OP_IF
    scriptHex += '03'; // Push 3 bytes
    scriptHex += '6f7264'; // "ord"
    scriptHex += '51'; // OP_1
    
    // Content type
    const ctBytes = Utils.toArray(contentType, 'utf8');
    const ctLength = ctBytes.length;
    
    if (ctLength <= 75) {
      scriptHex += ctLength.toString(16).padStart(2, '0');
    } else if (ctLength <= 255) {
      scriptHex += '4c';
      scriptHex += ctLength.toString(16).padStart(2, '0');
    } else {
      scriptHex += '4d';
      scriptHex += (ctLength & 0xff).toString(16).padStart(2, '0');
      scriptHex += ((ctLength >> 8) & 0xff).toString(16).padStart(2, '0');
    }
    scriptHex += ctBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
    scriptHex += '00'; // OP_0
    
    // Data
    const dataArray = Array.from(data);
    const dataLength = dataArray.length;
    
    console.log(`Encoding ${dataLength} bytes of inscription data`);
    
    if (dataLength <= 75) {
      scriptHex += dataLength.toString(16).padStart(2, '0');
    } else if (dataLength <= 255) {
      scriptHex += '4c';
      scriptHex += dataLength.toString(16).padStart(2, '0');
    } else if (dataLength <= 65535) {
      scriptHex += '4d';
      scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
      scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
    } else {
      scriptHex += '4e';
      scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
      scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
      scriptHex += ((dataLength >> 16) & 0xff).toString(16).padStart(2, '0');
      scriptHex += ((dataLength >> 24) & 0xff).toString(16).padStart(2, '0');
    }
    
    // Process data in chunks to avoid memory issues
    const chunkSize = 10000;
    for (let i = 0; i < dataArray.length; i += chunkSize) {
      const chunk = dataArray.slice(i, Math.min(i + chunkSize, dataArray.length));
      scriptHex += chunk.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    scriptHex += '68'; // OP_ENDIF
    
    const script = Script.fromHex(scriptHex);
    
    console.log(`Created inscription script: ${(scriptHex.length / 2 / 1024).toFixed(2)}KB`);
    
    return script;
    
  } catch (error) {
    console.error('Error creating inscription script:', error);
    console.error('Script hex length so far:', scriptHex.length);
    throw new Error('Failed to create inscription script: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

// Main inscription creation function
export const createInscription = async (
  params: CreateInscriptionParams
): Promise<CreateInscriptionResult> => {
  const {
    inscriptionType,
    textData,
    imageFile,
    profileData,
    profileImageFile,
    backgroundImageFile,
    encryptionLevel,
    encryptedData,
    keyData,
    network,
    whatsOnChainApiKey,
    blogKeyHistory,
    currentFeeRate,
    lastTransactionTime
  } = params;

  // Validation checks
  if (!keyData.privateKey) {
    return {
      success: false,
      error: 'Please connect your wallet first',
      message: 'Wallet not connected'
    };
  }

  if (encryptionLevel > 0 && !blogKeyHistory.current) {
    return {
      success: false,
      error: 'Please generate a blog encryption key first',
      message: 'No encryption key available'
    };
  }

  if (encryptionLevel > 0 && !encryptedData) {
    return {
      success: false,
      error: 'No encrypted data available. Please wait for encryption to complete.',
      message: 'Encryption not complete'
    };
  }

  const timeSinceLastTx = Date.now() - lastTransactionTime;
  if (timeSinceLastTx < 5000) {
    return {
      success: false,
      error: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another ordinal`,
      message: 'Too soon after last transaction'
    };
  }

  try {
    let contentType: string;
    let inscriptionData: Uint8Array;

    if (encryptionLevel > 0 && encryptedData) {
      // Use the encrypted data
      contentType = 'application/json';
      inscriptionData = Utils.toArray(encryptedData, 'utf8');
      console.log(`Creating encrypted inscription, size: ${inscriptionData.length} bytes, encryption level: ${encryptionLevel}`);
    } else {
      // Non-encrypted path
      if (inscriptionType === 'text') {
        const text = textData || 'Hello, 1Sat Ordinals!';
        contentType = 'text/plain;charset=utf-8';
        inscriptionData = Utils.toArray(text, 'utf8');
      } 
      else if (inscriptionType === 'image' && imageFile) {
        const base64Data = await imageToBase64(imageFile, undefined, false, undefined, 'image');
        contentType = imageFile.type || 'image/png';
        inscriptionData = Utils.toArray(base64Data, 'base64');
        console.log(`Image inscription: ${imageFile.name}, size: ${inscriptionData.length} bytes`);
      }
      else if (inscriptionType === 'profile' || inscriptionType === 'profile2') {
        const profileDataToSave: any = {
          p: inscriptionType,
          username: profileData.username || 'Anonymous',
          title: profileData.title || 'BSV User',
          bio: profileData.bio || 'On-chain profile',
          timestamp: Date.now()
        };
        
        if (profileImageFile) {
          const base64Data = await imageToBase64(profileImageFile, undefined, false, undefined, inscriptionType);
          profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
        }
        
        if (inscriptionType === 'profile2' && backgroundImageFile) {
          const base64Data = await imageToBase64(backgroundImageFile, undefined, false, undefined, 'profile2');
          profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
        }
        
        contentType = 'application/json';
        inscriptionData = Utils.toArray(JSON.stringify(profileDataToSave), 'utf8');
      }
      else {
        return {
          success: false,
          error: 'Invalid inscription type or missing data',
          message: 'Invalid inscription configuration'
        };
      }
    }

    console.log(`Creating ${inscriptionType} inscription, size: ${inscriptionData.length} bytes`);

    // Fetch current fee rate
    const feeRate = await fetchNetworkFeeRate(network);

    // Get UTXOs
    const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
    const utxos = await utxoManager.fetchUTXOs(true);
    
    if (utxos.length === 0) {
      return {
        success: false,
        error: 'No UTXOs available. Please wait for previous transactions to confirm.',
        message: 'No UTXOs available'
      };
    }

    // Calculate fees
    let { estimatedSize, fee: estimatedFee, remainingCapacity } = calculateTransactionFee(
      1, 2, inscriptionData.length, feeRate
    );
    
    // Check transaction size - be more lenient
    if (estimatedSize > 4.99 * 1024 * 1024) {
      return {
        success: false,
        error: `Transaction size would be ${(estimatedSize / 1024 / 1024).toFixed(2)}MB, which exceeds the safe limit of 4.99MB.`,
        message: 'Transaction too large'
      };
    }
    
    // Select UTXOs
    let { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee);
    
    // Recalculate if multiple inputs needed
    if (selected.length > 1) {
      const recalc = calculateTransactionFee(selected.length, 2, inscriptionData.length, feeRate);
      estimatedFee = recalc.fee;
      
      const result = utxoManager.selectUTXOs(1 + estimatedFee);
      selected = result.selected;
      total = result.total;
    }
    
    if (selected.length === 0) {
      return {
        success: false,
        error: `Insufficient funds. Need ${1 + estimatedFee} satoshis, have ${total}`,
        message: 'Insufficient funds'
      };
    }

    console.log(`Selected ${selected.length} UTXOs, total: ${total} sats, estimated fee: ${estimatedFee} sats`);

    // Create transaction
    const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
    const publicKey = privateKey.toPublicKey();
    const address = publicKey.toAddress();
    const pubKeyHash = publicKey.toHash();

    const inscriptionScript = createInscriptionScript(pubKeyHash, contentType, inscriptionData);
    
    const tx = new Transaction();

    // Add inputs
    let totalInput = 0;
    for (const utxo of selected) {
      const txid = utxo.tx_hash || utxo.txid;
      const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.sourceOutputIndex || 0);
      const satoshis = utxo.value || utxo.satoshis || 0;
      
      totalInput += satoshis;

      if (utxo.sourceTransaction) {
        tx.addInput({
          sourceTXID: txid,
          sourceOutputIndex: utxo.sourceOutputIndex || 0,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
          sourceTransaction: utxo.sourceTransaction
        });
      } else {
        console.log(`Creating inline source for UTXO ${txid}:${vout}`);
        tx.addInput({
          sourceTXID: txid,
          sourceOutputIndex: vout,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
          sourceTransaction: {
            id: txid,
            version: 1,
            inputs: [],
            outputs: [{
              satoshis: satoshis,
              lockingScript: new P2PKH().lock(address)
            }],
            lockTime: 0
          }
        });
      }
    }

    // Add outputs
    tx.addOutput({
      lockingScript: inscriptionScript,
      satoshis: 1
    });

    const change = totalInput - 1 - estimatedFee;
    if (change > 0) {
      tx.addOutput({
        lockingScript: new P2PKH().lock(address),
        satoshis: change
      });
    } else if (change < 0) {
      return {
        success: false,
        error: `Insufficient funds for fee. Need ${Math.abs(change)} more satoshis.`,
        message: 'Insufficient funds for fee'
      };
    }

    // Sign transaction
    await tx.sign();

    const txHex = tx.toHex();
    const txSize = txHex.length / 2;
    const txSizeKB = txSize / 1000;
    const actualFeeRate = estimatedFee / txSizeKB;

    console.log('Transaction created:');
    console.log(`- Size: ${txSize} bytes (${txSizeKB.toFixed(3)}KB)`);
    console.log(`- Fee: ${estimatedFee} sats`);
    console.log(`- Actual fee rate: ${actualFeeRate.toFixed(3)} sat/KB`);
    console.log(`- Target fee rate: ${feeRate} sat/KB`);
    console.log(`- Encryption level: ${encryptionLevel}`);

    // Broadcast
    const broadcastService = new BroadcastService(network);
    const result = await broadcastService.broadcast(txHex);

    if (result.success) {
      utxoManager.markAsSpent(selected);
      
      const encryptionInfo = encryptionLevel > 0 
        ? ` (Encrypted: Level ${encryptionLevel})` 
        : '';
      
      return {
        success: true,
        txid: result.txid,
        message: `Ordinal created${encryptionInfo}! TXID: ${result.txid}`
      };
    } else {
      return {
        success: false,
        error: result.error,
        message: 'Failed to broadcast transaction'
      };
    }

  } catch (error) {
    console.error('Error creating ordinal:', error);
    
    let errorMessage = 'Failed to create ordinal';
    
    if (error instanceof Error) {
      if (error.message.includes('too many function arguments')) {
        errorMessage = 'Transaction too complex. Try reducing image sizes or removing one image.';
      } else if (error.message.includes('too large')) {
        errorMessage = error.message;
      } else if (error.message.includes('Insufficient funds')) {
        errorMessage = error.message;
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      message: 'Failed to create ordinal'
    };
  }
};



// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
// import { UTXOManager } from '../../utils/blockchain';
// import { BroadcastService } from '../../services/BroadcastService';
// import { imageToBase64 } from './imageUtils';
// import { calculateTransactionFee, fetchNetworkFeeRate } from './feeCalculator';
// import { BlogEncryption, EncryptionLevel } from './BlogEncryption';

// // Standardized transaction size limit (leaving margin for safety)
// const MAX_TX_SIZE = 4.95 * 1024 * 1024; // 4.95MB

// interface CreateInscriptionParams {
//   inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile';
//   textData: string;
//   imageFile: File | null;
//   profileData: {
//     username: string;
//     title: string;
//     bio: string;
//     avatar: string;
//   };
//   profileImageFile: File | null;
//   backgroundImageFile: File | null;
//   encryptionLevel: EncryptionLevel;
//   encryptedData: string;
//   keyData: any;
//   network: 'mainnet' | 'testnet';
//   whatsOnChainApiKey?: string;
//   blogKeyHistory: any;
//   currentFeeRate: number;
//   lastTransactionTime: number;
//   largeProfileFile?: File | null;
//   getKeySegmentForLevel?: (level: EncryptionLevel) => string | null;
// }

// interface CreateInscriptionResult {
//   success: boolean;
//   txid?: string;
//   error?: string;
//   message: string;
// }

// // Create the inscription script with proper handling for large data
// export const createInscriptionScript = (
//   pubKeyHash: number[], 
//   contentType: string, 
//   data: Uint8Array
// ): Script => {
//   let scriptHex = '';
  
//   try {
//     // P2PKH locking script prefix
//     scriptHex += '76a914';
//     scriptHex += pubKeyHash.map(b => b.toString(16).padStart(2, '0')).join('');
//     scriptHex += '88ac';
    
//     // Ordinal inscription envelope
//     scriptHex += '0063'; // OP_0 OP_IF
//     scriptHex += '03'; // Push 3 bytes
//     scriptHex += '6f7264'; // "ord"
//     scriptHex += '51'; // OP_1
    
//     // Content type
//     const ctBytes = Utils.toArray(contentType, 'utf8');
//     const ctLength = ctBytes.length;
    
//     if (ctLength <= 75) {
//       scriptHex += ctLength.toString(16).padStart(2, '0');
//     } else if (ctLength <= 255) {
//       scriptHex += '4c';
//       scriptHex += ctLength.toString(16).padStart(2, '0');
//     } else {
//       scriptHex += '4d';
//       scriptHex += (ctLength & 0xff).toString(16).padStart(2, '0');
//       scriptHex += ((ctLength >> 8) & 0xff).toString(16).padStart(2, '0');
//     }
//     scriptHex += ctBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
//     scriptHex += '00'; // OP_0
    
//     // Data
//     const dataArray = Array.from(data);
//     const dataLength = dataArray.length;
    
//     console.log(`Encoding ${dataLength} bytes of inscription data`);
    
//     if (dataLength <= 75) {
//       scriptHex += dataLength.toString(16).padStart(2, '0');
//     } else if (dataLength <= 255) {
//       scriptHex += '4c';
//       scriptHex += dataLength.toString(16).padStart(2, '0');
//     } else if (dataLength <= 65535) {
//       scriptHex += '4d';
//       scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
//       scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
//     } else {
//       scriptHex += '4e';
//       scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
//       scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
//       scriptHex += ((dataLength >> 16) & 0xff).toString(16).padStart(2, '0');
//       scriptHex += ((dataLength >> 24) & 0xff).toString(16).padStart(2, '0');
//     }
    
//     // Process data in chunks to avoid memory issues
//     const chunkSize = 10000;
//     for (let i = 0; i < dataArray.length; i += chunkSize) {
//       const chunk = dataArray.slice(i, Math.min(i + chunkSize, dataArray.length));
//       scriptHex += chunk.map(b => b.toString(16).padStart(2, '0')).join('');
//     }
    
//     scriptHex += '68'; // OP_ENDIF
    
//     const script = Script.fromHex(scriptHex);
    
//     console.log(`Created inscription script: ${(scriptHex.length / 2 / 1024).toFixed(2)}KB`);
    
//     return script;
    
//   } catch (error) {
//     console.error('Error creating inscription script:', error);
//     console.error('Script hex length so far:', scriptHex.length);
//     throw new Error('Failed to create inscription script: ' + (error instanceof Error ? error.message : 'Unknown error'));
//   }
// };

// // Main inscription creation function
// export const createInscription = async (
//   params: CreateInscriptionParams
// ): Promise<CreateInscriptionResult> => {
//   const {
//     inscriptionType,
//     textData,
//     imageFile,
//     profileData,
//     profileImageFile,
//     backgroundImageFile,
//     encryptionLevel,
//     encryptedData,
//     keyData,
//     network,
//     whatsOnChainApiKey,
//     blogKeyHistory,
//     currentFeeRate,
//     lastTransactionTime,
//     largeProfileFile,
//     getKeySegmentForLevel
//   } = params;

//   // Handle largeProfile type separately as it uses a different flow
//   if (inscriptionType === 'largeProfile') {
//     return {
//       success: false,
//       error: 'Large profile inscriptions should be created using the dedicated large profile component',
//       message: 'Use the Large Profile tab to create BCAT inscriptions'
//     };
//   }

//   // Validation checks
//   if (!keyData.privateKey) {
//     return {
//       success: false,
//       error: 'Please connect your wallet first',
//       message: 'Wallet not connected'
//     };
//   }

//   if (encryptionLevel > 0 && !blogKeyHistory.current) {
//     return {
//       success: false,
//       error: 'Please generate a blog encryption key first',
//       message: 'No encryption key available'
//     };
//   }

//   if (encryptionLevel > 0 && !encryptedData) {
//     return {
//       success: false,
//       error: 'No encrypted data available. Please wait for encryption to complete.',
//       message: 'Encryption not complete'
//     };
//   }

//   const timeSinceLastTx = Date.now() - lastTransactionTime;
//   if (timeSinceLastTx < 5000) {
//     return {
//       success: false,
//       error: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another ordinal`,
//       message: 'Too soon after last transaction'
//     };
//   }

//   try {
//     let contentType: string;
//     let inscriptionData: Uint8Array;

//     if (encryptionLevel > 0 && encryptedData) {
//       // Use the encrypted data
//       contentType = 'application/json';
//       inscriptionData = Utils.toArray(encryptedData, 'utf8');
//       console.log(`Creating encrypted inscription, size: ${inscriptionData.length} bytes, encryption level: ${encryptionLevel}`);
//     } else {
//       // Non-encrypted path
//       if (inscriptionType === 'text') {
//         const text = textData || 'Hello, 1Sat Ordinals!';
//         contentType = 'text/plain;charset=utf-8';
//         inscriptionData = Utils.toArray(text, 'utf8');
//       } 
//       else if (inscriptionType === 'image' && imageFile) {
//         const base64Data = await imageToBase64(imageFile, undefined, false, undefined, 'image');
//         contentType = imageFile.type || 'image/png';
//         inscriptionData = Utils.toArray(base64Data, 'base64');
//         console.log(`Image inscription: ${imageFile.name}, size: ${inscriptionData.length} bytes`);
//       }
//       else if (inscriptionType === 'profile' || inscriptionType === 'profile2') {
//         const profileDataToSave: any = {
//           p: inscriptionType,
//           username: profileData.username || 'Anonymous',
//           title: profileData.title || 'BSV User',
//           bio: profileData.bio || 'On-chain profile',
//           timestamp: Date.now()
//         };
        
//         if (profileImageFile) {
//           const base64Data = await imageToBase64(profileImageFile, undefined, false, undefined, inscriptionType);
//           profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
//         }
        
//         if (inscriptionType === 'profile2' && backgroundImageFile) {
//           const base64Data = await imageToBase64(backgroundImageFile, undefined, false, undefined, 'profile2');
//           profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
//         }
        
//         contentType = 'application/json';
//         inscriptionData = Utils.toArray(JSON.stringify(profileDataToSave), 'utf8');
//       }
//       else {
//         return {
//           success: false,
//           error: 'Invalid inscription type or missing data',
//           message: 'Invalid inscription configuration'
//         };
//       }
//     }

//     console.log(`Creating ${inscriptionType} inscription, size: ${inscriptionData.length} bytes`);

//     // Fetch current fee rate
//     const feeRate = await fetchNetworkFeeRate(network);

//     // Get UTXOs
//     const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//     const utxos = await utxoManager.fetchUTXOs(true);
    
//     if (utxos.length === 0) {
//       return {
//         success: false,
//         error: 'No UTXOs available. Please wait for previous transactions to confirm.',
//         message: 'No UTXOs available'
//       };
//     }

//     // Calculate fees
//     let { estimatedSize, fee: estimatedFee, remainingCapacity } = calculateTransactionFee(
//       1, 2, inscriptionData.length, feeRate
//     );
    
//     // Check transaction size against standardized limit
//     if (estimatedSize > MAX_TX_SIZE) {
//       const sizeMB = (estimatedSize / 1024 / 1024).toFixed(2);
//       const limitMB = (MAX_TX_SIZE / 1024 / 1024).toFixed(2);
      
//       // Provide helpful error message based on inscription type
//       let suggestion = '';
//       if (inscriptionType === 'image') {
//         suggestion = ' Try using a smaller image or reducing the quality.';
//       } else if (inscriptionType === 'profile2') {
//         suggestion = ' Try using smaller images for avatar and background.';
//       } else if (encryptionLevel > 0) {
//         suggestion = ' Encrypted data adds overhead. Try reducing the content size.';
//       }
      
//       return {
//         success: false,
//         error: `Transaction size would be ${sizeMB}MB, which exceeds the safe limit of ${limitMB}MB.${suggestion}`,
//         message: 'Transaction too large'
//       };
//     }
    
//     // Select UTXOs
//     let { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee);
    
//     // Recalculate if multiple inputs needed
//     if (selected.length > 1) {
//       const recalc = calculateTransactionFee(selected.length, 2, inscriptionData.length, feeRate);
//       estimatedFee = recalc.fee;
//       estimatedSize = recalc.estimatedSize;
      
//       // Re-check size with multiple inputs
//       if (estimatedSize > MAX_TX_SIZE) {
//         return {
//           success: false,
//           error: `Transaction with ${selected.length} inputs would be too large. Try sending smaller amounts first to consolidate UTXOs.`,
//           message: 'Too many inputs required'
//         };
//       }
      
//       const result = utxoManager.selectUTXOs(1 + estimatedFee);
//       selected = result.selected;
//       total = result.total;
//     }
    
//     if (selected.length === 0) {
//       return {
//         success: false,
//         error: `Insufficient funds. Need ${1 + estimatedFee} satoshis, have ${total}`,
//         message: 'Insufficient funds'
//       };
//     }

//     console.log(`Selected ${selected.length} UTXOs, total: ${total} sats, estimated fee: ${estimatedFee} sats`);

//     // Create transaction
//     const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//     const publicKey = privateKey.toPublicKey();
//     const address = publicKey.toAddress();
//     const pubKeyHash = publicKey.toHash();

//     const inscriptionScript = createInscriptionScript(pubKeyHash, contentType, inscriptionData);
    
//     const tx = new Transaction();

//     // Add inputs
//     let totalInput = 0;
//     for (const utxo of selected) {
//       const txid = utxo.tx_hash || utxo.txid;
//       const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.sourceOutputIndex || 0);
//       const satoshis = utxo.value || utxo.satoshis || 0;
      
//       totalInput += satoshis;

//       if (utxo.sourceTransaction) {
//         tx.addInput({
//           sourceTXID: txid,
//           sourceOutputIndex: utxo.sourceOutputIndex || 0,
//           unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//           sourceTransaction: utxo.sourceTransaction
//         });
//       } else {
//         console.log(`Creating inline source for UTXO ${txid}:${vout}`);
//         tx.addInput({
//           sourceTXID: txid,
//           sourceOutputIndex: vout,
//           unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//           sourceTransaction: {
//             id: txid,
//             version: 1,
//             inputs: [],
//             outputs: [{
//               satoshis: satoshis,
//               lockingScript: new P2PKH().lock(address)
//             }],
//             lockTime: 0
//           }
//         });
//       }
//     }

//     // Add outputs
//     tx.addOutput({
//       lockingScript: inscriptionScript,
//       satoshis: 1
//     });

//     const change = totalInput - 1 - estimatedFee;
//     if (change > 0) {
//       tx.addOutput({
//         lockingScript: new P2PKH().lock(address),
//         satoshis: change
//       });
//     } else if (change < 0) {
//       return {
//         success: false,
//         error: `Insufficient funds for fee. Need ${Math.abs(change)} more satoshis.`,
//         message: 'Insufficient funds for fee'
//       };
//     }

//     // Sign transaction
//     await tx.sign();

//     const txHex = tx.toHex();
//     const txSize = txHex.length / 2;
//     const txSizeKB = txSize / 1000;
//     const actualFeeRate = estimatedFee / txSizeKB;

//     console.log('Transaction created:');
//     console.log(`- Size: ${txSize} bytes (${txSizeKB.toFixed(3)}KB)`);
//     console.log(`- Fee: ${estimatedFee} sats`);
//     console.log(`- Actual fee rate: ${actualFeeRate.toFixed(3)} sat/KB`);
//     console.log(`- Target fee rate: ${feeRate} sat/KB`);
//     console.log(`- Encryption level: ${encryptionLevel}`);

//     // Final size check before broadcast
//     if (txSize > MAX_TX_SIZE) {
//       return {
//         success: false,
//         error: `Final transaction size ${(txSize / 1024 / 1024).toFixed(2)}MB exceeds limit`,
//         message: 'Transaction too large after signing'
//       };
//     }

//     // Broadcast
//     const broadcastService = new BroadcastService(network);
//     const result = await broadcastService.broadcast(txHex);

//     if (result.success) {
//       utxoManager.markAsSpent(selected);
      
//       const encryptionInfo = encryptionLevel > 0 
//         ? ` (Encrypted: Level ${encryptionLevel})` 
//         : '';
      
//       return {
//         success: true,
//         txid: result.txid,
//         message: `Ordinal created${encryptionInfo}! TXID: ${result.txid}`
//       };
//     } else {
//       return {
//         success: false,
//         error: result.error,
//         message: 'Failed to broadcast transaction'
//       };
//     }

//   } catch (error) {
//     console.error('Error creating ordinal:', error);
    
//     let errorMessage = 'Failed to create ordinal';
    
//     if (error instanceof Error) {
//       if (error.message.includes('too many function arguments')) {
//         errorMessage = 'Transaction too complex. Try reducing image sizes or removing one image.';
//       } else if (error.message.includes('too large')) {
//         errorMessage = error.message;
//       } else if (error.message.includes('Insufficient funds')) {
//         errorMessage = error.message;
//       } else {
//         errorMessage = `Error: ${error.message}`;
//       }
//     }
    
//     return {
//       success: false,
//       error: errorMessage,
//       message: 'Failed to create ordinal'
//     };
//   }
// };
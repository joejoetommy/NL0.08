import { InscriptionData } from '../components/ViewInscriptions';
import { EncryptionLevel } from './BlogEncryption';

// Fetch inscriptions from blockchain
export const fetchInscriptionsFromChain = async (
  address: string,
  network: 'mainnet' | 'testnet',
  whatsOnChainApiKey?: string
): Promise<InscriptionData[]> => {
  const headers: any = {};
  if (whatsOnChainApiKey) {
    headers['woc-api-key'] = whatsOnChainApiKey;
  }

  const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${address}/history`;
  console.log('Fetching from:', historyUrl);
  
  const historyResponse = await fetch(historyUrl, { headers });
  
  if (!historyResponse.ok) {
    throw new Error(`Failed to fetch history: ${historyResponse.status}`);
  }

  const history = await historyResponse.json();
  console.log(`Found ${history.length} transactions`);

  const foundInscriptions: InscriptionData[] = [];
  
  // Process recent transactions (limit to 30 for performance)
  for (const tx of history.slice(0, 30)) {
    try {
      const txResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
        { headers }
      );

      if (!txResponse.ok) continue;

      const txData = await txResponse.json();
      
      // Check each output for inscriptions
      for (let i = 0; i < txData.vout.length; i++) {
        const vout = txData.vout[i];
        
        // Look for 1-sat outputs (typical for inscriptions)
        if (vout.value === 0.00000001) {
          console.log(`Found 1 sat output in ${tx.tx_hash}:${i}`);
          
          const scriptHex = vout.scriptPubKey?.hex || '';
          const inscriptionData = parseInscriptionFromScript(scriptHex, tx.tx_hash, i, tx.time, txData);
          
          if (inscriptionData) {
            foundInscriptions.push(inscriptionData);
          }
        }
      }
    } catch (e) {
      console.error(`Error processing tx ${tx.tx_hash}:`, e);
    }
  }
  
  console.log(`Found ${foundInscriptions.length} inscriptions`);
  return foundInscriptions;
};

// Parse inscription data from script
const parseInscriptionFromScript = (
  scriptHex: string, 
  txid: string, 
  vout: number, 
  timestamp?: number,
  txData?: any
): InscriptionData | null => {
  let inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile' | 'unknown' = 'unknown';
  let content: any = null;
  let encrypted = false;
  let encryptionLevel: EncryptionLevel = 0;
  let bcatInfo: { chunks: string[]; metadata: any } | undefined;
  
  try {
    // Check for BCAT inscriptions (they have OP_RETURN with BCAT prefix in second output)
    if (txData && txData.vout && txData.vout.length > 1) {
      const opReturnOutput = txData.vout.find((out: any) => 
        out.scriptPubKey?.asm?.startsWith('OP_RETURN') || 
        out.scriptPubKey?.hex?.startsWith('6a')
      );
      
      if (opReturnOutput && opReturnOutput.scriptPubKey?.hex) {
        const opReturnHex = opReturnOutput.scriptPubKey.hex;
        // Check for BCAT prefix (15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up)
        const bcatPrefixHex = '313544484678575a4a5435386639336e6879476e7352427172677757344b57366834557';
        
        if (opReturnHex.includes(bcatPrefixHex)) {
          inscriptionType = 'largeProfile';
          
          // Extract chunk transaction IDs and metadata
          try {
            // Parse BCAT data from OP_RETURN
            const chunks: string[] = [];
            let metadata: any = {};
            
            // Skip OP_RETURN and BCAT prefix to get to chunk data
            // This is simplified - actual parsing would need to handle push data opcodes properly
            
            bcatInfo = { chunks, metadata };
          } catch (e) {
            console.error('Error parsing BCAT data:', e);
          }
          
          // Get thumbnail from first output if it's an inscription
          if (scriptHex.includes('746578742f706c61696e') || scriptHex.includes('696d6167652f')) {
            // Extract thumbnail data if present
            content = 'thumbnail'; // Placeholder - would extract actual thumbnail
          }
        }
      }
    }
    
    // Check for text/plain inscriptions
    if (inscriptionType === 'unknown' && scriptHex.includes('746578742f706c61696e')) { // "text/plain"
      inscriptionType = 'text';
      const textMatch = scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
      if (textMatch && textMatch[1]) {
        const hexStr = textMatch[1];
        let extractedContent = '';
        for (let i = 0; i < hexStr.length; i += 2) {
          extractedContent += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
        }
        
        // Check if it's encrypted JSON
        try {
          const parsed = JSON.parse(extractedContent);
          if (parsed.encrypted && parsed.data) {
            encrypted = true;
            encryptionLevel = parsed.metadata?.level || 0;
            content = parsed;
          } else {
            content = extractedContent;
          }
        } catch {
          // Not JSON, just plain text
          content = extractedContent;
        }
      }
    } 
    // Check for application/json inscriptions
    else if (scriptHex.includes('6170706c69636174696f6e2f6a736f6e')) { // "application/json"
      const jsonMatch = scriptHex.match(/6170706c69636174696f6e2f6a736f6e[0-9a-f]*?00([0-9a-f]+?)68/);
      if (jsonMatch && jsonMatch[1]) {
        const hexStr = jsonMatch[1];
        let jsonStr = '';
        for (let i = 0; i < hexStr.length; i += 2) {
          jsonStr += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
        }
        
        try {
          content = JSON.parse(jsonStr);
          
          // Check if it's encrypted
          if (content.encrypted && content.data) {
            encrypted = true;
            encryptionLevel = content.metadata?.level || 0;
          }
          
          // Determine profile type
          if (content.p === 'profile2' || (content.encrypted && content.originalType === 'profile2')) {
            inscriptionType = 'profile2';
          } else if (content.p === 'profile' || (content.encrypted && content.originalType === 'profile')) {
            inscriptionType = 'profile';
          } else if (content.encrypted && content.originalType === 'image') {
            inscriptionType = 'image';
          } else if (content.encrypted && content.originalType === 'text') {
            inscriptionType = 'text';
          } else {
            // Default to profile for JSON without specific type
            inscriptionType = 'profile';
          }
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          inscriptionType = 'profile';
        }
      }
    } 
    // Check for image inscriptions
    else if (scriptHex.includes('696d6167652f')) { // "image/"
      inscriptionType = 'image';
      // For images, we don't extract the full data here due to size
      // It will be fetched on-demand when viewing
    }
    
    if (inscriptionType !== 'unknown') {
      return {
        id: 0, // Will be set by the caller
        txid,
        vout,
        timestamp: new Date((timestamp || 0) * 1000 || Date.now()),
        inscriptionType,
        content,
        size: scriptHex.length / 2,
        origin: `${txid}_${vout}`,
        scriptHex,
        encrypted,
        encryptionLevel: encryptionLevel as EncryptionLevel,
        bcatInfo
      };
    }
  } catch (e) {
    console.error('Error parsing inscription:', e);
  }
  
  return null;
};

// Extract image data from script hex
export const extractImageFromScript = (scriptHex: string): { type: string; data: string } | null => {
  try {
    // Look for common image MIME types
    const imageTypes = [
      { hex: '696d6167652f706e67', type: 'image/png' },
      { hex: '696d6167652f6a706567', type: 'image/jpeg' },
      { hex: '696d6167652f6a7067', type: 'image/jpg' },
      { hex: '696d6167652f676966', type: 'image/gif' },
      { hex: '696d6167652f77656270', type: 'image/webp' }
    ];
    
    for (const imgType of imageTypes) {
      if (scriptHex.includes(imgType.hex)) {
        // Extract image data after the MIME type
        const regex = new RegExp(`${imgType.hex}[0-9a-f]*?00([0-9a-f]+?)68`);
        const match = scriptHex.match(regex);
        
        if (match && match[1]) {
          return {
            type: imgType.type,
            data: match[1]
          };
        }
      }
    }
  } catch (e) {
    console.error('Error extracting image:', e);
  }
  
  return null;
};



// import { InscriptionData } from '../components/ViewInscriptions';
// import { EncryptionLevel } from './BlogEncryption';

// // Fetch inscriptions from blockchain
// export const fetchInscriptionsFromChain = async (
//   address: string,
//   network: 'mainnet' | 'testnet',
//   whatsOnChainApiKey?: string
// ): Promise<InscriptionData[]> => {
//   const headers: any = {};
//   if (whatsOnChainApiKey) {
//     headers['woc-api-key'] = whatsOnChainApiKey;
//   }

//   const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${address}/history`;
//   console.log('Fetching from:', historyUrl);
  
//   const historyResponse = await fetch(historyUrl, { headers });
  
//   if (!historyResponse.ok) {
//     throw new Error(`Failed to fetch history: ${historyResponse.status}`);
//   }

//   const history = await historyResponse.json();
//   console.log(`Found ${history.length} transactions`);

//   const foundInscriptions: InscriptionData[] = [];
  
//   // Process recent transactions (limit to 30 for performance)
//   for (const tx of history.slice(0, 30)) {
//     try {
//       const txResponse = await fetch(
//         `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
//         { headers }
//       );

//       if (!txResponse.ok) continue;

//       const txData = await txResponse.json();
      
//       // Check each output for inscriptions
//       for (let i = 0; i < txData.vout.length; i++) {
//         const vout = txData.vout[i];
        
//         // Look for 1-sat outputs (typical for inscriptions)
//         if (vout.value === 0.00000001) {
//           console.log(`Found 1 sat output in ${tx.tx_hash}:${i}`);
          
//           const scriptHex = vout.scriptPubKey?.hex || '';
//           const inscriptionData = parseInscriptionFromScript(scriptHex, tx.tx_hash, i, tx.time, txData);
          
//           if (inscriptionData) {
//             foundInscriptions.push(inscriptionData);
//           }
//         }
//       }
//     } catch (e) {
//       console.error(`Error processing tx ${tx.tx_hash}:`, e);
//     }
//   }
  
//   console.log(`Found ${foundInscriptions.length} inscriptions`);
//   return foundInscriptions;
// };

// // Parse inscription data from script
// const parseInscriptionFromScript = (
//   scriptHex: string, 
//   txid: string, 
//   vout: number, 
//   timestamp?: number,
//   txData?: any
// ): InscriptionData | null => {
//   let inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile' | 'unknown' = 'unknown';
//   let content: any = null;
//   let encrypted = false;
//   let encryptionLevel: EncryptionLevel = 0;
//   let bcatInfo: { chunks: string[]; metadata: any } | undefined;
  
//   try {
//     // Check for BCAT inscriptions (they have OP_RETURN with BCAT prefix in second output)
//     if (txData && txData.vout && txData.vout.length > 1) {
//       const opReturnOutput = txData.vout.find((out: any) => 
//         out.scriptPubKey?.asm?.startsWith('OP_RETURN') || 
//         out.scriptPubKey?.hex?.startsWith('6a')
//       );
      
//       if (opReturnOutput && opReturnOutput.scriptPubKey?.hex) {
//         const opReturnHex = opReturnOutput.scriptPubKey.hex;
        
//         // Check for BCAT prefix "BCAT" in hex (42434154)
//         const bcatPrefixHex = '42434154';
        
//         if (opReturnHex.includes(bcatPrefixHex)) {
//           inscriptionType = 'largeProfile';
//           console.log('Found BCAT inscription in', txid);
          
//           // Parse BCAT data from OP_RETURN
//           try {
//             const chunks: string[] = [];
//             let metadata: any = {};
            
//             // Find the position of BCAT prefix
//             const bcatIndex = opReturnHex.indexOf(bcatPrefixHex);
//             if (bcatIndex > 0) {
//               // Skip OP_RETURN (6a) and BCAT prefix to get to chunk data
//               let currentPos = bcatIndex + bcatPrefixHex.length;
              
//               // Parse chunk transaction IDs (32 bytes each, preceded by push opcode 20)
//               while (currentPos < opReturnHex.length) {
//                 // Check if this is a 32-byte push (0x20)
//                 if (opReturnHex.substr(currentPos, 2) === '20' && currentPos + 2 + 64 <= opReturnHex.length) {
//                   currentPos += 2; // Skip the push opcode
                  
//                   // Extract 32 bytes (64 hex chars) and reverse for big-endian
//                   const txidHex = opReturnHex.substr(currentPos, 64);
//                   // Convert to little-endian (reverse byte order)
//                   let reversedTxid = '';
//                   for (let i = txidHex.length - 2; i >= 0; i -= 2) {
//                     reversedTxid += txidHex.substr(i, 2);
//                   }
//                   chunks.push(reversedTxid);
//                   currentPos += 64;
//                 } else {
//                   // Try to parse metadata
//                   try {
//                     // Look for push data opcode
//                     let dataLength = 0;
//                     if (currentPos + 2 <= opReturnHex.length) {
//                       const pushOpcode = opReturnHex.substr(currentPos, 2);
//                       const opcodeValue = parseInt(pushOpcode, 16);
                      
//                       if (opcodeValue <= 75) {
//                         // Direct push
//                         dataLength = opcodeValue * 2;
//                         currentPos += 2;
//                       } else if (pushOpcode === '4c' && currentPos + 4 <= opReturnHex.length) {
//                         // OP_PUSHDATA1
//                         dataLength = parseInt(opReturnHex.substr(currentPos + 2, 2), 16) * 2;
//                         currentPos += 4;
//                       }
                      
//                       if (dataLength > 0 && currentPos + dataLength <= opReturnHex.length) {
//                         const metadataHex = opReturnHex.substr(currentPos, dataLength);
//                         let metadataStr = '';
//                         for (let i = 0; i < metadataHex.length; i += 2) {
//                           metadataStr += String.fromCharCode(parseInt(metadataHex.substr(i, 2), 16));
//                         }
                        
//                         try {
//                           metadata = JSON.parse(metadataStr);
//                         } catch {
//                           // Not valid JSON metadata
//                         }
//                       }
//                     }
//                     break;
//                   } catch {
//                     break;
//                   }
//                 }
//               }
//             }
            
//             bcatInfo = { chunks, metadata };
//             console.log(`BCAT info: ${chunks.length} chunks, metadata:`, metadata);
            
//           } catch (e) {
//             console.error('Error parsing BCAT data:', e);
//             bcatInfo = { chunks: [], metadata: {} };
//           }
          
//           // Get thumbnail from first output if it's an inscription
//           if (scriptHex.includes('696d6167652f')) {
//             content = 'thumbnail'; // Will be extracted when viewing
//           }
//         }
//       }
//     }
    
//     // If not BCAT, check for other inscription types
//     if (inscriptionType === 'unknown') {
//       // Check for text/plain inscriptions
//       if (scriptHex.includes('746578742f706c61696e')) { // "text/plain"
//         inscriptionType = 'text';
        
//         // Extract text content with proper length handling
//         try {
//           // Look for the content after content-type and OP_0
//           const contentTypeIndex = scriptHex.indexOf('746578742f706c61696e');
//           if (contentTypeIndex > 0) {
//             // Skip past content type and find OP_0 (00)
//             let searchPos = contentTypeIndex + 20; // Length of "text/plain" in hex
//             const op0Index = scriptHex.indexOf('00', searchPos);
            
//             if (op0Index > 0) {
//               let dataStart = op0Index + 2; // Skip past OP_0
//               let hexStr = '';
              
//               // Check for push data opcode
//               if (dataStart + 2 <= scriptHex.length) {
//                 const pushOpcode = scriptHex.substr(dataStart, 2);
//                 const opcodeValue = parseInt(pushOpcode, 16);
                
//                 if (opcodeValue <= 75) {
//                   // Direct push
//                   const dataLength = opcodeValue * 2;
//                   dataStart += 2;
//                   if (dataStart + dataLength <= scriptHex.length) {
//                     hexStr = scriptHex.substr(dataStart, dataLength);
//                   }
//                 } else if (pushOpcode === '4c' && dataStart + 4 <= scriptHex.length) {
//                   // OP_PUSHDATA1
//                   const dataLength = parseInt(scriptHex.substr(dataStart + 2, 2), 16) * 2;
//                   dataStart += 4;
//                   if (dataStart + dataLength <= scriptHex.length) {
//                     hexStr = scriptHex.substr(dataStart, dataLength);
//                   }
//                 } else if (pushOpcode === '4d' && dataStart + 6 <= scriptHex.length) {
//                   // OP_PUSHDATA2
//                   const low = parseInt(scriptHex.substr(dataStart + 2, 2), 16);
//                   const high = parseInt(scriptHex.substr(dataStart + 4, 2), 16);
//                   const dataLength = (low + (high << 8)) * 2;
//                   dataStart += 6;
//                   if (dataStart + dataLength <= scriptHex.length) {
//                     hexStr = scriptHex.substr(dataStart, dataLength);
//                   }
//                 }
//               }
              
//               if (hexStr) {
//                 let extractedContent = '';
//                 for (let i = 0; i < hexStr.length; i += 2) {
//                   extractedContent += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
//                 }
                
//                 // Check if it's encrypted JSON
//                 try {
//                   const parsed = JSON.parse(extractedContent);
//                   if (parsed.encrypted && parsed.data) {
//                     encrypted = true;
//                     encryptionLevel = parsed.metadata?.level || 0;
//                     content = parsed;
//                   } else {
//                     content = extractedContent;
//                   }
//                 } catch {
//                   // Not JSON, just plain text
//                   content = extractedContent;
//                 }
//               }
//             }
//           }
//         } catch (e) {
//           console.error('Error parsing text inscription:', e);
//         }
//       } 
//       // Check for application/json inscriptions
//       else if (scriptHex.includes('6170706c69636174696f6e2f6a736f6e')) { // "application/json"
//         try {
//           const contentTypeIndex = scriptHex.indexOf('6170706c69636174696f6e2f6a736f6e');
//           if (contentTypeIndex > 0) {
//             // Skip past content type and find OP_0 (00)
//             let searchPos = contentTypeIndex + 34; // Length of "application/json" in hex
//             const op0Index = scriptHex.indexOf('00', searchPos);
            
//             if (op0Index > 0) {
//               let dataStart = op0Index + 2; // Skip past OP_0
//               let hexStr = '';
              
//               // Check for push data opcode
//               if (dataStart + 2 <= scriptHex.length) {
//                 const pushOpcode = scriptHex.substr(dataStart, 2);
//                 const opcodeValue = parseInt(pushOpcode, 16);
                
//                 if (opcodeValue <= 75) {
//                   // Direct push
//                   const dataLength = opcodeValue * 2;
//                   dataStart += 2;
//                   if (dataStart + dataLength <= scriptHex.length) {
//                     hexStr = scriptHex.substr(dataStart, dataLength);
//                   }
//                 } else if (pushOpcode === '4c' && dataStart + 4 <= scriptHex.length) {
//                   // OP_PUSHDATA1
//                   const dataLength = parseInt(scriptHex.substr(dataStart + 2, 2), 16) * 2;
//                   dataStart += 4;
//                   if (dataStart + dataLength <= scriptHex.length) {
//                     hexStr = scriptHex.substr(dataStart, dataLength);
//                   }
//                 } else if (pushOpcode === '4d' && dataStart + 6 <= scriptHex.length) {
//                   // OP_PUSHDATA2
//                   const low = parseInt(scriptHex.substr(dataStart + 2, 2), 16);
//                   const high = parseInt(scriptHex.substr(dataStart + 4, 2), 16);
//                   const dataLength = (low + (high << 8)) * 2;
//                   dataStart += 6;
//                   if (dataStart + dataLength <= scriptHex.length) {
//                     hexStr = scriptHex.substr(dataStart, dataLength);
//                   }
//                 }
//               }
              
//               if (hexStr) {
//                 let jsonStr = '';
//                 for (let i = 0; i < hexStr.length; i += 2) {
//                   jsonStr += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
//                 }
                
//                 try {
//                   content = JSON.parse(jsonStr);
                  
//                   // Check if it's encrypted
//                   if (content.encrypted && content.data) {
//                     encrypted = true;
//                     encryptionLevel = content.metadata?.level || 0;
//                   }
                  
//                   // Determine profile type
//                   if (content.p === 'profile2' || (content.encrypted && content.originalType === 'profile2')) {
//                     inscriptionType = 'profile2';
//                   } else if (content.p === 'profile' || (content.encrypted && content.originalType === 'profile')) {
//                     inscriptionType = 'profile';
//                   } else if (content.encrypted && content.originalType === 'image') {
//                     inscriptionType = 'image';
//                   } else if (content.encrypted && content.originalType === 'text') {
//                     inscriptionType = 'text';
//                   } else {
//                     // Default to profile for JSON without specific type
//                     inscriptionType = 'profile';
//                   }
//                 } catch (parseError) {
//                   console.error('Error parsing JSON:', parseError);
//                   inscriptionType = 'profile';
//                 }
//               }
//             }
//           }
//         } catch (e) {
//           console.error('Error parsing JSON inscription:', e);
//         }
//       } 
//       // Check for image inscriptions
//       else if (scriptHex.includes('696d6167652f')) { // "image/"
//         inscriptionType = 'image';
//         // For images, we don't extract the full data here due to size
//         // It will be fetched on-demand when viewing
//       }
//     }
    
//     if (inscriptionType !== 'unknown') {
//       return {
//         id: 0, // Will be set by the caller
//         txid,
//         vout,
//         timestamp: new Date((timestamp || 0) * 1000 || Date.now()),
//         inscriptionType,
//         content,
//         size: scriptHex.length / 2,
//         origin: `${txid}_${vout}`,
//         scriptHex,
//         encrypted,
//         encryptionLevel: encryptionLevel as EncryptionLevel,
//         bcatInfo
//       };
//     }
//   } catch (e) {
//     console.error('Error parsing inscription:', e);
//   }
  
//   return null;
// };

// // Extract image data from script hex
// export const extractImageFromScript = (scriptHex: string): { type: string; data: string } | null => {
//   try {
//     // Look for common image MIME types
//     const imageTypes = [
//       { hex: '696d6167652f706e67', type: 'image/png' },
//       { hex: '696d6167652f6a706567', type: 'image/jpeg' },
//       { hex: '696d6167652f6a7067', type: 'image/jpg' },
//       { hex: '696d6167652f676966', type: 'image/gif' },
//       { hex: '696d6167652f77656270', type: 'image/webp' }
//     ];
    
//     for (const imgType of imageTypes) {
//       if (scriptHex.includes(imgType.hex)) {
//         // Find the content type position
//         const contentTypeIndex = scriptHex.indexOf(imgType.hex);
//         if (contentTypeIndex > 0) {
//           // Skip past content type and find OP_0 (00)
//           const mimeLength = imgType.hex.length;
//           const op0Index = scriptHex.indexOf('00', contentTypeIndex + mimeLength);
          
//           if (op0Index > 0) {
//             let dataStart = op0Index + 2; // Skip past OP_0
//             let imageData = '';
            
//             // Check for push data opcode
//             if (dataStart + 2 <= scriptHex.length) {
//               const pushOpcode = scriptHex.substr(dataStart, 2);
//               const opcodeValue = parseInt(pushOpcode, 16);
              
//               if (opcodeValue <= 75) {
//                 // Direct push
//                 const dataLength = opcodeValue * 2;
//                 dataStart += 2;
//                 if (dataStart + dataLength <= scriptHex.length) {
//                   imageData = scriptHex.substr(dataStart, dataLength);
//                 }
//               } else if (pushOpcode === '4c' && dataStart + 4 <= scriptHex.length) {
//                 // OP_PUSHDATA1
//                 const dataLength = parseInt(scriptHex.substr(dataStart + 2, 2), 16) * 2;
//                 dataStart += 4;
//                 if (dataStart + dataLength <= scriptHex.length) {
//                   imageData = scriptHex.substr(dataStart, dataLength);
//                 }
//               } else if (pushOpcode === '4d' && dataStart + 6 <= scriptHex.length) {
//                 // OP_PUSHDATA2
//                 const low = parseInt(scriptHex.substr(dataStart + 2, 2), 16);
//                 const high = parseInt(scriptHex.substr(dataStart + 4, 2), 16);
//                 const dataLength = (low + (high << 8)) * 2;
//                 dataStart += 6;
//                 if (dataStart + dataLength <= scriptHex.length) {
//                   imageData = scriptHex.substr(dataStart, dataLength);
//                 }
//               } else if (pushOpcode === '4e' && dataStart + 10 <= scriptHex.length) {
//                 // OP_PUSHDATA4
//                 const b1 = parseInt(scriptHex.substr(dataStart + 2, 2), 16);
//                 const b2 = parseInt(scriptHex.substr(dataStart + 4, 2), 16);
//                 const b3 = parseInt(scriptHex.substr(dataStart + 6, 2), 16);
//                 const b4 = parseInt(scriptHex.substr(dataStart + 8, 2), 16);
//                 const dataLength = (b1 + (b2 << 8) + (b3 << 16) + (b4 << 24)) * 2;
//                 dataStart += 10;
//                 if (dataStart + dataLength <= scriptHex.length) {
//                   imageData = scriptHex.substr(dataStart, dataLength);
//                 }
//               }
//             }
            
//             if (imageData) {
//               return {
//                 type: imgType.type,
//                 data: imageData
//               };
//             }
//           }
//         }
//       }
//     }
//   } catch (e) {
//     console.error('Error extracting image:', e);
//   }
  
//   return null;
// };

// // Fetch BCAT chunk data
// export const fetchBCATChunks = async (
//   chunkTxIds: string[],
//   network: 'mainnet' | 'testnet',
//   whatsOnChainApiKey?: string
// ): Promise<ArrayBuffer> => {
//   const headers: any = {};
//   if (whatsOnChainApiKey) {
//     headers['woc-api-key'] = whatsOnChainApiKey;
//   }

//   const chunks: Uint8Array[] = [];

//   for (const txid of chunkTxIds) {
//     try {
//       const txResponse = await fetch(
//         `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${txid}`,
//         { headers }
//       );

//       if (!txResponse.ok) {
//         throw new Error(`Failed to fetch chunk ${txid}`);
//       }

//       const txData = await txResponse.json();
      
//       // Find OP_RETURN output with BCAT_PART
//       const opReturnOutput = txData.vout.find((out: any) => 
//         out.scriptPubKey?.hex?.startsWith('6a')
//       );
      
//       if (opReturnOutput && opReturnOutput.scriptPubKey?.hex) {
//         const scriptHex = opReturnOutput.scriptPubKey.hex;
        
//         // Look for BCAT_PART prefix (424341545f50415254)
//         const bcatPartHex = '424341545f50415254';
//         const bcatPartIndex = scriptHex.indexOf(bcatPartHex);
        
//         if (bcatPartIndex > 0) {
//           // Extract chunk data after BCAT_PART prefix
//           let currentPos = bcatPartIndex + bcatPartHex.length;
          
//           // Parse push data opcode to get chunk length
//           let dataLength = 0;
//           let dataStart = 0;
          
//           if (currentPos + 2 <= scriptHex.length) {
//             const pushOpcode = scriptHex.substr(currentPos, 2);
//             const opcodeValue = parseInt(pushOpcode, 16);
            
//             if (opcodeValue <= 75) {
//               // Direct push
//               dataLength = opcodeValue;
//               dataStart = currentPos + 2;
//             } else if (pushOpcode === '4c' && currentPos + 4 <= scriptHex.length) {
//               // OP_PUSHDATA1
//               dataLength = parseInt(scriptHex.substr(currentPos + 2, 2), 16);
//               dataStart = currentPos + 4;
//             } else if (pushOpcode === '4d' && currentPos + 6 <= scriptHex.length) {
//               // OP_PUSHDATA2
//               const low = parseInt(scriptHex.substr(currentPos + 2, 2), 16);
//               const high = parseInt(scriptHex.substr(currentPos + 4, 2), 16);
//               dataLength = low + (high << 8);
//               dataStart = currentPos + 6;
//             } else if (pushOpcode === '4e' && currentPos + 10 <= scriptHex.length) {
//               // OP_PUSHDATA4
//               const b1 = parseInt(scriptHex.substr(currentPos + 2, 2), 16);
//               const b2 = parseInt(scriptHex.substr(currentPos + 4, 2), 16);
//               const b3 = parseInt(scriptHex.substr(currentPos + 6, 2), 16);
//               const b4 = parseInt(scriptHex.substr(currentPos + 8, 2), 16);
//               dataLength = b1 + (b2 << 8) + (b3 << 16) + (b4 << 24);
//               dataStart = currentPos + 10;
//             }
//           }
          
//           if (dataLength > 0 && dataStart + dataLength * 2 <= scriptHex.length) {
//             const chunkHex = scriptHex.substr(dataStart, dataLength * 2);
//             const chunkBytes = new Uint8Array(dataLength);
            
//             for (let i = 0; i < dataLength; i++) {
//               chunkBytes[i] = parseInt(chunkHex.substr(i * 2, 2), 16);
//             }
            
//             chunks.push(chunkBytes);
//           }
//         }
//       }
//     } catch (e) {
//       console.error(`Error fetching chunk ${txid}:`, e);
//       throw e;
//     }
//   }

//   // Combine all chunks into single ArrayBuffer
//   const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
//   const combined = new Uint8Array(totalLength);
//   let offset = 0;
  
//   for (const chunk of chunks) {
//     combined.set(chunk, offset);
//     offset += chunk.length;
//   }

//   return combined.buffer;
// };
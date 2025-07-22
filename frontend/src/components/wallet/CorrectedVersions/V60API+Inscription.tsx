// API IS WORKING + INSCRIPTIONS ARE WORKING
// Updated again for selectable & filterable tabs 







import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../store/WalletStore';
import { UTXOManager } from '../utils/blockchain';
import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import { BroadcastService } from '../services/BroadcastService';
import { useMessageHandlers } from '../hooks/useMessageHandlers';

// Test data templates
const TEST_DATA = {
  text: { type: 'test', message: 'Hello BSV!' },
  profile: { 
    type: 'profile',
    username: 'testuser',
    title: 'BSV Developer',
    bio: 'Building on Bitcoin SV'
  },
  image: {
    type: 'image',
    name: 'test-image.png',
    description: 'Test image inscription'
  }
};

// Add these interfaces
interface InscriptionFile {
  hash: string;
  size: number;
  type: string;
}

interface Inscription {
  id: number;
  txid: string;
  vout: number;
  file: InscriptionFile;
  origin: string;
  ordinal: number;
  height: number;
  idx: number;
  lock: string;
  spend?: string;
  MAP?: any;
  B?: any;
  content?: any;
  inscriptionType?: string;
}

interface InscriptionData {
  id: number;
  txid: string;
  vout: number;
  timestamp: Date;
  inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'unknown';
  content?: any;
  size: number;
  origin: string;
  scriptHex?: string;
}

export const ProfileToken: React.FC = () => {
  const [inscriptionType, setInscriptionType] = useState<'text' | 'image' | 'profile' | 'profile2'>('text');
  const [textData, setTextData] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [profileData, setProfileData] = useState({
    username: '',
    title: '',
    bio: '',
    avatar: ''
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [transactionQueue, setTransactionQueue] = useState(false);
  const [lastTransactionTime, setLastTransactionTime] = useState(0);
  const [currentFeeRate, setCurrentFeeRate] = useState<number>(1);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
    type: null, 
    message: '' 
  });
  const [lastTxid, setLastTxid] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Add new state variables for viewing inscriptions
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
  const [inscriptions, setInscriptions] = useState<InscriptionData[]>([]);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);
  const [inscriptionError, setInscriptionError] = useState<string>('');
  const [selectedInscription, setSelectedInscription] = useState<InscriptionData | null>(null);
  const [inscriptionContent, setInscriptionContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [inscriptionFilter, setInscriptionFilter] = useState<'all' | 'text' | 'image' | 'profile' | 'profile2'>('all');

  const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();
  const { fetchOnChainMessages } = useMessageHandlers();

  // Backend proxy URL
  const BROADCAST_PROXY_URL = 'http://localhost:3001';

  // Fetch current fee rate from the network
  const fetchCurrentFeeRate = async () => {
    try {
      const defaultRateSatPerKB = 1;
      
      const response = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/fee/estimates`
      ).catch(() => null);

      if (response && response.ok) {
        const feeData = await response.json();
        const feeRatePerByte = feeData.standard || feeData.halfHour || 0.001;
        const feeRatePerKB = feeRatePerByte * 1000;
        
        const actualRate = Math.max(defaultRateSatPerKB, Math.round(feeRatePerKB));
        setCurrentFeeRate(actualRate);
        console.log(`Current network fee rate: ${actualRate} sat/KB`);
        return actualRate;
      }
    } catch (error) {
      console.log('Could not fetch fee rate, using default BSV rate');
    }
    
    const defaultRate = 1;
    setCurrentFeeRate(defaultRate);
    console.log(`Using default BSV fee rate: ${defaultRate} sat/KB`);
    return defaultRate;
  };

  // Calculate transaction size and fee based on BSV's sat/KB model
  const calculateTransactionFee = (
    numInputs: number,
    numOutputs: number,
    dataSize: number,
    feeRatePerKB: number = currentFeeRate
  ): { estimatedSize: number; fee: number } => {
    const baseSize = 10;
    const inputSize = numInputs * 148;
    const outputSize = numOutputs * 34;
    const inscriptionOverhead = 10;
    
    const totalSizeBytes = baseSize + inputSize + outputSize + inscriptionOverhead + dataSize;
    const totalSizeKB = totalSizeBytes / 1000;
    
    const fee = Math.max(1, Math.ceil(totalSizeKB * feeRatePerKB));
    
    console.log(`Transaction size calculation (BSV sat/KB model):`);
    console.log(`- Base: ${baseSize} bytes`);
    console.log(`- Inputs (${numInputs}): ${inputSize} bytes`);
    console.log(`- Outputs (${numOutputs}): ${outputSize} bytes`);
    console.log(`- Inscription data: ${dataSize} bytes`);
    console.log(`- Total size: ${totalSizeBytes} bytes (${totalSizeKB.toFixed(3)} KB)`);
    console.log(`- Fee rate: ${feeRatePerKB} sat/KB`);
    console.log(`- Total fee: ${fee} sats`);
    console.log(`- Actual rate: ${(fee / totalSizeKB).toFixed(3)} sat/KB`);
    
    return { estimatedSize: totalSizeBytes, fee };
  };

  // Add function to filter inscriptions
  const getFilteredInscriptions = () => {
    if (inscriptionFilter === 'all') {
      return inscriptions;
    }
    return inscriptions.filter(inscription => inscription.inscriptionType === inscriptionFilter);
  };

  // Fetch inscriptions using the same pattern as Conversations
  const fetchInscriptions = async () => {
    if (!keyData.address) {
      setInscriptionError('Please connect your wallet first');
      return;
    }

    setLoadingInscriptions(true);
    setInscriptionError('');
    
    try {
      const headers: any = {};
      if (whatsOnChainApiKey) {
        headers['woc-api-key'] = whatsOnChainApiKey;
      }

      // Get transaction history
      const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${keyData.address}/history`;
      console.log('Fetching from:', historyUrl);
      
      const historyResponse = await fetch(historyUrl, { headers });
      
      if (!historyResponse.ok) {
        throw new Error(`Failed to fetch history: ${historyResponse.status}`);
      }

      const history = await historyResponse.json();
      console.log(`Found ${history.length} transactions`);

      const foundInscriptions: InscriptionData[] = [];
      
      // Check recent transactions for inscriptions
      for (const tx of history.slice(0, 30)) {
        try {
          // Get full transaction data
          const txResponse = await fetch(
            `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
            { headers }
          );

          if (!txResponse.ok) continue;

          const txData = await txResponse.json();
          
          // Look for 1 satoshi outputs (inscriptions)
          for (let i = 0; i < txData.vout.length; i++) {
            const vout = txData.vout[i];
            
            // Check if this is a 1 satoshi output
            if (vout.value === 0.00000001) {
              console.log(`Found 1 sat output in ${tx.tx_hash}:${i}`);
              
              // Get the script hex
              const scriptHex = vout.scriptPubKey?.hex || '';
              
              // Determine inscription type from script
              let inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'unknown' = 'unknown';
              let content: any = null;
              
              // Check for content patterns in hex
              if (scriptHex.includes('746578742f706c61696e')) { // "text/plain"
                inscriptionType = 'text';
                // Try to extract text content
                try {
                  const textMatch = scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
                  if (textMatch && textMatch[1]) {
                    content = Buffer.from(textMatch[1], 'hex').toString('utf8');
                  }
                } catch (e) {
                  console.error('Error extracting text:', e);
                }
              } else if (scriptHex.includes('6170706c69636174696f6e2f6a736f6e')) { // "application/json"
                // Try to extract JSON content
                try {
                  const jsonMatch = scriptHex.match(/6170706c69636174696f6e2f6a736f6e[0-9a-f]*?00([0-9a-f]+?)68/);
                  if (jsonMatch && jsonMatch[1]) {
                    const jsonStr = Buffer.from(jsonMatch[1], 'hex').toString('utf8');
                    try {
                      content = JSON.parse(jsonStr);
                      
                      // IMPORTANT: Check the "p" field to determine profile type
                      if (content.p === 'profile2') {
                        inscriptionType = 'profile2';
                      } else if (content.p === 'profile') {
                        inscriptionType = 'profile';
                      } else {
                        // Default to profile for other JSON content
                        inscriptionType = 'profile';
                      }
                    } catch (parseError) {
                      console.error('Error parsing JSON:', parseError);
                      inscriptionType = 'profile'; // Default to profile for JSON
                    }
                  }
                } catch (e) {
                  console.error('Error extracting JSON:', e);
                  inscriptionType = 'profile'; // Default to profile for JSON
                }
              } else if (scriptHex.includes('696d6167652f')) { // "image/"
                inscriptionType = 'image';
                // Image data is too complex to extract here, will handle in detail view
              }
              
              foundInscriptions.push({
                id: foundInscriptions.length,
                txid: tx.tx_hash,
                vout: i,
                timestamp: new Date(tx.time * 1000 || Date.now()),
                inscriptionType,
                content,
                size: scriptHex.length / 2,
                origin: `${tx.tx_hash}_${i}`,
                scriptHex
              });
            }
          }
        } catch (e) {
          console.error(`Error processing tx ${tx.tx_hash}:`, e);
        }
      }
      
      console.log(`Found ${foundInscriptions.length} inscriptions`);
      setInscriptions(foundInscriptions);
      
    } catch (error) {
      console.error('Error fetching inscriptions:', error);
      setInscriptionError(error instanceof Error ? error.message : 'Failed to fetch inscriptions');
    } finally {
      setLoadingInscriptions(false);
    }
  };

  // Fetch inscription content details
  const fetchInscriptionContent = async (selectedInscription: InscriptionData) => {
    setLoadingContent(true);
    setSelectedInscription(selectedInscription);
    
    try {
      // If we already have content, use it
      if (selectedInscription.content) {
        setInscriptionContent(selectedInscription.content);
        setLoadingContent(false);
        return;
      }
      
      // For images or complex content, try to extract from script hex
      if (selectedInscription.scriptHex) {
        if (selectedInscription.inscriptionType === 'image') {
          // Show a message for images
          setInscriptionContent({
            type: 'image',
            message: 'Image inscription - view transaction for full data',
            txid: selectedInscription.txid
          });
        } else if (selectedInscription.inscriptionType === 'text') {
          // Try to extract text
          const textMatch = selectedInscription.scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
          if (textMatch && textMatch[1]) {
            const text = Buffer.from(textMatch[1], 'hex').toString('utf8');
            setInscriptionContent(text);
          }
        }
      }
      
      setLoadingContent(false);
    } catch (error) {
      console.error('Error fetching content:', error);
      setInscriptionContent(null);
      setLoadingContent(false);
    }
  };

  // Update timer for button
  useEffect(() => {
    if (lastTransactionTime > 0) {
      const interval = setInterval(() => {
        const timePassed = Date.now() - lastTransactionTime;
        if (timePassed >= 5000) {
          clearInterval(interval);
        }
        setStatus(prev => ({ ...prev }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lastTransactionTime]);

  // Fetch fee rate on component mount and network change
  useEffect(() => {
    fetchCurrentFeeRate();
  }, [network]);

  // Add effect to fetch inscriptions when tab changes
  useEffect(() => {
    if (activeTab === 'view' && keyData.address) {
      fetchInscriptions();
    }
  }, [activeTab, keyData.address]);

  // Handle image selection with 5MB limit
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `Image too large. Maximum size is 5MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      });
      return;
    }

    const base64Size = Math.ceil(file.size * 1.37);
    const { estimatedSize, fee } = calculateTransactionFee(1, 2, base64Size);
    
    setStatus({ 
      type: 'info', 
      message: `Image size: ${(file.size / 1024).toFixed(0)}KB. Estimated fee: ${fee} sats (${(fee / (estimatedSize / 1000)).toFixed(3)} sat/KB)` 
    });

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle profile image selection
  const handleProfileImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, isBackground: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let totalSize = file.size;
    if (inscriptionType === 'profile2') {
      if (isBackground && profileImageFile) {
        totalSize += profileImageFile.size;
      } else if (!isBackground && backgroundImageFile) {
        totalSize += backgroundImageFile.size;
      }
    }

    const maxSize = 5 * 1024 * 1024;
    if (totalSize > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `Combined images too large. Maximum total size is 5MB, current total is ${(totalSize / (1024 * 1024)).toFixed(2)}MB.` 
      });
      return;
    }

    if (isBackground) {
      setBackgroundImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    const base64Size = Math.ceil(totalSize * 1.37);
    const { estimatedSize, fee } = calculateTransactionFee(1, 2, base64Size);
    
    setStatus({ 
      type: 'info', 
      message: `Total size: ${(totalSize / 1024).toFixed(0)}KB. Estimated fee: ${fee} sats` 
    });
  };

  // Convert image to base64
  const imageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Create the inscription script
  const createInscriptionScript = (pubKeyHash: number[], contentType: string, data: Uint8Array): Script => {
    const script = new Script();
    
    script.writeBin([0x76, 0xa9, 0x14]);
    script.writeBin(pubKeyHash);
    script.writeBin([0x88, 0xac]);
    
    script.writeBin([0x00, 0x63]);
    
    script.writeBin([0x03]);
    script.writeBin([0x6f, 0x72, 0x64]);
    
    script.writeBin([0x51]);
    
    const ctBytes = Utils.toArray(contentType, 'utf8');
    if (ctBytes.length <= 75) {
      script.writeBin([ctBytes.length]);
      script.writeBin(ctBytes);
    } else {
      script.writeBin([0x4c, ctBytes.length]);
      script.writeBin(ctBytes);
    }
    
    script.writeBin([0x00]);
    
    const dataArray = Array.from(data);
    if (dataArray.length <= 75) {
      script.writeBin([dataArray.length]);
      script.writeBin(dataArray);
    } else if (dataArray.length <= 255) {
      script.writeBin([0x4c]);
      script.writeBin([dataArray.length]);
      script.writeBin(dataArray);
    } else if (dataArray.length <= 65535) {
      script.writeBin([0x4d]);
      script.writeBin([dataArray.length & 0xff]);
      script.writeBin([dataArray.length >> 8]);
      script.writeBin(dataArray);
    } else {
      script.writeBin([0x4e]);
      script.writeBin([
        dataArray.length & 0xff,
        (dataArray.length >> 8) & 0xff,
        (dataArray.length >> 16) & 0xff,
        (dataArray.length >> 24) & 0xff
      ]);
      script.writeBin(dataArray);
    }
    
    script.writeBin([0x68]);
    
    return script;
  };

  // Broadcast transaction with multiple fallback methods
  const broadcastTransaction = async (txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> => {
    const broadcastService = new BroadcastService(network);
    
    const result = await broadcastService.broadcast(txHex);
    
    if (result.success) {
      return result;
    }
    
    console.log('\n=== MANUAL BROADCAST REQUIRED ===');
    console.log('Transaction hex:');
    console.log(txHex);
    console.log('=================================\n');
    
    try {
      await navigator.clipboard.writeText(txHex);
      console.log('✓ Transaction hex copied to clipboard!');
    } catch (e) {
      console.log('Could not copy to clipboard');
    }
    
    return {
      success: false,
      error: 'Automatic broadcast failed. Transaction copied to clipboard. Click the link below to broadcast manually.'
    };
  };

  // Create ordinal inscription with proper UTXO management
  const createOrdinal = async () => {
    if (!keyData.privateKey) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    const timeSinceLastTx = Date.now() - lastTransactionTime;
    if (timeSinceLastTx < 5000) {
      setStatus({ 
        type: 'error', 
        message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another ordinal` 
      });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Preparing inscription...' });

    try {
      let contentType: string;
      let inscriptionData: Uint8Array;

      if (inscriptionType === 'text') {
        contentType = 'text/plain;charset=utf-8';
        const text = textData || 'Hello, 1Sat Ordinals!';
        inscriptionData = Utils.toArray(text, 'utf8');
      } 
      else if (inscriptionType === 'image' && imageFile) {
        contentType = imageFile.type || 'image/png';
        const base64Data = await imageToBase64(imageFile);
        inscriptionData = Utils.toArray(base64Data, 'base64');
        console.log(`Image inscription: ${imageFile.name}, size: ${inscriptionData.length} bytes`);
      }
      else if (inscriptionType === 'profile') {
        contentType = 'application/json';
        const profileDataToSave: any = {
          p: 'profile',
          username: profileData.username || 'Anonymous',
          title: profileData.title || 'BSV User',
          bio: profileData.bio || 'On-chain profile',
          timestamp: Date.now()
        };
        
        if (profileImageFile) {
          const base64Data = await imageToBase64(profileImageFile);
          profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
        }
        
        inscriptionData = Utils.toArray(JSON.stringify(profileDataToSave), 'utf8');
      }
      else if (inscriptionType === 'profile2') {
        contentType = 'application/json';
        const profileDataToSave: any = {
          p: 'profile2',
          username: profileData.username || 'Anonymous',
          title: profileData.title || 'BSV User',
          bio: profileData.bio || 'On-chain profile',
          timestamp: Date.now()
        };
        
        if (profileImageFile) {
          const base64Data = await imageToBase64(profileImageFile);
          profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
        }
        
        if (backgroundImageFile) {
          const base64Data = await imageToBase64(backgroundImageFile);
          profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
        }
        
        inscriptionData = Utils.toArray(JSON.stringify(profileDataToSave), 'utf8');
      }
      else {
        throw new Error('Invalid inscription type or missing data');
      }

      console.log(`Creating ${inscriptionType} inscription, size: ${inscriptionData.length} bytes`);

      const feeRate = await fetchCurrentFeeRate();

      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs(true);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available. Please wait for previous transactions to confirm.');
      }

      let { estimatedSize, fee: estimatedFee } = calculateTransactionFee(1, 2, inscriptionData.length, feeRate);
      
      let { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee);
      
      if (selected.length > 1) {
        const recalc = calculateTransactionFee(selected.length, 2, inscriptionData.length, feeRate);
        estimatedFee = recalc.fee;
        
        const result = utxoManager.selectUTXOs(1 + estimatedFee);
        selected = result.selected;
        total = result.total;
      }
      
      if (selected.length === 0) {
        throw new Error(`Insufficient funds. Need ${1 + estimatedFee} satoshis, have ${total}`);
      }

      console.log(`Selected ${selected.length} UTXOs, total: ${total} sats, estimated fee: ${estimatedFee} sats`);

      if (inscriptionData.length > 100000) {
        const sizeKB = (inscriptionData.length / 1024).toFixed(1);
        setStatus({
          type: 'info',
          message: `Large inscription (${sizeKB}KB). Fee: ${estimatedFee} sats at ${feeRate} sat/KB`
        });
      }

      const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
      const publicKey = privateKey.toPublicKey();
      const address = publicKey.toAddress();
      const pubKeyHash = publicKey.toHash();

      const inscriptionScript = createInscriptionScript(pubKeyHash, contentType, inscriptionData);

      const tx = new Transaction();

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
        throw new Error(`Insufficient funds for fee. Need ${Math.abs(change)} more satoshis.`);
      }

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

      setStatus({ type: 'info', message: 'Broadcasting transaction...' });
      const result = await broadcastTransaction(txHex);

      if (result.success) {
        utxoManager.markAsSpent(selected);
        
        setLastTxid(result.txid!);
        setLastTransactionTime(Date.now());
        setStatus({ 
          type: 'success', 
          message: `Ordinal created! TXID: ${result.txid}` 
        });
        
        console.log(`Inscription ID: ${result.txid}_0`);
        
        setTextData('');
        setImageFile(null);
        setImagePreview('');
        setProfileData({ username: '', title: '', bio: '', avatar: '' });
        setProfileImageFile(null);
        setProfileImagePreview('');
        setBackgroundImageFile(null);
        setBackgroundImagePreview('');
        
        setTimeout(() => {
          setStatus(prev => ({
            ...prev,
            message: prev.message + '\n\nWait at least 5 seconds before creating another ordinal.'
          }));
        }, 1000);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error creating ordinal:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create ordinal' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
        <h2 className="text-xl font-semibold text-white">1Sat Ordinals Creator</h2>
        <p className="text-sm text-gray-300 mt-1">Create text, image, or profile inscriptions on BSV</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Create Inscription
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'view'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            View My Inscriptions
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div>
          {/* Status Message */}
          {status.type && (
            <div className={`mb-4 p-3 rounded-lg ${
              status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
              status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
              'bg-blue-900 bg-opacity-50 text-blue-300'
            }`}>
              {status.message}
              {lastTxid && status.type === 'success' && (
                <div className="mt-2 space-y-1">
                  <a 
                    href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${lastTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-sm block"
                  >
                    View Transaction →
                  </a>
                  <a 
                    href={`https://1satordinals.com/inscription/${lastTxid}_0`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline text-sm block"
                  >
                    View on 1SatOrdinals →
                  </a>
                </div>
              )}
              {status.type === 'error' && status.message.includes('clipboard') && (
                <div className="mt-3 p-2 bg-gray-800 rounded">
                  <p className="text-xs text-gray-300 mb-2">Broadcast manually:</p>
                  <a 
                    href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/broadcast`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    Open WhatsOnChain Broadcast
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <div className="space-y-4">
              {/* Inscription Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Inscription Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInscriptionType('text')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inscriptionType === 'text'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    📝 Text
                  </button>
                  <button
                    onClick={() => setInscriptionType('image')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inscriptionType === 'image'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    🖼️ Image
                  </button>
                  <button
                    onClick={() => setInscriptionType('profile')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inscriptionType === 'profile'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    👤 Profile
                  </button>
                  <button
                    onClick={() => setInscriptionType('profile2')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inscriptionType === 'profile2'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    🖼️ Profile2
                  </button>
                </div>
              </div>

              {/* Text Input */}
              {inscriptionType === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Text Message</label>
                  <textarea
                    value={textData}
                    onChange={(e) => setTextData(e.target.value)}
                    placeholder="Enter your message..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    rows={4}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {textData.length} characters ({new TextEncoder().encode(textData).length} bytes)
                  </p>
                </div>
              )}

              {/* Image Upload */}
              {inscriptionType === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                  >
                    {imagePreview ? (
                      <div className="text-center">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded mb-2"
                        />
                        <p className="text-sm text-gray-400">
                          {imageFile?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Size: {((imageFile?.size || 0) / 1024).toFixed(0)}KB
                          {imageFile && imageFile.size > 1024 * 1024 &&
                            ` (${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`
                          }
                        </p>
                        <p className="text-xs text-yellow-400 mt-1">
                          Estimated fee: {(() => {
                            const base64Size = Math.ceil((imageFile?.size || 0) * 1.37);
                            const { fee } = calculateTransactionFee(1, 2, base64Size, currentFeeRate);
                            return `${fee.toLocaleString()} sats`;
                          })()}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-400">Click to upload image</p>
                        <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                      </div>
                    )}
                  </label>
                </div>
              )}

              {/* Profile Form */}
              {inscriptionType === 'profile' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      placeholder="satoshi"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      value={profileData.title}
                      onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                      placeholder="Bitcoin Creator"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Building peer-to-peer electronic cash..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleProfileImageSelect(e, false)}
                      className="hidden"
                      id="profile-avatar-upload"
                    />
                    <label
                      htmlFor="profile-avatar-upload"
                      className="block w-full p-6 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      {profileImagePreview ? (
                        <div className="text-center">
                          <img
                            src={profileImagePreview}
                            alt="Profile preview"
                            className="w-24 h-24 mx-auto rounded-full object-cover mb-2"
                          />
                          <p className="text-xs text-gray-400">
                            {profileImageFile?.name} ({((profileImageFile?.size || 0) / 1024).toFixed(0)}KB)
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-gray-400 text-sm">Upload profile image</p>
                          <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Profile2 Form with Background */}
              {inscriptionType === 'profile2' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      placeholder="satoshi"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      value={profileData.title}
                      onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                      placeholder="Bitcoin Creator"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Building peer-to-peer electronic cash..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Profile Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProfileImageSelect(e, false)}
                        className="hidden"
                        id="profile2-avatar-upload"
                      />
                      <label
                        htmlFor="profile2-avatar-upload"
                        className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                      >
                        {profileImagePreview ? (
                          <div className="text-center">
                            <img
                              src={profileImagePreview}
                              alt="Profile preview"
                              className="w-20 h-20 mx-auto rounded-full object-cover mb-1"
                            />
                            <p className="text-xs text-gray-400">
                              {((profileImageFile?.size || 0) / 1024).toFixed(0)}KB
                            </p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <p className="text-xs text-gray-400">Profile</p>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Background Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Background Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProfileImageSelect(e, true)}
                        className="hidden"
                        id="profile2-background-upload"
                      />
                      <label
                        htmlFor="profile2-background-upload"
                        className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                      >
                        {backgroundImagePreview ? (
                          <div className="text-center">
                            <img
                              src={backgroundImagePreview}
                              alt="Background preview"
                              className="w-full h-20 mx-auto object-cover rounded mb-1"
                            />
                            <p className="text-xs text-gray-400">
                              {((backgroundImageFile?.size || 0) / 1024).toFixed(0)}KB
                            </p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs text-gray-400">Background</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                  
                  {(profileImageFile || backgroundImageFile) && (
                    <div className="p-2 bg-gray-900 rounded text-xs">
                      <p className="text-gray-400">
                        Total size: {(((profileImageFile?.size || 0) + (backgroundImageFile?.size || 0)) / 1024).toFixed(0)}KB 
                        / 5120KB ({(((profileImageFile?.size || 0) + (backgroundImageFile?.size || 0)) / (5 * 1024 * 1024) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Wallet Info */}
              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Address:</span>
                  <span className="text-gray-300 font-mono text-xs">
                    {keyData.address ? `${keyData.address.substring(0, 12)}...${keyData.address.substring(keyData.address.length - 8)}` : 'Not connected'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-400">Balance:</span>
                  <span className="text-gray-300">{balance.confirmed.toLocaleString()} sats</span>
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={createOrdinal}
                disabled={loading || !keyData.privateKey || balance.confirmed < 500 || 
                  (inscriptionType === 'image' && !imageFile) ||
                  (inscriptionType === 'profile2' && !profileImageFile && !backgroundImageFile) ||
                  (Date.now() - lastTransactionTime < 5000)}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Inscription...' : 
                 (Date.now() - lastTransactionTime < 5000) ? 
                  `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
                  `Create ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`}
              </button>

              {/* Transaction Status */}
              {lastTransactionTime > 0 && (
                <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
                  <p className="text-xs text-yellow-300">
                    ⚠️ <strong>Important:</strong> Wait for your previous transaction to be picked up by miners before creating another ordinal. 
                    BSV transactions need time to propagate through the network.
                  </p>
                  {Date.now() - lastTransactionTime < 30000 && (
                    <p className="text-xs text-gray-300 mt-1">
                      Last transaction: {Math.floor((Date.now() - lastTransactionTime) / 1000)} seconds ago
                    </p>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
                <h4 className="text-sm font-medium text-blue-300 mb-1">💡 Tips:</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Text inscriptions: ~1 sat minimum</li>
                  <li>• Image fees: ~1 sat per KB</li>
                  <li>• 1MB image: ~1,000 sats</li>
                  <li>• 5MB max size: ~{Math.ceil(5 * 1024 * 1.37).toLocaleString()} sats</li>
                  <li>• Profile with images stores full data on-chain</li>
                  <li>• Profile2 supports avatar + background</li>
                  <li>• BSV fee rate: {currentFeeRate} sat/KB</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // View inscriptions tab
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
          {loadingInscriptions ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <p className="text-gray-300 mt-2">Loading inscriptions...</p>
            </div>
          ) : inscriptionError ? (
            <div className="text-center py-8">
              <p className="text-red-400">{inscriptionError}</p>
              <button
                onClick={fetchInscriptions}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Retry
              </button>
            </div>
          ) : inscriptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No inscriptions found for this address</p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Create Your First Inscription
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">
                  Your Inscriptions ({inscriptions.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={fetchInscriptions}
                    disabled={loadingInscriptions}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    {loadingInscriptions ? '🔄 Loading...' : '🔄 Refresh'}
                  </button>
                  <button
                    onClick={() => {
                      console.log('Current address:', keyData.address);
                      console.log('Network:', network);
                      fetchInscriptions();
                    }}
                    className="text-xs text-gray-400 hover:text-gray-300"
                  >
                    Debug Fetch
                  </button>
                </div>
              </div>

              {/* Inscription Type Filter */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {['all', 'text', 'image', 'profile', 'profile2'].map((type) => {
                  const count = type === 'all' 
                    ? inscriptions.length 
                    : inscriptions.filter(i => i.inscriptionType === type).length;
                  
                  return (
                    <button
                      key={type}
                      onClick={() => setInscriptionFilter(type as any)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        inscriptionFilter === type
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Inscriptions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredInscriptions().map((inscription) => (
                  <div
                    key={inscription.origin}
                    className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                    onClick={() => fetchInscriptionContent(inscription)}
                  >
                    {/* Inscription Preview */}
                    <div className="mb-3">
                      {inscription.inscriptionType === 'image' ? (
                        <div className="h-32 bg-gray-900 rounded flex flex-col items-center justify-center">
                          <span className="text-4xl mb-2">🖼️</span>
                          <span className="text-xs text-gray-400">Image Inscription</span>
                        </div>
                      ) : inscription.inscriptionType === 'profile' || inscription.inscriptionType === 'profile2' ? (
                        <div className="h-32 bg-gray-900 rounded p-3">
                          <div className="text-sm text-gray-300">
                            <p className="font-medium text-white">
                              {inscription.content?.username || 'Profile'}
                            </p>
                            <p className="text-xs mt-1">{inscription.content?.title}</p>
                            <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                              {inscription.content?.bio}
                            </p>
                            {inscription.inscriptionType === 'profile2' && inscription.content?.background && (
                              <span className="text-xs text-purple-400">📸 Has background</span>
                            )}
                          </div>
                        </div>
                      ) : inscription.inscriptionType === 'text' ? (
                        <div className="h-32 bg-gray-900 rounded p-3">
                          <p className="text-xs text-gray-400 mb-1">📝 Text</p>
                          <p className="text-sm text-gray-300 line-clamp-4">
                            {inscription.content || 'Text inscription'}
                          </p>
                        </div>
                      ) : (
                        <div className="h-32 bg-gray-900 rounded flex items-center justify-center">
                          <span className="text-gray-400">Unknown type</span>
                        </div>
                      )}
                    </div>

                    {/* Inscription Info */}
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-gray-400">
                        {inscription.txid.substring(0, 8)}...{inscription.txid.substring(inscription.txid.length - 6)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {inscription.timestamp.toLocaleDateString()} {inscription.timestamp.toLocaleTimeString()}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {inscription.inscriptionType}
                        </span>
                        <span className="text-xs text-gray-400">
                          ~{(inscription.size / 1024).toFixed(1)}KB
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Inscription Modal */}
              {selectedInscription && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
                  onClick={() => {
                    setSelectedInscription(null);
                    setInscriptionContent(null);
                  }}
                >
                  <div 
                    className="bg-gray-800 rounded-lg max-w-3xl max-h-[90vh] overflow-auto p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-medium text-white">
                        Inscription #{inscription.id}
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedInscription(null);
                          setInscriptionContent(null);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    {loadingContent ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                    ) : (
                      <div>
                        {/* Content Display */}
                        {inscription.inscriptionType === 'image' && inscriptionContent && (
                          <div className="bg-gray-900 p-4 rounded mb-4">
                            <p className="text-gray-300">{inscriptionContent.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              Image data is embedded in the transaction. View on blockchain explorer for full data.
                            </p>
                          </div>
                        )}
                        
                        {inscription.inscriptionType === 'text' && (
                          <pre className="bg-gray-900 p-4 rounded mb-4 whitespace-pre-wrap text-gray-300 text-sm">
                            {inscriptionContent || 'Loading...'}
                          </pre>
                        )}
                        
                        {(inscription.inscriptionType === 'profile' || 
                          inscription.inscriptionType === 'profile2') && inscriptionContent && (
                          <div className="bg-gray-900 p-4 rounded mb-4">
                            {inscriptionContent.avatar && (
                              <img 
                                src={inscriptionContent.avatar} 
                                alt="Avatar" 
                                className="w-24 h-24 rounded-full mb-4"
                              />
                            )}
                            <h4 className="text-lg font-medium text-white">{inscriptionContent.username}</h4>
                            <p className="text-gray-300">{inscriptionContent.title}</p>
                            <p className="text-gray-400 mt-2">{inscriptionContent.bio}</p>
                            {inscriptionContent.background && (
                              <img 
                                src={inscriptionContent.background} 
                                alt="Background" 
                                className="w-full h-32 object-cover rounded mt-4"
                              />
                            )}
                          </div>
                        )}

                        {/* Transaction Details */}
                        <div className="border-t border-gray-700 pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">TXID:</span>
                            <a
                              href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                            >
                              {inscription.txid.substring(0, 16)}...
                            </a>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Output:</span>
                            <span className="text-gray-300">{inscription.vout}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Type:</span>
                            <span className="text-gray-300">{inscription.inscriptionType}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Size:</span>
                            <span className="text-gray-300">~{(inscription.size / 1024).toFixed(2)}KB</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Created:</span>
                            <span className="text-gray-300">{inscription.timestamp.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <a
                            href={`https://1satordinals.com/inscription/${inscription.origin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                          >
                            View on 1SatOrdinals
                          </a>
                          <a
                            href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                          >
                            View Transaction
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};























































// import React, { useState, useEffect } from 'react';
// import { useWalletStore } from '../store/WalletStore';
// import { UTXOManager } from '../utils/blockchain';
// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
// import { BroadcastService } from '../services/BroadcastService';
// import { useMessageHandlers } from '../hooks/useMessageHandlers';

// // Test data templates
// const TEST_DATA = {
//   text: { type: 'test', message: 'Hello BSV!' },
//   profile: { 
//     type: 'profile',
//     username: 'testuser',
//     title: 'BSV Developer',
//     bio: 'Building on Bitcoin SV'
//   },
//   image: {
//     type: 'image',
//     name: 'test-image.png',
//     description: 'Test image inscription'
//   }
// };

// // Add these interfaces
// interface InscriptionFile {
//   hash: string;
//   size: number;
//   type: string;
// }

// interface Inscription {
//   id: number;
//   txid: string;
//   vout: number;
//   file: InscriptionFile;
//   origin: string;
//   ordinal: number;
//   height: number;
//   idx: number;
//   lock: string;
//   spend?: string;
//   MAP?: any;
//   B?: any;
//   content?: any;
//   inscriptionType?: string;
// }

// interface InscriptionData {
//   id: number;
//   txid: string;
//   vout: number;
//   timestamp: Date;
//   inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'unknown';
//   content?: any;
//   size: number;
//   origin: string;
//   scriptHex?: string;
// }

// export const ProfileToken: React.FC = () => {
//   const [inscriptionType, setInscriptionType] = useState<'text' | 'image' | 'profile' | 'profile2'>('text');
//   const [textData, setTextData] = useState('');
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [imagePreview, setImagePreview] = useState<string>('');
//   const [profileData, setProfileData] = useState({
//     username: '',
//     title: '',
//     bio: '',
//     avatar: ''
//   });
//   const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
//   const [profileImagePreview, setProfileImagePreview] = useState<string>('');
//   const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
//   const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>('');
//   const [loading, setLoading] = useState(false);
//   const [transactionQueue, setTransactionQueue] = useState(false);
//   const [lastTransactionTime, setLastTransactionTime] = useState(0);
//   const [currentFeeRate, setCurrentFeeRate] = useState<number>(1);
//   const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
//     type: null, 
//     message: '' 
//   });
//   const [lastTxid, setLastTxid] = useState('');
//   const [showAdvanced, setShowAdvanced] = useState(false);

//   // Add new state variables for viewing inscriptions
//   const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
//   const [inscriptions, setInscriptions] = useState<InscriptionData[]>([]);
//   const [loadingInscriptions, setLoadingInscriptions] = useState(false);
//   const [inscriptionError, setInscriptionError] = useState<string>('');
//   const [selectedInscription, setSelectedInscription] = useState<InscriptionData | null>(null);
//   const [inscriptionContent, setInscriptionContent] = useState<any>(null);
//   const [loadingContent, setLoadingContent] = useState(false);
//   const [inscriptionFilter, setInscriptionFilter] = useState<'all' | 'text' | 'image' | 'profile' | 'profile2'>('all');

//   const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();
//   const { fetchOnChainMessages } = useMessageHandlers();

//   // Backend proxy URL
//   const BROADCAST_PROXY_URL = 'http://localhost:3001';

//   // Fetch current fee rate from the network
//   const fetchCurrentFeeRate = async () => {
//     try {
//       const defaultRateSatPerKB = 1;
      
//       const response = await fetch(
//         `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/fee/estimates`
//       ).catch(() => null);

//       if (response && response.ok) {
//         const feeData = await response.json();
//         const feeRatePerByte = feeData.standard || feeData.halfHour || 0.001;
//         const feeRatePerKB = feeRatePerByte * 1000;
        
//         const actualRate = Math.max(defaultRateSatPerKB, Math.round(feeRatePerKB));
//         setCurrentFeeRate(actualRate);
//         console.log(`Current network fee rate: ${actualRate} sat/KB`);
//         return actualRate;
//       }
//     } catch (error) {
//       console.log('Could not fetch fee rate, using default BSV rate');
//     }
    
//     const defaultRate = 1;
//     setCurrentFeeRate(defaultRate);
//     console.log(`Using default BSV fee rate: ${defaultRate} sat/KB`);
//     return defaultRate;
//   };

//   // Calculate transaction size and fee based on BSV's sat/KB model
//   const calculateTransactionFee = (
//     numInputs: number,
//     numOutputs: number,
//     dataSize: number,
//     feeRatePerKB: number = currentFeeRate
//   ): { estimatedSize: number; fee: number } => {
//     const baseSize = 10;
//     const inputSize = numInputs * 148;
//     const outputSize = numOutputs * 34;
//     const inscriptionOverhead = 10;
    
//     const totalSizeBytes = baseSize + inputSize + outputSize + inscriptionOverhead + dataSize;
//     const totalSizeKB = totalSizeBytes / 1000;
    
//     const fee = Math.max(1, Math.ceil(totalSizeKB * feeRatePerKB));
    
//     console.log(`Transaction size calculation (BSV sat/KB model):`);
//     console.log(`- Base: ${baseSize} bytes`);
//     console.log(`- Inputs (${numInputs}): ${inputSize} bytes`);
//     console.log(`- Outputs (${numOutputs}): ${outputSize} bytes`);
//     console.log(`- Inscription data: ${dataSize} bytes`);
//     console.log(`- Total size: ${totalSizeBytes} bytes (${totalSizeKB.toFixed(3)} KB)`);
//     console.log(`- Fee rate: ${feeRatePerKB} sat/KB`);
//     console.log(`- Total fee: ${fee} sats`);
//     console.log(`- Actual rate: ${(fee / totalSizeKB).toFixed(3)} sat/KB`);
    
//     return { estimatedSize: totalSizeBytes, fee };
//   };

//   // Add function to filter inscriptions
//   const getFilteredInscriptions = () => {
//     if (inscriptionFilter === 'all') {
//       return inscriptions;
//     }
//     return inscriptions.filter(inscription => inscription.inscriptionType === inscriptionFilter);
//   };

//   // Fetch inscriptions using the same pattern as Conversations
//   const fetchInscriptions = async () => {
//     if (!keyData.address) {
//       setInscriptionError('Please connect your wallet first');
//       return;
//     }

//     setLoadingInscriptions(true);
//     setInscriptionError('');
    
//     try {
//       const headers: any = {};
//       if (whatsOnChainApiKey) {
//         headers['woc-api-key'] = whatsOnChainApiKey;
//       }

//       // Get transaction history
//       const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${keyData.address}/history`;
//       console.log('Fetching from:', historyUrl);
      
//       const historyResponse = await fetch(historyUrl, { headers });
      
//       if (!historyResponse.ok) {
//         throw new Error(`Failed to fetch history: ${historyResponse.status}`);
//       }

//       const history = await historyResponse.json();
//       console.log(`Found ${history.length} transactions`);

//       const foundInscriptions: InscriptionData[] = [];
      
//       // Check recent transactions for inscriptions
//       for (const tx of history.slice(0, 30)) {
//         try {
//           // Get full transaction data
//           const txResponse = await fetch(
//             `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
//             { headers }
//           );

//           if (!txResponse.ok) continue;

//           const txData = await txResponse.json();
          
//           // Look for 1 satoshi outputs (inscriptions)
//           for (let i = 0; i < txData.vout.length; i++) {
//             const vout = txData.vout[i];
            
//             // Check if this is a 1 satoshi output
//             if (vout.value === 0.00000001) {
//               console.log(`Found 1 sat output in ${tx.tx_hash}:${i}`);
              
//               // Get the script hex
//               const scriptHex = vout.scriptPubKey?.hex || '';
              
//               // Determine inscription type from script
//               let inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'unknown' = 'unknown';
//               let content: any = null;
              
//               // Check for content patterns in hex
//               if (scriptHex.includes('746578742f706c61696e')) { // "text/plain"
//                 inscriptionType = 'text';
//                 // Try to extract text content
//                 try {
//                   const textMatch = scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
//                   if (textMatch && textMatch[1]) {
//                     content = Buffer.from(textMatch[1], 'hex').toString('utf8');
//                   }
//                 } catch (e) {
//                   console.error('Error extracting text:', e);
//                 }
//               } else if (scriptHex.includes('6170706c69636174696f6e2f6a736f6e')) { // "application/json"
//                 // Try to extract JSON content
//                 try {
//                   const jsonMatch = scriptHex.match(/6170706c69636174696f6e2f6a736f6e[0-9a-f]*?00([0-9a-f]+?)68/);
//                   if (jsonMatch && jsonMatch[1]) {
//                     const jsonStr = Buffer.from(jsonMatch[1], 'hex').toString('utf8');
//                     try {
//                       content = JSON.parse(jsonStr);
                      
//                       // IMPORTANT: Check the "p" field to determine profile type
//                       if (content.p === 'profile2') {
//                         inscriptionType = 'profile2';
//                       } else if (content.p === 'profile') {
//                         inscriptionType = 'profile';
//                       } else {
//                         // Default to profile for other JSON content
//                         inscriptionType = 'profile';
//                       }
//                     } catch (parseError) {
//                       console.error('Error parsing JSON:', parseError);
//                       inscriptionType = 'profile'; // Default to profile for JSON
//                     }
//                   }
//                 } catch (e) {
//                   console.error('Error extracting JSON:', e);
//                   inscriptionType = 'profile'; // Default to profile for JSON
//                 }
//               } else if (scriptHex.includes('696d6167652f')) { // "image/"
//                 inscriptionType = 'image';
//                 // Image data is too complex to extract here, will handle in detail view
//               }
              
//               foundInscriptions.push({
//                 id: foundInscriptions.length,
//                 txid: tx.tx_hash,
//                 vout: i,
//                 timestamp: new Date(tx.time * 1000 || Date.now()),
//                 inscriptionType,
//                 content,
//                 size: scriptHex.length / 2,
//                 origin: `${tx.tx_hash}_${i}`,
//                 scriptHex
//               });
//             }
//           }
//         } catch (e) {
//           console.error(`Error processing tx ${tx.tx_hash}:`, e);
//         }
//       }
      
//       console.log(`Found ${foundInscriptions.length} inscriptions`);
//       setInscriptions(foundInscriptions);
      
//     } catch (error) {
//       console.error('Error fetching inscriptions:', error);
//       setInscriptionError(error instanceof Error ? error.message : 'Failed to fetch inscriptions');
//     } finally {
//       setLoadingInscriptions(false);
//     }
//   };

//   // Fetch inscription content details
//   const fetchInscriptionContent = async (selectedInscription: InscriptionData) => {
//     setLoadingContent(true);
//     setSelectedInscription(selectedInscription);
    
//     try {
//       // If we already have content, use it
//       if (selectedInscription.content) {
//         setInscriptionContent(selectedInscription.content);
//         setLoadingContent(false);
//         return;
//       }
      
//       // For images or complex content, try to extract from script hex
//       if (selectedInscription.scriptHex) {
//         if (selectedInscription.inscriptionType === 'image') {
//           // Show a message for images
//           setInscriptionContent({
//             type: 'image',
//             message: 'Image inscription - view transaction for full data',
//             txid: selectedInscription.txid
//           });
//         } else if (selectedInscription.inscriptionType === 'text') {
//           // Try to extract text
//           const textMatch = selectedInscription.scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
//           if (textMatch && textMatch[1]) {
//             const text = Buffer.from(textMatch[1], 'hex').toString('utf8');
//             setInscriptionContent(text);
//           }
//         }
//       }
      
//       setLoadingContent(false);
//     } catch (error) {
//       console.error('Error fetching content:', error);
//       setInscriptionContent(null);
//       setLoadingContent(false);
//     }
//   };

//   // Update timer for button
//   useEffect(() => {
//     if (lastTransactionTime > 0) {
//       const interval = setInterval(() => {
//         const timePassed = Date.now() - lastTransactionTime;
//         if (timePassed >= 5000) {
//           clearInterval(interval);
//         }
//         setStatus(prev => ({ ...prev }));
//       }, 1000);

//       return () => clearInterval(interval);
//     }
//   }, [lastTransactionTime]);

//   // Fetch fee rate on component mount and network change
//   useEffect(() => {
//     fetchCurrentFeeRate();
//   }, [network]);

//   // Add effect to fetch inscriptions when tab changes
//   useEffect(() => {
//     if (activeTab === 'view' && keyData.address) {
//       fetchInscriptions();
//     }
//   }, [activeTab, keyData.address]);

//   // Handle image selection with 5MB limit
//   const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const maxSize = 5 * 1024 * 1024;
//     if (file.size > maxSize) {
//       setStatus({ 
//         type: 'error', 
//         message: `Image too large. Maximum size is 5MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
//       });
//       return;
//     }

//     const base64Size = Math.ceil(file.size * 1.37);
//     const { estimatedSize, fee } = calculateTransactionFee(1, 2, base64Size);
    
//     setStatus({ 
//       type: 'info', 
//       message: `Image size: ${(file.size / 1024).toFixed(0)}KB. Estimated fee: ${fee} sats (${(fee / (estimatedSize / 1000)).toFixed(3)} sat/KB)` 
//     });

//     setImageFile(file);

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       setImagePreview(e.target?.result as string);
//     };
//     reader.readAsDataURL(file);
//   };

//   // Handle profile image selection
//   const handleProfileImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, isBackground: boolean = false) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     let totalSize = file.size;
//     if (inscriptionType === 'profile2') {
//       if (isBackground && profileImageFile) {
//         totalSize += profileImageFile.size;
//       } else if (!isBackground && backgroundImageFile) {
//         totalSize += backgroundImageFile.size;
//       }
//     }

//     const maxSize = 5 * 1024 * 1024;
//     if (totalSize > maxSize) {
//       setStatus({ 
//         type: 'error', 
//         message: `Combined images too large. Maximum total size is 5MB, current total is ${(totalSize / (1024 * 1024)).toFixed(2)}MB.` 
//       });
//       return;
//     }

//     if (isBackground) {
//       setBackgroundImageFile(file);
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         setBackgroundImagePreview(e.target?.result as string);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       setProfileImageFile(file);
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         setProfileImagePreview(e.target?.result as string);
//       };
//       reader.readAsDataURL(file);
//     }

//     const base64Size = Math.ceil(totalSize * 1.37);
//     const { estimatedSize, fee } = calculateTransactionFee(1, 2, base64Size);
    
//     setStatus({ 
//       type: 'info', 
//       message: `Total size: ${(totalSize / 1024).toFixed(0)}KB. Estimated fee: ${fee} sats` 
//     });
//   };

//   // Convert image to base64
//   const imageToBase64 = (file: File): Promise<string> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = () => {
//         const base64 = reader.result as string;
//         const base64Data = base64.split(',')[1];
//         resolve(base64Data);
//       };
//       reader.onerror = reject;
//       reader.readAsDataURL(file);
//     });
//   };

//   // Create the inscription script
//   const createInscriptionScript = (pubKeyHash: number[], contentType: string, data: Uint8Array): Script => {
//     const script = new Script();
    
//     script.writeBin([0x76, 0xa9, 0x14]);
//     script.writeBin(pubKeyHash);
//     script.writeBin([0x88, 0xac]);
    
//     script.writeBin([0x00, 0x63]);
    
//     script.writeBin([0x03]);
//     script.writeBin([0x6f, 0x72, 0x64]);
    
//     script.writeBin([0x51]);
    
//     const ctBytes = Utils.toArray(contentType, 'utf8');
//     if (ctBytes.length <= 75) {
//       script.writeBin([ctBytes.length]);
//       script.writeBin(ctBytes);
//     } else {
//       script.writeBin([0x4c, ctBytes.length]);
//       script.writeBin(ctBytes);
//     }
    
//     script.writeBin([0x00]);
    
//     const dataArray = Array.from(data);
//     if (dataArray.length <= 75) {
//       script.writeBin([dataArray.length]);
//       script.writeBin(dataArray);
//     } else if (dataArray.length <= 255) {
//       script.writeBin([0x4c]);
//       script.writeBin([dataArray.length]);
//       script.writeBin(dataArray);
//     } else if (dataArray.length <= 65535) {
//       script.writeBin([0x4d]);
//       script.writeBin([dataArray.length & 0xff]);
//       script.writeBin([dataArray.length >> 8]);
//       script.writeBin(dataArray);
//     } else {
//       script.writeBin([0x4e]);
//       script.writeBin([
//         dataArray.length & 0xff,
//         (dataArray.length >> 8) & 0xff,
//         (dataArray.length >> 16) & 0xff,
//         (dataArray.length >> 24) & 0xff
//       ]);
//       script.writeBin(dataArray);
//     }
    
//     script.writeBin([0x68]);
    
//     return script;
//   };

//   // Broadcast transaction with multiple fallback methods
//   const broadcastTransaction = async (txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> => {
//     const broadcastService = new BroadcastService(network);
    
//     const result = await broadcastService.broadcast(txHex);
    
//     if (result.success) {
//       return result;
//     }
    
//     console.log('\n=== MANUAL BROADCAST REQUIRED ===');
//     console.log('Transaction hex:');
//     console.log(txHex);
//     console.log('=================================\n');
    
//     try {
//       await navigator.clipboard.writeText(txHex);
//       console.log('✓ Transaction hex copied to clipboard!');
//     } catch (e) {
//       console.log('Could not copy to clipboard');
//     }
    
//     return {
//       success: false,
//       error: 'Automatic broadcast failed. Transaction copied to clipboard. Click the link below to broadcast manually.'
//     };
//   };

//   // Create ordinal inscription with proper UTXO management
//   const createOrdinal = async () => {
//     if (!keyData.privateKey) {
//       setStatus({ type: 'error', message: 'Please connect your wallet first' });
//       return;
//     }

//     const timeSinceLastTx = Date.now() - lastTransactionTime;
//     if (timeSinceLastTx < 5000) {
//       setStatus({ 
//         type: 'error', 
//         message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another ordinal` 
//       });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Preparing inscription...' });

//     try {
//       let contentType: string;
//       let inscriptionData: Uint8Array;

//       if (inscriptionType === 'text') {
//         contentType = 'text/plain;charset=utf-8';
//         const text = textData || 'Hello, 1Sat Ordinals!';
//         inscriptionData = Utils.toArray(text, 'utf8');
//       } 
//       else if (inscriptionType === 'image' && imageFile) {
//         contentType = imageFile.type || 'image/png';
//         const base64Data = await imageToBase64(imageFile);
//         inscriptionData = Utils.toArray(base64Data, 'base64');
//         console.log(`Image inscription: ${imageFile.name}, size: ${inscriptionData.length} bytes`);
//       }
//       else if (inscriptionType === 'profile') {
//         contentType = 'application/json';
//         const profileDataToSave: any = {
//           p: 'profile',
//           username: profileData.username || 'Anonymous',
//           title: profileData.title || 'BSV User',
//           bio: profileData.bio || 'On-chain profile',
//           timestamp: Date.now()
//         };
        
//         if (profileImageFile) {
//           const base64Data = await imageToBase64(profileImageFile);
//           profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
//         }
        
//         inscriptionData = Utils.toArray(JSON.stringify(profileDataToSave), 'utf8');
//       }
//       else if (inscriptionType === 'profile2') {
//         contentType = 'application/json';
//         const profileDataToSave: any = {
//           p: 'profile2',
//           username: profileData.username || 'Anonymous',
//           title: profileData.title || 'BSV User',
//           bio: profileData.bio || 'On-chain profile',
//           timestamp: Date.now()
//         };
        
//         if (profileImageFile) {
//           const base64Data = await imageToBase64(profileImageFile);
//           profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
//         }
        
//         if (backgroundImageFile) {
//           const base64Data = await imageToBase64(backgroundImageFile);
//           profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
//         }
        
//         inscriptionData = Utils.toArray(JSON.stringify(profileDataToSave), 'utf8');
//       }
//       else {
//         throw new Error('Invalid inscription type or missing data');
//       }

//       console.log(`Creating ${inscriptionType} inscription, size: ${inscriptionData.length} bytes`);

//       const feeRate = await fetchCurrentFeeRate();

//       const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//       const utxos = await utxoManager.fetchUTXOs(true);
      
//       if (utxos.length === 0) {
//         throw new Error('No UTXOs available. Please wait for previous transactions to confirm.');
//       }

//       let { estimatedSize, fee: estimatedFee } = calculateTransactionFee(1, 2, inscriptionData.length, feeRate);
      
//       let { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee);
      
//       if (selected.length > 1) {
//         const recalc = calculateTransactionFee(selected.length, 2, inscriptionData.length, feeRate);
//         estimatedFee = recalc.fee;
        
//         const result = utxoManager.selectUTXOs(1 + estimatedFee);
//         selected = result.selected;
//         total = result.total;
//       }
      
//       if (selected.length === 0) {
//         throw new Error(`Insufficient funds. Need ${1 + estimatedFee} satoshis, have ${total}`);
//       }

//       console.log(`Selected ${selected.length} UTXOs, total: ${total} sats, estimated fee: ${estimatedFee} sats`);

//       if (inscriptionData.length > 100000) {
//         const sizeKB = (inscriptionData.length / 1024).toFixed(1);
//         setStatus({
//           type: 'info',
//           message: `Large inscription (${sizeKB}KB). Fee: ${estimatedFee} sats at ${feeRate} sat/KB`
//         });
//       }

//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const publicKey = privateKey.toPublicKey();
//       const address = publicKey.toAddress();
//       const pubKeyHash = publicKey.toHash();

//       const inscriptionScript = createInscriptionScript(pubKeyHash, contentType, inscriptionData);

//       const tx = new Transaction();

//       let totalInput = 0;
//       for (const utxo of selected) {
//         const txid = utxo.tx_hash || utxo.txid;
//         const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.sourceOutputIndex || 0);
//         const satoshis = utxo.value || utxo.satoshis || 0;
        
//         totalInput += satoshis;

//         if (utxo.sourceTransaction) {
//           tx.addInput({
//             sourceTXID: txid,
//             sourceOutputIndex: utxo.sourceOutputIndex || 0,
//             unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//             sourceTransaction: utxo.sourceTransaction
//           });
//         } else {
//           console.log(`Creating inline source for UTXO ${txid}:${vout}`);
//           tx.addInput({
//             sourceTXID: txid,
//             sourceOutputIndex: vout,
//             unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//             sourceTransaction: {
//               id: txid,
//               version: 1,
//               inputs: [],
//               outputs: [{
//                 satoshis: satoshis,
//                 lockingScript: new P2PKH().lock(address)
//               }],
//               lockTime: 0
//             }
//           });
//         }
//       }

//       tx.addOutput({
//         lockingScript: inscriptionScript,
//         satoshis: 1
//       });

//       const change = totalInput - 1 - estimatedFee;
//       if (change > 0) {
//         tx.addOutput({
//           lockingScript: new P2PKH().lock(address),
//           satoshis: change
//         });
//       } else if (change < 0) {
//         throw new Error(`Insufficient funds for fee. Need ${Math.abs(change)} more satoshis.`);
//       }

//       await tx.sign();

//       const txHex = tx.toHex();
//       const txSize = txHex.length / 2;
//       const txSizeKB = txSize / 1000;
//       const actualFeeRate = estimatedFee / txSizeKB;

//       console.log('Transaction created:');
//       console.log(`- Size: ${txSize} bytes (${txSizeKB.toFixed(3)}KB)`);
//       console.log(`- Fee: ${estimatedFee} sats`);
//       console.log(`- Actual fee rate: ${actualFeeRate.toFixed(3)} sat/KB`);
//       console.log(`- Target fee rate: ${feeRate} sat/KB`);

//       setStatus({ type: 'info', message: 'Broadcasting transaction...' });
//       const result = await broadcastTransaction(txHex);

//       if (result.success) {
//         utxoManager.markAsSpent(selected);
        
//         setLastTxid(result.txid!);
//         setLastTransactionTime(Date.now());
//         setStatus({ 
//           type: 'success', 
//           message: `Ordinal created! TXID: ${result.txid}` 
//         });
        
//         console.log(`Inscription ID: ${result.txid}_0`);
        
//         setTextData('');
//         setImageFile(null);
//         setImagePreview('');
//         setProfileData({ username: '', title: '', bio: '', avatar: '' });
//         setProfileImageFile(null);
//         setProfileImagePreview('');
//         setBackgroundImageFile(null);
//         setBackgroundImagePreview('');
        
//         setTimeout(() => {
//           setStatus(prev => ({
//             ...prev,
//             message: prev.message + '\n\nWait at least 5 seconds before creating another ordinal.'
//           }));
//         }, 1000);
//       } else {
//         throw new Error(result.error);
//       }

//     } catch (error) {
//       console.error('Error creating ordinal:', error);
//       setStatus({ 
//         type: 'error', 
//         message: error instanceof Error ? error.message : 'Failed to create ordinal' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div>
//       <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
//         <h2 className="text-xl font-semibold text-white">1Sat Ordinals Creator</h2>
//         <p className="text-sm text-gray-300 mt-1">Create text, image, or profile inscriptions on BSV</p>
//       </div>

//       {/* Tab Navigation */}
//       <div className="mb-4">
//         <div className="flex gap-2">
//           <button
//             onClick={() => setActiveTab('create')}
//             className={`px-6 py-2 rounded-lg font-medium transition-all ${
//               activeTab === 'create'
//                 ? 'bg-purple-500 text-white'
//                 : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//             }`}
//           >
//             Create Inscription
//           </button>
//           <button
//             onClick={() => setActiveTab('view')}
//             className={`px-6 py-2 rounded-lg font-medium transition-all ${
//               activeTab === 'view'
//                 ? 'bg-purple-500 text-white'
//                 : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//             }`}
//           >
//             View My Inscriptions
//           </button>
//         </div>
//       </div>

//       {activeTab === 'create' ? (
//         <div>
//           {/* Status Message */}
//           {status.type && (
//             <div className={`mb-4 p-3 rounded-lg ${
//               status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
//               status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
//               'bg-blue-900 bg-opacity-50 text-blue-300'
//             }`}>
//               {status.message}
//               {lastTxid && status.type === 'success' && (
//                 <div className="mt-2 space-y-1">
//                   <a 
//                     href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${lastTxid}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="text-blue-400 hover:text-blue-300 underline text-sm block"
//                   >
//                     View Transaction →
//                   </a>
//                   <a 
//                     href={`https://1satordinals.com/inscription/${lastTxid}_0`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="text-purple-400 hover:text-purple-300 underline text-sm block"
//                   >
//                     View on 1SatOrdinals →
//                   </a>
//                 </div>
//               )}
//               {status.type === 'error' && status.message.includes('clipboard') && (
//                 <div className="mt-3 p-2 bg-gray-800 rounded">
//                   <p className="text-xs text-gray-300 mb-2">Broadcast manually:</p>
//                   <a 
//                     href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/broadcast`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
//                   >
//                     Open WhatsOnChain Broadcast
//                     <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
//                     </svg>
//                   </a>
//                 </div>
//               )}
//             </div>
//           )}

//           <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//             <div className="space-y-4">
//               {/* Inscription Type Selection */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-300 mb-2">Inscription Type</label>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => setInscriptionType('text')}
//                     className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                       inscriptionType === 'text'
//                         ? 'bg-purple-500 text-white'
//                         : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                     }`}
//                   >
//                     📝 Text
//                   </button>
//                   <button
//                     onClick={() => setInscriptionType('image')}
//                     className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                       inscriptionType === 'image'
//                         ? 'bg-purple-500 text-white'
//                         : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                     }`}
//                   >
//                     🖼️ Image
//                   </button>
//                   <button
//                     onClick={() => setInscriptionType('profile')}
//                     className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                       inscriptionType === 'profile'
//                         ? 'bg-purple-500 text-white'
//                         : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                     }`}
//                   >
//                     👤 Profile
//                   </button>
//                   <button
//                     onClick={() => setInscriptionType('profile2')}
//                     className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                       inscriptionType === 'profile2'
//                         ? 'bg-purple-500 text-white'
//                         : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                     }`}
//                   >
//                     🖼️ Profile2
//                   </button>
//                 </div>
//               </div>

//               {/* Text Input */}
//               {inscriptionType === 'text' && (
//                 <div>
//                   <label className="block text-sm font-medium text-gray-300 mb-2">Text Message</label>
//                   <textarea
//                     value={textData}
//                     onChange={(e) => setTextData(e.target.value)}
//                     placeholder="Enter your message..."
//                     className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     rows={4}
//                   />
//                   <p className="text-xs text-gray-400 mt-1">
//                     {textData.length} characters ({new TextEncoder().encode(textData).length} bytes)
//                   </p>
//                 </div>
//               )}

//               {/* Image Upload */}
//               {inscriptionType === 'image' && (
//                 <div>
//                   <label className="block text-sm font-medium text-gray-300 mb-2">Select Image</label>
//                   <input
//                     type="file"
//                     accept="image/*"
//                     onChange={handleImageSelect}
//                     className="hidden"
//                     id="image-upload"
//                   />
//                   <label
//                     htmlFor="image-upload"
//                     className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                   >
//                     {imagePreview ? (
//                       <div className="text-center">
//                         <img
//                           src={imagePreview}
//                           alt="Preview"
//                           className="max-h-48 mx-auto rounded mb-2"
//                         />
//                         <p className="text-sm text-gray-400">
//                           {imageFile?.name}
//                         </p>
//                         <p className="text-xs text-gray-500">
//                           Size: {((imageFile?.size || 0) / 1024).toFixed(0)}KB
//                           {imageFile && imageFile.size > 1024 * 1024 &&
//                             ` (${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`
//                           }
//                         </p>
//                         <p className="text-xs text-yellow-400 mt-1">
//                           Estimated fee: {(() => {
//                             const base64Size = Math.ceil((imageFile?.size || 0) * 1.37);
//                             const { fee } = calculateTransactionFee(1, 2, base64Size, currentFeeRate);
//                             return `${fee.toLocaleString()} sats`;
//                           })()}
//                         </p>
//                       </div>
//                     ) : (
//                       <div className="text-center">
//                         <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                         </svg>
//                         <p className="text-gray-400">Click to upload image</p>
//                         <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
//                       </div>
//                     )}
//                   </label>
//                 </div>
//               )}

//               {/* Profile Form */}
//               {inscriptionType === 'profile' && (
//                 <div className="space-y-3">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
//                     <input
//                       type="text"
//                       value={profileData.username}
//                       onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
//                       placeholder="satoshi"
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
//                     <input
//                       type="text"
//                       value={profileData.title}
//                       onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
//                       placeholder="Bitcoin Creator"
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
//                     <textarea
//                       value={profileData.bio}
//                       onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
//                       placeholder="Building peer-to-peer electronic cash..."
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                       rows={3}
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image</label>
//                     <input
//                       type="file"
//                       accept="image/*"
//                       onChange={(e) => handleProfileImageSelect(e, false)}
//                       className="hidden"
//                       id="profile-avatar-upload"
//                     />
//                     <label
//                       htmlFor="profile-avatar-upload"
//                       className="block w-full p-6 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                     >
//                       {profileImagePreview ? (
//                         <div className="text-center">
//                           <img
//                             src={profileImagePreview}
//                             alt="Profile preview"
//                             className="w-24 h-24 mx-auto rounded-full object-cover mb-2"
//                           />
//                           <p className="text-xs text-gray-400">
//                             {profileImageFile?.name} ({((profileImageFile?.size || 0) / 1024).toFixed(0)}KB)
//                           </p>
//                         </div>
//                       ) : (
//                         <div className="text-center">
//                           <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                           </svg>
//                           <p className="text-gray-400 text-sm">Upload profile image</p>
//                           <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
//                         </div>
//                       )}
//                     </label>
//                   </div>
//                 </div>
//               )}

//               {/* Profile2 Form with Background */}
//               {inscriptionType === 'profile2' && (
//                 <div className="space-y-3">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
//                     <input
//                       type="text"
//                       value={profileData.username}
//                       onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
//                       placeholder="satoshi"
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
//                     <input
//                       type="text"
//                       value={profileData.title}
//                       onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
//                       placeholder="Bitcoin Creator"
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
//                     <textarea
//                       value={profileData.bio}
//                       onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
//                       placeholder="Building peer-to-peer electronic cash..."
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                       rows={3}
//                     />
//                   </div>
                  
//                   <div className="grid grid-cols-2 gap-3">
//                     {/* Profile Image */}
//                     <div>
//                       <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image</label>
//                       <input
//                         type="file"
//                         accept="image/*"
//                         onChange={(e) => handleProfileImageSelect(e, false)}
//                         className="hidden"
//                         id="profile2-avatar-upload"
//                       />
//                       <label
//                         htmlFor="profile2-avatar-upload"
//                         className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                       >
//                         {profileImagePreview ? (
//                           <div className="text-center">
//                             <img
//                               src={profileImagePreview}
//                               alt="Profile preview"
//                               className="w-20 h-20 mx-auto rounded-full object-cover mb-1"
//                             />
//                             <p className="text-xs text-gray-400">
//                               {((profileImageFile?.size || 0) / 1024).toFixed(0)}KB
//                             </p>
//                           </div>
//                         ) : (
//                           <div className="text-center">
//                             <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                             </svg>
//                             <p className="text-xs text-gray-400">Profile</p>
//                           </div>
//                         )}
//                       </label>
//                     </div>

//                     {/* Background Image */}
//                     <div>
//                       <label className="block text-sm font-medium text-gray-300 mb-2">Background Image</label>
//                       <input
//                         type="file"
//                         accept="image/*"
//                         onChange={(e) => handleProfileImageSelect(e, true)}
//                         className="hidden"
//                         id="profile2-background-upload"
//                       />
//                       <label
//                         htmlFor="profile2-background-upload"
//                         className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                       >
//                         {backgroundImagePreview ? (
//                           <div className="text-center">
//                             <img
//                               src={backgroundImagePreview}
//                               alt="Background preview"
//                               className="w-full h-20 mx-auto object-cover rounded mb-1"
//                             />
//                             <p className="text-xs text-gray-400">
//                               {((backgroundImageFile?.size || 0) / 1024).toFixed(0)}KB
//                             </p>
//                           </div>
//                         ) : (
//                           <div className="text-center">
//                             <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                             </svg>
//                             <p className="text-xs text-gray-400">Background</p>
//                           </div>
//                         )}
//                       </label>
//                     </div>
//                   </div>
                  
//                   {(profileImageFile || backgroundImageFile) && (
//                     <div className="p-2 bg-gray-900 rounded text-xs">
//                       <p className="text-gray-400">
//                         Total size: {(((profileImageFile?.size || 0) + (backgroundImageFile?.size || 0)) / 1024).toFixed(0)}KB 
//                         / 5120KB ({(((profileImageFile?.size || 0) + (backgroundImageFile?.size || 0)) / (5 * 1024 * 1024) * 100).toFixed(1)}%)
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Wallet Info */}
//               <div className="p-3 bg-gray-800 rounded-lg">
//                 <div className="flex justify-between items-center text-sm">
//                   <span className="text-gray-400">Address:</span>
//                   <span className="text-gray-300 font-mono text-xs">
//                     {keyData.address ? `${keyData.address.substring(0, 12)}...${keyData.address.substring(keyData.address.length - 8)}` : 'Not connected'}
//                   </span>
//                 </div>
//                 <div className="flex justify-between items-center text-sm mt-2">
//                   <span className="text-gray-400">Balance:</span>
//                   <span className="text-gray-300">{balance.confirmed.toLocaleString()} sats</span>
//                 </div>
//               </div>

//               {/* Create Button */}
//               <button
//                 onClick={createOrdinal}
//                 disabled={loading || !keyData.privateKey || balance.confirmed < 500 || 
//                   (inscriptionType === 'image' && !imageFile) ||
//                   (inscriptionType === 'profile2' && !profileImageFile && !backgroundImageFile) ||
//                   (Date.now() - lastTransactionTime < 5000)}
//                 className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {loading ? 'Creating Inscription...' : 
//                  (Date.now() - lastTransactionTime < 5000) ? 
//                   `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
//                   `Create ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`}
//               </button>

//               {/* Transaction Status */}
//               {lastTransactionTime > 0 && (
//                 <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
//                   <p className="text-xs text-yellow-300">
//                     ⚠️ <strong>Important:</strong> Wait for your previous transaction to be picked up by miners before creating another ordinal. 
//                     BSV transactions need time to propagate through the network.
//                   </p>
//                   {Date.now() - lastTransactionTime < 30000 && (
//                     <p className="text-xs text-gray-300 mt-1">
//                       Last transaction: {Math.floor((Date.now() - lastTransactionTime) / 1000)} seconds ago
//                     </p>
//                   )}
//                 </div>
//               )}

//               {/* Info Box */}
//               <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//                 <h4 className="text-sm font-medium text-blue-300 mb-1">💡 Tips:</h4>
//                 <ul className="text-xs text-gray-300 space-y-1">
//                   <li>• Text inscriptions: ~1 sat minimum</li>
//                   <li>• Image fees: ~1 sat per KB</li>
//                   <li>• 1MB image: ~1,000 sats</li>
//                   <li>• 5MB max size: ~{Math.ceil(5 * 1024 * 1.37).toLocaleString()} sats</li>
//                   <li>• Profile with images stores full data on-chain</li>
//                   <li>• Profile2 supports avatar + background</li>
//                   <li>• BSV fee rate: {currentFeeRate} sat/KB</li>
//                 </ul>
//               </div>
//             </div>
//           </div>
//         </div>
//       ) : (
//         // View inscriptions tab
//         <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//           {loadingInscriptions ? (
//             <div className="text-center py-8">
//               <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
//               <p className="text-gray-300 mt-2">Loading inscriptions...</p>
//             </div>
//           ) : inscriptionError ? (
//             <div className="text-center py-8">
//               <p className="text-red-400">{inscriptionError}</p>
//               <button
//                 onClick={fetchInscriptions}
//                 className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
//               >
//                 Retry
//               </button>
//             </div>
//           ) : inscriptions.length === 0 ? (
//             <div className="text-center py-8">
//               <p className="text-gray-400">No inscriptions found for this address</p>
//               <button
//                 onClick={() => setActiveTab('create')}
//                 className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
//               >
//                 Create Your First Inscription
//               </button>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-medium text-white">
//                   Your Inscriptions ({inscriptions.length})
//                 </h3>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={fetchInscriptions}
//                     disabled={loadingInscriptions}
//                     className="text-sm text-purple-400 hover:text-purple-300"
//                   >
//                     {loadingInscriptions ? '🔄 Loading...' : '🔄 Refresh'}
//                   </button>
//                   <button
//                     onClick={() => {
//                       console.log('Current address:', keyData.address);
//                       console.log('Network:', network);
//                       fetchInscriptions();
//                     }}
//                     className="text-xs text-gray-400 hover:text-gray-300"
//                   >
//                     Debug Fetch
//                   </button>
//                 </div>
//               </div>

//               {/* Inscription Type Filter */}
//               <div className="flex gap-2 mb-4 flex-wrap">
//                 {['all', 'text', 'image', 'profile', 'profile2'].map((type) => {
//                   const count = type === 'all' 
//                     ? inscriptions.length 
//                     : inscriptions.filter(i => i.inscriptionType === type).length;
                  
//                   return (
//                     <button
//                       key={type}
//                       onClick={() => setInscriptionFilter(type as any)}
//                       className={`px-3 py-1 rounded text-sm transition-colors ${
//                         inscriptionFilter === type
//                           ? 'bg-purple-500 text-white'
//                           : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                       }`}
//                     >
//                       {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)} ({count})
//                     </button>
//                   );
//                 })}
//               </div>

//               {/* Inscriptions Grid */}
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 {getFilteredInscriptions().map((inscription) => (
//                   <div
//                     key={inscription.origin}
//                     className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
//                     onClick={() => fetchInscriptionContent(inscription)}
//                   >
//                     {/* Inscription Preview */}
//                     <div className="mb-3">
//                       {inscription.inscriptionType === 'image' ? (
//                         <div className="h-32 bg-gray-900 rounded flex flex-col items-center justify-center">
//                           <span className="text-4xl mb-2">🖼️</span>
//                           <span className="text-xs text-gray-400">Image Inscription</span>
//                         </div>
//                       ) : inscription.inscriptionType === 'profile' || inscription.inscriptionType === 'profile2' ? (
//                         <div className="h-32 bg-gray-900 rounded p-3">
//                           <div className="text-sm text-gray-300">
//                             <p className="font-medium text-white">
//                               {inscription.content?.username || 'Profile'}
//                             </p>
//                             <p className="text-xs mt-1">{inscription.content?.title}</p>
//                             <p className="text-xs text-gray-400 mt-2 line-clamp-2">
//                               {inscription.content?.bio}
//                             </p>
//                             {inscription.inscriptionType === 'profile2' && inscription.content?.background && (
//                               <span className="text-xs text-purple-400">📸 Has background</span>
//                             )}
//                           </div>
//                         </div>
//                       ) : inscription.inscriptionType === 'text' ? (
//                         <div className="h-32 bg-gray-900 rounded p-3">
//                           <p className="text-xs text-gray-400 mb-1">📝 Text</p>
//                           <p className="text-sm text-gray-300 line-clamp-4">
//                             {inscription.content || 'Text inscription'}
//                           </p>
//                         </div>
//                       ) : (
//                         <div className="h-32 bg-gray-900 rounded flex items-center justify-center">
//                           <span className="text-gray-400">Unknown type</span>
//                         </div>
//                       )}
//                     </div>

//                     {/* Inscription Info */}
//                     <div className="space-y-1">
//                       <p className="text-xs font-mono text-gray-400">
//                         {inscription.txid.substring(0, 8)}...{inscription.txid.substring(inscription.txid.length - 6)}
//                       </p>
//                       <p className="text-xs text-gray-500">
//                         {inscription.timestamp.toLocaleDateString()} {inscription.timestamp.toLocaleTimeString()}
//                       </p>
//                       <div className="flex items-center justify-between">
//                         <span className="text-xs bg-gray-700 px-2 py-1 rounded">
//                           {inscription.inscriptionType}
//                         </span>
//                         <span className="text-xs text-gray-400">
//                           ~{(inscription.size / 1024).toFixed(1)}KB
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Selected Inscription Modal */}
//               {selectedInscription && (
//                 <div 
//                   className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
//                   onClick={() => {
//                     setSelectedInscription(null);
//                     setInscriptionContent(null);
//                   }}
//                 >
//                   <div 
//                     className="bg-gray-800 rounded-lg max-w-3xl max-h-[90vh] overflow-auto p-6"
//                     onClick={(e) => e.stopPropagation()}
//                   >
//                     <div className="flex justify-between items-start mb-4">
//                       <h3 className="text-xl font-medium text-white">
//                         Inscription #{inscription.id}
//                       </h3>
//                       <button
//                         onClick={() => {
//                           setSelectedInscription(null);
//                           setInscriptionContent(null);
//                         }}
//                         className="text-gray-400 hover:text-white"
//                       >
//                         ✕
//                       </button>
//                     </div>

//                     {loadingContent ? (
//                       <div className="text-center py-8">
//                         <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
//                       </div>
//                     ) : (
//                       <div>
//                         {/* Content Display */}
//                         {inscription.inscriptionType === 'image' && inscriptionContent && (
//                           <div className="bg-gray-900 p-4 rounded mb-4">
//                             <p className="text-gray-300">{inscriptionContent.message}</p>
//                             <p className="text-xs text-gray-400 mt-2">
//                               Image data is embedded in the transaction. View on blockchain explorer for full data.
//                             </p>
//                           </div>
//                         )}
                        
//                         {inscription.inscriptionType === 'text' && (
//                           <pre className="bg-gray-900 p-4 rounded mb-4 whitespace-pre-wrap text-gray-300 text-sm">
//                             {inscriptionContent || 'Loading...'}
//                           </pre>
//                         )}
                        
//                         {(inscription.inscriptionType === 'profile' || 
//                           inscription.inscriptionType === 'profile2') && inscriptionContent && (
//                           <div className="bg-gray-900 p-4 rounded mb-4">
//                             {inscriptionContent.avatar && (
//                               <img 
//                                 src={inscriptionContent.avatar} 
//                                 alt="Avatar" 
//                                 className="w-24 h-24 rounded-full mb-4"
//                               />
//                             )}
//                             <h4 className="text-lg font-medium text-white">{inscriptionContent.username}</h4>
//                             <p className="text-gray-300">{inscriptionContent.title}</p>
//                             <p className="text-gray-400 mt-2">{inscriptionContent.bio}</p>
//                             {inscriptionContent.background && (
//                               <img 
//                                 src={inscriptionContent.background} 
//                                 alt="Background" 
//                                 className="w-full h-32 object-cover rounded mt-4"
//                               />
//                             )}
//                           </div>
//                         )}

//                         {/* Transaction Details */}
//                         <div className="border-t border-gray-700 pt-4 space-y-2">
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">TXID:</span>
//                             <a
//                               href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
//                               target="_blank"
//                               rel="noopener noreferrer"
//                               className="text-blue-400 hover:text-blue-300 font-mono text-xs"
//                             >
//                               {inscription.txid.substring(0, 16)}...
//                             </a>
//                           </div>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">Output:</span>
//                             <span className="text-gray-300">{inscription.vout}</span>
//                           </div>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">Type:</span>
//                             <span className="text-gray-300">{inscription.inscriptionType}</span>
//                           </div>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">Size:</span>
//                             <span className="text-gray-300">~{(inscription.size / 1024).toFixed(2)}KB</span>
//                           </div>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">Created:</span>
//                             <span className="text-gray-300">{inscription.timestamp.toLocaleString()}</span>
//                           </div>
//                         </div>

//                         <div className="mt-4 flex gap-2">
//                           <a
//                             href={`https://1satordinals.com/inscription/${inscription.origin}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
//                           >
//                             View on 1SatOrdinals
//                           </a>
//                           <a
//                             href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
//                           >
//                             View Transaction
//                           </a>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };



































// import React, { useState, useEffect } from 'react';
// import { useWalletStore } from '../store/WalletStore';
// import { UTXOManager } from '../utils/blockchain';
// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
// import { BroadcastService } from '../services/BroadcastService';
// import { useMessageHandlers } from '../hooks/useMessageHandlers';

// // Test data templates
// const TEST_DATA = {
//   text: { type: 'test', message: 'Hello BSV!' },
//   profile: { 
//     type: 'profile',
//     username: 'testuser',
//     title: 'BSV Developer',
//     bio: 'Building on Bitcoin SV'
//   },
//   image: {
//     type: 'image',
//     name: 'test-image.png',
//     description: 'Test image inscription'
//   }
// };

// // Add these interfaces
// interface InscriptionFile {
//   hash: string;
//   size: number;
//   type: string;
// }

// interface Inscription {
//   id: number;
//   txid: string;
//   vout: number;
//   file: InscriptionFile;
//   origin: string;
//   ordinal: number;
//   height: number;
//   idx: number;
//   lock: string;
//   spend?: string;
//   MAP?: any;
//   B?: any;
//   content?: any;
//   inscriptionType?: string;
// }

// interface InscriptionData {
//   id: number;
//   txid: string;
//   vout: number;
//   timestamp: Date;
//   inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'unknown';
//   content?: any;
//   size: number;
//   origin: string;
//   scriptHex?: string;
// }

// export const ProfileToken: React.FC = () => {
//   const [inscriptionType, setInscriptionType] = useState<'text' | 'image' | 'profile' | 'profile2'>('text');
//   const [textData, setTextData] = useState('');
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [imagePreview, setImagePreview] = useState<string>('');
//   const [profileData, setProfileData] = useState({
//     username: '',
//     title: '',
//     bio: '',
//     avatar: ''
//   });
//   const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
//   const [profileImagePreview, setProfileImagePreview] = useState<string>('');
//   const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
//   const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>('');
//   const [loading, setLoading] = useState(false);
//   const [transactionQueue, setTransactionQueue] = useState(false);
//   const [lastTransactionTime, setLastTransactionTime] = useState(0);
//   const [currentFeeRate, setCurrentFeeRate] = useState<number>(1);
//   const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
//     type: null, 
//     message: '' 
//   });
//   const [lastTxid, setLastTxid] = useState('');
//   const [showAdvanced, setShowAdvanced] = useState(false);

//   // Add new state variables for viewing inscriptions
//   const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
//   const [inscriptions, setInscriptions] = useState<InscriptionData[]>([]);
//   const [loadingInscriptions, setLoadingInscriptions] = useState(false);
//   const [inscriptionError, setInscriptionError] = useState<string>('');
//   const [selectedInscription, setSelectedInscription] = useState<InscriptionData | null>(null);
//   const [inscriptionContent, setInscriptionContent] = useState<any>(null);
//   const [loadingContent, setLoadingContent] = useState(false);

//   const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();
//   const { fetchOnChainMessages } = useMessageHandlers();

//   // Backend proxy URL
//   const BROADCAST_PROXY_URL = 'http://localhost:3001';

//   // Fetch current fee rate from the network
//   const fetchCurrentFeeRate = async () => {
//     try {
//       const defaultRateSatPerKB = 1;
      
//       const response = await fetch(
//         `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/fee/estimates`
//       ).catch(() => null);

//       if (response && response.ok) {
//         const feeData = await response.json();
//         const feeRatePerByte = feeData.standard || feeData.halfHour || 0.001;
//         const feeRatePerKB = feeRatePerByte * 1000;
        
//         const actualRate = Math.max(defaultRateSatPerKB, Math.round(feeRatePerKB));
//         setCurrentFeeRate(actualRate);
//         console.log(`Current network fee rate: ${actualRate} sat/KB`);
//         return actualRate;
//       }
//     } catch (error) {
//       console.log('Could not fetch fee rate, using default BSV rate');
//     }
    
//     const defaultRate = 1;
//     setCurrentFeeRate(defaultRate);
//     console.log(`Using default BSV fee rate: ${defaultRate} sat/KB`);
//     return defaultRate;
//   };

//   // Calculate transaction size and fee based on BSV's sat/KB model
//   const calculateTransactionFee = (
//     numInputs: number,
//     numOutputs: number,
//     dataSize: number,
//     feeRatePerKB: number = currentFeeRate
//   ): { estimatedSize: number; fee: number } => {
//     const baseSize = 10;
//     const inputSize = numInputs * 148;
//     const outputSize = numOutputs * 34;
//     const inscriptionOverhead = 10;
    
//     const totalSizeBytes = baseSize + inputSize + outputSize + inscriptionOverhead + dataSize;
//     const totalSizeKB = totalSizeBytes / 1000;
    
//     const fee = Math.max(1, Math.ceil(totalSizeKB * feeRatePerKB));
    
//     console.log(`Transaction size calculation (BSV sat/KB model):`);
//     console.log(`- Base: ${baseSize} bytes`);
//     console.log(`- Inputs (${numInputs}): ${inputSize} bytes`);
//     console.log(`- Outputs (${numOutputs}): ${outputSize} bytes`);
//     console.log(`- Inscription data: ${dataSize} bytes`);
//     console.log(`- Total size: ${totalSizeBytes} bytes (${totalSizeKB.toFixed(3)} KB)`);
//     console.log(`- Fee rate: ${feeRatePerKB} sat/KB`);
//     console.log(`- Total fee: ${fee} sats`);
//     console.log(`- Actual rate: ${(fee / totalSizeKB).toFixed(3)} sat/KB`);
    
//     return { estimatedSize: totalSizeBytes, fee };
//   };

//   // Fetch inscriptions using the same pattern as Conversations
//   const fetchInscriptions = async () => {
//     if (!keyData.address) {
//       setInscriptionError('Please connect your wallet first');
//       return;
//     }

//     setLoadingInscriptions(true);
//     setInscriptionError('');
    
//     try {
//       const headers: any = {};
//       if (whatsOnChainApiKey) {
//         headers['woc-api-key'] = whatsOnChainApiKey;
//       }

//       // Get transaction history
//       const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${keyData.address}/history`;
//       console.log('Fetching from:', historyUrl);
      
//       const historyResponse = await fetch(historyUrl, { headers });
      
//       if (!historyResponse.ok) {
//         throw new Error(`Failed to fetch history: ${historyResponse.status}`);
//       }

//       const history = await historyResponse.json();
//       console.log(`Found ${history.length} transactions`);

//       const foundInscriptions: InscriptionData[] = [];
      
//       // Check recent transactions for inscriptions
//       for (const tx of history.slice(0, 30)) {
//         try {
//           // Get full transaction data
//           const txResponse = await fetch(
//             `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
//             { headers }
//           );

//           if (!txResponse.ok) continue;

//           const txData = await txResponse.json();
          
//           // Look for 1 satoshi outputs (inscriptions)
//           for (let i = 0; i < txData.vout.length; i++) {
//             const vout = txData.vout[i];
            
//             // Check if this is a 1 satoshi output
//             if (vout.value === 0.00000001) {
//               console.log(`Found 1 sat output in ${tx.tx_hash}:${i}`);
              
//               // Get the script hex
//               const scriptHex = vout.scriptPubKey?.hex || '';
              
//               // Determine inscription type from script
//               let inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'unknown' = 'unknown';
//               let content: any = null;
              
//               // Check for content patterns in hex
//               if (scriptHex.includes('746578742f706c61696e')) { // "text/plain"
//                 inscriptionType = 'text';
//                 // Try to extract text content
//                 try {
//                   const textMatch = scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
//                   if (textMatch && textMatch[1]) {
//                     content = Buffer.from(textMatch[1], 'hex').toString('utf8');
//                   }
//                 } catch (e) {
//                   console.error('Error extracting text:', e);
//                 }
//               } else if (scriptHex.includes('6170706c69636174696f6e2f6a736f6e')) { // "application/json"
//                 // Try to extract JSON content
//                 try {
//                   const jsonMatch = scriptHex.match(/6170706c69636174696f6e2f6a736f6e[0-9a-f]*?00([0-9a-f]+?)68/);
//                   if (jsonMatch && jsonMatch[1]) {
//                     const jsonStr = Buffer.from(jsonMatch[1], 'hex').toString('utf8');
//                     content = JSON.parse(jsonStr);
                    
//                     // Determine profile type
//                     if (content.p === 'profile') {
//                       inscriptionType = 'profile';
//                     } else if (content.p === 'profile2') {
//                       inscriptionType = 'profile2';
//                     }
//                   }
//                 } catch (e) {
//                   console.error('Error extracting JSON:', e);
//                   inscriptionType = 'profile'; // Default to profile for JSON
//                 }
//               } else if (scriptHex.includes('696d6167652f')) { // "image/"
//                 inscriptionType = 'image';
//                 // Image data is too complex to extract here, will handle in detail view
//               }
              
//               foundInscriptions.push({
//                 id: foundInscriptions.length,
//                 txid: tx.tx_hash,
//                 vout: i,
//                 timestamp: new Date(tx.time * 1000 || Date.now()),
//                 inscriptionType,
//                 content,
//                 size: scriptHex.length / 2,
//                 origin: `${tx.tx_hash}_${i}`,
//                 scriptHex
//               });
//             }
//           }
//         } catch (e) {
//           console.error(`Error processing tx ${tx.tx_hash}:`, e);
//         }
//       }
      
//       console.log(`Found ${foundInscriptions.length} inscriptions`);
//       setInscriptions(foundInscriptions);
      
//     } catch (error) {
//       console.error('Error fetching inscriptions:', error);
//       setInscriptionError(error instanceof Error ? error.message : 'Failed to fetch inscriptions');
//     } finally {
//       setLoadingInscriptions(false);
//     }
//   };

//   // Fetch inscription content details
//   const fetchInscriptionContent = async (inscription: InscriptionData) => {
//     setLoadingContent(true);
//     setSelectedInscription(inscription);
    
//     try {
//       // If we already have content, use it
//       if (inscription.content) {
//         setInscriptionContent(inscription.content);
//         setLoadingContent(false);
//         return;
//       }
      
//       // For images or complex content, try to extract from script hex
//       if (inscription.scriptHex) {
//         if (inscription.inscriptionType === 'image') {
//           // Show a message for images
//           setInscriptionContent({
//             type: 'image',
//             message: 'Image inscription - view transaction for full data',
//             txid: inscription.txid
//           });
//         } else if (inscription.inscriptionType === 'text') {
//           // Try to extract text
//           const textMatch = inscription.scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
//           if (textMatch && textMatch[1]) {
//             const text = Buffer.from(textMatch[1], 'hex').toString('utf8');
//             setInscriptionContent(text);
//           }
//         }
//       }
      
//       setLoadingContent(false);
//     } catch (error) {
//       console.error('Error fetching content:', error);
//       setInscriptionContent(null);
//       setLoadingContent(false);
//     }
//   };

//   // Update timer for button
//   useEffect(() => {
//     if (lastTransactionTime > 0) {
//       const interval = setInterval(() => {
//         const timePassed = Date.now() - lastTransactionTime;
//         if (timePassed >= 5000) {
//           clearInterval(interval);
//         }
//         setStatus(prev => ({ ...prev }));
//       }, 1000);

//       return () => clearInterval(interval);
//     }
//   }, [lastTransactionTime]);

//   // Fetch fee rate on component mount and network change
//   useEffect(() => {
//     fetchCurrentFeeRate();
//   }, [network]);

//   // Add effect to fetch inscriptions when tab changes
//   useEffect(() => {
//     if (activeTab === 'view' && keyData.address) {
//       fetchInscriptions();
//     }
//   }, [activeTab, keyData.address]);

//   // Handle image selection with 5MB limit
//   const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const maxSize = 5 * 1024 * 1024;
//     if (file.size > maxSize) {
//       setStatus({ 
//         type: 'error', 
//         message: `Image too large. Maximum size is 5MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
//       });
//       return;
//     }

//     const base64Size = Math.ceil(file.size * 1.37);
//     const { estimatedSize, fee } = calculateTransactionFee(1, 2, base64Size);
    
//     setStatus({ 
//       type: 'info', 
//       message: `Image size: ${(file.size / 1024).toFixed(0)}KB. Estimated fee: ${fee} sats (${(fee / (estimatedSize / 1000)).toFixed(3)} sat/KB)` 
//     });

//     setImageFile(file);

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       setImagePreview(e.target?.result as string);
//     };
//     reader.readAsDataURL(file);
//   };

//   // Handle profile image selection
//   const handleProfileImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, isBackground: boolean = false) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     let totalSize = file.size;
//     if (inscriptionType === 'profile2') {
//       if (isBackground && profileImageFile) {
//         totalSize += profileImageFile.size;
//       } else if (!isBackground && backgroundImageFile) {
//         totalSize += backgroundImageFile.size;
//       }
//     }

//     const maxSize = 5 * 1024 * 1024;
//     if (totalSize > maxSize) {
//       setStatus({ 
//         type: 'error', 
//         message: `Combined images too large. Maximum total size is 5MB, current total is ${(totalSize / (1024 * 1024)).toFixed(2)}MB.` 
//       });
//       return;
//     }

//     if (isBackground) {
//       setBackgroundImageFile(file);
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         setBackgroundImagePreview(e.target?.result as string);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       setProfileImageFile(file);
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         setProfileImagePreview(e.target?.result as string);
//       };
//       reader.readAsDataURL(file);
//     }

//     const base64Size = Math.ceil(totalSize * 1.37);
//     const { estimatedSize, fee } = calculateTransactionFee(1, 2, base64Size);
    
//     setStatus({ 
//       type: 'info', 
//       message: `Total size: ${(totalSize / 1024).toFixed(0)}KB. Estimated fee: ${fee} sats` 
//     });
//   };

//   // Convert image to base64
//   const imageToBase64 = (file: File): Promise<string> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = () => {
//         const base64 = reader.result as string;
//         const base64Data = base64.split(',')[1];
//         resolve(base64Data);
//       };
//       reader.onerror = reject;
//       reader.readAsDataURL(file);
//     });
//   };

//   // Create the inscription script
//   const createInscriptionScript = (pubKeyHash: number[], contentType: string, data: Uint8Array): Script => {
//     const script = new Script();
    
//     script.writeBin([0x76, 0xa9, 0x14]);
//     script.writeBin(pubKeyHash);
//     script.writeBin([0x88, 0xac]);
    
//     script.writeBin([0x00, 0x63]);
    
//     script.writeBin([0x03]);
//     script.writeBin([0x6f, 0x72, 0x64]);
    
//     script.writeBin([0x51]);
    
//     const ctBytes = Utils.toArray(contentType, 'utf8');
//     if (ctBytes.length <= 75) {
//       script.writeBin([ctBytes.length]);
//       script.writeBin(ctBytes);
//     } else {
//       script.writeBin([0x4c, ctBytes.length]);
//       script.writeBin(ctBytes);
//     }
    
//     script.writeBin([0x00]);
    
//     const dataArray = Array.from(data);
//     if (dataArray.length <= 75) {
//       script.writeBin([dataArray.length]);
//       script.writeBin(dataArray);
//     } else if (dataArray.length <= 255) {
//       script.writeBin([0x4c]);
//       script.writeBin([dataArray.length]);
//       script.writeBin(dataArray);
//     } else if (dataArray.length <= 65535) {
//       script.writeBin([0x4d]);
//       script.writeBin([dataArray.length & 0xff]);
//       script.writeBin([dataArray.length >> 8]);
//       script.writeBin(dataArray);
//     } else {
//       script.writeBin([0x4e]);
//       script.writeBin([
//         dataArray.length & 0xff,
//         (dataArray.length >> 8) & 0xff,
//         (dataArray.length >> 16) & 0xff,
//         (dataArray.length >> 24) & 0xff
//       ]);
//       script.writeBin(dataArray);
//     }
    
//     script.writeBin([0x68]);
    
//     return script;
//   };

//   // Broadcast transaction with multiple fallback methods
//   const broadcastTransaction = async (txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> => {
//     const broadcastService = new BroadcastService(network);
    
//     const result = await broadcastService.broadcast(txHex);
    
//     if (result.success) {
//       return result;
//     }
    
//     console.log('\n=== MANUAL BROADCAST REQUIRED ===');
//     console.log('Transaction hex:');
//     console.log(txHex);
//     console.log('=================================\n');
    
//     try {
//       await navigator.clipboard.writeText(txHex);
//       console.log('✓ Transaction hex copied to clipboard!');
//     } catch (e) {
//       console.log('Could not copy to clipboard');
//     }
    
//     return {
//       success: false,
//       error: 'Automatic broadcast failed. Transaction copied to clipboard. Click the link below to broadcast manually.'
//     };
//   };

//   // Create ordinal inscription with proper UTXO management
//   const createOrdinal = async () => {
//     if (!keyData.privateKey) {
//       setStatus({ type: 'error', message: 'Please connect your wallet first' });
//       return;
//     }

//     const timeSinceLastTx = Date.now() - lastTransactionTime;
//     if (timeSinceLastTx < 5000) {
//       setStatus({ 
//         type: 'error', 
//         message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another ordinal` 
//       });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Preparing inscription...' });

//     try {
//       let contentType: string;
//       let inscriptionData: Uint8Array;

//       if (inscriptionType === 'text') {
//         contentType = 'text/plain;charset=utf-8';
//         const text = textData || 'Hello, 1Sat Ordinals!';
//         inscriptionData = Utils.toArray(text, 'utf8');
//       } 
//       else if (inscriptionType === 'image' && imageFile) {
//         contentType = imageFile.type || 'image/png';
//         const base64Data = await imageToBase64(imageFile);
//         inscriptionData = Utils.toArray(base64Data, 'base64');
//         console.log(`Image inscription: ${imageFile.name}, size: ${inscriptionData.length} bytes`);
//       }
//       else if (inscriptionType === 'profile') {
//         contentType = 'application/json';
//         const profileDataToSave: any = {
//           p: 'profile',
//           username: profileData.username || 'Anonymous',
//           title: profileData.title || 'BSV User',
//           bio: profileData.bio || 'On-chain profile',
//           timestamp: Date.now()
//         };
        
//         if (profileImageFile) {
//           const base64Data = await imageToBase64(profileImageFile);
//           profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
//         }
        
//         inscriptionData = Utils.toArray(JSON.stringify(profileDataToSave), 'utf8');
//       }
//       else if (inscriptionType === 'profile2') {
//         contentType = 'application/json';
//         const profileDataToSave: any = {
//           p: 'profile2',
//           username: profileData.username || 'Anonymous',
//           title: profileData.title || 'BSV User',
//           bio: profileData.bio || 'On-chain profile',
//           timestamp: Date.now()
//         };
        
//         if (profileImageFile) {
//           const base64Data = await imageToBase64(profileImageFile);
//           profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
//         }
        
//         if (backgroundImageFile) {
//           const base64Data = await imageToBase64(backgroundImageFile);
//           profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
//         }
        
//         inscriptionData = Utils.toArray(JSON.stringify(profileDataToSave), 'utf8');
//       }
//       else {
//         throw new Error('Invalid inscription type or missing data');
//       }

//       console.log(`Creating ${inscriptionType} inscription, size: ${inscriptionData.length} bytes`);

//       const feeRate = await fetchCurrentFeeRate();

//       const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//       const utxos = await utxoManager.fetchUTXOs(true);
      
//       if (utxos.length === 0) {
//         throw new Error('No UTXOs available. Please wait for previous transactions to confirm.');
//       }

//       let { estimatedSize, fee: estimatedFee } = calculateTransactionFee(1, 2, inscriptionData.length, feeRate);
      
//       let { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee);
      
//       if (selected.length > 1) {
//         const recalc = calculateTransactionFee(selected.length, 2, inscriptionData.length, feeRate);
//         estimatedFee = recalc.fee;
        
//         const result = utxoManager.selectUTXOs(1 + estimatedFee);
//         selected = result.selected;
//         total = result.total;
//       }
      
//       if (selected.length === 0) {
//         throw new Error(`Insufficient funds. Need ${1 + estimatedFee} satoshis, have ${total}`);
//       }

//       console.log(`Selected ${selected.length} UTXOs, total: ${total} sats, estimated fee: ${estimatedFee} sats`);

//       if (inscriptionData.length > 100000) {
//         const sizeKB = (inscriptionData.length / 1024).toFixed(1);
//         setStatus({
//           type: 'info',
//           message: `Large inscription (${sizeKB}KB). Fee: ${estimatedFee} sats at ${feeRate} sat/KB`
//         });
//       }

//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const publicKey = privateKey.toPublicKey();
//       const address = publicKey.toAddress();
//       const pubKeyHash = publicKey.toHash();

//       const inscriptionScript = createInscriptionScript(pubKeyHash, contentType, inscriptionData);

//       const tx = new Transaction();

//       let totalInput = 0;
//       for (const utxo of selected) {
//         const txid = utxo.tx_hash || utxo.txid;
//         const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.sourceOutputIndex || 0);
//         const satoshis = utxo.value || utxo.satoshis || 0;
        
//         totalInput += satoshis;

//         if (utxo.sourceTransaction) {
//           tx.addInput({
//             sourceTXID: txid,
//             sourceOutputIndex: utxo.sourceOutputIndex || 0,
//             unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//             sourceTransaction: utxo.sourceTransaction
//           });
//         } else {
//           console.log(`Creating inline source for UTXO ${txid}:${vout}`);
//           tx.addInput({
//             sourceTXID: txid,
//             sourceOutputIndex: vout,
//             unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//             sourceTransaction: {
//               id: txid,
//               version: 1,
//               inputs: [],
//               outputs: [{
//                 satoshis: satoshis,
//                 lockingScript: new P2PKH().lock(address)
//               }],
//               lockTime: 0
//             }
//           });
//         }
//       }

//       tx.addOutput({
//         lockingScript: inscriptionScript,
//         satoshis: 1
//       });

//       const change = totalInput - 1 - estimatedFee;
//       if (change > 0) {
//         tx.addOutput({
//           lockingScript: new P2PKH().lock(address),
//           satoshis: change
//         });
//       } else if (change < 0) {
//         throw new Error(`Insufficient funds for fee. Need ${Math.abs(change)} more satoshis.`);
//       }

//       await tx.sign();

//       const txHex = tx.toHex();
//       const txSize = txHex.length / 2;
//       const txSizeKB = txSize / 1000;
//       const actualFeeRate = estimatedFee / txSizeKB;

//       console.log('Transaction created:');
//       console.log(`- Size: ${txSize} bytes (${txSizeKB.toFixed(3)}KB)`);
//       console.log(`- Fee: ${estimatedFee} sats`);
//       console.log(`- Actual fee rate: ${actualFeeRate.toFixed(3)} sat/KB`);
//       console.log(`- Target fee rate: ${feeRate} sat/KB`);

//       setStatus({ type: 'info', message: 'Broadcasting transaction...' });
//       const result = await broadcastTransaction(txHex);

//       if (result.success) {
//         utxoManager.markAsSpent(selected);
        
//         setLastTxid(result.txid!);
//         setLastTransactionTime(Date.now());
//         setStatus({ 
//           type: 'success', 
//           message: `Ordinal created! TXID: ${result.txid}` 
//         });
        
//         console.log(`Inscription ID: ${result.txid}_0`);
        
//         setTextData('');
//         setImageFile(null);
//         setImagePreview('');
//         setProfileData({ username: '', title: '', bio: '', avatar: '' });
//         setProfileImageFile(null);
//         setProfileImagePreview('');
//         setBackgroundImageFile(null);
//         setBackgroundImagePreview('');
        
//         setTimeout(() => {
//           setStatus(prev => ({
//             ...prev,
//             message: prev.message + '\n\nWait at least 5 seconds before creating another ordinal.'
//           }));
//         }, 1000);
//       } else {
//         throw new Error(result.error);
//       }

//     } catch (error) {
//       console.error('Error creating ordinal:', error);
//       setStatus({ 
//         type: 'error', 
//         message: error instanceof Error ? error.message : 'Failed to create ordinal' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div>
//       <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
//         <h2 className="text-xl font-semibold text-white">1Sat Ordinals Creator</h2>
//         <p className="text-sm text-gray-300 mt-1">Create text, image, or profile inscriptions on BSV</p>
//       </div>

//       {/* Tab Navigation */}
//       <div className="mb-4">
//         <div className="flex gap-2">
//           <button
//             onClick={() => setActiveTab('create')}
//             className={`px-6 py-2 rounded-lg font-medium transition-all ${
//               activeTab === 'create'
//                 ? 'bg-purple-500 text-white'
//                 : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//             }`}
//           >
//             Create Inscription
//           </button>
//           <button
//             onClick={() => setActiveTab('view')}
//             className={`px-6 py-2 rounded-lg font-medium transition-all ${
//               activeTab === 'view'
//                 ? 'bg-purple-500 text-white'
//                 : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//             }`}
//           >
//             View My Inscriptions
//           </button>
//         </div>
//       </div>

//       {activeTab === 'create' ? (
//         <div>
//           {/* Status Message */}
//           {status.type && (
//             <div className={`mb-4 p-3 rounded-lg ${
//               status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
//               status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
//               'bg-blue-900 bg-opacity-50 text-blue-300'
//             }`}>
//               {status.message}
//               {lastTxid && status.type === 'success' && (
//                 <div className="mt-2 space-y-1">
//                   <a 
//                     href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${lastTxid}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="text-blue-400 hover:text-blue-300 underline text-sm block"
//                   >
//                     View Transaction →
//                   </a>
//                   <a 
//                     href={`https://1satordinals.com/inscription/${lastTxid}_0`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="text-purple-400 hover:text-purple-300 underline text-sm block"
//                   >
//                     View on 1SatOrdinals →
//                   </a>
//                 </div>
//               )}
//               {status.type === 'error' && status.message.includes('clipboard') && (
//                 <div className="mt-3 p-2 bg-gray-800 rounded">
//                   <p className="text-xs text-gray-300 mb-2">Broadcast manually:</p>
//                   <a 
//                     href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/broadcast`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
//                   >
//                     Open WhatsOnChain Broadcast
//                     <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
//                     </svg>
//                   </a>
//                 </div>
//               )}
//             </div>
//           )}

//           <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//             <div className="space-y-4">
//               {/* Inscription Type Selection */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-300 mb-2">Inscription Type</label>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => setInscriptionType('text')}
//                     className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                       inscriptionType === 'text'
//                         ? 'bg-purple-500 text-white'
//                         : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                     }`}
//                   >
//                     📝 Text
//                   </button>
//                   <button
//                     onClick={() => setInscriptionType('image')}
//                     className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                       inscriptionType === 'image'
//                         ? 'bg-purple-500 text-white'
//                         : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                     }`}
//                   >
//                     🖼️ Image
//                   </button>
//                   <button
//                     onClick={() => setInscriptionType('profile')}
//                     className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                       inscriptionType === 'profile'
//                         ? 'bg-purple-500 text-white'
//                         : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                     }`}
//                   >
//                     👤 Profile
//                   </button>
//                   <button
//                     onClick={() => setInscriptionType('profile2')}
//                     className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                       inscriptionType === 'profile2'
//                         ? 'bg-purple-500 text-white'
//                         : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                     }`}
//                   >
//                     🖼️ Profile2
//                   </button>
//                 </div>
//               </div>

//               {/* Text Input */}
//               {inscriptionType === 'text' && (
//                 <div>
//                   <label className="block text-sm font-medium text-gray-300 mb-2">Text Message</label>
//                   <textarea
//                     value={textData}
//                     onChange={(e) => setTextData(e.target.value)}
//                     placeholder="Enter your message..."
//                     className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     rows={4}
//                   />
//                   <p className="text-xs text-gray-400 mt-1">
//                     {textData.length} characters ({new TextEncoder().encode(textData).length} bytes)
//                   </p>
//                 </div>
//               )}

//               {/* Image Upload */}
//               {inscriptionType === 'image' && (
//                 <div>
//                   <label className="block text-sm font-medium text-gray-300 mb-2">Select Image</label>
//                   <input
//                     type="file"
//                     accept="image/*"
//                     onChange={handleImageSelect}
//                     className="hidden"
//                     id="image-upload"
//                   />
//                   <label
//                     htmlFor="image-upload"
//                     className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                   >
//                     {imagePreview ? (
//                       <div className="text-center">
//                         <img
//                           src={imagePreview}
//                           alt="Preview"
//                           className="max-h-48 mx-auto rounded mb-2"
//                         />
//                         <p className="text-sm text-gray-400">
//                           {imageFile?.name}
//                         </p>
//                         <p className="text-xs text-gray-500">
//                           Size: {((imageFile?.size || 0) / 1024).toFixed(0)}KB
//                           {imageFile && imageFile.size > 1024 * 1024 &&
//                             ` (${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`
//                           }
//                         </p>
//                         <p className="text-xs text-yellow-400 mt-1">
//                           Estimated fee: {(() => {
//                             const base64Size = Math.ceil((imageFile?.size || 0) * 1.37);
//                             const { fee } = calculateTransactionFee(1, 2, base64Size, currentFeeRate);
//                             return `${fee.toLocaleString()} sats`;
//                           })()}
//                         </p>
//                       </div>
//                     ) : (
//                       <div className="text-center">
//                         <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                         </svg>
//                         <p className="text-gray-400">Click to upload image</p>
//                         <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
//                       </div>
//                     )}
//                   </label>
//                 </div>
//               )}

//               {/* Profile Form */}
//               {inscriptionType === 'profile' && (
//                 <div className="space-y-3">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
//                     <input
//                       type="text"
//                       value={profileData.username}
//                       onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
//                       placeholder="satoshi"
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
//                     <input
//                       type="text"
//                       value={profileData.title}
//                       onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
//                       placeholder="Bitcoin Creator"
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
//                     <textarea
//                       value={profileData.bio}
//                       onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
//                       placeholder="Building peer-to-peer electronic cash..."
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                       rows={3}
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image</label>
//                     <input
//                       type="file"
//                       accept="image/*"
//                       onChange={(e) => handleProfileImageSelect(e, false)}
//                       className="hidden"
//                       id="profile-avatar-upload"
//                     />
//                     <label
//                       htmlFor="profile-avatar-upload"
//                       className="block w-full p-6 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                     >
//                       {profileImagePreview ? (
//                         <div className="text-center">
//                           <img
//                             src={profileImagePreview}
//                             alt="Profile preview"
//                             className="w-24 h-24 mx-auto rounded-full object-cover mb-2"
//                           />
//                           <p className="text-xs text-gray-400">
//                             {profileImageFile?.name} ({((profileImageFile?.size || 0) / 1024).toFixed(0)}KB)
//                           </p>
//                         </div>
//                       ) : (
//                         <div className="text-center">
//                           <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                           </svg>
//                           <p className="text-gray-400 text-sm">Upload profile image</p>
//                           <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
//                         </div>
//                       )}
//                     </label>
//                   </div>
//                 </div>
//               )}

//               {/* Profile2 Form with Background */}
//               {inscriptionType === 'profile2' && (
//                 <div className="space-y-3">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
//                     <input
//                       type="text"
//                       value={profileData.username}
//                       onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
//                       placeholder="satoshi"
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
//                     <input
//                       type="text"
//                       value={profileData.title}
//                       onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
//                       placeholder="Bitcoin Creator"
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
//                     <textarea
//                       value={profileData.bio}
//                       onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
//                       placeholder="Building peer-to-peer electronic cash..."
//                       className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                       rows={3}
//                     />
//                   </div>
                  
//                   <div className="grid grid-cols-2 gap-3">
//                     {/* Profile Image */}
//                     <div>
//                       <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image</label>
//                       <input
//                         type="file"
//                         accept="image/*"
//                         onChange={(e) => handleProfileImageSelect(e, false)}
//                         className="hidden"
//                         id="profile2-avatar-upload"
//                       />
//                       <label
//                         htmlFor="profile2-avatar-upload"
//                         className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                       >
//                         {profileImagePreview ? (
//                           <div className="text-center">
//                             <img
//                               src={profileImagePreview}
//                               alt="Profile preview"
//                               className="w-20 h-20 mx-auto rounded-full object-cover mb-1"
//                             />
//                             <p className="text-xs text-gray-400">
//                               {((profileImageFile?.size || 0) / 1024).toFixed(0)}KB
//                             </p>
//                           </div>
//                         ) : (
//                           <div className="text-center">
//                             <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                             </svg>
//                             <p className="text-xs text-gray-400">Profile</p>
//                           </div>
//                         )}
//                       </label>
//                     </div>

//                     {/* Background Image */}
//                     <div>
//                       <label className="block text-sm font-medium text-gray-300 mb-2">Background Image</label>
//                       <input
//                         type="file"
//                         accept="image/*"
//                         onChange={(e) => handleProfileImageSelect(e, true)}
//                         className="hidden"
//                         id="profile2-background-upload"
//                       />
//                       <label
//                         htmlFor="profile2-background-upload"
//                         className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                       >
//                         {backgroundImagePreview ? (
//                           <div className="text-center">
//                             <img
//                               src={backgroundImagePreview}
//                               alt="Background preview"
//                               className="w-full h-20 mx-auto object-cover rounded mb-1"
//                             />
//                             <p className="text-xs text-gray-400">
//                               {((backgroundImageFile?.size || 0) / 1024).toFixed(0)}KB
//                             </p>
//                           </div>
//                         ) : (
//                           <div className="text-center">
//                             <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                             </svg>
//                             <p className="text-xs text-gray-400">Background</p>
//                           </div>
//                         )}
//                       </label>
//                     </div>
//                   </div>
                  
//                   {(profileImageFile || backgroundImageFile) && (
//                     <div className="p-2 bg-gray-900 rounded text-xs">
//                       <p className="text-gray-400">
//                         Total size: {(((profileImageFile?.size || 0) + (backgroundImageFile?.size || 0)) / 1024).toFixed(0)}KB 
//                         / 5120KB ({(((profileImageFile?.size || 0) + (backgroundImageFile?.size || 0)) / (5 * 1024 * 1024) * 100).toFixed(1)}%)
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Wallet Info */}
//               <div className="p-3 bg-gray-800 rounded-lg">
//                 <div className="flex justify-between items-center text-sm">
//                   <span className="text-gray-400">Address:</span>
//                   <span className="text-gray-300 font-mono text-xs">
//                     {keyData.address ? `${keyData.address.substring(0, 12)}...${keyData.address.substring(keyData.address.length - 8)}` : 'Not connected'}
//                   </span>
//                 </div>
//                 <div className="flex justify-between items-center text-sm mt-2">
//                   <span className="text-gray-400">Balance:</span>
//                   <span className="text-gray-300">{balance.confirmed.toLocaleString()} sats</span>
//                 </div>
//               </div>

//               {/* Create Button */}
//               <button
//                 onClick={createOrdinal}
//                 disabled={loading || !keyData.privateKey || balance.confirmed < 500 || 
//                   (inscriptionType === 'image' && !imageFile) ||
//                   (inscriptionType === 'profile2' && !profileImageFile && !backgroundImageFile) ||
//                   (Date.now() - lastTransactionTime < 5000)}
//                 className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {loading ? 'Creating Inscription...' : 
//                  (Date.now() - lastTransactionTime < 5000) ? 
//                   `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
//                   `Create ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`}
//               </button>

//               {/* Transaction Status */}
//               {lastTransactionTime > 0 && (
//                 <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
//                   <p className="text-xs text-yellow-300">
//                     ⚠️ <strong>Important:</strong> Wait for your previous transaction to be picked up by miners before creating another ordinal. 
//                     BSV transactions need time to propagate through the network.
//                   </p>
//                   {Date.now() - lastTransactionTime < 30000 && (
//                     <p className="text-xs text-gray-300 mt-1">
//                       Last transaction: {Math.floor((Date.now() - lastTransactionTime) / 1000)} seconds ago
//                     </p>
//                   )}
//                 </div>
//               )}

//               {/* Info Box */}
//               <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//                 <h4 className="text-sm font-medium text-blue-300 mb-1">💡 Tips:</h4>
//                 <ul className="text-xs text-gray-300 space-y-1">
//                   <li>• Text inscriptions: ~1 sat minimum</li>
//                   <li>• Image fees: ~1 sat per KB</li>
//                   <li>• 1MB image: ~1,000 sats</li>
//                   <li>• 5MB max size: ~{Math.ceil(5 * 1024 * 1.37).toLocaleString()} sats</li>
//                   <li>• Profile with images stores full data on-chain</li>
//                   <li>• Profile2 supports avatar + background</li>
//                   <li>• BSV fee rate: {currentFeeRate} sat/KB</li>
//                 </ul>
//               </div>
//             </div>
//           </div>
//         </div>
//       ) : (
//         // View inscriptions tab
//         <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//           {loadingInscriptions ? (
//             <div className="text-center py-8">
//               <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
//               <p className="text-gray-300 mt-2">Loading inscriptions...</p>
//             </div>
//           ) : inscriptionError ? (
//             <div className="text-center py-8">
//               <p className="text-red-400">{inscriptionError}</p>
//               <button
//                 onClick={fetchInscriptions}
//                 className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
//               >
//                 Retry
//               </button>
//             </div>
//           ) : inscriptions.length === 0 ? (
//             <div className="text-center py-8">
//               <p className="text-gray-400">No inscriptions found for this address</p>
//               <button
//                 onClick={() => setActiveTab('create')}
//                 className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
//               >
//                 Create Your First Inscription
//               </button>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-medium text-white">
//                   Your Inscriptions ({inscriptions.length})
//                 </h3>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={fetchInscriptions}
//                     disabled={loadingInscriptions}
//                     className="text-sm text-purple-400 hover:text-purple-300"
//                   >
//                     {loadingInscriptions ? '🔄 Loading...' : '🔄 Refresh'}
//                   </button>
//                   <button
//                     onClick={() => {
//                       console.log('Current address:', keyData.address);
//                       console.log('Network:', network);
//                       fetchInscriptions();
//                     }}
//                     className="text-xs text-gray-400 hover:text-gray-300"
//                   >
//                     Debug Fetch
//                   </button>
//                 </div>
//               </div>

//               {/* Inscription Type Filter */}
//               <div className="flex gap-2 mb-4 flex-wrap">
//                 {['all', 'text', 'image', 'profile', 'profile2'].map((type) => {
//                   const count = type === 'all' 
//                     ? inscriptions.length 
//                     : inscriptions.filter(i => i.inscriptionType === type).length;
                  
//                   return (
//                     <button
//                       key={type}
//                       onClick={() => {
//                         // You can add filtering logic here
//                       }}
//                       className="px-3 py-1 bg-gray-600 text-gray-300 rounded text-sm hover:bg-gray-500"
//                     >
//                       {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)} ({count})
//                     </button>
//                   );
//                 })}
//               </div>

//               {/* Inscriptions Grid */}
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 {inscriptions.map((inscription) => (
//                   <div
//                     key={inscription.origin}
//                     className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
//                     onClick={() => fetchInscriptionContent(inscription)}
//                   >
//                     {/* Inscription Preview */}
//                     <div className="mb-3">
//                       {inscription.inscriptionType === 'image' ? (
//                         <div className="h-32 bg-gray-900 rounded flex flex-col items-center justify-center">
//                           <span className="text-4xl mb-2">🖼️</span>
//                           <span className="text-xs text-gray-400">Image Inscription</span>
//                         </div>
//                       ) : inscription.inscriptionType === 'profile' || inscription.inscriptionType === 'profile2' ? (
//                         <div className="h-32 bg-gray-900 rounded p-3">
//                           <div className="text-sm text-gray-300">
//                             <p className="font-medium text-white">
//                               {inscription.content?.username || 'Profile'}
//                             </p>
//                             <p className="text-xs mt-1">{inscription.content?.title}</p>
//                             <p className="text-xs text-gray-400 mt-2 line-clamp-2">
//                               {inscription.content?.bio}
//                             </p>
//                             {inscription.inscriptionType === 'profile2' && inscription.content?.background && (
//                               <span className="text-xs text-purple-400">📸 Has background</span>
//                             )}
//                           </div>
//                         </div>
//                       ) : inscription.inscriptionType === 'text' ? (
//                         <div className="h-32 bg-gray-900 rounded p-3">
//                           <p className="text-xs text-gray-400 mb-1">📝 Text</p>
//                           <p className="text-sm text-gray-300 line-clamp-4">
//                             {inscription.content || 'Text inscription'}
//                           </p>
//                         </div>
//                       ) : (
//                         <div className="h-32 bg-gray-900 rounded flex items-center justify-center">
//                           <span className="text-gray-400">Unknown type</span>
//                         </div>
//                       )}
//                     </div>

//                     {/* Inscription Info */}
//                     <div className="space-y-1">
//                       <p className="text-xs font-mono text-gray-400">
//                         {inscription.txid.substring(0, 8)}...{inscription.txid.substring(inscription.txid.length - 6)}
//                       </p>
//                       <p className="text-xs text-gray-500">
//                         {inscription.timestamp.toLocaleDateString()} {inscription.timestamp.toLocaleTimeString()}
//                       </p>
//                       <div className="flex items-center justify-between">
//                         <span className="text-xs bg-gray-700 px-2 py-1 rounded">
//                           {inscription.inscriptionType}
//                         </span>
//                         <span className="text-xs text-gray-400">
//                           ~{(inscription.size / 1024).toFixed(1)}KB
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Selected Inscription Modal */}
//               {selectedInscription && (
//                 <div 
//                   className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
//                   onClick={() => {
//                     setSelectedInscription(null);
//                     setInscriptionContent(null);
//                   }}
//                 >
//                   <div 
//                     className="bg-gray-800 rounded-lg max-w-3xl max-h-[90vh] overflow-auto p-6"
//                     onClick={(e) => e.stopPropagation()}
//                   >
//                     <div className="flex justify-between items-start mb-4">
//                       <h3 className="text-xl font-medium text-white">
//                         Inscription #{inscription.id}
//                       </h3>
//                       <button
//                         onClick={() => {
//                           setSelectedInscription(null);
//                           setInscriptionContent(null);
//                         }}
//                         className="text-gray-400 hover:text-white"
//                       >
//                         ✕
//                       </button>
//                     </div>

//                     {loadingContent ? (
//                       <div className="text-center py-8">
//                         <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
//                       </div>
//                     ) : (
//                       <div>
//                         {/* Content Display */}
//                         {inscription.inscriptionType === 'image' && inscriptionContent && (
//                           <div className="bg-gray-900 p-4 rounded mb-4">
//                             <p className="text-gray-300">{inscriptionContent.message}</p>
//                             <p className="text-xs text-gray-400 mt-2">
//                               Image data is embedded in the transaction. View on blockchain explorer for full data.
//                             </p>
//                           </div>
//                         )}
                        
//                         {inscription.inscriptionType === 'text' && (
//                           <pre className="bg-gray-900 p-4 rounded mb-4 whitespace-pre-wrap text-gray-300 text-sm">
//                             {inscriptionContent || 'Loading...'}
//                           </pre>
//                         )}
                        
//                         {(inscription.inscriptionType === 'profile' || 
//                           inscription.inscriptionType === 'profile2') && inscriptionContent && (
//                           <div className="bg-gray-900 p-4 rounded mb-4">
//                             {inscriptionContent.avatar && (
//                               <img 
//                                 src={inscriptionContent.avatar} 
//                                 alt="Avatar" 
//                                 className="w-24 h-24 rounded-full mb-4"
//                               />
//                             )}
//                             <h4 className="text-lg font-medium text-white">{inscriptionContent.username}</h4>
//                             <p className="text-gray-300">{inscriptionContent.title}</p>
//                             <p className="text-gray-400 mt-2">{inscriptionContent.bio}</p>
//                             {inscriptionContent.background && (
//                               <img 
//                                 src={inscriptionContent.background} 
//                                 alt="Background" 
//                                 className="w-full h-32 object-cover rounded mt-4"
//                               />
//                             )}
//                           </div>
//                         )}

//                         {/* Transaction Details */}
//                         <div className="border-t border-gray-700 pt-4 space-y-2">
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">TXID:</span>
//                             <a
//                               href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
//                               target="_blank"
//                               rel="noopener noreferrer"
//                               className="text-blue-400 hover:text-blue-300 font-mono text-xs"
//                             >
//                               {inscription.txid.substring(0, 16)}...
//                             </a>
//                           </div>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">Output:</span>
//                             <span className="text-gray-300">{inscription.vout}</span>
//                           </div>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">Type:</span>
//                             <span className="text-gray-300">{inscription.inscriptionType}</span>
//                           </div>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">Size:</span>
//                             <span className="text-gray-300">~{(inscription.size / 1024).toFixed(2)}KB</span>
//                           </div>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-400">Created:</span>
//                             <span className="text-gray-300">{inscription.timestamp.toLocaleString()}</span>
//                           </div>
//                         </div>

//                         <div className="mt-4 flex gap-2">
//                           <a
//                             href={`https://1satordinals.com/inscription/${inscription.origin}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
//                           >
//                             View on 1SatOrdinals
//                           </a>
//                           <a
//                             href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
//                           >
//                             View Transaction
//                           </a>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };
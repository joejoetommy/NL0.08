// 2nd key d3842ed475242f25f5839cf92043c8341d0e654e8d29119843a15fdaed9b2c43   mx3cGq6YBiH8rYJycgLeW1QGuPUnDoUrCj  TXID= 8eb02eb50cbf8a65df7722b33ce48f2fe1f50705e99e5bfe05c096b1e464e49f  8eb4cafed6b5a3e0a893441e3cc17146af8d32c6ee96498baa986dbaa763adaa     
// 3rd key dff16672174569c206d9303c8ad427c4383addbcaa31991ea2a9f2cd2861def1   n1VtTgFqT6Kra6iY93YH8SA8ZqxvNC21Bj  TXID= 
// 4th key   671d6de03a9dbee6c691b4cb5afdf219f3bfb3b70afef3e2ea8ee76f0196bd53  mw62mij7PZzdxhMHPx85EEp3XbwbuLGp9H TXID= 
// 5th key   ef519bf189c89954dfe580e4bb22980d075157ed97a2751c5542ece55d76a44b    mo7CXYyBpNYVsRHY1LZhQiZ9nQr9Nws7dH TXID= 
// 6th key 7e20f00bf555d908f64dc1326b7f20c5c4f1201f14d79b8a310e056f97599f67   mtu8w1L1eD35n625DpY4pngvD6XdM1kMZT TXID= 
// 7th key 08cf0bba0b27030b1dd02bd01cd9293385878c08edd1eb53fe586d06f47476d8  n3qDYwh6hKKCiu5R7fX7GuWWgdyJ1RMc9r TXID= 
// 8th key 853f50b1cd687d5d79b07ced6eeb0a3c7f99a62eedffa27eaed7cb5b0285310e   mnSPX9gQS2K8KCNPp9Vp3jzS3aBWgWRawc TXID= 
//////////////////////////////////////////

// 1st key
// 1de096339a813a63f3bb829ddbcd307086e426c498811986700c275f35c1ac04
// mzoFnR9fpyLh3Sabvx3oiXDFtPspXKusms
// 1st 1SAT
// 6455ef4c2f45230cf29a8c09b920ca81e89a0b92ff54860b64d3c057760c4ac4 
// {
//   "type": "jesus is the only way",
//   "message": "remember to go to him, all who are heavy laden and you will find rest"
// }

///////////////////////////////////
// This is the original code for the ProfileToken component
// It is used to create and manage profile tokens in the wallet application
// Successfully pushed to the network  With Text data

// import React, { useState } from 'react';
// import { useWalletStore } from '../store/WalletStore';
// import { UTXOManager } from '../utils/blockchain';
// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';

// // Simple test data for initial development
// const TEST_DATA = {
//   small: { type: 'test', message: 'Hello BSV!' },
//   medium: { type: 'profile', name: 'Test User', bio: 'Testing 1Sat Ordinals' },
//   large: { 
//     type: 'profile',
//     username: 'testuser',
//     title: 'BSV Developer',
//     mission: 'Building on Bitcoin SV',
//     timestamp: Date.now()
//   }
// };

// export const ProfileToken: React.FC = () => {
//   const [testSize, setTestSize] = useState<'small' | 'medium' | 'large'>('small');
//   const [customData, setCustomData] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
//     type: null, 
//     message: '' 
//   });
//   const [lastTxid, setLastTxid] = useState('');
//   const [showAdvanced, setShowAdvanced] = useState(false);

//   const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();

//   // Backend proxy URL - make sure this matches your running server
//   const BROADCAST_PROXY_URL = 'http://localhost:3001';

//   // Create the inscription script
//   const createInscriptionScript = (pubKeyHash: number[], data: string): Script => {
//     const script = new Script();
    
//     // P2PKH locking script first
//     script.writeBin([0x76, 0xa9, 0x14]); // OP_DUP OP_HASH160 PUSH(20)
//     script.writeBin(pubKeyHash);
//     script.writeBin([0x88, 0xac]); // OP_EQUALVERIFY OP_CHECKSIG
    
//     // Inscription envelope
//     script.writeBin([0x00, 0x63]); // OP_FALSE OP_IF
    
//     // "ord" marker
//     script.writeBin([0x03]); // PUSH(3)
//     script.writeBin([0x6f, 0x72, 0x64]); // "ord"
    
//     script.writeBin([0x51]); // OP_1
    
//     // Content type
//     const contentType = 'application/json';
//     const ctBytes = Utils.toArray(contentType, 'utf8');
//     script.writeBin([ctBytes.length]);
//     script.writeBin(ctBytes);
    
//     script.writeBin([0x00]); // OP_0
    
//     // Data
//     const dataBytes = Utils.toArray(data, 'utf8');
    
//     // Handle different data sizes
//     if (dataBytes.length <= 75) {
//       script.writeBin([dataBytes.length]);
//       script.writeBin(dataBytes);
//     } else if (dataBytes.length <= 255) {
//       script.writeBin([0x4c]); // OP_PUSHDATA1
//       script.writeBin([dataBytes.length]);
//       script.writeBin(dataBytes);
//     } else {
//       script.writeBin([0x4d]); // OP_PUSHDATA2
//       script.writeBin([dataBytes.length & 0xff]);
//       script.writeBin([dataBytes.length >> 8]);
//       script.writeBin(dataBytes);
//     }
    
//     script.writeBin([0x68]); // OP_ENDIF
    
//     return script;
//   };

//   // Broadcast transaction - try direct first, then proxy
//   const broadcastTransaction = async (txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> => {
//     console.log('Starting broadcast...');
    
//     // Method 1: Try direct broadcast to WhatsOnChain (might work)
//     try {
//       console.log('Attempting direct broadcast to WhatsOnChain...');
//       const url = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/raw`;
      
//       const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ txhex: txHex })
//       });

//       if (response.ok) {
//         const txid = (await response.text()).trim();
//         if (txid.length === 64) {
//           console.log('✅ Direct broadcast successful!');
//           return { success: true, txid };
//         }
//       }
//     } catch (error) {
//       console.log('Direct broadcast failed (CORS), trying proxy...');
//     }

//     // Method 2: Try backend proxy
//     try {
//       const healthCheck = await fetch(`${BROADCAST_PROXY_URL}/health`).catch(() => null);
//       if (healthCheck && healthCheck.ok) {
//         console.log('Backend proxy available, broadcasting...');
        
//         const response = await fetch(`${BROADCAST_PROXY_URL}/api/broadcast`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             txHex,
//             network: network === 'testnet' ? 'test' : 'main'
//           })
//         });

//         if (response.ok) {
//           const result = await response.json();
//           if (result.success) {
//             return { success: true, txid: result.txid };
//           }
//         }
//       }
//     } catch (error) {
//       console.log('Proxy broadcast failed');
//     }

//     // Method 3: Manual broadcast
//     console.log('\n=== MANUAL BROADCAST REQUIRED ===');
//     console.log('Copy this transaction hex:');
//     console.log(txHex);
//     console.log('=================================\n');
    
//     // Copy to clipboard
//     try {
//       await navigator.clipboard.writeText(txHex);
//       console.log('✓ Transaction hex copied to clipboard!');
      
//       // Open broadcast page in new tab
//       window.open(`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/broadcast`, '_blank');
//     } catch (e) {
//       console.log('Could not copy to clipboard');
//     }
    
//     return {
//       success: false,
//       error: `Automatic broadcast failed. Transaction hex copied to clipboard. A new tab has been opened for manual broadcast.`
//     };
//   };

//   // Create simple ordinal
//   const createSimpleOrdinal = async () => {
//     if (!keyData.privateKey) {
//       setStatus({ type: 'error', message: 'Please connect your wallet first' });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Creating ordinal inscription...' });

//     try {
//       // Get test data
//       const testData = customData || JSON.stringify(TEST_DATA[testSize]);
//       const dataSize = new TextEncoder().encode(testData).length;
      
//       console.log('Creating ordinal with data:', testData);
//       console.log('Data size:', dataSize, 'bytes');

//       // Get UTXOs
//       const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//       const utxos = await utxoManager.fetchUTXOs();
      
//       if (utxos.length === 0) {
//         throw new Error('No UTXOs available. Please fund your wallet.');
//       }

//       // Calculate fee (rough estimate)
//       const feeEstimate = 200 + Math.ceil(dataSize * 0.5); // Base fee + data fee
//       const { selected, total } = utxoManager.selectUTXOs(1 + feeEstimate);
      
//       if (selected.length === 0) {
//         throw new Error(`Insufficient funds. Need at least ${1 + feeEstimate} satoshis.`);
//       }

//       console.log(`Selected ${selected.length} UTXOs with total ${total} satoshis`);

//       // Create private key
//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const publicKey = privateKey.toPublicKey();
//       const address = publicKey.toAddress();
//       const pubKeyHash = publicKey.toHash();

//       // Create inscription script
//       const inscriptionScript = createInscriptionScript(pubKeyHash, testData);

//       // Create transaction
//       const tx = new Transaction();

//       // Add inputs
//       let totalInput = 0;
//       for (const utxo of selected) {
//         const txid = utxo.tx_hash || utxo.txid;
//         const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : 0;
//         const satoshis = utxo.value || utxo.satoshis || 0;
        
//         totalInput += satoshis;

//         // Create source transaction for the input
//         const sourceTransaction = {
//           id: txid,
//           outputs: [{
//             satoshis: satoshis,
//             lockingScript: new P2PKH().lock(address)
//           }]
//         };

//         tx.addInput({
//           sourceTXID: txid,
//           sourceOutputIndex: vout,
//           unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//           sourceTransaction: sourceTransaction
//         });
//       }

//       // Output 1: The ordinal (1 satoshi)
//       tx.addOutput({
//         lockingScript: inscriptionScript,
//         satoshis: 1
//       });

//       // Output 2: Change
//       const change = totalInput - 1 - feeEstimate;
//       if (change > 0) {
//         tx.addOutput({
//           lockingScript: new P2PKH().lock(address),
//           satoshis: change
//         });
//       }

//       // Sign transaction
//       await tx.sign();

//       // Get transaction details
//       const txHex = tx.toHex();
//       const txSize = txHex.length / 2;
//       const actualFee = totalInput - 1 - (change > 0 ? change : 0);

//       console.log('Transaction details:');
//       console.log('- Size:', txSize, 'bytes');
//       console.log('- Fee:', actualFee, 'satoshis');
//       console.log('- Fee rate:', (actualFee / txSize).toFixed(2), 'sats/byte');

//       // Broadcast transaction
//       setStatus({ type: 'info', message: 'Broadcasting transaction...' });
//       const result = await broadcastTransaction(txHex);

//       if (result.success) {
//         setLastTxid(result.txid!);
//         setStatus({ 
//           type: 'success', 
//           message: `Ordinal created! TXID: ${result.txid}` 
//         });
        
//         // Show inscription ID
//         console.log('Inscription ID:', `${result.txid}_0`);
        
//         // Important: Clear UTXO cache so next transaction gets fresh UTXOs
//         console.log('Transaction successful! Clearing UTXO cache for next transaction...');
        
//         // Wait a moment for the transaction to propagate
//         setTimeout(() => {
//           setStatus({ 
//             type: 'success', 
//             message: `Ordinal created! TXID: ${result.txid}\nWait a few seconds before creating another ordinal.` 
//           });
//         }, 2000);
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
//         <h2 className="text-xl font-semibold text-white">Simple 1Sat Ordinals Tester</h2>
//         <p className="text-sm text-gray-300 mt-1">Test creating ordinals with small data payloads</p>
//       </div>

//       {/* Status Message */}
//       {status.type && (
//         <div className={`mb-4 p-3 rounded-lg ${
//           status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
//           status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
//           'bg-blue-900 bg-opacity-50 text-blue-300'
//         }`}>
//           {status.message}
//           {lastTxid && status.type === 'success' && (
//             <div className="mt-2">
//               <a 
//                 href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${lastTxid}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-blue-400 hover:text-blue-300 underline text-sm"
//               >
//                 View on WhatsOnChain →
//               </a>
//             </div>
//           )}
//         </div>
//       )}

//       <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//         <div className="space-y-4">
//           {/* Test Data Size Selection */}
//           <div>
//             <label className="block text-sm font-medium text-gray-300 mb-2">Test Data Size</label>
//             <div className="flex gap-2">
//               <button
//                 onClick={() => setTestSize('small')}
//                 className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                   testSize === 'small'
//                     ? 'bg-purple-500 text-white'
//                     : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                 }`}
//               >
//                 Small (~30 bytes)
//               </button>
//               <button
//                 onClick={() => setTestSize('medium')}
//                 className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                   testSize === 'medium'
//                     ? 'bg-purple-500 text-white'
//                     : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                 }`}
//               >
//                 Medium (~70 bytes)
//               </button>
//               <button
//                 onClick={() => setTestSize('large')}
//                 className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                   testSize === 'large'
//                     ? 'bg-purple-500 text-white'
//                     : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                 }`}
//               >
//                 Large (~150 bytes)
//               </button>
//             </div>
//           </div>

//           {/* Data Preview */}
//           <div>
//             <label className="block text-sm font-medium text-gray-300 mb-2">Data to Inscribe</label>
//             <pre className="p-3 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto">
//               {customData || JSON.stringify(TEST_DATA[testSize], null, 2)}
//             </pre>
//             <p className="text-xs text-gray-400 mt-1">
//               Size: {new TextEncoder().encode(customData || JSON.stringify(TEST_DATA[testSize])).length} bytes
//             </p>
//           </div>

//           {/* Advanced Options */}
//           <div>
//             <button
//               onClick={() => setShowAdvanced(!showAdvanced)}
//               className="text-sm text-purple-400 hover:text-purple-300"
//             >
//               {showAdvanced ? '▼' : '▶'} Advanced Options
//             </button>
            
//             {showAdvanced && (
//               <div className="mt-2">
//                 <label className="block text-sm font-medium text-gray-300 mb-2">Custom Data (JSON)</label>
//                 <textarea
//                   value={customData}
//                   onChange={(e) => setCustomData(e.target.value)}
//                   placeholder='{"type": "custom", "data": "your data here"}'
//                   className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm font-mono"
//                   rows={4}
//                 />
//               </div>
//             )}
//           </div>

//           {/* Wallet Info */}
//           <div className="p-3 bg-gray-800 rounded-lg">
//             <div className="flex justify-between items-center text-sm">
//               <span className="text-gray-400">Address:</span>
//               <span className="text-gray-300 font-mono">{keyData.address ? `${keyData.address.substring(0, 8)}...${keyData.address.substring(keyData.address.length - 6)}` : 'Not connected'}</span>
//             </div>
//             <div className="flex justify-between items-center text-sm mt-2">
//               <span className="text-gray-400">Balance:</span>
//               <span className="text-gray-300">{balance.confirmed} sats</span>
//             </div>
//             <div className="flex justify-between items-center text-sm mt-2">
//               <span className="text-gray-400">Network:</span>
//               <span className="text-gray-300">{network}</span>
//             </div>
//           </div>

//           {/* Create Button */}
//           <button
//             onClick={createSimpleOrdinal}
//             disabled={loading || !keyData.privateKey || balance.confirmed < 500}
//             className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {loading ? 'Creating Ordinal...' : 'Create Test Ordinal'}
//           </button>

//           {/* Info Box */}
//           <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//             <h4 className="text-sm font-medium text-blue-300 mb-1">ℹ️ How it works:</h4>
//             <ul className="text-xs text-gray-300 space-y-1">
//               <li>• Creates a 1-satoshi output with your data inscribed</li>
//               <li>• Uses the standard 1Sat Ordinals protocol format</li>
//               <li>• Data is stored in the transaction script</li>
//               <li>• Inscription ID will be: {`<txid>_0`}</li>
//               <li>• Cost: 1 sat (ordinal) + ~200-300 sats (fees)</li>
//             </ul>
//           </div>

//           {/* Backend Status */}
//           <div className="p-3 bg-gray-800 rounded-lg">
//             <p className="text-xs text-gray-400">
//               <span className="font-medium">Backend Proxy:</span> {BROADCAST_PROXY_URL}
//               <br />
//               <span className="text-green-400">✓ Server is running and accessible</span>
//             </p>
//             {status.type === 'error' && status.message.includes('Backend proxy') && (
//               <div className="mt-2 p-2 bg-yellow-900 bg-opacity-30 rounded border border-yellow-700">
//                 <p className="text-xs text-yellow-300 font-medium">⚠️ Backend Connection Issue</p>
//                 <p className="text-xs text-gray-300 mt-1">
//                   Make sure the backend server is running on port 3001:
//                 </p>
//                 <pre className="text-xs bg-gray-900 p-1 rounded mt-1">
//                   cd bsv-broadcast-proxy
//                   npm start
//                 </pre>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };







//// Further development of the ProfileToken component V44 all working up to 5mb "BSV Ordinal Wallet Development"
// V45 introduction of Profile image + text ; then profile image + bakground image + text  

import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../store/WalletStore';
import { UTXOManager } from '../utils/blockchain';
import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import { BroadcastService } from '../services/BroadcastService';

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
  const [currentFeeRate, setCurrentFeeRate] = useState<number>(1); // Default 1 sat/KB (not per byte!)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
    type: null, 
    message: '' 
  });
  const [lastTxid, setLastTxid] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();

  // Backend proxy URL
  const BROADCAST_PROXY_URL = 'http://localhost:3001';

  // Fetch current fee rate from the network
  const fetchCurrentFeeRate = async () => {
    try {
      // BSV typically uses 1 sat/KB rate
      // This is much lower than BTC's sat/byte rate
      const defaultRateSatPerKB = 1;
      
      // Try to get fee estimates from WhatsOnChain or other services
      const response = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/fee/estimates`
      ).catch(() => null);

      if (response && response.ok) {
        const feeData = await response.json();
        // BSV fees are typically given in sat/byte but we need sat/KB
        // If the API returns sat/byte, multiply by 1000
        const feeRatePerByte = feeData.standard || feeData.halfHour || 0.001;
        const feeRatePerKB = feeRatePerByte * 1000;
        
        // BSV mainnet typically charges 1 sat/KB
        const actualRate = Math.max(defaultRateSatPerKB, Math.round(feeRatePerKB));
        setCurrentFeeRate(actualRate);
        console.log(`Current network fee rate: ${actualRate} sat/KB`);
        return actualRate;
      }
    } catch (error) {
      console.log('Could not fetch fee rate, using default BSV rate');
    }
    
    // Default BSV fee rate: 1 sat/KB
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
    // Transaction size calculation:
    // Base: ~10 bytes
    // Each input: ~148 bytes (P2PKH)
    // Each output: ~34 bytes (P2PKH)
    // Data inscription overhead: ~10 bytes + data size
    
    const baseSize = 10;
    const inputSize = numInputs * 148;
    const outputSize = numOutputs * 34;
    const inscriptionOverhead = 10;
    
    const totalSizeBytes = baseSize + inputSize + outputSize + inscriptionOverhead + dataSize;
    const totalSizeKB = totalSizeBytes / 1000; // Convert to KB
    
    // BSV charges per KB, minimum 1 sat
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

  // Update timer for button
  useEffect(() => {
    if (lastTransactionTime > 0) {
      const interval = setInterval(() => {
        const timePassed = Date.now() - lastTransactionTime;
        if (timePassed >= 5000) {
          clearInterval(interval);
        }
        // Force re-render to update button text
        setStatus(prev => ({ ...prev }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lastTransactionTime]);

  // Fetch fee rate on component mount and network change
  useEffect(() => {
    fetchCurrentFeeRate();
  }, [network]);

  // Handle image selection with 5MB limit
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `Image too large. Maximum size is 5MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      });
      return;
    }

    // Calculate estimated fee for this image
    const base64Size = Math.ceil(file.size * 1.37); // Base64 increases size by ~37%
    const { estimatedSize, fee } = calculateTransactionFee(1, 2, base64Size);
    
    setStatus({ 
      type: 'info', 
      message: `Image size: ${(file.size / 1024).toFixed(0)}KB. Estimated fee: ${fee} sats (${(fee / (estimatedSize / 1000)).toFixed(3)} sat/KB)` 
    });

    setImageFile(file);

    // Create preview
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

    // Check combined size for profile2
    let totalSize = file.size;
    if (inscriptionType === 'profile2') {
      if (isBackground && profileImageFile) {
        totalSize += profileImageFile.size;
      } else if (!isBackground && backgroundImageFile) {
        totalSize += backgroundImageFile.size;
      }
    }

    // Validate combined size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
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

    // Calculate estimated fee
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
        // Remove data URL prefix to get pure base64
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
    
    // P2PKH locking script first
    script.writeBin([0x76, 0xa9, 0x14]); // OP_DUP OP_HASH160 PUSH(20)
    script.writeBin(pubKeyHash);
    script.writeBin([0x88, 0xac]); // OP_EQUALVERIFY OP_CHECKSIG
    
    // Inscription envelope
    script.writeBin([0x00, 0x63]); // OP_FALSE OP_IF
    
    // "ord" marker
    script.writeBin([0x03]); // PUSH(3)
    script.writeBin([0x6f, 0x72, 0x64]); // "ord"
    
    script.writeBin([0x51]); // OP_1
    
    // Content type
    const ctBytes = Utils.toArray(contentType, 'utf8');
    if (ctBytes.length <= 75) {
      script.writeBin([ctBytes.length]);
      script.writeBin(ctBytes);
    } else {
      script.writeBin([0x4c, ctBytes.length]);
      script.writeBin(ctBytes);
    }
    
    script.writeBin([0x00]); // OP_0
    
    // Data push
    const dataArray = Array.from(data);
    if (dataArray.length <= 75) {
      script.writeBin([dataArray.length]);
      script.writeBin(dataArray);
    } else if (dataArray.length <= 255) {
      script.writeBin([0x4c]); // OP_PUSHDATA1
      script.writeBin([dataArray.length]);
      script.writeBin(dataArray);
    } else if (dataArray.length <= 65535) {
      script.writeBin([0x4d]); // OP_PUSHDATA2
      script.writeBin([dataArray.length & 0xff]);
      script.writeBin([dataArray.length >> 8]);
      script.writeBin(dataArray);
    } else {
      // OP_PUSHDATA4 for very large data
      script.writeBin([0x4e]);
      script.writeBin([
        dataArray.length & 0xff,
        (dataArray.length >> 8) & 0xff,
        (dataArray.length >> 16) & 0xff,
        (dataArray.length >> 24) & 0xff
      ]);
      script.writeBin(dataArray);
    }
    
    script.writeBin([0x68]); // OP_ENDIF
    
    return script;
  };

  // Broadcast transaction with multiple fallback methods
  const broadcastTransaction = async (txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> => {
    const broadcastService = new BroadcastService(network);
    
    // First try the broadcast service with multiple methods
    const result = await broadcastService.broadcast(txHex);
    
    if (result.success) {
      return result;
    }
    
    // If all automatic methods fail, copy to clipboard for manual broadcast
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

    // Check if we need to wait before creating another transaction
    const timeSinceLastTx = Date.now() - lastTransactionTime;
    if (timeSinceLastTx < 5000) { // 5 second minimum between transactions
      setStatus({ 
        type: 'error', 
        message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another ordinal` 
      });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Preparing inscription...' });

    try {
      // Prepare inscription data based on type
      let contentType: string;
      let inscriptionData: Uint8Array;

      if (inscriptionType === 'text') {
        contentType = 'text/plain;charset=utf-8';
        const text = textData || 'Hello, 1Sat Ordinals!';
        inscriptionData = Utils.toArray(text, 'utf8');
      } 
      else if (inscriptionType === 'image' && imageFile) {
        // Determine content type from file
        contentType = imageFile.type || 'image/png';
        
        // Convert image to base64 and then to bytes
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
        
        // Include profile image if provided
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
        
        // Include profile image if provided
        if (profileImageFile) {
          const base64Data = await imageToBase64(profileImageFile);
          profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
        }
        
        // Include background image if provided
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

      // Fetch current fee rate
      const feeRate = await fetchCurrentFeeRate();

      // Get UTXOs with force refresh to ensure we have the latest
      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs(true); // Force refresh
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available. Please wait for previous transactions to confirm.');
      }

      // Calculate accurate fee based on inscription size and current rate
      // Start with 1 input, 2 outputs (inscription + change)
      let { estimatedSize, fee: estimatedFee } = calculateTransactionFee(1, 2, inscriptionData.length, feeRate);
      
      // Select UTXOs with the estimated fee
      let { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee);
      
      // If we need more inputs, recalculate fee
      if (selected.length > 1) {
        const recalc = calculateTransactionFee(selected.length, 2, inscriptionData.length, feeRate);
        estimatedFee = recalc.fee;
        
        // Re-select if needed
        const result = utxoManager.selectUTXOs(1 + estimatedFee);
        selected = result.selected;
        total = result.total;
      }
      
      if (selected.length === 0) {
        throw new Error(`Insufficient funds. Need ${1 + estimatedFee} satoshis, have ${total}`);
      }

      console.log(`Selected ${selected.length} UTXOs, total: ${total} sats, estimated fee: ${estimatedFee} sats`);

      // Show fee estimate to user for large inscriptions
      if (inscriptionData.length > 100000) { // > 100KB
        const sizeKB = (inscriptionData.length / 1024).toFixed(1);
        setStatus({
          type: 'info',
          message: `Large inscription (${sizeKB}KB). Fee: ${estimatedFee} sats at ${feeRate} sat/KB`
        });
      }

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

        // Handle the sourceTransaction properly
        if (utxo.sourceTransaction) {
          tx.addInput({
            sourceTXID: txid,
            sourceOutputIndex: utxo.sourceOutputIndex || 0,
            unlockingScriptTemplate: new P2PKH().unlock(privateKey),
            sourceTransaction: utxo.sourceTransaction
          });
        } else {
          // If no sourceTransaction, create it inline
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

      // Output 1: The ordinal (1 satoshi)
      tx.addOutput({
        lockingScript: inscriptionScript,
        satoshis: 1
      });

      // Output 2: Change
      const change = totalInput - 1 - estimatedFee;
      if (change > 0) {
        tx.addOutput({
          lockingScript: new P2PKH().lock(address),
          satoshis: change
        });
      } else if (change < 0) {
        throw new Error(`Insufficient funds for fee. Need ${Math.abs(change)} more satoshis.`);
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

      // Broadcast
      setStatus({ type: 'info', message: 'Broadcasting transaction...' });
      const result = await broadcastTransaction(txHex);

      if (result.success) {
        // Mark UTXOs as spent to prevent double-spending
        utxoManager.markAsSpent(selected);
        
        setLastTxid(result.txid!);
        setLastTransactionTime(Date.now());
        setStatus({ 
          type: 'success', 
          message: `Ordinal created! TXID: ${result.txid}` 
        });
        
        console.log(`Inscription ID: ${result.txid}_0`);
        
        // Clear form
        setTextData('');
        setImageFile(null);
        setImagePreview('');
        setProfileData({ username: '', title: '', bio: '', avatar: '' });
        setProfileImageFile(null);
        setProfileImagePreview('');
        setBackgroundImageFile(null);
        setBackgroundImagePreview('');
        
        // Show warning about waiting
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
  );
};





// This is developing code further with image inscriptions and profile tokens

// import React, { useState } from 'react';
// import { useWalletStore } from '../store/WalletStore';
// import { UTXOManager } from '../utils/blockchain';
// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
// import { BroadcastService } from '../services/BroadcastService';

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

// export const ProfileToken: React.FC = () => {
//   const [inscriptionType, setInscriptionType] = useState<'text' | 'image' | 'profile'>('text');
//   const [textData, setTextData] = useState('');
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [imagePreview, setImagePreview] = useState<string>('');
//   const [profileData, setProfileData] = useState({
//     username: '',
//     title: '',
//     bio: '',
//     avatar: ''
//   });
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
//     type: null, 
//     message: '' 
//   });
//   const [lastTxid, setLastTxid] = useState('');
//   const [showAdvanced, setShowAdvanced] = useState(false);

//   const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();

//   // Backend proxy URL
//   const BROADCAST_PROXY_URL = 'http://localhost:3001';

//   // Handle image selection
//   const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     // Validate file size (limit to 100KB for now)
//     if (file.size > 100 * 1024) {
//       setStatus({ 
//         type: 'error', 
//         message: 'Image too large. Please select an image under 100KB.' 
//       });
//       return;
//     }

//     setImageFile(file);

//     // Create preview
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       setImagePreview(e.target?.result as string);
//     };
//     reader.readAsDataURL(file);
//   };

//   // Convert image to base64
//   const imageToBase64 = (file: File): Promise<string> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = () => {
//         const base64 = reader.result as string;
//         // Remove data URL prefix to get pure base64
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
    
//     // P2PKH locking script first
//     script.writeBin([0x76, 0xa9, 0x14]); // OP_DUP OP_HASH160 PUSH(20)
//     script.writeBin(pubKeyHash);
//     script.writeBin([0x88, 0xac]); // OP_EQUALVERIFY OP_CHECKSIG
    
//     // Inscription envelope
//     script.writeBin([0x00, 0x63]); // OP_FALSE OP_IF
    
//     // "ord" marker
//     script.writeBin([0x03]); // PUSH(3)
//     script.writeBin([0x6f, 0x72, 0x64]); // "ord"
    
//     script.writeBin([0x51]); // OP_1
    
//     // Content type
//     const ctBytes = Utils.toArray(contentType, 'utf8');
//     if (ctBytes.length <= 75) {
//       script.writeBin([ctBytes.length]);
//       script.writeBin(ctBytes);
//     } else {
//       script.writeBin([0x4c, ctBytes.length]);
//       script.writeBin(ctBytes);
//     }
    
//     script.writeBin([0x00]); // OP_0
    
//     // Data push
//     const dataArray = Array.from(data);
//     if (dataArray.length <= 75) {
//       script.writeBin([dataArray.length]);
//       script.writeBin(dataArray);
//     } else if (dataArray.length <= 255) {
//       script.writeBin([0x4c]); // OP_PUSHDATA1
//       script.writeBin([dataArray.length]);
//       script.writeBin(dataArray);
//     } else if (dataArray.length <= 65535) {
//       script.writeBin([0x4d]); // OP_PUSHDATA2
//       script.writeBin([dataArray.length & 0xff]);
//       script.writeBin([dataArray.length >> 8]);
//       script.writeBin(dataArray);
//     } else {
//       // OP_PUSHDATA4 for very large data
//       script.writeBin([0x4e]);
//       script.writeBin([
//         dataArray.length & 0xff,
//         (dataArray.length >> 8) & 0xff,
//         (dataArray.length >> 16) & 0xff,
//         (dataArray.length >> 24) & 0xff
//       ]);
//       script.writeBin(dataArray);
//     }
    
//     script.writeBin([0x68]); // OP_ENDIF
    
//     return script;
//   };

//   // Broadcast transaction with multiple fallback methods
//   const broadcastTransaction = async (txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> => {
//     const broadcastService = new BroadcastService(network);
    
//     // First try the broadcast service with multiple methods
//     const result = await broadcastService.broadcast(txHex);
    
//     if (result.success) {
//       return result;
//     }
    
//     // If all automatic methods fail, copy to clipboard for manual broadcast
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

//   // Create ordinal inscription
//   const createOrdinal = async () => {
//     if (!keyData.privateKey) {
//       setStatus({ type: 'error', message: 'Please connect your wallet first' });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Preparing inscription...' });

//     try {
//       // Prepare inscription data based on type
//       let contentType: string;
//       let inscriptionData: Uint8Array;

//       if (inscriptionType === 'text') {
//         contentType = 'text/plain;charset=utf-8';
//         const text = textData || 'Hello, 1Sat Ordinals!';
//         inscriptionData = Utils.toArray(text, 'utf8');
//       } 
//       else if (inscriptionType === 'image' && imageFile) {
//         // Determine content type from file
//         contentType = imageFile.type || 'image/png';
        
//         // Convert image to base64 and then to bytes
//         const base64Data = await imageToBase64(imageFile);
//         inscriptionData = Utils.toArray(base64Data, 'base64');
        
//         console.log(`Image inscription: ${imageFile.name}, size: ${inscriptionData.length} bytes`);
//       }
//       else if (inscriptionType === 'profile') {
//         contentType = 'application/json';
//         const profile = {
//           p: 'profile',
//           username: profileData.username || 'Anonymous',
//           title: profileData.title || 'BSV User',
//           bio: profileData.bio || 'On-chain profile',
//           avatar: profileData.avatar,
//           timestamp: Date.now()
//         };
//         inscriptionData = Utils.toArray(JSON.stringify(profile), 'utf8');
//       }
//       else {
//         throw new Error('Invalid inscription type or missing data');
//       }

//       console.log(`Creating ${inscriptionType} inscription, size: ${inscriptionData.length} bytes`);

//       // Get UTXOs
//       const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//       const utxos = await utxoManager.fetchUTXOs();
      
//       if (utxos.length === 0) {
//         throw new Error('No UTXOs available');
//       }

//       // Calculate fee based on inscription size
//       const baseFee = 200;
//       const dataFee = Math.ceil(inscriptionData.length * 0.5);
//       const totalFee = baseFee + dataFee;
      
//       const { selected, total } = utxoManager.selectUTXOs(1 + totalFee);
      
//       if (selected.length === 0) {
//         throw new Error(`Insufficient funds. Need ${1 + totalFee} satoshis, have ${total}`);
//       }

//       console.log(`Selected ${selected.length} UTXOs, total: ${total} sats, fee: ${totalFee} sats`);

//       // Create transaction
//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const publicKey = privateKey.toPublicKey();
//       const address = publicKey.toAddress();
//       const pubKeyHash = publicKey.toHash();

//       const inscriptionScript = createInscriptionScript(pubKeyHash, contentType, inscriptionData);

//       const tx = new Transaction();

//       // Add inputs
//       let totalInput = 0;
//       for (const utxo of selected) {
//         const txid = utxo.tx_hash || utxo.txid;
//         const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : 0;
//         const satoshis = utxo.value || utxo.satoshis || 0;
        
//         totalInput += satoshis;

//         const sourceTransaction = {
//           id: txid,
//           outputs: [{
//             satoshis: satoshis,
//             lockingScript: new P2PKH().lock(address)
//           }]
//         };

//         tx.addInput({
//           sourceTXID: txid,
//           sourceOutputIndex: vout,
//           unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//           sourceTransaction: sourceTransaction
//         });
//       }

//       // Output 1: The ordinal (1 satoshi)
//       tx.addOutput({
//         lockingScript: inscriptionScript,
//         satoshis: 1
//       });

//       // Output 2: Change
//       const change = totalInput - 1 - totalFee;
//       if (change > 0) {
//         tx.addOutput({
//           lockingScript: new P2PKH().lock(address),
//           satoshis: change
//         });
//       }

//       // Sign transaction
//       await tx.sign();

//       const txHex = tx.toHex();
//       const txSize = txHex.length / 2;

//       console.log('Transaction created:');
//       console.log(`- Size: ${txSize} bytes`);
//       console.log(`- Fee: ${totalFee} sats (${(totalFee/txSize).toFixed(2)} sats/byte)`);

//       // Broadcast
//       setStatus({ type: 'info', message: 'Broadcasting transaction...' });
//       const result = await broadcastTransaction(txHex);

//       if (result.success) {
//         setLastTxid(result.txid!);
//         setStatus({ 
//           type: 'success', 
//           message: `Ordinal created! TXID: ${result.txid}` 
//         });
        
//         console.log(`Inscription ID: ${result.txid}_0`);
        
//         // Clear form
//         setTextData('');
//         setImageFile(null);
//         setImagePreview('');
//         setProfileData({ username: '', title: '', bio: '', avatar: '' });
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

//       {/* Status Message */}
//       {status.type && (
//         <div className={`mb-4 p-3 rounded-lg ${
//           status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
//           status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
//           'bg-blue-900 bg-opacity-50 text-blue-300'
//         }`}>
//           {status.message}
//           {lastTxid && status.type === 'success' && (
//             <div className="mt-2 space-y-1">
//               <a 
//                 href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${lastTxid}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-blue-400 hover:text-blue-300 underline text-sm block"
//               >
//                 View Transaction →
//               </a>
//               <a 
//                 href={`https://1satordinals.com/inscription/${lastTxid}_0`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-purple-400 hover:text-purple-300 underline text-sm block"
//               >
//                 View on 1SatOrdinals →
//               </a>
//             </div>
//           )}
//           {status.type === 'error' && status.message.includes('clipboard') && (
//             <div className="mt-3 p-2 bg-gray-800 rounded">
//               <p className="text-xs text-gray-300 mb-2">Broadcast manually:</p>
//               <a 
//                 href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/broadcast`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
//               >
//                 Open WhatsOnChain Broadcast
//                 <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
//                 </svg>
//               </a>
//             </div>
//           )}
//         </div>
//       )}

//       <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//         <div className="space-y-4">
//           {/* Inscription Type Selection */}
//           <div>
//             <label className="block text-sm font-medium text-gray-300 mb-2">Inscription Type</label>
//             <div className="flex gap-2">
//               <button
//                 onClick={() => setInscriptionType('text')}
//                 className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                   inscriptionType === 'text'
//                     ? 'bg-purple-500 text-white'
//                     : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                 }`}
//               >
//                 📝 Text
//               </button>
//               <button
//                 onClick={() => setInscriptionType('image')}
//                 className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                   inscriptionType === 'image'
//                     ? 'bg-purple-500 text-white'
//                     : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                 }`}
//               >
//                 🖼️ Image
//               </button>
//               <button
//                 onClick={() => setInscriptionType('profile')}
//                 className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                   inscriptionType === 'profile'
//                     ? 'bg-purple-500 text-white'
//                     : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                 }`}
//               >
//                 👤 Profile
//               </button>
//             </div>
//           </div>

//           {/* Text Input */}
//           {inscriptionType === 'text' && (
//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Text Message</label>
//               <textarea
//                 value={textData}
//                 onChange={(e) => setTextData(e.target.value)}
//                 placeholder="Enter your message..."
//                 className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                 rows={4}
//               />
//               <p className="text-xs text-gray-400 mt-1">
//                 {textData.length} characters ({new TextEncoder().encode(textData).length} bytes)
//               </p>
//             </div>
//           )}

//           {/* Image Upload */}
//           {inscriptionType === 'image' && (
//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Select Image</label>
//               <input
//                 type="file"
//                 accept="image/*"
//                 onChange={handleImageSelect}
//                 className="hidden"
//                 id="image-upload"
//               />
//               <label
//                 htmlFor="image-upload"
//                 className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//               >
//                 {imagePreview ? (
//                   <div className="text-center">
//                     <img
//                       src={imagePreview}
//                       alt="Preview"
//                       className="max-h-48 mx-auto rounded"
//                     />
//                     <p className="text-sm text-gray-400 mt-2">
//                       {imageFile?.name} ({Math.round((imageFile?.size || 0) / 1024)}KB)
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="text-center">
//                     <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                     </svg>
//                     <p className="text-gray-400">Click to upload image</p>
//                     <p className="text-xs text-gray-500 mt-1">Max 100KB (for now)</p>
//                   </div>
//                 )}
//               </label>
//             </div>
//           )}

//           {/* Profile Form */}
//           {inscriptionType === 'profile' && (
//             <div className="space-y-3">
//               <div>
//                 <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
//                 <input
//                   type="text"
//                   value={profileData.username}
//                   onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
//                   placeholder="satoshi"
//                   className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
//                 <input
//                   type="text"
//                   value={profileData.title}
//                   onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
//                   placeholder="Bitcoin Creator"
//                   className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
//                 <textarea
//                   value={profileData.bio}
//                   onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
//                   placeholder="Building peer-to-peer electronic cash..."
//                   className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//                   rows={3}
//                 />
//               </div>
//             </div>
//           )}

//           {/* Wallet Info */}
//           <div className="p-3 bg-gray-800 rounded-lg">
//             <div className="flex justify-between items-center text-sm">
//               <span className="text-gray-400">Address:</span>
//               <span className="text-gray-300 font-mono text-xs">
//                 {keyData.address ? `${keyData.address.substring(0, 12)}...${keyData.address.substring(keyData.address.length - 8)}` : 'Not connected'}
//               </span>
//             </div>
//             <div className="flex justify-between items-center text-sm mt-2">
//               <span className="text-gray-400">Balance:</span>
//               <span className="text-gray-300">{balance.confirmed.toLocaleString()} sats</span>
//             </div>
//           </div>

//           {/* Create Button */}
//           <button
//             onClick={createOrdinal}
//             disabled={loading || !keyData.privateKey || balance.confirmed < 500 || 
//               (inscriptionType === 'image' && !imageFile)}
//             className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {loading ? 'Creating Inscription...' : `Create ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`}
//           </button>

//           {/* Info Box */}
//           <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//             <h4 className="text-sm font-medium text-blue-300 mb-1">💡 Tips:</h4>
//             <ul className="text-xs text-gray-300 space-y-1">
//               <li>• Text inscriptions are cheapest (~200-300 sats total)</li>
//               <li>• Images cost more based on file size (keep under 100KB)</li>
//               <li>• Profile inscriptions create on-chain identity</li>
//               <li>• Each inscription gets a unique ID: {`<txid>_0`}</li>
//               <li>• Inscriptions are permanent and tradeable</li>
//             </ul>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
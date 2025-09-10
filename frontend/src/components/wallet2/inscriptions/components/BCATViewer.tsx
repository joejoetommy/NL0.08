





import React, { useState, useEffect } from 'react';
import { Utils } from '@bsv/sdk';
import { BCATDecoderDisplay } from './BCATDecoderDisplay';

interface BCATViewerProps {
  keyData: any;
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
}

interface BCATTransaction {
  txid: string;
  timestamp: Date;
  metadata: {
    info: string;
    mimeType: string;
    charset: string | null;
    filename: string | null;
    flag: string | null;
    chunks: number;
  };
  chunkTxIds: string[];
  thumbnail?: string;
}

// Official BCAT protocol namespaces
const BCAT_NAMESPACE = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up';
const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

export const BCATViewer: React.FC<BCATViewerProps> = ({
  keyData,
  network,
  whatsOnChainApiKey
}) => {
  const [bcatTransactions, setBcatTransactions] = useState<BCATTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedBcat, setSelectedBcat] = useState<BCATTransaction | null>(null);
  const [reconstructing, setReconstructing] = useState(false);
  const [reconstructProgress, setReconstructProgress] = useState({ current: 0, total: 0 });
  
  // Manual decoder state
  const [manualTxid, setManualTxid] = useState('');
  const [decodingManual, setDecodingManual] = useState(false);
  const [decodedBcat, setDecodedBcat] = useState<BCATTransaction | null>(null);

  // Convert namespace to hex
  const namespaceToHex = (namespace: string): string => {
    return Utils.toArray(namespace, 'utf8').map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const BCAT_NAMESPACE_HEX = namespaceToHex(BCAT_NAMESPACE);
  const BCAT_PART_NAMESPACE_HEX = namespaceToHex(BCAT_PART_NAMESPACE);

  // Fetch BCAT transactions for the address
  const fetchBCATTransactions = async () => {
    if (!keyData.address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const headers: any = {};
      if (whatsOnChainApiKey) {
        headers['woc-api-key'] = whatsOnChainApiKey;
      }

      // Fetch transaction history
      const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${keyData.address}/history`;
      const historyResponse = await fetch(historyUrl, { headers });
      
      if (!historyResponse.ok) {
        throw new Error(`Failed to fetch history: ${historyResponse.status}`);
      }

      const history = await historyResponse.json();
      console.log(`Found ${history.length} transactions for address`);

      const foundBcats: BCATTransaction[] = [];
      
      // Look for BCAT transactions
      for (const tx of history.slice(0, 50)) {
        try {
          const txResponse = await fetch(
            `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
            { headers }
          );

          if (!txResponse.ok) continue;

          const txData = await txResponse.json();
          
          // Parse BCAT transaction
          const bcatData = await parseBCATTransaction(txData, tx.tx_hash, tx.time);
          if (bcatData) {
            foundBcats.push(bcatData);
          }
        } catch (e) {
          console.error(`Error processing tx ${tx.tx_hash}:`, e);
        }
      }
      
      setBcatTransactions(foundBcats);
      console.log(`Found ${foundBcats.length} BCAT transactions`);
      
    } catch (error) {
      console.error('Error fetching BCAT transactions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch BCAT transactions');
    } finally {
      setLoading(false);
    }
  };

  // Parse BCAT transaction
  const parseBCATTransaction = async (txData: any, txid: string, timestamp?: number): Promise<BCATTransaction | null> => {
    try {
      // Look for OP_RETURN output
      const opReturnOutput = txData.vout.find((out: any) => 
        out.scriptPubKey?.hex?.startsWith('6a')
      );
      
      if (!opReturnOutput) return null;
      
      const scriptHex = opReturnOutput.scriptPubKey.hex;
      
      // Check for BCAT namespace
      if (!scriptHex.includes(BCAT_NAMESPACE_HEX)) return null;
      
      console.log(`Found BCAT transaction: ${txid}`);
      
      // Parse BCAT data from OP_RETURN
      const bcatData = parseBCATProtocolData(scriptHex);
      if (!bcatData) return null;
      
      // Check if first output has thumbnail
      let thumbnail: string | undefined;
      if (txData.vout[0]?.value === 0.00000001) {
        // This might be an inscription with thumbnail
        thumbnail = 'inscription'; // Placeholder
      }
      
      return {
        txid,
        timestamp: new Date((timestamp || 0) * 1000),
        metadata: bcatData.metadata,
        chunkTxIds: bcatData.chunkTxIds,
        thumbnail
      };
    } catch (e) {
      console.error('Error parsing BCAT transaction:', e);
      return null;
    }
  };

  // Parse BCAT protocol data from script hex
  const parseBCATProtocolData = (scriptHex: string): { metadata: any; chunkTxIds: string[] } | null => {
    try {
      // Skip OP_RETURN (6a)
      let pos = 2;
      const data: any[] = [];
      
      // Parse all push data operations
      while (pos < scriptHex.length) {
        if (pos + 2 > scriptHex.length) break;
        
        const opcode = parseInt(scriptHex.substr(pos, 2), 16);
        let dataLength = 0;
        let dataStart = pos;
        
        if (opcode <= 75) {
          // Direct push
          dataLength = opcode;
          dataStart = pos + 2;
        } else if (opcode === 0x4c && pos + 4 <= scriptHex.length) {
          // OP_PUSHDATA1
          dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16);
          dataStart = pos + 4;
        } else if (opcode === 0x4d && pos + 6 <= scriptHex.length) {
          // OP_PUSHDATA2
          dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16) + 
                       (parseInt(scriptHex.substr(pos + 4, 2), 16) << 8);
          dataStart = pos + 6;
        } else {
          break;
        }
        
        if (dataStart + dataLength * 2 > scriptHex.length) break;
        
        const dataHex = scriptHex.substr(dataStart, dataLength * 2);
        
        // Check if this is a 32-byte value (transaction ID)    //  BCAT Manager Info
        if (dataLength === 32) {
          // Convert hex to transaction ID (reverse for little-endian)
          let txid = '';
          for (let i = dataHex.length - 2; i >= 0; i -= 2) {
            txid += dataHex.substr(i, 2);
          }
          data.push({ type: 'txid', value: txid });
        } else {
          // Convert to string
          let str = '';
          for (let i = 0; i < dataHex.length; i += 2) {
            const byte = parseInt(dataHex.substr(i, 2), 16);
            str += String.fromCharCode(byte);
          }
          data.push({ type: 'string', value: str });
        }
        
        pos = dataStart + dataLength * 2;
      }
      
      // Validate BCAT structure
      if (data.length < 7) return null;
      if (data[0].type !== 'string' || data[0].value !== BCAT_NAMESPACE) return null;
      
      // Extract transaction IDs
      const chunkTxIds: string[] = [];
      for (let i = 6; i < data.length; i++) {
        if (data[i].type === 'txid') {
          chunkTxIds.push(data[i].value);
        }
      }
      
      return {
        metadata: {
          info: data[1]?.value || '',
          mimeType: data[2]?.value || '',
          charset: data[3]?.value || null,
          filename: data[4]?.value || null,
          flag: data[5]?.value || null,
          chunks: chunkTxIds.length
        },
        chunkTxIds
      };
    } catch (e) {
      console.error('Error parsing BCAT data:', e);
      return null;
    }
  };

  // Decode manual BCAT transaction
  const decodeManualBCAT = async () => {
    if (!manualTxid.trim()) {
      alert('Please enter a transaction ID');
      return;
    }

    setDecodingManual(true);
    setDecodedBcat(null);
    
    try {
      const headers: any = {};
      if (whatsOnChainApiKey) {
        headers['woc-api-key'] = whatsOnChainApiKey;
      }

      const txResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${manualTxid}`,
        { headers }
      );

      if (!txResponse.ok) {
        throw new Error('Transaction not found');
      }

      const txData = await txResponse.json();
      const bcatData = await parseBCATTransaction(txData, manualTxid);
      
      if (!bcatData) {
        throw new Error('This is not a valid BCAT transaction');
      }
      
      setDecodedBcat(bcatData);
      
    } catch (error) {
      console.error('Error decoding BCAT:', error);
      alert('Failed to decode BCAT transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDecodingManual(false);
    }
  };

  // Reconstruct file from chunks
  const reconstructFile = async (bcat: BCATTransaction) => {
    // This is now handled by BCATDecoderDisplay component
    setSelectedBcat(bcat);
  };

  // Remove unused functions
  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Manual BCAT Decoder */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
        <h4 className="text-sm font-medium text-white mb-3">Manual BCAT Decoder</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualTxid}
            onChange={(e) => setManualTxid(e.target.value)}
            placeholder="Enter BCAT transaction ID..."
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={decodeManualBCAT}
            disabled={decodingManual}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {decodingManual ? 'Decoding...' : 'Decode'}
          </button>
        </div>
        
        {/* Decoded BCAT Display Manual BCAT Decoder */}
        {decodedBcat && (
          <div className="mt-4">
            <BCATDecoderDisplay
              bcatTxId={decodedBcat.txid}
              chunkTxIds={decodedBcat.chunkTxIds}
              metadata={decodedBcat.metadata}
              network={network}
              whatsOnChainApiKey={whatsOnChainApiKey}
            />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Your BCAT Files</h3>
        <button
          onClick={fetchBCATTransactions}
          disabled={loading}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-gray-300 mt-2">Searching for BCAT transactions...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* BCAT List */}
      {!loading && bcatTransactions.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-block mb-4">
            <span className="text-6xl">📦</span>
          </div>
          <p className="text-gray-400">No BCAT files found</p>
          <p className="text-xs text-gray-500 mt-2">Create a BCAT file to see it here</p>
        </div>
      )}

      {!loading && bcatTransactions.length > 0 && (
        <div className="grid gap-4">
          {bcatTransactions.map((bcat) => (
            <div
              key={bcat.txid}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-white mb-1">
                    {bcat.metadata.filename || 'Unnamed File'}
                  </h4>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                    <span>{bcat.metadata.mimeType}</span>
                    <span>•</span>
                    <span>{bcat.metadata.chunks} chunks</span>
                    <span>•</span>
                    <span>{bcat.timestamp.toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {bcat.metadata.flag && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-900 bg-opacity-50 text-yellow-300">
                        {bcat.metadata.flag}
                      </span>
                    )}
                    <a
                      href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${bcat.txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      View TX
                    </a>
                  </div>
                  
                  {bcat.metadata.info && (
                    <p className="text-xs text-gray-500 mt-2">Info: {bcat.metadata.info}</p>
                  )}
                </div>
                
                <button
                  onClick={() => setSelectedBcat(bcat)}
                  className="ml-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  📂 Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected BCAT Decoder */}
      {selectedBcat && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-auto p-6 w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-medium text-white">BCAT File Viewer</h3>
              <button
                onClick={() => setSelectedBcat(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <BCATDecoderDisplay
              bcatTxId={selectedBcat.txid}
              chunkTxIds={selectedBcat.chunkTxIds}
              metadata={selectedBcat.metadata}
              network={network}
              whatsOnChainApiKey={whatsOnChainApiKey}
            />
          </div>
        </div>
      )}

      {/* Protocol Info Box */}
      <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
        <h4 className="text-sm font-medium text-blue-300 mb-1">BCAT Protocol Info:</h4>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Namespace: {BCAT_NAMESPACE}</li>
          <li>• Part namespace: {BCAT_PART_NAMESPACE}</li>
          <li>• Supports files up to ~290MB</li>
          <li>• Each chunk stored as separate transaction</li>
          <li>• Files can be reconstructed from chunk IDs</li>
        </ul>
      </div>
    </div>
  );
};




















































// Your BCAT Files

// import React, { useState, useEffect } from 'react';
// import { Utils } from '@bsv/sdk';

// interface BCATViewerProps {
//   keyData: any;
//   network: 'mainnet' | 'testnet';
//   whatsOnChainApiKey?: string;
// }

// interface BCATTransaction {
//   txid: string;
//   timestamp: Date;
//   metadata: {
//     info: string;
//     mimeType: string;
//     charset: string | null;
//     filename: string | null;
//     flag: string | null;
//     chunks: number;
//   };
//   chunkTxIds: string[];
//   thumbnail?: string;
// }

// // Official BCAT protocol namespaces
// const BCAT_NAMESPACE = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up';
// const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

// export const BCATViewer: React.FC<BCATViewerProps> = ({
//   keyData,
//   network,
//   whatsOnChainApiKey
// }) => {
//   const [bcatTransactions, setBcatTransactions] = useState<BCATTransaction[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string>('');
//   const [selectedBcat, setSelectedBcat] = useState<BCATTransaction | null>(null);
//   const [reconstructing, setReconstructing] = useState(false);
//   const [reconstructProgress, setReconstructProgress] = useState({ current: 0, total: 0 });
  
//   // Manual decoder state
//   const [manualTxid, setManualTxid] = useState('');
//   const [decodingManual, setDecodingManual] = useState(false);
//   const [decodedBcat, setDecodedBcat] = useState<BCATTransaction | null>(null);

//   // Convert namespace to hex
//   const namespaceToHex = (namespace: string): string => {
//     return Utils.toArray(namespace, 'utf8').map(b => b.toString(16).padStart(2, '0')).join('');
//   };

//   const BCAT_NAMESPACE_HEX = namespaceToHex(BCAT_NAMESPACE);
//   const BCAT_PART_NAMESPACE_HEX = namespaceToHex(BCAT_PART_NAMESPACE);

//   // Fetch BCAT transactions for the address
//   const fetchBCATTransactions = async () => {
//     if (!keyData.address) {
//       setError('Please connect your wallet first');
//       return;
//     }

//     setLoading(true);
//     setError('');
    
//     try {
//       const headers: any = {};
//       if (whatsOnChainApiKey) {
//         headers['woc-api-key'] = whatsOnChainApiKey;
//       }

//       // Fetch transaction history
//       const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${keyData.address}/history`;
//       const historyResponse = await fetch(historyUrl, { headers });
      
//       if (!historyResponse.ok) {
//         throw new Error(`Failed to fetch history: ${historyResponse.status}`);
//       }

//       const history = await historyResponse.json();
//       console.log(`Found ${history.length} transactions for address`);

//       const foundBcats: BCATTransaction[] = [];
      
//       // Look for BCAT transactions (limit to recent 50 for performance)
//       for (const tx of history.slice(0, 50)) {
//         try {
//           const txResponse = await fetch(
//             `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
//             { headers }
//           );

//           if (!txResponse.ok) continue;

//           const txData = await txResponse.json();
          
//           // Look for BCAT transactions with official namespace
//           const bcatData = await parseBCATTransaction(txData, tx.tx_hash, tx.time);
//           if (bcatData) {
//             foundBcats.push(bcatData);
//           }
//         } catch (e) {
//           console.error(`Error processing tx ${tx.tx_hash}:`, e);
//         }
//       }
      
//       setBcatTransactions(foundBcats);
//       console.log(`Found ${foundBcats.length} BCAT transactions`);
      
//     } catch (error) {
//       console.error('Error fetching BCAT transactions:', error);
//       setError(error instanceof Error ? error.message : 'Failed to fetch BCAT transactions');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Parse BCAT transaction according to official protocol
//   const parseBCATTransaction = async (txData: any, txid: string, timestamp?: number): Promise<BCATTransaction | null> => {
//     try {
//       // Look for OP_RETURN output
//       const opReturnOutput = txData.vout.find((out: any) => 
//         out.scriptPubKey?.asm?.startsWith('OP_RETURN') || 
//         out.scriptPubKey?.hex?.startsWith('6a')
//       );
      
//       if (!opReturnOutput) return null;
      
//       const scriptHex = opReturnOutput.scriptPubKey.hex;
      
//       // Check for BCAT namespace
//       if (!scriptHex.includes(BCAT_NAMESPACE_HEX)) return null;
      
//       console.log(`Found BCAT transaction: ${txid}`);
      
//       // Parse BCAT data from OP_RETURN
//       const bcatData = parseOfficialBCATData(scriptHex);
//       if (!bcatData) return null;
      
//       return {
//         txid,
//         timestamp: new Date((timestamp || 0) * 1000),
//         metadata: bcatData.metadata,
//         chunkTxIds: bcatData.chunkTxIds,
//         thumbnail: undefined // Could extract if first output is inscription
//       };
//     } catch (e) {
//       console.error('Error parsing BCAT transaction:', e);
//       return null;
//     }
//   };

//   // Parse official BCAT protocol data
//   const parseOfficialBCATData = (scriptHex: string): { metadata: any; chunkTxIds: string[] } | null => {
//     try {
//       // Skip OP_RETURN (6a)
//       let pos = 2;
//       const fields: string[] = [];
//       const txids: string[] = [];
      
//       // Parse all push data operations
//       while (pos < scriptHex.length) {
//         let dataLength = 0;
//         let dataStart = pos;
        
//         if (pos + 2 > scriptHex.length) break;
        
//         const opcode = parseInt(scriptHex.substr(pos, 2), 16);
        
//         if (opcode <= 75) {
//           // Direct push
//           dataLength = opcode;
//           dataStart = pos + 2;
//         } else if (opcode === 0x4c && pos + 4 <= scriptHex.length) {
//           // OP_PUSHDATA1
//           dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16);
//           dataStart = pos + 4;
//         } else if (opcode === 0x4d && pos + 6 <= scriptHex.length) {
//           // OP_PUSHDATA2
//           const low = parseInt(scriptHex.substr(pos + 2, 2), 16);
//           const high = parseInt(scriptHex.substr(pos + 4, 2), 16);
//           dataLength = low + (high << 8);
//           dataStart = pos + 6;
//         } else {
//           break;
//         }
        
//         if (dataStart + dataLength * 2 > scriptHex.length) break;
        
//         const dataHex = scriptHex.substr(dataStart, dataLength * 2);
        
//         // Convert to string or keep as hex for txids
//         if (dataLength === 32 && fields.length >= 6) {
//           // This is a transaction ID (32 bytes)
//           let txid = '';
//           for (let i = dataHex.length - 2; i >= 0; i -= 2) {
//             txid += dataHex.substr(i, 2);
//           }
//           txids.push(txid);
//         } else {
//           // This is a string field
//           let str = '';
//           for (let i = 0; i < dataHex.length; i += 2) {
//             const byte = parseInt(dataHex.substr(i, 2), 16);
//             if (byte === 0) {
//               str = null; // NULL byte
//               break;
//             }
//             str += String.fromCharCode(byte);
//           }
//           fields.push(str);
//         }
        
//         pos = dataStart + dataLength * 2;
//       }
      
//       // Validate we have at least 7 fields (namespace + 6 required fields + at least 1 txid)
//       if (fields.length < 6 || txids.length < 1) return null;
      
//       // First field should be the namespace
//       if (fields[0] !== BCAT_NAMESPACE) return null;
      
//       return {
//         metadata: {
//           info: fields[1] || '',
//           mimeType: fields[2] || '',
//           charset: fields[3] === '' ? null : fields[3],
//           filename: fields[4] === '' ? null : fields[4],
//           flag: fields[5] === '' ? null : fields[5],
//           chunks: txids.length
//         },
//         chunkTxIds: txids
//       };
//     } catch (e) {
//       console.error('Error parsing BCAT data:', e);
//       return null;
//     }
//   };

//   // Decode manual BCAT transaction
//   const decodeManualBCAT = async () => {
//     if (!manualTxid.trim()) {
//       alert('Please enter a transaction ID');
//       return;
//     }

//     setDecodingManual(true);
//     setDecodedBcat(null);
    
//     try {
//       const headers: any = {};
//       if (whatsOnChainApiKey) {
//         headers['woc-api-key'] = whatsOnChainApiKey;
//       }

//       // Fetch the transaction
//       const txResponse = await fetch(
//         `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${manualTxid}`,
//         { headers }
//       );

//       if (!txResponse.ok) {
//         throw new Error('Transaction not found');
//       }

//       const txData = await txResponse.json();
      
//       // Parse as BCAT transaction
//       const bcatData = await parseBCATTransaction(txData, manualTxid);
      
//       if (!bcatData) {
//         throw new Error('This is not a valid BCAT transaction');
//       }
      
//       setDecodedBcat(bcatData);
      
//     } catch (error) {
//       console.error('Error decoding BCAT:', error);
//       alert('Failed to decode BCAT transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
//     } finally {
//       setDecodingManual(false);
//     }
//   };

//   // Reconstruct file from chunks
//   const reconstructFile = async (bcat: BCATTransaction) => {
//     setReconstructing(true);
//     setReconstructProgress({ current: 0, total: bcat.chunkTxIds.length });
    
//     try {
//       const headers: any = {};
//       if (whatsOnChainApiKey) {
//         headers['woc-api-key'] = whatsOnChainApiKey;
//       }

//       const chunks: Uint8Array[] = [];
      
//       // Fetch each chunk
//       for (let i = 0; i < bcat.chunkTxIds.length; i++) {
//         setReconstructProgress({ current: i + 1, total: bcat.chunkTxIds.length });
        
//         const txid = bcat.chunkTxIds[i];
//         const txResponse = await fetch(
//           `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${txid}`,
//           { headers }
//         );

//         if (!txResponse.ok) {
//           throw new Error(`Failed to fetch chunk ${i + 1}`);
//         }

//         const txData = await txResponse.json();
        
//         // Extract chunk data (supports both B:// and BCAT part format)
//         const chunkData = await extractChunkData(txData);
//         if (chunkData) {
//           chunks.push(chunkData);
//         }
//       }
      
//       // Combine chunks
//       const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
//       const combined = new Uint8Array(totalLength);
//       let offset = 0;
      
//       for (const chunk of chunks) {
//         combined.set(chunk, offset);
//         offset += chunk.length;
//       }
      
//       // Handle gzip flag if present
//       let finalData = combined;
//       if (bcat.metadata.flag === 'gzip') {
//         // Note: Browser doesn't have native gzip decompression
//         // Would need to use a library like pako for gzip support
//         console.log('File is gzipped. Downloading as-is.');
//       }
      
//       // Create blob and download
//       const blob = new Blob([finalData], { type: bcat.metadata.mimeType || 'application/octet-stream' });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = bcat.metadata.filename || 'bcat-file';
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
      
//       alert(`File reconstructed successfully! Downloaded as: ${bcat.metadata.filename || 'bcat-file'}`);
      
//     } catch (error) {
//       console.error('Error reconstructing file:', error);
//       alert('Failed to reconstruct file: ' + (error instanceof Error ? error.message : 'Unknown error'));
//     } finally {
//       setReconstructing(false);
//       setReconstructProgress({ current: 0, total: 0 });
//     }
//   };

//   // Extract chunk data from B:// or BCAT part format
//   const extractChunkData = async (txData: any): Promise<Uint8Array | null> => {
//     try {
//       // Find OP_RETURN output
//       const opReturnOutput = txData.vout.find((out: any) => 
//         out.scriptPubKey?.hex?.startsWith('6a')
//       );
      
//       if (!opReturnOutput) return null;
      
//       const scriptHex = opReturnOutput.scriptPubKey.hex;
      
//       // Check for BCAT part namespace
//       if (scriptHex.includes(BCAT_PART_NAMESPACE_HEX)) {
//         return extractBCATPartData(scriptHex);
//       }
      
//       // Check for B:// protocol (19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut)
//       const bProtocolHex = namespaceToHex('19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut');
//       if (scriptHex.includes(bProtocolHex)) {
//         return extractBProtocolData(scriptHex);
//       }
      
//       return null;
//     } catch (e) {
//       console.error('Error extracting chunk data:', e);
//       return null;
//     }
//   };

//   // Extract data from BCAT part format
//   const extractBCATPartData = (scriptHex: string): Uint8Array | null => {
//     try {
//       // Find BCAT part namespace position
//       const namespaceIndex = scriptHex.indexOf(BCAT_PART_NAMESPACE_HEX);
//       if (namespaceIndex < 0) return null;
      
//       // Skip to after namespace
//       let pos = namespaceIndex + BCAT_PART_NAMESPACE_HEX.length;
      
//       // Next should be the raw data
//       if (pos + 2 > scriptHex.length) return null;
      
//       const opcode = parseInt(scriptHex.substr(pos, 2), 16);
//       let dataLength = 0;
//       let dataStart = pos;
      
//       if (opcode <= 75) {
//         dataLength = opcode;
//         dataStart = pos + 2;
//       } else if (opcode === 0x4c && pos + 4 <= scriptHex.length) {
//         dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16);
//         dataStart = pos + 4;
//       } else if (opcode === 0x4d && pos + 6 <= scriptHex.length) {
//         const low = parseInt(scriptHex.substr(pos + 2, 2), 16);
//         const high = parseInt(scriptHex.substr(pos + 4, 2), 16);
//         dataLength = low + (high << 8);
//         dataStart = pos + 6;
//       }
      
//       if (dataStart + dataLength * 2 > scriptHex.length) return null;
      
//       const dataHex = scriptHex.substr(dataStart, dataLength * 2);
//       const data = new Uint8Array(dataLength);
      
//       for (let i = 0; i < dataLength; i++) {
//         data[i] = parseInt(dataHex.substr(i * 2, 2), 16);
//       }
      
//       return data;
//     } catch (e) {
//       console.error('Error extracting BCAT part data:', e);
//       return null;
//     }
//   };

//   // Extract data from B:// protocol
//   const extractBProtocolData = (scriptHex: string): Uint8Array | null => {
//     // Implementation would extract data from B:// format
//     // This is simplified - actual implementation would need proper B:// parsing
//     return null;
//   };

//   // Fetch on mount
//   useEffect(() => {
//     if (keyData.address) {
//       fetchBCATTransactions();
//     }
//   }, [keyData.address]);

//   const formatFileSize = (bytes: number): string => {
//     if (!bytes) return 'Unknown size';
//     if (bytes < 1024) return `${bytes} bytes`;
//     if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
//     return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
//   };

//   return (
//     <div className="space-y-4">
//       {/* Manual BCAT Decoder */}
//       <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
//         <h4 className="text-sm font-medium text-white mb-3">Manual BCAT Decoder</h4>
//         <div className="flex gap-2">
//           <input
//             type="text"
//             value={manualTxid}
//             onChange={(e) => setManualTxid(e.target.value)}
//             placeholder="Enter BCAT transaction ID..."
//             className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
//           />
//           <button
//             onClick={decodeManualBCAT}
//             disabled={decodingManual}
//             className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {decodingManual ? 'Decoding...' : 'Decode'}
//           </button>
//         </div>
        
//         {/* Decoded BCAT Display */}
//         {decodedBcat && (
//           <div className="mt-4 p-3 bg-gray-900 rounded">
//             <h5 className="text-sm font-medium text-white mb-2">Decoded BCAT Transaction</h5>
//             <div className="space-y-2 text-xs">
//               <div>
//                 <span className="text-gray-400">Filename:</span>
//                 <span className="text-gray-300 ml-2">{decodedBcat.metadata.filename || 'Not specified'}</span>
//               </div>
//               <div>
//                 <span className="text-gray-400">MIME Type:</span>
//                 <span className="text-gray-300 ml-2">{decodedBcat.metadata.mimeType}</span>
//               </div>
//               <div>
//                 <span className="text-gray-400">Info:</span>
//                 <span className="text-gray-300 ml-2">{decodedBcat.metadata.info || 'None'}</span>
//               </div>
//               <div>
//                 <span className="text-gray-400">Chunks:</span>
//                 <span className="text-gray-300 ml-2">{decodedBcat.metadata.chunks}</span>
//               </div>
//               {decodedBcat.metadata.flag && (
//                 <div>
//                   <span className="text-gray-400">Flag:</span>
//                   <span className="text-gray-300 ml-2">{decodedBcat.metadata.flag}</span>
//                 </div>
//               )}
              
//               {/* Chunk Transaction IDs */}
//               <details className="mt-3">
//                 <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
//                   View chunk transactions ({decodedBcat.chunkTxIds.length})
//                 </summary>
//                 <div className="mt-2 space-y-1">
//                   {decodedBcat.chunkTxIds.map((txid, index) => (
//                     <div key={txid} className="flex items-center justify-between">
//                       <span className="text-gray-500">TX{index + 1}:</span>
//                       <a
//                         href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="text-blue-400 hover:text-blue-300 font-mono"
//                       >
//                         {txid.substring(0, 16)}...{txid.substring(txid.length - 8)}
//                       </a>
//                     </div>
//                   ))}
//                 </div>
//               </details>
              
//               <button
//                 onClick={() => reconstructFile(decodedBcat)}
//                 disabled={reconstructing}
//                 className="mt-3 px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
//               >
//                 ⬇️ Download File
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <h3 className="text-lg font-medium text-white">Your BCAT Files</h3>
//         <button
//           onClick={fetchBCATTransactions}
//           disabled={loading}
//           className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
//         >
//           {loading ? '🔄 Loading...' : '🔄 Refresh'}
//         </button>
//       </div>

//       {/* Loading State */}
//       {loading && (
//         <div className="text-center py-8">
//           <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
//           <p className="text-gray-300 mt-2">Searching for BCAT transactions...</p>
//         </div>
//       )}

//       {/* Error State */}
//       {error && (
//         <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
//           <p className="text-sm text-red-300">{error}</p>
//         </div>
//       )}

//       {/* BCAT List */}
//       {!loading && bcatTransactions.length === 0 && (
//         <div className="text-center py-8">
//           <div className="inline-block mb-4">
//             <span className="text-6xl">📦</span>
//           </div>
//           <p className="text-gray-400">No BCAT files found for this address</p>
//           <p className="text-xs text-gray-500 mt-2">Upload a large file to see it here</p>
//         </div>
//       )}

//       {!loading && bcatTransactions.length > 0 && (
//         <div className="grid gap-4">
//           {bcatTransactions.map((bcat) => (
//             <div
//               key={bcat.txid}
//               className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-all"
//             >
//               <div className="flex items-start justify-between">
//                 <div className="flex-1">
//                   <h4 className="font-medium text-white mb-1">
//                     {bcat.metadata.filename || 'Unnamed File'}
//                   </h4>
                  
//                   <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
//                     <span>{bcat.metadata.mimeType}</span>
//                     <span>•</span>
//                     <span>{bcat.metadata.chunks} chunks</span>
//                     <span>•</span>
//                     <span>{bcat.timestamp.toLocaleDateString()}</span>
//                   </div>
                  
//                   <div className="flex items-center gap-2">
//                     {bcat.metadata.flag && (
//                       <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-900 bg-opacity-50 text-yellow-300">
//                         {bcat.metadata.flag}
//                       </span>
//                     )}
//                     <a
//                       href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${bcat.txid}`}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="text-xs text-blue-400 hover:text-blue-300"
//                     >
//                       View TX
//                     </a>
//                   </div>
                  
//                   {bcat.metadata.info && (
//                     <p className="text-xs text-gray-500 mt-2">Info: {bcat.metadata.info}</p>
//                   )}
//                 </div>
                
//                 <button
//                   onClick={() => reconstructFile(bcat)}
//                   disabled={reconstructing}
//                   className="ml-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {reconstructing && selectedBcat?.txid === bcat.txid ? 
//                     `Downloading... ${reconstructProgress.current}/${reconstructProgress.total}` : 
//                     '⬇️ Download'
//                   }
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Protocol Info Box */}
//       <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//         <h4 className="text-sm font-medium text-blue-300 mb-1">BCAT Protocol Info:</h4>
//         <ul className="text-xs text-gray-300 space-y-1">
//           <li>• Uses official BCAT namespace: {BCAT_NAMESPACE}</li>
//           <li>• Supports B:// and BCAT part formats for chunks</li>
//           <li>• Handles gzip flag for compressed files</li>
//           <li>• Manual decoder works with any BCAT transaction ID</li>
//         </ul>
//       </div>
//     </div>
//   );
// };
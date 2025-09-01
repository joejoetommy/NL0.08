import React, { useState } from 'react';
import { Utils } from '@bsv/sdk';

interface BCATDecoderDisplayProps {
  bcatTxId: string;
  chunkTxIds: string[];
  metadata: {
    filename: string;
    mimeType: string;
    charset?: string | null;
    flag?: string | null;
    info?: string;
    chunks: number;
  };
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
}

// BCAT part namespace
const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

export const BCATDecoderDisplay: React.FC<BCATDecoderDisplayProps> = ({
  bcatTxId,
  chunkTxIds,
  metadata,
  network,
  whatsOnChainApiKey
}) => {
  const [reconstructing, setReconstructing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string>('');
  const [reconstructedContent, setReconstructedContent] = useState<string>('');
  const [contentType, setContentType] = useState<'image' | 'text' | 'video' | 'file'>('file');
  const [encryptionKey, setEncryptionKey] = useState<string>('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);

  // Convert namespace to hex for comparison
  const namespaceToHex = (namespace: string): string => {
    return Utils.toArray(namespace, 'utf8').map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const BCAT_PART_NAMESPACE_HEX = namespaceToHex(BCAT_PART_NAMESPACE);

  // Extract chunk data from BCAT part transaction
  const extractChunkData = async (txid: string, chunkIndex: number): Promise<Uint8Array> => {
    try {
      const headers: any = {};
      if (whatsOnChainApiKey) {
        headers['woc-api-key'] = whatsOnChainApiKey;
      }

      console.log(`Fetching chunk ${chunkIndex + 1} from TX: ${txid}`);
      
      // For BCAT parts, we need to get the data from OP_RETURN output
      // First, let's get the transaction to understand its structure
      const txResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${txid}`,
        { headers }
      );

      if (!txResponse.ok) {
        throw new Error(`Failed to fetch chunk transaction ${chunkIndex + 1}`);
      }

      const txData = await txResponse.json();
      
      // Find OP_RETURN output (should be vout[0] for BCAT parts)
      const opReturnOutput = txData.vout.find((out: any, index: number) => {
        // BCAT parts have OP_RETURN in first output with 0 value
        return out.value === 0 && out.scriptPubKey?.asm?.startsWith('OP_RETURN');
      });
      
      if (!opReturnOutput) {
        throw new Error(`No OP_RETURN found in chunk ${chunkIndex + 1}`);
      }

      // Get the ASM to understand the structure
      const asm = opReturnOutput.scriptPubKey.asm;
      console.log(`Chunk ${chunkIndex + 1} ASM preview:`, asm.substring(0, 200));
      
      // Parse ASM format: "OP_RETURN 31436844487a... <large_hex_data>"
      const asmParts = asm.split(' ');
      
      if (asmParts.length >= 3 && asmParts[0] === 'OP_RETURN') {
        // asmParts[1] should be the namespace hex
        // asmParts[2] should be the actual data hex
        
        const namespaceHex = asmParts[1];
        const dataHex = asmParts[2];
        
        // Verify this is a BCAT_PART transaction
        let namespaceStr = '';
        try {
          for (let i = 0; i < namespaceHex.length; i += 2) {
            namespaceStr += String.fromCharCode(parseInt(namespaceHex.substr(i, 2), 16));
          }
        } catch (e) {
          // Not a string
        }
        
        if (namespaceStr !== BCAT_PART_NAMESPACE && namespaceHex !== BCAT_PART_NAMESPACE_HEX) {
          throw new Error(`Invalid BCAT_PART namespace in chunk ${chunkIndex + 1}`);
        }
        
        console.log(`Found BCAT_PART data in chunk ${chunkIndex + 1}, data length: ${dataHex.length / 2} bytes`);
        
        // Convert hex to Uint8Array
        const data = new Uint8Array(dataHex.length / 2);
        for (let i = 0; i < dataHex.length; i += 2) {
          data[i / 2] = parseInt(dataHex.substr(i, 2), 16);
        }
        
        console.log(`Successfully extracted ${data.length} bytes from chunk ${chunkIndex + 1}`);
        return data;
      }
      
      // If ASM parsing failed, try the hex approach but with a warning about size limits
      const scriptHex = opReturnOutput.scriptPubKey.hex;
      
      console.log(`Script hex length: ${scriptHex.length} characters (${scriptHex.length / 2} bytes)`);
      console.log(`This represents ${(scriptHex.length / 2 / 1024).toFixed(2)}KB of script data`);
      
      if (scriptHex.length >= 99000) {
        // The hex is truncated
        console.warn(`Chunk ${chunkIndex + 1} script appears to be truncated by API.`);
        console.warn(`Script hex ends at ${scriptHex.length} characters`);
        
        // Try to extract what we can from the truncated hex
        // Skip OP_RETURN (6a) and namespace
        let pos = 2;
        
        // Skip namespace (34 bytes preceded by push opcode)
        if (scriptHex.substr(pos, 2) === '22') { // Push 34
          pos += 2 + (34 * 2);
        }
        
        // Check for data push opcode
        const dataOpcode = scriptHex.substr(pos, 2);
        if (dataOpcode === '4c' || dataOpcode === '4d' || dataOpcode === '4e') {
          pos += 2;
          let dataLength = 0;
          
          if (dataOpcode === '4c') { // OP_PUSHDATA1
            dataLength = parseInt(scriptHex.substr(pos, 2), 16);
          } else if (dataOpcode === '4d') { // OP_PUSHDATA2
            const lengthBytes = scriptHex.substr(pos, 4);
            dataLength = parseInt(lengthBytes.substr(0, 2), 16) + 
                        (parseInt(lengthBytes.substr(2, 2), 16) << 8);
          } else if (dataOpcode === '4e') { // OP_PUSHDATA4
            const lengthBytes = scriptHex.substr(pos, 8);
            dataLength = parseInt(lengthBytes.substr(0, 2), 16) + 
                        (parseInt(lengthBytes.substr(2, 2), 16) << 8) +
                        (parseInt(lengthBytes.substr(4, 2), 16) << 16) +
                        (parseInt(lengthBytes.substr(6, 2), 16) << 24);
          }
          
          console.log(`Chunk declares ${dataLength} bytes (${(dataLength / 1024).toFixed(2)}KB) of data`);
          console.log(`But API only returned ${scriptHex.length / 2} bytes of script`);
          
          throw new Error(
            `WhatsOnChain API returned ${(scriptHex.length / 2 / 1024).toFixed(2)}KB of script data, ` +
            `but chunk contains ${(dataLength / 1024).toFixed(2)}KB.\n\n` +
            `The API appears to truncate at around ${(scriptHex.length / 2 / 1024).toFixed(0)}KB.\n\n` +
            `To retrieve this file, you can:\n` +
            `1. Use smaller chunk sizes (try <${Math.floor(scriptHex.length / 2 / 1024 * 0.9)}KB)\n` +
            `2. Use a BSV node with JSON-RPC access\n` +
            `3. Use specialized BCAT tools\n\n` +
            `Transaction: ${txid}`
          );
        }
      }
      
      // Try to parse the hex manually
      console.log(`Attempting to parse hex for chunk ${chunkIndex + 1}, script length: ${scriptHex.length}`);
      
      // Parse the OP_RETURN data
      let pos = 2; // Skip OP_RETURN (6a)
      let foundNamespace = false;
      let dataHex = '';
      
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
        } else if (opcode === 0x4e && pos + 10 <= scriptHex.length) {
          // OP_PUSHDATA4
          dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16) + 
                       (parseInt(scriptHex.substr(pos + 4, 2), 16) << 8) +
                       (parseInt(scriptHex.substr(pos + 6, 2), 16) << 16) +
                       (parseInt(scriptHex.substr(pos + 8, 2), 16) << 24);
          dataStart = pos + 10;
        } else {
          console.error('Unknown opcode:', opcode.toString(16), 'at position:', pos);
          break;
        }
        
        if (dataStart + dataLength * 2 > scriptHex.length) {
          console.error('Data extends beyond script length');
          break;
        }
        
        const currentDataHex = scriptHex.substr(dataStart, dataLength * 2);
        
        // Check if this is the namespace
        if (!foundNamespace) {
          // Convert to string to check
          let dataAsString = '';
          try {
            for (let i = 0; i < currentDataHex.length; i += 2) {
              dataAsString += String.fromCharCode(parseInt(currentDataHex.substr(i, 2), 16));
            }
          } catch (e) {
            // Not a string
          }
          
          if (currentDataHex === BCAT_PART_NAMESPACE_HEX || dataAsString === BCAT_PART_NAMESPACE) {
            foundNamespace = true;
            console.log(`Found BCAT_PART namespace at position ${pos}`);
          }
        } else if (!dataHex) {
          // This should be our actual data
          dataHex = currentDataHex;
          console.log(`Found chunk data at position ${pos}, length: ${dataLength} bytes`);
          break;
        }
        
        pos = dataStart + dataLength * 2;
      }
      
      if (!foundNamespace || !dataHex) {
        throw new Error(`Failed to extract data from chunk ${chunkIndex + 1}. The transaction structure may be incompatible.`);
      }
      
      // Convert hex to Uint8Array
      const data = new Uint8Array(dataHex.length / 2);
      for (let i = 0; i < dataHex.length; i += 2) {
        data[i / 2] = parseInt(dataHex.substr(i, 2), 16);
      }
      
      console.log(`Extracted ${data.length} bytes from chunk ${chunkIndex + 1}`);
      return data;
      
    } catch (error) {
      console.error(`Error extracting chunk ${chunkIndex + 1}:`, error);
      throw error;
    }
  };

  // Reconstruct file from chunks
  const reconstructFile = async () => {
    setReconstructing(true);
    setProgress({ current: 0, total: chunkTxIds.length });
    setError('');
    setReconstructedContent('');
    setFileBlob(null);
    
    try {
      const chunks: Uint8Array[] = [];
      
      // Fetch and extract each chunk
      for (let i = 0; i < chunkTxIds.length; i++) {
        setProgress({ current: i + 1, total: chunkTxIds.length });
        
        console.log(`Fetching chunk ${i + 1} from TX: ${chunkTxIds[i]}`);
        const chunkData = await extractChunkData(chunkTxIds[i], i);
        chunks.push(chunkData);
        
        // Small delay to avoid rate limiting
        if (i < chunkTxIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Combine all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      console.log(`Reconstructed file: ${totalLength} bytes`);
      
      // Handle gzip decompression if flagged
      let finalData = combined;
      if (metadata.flag === 'gzip') {
        // For now, we'll handle gzipped data as-is
        // In production, you'd use a library like pako to decompress
        console.log('File is gzipped. Handling as compressed data.');
      }
      
      // Create blob from data
      const mimeType = metadata.mimeType || 'application/octet-stream';
      const blob = new Blob([finalData], { type: mimeType });
      setFileBlob(blob);
      
      // Determine content type and handle display
      if (mimeType.startsWith('image/')) {
        setContentType('image');
        const url = URL.createObjectURL(blob);
        setReconstructedContent(url);
      } else if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        setContentType('text');
        const text = new TextDecoder().decode(finalData);
        setReconstructedContent(text);
      } else if (mimeType.startsWith('video/')) {
        setContentType('video');
        const url = URL.createObjectURL(blob);
        setReconstructedContent(url);
      } else {
        setContentType('file');
        // For other file types, we'll just enable download
      }
      
      setError('');
      
    } catch (error) {
      console.error('Error reconstructing file:', error);
      setError(error instanceof Error ? error.message : 'Failed to reconstruct file');
    } finally {
      setReconstructing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // Download the reconstructed file
  const downloadFile = () => {
    if (!fileBlob) {
      setError('No file to download. Please reconstruct first.');
      return;
    }
    
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = metadata.filename || `bcat-file-${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Decrypt content (placeholder for future implementation)
  const decryptContent = async () => {
    if (!encryptionKey.trim()) {
      setError('Please enter an encryption key');
      return;
    }
    
    // TODO: Implement decryption logic
    setError('Decryption not yet implemented');
  };

  return (
    <div className="space-y-4">
      {/* File Info */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-3">BCAT File Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Filename:</span>
            <p className="text-white break-all">{metadata.filename}</p>
          </div>
          <div>
            <span className="text-gray-400">Type:</span>
            <p className="text-white">{metadata.mimeType}</p>
          </div>
          <div>
            <span className="text-gray-400">Chunks:</span>
            <p className="text-white">{metadata.chunks}</p>
          </div>
          <div>
            <span className="text-gray-400">Info:</span>
            <p className="text-white">{metadata.info || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Encryption Key Input (for future use) */}
      {isEncrypted && (
        <div className="bg-gray-800 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Encryption Key (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
              placeholder="Enter decryption key if file is encrypted..."
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-400"
            />
            <button
              onClick={decryptContent}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
            >
              Decrypt
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={reconstructFile}
          disabled={reconstructing}
          className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reconstructing ? `Reconstructing... ${progress.current}/${progress.total}` : '🔨 Reconstruct File'}
        </button>
        
        {fileBlob && (
          <button
            onClick={downloadFile}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            💾 Download File
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {reconstructing && progress.total > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-300 mb-2">
            Processing chunk {progress.current} of {progress.total}
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
          <p className="text-sm text-red-300 whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* Content Display */}
      {reconstructedContent && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Preview</h4>
          
          {contentType === 'image' && (
            <div className="flex flex-col items-center">
              <img 
                src={reconstructedContent} 
                alt={metadata.filename}
                className="max-w-full max-h-96 rounded"
                onError={() => setError('Failed to display image')}
              />
              <button
                onClick={() => window.open(reconstructedContent, '_blank')}
                className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              >
                🔍 View Full Size
              </button>
            </div>
          )}
          
          {contentType === 'text' && (
            <div className="bg-gray-900 rounded p-3 max-h-96 overflow-y-auto">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap">{reconstructedContent}</pre>
            </div>
          )}
          
          {contentType === 'video' && (
            <div className="flex flex-col items-center">
              <video 
                controls 
                className="max-w-full max-h-96 rounded"
                src={reconstructedContent}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          
          {contentType === 'file' && (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-3">
                File reconstructed successfully. Click download to save.
              </p>
              <p className="text-xs text-gray-500">
                File type: {metadata.mimeType}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chunk Details (Expandable) */}
      <details className="bg-gray-800 rounded-lg p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-300 hover:text-white">
          View Chunk Transactions ({chunkTxIds.length})
        </summary>
        <div className="mt-3 space-y-1">
          {chunkTxIds.map((txid, index) => (
            <div key={txid} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Chunk {index + 1}:</span>
              <a
                href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-mono"
              >
                {txid.substring(0, 16)}...{txid.substring(txid.length - 8)}
              </a>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};           



// import React, { useState } from 'react';
// import { Utils } from '@bsv/sdk';
// //  import Sheet1 from './displaysheets/Sheet1'; // Import the display component

// interface BCATDecoderDisplayProps {
//   bcatTxId: string;
//   chunkTxIds: string[];
//   metadata: {
//     filename: string;
//     mimeType: string;
//     charset?: string | null;
//     flag?: string | null;
//     info?: string;
//     chunks: number;
//   };
//   network: 'mainnet' | 'testnet';
//   whatsOnChainApiKey?: string;
// }

// // Define the property data structure
// interface PropertyData {
//   title: string;
//   description: string;
//   mainImage: string | null;
//   propertyName: string;
//   numberOfGuests: number;
//   numberOfBathrooms: number;
//   numberOfSingleBeds: number;
//   numberOfQueenBeds: number;
//   numberOfKingBeds: number;
//   numberOfKidBeds: number;
//   numberOfTufanBeds: number;
//   hotelRoomForOccupants: string;
//   hotelRoomBedType: string;
//   arrangementAndFacilities: string;
//   otherTypesOfHotelRooms: string;
//   hotelRoomFacilities: string[];
//   gymOrFitness: string;
//   dedicatedWorkstation: string;
//   spaFacilities: string[];
//   general: string[];
//   freeWifi: string;
//   rules: any;
//   checkInFrom: string;
//   checkInUntil: string;
//   checkOutFrom: string;
//   checkOutUntil: string;
//   selectedLanguages: string[];
//   receptionDetails: string;
//   hotelRoomDescription: string;
//   additionalHotelFeatures: string;
//   cancellationPolicy: string;
//   yourRole: string;
//   sellersName: string;
//   contactDetails: string;
//   roomPhotosCount: number;
//   hotelPhotosCount: number;
//   facilitiesPhotosCount: number;
//   hasProfileImage: boolean;
//   createdAt: string;
//   totalSizeMB: number;
// }

// // BCAT part namespace    dateFns.addYears
// const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

// export const BCATDecoderDisplay: React.FC<BCATDecoderDisplayProps> = ({
//   bcatTxId,
//   chunkTxIds,
//   metadata,
//   network,
//   whatsOnChainApiKey
// }) => {
//   const [reconstructing, setReconstructing] = useState(false);
//   const [progress, setProgress] = useState({ current: 0, total: 0 });
//   const [error, setError] = useState<string>('');
//   const [reconstructedContent, setReconstructedContent] = useState<string>('');
//   const [contentType, setContentType] = useState<'property' | 'image' | 'text' | 'video' | 'file'>('file');
//   const [fileBlob, setFileBlob] = useState<Blob | null>(null);
//   const [propertyData, setPropertyData] = useState<any>(null);
//   const [showPropertyDisplay, setShowPropertyDisplay] = useState(false);

//   // Convert namespace to hex for comparison
//   const namespaceToHex = (namespace: string): string => {
//     return Utils.toArray(namespace, 'utf8').map(b => b.toString(16).padStart(2, '0')).join('');
//   };

//   const BCAT_PART_NAMESPACE_HEX = namespaceToHex(BCAT_PART_NAMESPACE);

//   // Extract chunk data from BCAT part transaction
//   const extractChunkData = async (txid: string, chunkIndex: number): Promise<Uint8Array> => {
//     try {
//       const headers: any = {};
//       if (whatsOnChainApiKey) {
//         headers['woc-api-key'] = whatsOnChainApiKey;
//       }

//       console.log(`Fetching chunk ${chunkIndex + 1} from TX: ${txid}`);
      
//       const txResponse = await fetch(
//         `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${txid}`,
//         { headers }
//       );

//       if (!txResponse.ok) {
//         throw new Error(`Failed to fetch chunk transaction ${chunkIndex + 1}`);
//       }

//       const txData = await txResponse.json();
      
//       // Find OP_RETURN output
//       const opReturnOutput = txData.vout.find((out: any) => {
//         return out.value === 0 && out.scriptPubKey?.asm?.startsWith('OP_RETURN');
//       });
      
//       if (!opReturnOutput) {
//         throw new Error(`No OP_RETURN found in chunk ${chunkIndex + 1}`);
//       }

//       // Parse ASM format
//       const asm = opReturnOutput.scriptPubKey.asm;
//       const asmParts = asm.split(' ');
      
//       if (asmParts.length >= 3 && asmParts[0] === 'OP_RETURN') {
//         const dataHex = asmParts[2];
        
//         // Convert hex to Uint8Array
//         const data = new Uint8Array(dataHex.length / 2);
//         for (let i = 0; i < dataHex.length; i += 2) {
//           data[i / 2] = parseInt(dataHex.substr(i, 2), 16);
//         }
        
//         console.log(`Successfully extracted ${data.length} bytes from chunk ${chunkIndex + 1}`);
//         return data;
//       }
      
//       throw new Error(`Failed to extract data from chunk ${chunkIndex + 1}`);
      
//     } catch (error) {
//       console.error(`Error extracting chunk ${chunkIndex + 1}:`, error);
//       throw error;
//     }
//   };

//   // Parse property data from reconstructed bytes
//   const parsePropertyData = (data: Uint8Array): any => {
//     try {
//       let offset = 0;
//       const extractedData: any = {
//         images: {},
//         propertyData: null
//       };

//       // Read JSON data size (first 4 bytes)
//       const jsonSizeView = new DataView(data.buffer, offset, 4);
//       const jsonSize = jsonSizeView.getUint32(0, true);
//       offset += 4;

//       // Read JSON data
//       const jsonBytes = data.slice(offset, offset + jsonSize);
//       const jsonString = new TextDecoder().decode(jsonBytes);
//       extractedData.propertyData = JSON.parse(jsonString);
//       offset += jsonSize;

//       // Read images
//       while (offset < data.length) {
//         // Read label size
//         if (offset + 4 > data.length) break;
//         const labelSizeView = new DataView(data.buffer, offset, 4);
//         const labelSize = labelSizeView.getUint32(0, true);
//         offset += 4;

//         // Read label
//         const labelBytes = data.slice(offset, offset + labelSize);
//         const label = new TextDecoder().decode(labelBytes);
//         offset += labelSize;

//         // Read image size
//         if (offset + 4 > data.length) break;
//         const imageSizeView = new DataView(data.buffer, offset, 4);
//         const imageSize = imageSizeView.getUint32(0, true);
//         offset += 4;

//         // Read image data
//         const imageData = data.slice(offset, offset + imageSize);
//         offset += imageSize;

//         // Create blob URL for image
//         const blob = new Blob([imageData], { type: 'image/jpeg' });
//         const imageUrl = URL.createObjectURL(blob);
//         extractedData.images[label] = imageUrl;
//       }

//       return extractedData;
//     } catch (error) {
//       console.error('Error parsing property data:', error);
//       throw new Error('Failed to parse property data structure');
//     }
//   };

//   // Transform property data to match Sheet1 component expectations
//   const transformToSheetData = (propertyData: PropertyData, images: any): any => {
//     return {
//       // Alert dialog data (main display card)
//       alertDialogTitle: propertyData.title,
//       alertDialogDescription: propertyData.description,
//       alertDialogImage: images.mainImage || '/placeholder-image.jpg',
      
//       // Property details
//       propertyName: propertyData.propertyName,
//       numberOfGuests: propertyData.numberOfGuests,
//       numberOfBathrooms: propertyData.numberOfBathrooms,
//       numberOfSingleBeds: propertyData.numberOfSingleBeds,
//       numberOfQueenBeds: propertyData.numberOfQueenBeds,
//       numberOfKingBeds: propertyData.numberOfKingBeds,
//       numberOfKidBeds: propertyData.numberOfKidBeds,
//       numberOfTufanBeds: propertyData.numberOfTufanBeds,
//       hotelRoomForOccupants: propertyData.hotelRoomForOccupants,
//       hotelRoomBedType: propertyData.hotelRoomBedType,
//       arrangementAndFacilities: propertyData.arrangementAndFacilities,
//       otherTypesOfHotelRooms: propertyData.otherTypesOfHotelRooms,
//       hotelRoomFacilities: propertyData.hotelRoomFacilities || [],
//       gymOrFitness: propertyData.gymOrFitness,
//       dedicatedWorkstation: propertyData.dedicatedWorkstation,
//       spaFacilities: propertyData.spaFacilities || [],
//       general: propertyData.general || [],
//       freeWifi: propertyData.freeWifi,
//       rules: propertyData.rules || {
//         smokingAllowed: false,
//         petsAllowed: false,
//         childrenAllowed: false,
//         partiesAllowed: false,
//         additionalRules: ''
//       },
//       checkInFrom: propertyData.checkInFrom,
//       checkInUntil: propertyData.checkInUntil,
//       checkOutFrom: propertyData.checkOutFrom,
//       checkOutUntil: propertyData.checkOutUntil,
//       receptionDetails: propertyData.receptionDetails,
//       hotelRoomDescription: propertyData.hotelRoomDescription,
//       additionalHotelFeatures: propertyData.additionalHotelFeatures,
//       cancellationPolicy: propertyData.cancellationPolicy,
//       yourRole: propertyData.yourRole,
//       sellersName: propertyData.sellersName,
//       contactDetails: propertyData.contactDetails,
//       hostLanguages: propertyData.selectedLanguages || [],
      
//       // Profile image
//       profileImage: images.profileImage || '/placeholder-profile.jpg',
      
//       // Photo arrays - create arrays of image URLs
//       roomPhotos: Array.from({ length: propertyData.roomPhotosCount }, (_, i) => 
//         images[`roomPhoto_${i}`] || '/placeholder-room.jpg'
//       ),
//       hotelPhotos: Array.from({ length: propertyData.hotelPhotosCount }, (_, i) => 
//         images[`hotelPhoto_${i}`] || '/placeholder-hotel.jpg'
//       ),
//       facilitiesPhotos: Array.from({ length: propertyData.facilitiesPhotosCount }, (_, i) => 
//         images[`facilitiesPhoto_${i}`] || '/placeholder-facilities.jpg'
//       ),
      
//       // Additional metadata
//       uploadDate: new Date(propertyData.createdAt).toLocaleDateString(),
//       user: 'BCAT User', // You can extract this from transaction if needed
      
//       // Interaction data (placeholder - can be fetched separately)
//       Interact: {
//         Comment: [],
//         Likes: [],
//         Dislikes: [],
//         Reactions: [],
//         Report: [],
//         Review: [],
//         Tip: null,
//         Direct: []
//       }
//     };
//   };

//   // Reconstruct file from chunks
//   const reconstructFile = async () => {
//     setReconstructing(true);
//     setProgress({ current: 0, total: chunkTxIds.length });
//     setError('');
//     setReconstructedContent('');
//     setFileBlob(null);
//     setPropertyData(null);
//     setShowPropertyDisplay(false);
    
//     try {
//       const chunks: Uint8Array[] = [];
      
//       // Fetch and extract each chunk
//       for (let i = 0; i < chunkTxIds.length; i++) {
//         setProgress({ current: i + 1, total: chunkTxIds.length });
        
//         const chunkData = await extractChunkData(chunkTxIds[i], i);
//         chunks.push(chunkData);
        
//         if (i < chunkTxIds.length - 1) {
//           await new Promise(resolve => setTimeout(resolve, 100));
//         }
//       }
      
//       // Combine all chunks
//       const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
//       const combined = new Uint8Array(totalLength);
//       let offset = 0;
      
//       for (const chunk of chunks) {
//         combined.set(chunk, offset);
//         offset += chunk.length;
//       }
      
//       console.log(`Reconstructed file: ${totalLength} bytes`);
      
//       // Check if this is property data (JSON mime type)
//       if (metadata.mimeType === 'application/json' || metadata.info === 'property') {
//         try {
//           // Parse property data
//           const extractedData = parsePropertyData(combined);
//           const sheetData = transformToSheetData(extractedData.propertyData, extractedData.images);
          
//           setPropertyData(sheetData);
//           setContentType('property');
//           setShowPropertyDisplay(true);
          
//         } catch (e) {
//           console.error('Error parsing as property data:', e);
//           // Fall back to standard file handling
//           handleStandardFile(combined);
//         }
//       } else {
//         handleStandardFile(combined);
//       }
      
//       setError('');
      
//     } catch (error) {
//       console.error('Error reconstructing file:', error);
//       setError(error instanceof Error ? error.message : 'Failed to reconstruct file');
//     } finally {
//       setReconstructing(false);
//       setProgress({ current: 0, total: 0 });
//     }
//   };

//   // Handle standard file types
//   const handleStandardFile = (data: Uint8Array) => {
//     const mimeType = metadata.mimeType || 'application/octet-stream';
//     const blob = new Blob([data], { type: mimeType });
//     setFileBlob(blob);
    
//     if (mimeType.startsWith('image/')) {
//       setContentType('image');
//       const url = URL.createObjectURL(blob);
//       setReconstructedContent(url);
//     } else if (mimeType.startsWith('text/')) {
//       setContentType('text');
//       const text = new TextDecoder().decode(data);
//       setReconstructedContent(text);
//     } else if (mimeType.startsWith('video/')) {
//       setContentType('video');
//       const url = URL.createObjectURL(blob);
//       setReconstructedContent(url);
//     } else {
//       setContentType('file');
//     }
//   };

//   // Download the reconstructed file
//   const downloadFile = () => {
//     if (!fileBlob) {
//       setError('No file to download. Please reconstruct first.');
//       return;
//     }
    
//     const url = URL.createObjectURL(fileBlob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = metadata.filename || `bcat-file-${Date.now()}`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <div className="space-y-4">
//       {/* File Info */}
//       <div className="bg-gray-800 rounded-lg p-4">
//         <h3 className="text-lg font-medium text-white mb-3">BCAT File Details</h3>
//         <div className="grid grid-cols-2 gap-3 text-sm">
//           <div>
//             <span className="text-gray-400">Filename:</span>
//             <p className="text-white break-all">{metadata.filename}</p>
//           </div>
//           <div>
//             <span className="text-gray-400">Type:</span>
//             <p className="text-white">{metadata.mimeType}</p>
//           </div>
//           <div>
//             <span className="text-gray-400">Chunks:</span>
//             <p className="text-white">{metadata.chunks}</p>
//           </div>
//           <div>
//             <span className="text-gray-400">Info:</span>
//             <p className="text-white">{metadata.info || 'N/A'}</p>
//           </div>
//         </div>
//       </div>

//       {/* Action Buttons */}
//       <div className="flex gap-3">
//         <button
//           onClick={reconstructFile}
//           disabled={reconstructing}
//           className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//         >
//           {reconstructing ? `Reconstructing... ${progress.current}/${progress.total}` : '🔨 Reconstruct File'}
//         </button>
        
//         {fileBlob && contentType !== 'property' && (
//           <button
//             onClick={downloadFile}
//             className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
//           >
//             💾 Download File
//           </button>
//         )}
        
//         {propertyData && (
//           <button
//             onClick={() => setShowPropertyDisplay(!showPropertyDisplay)}
//             className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
//           >
//             {showPropertyDisplay ? '🔽 Hide Property' : '🏠 View Property'}
//           </button>
//         )}
//       </div>

//       {/* Progress Bar */}
//       {reconstructing && progress.total > 0 && (
//         <div className="bg-gray-800 rounded-lg p-4">
//           <p className="text-sm text-gray-300 mb-2">
//             Processing chunk {progress.current} of {progress.total}
//           </p>
//           <div className="w-full bg-gray-700 rounded-full h-2">
//             <div 
//               className="bg-purple-500 h-2 rounded-full transition-all"
//               style={{ width: `${(progress.current / progress.total) * 100}%` }}
//             />
//           </div>
//         </div>
//       )}

//       {/* Error Display */}
//       {error && (
//         <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
//           <p className="text-sm text-red-300 whitespace-pre-line">{error}</p>
//         </div>
//       )}

//       {/* Property Display */}
//       {showPropertyDisplay && propertyData && contentType === 'property' && (
//         <div className="bg-gray-900 rounded-lg p-4">
//           <h4 className="text-lg font-medium text-white mb-3">Property Listing</h4>
//           {/* <Sheet1 data={propertyData} /> */}
//         </div>
//       )}

//       {/* Standard Content Display */}
//       {reconstructedContent && contentType !== 'property' && (
//         <div className="bg-gray-800 rounded-lg p-4">
//           <h4 className="text-sm font-medium text-gray-300 mb-3">Preview</h4>
          
//           {contentType === 'image' && (
//             <div className="flex flex-col items-center">
//               <img 
//                 src={reconstructedContent} 
//                 alt={metadata.filename}
//                 className="max-w-full max-h-96 rounded"
//                 onError={() => setError('Failed to display image')}
//               />
//             </div>
//           )}
          
//           {contentType === 'text' && (
//             <div className="bg-gray-900 rounded p-3 max-h-96 overflow-y-auto">
//               <pre className="text-gray-300 text-sm whitespace-pre-wrap">{reconstructedContent}</pre>
//             </div>
//           )}
          
//           {contentType === 'video' && (
//             <video controls className="max-w-full max-h-96 rounded" src={reconstructedContent}>
//               Your browser does not support the video tag.
//             </video>
//           )}
//         </div>
//       )}

//       {/* Chunk Details */}
//       <details className="bg-gray-800 rounded-lg p-4">
//         <summary className="cursor-pointer text-sm font-medium text-gray-300 hover:text-white">
//           View Chunk Transactions ({chunkTxIds.length})
//         </summary>
//         <div className="mt-3 space-y-1">
//           {chunkTxIds.map((txid, index) => (
//             <div key={txid} className="flex items-center justify-between text-xs">
//               <span className="text-gray-400">Chunk {index + 1}:</span>
//               <a
//                 href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-blue-400 hover:text-blue-300 font-mono"
//               >
//                 {txid.substring(0, 16)}...{txid.substring(txid.length - 8)}
//               </a>
//             </div>
//           ))}
//         </div>
//       </details>
//     </div>
//   );
// };
// // Your BCAT Files
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

      // Fetch the transaction
      const txResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${txid}`,
        { headers }
      );

      if (!txResponse.ok) {
        throw new Error(`Failed to fetch chunk transaction ${chunkIndex + 1}`);
      }

      const txData = await txResponse.json();
      
      // Find OP_RETURN output
      const opReturnOutput = txData.vout.find((out: any) => 
        out.scriptPubKey?.hex?.startsWith('6a')
      );
      
      if (!opReturnOutput) {
        throw new Error(`No OP_RETURN found in chunk ${chunkIndex + 1}`);
      }
      
      const scriptHex = opReturnOutput.scriptPubKey.hex;
      console.log(`Chunk ${chunkIndex + 1} script hex preview:`, scriptHex.substring(0, 200));
      
      // Parse the OP_RETURN data
      let pos = 2; // Skip OP_RETURN (6a)
      
      // First, we should find the BCAT_PART namespace
      let foundNamespace = false;
      let dataHex = '';
      let pushCount = 0;
      
      console.log(`Parsing chunk ${chunkIndex + 1}, script length: ${scriptHex.length}`);
      
      while (pos < scriptHex.length) {
        if (pos + 2 > scriptHex.length) break;
        
        const opcode = parseInt(scriptHex.substr(pos, 2), 16);
        let dataLength = 0;
        let dataStart = pos;
        
        console.log(`Position ${pos}: opcode 0x${opcode.toString(16)}`);
        
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
        pushCount++;
        
        console.log(`Push ${pushCount}: ${dataLength} bytes at position ${dataStart}`);
        
        // Convert to string to check if it's the namespace
        let dataAsString = '';
        try {
          for (let i = 0; i < currentDataHex.length; i += 2) {
            dataAsString += String.fromCharCode(parseInt(currentDataHex.substr(i, 2), 16));
          }
          console.log(`Push ${pushCount} as string: "${dataAsString}"`);
        } catch (e) {
          console.log(`Push ${pushCount} is binary data`);
        }
        
        // Check if this is the namespace
        if (!foundNamespace && currentDataHex === BCAT_PART_NAMESPACE_HEX) {
          foundNamespace = true;
          console.log(`Found BCAT_PART namespace at push ${pushCount}`);
        } else if (!foundNamespace && dataAsString === BCAT_PART_NAMESPACE) {
          foundNamespace = true;
          console.log(`Found BCAT_PART namespace (string match) at push ${pushCount}`);
        } else if (foundNamespace && !dataHex) {
          // This should be our actual data
          dataHex = currentDataHex;
          console.log(`Found chunk data at push ${pushCount}, length: ${dataLength} bytes`);
          break;
        }
        
        pos = dataStart + dataLength * 2;
      }
      
      if (!foundNamespace) {
        // Try alternative format where namespace and data might be in a single push
        console.log('Trying alternative BCAT format...');
        
        // Reset and try again
        pos = 2;
        while (pos < scriptHex.length) {
          if (pos + 2 > scriptHex.length) break;
          
          const opcode = parseInt(scriptHex.substr(pos, 2), 16);
          let dataLength = 0;
          let dataStart = pos;
          
          if (opcode <= 75) {
            dataLength = opcode;
            dataStart = pos + 2;
          } else if (opcode === 0x4c && pos + 4 <= scriptHex.length) {
            dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16);
            dataStart = pos + 4;
          } else if (opcode === 0x4d && pos + 6 <= scriptHex.length) {
            dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16) + 
                         (parseInt(scriptHex.substr(pos + 4, 2), 16) << 8);
            dataStart = pos + 6;
          } else if (opcode === 0x4e && pos + 10 <= scriptHex.length) {
            dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16) + 
                         (parseInt(scriptHex.substr(pos + 4, 2), 16) << 8) +
                         (parseInt(scriptHex.substr(pos + 6, 2), 16) << 16) +
                         (parseInt(scriptHex.substr(pos + 8, 2), 16) << 24);
            dataStart = pos + 10;
          }
          
          if (dataStart + dataLength * 2 <= scriptHex.length) {
            // This might be our data - just take the first large push
            if (dataLength > 100) { // Assuming actual data is larger than namespace
              dataHex = scriptHex.substr(dataStart, dataLength * 2);
              console.log(`Found potential data in alternative format: ${dataLength} bytes`);
              foundNamespace = true; // Mark as found to continue
              break;
            }
          }
          
          pos = dataStart + dataLength * 2;
        }
      }
      
      if (!foundNamespace) {
        throw new Error(`BCAT_PART namespace not found in chunk ${chunkIndex + 1}`);
      }
      
      if (!dataHex) {
        throw new Error(`No data found after namespace in chunk ${chunkIndex + 1}`);
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
          <p className="text-sm text-red-300">{error}</p>
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
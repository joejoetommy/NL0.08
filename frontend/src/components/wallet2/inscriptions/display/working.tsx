import React, { useState, useMemo } from 'react';
import { Utils } from '@bsv/sdk';
import PropertyViewer from '../../inscriptions/display/sheet4';

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

/** 
 * Parse property data from reconstructed BCAT content
 * This handles the special format where JSON and images are combined
 */
function parsePropertyData(data: Uint8Array): { json: any; images: Map<string, Uint8Array> } {
  const images = new Map<string, Uint8Array>();
  let jsonData: any = null;
  
  try {
    let offset = 0;
    
    // First, try to read JSON size (4 bytes)
    if (offset + 4 <= data.length) {
      const jsonSize = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
      offset += 4;
      
      // Read JSON data
      if (offset + jsonSize <= data.length) {
        const jsonBytes = data.slice(offset, offset + jsonSize);
        const jsonText = new TextDecoder().decode(jsonBytes);
        try {
          jsonData = JSON.parse(jsonText);
          offset += jsonSize;
        } catch (e) {
          console.log('Failed to parse JSON at expected position, trying alternative parsing');
          // Reset offset and try alternative parsing
          offset = 0;
        }
      }
    }
    
    // If standard parsing failed, try to find JSON in the data
    if (!jsonData) {
      const textData = new TextDecoder().decode(data);
      // Look for JSON structure
      const jsonMatch = textData.match(/\{[\s\S]*?\}(?=([A-Z]|$))/);
      if (jsonMatch) {
        try {
          jsonData = JSON.parse(jsonMatch[0]);
          // Find where JSON ends to continue with image parsing
          const jsonEndIndex = new TextEncoder().encode(jsonMatch[0]).length;
          offset = jsonEndIndex;
        } catch (e) {
          console.log('Alternative JSON parsing failed');
        }
      }
    }
    
    // Try to extract images if we have remaining data
    while (offset < data.length - 8) { // Need at least 8 bytes for label size + image size
      try {
        // Read label size (4 bytes)
        const labelSize = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
        offset += 4;
        
        if (labelSize > 1000 || offset + labelSize > data.length) break; // Sanity check
        
        // Read label
        const labelBytes = data.slice(offset, offset + labelSize);
        const label = new TextDecoder().decode(labelBytes);
        offset += labelSize;
        
        if (offset + 4 > data.length) break;
        
        // Read image size (4 bytes)
        const imageSize = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
        offset += 4;
        
        if (imageSize > data.length - offset) break; // Sanity check
        
        // Read image data
        const imageData = data.slice(offset, offset + imageSize);
        offset += imageSize;
        
        images.set(label, imageData);
        console.log(`Extracted image: ${label}, size: ${imageSize} bytes`);
      } catch (e) {
        console.log('Error extracting image, stopping image extraction');
        break;
      }
    }
    
    // If we still don't have JSON, try parsing the entire thing as JSON
    if (!jsonData) {
      try {
        const fullText = new TextDecoder().decode(data);
        jsonData = JSON.parse(fullText);
      } catch (e) {
        console.log('Could not parse as pure JSON');
      }
    }
    
  } catch (error) {
    console.error('Error parsing property data:', error);
  }
  
  return { json: jsonData, images };
}

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
  const [rawData, setRawData] = useState<Uint8Array | null>(null);
  
  const [selectedView, setSelectedView] = useState("auto");

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
      
      const txResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${txid}`,
        { headers }
      );

      if (!txResponse.ok) {
        throw new Error(`Failed to fetch chunk transaction ${chunkIndex + 1}`);
      }

      const txData = await txResponse.json();
      
      const opReturnOutput = txData.vout.find((out: any) => {
        return out.value === 0 && out.scriptPubKey?.asm?.startsWith('OP_RETURN');
      });
      
      if (!opReturnOutput) {
        throw new Error(`No OP_RETURN found in chunk ${chunkIndex + 1}`);
      }

      const asm = opReturnOutput.scriptPubKey.asm;
      console.log(`Chunk ${chunkIndex + 1} ASM preview:`, asm.substring(0, 200));
      
      const asmParts = asm.split(' ');
      
      if (asmParts.length >= 3 && asmParts[0] === 'OP_RETURN') {
        const namespaceHex = asmParts[1];
        const dataHex = asmParts[2];
        
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
        
        const data = new Uint8Array(dataHex.length / 2);
        for (let i = 0; i < dataHex.length; i += 2) {
          data[i / 2] = parseInt(dataHex.substr(i, 2), 16);
        }
        
        console.log(`Successfully extracted ${data.length} bytes from chunk ${chunkIndex + 1}`);
        return data;
      }
      
      const scriptHex = opReturnOutput.scriptPubKey.hex;
      
      console.log(`Script hex length: ${scriptHex.length} characters (${scriptHex.length / 2} bytes)`);
      
      if (scriptHex.length >= 99000) {
        console.warn(`Chunk ${chunkIndex + 1} script appears to be truncated by API.`);
        
        throw new Error(
          `WhatsOnChain API returned truncated data for chunk ${chunkIndex + 1}.\n` +
          `The file may be too large for the API.\n\n` +
          `Transaction: ${txid}`
        );
      }
      
      // Manual hex parsing fallback
      let pos = 2; // Skip OP_RETURN
      let foundNamespace = false;
      let dataHex = '';
      
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
        } else {
          console.error('Unknown opcode:', opcode.toString(16), 'at position:', pos);
          break;
        }
        
        if (dataStart + dataLength * 2 > scriptHex.length) {
          console.error('Data extends beyond script length');
          break;
        }
        
        const currentDataHex = scriptHex.substr(dataStart, dataLength * 2);
        
        if (!foundNamespace) {
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
          dataHex = currentDataHex;
          console.log(`Found chunk data at position ${pos}, length: ${dataLength} bytes`);
          break;
        }
        
        pos = dataStart + dataLength * 2;
      }
      
      if (!foundNamespace || !dataHex) {
        throw new Error(`Failed to extract data from chunk ${chunkIndex + 1}`);
      }
      
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
    setRawData(null);
    
    try {
      const chunks: Uint8Array[] = [];
      
      for (let i = 0; i < chunkTxIds.length; i++) {
        setProgress({ current: i + 1, total: chunkTxIds.length });
        
        console.log(`Fetching chunk ${i + 1} from TX: ${chunkTxIds[i]}`);
        const chunkData = await extractChunkData(chunkTxIds[i], i);
        chunks.push(chunkData);
        
        if (i < chunkTxIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      console.log(`Reconstructed file: ${totalLength} bytes`);
      
      let finalData = combined;
      if (metadata.flag === 'gzip') {
        console.log('File is gzipped. Handling as compressed data.');
      }
      
      // Store raw data for property viewer
      setRawData(finalData);
      
      const mimeType = metadata.mimeType || 'application/octet-stream';
      const blob = new Blob([finalData], { type: mimeType });
      setFileBlob(blob);
      
      // Check if this might be property data
      const filename = metadata.filename || '';
      const looksLikeProperty = filename.toLowerCase().includes('property') || 
                               filename.toLowerCase().includes('title_prop');
      
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
        // Try to decode as text for property viewing
        try {
          const text = new TextDecoder().decode(finalData);
          setReconstructedContent(text);
          
          // If it looks like property data, try to enhance it
          if (looksLikeProperty) {
            const { json, images } = parsePropertyData(finalData);
            if (json) {
              // Create enhanced content for PropertyViewer
              const enhancedContent = {
                ...json,
                _images: Array.from(images.entries()).map(([label, data]) => ({
                  label,
                  data: btoa(String.fromCharCode(...data))
                }))
              };
              setReconstructedContent(JSON.stringify(enhancedContent));
            }
          }
        } catch (e) {
          console.log('Cannot decode as text');
        }
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

  // Decrypt content (placeholder)
  const decryptContent = async () => {
    if (!encryptionKey.trim()) {
      setError('Please enter an encryption key');
      return;
    }
    
    setError('Decryption not yet implemented');
  };

  // Prepare content for PropertyViewer when needed
  const getPropertyViewerContent = () => {
    if (!rawData) return reconstructedContent;
    
    // Try to parse the raw data for property format
    const { json, images } = parsePropertyData(rawData);
    
    if (json) {
      // Convert images to base64 URLs and embed in JSON
      const imageUrls: any = {};
      images.forEach((imageData, label) => {
        const base64 = btoa(String.fromCharCode(...imageData));
        const mimeType = 'image/jpeg'; // Assume JPEG, adjust as needed
        imageUrls[label] = `data:${mimeType};base64,${base64}`;
      });
      
      // Return enhanced JSON string for PropertyViewer
      return JSON.stringify({
        ...json,
        _embeddedImages: imageUrls
      });
    }
    
    return reconstructedContent;
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
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Preview</h4>

            {/* View selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">View as:</label>
              <select
                className="text-sm bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1"
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="image">Image</option>
                <option value="text">Text</option>
                <option value="video">Video</option>
                <option value="file">File</option>
                <option value="property">Property</option>
              </select>
            </div>
          </div>

          {(() => {
            const filename = (metadata?.filename || "").trim();
            const looksLikeProperty =
              filename.toLowerCase().includes("property") ||
              filename.toLowerCase().includes("title_prop");

            const effectiveView =
              selectedView === "auto"
                ? (looksLikeProperty ? "property" : contentType)
                : selectedView;

            return (
              <>
                {effectiveView === "image" && (
                  <div className="flex flex-col items-center">
                    <img
                      src={reconstructedContent}
                      alt={metadata?.filename || "image"}
                      className="max-w-full max-h-96 rounded"
                      onError={() => setError && setError("Failed to display image")}
                    />
                    <button
                      onClick={() => window.open(reconstructedContent, "_blank")}
                      className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                    >
                      🔍 View Full Size
                    </button>
                  </div>
                )}

                {effectiveView === "text" && (
                  <div className="bg-gray-900 rounded p-3 max-h-96 overflow-y-auto">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap">
                      {reconstructedContent}
                    </pre>
                  </div>
                )}

                {effectiveView === "video" && (
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

                {effectiveView === "file" && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-3">
                      File reconstructed successfully. Click download to save.
                    </p>
                    <p className="text-xs text-gray-500">
                      File type: {metadata?.mimeType}
                    </p>
                  </div>
                )}

                {/* Property view with enhanced content */}
                {effectiveView === "property" && (
                  <div className="bg-gray-900 rounded p-3">
                    <PropertyViewer content={getPropertyViewerContent()} />
                  </div>
                )}
              </>
            );
          })()}
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








//  orginal code for 'BCATDecoderDisplay.tsx' before extensive modifications


import React, { useState, useMemo } from 'react';
import { Utils } from '@bsv/sdk';
//import PropertyViewer from '../components/wallet2/inscriptions/display/sheet1';
import PropertyViewer from '../../inscriptions/display/sheet4';

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

/** Lightweight parser: JSON → key/value; otherwise INI / "key: value" / "key=value" lines */
function parseProperties(text = "") {
  if (!text || typeof text !== "string") return [];

  // Try JSON first
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object") {
      return Object.entries(obj).map(([k, v]) => [k, formatValue(v)]);
    }
  } catch (_) {}

  // Fallback: parse "key: value" or "key=value" lines
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const m = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
    if (m) rows.push([m[1].trim(), m[2].trim()]);
  }
  return rows;
}

function formatValue(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v, null, 2);
}

// interface PropertyViewerProps {
//   content: string;
// }

// function PropertyViewer({ content }: PropertyViewerProps) {
//   const rows = useMemo(() => parseProperties(content), [content]);

//   if (!rows.length) {
//     // Graceful fallback: show raw text when we can't parse properties
//     return (
//       <pre className="text-gray-300 text-sm whitespace-pre-wrap">
//         {content || "(no readable properties)"}
//       </pre>
//     );
//   }

//   return (
//     <div className="max-h-96 overflow-y-auto">
//       <table className="w-full text-sm">
//         <tbody>
//           {rows.map(([k, v], idx) => (
//             <tr key={idx} className="border-b border-gray-800">
//               <td className="py-2 pr-3 text-gray-400 align-top w-1/3">{k}</td>
//               <td className="py-2 text-gray-200 whitespace-pre-wrap">{v}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

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
  
  const [selectedView, setSelectedView] = useState("auto"); // "auto" | "image" | "text" | "video" | "file" | "property"

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
        // But also try to decode as text for property viewing
        try {
          const text = new TextDecoder().decode(finalData);
          setReconstructedContent(text);
        } catch (e) {
          // Can't decode as text, that's fine
        }
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
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Preview</h4>

            {/* View selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">View as:</label>
              <select
                className="text-sm bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1"
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="image">Image</option>
                <option value="text">Text</option>
                <option value="video">Video</option>
                <option value="file">File</option>
                <option value="property">Property</option>
              </select>
            </div>
          </div>

          {(() => {
            // Detect special filename and choose effective view
            const filename = (metadata?.filename || "").trim();
            const looksLikeProperty =
              /(^|\s)Filename:\s*Properety\s+title_prop\b/i.test(filename) ||
              filename.toLowerCase().includes("title_prop");

            const effectiveView =
              selectedView === "auto"
                ? (looksLikeProperty ? "property" : contentType)
                : selectedView;

            return (
              <>
                {effectiveView === "image" && (
                  <div className="flex flex-col items-center">
                    <img
                      src={reconstructedContent}
                      alt={metadata?.filename || "image"}
                      className="max-w-full max-h-96 rounded"
                      onError={() => setError && setError("Failed to display image")}
                    />
                    <button
                      onClick={() => window.open(reconstructedContent, "_blank")}
                      className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                    >
                      🔍 View Full Size
                    </button>
                  </div>
                )}

                {effectiveView === "text" && (
                  <div className="bg-gray-900 rounded p-3 max-h-96 overflow-y-auto">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap">
                      {reconstructedContent}
                    </pre>
                  </div>
                )}

                {effectiveView === "video" && (
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

                {effectiveView === "file" && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-3">
                      File reconstructed successfully. Click download to save.
                    </p>
                    <p className="text-xs text-gray-500">
                      File type: {metadata?.mimeType}
                    </p>
                  </div>
                )}

                {/* Property view with integrated PropertyViewer component */}
                {effectiveView === "property" && (
                  <div className="bg-gray-900 rounded p-3">
                    <PropertyViewer content={reconstructedContent} />
                  </div>
                )}
              </>
            );
          })()}
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
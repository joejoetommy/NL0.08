import React, { useState } from 'react';
import { Utils } from '@bsv/sdk';

interface ImageInscriptionViewerProps {
  keyData: any;
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
}

interface ImageInscription {
  txid: string;
  timestamp: Date;
  encrypted: boolean;
  encryptionLevel?: number;
  imageData?: string;
  metadata?: any;
}

export const ImageInscriptionViewer: React.FC<ImageInscriptionViewerProps> = ({
  keyData,
  network,
  whatsOnChainApiKey
}) => {
  const [inscriptionTxId, setInscriptionTxId] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [decodedImage, setDecodedImage] = useState<ImageInscription | null>(null);
  const [decryptedImageUrl, setDecryptedImageUrl] = useState('');
  const [decryptionProgress, setDecryptionProgress] = useState('');

  // Fetch and decode image inscription
  const decodeImageInscription = async () => {
    if (!inscriptionTxId.trim()) {
      setError('Please enter a transaction ID');
      return;
    }

    setLoading(true);
    setError('');
    setDecodedImage(null);
    setDecryptedImageUrl('');

    try {
      const headers: any = {};
      if (whatsOnChainApiKey) {
        headers['woc-api-key'] = whatsOnChainApiKey;
      }

      // Fetch transaction
      const txResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${inscriptionTxId}`,
        { headers }
      );

      if (!txResponse.ok) {
        throw new Error('Transaction not found');
      }

      const txData = await txResponse.json();
      
      // Find inscription output (usually vout[0] with 1 sat)
      const inscriptionOutput = txData.vout.find((out: any) => 
        out.value === 0.00000001
      );

      if (!inscriptionOutput) {
        throw new Error('No inscription found in this transaction');
      }

      const scriptHex = inscriptionOutput.scriptPubKey.hex;
      console.log('Script hex length:', scriptHex.length);

      // Check for image inscription
      const imageMarkers = [
        '696d6167652f706e67',    // image/png
        '696d6167652f6a706567',  // image/jpeg
        '696d6167652f6a7067',    // image/jpg
        '696d6167652f676966',    // image/gif
        '696d6167652f77656270',  // image/webp
        '6170706c69636174696f6e2f6a736f6e' // application/json (for encrypted)
      ];

      let foundMarker = false;
      let contentType = '';
      
      for (const marker of imageMarkers) {
        if (scriptHex.includes(marker)) {
          foundMarker = true;
          // Decode marker to get content type
          let markerStr = '';
          for (let i = 0; i < marker.length; i += 2) {
            markerStr += String.fromCharCode(parseInt(marker.substr(i, 2), 16));
          }
          contentType = markerStr;
          break;
        }
      }

      if (!foundMarker) {
        throw new Error('This does not appear to be an image inscription');
      }

      console.log('Found content type:', contentType);

      // Extract data based on content type
      if (contentType === 'application/json') {
        // This might be an encrypted inscription
        const jsonData = await extractJsonFromScript(scriptHex);
        
        if (jsonData.encrypted) {
          setDecodedImage({
            txid: inscriptionTxId,
            timestamp: new Date(txData.time * 1000),
            encrypted: true,
            encryptionLevel: jsonData.metadata?.level || 0,
            metadata: jsonData.metadata
          });
          
          // If encryption key provided, try to decrypt
          if (encryptionKey) {
            await decryptImageData(jsonData, encryptionKey);
          }
        } else {
          throw new Error('JSON inscription is not in expected format');
        }
      } else {
        // Direct image inscription
        const imageData = await extractImageFromScript(scriptHex, contentType);
        
        if (imageData) {
          const imageUrl = `data:${contentType};base64,${imageData}`;
          setDecodedImage({
            txid: inscriptionTxId,
            timestamp: new Date(txData.time * 1000),
            encrypted: false,
            imageData: imageUrl
          });
          setDecryptedImageUrl(imageUrl);
        } else {
          throw new Error('Failed to extract image data');
        }
      }

    } catch (error) {
      console.error('Error decoding inscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to decode inscription');
    } finally {
      setLoading(false);
    }
  };

  // Extract JSON data from script
  const extractJsonFromScript = async (scriptHex: string): Promise<any> => {
    const jsonMarker = '6170706c69636174696f6e2f6a736f6e';
    const jsonIndex = scriptHex.indexOf(jsonMarker);
    
    if (jsonIndex === -1) {
      throw new Error('No JSON data found');
    }

    // Find JSON data after marker
    let dataStart = jsonIndex + jsonMarker.length;
    
    // Skip protocol bytes
    while (dataStart < scriptHex.length && !scriptHex.substring(dataStart, dataStart + 2).match(/7b/)) {
      dataStart += 2;
      if (dataStart - (jsonIndex + jsonMarker.length) > 20) break;
    }

    // Extract JSON hex
    let jsonHex = '';
    for (let i = dataStart; i < scriptHex.length; i += 2) {
      const byte = scriptHex.substring(i, i + 2);
      if (byte === '68' || (i + 2 >= scriptHex.length)) {
        break;
      }
      jsonHex += byte;
    }

    // Convert to string
    let jsonStr = '';
    for (let i = 0; i < jsonHex.length; i += 2) {
      jsonStr += String.fromCharCode(parseInt(jsonHex.substr(i, 2), 16));
    }

    return JSON.parse(jsonStr);
  };

  // Extract image data from script
  const extractImageFromScript = async (scriptHex: string, contentType: string): Promise<string | null> => {
    const contentTypeHex = Utils.toArray(contentType, 'utf8').map(b => b.toString(16).padStart(2, '0')).join('');
    const markerIndex = scriptHex.indexOf(contentTypeHex);
    
    if (markerIndex === -1) return null;

    // Find image data after content type
    let dataStart = markerIndex + contentTypeHex.length;
    
    // Skip protocol bytes (usually 0100 or similar)
    while (dataStart < scriptHex.length && dataStart < markerIndex + contentTypeHex.length + 10) {
      const byte = scriptHex.substring(dataStart, dataStart + 2);
      if (byte !== '00' && byte !== '01') break;
      dataStart += 2;
    }

    // Extract image data hex
    let imageHex = '';
    for (let i = dataStart; i < scriptHex.length; i += 2) {
      const byte = scriptHex.substring(i, i + 2);
      if (byte === '68' || (i + 2 >= scriptHex.length)) {
        break;
      }
      imageHex += byte;
    }

    // Convert to base64
    const bytes = new Uint8Array(imageHex.length / 2);
    for (let i = 0; i < imageHex.length; i += 2) {
      bytes[i / 2] = parseInt(imageHex.substr(i, 2), 16);
    }

    return btoa(String.fromCharCode(...bytes));
  };

  // Decrypt image data
  const decryptImageData = async (encryptedData: any, key: string) => {
    setDecryptionProgress('Decrypting image...');
    
    try {
      // Derive encryption key using Web Crypto API
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('blog-encryption'),
          iterations: 10000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decode base64 encrypted data
      const binaryString = atob(encryptedData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert IV
      const ivHex = encryptedData.metadata.iv;
      const iv = new Uint8Array(ivHex.match(/.{2}/g).map((byte: string) => parseInt(byte, 16)));

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        encryptionKey,
        bytes.buffer
      );

      const decoder = new TextDecoder();
      const decryptedStr = decoder.decode(decrypted);
      
      // Parse decrypted data
      const imageData = JSON.parse(decryptedStr);
      
      if (imageData.data) {
        // Reconstruct image URL
        const imageUrl = imageData.data.startsWith('data:') 
          ? imageData.data 
          : `data:${imageData.type || 'image/png'};base64,${imageData.data}`;
        
        setDecryptedImageUrl(imageUrl);
        setError('');
        setDecryptionProgress('');
      }
      
    } catch (error) {
      console.error('Decryption error:', error);
      setError('Failed to decrypt image. Check your encryption key.');
      setDecryptionProgress('');
    }
  };

  // Download image
  const downloadImage = () => {
    if (!decryptedImageUrl) return;
    
    const a = document.createElement('a');
    a.href = decryptedImageUrl;
    a.download = `inscription-${inscriptionTxId.substring(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-white mb-3">Decode Image Inscription</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Transaction ID
          </label>
          <input
            type="text"
            value={inscriptionTxId}
            onChange={(e) => setInscriptionTxId(e.target.value)}
            placeholder="Enter inscription transaction ID..."
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Encryption Key (Optional)
          </label>
          <input
            type="text"
            value={encryptionKey}
            onChange={(e) => setEncryptionKey(e.target.value)}
            placeholder="Enter decryption key if image is encrypted..."
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Required only for encrypted images
          </p>
        </div>

        <button
          onClick={decodeImageInscription}
          disabled={loading || !inscriptionTxId.trim()}
          className="w-full py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Decoding...' : '🔍 Decode Image'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Progress Display */}
      {decryptionProgress && (
        <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
            <p className="text-sm text-blue-300">{decryptionProgress}</p>
          </div>
        </div>
      )}

      {/* Decoded Image Display */}
      {decodedImage && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <h4 className="text-lg font-medium text-white">Decoded Image</h4>
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Transaction:</span>
              <p className="text-white font-mono text-xs break-all">{decodedImage.txid}</p>
            </div>
            <div>
              <span className="text-gray-400">Timestamp:</span>
              <p className="text-white">{decodedImage.timestamp.toLocaleString()}</p>
            </div>
            {decodedImage.encrypted && (
              <>
                <div>
                  <span className="text-gray-400">Encrypted:</span>
                  <p className="text-white">Yes (Level {decodedImage.encryptionLevel})</p>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <p className="text-white">{decryptedImageUrl ? 'Decrypted' : 'Enter key to decrypt'}</p>
                </div>
              </>
            )}
          </div>

          {/* Image Display */}
          {(decryptedImageUrl || decodedImage.imageData) && (
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg p-4">
                <img 
                  src={decryptedImageUrl || decodedImage.imageData}
                  alt="Decoded inscription"
                  className="max-w-full max-h-96 mx-auto rounded"
                  onError={() => setError('Failed to display image')}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={downloadImage}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  💾 Download Image
                </button>
                <button
                  onClick={() => window.open(decryptedImageUrl || decodedImage.imageData, '_blank')}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  🔍 View Full Size
                </button>
                <a
                  href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${decodedImage.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  🔗 View Transaction
                </a>
              </div>
            </div>
          )}

          {/* Encrypted but not decrypted */}
          {decodedImage.encrypted && !decryptedImageUrl && (
            <div className="p-4 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
              <p className="text-sm text-yellow-300">
                🔒 This image is encrypted. Enter the correct decryption key above and click "Decode Image" again to view it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
        <h4 className="text-sm font-medium text-blue-300 mb-1">How to use:</h4>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>1. Enter the transaction ID of an image inscription</li>
          <li>2. If the image is encrypted, enter the decryption key</li>
          <li>3. Click "Decode Image" to retrieve and display the image</li>
          <li>4. Download or view the full-size image using the buttons</li>
        </ul>
      </div>
    </div>
  );
};
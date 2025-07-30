import React, { useState, useEffect } from 'react';
import { EncryptionLevel, getEncryptionLevelColor, getEncryptionLevelLabel } from '../utils/BlogEncryption';

interface InscriptionImageViewProps {
  content: any;
  encrypted?: boolean;
  encryptionLevel?: EncryptionLevel;
  timestamp: Date;
  txid: string;
  size: number;
  network: 'mainnet' | 'testnet';
}

export const InscriptionImageView: React.FC<InscriptionImageViewProps> = ({
  content,
  encrypted,
  encryptionLevel,
  timestamp,
  txid,
  size,
  network
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [imageInfo, setImageInfo] = useState<{ name?: string; type?: string; originalSize?: number }>({});

  useEffect(() => {
    if (content && typeof content === 'object') {
      if (content.error) {
        setImageError(content.error);
        return;
      }

      // Handle decrypted image data
      if (content.data && content.name) {
        try {
          // The data is already base64
          const fullDataUrl = `data:${content.type || 'image/jpeg'};base64,${content.data}`;
          setImageUrl(fullDataUrl);
          setImageInfo({
            name: content.name,
            type: content.type,
            originalSize: content.size
          });
        } catch (error) {
          console.error('Error processing image:', error);
          setImageError('Failed to process image data');
        }
      } else if (content.type === 'image' && content.message) {
        // This is a placeholder for non-decoded images
        setImageError(content.message);
      }
    }
  }, [content]);

  return (
    <div className="space-y-4">
      {/* Encryption Status */}
      {encrypted && (
        <div className={`p-3 rounded-lg bg-${getEncryptionLevelColor(encryptionLevel || 0)}-900 bg-opacity-50`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">
              🔒 Encrypted Image - {getEncryptionLevelLabel(encryptionLevel || 0)}
            </p>
            <span 
              className={`text-xs px-2 py-1 rounded bg-${getEncryptionLevelColor(encryptionLevel || 0)}-600 text-white`}
              style={{
                backgroundColor: {
                  0: '#6B7280',
                  1: '#F59E0B',
                  2: '#EAB308',
                  3: '#6366F1',
                  4: '#A855F7',
                  5: '#EF4444'
                }[encryptionLevel || 0]
              }}
            >
              Level {encryptionLevel}
            </span>
          </div>
          {content?.error ? (
            <p className="text-xs text-gray-300 mt-1">{content.error}</p>
          ) : imageUrl && (
            <p className="text-xs text-gray-300 mt-1">Successfully decrypted with your blog key</p>
          )}
        </div>
      )}

      {/* Image Display */}
      <div className="bg-gray-900 p-4 rounded">
        {imageError ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🖼️</span>
            <p className="text-gray-400">{imageError}</p>
            {content?.requiredLevel !== undefined && (
              <p className="text-xs text-gray-500 mt-2">
                You need level {content.requiredLevel} access to view this image.
              </p>
            )}
          </div>
        ) : imageUrl ? (
          <div className="space-y-4">
            <div className="relative group">
              <img
                src={imageUrl}
                alt={imageInfo.name || 'Inscription image'}
                className="max-w-full max-h-96 mx-auto rounded object-contain"
                onError={() => setImageError('Failed to load image')}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => window.open(imageUrl, '_blank')}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                >
                  View Full Size
                </button>
              </div>
            </div>
            
            {imageInfo.name && (
              <div className="text-center space-y-1">
                <p className="text-sm text-gray-300 font-medium">{imageInfo.name}</p>
                <p className="text-xs text-gray-400">
                  {imageInfo.type} • {imageInfo.originalSize ? `${(imageInfo.originalSize / 1024).toFixed(0)}KB original` : 'Unknown size'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="text-gray-400 mt-2">Loading image...</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="border-t border-gray-700 pt-4 space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400 block">Created:</span>
            <span className="text-gray-300">{timestamp.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Transaction Size:</span>
            <span className="text-gray-300">~{(size / 1024).toFixed(2)}KB</span>
          </div>
          <div>
            <span className="text-gray-400 block">Type:</span>
            <span className="text-gray-300">
              Image{encrypted && ' (Encrypted)'}
            </span>
          </div>
          {encrypted && (
            <div>
              <span className="text-gray-400 block">Access Level:</span>
              <span className="text-gray-300">{getEncryptionLevelLabel(encryptionLevel || 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {imageUrl && !imageError && (
        <div className="flex gap-2">
          <button
            onClick={() => window.open(imageUrl, '_blank')}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            🔍 View Full Size
          </button>
          <button
            onClick={() => {
              const a = document.createElement('a');
              a.href = imageUrl;
              a.download = imageInfo.name || `inscription_${txid.substring(0, 8)}.${imageInfo.type?.split('/')[1] || 'png'}`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            💾 Download
          </button>
        </div>
      )}

      {/* View on Explorer Note */}
      {!imageUrl && !content?.error && (
        <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
          <p className="text-xs text-blue-300">
            💡 Image data is embedded in the transaction. View on blockchain explorer to see the full inscription data.
          </p>
          <a
            href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 underline mt-1 inline-block"
          >
            View Transaction →
          </a>
        </div>
      )}
    </div>
  );
};
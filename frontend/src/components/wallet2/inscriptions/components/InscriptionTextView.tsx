import React from 'react';
import { EncryptionLevel, getEncryptionLevelColor, getEncryptionLevelLabel } from '../utils/BlogEncryption';

interface InscriptionTextViewProps {
  content: any;
  encrypted?: boolean;
  encryptionLevel?: EncryptionLevel;
  timestamp: Date;
  txid: string;
  size: number;
}

export const InscriptionTextView: React.FC<InscriptionTextViewProps> = ({
  content,
  encrypted,
  encryptionLevel,
  timestamp,
  txid,
  size
}) => {
  // Check if content is an error object
  const hasError = content && typeof content === 'object' && 'error' in content;

  return (
    <div className="space-y-4">
      {/* Encryption Status */}
      {encrypted && (
        <div className={`p-3 rounded-lg bg-${getEncryptionLevelColor(encryptionLevel || 0)}-900 bg-opacity-50`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">
              🔒 Encrypted Content - {getEncryptionLevelLabel(encryptionLevel || 0)}
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
          {hasError ? (
            <p className="text-xs text-gray-300 mt-1">{content.error}</p>
          ) : (
            <p className="text-xs text-gray-300 mt-1">Successfully decrypted with your blog key</p>
          )}
        </div>
      )}

      {/* Content Display */}
      {hasError ? (
        <div className="bg-gray-900 p-4 rounded">
          <p className="text-red-400">{content.error}</p>
          <p className="text-xs text-gray-400 mt-2">
            You need level {content.requiredLevel} access to decrypt this content.
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 p-4 rounded">
          <pre className="whitespace-pre-wrap text-gray-300 text-sm font-mono">
            {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t border-gray-700 pt-4 space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400 block">Created:</span>
            <span className="text-gray-300">{timestamp.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Size:</span>
            <span className="text-gray-300">~{(size / 1024).toFixed(2)}KB</span>
          </div>
          <div>
            <span className="text-gray-400 block">Type:</span>
            <span className="text-gray-300">
              Text{encrypted && ' (Encrypted)'}
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
      {!hasError && typeof content === 'string' && (
        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            📋 Copy Text
          </button>
          <button
            onClick={() => {
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `inscription_${txid.substring(0, 8)}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            💾 Download
          </button>
        </div>
      )}
    </div>
  );
};
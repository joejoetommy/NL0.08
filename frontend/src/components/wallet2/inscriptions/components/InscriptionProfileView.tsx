import React from 'react';
import { EncryptionLevel, getEncryptionLevelColor, getEncryptionLevelLabel } from '../utils/BlogEncryption';

interface InscriptionProfileViewProps {
  content: any;
  encrypted?: boolean;
  encryptionLevel?: EncryptionLevel;
  timestamp: Date;
  txid: string;
  size: number;
  isProfile2: boolean;
}

export const InscriptionProfileView: React.FC<InscriptionProfileViewProps> = ({
  content,
  encrypted,
  encryptionLevel,
  timestamp,
  txid,
  size,
  isProfile2
}) => {
  const hasError = content && typeof content === 'object' && 'error' in content;

  return (
    <div className="space-y-4">
      {/* Encryption Status */}
      {encrypted && (
        <div className={`p-3 rounded-lg bg-${getEncryptionLevelColor(encryptionLevel || 0)}-900 bg-opacity-50`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">
              🔒 Encrypted Profile - {getEncryptionLevelLabel(encryptionLevel || 0)}
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

      {/* Profile Display */}
      {hasError ? (
        <div className="bg-gray-900 p-4 rounded">
          <p className="text-red-400">{content.error}</p>
          <p className="text-xs text-gray-400 mt-2">
            You need level {content.requiredLevel} access to decrypt this profile.
          </p>
        </div>
      ) : content ? (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          {/* Background (Profile2 only) */}
          {isProfile2 && (
            <div className="relative h-32">
              {content.background ? (
                <img
                  src={content.background}
                  alt="Profile background"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900"></div>
              )}
              
              {/* Avatar overlay for Profile2 */}
              {content.avatar && (
                <div className="absolute -bottom-12 left-6">
                  <img
                    src={content.avatar}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-900"
                  />
                </div>
              )}
            </div>
          )}

          {/* Profile Content */}
          <div className={`p-6 ${isProfile2 && content.avatar ? 'pt-16' : ''}`}>
            {/* Avatar for Profile (not Profile2) */}
            {!isProfile2 && content.avatar && (
              <div className="flex justify-center mb-4">
                <img
                  src={content.avatar}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover"
                />
              </div>
            )}

            {/* Profile Info */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white">
                {content.username || 'Anonymous'}
              </h3>
              <p className="text-lg text-gray-300">
                {content.title || 'BSV User'}
              </p>
              <p className="text-gray-400 mt-4 max-w-md mx-auto">
                {content.bio || 'On-chain profile'}
              </p>
            </div>

            {/* Additional Info */}
            {content.timestamp && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-500 text-center">
                  Profile created: {new Date(content.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 p-8 rounded text-center">
          <p className="text-gray-400">No profile data available</p>
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
              {isProfile2 ? 'Profile2' : 'Profile'}{encrypted && ' (Encrypted)'}
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
      {content && !hasError && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              const profileData = {
                username: content.username,
                title: content.title,
                bio: content.bio,
                timestamp: content.timestamp
              };
              const json = JSON.stringify(profileData, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `profile_${content.username || txid.substring(0, 8)}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            💾 Export Profile Data
          </button>
          {content.avatar && (
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = content.avatar;
                a.download = `avatar_${content.username || txid.substring(0, 8)}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
            >
              💾 Download Avatar
            </button>
          )}
          {isProfile2 && content.background && (
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = content.background;
                a.download = `background_${content.username || txid.substring(0, 8)}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
            >
              💾 Download Background
            </button>
          )}
        </div>
      )}
    </div>
  );
};
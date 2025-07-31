import React from 'react';
import { EncryptionLevel, getEncryptionLevelLabel, getEncryptionLevelColor } from '../utils/BlogEncryption';

interface EncryptionOptionsProps {
  encryptionLevel: EncryptionLevel;
  setEncryptionLevel: (level: EncryptionLevel) => void;
  showEncryptionOptions: boolean;
  setShowEncryptionOptions: (show: boolean) => void;
  blogKeyHistory: any;
}

export const EncryptionOptions: React.FC<EncryptionOptionsProps> = ({
  encryptionLevel,
  setEncryptionLevel,
  showEncryptionOptions,
  setShowEncryptionOptions,
  blogKeyHistory
}) => {
  return (
    <div className="p-3 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-300">Encryption Level</label>
        <button
          onClick={() => setShowEncryptionOptions(!showEncryptionOptions)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {showEncryptionOptions ? 'Hide' : 'Show'} Options
        </button>
      </div>
      
      {!blogKeyHistory.current && encryptionLevel > 0 && (
        <div className="mb-2 p-2 bg-yellow-900 bg-opacity-50 rounded text-xs text-yellow-300">
          ⚠️ No blog key found. Generate one in the Wallet section first.
        </div>
      )}
      
      <div className={`grid grid-cols-3 gap-2 ${showEncryptionOptions ? '' : 'mb-0'}`}>
        {([0, 1, 2, 3, 4, 5] as EncryptionLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => setEncryptionLevel(level)}
            disabled={level > 0 && !blogKeyHistory.current}
            className={`px-3 py-2 rounded text-xs font-medium transition-all ${
              encryptionLevel === level
                ? `bg-${getEncryptionLevelColor(level)}-600 text-white shadow-lg`
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            style={{
              backgroundColor: encryptionLevel === level 
                ? {
                    0: '#6B7280',
                    1: '#F59E0B',
                    2: '#EAB308',
                    3: '#6366F1',
                    4: '#A855F7',
                    5: '#EF4444'
                  }[level]
                : undefined
            }}
          >
            <div className="flex flex-col items-center">
              <span>Level {level}</span>
              {encryptionLevel === level && (
                <span className="text-xs mt-0.5">
                  {level === 0 ? '🌐' : '🔒'}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {showEncryptionOptions && (
        <div className="mt-3 text-xs text-gray-400 space-y-1">
          <p className="font-medium text-gray-300">
            Selected: {getEncryptionLevelLabel(encryptionLevel)}
          </p>
          {encryptionLevel > 0 && (
            <>
              <p>• Only contacts with level {encryptionLevel} access or higher can decrypt</p>
              <p>• Uses {Math.floor(64 * encryptionLevel / 5)} characters of your blog key</p>
              <p>• Adds ~10% size overhead to inscription</p>
              <div className="mt-2 p-2 bg-gray-900 rounded">
                <p className="text-indigo-300 font-medium mb-1">Actual size limits:</p>
                <ul className="space-y-0.5 text-gray-400">
                  <li>• Image tab: 3.5MB max (encrypted), 3.6MB (unencrypted)</li>
                  <li>• Profile tab: 3.5MB max (encrypted), 3.6MB (unencrypted)</li>
                  <li>• Profile2 tab: 2.2MB max per image (encrypted), 2.4MB (unencrypted)</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
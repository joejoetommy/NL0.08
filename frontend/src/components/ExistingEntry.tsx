import React from 'react';
import { 
  Upload,
  Check,
  RefreshCw,
  Unlock,
  FileKey,
  FileCheck,
  RotateCcw
} from 'lucide-react';

interface ExistingEntryProps {
  // State props
  existingInputKey: string;
  existingMasterKeyEntered: boolean;
  uploadedFile: File | null;
  isDecrypting: boolean;
  isVaultDragging: boolean;
  blogKeyData: any;
  keyData: any;
  keyHistory: any;
  selectedVersion: number;
  showPrivateKey: boolean;
  
  // State setters
  setExistingInputKey: (value: string) => void;
  setExistingMasterKeyEntered: (value: boolean) => void;
  setShowPrivateKey: (value: boolean) => void;
  
  // Functions
  handleExistingEnter: () => void;
  canEnterExisting: () => boolean;
  resetExistingProcess: () => void;
  handleFileUpload: (file: File) => void;
  handleVaultDragOver: (e: React.DragEvent) => void;
  handleVaultDragLeave: (e: React.DragEvent) => void;
  handleVaultDrop: (e: React.DragEvent) => void;
  copyToClipboard: (text: string) => void;
  createFullAccessBundle: (blogKeyData: any) => string;
  vaultFileInputRef: React.RefObject<HTMLInputElement>;
}

export const ExistingEntry: React.FC<ExistingEntryProps> = ({
  existingInputKey,
  existingMasterKeyEntered,
  uploadedFile,
  isDecrypting,
  isVaultDragging,
  blogKeyData,
  keyData,
  keyHistory,
  selectedVersion,
  showPrivateKey,
  setExistingInputKey,
  setExistingMasterKeyEntered,
  setShowPrivateKey,
  handleExistingEnter,
  canEnterExisting,
  resetExistingProcess,
  handleFileUpload,
  handleVaultDragOver,
  handleVaultDragLeave,
  handleVaultDrop,
  copyToClipboard,
  createFullAccessBundle,
  vaultFileInputRef
}) => {
  return (
    <div className="space-y-4">
      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={resetExistingProcess}
          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors flex items-center gap-1"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Master Private Key Input */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-medium text-white mb-3 flex items-center gap-2">
          Master Private Key
          {existingMasterKeyEntered && <Check size={16} className="text-green-400" />}
        </h3>
        <div className="flex gap-2">
          <input
            type="password"
            value={existingInputKey}
            onChange={(e) => {
              setExistingInputKey(e.target.value);
              setExistingMasterKeyEntered(
                e.target.value.length === 64 || 
                e.target.value.startsWith('L') || 
                e.target.value.startsWith('K') || 
                e.target.value.startsWith('5')
              );
            }}
            placeholder="Enter your private key to decrypt vault"
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-gray-500 text-sm"
          />
        </div>
      </div>

      {/* Vault File Upload */}
      <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700">
        <h3 className="font-medium text-white mb-3 flex items-center gap-2">
          <FileKey size={20} />
          Vault File
          {uploadedFile && <Check size={16} className="text-green-400" />}
        </h3>
        
        {!uploadedFile ? (
          <div
            className={`p-8 border-2 border-dashed rounded-lg transition-all ${
              isVaultDragging
                ? 'border-purple-400 bg-purple-900/30 scale-105'
                : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
            }`}
            onDragOver={handleVaultDragOver}
            onDragLeave={handleVaultDragLeave}
            onDrop={handleVaultDrop}
          >
            <input
              ref={vaultFileInputRef}
              type="file"
              accept=".vault,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
            
            <div className="text-center">
              <Upload className={`mx-auto h-12 w-12 mb-3 transition-colors ${
                isVaultDragging ? 'text-purple-400' : 'text-gray-400'
              }`} />
              <p className="text-sm font-medium text-gray-300 mb-2">
                Drag and drop your vault file here
              </p>
              <button
                onClick={() => vaultFileInputRef.current?.click()}
                className="text-sm underline transition-colors text-purple-400 hover:text-purple-300"
              >
                Or click to browse
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck size={24} className="text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Display Restored Blog Keys */}
      {blogKeyData && keyData.address && (
        <div className="p-4 bg-indigo-900/30 rounded-lg border border-indigo-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">
              Restored Blog Keys: {blogKeyData.label || `Version ${selectedVersion}`}
            </h3>
            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {showPrivateKey ? 'Hide' : 'Show'} Keys
            </button>
          </div>

          {showPrivateKey && (
            <div className="space-y-2">
              {/* Tier 5 - Full Access Bundle */}
              {blogKeyData.keys.tier5 && (
                <div className="p-2 bg-red-900 bg-opacity-20 rounded border border-red-700">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-red-300">
                      Tier 5 - Full Access
                    </label>
                    <span className="text-xs text-gray-400">256-bit</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <code className="flex-1 p-1 bg-gray-900 rounded text-xs break-all text-red-300 font-mono">
                        {blogKeyData.keys.tier5.substring(0, 32)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(createFullAccessBundle(blogKeyData))}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                        title="Copy Full Access Bundle"
                      >
                        📦
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Show other tiers in condensed format */}
              <div className="grid grid-cols-2 gap-2">
                {blogKeyData.keys.tier4 && (
                  <div className="p-2 bg-purple-900/20 rounded border border-purple-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-300">Tier 4</span>
                      <button
                        onClick={() => copyToClipboard(blogKeyData.keys.tier4)}
                        className="px-1 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
                {blogKeyData.keys.tier3 && (
                  <div className="p-2 bg-indigo-900/20 rounded border border-indigo-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-indigo-300">Tier 3</span>
                      <button
                        onClick={() => copyToClipboard(blogKeyData.keys.tier3)}
                        className="px-1 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
                {blogKeyData.keys.tier2 && (
                  <div className="p-2 bg-yellow-900/20 rounded border border-yellow-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-yellow-300">Tier 2</span>
                      <button
                        onClick={() => copyToClipboard(blogKeyData.keys.tier2)}
                        className="px-1 py-0.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
                {blogKeyData.keys.tier1 && (
                  <div className="p-2 bg-orange-900/20 rounded border border-orange-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-orange-300">Tier 1</span>
                      <button
                        onClick={() => copyToClipboard(blogKeyData.keys.tier1)}
                        className="px-1 py-0.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                ✅ Keys restored from vault - Available in Wallet section
              </p>
            </div>
          )}

          {!showPrivateKey && (
            <p className="text-xs text-indigo-400">
              ✓ Blog keys restored successfully - {Object.keys(keyHistory.versions).length} versions available
            </p>
          )}
        </div>
      )}

      {/* Enter Button */}
      <button
        onClick={handleExistingEnter}
        disabled={!canEnterExisting() || isDecrypting}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
          canEnterExisting() && !isDecrypting
            ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isDecrypting ? (
          <>
            <RefreshCw size={18} className="animate-spin" />
            Decrypting...
          </>
        ) : (
          <>
            <Unlock size={18} />
            Enter
          </>
        )}
      </button>
    </div>
  );
};
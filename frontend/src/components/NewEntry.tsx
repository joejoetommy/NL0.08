import React from 'react';
import { 
  Copy, 
  RefreshCw,
  AlertCircle,
  Check,
  Download,
  RotateCcw
} from 'lucide-react';

interface NewEntryProps {
  // State props
  masterKeyLocked: boolean;
  productionKeysLocked: boolean;
  inputKey: string;
  keyError: string;
  versionLabel: string;
  apiKeys: any;
  keyData: any;
  balance: any;
  blogKeyData: any;
  selectedVersion: number;
  showPrivateKey: boolean;
  vaultMessage: { type: 'success' | 'error' | 'info'; text: string } | null;
  isEncrypting: boolean;
  network: 'mainnet' | 'testnet';
  
  // State setters
  setInputKey: (value: string) => void;
  setVersionLabel: (value: string) => void;
  setApiKeys: (value: any) => void;
  setShowPrivateKey: (value: boolean) => void;
  
  // Functions
  generateRandomKey: () => void;
  importPrivateKey: () => void;
  generateHierarchicalBlogKeys: () => void;
  checkBalance: (address: string) => void;
  copyToClipboard: (text: string) => void;
  formatBSV: (satoshis: number) => string;
  createFullAccessBundle: (blogKeyData: any) => string;
  downloadVaultAndEnter: () => void;
  canEnterNew: () => boolean;
  resetNewProcess: () => void;
}

export const NewEntry: React.FC<NewEntryProps> = ({
  masterKeyLocked,
  productionKeysLocked,
  inputKey,
  keyError,
  versionLabel,
  apiKeys,
  keyData,
  balance,
  blogKeyData,
  selectedVersion,
  showPrivateKey,
  vaultMessage,
  isEncrypting,
  network,
  setInputKey,
  setVersionLabel,
  setApiKeys,
  setShowPrivateKey,
  generateRandomKey,
  importPrivateKey,
  generateHierarchicalBlogKeys,
  checkBalance,
  copyToClipboard,
  formatBSV,
  createFullAccessBundle,
  downloadVaultAndEnter,
  canEnterNew,
  resetNewProcess
}) => {
  return (
    <div className="space-y-4">
      {/* Step Progress */}
      <div className="p-3 bg-zinc-800 rounded-lg border border-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Setup Progress:</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${masterKeyLocked ? 'bg-green-500' : 'bg-gray-600'}`} />
              <span className={`text-sm ${masterKeyLocked ? 'text-green-400' : 'text-gray-500'}`}>
                Step 1: Master Key
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${productionKeysLocked ? 'bg-green-500' : 'bg-gray-600'}`} />
              <span className={`text-sm ${productionKeysLocked ? 'text-green-400' : 'text-gray-500'}`}>
                Step 2: Production Keys
              </span>
            </div>
          </div>
          <button
            onClick={resetNewProcess}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs transition-colors flex items-center gap-1"
          >
            <RotateCcw size={12} />
            Reset Process
          </button>
        </div>
      </div>

      {/* Private Key Section */}
      <div className={`p-4 rounded-lg border transition-all ${
        masterKeyLocked 
          ? 'bg-gray-900 border-gray-800 opacity-60' 
          : 'bg-gray-800 border-gray-700'
      }`}>
        <h3 className="font-medium text-white mb-3">
          Step 1: Master Private Key {masterKeyLocked && '✓'}
        </h3>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Enter private key (hex or WIF format)"
              disabled={masterKeyLocked}
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-gray-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={importPrivateKey}
              disabled={masterKeyLocked}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                masterKeyLocked
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              Import
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={generateRandomKey}
              disabled={masterKeyLocked}
              className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                masterKeyLocked
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Generate Random Key
            </button>
          </div>
          
          {keyError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{keyError}</span>
            </div>
          )}
          
          {keyData.address && (
            <div className="p-3 bg-zinc-900 rounded border border-zinc-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Address:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-gray-300">
                    {keyData.address.substring(0, 12)}...{keyData.address.substring(keyData.address.length - 8)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(keyData.address)}
                    className="p-1 hover:bg-zinc-800 rounded"
                  >
                    <Copy size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Balance:</span>
                <div className="flex items-center gap-2">
                  {balance.loading ? (
                    <span className="text-sm text-gray-400">Loading...</span>
                  ) : balance.error ? (
                    <span className="text-sm text-red-400">Error</span>
                  ) : (
                    <span className="text-sm text-gray-300">{formatBSV(balance.confirmed)} BSV</span>
                  )}
                  <button
                    onClick={() => checkBalance(keyData.address)}
                    className="p-1 hover:bg-zinc-800 rounded"
                    disabled={balance.loading}
                  >
                    <RefreshCw size={14} className={`text-gray-400 ${balance.loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blog Encryption Keys Section */}
      <div className={`p-4 rounded-lg border transition-all ${
        productionKeysLocked 
          ? 'bg-indigo-950 border-indigo-900' 
          : masterKeyLocked
            ? 'bg-indigo-900/30 border-indigo-700'
            : 'bg-gray-900 border-gray-800 opacity-60'
      }`}>
        <h3 className="font-medium text-white mb-3">
          Step 2: Blog Encryption Keys {productionKeysLocked && '✓'}
        </h3>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="Optional: Label for this version (e.g., 'Production Keys')"
              disabled={!masterKeyLocked || productionKeysLocked}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={generateHierarchicalBlogKeys}
              disabled={!masterKeyLocked || productionKeysLocked}
              className={`bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded transition-colors ${
                !masterKeyLocked || productionKeysLocked
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              Generate New Version
            </button>
          </div>
          
          {blogKeyData && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">
                  {blogKeyData.label || `Version ${selectedVersion}`} Keys
                </h4>
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  {showPrivateKey ? 'Hide' : 'Show'} Keys & Access Bundles
                </button>
              </div>

              {showPrivateKey && (
                <div className="p-3 bg-gray-800 rounded-lg space-y-3">
                  {/* Tier 5 - Full Access */}
                  {blogKeyData.keys.tier5 && (
                    <div className="p-2 bg-red-900 bg-opacity-20 rounded border border-red-700">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-red-300">
                          Tier 5 - Complete Access (All Levels)
                        </label>
                        <span className="text-xs text-gray-400">256-bit</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <code className="flex-1 p-1 bg-gray-900 rounded border border-red-600 text-xs break-all text-red-300 font-mono">
                            {blogKeyData.keys.tier5}
                          </code>
                          <button
                            onClick={() => copyToClipboard(blogKeyData.keys.tier5)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                            title="Copy Tier 5 key"
                          >
                            📋
                          </button>
                        </div>
                        <button
                          onClick={() => copyToClipboard(createFullAccessBundle(blogKeyData))}
                          className="w-full px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs"
                        >
                          📦 Copy Full Access Bundle
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Other Tiers */}
                  {blogKeyData.keys.tier4 && (
                    <div className="p-2 bg-purple-900 bg-opacity-20 rounded border border-purple-700">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-purple-300">Tier 4 - Closed Group</label>
                        <span className="text-xs text-gray-400">192-bit</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <code className="flex-1 p-1 bg-gray-900 rounded border border-purple-600 text-xs break-all text-purple-300 font-mono">
                          {blogKeyData.keys.tier4}
                        </code>
                        <button
                          onClick={() => copyToClipboard(blogKeyData.keys.tier4)}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  )}

                  {blogKeyData.keys.tier3 && (
                    <div className="p-2 bg-indigo-900 bg-opacity-20 rounded border border-indigo-700">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-indigo-300">Tier 3 - Inner Circle</label>
                        <span className="text-xs text-gray-400">128-bit</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <code className="flex-1 p-1 bg-gray-900 rounded border border-indigo-600 text-xs break-all text-indigo-300 font-mono">
                          {blogKeyData.keys.tier3}
                        </code>
                        <button
                          onClick={() => copyToClipboard(blogKeyData.keys.tier3)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  )}

                  {blogKeyData.keys.tier2 && (
                    <div className="p-2 bg-yellow-900 bg-opacity-20 rounded border border-yellow-700">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-yellow-300">Tier 2 - Close Friends</label>
                        <span className="text-xs text-gray-400">128-bit</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <code className="flex-1 p-1 bg-gray-900 rounded border border-yellow-600 text-xs break-all text-yellow-300 font-mono">
                          {blogKeyData.keys.tier2}
                        </code>
                        <button
                          onClick={() => copyToClipboard(blogKeyData.keys.tier2)}
                          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  )}

                  {blogKeyData.keys.tier1 && (
                    <div className="p-2 bg-orange-900 bg-opacity-20 rounded border border-orange-700">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-orange-300">Tier 1 - Friends</label>
                        <span className="text-xs text-gray-400">128-bit</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <code className="flex-1 p-1 bg-gray-900 rounded border border-orange-600 text-xs break-all text-orange-300 font-mono">
                          {blogKeyData.keys.tier1}
                        </code>
                        <button
                          onClick={() => copyToClipboard(blogKeyData.keys.tier1)}
                          className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 p-2 bg-green-800 bg-opacity-30 rounded-lg">
                    <p className="text-xs text-gray-300">
                      <span className="text-green-400">✅ Keys Generated:</span> {new Date(blogKeyData.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {!showPrivateKey && (
                <div className="p-3 bg-indigo-900/20 rounded border border-indigo-600">
                  <p className="text-sm text-indigo-400">✓ Production keys generated</p>
                  <p className="text-xs text-gray-400 mt-1">{blogKeyData.label || `Version ${selectedVersion}`}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* API Keys Section (Optional) */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-medium text-white mb-3">API Keys (Optional)</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">WhatsOnChain API Key</label>
            <input
              type="password"
              value={apiKeys.whatsOnChain.current}
              onChange={(e) => setApiKeys({
                ...apiKeys,
                whatsOnChain: {
                  ...apiKeys.whatsOnChain,
                  current: e.target.value
                }
              })}
              placeholder="Enter API key (optional)"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-gray-500 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">MapBox API Key</label>
            <input
              type="password"
              value={apiKeys.mapbox.current}
              onChange={(e) => setApiKeys({
                ...apiKeys,
                mapbox: {
                  ...apiKeys.mapbox,
                  current: e.target.value
                }
              })}
              placeholder="Enter API key (optional)"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-gray-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Enter Button */}
      {canEnterNew() && (
        <button
          onClick={downloadVaultAndEnter}
          disabled={isEncrypting}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            isEncrypting
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg animate-pulse'
          }`}
        >
          {isEncrypting ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Creating backup...
            </>
          ) : (
            <>
              <Download size={18} />
              Download Vault & Enter
            </>
          )}
        </button>
      )}
    </div>
  );
};
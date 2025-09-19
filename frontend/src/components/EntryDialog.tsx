// src/components/EntryDialog.tsx
// import React, { useState, useRef, useEffect } from 'react';
// import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
// import { useWalletStore } from '../components/wallet2/store/WalletStore';
// src/components/EntryDialog.tsx
// src/components/EntryDialog.tsx
// src/components/EntryDialog.tsx
// src/components/EntryDialog.tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
import { useWalletStore } from '../components/wallet2/store/WalletStore';
import { 
  Key, 
  Shield, 
  Download, 
  Upload, 
  Copy, 
  RefreshCw,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = {
    from: (data: any, encoding?: string) => {
      if (encoding === 'hex') {
        const bytes = [];
        for (let i = 0; i < data.length; i += 2) {
          bytes.push(parseInt(data.substr(i, 2), 16));
        }
        return new Uint8Array(bytes);
      } else if (typeof data === 'string') {
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    },
    alloc: (size: number) => new Uint8Array(size),
    concat: (arrays: Uint8Array[]) => {
      const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
      }
      return result;
    }
  } as any;
}

// Types
interface SecureBlogKeys {
  tier1: string;
  tier2: string;
  tier3: string;
  tier4: string;
  tier5: string;
}

interface BlogKeyData {
  keys: SecureBlogKeys;
  accessBundles: {
    tier1: string[];
    tier2: string[];
    tier3: string[];
    tier4: string[];
    tier5: string[];
  };
  version: string;
  generatedAt: number;
  label?: string;
}

interface KeyHistory {
  currentVersion: number;
  versions: {
    [versionNumber: number]: BlogKeyData;
  };
  metadata: {
    createdAt: number;
    lastModified: number;
    totalVersions: number;
  };
}

interface EntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EntryDialog: React.FC<EntryDialogProps> = ({ 
  isOpen, 
  onClose
}) => {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'keys' | 'profile'>('keys');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBlogKeys, setShowBlogKeys] = useState(false);
  
  // Profile form data
  const [formData, setFormData] = useState({ name: '', username: '' });
  
  // Wallet Store
  const {
    network,
    setNetwork,
    keyData,
    setKeyData,
    balance,
    setBalance,
    setBlogKey,
    updateContactSharedSecrets
  } = useWalletStore();
  
  // Private Key States
  const [inputKey, setInputKey] = useState<string>('');
  const [keyError, setKeyError] = useState<string>('');
  
  // Blog Key States
  const [blogKeyData, setBlogKeyData] = useState<BlogKeyData | null>(null);
  const [keyHistory, setKeyHistory] = useState<KeyHistory>({
    currentVersion: 0,
    versions: {},
    metadata: {
      createdAt: Date.now(),
      lastModified: Date.now(),
      totalVersions: 0
    }
  });
  const [selectedVersion, setSelectedVersion] = useState<number>(0);
  const [importBlogKey, setImportBlogKey] = useState<string>('');
  const [blogKeyError, setBlogKeyError] = useState<string>('');
  const [selectedImportTier, setSelectedImportTier] = useState<number>(5);
  const [versionLabel, setVersionLabel] = useState<string>('');
  
  // File Upload
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Generate cryptographically secure random key
  const generateSecureRandomKey = (bits: number): string => {
    const bytes = bits / 8;
    const randomBytes = new Uint8Array(bytes);
    
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
    } else {
      throw new Error('Secure random number generation not available');
    }
    
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Generate random private key
  const generateRandomKey = () => {
    try {
      let privKey;
      try {
        privKey = PrivateKey.fromRandom();
      } catch (e) {
        const randomBytes = new Uint8Array(32);
        if (window.crypto && window.crypto.getRandomValues) {
          window.crypto.getRandomValues(randomBytes);
        } else {
          for (let i = 0; i < 32; i++) {
            randomBytes[i] = Math.floor(Math.random() * 256);
          }
        }
        const hexString = Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        privKey = PrivateKey.fromHex(hexString);
      }
      
      setInputKey(privKey.toHex());
      processPrivateKey(privKey);
      setKeyError('');
    } catch (err) {
      setKeyError('Failed to generate random key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Import private key
  const importPrivateKey = () => {
    if (!inputKey.trim()) {
      setKeyError('Please enter a private key');
      return;
    }

    try {
      let privKey: PrivateKey;
      
      if (inputKey.startsWith('L') || inputKey.startsWith('K') || inputKey.startsWith('5')) {
        privKey = PrivateKey.fromWif(inputKey.trim());
      } else if (inputKey.length === 64) {
        privKey = PrivateKey.fromHex(inputKey.trim());
      } else {
        throw new Error('Invalid private key format');
      }

      processPrivateKey(privKey);
      setKeyError('');
    } catch (err) {
      setKeyError('Invalid private key format. Please enter a valid hex or WIF key.');
    }
  };

  // Process private key
  const processPrivateKey = (privKey: PrivateKey) => {
    try {
      const pubKey = privKey.toPublicKey();
      
      const address = network === 'testnet' 
        ? pubKey.toAddress('testnet').toString()
        : pubKey.toAddress('mainnet').toString();

      let xCoord = '';
      let yCoord = '';
      
      try {
        if (pubKey.point && pubKey.point.x && pubKey.point.y) {
          xCoord = pubKey.point.x.toString(16).padStart(64, '0');
          yCoord = pubKey.point.y.toString(16).padStart(64, '0');
        } else {
          const pubKeyHex = pubKey.toString();
          if (pubKeyHex.startsWith('02') || pubKeyHex.startsWith('03')) {
            xCoord = pubKeyHex.slice(2);
            yCoord = 'Compressed format - Y coordinate derived from X';
          } else if (pubKeyHex.startsWith('04')) {
            xCoord = pubKeyHex.slice(2, 66);
            yCoord = pubKeyHex.slice(66, 130);
          }
        }
      } catch (e) {
        xCoord = 'Not available';
        yCoord = 'Not available';
      }

      setKeyData({
        privateKey: privKey,
        publicKey: pubKey,
        privateKeyHex: privKey.toHex(),
        privateKeyWif: privKey.toWif(),
        privateKeyBinary: privKey.toArray(),
        publicKeyHex: pubKey.toString(),
        publicKeyDER: Utils.toHex(pubKey.toDER()),
        publicKeyRaw: { x: xCoord, y: yCoord },
        address: address
      });
      
      updateContactSharedSecrets(privKey);
      checkBalance(address);
    } catch (err) {
      setKeyError('Error processing key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Generate hierarchical blog keys
  const generateHierarchicalBlogKeys = () => {
    try {
      const keys: SecureBlogKeys = {
        tier1: generateSecureRandomKey(128),
        tier2: generateSecureRandomKey(128),
        tier3: generateSecureRandomKey(128),
        tier4: generateSecureRandomKey(192),
        tier5: generateSecureRandomKey(256),
      };

      const accessBundles = {
        tier1: [keys.tier1],
        tier2: [keys.tier1, keys.tier2],
        tier3: [keys.tier1, keys.tier2, keys.tier3],
        tier4: [keys.tier1, keys.tier2, keys.tier3, keys.tier4],
        tier5: [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5],
      };

      const newBlogKeyData: BlogKeyData = {
        keys,
        accessBundles,
        version: 'v2-secure',
        generatedAt: Date.now(),
        label: versionLabel || `Version ${keyHistory.currentVersion + 1}`
      };
      
      const newVersion = keyHistory.currentVersion + 1;
      const updatedHistory: KeyHistory = {
        currentVersion: newVersion,
        versions: {
          ...keyHistory.versions,
          [newVersion]: newBlogKeyData
        },
        metadata: {
          createdAt: keyHistory.metadata.createdAt,
          lastModified: Date.now(),
          totalVersions: newVersion
        }
      };
      
      setKeyHistory(updatedHistory);
      setSelectedVersion(newVersion);
      setBlogKeyData(newBlogKeyData);
      
      if (setBlogKey) {
        setBlogKey(newBlogKeyData);
      }
      
      setBlogKeyError('');
      setVersionLabel('');
    } catch (err) {
      setBlogKeyError('Failed to generate blog keys: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Import access bundle
  const importAccessBundle = () => {
    const trimmedKey = importBlogKey.trim();
    
    if (!trimmedKey) {
      setBlogKeyError('Please enter an access bundle or key');
      return;
    }
    
    try {
      const decodedString = atob(trimmedKey);
      const bundleObject = JSON.parse(decodedString);
      
      if (!bundleObject.tier || !bundleObject.keys || !Array.isArray(bundleObject.keys)) {
        throw new Error('Invalid access bundle format');
      }
      
      const keys: SecureBlogKeys = {
        tier1: bundleObject.keys[0] || '',
        tier2: bundleObject.keys[1] || '',
        tier3: bundleObject.keys[2] || '',
        tier4: bundleObject.keys[3] || '',
        tier5: bundleObject.keys[4] || '',
      };
      
      const accessBundles = {
        tier1: bundleObject.tier >= 1 ? [keys.tier1].filter(k => k) : [],
        tier2: bundleObject.tier >= 2 ? [keys.tier1, keys.tier2].filter(k => k) : [],
        tier3: bundleObject.tier >= 3 ? [keys.tier1, keys.tier2, keys.tier3].filter(k => k) : [],
        tier4: bundleObject.tier >= 4 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4].filter(k => k) : [],
        tier5: bundleObject.tier >= 5 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5].filter(k => k) : [],
      };
      
      const newBlogKeyData: BlogKeyData = {
        keys,
        accessBundles,
        version: bundleObject.version || 'v2-secure',
        generatedAt: bundleObject.createdAt || Date.now(),
        label: versionLabel || `Imported Bundle (Tier ${bundleObject.tier})`
      };
      
      const newVersion = keyHistory.currentVersion + 1;
      const updatedHistory: KeyHistory = {
        currentVersion: newVersion,
        versions: {
          ...keyHistory.versions,
          [newVersion]: newBlogKeyData
        },
        metadata: {
          createdAt: keyHistory.metadata.createdAt,
          lastModified: Date.now(),
          totalVersions: newVersion
        }
      };
      
      setKeyHistory(updatedHistory);
      setSelectedVersion(newVersion);
      setBlogKeyData(newBlogKeyData);
      
      if (setBlogKey) {
        setBlogKey(newBlogKeyData);
      }
      
      setBlogKeyError('');
      setImportBlogKey('');
      setVersionLabel('');
    } catch (err) {
      setBlogKeyError('Invalid access bundle format');
    }
  };

  // Download key history
  const downloadKeyHistory = () => {
    if (Object.keys(keyHistory.versions).length === 0) {
      setBlogKeyError('No keys to download');
      return;
    }
    
    const dataToDownload = {
      keyHistory,
      exportedAt: Date.now(),
      exportVersion: '1.0',
      metadata: {
        totalVersions: keyHistory.metadata.totalVersions,
        currentVersion: keyHistory.currentVersion,
        created: new Date(keyHistory.metadata.createdAt).toISOString(),
        lastModified: new Date(keyHistory.metadata.lastModified).toISOString()
      }
    };
    
    const jsonString = JSON.stringify(dataToDownload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `blog-keys-history-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setBlogKeyError('Key history downloaded successfully');
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!data.keyHistory || !data.keyHistory.versions) {
          throw new Error('Invalid key history file format');
        }
        
        const uploadedHistory = data.keyHistory as KeyHistory;
        const existingMaxVersion = Math.max(0, ...Object.keys(keyHistory.versions).map(Number));
        
        const mergedVersions: { [key: number]: BlogKeyData } = {};
        
        Object.entries(keyHistory.versions).forEach(([version, data]) => {
          mergedVersions[Number(version)] = data;
        });
        
        Object.entries(uploadedHistory.versions).forEach(([version, data]) => {
          const newVersion = existingMaxVersion + Number(version);
          mergedVersions[newVersion] = {
            ...data,
            label: data.label ? `${data.label} (Imported)` : `Imported Version ${version}`
          };
        });
        
        const newCurrentVersion = Math.max(...Object.keys(mergedVersions).map(Number));
        
        const mergedHistory: KeyHistory = {
          currentVersion: newCurrentVersion,
          versions: mergedVersions,
          metadata: {
            createdAt: Math.min(keyHistory.metadata.createdAt, uploadedHistory.metadata.createdAt),
            lastModified: Date.now(),
            totalVersions: Object.keys(mergedVersions).length
          }
        };
        
        setKeyHistory(mergedHistory);
        setSelectedVersion(newCurrentVersion);
        
        if (mergedVersions[newCurrentVersion]) {
          setBlogKeyData(mergedVersions[newCurrentVersion]);
          if (setBlogKey) {
            setBlogKey(mergedVersions[newCurrentVersion]);
          }
        }
        
        setBlogKeyError(`Successfully imported ${Object.keys(uploadedHistory.versions).length} key versions`);
      } catch (err) {
        setBlogKeyError('Failed to import key history: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));
    
    if (jsonFile) {
      handleFileUpload(jsonFile);
    } else {
      setBlogKeyError('Please upload a valid JSON key history file');
    }
  };

  // Check balance
  const checkBalance = async (address: string) => {
    if (!address) return;
    
    setBalance({ ...balance, loading: true, error: null });
    
    try {
      const baseUrl = network === 'testnet' 
        ? 'https://api.whatsonchain.com/v1/bsv/test'
        : 'https://api.whatsonchain.com/v1/bsv/main';
      
      const response = await fetch(`${baseUrl}/address/${address}/balance`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      
      const data = await response.json();
      
      setBalance({
        confirmed: data.confirmed || 0,
        unconfirmed: data.unconfirmed || 0,
        loading: false,
        error: null
      });
    } catch (error) {
      setBalance({
        ...balance,
        loading: false,
        error: 'Unable to fetch balance. Try again later.'
      });
    }
  };

  // Format BSV
  const formatBSV = (satoshis: number): string => {
    const bsv = satoshis / 100000000;
    return bsv.toFixed(8).replace(/\.?0+$/, '');
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Profile form submit
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.username) {
      localStorage.setItem('userData', JSON.stringify(formData));
      // You can add more logic here
    }
  };

  // Update address when network changes
  useEffect(() => {
    if (keyData.privateKey) {
      processPrivateKey(keyData.privateKey);
    }
  }, [network]);

  if (!isOpen || !mounted) return null;

  const dialogContent = (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 999999 }}>
      <div 
        className="fixed inset-0 bg-black/80" 
        style={{ zIndex: 999998 }}
        onClick={onClose}
      ></div>
      <div 
        className="relative bg-zinc-900 rounded-lg p-6 w-full max-w-[800px] max-h-[90vh] overflow-y-auto mx-4 border border-zinc-700"
        style={{ zIndex: 999999 }}
      >
        {/* Header with Network Selector */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Wallet Configuration</h2>
          <div className="flex items-center gap-3">
            {/* Network Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setNetwork('mainnet')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  network === 'mainnet'
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                Mainnet
              </button>
              <button
                onClick={() => setNetwork('testnet')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  network === 'testnet'
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                Testnet
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'keys'
                ? 'bg-sky-500 text-white'
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            <Key size={16} className="inline mr-2" />
            Keys
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'profile'
                ? 'bg-sky-500 text-white'
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Profile
          </button>
        </div>

        {/* Keys Tab */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            {/* Private Key Section */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="font-medium text-white mb-3">Private Key</h3>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Enter private key (hex or WIF format)"
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-gray-500 text-sm"
                  />
                  <button
                    onClick={importPrivateKey}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
                  >
                    Import
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={generateRandomKey}
                    className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                  >
                    Generate Random Key
                  </button>
                  <button
                    onClick={() => {
                      setInputKey('0000000000000000000000000000000000000000000000000000000000000001');
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                  >
                    Test Key
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
                        <code className="text-xs text-gray-300">{keyData.address.substring(0, 12)}...{keyData.address.substring(keyData.address.length - 8)}</code>
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
            <div className="p-4 bg-indigo-900/30 rounded-lg border border-indigo-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-white">Blog Encryption Keys</h3>
                <button
                  onClick={() => setShowBlogKeys(!showBlogKeys)}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  {showBlogKeys ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              
              {showBlogKeys && (
                <div className="space-y-3">
                  {/* File Upload Area */}
                  <div
                    className={`p-4 border-2 border-dashed rounded-lg transition-colors ${
                      isDragging
                        ? 'border-indigo-400 bg-indigo-900/20'
                        : 'border-gray-600 bg-gray-800/30'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                    />
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-300 mb-2">
                        {isDragging ? 'Drop your key file here' : 'Drag and drop key file'}
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm text-indigo-400 hover:text-indigo-300 underline"
                      >
                        Browse files
                      </button>
                    </div>
                  </div>

                  {/* Key Generation */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={versionLabel}
                      onChange={(e) => setVersionLabel(e.target.value)}
                      placeholder="Version label (optional)"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 text-sm"
                    />
                    <button
                      onClick={generateHierarchicalBlogKeys}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm transition-colors"
                    >
                      Generate Keys
                    </button>
                  </div>

                  {/* Import Bundle */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={importBlogKey}
                      onChange={(e) => setImportBlogKey(e.target.value)}
                      placeholder="Import access bundle (base64)"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 text-sm"
                    />
                    <button
                      onClick={importAccessBundle}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm transition-colors"
                    >
                      Import
                    </button>
                  </div>

                  {/* Version History */}
                  {Object.keys(keyHistory.versions).length > 0 && (
                    <div className="p-3 bg-gray-800 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">Version History</span>
                        <button
                          onClick={downloadKeyHistory}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                        >
                          <Download size={14} className="inline mr-1" />
                          Download
                        </button>
                      </div>
                      <select
                        value={selectedVersion}
                        onChange={(e) => {
                          const version = Number(e.target.value);
                          const versionData = keyHistory.versions[version];
                          if (versionData) {
                            setBlogKeyData(versionData);
                            setSelectedVersion(version);
                            if (setBlogKey) {
                              setBlogKey(versionData);
                            }
                          }
                        }}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      >
                        {Object.entries(keyHistory.versions)
                          .sort(([a], [b]) => Number(b) - Number(a))
                          .map(([version, data]) => (
                            <option key={version} value={version}>
                              {data.label || `Version ${version}`}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {blogKeyError && (
                    <div className="text-sm text-yellow-400">{blogKeyError}</div>
                  )}

                  {blogKeyData && (
                    <div className="p-3 bg-indigo-900/20 rounded border border-indigo-600 text-xs">
                      <p className="text-indigo-400">✓ Blog keys loaded</p>
                      <p className="text-gray-400 mt-1">Version: {blogKeyData.label || `Version ${selectedVersion}`}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Options */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-400 hover:text-gray-300 flex items-center gap-1"
            >
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Advanced Details
            </button>
            
            {showAdvanced && keyData.privateKeyHex && (
              <div className="p-3 bg-gray-800/50 rounded text-xs text-gray-400 space-y-2">
                <div className="break-all">
                  <span className="font-medium">Private Key (Hex):</span> {keyData.privateKeyHex.substring(0, 32)}...
                </div>
                <div className="break-all">
                  <span className="font-medium">Public Key:</span> {keyData.publicKeyHex.substring(0, 32)}...
                </div>
                <div>
                  <span className="font-medium">Network:</span> {network}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="@username"
                required
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors"
              >
                Save Profile
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    dialogContent,
    document.body
  );
};

export default EntryDialog;
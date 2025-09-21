import React, { useState, useEffect, useRef } from 'react';
import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
import { useWalletStore } from '../store/WalletStore';

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

// Blog Key Types - Updated for secure hierarchical system
interface SecureBlogKeys {
  tier1: string;  // 128-bit independent key for Level 1
  tier2: string;  // 128-bit independent key for Level 2
  tier3: string;  // 128-bit independent key for Level 3
  tier4: string;  // 192-bit independent key for Level 4
  tier5: string;  // 256-bit independent key for Level 5
}

interface BlogKeyData {
  keys: SecureBlogKeys;
  // Access bundles: Each tier gets all keys from their level and below
  accessBundles: {
    tier1: string[];  // [tier1]
    tier2: string[];  // [tier1, tier2]
    tier3: string[];  // [tier1, tier2, tier3]
    tier4: string[];  // [tier1, tier2, tier3, tier4]
    tier5: string[];  // [tier1, tier2, tier3, tier4, tier5]
  };
  version: string;
  generatedAt: number;
  label?: string;  // Optional label for this key version
}

// Complete key history structure
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

export const Wallet: React.FC = () => {
  const [inputKey, setInputKey] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [showBlogKey, setShowBlogKey] = useState<boolean>(false);
  
  // Blog key states
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
  const [replaceMode, setReplaceMode] = useState<boolean>(false);
  const [versionLabel, setVersionLabel] = useState<string>('');
  
  // New state for Full Access Bundle import
  const [fullAccessBundleInput, setFullAccessBundleInput] = useState<string>('');
  const [importBundleLabel, setImportBundleLabel] = useState<string>('');
  
  // Drag and drop states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    network,
    keyData,
    balance,
    setKeyData,
    setBalance,
    updateContactSharedSecrets,
    setBlogKey // Assuming this will be added to WalletStore
  } = useWalletStore();

  // Generate cryptographically secure random key of specified bit length
  const generateSecureRandomKey = (bits: number): string => {
    const bytes = bits / 8;
    const randomBytes = new Uint8Array(bytes);
    
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
    } else {
      // This should never be used in production
      throw new Error('Secure random number generation not available');
    }
    
    // Convert to hex string
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Import Full Access Bundle (Tier 5) - NEW FUNCTION
  const importFullAccessBundle = () => {
    const trimmedBundle = fullAccessBundleInput.trim();
    
    if (!trimmedBundle) {
      setBlogKeyError('Please enter a Full Access Bundle key');
      return;
    }
    
    try {
      // Try to decode the bundle
      const decodedString = atob(trimmedBundle);
      const bundleObject = JSON.parse(decodedString);
      
      // Validate it's a tier 5 bundle
      if (bundleObject.tier !== 5) {
        throw new Error('This is not a Full Access Bundle (Tier 5). Please provide a Tier 5 bundle.');
      }
      
      // Validate the bundle structure
      if (!bundleObject.keys || !Array.isArray(bundleObject.keys) || bundleObject.keys.length !== 5) {
        throw new Error('Invalid Full Access Bundle format - must contain all 5 tier keys');
      }
      
      // Validate key lengths
      const expectedLengths = [32, 32, 32, 48, 64]; // hex character counts
      for (let i = 0; i < 5; i++) {
        if (!bundleObject.keys[i] || bundleObject.keys[i].length !== expectedLengths[i]) {
          throw new Error(`Invalid key length for Tier ${i + 1}. Expected ${expectedLengths[i]} hex characters.`);
        }
        // Validate hex format
        if (!/^[0-9a-fA-F]+$/.test(bundleObject.keys[i])) {
          throw new Error(`Tier ${i + 1} key contains invalid characters. Must be hexadecimal.`);
        }
      }
      
      // Reconstruct the blog key data from the imported bundle
      const keys: SecureBlogKeys = {
        tier1: bundleObject.keys[0],
        tier2: bundleObject.keys[1],
        tier3: bundleObject.keys[2],
        tier4: bundleObject.keys[3],
        tier5: bundleObject.keys[4],
      };
      
      // Rebuild access bundles
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
        version: bundleObject.version || 'v2-secure-imported',
        generatedAt: bundleObject.createdAt || Date.now(),
        label: importBundleLabel || 'Imported Full Access Bundle'
      };
      
      // Add to history
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
      
      // Save to localStorage for persistence and sync with EntryDialog
      if (window.localStorage) {
        localStorage.setItem('blogKeyHistory', JSON.stringify(updatedHistory));
        localStorage.setItem('currentFullAccessBundle', trimmedBundle);
      }
      
      setBlogKeyError('Full Access Bundle imported successfully!');
      setFullAccessBundleInput('');
      setImportBundleLabel('');
    } catch (err) {
      setBlogKeyError('Failed to import Full Access Bundle: ' + (err instanceof Error ? err.message : 'Invalid bundle format'));
    }
  };

  // Generate new hierarchical blog keys with independent keys for each tier
  const generateHierarchicalBlogKeys = () => {
    try {
      // Generate independent keys for each tier
      const keys: SecureBlogKeys = {
        tier1: generateSecureRandomKey(128),  // 32 hex chars
        tier2: generateSecureRandomKey(128),  // 32 hex chars
        tier3: generateSecureRandomKey(128),  // 32 hex chars
        tier4: generateSecureRandomKey(192),  // 48 hex chars
        tier5: generateSecureRandomKey(256),  // 64 hex chars
      };

      // Create access bundles - each tier includes all lower tier keys
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
      
      // Add to history
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
      
      // Store in WalletStore if the method exists
      if (setBlogKey) {
        setBlogKey(newBlogKeyData);
      }
      
      // Create and save the Full Access Bundle to localStorage
      const bundleObject = {
        tier: 5,
        keys: [
          keys.tier1,
          keys.tier2,
          keys.tier3,
          keys.tier4,
          keys.tier5
        ],
        version: newBlogKeyData.version,
        createdAt: newBlogKeyData.generatedAt
      };
      
      const fullAccessBundle = btoa(JSON.stringify(bundleObject));
      
      // Save to localStorage for persistence and sync with EntryDialog
      if (window.localStorage) {
        localStorage.setItem('blogKeyHistory', JSON.stringify(updatedHistory));
        localStorage.setItem('currentFullAccessBundle', fullAccessBundle);
      }
      
      setBlogKeyError('');
      setVersionLabel(''); // Clear label after use
    } catch (err) {
      setBlogKeyError('Failed to generate blog keys: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Replace a specific tier key while keeping others
  const replaceSpecificTier = (tierNumber: number, newKey: string) => {
    if (!blogKeyData) {
      setBlogKeyError('No existing keys to modify');
      return;
    }
    
    try {
      // Validate the new key
      const expectedLengths: { [key: number]: number } = {
        1: 32, // 128 bits
        2: 32, // 128 bits
        3: 32, // 128 bits
        4: 48, // 192 bits
        5: 64, // 256 bits
      };
      
      if (!/^[0-9a-fA-F]+$/.test(newKey)) {
        throw new Error('Key must be in hexadecimal format');
      }
      
      if (newKey.length !== expectedLengths[tierNumber]) {
        throw new Error(`Tier ${tierNumber} key must be exactly ${expectedLengths[tierNumber]} hex characters`);
      }
      
      // Copy existing keys
      const updatedKeys = { ...blogKeyData.keys };
      
      // Replace the specific tier
      const tierKey = `tier${tierNumber}` as keyof SecureBlogKeys;
      updatedKeys[tierKey] = newKey;
      
      // CRITICAL: Rebuild ALL access bundles with the updated keys
      // Each tier's bundle includes all keys from their level and below
      const accessBundles = {
        tier1: [updatedKeys.tier1],
        tier2: [updatedKeys.tier1, updatedKeys.tier2],
        tier3: [updatedKeys.tier1, updatedKeys.tier2, updatedKeys.tier3],
        tier4: [updatedKeys.tier1, updatedKeys.tier2, updatedKeys.tier3, updatedKeys.tier4],
        tier5: [updatedKeys.tier1, updatedKeys.tier2, updatedKeys.tier3, updatedKeys.tier4, updatedKeys.tier5],
      };
      
      const updatedBlogKeyData: BlogKeyData = {
        keys: updatedKeys,
        accessBundles,
        version: 'v2-secure-modified',
        generatedAt: Date.now(),
        label: versionLabel || `Version ${keyHistory.currentVersion + 1} (Modified Tier ${tierNumber})`
      };
      
      // Add to history as a new version
      const newVersion = keyHistory.currentVersion + 1;
      const updatedHistory: KeyHistory = {
        currentVersion: newVersion,
        versions: {
          ...keyHistory.versions,
          [newVersion]: updatedBlogKeyData
        },
        metadata: {
          createdAt: keyHistory.metadata.createdAt,
          lastModified: Date.now(),
          totalVersions: newVersion
        }
      };
      
      setKeyHistory(updatedHistory);
      setSelectedVersion(newVersion);
      setBlogKeyData(updatedBlogKeyData);
      
      // Update WalletStore
      if (setBlogKey) {
        setBlogKey(updatedBlogKeyData);
      }
      
      // IMPORTANT: Update the Full Access Bundle in localStorage
      const bundleObject = {
        tier: 5,
        keys: [
          updatedKeys.tier1,
          updatedKeys.tier2,
          updatedKeys.tier3,
          updatedKeys.tier4,
          updatedKeys.tier5
        ],
        version: updatedBlogKeyData.version,
        createdAt: updatedBlogKeyData.generatedAt
      };
      
      const fullAccessBundle = btoa(JSON.stringify(bundleObject));
      
      // Save ALL updates to localStorage for persistence and sync
      if (window.localStorage) {
        localStorage.setItem('blogKeyHistory', JSON.stringify(updatedHistory));
        localStorage.setItem('currentFullAccessBundle', fullAccessBundle);
      }
      
      setBlogKeyError(`Successfully replaced Tier ${tierNumber} key. All access bundles updated.`);
      setImportBlogKey('');
      setVersionLabel('');
    } catch (err) {
      setBlogKeyError('Failed to replace key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Create a shareable access bundle for a specific tier
  const createAccessBundle = (tier: number): string => {
    if (!blogKeyData) return '';
    
    const tierKey = `tier${tier}` as keyof typeof blogKeyData.accessBundles;
    const bundle = blogKeyData.accessBundles[tierKey];
    
    // Create a JSON object with the tier level and keys
    const bundleObject = {
      tier,
      keys: bundle,
      version: blogKeyData.version,
      createdAt: Date.now()
    };
    
    // Convert to base64 for easy sharing
    return btoa(JSON.stringify(bundleObject));
  };

  // Import an access bundle
  const importAccessBundle = () => {
    const trimmedKey = importBlogKey.trim();
    
    if (!trimmedKey) {
      setBlogKeyError('Please enter an access bundle or key');
      return;
    }
    
    // If in replace mode and it's a hex key
    if (replaceMode && /^[0-9a-fA-F]+$/.test(trimmedKey) && blogKeyData) {
      replaceSpecificTier(selectedImportTier, trimmedKey);
      return;
    }
    
    try {
      // Try to decode the bundle
      const decodedString = atob(trimmedKey);
      const bundleObject = JSON.parse(decodedString);
      
      // Validate the bundle structure
      if (!bundleObject.tier || !bundleObject.keys || !Array.isArray(bundleObject.keys)) {
        throw new Error('Invalid access bundle format');
      }
      
      // Reconstruct the blog key data from the imported bundle
      const keys: SecureBlogKeys = {
        tier1: bundleObject.keys[0] || '',
        tier2: bundleObject.keys[1] || '',
        tier3: bundleObject.keys[2] || '',
        tier4: bundleObject.keys[3] || '',
        tier5: bundleObject.keys[4] || '',
      };
      
      // Rebuild access bundles based on imported tier
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
      
      // Add to history
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
      // If base64 decode fails, try importing as raw hex key for backward compatibility
      if (selectedImportTier && /^[0-9a-fA-F]+$/.test(trimmedKey)) {
        importRawHexKey(trimmedKey, selectedImportTier);
      } else {
        setBlogKeyError('Invalid access bundle or hex key format');
      }
    }
  };

  // Import raw hex key for a specific tier (backward compatibility)
  const importRawHexKey = (hexKey: string, tier: number) => {
    try {
      // Validate hex format
      if (!/^[0-9a-fA-F]+$/.test(hexKey)) {
        throw new Error('Invalid hexadecimal format');
      }
      
      // Check key length based on tier
      const expectedLengths: { [key: number]: number } = {
        1: 32, // 128 bits
        2: 32, // 128 bits
        3: 32, // 128 bits
        4: 48, // 192 bits
        5: 64, // 256 bits
      };
      
      if (hexKey.length !== expectedLengths[tier]) {
        throw new Error(`Tier ${tier} key must be exactly ${expectedLengths[tier]} hex characters`);
      }
      
      // Create a partial key structure
      const keys: SecureBlogKeys = {
        tier1: tier >= 1 && tier === 1 ? hexKey : '',
        tier2: tier >= 2 && tier === 2 ? hexKey : '',
        tier3: tier >= 3 && tier === 3 ? hexKey : '',
        tier4: tier >= 4 && tier === 4 ? hexKey : '',
        tier5: tier >= 5 && tier === 5 ? hexKey : '',
      };
      
      // Note: This creates a partial key set - only the imported tier
      const accessBundles = {
        tier1: tier >= 1 && keys.tier1 ? [keys.tier1] : [],
        tier2: tier >= 2 && keys.tier2 ? [keys.tier1, keys.tier2].filter(k => k) : [],
        tier3: tier >= 3 && keys.tier3 ? [keys.tier1, keys.tier2, keys.tier3].filter(k => k) : [],
        tier4: tier >= 4 && keys.tier4 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4].filter(k => k) : [],
        tier5: tier >= 5 && keys.tier5 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5].filter(k => k) : [],
      };
      
      const newBlogKeyData: BlogKeyData = {
        keys,
        accessBundles,
        version: 'v2-secure-partial',
        generatedAt: Date.now(),
        label: versionLabel || `Imported Tier ${tier} Key`
      };
      
      // Add to history
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
      setBlogKeyError(`Imported Tier ${tier} key. Note: This is a partial key set.`);
      setImportBlogKey('');
      setVersionLabel('');
    } catch (err) {
      setBlogKeyError('Failed to import key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Download all key history as JSON
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
        
        // Validate the uploaded data structure
        if (!data.keyHistory || !data.keyHistory.versions) {
          throw new Error('Invalid key history file format');
        }
        
        // Merge with existing history or replace
        const uploadedHistory = data.keyHistory as KeyHistory;
        
        // Find the highest version number to continue from
        const existingMaxVersion = Math.max(0, ...Object.keys(keyHistory.versions).map(Number));
        const uploadedMaxVersion = Math.max(0, ...Object.keys(uploadedHistory.versions).map(Number));
        
        // Merge histories
        const mergedVersions: { [key: number]: BlogKeyData } = {};
        
        // Add existing versions
        Object.entries(keyHistory.versions).forEach(([version, data]) => {
          mergedVersions[Number(version)] = data;
        });
        
        // Add uploaded versions with new version numbers to avoid conflicts
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
        
        // Load the latest version
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
    
    reader.onerror = () => {
      setBlogKeyError('Failed to read file');
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

  // Load selected version from history
  const loadVersion = (versionNumber: number) => {
    const versionData = keyHistory.versions[versionNumber];
    if (versionData) {
      setBlogKeyData(versionData);
      setSelectedVersion(versionNumber);
      if (setBlogKey) {
        setBlogKey(versionData);
      }
      setBlogKeyError(`Loaded ${versionData.label || `Version ${versionNumber}`}`);
    }
  };

  // Get the highest tier level available in current blog key data
  const getHighestAvailableTier = (): number => {
    if (!blogKeyData) return 0;
    
    if (blogKeyData.keys.tier5) return 5;
    if (blogKeyData.keys.tier4) return 4;
    if (blogKeyData.keys.tier3) return 3;
    if (blogKeyData.keys.tier2) return 2;
    if (blogKeyData.keys.tier1) return 1;
    return 0;
  };

  // Generate random private key
  const generateRandomKey = () => {
    try {
      let privKey;
      try {
        privKey = PrivateKey.fromRandom();
      } catch (e) {
        // Fallback: generate random 32 bytes and create private key
        const randomBytes = new Uint8Array(32);
        if (window.crypto && window.crypto.getRandomValues) {
          window.crypto.getRandomValues(randomBytes);
        } else {
          // Very basic fallback for development
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
      setError('');
    } catch (err) {
      setError('Failed to generate random key: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Error generating key:', err);
    }
  };

  // Process user input private key
  const importPrivateKey = () => {
    if (!inputKey.trim()) {
      setError('Please enter a private key');
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
      setError('');
    } catch (err) {
      setError('Invalid private key format. Please enter a valid hex or WIF key.');
    }
  };

  // Process private key and derive all formats
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
        console.log('Could not extract raw coordinates:', e);
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
    } catch (err) {
      console.error('Error processing private key:', err);
      setError('Error processing key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Check balance for address
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
      console.error('Balance check error:', error);
      setBalance({
        ...balance,
        loading: false,
        error: 'Unable to fetch balance. Try again later.'
      });
    }
  };

  // Format satoshis to BSV
  const formatBSV = (satoshis: number): string => {
    const bsv = satoshis / 100000000;
    return bsv.toFixed(8).replace(/\.?0+$/, '');
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  // Sync with EntryDialog on mount and when localStorage changes
  useEffect(() => {
    const loadBlogKeysFromStorage = () => {
      try {
        // Check if there's a Full Access Bundle from EntryDialog
        const storedBundle = localStorage.getItem('currentFullAccessBundle');
        const storedHistory = localStorage.getItem('blogKeyHistory');
        const newKeysAvailable = localStorage.getItem('newBlogKeysAvailable');
        
        // Load blog key history if available and not already loaded
        if (storedHistory) {
          try {
            const parsedHistory = JSON.parse(storedHistory);
            
            // Validate the parsed history structure
            if (!parsedHistory || !parsedHistory.versions) {
              console.error('Invalid blog key history structure');
              return;
            }
            
            // Check if this is newer than what we have
            if (!keyHistory.versions || 
                Object.keys(parsedHistory.versions).length > Object.keys(keyHistory.versions).length ||
                parsedHistory.currentVersion > keyHistory.currentVersion ||
                newKeysAvailable === 'true') {
              
              setKeyHistory(parsedHistory);
              
              // Load the current version
              if (parsedHistory.currentVersion > 0 && parsedHistory.versions[parsedHistory.currentVersion]) {
                const currentBlogKey = parsedHistory.versions[parsedHistory.currentVersion];
                
                // Validate and sanitize the blog key data
                if (currentBlogKey && currentBlogKey.keys) {
                  const sanitizedBlogKey: BlogKeyData = {
                    keys: {
                      tier1: currentBlogKey.keys?.tier1 || '',
                      tier2: currentBlogKey.keys?.tier2 || '',
                      tier3: currentBlogKey.keys?.tier3 || '',
                      tier4: currentBlogKey.keys?.tier4 || '',
                      tier5: currentBlogKey.keys?.tier5 || ''
                    },
                    accessBundles: currentBlogKey.accessBundles || {
                      tier1: [],
                      tier2: [],
                      tier3: [],
                      tier4: [],
                      tier5: []
                    },
                    version: currentBlogKey.version || 'v2-secure',
                    generatedAt: currentBlogKey.generatedAt || Date.now(),
                    label: currentBlogKey.label || `Version ${parsedHistory.currentVersion}`
                  };
                  
                  setBlogKeyData(sanitizedBlogKey);
                  setSelectedVersion(parsedHistory.currentVersion);
                  
                  // Update WalletStore if needed
                  if (setBlogKey) {
                    setBlogKey(sanitizedBlogKey);
                  }
                  
                  // Clear the flag
                  if (newKeysAvailable === 'true') {
                    localStorage.removeItem('newBlogKeysAvailable');
                  }
                }
              }
            }
          } catch (e) {
            console.error('Failed to parse blog key history:', e);
          }
        }
        
        // If there's a Full Access Bundle but no blog keys loaded yet, import it
        if (storedBundle && !blogKeyData) {
          try {
            const decodedString = atob(storedBundle);
            const bundleObject = JSON.parse(decodedString);
            
            if (bundleObject && bundleObject.tier === 5 && bundleObject.keys && Array.isArray(bundleObject.keys)) {
              // Filter out undefined or empty keys
              const validKeys = bundleObject.keys.filter((k: any) => k && typeof k === 'string');
              
              if (validKeys.length > 0) {
                const keys: SecureBlogKeys = {
                  tier1: validKeys[0] || '',
                  tier2: validKeys[1] || '',
                  tier3: validKeys[2] || '',
                  tier4: validKeys[3] || '',
                  tier5: validKeys[4] || '',
                };
                
                const accessBundles = {
                  tier1: keys.tier1 ? [keys.tier1] : [],
                  tier2: keys.tier2 ? [keys.tier1, keys.tier2].filter(k => k) : [],
                  tier3: keys.tier3 ? [keys.tier1, keys.tier2, keys.tier3].filter(k => k) : [],
                  tier4: keys.tier4 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4].filter(k => k) : [],
                  tier5: keys.tier5 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5].filter(k => k) : [],
                };
                
                const newBlogKeyData: BlogKeyData = {
                  keys,
                  accessBundles,
                  version: bundleObject.version || 'v2-secure',
                  generatedAt: bundleObject.createdAt || Date.now(),
                  label: 'Synced from EntryDialog'
                };
                
                setBlogKeyData(newBlogKeyData);
                setBlogKeyError('Keys synced from EntryDialog');
              }
            }
          } catch (err) {
            console.error('Failed to auto-import bundle from EntryDialog:', err);
          }
        }
      } catch (error) {
        console.error('Error loading blog keys from storage:', error);
      }
    };
    
    // Load initially
    loadBlogKeysFromStorage();
    
    // Set up an interval to check for updates
    const intervalId = setInterval(loadBlogKeysFromStorage, 1000);
    
    // Also listen for storage events (for cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'blogKeyHistory' || e.key === 'currentFullAccessBundle' || e.key === 'newBlogKeysAvailable') {
        loadBlogKeysFromStorage();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [blogKeyData, keyHistory.currentVersion]);

  // Update address and check balance when network changes
  useEffect(() => {
    if (keyData.publicKey) {
      const address = network === 'testnet'
        ? keyData.publicKey.toAddress('testnet').toString()
        : keyData.publicKey.toAddress('mainnet').toString();
      
      setKeyData({ ...keyData, address });
      checkBalance(address);
    }
  }, [network]);

  return (
    <>
      <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
        <h2 className="text-xl font-semibold mb-4 text-white">Generate or Import Private Key</h2>
        
        <div className="mb-4 flex gap-2">
          <button
            onClick={generateRandomKey}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Generate Random Private Key
          </button>
          <button
            onClick={() => {
              const testKey = '0000000000000000000000000000000000000000000000000000000000000001';
              setInputKey(testKey);
              importPrivateKey();
            }}
            className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            title="Use test key"
          >
            Test Key
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Enter private key (hex or WIF format)"
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
          />
          <button
            onClick={importPrivateKey}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Import Key
          </button>
        </div>

        {error && (
          <p className="mt-2 text-red-400 text-sm">{error}</p>
        )}
      </div>

      {/* Secure Hierarchical Blog Key Generation Section */}
      <div className="mb-6 p-4 bg-indigo-900 bg-opacity-30 rounded-lg border border-indigo-700">
        <h2 className="text-xl font-semibold mb-4 text-white">Secure Hierarchical Blog Encryption Keys</h2>
        
        <div className="mb-4 p-3 bg-indigo-800 bg-opacity-30 rounded-lg">
          <p className="text-sm text-indigo-300">
            <span className="font-semibold">🔐 Enhanced Security Model:</span> Each tier uses independent cryptographic keys. 
            Higher tiers receive all keys from their level and below, enabling decryption of lower-tier content without vulnerability to privilege escalation.
          </p>
        </div>

        {/* Import Full Access Bundle Section - NEW */}
        <div className="mb-4 p-4 bg-emerald-900 bg-opacity-30 rounded-lg border border-emerald-600">
          <h3 className="text-sm font-semibold text-emerald-300 mb-3">Import Full Access Bundle</h3>
          <div className="space-y-2">
            <input
              type="text"
              value={importBundleLabel}
              onChange={(e) => setImportBundleLabel(e.target.value)}
              placeholder="Optional: Label for imported bundle (e.g., 'Main Blog Keys')"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={fullAccessBundleInput}
                onChange={(e) => setFullAccessBundleInput(e.target.value)}
                placeholder="Paste your Full Access Bundle (Tier 5) key here"
                className="flex-1 px-4 py-2 bg-gray-800 border border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-gray-400"
              />
              <button
                onClick={importFullAccessBundle}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Import Bundle
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Import a Full Access Bundle to populate all tier keys. This will create a new version in your key history.
            </p>
          </div>
        </div>

        {/* Key History Upload Area */}
        <div
          className={`mb-4 p-6 border-2 border-dashed rounded-lg transition-colors ${
            isDragging
              ? 'border-indigo-400 bg-indigo-900 bg-opacity-20'
              : 'border-gray-600 bg-gray-800 bg-opacity-30'
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
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-3"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-gray-300 mb-2">
              {isDragging ? 'Drop your key history file here' : 'Drag and drop your key history JSON file here'}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-indigo-400 hover:text-indigo-300 underline"
            >
              Or click to browse
            </button>
          </div>
        </div>

        {/* Key History Management */}
        {Object.keys(keyHistory.versions).length > 0 && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Key Version History</h3>
              <button
                onClick={downloadKeyHistory}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
              >
                📥 Download All Versions
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={selectedVersion}
                onChange={(e) => loadVersion(Number(e.target.value))}
                className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {Object.entries(keyHistory.versions)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([version, data]) => (
                    <option key={version} value={version}>
                      {data.label || `Version ${version}`} - {new Date(data.generatedAt).toLocaleString()}
                    </option>
                  ))}
              </select>
              <span className="text-xs text-gray-400">
                Total: {keyHistory.metadata.totalVersions} versions
              </span>
            </div>
          </div>
        )}
        
        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="Optional: Label for this version (e.g., 'Production Keys')"
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm"
            />
            <button
              onClick={generateHierarchicalBlogKeys}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Generate New Version
            </button>
          </div>
          
          {/* Regenerate Single Tier Section */}
          {blogKeyData && (
            <div className="flex gap-2 p-3 bg-purple-900 bg-opacity-20 rounded-lg border border-purple-600">
              <select
                value={selectedImportTier}
                onChange={(e) => setSelectedImportTier(Number(e.target.value))}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                <option value={1}>Tier 1 (128-bit)</option>
                <option value={2}>Tier 2 (128-bit)</option>
                <option value={3}>Tier 3 (128-bit)</option>
                <option value={4}>Tier 4 (192-bit)</option>
                <option value={5}>Tier 5 (256-bit)</option>
              </select>
              <button
                onClick={() => {
                  // Generate new random key for selected tier
                  const bitSizes: { [key: number]: number } = {
                    1: 128,
                    2: 128,
                    3: 128,
                    4: 192,
                    5: 256
                  };
                  const newKey = generateSecureRandomKey(bitSizes[selectedImportTier]);
                  replaceSpecificTier(selectedImportTier, newKey);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                🎲 Regenerate {`Tier ${selectedImportTier}`} with Random Key
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="replaceMode"
              checked={replaceMode}
              onChange={(e) => setReplaceMode(e.target.checked)}
              disabled={!blogKeyData}
              className="rounded"
            />
            <label htmlFor="replaceMode" className="text-sm text-gray-300">
              Replace single tier only (preserve other keys)
            </label>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={importBlogKey}
              onChange={(e) => setImportBlogKey(e.target.value)}
              placeholder={replaceMode ? "Enter hex key to replace selected tier" : "Import access bundle (base64) or raw hex key"}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400"
            />
            <select
              value={selectedImportTier}
              onChange={(e) => setSelectedImportTier(Number(e.target.value))}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
              title="Select tier for raw hex import or replacement"
            >
              <option value={1}>Tier 1</option>
              <option value={2}>Tier 2</option>
              <option value={3}>Tier 3</option>
              <option value={4}>Tier 4</option>
              <option value={5}>Tier 5</option>
            </select>
            <button
              onClick={importAccessBundle}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              {replaceMode ? 'Replace' : 'Import'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {replaceMode 
              ? 'Enter a hex key and select which tier to replace while keeping other tiers intact'
              : 'Import an access bundle shared with you, or a raw hex key for a specific tier'}
          </p>
        </div>

        {blogKeyError && (
          <p className="mt-2 text-sm text-yellow-400">{blogKeyError}</p>
        )}

        {blogKeyData && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">
                {blogKeyData.label || `Version ${selectedVersion}`} Keys
              </h3>
              <button
                onClick={() => setShowBlogKey(!showBlogKey)}
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
              >
                {showBlogKey ? 'Hide' : 'Show'} Keys & Access Bundles
              </button>
            </div>

            {showBlogKey && (
              <div className="p-4 bg-gray-800 rounded-lg space-y-4">
                {/* Tier 5 - Full Access */}
                {blogKeyData.keys.tier5 && (
                  <div className="p-3 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-red-300">
                        Tier 5 - Complete Access (All Levels)
                      </label>
                      <span className="text-xs text-gray-400">256-bit key</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-gray-900 rounded border border-red-600 text-xs break-all text-red-300 font-mono">
                          {blogKeyData.keys.tier5}
                        </code>
                        <button
                          onClick={() => copyToClipboard(blogKeyData.keys.tier5, 'Tier 5 Key')}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                          title="Copy Tier 5 key only"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(createAccessBundle(5), 'Tier 5 Access Bundle')}
                          className="flex-1 px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-sm"
                        >
                          📦 Copy Full Access Bundle (Decrypts Levels 1-5)
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Access: Can decrypt all content (Levels 1, 2, 3, 4, and 5)
                      </p>
                    </div>
                  </div>
                )}

                {/* Tier 4 */}
                {blogKeyData.keys.tier4 && (
                  <div className="p-3 bg-purple-900 bg-opacity-20 rounded-lg border border-purple-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-purple-300">
                        Tier 4 - Closed Group Access
                      </label>
                      <span className="text-xs text-gray-400">192-bit key</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-gray-900 rounded border border-purple-600 text-xs break-all text-purple-300 font-mono">
                          {blogKeyData.keys.tier4}
                        </code>
                        <button
                          onClick={() => copyToClipboard(blogKeyData.keys.tier4, 'Tier 4 Key')}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                          title="Copy Tier 4 key only"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(createAccessBundle(4), 'Tier 4 Access Bundle')}
                          className="flex-1 px-3 py-1 bg-purple-800 hover:bg-purple-700 text-white rounded text-sm"
                        >
                          📦 Copy Tier 4 Access Bundle (Decrypts Levels 1-4)
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Access: Can decrypt Levels 1, 2, 3, and 4 content
                      </p>
                    </div>
                  </div>
                )}

                {/* Tier 3 */}
                {blogKeyData.keys.tier3 && (
                  <div className="p-3 bg-indigo-900 bg-opacity-20 rounded-lg border border-indigo-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-indigo-300">
                        Tier 3 - Inner Circle Access
                      </label>
                      <span className="text-xs text-gray-400">128-bit key</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-gray-900 rounded border border-indigo-600 text-xs break-all text-indigo-300 font-mono">
                          {blogKeyData.keys.tier3}
                        </code>
                        <button
                          onClick={() => copyToClipboard(blogKeyData.keys.tier3, 'Tier 3 Key')}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                          title="Copy Tier 3 key only"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(createAccessBundle(3), 'Tier 3 Access Bundle')}
                          className="flex-1 px-3 py-1 bg-indigo-800 hover:bg-indigo-700 text-white rounded text-sm"
                        >
                          📦 Copy Tier 3 Access Bundle (Decrypts Levels 1-3)
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Access: Can decrypt Levels 1, 2, and 3 content
                      </p>
                    </div>
                  </div>
                )}

                {/* Tier 2 */}
                {blogKeyData.keys.tier2 && (
                  <div className="p-3 bg-yellow-900 bg-opacity-20 rounded-lg border border-yellow-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-yellow-300">
                        Tier 2 - Close Friends Access
                      </label>
                      <span className="text-xs text-gray-400">128-bit key</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-gray-900 rounded border border-yellow-600 text-xs break-all text-yellow-300 font-mono">
                          {blogKeyData.keys.tier2}
                        </code>
                        <button
                          onClick={() => copyToClipboard(blogKeyData.keys.tier2, 'Tier 2 Key')}
                          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
                          title="Copy Tier 2 key only"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(createAccessBundle(2), 'Tier 2 Access Bundle')}
                          className="flex-1 px-3 py-1 bg-yellow-800 hover:bg-yellow-700 text-white rounded text-sm"
                        >
                          📦 Copy Tier 2 Access Bundle (Decrypts Levels 1-2)
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Access: Can decrypt Levels 1 and 2 content
                      </p>
                    </div>
                  </div>
                )}

                {/* Tier 1 */}
                {blogKeyData.keys.tier1 && (
                  <div className="p-3 bg-orange-900 bg-opacity-20 rounded-lg border border-orange-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-orange-300">
                        Tier 1 - Friends Access
                      </label>
                      <span className="text-xs text-gray-400">128-bit key</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-gray-900 rounded border border-orange-600 text-xs break-all text-orange-300 font-mono">
                          {blogKeyData.keys.tier1}
                        </code>
                        <button
                          onClick={() => copyToClipboard(blogKeyData.keys.tier1, 'Tier 1 Key')}
                          className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
                          title="Copy Tier 1 key only"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(createAccessBundle(1), 'Tier 1 Access Bundle')}
                          className="flex-1 px-3 py-1 bg-orange-800 hover:bg-orange-700 text-white rounded text-sm"
                        >
                          📦 Copy Tier 1 Access Bundle (Decrypts Level 1 only)
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Access: Can decrypt Level 1 content only
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-green-800 bg-opacity-30 rounded-lg">
                  <h4 className="text-sm font-semibold text-green-300 mb-2">🔐 Security Features:</h4>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>✅ <span className="text-green-400">Independent keys</span> - Each tier has its own cryptographic key</li>
                    <li>✅ <span className="text-green-400">No privilege escalation</span> - Lower tiers cannot derive higher tier keys</li>
                    <li>✅ <span className="text-green-400">Hierarchical access</span> - Higher tiers can decrypt all lower tier content</li>
                    <li>✅ <span className="text-green-400">Version history</span> - Track all key generations and modifications</li>
                    <li>✅ <span className="text-green-400">Backup & restore</span> - Download and upload complete key history</li>
                    <li>✅ <span className="text-green-400">Selective replacement</span> - Change individual tier keys without affecting others</li>
                    <li>✅ <span className="text-green-400">Full bundle import</span> - Import complete tier 5 bundles to populate all keys</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-400">
              <p>Current Version: <span className="text-gray-300">{blogKeyData.label || `Version ${selectedVersion}`}</span></p>
              <p>Type: <span className="text-gray-300">{blogKeyData.version}</span></p>
              <p>Generated: <span className="text-gray-300">{new Date(blogKeyData.generatedAt).toLocaleString()}</span></p>
              <p>Highest Available Tier: <span className="text-gray-300">Level {getHighestAvailableTier()}</span></p>
            </div>
          </div>
        )}
      </div>

      {keyData.privateKey && (
        <>
          <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
            <h2 className="text-xl font-semibold mb-2 text-white">BSV Address (for Regular Transactions & 1Sat Ordinals)</h2>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-gray-800 rounded border border-blue-600 text-sm break-all text-blue-300">
                {keyData.address}
              </code>
              <button
                onClick={() => copyToClipboard(keyData.address, 'Address')}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                title="Copy address"
              >
                📋
              </button>
            </div>
            
            <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Balance:</span>
                <div className="flex items-center gap-2">
                  {balance.loading ? (
                    <span className="text-sm text-gray-400">Loading...</span>
                  ) : balance.error ? (
                    <span className="text-sm text-red-400">{balance.error}</span>
                  ) : (
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">
                        {formatBSV(balance.confirmed)} BSV
                      </div>
                      {balance.unconfirmed > 0 && (
                        <div className="text-xs text-yellow-400">
                          +{formatBSV(balance.unconfirmed)} unconfirmed
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        ({balance.confirmed.toLocaleString()} satoshis)
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => checkBalance(keyData.address)}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
                    title="Refresh balance"
                    disabled={balance.loading}
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>
            
            <p className="mt-2 text-sm text-gray-400">
              Network: <span className="font-medium text-gray-300">{network}</span>
            </p>
          </div>

          {/* 1Sat Ordinals Information Section */}


          <div className="mb-6 p-4 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Private Key Formats</h2>
              <button
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="text-sm text-red-400 hover:text-red-300 font-medium"
              >
                {showPrivateKey ? 'Hide' : 'Show'} Private Keys
              </button>
            </div>
            
            {showPrivateKey && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-300">Hex Format:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
                      {keyData.privateKeyHex}
                    </code>
                    <button
                      onClick={() => copyToClipboard(keyData.privateKeyHex, 'Private Key Hex')}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">WIF Format:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
                      {keyData.privateKeyWif}
                    </code>
                    <button
                      onClick={() => copyToClipboard(keyData.privateKeyWif, 'Private Key WIF')}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">Binary Format (first 10 bytes):</label>
                  <code className="block mt-1 p-2 bg-gray-800 rounded border border-red-600 text-xs text-red-300">
                    [{keyData.privateKeyBinary.slice(0, 10).join(', ')}...]
                  </code>
                </div>
              </div>
            )}
            
            <p className="mt-3 text-xs text-red-400 font-medium">
              ⚠️ Warning: Never share your private key with anyone!
            </p>
          </div>

          <div className="mb-6 p-4 bg-green-900 bg-opacity-20 rounded-lg border border-green-700">
            <h2 className="text-xl font-semibold mb-4 text-white">Public Key Formats</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-300">Hex Format (Compressed):</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
                    {keyData.publicKeyHex}
                  </code>
                  <button
                    onClick={() => copyToClipboard(keyData.publicKeyHex, 'Public Key Hex')}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">DER Format:</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
                    {keyData.publicKeyDER}
                  </code>
                  <button
                    onClick={() => copyToClipboard(keyData.publicKeyDER, 'Public Key DER')}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300">Raw Public Key Coordinates:</label>
                <div className="mt-1 p-2 bg-gray-800 rounded border border-green-600 text-xs">
                  <div className="break-all text-green-300">
                    <span className="font-medium">X:</span> {keyData.publicKeyRaw.x}
                  </div>
                  <div className="break-all mt-1 text-green-300">
                    <span className="font-medium">Y:</span> {keyData.publicKeyRaw.y}
                  </div>
                </div>
              </div>


                        <div className="mb-6 p-4 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-700">
            <h2 className="text-xl font-semibold mb-3 text-white">1Sat Ordinals Information</h2>
            
            <div className="p-4 bg-gray-800 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-purple-300 mb-1">Same Address for Everything</h3>
                  <p className="text-sm text-gray-300">
                    1Sat Ordinals uses standard P2PKH addresses - the same address shown above works for both regular BSV transactions and ordinal inscriptions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-purple-300 mb-1">How It Works</h3>
                  <p className="text-sm text-gray-300">
                    Inscriptions are created by embedding data in transaction outputs that send 1 satoshi to your address. The inscription data is stored in the transaction script.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-purple-300 mb-1">Managing Your Ordinals</h3>
                  <p className="text-sm text-gray-300">
                    Keep track of inscription transaction IDs. Use ordinals-compatible wallets or indexers to view and manage your inscriptions. Each inscription is tied to a specific satoshi at your address.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-purple-800 bg-opacity-30 rounded-lg border border-purple-600">
              <p className="text-xs text-purple-300">
                <span className="font-semibold">Pro Tip:</span> When receiving ordinals, make sure the sender uses your address above. The inscription will appear as a 1 satoshi UTXO with embedded data.
              </p>
            </div>
          </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
















// This is a working wallet proir to the BLOG bunck key build / scyn work 

// import React, { useState, useEffect, useRef } from 'react';
// import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
// import { useWalletStore } from '../store/WalletStore';

// // Polyfill Buffer for browser environment
// if (typeof window !== 'undefined' && !window.Buffer) {
//   window.Buffer = {
//     from: (data: any, encoding?: string) => {
//       if (encoding === 'hex') {
//         const bytes = [];
//         for (let i = 0; i < data.length; i += 2) {
//           bytes.push(parseInt(data.substr(i, 2), 16));
//         }
//         return new Uint8Array(bytes);
//       } else if (typeof data === 'string') {
//         return new TextEncoder().encode(data);
//       }
//       return new Uint8Array(data);
//     },
//     alloc: (size: number) => new Uint8Array(size),
//     concat: (arrays: Uint8Array[]) => {
//       const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
//       const result = new Uint8Array(totalLength);
//       let offset = 0;
//       for (const arr of arrays) {
//         result.set(arr, offset);
//         offset += arr.length;
//       }
//       return result;
//     }
//   } as any;
// }

// // Blog Key Types - Updated for secure hierarchical system     Secure Hierarchical Blog Encryption Keys
// interface SecureBlogKeys {
//   tier1: string;  // 128-bit independent key for Level 1  label for this version
//   tier2: string;  // 128-bit independent key for Level 2
//   tier3: string;  // 128-bit independent key for Level 3
//   tier4: string;  // 192-bit independent key for Level 4
//   tier5: string;  // 256-bit independent key for Level 5
// }

// interface BlogKeyData {
//   keys: SecureBlogKeys;
//   // Access bundles: Each tier gets all keys from their level and below
//   accessBundles: {
//     tier1: string[];  // [tier1]
//     tier2: string[];  // [tier1, tier2]
//     tier3: string[];  // [tier1, tier2, tier3]
//     tier4: string[];  // [tier1, tier2, tier3, tier4]
//     tier5: string[];  // [tier1, tier2, tier3, tier4, tier5]
//   };
//   version: string;
//   generatedAt: number;
//   label?: string;  // Optional label for this key version
// }

// // Complete key history structure
// interface KeyHistory {
//   currentVersion: number;
//   versions: {
//     [versionNumber: number]: BlogKeyData;
//   };
//   metadata: {
//     createdAt: number;
//     lastModified: number;
//     totalVersions: number;
//   };
// }

// export const Wallet: React.FC = () => {
//   const [inputKey, setInputKey] = useState<string>('');
//   const [error, setError] = useState<string>('');
//   const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
//   const [showBlogKey, setShowBlogKey] = useState<boolean>(false);
  
//   // Blog key states
//   const [blogKeyData, setBlogKeyData] = useState<BlogKeyData | null>(null);
//   const [keyHistory, setKeyHistory] = useState<KeyHistory>({
//     currentVersion: 0,
//     versions: {},
//     metadata: {
//       createdAt: Date.now(),
//       lastModified: Date.now(),
//       totalVersions: 0
//     }
//   });
//   const [selectedVersion, setSelectedVersion] = useState<number>(0);
//   const [importBlogKey, setImportBlogKey] = useState<string>('');
//   const [blogKeyError, setBlogKeyError] = useState<string>('');
//   const [selectedImportTier, setSelectedImportTier] = useState<number>(5);
//   const [replaceMode, setReplaceMode] = useState<boolean>(false);
//   const [versionLabel, setVersionLabel] = useState<string>('');
  
//   // Drag and drop states
//   const [isDragging, setIsDragging] = useState<boolean>(false);
//   const fileInputRef = useRef<HTMLInputElement>(null);
  
//   const {
//     network,
//     keyData,
//     balance,
//     setKeyData,
//     setBalance,
//     updateContactSharedSecrets,
//     setBlogKey // Assuming this will be added to WalletStore
//   } = useWalletStore();

//   // Generate cryptographically secure random key of specified bit length
//   const generateSecureRandomKey = (bits: number): string => {
//     const bytes = bits / 8;
//     const randomBytes = new Uint8Array(bytes);
    
//     if (window.crypto && window.crypto.getRandomValues) {
//       window.crypto.getRandomValues(randomBytes);
//     } else {
//       // This should never be used in production
//       throw new Error('Secure random number generation not available');
//     }
    
//     // Convert to hex string
//     return Array.from(randomBytes)
//       .map(b => b.toString(16).padStart(2, '0'))
//       .join('');
//   };

//   // Generate new hierarchical blog keys with independent keys for each tier
//   const generateHierarchicalBlogKeys = () => {
//     try {
//       // Generate independent keys for each tier
//       const keys: SecureBlogKeys = {
//         tier1: generateSecureRandomKey(128),  // 32 hex chars
//         tier2: generateSecureRandomKey(128),  // 32 hex chars
//         tier3: generateSecureRandomKey(128),  // 32 hex chars
//         tier4: generateSecureRandomKey(192),  // 48 hex chars
//         tier5: generateSecureRandomKey(256),  // 64 hex chars
//       };

//       // Create access bundles - each tier includes all lower tier keys
//       const accessBundles = {
//         tier1: [keys.tier1],
//         tier2: [keys.tier1, keys.tier2],
//         tier3: [keys.tier1, keys.tier2, keys.tier3],
//         tier4: [keys.tier1, keys.tier2, keys.tier3, keys.tier4],
//         tier5: [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5],
//       };

//       const newBlogKeyData: BlogKeyData = {
//         keys,
//         accessBundles,
//         version: 'v2-secure',
//         generatedAt: Date.now(),
//         label: versionLabel || `Version ${keyHistory.currentVersion + 1}`
//       };
      
//       // Add to history
//       const newVersion = keyHistory.currentVersion + 1;
//       const updatedHistory: KeyHistory = {
//         currentVersion: newVersion,
//         versions: {
//           ...keyHistory.versions,
//           [newVersion]: newBlogKeyData
//         },
//         metadata: {
//           createdAt: keyHistory.metadata.createdAt,
//           lastModified: Date.now(),
//           totalVersions: newVersion
//         }
//       };
      
//       setKeyHistory(updatedHistory);
//       setSelectedVersion(newVersion);
//       setBlogKeyData(newBlogKeyData);
      
//       // Store in WalletStore if the method exists
//       if (setBlogKey) {
//         setBlogKey(newBlogKeyData);
//       }
      
//       setBlogKeyError('');
//       setVersionLabel(''); // Clear label after use
//     } catch (err) {
//       setBlogKeyError('Failed to generate blog keys: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Replace a specific tier key while keeping others
//   const replaceSpecificTier = (tierNumber: number, newKey: string) => {
//     if (!blogKeyData) {
//       setBlogKeyError('No existing keys to modify');
//       return;
//     }
    
//     try {
//       // Validate the new key
//       const expectedLengths: { [key: number]: number } = {
//         1: 32, // 128 bits
//         2: 32, // 128 bits
//         3: 32, // 128 bits
//         4: 48, // 192 bits
//         5: 64, // 256 bits
//       };
      
//       if (!/^[0-9a-fA-F]+$/.test(newKey)) {
//         throw new Error('Key must be in hexadecimal format');
//       }
      
//       if (newKey.length !== expectedLengths[tierNumber]) {
//         throw new Error(`Tier ${tierNumber} key must be exactly ${expectedLengths[tierNumber]} hex characters`);
//       }
      
//       // Copy existing keys
//       const updatedKeys = { ...blogKeyData.keys };
      
//       // Replace the specific tier
//       const tierKey = `tier${tierNumber}` as keyof SecureBlogKeys;
//       updatedKeys[tierKey] = newKey;
      
//       // Rebuild access bundles
//       const accessBundles = {
//         tier1: [updatedKeys.tier1].filter(k => k),
//         tier2: [updatedKeys.tier1, updatedKeys.tier2].filter(k => k),
//         tier3: [updatedKeys.tier1, updatedKeys.tier2, updatedKeys.tier3].filter(k => k),
//         tier4: [updatedKeys.tier1, updatedKeys.tier2, updatedKeys.tier3, updatedKeys.tier4].filter(k => k),
//         tier5: [updatedKeys.tier1, updatedKeys.tier2, updatedKeys.tier3, updatedKeys.tier4, updatedKeys.tier5].filter(k => k),
//       };
      
//       const updatedBlogKeyData: BlogKeyData = {
//         keys: updatedKeys,
//         accessBundles,
//         version: 'v2-secure-modified',
//         generatedAt: Date.now(),
//         label: versionLabel || `Version ${keyHistory.currentVersion + 1} (Modified Tier ${tierNumber})`
//       };
      
//       // Add to history as a new version
//       const newVersion = keyHistory.currentVersion + 1;
//       const updatedHistory: KeyHistory = {
//         currentVersion: newVersion,
//         versions: {
//           ...keyHistory.versions,
//           [newVersion]: updatedBlogKeyData
//         },
//         metadata: {
//           createdAt: keyHistory.metadata.createdAt,
//           lastModified: Date.now(),
//           totalVersions: newVersion
//         }
//       };
      
//       setKeyHistory(updatedHistory);
//       setSelectedVersion(newVersion);
//       setBlogKeyData(updatedBlogKeyData);
//       setBlogKeyError(`Successfully replaced Tier ${tierNumber} key`);
//       setImportBlogKey('');
//       setVersionLabel('');
//     } catch (err) {
//       setBlogKeyError('Failed to replace key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Create a shareable access bundle for a specific tier
//   const createAccessBundle = (tier: number): string => {
//     if (!blogKeyData) return '';
    
//     const tierKey = `tier${tier}` as keyof typeof blogKeyData.accessBundles;
//     const bundle = blogKeyData.accessBundles[tierKey];
    
//     // Create a JSON object with the tier level and keys
//     const bundleObject = {
//       tier,
//       keys: bundle,
//       version: blogKeyData.version,
//       createdAt: Date.now()
//     };
    
//     // Convert to base64 for easy sharing
//     return btoa(JSON.stringify(bundleObject));
//   };

//   // Import an access bundle
//   const importAccessBundle = () => {
//     const trimmedKey = importBlogKey.trim();
    
//     if (!trimmedKey) {
//       setBlogKeyError('Please enter an access bundle or key');
//       return;
//     }
    
//     // If in replace mode and it's a hex key
//     if (replaceMode && /^[0-9a-fA-F]+$/.test(trimmedKey) && blogKeyData) {
//       replaceSpecificTier(selectedImportTier, trimmedKey);
//       return;
//     }
    
//     try {
//       // Try to decode the bundle
//       const decodedString = atob(trimmedKey);
//       const bundleObject = JSON.parse(decodedString);
      
//       // Validate the bundle structure
//       if (!bundleObject.tier || !bundleObject.keys || !Array.isArray(bundleObject.keys)) {
//         throw new Error('Invalid access bundle format');
//       }
      
//       // Reconstruct the blog key data from the imported bundle
//       const keys: SecureBlogKeys = {
//         tier1: bundleObject.keys[0] || '',
//         tier2: bundleObject.keys[1] || '',
//         tier3: bundleObject.keys[2] || '',
//         tier4: bundleObject.keys[3] || '',
//         tier5: bundleObject.keys[4] || '',
//       };
      
//       // Rebuild access bundles based on imported tier
//       const accessBundles = {
//         tier1: bundleObject.tier >= 1 ? [keys.tier1].filter(k => k) : [],
//         tier2: bundleObject.tier >= 2 ? [keys.tier1, keys.tier2].filter(k => k) : [],
//         tier3: bundleObject.tier >= 3 ? [keys.tier1, keys.tier2, keys.tier3].filter(k => k) : [],
//         tier4: bundleObject.tier >= 4 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4].filter(k => k) : [],
//         tier5: bundleObject.tier >= 5 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5].filter(k => k) : [],
//       };
      
//       const newBlogKeyData: BlogKeyData = {
//         keys,
//         accessBundles,
//         version: bundleObject.version || 'v2-secure',
//         generatedAt: bundleObject.createdAt || Date.now(),
//         label: versionLabel || `Imported Bundle (Tier ${bundleObject.tier})`
//       };
      
//       // Add to history
//       const newVersion = keyHistory.currentVersion + 1;
//       const updatedHistory: KeyHistory = {
//         currentVersion: newVersion,
//         versions: {
//           ...keyHistory.versions,
//           [newVersion]: newBlogKeyData
//         },
//         metadata: {
//           createdAt: keyHistory.metadata.createdAt,
//           lastModified: Date.now(),
//           totalVersions: newVersion
//         }
//       };
      
//       setKeyHistory(updatedHistory);
//       setSelectedVersion(newVersion);
//       setBlogKeyData(newBlogKeyData);
      
//       if (setBlogKey) {
//         setBlogKey(newBlogKeyData);
//       }
      
//       setBlogKeyError('');
//       setImportBlogKey('');
//       setVersionLabel('');
//     } catch (err) {
//       // If base64 decode fails, try importing as raw hex key for backward compatibility
//       if (selectedImportTier && /^[0-9a-fA-F]+$/.test(trimmedKey)) {
//         importRawHexKey(trimmedKey, selectedImportTier);
//       } else {
//         setBlogKeyError('Invalid access bundle or hex key format');
//       }
//     }
//   };

//   // Import raw hex key for a specific tier (backward compatibility)
//   const importRawHexKey = (hexKey: string, tier: number) => {
//     try {
//       // Validate hex format
//       if (!/^[0-9a-fA-F]+$/.test(hexKey)) {
//         throw new Error('Invalid hexadecimal format');
//       }
      
//       // Check key length based on tier
//       const expectedLengths: { [key: number]: number } = {
//         1: 32, // 128 bits
//         2: 32, // 128 bits
//         3: 32, // 128 bits
//         4: 48, // 192 bits
//         5: 64, // 256 bits
//       };
      
//       if (hexKey.length !== expectedLengths[tier]) {
//         throw new Error(`Tier ${tier} key must be exactly ${expectedLengths[tier]} hex characters`);
//       }
      
//       // Create a partial key structure
//       const keys: SecureBlogKeys = {
//         tier1: tier >= 1 && tier === 1 ? hexKey : '',
//         tier2: tier >= 2 && tier === 2 ? hexKey : '',
//         tier3: tier >= 3 && tier === 3 ? hexKey : '',
//         tier4: tier >= 4 && tier === 4 ? hexKey : '',
//         tier5: tier >= 5 && tier === 5 ? hexKey : '',
//       };
      
//       // Note: This creates a partial key set - only the imported tier
//       const accessBundles = {
//         tier1: tier >= 1 && keys.tier1 ? [keys.tier1] : [],
//         tier2: tier >= 2 && keys.tier2 ? [keys.tier1, keys.tier2].filter(k => k) : [],
//         tier3: tier >= 3 && keys.tier3 ? [keys.tier1, keys.tier2, keys.tier3].filter(k => k) : [],
//         tier4: tier >= 4 && keys.tier4 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4].filter(k => k) : [],
//         tier5: tier >= 5 && keys.tier5 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5].filter(k => k) : [],
//       };
      
//       const newBlogKeyData: BlogKeyData = {
//         keys,
//         accessBundles,
//         version: 'v2-secure-partial',
//         generatedAt: Date.now(),
//         label: versionLabel || `Imported Tier ${tier} Key`
//       };
      
//       // Add to history
//       const newVersion = keyHistory.currentVersion + 1;
//       const updatedHistory: KeyHistory = {
//         currentVersion: newVersion,
//         versions: {
//           ...keyHistory.versions,
//           [newVersion]: newBlogKeyData
//         },
//         metadata: {
//           createdAt: keyHistory.metadata.createdAt,
//           lastModified: Date.now(),
//           totalVersions: newVersion
//         }
//       };
      
//       setKeyHistory(updatedHistory);
//       setSelectedVersion(newVersion);
//       setBlogKeyData(newBlogKeyData);
//       setBlogKeyError(`Imported Tier ${tier} key. Note: This is a partial key set.`);
//       setImportBlogKey('');
//       setVersionLabel('');
//     } catch (err) {
//       setBlogKeyError('Failed to import key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Download all key history as JSON
//   const downloadKeyHistory = () => {
//     if (Object.keys(keyHistory.versions).length === 0) {
//       setBlogKeyError('No keys to download');
//       return;
//     }
    
//     const dataToDownload = {
//       keyHistory,
//       exportedAt: Date.now(),
//       exportVersion: '1.0',
//       metadata: {
//         totalVersions: keyHistory.metadata.totalVersions,
//         currentVersion: keyHistory.currentVersion,
//         created: new Date(keyHistory.metadata.createdAt).toISOString(),
//         lastModified: new Date(keyHistory.metadata.lastModified).toISOString()
//       }
//     };
    
//     const jsonString = JSON.stringify(dataToDownload, null, 2);
//     const blob = new Blob([jsonString], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
    
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `blog-keys-history-${Date.now()}.json`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
    
//     setBlogKeyError('Key history downloaded successfully');
//   };

//   // Handle file upload
//   const handleFileUpload = (file: File) => {
//     const reader = new FileReader();
    
//     reader.onload = (e) => {
//       try {
//         const content = e.target?.result as string;
//         const data = JSON.parse(content);
        
//         // Validate the uploaded data structure
//         if (!data.keyHistory || !data.keyHistory.versions) {
//           throw new Error('Invalid key history file format');
//         }
        
//         // Merge with existing history or replace
//         const uploadedHistory = data.keyHistory as KeyHistory;
        
//         // Find the highest version number to continue from
//         const existingMaxVersion = Math.max(0, ...Object.keys(keyHistory.versions).map(Number));
//         const uploadedMaxVersion = Math.max(0, ...Object.keys(uploadedHistory.versions).map(Number));
        
//         // Merge histories
//         const mergedVersions: { [key: number]: BlogKeyData } = {};
        
//         // Add existing versions
//         Object.entries(keyHistory.versions).forEach(([version, data]) => {
//           mergedVersions[Number(version)] = data;
//         });
        
//         // Add uploaded versions with new version numbers to avoid conflicts
//         Object.entries(uploadedHistory.versions).forEach(([version, data]) => {
//           const newVersion = existingMaxVersion + Number(version);
//           mergedVersions[newVersion] = {
//             ...data,
//             label: data.label ? `${data.label} (Imported)` : `Imported Version ${version}`
//           };
//         });
        
//         const newCurrentVersion = Math.max(...Object.keys(mergedVersions).map(Number));
        
//         const mergedHistory: KeyHistory = {
//           currentVersion: newCurrentVersion,
//           versions: mergedVersions,
//           metadata: {
//             createdAt: Math.min(keyHistory.metadata.createdAt, uploadedHistory.metadata.createdAt),
//             lastModified: Date.now(),
//             totalVersions: Object.keys(mergedVersions).length
//           }
//         };
        
//         setKeyHistory(mergedHistory);
//         setSelectedVersion(newCurrentVersion);
        
//         // Load the latest version
//         if (mergedVersions[newCurrentVersion]) {
//           setBlogKeyData(mergedVersions[newCurrentVersion]);
//           if (setBlogKey) {
//             setBlogKey(mergedVersions[newCurrentVersion]);
//           }
//         }
        
//         setBlogKeyError(`Successfully imported ${Object.keys(uploadedHistory.versions).length} key versions`);
//       } catch (err) {
//         setBlogKeyError('Failed to import key history: ' + (err instanceof Error ? err.message : 'Unknown error'));
//       }
//     };
    
//     reader.onerror = () => {
//       setBlogKeyError('Failed to read file');
//     };
    
//     reader.readAsText(file);
//   };

//   // Drag and drop handlers
//   const handleDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragging(true);
//   };

//   const handleDragLeave = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragging(false);
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragging(false);
    
//     const files = Array.from(e.dataTransfer.files);
//     const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));
    
//     if (jsonFile) {
//       handleFileUpload(jsonFile);
//     } else {
//       setBlogKeyError('Please upload a valid JSON key history file');
//     }
//   };

//   // Load selected version from history
//   const loadVersion = (versionNumber: number) => {
//     const versionData = keyHistory.versions[versionNumber];
//     if (versionData) {
//       setBlogKeyData(versionData);
//       setSelectedVersion(versionNumber);
//       if (setBlogKey) {
//         setBlogKey(versionData);
//       }
//       setBlogKeyError(`Loaded ${versionData.label || `Version ${versionNumber}`}`);
//     }
//   };

//   // Get the highest tier level available in current blog key data
//   const getHighestAvailableTier = (): number => {
//     if (!blogKeyData) return 0;
    
//     if (blogKeyData.keys.tier5) return 5;
//     if (blogKeyData.keys.tier4) return 4;
//     if (blogKeyData.keys.tier3) return 3;
//     if (blogKeyData.keys.tier2) return 2;
//     if (blogKeyData.keys.tier1) return 1;
//     return 0;
//   };

//   // Generate random private key
//   const generateRandomKey = () => {
//     try {
//       let privKey;
//       try {
//         privKey = PrivateKey.fromRandom();
//       } catch (e) {
//         // Fallback: generate random 32 bytes and create private key
//         const randomBytes = new Uint8Array(32);
//         if (window.crypto && window.crypto.getRandomValues) {
//           window.crypto.getRandomValues(randomBytes);
//         } else {
//           // Very basic fallback for development
//           for (let i = 0; i < 32; i++) {
//             randomBytes[i] = Math.floor(Math.random() * 256);
//           }
//         }
//         const hexString = Array.from(randomBytes)
//           .map(b => b.toString(16).padStart(2, '0'))
//           .join('');
//         privKey = PrivateKey.fromHex(hexString);
//       }
      
//       setInputKey(privKey.toHex());
//       processPrivateKey(privKey);
//       setError('');
//     } catch (err) {
//       setError('Failed to generate random key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//       console.error('Error generating key:', err);
//     }
//   };

//   // Process user input private key
//   const importPrivateKey = () => {
//     if (!inputKey.trim()) {
//       setError('Please enter a private key');
//       return;
//     }

//     try {
//       let privKey: PrivateKey;
      
//       if (inputKey.startsWith('L') || inputKey.startsWith('K') || inputKey.startsWith('5')) {
//         privKey = PrivateKey.fromWif(inputKey.trim());
//       } else if (inputKey.length === 64) {
//         privKey = PrivateKey.fromHex(inputKey.trim());
//       } else {
//         throw new Error('Invalid private key format');
//       }

//       processPrivateKey(privKey);
//       setError('');
//     } catch (err) {
//       setError('Invalid private key format. Please enter a valid hex or WIF key.');
//     }
//   };

//   // Process private key and derive all formats
//   const processPrivateKey = (privKey: PrivateKey) => {
//     try {
//       const pubKey = privKey.toPublicKey();
      
//       const address = network === 'testnet' 
//         ? pubKey.toAddress('testnet').toString()
//         : pubKey.toAddress('mainnet').toString();

//       let xCoord = '';
//       let yCoord = '';
      
//       try {
//         if (pubKey.point && pubKey.point.x && pubKey.point.y) {
//           xCoord = pubKey.point.x.toString(16).padStart(64, '0');
//           yCoord = pubKey.point.y.toString(16).padStart(64, '0');
//         } else {
//           const pubKeyHex = pubKey.toString();
//           if (pubKeyHex.startsWith('02') || pubKeyHex.startsWith('03')) {
//             xCoord = pubKeyHex.slice(2);
//             yCoord = 'Compressed format - Y coordinate derived from X';
//           } else if (pubKeyHex.startsWith('04')) {
//             xCoord = pubKeyHex.slice(2, 66);
//             yCoord = pubKeyHex.slice(66, 130);
//           }
//         }
//       } catch (e) {
//         console.log('Could not extract raw coordinates:', e);
//         xCoord = 'Not available';
//         yCoord = 'Not available';
//       }

//       setKeyData({
//         privateKey: privKey,
//         publicKey: pubKey,
//         privateKeyHex: privKey.toHex(),
//         privateKeyWif: privKey.toWif(),
//         privateKeyBinary: privKey.toArray(),
//         publicKeyHex: pubKey.toString(),
//         publicKeyDER: Utils.toHex(pubKey.toDER()),
//         publicKeyRaw: { x: xCoord, y: yCoord },
//         address: address
//       });
      
//       updateContactSharedSecrets(privKey);
//     } catch (err) {
//       console.error('Error processing private key:', err);
//       setError('Error processing key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Check balance for address
//   const checkBalance = async (address: string) => {
//     if (!address) return;
    
//     setBalance({ ...balance, loading: true, error: null });
    
//     try {
//       const baseUrl = network === 'testnet' 
//         ? 'https://api.whatsonchain.com/v1/bsv/test'
//         : 'https://api.whatsonchain.com/v1/bsv/main';
      
//       const response = await fetch(`${baseUrl}/address/${address}/balance`);
      
//       if (!response.ok) {
//         throw new Error('Failed to fetch balance');
//       }
      
//       const data = await response.json();
      
//       setBalance({
//         confirmed: data.confirmed || 0,
//         unconfirmed: data.unconfirmed || 0,
//         loading: false,
//         error: null
//       });
//     } catch (error) {
//       console.error('Balance check error:', error);
//       setBalance({
//         ...balance,
//         loading: false,
//         error: 'Unable to fetch balance. Try again later.'
//       });
//     }
//   };

//   // Format satoshis to BSV
//   const formatBSV = (satoshis: number): string => {
//     const bsv = satoshis / 100000000;
//     return bsv.toFixed(8).replace(/\.?0+$/, '');
//   };

//   // Copy to clipboard function
//   const copyToClipboard = (text: string, label: string) => {
//     navigator.clipboard.writeText(text);
//     // You could add a toast notification here
//   };

//   // Update address and check balance when network changes
//   useEffect(() => {
//     if (keyData.publicKey) {
//       const address = network === 'testnet'
//         ? keyData.publicKey.toAddress('testnet').toString()
//         : keyData.publicKey.toAddress('mainnet').toString();
      
//       setKeyData({ ...keyData, address });
//       checkBalance(address);
//     }
//   }, [network]);

//   return (
//     <>
//       <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
//         <h2 className="text-xl font-semibold mb-4 text-white">Generate or Import Private Key</h2>
        
//         <div className="mb-4 flex gap-2">
//           <button
//             onClick={generateRandomKey}
//             className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Generate Random Private Key
//           </button>
//           <button
//             onClick={() => {
//               const testKey = '0000000000000000000000000000000000000000000000000000000000000001';
//               setInputKey(testKey);
//               importPrivateKey();
//             }}
//             className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
//             title="Use test key"
//           >
//             Test Key
//           </button>
//         </div>

//         <div className="flex flex-col sm:flex-row gap-2">
//           <input
//             type="text"
//             value={inputKey}
//             onChange={(e) => setInputKey(e.target.value)}
//             placeholder="Enter private key (hex or WIF format)"
//             className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
//           />
//           <button
//             onClick={importPrivateKey}
//             className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Import Key
//           </button>
//         </div>

//         {error && (
//           <p className="mt-2 text-red-400 text-sm">{error}</p>
//         )}
//       </div>

//       {/* Secure Hierarchical Blog Key Generation Section */}
//       <div className="mb-6 p-4 bg-indigo-900 bg-opacity-30 rounded-lg border border-indigo-700">
//         <h2 className="text-xl font-semibold mb-4 text-white">Secure Hierarchical Blog Encryption Keys</h2>
        
//         <div className="mb-4 p-3 bg-indigo-800 bg-opacity-30 rounded-lg">
//           <p className="text-sm text-indigo-300">
//             <span className="font-semibold">🔐 Enhanced Security Model:</span> Each tier uses independent cryptographic keys. 
//             Higher tiers receive all keys from their level and below, enabling decryption of lower-tier content without vulnerability to privilege escalation.
//           </p>
//         </div>

//         {/* Key History Upload Area */}
//         <div
//           className={`mb-4 p-6 border-2 border-dashed rounded-lg transition-colors ${
//             isDragging
//               ? 'border-indigo-400 bg-indigo-900 bg-opacity-20'
//               : 'border-gray-600 bg-gray-800 bg-opacity-30'
//           }`}
//           onDragOver={handleDragOver}
//           onDragLeave={handleDragLeave}
//           onDrop={handleDrop}
//         >
//           <input
//             ref={fileInputRef}
//             type="file"
//             accept=".json"
//             onChange={(e) => {
//               const file = e.target.files?.[0];
//               if (file) handleFileUpload(file);
//             }}
//             className="hidden"
//           />
//           <div className="text-center">
//             <svg
//               className="mx-auto h-12 w-12 text-gray-400 mb-3"
//               stroke="currentColor"
//               fill="none"
//               viewBox="0 0 48 48"
//               aria-hidden="true"
//             >
//               <path
//                 d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
//                 strokeWidth={2}
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//             </svg>
//             <p className="text-sm text-gray-300 mb-2">
//               {isDragging ? 'Drop your key history file here' : 'Drag and drop your key history JSON file here'}
//             </p>
//             <button
//               onClick={() => fileInputRef.current?.click()}
//               className="text-sm text-indigo-400 hover:text-indigo-300 underline"
//             >
//               Or click to browse
//             </button>
//           </div>
//         </div>

//         {/* Key History Management */}
//         {Object.keys(keyHistory.versions).length > 0 && (
//           <div className="mb-4 p-3 bg-gray-800 rounded-lg">
//             <div className="flex items-center justify-between mb-2">
//               <h3 className="text-sm font-medium text-gray-300">Key Version History</h3>
//               <button
//                 onClick={downloadKeyHistory}
//                 className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
//               >
//                 📥 Download All Versions
//               </button>
//             </div>
//             <div className="flex gap-2 items-center">
//               <select
//                 value={selectedVersion}
//                 onChange={(e) => loadVersion(Number(e.target.value))}
//                 className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
//               >
//                 {Object.entries(keyHistory.versions)
//                   .sort(([a], [b]) => Number(b) - Number(a))
//                   .map(([version, data]) => (
//                     <option key={version} value={version}>
//                       {data.label || `Version ${version}`} - {new Date(data.generatedAt).toLocaleString()}
//                     </option>
//                   ))}
//               </select>
//               <span className="text-xs text-gray-400">
//                 Total: {keyHistory.metadata.totalVersions} versions
//               </span>
//             </div>
//           </div>
//         )}
        
//         <div className="mb-4 space-y-2">
//           <div className="flex gap-2">
//             <input
//               type="text"
//               value={versionLabel}
//               onChange={(e) => setVersionLabel(e.target.value)}
//               placeholder="Optional: Label for this version (e.g., 'Production Keys')"
//               className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm"
//             />
//             <button
//               onClick={generateHierarchicalBlogKeys}
//               className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//             >
//               Generate New Version
//             </button>
//           </div>
          
//           {/* Regenerate Single Tier Section */}
//           {blogKeyData && (
//             <div className="flex gap-2 p-3 bg-purple-900 bg-opacity-20 rounded-lg border border-purple-600">
//               <select
//                 value={selectedImportTier}
//                 onChange={(e) => setSelectedImportTier(Number(e.target.value))}
//                 className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//               >
//                 <option value={1}>Tier 1 (128-bit)</option>
//                 <option value={2}>Tier 2 (128-bit)</option>
//                 <option value={3}>Tier 3 (128-bit)</option>
//                 <option value={4}>Tier 4 (192-bit)</option>
//                 <option value={5}>Tier 5 (256-bit)</option>
//               </select>
//               <button
//                 onClick={() => {
//                   // Generate new random key for selected tier
//                   const bitSizes: { [key: number]: number } = {
//                     1: 128,
//                     2: 128,
//                     3: 128,
//                     4: 192,
//                     5: 256
//                   };
//                   const newKey = generateSecureRandomKey(bitSizes[selectedImportTier]);
//                   replaceSpecificTier(selectedImportTier, newKey);
//                 }}
//                 className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
//               >
//                 🎲 Regenerate {`Tier ${selectedImportTier}`} with Random Key
//               </button>
//             </div>
//           )}
//         </div>

//         <div className="flex flex-col gap-2 mb-4">
//           <div className="flex items-center gap-2 mb-2">
//             <input
//               type="checkbox"
//               id="replaceMode"
//               checked={replaceMode}
//               onChange={(e) => setReplaceMode(e.target.checked)}
//               disabled={!blogKeyData}
//               className="rounded"
//             />
//             <label htmlFor="replaceMode" className="text-sm text-gray-300">
//               Replace single tier only (preserve other keys)
//             </label>
//           </div>
//           <div className="flex gap-2">
//             <input
//               type="text"
//               value={importBlogKey}
//               onChange={(e) => setImportBlogKey(e.target.value)}
//               placeholder={replaceMode ? "Enter hex key to replace selected tier" : "Import access bundle (base64) or raw hex key"}
//               className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400"
//             />
//             <select
//               value={selectedImportTier}
//               onChange={(e) => setSelectedImportTier(Number(e.target.value))}
//               className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//               title="Select tier for raw hex import or replacement"
//             >
//               <option value={1}>Tier 1</option>
//               <option value={2}>Tier 2</option>
//               <option value={3}>Tier 3</option>
//               <option value={4}>Tier 4</option>
//               <option value={5}>Tier 5</option>
//             </select>
//             <button
//               onClick={importAccessBundle}
//               className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//             >
//               {replaceMode ? 'Replace' : 'Import'}
//             </button>
//           </div>
//           <p className="text-xs text-gray-400">
//             {replaceMode 
//               ? 'Enter a hex key and select which tier to replace while keeping other tiers intact'
//               : 'Import an access bundle shared with you, or a raw hex key for a specific tier'}
//           </p>
//         </div>

//         {blogKeyError && (
//           <p className="mt-2 text-sm text-yellow-400">{blogKeyError}</p>
//         )}

//         {blogKeyData && (
//           <div className="mt-4 space-y-3">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-medium text-white">
//                 {blogKeyData.label || `Version ${selectedVersion}`} Keys
//               </h3>
//               <button
//                 onClick={() => setShowBlogKey(!showBlogKey)}
//                 className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
//               >
//                 {showBlogKey ? 'Hide' : 'Show'} Keys & Access Bundles
//               </button>
//             </div>

//             {showBlogKey && (
//               <div className="p-4 bg-gray-800 rounded-lg space-y-4">
//                 {/* Tier 5 - Full Access */}
//                 {blogKeyData.keys.tier5 && (
//                   <div className="p-3 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-red-300">
//                         Tier 5 - Complete Access (All Levels)
//                       </label>
//                       <span className="text-xs text-gray-400">256-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-red-600 text-xs break-all text-red-300 font-mono">
//                           {blogKeyData.keys.tier5}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier5, 'Tier 5 Key')}
//                           className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                           title="Copy Tier 5 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(5), 'Tier 5 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Full Access Bundle (Decrypts Levels 1-5)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt all content (Levels 1, 2, 3, 4, and 5)
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Tier 4 */}
//                 {blogKeyData.keys.tier4 && (
//                   <div className="p-3 bg-purple-900 bg-opacity-20 rounded-lg border border-purple-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-purple-300">
//                         Tier 4 - Closed Group Access
//                       </label>
//                       <span className="text-xs text-gray-400">192-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-purple-600 text-xs break-all text-purple-300 font-mono">
//                           {blogKeyData.keys.tier4}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier4, 'Tier 4 Key')}
//                           className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
//                           title="Copy Tier 4 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(4), 'Tier 4 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-purple-800 hover:bg-purple-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Tier 4 Access Bundle (Decrypts Levels 1-4)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt Levels 1, 2, 3, and 4 content
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Tier 3 */}
//                 {blogKeyData.keys.tier3 && (
//                   <div className="p-3 bg-indigo-900 bg-opacity-20 rounded-lg border border-indigo-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-indigo-300">
//                         Tier 3 - Inner Circle Access
//                       </label>
//                       <span className="text-xs text-gray-400">128-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-indigo-600 text-xs break-all text-indigo-300 font-mono">
//                           {blogKeyData.keys.tier3}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier3, 'Tier 3 Key')}
//                           className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
//                           title="Copy Tier 3 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(3), 'Tier 3 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-indigo-800 hover:bg-indigo-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Tier 3 Access Bundle (Decrypts Levels 1-3)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt Levels 1, 2, and 3 content
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Tier 2 */}
//                 {blogKeyData.keys.tier2 && (
//                   <div className="p-3 bg-yellow-900 bg-opacity-20 rounded-lg border border-yellow-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-yellow-300">
//                         Tier 2 - Close Friends Access
//                       </label>
//                       <span className="text-xs text-gray-400">128-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-yellow-600 text-xs break-all text-yellow-300 font-mono">
//                           {blogKeyData.keys.tier2}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier2, 'Tier 2 Key')}
//                           className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
//                           title="Copy Tier 2 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(2), 'Tier 2 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-yellow-800 hover:bg-yellow-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Tier 2 Access Bundle (Decrypts Levels 1-2)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt Levels 1 and 2 content
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Tier 1 */}
//                 {blogKeyData.keys.tier1 && (
//                   <div className="p-3 bg-orange-900 bg-opacity-20 rounded-lg border border-orange-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-orange-300">
//                         Tier 1 - Friends Access
//                       </label>
//                       <span className="text-xs text-gray-400">128-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-orange-600 text-xs break-all text-orange-300 font-mono">
//                           {blogKeyData.keys.tier1}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier1, 'Tier 1 Key')}
//                           className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
//                           title="Copy Tier 1 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(1), 'Tier 1 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-orange-800 hover:bg-orange-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Tier 1 Access Bundle (Decrypts Level 1 only)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt Level 1 content only
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 <div className="mt-4 p-3 bg-green-800 bg-opacity-30 rounded-lg">
//                   <h4 className="text-sm font-semibold text-green-300 mb-2">🔐 Security Features:</h4>
//                   <ul className="text-xs text-gray-300 space-y-1">
//                     <li>✅ <span className="text-green-400">Independent keys</span> - Each tier has its own cryptographic key</li>
//                     <li>✅ <span className="text-green-400">No privilege escalation</span> - Lower tiers cannot derive higher tier keys</li>
//                     <li>✅ <span className="text-green-400">Hierarchical access</span> - Higher tiers can decrypt all lower tier content</li>
//                     <li>✅ <span className="text-green-400">Version history</span> - Track all key generations and modifications</li>
//                     <li>✅ <span className="text-green-400">Backup & restore</span> - Download and upload complete key history</li>
//                     <li>✅ <span className="text-green-400">Selective replacement</span> - Change individual tier keys without affecting others</li>
//                   </ul>
//                 </div>
//               </div>
//             )}

//             <div className="text-sm text-gray-400">
//               <p>Current Version: <span className="text-gray-300">{blogKeyData.label || `Version ${selectedVersion}`}</span></p>
//               <p>Type: <span className="text-gray-300">{blogKeyData.version}</span></p>
//               <p>Generated: <span className="text-gray-300">{new Date(blogKeyData.generatedAt).toLocaleString()}</span></p>
//               <p>Highest Available Tier: <span className="text-gray-300">Level {getHighestAvailableTier()}</span></p>
//             </div>
//           </div>
//         )}
//       </div>

//       {keyData.privateKey && (
//         <>
//           <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//             <h2 className="text-xl font-semibold mb-2 text-white">BSV Address (for Regular Transactions & 1Sat Ordinals)</h2>
//             <div className="flex items-center gap-2">
//               <code className="flex-1 p-3 bg-gray-800 rounded border border-blue-600 text-sm break-all text-blue-300">
//                 {keyData.address}
//               </code>
//               <button
//                 onClick={() => copyToClipboard(keyData.address, 'Address')}
//                 className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
//                 title="Copy address"
//               >
//                 📋
//               </button>
//             </div>
            
//             <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm text-gray-300">Balance:</span>
//                 <div className="flex items-center gap-2">
//                   {balance.loading ? (
//                     <span className="text-sm text-gray-400">Loading...</span>
//                   ) : balance.error ? (
//                     <span className="text-sm text-red-400">{balance.error}</span>
//                   ) : (
//                     <div className="text-right">
//                       <div className="text-sm font-medium text-white">
//                         {formatBSV(balance.confirmed)} BSV
//                       </div>
//                       {balance.unconfirmed > 0 && (
//                         <div className="text-xs text-yellow-400">
//                           +{formatBSV(balance.unconfirmed)} unconfirmed
//                         </div>
//                       )}
//                       <div className="text-xs text-gray-400">
//                         ({balance.confirmed.toLocaleString()} satoshis)
//                       </div>
//                     </div>
//                   )}
//                   <button
//                     onClick={() => checkBalance(keyData.address)}
//                     className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
//                     title="Refresh balance"
//                     disabled={balance.loading}
//                   >
//                     🔄
//                   </button>
//                 </div>
//               </div>
//             </div>
            
//             <p className="mt-2 text-sm text-gray-400">
//               Network: <span className="font-medium text-gray-300">{network}</span>
//             </p>
//           </div>

//           {/* 1Sat Ordinals Information Section */}


//           <div className="mb-6 p-4 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-xl font-semibold text-white">Private Key Formats</h2>
//               <button
//                 onClick={() => setShowPrivateKey(!showPrivateKey)}
//                 className="text-sm text-red-400 hover:text-red-300 font-medium"
//               >
//                 {showPrivateKey ? 'Hide' : 'Show'} Private Keys
//               </button>
//             </div>
            
//             {showPrivateKey && (
//               <div className="space-y-3">
//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Hex Format:</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
//                       {keyData.privateKeyHex}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(keyData.privateKeyHex, 'Private Key Hex')}
//                       className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">WIF Format:</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
//                       {keyData.privateKeyWif}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(keyData.privateKeyWif, 'Private Key WIF')}
//                       className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Binary Format (first 10 bytes):</label>
//                   <code className="block mt-1 p-2 bg-gray-800 rounded border border-red-600 text-xs text-red-300">
//                     [{keyData.privateKeyBinary.slice(0, 10).join(', ')}...]
//                   </code>
//                 </div>
//               </div>
//             )}
            
//             <p className="mt-3 text-xs text-red-400 font-medium">
//               ⚠️ Warning: Never share your private key with anyone!
//             </p>
//           </div>

//           <div className="mb-6 p-4 bg-green-900 bg-opacity-20 rounded-lg border border-green-700">
//             <h2 className="text-xl font-semibold mb-4 text-white">Public Key Formats</h2>
            
//             <div className="space-y-3">
//               <div>
//                 <label className="text-sm font-medium text-gray-300">Hex Format (Compressed):</label>
//                 <div className="flex items-center gap-2 mt-1">
//                   <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
//                     {keyData.publicKeyHex}
//                   </code>
//                   <button
//                     onClick={() => copyToClipboard(keyData.publicKeyHex, 'Public Key Hex')}
//                     className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
//                   >
//                     📋
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="text-sm font-medium text-gray-300">DER Format:</label>
//                 <div className="flex items-center gap-2 mt-1">
//                   <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
//                     {keyData.publicKeyDER}
//                   </code>
//                   <button
//                     onClick={() => copyToClipboard(keyData.publicKeyDER, 'Public Key DER')}
//                     className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
//                   >
//                     📋
//                   </button>
//                 </div>
//               </div>
              
//               <div>
//                 <label className="text-sm font-medium text-gray-300">Raw Public Key Coordinates:</label>
//                 <div className="mt-1 p-2 bg-gray-800 rounded border border-green-600 text-xs">
//                   <div className="break-all text-green-300">
//                     <span className="font-medium">X:</span> {keyData.publicKeyRaw.x}
//                   </div>
//                   <div className="break-all mt-1 text-green-300">
//                     <span className="font-medium">Y:</span> {keyData.publicKeyRaw.y}
//                   </div>
//                 </div>
//               </div>


//                         <div className="mb-6 p-4 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-700">
//             <h2 className="text-xl font-semibold mb-3 text-white">1Sat Ordinals Information</h2>
            
//             <div className="p-4 bg-gray-800 rounded-lg space-y-3">
//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">Same Address for Everything</h3>
//                   <p className="text-sm text-gray-300">
//                     1Sat Ordinals uses standard P2PKH addresses - the same address shown above works for both regular BSV transactions and ordinal inscriptions.
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">How It Works</h3>
//                   <p className="text-sm text-gray-300">
//                     Inscriptions are created by embedding data in transaction outputs that send 1 satoshi to your address. The inscription data is stored in the transaction script.
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">Managing Your Ordinals</h3>
//                   <p className="text-sm text-gray-300">
//                     Keep track of inscription transaction IDs. Use ordinals-compatible wallets or indexers to view and manage your inscriptions. Each inscription is tied to a specific satoshi at your address.
//                   </p>
//                 </div>
//               </div>
//             </div>

//             <div className="mt-4 p-3 bg-purple-800 bg-opacity-30 rounded-lg border border-purple-600">
//               <p className="text-xs text-purple-300">
//                 <span className="font-semibold">Pro Tip:</span> When receiving ordinals, make sure the sender uses your address above. The inscription will appear as a 1 satoshi UTXO with embedded data.
//               </p>
//             </div>
//           </div>
//             </div>
//           </div>
//         </>
//       )}
//     </>
//   );
// };

























































// Further updates . File downloads next 

// import React, { useState, useEffect } from 'react';
// import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
// import { useWalletStore } from '../store/WalletStore';

// // Polyfill Buffer for browser environment
// if (typeof window !== 'undefined' && !window.Buffer) {
//   window.Buffer = {
//     from: (data: any, encoding?: string) => {
//       if (encoding === 'hex') {
//         const bytes = [];
//         for (let i = 0; i < data.length; i += 2) {
//           bytes.push(parseInt(data.substr(i, 2), 16));
//         }
//         return new Uint8Array(bytes);
//       } else if (typeof data === 'string') {
//         return new TextEncoder().encode(data);
//       }
//       return new Uint8Array(data);
//     },
//     alloc: (size: number) => new Uint8Array(size),
//     concat: (arrays: Uint8Array[]) => {
//       const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
//       const result = new Uint8Array(totalLength);
//       let offset = 0;
//       for (const arr of arrays) {
//         result.set(arr, offset);
//         offset += arr.length;
//       }
//       return result;
//     }
//   } as any;
// }

// // Blog Key Types - Updated for secure hierarchical system
// interface SecureBlogKeys {
//   tier1: string;  // 128-bit independent key for Level 1
//   tier2: string;  // 128-bit independent key for Level 2
//   tier3: string;  // 128-bit independent key for Level 3
//   tier4: string;  // 192-bit independent key for Level 4
//   tier5: string;  // 256-bit independent key for Level 5
// }

// interface BlogKeyData {
//   keys: SecureBlogKeys;
//   // Access bundles: Each tier gets all keys from their level and below
//   accessBundles: {
//     tier1: string[];  // [tier1]
//     tier2: string[];  // [tier1, tier2]
//     tier3: string[];  // [tier1, tier2, tier3]
//     tier4: string[];  // [tier1, tier2, tier3, tier4]
//     tier5: string[];  // [tier1, tier2, tier3, tier4, tier5]
//   };
//   version: string;
//   generatedAt: number;
// }

// export const Wallet: React.FC = () => {
//   const [inputKey, setInputKey] = useState<string>('');
//   const [error, setError] = useState<string>('');
//   const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
//   const [showBlogKey, setShowBlogKey] = useState<boolean>(false);
  
//   // Blog key states
//   const [blogKeyData, setBlogKeyData] = useState<BlogKeyData | null>(null);
//   const [importBlogKey, setImportBlogKey] = useState<string>('');
//   const [blogKeyError, setBlogKeyError] = useState<string>('');
//   const [selectedImportTier, setSelectedImportTier] = useState<number>(5);
  
//   const {
//     network,
//     keyData,
//     balance,
//     setKeyData,
//     setBalance,
//     updateContactSharedSecrets,
//     setBlogKey // Assuming this will be added to WalletStore
//   } = useWalletStore();

//   // Generate cryptographically secure random key of specified bit length
//   const generateSecureRandomKey = (bits: number): string => {
//     const bytes = bits / 8;
//     const randomBytes = new Uint8Array(bytes);
    
//     if (window.crypto && window.crypto.getRandomValues) {
//       window.crypto.getRandomValues(randomBytes);
//     } else {
//       // This should never be used in production
//       throw new Error('Secure random number generation not available');
//     }
    
//     // Convert to hex string
//     return Array.from(randomBytes)
//       .map(b => b.toString(16).padStart(2, '0'))
//       .join('');
//   };

//   // Generate new hierarchical blog keys with independent keys for each tier
//   const generateHierarchicalBlogKeys = () => {
//     try {
//       // Generate independent keys for each tier
//       const keys: SecureBlogKeys = {
//         tier1: generateSecureRandomKey(128),  // 32 hex chars
//         tier2: generateSecureRandomKey(128),  // 32 hex chars
//         tier3: generateSecureRandomKey(128),  // 32 hex chars
//         tier4: generateSecureRandomKey(192),  // 48 hex chars
//         tier5: generateSecureRandomKey(256),  // 64 hex chars
//       };

//       // Create access bundles - each tier includes all lower tier keys
//       const accessBundles = {
//         tier1: [keys.tier1],
//         tier2: [keys.tier1, keys.tier2],
//         tier3: [keys.tier1, keys.tier2, keys.tier3],
//         tier4: [keys.tier1, keys.tier2, keys.tier3, keys.tier4],
//         tier5: [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5],
//       };

//       const newBlogKeyData: BlogKeyData = {
//         keys,
//         accessBundles,
//         version: 'v2-secure',
//         generatedAt: Date.now()
//       };
      
//       setBlogKeyData(newBlogKeyData);
//       // Store in WalletStore if the method exists
//       if (setBlogKey) {
//         setBlogKey(newBlogKeyData);
//       }
      
//       setBlogKeyError('');
//     } catch (err) {
//       setBlogKeyError('Failed to generate blog keys: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Create a shareable access bundle for a specific tier
//   const createAccessBundle = (tier: number): string => {
//     if (!blogKeyData) return '';
    
//     const tierKey = `tier${tier}` as keyof typeof blogKeyData.accessBundles;
//     const bundle = blogKeyData.accessBundles[tierKey];
    
//     // Create a JSON object with the tier level and keys
//     const bundleObject = {
//       tier,
//       keys: bundle,
//       version: blogKeyData.version,
//       createdAt: Date.now()
//     };
    
//     // Convert to base64 for easy sharing
//     return btoa(JSON.stringify(bundleObject));
//   };

//   // Import an access bundle
//   const importAccessBundle = () => {
//     const trimmedKey = importBlogKey.trim();
    
//     if (!trimmedKey) {
//       setBlogKeyError('Please enter an access bundle');
//       return;
//     }
    
//     try {
//       // Try to decode the bundle
//       const decodedString = atob(trimmedKey);
//       const bundleObject = JSON.parse(decodedString);
      
//       // Validate the bundle structure
//       if (!bundleObject.tier || !bundleObject.keys || !Array.isArray(bundleObject.keys)) {
//         throw new Error('Invalid access bundle format');
//       }
      
//       // Reconstruct the blog key data from the imported bundle
//       const keys: SecureBlogKeys = {
//         tier1: bundleObject.keys[0] || '',
//         tier2: bundleObject.keys[1] || '',
//         tier3: bundleObject.keys[2] || '',
//         tier4: bundleObject.keys[3] || '',
//         tier5: bundleObject.keys[4] || '',
//       };
      
//       // Rebuild access bundles based on imported tier
//       const accessBundles = {
//         tier1: bundleObject.tier >= 1 ? [keys.tier1].filter(k => k) : [],
//         tier2: bundleObject.tier >= 2 ? [keys.tier1, keys.tier2].filter(k => k) : [],
//         tier3: bundleObject.tier >= 3 ? [keys.tier1, keys.tier2, keys.tier3].filter(k => k) : [],
//         tier4: bundleObject.tier >= 4 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4].filter(k => k) : [],
//         tier5: bundleObject.tier >= 5 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5].filter(k => k) : [],
//       };
      
//       const newBlogKeyData: BlogKeyData = {
//         keys,
//         accessBundles,
//         version: bundleObject.version || 'v2-secure',
//         generatedAt: bundleObject.createdAt || Date.now()
//       };
      
//       setBlogKeyData(newBlogKeyData);
//       if (setBlogKey) {
//         setBlogKey(newBlogKeyData);
//       }
      
//       setBlogKeyError('');
//       setImportBlogKey('');
//     } catch (err) {
//       // If base64 decode fails, try importing as raw hex key for backward compatibility
//       if (selectedImportTier && /^[0-9a-fA-F]+$/.test(trimmedKey)) {
//         importRawHexKey(trimmedKey, selectedImportTier);
//       } else {
//         setBlogKeyError('Invalid access bundle or hex key format');
//       }
//     }
//   };

//   // Import raw hex key for a specific tier (backward compatibility)
//   const importRawHexKey = (hexKey: string, tier: number) => {
//     try {
//       // Validate hex format
//       if (!/^[0-9a-fA-F]+$/.test(hexKey)) {
//         throw new Error('Invalid hexadecimal format');
//       }
      
//       // Check key length based on tier
//       const expectedLengths: { [key: number]: number } = {
//         1: 32, // 128 bits
//         2: 32, // 128 bits
//         3: 32, // 128 bits
//         4: 48, // 192 bits
//         5: 64, // 256 bits
//       };
      
//       if (hexKey.length !== expectedLengths[tier]) {
//         throw new Error(`Tier ${tier} key must be exactly ${expectedLengths[tier]} hex characters`);
//       }
      
//       // Create a partial key structure
//       const keys: SecureBlogKeys = {
//         tier1: tier >= 1 && tier === 1 ? hexKey : '',
//         tier2: tier >= 2 && tier === 2 ? hexKey : '',
//         tier3: tier >= 3 && tier === 3 ? hexKey : '',
//         tier4: tier >= 4 && tier === 4 ? hexKey : '',
//         tier5: tier >= 5 && tier === 5 ? hexKey : '',
//       };
      
//       // Note: This creates a partial key set - only the imported tier
//       const accessBundles = {
//         tier1: tier >= 1 && keys.tier1 ? [keys.tier1] : [],
//         tier2: tier >= 2 && keys.tier2 ? [keys.tier1, keys.tier2].filter(k => k) : [],
//         tier3: tier >= 3 && keys.tier3 ? [keys.tier1, keys.tier2, keys.tier3].filter(k => k) : [],
//         tier4: tier >= 4 && keys.tier4 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4].filter(k => k) : [],
//         tier5: tier >= 5 && keys.tier5 ? [keys.tier1, keys.tier2, keys.tier3, keys.tier4, keys.tier5].filter(k => k) : [],
//       };
      
//       const newBlogKeyData: BlogKeyData = {
//         keys,
//         accessBundles,
//         version: 'v2-secure-partial',
//         generatedAt: Date.now()
//       };
      
//       setBlogKeyData(newBlogKeyData);
//       setBlogKeyError(`Imported Tier ${tier} key. Note: This is a partial key set.`);
//       setImportBlogKey('');
//     } catch (err) {
//       setBlogKeyError('Failed to import key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Get the highest tier level available in current blog key data
//   const getHighestAvailableTier = (): number => {
//     if (!blogKeyData) return 0;
    
//     if (blogKeyData.keys.tier5) return 5;
//     if (blogKeyData.keys.tier4) return 4;
//     if (blogKeyData.keys.tier3) return 3;
//     if (blogKeyData.keys.tier2) return 2;
//     if (blogKeyData.keys.tier1) return 1;
//     return 0;
//   };

//   // Generate random private key
//   const generateRandomKey = () => {
//     try {
//       let privKey;
//       try {
//         privKey = PrivateKey.fromRandom();
//       } catch (e) {
//         // Fallback: generate random 32 bytes and create private key
//         const randomBytes = new Uint8Array(32);
//         if (window.crypto && window.crypto.getRandomValues) {
//           window.crypto.getRandomValues(randomBytes);
//         } else {
//           // Very basic fallback for development
//           for (let i = 0; i < 32; i++) {
//             randomBytes[i] = Math.floor(Math.random() * 256);
//           }
//         }
//         const hexString = Array.from(randomBytes)
//           .map(b => b.toString(16).padStart(2, '0'))
//           .join('');
//         privKey = PrivateKey.fromHex(hexString);
//       }
      
//       setInputKey(privKey.toHex());
//       processPrivateKey(privKey);
//       setError('');
//     } catch (err) {
//       setError('Failed to generate random key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//       console.error('Error generating key:', err);
//     }
//   };

//   // Process user input private key
//   const importPrivateKey = () => {
//     if (!inputKey.trim()) {
//       setError('Please enter a private key');
//       return;
//     }

//     try {
//       let privKey: PrivateKey;
      
//       if (inputKey.startsWith('L') || inputKey.startsWith('K') || inputKey.startsWith('5')) {
//         privKey = PrivateKey.fromWif(inputKey.trim());
//       } else if (inputKey.length === 64) {
//         privKey = PrivateKey.fromHex(inputKey.trim());
//       } else {
//         throw new Error('Invalid private key format');
//       }

//       processPrivateKey(privKey);
//       setError('');
//     } catch (err) {
//       setError('Invalid private key format. Please enter a valid hex or WIF key.');
//     }
//   };

//   // Process private key and derive all formats
//   const processPrivateKey = (privKey: PrivateKey) => {
//     try {
//       const pubKey = privKey.toPublicKey();
      
//       const address = network === 'testnet' 
//         ? pubKey.toAddress('testnet').toString()
//         : pubKey.toAddress('mainnet').toString();

//       let xCoord = '';
//       let yCoord = '';
      
//       try {
//         if (pubKey.point && pubKey.point.x && pubKey.point.y) {
//           xCoord = pubKey.point.x.toString(16).padStart(64, '0');
//           yCoord = pubKey.point.y.toString(16).padStart(64, '0');
//         } else {
//           const pubKeyHex = pubKey.toString();
//           if (pubKeyHex.startsWith('02') || pubKeyHex.startsWith('03')) {
//             xCoord = pubKeyHex.slice(2);
//             yCoord = 'Compressed format - Y coordinate derived from X';
//           } else if (pubKeyHex.startsWith('04')) {
//             xCoord = pubKeyHex.slice(2, 66);
//             yCoord = pubKeyHex.slice(66, 130);
//           }
//         }
//       } catch (e) {
//         console.log('Could not extract raw coordinates:', e);
//         xCoord = 'Not available';
//         yCoord = 'Not available';
//       }

//       setKeyData({
//         privateKey: privKey,
//         publicKey: pubKey,
//         privateKeyHex: privKey.toHex(),
//         privateKeyWif: privKey.toWif(),
//         privateKeyBinary: privKey.toArray(),
//         publicKeyHex: pubKey.toString(),
//         publicKeyDER: Utils.toHex(pubKey.toDER()),
//         publicKeyRaw: { x: xCoord, y: yCoord },
//         address: address
//       });
      
//       updateContactSharedSecrets(privKey);
//     } catch (err) {
//       console.error('Error processing private key:', err);
//       setError('Error processing key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Check balance for address
//   const checkBalance = async (address: string) => {
//     if (!address) return;
    
//     setBalance({ ...balance, loading: true, error: null });
    
//     try {
//       const baseUrl = network === 'testnet' 
//         ? 'https://api.whatsonchain.com/v1/bsv/test'
//         : 'https://api.whatsonchain.com/v1/bsv/main';
      
//       const response = await fetch(`${baseUrl}/address/${address}/balance`);
      
//       if (!response.ok) {
//         throw new Error('Failed to fetch balance');
//       }
      
//       const data = await response.json();
      
//       setBalance({
//         confirmed: data.confirmed || 0,
//         unconfirmed: data.unconfirmed || 0,
//         loading: false,
//         error: null
//       });
//     } catch (error) {
//       console.error('Balance check error:', error);
//       setBalance({
//         ...balance,
//         loading: false,
//         error: 'Unable to fetch balance. Try again later.'
//       });
//     }
//   };

//   // Format satoshis to BSV
//   const formatBSV = (satoshis: number): string => {
//     const bsv = satoshis / 100000000;
//     return bsv.toFixed(8).replace(/\.?0+$/, '');
//   };

//   // Copy to clipboard function
//   const copyToClipboard = (text: string, label: string) => {
//     navigator.clipboard.writeText(text);
//     // You could add a toast notification here
//   };

//   // Update address and check balance when network changes
//   useEffect(() => {
//     if (keyData.publicKey) {
//       const address = network === 'testnet'
//         ? keyData.publicKey.toAddress('testnet').toString()
//         : keyData.publicKey.toAddress('mainnet').toString();
      
//       setKeyData({ ...keyData, address });
//       checkBalance(address);
//     }
//   }, [network]);

//   return (
//     <>
//       <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
//         <h2 className="text-xl font-semibold mb-4 text-white">Generate or Import Private Key</h2>
        
//         <div className="mb-4 flex gap-2">
//           <button
//             onClick={generateRandomKey}
//             className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Generate Random Private Key
//           </button>
//           <button
//             onClick={() => {
//               const testKey = '0000000000000000000000000000000000000000000000000000000000000001';
//               setInputKey(testKey);
//               importPrivateKey();
//             }}
//             className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
//             title="Use test key"
//           >
//             Test Key
//           </button>
//         </div>

//         <div className="flex flex-col sm:flex-row gap-2">
//           <input
//             type="text"
//             value={inputKey}
//             onChange={(e) => setInputKey(e.target.value)}
//             placeholder="Enter private key (hex or WIF format)"
//             className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
//           />
//           <button
//             onClick={importPrivateKey}
//             className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Import Key
//           </button>
//         </div>

//         {error && (
//           <p className="mt-2 text-red-400 text-sm">{error}</p>
//         )}
//       </div>

//       {/* Secure Hierarchical Blog Key Generation Section */}
//       <div className="mb-6 p-4 bg-indigo-900 bg-opacity-30 rounded-lg border border-indigo-700">
//         <h2 className="text-xl font-semibold mb-4 text-white">Secure Hierarchical Blog Encryption Keys</h2>
        
//         <div className="mb-4 p-3 bg-indigo-800 bg-opacity-30 rounded-lg">
//           <p className="text-sm text-indigo-300">
//             <span className="font-semibold">🔐 Enhanced Security Model:</span> Each tier uses independent cryptographic keys. 
//             Higher tiers receive all keys from their level and below, enabling decryption of lower-tier content without vulnerability to privilege escalation.
//           </p>
//         </div>
        
//         <div className="mb-4 flex gap-2">
//           <button
//             onClick={generateHierarchicalBlogKeys}
//             className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Generate Secure Hierarchical Keys
//           </button>
//         </div>

//         <div className="flex flex-col gap-2 mb-4">
//           <div className="flex gap-2">
//             <input
//               type="text"
//               value={importBlogKey}
//               onChange={(e) => setImportBlogKey(e.target.value)}
//               placeholder="Import access bundle (base64) or raw hex key"
//               className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400"
//             />
//             <select
//               value={selectedImportTier}
//               onChange={(e) => setSelectedImportTier(Number(e.target.value))}
//               className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
//               title="Select tier for raw hex import"
//             >
//               <option value={1}>Tier 1</option>
//               <option value={2}>Tier 2</option>
//               <option value={3}>Tier 3</option>
//               <option value={4}>Tier 4</option>
//               <option value={5}>Tier 5</option>
//             </select>
//             <button
//               onClick={importAccessBundle}
//               className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//             >
//               Import
//             </button>
//           </div>
//           <p className="text-xs text-gray-400">
//             Import an access bundle shared with you, or a raw hex key for a specific tier
//           </p>
//         </div>

//         {blogKeyError && (
//           <p className="mt-2 text-sm text-yellow-400">{blogKeyError}</p>
//         )}

//         {blogKeyData && (
//           <div className="mt-4 space-y-3">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-medium text-white">Hierarchical Key Details</h3>
//               <button
//                 onClick={() => setShowBlogKey(!showBlogKey)}
//                 className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
//               >
//                 {showBlogKey ? 'Hide' : 'Show'} Keys & Access Bundles
//               </button>
//             </div>

//             {showBlogKey && (
//               <div className="p-4 bg-gray-800 rounded-lg space-y-4">
//                 {/* Tier 5 - Full Access */}
//                 {blogKeyData.keys.tier5 && (
//                   <div className="p-3 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-red-300">
//                         Tier 5 - Complete Access (All Levels)
//                       </label>
//                       <span className="text-xs text-gray-400">256-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-red-600 text-xs break-all text-red-300 font-mono">
//                           {blogKeyData.keys.tier5}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier5, 'Tier 5 Key')}
//                           className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                           title="Copy Tier 5 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(5), 'Tier 5 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Full Access Bundle (Decrypts Levels 1-5)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt all content (Levels 1, 2, 3, 4, and 5)
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Tier 4 */}
//                 {blogKeyData.keys.tier4 && (
//                   <div className="p-3 bg-purple-900 bg-opacity-20 rounded-lg border border-purple-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-purple-300">
//                         Tier 4 - Closed Group Access
//                       </label>
//                       <span className="text-xs text-gray-400">192-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-purple-600 text-xs break-all text-purple-300 font-mono">
//                           {blogKeyData.keys.tier4}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier4, 'Tier 4 Key')}
//                           className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
//                           title="Copy Tier 4 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(4), 'Tier 4 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-purple-800 hover:bg-purple-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Tier 4 Access Bundle (Decrypts Levels 1-4)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt Levels 1, 2, 3, and 4 content
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Tier 3 */}
//                 {blogKeyData.keys.tier3 && (
//                   <div className="p-3 bg-indigo-900 bg-opacity-20 rounded-lg border border-indigo-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-indigo-300">
//                         Tier 3 - Inner Circle Access
//                       </label>
//                       <span className="text-xs text-gray-400">128-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-indigo-600 text-xs break-all text-indigo-300 font-mono">
//                           {blogKeyData.keys.tier3}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier3, 'Tier 3 Key')}
//                           className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
//                           title="Copy Tier 3 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(3), 'Tier 3 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-indigo-800 hover:bg-indigo-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Tier 3 Access Bundle (Decrypts Levels 1-3)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt Levels 1, 2, and 3 content
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Tier 2 */}
//                 {blogKeyData.keys.tier2 && (
//                   <div className="p-3 bg-yellow-900 bg-opacity-20 rounded-lg border border-yellow-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-yellow-300">
//                         Tier 2 - Close Friends Access
//                       </label>
//                       <span className="text-xs text-gray-400">128-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-yellow-600 text-xs break-all text-yellow-300 font-mono">
//                           {blogKeyData.keys.tier2}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier2, 'Tier 2 Key')}
//                           className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
//                           title="Copy Tier 2 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(2), 'Tier 2 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-yellow-800 hover:bg-yellow-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Tier 2 Access Bundle (Decrypts Levels 1-2)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt Levels 1 and 2 content
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 {/* Tier 1 */}
//                 {blogKeyData.keys.tier1 && (
//                   <div className="p-3 bg-orange-900 bg-opacity-20 rounded-lg border border-orange-700">
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="text-sm font-medium text-orange-300">
//                         Tier 1 - Friends Access
//                       </label>
//                       <span className="text-xs text-gray-400">128-bit key</span>
//                     </div>
//                     <div className="space-y-2">
//                       <div className="flex items-center gap-2">
//                         <code className="flex-1 p-2 bg-gray-900 rounded border border-orange-600 text-xs break-all text-orange-300 font-mono">
//                           {blogKeyData.keys.tier1}
//                         </code>
//                         <button
//                           onClick={() => copyToClipboard(blogKeyData.keys.tier1, 'Tier 1 Key')}
//                           className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
//                           title="Copy Tier 1 key only"
//                         >
//                           📋
//                         </button>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => copyToClipboard(createAccessBundle(1), 'Tier 1 Access Bundle')}
//                           className="flex-1 px-3 py-1 bg-orange-800 hover:bg-orange-700 text-white rounded text-sm"
//                         >
//                           📦 Copy Tier 1 Access Bundle (Decrypts Level 1 only)
//                         </button>
//                       </div>
//                       <p className="text-xs text-gray-400">
//                         Access: Can decrypt Level 1 content only
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 <div className="mt-4 p-3 bg-green-800 bg-opacity-30 rounded-lg">
//                   <h4 className="text-sm font-semibold text-green-300 mb-2">🔐 Security Features:</h4>
//                   <ul className="text-xs text-gray-300 space-y-1">
//                     <li>✅ <span className="text-green-400">Independent keys</span> - Each tier has its own cryptographic key</li>
//                     <li>✅ <span className="text-green-400">No privilege escalation</span> - Lower tiers cannot derive higher tier keys</li>
//                     <li>✅ <span className="text-green-400">Hierarchical access</span> - Higher tiers can decrypt all lower tier content</li>
//                     <li>✅ <span className="text-green-400">Strong encryption</span> - 128-256 bit keys based on tier importance</li>
//                     <li>✅ <span className="text-green-400">Easy sharing</span> - Access bundles contain all necessary keys for a tier</li>
//                   </ul>
//                 </div>

//                 <div className="mt-3 p-3 bg-blue-800 bg-opacity-30 rounded-lg">
//                   <h4 className="text-sm font-semibold text-blue-300 mb-2">📚 How It Works:</h4>
//                   <ol className="text-xs text-gray-300 space-y-1">
//                     <li>1. Generate a complete key set with independent keys for each tier</li>
//                     <li>2. Share access bundles with users based on their tier level</li>
//                     <li>3. Each bundle contains all keys needed for that tier and below</li>
//                     <li>4. Content is encrypted with the appropriate tier key</li>
//                     <li>5. Users can only decrypt content at or below their tier level</li>
//                   </ol>
//                 </div>
//               </div>
//             )}

//             <div className="text-sm text-gray-400">
//               <p>Version: <span className="text-gray-300">{blogKeyData.version}</span></p>
//               <p>Generated: <span className="text-gray-300">{new Date(blogKeyData.generatedAt).toLocaleString()}</span></p>
//               <p>Highest Available Tier: <span className="text-gray-300">Level {getHighestAvailableTier()}</span></p>
//             </div>
//           </div>
//         )}
//       </div>

//       {keyData.privateKey && (
//         <>
//           <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//             <h2 className="text-xl font-semibold mb-2 text-white">BSV Address (for Regular Transactions & 1Sat Ordinals)</h2>
//             <div className="flex items-center gap-2">
//               <code className="flex-1 p-3 bg-gray-800 rounded border border-blue-600 text-sm break-all text-blue-300">
//                 {keyData.address}
//               </code>
//               <button
//                 onClick={() => copyToClipboard(keyData.address, 'Address')}
//                 className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
//                 title="Copy address"
//               >
//                 📋
//               </button>
//             </div>
            
//             <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm text-gray-300">Balance:</span>
//                 <div className="flex items-center gap-2">
//                   {balance.loading ? (
//                     <span className="text-sm text-gray-400">Loading...</span>
//                   ) : balance.error ? (
//                     <span className="text-sm text-red-400">{balance.error}</span>
//                   ) : (
//                     <div className="text-right">
//                       <div className="text-sm font-medium text-white">
//                         {formatBSV(balance.confirmed)} BSV
//                       </div>
//                       {balance.unconfirmed > 0 && (
//                         <div className="text-xs text-yellow-400">
//                           +{formatBSV(balance.unconfirmed)} unconfirmed
//                         </div>
//                       )}
//                       <div className="text-xs text-gray-400">
//                         ({balance.confirmed.toLocaleString()} satoshis)
//                       </div>
//                     </div>
//                   )}
//                   <button
//                     onClick={() => checkBalance(keyData.address)}
//                     className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
//                     title="Refresh balance"
//                     disabled={balance.loading}
//                   >
//                     🔄
//                   </button>
//                 </div>
//               </div>
//             </div>
            
//             <p className="mt-2 text-sm text-gray-400">
//               Network: <span className="font-medium text-gray-300">{network}</span>
//             </p>
//           </div>

//           {/* 1Sat Ordinals Information Section */}
//           <div className="mb-6 p-4 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-700">
//             <h2 className="text-xl font-semibold mb-3 text-white">1Sat Ordinals Information</h2>
            
//             <div className="p-4 bg-gray-800 rounded-lg space-y-3">
//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">Same Address for Everything</h3>
//                   <p className="text-sm text-gray-300">
//                     1Sat Ordinals uses standard P2PKH addresses - the same address shown above works for both regular BSV transactions and ordinal inscriptions.
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">How It Works</h3>
//                   <p className="text-sm text-gray-300">
//                     Inscriptions are created by embedding data in transaction outputs that send 1 satoshi to your address. The inscription data is stored in the transaction script.
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">Managing Your Ordinals</h3>
//                   <p className="text-sm text-gray-300">
//                     Keep track of inscription transaction IDs. Use ordinals-compatible wallets or indexers to view and manage your inscriptions. Each inscription is tied to a specific satoshi at your address.
//                   </p>
//                 </div>
//               </div>
//             </div>

//             <div className="mt-4 p-3 bg-purple-800 bg-opacity-30 rounded-lg border border-purple-600">
//               <p className="text-xs text-purple-300">
//                 <span className="font-semibold">Pro Tip:</span> When receiving ordinals, make sure the sender uses your address above. The inscription will appear as a 1 satoshi UTXO with embedded data.
//               </p>
//             </div>
//           </div>

//           <div className="mb-6 p-4 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-xl font-semibold text-white">Private Key Formats</h2>
//               <button
//                 onClick={() => setShowPrivateKey(!showPrivateKey)}
//                 className="text-sm text-red-400 hover:text-red-300 font-medium"
//               >
//                 {showPrivateKey ? 'Hide' : 'Show'} Private Keys
//               </button>
//             </div>
            
//             {showPrivateKey && (
//               <div className="space-y-3">
//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Hex Format:</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
//                       {keyData.privateKeyHex}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(keyData.privateKeyHex, 'Private Key Hex')}
//                       className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">WIF Format:</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
//                       {keyData.privateKeyWif}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(keyData.privateKeyWif, 'Private Key WIF')}
//                       className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Binary Format (first 10 bytes):</label>
//                   <code className="block mt-1 p-2 bg-gray-800 rounded border border-red-600 text-xs text-red-300">
//                     [{keyData.privateKeyBinary.slice(0, 10).join(', ')}...]
//                   </code>
//                 </div>
//               </div>
//             )}
            
//             <p className="mt-3 text-xs text-red-400 font-medium">
//               ⚠️ Warning: Never share your private key with anyone!
//             </p>
//           </div>

//           <div className="mb-6 p-4 bg-green-900 bg-opacity-20 rounded-lg border border-green-700">
//             <h2 className="text-xl font-semibold mb-4 text-white">Public Key Formats</h2>
            
//             <div className="space-y-3">
//               <div>
//                 <label className="text-sm font-medium text-gray-300">Hex Format (Compressed):</label>
//                 <div className="flex items-center gap-2 mt-1">
//                   <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
//                     {keyData.publicKeyHex}
//                   </code>
//                   <button
//                     onClick={() => copyToClipboard(keyData.publicKeyHex, 'Public Key Hex')}
//                     className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
//                   >
//                     📋
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="text-sm font-medium text-gray-300">DER Format:</label>
//                 <div className="flex items-center gap-2 mt-1">
//                   <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
//                     {keyData.publicKeyDER}
//                   </code>
//                   <button
//                     onClick={() => copyToClipboard(keyData.publicKeyDER, 'Public Key DER')}
//                     className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
//                   >
//                     📋
//                   </button>
//                 </div>
//               </div>
              
//               <div>
//                 <label className="text-sm font-medium text-gray-300">Raw Public Key Coordinates:</label>
//                 <div className="mt-1 p-2 bg-gray-800 rounded border border-green-600 text-xs">
//                   <div className="break-all text-green-300">
//                     <span className="font-medium">X:</span> {keyData.publicKeyRaw.x}
//                   </div>
//                   <div className="break-all mt-1 text-green-300">
//                     <span className="font-medium">Y:</span> {keyData.publicKeyRaw.y}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </>
//       )}
//     </>
//   );
// };




// This is PROIR To the No Privilege Escalation Vulnerability update on encryption code = below

// import React, { useState, useEffect } from 'react';
// import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
// import { useWalletStore } from '../store/WalletStore';

// // Polyfill Buffer for browser environment
// if (typeof window !== 'undefined' && !window.Buffer) {
//   window.Buffer = {
//     from: (data: any, encoding?: string) => {
//       if (encoding === 'hex') {
//         const bytes = [];
//         for (let i = 0; i < data.length; i += 2) {
//           bytes.push(parseInt(data.substr(i, 2), 16));
//         }
//         return new Uint8Array(bytes);
//       } else if (typeof data === 'string') {
//         return new TextEncoder().encode(data);
//       }
//       return new Uint8Array(data);
//     },
//     alloc: (size: number) => new Uint8Array(size),
//     concat: (arrays: Uint8Array[]) => {
//       const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
//       const result = new Uint8Array(totalLength);
//       let offset = 0;
//       for (const arr of arrays) {
//         result.set(arr, offset);
//         offset += arr.length;
//       }
//       return result;
//     }
//   } as any;
// }

// // Blog Key Types
// interface BlogKeySegments {
//   tier1: string;  // First 1/5 (~13 chars) - Level 1
//   tier2: string;  // First 2/5 (~26 chars) - Level 2
//   tier3: string;  // First 3/5 (~38 chars) - Level 3
//   tier4: string;  // First 4/5 (~51 chars) - Level 4
//   tier5: string;  // Full key (64 chars) - Level 5
// }

// interface BlogKeyData {
//   fullKey: string;
//   segments: BlogKeySegments;
//   version: string;
//   generatedAt: number;
// }

// export const Wallet: React.FC = () => {
//   const [inputKey, setInputKey] = useState<string>('');
//   const [error, setError] = useState<string>('');
//   const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
//   const [showBlogKey, setShowBlogKey] = useState<boolean>(false);
  
//   // Blog key states
//   const [blogKeyData, setBlogKeyData] = useState<BlogKeyData | null>(null);
//   const [importBlogKey, setImportBlogKey] = useState<string>('');
//   const [blogKeyError, setBlogKeyError] = useState<string>('');
  
//   const {
//     network,
//     keyData,
//     balance,
//     setKeyData,
//     setBalance,
//     updateContactSharedSecrets,
//     setBlogKey // Assuming this will be added to WalletStore
//   } = useWalletStore();

//   // Generate random 256-bit blog key
//   const generateRandomBlogKey = () => {
//     try {
//       // Generate 32 random bytes (256 bits)
//       const randomBytes = new Uint8Array(32);
//       if (window.crypto && window.crypto.getRandomValues) {
//         window.crypto.getRandomValues(randomBytes);
//       } else {
//         // Fallback for development
//         for (let i = 0; i < 32; i++) {
//           randomBytes[i] = Math.floor(Math.random() * 256);
//         }
//       }
      
//       // Convert to hex string (64 characters)
//       const fullKey = Array.from(randomBytes)
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('');
      
//       // Segment the key into three parts
//       const segments = segmentBlogKey(fullKey);
      
//       const newBlogKeyData: BlogKeyData = {
//         fullKey,
//         segments,
//         version: 'v1',
//         generatedAt: Date.now()
//       };
      
//       setBlogKeyData(newBlogKeyData);
//       // Store in WalletStore if the method exists
//       if (setBlogKey) {
//         setBlogKey(newBlogKeyData);
//       }
      
//       setBlogKeyError('');
//     } catch (err) {
//       setBlogKeyError('Failed to generate blog key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Segment a 64-character hex key into five tiers
//   const segmentBlogKey = (fullKey: string): BlogKeySegments => {
//     const keyLength = fullKey.length; // Should be 64
//     const tier1Length = Math.floor(keyLength / 5);      // ~13 chars
//     const tier2Length = Math.floor(keyLength * 2 / 5);  // ~26 chars
//     const tier3Length = Math.floor(keyLength * 3 / 5);  // ~38 chars
//     const tier4Length = Math.floor(keyLength * 4 / 5);  // ~51 chars
    
//     return {
//       tier1: fullKey.substring(0, tier1Length),
//       tier2: fullKey.substring(0, tier2Length),
//       tier3: fullKey.substring(0, tier3Length),
//       tier4: fullKey.substring(0, tier4Length),
//       tier5: fullKey // Full key
//     };
//   };

//   // Import existing blog key
//   const importExistingBlogKey = () => {
//     const trimmedKey = importBlogKey.trim();
    
//     if (!trimmedKey) {
//       setBlogKeyError('Please enter a blog key');
//       return;
//     }
    
//     // Validate hex format and length
//     if (!/^[0-9a-fA-F]+$/.test(trimmedKey)) {
//       setBlogKeyError('Blog key must be in hexadecimal format');
//       return;
//     }
    
//     if (trimmedKey.length !== 64) {
//       setBlogKeyError('Blog key must be exactly 64 characters (256 bits)');
//       return;
//     }
    
//     try {
//       const segments = segmentBlogKey(trimmedKey);
      
//       const newBlogKeyData: BlogKeyData = {
//         fullKey: trimmedKey,
//         segments,
//         version: 'v1',
//         generatedAt: Date.now()
//       };
      
//       setBlogKeyData(newBlogKeyData);
//       // Store in WalletStore if the method exists
//       if (setBlogKey) {
//         setBlogKey(newBlogKeyData);
//       }
      
//       setBlogKeyError('');
//       setImportBlogKey(''); // Clear input after successful import
//     } catch (err) {
//       setBlogKeyError('Failed to import blog key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Generate random private key
//   const generateRandomKey = () => {
//     try {
//       let privKey;
//       try {
//         privKey = PrivateKey.fromRandom();
//       } catch (e) {
//         // Fallback: generate random 32 bytes and create private key
//         const randomBytes = new Uint8Array(32);
//         if (window.crypto && window.crypto.getRandomValues) {
//           window.crypto.getRandomValues(randomBytes);
//         } else {
//           // Very basic fallback for development
//           for (let i = 0; i < 32; i++) {
//             randomBytes[i] = Math.floor(Math.random() * 256);
//           }
//         }
//         const hexString = Array.from(randomBytes)
//           .map(b => b.toString(16).padStart(2, '0'))
//           .join('');
//         privKey = PrivateKey.fromHex(hexString);
//       }
      
//       setInputKey(privKey.toHex());
//       processPrivateKey(privKey);
//       setError('');
//     } catch (err) {
//       setError('Failed to generate random key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//       console.error('Error generating key:', err);
//     }
//   };

//   // Process user input private key
//   const importPrivateKey = () => {
//     if (!inputKey.trim()) {
//       setError('Please enter a private key');
//       return;
//     }

//     try {
//       let privKey: PrivateKey;
      
//       if (inputKey.startsWith('L') || inputKey.startsWith('K') || inputKey.startsWith('5')) {
//         privKey = PrivateKey.fromWif(inputKey.trim());
//       } else if (inputKey.length === 64) {
//         privKey = PrivateKey.fromHex(inputKey.trim());
//       } else {
//         throw new Error('Invalid private key format');
//       }

//       processPrivateKey(privKey);
//       setError('');
//     } catch (err) {
//       setError('Invalid private key format. Please enter a valid hex or WIF key.');
//     }
//   };

//   // Process private key and derive all formats
//   const processPrivateKey = (privKey: PrivateKey) => {
//     try {
//       const pubKey = privKey.toPublicKey();
      
//       const address = network === 'testnet' 
//         ? pubKey.toAddress('testnet').toString()
//         : pubKey.toAddress('mainnet').toString();

//       let xCoord = '';
//       let yCoord = '';
      
//       try {
//         if (pubKey.point && pubKey.point.x && pubKey.point.y) {
//           xCoord = pubKey.point.x.toString(16).padStart(64, '0');
//           yCoord = pubKey.point.y.toString(16).padStart(64, '0');
//         } else {
//           const pubKeyHex = pubKey.toString();
//           if (pubKeyHex.startsWith('02') || pubKeyHex.startsWith('03')) {
//             xCoord = pubKeyHex.slice(2);
//             yCoord = 'Compressed format - Y coordinate derived from X';
//           } else if (pubKeyHex.startsWith('04')) {
//             xCoord = pubKeyHex.slice(2, 66);
//             yCoord = pubKeyHex.slice(66, 130);
//           }
//         }
//       } catch (e) {
//         console.log('Could not extract raw coordinates:', e);
//         xCoord = 'Not available';
//         yCoord = 'Not available';
//       }

//       setKeyData({
//         privateKey: privKey,
//         publicKey: pubKey,
//         privateKeyHex: privKey.toHex(),
//         privateKeyWif: privKey.toWif(),
//         privateKeyBinary: privKey.toArray(),
//         publicKeyHex: pubKey.toString(),
//         publicKeyDER: Utils.toHex(pubKey.toDER()),
//         publicKeyRaw: { x: xCoord, y: yCoord },
//         address: address
//       });
      
//       updateContactSharedSecrets(privKey);
//     } catch (err) {
//       console.error('Error processing private key:', err);
//       setError('Error processing key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Check balance for address
//   const checkBalance = async (address: string) => {
//     if (!address) return;
    
//     setBalance({ ...balance, loading: true, error: null });
    
//     try {
//       const baseUrl = network === 'testnet' 
//         ? 'https://api.whatsonchain.com/v1/bsv/test'
//         : 'https://api.whatsonchain.com/v1/bsv/main';
      
//       const response = await fetch(`${baseUrl}/address/${address}/balance`);
      
//       if (!response.ok) {
//         throw new Error('Failed to fetch balance');
//       }
      
//       const data = await response.json();
      
//       setBalance({
//         confirmed: data.confirmed || 0,
//         unconfirmed: data.unconfirmed || 0,
//         loading: false,
//         error: null
//       });
//     } catch (error) {
//       console.error('Balance check error:', error);
//       setBalance({
//         ...balance,
//         loading: false,
//         error: 'Unable to fetch balance. Try again later.'
//       });
//     }
//   };

//   // Format satoshis to BSV
//   const formatBSV = (satoshis: number): string => {
//     const bsv = satoshis / 100000000;
//     return bsv.toFixed(8).replace(/\.?0+$/, '');
//   };

//   // Copy to clipboard function
//   const copyToClipboard = (text: string, label: string) => {
//     navigator.clipboard.writeText(text);
//     // You could add a toast notification here
//   };

//   // Update address and check balance when network changes
//   useEffect(() => {
//     if (keyData.publicKey) {
//       const address = network === 'testnet'
//         ? keyData.publicKey.toAddress('testnet').toString()
//         : keyData.publicKey.toAddress('mainnet').toString();
      
//       setKeyData({ ...keyData, address });
//       checkBalance(address);
//     }
//   }, [network]);

//   return (
//     <>
//       <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
//         <h2 className="text-xl font-semibold mb-4 text-white">Generate or Import Private Key</h2>
        
//         <div className="mb-4 flex gap-2">
//           <button
//             onClick={generateRandomKey}
//             className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Generate Random Private Key
//           </button>
//           <button
//             onClick={() => {
//               const testKey = '0000000000000000000000000000000000000000000000000000000000000001';
//               setInputKey(testKey);
//               importPrivateKey();
//             }}
//             className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
//             title="Use test key"
//           >
//             Test Key
//           </button>
//         </div>

//         <div className="flex flex-col sm:flex-row gap-2">
//           <input
//             type="text"
//             value={inputKey}
//             onChange={(e) => setInputKey(e.target.value)}
//             placeholder="Enter private key (hex or WIF format)"
//             className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
//           />
//           <button
//             onClick={importPrivateKey}
//             className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Import Key
//           </button>
//         </div>

//         {error && (
//           <p className="mt-2 text-red-400 text-sm">{error}</p>
//         )}
//       </div>

//       {/* Phase 1: Blog Key Generation Section */}
//       <div className="mb-6 p-4 bg-indigo-900 bg-opacity-30 rounded-lg border border-indigo-700">
//         <h2 className="text-xl font-semibold mb-4 text-white">Blog Encryption Key (Phase 1)</h2>
        
//         <div className="mb-4 flex gap-2">
//           <button
//             onClick={generateRandomBlogKey}
//             className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Generate Random Blog Key (256-bit)
//           </button>
//         </div>

//         <div className="flex flex-col sm:flex-row gap-2 mb-4">
//           <input
//             type="text"
//             value={importBlogKey}
//             onChange={(e) => setImportBlogKey(e.target.value)}
//             placeholder="Or import existing blog key (64 hex characters)"
//             className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400"
//           />
//           <button
//             onClick={importExistingBlogKey}
//             className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Import Blog Key
//           </button>
//         </div>

//         {blogKeyError && (
//           <p className="mt-2 text-red-400 text-sm">{blogKeyError}</p>
//         )}

//         {blogKeyData && (
//           <div className="mt-4 space-y-3">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-medium text-white">Blog Key Details</h3>
//               <button
//                 onClick={() => setShowBlogKey(!showBlogKey)}
//                 className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
//               >
//                 {showBlogKey ? 'Hide' : 'Show'} Blog Keys
//               </button>
//             </div>

//             {showBlogKey && (
//               <div className="p-4 bg-gray-800 rounded-lg space-y-3">
//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Full Key (Level 5 - Completely Private):</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-900 rounded border border-red-600 text-xs break-all text-red-300 font-mono">
//                       {blogKeyData.fullKey}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(blogKeyData.fullKey, 'Full Blog Key')}
//                       className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                   <p className="text-xs text-gray-500 mt-1">64 characters = 256 bits</p>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Tier 4 Access (Closed Group):</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-900 rounded border border-purple-600 text-xs break-all text-purple-300 font-mono">
//                       {blogKeyData.segments.tier4}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(blogKeyData.segments.tier4, 'Tier 4 Blog Key')}
//                       className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                   <p className="text-xs text-gray-500 mt-1">{blogKeyData.segments.tier4.length} characters ≈ {Math.floor(blogKeyData.segments.tier4.length * 4)} bits</p>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Tier 3 Access (Inner Circle):</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-900 rounded border border-indigo-600 text-xs break-all text-indigo-300 font-mono">
//                       {blogKeyData.segments.tier3}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(blogKeyData.segments.tier3, 'Tier 3 Blog Key')}
//                       className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                   <p className="text-xs text-gray-500 mt-1">{blogKeyData.segments.tier3.length} characters ≈ {Math.floor(blogKeyData.segments.tier3.length * 4)} bits</p>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Tier 2 Access (Close Friends):</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-900 rounded border border-yellow-600 text-xs break-all text-yellow-300 font-mono">
//                       {blogKeyData.segments.tier2}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(blogKeyData.segments.tier2, 'Tier 2 Blog Key')}
//                       className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                   <p className="text-xs text-gray-500 mt-1">{blogKeyData.segments.tier2.length} characters ≈ {Math.floor(blogKeyData.segments.tier2.length * 4)} bits</p>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Tier 1 Access (Friends):</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-900 rounded border border-orange-600 text-xs break-all text-orange-300 font-mono">
//                       {blogKeyData.segments.tier1}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(blogKeyData.segments.tier1, 'Tier 1 Blog Key')}
//                       className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                   <p className="text-xs text-gray-500 mt-1">{blogKeyData.segments.tier1.length} characters ≈ {Math.floor(blogKeyData.segments.tier1.length * 4)} bits</p>
//                 </div>

//                 <div className="mt-3 p-3 bg-indigo-800 bg-opacity-30 rounded-lg">
//                   <p className="text-xs text-indigo-300">
//                     <span className="font-semibold">Access Levels:</span>
//                   </p>
//                   <ul className="text-xs text-gray-300 mt-1 space-y-1">
//                     <li>• <span className="text-gray-400">Level 0</span>: Public posts (no encryption)</li>
//                     <li>• <span className="text-orange-400">Level 1</span>: Friends (tier 1 key required)</li>
//                     <li>• <span className="text-yellow-400">Level 2</span>: Close friends (tier 2 key required)</li>
//                     <li>• <span className="text-indigo-400">Level 3</span>: Inner circle (tier 3 key required)</li>
//                     <li>• <span className="text-purple-400">Level 4</span>: Closed group (tier 4 key required)</li>
//                     <li>• <span className="text-red-400">Level 5</span>: Completely private (full key required)</li>
//                   </ul>
//                 </div>
//               </div>
//             )}

//             <div className="text-sm text-gray-400">
//               <p>Version: <span className="text-gray-300">{blogKeyData.version}</span></p>
//               <p>Generated: <span className="text-gray-300">{new Date(blogKeyData.generatedAt).toLocaleString()}</span></p>
//             </div>
//           </div>
//         )}
//       </div>

//       {keyData.privateKey && (
//         <>
//           <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//             <h2 className="text-xl font-semibold mb-2 text-white">BSV Address (for Regular Transactions & 1Sat Ordinals)</h2>
//             <div className="flex items-center gap-2">
//               <code className="flex-1 p-3 bg-gray-800 rounded border border-blue-600 text-sm break-all text-blue-300">
//                 {keyData.address}
//               </code>
//               <button
//                 onClick={() => copyToClipboard(keyData.address, 'Address')}
//                 className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
//                 title="Copy address"
//               >
//                 📋
//               </button>
//             </div>
            
//             <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm text-gray-300">Balance:</span>
//                 <div className="flex items-center gap-2">
//                   {balance.loading ? (
//                     <span className="text-sm text-gray-400">Loading...</span>
//                   ) : balance.error ? (
//                     <span className="text-sm text-red-400">{balance.error}</span>
//                   ) : (
//                     <div className="text-right">
//                       <div className="text-sm font-medium text-white">
//                         {formatBSV(balance.confirmed)} BSV
//                       </div>
//                       {balance.unconfirmed > 0 && (
//                         <div className="text-xs text-yellow-400">
//                           +{formatBSV(balance.unconfirmed)} unconfirmed
//                         </div>
//                       )}
//                       <div className="text-xs text-gray-400">
//                         ({balance.confirmed.toLocaleString()} satoshis)
//                       </div>
//                     </div>
//                   )}
//                   <button
//                     onClick={() => checkBalance(keyData.address)}
//                     className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
//                     title="Refresh balance"
//                     disabled={balance.loading}
//                   >
//                     🔄
//                   </button>
//                 </div>
//               </div>
//             </div>
            
//             <p className="mt-2 text-sm text-gray-400">
//               Network: <span className="font-medium text-gray-300">{network}</span>
//             </p>
//           </div>

//           {/* 1Sat Ordinals Information Section */}
//           <div className="mb-6 p-4 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-700">
//             <h2 className="text-xl font-semibold mb-3 text-white">1Sat Ordinals Information</h2>
            
//             <div className="p-4 bg-gray-800 rounded-lg space-y-3">
//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">Same Address for Everything</h3>
//                   <p className="text-sm text-gray-300">
//                     1Sat Ordinals uses standard P2PKH addresses - the same address shown above works for both regular BSV transactions and ordinal inscriptions.
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">How It Works</h3>
//                   <p className="text-sm text-gray-300">
//                     Inscriptions are created by embedding data in transaction outputs that send 1 satoshi to your address. The inscription data is stored in the transaction script.
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">Managing Your Ordinals</h3>
//                   <p className="text-sm text-gray-300">
//                     Keep track of inscription transaction IDs. Use ordinals-compatible wallets or indexers to view and manage your inscriptions. Each inscription is tied to a specific satoshi at your address.
//                   </p>
//                 </div>
//               </div>
//             </div>

//             <div className="mt-4 p-3 bg-purple-800 bg-opacity-30 rounded-lg border border-purple-600">
//               <p className="text-xs text-purple-300">
//                 <span className="font-semibold">Pro Tip:</span> When receiving ordinals, make sure the sender uses your address above. The inscription will appear as a 1 satoshi UTXO with embedded data.
//               </p>
//             </div>
//           </div>

//           <div className="mb-6 p-4 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-xl font-semibold text-white">Private Key Formats</h2>
//               <button
//                 onClick={() => setShowPrivateKey(!showPrivateKey)}
//                 className="text-sm text-red-400 hover:text-red-300 font-medium"
//               >
//                 {showPrivateKey ? 'Hide' : 'Show'} Private Keys
//               </button>
//             </div>
            
//             {showPrivateKey && (
//               <div className="space-y-3">
//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Hex Format:</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
//                       {keyData.privateKeyHex}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(keyData.privateKeyHex, 'Private Key Hex')}
//                       className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">WIF Format:</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
//                       {keyData.privateKeyWif}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(keyData.privateKeyWif, 'Private Key WIF')}
//                       className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Binary Format (first 10 bytes):</label>
//                   <code className="block mt-1 p-2 bg-gray-800 rounded border border-red-600 text-xs text-red-300">
//                     [{keyData.privateKeyBinary.slice(0, 10).join(', ')}...]
//                   </code>
//                 </div>
//               </div>
//             )}
            
//             <p className="mt-3 text-xs text-red-400 font-medium">
//               ⚠️ Warning: Never share your private key with anyone!
//             </p>
//           </div>

//           <div className="mb-6 p-4 bg-green-900 bg-opacity-20 rounded-lg border border-green-700">
//             <h2 className="text-xl font-semibold mb-4 text-white">Public Key Formats</h2>
            
//             <div className="space-y-3">
//               <div>
//                 <label className="text-sm font-medium text-gray-300">Hex Format (Compressed):</label>
//                 <div className="flex items-center gap-2 mt-1">
//                   <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
//                     {keyData.publicKeyHex}
//                   </code>
//                   <button
//                     onClick={() => copyToClipboard(keyData.publicKeyHex, 'Public Key Hex')}
//                     className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
//                   >
//                     📋
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="text-sm font-medium text-gray-300">DER Format:</label>
//                 <div className="flex items-center gap-2 mt-1">
//                   <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
//                     {keyData.publicKeyDER}
//                   </code>
//                   <button
//                     onClick={() => copyToClipboard(keyData.publicKeyDER, 'Public Key DER')}
//                     className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
//                   >
//                     📋
//                   </button>
//                 </div>
//               </div>
              
//               <div>
//                 <label className="text-sm font-medium text-gray-300">Raw Public Key Coordinates:</label>
//                 <div className="mt-1 p-2 bg-gray-800 rounded border border-green-600 text-xs">
//                   <div className="break-all text-green-300">
//                     <span className="font-medium">X:</span> {keyData.publicKeyRaw.x}
//                   </div>
//                   <div className="break-all mt-1 text-green-300">
//                     <span className="font-medium">Y:</span> {keyData.publicKeyRaw.y}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </>
//       )}
//     </>
//   );
// };














































































































// import React, { useState, useEffect } from 'react';
// import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
// import { useWalletStore } from '../store/WalletStore';

// // Polyfill Buffer for browser environment
// if (typeof window !== 'undefined' && !window.Buffer) {
//   window.Buffer = {
//     from: (data: any, encoding?: string) => {
//       if (encoding === 'hex') {
//         const bytes = [];
//         for (let i = 0; i < data.length; i += 2) {
//           bytes.push(parseInt(data.substr(i, 2), 16));
//         }
//         return new Uint8Array(bytes);
//       } else if (typeof data === 'string') {
//         return new TextEncoder().encode(data);
//       }
//       return new Uint8Array(data);
//     },
//     alloc: (size: number) => new Uint8Array(size),
//     concat: (arrays: Uint8Array[]) => {
//       const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
//       const result = new Uint8Array(totalLength);
//       let offset = 0;
//       for (const arr of arrays) {
//         result.set(arr, offset);
//         offset += arr.length;
//       }
//       return result;
//     }
//   } as any;
// }

// export const Wallet: React.FC = () => {
//   const [inputKey, setInputKey] = useState<string>('');
//   const [error, setError] = useState<string>('');
//   const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  
//   const {
//     network,
//     keyData,
//     balance,
//     setKeyData,
//     setBalance,
//     updateContactSharedSecrets
//   } = useWalletStore();

//   // Generate random private key
//   const generateRandomKey = () => {
//     try {
//       let privKey;
//       try {
//         privKey = PrivateKey.fromRandom();
//       } catch (e) {
//         // Fallback: generate random 32 bytes and create private key
//         const randomBytes = new Uint8Array(32);
//         if (window.crypto && window.crypto.getRandomValues) {
//           window.crypto.getRandomValues(randomBytes);
//         } else {
//           // Very basic fallback for development
//           for (let i = 0; i < 32; i++) {
//             randomBytes[i] = Math.floor(Math.random() * 256);
//           }
//         }
//         const hexString = Array.from(randomBytes)
//           .map(b => b.toString(16).padStart(2, '0'))
//           .join('');
//         privKey = PrivateKey.fromHex(hexString);
//       }
      
//       setInputKey(privKey.toHex());
//       processPrivateKey(privKey);
//       setError('');
//     } catch (err) {
//       setError('Failed to generate random key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//       console.error('Error generating key:', err);
//     }
//   };

//   // Process user input private key
//   const importPrivateKey = () => {
//     if (!inputKey.trim()) {
//       setError('Please enter a private key');
//       return;
//     }

//     try {
//       let privKey: PrivateKey;
      
//       if (inputKey.startsWith('L') || inputKey.startsWith('K') || inputKey.startsWith('5')) {
//         privKey = PrivateKey.fromWif(inputKey.trim());
//       } else if (inputKey.length === 64) {
//         privKey = PrivateKey.fromHex(inputKey.trim());
//       } else {
//         throw new Error('Invalid private key format');
//       }

//       processPrivateKey(privKey);
//       setError('');
//     } catch (err) {
//       setError('Invalid private key format. Please enter a valid hex or WIF key.');
//     }
//   };

//   // Process private key and derive all formats
//   const processPrivateKey = (privKey: PrivateKey) => {
//     try {
//       const pubKey = privKey.toPublicKey();
      
//       const address = network === 'testnet' 
//         ? pubKey.toAddress('testnet').toString()
//         : pubKey.toAddress('mainnet').toString();

//       let xCoord = '';
//       let yCoord = '';
      
//       try {
//         if (pubKey.point && pubKey.point.x && pubKey.point.y) {
//           xCoord = pubKey.point.x.toString(16).padStart(64, '0');
//           yCoord = pubKey.point.y.toString(16).padStart(64, '0');
//         } else {
//           const pubKeyHex = pubKey.toString();
//           if (pubKeyHex.startsWith('02') || pubKeyHex.startsWith('03')) {
//             xCoord = pubKeyHex.slice(2);
//             yCoord = 'Compressed format - Y coordinate derived from X';
//           } else if (pubKeyHex.startsWith('04')) {
//             xCoord = pubKeyHex.slice(2, 66);
//             yCoord = pubKeyHex.slice(66, 130);
//           }
//         }
//       } catch (e) {
//         console.log('Could not extract raw coordinates:', e);
//         xCoord = 'Not available';
//         yCoord = 'Not available';
//       }

//       setKeyData({
//         privateKey: privKey,
//         publicKey: pubKey,
//         privateKeyHex: privKey.toHex(),
//         privateKeyWif: privKey.toWif(),
//         privateKeyBinary: privKey.toArray(),
//         publicKeyHex: pubKey.toString(),
//         publicKeyDER: Utils.toHex(pubKey.toDER()),
//         publicKeyRaw: { x: xCoord, y: yCoord },
//         address: address
//       });
      
//       updateContactSharedSecrets(privKey);
//     } catch (err) {
//       console.error('Error processing private key:', err);
//       setError('Error processing key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Check balance for address
//   const checkBalance = async (address: string) => {
//     if (!address) return;
    
//     setBalance({ ...balance, loading: true, error: null });
    
//     try {
//       const baseUrl = network === 'testnet' 
//         ? 'https://api.whatsonchain.com/v1/bsv/test'
//         : 'https://api.whatsonchain.com/v1/bsv/main';
      
//       const response = await fetch(`${baseUrl}/address/${address}/balance`);
      
//       if (!response.ok) {
//         throw new Error('Failed to fetch balance');
//       }
      
//       const data = await response.json();
      
//       setBalance({
//         confirmed: data.confirmed || 0,
//         unconfirmed: data.unconfirmed || 0,
//         loading: false,
//         error: null
//       });
//     } catch (error) {
//       console.error('Balance check error:', error);
//       setBalance({
//         ...balance,
//         loading: false,
//         error: 'Unable to fetch balance. Try again later.'
//       });
//     }
//   };

//   // Format satoshis to BSV
//   const formatBSV = (satoshis: number): string => {
//     const bsv = satoshis / 100000000;
//     return bsv.toFixed(8).replace(/\.?0+$/, '');
//   };

//   // Copy to clipboard function
//   const copyToClipboard = (text: string, label: string) => {
//     navigator.clipboard.writeText(text);
//     // You could add a toast notification here
//   };

//   // Update address and check balance when network changes
//   useEffect(() => {
//     if (keyData.publicKey) {
//       const address = network === 'testnet'
//         ? keyData.publicKey.toAddress('testnet').toString()
//         : keyData.publicKey.toAddress('mainnet').toString();
      
//       setKeyData({ ...keyData, address });
//       checkBalance(address);
//     }
//   }, [network]);

//   return (
//     <>
//       <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
//         <h2 className="text-xl font-semibold mb-4 text-white">Generate or Import Private Key</h2>
        
//         <div className="mb-4 flex gap-2">
//           <button
//             onClick={generateRandomKey}
//             className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Generate Random Private Key
//           </button>
//           <button
//             onClick={() => {
//               const testKey = '0000000000000000000000000000000000000000000000000000000000000001';
//               setInputKey(testKey);
//               importPrivateKey();
//             }}
//             className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
//             title="Use test key"
//           >
//             Test Key
//           </button>
//         </div>

//         <div className="flex flex-col sm:flex-row gap-2">
//           <input
//             type="text"
//             value={inputKey}
//             onChange={(e) => setInputKey(e.target.value)}
//             placeholder="Enter private key (hex or WIF format)"
//             className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
//           />
//           <button
//             onClick={importPrivateKey}
//             className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
//           >
//             Import Key
//           </button>
//         </div>

//         {error && (
//           <p className="mt-2 text-red-400 text-sm">{error}</p>
//         )}
//       </div>

//       {keyData.privateKey && (
//         <>
//           <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//             <h2 className="text-xl font-semibold mb-2 text-white">BSV Address (for Regular Transactions & 1Sat Ordinals)</h2>
//             <div className="flex items-center gap-2">
//               <code className="flex-1 p-3 bg-gray-800 rounded border border-blue-600 text-sm break-all text-blue-300">
//                 {keyData.address}
//               </code>
//               <button
//                 onClick={() => copyToClipboard(keyData.address, 'Address')}
//                 className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
//                 title="Copy address"
//               >
//                 📋
//               </button>
//             </div>
            
//             <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm text-gray-300">Balance:</span>
//                 <div className="flex items-center gap-2">
//                   {balance.loading ? (
//                     <span className="text-sm text-gray-400">Loading...</span>
//                   ) : balance.error ? (
//                     <span className="text-sm text-red-400">{balance.error}</span>
//                   ) : (
//                     <div className="text-right">
//                       <div className="text-sm font-medium text-white">
//                         {formatBSV(balance.confirmed)} BSV
//                       </div>
//                       {balance.unconfirmed > 0 && (
//                         <div className="text-xs text-yellow-400">
//                           +{formatBSV(balance.unconfirmed)} unconfirmed
//                         </div>
//                       )}
//                       <div className="text-xs text-gray-400">
//                         ({balance.confirmed.toLocaleString()} satoshis)
//                       </div>
//                     </div>
//                   )}
//                   <button
//                     onClick={() => checkBalance(keyData.address)}
//                     className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
//                     title="Refresh balance"
//                     disabled={balance.loading}
//                   >
//                     🔄
//                   </button>
//                 </div>
//               </div>
//             </div>
            
//             <p className="mt-2 text-sm text-gray-400">
//               Network: <span className="font-medium text-gray-300">{network}</span>
//             </p>
//           </div>

//           {/* 1Sat Ordinals Information Section */}
//           <div className="mb-6 p-4 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-700">
//             <h2 className="text-xl font-semibold mb-3 text-white">1Sat Ordinals Information</h2>
            
//             <div className="p-4 bg-gray-800 rounded-lg space-y-3">
//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">Same Address for Everything</h3>
//                   <p className="text-sm text-gray-300">
//                     1Sat Ordinals uses standard P2PKH addresses - the same address shown above works for both regular BSV transactions and ordinal inscriptions.
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">How It Works</h3>
//                   <p className="text-sm text-gray-300">
//                     Inscriptions are created by embedding data in transaction outputs that send 1 satoshi to your address. The inscription data is stored in the transaction script.
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-start gap-3">
//                 <div className="mt-1">
//                   <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
//                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="flex-1">
//                   <h3 className="font-medium text-purple-300 mb-1">Managing Your Ordinals</h3>
//                   <p className="text-sm text-gray-300">
//                     Keep track of inscription transaction IDs. Use ordinals-compatible wallets or indexers to view and manage your inscriptions. Each inscription is tied to a specific satoshi at your address.
//                   </p>
//                 </div>
//               </div>
//             </div>

//             <div className="mt-4 p-3 bg-purple-800 bg-opacity-30 rounded-lg border border-purple-600">
//               <p className="text-xs text-purple-300">
//                 <span className="font-semibold">Pro Tip:</span> When receiving ordinals, make sure the sender uses your address above. The inscription will appear as a 1 satoshi UTXO with embedded data.
//               </p>
//             </div>
//           </div>

//           <div className="mb-6 p-4 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-xl font-semibold text-white">Private Key Formats</h2>
//               <button
//                 onClick={() => setShowPrivateKey(!showPrivateKey)}
//                 className="text-sm text-red-400 hover:text-red-300 font-medium"
//               >
//                 {showPrivateKey ? 'Hide' : 'Show'} Private Keys
//               </button>
//             </div>
            
//             {showPrivateKey && (
//               <div className="space-y-3">
//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Hex Format:</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
//                       {keyData.privateKeyHex}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(keyData.privateKeyHex, 'Private Key Hex')}
//                       className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">WIF Format:</label>
//                   <div className="flex items-center gap-2 mt-1">
//                     <code className="flex-1 p-2 bg-gray-800 rounded border border-red-600 text-xs break-all text-red-300">
//                       {keyData.privateKeyWif}
//                     </code>
//                     <button
//                       onClick={() => copyToClipboard(keyData.privateKeyWif, 'Private Key WIF')}
//                       className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
//                     >
//                       📋
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-sm font-medium text-gray-300">Binary Format (first 10 bytes):</label>
//                   <code className="block mt-1 p-2 bg-gray-800 rounded border border-red-600 text-xs text-red-300">
//                     [{keyData.privateKeyBinary.slice(0, 10).join(', ')}...]
//                   </code>
//                 </div>
//               </div>
//             )}
            
//             <p className="mt-3 text-xs text-red-400 font-medium">
//               ⚠️ Warning: Never share your private key with anyone!
//             </p>
//           </div>

//           <div className="mb-6 p-4 bg-green-900 bg-opacity-20 rounded-lg border border-green-700">
//             <h2 className="text-xl font-semibold mb-4 text-white">Public Key Formats</h2>
            
//             <div className="space-y-3">
//               <div>
//                 <label className="text-sm font-medium text-gray-300">Hex Format (Compressed):</label>
//                 <div className="flex items-center gap-2 mt-1">
//                   <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
//                     {keyData.publicKeyHex}
//                   </code>
//                   <button
//                     onClick={() => copyToClipboard(keyData.publicKeyHex, 'Public Key Hex')}
//                     className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
//                   >
//                     📋
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="text-sm font-medium text-gray-300">DER Format:</label>
//                 <div className="flex items-center gap-2 mt-1">
//                   <code className="flex-1 p-2 bg-gray-800 rounded border border-green-600 text-xs break-all text-green-300">
//                     {keyData.publicKeyDER}
//                   </code>
//                   <button
//                     onClick={() => copyToClipboard(keyData.publicKeyDER, 'Public Key DER')}
//                     className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
//                   >
//                     📋
//                   </button>
//                 </div>
//               </div>
              
//               <div>
//                 <label className="text-sm font-medium text-gray-300">Raw Public Key Coordinates:</label>
//                 <div className="mt-1 p-2 bg-gray-800 rounded border border-green-600 text-xs">
//                   <div className="break-all text-green-300">
//                     <span className="font-medium">X:</span> {keyData.publicKeyRaw.x}
//                   </div>
//                   <div className="break-all mt-1 text-green-300">
//                     <span className="font-medium">Y:</span> {keyData.publicKeyRaw.y}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </>
//       )}
//     </>
//   );
// };
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
import { useWalletStore } from '../components/wallet2/store/WalletStore';
import { 
  AlertCircle,
  Check,
  X,
  Plus,
  FolderOpen,
  MapPin,
  Plane
} from 'lucide-react';

// Import tab components
import { NewEntry } from './NewEntry';
import { ExistingEntry } from './ExistingEntry';
import { PinEntry } from './PinEntry';
import { TravelEntry } from './TravelEntry';
import { LogOutExit } from './LogOutExit';

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

// Complete Vault Structure
interface MetadataVault {
  version: string;
  encrypted: boolean;
  timestamp: number;
  blogKeys: KeyHistory;
  apiKeys: {
    [service: string]: {
      current: string;
      history: Array<{
        key: string;
        added: number;
        revoked?: number;
        reason?: string;
      }>;
    };
  };
  contacts: Array<{
    id: string;
    name: string;
    publicKeyHex?: string;
    xpub?: string;
    address?: string;
    sharedSecret?: string;
    added: number;
    lastUsed?: number;
    tags?: string[];
  }>;
  sessionData: {
    lastLogout: number;
    autoBackup: boolean;
    backupCount: number;
  };
  transactions?: Array<{
    txid: string;
    output_index: number;
    amount: number;
    address: string;
    block_height?: number;
    raw_tx_hex?: string;
    merkle_proof?: string;
    timestamp: number;
    type: 'send' | 'receive' | 'ordinal';
  }>;
  profile?: {
    name: string;
    username: string;
    createdAt: number;
  };
}

// Encrypted File Structure
interface EncryptedVault {
  version: '1.0';
  algorithm: 'ECIES-AES256-GCM';
  encrypted: true;
  timestamp: number;
  ephemeralPublicKey: string;
  ciphertext: string;
  mac: string;
  metadata: {
    address: string;
    network: 'mainnet' | 'testnet';
    backupNumber: number;
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
  const [activeTab, setActiveTab] = useState<'new' | 'existing' | 'pin-lock' | 'travel-lock'>('new');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [vaultMessage, setVaultMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isVaultDragging, setIsVaultDragging] = useState(false);
  const [hasEntered, setHasEntered] = useState(false); // Track if user has entered wallet
  
  // New tab state management
  const [masterKeyLocked, setMasterKeyLocked] = useState(false);
  const [productionKeysLocked, setProductionKeysLocked] = useState(false);
  
  // Existing tab state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingMasterKeyEntered, setExistingMasterKeyEntered] = useState(false);
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<MetadataVault['apiKeys']>({
    whatsOnChain: {
      current: '',
      history: []
    },
    mapbox: {
      current: '',
      history: []
    }
  });
  
  // Wallet Store
  const {
    network,
    setNetwork,
    keyData,
    setKeyData,
    balance,
    setBalance,
    setBlogKey,
    updateContactSharedSecrets,
    contacts,
    setContacts,
    blogKeyHistory
  } = useWalletStore();
  
  // Private Key States
  const [inputKey, setInputKey] = useState<string>('');
  const [existingInputKey, setExistingInputKey] = useState<string>('');
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
  const [versionLabel, setVersionLabel] = useState<string>('');
  
  // File Upload
  const vaultFileInputRef = useRef<HTMLInputElement>(null);

  // Sync blog key data with Wallet.tsx on mount and when blog keys change
  useEffect(() => {
    const storedBlogKeyHistory = localStorage.getItem('blogKeyHistory');
    if (storedBlogKeyHistory && Object.keys(keyHistory.versions).length === 0) {
      try {
        const parsedHistory = JSON.parse(storedBlogKeyHistory);
        setKeyHistory(parsedHistory);
        
        if (parsedHistory.currentVersion > 0) {
          const currentBlogKey = parsedHistory.versions[parsedHistory.currentVersion];
          if (currentBlogKey) {
            setBlogKeyData(currentBlogKey);
            setSelectedVersion(parsedHistory.currentVersion);
          }
        }
      } catch (e) {
        console.error('Failed to load blog key history from localStorage');
      }
    }
  }, []);

  // Update localStorage whenever keyHistory changes to keep Wallet.tsx in sync
  useEffect(() => {
    if (Object.keys(keyHistory.versions).length > 0) {
      localStorage.setItem('blogKeyHistory', JSON.stringify(keyHistory));
    }
  }, [keyHistory]);

  // Reset process for New tab
  useEffect(() => {
    setMounted(true);
    // Check if user has already entered
    const walletEntered = localStorage.getItem('walletEntered');
    if (walletEntered === 'true') {
      setHasEntered(true);
    }
    return () => setMounted(false);
  }, []);

  // Reset process for New tab
  const resetNewProcess = () => {
    setInputKey('');
    setKeyData({
      privateKey: null,
      publicKey: null,
      privateKeyHex: '',
      privateKeyWif: '',
      privateKeyBinary: [],
      publicKeyHex: '',
      publicKeyDER: '',
      publicKeyRaw: { x: '', y: '' },
      address: ''
    });
    setBalance({
      confirmed: 0,
      unconfirmed: 0,
      loading: false,
      error: null
    });
    setBlogKeyData(null);
    setKeyHistory({
      currentVersion: 0,
      versions: {},
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now(),
        totalVersions: 0
      }
    });
    setSelectedVersion(0);
    setMasterKeyLocked(false);
    setProductionKeysLocked(false);
    setApiKeys({
      whatsOnChain: { current: '', history: [] },
      mapbox: { current: '', history: [] }
    });
    setVaultMessage(null);
    setKeyError('');
    setVersionLabel('');
  };

  // Reset process for Existing tab
  const resetExistingProcess = () => {
    setExistingInputKey('');
    setUploadedFile(null);
    setExistingMasterKeyEntered(false);
    setKeyData({
      privateKey: null,
      publicKey: null,
      privateKeyHex: '',
      privateKeyWif: '',
      privateKeyBinary: [],
      publicKeyHex: '',
      publicKeyDER: '',
      publicKeyRaw: { x: '', y: '' },
      address: ''
    });
    setBlogKeyData(null);
    setKeyHistory({
      currentVersion: 0,
      versions: {},
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now(),
        totalVersions: 0
      }
    });
    setVaultMessage(null);
    setKeyError('');
    if (vaultFileInputRef.current) {
      vaultFileInputRef.current.value = '';
    }
  };

  // ECIES Encryption Implementation
  const encryptWithECIES = async (data: string, privateKeyHex: string): Promise<EncryptedVault> => {
    try {
      const ephemeralPrivKey = PrivateKey.fromRandom();
      const ephemeralPubKey = ephemeralPrivKey.toPublicKey();
      const recipientPrivKey = PrivateKey.fromHex(privateKeyHex);
      const recipientPubKey = recipientPrivKey.toPublicKey();
      
      const sharedSecret = ephemeralPrivKey.deriveSharedSecret(recipientPubKey);
      const sharedSecretBytes = Buffer.from(sharedSecret.toString(), 'hex');
      
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        sharedSecretBytes,
        'HKDF',
        false,
        ['deriveBits']
      );
      
      const encryptionKeyBits = await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          salt: salt,
          info: new TextEncoder().encode('vault-encryption'),
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );
      
      const encryptionKey = await crypto.subtle.importKey(
        'raw',
        encryptionKeyBits,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        encryptionKey,
        new TextEncoder().encode(data)
      );
      
      const macKey = await crypto.subtle.importKey(
        'raw',
        encryptionKeyBits,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const mac = await crypto.subtle.sign(
        'HMAC',
        macKey,
        encrypted
      );
      
      const combinedCiphertext = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combinedCiphertext.set(salt, 0);
      combinedCiphertext.set(iv, salt.length);
      combinedCiphertext.set(new Uint8Array(encrypted), salt.length + iv.length);
      
      return {
        version: '1.0',
        algorithm: 'ECIES-AES256-GCM',
        encrypted: true,
        timestamp: Date.now(),
        ephemeralPublicKey: ephemeralPubKey.toString(),
        ciphertext: btoa(String.fromCharCode(...combinedCiphertext)),
        mac: btoa(String.fromCharCode(...new Uint8Array(mac))),
        metadata: {
          address: keyData.address || '',
          network: network,
          backupNumber: parseInt(localStorage.getItem('backupCount') || '0') + 1
        }
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt vault: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // ECIES Decryption Implementation
  const decryptWithECIES = async (encryptedVault: EncryptedVault, privateKeyHex: string): Promise<MetadataVault> => {
    try {
      const ephemeralPubKey = PublicKey.fromString(encryptedVault.ephemeralPublicKey);
      const recipientPrivKey = PrivateKey.fromHex(privateKeyHex);
      
      const sharedSecret = recipientPrivKey.deriveSharedSecret(ephemeralPubKey);
      const sharedSecretBytes = Buffer.from(sharedSecret.toString(), 'hex');
      
      const combinedCiphertext = new Uint8Array(
        atob(encryptedVault.ciphertext).split('').map(c => c.charCodeAt(0))
      );
      
      const salt = combinedCiphertext.slice(0, 32);
      const iv = combinedCiphertext.slice(32, 44);
      const encrypted = combinedCiphertext.slice(44);
      
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        sharedSecretBytes,
        'HKDF',
        false,
        ['deriveBits']
      );
      
      const decryptionKeyBits = await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          salt: salt,
          info: new TextEncoder().encode('vault-encryption'),
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );
      
      const decryptionKey = await crypto.subtle.importKey(
        'raw',
        decryptionKeyBits,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      const macKey = await crypto.subtle.importKey(
        'raw',
        decryptionKeyBits,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      
      const macBytes = new Uint8Array(
        atob(encryptedVault.mac).split('').map(c => c.charCodeAt(0))
      );
      
      const isValid = await crypto.subtle.verify(
        'HMAC',
        macKey,
        macBytes,
        encrypted
      );
      
      if (!isValid) {
        throw new Error('MAC verification failed - data may be tampered');
      }
      
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        decryptionKey,
        encrypted
      );
      
      const decryptedText = new TextDecoder().decode(decrypted);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt vault: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Build complete vault from current state
  const buildMetadataVault = (): MetadataVault => {
    return {
      version: '1.0',
      encrypted: false,
      timestamp: Date.now(),
      blogKeys: keyHistory,
      apiKeys: apiKeys,
      contacts: (contacts || []).map(contact => ({
        id: contact.id,
        name: contact.name,
        publicKeyHex: contact.publicKeyHex,
        address: '',
        sharedSecret: contact.sharedSecret,
        added: Date.now(),
        tags: []
      })),
      sessionData: {
        lastLogout: Date.now(),
        autoBackup: true,
        backupCount: parseInt(localStorage.getItem('backupCount') || '0')
      }
    };
  };

  // Download encrypted vault and enter
  const downloadVaultAndEnter = async (isLogout: boolean = false) => {
    if (!keyData.privateKeyHex || !blogKeyData) {
      if (!isLogout) {
        setVaultMessage({ type: 'error', text: 'Complete all steps before entering' });
      }
      return;
    }
    
    setIsEncrypting(true);
    if (!isLogout) {
      setVaultMessage({ type: 'info', text: 'Creating encrypted backup...' });
    }
    
    try {
      const vault = buildMetadataVault();
      const encryptedVault = await encryptWithECIES(JSON.stringify(vault), keyData.privateKeyHex);
      
      const backupCount = parseInt(localStorage.getItem('backupCount') || '0') + 1;
      localStorage.setItem('backupCount', backupCount.toString());
      
      // Determine file name based on context
      let filePrefix = 'vault';
      if (isLogout) {
        filePrefix = 'vault-logout';
      } else if (activeTab === 'new') {
        filePrefix = 'vault-New';
      } else if (activeTab === 'existing') {
        filePrefix = 'vault-Existing';
      }
      
      const blob = new Blob([JSON.stringify(encryptedVault, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filePrefix}-${network}-${Date.now()}.vault`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (!isLogout) {
        localStorage.setItem('walletEntered', 'true');
        localStorage.setItem('enteredAt', Date.now().toString());
        setHasEntered(true);
        
        setVaultMessage({ type: 'success', text: 'Vault backup created! Entering wallet...' });
        
        // Close the dialog after a delay
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 1500);
      }
    } catch (error) {
      if (!isLogout) {
        setVaultMessage({ type: 'error', text: 'Failed to create backup: ' + (error instanceof Error ? error.message : 'Unknown error') });
      }
      throw error; // Re-throw for logout handler
    } finally {
      setIsEncrypting(false);
    }
  };

  // Handle logout - create backup and clear all sensitive data
  const handleLogout = async () => {
    try {
      // First create and download the backup
      await downloadVaultAndEnter(true);
      
      // Clear all sensitive data from state
      setInputKey('');
      setExistingInputKey('');
      setKeyData({
        privateKey: null,
        publicKey: null,
        privateKeyHex: '',
        privateKeyWif: '',
        privateKeyBinary: [],
        publicKeyHex: '',
        publicKeyDER: '',
        publicKeyRaw: { x: '', y: '' },
        address: ''
      });
      setBalance({
        confirmed: 0,
        unconfirmed: 0,
        loading: false,
        error: null
      });
      setBlogKeyData(null);
      setKeyHistory({
        currentVersion: 0,
        versions: {},
        metadata: {
          createdAt: Date.now(),
          lastModified: Date.now(),
          totalVersions: 0
        }
      });
      setSelectedVersion(0);
      setMasterKeyLocked(false);
      setProductionKeysLocked(false);
      setApiKeys({
        whatsOnChain: { current: '', history: [] },
        mapbox: { current: '', history: [] }
      });
      setContacts([]);
      setUploadedFile(null);
      setExistingMasterKeyEntered(false);
      setHasEntered(false);
      
      // Clear localStorage
      localStorage.removeItem('walletEntered');
      localStorage.removeItem('enteredAt');
      localStorage.removeItem('blogKeyHistory');
      localStorage.removeItem('currentFullAccessBundle');
      
      // Reset vault file input if it exists
      if (vaultFileInputRef.current) {
        vaultFileInputRef.current.value = '';
      }
      
      // Reset to new tab
      setActiveTab('new');
      setVaultMessage({ type: 'success', text: 'Logged out successfully. Vault backup downloaded.' });
      
      // Clear message after delay
      setTimeout(() => {
        setVaultMessage(null);
      }, 3000);
    } catch (error) {
      throw error; // Let LogOutExit component handle the error
    }
  };

  // Handle existing tab enter
  const handleExistingEnter = async () => {
    if (!uploadedFile || !existingInputKey) {
      setVaultMessage({ type: 'error', text: 'Please provide both master key and vault file' });
      return;
    }
    
    setIsDecrypting(true);
    setVaultMessage({ type: 'info', text: 'Decrypting vault...' });
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const encryptedVault = JSON.parse(content) as EncryptedVault;
        
        if (!encryptedVault.encrypted || encryptedVault.algorithm !== 'ECIES-AES256-GCM') {
          throw new Error('Invalid encrypted vault file');
        }
        
        let privateKeyHex = existingInputKey;
        try {
          if (existingInputKey.startsWith('L') || existingInputKey.startsWith('K') || existingInputKey.startsWith('5')) {
            privateKeyHex = PrivateKey.fromWif(existingInputKey).toHex();
          } else if (existingInputKey.length !== 64) {
            throw new Error('Invalid private key format');
          }
        } catch {
          throw new Error('Invalid private key format');
        }
        
        const decryptedVault = await decryptWithECIES(encryptedVault, privateKeyHex);
        
        const privKey = PrivateKey.fromHex(privateKeyHex);
        processPrivateKey(privKey);
        
        setKeyHistory(decryptedVault.blogKeys);
        setApiKeys(decryptedVault.apiKeys);
        
        if (decryptedVault.blogKeys.currentVersion > 0) {
          const latestKey = decryptedVault.blogKeys.versions[decryptedVault.blogKeys.currentVersion];
          if (latestKey) {
            setBlogKeyData(latestKey);
            setSelectedVersion(decryptedVault.blogKeys.currentVersion);
            
            if (setBlogKey) {
              setBlogKey(latestKey);
              
              const bundleObject = {
                tier: 5,
                keys: [
                  latestKey.keys.tier1,
                  latestKey.keys.tier2,
                  latestKey.keys.tier3,
                  latestKey.keys.tier4,
                  latestKey.keys.tier5
                ],
                version: latestKey.version,
                createdAt: latestKey.generatedAt
              };
              
              const fullAccessBundle = btoa(JSON.stringify(bundleObject));
              
              if (window.localStorage) {
                localStorage.setItem('blogKeyHistory', JSON.stringify(decryptedVault.blogKeys));
                localStorage.setItem('currentFullAccessBundle', fullAccessBundle);
              }
            }
          }
        }
        
        if (decryptedVault.contacts && decryptedVault.contacts.length > 0) {
          const restoredContacts = decryptedVault.contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            publicKeyHex: contact.publicKeyHex || '',
            sharedSecret: contact.sharedSecret,
            blogAccessLevel: 0 as const,
            blogKeySegment: undefined
          }));
          setContacts(restoredContacts);
        }
        
        setVaultMessage({ 
          type: 'success', 
          text: `Vault decrypted successfully! Entering wallet...` 
        });
        
        localStorage.setItem('walletEntered', 'true');
        localStorage.setItem('enteredAt', Date.now().toString());
        setHasEntered(true);
        
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 1500);
      } catch (error) {
        setVaultMessage({ 
          type: 'error', 
          text: 'Failed to decrypt vault: ' + (error instanceof Error ? error.message : 'Unknown error') 
        });
      } finally {
        setIsDecrypting(false);
      }
    };
    
    reader.onerror = () => {
      setVaultMessage({ type: 'error', text: 'Failed to read vault file' });
      setIsDecrypting(false);
    };
    
    reader.readAsText(uploadedFile);
  };

  // Check if requirements are met for New tab
  const canEnterNew = () => {
    return keyData.privateKeyHex !== '' && blogKeyData !== null;
  };

  // Check if requirements are met for Existing tab
  const canEnterExisting = () => {
    return existingMasterKeyEntered && uploadedFile !== null;
  };

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
    if (masterKeyLocked) return;
    
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
      setMasterKeyLocked(true);
      setKeyError('');
    } catch (err) {
      setKeyError('Failed to generate random key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Import private key
  const importPrivateKey = () => {
    if (masterKeyLocked) return;
    
    if (!inputKey.trim()) {
      setKeyError('Please enter a private key');
      return;
    }

    const hexRegex = /^[0-9a-fA-F]{64}$/;
    const wifRegex = /^[LK5][1-9A-HJ-NP-Za-km-z]{50,51}$/;
    
    if (!hexRegex.test(inputKey.trim()) && !wifRegex.test(inputKey.trim())) {
      setKeyError('Invalid private key format. Must be exactly 64 hex characters or valid WIF format.');
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
      setMasterKeyLocked(true);
      setKeyError('');
    } catch (err) {
      setKeyError('Invalid private key. Please enter a valid hex (64 chars) or WIF key.');
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

      const newKeyData = {
        privateKey: privKey,
        publicKey: pubKey,
        privateKeyHex: privKey.toHex(),
        privateKeyWif: privKey.toWif(),
        privateKeyBinary: Array.from(privKey.toArray()),
        publicKeyHex: pubKey.toString(),
        publicKeyDER: Utils.toHex(pubKey.toDER()),
        publicKeyRaw: { x: xCoord, y: yCoord },
        address: address
      };
      
      setKeyData(newKeyData);
      updateContactSharedSecrets(privKey);
      checkBalance(address);
    } catch (err) {
      setKeyError('Error processing key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Create Full Access Bundle string
  const createFullAccessBundle = (blogKeyData: BlogKeyData): string => {
    const bundleObject = {
      tier: 5,
      keys: [
        blogKeyData.keys.tier1,
        blogKeyData.keys.tier2,
        blogKeyData.keys.tier3,
        blogKeyData.keys.tier4,
        blogKeyData.keys.tier5
      ],
      version: blogKeyData.version,
      createdAt: blogKeyData.generatedAt
    };
    
    return btoa(JSON.stringify(bundleObject));
  };

  // Generate hierarchical blog keys
  const generateHierarchicalBlogKeys = () => {
    if (productionKeysLocked) return;
    
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
        label: versionLabel || `Production Keys ${keyHistory.currentVersion + 1}`
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
      setProductionKeysLocked(true);
      
      // Make sure we update WalletStore and localStorage
      if (setBlogKey) {
        setBlogKey(newBlogKeyData);
      }
      
      // Save to localStorage for Wallet.tsx to access
      localStorage.setItem('blogKeyHistory', JSON.stringify(updatedHistory));
      
      // Create and save the Full Access Bundle
      const fullAccessBundle = createFullAccessBundle(newBlogKeyData);
      localStorage.setItem('currentFullAccessBundle', fullAccessBundle);
      
      // Also store a flag that new keys are available for Wallet.tsx
      localStorage.setItem('newBlogKeysAvailable', 'true');
      
      setVaultMessage({ type: 'success', text: 'Production keys generated successfully!' });
      setVersionLabel('');
    } catch (err) {
      setVaultMessage({ type: 'error', text: 'Failed to generate keys: ' + (err instanceof Error ? err.message : 'Unknown error') });
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

  // Handle file upload for existing tab
  const handleFileUpload = (file: File) => {
    if (uploadedFile) return;
    setUploadedFile(file);
    setVaultMessage({ type: 'info', text: 'Vault file loaded. Enter master key to decrypt.' });
  };

  // Drag and drop handlers
  const handleVaultDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      setIsVaultDragging(true);
    }
  };

  const handleVaultDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsVaultDragging(false);
  };

  const handleVaultDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsVaultDragging(false);
    
    if (uploadedFile) return;
    
    const files = Array.from(e.dataTransfer.files);
    const vaultFile = files.find(file => 
      file.name.endsWith('.vault') || 
      file.name.endsWith('.json') ||
      file.type === 'application/json'
    );
    
    if (vaultFile) {
      handleFileUpload(vaultFile);
    } else {
      setVaultMessage({ type: 'error', text: 'Please drop a valid vault file (.vault or .json)' });
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
        className="relative bg-zinc-900 rounded-lg p-6 w-full max-w-[900px] max-h-[90vh] overflow-y-auto mx-4 border border-zinc-700"
        style={{ zIndex: 999999 }}
      >
        {/* Header with Network Selector */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Wallet Configuration</h2>
          <div className="flex items-center gap-3">
            {/* Logout Button */}
            <LogOutExit 
              isActive={hasEntered && keyData.privateKeyHex !== '' && blogKeyData !== null}
              onLogout={handleLogout}
              network={network}
            />
            
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
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'new'
                ? 'bg-sky-500 text-white'
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            <Plus size={16} />
            New
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'existing'
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            <FolderOpen size={16} />
            Existing
          </button>
          <button
            onClick={() => setActiveTab('pin-lock')}
            disabled
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'pin-lock'
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            <MapPin size={16} />
            Pin-Lock
            <span className="text-xs">(Soon)</span>
          </button>
          <button
            onClick={() => setActiveTab('travel-lock')}
            disabled
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'travel-lock'
                ? 'bg-indigo-500 text-white'
                : 'bg-zinc-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            <Plane size={16} />
            Travel-Lock
            <span className="text-xs">(Soon)</span>
          </button>
        </div>

        {/* Status Messages */}
        {vaultMessage && (
          <div className={`mb-4 p-3 rounded flex items-center gap-2 ${
            vaultMessage.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-700' :
            vaultMessage.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-700' :
            'bg-blue-900/30 text-blue-400 border border-blue-700'
          }`}>
            {vaultMessage.type === 'success' && <Check size={16} />}
            {vaultMessage.type === 'error' && <AlertCircle size={16} />}
            {vaultMessage.text}
          </div>
        )}

        {/* Render active tab component */}
        {activeTab === 'new' && (
          <NewEntry
            masterKeyLocked={masterKeyLocked}
            productionKeysLocked={productionKeysLocked}
            inputKey={inputKey}
            keyError={keyError}
            versionLabel={versionLabel}
            apiKeys={apiKeys}
            keyData={keyData}
            balance={balance}
            blogKeyData={blogKeyData}
            selectedVersion={selectedVersion}
            showPrivateKey={showPrivateKey}
            vaultMessage={vaultMessage}
            isEncrypting={isEncrypting}
            network={network}
            setInputKey={setInputKey}
            setVersionLabel={setVersionLabel}
            setApiKeys={setApiKeys}
            setShowPrivateKey={setShowPrivateKey}
            generateRandomKey={generateRandomKey}
            importPrivateKey={importPrivateKey}
            generateHierarchicalBlogKeys={generateHierarchicalBlogKeys}
            checkBalance={checkBalance}
            copyToClipboard={copyToClipboard}
            formatBSV={formatBSV}
            createFullAccessBundle={createFullAccessBundle}
            downloadVaultAndEnter={() => downloadVaultAndEnter(false)}
            canEnterNew={canEnterNew}
            resetNewProcess={resetNewProcess}
          />
        )}

        {activeTab === 'existing' && (
          <ExistingEntry
            existingInputKey={existingInputKey}
            existingMasterKeyEntered={existingMasterKeyEntered}
            uploadedFile={uploadedFile}
            isDecrypting={isDecrypting}
            isVaultDragging={isVaultDragging}
            blogKeyData={blogKeyData}
            keyData={keyData}
            keyHistory={keyHistory}
            selectedVersion={selectedVersion}
            showPrivateKey={showPrivateKey}
            setExistingInputKey={setExistingInputKey}
            setExistingMasterKeyEntered={setExistingMasterKeyEntered}
            setShowPrivateKey={setShowPrivateKey}
            handleExistingEnter={handleExistingEnter}
            canEnterExisting={canEnterExisting}
            resetExistingProcess={resetExistingProcess}
            handleFileUpload={handleFileUpload}
            handleVaultDragOver={handleVaultDragOver}
            handleVaultDragLeave={handleVaultDragLeave}
            handleVaultDrop={handleVaultDrop}
            copyToClipboard={copyToClipboard}
            createFullAccessBundle={createFullAccessBundle}
            vaultFileInputRef={vaultFileInputRef}
          />
        )}

        {activeTab === 'pin-lock' && <PinEntry />}
        {activeTab === 'travel-lock' && <TravelEntry />}
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    dialogContent,
    document.body
  );
};

export default EntryDialog;



// Proir to the refractoring 

// import React, { useState, useRef, useEffect } from 'react';
// import ReactDOM from 'react-dom';
// import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
// import { useWalletStore } from '../components/wallet2/store/WalletStore';
// import { 
//   Key, 
//   Shield, 
//   Download, 
//   Upload, 
//   Copy, 
//   RefreshCw,
//   AlertCircle,
//   Check,
//   ChevronDown,
//   ChevronUp,
//   X,
//   LogOut,
//   Lock,
//   Unlock,
//   Save,
//   FileKey,
//   Plus,
//   FolderOpen,
//   MapPin,
//   Plane,
//   RotateCcw,
//   FileCheck
// } from 'lucide-react';

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

// // Types
// interface SecureBlogKeys {
//   tier1: string;
//   tier2: string;
//   tier3: string;
//   tier4: string;
//   tier5: string;
// }

// interface BlogKeyData {
//   keys: SecureBlogKeys;
//   accessBundles: {
//     tier1: string[];
//     tier2: string[];
//     tier3: string[];
//     tier4: string[];
//     tier5: string[];
//   };
//   version: string;
//   generatedAt: number;
//   label?: string;
// }

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

// // Complete Vault Structure
// interface MetadataVault {
//   version: string;
//   encrypted: boolean;
//   timestamp: number;
  
//   // Stage 1: Blog Keys
//   blogKeys: KeyHistory;
  
//   // Stage 2: API Keys & Contacts
//   apiKeys: {
//     [service: string]: {
//       current: string;
//       history: Array<{
//         key: string;
//         added: number;
//         revoked?: number;
//         reason?: string;
//       }>;
//     };
//   };
  
//   contacts: Array<{
//     id: string;
//     name: string;
//     publicKeyHex?: string;
//     xpub?: string;
//     address?: string;
//     sharedSecret?: string;
//     added: number;
//     lastUsed?: number;
//     tags?: string[];
//   }>;
  
//   // Stage 3: Session Data
//   sessionData: {
//     lastLogout: number;
//     autoBackup: boolean;
//     backupCount: number;
//   };
  
//   // Stage 4: Transaction History (placeholder for future)
//   transactions?: Array<{
//     txid: string;
//     output_index: number;
//     amount: number;
//     address: string;
//     block_height?: number;
//     raw_tx_hex?: string;
//     merkle_proof?: string;
//     timestamp: number;
//     type: 'send' | 'receive' | 'ordinal';
//   }>;
  
//   // User Profile
//   profile?: {
//     name: string;
//     username: string;
//     createdAt: number;
//   };
// }

// // Encrypted File Structure
// interface EncryptedVault {
//   version: '1.0';
//   algorithm: 'ECIES-AES256-GCM';
//   encrypted: true;
//   timestamp: number;
//   ephemeralPublicKey: string;
//   ciphertext: string;
//   mac: string;
//   metadata: {
//     address: string;
//     network: 'mainnet' | 'testnet';
//     backupNumber: number;
//   };
// }

// interface EntryDialogProps {
//   isOpen: boolean;
//   onClose: () => void;
// }

// export const EntryDialog: React.FC<EntryDialogProps> = ({ 
//   isOpen, 
//   onClose
// }) => {
//   const [mounted, setMounted] = useState(false);
//   const [activeTab, setActiveTab] = useState<'new' | 'existing' | 'pin-lock' | 'travel-lock'>('new');
//   const [showPrivateKey, setShowPrivateKey] = useState(false);
//   const [isEncrypting, setIsEncrypting] = useState(false);
//   const [isDecrypting, setIsDecrypting] = useState(false);
//   const [vaultMessage, setVaultMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
//   const [isVaultDragging, setIsVaultDragging] = useState(false);
  
//   // New tab state management
//   const [masterKeyLocked, setMasterKeyLocked] = useState(false);
//   const [productionKeysLocked, setProductionKeysLocked] = useState(false);
  
//   // Existing tab state
//   const [uploadedFile, setUploadedFile] = useState<File | null>(null);
//   const [existingMasterKeyEntered, setExistingMasterKeyEntered] = useState(false);
  
//   // API Keys state
//   const [apiKeys, setApiKeys] = useState<MetadataVault['apiKeys']>({
//     whatsOnChain: {
//       current: '',
//       history: []
//     },
//     mapbox: {
//       current: '',
//       history: []
//     }
//   });
  
//   // Wallet Store
//   const {
//     network,
//     setNetwork,
//     keyData,
//     setKeyData,
//     balance,
//     setBalance,
//     setBlogKey,
//     updateContactSharedSecrets,
//     contacts,
//     setContacts,
//     blogKeyHistory
//   } = useWalletStore();
  
//   // Private Key States
//   const [inputKey, setInputKey] = useState<string>('');
//   const [existingInputKey, setExistingInputKey] = useState<string>('');
//   const [keyError, setKeyError] = useState<string>('');
  
//   // Blog Key States
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
//   const [versionLabel, setVersionLabel] = useState<string>('');
  
//   // File Upload
//   const vaultFileInputRef = useRef<HTMLInputElement>(null);

//   // Sync blog key data with Wallet.tsx on mount and when blog keys change
//   useEffect(() => {
//     // Check if there's existing blog key data in localStorage from Wallet.tsx
//     const storedBlogKeyHistory = localStorage.getItem('blogKeyHistory');
//     if (storedBlogKeyHistory && Object.keys(keyHistory.versions).length === 0) {
//       try {
//         const parsedHistory = JSON.parse(storedBlogKeyHistory);
//         setKeyHistory(parsedHistory);
        
//         // Load the current version
//         if (parsedHistory.currentVersion > 0) {
//           const currentBlogKey = parsedHistory.versions[parsedHistory.currentVersion];
//           if (currentBlogKey) {
//             setBlogKeyData(currentBlogKey);
//             setSelectedVersion(parsedHistory.currentVersion);
//           }
//         }
//       } catch (e) {
//         console.error('Failed to load blog key history from localStorage');
//       }
//     }
//   }, []);

//   // Update localStorage whenever keyHistory changes to keep Wallet.tsx in sync
//   useEffect(() => {
//     if (Object.keys(keyHistory.versions).length > 0) {
//       localStorage.setItem('blogKeyHistory', JSON.stringify(keyHistory));
//     }
//   }, [keyHistory]);

//   // Reset process for New tab
//   useEffect(() => {
//     setMounted(true);
//     return () => setMounted(false);
//   }, []);

//   // Reset process for New tab
//   const resetNewProcess = () => {
//     setInputKey('');
//     setKeyData({
//       privateKey: null,
//       publicKey: null,
//       privateKeyHex: '',
//       privateKeyWif: '',
//       privateKeyBinary: [],
//       publicKeyHex: '',
//       publicKeyDER: '',
//       publicKeyRaw: { x: '', y: '' },
//       address: ''
//     });
//     setBalance({
//       confirmed: 0,
//       unconfirmed: 0,
//       loading: false,
//       error: null
//     });
//     setBlogKeyData(null);
//     setKeyHistory({
//       currentVersion: 0,
//       versions: {},
//       metadata: {
//         createdAt: Date.now(),
//         lastModified: Date.now(),
//         totalVersions: 0
//       }
//     });
//     setSelectedVersion(0);
//     setMasterKeyLocked(false);
//     setProductionKeysLocked(false);
//     setApiKeys({
//       whatsOnChain: { current: '', history: [] },
//       mapbox: { current: '', history: [] }
//     });
//     setVaultMessage(null);
//     setKeyError('');
//     setVersionLabel('');
//   };

//   // Reset process for Existing tab
//   const resetExistingProcess = () => {
//     setExistingInputKey('');
//     setUploadedFile(null);
//     setExistingMasterKeyEntered(false);
//     setKeyData({
//       privateKey: null,
//       publicKey: null,
//       privateKeyHex: '',
//       privateKeyWif: '',
//       privateKeyBinary: [],
//       publicKeyHex: '',
//       publicKeyDER: '',
//       publicKeyRaw: { x: '', y: '' },
//       address: ''
//     });
//     setBlogKeyData(null);
//     setKeyHistory({
//       currentVersion: 0,
//       versions: {},
//       metadata: {
//         createdAt: Date.now(),
//         lastModified: Date.now(),
//         totalVersions: 0
//       }
//     });
//     setVaultMessage(null);
//     setKeyError('');
//     // Reset file input
//     if (vaultFileInputRef.current) {
//       vaultFileInputRef.current.value = '';
//     }
//   };

//   // ECIES Encryption Implementation
//   const encryptWithECIES = async (data: string, privateKeyHex: string): Promise<EncryptedVault> => {
//     try {
//       // Generate ephemeral key pair
//       const ephemeralPrivKey = PrivateKey.fromRandom();
//       const ephemeralPubKey = ephemeralPrivKey.toPublicKey();
      
//       // Get recipient's public key from private key
//       const recipientPrivKey = PrivateKey.fromHex(privateKeyHex);
//       const recipientPubKey = recipientPrivKey.toPublicKey();
      
//       // Derive shared secret using ECDH
//       const sharedSecret = ephemeralPrivKey.deriveSharedSecret(recipientPubKey);
//       const sharedSecretBytes = Buffer.from(sharedSecret.toString(), 'hex');
      
//       // Derive encryption key using HKDF
//       const salt = crypto.getRandomValues(new Uint8Array(32));
//       const keyMaterial = await crypto.subtle.importKey(
//         'raw',
//         sharedSecretBytes,
//         'HKDF',
//         false,
//         ['deriveBits']
//       );
      
//       const encryptionKeyBits = await crypto.subtle.deriveBits(
//         {
//           name: 'HKDF',
//           salt: salt,
//           info: new TextEncoder().encode('vault-encryption'),
//           hash: 'SHA-256'
//         },
//         keyMaterial,
//         256
//       );
      
//       const encryptionKey = await crypto.subtle.importKey(
//         'raw',
//         encryptionKeyBits,
//         { name: 'AES-GCM' },
//         false,
//         ['encrypt']
//       );
      
//       // Encrypt data with AES-GCM
//       const iv = crypto.getRandomValues(new Uint8Array(12));
//       const encrypted = await crypto.subtle.encrypt(
//         {
//           name: 'AES-GCM',
//           iv: iv
//         },
//         encryptionKey,
//         new TextEncoder().encode(data)
//       );
      
//       // Create MAC for authentication
//       const macKey = await crypto.subtle.importKey(
//         'raw',
//         encryptionKeyBits,
//         { name: 'HMAC', hash: 'SHA-256' },
//         false,
//         ['sign']
//       );
      
//       const mac = await crypto.subtle.sign(
//         'HMAC',
//         macKey,
//         encrypted
//       );
      
//       // Combine everything
//       const combinedCiphertext = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
//       combinedCiphertext.set(salt, 0);
//       combinedCiphertext.set(iv, salt.length);
//       combinedCiphertext.set(new Uint8Array(encrypted), salt.length + iv.length);
      
//       return {
//         version: '1.0',
//         algorithm: 'ECIES-AES256-GCM',
//         encrypted: true,
//         timestamp: Date.now(),
//         ephemeralPublicKey: ephemeralPubKey.toString(),
//         ciphertext: btoa(String.fromCharCode(...combinedCiphertext)),
//         mac: btoa(String.fromCharCode(...new Uint8Array(mac))),
//         metadata: {
//           address: keyData.address || '',
//           network: network,
//           backupNumber: parseInt(localStorage.getItem('backupCount') || '0') + 1
//         }
//       };
//     } catch (error) {
//       console.error('Encryption error:', error);
//       throw new Error('Failed to encrypt vault: ' + (error instanceof Error ? error.message : 'Unknown error'));
//     }
//   };

//   // ECIES Decryption Implementation
//   const decryptWithECIES = async (encryptedVault: EncryptedVault, privateKeyHex: string): Promise<MetadataVault> => {
//     try {
//       // Parse ephemeral public key
//       const ephemeralPubKey = PublicKey.fromString(encryptedVault.ephemeralPublicKey);
      
//       // Get recipient's private key
//       const recipientPrivKey = PrivateKey.fromHex(privateKeyHex);
      
//       // Derive shared secret
//       const sharedSecret = recipientPrivKey.deriveSharedSecret(ephemeralPubKey);
//       const sharedSecretBytes = Buffer.from(sharedSecret.toString(), 'hex');
      
//       // Decode ciphertext
//       const combinedCiphertext = new Uint8Array(
//         atob(encryptedVault.ciphertext).split('').map(c => c.charCodeAt(0))
//       );
      
//       // Extract salt, iv, and encrypted data
//       const salt = combinedCiphertext.slice(0, 32);
//       const iv = combinedCiphertext.slice(32, 44);
//       const encrypted = combinedCiphertext.slice(44);
      
//       // Derive decryption key
//       const keyMaterial = await crypto.subtle.importKey(
//         'raw',
//         sharedSecretBytes,
//         'HKDF',
//         false,
//         ['deriveBits']
//       );
      
//       const decryptionKeyBits = await crypto.subtle.deriveBits(
//         {
//           name: 'HKDF',
//           salt: salt,
//           info: new TextEncoder().encode('vault-encryption'),
//           hash: 'SHA-256'
//         },
//         keyMaterial,
//         256
//       );
      
//       const decryptionKey = await crypto.subtle.importKey(
//         'raw',
//         decryptionKeyBits,
//         { name: 'AES-GCM' },
//         false,
//         ['decrypt']
//       );
      
//       // Verify MAC
//       const macKey = await crypto.subtle.importKey(
//         'raw',
//         decryptionKeyBits,
//         { name: 'HMAC', hash: 'SHA-256' },
//         false,
//         ['verify']
//       );
      
//       const macBytes = new Uint8Array(
//         atob(encryptedVault.mac).split('').map(c => c.charCodeAt(0))
//       );
      
//       const isValid = await crypto.subtle.verify(
//         'HMAC',
//         macKey,
//         macBytes,
//         encrypted
//       );
      
//       if (!isValid) {
//         throw new Error('MAC verification failed - data may be tampered');
//       }
      
//       // Decrypt data
//       const decrypted = await crypto.subtle.decrypt(
//         {
//           name: 'AES-GCM',
//           iv: iv
//         },
//         decryptionKey,
//         encrypted
//       );
      
//       const decryptedText = new TextDecoder().decode(decrypted);
//       return JSON.parse(decryptedText);
//     } catch (error) {
//       console.error('Decryption error:', error);
//       throw new Error('Failed to decrypt vault: ' + (error instanceof Error ? error.message : 'Unknown error'));
//     }
//   };

//   // Build complete vault from current state
//   const buildMetadataVault = (): MetadataVault => {
//     // Ensure we're using the current keyHistory and apiKeys state
//     return {
//       version: '1.0',
//       encrypted: false,
//       timestamp: Date.now(),
//       blogKeys: keyHistory,
//       apiKeys: apiKeys,
//       contacts: contacts.map(contact => ({
//         id: contact.id,
//         name: contact.name,
//         publicKeyHex: contact.publicKeyHex,
//         address: '',
//         sharedSecret: contact.sharedSecret,
//         added: Date.now(),
//         tags: []
//       })),
//       sessionData: {
//         lastLogout: Date.now(),
//         autoBackup: true,
//         backupCount: parseInt(localStorage.getItem('backupCount') || '0')
//       }
//     };
//   };

//   // Download encrypted vault and enter
//   const downloadVaultAndEnter = async () => {
//     if (!keyData.privateKeyHex || !blogKeyData) {
//       setVaultMessage({ type: 'error', text: 'Complete all steps before entering' });
//       return;
//     }
    
//     setIsEncrypting(true);
//     setVaultMessage({ type: 'info', text: 'Creating encrypted backup...' });
    
//     try {
//       const vault = buildMetadataVault();
//       const encryptedVault = await encryptWithECIES(JSON.stringify(vault), keyData.privateKeyHex);
      
//       // Increment backup count
//       const backupCount = parseInt(localStorage.getItem('backupCount') || '0') + 1;
//       localStorage.setItem('backupCount', backupCount.toString());
      
//       // Create and download file
//       const blob = new Blob([JSON.stringify(encryptedVault, null, 2)], { type: 'application/json' });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `vault-backup-${network}-${Date.now()}.vault`;
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
      
//       // Save state to indicate user has entered
//       localStorage.setItem('walletEntered', 'true');
//       localStorage.setItem('enteredAt', Date.now().toString());
      
//       setVaultMessage({ type: 'success', text: 'Vault backup created! Entering wallet...' });
      
//       // Close dialog after short delay
//       setTimeout(() => {
//         onClose();
//       }, 1500);
//     } catch (error) {
//       setVaultMessage({ type: 'error', text: 'Failed to create backup: ' + (error instanceof Error ? error.message : 'Unknown error') });
//     } finally {
//       setIsEncrypting(false);
//     }
//   };

//   // Handle existing tab enter
//   const handleExistingEnter = async () => {
//     if (!uploadedFile || !existingInputKey) {
//       setVaultMessage({ type: 'error', text: 'Please provide both master key and vault file' });
//       return;
//     }
    
//     setIsDecrypting(true);
//     setVaultMessage({ type: 'info', text: 'Decrypting vault...' });
    
//     const reader = new FileReader();
    
//     reader.onload = async (e) => {
//       try {
//         const content = e.target?.result as string;
//         const encryptedVault = JSON.parse(content) as EncryptedVault;
        
//         // Verify it's an encrypted vault file
//         if (!encryptedVault.encrypted || encryptedVault.algorithm !== 'ECIES-AES256-GCM') {
//           throw new Error('Invalid encrypted vault file');
//         }
        
//         // Try to process the private key if it's not already in hex format
//         let privateKeyHex = existingInputKey;
//         try {
//           if (existingInputKey.startsWith('L') || existingInputKey.startsWith('K') || existingInputKey.startsWith('5')) {
//             privateKeyHex = PrivateKey.fromWif(existingInputKey).toHex();
//           } else if (existingInputKey.length !== 64) {
//             throw new Error('Invalid private key format');
//           }
//         } catch {
//           throw new Error('Invalid private key format');
//         }
        
//         // Decrypt the vault
//         const decryptedVault = await decryptWithECIES(encryptedVault, privateKeyHex);
        
//         // Process the private key to set up wallet
//         const privKey = PrivateKey.fromHex(privateKeyHex);
//         processPrivateKey(privKey);
        
//         // Restore state from vault
//         setKeyHistory(decryptedVault.blogKeys);
//         setApiKeys(decryptedVault.apiKeys);
        
//         // Restore latest blog key and sync with WalletStore/Wallet.tsx
//         if (decryptedVault.blogKeys.currentVersion > 0) {
//           const latestKey = decryptedVault.blogKeys.versions[decryptedVault.blogKeys.currentVersion];
//           if (latestKey) {
//             setBlogKeyData(latestKey);
//             setSelectedVersion(decryptedVault.blogKeys.currentVersion);
            
//             // Sync with WalletStore for Wallet.tsx component
//             if (setBlogKey) {
//               // Send the blog key data in the exact format that Wallet.tsx expects
//               setBlogKey(latestKey);
              
//               // Create and save the Full Access Bundle for sync with Wallet.tsx
//               const bundleObject = {
//                 tier: 5,
//                 keys: [
//                   latestKey.keys.tier1,
//                   latestKey.keys.tier2,
//                   latestKey.keys.tier3,
//                   latestKey.keys.tier4,
//                   latestKey.keys.tier5
//                 ],
//                 version: latestKey.version,
//                 createdAt: latestKey.generatedAt
//               };
              
//               const fullAccessBundle = btoa(JSON.stringify(bundleObject));
              
//               // Store everything for Wallet.tsx to access
//               if (window.localStorage) {
//                 localStorage.setItem('blogKeyHistory', JSON.stringify(decryptedVault.blogKeys));
//                 localStorage.setItem('currentFullAccessBundle', fullAccessBundle);
//               }
//             }
//           }
//         }
        
//         // Restore contacts
//         if (decryptedVault.contacts && decryptedVault.contacts.length > 0) {
//           const restoredContacts = decryptedVault.contacts.map(contact => ({
//             id: contact.id,
//             name: contact.name,
//             publicKeyHex: contact.publicKeyHex || '',
//             sharedSecret: contact.sharedSecret,
//             blogAccessLevel: 0 as const,
//             blogKeySegment: undefined
//           }));
//           setContacts(restoredContacts);
//         }
        
//         setVaultMessage({ 
//           type: 'success', 
//           text: `Vault decrypted successfully! Entering wallet...` 
//         });
        
//         // Save state and close dialog
//         localStorage.setItem('walletEntered', 'true');
//         localStorage.setItem('enteredAt', Date.now().toString());
        
//         setTimeout(() => {
//           onClose();
//         }, 1500);
//       } catch (error) {
//         setVaultMessage({ 
//           type: 'error', 
//           text: 'Failed to decrypt vault: ' + (error instanceof Error ? error.message : 'Unknown error') 
//         });
//       } finally {
//         setIsDecrypting(false);
//       }
//     };
    
//     reader.onerror = () => {
//       setVaultMessage({ type: 'error', text: 'Failed to read vault file' });
//       setIsDecrypting(false);
//     };
    
//     reader.readAsText(uploadedFile);
//   };

//   // Check if requirements are met for New tab
//   const canEnterNew = () => {
//     return keyData.privateKeyHex !== '' && blogKeyData !== null;
//   };

//   // Check if requirements are met for Existing tab
//   const canEnterExisting = () => {
//     return existingMasterKeyEntered && uploadedFile !== null;
//   };

//   // Generate cryptographically secure random key
//   const generateSecureRandomKey = (bits: number): string => {
//     const bytes = bits / 8;
//     const randomBytes = new Uint8Array(bytes);
    
//     if (window.crypto && window.crypto.getRandomValues) {
//       window.crypto.getRandomValues(randomBytes);
//     } else {
//       throw new Error('Secure random number generation not available');
//     }
    
//     return Array.from(randomBytes)
//       .map(b => b.toString(16).padStart(2, '0'))
//       .join('');
//   };

//   // Generate random private key
//   const generateRandomKey = () => {
//     if (masterKeyLocked) return;
    
//     try {
//       let privKey;
//       try {
//         privKey = PrivateKey.fromRandom();
//       } catch (e) {
//         const randomBytes = new Uint8Array(32);
//         if (window.crypto && window.crypto.getRandomValues) {
//           window.crypto.getRandomValues(randomBytes);
//         } else {
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
//       setMasterKeyLocked(true);
//       setKeyError('');
//     } catch (err) {
//       setKeyError('Failed to generate random key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Import private key
//   const importPrivateKey = () => {
//     if (masterKeyLocked) return;
    
//     if (!inputKey.trim()) {
//       setKeyError('Please enter a private key');
//       return;
//     }

//     // Strict validation for exact private key format
//     const hexRegex = /^[0-9a-fA-F]{64}$/;
//     const wifRegex = /^[LK5][1-9A-HJ-NP-Za-km-z]{50,51}$/;
    
//     if (!hexRegex.test(inputKey.trim()) && !wifRegex.test(inputKey.trim())) {
//       setKeyError('Invalid private key format. Must be exactly 64 hex characters or valid WIF format.');
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
//       setMasterKeyLocked(true);
//       setKeyError('');
//     } catch (err) {
//       setKeyError('Invalid private key. Please enter a valid hex (64 chars) or WIF key.');
//     }
//   };

//   // Process private key
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
//         xCoord = 'Not available';
//         yCoord = 'Not available';
//       }

//       // Update keyData with all necessary fields for Wallet.tsx compatibility
//       const newKeyData = {
//         privateKey: privKey,
//         publicKey: pubKey,
//         privateKeyHex: privKey.toHex(),
//         privateKeyWif: privKey.toWif(),
//         privateKeyBinary: Array.from(privKey.toArray()),
//         publicKeyHex: pubKey.toString(),
//         publicKeyDER: Utils.toHex(pubKey.toDER()),
//         publicKeyRaw: { x: xCoord, y: yCoord },
//         address: address
//       };
      
//       setKeyData(newKeyData);
      
//       // Sync with WalletStore for Wallet.tsx component
//       updateContactSharedSecrets(privKey);
//       checkBalance(address);
//     } catch (err) {
//       setKeyError('Error processing key: ' + (err instanceof Error ? err.message : 'Unknown error'));
//     }
//   };

//   // Create Full Access Bundle string (same format as Wallet.tsx expects)
//   const createFullAccessBundle = (blogKeyData: BlogKeyData): string => {
//     const bundleObject = {
//       tier: 5,
//       keys: [
//         blogKeyData.keys.tier1,
//         blogKeyData.keys.tier2,
//         blogKeyData.keys.tier3,
//         blogKeyData.keys.tier4,
//         blogKeyData.keys.tier5
//       ],
//       version: blogKeyData.version,
//       createdAt: blogKeyData.generatedAt
//     };
    
//     return btoa(JSON.stringify(bundleObject));
//   };

//   // Generate hierarchical blog keys
//   const generateHierarchicalBlogKeys = () => {
//     if (productionKeysLocked) return;
    
//     try {
//       const keys: SecureBlogKeys = {
//         tier1: generateSecureRandomKey(128),
//         tier2: generateSecureRandomKey(128),
//         tier3: generateSecureRandomKey(128),
//         tier4: generateSecureRandomKey(192),
//         tier5: generateSecureRandomKey(256),
//       };

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
//         label: versionLabel || `Production Keys ${keyHistory.currentVersion + 1}`
//       };
      
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
//       setProductionKeysLocked(true);
      
//       // Update WalletStore with blog key data in the exact format Wallet.tsx expects
//       if (setBlogKey) {
//         setBlogKey(newBlogKeyData);
        
//         // Also save to localStorage for Wallet.tsx to access
//         localStorage.setItem('blogKeyHistory', JSON.stringify(updatedHistory));
        
//         // Save the Full Access Bundle for synchronization with Wallet.tsx
//         const fullAccessBundle = createFullAccessBundle(newBlogKeyData);
//         localStorage.setItem('currentFullAccessBundle', fullAccessBundle);
//       }
      
//       setVaultMessage({ type: 'success', text: 'Production keys generated successfully!' });
//       setVersionLabel('');
//     } catch (err) {
//       setVaultMessage({ type: 'error', text: 'Failed to generate keys: ' + (err instanceof Error ? err.message : 'Unknown error') });
//     }
//   };

//   // Check balance
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
//       setBalance({
//         ...balance,
//         loading: false,
//         error: 'Unable to fetch balance. Try again later.'
//       });
//     }
//   };

//   // Format BSV
//   const formatBSV = (satoshis: number): string => {
//     const bsv = satoshis / 100000000;
//     return bsv.toFixed(8).replace(/\.?0+$/, '');
//   };

//   // Copy to clipboard
//   const copyToClipboard = (text: string) => {
//     navigator.clipboard.writeText(text);
//   };

//   // Handle file upload for existing tab
//   const handleFileUpload = (file: File) => {
//     if (uploadedFile) return; // Prevent second file
//     setUploadedFile(file);
//     setVaultMessage({ type: 'info', text: 'Vault file loaded. Enter master key to decrypt.' });
//   };

//   // Drag and drop handlers
//   const handleVaultDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     if (!uploadedFile) {
//       setIsVaultDragging(true);
//     }
//   };

//   const handleVaultDragLeave = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsVaultDragging(false);
//   };

//   const handleVaultDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsVaultDragging(false);
    
//     if (uploadedFile) return;
    
//     const files = Array.from(e.dataTransfer.files);
//     const vaultFile = files.find(file => 
//       file.name.endsWith('.vault') || 
//       file.name.endsWith('.json') ||
//       file.type === 'application/json'
//     );
    
//     if (vaultFile) {
//       handleFileUpload(vaultFile);
//     } else {
//       setVaultMessage({ type: 'error', text: 'Please drop a valid vault file (.vault or .json)' });
//     }
//   };

//   // Update address when network changes
//   useEffect(() => {
//     if (keyData.privateKey) {
//       processPrivateKey(keyData.privateKey);
//     }
//   }, [network]);

//   if (!isOpen || !mounted) return null;

//   const dialogContent = (
//     <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 999999 }}>
//       <div 
//         className="fixed inset-0 bg-black/80" 
//         style={{ zIndex: 999998 }}
//         onClick={onClose}
//       ></div>
//       <div 
//         className="relative bg-zinc-900 rounded-lg p-6 w-full max-w-[900px] max-h-[90vh] overflow-y-auto mx-4 border border-zinc-700"
//         style={{ zIndex: 999999 }}
//       >
//         {/* Header with Network Selector */}
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-xl font-semibold text-white">Wallet Configuration</h2>
//           <div className="flex items-center gap-3">
//             {/* Network Selector */}
//             <div className="flex gap-2">
//               <button
//                 onClick={() => setNetwork('mainnet')}
//                 className={`px-3 py-1 rounded text-sm transition-colors ${
//                   network === 'mainnet'
//                     ? 'bg-blue-500 text-white'
//                     : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
//                 }`}
//               >
//                 Mainnet
//               </button>
//               <button
//                 onClick={() => setNetwork('testnet')}
//                 className={`px-3 py-1 rounded text-sm transition-colors ${
//                   network === 'testnet'
//                     ? 'bg-green-500 text-white'
//                     : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
//                 }`}
//               >
//                 Testnet
//               </button>
//             </div>
//             <button
//               onClick={onClose}
//               className="p-1 hover:bg-white/10 rounded-full transition-colors"
//             >
//               <X size={20} className="text-gray-400" />
//             </button>
//           </div>
//         </div>

//         {/* Tab Navigation */}
//         <div className="flex gap-2 mb-4">
//           <button
//             onClick={() => setActiveTab('new')}
//             className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
//               activeTab === 'new'
//                 ? 'bg-sky-500 text-white'
//                 : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
//             }`}
//           >
//             <Plus size={16} />
//             New
//           </button>
//           <button
//             onClick={() => setActiveTab('existing')}
//             className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
//               activeTab === 'existing'
//                 ? 'bg-purple-500 text-white'
//                 : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
//             }`}
//           >
//             <FolderOpen size={16} />
//             Existing
//           </button>
//           <button
//             onClick={() => setActiveTab('pin-lock')}
//             disabled
//             className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
//               activeTab === 'pin-lock'
//                 ? 'bg-orange-500 text-white'
//                 : 'bg-zinc-800 text-gray-600 cursor-not-allowed'
//             }`}
//           >
//             <MapPin size={16} />
//             Pin-Lock
//             <span className="text-xs">(Soon)</span>
//           </button>
//           <button
//             onClick={() => setActiveTab('travel-lock')}
//             disabled
//             className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
//               activeTab === 'travel-lock'
//                 ? 'bg-indigo-500 text-white'
//                 : 'bg-zinc-800 text-gray-600 cursor-not-allowed'
//             }`}
//           >
//             <Plane size={16} />
//             Travel-Lock
//             <span className="text-xs">(Soon)</span>
//           </button>
//         </div>

//         {/* Status Messages */}
//         {vaultMessage && (
//           <div className={`mb-4 p-3 rounded flex items-center gap-2 ${
//             vaultMessage.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-700' :
//             vaultMessage.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-700' :
//             'bg-blue-900/30 text-blue-400 border border-blue-700'
//           }`}>
//             {vaultMessage.type === 'success' && <Check size={16} />}
//             {vaultMessage.type === 'error' && <AlertCircle size={16} />}
//             {vaultMessage.text}
//           </div>
//         )}

//         {/* New Tab */}
//         {activeTab === 'new' && (
//           <div className="space-y-4">
//             {/* Step Progress */}
//             <div className="p-3 bg-zinc-800 rounded-lg border border-zinc-700">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm text-gray-400">Setup Progress:</span>
//                 <div className="flex items-center gap-4">
//                   <div className="flex items-center gap-2">
//                     <div className={`w-3 h-3 rounded-full ${masterKeyLocked ? 'bg-green-500' : 'bg-gray-600'}`} />
//                     <span className={`text-sm ${masterKeyLocked ? 'text-green-400' : 'text-gray-500'}`}>
//                       Step 1: Master Key
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <div className={`w-3 h-3 rounded-full ${productionKeysLocked ? 'bg-green-500' : 'bg-gray-600'}`} />
//                     <span className={`text-sm ${productionKeysLocked ? 'text-green-400' : 'text-gray-500'}`}>
//                       Step 2: Production Keys
//                     </span>
//                   </div>
//                 </div>
//                 <button
//                   onClick={resetNewProcess}
//                   className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs transition-colors flex items-center gap-1"
//                 >
//                   <RotateCcw size={12} />
//                   Reset Process
//                 </button>
//               </div>
//             </div>

//             {/* Private Key Section */}
//             <div className={`p-4 rounded-lg border transition-all ${
//               masterKeyLocked 
//                 ? 'bg-gray-900 border-gray-800 opacity-60' 
//                 : 'bg-gray-800 border-gray-700'
//             }`}>
//               <h3 className="font-medium text-white mb-3">
//                 Step 1: Master Private Key {masterKeyLocked && '✓'}
//               </h3>
              
//               <div className="space-y-3">
//                 <div className="flex gap-2">
//                   <input
//                     type="password"
//                     value={inputKey}
//                     onChange={(e) => setInputKey(e.target.value)}
//                     placeholder="Enter private key (hex or WIF format)"
//                     disabled={masterKeyLocked}
//                     className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-gray-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
//                   />
//                   <button
//                     onClick={importPrivateKey}
//                     disabled={masterKeyLocked}
//                     className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
//                       masterKeyLocked
//                         ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
//                         : 'bg-green-500 hover:bg-green-600 text-white'
//                     }`}
//                   >
//                     Import
//                   </button>
//                 </div>
                
//                 <div className="flex gap-2">
//                   <button
//                     onClick={generateRandomKey}
//                     disabled={masterKeyLocked}
//                     className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
//                       masterKeyLocked
//                         ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
//                         : 'bg-blue-500 hover:bg-blue-600 text-white'
//                     }`}
//                   >
//                     Generate Random Key
//                   </button>
//                 </div>
                
//                 {keyError && (
//                   <div className="flex items-center gap-2 text-red-400 text-sm">
//                     <AlertCircle size={16} />
//                     <span>{keyError}</span>
//                   </div>
//                 )}
                
//                 {keyData.address && (
//                   <div className="p-3 bg-zinc-900 rounded border border-zinc-700">
//                     <div className="flex justify-between items-center mb-2">
//                       <span className="text-sm text-gray-400">Address:</span>
//                       <div className="flex items-center gap-2">
//                         <code className="text-xs text-gray-300">{keyData.address.substring(0, 12)}...{keyData.address.substring(keyData.address.length - 8)}</code>
//                         <button
//                           onClick={() => copyToClipboard(keyData.address)}
//                           className="p-1 hover:bg-zinc-800 rounded"
//                         >
//                           <Copy size={14} className="text-gray-400" />
//                         </button>
//                       </div>
//                     </div>
                    
//                     <div className="flex justify-between items-center">
//                       <span className="text-sm text-gray-400">Balance:</span>
//                       <div className="flex items-center gap-2">
//                         {balance.loading ? (
//                           <span className="text-sm text-gray-400">Loading...</span>
//                         ) : balance.error ? (
//                           <span className="text-sm text-red-400">Error</span>
//                         ) : (
//                           <span className="text-sm text-gray-300">{formatBSV(balance.confirmed)} BSV</span>
//                         )}
//                         <button
//                           onClick={() => checkBalance(keyData.address)}
//                           className="p-1 hover:bg-zinc-800 rounded"
//                           disabled={balance.loading}
//                         >
//                           <RefreshCw size={14} className={`text-gray-400 ${balance.loading ? 'animate-spin' : ''}`} />
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Blog Encryption Keys Section */}
//             <div className={`p-4 rounded-lg border transition-all ${
//               productionKeysLocked 
//                 ? 'bg-indigo-950 border-indigo-900' 
//                 : masterKeyLocked
//                   ? 'bg-indigo-900/30 border-indigo-700'
//                   : 'bg-gray-900 border-gray-800 opacity-60'
//             }`}>
//               <h3 className="font-medium text-white mb-3">
//                 Step 2: Blog Encryption Keys {productionKeysLocked && '✓'}
//               </h3>
              
//               <div className="space-y-3">
//                 <div className="flex gap-2">
//                   <input
//                     type="text"
//                     value={versionLabel}
//                     onChange={(e) => setVersionLabel(e.target.value)}
//                     placeholder="Optional: Label for this version (e.g., 'Production Keys')"
//                     disabled={!masterKeyLocked || productionKeysLocked}
//                     className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
//                   />
//                   <button
//                     onClick={generateHierarchicalBlogKeys}
//                     disabled={!masterKeyLocked || productionKeysLocked}
//                     className={`bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded transition-colors ${
//                       !masterKeyLocked || productionKeysLocked
//                         ? 'opacity-50 cursor-not-allowed'
//                         : ''
//                     }`}
//                   >
//                     Generate New Version
//                   </button>
//                 </div>
                
//                 {blogKeyData && (
//                   <div className="mt-4 space-y-3">
//                     <div className="flex items-center justify-between">
//                       <h4 className="text-sm font-medium text-white">
//                         {blogKeyData.label || `Version ${selectedVersion}`} Keys
//                       </h4>
//                       <button
//                         onClick={() => setShowPrivateKey(!showPrivateKey)}
//                         className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
//                       >
//                         {showPrivateKey ? 'Hide' : 'Show'} Keys & Access Bundles
//                       </button>
//                     </div>

//                     {showPrivateKey && (
//                       <div className="p-3 bg-gray-800 rounded-lg space-y-3">
//                         {/* Tier 5 - Full Access */}
//                         {blogKeyData.keys.tier5 && (
//                           <div className="p-2 bg-red-900 bg-opacity-20 rounded border border-red-700">
//                             <div className="flex items-center justify-between mb-1">
//                               <label className="text-xs font-medium text-red-300">
//                                 Tier 5 - Complete Access (All Levels)
//                               </label>
//                               <span className="text-xs text-gray-400">256-bit</span>
//                             </div>
//                             <div className="space-y-1">
//                               <div className="flex items-center gap-1">
//                                 <code className="flex-1 p-1 bg-gray-900 rounded border border-red-600 text-xs break-all text-red-300 font-mono">
//                                   {blogKeyData.keys.tier5}
//                                 </code>
//                                 <button
//                                   onClick={() => copyToClipboard(blogKeyData.keys.tier5)}
//                                   className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
//                                   title="Copy Tier 5 key"
//                                 >
//                                   📋
//                                 </button>
//                               </div>
//                               <button
//                                 onClick={() => copyToClipboard(createFullAccessBundle(blogKeyData))}
//                                 className="w-full px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs"
//                               >
//                                 📦 Copy Full Access Bundle
//                               </button>
//                             </div>
//                           </div>
//                         )}

//                         {/* Tier 4 */}
//                         {blogKeyData.keys.tier4 && (
//                           <div className="p-2 bg-purple-900 bg-opacity-20 rounded border border-purple-700">
//                             <div className="flex items-center justify-between mb-1">
//                               <label className="text-xs font-medium text-purple-300">
//                                 Tier 4 - Closed Group
//                               </label>
//                               <span className="text-xs text-gray-400">192-bit</span>
//                             </div>
//                             <div className="flex items-center gap-1">
//                               <code className="flex-1 p-1 bg-gray-900 rounded border border-purple-600 text-xs break-all text-purple-300 font-mono">
//                                 {blogKeyData.keys.tier4}
//                               </code>
//                               <button
//                                 onClick={() => copyToClipboard(blogKeyData.keys.tier4)}
//                                 className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
//                               >
//                                 📋
//                               </button>
//                             </div>
//                           </div>
//                         )}

//                         {/* Tier 3 */}
//                         {blogKeyData.keys.tier3 && (
//                           <div className="p-2 bg-indigo-900 bg-opacity-20 rounded border border-indigo-700">
//                             <div className="flex items-center justify-between mb-1">
//                               <label className="text-xs font-medium text-indigo-300">
//                                 Tier 3 - Inner Circle
//                               </label>
//                               <span className="text-xs text-gray-400">128-bit</span>
//                             </div>
//                             <div className="flex items-center gap-1">
//                               <code className="flex-1 p-1 bg-gray-900 rounded border border-indigo-600 text-xs break-all text-indigo-300 font-mono">
//                                 {blogKeyData.keys.tier3}
//                               </code>
//                               <button
//                                 onClick={() => copyToClipboard(blogKeyData.keys.tier3)}
//                                 className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs"
//                               >
//                                 📋
//                               </button>
//                             </div>
//                           </div>
//                         )}

//                         {/* Tier 2 */}
//                         {blogKeyData.keys.tier2 && (
//                           <div className="p-2 bg-yellow-900 bg-opacity-20 rounded border border-yellow-700">
//                             <div className="flex items-center justify-between mb-1">
//                               <label className="text-xs font-medium text-yellow-300">
//                                 Tier 2 - Close Friends
//                               </label>
//                               <span className="text-xs text-gray-400">128-bit</span>
//                             </div>
//                             <div className="flex items-center gap-1">
//                               <code className="flex-1 p-1 bg-gray-900 rounded border border-yellow-600 text-xs break-all text-yellow-300 font-mono">
//                                 {blogKeyData.keys.tier2}
//                               </code>
//                               <button
//                                 onClick={() => copyToClipboard(blogKeyData.keys.tier2)}
//                                 className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
//                               >
//                                 📋
//                               </button>
//                             </div>
//                           </div>
//                         )}

//                         {/* Tier 1 */}
//                         {blogKeyData.keys.tier1 && (
//                           <div className="p-2 bg-orange-900 bg-opacity-20 rounded border border-orange-700">
//                             <div className="flex items-center justify-between mb-1">
//                               <label className="text-xs font-medium text-orange-300">
//                                 Tier 1 - Friends
//                               </label>
//                               <span className="text-xs text-gray-400">128-bit</span>
//                             </div>
//                             <div className="flex items-center gap-1">
//                               <code className="flex-1 p-1 bg-gray-900 rounded border border-orange-600 text-xs break-all text-orange-300 font-mono">
//                                 {blogKeyData.keys.tier1}
//                               </code>
//                               <button
//                                 onClick={() => copyToClipboard(blogKeyData.keys.tier1)}
//                                 className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs"
//                               >
//                                 📋
//                               </button>
//                             </div>
//                           </div>
//                         )}

//                         <div className="mt-2 p-2 bg-green-800 bg-opacity-30 rounded-lg">
//                           <p className="text-xs text-gray-300">
//                             <span className="text-green-400">✅ Keys Generated:</span> {new Date(blogKeyData.generatedAt).toLocaleString()}
//                           </p>
//                         </div>
//                       </div>
//                     )}

//                     {!showPrivateKey && (
//                       <div className="p-3 bg-indigo-900/20 rounded border border-indigo-600">
//                         <p className="text-sm text-indigo-400">✓ Production keys generated</p>
//                         <p className="text-xs text-gray-400 mt-1">{blogKeyData.label || `Version ${selectedVersion}`}</p>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* API Keys Section (Optional) */}
//             <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
//               <h3 className="font-medium text-white mb-3">API Keys (Optional)</h3>
              
//               <div className="space-y-3">
//                 <div>
//                   <label className="block text-sm text-gray-400 mb-1">WhatsOnChain API Key</label>
//                   <input
//                     type="password"
//                     value={apiKeys.whatsOnChain.current}
//                     onChange={(e) => setApiKeys({
//                       ...apiKeys,
//                       whatsOnChain: {
//                         ...apiKeys.whatsOnChain,
//                         current: e.target.value
//                       }
//                     })}
//                     placeholder="Enter API key (optional)"
//                     className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-gray-500 text-sm"
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm text-gray-400 mb-1">MapBox API Key</label>
//                   <input
//                     type="password"
//                     value={apiKeys.mapbox.current}
//                     onChange={(e) => setApiKeys({
//                       ...apiKeys,
//                       mapbox: {
//                         ...apiKeys.mapbox,
//                         current: e.target.value
//                       }
//                     })}
//                     placeholder="Enter API key (optional)"
//                     className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-gray-500 text-sm"
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Enter Button */}
//             {canEnterNew() && (
//               <button
//                 onClick={downloadVaultAndEnter}
//                 disabled={isEncrypting}
//                 className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
//                   isEncrypting
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
//                     : 'bg-green-600 hover:bg-green-700 text-white shadow-lg animate-pulse'
//                 }`}
//               >
//                 {isEncrypting ? (
//                   <>
//                     <RefreshCw size={18} className="animate-spin" />
//                     Creating backup...
//                   </>
//                 ) : (
//                   <>
//                     <Download size={18} />
//                     Download Vault & Enter
//                   </>
//                 )}
//               </button>
//             )}
//           </div>
//         )}

//         {/* Existing Tab */}
//         {activeTab === 'existing' && (
//           <div className="space-y-4">
//             {/* Reset Button */}
//             <div className="flex justify-end">
//               <button
//                 onClick={resetExistingProcess}
//                 className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors flex items-center gap-1"
//               >
//                 <RotateCcw size={14} />
//                 Reset
//               </button>
//             </div>

//             {/* Master Private Key Input */}
//             <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
//               <h3 className="font-medium text-white mb-3 flex items-center gap-2">
//                 Master Private Key
//                 {existingMasterKeyEntered && <Check size={16} className="text-green-400" />}
//               </h3>
//               <div className="flex gap-2">
//                 <input
//                   type="password"
//                   value={existingInputKey}
//                   onChange={(e) => {
//                     setExistingInputKey(e.target.value);
//                     setExistingMasterKeyEntered(e.target.value.length === 64 || 
//                       e.target.value.startsWith('L') || 
//                       e.target.value.startsWith('K') || 
//                       e.target.value.startsWith('5'));
//                   }}
//                   placeholder="Enter your private key to decrypt vault"
//                   className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-gray-500 text-sm"
//                 />
//               </div>
//             </div>

//             {/* Vault File Upload */}
//             <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700">
//               <h3 className="font-medium text-white mb-3 flex items-center gap-2">
//                 <FileKey size={20} />
//                 Vault File
//                 {uploadedFile && <Check size={16} className="text-green-400" />}
//               </h3>
              
//               {!uploadedFile ? (
//                 <div
//                   className={`p-8 border-2 border-dashed rounded-lg transition-all ${
//                     isVaultDragging
//                       ? 'border-purple-400 bg-purple-900/30 scale-105'
//                       : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
//                   }`}
//                   onDragOver={handleVaultDragOver}
//                   onDragLeave={handleVaultDragLeave}
//                   onDrop={handleVaultDrop}
//                 >
//                   <input
//                     ref={vaultFileInputRef}
//                     type="file"
//                     accept=".vault,.json"
//                     onChange={(e) => {
//                       const file = e.target.files?.[0];
//                       if (file) handleFileUpload(file);
//                     }}
//                     className="hidden"
//                   />
                  
//                   <div className="text-center">
//                     <Upload className={`mx-auto h-12 w-12 mb-3 transition-colors ${
//                       isVaultDragging ? 'text-purple-400' : 'text-gray-400'
//                     }`} />
//                     <p className="text-sm font-medium text-gray-300 mb-2">
//                       Drag and drop your vault file here
//                     </p>
//                     <button
//                       onClick={() => vaultFileInputRef.current?.click()}
//                       className="text-sm underline transition-colors text-purple-400 hover:text-purple-300"
//                     >
//                       Or click to browse
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="p-4 bg-gray-800 rounded-lg">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center gap-3">
//                       <FileCheck size={24} className="text-green-400" />
//                       <div>
//                         <p className="text-sm font-medium text-white">{uploadedFile.name}</p>
//                         <p className="text-xs text-gray-400">
//                           {(uploadedFile.size / 1024).toFixed(2)} KB
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Display Restored Blog Keys */}
//             {blogKeyData && keyData.address && (
//               <div className="p-4 bg-indigo-900/30 rounded-lg border border-indigo-700">
//                 <div className="flex items-center justify-between mb-3">
//                   <h3 className="text-sm font-medium text-white">
//                     Restored Blog Keys: {blogKeyData.label || `Version ${selectedVersion}`}
//                   </h3>
//                   <button
//                     onClick={() => setShowPrivateKey(!showPrivateKey)}
//                     className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
//                   >
//                     {showPrivateKey ? 'Hide' : 'Show'} Keys
//                   </button>
//                 </div>

//                 {showPrivateKey && (
//                   <div className="space-y-2">
//                     {/* Tier 5 - Full Access Bundle */}
//                     {blogKeyData.keys.tier5 && (
//                       <div className="p-2 bg-red-900 bg-opacity-20 rounded border border-red-700">
//                         <div className="flex items-center justify-between mb-1">
//                           <label className="text-xs font-medium text-red-300">
//                             Tier 5 - Full Access
//                           </label>
//                           <span className="text-xs text-gray-400">256-bit</span>
//                         </div>
//                         <div className="space-y-1">
//                           <div className="flex items-center gap-1">
//                             <code className="flex-1 p-1 bg-gray-900 rounded text-xs break-all text-red-300 font-mono">
//                               {blogKeyData.keys.tier5.substring(0, 32)}...
//                             </code>
//                             <button
//                               onClick={() => copyToClipboard(createFullAccessBundle(blogKeyData))}
//                               className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
//                               title="Copy Full Access Bundle"
//                             >
//                               📦
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     )}

//                     {/* Show other tiers in condensed format */}
//                     <div className="grid grid-cols-2 gap-2">
//                       {blogKeyData.keys.tier4 && (
//                         <div className="p-2 bg-purple-900/20 rounded border border-purple-700">
//                           <div className="flex items-center justify-between">
//                             <span className="text-xs text-purple-300">Tier 4</span>
//                             <button
//                               onClick={() => copyToClipboard(blogKeyData.keys.tier4)}
//                               className="px-1 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
//                             >
//                               📋
//                             </button>
//                           </div>
//                         </div>
//                       )}
//                       {blogKeyData.keys.tier3 && (
//                         <div className="p-2 bg-indigo-900/20 rounded border border-indigo-700">
//                           <div className="flex items-center justify-between">
//                             <span className="text-xs text-indigo-300">Tier 3</span>
//                             <button
//                               onClick={() => copyToClipboard(blogKeyData.keys.tier3)}
//                               className="px-1 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs"
//                             >
//                               📋
//                             </button>
//                           </div>
//                         </div>
//                       )}
//                       {blogKeyData.keys.tier2 && (
//                         <div className="p-2 bg-yellow-900/20 rounded border border-yellow-700">
//                           <div className="flex items-center justify-between">
//                             <span className="text-xs text-yellow-300">Tier 2</span>
//                             <button
//                               onClick={() => copyToClipboard(blogKeyData.keys.tier2)}
//                               className="px-1 py-0.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
//                             >
//                               📋
//                             </button>
//                           </div>
//                         </div>
//                       )}
//                       {blogKeyData.keys.tier1 && (
//                         <div className="p-2 bg-orange-900/20 rounded border border-orange-700">
//                           <div className="flex items-center justify-between">
//                             <span className="text-xs text-orange-300">Tier 1</span>
//                             <button
//                               onClick={() => copyToClipboard(blogKeyData.keys.tier1)}
//                               className="px-1 py-0.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs"
//                             >
//                               📋
//                             </button>
//                           </div>
//                         </div>
//                       )}
//                     </div>

//                     <p className="text-xs text-gray-400 mt-2">
//                       ✅ Keys restored from vault - Available in Wallet section
//                     </p>
//                   </div>
//                 )}

//                 {!showPrivateKey && (
//                   <p className="text-xs text-indigo-400">
//                     ✓ Blog keys restored successfully - {Object.keys(keyHistory.versions).length} versions available
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* Enter Button */}
//             <button
//               onClick={handleExistingEnter}
//               disabled={!canEnterExisting() || isDecrypting}
//               className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
//                 canEnterExisting() && !isDecrypting
//                   ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
//                   : 'bg-gray-700 text-gray-500 cursor-not-allowed'
//               }`}
//             >
//               {isDecrypting ? (
//                 <>
//                   <RefreshCw size={18} className="animate-spin" />
//                   Decrypting...
//                 </>
//               ) : (
//                 <>
//                   <Unlock size={18} />
//                   Enter
//                 </>
//               )}
//             </button>
//           </div>
//         )}

//         {/* Pin-Lock Tab (Coming Soon) */}
//         {activeTab === 'pin-lock' && (
//           <div className="p-8 text-center text-gray-500">
//             <MapPin size={48} className="mx-auto mb-4 text-gray-600" />
//             <h3 className="text-lg font-medium text-gray-400 mb-2">Pin-Lock Feature</h3>
//             <p className="text-sm">Coming soon: Secure your vault with a PIN code</p>
//           </div>
//         )}

//         {/* Travel-Lock Tab (Coming Soon) */}
//         {activeTab === 'travel-lock' && (
//           <div className="p-8 text-center text-gray-500">
//             <Plane size={48} className="mx-auto mb-4 text-gray-600" />
//             <h3 className="text-lg font-medium text-gray-400 mb-2">Travel-Lock Feature</h3>
//             <p className="text-sm">Coming soon: Temporary travel security mode</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );

//   return ReactDOM.createPortal(
//     dialogContent,
//     document.body
//   );
// };

// export default EntryDialog;
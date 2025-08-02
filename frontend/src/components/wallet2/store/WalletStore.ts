import { create } from 'zustand';
import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';

type Network = 'mainnet' | 'testnet';

interface KeyData {
  privateKey: PrivateKey | null;
  publicKey: PublicKey | null;
  privateKeyHex: string;
  privateKeyWif: string;
  privateKeyBinary: number[];
  publicKeyHex: string;
  publicKeyDER: string;
  publicKeyRaw: { x: string; y: string };
  address: string;
}

interface BalanceInfo {
  confirmed: number;
  unconfirmed: number;
  loading: boolean;
  error: string | null;
}

interface SavedContact {
  id: string;
  name: string;
  publicKeyHex: string;
  sharedSecret?: string;
  blogAccessLevel?: 0 | 1 | 2 | 3 | 4 | 5; // Blog access level for this contact
  blogKeySegment?: string; // The key segment they have
}

interface UTXO {
  sourceTransaction: any;
  sourceOutputIndex: number;
  satoshis: number;
  txid: string;
}

interface OnChainMessage {
  txid: string;
  timestamp: Date;
  message: string;
  sender: string;
  recipient: string;
  encrypted: string;
  isFromMe: boolean;
  contactName?: string;
  encryptionType?: 'standard';
}

interface BlockchainConversation {
  contactId: string;
  contactName: string;
  contactAddress: string;
  messages: OnChainMessage[];
}

interface ProfileToken {
  tokenId: string;
  owner: string;
  profileData: {
    username: string;
    title: string;
    mission: string;
    profileImage: string;
    backgroundImage: string;
  };
  ipfsHashes?: {
    profile?: string;
    background?: string;
  };
  timestamp: number;
  version: number;
}

// Blog Key Interfaces
interface BlogKeySegments {
  tier1: string;  // First 1/5 (~13 chars) - Level 1   address
  tier2: string;  // First 2/5 (~26 chars) - Level 2
  tier3: string;  // First 3/5 (~38 chars) - Level 3
  tier4: string;  // First 4/5 (~51 chars) - Level 4
  tier5: string;  // Full key (64 chars) - Level 5
}

interface BlogKeyData {
  fullKey: string;
  segments: BlogKeySegments;
  version: string;
  generatedAt: number;
}

interface BlogKeyHistory {
  current: BlogKeyData | null;
  previous: BlogKeyData[];
}

interface WalletState {
  // Core wallet data
  network: Network;
  keyData: KeyData;
  balance: BalanceInfo;
  
  // Contacts
  contacts: SavedContact[];
  
  // Messages
  onChainMessages: OnChainMessage[];
  blockchainConversations: BlockchainConversation[];
  sentTransactions: string[];
  
  // UI State
  selectedContactId: string;
  selectedConversation: string;
  loadingMessages: boolean;
  
  // API
  whatsOnChainApiKey: string;

  // Profile Token State
  userProfiles: ProfileToken[];
  loadingProfiles: boolean;
  profileError: string | null;
  
  // Blog Key State
  blogKeyHistory: BlogKeyHistory;
  
  // Actions
  setNetwork: (network: Network) => void;
  setKeyData: (keyData: KeyData) => void;
  setBalance: (balance: BalanceInfo) => void;
  setContacts: (contacts: SavedContact[]) => void;
  addContact: (contact: SavedContact) => void;
  removeContact: (id: string) => void;
  updateContactSharedSecrets: (privateKey: PrivateKey) => void;
  setOnChainMessages: (messages: OnChainMessage[]) => void;
  setBlockchainConversations: (conversations: BlockchainConversation[]) => void;
  addSentTransaction: (txid: string) => void;
  setSelectedContactId: (id: string) => void;
  setSelectedConversation: (id: string) => void;
  setLoadingMessages: (loading: boolean) => void;
  setWhatsOnChainApiKey: (key: string) => void;

  // Profile Token Actions
  setUserProfiles: (profiles: ProfileToken[]) => void;
  setLoadingProfiles: (loading: boolean) => void;
  setProfileError: (error: string | null) => void;
  fetchUserProfiles: () => Promise<void>;
  addProfileToken: (profile: ProfileToken) => void;
  clearProfileTokens: () => void;

  // Blog Key Actions
  setBlogKey: (blogKeyData: BlogKeyData) => void;
  generateNewBlogKey: () => BlogKeyData;
  rotateBlogKey: () => void;
  updateContactBlogAccess: (contactId: string, accessLevel: 0 | 1 | 2 | 3 | 4 | 5) => void;
  getKeySegmentForLevel: (level: 0 | 1 | 2 | 3 | 4 | 5) => string | null;
  importBlogKey: (hexKey: string) => void;
}

// Helper function to segment blog key
const segmentBlogKey = (fullKey: string): BlogKeySegments => {
  const keyLength = fullKey.length; // Should be 64
  const tier1Length = Math.floor(keyLength / 5);      // ~13 chars
  const tier2Length = Math.floor(keyLength * 2 / 5);  // ~26 chars
  const tier3Length = Math.floor(keyLength * 3 / 5);  // ~38 chars
  const tier4Length = Math.floor(keyLength * 4 / 5);  // ~51 chars
  
  return {
    tier1: fullKey.substring(0, tier1Length),
    tier2: fullKey.substring(0, tier2Length),
    tier3: fullKey.substring(0, tier3Length),
    tier4: fullKey.substring(0, tier4Length),
    tier5: fullKey // Full key
  };
};

export const useWalletStore = create<WalletState>((set, get) => ({
  // Initial state
  network: 'mainnet',
  keyData: {
    privateKey: null,
    publicKey: null,
    privateKeyHex: '',
    privateKeyWif: '',
    privateKeyBinary: [],
    publicKeyHex: '',
    publicKeyDER: '',
    publicKeyRaw: { x: '', y: '' },
    address: ''
  },
  balance: {
    confirmed: 0,
    unconfirmed: 0,
    loading: false,
    error: null
  },
  contacts: [],
  onChainMessages: [],
  blockchainConversations: [],
  sentTransactions: [],
  selectedContactId: '',
  selectedConversation: '',
  loadingMessages: false,
  whatsOnChainApiKey: '',

  // Profile Token Initial State
  userProfiles: [],
  loadingProfiles: false,
  profileError: null,
  
  // Blog Key Initial State
  blogKeyHistory: {
    current: null,
    previous: []
  },
  
  // Actions
  setNetwork: (network) => set({ network }),
  setKeyData: (keyData) => set({ keyData }),
  setBalance: (balance) => set({ balance }),
  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) => set((state) => ({ 
    contacts: [...state.contacts, contact] 
  })),
  removeContact: (id) => set((state) => ({ 
    contacts: state.contacts.filter(c => c.id !== id) 
  })),
  updateContactSharedSecrets: (privateKey) => {
    const { contacts, network } = get();
    const updatedContacts = contacts.map(contact => {
      try {
        const contactPubKey = PublicKey.fromString(contact.publicKeyHex);
        const sharedSecret = privateKey.deriveSharedSecret(contactPubKey);
        return {
          ...contact,
          sharedSecret: sharedSecret.toString()
        };
      } catch {
        return contact;
      }
    });
    set({ contacts: updatedContacts });
  },
  setOnChainMessages: (messages) => set({ onChainMessages: messages }),
  setBlockchainConversations: (conversations) => set({ blockchainConversations: conversations }),
  addSentTransaction: (txid) => set((state) => ({
    sentTransactions: [...state.sentTransactions, txid]
  })),
  setSelectedContactId: (id) => set({ selectedContactId: id }),
  setSelectedConversation: (id) => set({ selectedConversation: id }),
  setLoadingMessages: (loading) => set({ loadingMessages: loading }),
  setWhatsOnChainApiKey: (key) => {
    localStorage.setItem('whatsOnChainApiKey', key);
    set({ whatsOnChainApiKey: key });
  },

  // Profile Token Actions
  setUserProfiles: (profiles) => set({ userProfiles: profiles }),
  
  setLoadingProfiles: (loading) => set({ loadingProfiles: loading }),
  
  setProfileError: (error) => set({ profileError: error }),
  
  fetchUserProfiles: async () => {
    const { keyData, network, whatsOnChainApiKey } = get();
    
    if (!keyData.address) return;
    
    set({ loadingProfiles: true, profileError: null });
    
    try {
      // Dynamic import to avoid circular dependencies
      const { ProfileTokenService } = await import('../services/ProfileTokenService');
      const profileService = new ProfileTokenService(network, whatsOnChainApiKey);
      const profiles = await profileService.listProfileTokens(keyData.address);
      
      set({ 
        userProfiles: profiles,
        loadingProfiles: false 
      });
    } catch (error) {
      set({ 
        profileError: 'Failed to load profile tokens',
        loadingProfiles: false 
      });
    }
  },
  
  addProfileToken: (profile) => {
    const { userProfiles } = get();
    set({ userProfiles: [...userProfiles, profile] });
  },
  
  clearProfileTokens: () => {
    set({ 
      userProfiles: [],
      profileError: null 
    });
  },

  // Blog Key Actions
  setBlogKey: (blogKeyData) => {
    const { blogKeyHistory } = get();
    const newHistory = {
      current: blogKeyData,
      previous: blogKeyHistory.current 
        ? [...blogKeyHistory.previous, blogKeyHistory.current]
        : blogKeyHistory.previous
    };
    set({ blogKeyHistory: newHistory });
    
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('blogKeyHistory', JSON.stringify(newHistory));
    }
  },

  generateNewBlogKey: () => {
    // Generate 32 random bytes (256 bits)
    const randomBytes = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
    } else {
      // Fallback for development
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    
    // Convert to hex string (64 characters)
    const fullKey = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const segments = segmentBlogKey(fullKey);
    
    const newBlogKeyData: BlogKeyData = {
      fullKey,
      segments,
      version: `v${get().blogKeyHistory.previous.length + 2}`,
      generatedAt: Date.now()
    };
    
    get().setBlogKey(newBlogKeyData);
    return newBlogKeyData;
  },

  rotateBlogKey: () => {
    const newKey = get().generateNewBlogKey();
    // You can add logic here to notify contacts about key rotation
    return newKey;
  },

  updateContactBlogAccess: (contactId, accessLevel) => {
    const { contacts, blogKeyHistory } = get();
    if (!blogKeyHistory.current) return;
    
    const keySegment = get().getKeySegmentForLevel(accessLevel);
    
    const updatedContacts = contacts.map(contact => {
      if (contact.id === contactId) {
        return {
          ...contact,
          blogAccessLevel: accessLevel,
          blogKeySegment: keySegment
        };
      }
      return contact;
    });
    
    set({ contacts: updatedContacts });
  },

  getKeySegmentForLevel: (level) => {
    const { blogKeyHistory } = get();
    if (!blogKeyHistory.current) return null;
    
    const segments = blogKeyHistory.current.segments;
    switch (level) {
      case 0: return null; // Public
      case 1: return segments.tier1;
      case 2: return segments.tier2;
      case 3: return segments.tier3;
      case 4: return segments.tier4;
      case 5: return segments.tier5;
      default: return null;
    }
  },

  importBlogKey: (hexKey) => {
    if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
      throw new Error('Invalid blog key format');
    }
    
    const segments = segmentBlogKey(hexKey);
    const blogKeyData: BlogKeyData = {
      fullKey: hexKey,
      segments,
      version: 'v1',
      generatedAt: Date.now()
    };
    
    get().setBlogKey(blogKeyData);
  }
}));

// Initialize from localStorage
if (typeof window !== 'undefined') {
  const savedApiKey = localStorage.getItem('whatsOnChainApiKey');
  if (savedApiKey) {
    useWalletStore.getState().setWhatsOnChainApiKey(savedApiKey);
  }
  
  // Load blog key history from localStorage
  const savedBlogKeyHistory = localStorage.getItem('blogKeyHistory');
  if (savedBlogKeyHistory) {
    try {
      const history = JSON.parse(savedBlogKeyHistory);
      useWalletStore.setState({ blogKeyHistory: history });
    } catch (e) {
      console.error('Failed to load blog key history from localStorage');
    }
  }
}
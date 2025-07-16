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

}

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
  }

}));

// Initialize API key from localStorage
if (typeof window !== 'undefined') {
  const savedApiKey = localStorage.getItem('whatsOnChainApiKey');
  if (savedApiKey) {
    useWalletStore.getState().setWhatsOnChainApiKey(savedApiKey);
  }
}
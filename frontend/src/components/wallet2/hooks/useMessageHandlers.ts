import { useCallback } from 'react';
import { useWalletStore } from '../store/WalletStore';
import { BlockchainMessageReader, organizeMessagesIntoConversations } from '../utils/blockchain';

export const useMessageHandlers = () => {
  const {
    network,
    keyData,
    contacts,
    whatsOnChainApiKey,
    setBalance,
    setOnChainMessages,
    setBlockchainConversations,
    setLoadingMessages,
    setSelectedConversation
  } = useWalletStore();

  const checkBalance = useCallback(async (address: string) => {
    if (!address) return;
    
    setBalance({ confirmed: 0, unconfirmed: 0, loading: true, error: null });
    
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
        confirmed: 0,
        unconfirmed: 0,
        loading: false,
        error: 'Unable to fetch balance. Try again later.'
      });
    }
  }, [network, setBalance]);

  const fetchOnChainMessages = useCallback(async () => {
    if (!keyData.privateKey || !keyData.address) return;
    
    setLoadingMessages(true);
    try {
      const messageReader = new BlockchainMessageReader(network, whatsOnChainApiKey);
      const messages = await messageReader.fetchMessages(
        keyData.address,
        keyData.privateKey,
        contacts
      );
      setOnChainMessages(messages);
      
      // Organize into conversations
      const conversations = organizeMessagesIntoConversations(messages, contacts, network);
      setBlockchainConversations(conversations);
      
      // Auto-select first conversation if none selected
      const currentSelection = useWalletStore.getState().selectedConversation;
      if (!currentSelection && conversations.length > 0) {
        setSelectedConversation(conversations[0].contactId);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [keyData.privateKey, keyData.address, network, whatsOnChainApiKey, contacts, setLoadingMessages, setOnChainMessages, setBlockchainConversations, setSelectedConversation]);

  return {
    checkBalance,
    fetchOnChainMessages
  };
};
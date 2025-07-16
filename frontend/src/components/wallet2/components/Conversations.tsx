import React, { useState, useEffect } from 'react';
import { PublicKey } from '@bsv/sdk';
import { useWalletStore } from '../store/WalletStore';
import { useMessageHandlers } from '../hooks/useMessageHandlers';
import { MessageTransaction, SimpleTestnetBroadcaster, UTXOManager } from '../utils/blockchain';

export const Conversations: React.FC = () => {
  const [showDecrypted, setShowDecrypted] = useState<boolean>(false);
  const [newConversationMessage, setNewConversationMessage] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [messageViewMode, setMessageViewMode] = useState<'all' | 'contact' | 'conversations'>('all');
  const [selectedMessageContact, setSelectedMessageContact] = useState<string>('');
  const [selectedConversationView, setSelectedConversationView] = useState<string | null>(null);
  const [selectedConversationContact, setSelectedConversationContact] = useState<any>(null);

  const {
    network,
    keyData,
    balance,
    contacts,
    onChainMessages,
    selectedConversation,
    setSelectedConversation,
    loadingMessages,
    whatsOnChainApiKey,
    setWhatsOnChainApiKey,
    addSentTransaction,
    sentTransactions
  } = useWalletStore();

  const { fetchOnChainMessages, checkBalance } = useMessageHandlers();

  // Update selected conversation contact when conversation changes
  useEffect(() => {
    const contact = contacts.find(c => c.id === selectedConversation);
    setSelectedConversationContact(contact || null);
  }, [selectedConversation, contacts]);

  // Get filtered messages based on view mode
  const getFilteredMessages = () => {
    if (messageViewMode === 'all') {
      return onChainMessages;
    } else if (messageViewMode === 'contact' && selectedMessageContact) {
      const contact = contacts.find(c => c.id === selectedMessageContact);
      if (!contact) return [];
      
      const contactAddress = PublicKey.fromString(contact.publicKeyHex).toAddress(network).toString();
      
      return onChainMessages.filter(msg => 
        msg.sender === contactAddress || msg.recipient === contactAddress ||
        msg.sender === contact.name || msg.recipient === contact.name
      );
    } else if (messageViewMode === 'conversations') {
      const latestMessages: { [key: string]: any } = {};
      
      onChainMessages.forEach(msg => {
        const otherParty = msg.isFromMe ? msg.recipient : msg.sender;
        if (!latestMessages[otherParty] || msg.timestamp > latestMessages[otherParty].timestamp) {
          latestMessages[otherParty] = msg;
        }
      });
      
      return Object.values(latestMessages);
    }
    return [];
  };

  // Get conversation messages for a specific contact
  const getConversationMessages = (contactAddress: string) => {
    return onChainMessages.filter(msg => 
      msg.sender === contactAddress || msg.recipient === contactAddress
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  // Send message to blockchain
  const sendMessageToBlockchain = async () => {
    if (!keyData.privateKey || !newConversationMessage.trim()) {
      setTransactionStatus('Error: Missing private key or message');
      return;
    }

    const selectedContact = contacts.find(c => c.id === selectedConversation);
    if (!selectedContact) {
      setTransactionStatus('Error: Please select a contact');
      return;
    }

    try {
      setSendingMessage(true);
      setTransactionStatus('Preparing transaction...');

      const recipientPubKey = PublicKey.fromString(selectedContact.publicKeyHex);
      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const messageTransaction = new MessageTransaction(keyData.privateKey, network);

      setTransactionStatus('Fetching UTXOs...');
      const utxos = await utxoManager.fetchUTXOs();
      
      if (utxos.length === 0) {
        const balanceCheck = await fetch(
          `https://api.whatsonchain.com/v1/bsv/test/address/${keyData.address}/balance`
        );
        const balanceData = await balanceCheck.json();
        
        setTransactionStatus(`Error: No UTXOs found. Balance: ${balanceData.confirmed} confirmed, ${balanceData.unconfirmed} unconfirmed`);
        return;
      }
      
      const { selected, total } = utxoManager.selectUTXOs(1500);
      
      if (selected.length === 0 || total < 1500) {
        setTransactionStatus(`Error: Insufficient funds. Found ${total} satoshis but need at least 1500`);
        return;
      }

      setTransactionStatus('Creating transaction...');
      const tx = await messageTransaction.createMessageTx(
        recipientPubKey,
        newConversationMessage,
        selected
      );

      setTransactionStatus('Broadcasting transaction...');
      const broadcaster = new SimpleTestnetBroadcaster();
      const result = await broadcaster.broadcast(tx);
      
      if (result.status === 'success' && result.txid) {
        setTransactionStatus(`Success! TXID: ${result.txid}`);
        console.log(`Transaction broadcasted! TXID: ${result.txid}`);
        console.log(`View on WhatsOnChain: https://whatsonchain.com/tx/${result.txid}`);
        
        addSentTransaction(result.txid);
        setNewConversationMessage('');
        
        setTimeout(() => {
          fetchOnChainMessages();
          checkBalance(keyData.address);
        }, 5000);
      } else {
        throw new Error(result.error || 'Broadcast failed');
      }
      
    } catch (error) {
      console.error('Transaction error:', error);
      setTransactionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div>
      <div className="mb-4 p-4 bg-cyan-900 bg-opacity-20 rounded-lg border border-cyan-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-white">Encrypted Conversations</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Decrypt Messages</span>
            <button
              onClick={() => setShowDecrypted(!showDecrypted)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showDecrypted ? 'bg-cyan-500' : 'bg-gray-600'
              } ${!keyData.privateKey ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!keyData.privateKey}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showDecrypted ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <label className="text-sm text-gray-300">Select Contact:</label>
          <select
            value={selectedConversation}
            onChange={(e) => setSelectedConversation(e.target.value)}
            className="flex-1 px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={!keyData.privateKey}
          >
            <option value="">Choose a contact to message...</option>
            {contacts.map(contact => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </div>
        
        {!keyData.privateKey && (
          <p className="mt-2 text-sm text-yellow-400">⚠️ Generate or import a private key to decrypt messages</p>
        )}
      </div>

      {/* On-Chain Messages Section */}
      {keyData.privateKey && (
        <div className="mb-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">On-Chain Messages</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchOnChainMessages}
                disabled={loadingMessages}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm disabled:bg-gray-600"
              >
                {loadingMessages ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={() => {
                  const apiKey = prompt('Enter WhatsOnChain API Key:', whatsOnChainApiKey);
                  if (apiKey !== null) {
                    setWhatsOnChainApiKey(apiKey);
                  }
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                title="Set API Key for higher rate limits"
              >
                API Key
              </button>
            </div>
          </div>
          
          {whatsOnChainApiKey && (
            <p className="text-xs text-green-400 mb-2">✓ Using API key for enhanced rate limits</p>
          )}

          {/* View Mode Selector */}
          <div className="mb-3 flex items-center gap-2">
            <label className="text-sm text-gray-300">View:</label>
            <select
              value={messageViewMode}
              onChange={(e) => {
                setMessageViewMode(e.target.value as any);
                setSelectedConversationView(null);
              }}
              className="flex-1 px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">View All Messages</option>
              <option value="contact">Filter by Contact</option>
              <option value="conversations">Conversation List</option>
            </select>
            
            {messageViewMode === 'contact' && (
              <select
                value={selectedMessageContact}
                onChange={(e) => setSelectedMessageContact(e.target.value)}
                className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select contact...</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {/* Messages Display */}
          {selectedConversationView ? (
            // Conversation View
            <div>
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setSelectedConversationView(null)}
                  className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                >
                  ← Back to list
                </button>
                <span className="text-sm text-gray-400">
                  Conversation with {selectedConversationView}
                </span>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto bg-gray-800 rounded p-3">
                {getConversationMessages(selectedConversationView).map((msg) => (
                  <div
                    key={msg.txid}
                    className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs ${msg.isFromMe ? 'order-2' : 'order-1'}`}>
                      <div className={`px-3 py-2 rounded-lg ${
                        msg.isFromMe 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-600 text-white'
                      }`}>
                        <p className="text-sm">
                          {msg.message.startsWith('[Encrypted:') ? (
                            <span className="text-yellow-300">{msg.message}</span>
                          ) : (
                            <span>{msg.message}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center justify-between px-1 mt-1">
                        <p className="text-xs text-gray-400">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                        <a 
                          href={`https://whatsonchain.com/tx/${msg.txid}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          TX
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // List View
            <div>
              {getFilteredMessages().length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getFilteredMessages().map((msg) => (
                    <div 
                      key={msg.txid} 
                      className={`p-2 rounded cursor-pointer hover:bg-opacity-50 ${
                        msg.isFromMe ? 'bg-blue-900 bg-opacity-30' : 'bg-gray-800'
                      } ${messageViewMode === 'conversations' ? 'hover:bg-gray-700' : ''}`}
                      onClick={() => {
                        if (messageViewMode === 'conversations') {
                          const otherParty = msg.isFromMe ? msg.recipient : msg.sender;
                          setSelectedConversationView(otherParty);
                        }
                      }}
                    >
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>
                          {msg.isFromMe ? 'To: ' + msg.recipient : 'From: ' + msg.sender}
                        </span>
                        <span>{msg.timestamp.toLocaleString()}</span>
                      </div>
                      <p className="text-sm mt-1">
                        {msg.message.startsWith('[Encrypted:') ? (
                          <span className="text-yellow-400">{msg.message}</span>
                        ) : (
                          <span>{msg.message}</span>
                        )}
                      </p>
                      {messageViewMode === 'conversations' && (
                        <p className="text-xs text-cyan-400 mt-1">
                          Click to view conversation →
                        </p>
                      )}
                      {msg.message.startsWith('[Encrypted:') && messageViewMode !== 'conversations' && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-400 cursor-pointer">View full encrypted data</summary>
                          <p className="text-xs font-mono text-gray-500 break-all mt-1">
                            {msg.encrypted}
                          </p>
                        </details>
                      )}
                      {messageViewMode !== 'conversations' && (
                        <a 
                          href={`https://whatsonchain.com/tx/${msg.txid}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:text-cyan-300 inline-block mt-1"
                        >
                          View TX
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  <p>
                    {messageViewMode === 'contact' && !selectedMessageContact
                      ? 'Please select a contact to view messages'
                      : 'No messages found'}
                  </p>
                  {sentTransactions.length > 0 && messageViewMode === 'all' && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Recent sent transactions:</p>
                      {sentTransactions.slice(-3).map(txid => (
                        <a 
                          key={txid}
                          href={`https://whatsonchain.com/tx/${txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          {txid.substring(0, 16)}...
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Send Message Section */}
      <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
        <h3 className="text-lg font-semibold mb-3 text-white">Send Encrypted Message</h3>
        
        <div className="space-y-3">
          <textarea
            value={newConversationMessage}
            onChange={(e) => setNewConversationMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={3}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={!keyData.privateKey || sendingMessage}
          />
          
          <div className="flex items-center justify-between">
            <button
              onClick={sendMessageToBlockchain}
              disabled={!keyData.privateKey || !newConversationMessage.trim() || sendingMessage}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {sendingMessage ? 'Sending...' : 'Send to Blockchain'}
            </button>
            
            {transactionStatus && (
              <p className={`text-sm ${
                transactionStatus.includes('Error') ? 'text-red-400' : 
                transactionStatus.includes('Demo') ? 'text-yellow-400' : 
                'text-green-400'
              }`}>
                {transactionStatus}
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600">
          <div className="mb-2">
            <p className="text-xs text-gray-400">
              <span className="font-medium text-cyan-400">How it works:</span> Your message will be encrypted using 
              standard ECDH with {selectedConversationContact?.name || 'the selected contact'}'s public key.
            </p>
          </div>
          {network === 'testnet' && (
            <p className="text-xs text-green-400 mt-2">
              ✓ Testnet Mode: Real transactions will be broadcast to the BSV testnet.
            </p>
          )}
          {balance.confirmed < 2000 && (
            <p className="text-xs text-yellow-400 mt-2">
              ⚠️ Low Balance: You need at least 2000 satoshis to send a message. Current: {balance.confirmed} sats
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
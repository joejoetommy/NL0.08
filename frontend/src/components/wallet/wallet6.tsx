
import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../wallet2/store/WalletStore';
import { Wallet } from '../wallet2/components/Wallet';
import { Contacts } from '../wallet2/components/Contacts';
import { Messages } from '../wallet2/components/Messages';
import { Conversations } from '../wallet2/components/Conversations';
import { ProfileToken } from '../wallet2/components/ProfileToken4';
import { examplePublicKeys } from './data2';

type ViewMode = 'wallet' | 'contacts' | 'messages' | 'conversations' | 'profiles' | 'Token';

const WalletApp: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('wallet');
  
  const {
    network,
    setNetwork,
    keyData,
    setContacts,
    updateContactSharedSecrets
  } = useWalletStore();

  // Load example contacts on component mount
  useEffect(() => {
    const loadedContacts = examplePublicKeys.map(example => ({
      id: `example-${Date.now()}-${Math.random()}`,
      name: example.name,
      publicKeyHex: example.publicKey,
      sharedSecret: ''
    }));
    
    setContacts(loadedContacts);
    
    if (keyData.privateKey) {
      updateContactSharedSecrets(keyData.privateKey);
    }
  }, []);

  // Update shared secrets when private key changes  dateFns.addYears
  useEffect(() => {
    if (keyData.privateKey) {
      updateContactSharedSecrets(keyData.privateKey);
    }
  }, [keyData.privateKey]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
          <h1 className="text-3xl font-bold text-center mb-6 text-white">BSV Wallet</h1>
          
          {/* Tab Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setViewMode('profiles')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'profiles'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Profiles
              </button>
              <button
                onClick={() => setViewMode('conversations')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'conversations'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Conversations
              </button>
              <button
                onClick={() => setViewMode('messages')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'messages'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setViewMode('contacts')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'contacts'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Contacts
              </button>
              <button
                onClick={() => setViewMode('wallet')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'wallet'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Wallet
              </button>
            </div>
            
            {/* Network Selector */}
            <div className="flex space-x-2">
              <button
                onClick={() => setNetwork('mainnet')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  network === 'mainnet'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Mainnet
              </button>
              <button
                onClick={() => setNetwork('testnet')}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  network === 'testnet'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Testnet
              </button>
            </div>
          </div>

          {/* Content based on view mode */}
          {viewMode === 'profiles' && <ProfileToken />}

          {viewMode === 'conversations' && <Conversations />}
          {viewMode === 'messages' && <Messages />}
          {viewMode === 'contacts' && <Contacts />}
          {viewMode === 'wallet' && <Wallet />}
        </div>
      </div>
    </div>
  );
};

export default WalletApp;

// my first profile token push ff7c802657c3b421cbe8452af6307b8efdec6d009a18f24cf89baced5d96f87d
// my 2nd 99f25888161d9e7b67ba22c199916b6fa241358ab2cb84f266a01e1b35be30f9
// my 3rd 
//xpri 6811543cdaae96cc602c2ed5efe517bf86cecdb0abbe678eb957b86bf8d3ff13   muCRZXdunSqaKv5REC37Ahf6ZUAK2yqKes
// testnet_65360009fe0348a739b9227d9e770979

//////////////////////////////////////////
// 1de096339a813a63f3bb829ddbcd307086e426c498811986700c275f35c1ac04

// mzoFnR9fpyLh3Sabvx3oiXDFtPspXKusms


// 1st 1SAT
// 6455ef4c2f45230cf29a8c09b920ca81e89a0b92ff54860b64d3c057760c4ac4 
// {
//   "type": "jesus is the only way",
//   "message": "remember to go to him, all who are heavy laden and you will find rest"
// }



import React, { useState, useEffect } from 'react';
import { useWalletStore } from './store/WalletStore';
import { Wallet } from './components/Wallet';
import { Contacts } from './components/Contacts';
import { Messages } from './components/Messages';
import { Conversations } from './components/Conversations';
import { ProfileToken } from './components/ProfileToken';
import { examplePublicKeys } from './data2';

type ViewMode = 'wallet' | 'contacts' | 'messages' | 'conversations' | 'profiles';

const App: React.FC = () => {
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

  // Update shared secrets when private key changes
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
          {viewMode === 'conversations' && <Conversations />}
          {viewMode === 'messages' && <Messages />}
          {viewMode === 'contacts' && <Contacts />}
          {viewMode === 'profiles' && <ProfileToken />}
          {viewMode === 'wallet' && <Wallet />}
        </div>
      </div>
    </div>
  );
};

export default App;





















// private key constant example   bb7de301b9e7545d21cfe40ef725e76013e0cc679bfb86321bb3fb786d9a4f81       mainnet
// private key constant example   40ec104cd6bd0095d5b3b533da030106a09e5f1273a1434f75f0f0ae3b758a2e       testnet
// Public Key Formats
// balance 

import React, { useState, useEffect } from 'react';
// @ts-ignore
import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
import { examplePublicKeys, getRandomExamplePublicKey } from './data2';
// Remove contact
  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };


type Network = 'mainnet' | 'testnet';
type ViewMode = 'wallet' | 'contacts';

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

const Wallet: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('wallet');
  const [network, setNetwork] = useState<Network>('mainnet');
  const [inputKey, setInputKey] = useState<string>('');
  const [keyData, setKeyData] = useState<KeyData>({
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
  const [error, setError] = useState<string>('');
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  
  // Contacts state
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactPubKey, setNewContactPubKey] = useState<string>('');
  const [contactError, setContactError] = useState<string>('');
  
  // Balance state
  const [balance, setBalance] = useState<BalanceInfo>({
    confirmed: 0,
    unconfirmed: 0,
    loading: false,
    error: null
  });

  // Generate random private key
  const generateRandomKey = () => {
    try {
      // Alternative approach if PrivateKey.fromRandom() doesn't work
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
      
      // Set the input field to show the generated private key in hex format
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
      
      // Try different formats
      if (inputKey.startsWith('L') || inputKey.startsWith('K') || inputKey.startsWith('5')) {
        // WIF format
        privKey = PrivateKey.fromWif(inputKey.trim());
      } else if (inputKey.length === 64) {
        // Hex format
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
      
      // Get address based on network
      const address = network === 'testnet' 
        ? pubKey.toAddress('testnet').toString()
        : pubKey.toAddress('mainnet').toString();

      // Extract raw public key coordinates
      let xCoord = '';
      let yCoord = '';
      
      try {
        // Try to access point coordinates if available
        if (pubKey.point && pubKey.point.x && pubKey.point.y) {
          xCoord = pubKey.point.x.toString(16).padStart(64, '0');
          yCoord = pubKey.point.y.toString(16).padStart(64, '0');
        } else {
          // Fallback: extract from DER or compressed format
          const pubKeyHex = pubKey.toString();
          if (pubKeyHex.startsWith('02') || pubKeyHex.startsWith('03')) {
            // Compressed format - we can at least show the x coordinate
            xCoord = pubKeyHex.slice(2);
            yCoord = 'Compressed format - Y coordinate derived from X';
          } else if (pubKeyHex.startsWith('04')) {
            // Uncompressed format
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
      
      // Update shared secrets for contacts
      updateContactSharedSecrets(privKey);
    } catch (err) {
      console.error('Error processing private key:', err);
      setError('Error processing key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Update shared secrets when private key changes
  const updateContactSharedSecrets = (privKey: PrivateKey) => {
    setContacts(prevContacts => 
      prevContacts.map(contact => {
        try {
          const contactPubKey = PublicKey.fromString(contact.publicKeyHex);
          const sharedSecret = privKey.deriveSharedSecret(contactPubKey);
          return {
            ...contact,
            sharedSecret: sharedSecret.toString()
          };
        } catch {
          return contact;
        }
      })
    );
  };

  // Add new contact
  const addContact = () => {
    if (!newContactName.trim()) {
      setContactError('Please enter a contact name');
      return;
    }
    if (!newContactPubKey.trim()) {
      setContactError('Please enter a public key');
      return;
    }

    try {
      // Validate public key
      const pubKey = PublicKey.fromString(newContactPubKey.trim());
      
      // Calculate shared secret if we have a private key
      let sharedSecret = '';
      if (keyData.privateKey) {
        const secret = keyData.privateKey.deriveSharedSecret(pubKey);
        sharedSecret = secret.toString();
      }

      const newContact: SavedContact = {
        id: Date.now().toString(),
        name: newContactName.trim(),
        publicKeyHex: pubKey.toString(),
        sharedSecret
      };

      setContacts([...contacts, newContact]);
      setNewContactName('');
      setNewContactPubKey('');
      setContactError('');
    } catch (err) {
      setContactError('Invalid public key format');
    }
  };

  // Check balance for address
  const checkBalance = async (address: string) => {
    if (!address) return;
    
    setBalance(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // WhatsOnChain API endpoints
      const baseUrl = network === 'testnet' 
        ? 'https://api.whatsonchain.com/v1/bsv/test'
        : 'https://api.whatsonchain.com/v1/bsv/main';
      
      // Fetch balance
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
      setBalance(prev => ({
        ...prev,
        loading: false,
        error: 'Unable to fetch balance. Try again later.'
      }));
    }
  };

  // Format satoshis to BSV
  const formatBSV = (satoshis: number): string => {
    const bsv = satoshis / 100000000;
    return bsv.toFixed(8).replace(/\.?0+$/, '');
  };

  // Load example contacts on component mount
  useEffect(() => {
    // Auto-load example public keys as contacts
    const loadedContacts: SavedContact[] = examplePublicKeys.map(example => ({
      id: `example-${Date.now()}-${Math.random()}`,
      name: example.name,
      publicKeyHex: example.publicKey,
      sharedSecret: ''
    }));
    
    setContacts(loadedContacts);
    
    // If we have a private key, calculate shared secrets
    if (keyData.privateKey) {
      updateContactSharedSecrets(keyData.privateKey);
    }
  }, []); // Run once on mount

  // Update addresses and shared secrets when network or keys change
  useEffect(() => {
    if (keyData.publicKey) {
      const address = network === 'testnet'
        ? keyData.publicKey.toAddress('testnet').toString()
        : keyData.publicKey.toAddress('mainnet').toString();
      
      setKeyData(prev => ({ ...prev, address }));
      
      // Check balance for new address
      checkBalance(address);
    }
    
    // Update shared secrets if we have a private key
    if (keyData.privateKey) {
      updateContactSharedSecrets(keyData.privateKey);
    }
  }, [network, keyData.publicKey, keyData.privateKey]);

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
          <h1 className="text-3xl font-bold text-center mb-6 text-white">BSV Wallet</h1>
        
        {/* Tab Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-4">
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

        {/* Contacts View */}
        {viewMode === 'contacts' && (
          <div>
            <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
              <h2 className="text-xl font-semibold mb-4 text-white">Add Contact</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Contact name"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  value={newContactPubKey}
                  onChange={(e) => setNewContactPubKey(e.target.value)}
                  placeholder="Public key (hex format)"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addContact}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Add Contact
                  </button>
                  <button
                    onClick={() => {
                      const example = getRandomExamplePublicKey();
                      setNewContactName(example.name);
                      setNewContactPubKey(example.publicKey);
                    }}
                    className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    title="Load example contact"
                  >
                    Load Example
                  </button>
                </div>
                {contactError && (
                  <p className="text-red-600 text-sm">{contactError}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Saved Contacts</h2>
              {contacts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No contacts saved yet</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-600 rounded-lg p-3 bg-gray-700">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="bg-gray-800 rounded-lg p-3 border border-gray-600">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{contact.name}</h3>
                          <p className="text-xs text-gray-400 mt-1 break-all">
                            <span className="font-medium text-gray-300">Public Key:</span> {contact.publicKeyHex}
                          </p>
                          {contact.sharedSecret && (
                            <p className="text-xs text-purple-400 mt-2 break-all">
                              <span className="font-medium">ECDH Shared Secret:</span> {contact.sharedSecret}
                            </p>
                          )}
                          {!contact.sharedSecret && keyData.privateKey && (
                            <p className="text-xs text-gray-500 mt-2">
                              Generate a private key to see shared secret
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeContact(contact.id)}
                          className="ml-2 text-red-400 hover:text-red-300"
                          title="Remove contact"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wallet View */}
        {viewMode === 'wallet' && (
          <>

        {/* Key Generation Section */}
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
                // Use a test private key for debugging
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

        {/* Key Display Section */}
        {keyData.privateKey && (
          <>
            {/* Receiving Address */}
            <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
              <h2 className="text-xl font-semibold mb-2 text-white">Receiving Address</h2>
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
              
              {/* Balance Display */}
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

            {/* Private Key Formats */}
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

            {/* Public Key Formats */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-black">Public Key Formats</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-black">Hex Format (Compressed):</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-white rounded border border-green-200 text-xs break-all">
                      <span className="font-medium text-black" >{keyData.publicKeyHex}</span> 
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
                  <label className="text-sm font-medium text-black">DER Format:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-white rounded border border-green-200 text-xs break-all">
                      <span className="font-medium text-black" >{keyData.publicKeyDER}</span>
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
                  <label className="text-sm font-medium text-black">Raw Public Key Coordinates:</label>
                  <div className="mt-1 p-2 bg-white rounded border border-green-200 text-xs">
                    <div className="break-all">
                      <span className="font-medium text-black">X:</span><span className="font-medium text-black"> {keyData.publicKeyRaw.x}</span>
                    </div>
                    <div className="break-all mt-1">
                      <span className="font-medium text-black">Y:</span> <span className="font-medium text-black">{keyData.publicKeyRaw.y}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        </>
        )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;










  {/* 
    
    
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-black">Public Key Formats</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-black">Hex Format (Compressed):</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-white rounded border border-green-200 text-xs break-all">
                      <span className="font-medium text-black" >{keyData.publicKeyHex}</span> 
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
                  <label className="text-sm font-medium text-black">DER Format:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-white rounded border border-green-200 text-xs break-all">
                      <span className="font-medium text-black" >{keyData.publicKeyDER}</span>
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
                  <label className="text-sm font-medium text-black">Raw Public Key Coordinates:</label>
                  <div className="mt-1 p-2 bg-white rounded border border-green-200 text-xs">
                    <div className="break-all">
                      <span className="font-medium text-black">X:</span><span className="font-medium text-black"> {keyData.publicKeyRaw.x}</span>
                    </div>
                    <div className="break-all mt-1">
                      <span className="font-medium text-black">Y:</span> <span className="font-medium text-black">{keyData.publicKeyRaw.y}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
    
    */}

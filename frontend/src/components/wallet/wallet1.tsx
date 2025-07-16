import React, { useState, useEffect } from 'react';
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
  address: string;
}

const Wallet: React.FC = () => {
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
    address: ''
  });
  const [error, setError] = useState<string>('');
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);

  // Generate random private key balance 
  const generateRandomKey = () => {
    try {
      const privKey = PrivateKey.fromRandom();
      // Set the input field to show the generated private key in hex format
      setInputKey(privKey.toHex());
      processPrivateKey(privKey);
      setError('');
    } catch (err) {
      setError('Failed to generate random key');
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
    const pubKey = privKey.toPublicKey();
    
    // Get address based on network
    const address = network === 'testnet' 
      ? pubKey.toAddress('testnet').toString()
      : pubKey.toAddress('mainnet').toString();

    setKeyData({
      privateKey: privKey,
      publicKey: pubKey,
      privateKeyHex: privKey.toHex(),
      privateKeyWif: privKey.toWif(),
      privateKeyBinary: privKey.toArray(),
      publicKeyHex: pubKey.toString(),
      publicKeyDER: Utils.toHex(pubKey.toDER()),
      address: address
    });
  };

  // Update address when network changes
  useEffect(() => {
    if (keyData.publicKey) {
      const address = network === 'testnet'
        ? keyData.publicKey.toAddress('testnet').toString()
        : keyData.publicKey.toAddress('mainnet').toString();
      
      setKeyData(prev => ({ ...prev, address }));
    }
  }, [network, keyData.publicKey]);

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">BSV Wallet</h1>
        
        {/* Network Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
          <div className="flex space-x-4">
            <button
              onClick={() => setNetwork('mainnet')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                network === 'mainnet'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Mainnet
            </button>
            <button
              onClick={() => setNetwork('testnet')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                network === 'testnet'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Testnet
            </button>
          </div>
        </div>

        {/* Key Generation Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Generate or Import Private Key</h2>
          
          <div className="mb-4">
            <button
              onClick={generateRandomKey}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Generate Random Private Key
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Enter private key (hex or WIF format)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={importPrivateKey}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Import Key
            </button>
          </div>

          {error && (
            <p className="mt-2 text-red-600 text-sm">{error}</p>
          )}
        </div>

        {/* Key Display Section */}
        {keyData.privateKey && (
          <>
            {/* Receiving Address */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Receiving Address</h2>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-white rounded border border-blue-200 text-sm break-all">
                  {keyData.address}
                </code>
                <button
                  onClick={() => copyToClipboard(keyData.address, 'Address')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  title="Copy address"
                >
                  📋
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Network: <span className="font-medium">{network}</span>
              </p>
            </div>

            {/* Private Key Formats */}
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Private Key Formats</h2>
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {showPrivateKey ? 'Hide' : 'Show'} Private Keys
                </button>
              </div>
              
              {showPrivateKey && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Hex Format:</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-white rounded border border-red-200 text-xs break-all">
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
                    <label className="text-sm font-medium text-gray-700">WIF Format:</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-white rounded border border-red-200 text-xs break-all">
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
                    <label className="text-sm font-medium text-gray-700">Binary Format (first 10 bytes):</label>
                    <code className="block mt-1 p-2 bg-white rounded border border-red-200 text-xs">
                      [{keyData.privateKeyBinary.slice(0, 10).join(', ')}...]
                    </code>
                  </div>
                </div>
              )}
              
              <p className="mt-3 text-xs text-red-600 font-medium">
                ⚠️ Warning: Never share your private key with anyone!
              </p>
            </div>

            {/* Public Key Formats */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Public Key Formats</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Hex Format (Compressed):</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-white rounded border border-green-200 text-xs break-all">
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
                  <label className="text-sm font-medium text-gray-700">DER Format:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-white rounded border border-green-200 text-xs break-all">
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
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wallet;

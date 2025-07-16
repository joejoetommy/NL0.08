import React, { useState, useEffect } from 'react';
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

export const Wallet: React.FC = () => {
  const [inputKey, setInputKey] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  
  const {
    network,
    keyData,
    balance,
    setKeyData,
    setBalance,
    updateContactSharedSecrets
  } = useWalletStore();

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
            </div>
          </div>
        </>
      )}
    </>
  );
};
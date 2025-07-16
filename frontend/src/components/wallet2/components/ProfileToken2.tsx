import React, { useState } from 'react';
import { useWalletStore } from '../store/WalletStore';
import { UTXOManager } from '../utils/blockchain';
import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';

// Simple test data for initial development
const TEST_DATA = {
  small: { type: 'test', message: 'Hello BSV!' },
  medium: { type: 'profile', name: 'Test User', bio: 'Testing 1Sat Ordinals' },
  large: { 
    type: 'profile',
    username: 'testuser',
    title: 'BSV Developer',
    mission: 'Building on Bitcoin SV',
    timestamp: Date.now()
  }
};

export const ProfileToken: React.FC = () => {
  const [testSize, setTestSize] = useState<'small' | 'medium' | 'large'>('small');
  const [customData, setCustomData] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
    type: null, 
    message: '' 
  });
  const [lastTxid, setLastTxid] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();

  // Backend proxy URL - make sure this matches your running server
  const BROADCAST_PROXY_URL = 'http://localhost:3001';

  // Create the inscription script
  const createInscriptionScript = (pubKeyHash: number[], data: string): Script => {
    const script = new Script();
    
    // P2PKH locking script first
    script.writeBin([0x76, 0xa9, 0x14]); // OP_DUP OP_HASH160 PUSH(20)
    script.writeBin(pubKeyHash);
    script.writeBin([0x88, 0xac]); // OP_EQUALVERIFY OP_CHECKSIG
    
    // Inscription envelope
    script.writeBin([0x00, 0x63]); // OP_FALSE OP_IF
    
    // "ord" marker
    script.writeBin([0x03]); // PUSH(3)
    script.writeBin([0x6f, 0x72, 0x64]); // "ord"
    
    script.writeBin([0x51]); // OP_1
    
    // Content type
    const contentType = 'application/json';
    const ctBytes = Utils.toArray(contentType, 'utf8');
    script.writeBin([ctBytes.length]);
    script.writeBin(ctBytes);
    
    script.writeBin([0x00]); // OP_0
    
    // Data
    const dataBytes = Utils.toArray(data, 'utf8');
    
    // Handle different data sizes
    if (dataBytes.length <= 75) {
      script.writeBin([dataBytes.length]);
      script.writeBin(dataBytes);
    } else if (dataBytes.length <= 255) {
      script.writeBin([0x4c]); // OP_PUSHDATA1
      script.writeBin([dataBytes.length]);
      script.writeBin(dataBytes);
    } else {
      script.writeBin([0x4d]); // OP_PUSHDATA2
      script.writeBin([dataBytes.length & 0xff]);
      script.writeBin([dataBytes.length >> 8]);
      script.writeBin(dataBytes);
    }
    
    script.writeBin([0x68]); // OP_ENDIF
    
    return script;
  };

  // Broadcast transaction through backend proxy with better error handling
  const broadcastTransaction = async (txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> => {
    console.log('Starting broadcast to backend proxy at:', BROADCAST_PROXY_URL);
    
    try {
      // First verify the backend is accessible
      const healthCheck = await fetch(`${BROADCAST_PROXY_URL}/health`).catch(() => null);
      if (!healthCheck || !healthCheck.ok) {
        console.error('Backend proxy is not accessible at', BROADCAST_PROXY_URL);
        throw new Error('Backend proxy server is not running or not accessible');
      }

      // Now broadcast the transaction
      console.log('Broadcasting transaction of size:', txHex.length / 2, 'bytes');
      
      const response = await fetch(`${BROADCAST_PROXY_URL}/api/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHex,
          network: network === 'testnet' ? 'test' : 'main'
        })
      });

      console.log('Broadcast response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Broadcast failed with status:', response.status, 'Error:', errorText);
        throw new Error(`Broadcast failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('Broadcast result:', result);

      if (result.success && result.txid) {
        return {
          success: true,
          txid: result.txid
        };
      } else {
        throw new Error(result.error || result.message || 'Unknown broadcast error');
      }

    } catch (error) {
      console.error('Broadcast error:', error);
      
      // Log the transaction hex for manual broadcast
      console.log('\n=== TRANSACTION HEX FOR MANUAL BROADCAST ===');
      console.log(txHex);
      console.log('===========================================\n');
      
      // Try to copy to clipboard
      try {
        await navigator.clipboard.writeText(txHex);
        console.log('✓ Transaction hex copied to clipboard!');
      } catch (e) {
        console.log('Could not copy to clipboard');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during broadcast'
      };
    }
  };

  // Create simple ordinal
  const createSimpleOrdinal = async () => {
    if (!keyData.privateKey) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Creating ordinal inscription...' });

    try {
      // Get test data
      const testData = customData || JSON.stringify(TEST_DATA[testSize]);
      const dataSize = new TextEncoder().encode(testData).length;
      
      console.log('Creating ordinal with data:', testData);
      console.log('Data size:', dataSize, 'bytes');

      // Get UTXOs
      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs();
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available. Please fund your wallet.');
      }

      // Calculate fee (rough estimate)
      const feeEstimate = 200 + Math.ceil(dataSize * 0.5); // Base fee + data fee
      const { selected, total } = utxoManager.selectUTXOs(1 + feeEstimate);
      
      if (selected.length === 0) {
        throw new Error(`Insufficient funds. Need at least ${1 + feeEstimate} satoshis.`);
      }

      console.log(`Selected ${selected.length} UTXOs with total ${total} satoshis`);

      // Create private key
      const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
      const publicKey = privateKey.toPublicKey();
      const address = publicKey.toAddress();
      const pubKeyHash = publicKey.toHash();

      // Create inscription script
      const inscriptionScript = createInscriptionScript(pubKeyHash, testData);

      // Create transaction
      const tx = new Transaction();

      // Add inputs
      let totalInput = 0;
      for (const utxo of selected) {
        const txid = utxo.tx_hash || utxo.txid;
        const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : 0;
        const satoshis = utxo.value || utxo.satoshis || 0;
        
        totalInput += satoshis;

        // Create source transaction for the input
        const sourceTransaction = {
          id: txid,
          outputs: [{
            satoshis: satoshis,
            lockingScript: new P2PKH().lock(address)
          }]
        };

        tx.addInput({
          sourceTXID: txid,
          sourceOutputIndex: vout,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
          sourceTransaction: sourceTransaction
        });
      }

      // Output 1: The ordinal (1 satoshi)
      tx.addOutput({
        lockingScript: inscriptionScript,
        satoshis: 1
      });

      // Output 2: Change
      const change = totalInput - 1 - feeEstimate;
      if (change > 0) {
        tx.addOutput({
          lockingScript: new P2PKH().lock(address),
          satoshis: change
        });
      }

      // Sign transaction
      await tx.sign();

      // Get transaction details
      const txHex = tx.toHex();
      const txSize = txHex.length / 2;
      const actualFee = totalInput - 1 - (change > 0 ? change : 0);

      console.log('Transaction details:');
      console.log('- Size:', txSize, 'bytes');
      console.log('- Fee:', actualFee, 'satoshis');
      console.log('- Fee rate:', (actualFee / txSize).toFixed(2), 'sats/byte');

      // Broadcast transaction
      setStatus({ type: 'info', message: 'Broadcasting transaction...' });
      const result = await broadcastTransaction(txHex);

      if (result.success) {
        setLastTxid(result.txid!);
        setStatus({ 
          type: 'success', 
          message: `Ordinal created! TXID: ${result.txid}` 
        });
        
        // Show inscription ID
        console.log('Inscription ID:', `${result.txid}_0`);
        
        // Important: Clear UTXO cache so next transaction gets fresh UTXOs
        console.log('Transaction successful! Clearing UTXO cache for next transaction...');
        
        // Wait a moment for the transaction to propagate
        setTimeout(() => {
          setStatus({ 
            type: 'success', 
            message: `Ordinal created! TXID: ${result.txid}\nWait a few seconds before creating another ordinal.` 
          });
        }, 2000);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error creating ordinal:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create ordinal' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
        <h2 className="text-xl font-semibold text-white">Simple 1Sat Ordinals Tester</h2>
        <p className="text-sm text-gray-300 mt-1">Test creating ordinals with small data payloads</p>
      </div>

      {/* Status Message */}
      {status.type && (
        <div className={`mb-4 p-3 rounded-lg ${
          status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
          status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
          'bg-blue-900 bg-opacity-50 text-blue-300'
        }`}>
          {status.message}
          {lastTxid && status.type === 'success' && (
            <div className="mt-2">
              <a 
                href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${lastTxid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline text-sm"
              >
                View on WhatsOnChain →
              </a>
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
        <div className="space-y-4">
          {/* Test Data Size Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Test Data Size</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTestSize('small')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  testSize === 'small'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Small (~30 bytes)
              </button>
              <button
                onClick={() => setTestSize('medium')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  testSize === 'medium'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Medium (~70 bytes)
              </button>
              <button
                onClick={() => setTestSize('large')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  testSize === 'large'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Large (~150 bytes)
              </button>
            </div>
          </div>

          {/* Data Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Data to Inscribe</label>
            <pre className="p-3 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto">
              {customData || JSON.stringify(TEST_DATA[testSize], null, 2)}
            </pre>
            <p className="text-xs text-gray-400 mt-1">
              Size: {new TextEncoder().encode(customData || JSON.stringify(TEST_DATA[testSize])).length} bytes
            </p>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>
            
            {showAdvanced && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Custom Data (JSON)</label>
                <textarea
                  value={customData}
                  onChange={(e) => setCustomData(e.target.value)}
                  placeholder='{"type": "custom", "data": "your data here"}'
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm font-mono"
                  rows={4}
                />
              </div>
            )}
          </div>

          {/* Wallet Info */}
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Address:</span>
              <span className="text-gray-300 font-mono">{keyData.address ? `${keyData.address.substring(0, 8)}...${keyData.address.substring(keyData.address.length - 6)}` : 'Not connected'}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-gray-400">Balance:</span>
              <span className="text-gray-300">{balance.confirmed} sats</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-gray-400">Network:</span>
              <span className="text-gray-300">{network}</span>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={createSimpleOrdinal}
            disabled={loading || !keyData.privateKey || balance.confirmed < 500}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Ordinal...' : 'Create Test Ordinal'}
          </button>

          {/* Info Box */}
          <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
            <h4 className="text-sm font-medium text-blue-300 mb-1">ℹ️ How it works:</h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Creates a 1-satoshi output with your data inscribed</li>
              <li>• Uses the standard 1Sat Ordinals protocol format</li>
              <li>• Data is stored in the transaction script</li>
              <li>• Inscription ID will be: {`<txid>_0`}</li>
              <li>• Cost: 1 sat (ordinal) + ~200-300 sats (fees)</li>
            </ul>
          </div>

          {/* Backend Status */}
          <div className="p-3 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400">
              <span className="font-medium">Backend Proxy:</span> {BROADCAST_PROXY_URL}
              <br />
              <span className="text-green-400">✓ Server is running and accessible</span>
            </p>
            {status.type === 'error' && status.message.includes('Backend proxy') && (
              <div className="mt-2 p-2 bg-yellow-900 bg-opacity-30 rounded border border-yellow-700">
                <p className="text-xs text-yellow-300 font-medium">⚠️ Backend Connection Issue</p>
                <p className="text-xs text-gray-300 mt-1">
                  Make sure the backend server is running on port 3001:
                </p>
                <pre className="text-xs bg-gray-900 p-1 rounded mt-1">
                  cd bsv-broadcast-proxy
                  npm start
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
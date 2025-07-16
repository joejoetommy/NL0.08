// Add these imports at the top of your Wallet component
import { Transaction, P2PKH, Script, OP, ARC, Utils, Hash } from '@bsv/sdk';

// Add these interfaces and types after your existing interfaces
interface UTXO {
  txid: string;
  vout: number;
  value: number;
  height: number;
  confirmations: number;
}

interface WhatsOnChainUTXO {
  tx_hash: string;
  tx_pos: number;
  value: number;
  height: number;
  confirmations: number;
}

interface TokenTransaction {
  txid: string;
  height: number;
  confirmations: number;
  opReturn?: {
    type: string;
    data: ProfileDataToken;
  };
}

// Add your ARC API key configuration
const ARC_API_KEY = 'your_arc_api_key_here'; // Replace with your actual API key

// Add these utility functions inside your component

// Fetch UTXOs from WhatsOnChain
const fetchUTXOs = async (address: string): Promise<UTXO[]> => {
  try {
    const baseUrl = network === 'testnet' 
      ? 'https://api.whatsonchain.com/v1/bsv/test'
      : 'https://api.whatsonchain.com/v1/bsv/main';
    
    const response = await fetch(`${baseUrl}/address/${address}/unspent`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
    }
    
    const wocUtxos: WhatsOnChainUTXO[] = await response.json();
    
    // Transform WhatsOnChain format to our UTXO format
    return wocUtxos.map(utxo => ({
      txid: utxo.tx_hash,
      vout: utxo.tx_pos,
      value: utxo.value,
      height: utxo.height,
      confirmations: utxo.confirmations
    }));
  } catch (error) {
    console.error('Error fetching UTXOs:', error);
    throw error;
  }
};

// Fetch a transaction by its ID
const fetchTransaction = async (txid: string): Promise<string> => {
  try {
    const baseUrl = network === 'testnet'
      ? 'https://api.whatsonchain.com/v1/bsv/test'
      : 'https://api.whatsonchain.com/v1/bsv/main';
    
    const response = await fetch(`${baseUrl}/tx/${txid}/hex`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
};

// Fetch all transactions for an address and extract ProfileDataTokens
const fetchProfileTokensFromChain = async (address: string): Promise<ProfileDataToken[]> => {
  try {
    const baseUrl = network === 'testnet'
      ? 'https://api.whatsonchain.com/v1/bsv/test'
      : 'https://api.whatsonchain.com/v1/bsv/main';
    
    // Get transaction history
    const historyResponse = await fetch(`${baseUrl}/address/${address}/history`);
    if (!historyResponse.ok) {
      throw new Error('Failed to fetch transaction history');
    }
    
    const history = await historyResponse.json();
    const tokens: ProfileDataToken[] = [];
    
    // Process each transaction
    for (const tx of history) {
      try {
        // Fetch full transaction
        const txHex = await fetchTransaction(tx.tx_hash);
        const transaction = Transaction.fromHex(txHex);
        
        // Look for OP_RETURN outputs
        for (const output of transaction.outputs) {
          const script = output.lockingScript;
          const scriptASM = script.toASM();
          
          // Check if this is an OP_RETURN output
          if (scriptASM.includes('OP_RETURN')) {
            try {
              // Extract data after OP_RETURN
              const chunks = script.chunks;
              for (let i = 0; i < chunks.length; i++) {
                if (chunks[i].op === OP.OP_RETURN && i + 1 < chunks.length) {
                  const dataChunk = chunks[i + 1];
                  if (dataChunk.data) {
                    const jsonStr = Utils.toUTF8(dataChunk.data);
                    const data = JSON.parse(jsonStr);
                    
                    // Check if this is a ProfileDataToken
                    if (data.type === 'ProfileDataToken') {
                      tokens.push({
                        ...data,
                        txid: tx.tx_hash
                      });
                    }
                  }
                }
              }
            } catch (e) {
              // Not a valid ProfileDataToken, skip
              continue;
            }
          }
        }
      } catch (e) {
        console.error('Error processing transaction:', tx.tx_hash, e);
        continue;
      }
    }
    
    return tokens.sort((a, b) => a.number - b.number);
  } catch (error) {
    console.error('Error fetching profile tokens from chain:', error);
    return [];
  }
};

// Updated mintProfileDataToken function with real transaction creation
const mintProfileDataToken = async () => {
  if (!validateProfileForm()) {
    return;
  }
  
  if (!keyData.privateKey) {
    setMintError('Please generate or import a private key first');
    return;
  }
  
  setIsMinting(true);
  setMintError('');
  setMintSuccess('');
  
  try {
    // Fetch UTXOs
    const utxos = await fetchUTXOs(keyData.address);
    
    if (utxos.length === 0) {
      throw new Error('No UTXOs available. Please fund your wallet first.');
    }
    
    // Sort UTXOs by value (ascending) to use smallest first
    utxos.sort((a, b) => a.value - b.value);
    
    // Create the ProfileDataToken object
    const newToken: ProfileDataToken = {
      number: profileTokens.length + 1,
      backgroundImage: profileForm.backgroundImage,
      profileImage: profileForm.profileImage,
      username: profileForm.username,
      title: profileForm.title,
      mission: profileForm.mission,
      addedDate: new Date().toISOString()
    };
    
    // Create the transaction
    const tx = new Transaction();
    
    // Calculate required amount (dust limit + fee estimate)
    const dustLimit = 546; // satoshis
    const estimatedFee = 500; // satoshis (will be recalculated)
    const requiredAmount = dustLimit + estimatedFee;
    
    // Select UTXOs
    let totalInput = 0;
    const selectedUtxos: UTXO[] = [];
    
    for (const utxo of utxos) {
      selectedUtxos.push(utxo);
      totalInput += utxo.value;
      
      if (totalInput >= requiredAmount) {
        break;
      }
    }
    
    if (totalInput < requiredAmount) {
      throw new Error(`Insufficient funds. Required: ${requiredAmount} satoshis, Available: ${totalInput} satoshis`);
    }
    
    // Add inputs
    for (const utxo of selectedUtxos) {
      // Fetch the source transaction
      const sourceTxHex = await fetchTransaction(utxo.txid);
      const sourceTransaction = Transaction.fromHex(sourceTxHex);
      
      tx.addInput({
        sourceTransaction: sourceTransaction,
        sourceOutputIndex: utxo.vout,
        unlockingScriptTemplate: new P2PKH().unlock(keyData.privateKey),
        sequence: 0xffffffff
      });
    }
    
    // Add OP_RETURN output with profile data
    const dataScript = createProfileDataTokenScript(newToken);
    tx.addOutput({
      lockingScript: dataScript,
      satoshis: 0 // OP_RETURN outputs have 0 satoshis
    });
    
    // Add change output back to self
    const changeAddress = keyData.address;
    tx.addOutput({
      lockingScript: new P2PKH().lock(changeAddress),
      change: true
    });
    
    // Calculate fee and sign
    await tx.fee();
    await tx.sign();
    
    // Broadcast transaction
    const arcUrl = network === 'testnet'
      ? 'https://arc-test.taal.com'
      : 'https://api.taal.com/arc';
    
    const broadcaster = new ARC(arcUrl, ARC_API_KEY);
    const broadcastResult = await tx.broadcast(broadcaster);
    
    if (broadcastResult.status === 'success') {
      // Save token with actual txid
      const mintedToken = { ...newToken, txid: broadcastResult.txid };
      setProfileTokens([...profileTokens, mintedToken]);
      
      // Reset form
      setProfileForm({
        backgroundImage: '',
        profileImage: '',
        username: '',
        title: '',
        mission: ''
      });
      
      setMintSuccess(`Token minted successfully! TXID: ${broadcastResult.txid}`);
      
      // Update balance after successful broadcast
      setTimeout(() => {
        checkBalance(keyData.address);
      }, 3000); // Wait 3 seconds for propagation
      
    } else {
      throw new Error(`Broadcast failed: ${broadcastResult.description || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('Minting error:', error);
    setMintError('Failed to mint token: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    setIsMinting(false);
  }
};

// Add state for chain sync
const [isSyncingTokens, setIsSyncingTokens] = useState(false);
const [lastSync, setLastSync] = useState<Date | null>(null);

// Function to sync tokens from chain
const syncTokensFromChain = async () => {
  if (!keyData.address) return;
  
  setIsSyncingTokens(true);
  try {
    const chainTokens = await fetchProfileTokensFromChain(keyData.address);
    setProfileTokens(chainTokens);
    setLastSync(new Date());
  } catch (error) {
    console.error('Error syncing tokens:', error);
  } finally {
    setIsSyncingTokens(false);
  }
};

// Add useEffect to sync tokens when address changes
useEffect(() => {
  if (keyData.address && viewMode === 'profileDataToken') {
    syncTokensFromChain();
  }
}, [keyData.address, viewMode]);

// Update the ProfileDataToken view section to include sync functionality
{viewMode === 'profileDataToken' && (
  <div>
    <div className="mb-6 p-4 bg-indigo-900 bg-opacity-20 rounded-lg border border-indigo-700">
      <h2 className="text-xl font-semibold mb-4 text-white">Create Profile Data Token</h2>
      
      {!keyData.privateKey && (
        <div className="mb-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded">
          <p className="text-yellow-400 text-sm">⚠️ Please generate or import a private key first to mint tokens.</p>
        </div>
      )}
      
      {/* ARC API Key Warning */}
      {keyData.privateKey && ARC_API_KEY === 'your_arc_api_key_here' && (
        <div className="mb-4 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded">
          <p className="text-red-400 text-sm">⚠️ Please configure your ARC API key in the code to broadcast transactions.</p>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Form fields remain the same as before */}
        {/* Username Input */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-2">
            Username <span className="text-red-400">*</span> 
            <span className="text-xs text-gray-400 ml-2">({profileForm.username.length}/20)</span>
          </label>
          <input
            type="text"
            value={profileForm.username}
            onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
            maxLength={20}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!keyData.privateKey || isMinting}
          />
          {profileFormErrors.username && (
            <p className="text-red-400 text-xs mt-1">{profileFormErrors.username}</p>
          )}
        </div>
        
        {/* Title Input */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-2">
            Title <span className="text-red-400">*</span>
            <span className="text-xs text-gray-400 ml-2">({profileForm.title.length}/40)</span>
          </label>
          <input
            type="text"
            value={profileForm.title}
            onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
            maxLength={40}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!keyData.privateKey || isMinting}
          />
          {profileFormErrors.title && (
            <p className="text-red-400 text-xs mt-1">{profileFormErrors.title}</p>
          )}
        </div>
        
        {/* Mission Input */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-2">
            Mission
            <span className="text-xs text-gray-400 ml-2">({profileForm.mission.length}/250)</span>
          </label>
          <textarea
            value={profileForm.mission}
            onChange={(e) => setProfileForm({ ...profileForm, mission: e.target.value })}
            maxLength={250}
            rows={3}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!keyData.privateKey || isMinting}
          />
          {profileFormErrors.mission && (
            <p className="text-red-400 text-xs mt-1">{profileFormErrors.mission}</p>
          )}
        </div>
        
        {/* Background Image URL */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-2">
            Background Image URL
          </label>
          <input
            type="text"
            value={profileForm.backgroundImage}
            onChange={(e) => setProfileForm({ ...profileForm, backgroundImage: e.target.value })}
            placeholder="https://example.com/background.jpg"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!keyData.privateKey || isMinting}
          />
        </div>
        
        {/* Profile Image URL */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-2">
            Profile Image URL
          </label>
          <input
            type="text"
            value={profileForm.profileImage}
            onChange={(e) => setProfileForm({ ...profileForm, profileImage: e.target.value })}
            placeholder="https://example.com/profile.jpg"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!keyData.privateKey || isMinting}
          />
        </div>
        
        {/* Balance Info */}
        {keyData.privateKey && (
          <div className="p-3 bg-gray-800 rounded border border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Available Balance:</span>
              <span className="text-sm font-medium text-white">
                {formatBSV(balance.confirmed)} BSV ({balance.confirmed} sats)
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Estimated minting fee: ~500 satoshis
            </p>
          </div>
        )}
        
        {/* Mint Button */}
        <button
          onClick={mintProfileDataToken}
          disabled={!keyData.privateKey || isMinting || balance.confirmed < 1000 || ARC_API_KEY === 'your_arc_api_key_here'}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isMinting ? 'Minting...' : 'Mint Profile Token'}
        </button>
        
        {mintError && (
          <p className="text-red-400 text-sm">{mintError}</p>
        )}
        
        {mintSuccess && (
          <div className="p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded">
            <p className="text-green-400 text-sm">{mintSuccess}</p>
            <a 
              href={`https://whatsonchain.com/tx/${mintSuccess.match(/TXID: (\w+)/)?.[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-300 hover:text-green-200 text-xs underline"
            >
              View on WhatsOnChain →
            </a>
          </div>
        )}
      </div>
    </div>
    
    {/* View Minted Tokens */}
    <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Your Profile Tokens</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={syncTokensFromChain}
            disabled={isSyncingTokens}
            className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded transition-colors disabled:bg-gray-600"
          >
            {isSyncingTokens ? 'Syncing...' : 'Sync from Chain'}
          </button>
          {lastSync && (
            <span className="text-xs text-gray-400">
              Last sync: {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      
      {profileTokens.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          {isSyncingTokens ? 'Loading tokens...' : 'No tokens found. Mint your first token above!'}
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {profileTokens.map((token, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-600">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {token.profileImage && (
                      <img 
                        src={token.profileImage} 
                        alt={token.username}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <h4 className="font-semibold text-white">
                        #{token.number} - {token.username}
                      </h4>
                      <p className="text-sm text-gray-400">{token.title}</p>
                    </div>
                  </div>
                  
                  {token.mission && (
                    <p className="text-sm text-gray-300 mb-2">{token.mission}</p>
                  )}
                  
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Minted: {new Date(token.addedDate).toLocaleString()}</p>
                    {token.txid && (
                      <div className="flex items-center gap-2">
                        <span>TXID:</span>
                        <code className="text-indigo-400">{token.txid.substring(0, 16)}...</code>
                        <button
                          onClick={() => copyToClipboard(token.txid!, 'Transaction ID')}
                          className="text-indigo-400 hover:text-indigo-300"
                          title="Copy TXID"
                        >
                          📋
                        </button>
                        <a 
                          href={`https://whatsonchain.com/tx/${token.txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300"
                          title="View on WhatsOnChain"
                        >
                          🔗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                {token.backgroundImage && (
                  <img 
                    src={token.backgroundImage} 
                    alt="Background"
                    className="w-20 h-20 rounded object-cover ml-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
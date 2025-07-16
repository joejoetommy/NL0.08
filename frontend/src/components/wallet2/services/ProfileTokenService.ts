import { PrivateKey, PublicKey, Transaction, Script, Utils, P2PKH } from '@bsv/sdk';
import { UTXOManager, SimpleTestnetBroadcaster } from '../utils/blockchain';

interface ProfileData {
  username: string;
  title: string;
  mission: string;
  profileImage: string; // Base64 or IPFS hash
  backgroundImage: string; // Base64 or IPFS hash
}

interface ProfileToken {
  tokenId: string;
  owner: string;
  profileData: ProfileData;
  ipfsHashes?: {
    profile?: string;
    background?: string;
  };
  timestamp: number;
  version: number;
}

interface ProfileTokenResponse {
  success: boolean;
  txid?: string;
  tokenId?: string;
  error?: string;
}

export class ProfileTokenService {
  private network: 'mainnet' | 'testnet';
  private apiKey?: string;
  private ipfsGateway: string = 'https://gateway.pinata.cloud/ipfs/';
  private broadcaster: SimpleTestnetBroadcaster;

  constructor(network: 'mainnet' | 'testnet' = 'testnet', apiKey?: string) {
    this.network = network;
    this.apiKey = apiKey;
    this.broadcaster = new SimpleTestnetBroadcaster();
  }

  /**
   * Upload image to IPFS (using Pinata or similar service)
   */
  private async uploadToIPFS(imageData: string): Promise<string> {
    // If it's already an IPFS hash or URL, return as is
    if (imageData.startsWith('ipfs://') || imageData.startsWith('Qm')) {
      return imageData;
    }

    // If it's a regular URL, return as is
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return imageData;
    }

    // For base64 images, return as is (since IPFS upload not configured)
    if (imageData.startsWith('data:image')) {
      // In production, upload to IPFS here
      return imageData;
    }

    return imageData;
  }

  /**
   * Create a profile token transaction
   */
  async createProfileToken(
    privateKey: PrivateKey,
    profileData: ProfileData,
    utxos: any[]
  ): Promise<ProfileTokenResponse> {
    try {
      const publicKey = privateKey.toPublicKey();
      const address = publicKey.toAddress(this.network).toString();
      
      // Generate unique token ID
      const tokenId = Date.now().toString();
      
      // Create profile token data
      const profileToken: ProfileToken = {
        tokenId,
        owner: address,
        profileData: {
          ...profileData,
          // Keep original images for now since we're storing on-chain
          profileImage: profileData.profileImage,
          backgroundImage: profileData.backgroundImage
        },
        ipfsHashes: {
          // These would be IPFS hashes in production
          profile: '',
          background: ''
        },
        timestamp: Date.now(),
        version: 1
      };

      // Create transaction using the same pattern as MessageTransaction
      const tx = new Transaction();
      
      console.log('Creating profile token transaction with', utxos.length, 'inputs');
      
      // Add inputs from UTXOs
      for (const utxo of utxos) {
        console.log('Adding input:', {
          txid: utxo.txid,
          sourceOutputIndex: utxo.sourceOutputIndex,
          satoshis: utxo.satoshis
        });
        
        tx.addInput({
          sourceTransaction: utxo.sourceTransaction,
          sourceOutputIndex: utxo.sourceOutputIndex,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey)
        });
      }
      
      // Add OP_RETURN output with ALL profile metadata including images
      const metadataScript = this.createMetadataScript(profileToken);
      console.log('Metadata script ASM:', metadataScript.toASM());
      
      tx.addOutput({
        lockingScript: metadataScript,
        satoshis: 0
      });
      
      // Add token output to owner's address (1000 sats)
      tx.addOutput({
        lockingScript: new P2PKH().lock(address),
        satoshis: 1000
      });
      
      // Add change output
      tx.addOutput({
        lockingScript: new P2PKH().lock(address),
        change: true
      });
      
      // Fee and sign - the SDK will calculate proper fees for large OP_RETURN
      console.log('Calculating fees and signing...');
      
      // Calculate the OP_RETURN data size
      const opReturnSize = metadataScript.toHex().length / 2;
      const opReturnSizeMB = opReturnSize / (1024 * 1024);
      
      // Set fee rate: 40,000 sats per MB of data
      const dataFee = Math.ceil(opReturnSizeMB * 40000);
      
      // Add base transaction fee (1 sat/byte for non-data parts)
      // Estimate non-data size: ~300 bytes base + inputs/outputs
      const baseTxSize = 300 + (utxos.length * 180);
      const baseFee = baseTxSize;
      
      // Total fee
      const totalDesiredFee = dataFee + baseFee;
      
      console.log('OP_RETURN data size:', (opReturnSize / 1024).toFixed(2), 'KB');
      console.log('Data fee (40k sats/MB):', dataFee, 'satoshis');
      console.log('Base tx fee:', baseFee, 'satoshis');
      console.log('Total fee:', totalDesiredFee, 'satoshis');
      
      // Set fee rate to achieve our desired fee
      // feePerKb is in satoshis per kilobyte
      const estimatedTotalSize = baseTxSize + opReturnSize;
      const feePerByte = totalDesiredFee / estimatedTotalSize;
      tx.feePerKb = Math.ceil(feePerByte * 1000);
      
      console.log('Fee rate set to:', tx.feePerKb, 'sat/KB');
      
      await tx.fee();
      await tx.sign();
      
      const txSize = tx.toHex().length / 2;
      const totalFee = tx.getFee();
      console.log('Transaction created successfully');
      console.log('Transaction ID:', tx.id('hex'));
      console.log('Transaction size:', txSize, 'bytes');
      console.log('Total fee:', totalFee, 'satoshis');
      console.log('Effective fee rate:', (totalFee / txSize).toFixed(2), 'sat/byte');
      console.log('Data storage cost: $' + ((totalFee / 100000000) * 50000).toFixed(2), '(at $50k/BSV)');

      // Broadcast transaction
      const result = await this.broadcaster.broadcast(tx);
      
      if (result.status === 'success' && result.txid) {
        return {
          success: true,
          txid: result.txid,
          tokenId: tokenId
        };
      } else {
        throw new Error(result.error || 'Broadcast failed');
      }

    } catch (error) {
      console.error('Profile token creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create metadata script for OP_RETURN - store ALL profile data on-chain
   */
  private createMetadataScript(profileToken: ProfileToken): Script {
    const prefix = '50524f46494c45'; // "PROFILE" in hex
    
    try {
      // First, let's check if we have images and their sizes
      let profileImageToStore = profileToken.profileData.profileImage;
      let backgroundImageToStore = profileToken.profileData.backgroundImage;
      
      // If images are base64 and too large, we might need to compress or skip them
      if (profileImageToStore && profileImageToStore.startsWith('data:image')) {
        const base64Size = profileImageToStore.length;
        console.log('Profile image size:', (base64Size / 1024).toFixed(2), 'KB');
        
        // If image is larger than 100KB, skip it for now
        if (base64Size > 100 * 1024) {
          console.warn('Profile image too large, storing placeholder');
          profileImageToStore = 'IMAGE_TOO_LARGE';
        }
      }
      
      if (backgroundImageToStore && backgroundImageToStore.startsWith('data:image')) {
        const base64Size = backgroundImageToStore.length;
        console.log('Background image size:', (base64Size / 1024).toFixed(2), 'KB');
        
        // If image is larger than 100KB, skip it for now
        if (base64Size > 100 * 1024) {
          console.warn('Background image too large, storing placeholder');
          backgroundImageToStore = 'IMAGE_TOO_LARGE';
        }
      }
      
      // Create complete metadata with size-optimized image data
      const metadata = {
        id: profileToken.tokenId,
        username: profileToken.profileData.username,
        title: profileToken.profileData.title,
        mission: profileToken.profileData.mission,
        profileImage: profileImageToStore,
        backgroundImage: backgroundImageToStore,
        timestamp: profileToken.timestamp,
        version: profileToken.version
      };
      
      const metadataString = JSON.stringify(metadata);
      const metadataHex = Utils.toHex(Utils.toArray(metadataString, 'utf8'));
      
      // Combine prefix and data
      const fullDataHex = prefix + metadataHex;
      
      // Calculate size and estimated cost
      const sizeInBytes = fullDataHex.length / 2;
      const sizeInKB = sizeInBytes / 1024;
      const sizeInMB = sizeInKB / 1024;
      const estimatedCost = (sizeInMB / 1024) * 2.5; // $2.5 per GB
      
      console.log('Profile data size:', sizeInKB.toFixed(2), 'KB');
      console.log('Estimated storage cost: $' + estimatedCost.toFixed(6));
      
      // Warn if transaction is very large
      if (sizeInKB > 500) {
        console.warn('WARNING: Large transaction size may cause broadcast issues');
      }
      
      // Create script with OP_PUSHDATA operations for large data
      const script = new Script();
      script.writeOpCode('OP_FALSE');
      script.writeOpCode('OP_RETURN');
      
      // Convert hex string to bytes
      const dataBytes = Utils.toArray(fullDataHex, 'hex');
      
      // Use appropriate push operation based on size
      if (dataBytes.length <= 75) {
        // Direct push
        script.writeBin(dataBytes);
      } else if (dataBytes.length <= 255) {
        // OP_PUSHDATA1
        script.writeOpCode('OP_PUSHDATA1');
        script.writeUInt8(dataBytes.length);
        script.writeBin(dataBytes);
      } else if (dataBytes.length <= 65535) {
        // OP_PUSHDATA2
        script.writeOpCode('OP_PUSHDATA2');
        script.writeUInt16LE(dataBytes.length);
        script.writeBin(dataBytes);
      } else {
        // OP_PUSHDATA4 for very large data
        script.writeOpCode('OP_PUSHDATA4');
        script.writeUInt32LE(dataBytes.length);
        script.writeBin(dataBytes);
      }
      
      console.log('Script size:', script.toHex().length / 2, 'bytes');
      return script;
      
    } catch (error) {
      console.error('Error creating metadata script:', error);
      // Fallback - store at least the text data
      const fallbackData = {
        id: profileToken.tokenId,
        username: profileToken.profileData.username,
        title: profileToken.profileData.title,
        mission: profileToken.profileData.mission
      };
      
      const fallbackHex = prefix + Utils.toHex(Utils.toArray(JSON.stringify(fallbackData), 'utf8'));
      const fallbackBytes = Utils.toArray(fallbackHex, 'hex');
      
      const script = new Script();
      script.writeOpCode('OP_FALSE');
      script.writeOpCode('OP_RETURN');
      script.writeBin(fallbackBytes);
      
      return script;
    }
  }

  /**
   * Retrieve profile token from blockchain
   */
  async retrieveProfileToken(txid: string): Promise<ProfileToken | null> {
    try {
      const baseUrl = this.network === 'testnet' 
        ? 'https://api.whatsonchain.com/v1/bsv/test'
        : 'https://api.whatsonchain.com/v1/bsv/main';
      
      const headers: any = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      console.log(`Fetching transaction ${txid} from ${this.network}`);
      const response = await fetch(`${baseUrl}/tx/${txid}`, { headers });
      
      if (!response.ok) {
        console.error('Transaction not found:', response.status);
        throw new Error('Transaction not found');
      }
      
      const txData = await response.json();
      console.log('Transaction data:', txData);
      
      // Look for OP_RETURN output with profile data
      for (let i = 0; i < txData.vout.length; i++) {
        const output = txData.vout[i];
        console.log(`Checking output ${i}:`, output);
        
        if (output.scriptPubKey && output.scriptPubKey.type === 'nulldata') {
          try {
            const asm = output.scriptPubKey.asm;
            console.log('Found OP_RETURN ASM:', asm);
            
            // Parse the ASM to get the hex data
            const parts = asm.split(' ');
            
            // Look for our data after OP_RETURN
            let dataHex = null;
            for (let j = 0; j < parts.length; j++) {
              if (parts[j] === 'OP_RETURN' && j + 1 < parts.length) {
                dataHex = parts[j + 1];
                break;
              }
            }
            
            if (!dataHex) {
              console.log('No data found after OP_RETURN');
              continue;
            }
            
            console.log('Data hex:', dataHex);
            
            // Check for our protocol prefix "PROFILE" (50524f46494c45 in hex)
            const profilePrefix = '50524f46494c45';
            if (!dataHex.startsWith(profilePrefix)) {
              console.log('Not a profile token (wrong prefix)');
              continue;
            }
            
            // Remove the prefix to get the JSON data
            const jsonHex = dataHex.substring(profilePrefix.length);
            console.log('JSON hex:', jsonHex);
            
            // Convert hex to string
            const dataBytes = Utils.toArray(jsonHex, 'hex');
            const jsonStr = Utils.toUTF8(dataBytes);
            console.log('JSON string:', jsonStr);
            
            try {
              const metadata = JSON.parse(jsonStr);
              console.log('Parsed metadata:', metadata);
              
              // Get owner address from first output (token output)
              let ownerAddress = '';
              // The token output should be output 1 (after OP_RETURN)
              if (txData.vout[1] && txData.vout[1].scriptPubKey && txData.vout[1].scriptPubKey.addresses) {
                ownerAddress = txData.vout[1].scriptPubKey.addresses[0];
              }
              
              // All 5 fields are now stored directly on-chain
              const profileData: ProfileData = {
                username: metadata.username || metadata.u || 'Unknown',
                title: metadata.title || metadata.t || 'Unknown',
                mission: metadata.mission || metadata.m || '',
                profileImage: (metadata.profileImage === 'IMAGE_TOO_LARGE' ? '' : metadata.profileImage) || metadata.pi || '',
                backgroundImage: (metadata.backgroundImage === 'IMAGE_TOO_LARGE' ? '' : metadata.backgroundImage) || metadata.bi || ''
              };
              
              return {
                tokenId: metadata.id,
                owner: ownerAddress,
                profileData: profileData,
                ipfsHashes: {}, // Not needed anymore - everything is on-chain
                timestamp: metadata.timestamp || Date.now(),
                version: metadata.version || 1
              };
            } catch (parseError) {
              console.error('Failed to parse JSON from OP_RETURN:', parseError);
              console.log('Raw JSON string that failed to parse:', jsonStr);
            }
          } catch (error) {
            console.error('Failed to parse OP_RETURN output:', error);
          }
        }
      }
      
      console.log('No profile data found in transaction');
      return null;
    } catch (error) {
      console.error('Error retrieving profile token:', error);
      return null;
    }
  }

  /**
   * Fetch profile data from IPFS - not needed anymore since we store on-chain
   */
  private async fetchProfileFromIPFS(ipfsHashes: any): Promise<ProfileData> {
    // Deprecated - all data is now stored on-chain
    return {
      username: 'Retrieved User',
      title: 'Retrieved Title', 
      mission: 'Retrieved Mission',
      profileImage: '',
      backgroundImage: ''
    };
  }

  /**
   * List all profile tokens for an address
   */
  async listProfileTokens(address: string): Promise<ProfileToken[]> {
    try {
      const baseUrl = this.network === 'testnet' 
        ? 'https://api.whatsonchain.com/v1/bsv/test'
        : 'https://api.whatsonchain.com/v1/bsv/main';
      
      const headers: any = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Get transaction history
      const response = await fetch(`${baseUrl}/address/${address}/history`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch address history');
      }
      
      const history = await response.json();
      const profileTokens: ProfileToken[] = [];
      
      // Check each transaction for profile tokens
      for (const tx of history) {
        const token = await this.retrieveProfileToken(tx.tx_hash);
        if (token && token.owner === address) {
          profileTokens.push(token);
        }
      }
      
      return profileTokens;
    } catch (error) {
      console.error('Error listing profile tokens:', error);
      return [];
    }
  }
}
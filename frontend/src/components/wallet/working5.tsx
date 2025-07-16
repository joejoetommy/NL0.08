import { PrivateKey, PublicKey, Transaction, Script, Utils } from '@bsv/sdk';
import { UTXOManager, SimpleTestnetBroadcaster } from '../utils/blockchain';

// Buffer polyfill for browser environment
const Buffer = {
  from: (data: string | Uint8Array, encoding?: string): Uint8Array => {
    if (typeof data === 'string') {
      if (encoding === 'hex') {
        const bytes = new Uint8Array(data.length / 2);
        for (let i = 0; i < data.length; i += 2) {
          bytes[i / 2] = parseInt(data.substr(i, 2), 16);
        }
        return bytes;
      } else {
        // UTF-8 encoding
        const encoder = new TextEncoder();
        return encoder.encode(data);
      }
    }
    return new Uint8Array(data);
  },
  concat: (arrays: Uint8Array[]): Uint8Array => {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }
};

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

    // For base64 images, upload to IPFS
    if (imageData.startsWith('data:image')) {
      try {
        // Convert base64 to blob
        const base64Data = imageData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        // For now, since we don't have IPFS configured, return a placeholder
        // In production, uncomment the following:
        /*
        const formData = new FormData();
        formData.append('file', blob);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_PINATA_JWT}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('Failed to upload to IPFS');
        }

        const data = await response.json();
        return `ipfs://${data.IpfsHash}`;
        */
        
        // Placeholder for demo - return a shortened version
        return 'placeholder';
      } catch (error) {
        console.error('IPFS upload error:', error);
        return 'placeholder';
      }
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
      // Log the incoming profile data
      console.log('Creating profile token with data:', profileData);
      
      const publicKey = privateKey.toPublicKey();
      const address = publicKey.toAddress(this.network).toString();
      
      // Generate unique token ID
      const tokenId = Date.now().toString();
      
      // Upload images to IPFS if they're base64
      const ipfsProfile = await this.uploadToIPFS(profileData.profileImage);
      const ipfsBackground = await this.uploadToIPFS(profileData.backgroundImage);
      
      // Create profile token data
      const profileToken: ProfileToken = {
        tokenId,
        owner: address,
        profileData: {
          username: profileData.username || '',
          title: profileData.title || '',
          mission: profileData.mission || '',
          profileImage: ipfsProfile,
          backgroundImage: ipfsBackground
        },
        ipfsHashes: {
          profile: ipfsProfile.replace('ipfs://', ''),
          background: ipfsBackground.replace('ipfs://', '')
        },
        timestamp: Date.now(),
        version: 1
      };

      // Log the token data before creating transaction
      console.log('Profile token object:', profileToken);

      // Create transaction
      const tx = new Transaction();
      
      // Add inputs from UTXOs
      let totalInput = 0;
      for (const utxo of utxos) {
        tx.addInput({
          txid: utxo.tx_hash,
          vout: utxo.tx_pos,
          satoshis: utxo.value,
          script: utxo.script ? Script.fromHex(utxo.script) : new Script()
        });
        totalInput += utxo.value;
      }

      // Calculate fees (2 sat/byte estimate)
      const estimatedSize = 250 + (utxos.length * 180) + 200; // rough estimate
      const fee = estimatedSize * 2;
      const changeAmount = totalInput - fee - 1000; // 1000 sats for token output

      if (changeAmount < 0) {
        throw new Error(`Insufficient funds. Need at least ${fee + 1000} satoshis`);
      }

      // Add OP_RETURN output with profile metadata FIRST
      const metadataScript = this.createMetadataScript(profileToken);
      tx.addOutput({
        satoshis: 0,
        script: metadataScript
      });

      // Add token output with minimal sats (using P2PKH to owner address)
      const tokenScript = this.createTokenScript(profileToken);
      tx.addOutput({
        satoshis: 1000,
        script: tokenScript
      });

      // Add change output if needed
      if (changeAmount > 546) { // dust limit
        tx.addOutput({
          address: address,
          satoshis: changeAmount
        });
      }

      // Sign all inputs
      for (let i = 0; i < utxos.length; i++) {
        try {
          const utxo = utxos[i];
          const script = utxo.script ? Script.fromHex(utxo.script) : Script.fromAddress(address);
          const satoshis = BigInt(utxo.value);
          
          const signature = tx.sign(privateKey, 'SIGHASH_ALL', i, script, satoshis);
          
          const unlockingScript = new Script()
            .writeBin(signature.toDER())
            .writeUInt8(0x41) // SIGHASH_ALL
            .writeBin(publicKey.toDER());
          
          tx.inputs[i].script = unlockingScript;
        } catch (signError) {
          console.error(`Error signing input ${i}:`, signError);
          throw new Error(`Failed to sign transaction input ${i}`);
        }
      }

      // Broadcast transaction
      const result = await this.broadcaster.broadcast(tx);
      
      if (result.status === 'success' && result.txid) {
        console.log('Profile token created successfully:', result.txid);
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
   * Create token script (simplified version)
   */
  private createTokenScript(profileToken: ProfileToken): Script {
    try {
      // Create a simple P2PKH script for the token output
      // In a real implementation, this would be your actual token contract script
      const script = new Script();
      
      // For now, just create a standard output that can be spent by the owner
      const ownerAddress = profileToken.owner;
      const addressScript = Script.fromAddress(ownerAddress);
      
      return addressScript;
    } catch (error) {
      console.error('Error creating token script:', error);
      // Fallback to a simple script
      return new Script();
    }
  }

  /**
   * Create metadata script for OP_RETURN
   */
  private createMetadataScript(profileToken: ProfileToken): Script {
    try {
      console.log('Creating metadata script for:', profileToken);
      
      // Create a compact metadata format
      const metadata: any = {
        id: profileToken.tokenId,
        u: profileToken.profileData.username || '',
        t: profileToken.profileData.title || ''
      };

      // Always include mission if it exists
      if (profileToken.profileData.mission) {
        metadata.m = profileToken.profileData.mission.substring(0, 50); // Limit to 50 chars
      }

      // Add version
      metadata.v = profileToken.version;

      // Add IPFS hashes if images were uploaded
      if (profileToken.ipfsHashes?.profile && profileToken.ipfsHashes.profile !== 'placeholder') {
        metadata.pi = profileToken.ipfsHashes.profile.substring(0, 20); // First 20 chars
      }
      if (profileToken.ipfsHashes?.background && profileToken.ipfsHashes.background !== 'placeholder') {
        metadata.bi = profileToken.ipfsHashes.background.substring(0, 20); // First 20 chars
      }

      console.log('Metadata object:', metadata);

      // Create the data payload
      const prefix = Buffer.from('PROFILE', 'utf8');
      const dataBuffer = Buffer.from(JSON.stringify(metadata), 'utf8');
      
      // Combine prefix and data
      const fullData = Buffer.concat([prefix, dataBuffer]);
      
      console.log('Full payload size:', fullData.length, 'bytes');
      
      // Check size limit (OP_RETURN max is ~220 bytes)
      if (fullData.length > 220) {
        console.warn('Payload too large, creating minimal version');
        // If too large, create minimal version
        const minimalMetadata = {
          id: profileToken.tokenId,
          u: profileToken.profileData.username.substring(0, 15),
          t: profileToken.profileData.title.substring(0, 15),
          m: profileToken.profileData.mission.substring(0, 20),
          v: profileToken.version
        };
        const minimalData = Buffer.concat([
          Buffer.from('PROFILE', 'utf8'),
          Buffer.from(JSON.stringify(minimalMetadata), 'utf8')
        ]);
        
        const script = new Script();
        script.chunks = [
          { opcodenum: 106 }, // OP_RETURN = 106
          { buf: minimalData }
        ];
        return script;
      }
      
      // Create script with full data
      const script = new Script();
      script.chunks = [
        { opcodenum: 106 }, // OP_RETURN = 106
        { buf: fullData }
      ];
      
      console.log('Created script with', fullData.length, 'bytes of data');
      return script;
    } catch (error) {
      console.error('Error creating metadata script:', error);
      // Return a minimal OP_RETURN script
      const script = new Script();
      const fallbackData = Buffer.from(`PROFILE{"id":"${profileToken.tokenId}","error":"metadata"}`, 'utf8');
      script.chunks = [
        { opcodenum: 106 }, // OP_RETURN
        { buf: fallbackData }
      ];
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

      const response = await fetch(`${baseUrl}/tx/${txid}`, { headers });
      
      if (!response.ok) {
        throw new Error('Transaction not found');
      }
      
      const txData = await response.json();
      
      // Look for OP_RETURN output with profile data
      for (const output of txData.vout) {
        if (output.scriptPubKey && output.scriptPubKey.type === 'nulldata') {
          try {
            const scriptHex = output.scriptPubKey.hex;
            if (!scriptHex || typeof scriptHex !== 'string') {
              continue;
            }
            
            // Parse the hex data
            let dataHex = scriptHex;
            
            // Skip OP_0 (00) if present
            if (dataHex.startsWith('00')) {
              dataHex = dataHex.substring(2);
            }
            
            // Skip OP_RETURN (6a) and length byte
            if (dataHex.startsWith('6a')) {
              dataHex = dataHex.substring(2);
              // Skip the push data length byte
              if (dataHex.length >= 2) {
                const lengthByte = parseInt(dataHex.substring(0, 2), 16);
                dataHex = dataHex.substring(2);
              }
            }
            
            // Convert hex to string
            const dataBytes = Buffer.from(dataHex, 'hex');
            const decoder = new TextDecoder();
            const dataString = decoder.decode(dataBytes);
            
            // Check if it starts with PROFILE prefix
            if (dataString.startsWith('PROFILE')) {
              const jsonStr = dataString.substring(7); // Remove 'PROFILE' prefix
              
              try {
                const metadata = JSON.parse(jsonStr);
                
                // Get owner address from first non-OP_RETURN output
                let ownerAddress = '';
                for (const out of txData.vout) {
                  if (out.scriptPubKey?.type !== 'nulldata' && out.scriptPubKey?.addresses?.[0]) {
                    ownerAddress = out.scriptPubKey.addresses[0];
                    break;
                  }
                }
                
                // Reconstruct profile data
                const profileData: ProfileData = {
                  username: metadata.u || 'Unknown',
                  title: metadata.t || 'Unknown',
                  mission: metadata.m || 'No mission statement provided',
                  profileImage: metadata.pi ? `${this.ipfsGateway}${metadata.pi}` : '',
                  backgroundImage: metadata.bi ? `${this.ipfsGateway}${metadata.bi}` : ''
                };
                
                return {
                  tokenId: metadata.id || txid,
                  owner: ownerAddress,
                  profileData: profileData,
                  ipfsHashes: {
                    profile: metadata.pi || '',
                    background: metadata.bi || ''
                  },
                  timestamp: metadata.ts || Date.parse(txData.time || '') || Date.now(),
                  version: metadata.v || 1
                };
              } catch (parseError) {
                console.error('Failed to parse profile JSON:', parseError);
                console.log('JSON string:', jsonStr);
              }
            }
          } catch (error) {
            console.error('Failed to parse OP_RETURN output:', error);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving profile token:', error);
      return null;
    }
  }

  /**
   * Fetch profile data from IPFS
   */
  private async fetchProfileFromIPFS(ipfsHashes: any): Promise<ProfileData> {
    // This is a placeholder - in production, you'd fetch from IPFS
    return {
      username: 'Retrieved User',
      title: 'Retrieved Title',
      mission: 'Retrieved Mission',
      profileImage: ipfsHashes.profile ? `${this.ipfsGateway}${ipfsHashes.profile}` : '',
      backgroundImage: ipfsHashes.background ? `${this.ipfsGateway}${ipfsHashes.background}` : ''
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
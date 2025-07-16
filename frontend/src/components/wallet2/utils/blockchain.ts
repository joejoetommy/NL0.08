import { Transaction, PrivateKey, PublicKey, Utils, SymmetricKey, Hash, P2PKH, Script } from '@bsv/sdk';

type Network = 'mainnet' | 'testnet';

interface UTXO {
  sourceTransaction: any;
  sourceOutputIndex: number;
  satoshis: number;
  txid: string;
}

interface OnChainMessage {
  txid: string;
  timestamp: Date;
  message: string;
  sender: string;
  recipient: string;
  encrypted: string;
  isFromMe: boolean;
  contactName?: string;
  encryptionType?: 'standard';
}

interface SavedContact {
  id: string;
  name: string;
  publicKeyHex: string;
  sharedSecret?: string;
}

interface BlockchainConversation {
  contactId: string;
  contactName: string;
  contactAddress: string;
  messages: OnChainMessage[];
}

// Simple broadcaster for WhatsOnChain
export class SimpleTestnetBroadcaster {
  async broadcast(tx: Transaction): Promise<{ status: string; txid?: string; error?: string }> {
    try {
      const txHex = tx.toHex();
      console.log('Broadcasting transaction hex length:', txHex.length);
      
      // Validate transaction hex before sending
      if (!txHex || txHex.length < 100) {
        throw new Error('Invalid transaction hex - too short');
      }
      
      // Use WhatsOnChain broadcast endpoint
      const response = await fetch('https://api.whatsonchain.com/v1/bsv/test/tx/raw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ txhex: txHex })
      });

      if (response.ok) {
        const txid = await response.text();
        console.log('Transaction broadcasted successfully:', txid);
        return { status: 'success', txid: txid.replace(/['"]+/g, '') };
      } else {
        const error = await response.text();
        console.error('Broadcast failed with status:', response.status, 'Error:', error);
        
        // Try to parse error for more details
        if (error.includes('TX decode failed')) {
          console.error('Transaction hex may be malformed. First 200 chars:', txHex.substring(0, 200));
        }
        
        return { status: 'error', error: `${response.status}: ${error}` };
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// UTXO Manager Class
export class UTXOManager {
  address: string;
  network: Network;
  utxos: UTXO[];
  apiKey: string | null;

  constructor(address: string, network: Network, apiKey: string | null = null) {
    this.address = address;
    this.network = network;
    this.utxos = [];
    this.apiKey = apiKey;
  }

  getHeaders() {
    const headers: any = {};
    if (this.apiKey) {
      headers['Authorization'] = this.apiKey;
    }
    return headers;
  }

  async fetchUTXOs(): Promise<UTXO[]> {
    const baseUrl = this.network === 'testnet' 
      ? 'https://api.whatsonchain.com/v1/bsv/test'
      : 'https://api.whatsonchain.com/v1/bsv/main';
    
    try {
      console.log(`Fetching UTXOs for address: ${this.address}`);
      const response = await fetch(`${baseUrl}/address/${this.address}/unspent`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        console.error('Failed to fetch UTXOs:', response.status, response.statusText);
        throw new Error('Failed to fetch UTXOs');
      }
      
      const utxos = await response.json();
      console.log(`Found ${utxos.length} UTXOs:`, utxos);
      
      // For each UTXO, we'll fetch the raw tx to get the full transaction
      this.utxos = [];
      for (const utxo of utxos) {
        try {
          // Try to get the raw transaction
          const txResponse = await fetch(`${baseUrl}/tx/${utxo.tx_hash}/hex`, {
            headers: this.getHeaders()
          });
          if (txResponse.ok) {
            const txHex = await txResponse.text();
            this.utxos.push({
              sourceTransaction: Transaction.fromHex(txHex),
              sourceOutputIndex: utxo.tx_pos,
              satoshis: utxo.value,
              txid: utxo.tx_hash
            });
          }
        } catch (e) {
          console.warn(`Could not fetch tx ${utxo.tx_hash}, skipping`);
        }
      }
      
      console.log(`Successfully loaded ${this.utxos.length} UTXOs`);
      return this.utxos;
    } catch (error) {
      console.error('Error fetching UTXOs:', error);
      this.utxos = [];
      return [];
    }
  }

  selectUTXOs(amount: number): { selected: UTXO[], total: number } {
    console.log(`Selecting UTXOs for amount: ${amount}`);
    
    const sortedUTXOs = [...this.utxos].sort((a, b) => b.satoshis - a.satoshis);
    const selected: UTXO[] = [];
    let total = 0;
    
    const targetAmount = amount + 500; // Add fee buffer
    
    for (const utxo of sortedUTXOs) {
      selected.push(utxo);
      total += utxo.satoshis;
      console.log(`Selected UTXO: ${utxo.satoshis} sats, total now: ${total}`);
      if (total >= targetAmount) break;
    }
    
    console.log(`Selected ${selected.length} UTXOs with total: ${total} satoshis`);
    return { selected, total };
  }
}

// Message Transaction Creator Class
export class MessageTransaction {
  privateKey: PrivateKey;
  network: Network;
  feePerKb: number;

  constructor(privateKey: PrivateKey, network: Network = 'mainnet') {
    this.privateKey = privateKey;
    this.network = network;
    this.feePerKb = 50;
  }

  async createMessageTx(recipientPubKey: PublicKey, message: string, utxos: UTXO[]) {
    const tx = new Transaction();
    
    let encryptedHex: string;
    
    // Standard ECDH encryption
    console.log('Using standard ECDH encryption');
    const sharedSecret = this.privateKey.deriveSharedSecret(recipientPubKey);
    let sharedSecretArray;
    
    if (typeof sharedSecret.toArray === 'function') {
      sharedSecretArray = sharedSecret.toArray();
    } else if (typeof sharedSecret.toHex === 'function') {
      sharedSecretArray = Utils.toArray(sharedSecret.toHex(), 'hex');
    } else {
      const hexString = sharedSecret.toString(16).padStart(64, '0');
      sharedSecretArray = Utils.toArray(hexString, 'hex');
    }
    
    const symmetricKey = new SymmetricKey(Hash.sha256(sharedSecretArray));
    const encryptedMessage = symmetricKey.encrypt(message);
    encryptedHex = Utils.toHex(encryptedMessage);
    
    console.log('Encrypted message hex:', encryptedHex);
    
    // Add inputs
    for (const utxo of utxos) {
      tx.addInput({
        sourceTransaction: utxo.sourceTransaction,
        sourceOutputIndex: utxo.sourceOutputIndex,
        unlockingScriptTemplate: new P2PKH().unlock(this.privateKey)
      });
    }
    
    // Create OP_RETURN
    const opReturnScript = this.createOpReturnScript(encryptedHex);
    console.log('OP_RETURN script ASM:', opReturnScript.toASM());
    
    tx.addOutput({
      lockingScript: opReturnScript,
      satoshis: 0
    });
    
    // Add small payment to recipient
    const recipientAddress = recipientPubKey.toAddress(this.network).toString();
    tx.addOutput({
      lockingScript: new P2PKH().lock(recipientAddress),
      satoshis: 1000
    });
    
    // Add change output
    const changeAddress = this.privateKey.toPublicKey().toAddress(this.network).toString();
    tx.addOutput({
      lockingScript: new P2PKH().lock(changeAddress),
      change: true
    });
    
    await tx.fee();
    await tx.sign();
    
    return tx;
  }

  createOpReturnScript(data: string): Script {
    const prefix = '1933'; // Protocol identifier
    const fullData = prefix + data;
    
    const scriptParts = ['OP_FALSE', 'OP_RETURN'];
    
    if (fullData.length <= 150) {
      scriptParts.push(fullData);
    } else {
      scriptParts.push(`OP_PUSHDATA1 ${fullData.length / 2} ${fullData}`);
    }
    
    const scriptASM = scriptParts.join(' ');
    return Script.fromASM(scriptASM);
  }
}

// Blockchain Message Reader Class
export class BlockchainMessageReader {
  network: Network;
  baseUrl: string;
  apiKey: string | null;

  constructor(network: Network = 'mainnet', apiKey: string | null = null) {
    this.network = network;
    this.baseUrl = network === 'testnet' 
      ? 'https://api.whatsonchain.com/v1/bsv/test'
      : 'https://api.whatsonchain.com/v1/bsv/main';
    this.apiKey = apiKey;
  }

  getHeaders() {
    const headers: any = {};
    if (this.apiKey) {
      headers['Authorization'] = this.apiKey;
    }
    return headers;
  }

  async fetchMessages(address: string, privateKey: PrivateKey, contacts: SavedContact[]): Promise<OnChainMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/address/${address}/history`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch transaction history');
      
      const txHistory = await response.json();
      const messages: OnChainMessage[] = [];
      
      for (const txInfo of txHistory) {
        const txDetailResponse = await fetch(`${this.baseUrl}/tx/${txInfo.tx_hash}`, {
          headers: this.getHeaders()
        });
        
        if (txDetailResponse.ok) {
          const txDetail = await txDetailResponse.json();
          const message = await this.extractMessage(txDetail, privateKey, address, contacts);
          if (message) messages.push(message);
        }
      }
      
      return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async extractMessage(txInfo: any, privateKey: PrivateKey, myAddress: string, contacts: SavedContact[]): Promise<OnChainMessage | null> {
    try {
      const opReturnOutput = txInfo.vout?.find((out: any) => 
        out.scriptPubKey?.type === 'nulldata' || 
        out.scriptPubKey?.asm?.includes('OP_RETURN')
      );

      if (!opReturnOutput) {
        return null;
      }

      const asm = opReturnOutput.scriptPubKey.asm;
      console.log('Found OP_RETURN ASM:', asm);
      
      const parts = asm.split(' ');
      const returnIndex = parts.indexOf('OP_RETURN');
      
      if (returnIndex === -1 || returnIndex + 1 >= parts.length) {
        return null;
      }

      const hexData = parts[returnIndex + 1];
      
      if (!hexData || !hexData.startsWith('1933')) {
        return null;
      }

      const dataAfterPrefix = hexData.substring(4);
      const encryptedHex = dataAfterPrefix;

      console.log('Encrypted message from chain:', encryptedHex);

      const isFromMe = txInfo.vin?.some((input: any) => 
        input.voutDetails?.addresses?.includes(myAddress) || 
        input.addr === myAddress
      );

      let senderAddr = myAddress;
      let recipientAddr = '';

      if (isFromMe) {
        const recipientOutput = txInfo.vout?.find((out: any) => 
          out.scriptPubKey?.type === 'pubkeyhash' && 
          out.value > 0 && 
          out.value <= 0.00001 &&
          !out.scriptPubKey?.addresses?.includes(myAddress)
        );
        if (recipientOutput) {
          recipientAddr = recipientOutput.scriptPubKey.addresses[0];
        }
      } else {
        senderAddr = txInfo.vin?.[0]?.addr || 'Unknown';
        recipientAddr = myAddress;
      }

      const decrypted = await this.tryDecrypt(
        encryptedHex, 
        privateKey, 
        contacts,
        isFromMe,
        senderAddr,
        recipientAddr
      );

      if (decrypted) {
        return {
          txid: txInfo.txid || txInfo.tx_hash,
          timestamp: new Date(txInfo.time * 1000),
          message: decrypted.message,
          sender: decrypted.sender,
          recipient: decrypted.recipient,
          encrypted: encryptedHex,
          isFromMe,
          encryptionType: 'standard'
        };
      }

      return {
        txid: txInfo.txid || txInfo.tx_hash,
        timestamp: new Date(txInfo.time * 1000),
        message: `[Encrypted: ${encryptedHex.substring(0, 20)}...]`,
        sender: senderAddr,
        recipient: recipientAddr,
        encrypted: encryptedHex,
        isFromMe,
        encryptionType: 'standard'
      };

    } catch (error) {
      console.error('Error extracting message from tx:', error);
      return null;
    }
  }

  async tryDecrypt(encryptedHex: string, privateKey: PrivateKey, contacts: SavedContact[], isFromMe: boolean, senderAddr: string, recipientAddr: string): Promise<{ message: string, sender: string, recipient: string } | null> {
    try {
      const encryptedBytes = Utils.toArray(encryptedHex, 'hex');
      console.log('Attempting to decrypt:', encryptedHex);
      
      for (const contact of contacts) {
        try {
          const contactPubKey = PublicKey.fromString(contact.publicKeyHex);
          const sharedSecret = privateKey.deriveSharedSecret(contactPubKey);
          
          let sharedSecretArray;
          if (typeof sharedSecret.toArray === 'function') {
            sharedSecretArray = sharedSecret.toArray();
          } else if (typeof sharedSecret.toHex === 'function') {
            sharedSecretArray = Utils.toArray(sharedSecret.toHex(), 'hex');
          } else {
            const hexString = sharedSecret.toString(16).padStart(64, '0');
            sharedSecretArray = Utils.toArray(hexString, 'hex');
          }
          
          const symmetricKey = new SymmetricKey(Hash.sha256(sharedSecretArray));
          const decrypted = symmetricKey.decrypt(encryptedBytes, 'utf8');
          
          console.log(`Successfully decrypted with contact: ${contact.name}`);
          
          return {
            message: decrypted,
            sender: isFromMe ? senderAddr : contact.name,
            recipient: isFromMe ? contact.name : senderAddr
          };
        } catch (e) {
          // Try next contact
        }
      }
      
      console.log('Could not decrypt with any known contact');
      return null;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }
}

// Helper function to organize messages into conversations
export function organizeMessagesIntoConversations(messages: OnChainMessage[], contacts: SavedContact[], network: Network): BlockchainConversation[] {
  const conversationMap = new Map<string, BlockchainConversation>();
  
  messages.forEach(msg => {
    const otherParty = msg.isFromMe ? msg.recipient : msg.sender;
    
    const contact = contacts.find(c => {
      try {
        const contactPubKey = PublicKey.fromString(c.publicKeyHex);
        const contactAddress = contactPubKey.toAddress(network).toString();
        return contactAddress === otherParty;
      } catch {
        return false;
      }
    });
    
    const conversationId = contact?.id || otherParty;
    const conversationName = contact?.name || `Unknown (${otherParty.substring(0, 8)}...)`;
    
    if (!conversationMap.has(conversationId)) {
      conversationMap.set(conversationId, {
        contactId: conversationId,
        contactName: conversationName,
        contactAddress: otherParty,
        messages: []
      });
    }
    
    conversationMap.get(conversationId)!.messages.push({
      ...msg,
      contactName: conversationName
    });
  });
  
  conversationMap.forEach(conv => {
    conv.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  });
  
  return Array.from(conversationMap.values());
}
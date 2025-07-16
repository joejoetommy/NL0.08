import { Transaction, PrivateKey, PublicKey, Utils, SymmetricKey, Hash, P2PKH, Script } from '@bsv/sdk';

type Network = 'mainnet' | 'testnet';

interface UTXO {
  sourceTransaction: any;
  sourceOutputIndex: number;
  satoshis: number;
  txid: string;
  // Additional fields for compatibility
  tx_hash?: string;
  tx_pos?: number;
  value?: number;
  vout?: number;
  height?: number;
  confirmations?: number;
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

// Enhanced UTXO Manager Class with Ordinals Support
export class UTXOManager {
  address: string;
  network: Network;
  utxos: UTXO[];
  apiKey: string | null;
  private spentUTXOs: Set<string> = new Set(); // Track spent UTXOs

  constructor(address: string, network: Network, apiKey: string | null = null) {
    this.address = address;
    this.network = network;
    this.utxos = [];
    this.apiKey = apiKey;
  }

  getHeaders() {
    const headers: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  // Create a unique identifier for a UTXO
  private getUTXOKey(utxo: UTXO): string {
    const txid = utxo.txid || utxo.tx_hash || '';
    const vout = utxo.sourceOutputIndex !== undefined ? utxo.sourceOutputIndex : 
                 (utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0));
    return `${txid}:${vout}`;
  }

  // Mark UTXOs as spent
  markAsSpent(utxos: UTXO[]): void {
    for (const utxo of utxos) {
      const key = this.getUTXOKey(utxo);
      this.spentUTXOs.add(key);
      console.log(`Marked UTXO as spent: ${key}`);
    }
  }

  // Clear the spent UTXOs cache (call this after confirmations)
  clearSpentCache(): void {
    this.spentUTXOs.clear();
    console.log('Cleared spent UTXO cache');
  }

  async fetchUTXOs(forceRefresh: boolean = true): Promise<UTXO[]> {
    const baseUrl = this.network === 'testnet' 
      ? 'https://api.whatsonchain.com/v1/bsv/test'
      : 'https://api.whatsonchain.com/v1/bsv/main';
    
    try {
      console.log(`Fetching UTXOs for address: ${this.address} on ${this.network}`);
      const response = await fetch(`${baseUrl}/address/${this.address}/unspent`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        console.error('Failed to fetch UTXOs:', response.status, response.statusText);
        throw new Error('Failed to fetch UTXOs');
      }
      
      const utxos = await response.json();
      console.log(`Found ${utxos.length} UTXOs from API`);
      
      // Clear existing UTXOs if force refresh
      if (forceRefresh) {
        this.utxos = [];
      }
      
      // Process each UTXO
      const processedUTXOs: UTXO[] = [];
      
      for (const utxo of utxos) {
        // Create unique key for this UTXO
        const tempKey = `${utxo.tx_hash}:${utxo.tx_pos}`;
        
        // Skip if marked as spent
        if (this.spentUTXOs.has(tempKey)) {
          console.log(`Filtering out spent UTXO: ${tempKey}`);
          continue;
        }
        
        try {
          // Try to get the raw transaction for full sourceTransaction
          const txResponse = await fetch(`${baseUrl}/tx/${utxo.tx_hash}/hex`, {
            headers: this.getHeaders()
          });
          
          if (txResponse.ok) {
            const txHex = await txResponse.text();
            const sourceTransaction = Transaction.fromHex(txHex);
            
            // Verify the output exists at the expected index
            if (sourceTransaction.outputs && sourceTransaction.outputs[utxo.tx_pos]) {
              const processedUTXO: UTXO = {
                sourceTransaction: sourceTransaction,
                sourceOutputIndex: utxo.tx_pos,
                satoshis: utxo.value,
                txid: utxo.tx_hash,
                // Include original fields for compatibility
                tx_hash: utxo.tx_hash,
                tx_pos: utxo.tx_pos,
                value: utxo.value,
                height: utxo.height,
                confirmations: utxo.confirmations
              };
              processedUTXOs.push(processedUTXO);
            } else {
              console.warn(`Output ${utxo.tx_pos} not found in transaction ${utxo.tx_hash}`);
              // Still add it with a mock sourceTransaction
              const mockTx = this.createMockSourceTransaction(utxo);
              const processedUTXO: UTXO = {
                sourceTransaction: mockTx,
                sourceOutputIndex: utxo.tx_pos, // Use actual tx_pos, not 0
                satoshis: utxo.value,
                txid: utxo.tx_hash,
                tx_hash: utxo.tx_hash,
                tx_pos: utxo.tx_pos,
                value: utxo.value,
                height: utxo.height,
                confirmations: utxo.confirmations
              };
              processedUTXOs.push(processedUTXO);
            }
          } else {
            // If we can't get the full transaction, create a mock one
            console.warn(`Could not fetch full tx for ${utxo.tx_hash}, creating mock`);
            const mockTx = this.createMockSourceTransaction(utxo);
            const processedUTXO: UTXO = {
              sourceTransaction: mockTx,
              sourceOutputIndex: utxo.tx_pos, // Use actual tx_pos
              satoshis: utxo.value,
              txid: utxo.tx_hash,
              tx_hash: utxo.tx_hash,
              tx_pos: utxo.tx_pos,
              value: utxo.value,
              height: utxo.height,
              confirmations: utxo.confirmations
            };
            processedUTXOs.push(processedUTXO);
          }
        } catch (e) {
          console.warn(`Error processing UTXO ${utxo.tx_hash}:${utxo.tx_pos}:`, e);
          // Create mock transaction as fallback
          const mockTx = this.createMockSourceTransaction(utxo);
          const processedUTXO: UTXO = {
            sourceTransaction: mockTx,
            sourceOutputIndex: utxo.tx_pos,
            satoshis: utxo.value,
            txid: utxo.tx_hash,
            tx_hash: utxo.tx_hash,
            tx_pos: utxo.tx_pos,
            value: utxo.value,
            height: utxo.height,
            confirmations: utxo.confirmations
          };
          processedUTXOs.push(processedUTXO);
        }
      }
      
      // Sort UTXOs by value (largest first) for better selection
      processedUTXOs.sort((a, b) => b.satoshis - a.satoshis);
      
      this.utxos = processedUTXOs;
      console.log(`Successfully loaded ${this.utxos.length} UTXOs after filtering`);
      
      return this.utxos;
    } catch (error) {
      console.error('Error fetching UTXOs:', error);
      this.utxos = [];
      return [];
    }
  }

  // Create a mock source transaction when we can't fetch the real one
  private createMockSourceTransaction(utxo: any): any {
    // Create a minimal transaction object that satisfies the BSV SDK requirements
    // The key is to ensure the outputs array has the correct structure
    const outputs = [];
    
    // Create empty outputs up to the required index
    for (let i = 0; i <= utxo.tx_pos; i++) {
      if (i === utxo.tx_pos) {
        // This is the output we're spending
        outputs.push({
          satoshis: utxo.value,
          lockingScript: new P2PKH().lock(this.address)
        });
      } else {
        // Placeholder outputs
        outputs.push({
          satoshis: 0,
          lockingScript: new Script()
        });
      }
    }
    
    return {
      id: utxo.tx_hash,
      version: 1,
      inputs: [],
      outputs: outputs,
      lockTime: 0
    };
  }

  selectUTXOs(amount: number, feeRate: number = 1): { selected: UTXO[], total: number, change: number } {
    const selected: UTXO[] = [];
    let total = 0;
    
    // Calculate total available
    const totalAvailable = this.utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
    
    console.log(`Selecting UTXOs for ${amount} sats from ${totalAvailable} available sats`);
    
    // Estimate transaction size for fee calculation
    let estimatedSize = 10 + (34 * 2); // Base transaction size with 2 outputs
    
    for (const utxo of this.utxos) {
      // Skip dust UTXOs
      if (utxo.satoshis < 1) {
        console.log(`Skipping dust UTXO with ${utxo.satoshis} sats`);
        continue;
      }
      
      // Skip if already selected
      if (selected.includes(utxo)) {
        continue;
      }
      
      selected.push(utxo);
      total += utxo.satoshis;
      
      // Add input size to estimate (148 bytes for P2PKH input)
      estimatedSize += 148;
      
      // Calculate required amount including estimated fee
      const estimatedFee = Math.ceil(estimatedSize * feeRate);
      const requiredAmount = amount + estimatedFee;
      
      console.log(`Selected UTXO: ${utxo.satoshis} sats, total: ${total} sats, required: ${requiredAmount} sats`);
      
      if (total >= requiredAmount) {
        break;
      }
    }
    
    const estimatedFee = Math.ceil(estimatedSize * feeRate);
    const change = total - amount - estimatedFee;
    
    console.log(`Selected ${selected.length} UTXOs:`);
    console.log(`- Total input: ${total} sats`);
    console.log(`- Target amount: ${amount} sats`);
    console.log(`- Estimated fee: ${estimatedFee} sats`);
    console.log(`- Change: ${change} sats`);
    
    if (total < amount + estimatedFee) {
      console.warn(`Insufficient funds: have ${total} sats, need ${amount + estimatedFee} sats`);
    }
    
    return { selected, total, change };
  }

  // Get a single UTXO for spending (useful for ordinals)
  getSingleUTXO(minValue: number = 1): UTXO | null {
    for (const utxo of this.utxos) {
      if (utxo.satoshis >= minValue) {
        return utxo;
      }
    }
    return null;
  }

  // Get UTXOs sorted by confirmations (most confirmed first)
  getConfirmedUTXOs(minConfirmations: number = 1): UTXO[] {
    return this.utxos
      .filter(utxo => (utxo.confirmations || 0) >= minConfirmations)
      .sort((a, b) => (b.confirmations || 0) - (a.confirmations || 0));
  }

  // Calculate total balance
  getTotalBalance(): number {
    return this.utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
  }

  // Get UTXOs suitable for ordinals (avoid spending existing ordinals)
  getNonOrdinalUTXOs(): UTXO[] {
    // Filter out 1-sat UTXOs which might be ordinals
    return this.utxos.filter(utxo => utxo.satoshis > 1);
  }

  // Get UTXOs that are likely ordinals (1 sat outputs)
  getOrdinalUTXOs(): UTXO[] {
    return this.utxos.filter(utxo => utxo.satoshis === 1);
  }

  // Select UTXOs for creating an ordinal (avoid spending existing ordinals)
  selectUTXOsForOrdinal(feeEstimate: number = 500): { selected: UTXO[], total: number, change: number } {
    // Filter to only non-ordinal UTXOs
    const spendableUTXOs = this.getNonOrdinalUTXOs();
    
    // Temporarily use filtered UTXOs
    const originalUTXOs = this.utxos;
    this.utxos = spendableUTXOs;
    
    // Use standard selection with 1 sat for ordinal + fees
    const result = this.selectUTXOs(1 + feeEstimate);
    
    // Restore original UTXOs
    this.utxos = originalUTXOs;
    
    return result;
  }

  // Helper to format UTXO for transaction building
  formatUTXOForTransaction(utxo: UTXO): {
    txid: string;
    vout: number;
    satoshis: number;
  } {
    return {
      txid: utxo.txid || utxo.tx_hash || '',
      vout: utxo.sourceOutputIndex !== undefined ? utxo.sourceOutputIndex : 
            (utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0)),
      satoshis: utxo.satoshis || utxo.value || 0
    };
  }
}

// Message Transaction Creator Class (unchanged)
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

// Blockchain Message Reader Class (unchanged)
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

// import { Transaction, PrivateKey, PublicKey, Utils, SymmetricKey, Hash, P2PKH, Script } from '@bsv/sdk';

// type Network = 'mainnet' | 'testnet';

// interface UTXO {
//   sourceTransaction: any;
//   sourceOutputIndex: number;
//   satoshis: number;
//   txid: string;
// }

// interface OnChainMessage {
//   txid: string;
//   timestamp: Date;
//   message: string;
//   sender: string;
//   recipient: string;
//   encrypted: string;
//   isFromMe: boolean;
//   contactName?: string;
//   encryptionType?: 'standard';
// }

// interface SavedContact {
//   id: string;
//   name: string;
//   publicKeyHex: string;
//   sharedSecret?: string;
// }

// interface BlockchainConversation {
//   contactId: string;
//   contactName: string;
//   contactAddress: string;
//   messages: OnChainMessage[];
// }

// // Simple broadcaster for WhatsOnChain
// export class SimpleTestnetBroadcaster {
//   async broadcast(tx: Transaction): Promise<{ status: string; txid?: string; error?: string }> {
//     try {
//       const txHex = tx.toHex();
//       console.log('Broadcasting transaction hex length:', txHex.length);
      
//       // Validate transaction hex before sending
//       if (!txHex || txHex.length < 100) {
//         throw new Error('Invalid transaction hex - too short');
//       }
      
//       // Use WhatsOnChain broadcast endpoint
//       const response = await fetch('https://api.whatsonchain.com/v1/bsv/test/tx/raw', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ txhex: txHex })
//       });

//       if (response.ok) {
//         const txid = await response.text();
//         console.log('Transaction broadcasted successfully:', txid);
//         return { status: 'success', txid: txid.replace(/['"]+/g, '') };
//       } else {
//         const error = await response.text();
//         console.error('Broadcast failed with status:', response.status, 'Error:', error);
        
//         // Try to parse error for more details
//         if (error.includes('TX decode failed')) {
//           console.error('Transaction hex may be malformed. First 200 chars:', txHex.substring(0, 200));
//         }
        
//         return { status: 'error', error: `${response.status}: ${error}` };
//       }
//     } catch (error) {
//       console.error('Broadcast error:', error);
//       return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
//     }
//   }
// }

// // UTXO Manager Class
// export class UTXOManager {
//   address: string;
//   network: Network;
//   utxos: UTXO[];
//   apiKey: string | null;

//   constructor(address: string, network: Network, apiKey: string | null = null) {
//     this.address = address;
//     this.network = network;
//     this.utxos = [];
//     this.apiKey = apiKey;
//   }

//   getHeaders() {
//     const headers: any = {};
//     if (this.apiKey) {
//       headers['Authorization'] = this.apiKey;
//     }
//     return headers;
//   }

//   async fetchUTXOs(): Promise<UTXO[]> {
//     const baseUrl = this.network === 'testnet' 
//       ? 'https://api.whatsonchain.com/v1/bsv/test'
//       : 'https://api.whatsonchain.com/v1/bsv/main';
    
//     try {
//       console.log(`Fetching UTXOs for address: ${this.address}`);
//       const response = await fetch(`${baseUrl}/address/${this.address}/unspent`, {
//         headers: this.getHeaders()
//       });
      
//       if (!response.ok) {
//         console.error('Failed to fetch UTXOs:', response.status, response.statusText);
//         throw new Error('Failed to fetch UTXOs');
//       }
      
//       const utxos = await response.json();
//       console.log(`Found ${utxos.length} UTXOs:`, utxos);
      
//       // For each UTXO, we'll fetch the raw tx to get the full transaction
//       this.utxos = [];
//       for (const utxo of utxos) {
//         try {
//           // Try to get the raw transaction
//           const txResponse = await fetch(`${baseUrl}/tx/${utxo.tx_hash}/hex`, {
//             headers: this.getHeaders()
//           });
//           if (txResponse.ok) {
//             const txHex = await txResponse.text();
//             this.utxos.push({
//               sourceTransaction: Transaction.fromHex(txHex),
//               sourceOutputIndex: utxo.tx_pos,
//               satoshis: utxo.value,
//               txid: utxo.tx_hash
//             });
//           }
//         } catch (e) {
//           console.warn(`Could not fetch tx ${utxo.tx_hash}, skipping`);
//         }
//       }
      
//       console.log(`Successfully loaded ${this.utxos.length} UTXOs`);
//       return this.utxos;
//     } catch (error) {
//       console.error('Error fetching UTXOs:', error);
//       this.utxos = [];
//       return [];
//     }
//   }

//   selectUTXOs(amount: number): { selected: UTXO[], total: number } {
//     console.log(`Selecting UTXOs for amount: ${amount}`);
    
//     const sortedUTXOs = [...this.utxos].sort((a, b) => b.satoshis - a.satoshis);
//     const selected: UTXO[] = [];
//     let total = 0;
    
//     const targetAmount = amount + 500; // Add fee buffer
    
//     for (const utxo of sortedUTXOs) {
//       selected.push(utxo);
//       total += utxo.satoshis;
//       console.log(`Selected UTXO: ${utxo.satoshis} sats, total now: ${total}`);
//       if (total >= targetAmount) break;
//     }
    
//     console.log(`Selected ${selected.length} UTXOs with total: ${total} satoshis`);
//     return { selected, total };
//   }
// }

// // Message Transaction Creator Class
// export class MessageTransaction {
//   privateKey: PrivateKey;
//   network: Network;
//   feePerKb: number;

//   constructor(privateKey: PrivateKey, network: Network = 'mainnet') {
//     this.privateKey = privateKey;
//     this.network = network;
//     this.feePerKb = 50;
//   }

//   async createMessageTx(recipientPubKey: PublicKey, message: string, utxos: UTXO[]) {
//     const tx = new Transaction();
    
//     let encryptedHex: string;
    
//     // Standard ECDH encryption
//     console.log('Using standard ECDH encryption');
//     const sharedSecret = this.privateKey.deriveSharedSecret(recipientPubKey);
//     let sharedSecretArray;
    
//     if (typeof sharedSecret.toArray === 'function') {
//       sharedSecretArray = sharedSecret.toArray();
//     } else if (typeof sharedSecret.toHex === 'function') {
//       sharedSecretArray = Utils.toArray(sharedSecret.toHex(), 'hex');
//     } else {
//       const hexString = sharedSecret.toString(16).padStart(64, '0');
//       sharedSecretArray = Utils.toArray(hexString, 'hex');
//     }
    
//     const symmetricKey = new SymmetricKey(Hash.sha256(sharedSecretArray));
//     const encryptedMessage = symmetricKey.encrypt(message);
//     encryptedHex = Utils.toHex(encryptedMessage);
    
//     console.log('Encrypted message hex:', encryptedHex);
    
//     // Add inputs
//     for (const utxo of utxos) {
//       tx.addInput({
//         sourceTransaction: utxo.sourceTransaction,
//         sourceOutputIndex: utxo.sourceOutputIndex,
//         unlockingScriptTemplate: new P2PKH().unlock(this.privateKey)
//       });
//     }
    
//     // Create OP_RETURN
//     const opReturnScript = this.createOpReturnScript(encryptedHex);
//     console.log('OP_RETURN script ASM:', opReturnScript.toASM());
    
//     tx.addOutput({
//       lockingScript: opReturnScript,
//       satoshis: 0
//     });
    
//     // Add small payment to recipient
//     const recipientAddress = recipientPubKey.toAddress(this.network).toString();
//     tx.addOutput({
//       lockingScript: new P2PKH().lock(recipientAddress),
//       satoshis: 1000
//     });
    
//     // Add change output
//     const changeAddress = this.privateKey.toPublicKey().toAddress(this.network).toString();
//     tx.addOutput({
//       lockingScript: new P2PKH().lock(changeAddress),
//       change: true
//     });
    
//     await tx.fee();
//     await tx.sign();
    
//     return tx;
//   }

//   createOpReturnScript(data: string): Script {
//     const prefix = '1933'; // Protocol identifier
//     const fullData = prefix + data;
    
//     const scriptParts = ['OP_FALSE', 'OP_RETURN'];
    
//     if (fullData.length <= 150) {
//       scriptParts.push(fullData);
//     } else {
//       scriptParts.push(`OP_PUSHDATA1 ${fullData.length / 2} ${fullData}`);
//     }
    
//     const scriptASM = scriptParts.join(' ');
//     return Script.fromASM(scriptASM);
//   }
// }

// // Blockchain Message Reader Class
// export class BlockchainMessageReader {
//   network: Network;
//   baseUrl: string;
//   apiKey: string | null;

//   constructor(network: Network = 'mainnet', apiKey: string | null = null) {
//     this.network = network;
//     this.baseUrl = network === 'testnet' 
//       ? 'https://api.whatsonchain.com/v1/bsv/test'
//       : 'https://api.whatsonchain.com/v1/bsv/main';
//     this.apiKey = apiKey;
//   }

//   getHeaders() {
//     const headers: any = {};
//     if (this.apiKey) {
//       headers['Authorization'] = this.apiKey;
//     }
//     return headers;
//   }

//   async fetchMessages(address: string, privateKey: PrivateKey, contacts: SavedContact[]): Promise<OnChainMessage[]> {
//     try {
//       const response = await fetch(`${this.baseUrl}/address/${address}/history`, {
//         headers: this.getHeaders()
//       });
      
//       if (!response.ok) throw new Error('Failed to fetch transaction history');
      
//       const txHistory = await response.json();
//       const messages: OnChainMessage[] = [];
      
//       for (const txInfo of txHistory) {
//         const txDetailResponse = await fetch(`${this.baseUrl}/tx/${txInfo.tx_hash}`, {
//           headers: this.getHeaders()
//         });
        
//         if (txDetailResponse.ok) {
//           const txDetail = await txDetailResponse.json();
//           const message = await this.extractMessage(txDetail, privateKey, address, contacts);
//           if (message) messages.push(message);
//         }
//       }
      
//       return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
//     } catch (error) {
//       console.error('Error fetching messages:', error);
//       return [];
//     }
//   }

//   async extractMessage(txInfo: any, privateKey: PrivateKey, myAddress: string, contacts: SavedContact[]): Promise<OnChainMessage | null> {
//     try {
//       const opReturnOutput = txInfo.vout?.find((out: any) => 
//         out.scriptPubKey?.type === 'nulldata' || 
//         out.scriptPubKey?.asm?.includes('OP_RETURN')
//       );

//       if (!opReturnOutput) {
//         return null;
//       }

//       const asm = opReturnOutput.scriptPubKey.asm;
//       console.log('Found OP_RETURN ASM:', asm);
      
//       const parts = asm.split(' ');
//       const returnIndex = parts.indexOf('OP_RETURN');
      
//       if (returnIndex === -1 || returnIndex + 1 >= parts.length) {
//         return null;
//       }

//       const hexData = parts[returnIndex + 1];
      
//       if (!hexData || !hexData.startsWith('1933')) {
//         return null;
//       }

//       const dataAfterPrefix = hexData.substring(4);
//       const encryptedHex = dataAfterPrefix;

//       console.log('Encrypted message from chain:', encryptedHex);

//       const isFromMe = txInfo.vin?.some((input: any) => 
//         input.voutDetails?.addresses?.includes(myAddress) || 
//         input.addr === myAddress
//       );

//       let senderAddr = myAddress;
//       let recipientAddr = '';

//       if (isFromMe) {
//         const recipientOutput = txInfo.vout?.find((out: any) => 
//           out.scriptPubKey?.type === 'pubkeyhash' && 
//           out.value > 0 && 
//           out.value <= 0.00001 &&
//           !out.scriptPubKey?.addresses?.includes(myAddress)
//         );
//         if (recipientOutput) {
//           recipientAddr = recipientOutput.scriptPubKey.addresses[0];
//         }
//       } else {
//         senderAddr = txInfo.vin?.[0]?.addr || 'Unknown';
//         recipientAddr = myAddress;
//       }

//       const decrypted = await this.tryDecrypt(
//         encryptedHex, 
//         privateKey, 
//         contacts,
//         isFromMe,
//         senderAddr,
//         recipientAddr
//       );

//       if (decrypted) {
//         return {
//           txid: txInfo.txid || txInfo.tx_hash,
//           timestamp: new Date(txInfo.time * 1000),
//           message: decrypted.message,
//           sender: decrypted.sender,
//           recipient: decrypted.recipient,
//           encrypted: encryptedHex,
//           isFromMe,
//           encryptionType: 'standard'
//         };
//       }

//       return {
//         txid: txInfo.txid || txInfo.tx_hash,
//         timestamp: new Date(txInfo.time * 1000),
//         message: `[Encrypted: ${encryptedHex.substring(0, 20)}...]`,
//         sender: senderAddr,
//         recipient: recipientAddr,
//         encrypted: encryptedHex,
//         isFromMe,
//         encryptionType: 'standard'
//       };

//     } catch (error) {
//       console.error('Error extracting message from tx:', error);
//       return null;
//     }
//   }

//   async tryDecrypt(encryptedHex: string, privateKey: PrivateKey, contacts: SavedContact[], isFromMe: boolean, senderAddr: string, recipientAddr: string): Promise<{ message: string, sender: string, recipient: string } | null> {
//     try {
//       const encryptedBytes = Utils.toArray(encryptedHex, 'hex');
//       console.log('Attempting to decrypt:', encryptedHex);
      
//       for (const contact of contacts) {
//         try {
//           const contactPubKey = PublicKey.fromString(contact.publicKeyHex);
//           const sharedSecret = privateKey.deriveSharedSecret(contactPubKey);
          
//           let sharedSecretArray;
//           if (typeof sharedSecret.toArray === 'function') {
//             sharedSecretArray = sharedSecret.toArray();
//           } else if (typeof sharedSecret.toHex === 'function') {
//             sharedSecretArray = Utils.toArray(sharedSecret.toHex(), 'hex');
//           } else {
//             const hexString = sharedSecret.toString(16).padStart(64, '0');
//             sharedSecretArray = Utils.toArray(hexString, 'hex');
//           }
          
//           const symmetricKey = new SymmetricKey(Hash.sha256(sharedSecretArray));
//           const decrypted = symmetricKey.decrypt(encryptedBytes, 'utf8');
          
//           console.log(`Successfully decrypted with contact: ${contact.name}`);
          
//           return {
//             message: decrypted,
//             sender: isFromMe ? senderAddr : contact.name,
//             recipient: isFromMe ? contact.name : senderAddr
//           };
//         } catch (e) {
//           // Try next contact
//         }
//       }
      
//       console.log('Could not decrypt with any known contact');
//       return null;
//     } catch (error) {
//       console.error('Decryption error:', error);
//       return null;
//     }
//   }
// }

// // Helper function to organize messages into conversations
// export function organizeMessagesIntoConversations(messages: OnChainMessage[], contacts: SavedContact[], network: Network): BlockchainConversation[] {
//   const conversationMap = new Map<string, BlockchainConversation>();
  
//   messages.forEach(msg => {
//     const otherParty = msg.isFromMe ? msg.recipient : msg.sender;
    
//     const contact = contacts.find(c => {
//       try {
//         const contactPubKey = PublicKey.fromString(c.publicKeyHex);
//         const contactAddress = contactPubKey.toAddress(network).toString();
//         return contactAddress === otherParty;
//       } catch {
//         return false;
//       }
//     });
    
//     const conversationId = contact?.id || otherParty;
//     const conversationName = contact?.name || `Unknown (${otherParty.substring(0, 8)}...)`;
    
//     if (!conversationMap.has(conversationId)) {
//       conversationMap.set(conversationId, {
//         contactId: conversationId,
//         contactName: conversationName,
//         contactAddress: otherParty,
//         messages: []
//       });
//     }
    
//     conversationMap.get(conversationId)!.messages.push({
//       ...msg,
//       contactName: conversationName
//     });
//   });
  
//   conversationMap.forEach(conv => {
//     conv.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
//   });
  
//   return Array.from(conversationMap.values());
// }










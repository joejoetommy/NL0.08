    // No. me =  xpub 03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416 /  
    // xpri / 6811543cdaae96cc602c2ed5efe517bf86cecdb0abbe678eb957b86bf8d3ff13
    // muCRZXdunSqaKv5REC37Ahf6ZUAK2yqKes
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 1st  txid 3202b84061d9f49595476cd8a5316b86159c5f98fd1c754d0a6fcad15d415b9e     with alic test contact
// 2nd txid 791658c255efd6572061716bbfb7f32cde7e95570f588c922d92417cb4bb7857
// 3rd txid 0e6ce96026b211561f66ab02ede37115f1b818ab0d5b15407eeef9085e8690da
// 4th txid d2661f6b330fcdd46cd9e49e0cf480b4bce48fd2ecd50333d3a984ba506f31ad
// 5th txid 432db921aa710ac08dc523cbb09470a27f27eb714faebf7bed46ef9dc18e0f97    message =  719494b123a54728387ad6374447923e3f3bfee654f6236e9dd11eed36d00fbccd13722db4ed957859b2c1ade73d276490d0d5523747f8d1e120290341537bfe800ed037a7f78ba0ba6828ef310a1c4e84
// 6th txid fb6b439e3646af827f80f4af585d6e4f6c3e82f598c3cf679b8654e2b892ecdf  message text 123456789 decrypted = 28b9c03915d89ebee52b57363b868b7b87cbb7b07308650d302258794cae471a49a32dbf179c0ec28a7b55822b46212d2427d23df692867d99
/////
// 1st message to me ; txid a4b4d4aa5019033f2f507fc929f54de899a9a45ab8abf33c117d9d067645e130  message 12346789
// 2nd message to me txid 589f524ae8bec8bf0d8202437bf9e77a84f1603c5e62cf8d48668d6283641cc4  message 123456789

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// key api   allConversations currentConv SimpleTestnetBroadcaster send to Blockchain

import React, { useState, useEffect } from 'react';
// @ts-ignore
import { PrivateKey, PublicKey, Utils, SymmetricKey, Hash, Transaction, P2PKH, Script, ARC, EncryptedMessage } from '@bsv/sdk';
import { examplePublicKeys, getRandomExamplePublicKey } from './data2';

type Network = 'mainnet' | 'testnet';
type ViewMode = 'wallet' | 'contacts' | 'messages' | 'conversations';

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

interface UTXO {
  sourceTransaction: any; // Transaction type from SDK
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
  messageId?: string; // For Type-42
  encryptionType?: 'standard' | 'type42';
}

interface BlockchainConversation {
  contactId: string;
  contactName: string;
  contactAddress: string;
  messages: OnChainMessage[];
}

// Simple broadcaster for WhatsOnChain
class SimpleTestnetBroadcaster {
  async broadcast(tx: Transaction): Promise<{ status: string; txid?: string; error?: string }> {
    try {
      const txHex = tx.toHex();
      
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
        return { status: 'success', txid: txid.replace(/['"]+/g, '') };
      } else {
        const error = await response.text();
        return { status: 'error', error };
      }
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// UTXO Manager Class
class UTXOManager {
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

// Enhanced Type-42 Storage Manager with message re-decryption support
class Type42StorageManager {
  walletId: string;
  storageKey: string;
  invoiceNumbers: Map<string, Array<{ invoice: string, timestamp: number, txid?: string }>>;
  messageMetadata: Map<string, any>;
  contactKeys: Map<string, string>;
  conversationStates: Map<string, any>;

  constructor(walletAddress: string) {
    this.walletId = walletAddress.substring(0, 8); // Use first 8 chars of address
    this.storageKey = `type42_${this.walletId}`;
    this.invoiceNumbers = new Map();
    this.messageMetadata = new Map();
    this.contactKeys = new Map();
    this.conversationStates = new Map();
    
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restore maps from arrays
        if (data.invoiceNumbers) {
          this.invoiceNumbers = new Map(data.invoiceNumbers);
        }
        if (data.messageMetadata) {
          this.messageMetadata = new Map(data.messageMetadata);
        }
        if (data.contactKeys) {
          this.contactKeys = new Map(data.contactKeys);
        }
        if (data.conversationStates) {
          this.conversationStates = new Map(data.conversationStates);
        }
        
        console.log('Loaded Type-42 storage:', {
          invoices: this.invoiceNumbers.size,
          messages: this.messageMetadata.size,
          contacts: this.contactKeys.size
        });
      }
    } catch (error) {
      console.error('Error loading Type-42 storage:', error);
    }
  }

  saveToStorage() {
    try {
      const data = {
        version: '1.0',
        walletId: this.walletId,
        invoiceNumbers: Array.from(this.invoiceNumbers.entries()),
        messageMetadata: Array.from(this.messageMetadata.entries()),
        contactKeys: Array.from(this.contactKeys.entries()),
        conversationStates: Array.from(this.conversationStates.entries()),
        lastSaved: Date.now()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving Type-42 storage:', error);
    }
  }

  // Store invoice number for a contact
  storeInvoiceNumber(contactId: string, invoiceNumber: string, txid?: string) {
    const existing = this.invoiceNumbers.get(contactId) || [];
    
    // Clean up the txid (remove newlines)
    const cleanTxid = txid?.trim();
    
    // Check for duplicates
    const isDuplicate = existing.some(inv => inv.invoice === invoiceNumber);
    if (!isDuplicate) {
      existing.push({
        invoice: invoiceNumber,
        timestamp: Date.now(),
        txid: cleanTxid
      });
      
      // Keep only last 100 invoices per contact
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }
      
      this.invoiceNumbers.set(contactId, existing);
      this.saveToStorage();
    }
  }

  // Get invoice history for a contact
  getInvoiceHistory(contactId: string): Array<{ invoice: string, timestamp: number, txid?: string }> {
    return this.invoiceNumbers.get(contactId) || [];
  }

  // Check if invoice number was already used
  isInvoiceUsed(contactId: string, invoiceNumber: string): boolean {
    const history = this.getInvoiceHistory(contactId);
    return history.some(inv => inv.invoice === invoiceNumber);
  }

  // Store message metadata
  storeMessageMetadata(txid: string, metadata: any) {
    // Clean up the txid
    const cleanTxid = txid.trim();
    
    this.messageMetadata.set(cleanTxid, {
      ...metadata,
      storedAt: Date.now()
    });
    this.saveToStorage();
  }

  // Get message metadata
  getMessageMetadata(txid: string): any {
    // Try with cleaned txid
    const cleanTxid = txid.trim();
    return this.messageMetadata.get(cleanTxid) || this.messageMetadata.get(txid);
  }

  // Get all stored txids with metadata
  getAllStoredTxids(): string[] {
    return Array.from(this.messageMetadata.keys()).map(txid => txid.trim());
  }

  // Store conversation key derivation path
  storeConversationKey(contactId: string, conversationKey: string) {
    this.contactKeys.set(contactId, conversationKey);
    this.saveToStorage();
  }

  // Get conversation key
  getConversationKey(contactId: string): string | undefined {
    return this.contactKeys.get(contactId);
  }

  // Store conversation state (last message, counters, etc)
  storeConversationState(contactId: string, state: any) {
    this.conversationStates.set(contactId, {
      ...state,
      updatedAt: Date.now()
    });
    this.saveToStorage();
  }

  // Get conversation state
  getConversationState(contactId: string): any {
    return this.conversationStates.get(contactId);
  }

  // Get next invoice counter for a contact
  getNextInvoiceCounter(contactId: string, dateStr: string, purpose: string = 'msg'): number {
    const history = this.getInvoiceHistory(contactId);
    
    // Filter invoices for the same date and purpose
    const sameDayInvoices = history.filter(inv => {
      const parts = inv.invoice.split('-');
      return parts[1] === purpose && parts[2] === dateStr.split('-')[0] && 
             parts[3] === dateStr.split('-')[1] && parts[4] === dateStr.split('-')[2];
    });
    
    // Find the highest counter
    let maxCounter = 0;
    sameDayInvoices.forEach(inv => {
      const parts = inv.invoice.split('-');
      const counter = parseInt(parts[parts.length - 1]) || 0;
      if (counter > maxCounter) {
        maxCounter = counter;
      }
    });
    
    return maxCounter + 1;
  }

  // Clean up old data (older than specified days)
  cleanup(daysToKeep: number = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    // Clean invoice numbers
    this.invoiceNumbers.forEach((invoices, contactId) => {
      const filtered = invoices.filter(inv => inv.timestamp > cutoffTime);
      if (filtered.length > 0) {
        this.invoiceNumbers.set(contactId, filtered);
      } else {
        this.invoiceNumbers.delete(contactId);
      }
    });
    
    // Clean message metadata
    this.messageMetadata.forEach((metadata, txid) => {
      if (metadata.storedAt < cutoffTime) {
        this.messageMetadata.delete(txid);
      }
    });
    
    // Clean old conversation states
    this.conversationStates.forEach((state, contactId) => {
      if (state.updatedAt < cutoffTime) {
        this.conversationStates.delete(contactId);
      }
    });
    
    this.saveToStorage();
    console.log('Type-42 storage cleanup completed');
  }

  // Export data for backup
  exportData(): string {
    const data = {
      version: '1.0',
      walletId: this.walletId,
      exportedAt: new Date().toISOString(),
      invoiceNumbers: Array.from(this.invoiceNumbers.entries()),
      messageMetadata: Array.from(this.messageMetadata.entries()),
      contactKeys: Array.from(this.contactKeys.entries()),
      conversationStates: Array.from(this.conversationStates.entries())
    };
    
    return JSON.stringify(data, null, 2);
  }

  // Import data from backup with improved handling
  importData(jsonData: string) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.version === '1.0') {
        // Clean up txids in invoice numbers
        if (data.invoiceNumbers) {
          this.invoiceNumbers = new Map(data.invoiceNumbers.map(([contactId, invoices]: [string, any[]]) => {
            const cleanedInvoices = invoices.map(inv => ({
              ...inv,
              txid: inv.txid?.trim()
            }));
            return [contactId, cleanedInvoices];
          }));
        }
        
        // Clean up txids in message metadata keys
        if (data.messageMetadata) {
          this.messageMetadata = new Map(data.messageMetadata.map(([txid, metadata]: [string, any]) => {
            return [txid.trim(), metadata];
          }));
        }
        
        if (data.contactKeys) {
          this.contactKeys = new Map(data.contactKeys || []);
        }
        
        if (data.conversationStates) {
          this.conversationStates = new Map(data.conversationStates || []);
        }
        
        this.saveToStorage();
        console.log('Type-42 data imported successfully');
        
        // Return the imported metadata for re-decryption
        return {
          success: true,
          messageMetadata: this.messageMetadata,
          invoiceNumbers: this.invoiceNumbers
        };
      } else {
        throw new Error('Unsupported data version');
      }
    } catch (error) {
      console.error('Error importing Type-42 data:', error);
      throw error;
    }
  }

  // Get storage statistics
  getStats() {
    let totalInvoices = 0;
    this.invoiceNumbers.forEach(invoices => {
      totalInvoices += invoices.length;
    });
    
    return {
      contacts: this.invoiceNumbers.size,
      totalInvoices,
      messages: this.messageMetadata.size,
      conversations: this.conversationStates.size,
      storageSize: this.estimateStorageSize()
    };
  }

  // Estimate storage size in bytes
  estimateStorageSize(): number {
    const data = {
      invoiceNumbers: Array.from(this.invoiceNumbers.entries()),
      messageMetadata: Array.from(this.messageMetadata.entries()),
      contactKeys: Array.from(this.contactKeys.entries()),
      conversationStates: Array.from(this.conversationStates.entries())
    };
    
    return JSON.stringify(data).length;
  }
}

// Enhanced Type42AdvancedEncryption with proper BRC-42 invoice numbers and hierarchical key derivation
class Type42AdvancedEncryption {
  masterKey: PrivateKey;
  network: Network;
  invoiceCounter: Map<string, number>;
  messageCache: Map<string, string>;
  storageManager: Type42StorageManager | null;

  constructor(masterPrivateKey: PrivateKey, network: Network = 'mainnet', storageManager?: Type42StorageManager) {
    this.masterKey = masterPrivateKey;
    this.network = network;
    this.invoiceCounter = new Map();
    this.messageCache = new Map();
    this.storageManager = storageManager || null;
    
    // Restore invoice counters from storage manager if available
    if (this.storageManager) {
      this.restoreInvoiceCounters();
    }
  }

  // Restore invoice counters from storage manager
  restoreInvoiceCounters() {
    if (!this.storageManager) return;
    
    // Get all stored invoice numbers and update counters
    const allInvoices = this.storageManager.invoiceNumbers;
    allInvoices.forEach((invoices, contactId) => {
      invoices.forEach(inv => {
        const parts = inv.invoice.split('-');
        if (parts.length >= 6) {
          const dateStr = `${parts[2]}-${parts[3]}-${parts[4]}`;
          const counter = parseInt(parts[parts.length - 1]) || 0;
          const counterKey = `${dateStr}-${contactId}-${parts[1]}`;
          
          const currentCounter = this.invoiceCounter.get(counterKey) || 0;
          if (counter > currentCounter) {
            this.invoiceCounter.set(counterKey, counter);
          }
        }
      });
    });
  }

  // Generate BRC-42 compliant invoice number
  generateInvoiceNumber(contactPubKey: PublicKey, purpose: string = 'msg'): string {
    const today = new Date();
    const dateStr = `${today.getUTCFullYear()}-${(today.getUTCMonth() + 1).toString().padStart(2, '0')}-${today.getUTCDate().toString().padStart(2, '0')}`;
    
    // Use first 8 chars of contact's pubkey as identifier
    const contactId = contactPubKey.toString().substring(0, 8);
    
    let counter;
    if (this.storageManager) {
      // Use persistent counter from storage
      counter = this.storageManager.getNextInvoiceCounter(contactId, dateStr, purpose);
    } else {
      // Fallback to in-memory counter
      const counterKey = `${dateStr}-${contactId}-${purpose}`;
      counter = (this.invoiceCounter.get(counterKey) || 0) + 1;
      this.invoiceCounter.set(counterKey, counter);
    }
    
    // BRC-42 format: 2-purpose-date-identifier-counter
    return `2-${purpose}-${dateStr}-${contactId}-${counter}`;
  }

  // Hierarchical key derivation: Master → Conversation → Daily → Message
  async deriveMessageKey(recipientPubKey: PublicKey, invoiceNumber: string): Promise<{
    conversationKey: PrivateKey;
    dailyKey: PrivateKey;
    messageKey: PrivateKey;
  }> {
    // Layer 1: Conversation key (stable per contact)
    const conversationInvoice = `2-conversation-${recipientPubKey.toString().substring(0, 16)}`;
    const conversationKey = this.masterKey.deriveChild(recipientPubKey, conversationInvoice);
    
    // Layer 2: Daily key (rotates daily)
    const dailyInvoice = this.getDailyInvoiceNumber();
    const dailyKey = conversationKey.deriveChild(recipientPubKey, dailyInvoice);
    
    // Layer 3: Message-specific key
    const messageKey = dailyKey.deriveChild(recipientPubKey, invoiceNumber);
    
    return {
      conversationKey,
      dailyKey,
      messageKey
    };
  }

  // Generate daily invoice number
  getDailyInvoiceNumber(): string {
    const today = new Date();
    const dateStr = `${today.getUTCFullYear()}-${(today.getUTCMonth() + 1).toString().padStart(2, '0')}-${today.getUTCDate().toString().padStart(2, '0')}`;
    return `2-daily-${dateStr}`;
  }

  // Calculate message integrity checksum
  calculateChecksum(message: string): string {
    const messageBytes = Utils.toArray(message, 'utf8');
    const hash = Hash.sha256(messageBytes);
    return Utils.toHex(hash).substring(0, 8); // First 8 chars of SHA256
  }

  // Encrypt message with Type-42 Advanced (multi-layer)
  async encryptMessage(recipientMasterPubKey: PublicKey, message: string): Promise<{ encrypted: string, metadata: any }> {
    try {
      // Generate invoice number
      const invoiceNumber = this.generateInvoiceNumber(recipientMasterPubKey);
      
      // Derive hierarchical keys
      const keys = await this.deriveMessageKey(recipientMasterPubKey, invoiceNumber);
      
      // Calculate checksum for integrity
      const checksum = this.calculateChecksum(message);
      
      // Use SDK's EncryptedMessage with the message-specific key
      const messageBytes = Utils.toArray(message, 'utf8');
      const encrypted = EncryptedMessage.encrypt(
        messageBytes,
        keys.messageKey,
        recipientMasterPubKey
      );
      
      // Create compact metadata
      const metadata = {
        v: '42v2', // Shorter version identifier
        i: invoiceNumber,
        d: this.getDailyInvoiceNumber(),
        t: Math.floor(Date.now() / 1000), // Unix timestamp (seconds)
        c: checksum
      };
      
      return {
        encrypted: Utils.toHex(encrypted),
        metadata
      };
    } catch (error) {
      console.error('Type-42 encryption error:', error);
      throw error;
    }
  }

  // Decrypt message with Type-42 Advanced (with caching)
  async decryptMessage(senderMasterPubKey: PublicKey, encryptedHex: string, metadata: any): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `${metadata.i}-${encryptedHex.substring(0, 16)}`;
      if (this.messageCache.has(cacheKey)) {
        console.log('Returning cached decryption');
        return this.messageCache.get(cacheKey)!;
      }
      
      // Derive the same keys using the invoice number
      const keys = await this.deriveMessageKey(senderMasterPubKey, metadata.i);
      
      // Decrypt using the SDK
      const encryptedBytes = Utils.toArray(encryptedHex, 'hex');
      const decrypted = EncryptedMessage.decrypt(encryptedBytes, keys.messageKey);
      const message = Utils.toUTF8(decrypted);
      
      // Verify checksum if present
      if (metadata.c) {
        const calculatedChecksum = this.calculateChecksum(message);
        if (calculatedChecksum !== metadata.c) {
          console.warn('Message checksum mismatch - possible tampering');
          throw new Error('Message integrity check failed');
        }
      }
      
      // Cache the result
      this.messageCache.set(cacheKey, message);
      
      return message;
    } catch (error) {
      console.error('Type-42 decryption error:', error);
      throw error;
    }
  }

  // Fallback to standard ECDH for backward compatibility
  async decryptStandardMessage(senderPubKey: PublicKey, encryptedHex: string): Promise<string> {
    try {
      const sharedSecret = this.masterKey.deriveSharedSecret(senderPubKey);
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
      const encryptedBytes = Utils.toArray(encryptedHex, 'hex');
      return symmetricKey.decrypt(encryptedBytes, 'utf8');
    } catch (error) {
      throw error;
    }
  }

  // Clear message cache (call periodically to free memory)
  clearCache() {
    this.messageCache.clear();
  }

  // Get cache size
  getCacheSize(): number {
    return this.messageCache.size;
  }
}

// Fixed Message Transaction Creator Class - Fixes the 500 error
class MessageTransaction {
  privateKey: PrivateKey;
  network: Network;
  feePerKb: number;
  useType42: boolean;
  type42Encryption: Type42AdvancedEncryption | null;

  constructor(privateKey: PrivateKey, network: Network = 'mainnet', useType42: boolean = true) {
    this.privateKey = privateKey;
    this.network = network;
    this.feePerKb = 50;
    this.useType42 = useType42;
    this.type42Encryption = useType42 ? new Type42AdvancedEncryption(privateKey, network) : null;
  }

  async createMessageTx(recipientPubKey: PublicKey, message: string, utxos: UTXO[]) {
    const tx = new Transaction();
    
    let encryptedHex: string;
    let messageMetadata: any = {};
    
    if (this.useType42 && this.type42Encryption) {
      // Use Type-42 Advanced encryption
      console.log('Using Type-42 Advanced encryption');
      const result = await this.type42Encryption.encryptMessage(recipientPubKey, message);
      encryptedHex = result.encrypted;
      messageMetadata = result.metadata;
      console.log('Type-42 metadata:', messageMetadata);
    } else {
      // Fallback to standard ECDH encryption
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
    }
    
    console.log('Encrypted message hex length:', encryptedHex.length);
    
    // Add inputs
    for (const utxo of utxos) {
      tx.addInput({
        sourceTransaction: utxo.sourceTransaction,
        sourceOutputIndex: utxo.sourceOutputIndex,
        unlockingScriptTemplate: new P2PKH().unlock(this.privateKey)
      });
    }
    
    // Create OP_RETURN with metadata if using Type-42
    const opReturnScript = this.createOpReturnScript(encryptedHex, messageMetadata);
    console.log('OP_RETURN script length:', opReturnScript.toBinary().length);
    
    tx.addOutput({
      lockingScript: opReturnScript,
      satoshis: 0
    });
    
    // Add small payment to recipient (dust limit)
    const recipientAddress = recipientPubKey.toAddress(this.network).toString();
    tx.addOutput({
      lockingScript: new P2PKH().lock(recipientAddress),
      satoshis: 546 // Use dust limit instead of 1000
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

  createOpReturnScript(data: string, metadata: any = {}): Script {
    const prefix = '1933'; // Protocol identifier
    let fullData = prefix;
    
    // If using Type-42, include metadata
    if (metadata.v === '42v2') {
      // Create more compact metadata
      const metadataObj = {
        v: metadata.v,
        i: metadata.i,
        d: metadata.d,
        t: metadata.t,
        c: metadata.c
      };
      
      const metadataStr = JSON.stringify(metadataObj);
      const metadataHex = Utils.toHex(Utils.toArray(metadataStr, 'utf8'));
      
      // Format: prefix + metadataLength + metadata + encryptedData
      const metadataLength = (metadataHex.length / 2).toString(16).padStart(4, '0');
      fullData += metadataLength + metadataHex + data;
    } else {
      // Standard format: prefix + encryptedData
      fullData += data;
    }
    
    // Convert hex string to byte array
    const dataBytes = Utils.toArray(fullData, 'hex');
    console.log('Total OP_RETURN data length:', dataBytes.length, 'bytes');
    
    // Create script using Script class methods
    // OP_RETURN data limit is 220 bytes on BSV
    if (dataBytes.length <= 75) {
      // For small data, use direct push
      return Script.fromASM(`OP_FALSE OP_RETURN ${fullData}`);
    } else if (dataBytes.length <= 220) {
      // For larger data, use OP_PUSHDATA1
      const lengthByte = dataBytes.length.toString(16).padStart(2, '0');
      return Script.fromASM(`OP_FALSE OP_RETURN OP_PUSHDATA1 ${lengthByte} ${fullData}`);
    } else {
      // Data too large - need to truncate or compress
      console.warn('OP_RETURN data exceeds 220 bytes, truncating...');
      const truncatedData = fullData.substring(0, 440); // 220 bytes in hex
      const truncatedBytes = Utils.toArray(truncatedData, 'hex');
      const lengthByte = truncatedBytes.length.toString(16).padStart(2, '0');
      return Script.fromASM(`OP_FALSE OP_RETURN OP_PUSHDATA1 ${lengthByte} ${truncatedData}`);
    }
  }
}

// Enhanced Blockchain Message Reader with Full History Support
class BlockchainMessageReader {
  network: Network;
  baseUrl: string;
  apiKey: string | null;
  messageCache: Map<string, OnChainMessage[]>;
  txCache: Map<string, any>;
  lastFetchTime: Map<string, number>;
  cacheExpiry: number;

  constructor(network: Network = 'mainnet', apiKey: string | null = null) {
    this.network = network;
    this.baseUrl = network === 'testnet' 
      ? 'https://api.whatsonchain.com/v1/bsv/test'
      : 'https://api.whatsonchain.com/v1/bsv/main';
    this.apiKey = apiKey;
    this.messageCache = new Map();
    this.txCache = new Map();
    this.lastFetchTime = new Map();
    this.cacheExpiry = 60000; // 1 minute cache
  }

  // Helper to add API key to headers if available
  getHeaders() {
    const headers: any = {};
    if (this.apiKey) {
      headers['Authorization'] = this.apiKey;
    }
    return headers;
  }

  async fetchMessages(address: string, privateKey: PrivateKey, contacts: SavedContact[], limit: number = 0): Promise<OnChainMessage[]> {
    const cacheKey = `${address}-${contacts.map(c => c.id).join(',')}-${limit}`;
    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(cacheKey) || 0;
    
    // Check cache validity
    if (this.messageCache.has(cacheKey) && (now - lastFetch) < this.cacheExpiry) {
      console.log('Returning cached messages');
      return this.messageCache.get(cacheKey)!;
    }
    
    try {
      // Fetch transaction history - if limit is 0, fetch all, otherwise fetch limited
      const url = limit > 0 
        ? `${this.baseUrl}/address/${address}/history?limit=${limit}`
        : `${this.baseUrl}/address/${address}/history`;
        
      console.log(`Fetching ${limit > 0 ? 'recent' : 'all'} transactions for address: ${address}`);
      const response = await fetch(url, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch transaction history');
      
      const txHistory = await response.json();
      console.log(`Found ${txHistory.length} transactions`);
      
      const messages: OnChainMessage[] = [];
      
      // Process transactions in parallel for better performance
      const messagePromises = txHistory.map(async (txInfo: any) => {
        try {
          // Check transaction cache first
          let txDetail = this.txCache.get(txInfo.tx_hash);
          
          if (!txDetail) {
            const txDetailResponse = await fetch(`${this.baseUrl}/tx/${txInfo.tx_hash}`, {
              headers: this.getHeaders()
            });
            
            if (txDetailResponse.ok) {
              txDetail = await txDetailResponse.json();
              this.txCache.set(txInfo.tx_hash, txDetail);
            }
          }
          
          if (txDetail) {
            return await this.extractMessage(txDetail, privateKey, address, contacts);
          }
        } catch (e) {
          console.error(`Error processing tx ${txInfo.tx_hash}:`, e);
        }
        return null;
      });
      
      const results = await Promise.all(messagePromises);
      
      // Filter out null results and add to messages array
      results.forEach(msg => {
        if (msg) messages.push(msg);
      });
      
      // Sort by timestamp (newest first)
      messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Update cache
      this.messageCache.set(cacheKey, messages);
      this.lastFetchTime.set(cacheKey, now);
      
      console.log(`Extracted ${messages.length} messages from blockchain`);
      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Return cached data if available
      return this.messageCache.get(cacheKey) || [];
    }
  }

  // Export all transaction data with merkle proofs
  async exportTransactionHistory(messages: OnChainMessage[]): Promise<string> {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      network: this.network,
      messages: messages.map(msg => ({
        txid: msg.txid,
        timestamp: msg.timestamp.toISOString(),
        message: msg.message,
        sender: msg.sender,
        recipient: msg.recipient,
        encrypted: msg.encrypted,
        isFromMe: msg.isFromMe,
        contactName: msg.contactName,
        messageId: msg.messageId,
        encryptionType: msg.encryptionType
      })),
      // Store full transaction details from cache
      transactions: Array.from(this.txCache.entries()).map(([txid, txDetail]) => ({
        txid,
        detail: txDetail,
        // Add block information if available
        blockHeight: txDetail.blockheight,
        blockHash: txDetail.blockhash,
        confirmations: txDetail.confirmations
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Import transaction history from backup
  async importTransactionHistory(jsonData: string, privateKey: PrivateKey, contacts: SavedContact[]): Promise<OnChainMessage[]> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.version !== '1.0') {
        throw new Error('Unsupported backup version');
      }
      
      // Restore transaction cache
      if (data.transactions) {
        data.transactions.forEach((tx: any) => {
          this.txCache.set(tx.txid, tx.detail);
        });
      }
      
      // Restore messages with proper date conversion
      const messages: OnChainMessage[] = data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      // Try to decrypt any encrypted messages that weren't decrypted before
      const type42 = new Type42AdvancedEncryption(privateKey, this.network);
      
      for (const msg of messages) {
        if (msg.message.startsWith('[Encrypted:')) {
          // Try to decrypt with current contacts
          const decrypted = await this.tryDecrypt(
            msg.encrypted,
            type42,
            privateKey,
            contacts,
            msg.isFromMe,
            msg.sender,
            msg.recipient,
            null // We'll need to parse metadata from the encrypted data
          );
          
          if (decrypted) {
            msg.message = decrypted.message;
            msg.sender = decrypted.sender;
            msg.recipient = decrypted.recipient;
            msg.contactName = decrypted.contactName;
          }
        }
      }
      
      return messages;
    } catch (error) {
      console.error('Error importing transaction history:', error);
      throw error;
    }
  }

  async extractMessage(txInfo: any, privateKey: PrivateKey, myAddress: string, contacts: SavedContact[]): Promise<OnChainMessage | null> {
    try {
      // First check if this transaction has an OP_RETURN output
      const opReturnOutput = txInfo.vout?.find((out: any) => 
        out.scriptPubKey?.type === 'nulldata' || 
        out.scriptPubKey?.asm?.includes('OP_RETURN')
      );

      if (!opReturnOutput) {
        return null;
      }

      // Extract the data from the OP_RETURN
      const asm = opReturnOutput.scriptPubKey.asm;
      console.log('Found OP_RETURN ASM:', asm);
      
      // Parse the ASM to get the hex data
      const parts = asm.split(' ');
      const returnIndex = parts.indexOf('OP_RETURN');
      
      if (returnIndex === -1) return null;
      
      // Handle different OP_RETURN formats
      let hexData = '';
      if (returnIndex + 1 < parts.length) {
        const nextPart = parts[returnIndex + 1];
        
        if (nextPart === 'OP_PUSHDATA1' && returnIndex + 3 < parts.length) {
          // OP_PUSHDATA1 format
          hexData = parts[returnIndex + 3];
        } else if (!nextPart.startsWith('OP_')) {
          // Direct data
          hexData = nextPart;
        }
      }
      
      if (!hexData) return null;
      
      // Check for our protocol prefix
      if (!hexData.startsWith('1933')) {
        return null;
      }

      // Remove protocol prefix
      const dataAfterPrefix = hexData.substring(4);
      
      // Parse message data
      const messageData = this.parseMessageData(dataAfterPrefix);
      if (!messageData) return null;
      
      console.log('Parsed message data:', { 
        hasMetadata: !!messageData.metadata, 
        encryptedLength: messageData.encrypted.length 
      });

      // Determine if this is a sent or received message
      const isFromMe = txInfo.vin?.some((input: any) => 
        input.voutDetails?.addresses?.includes(myAddress) || 
        input.addr === myAddress
      );

      // Get sender and recipient addresses
      let senderAddr = myAddress;
      let recipientAddr = '';

      if (isFromMe) {
        // For sent messages, find the recipient from outputs
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
        // For received messages, sender is first input
        senderAddr = txInfo.vin?.[0]?.addr || 'Unknown';
        recipientAddr = myAddress;
      }

      // Create Type-42 encryption instance
      const type42 = new Type42AdvancedEncryption(privateKey, this.network);
      
      // Try to decrypt the message
      const decrypted = await this.tryDecrypt(
        messageData.encrypted,
        type42,
        privateKey,
        contacts,
        isFromMe,
        senderAddr,
        recipientAddr,
        messageData.metadata
      );

      if (decrypted) {
        return {
          txid: txInfo.txid || txInfo.tx_hash,
          timestamp: new Date(txInfo.time * 1000),
          message: decrypted.message,
          sender: decrypted.sender,
          recipient: decrypted.recipient,
          encrypted: messageData.encrypted,
          isFromMe,
          contactName: decrypted.contactName,
          messageId: messageData.metadata?.i,
          encryptionType: messageData.metadata?.v ? 'type42' : 'standard'
        };
      }

      // If we couldn't decrypt, still return the message info
      return {
        txid: txInfo.txid || txInfo.tx_hash,
        timestamp: new Date(txInfo.time * 1000),
        message: `[Encrypted: ${messageData.encrypted.substring(0, 20)}...]`,
        sender: senderAddr,
        recipient: recipientAddr,
        encrypted: messageData.encrypted,
        isFromMe,
        messageId: messageData.metadata?.i,
        encryptionType: messageData.metadata?.v ? 'type42' : 'standard'
      };

    } catch (error) {
      console.error('Error extracting message from tx:', error);
      return null;
    }
  }

  parseMessageData(dataAfterPrefix: string): { encrypted: string, metadata: any } | null {
    try {
      // Check if this is Type-42 format (has metadata)
      if (dataAfterPrefix.length > 4) {
        const metadataLength = parseInt(dataAfterPrefix.substring(0, 4), 16);
        
        if (metadataLength > 0 && metadataLength * 2 <= dataAfterPrefix.length - 4) {
          const metadataHex = dataAfterPrefix.substring(4, 4 + metadataLength * 2);
          const encryptedData = dataAfterPrefix.substring(4 + metadataLength * 2);
          
          try {
            // Parse metadata
            const metadataBytes = Utils.toArray(metadataHex, 'hex');
            const metadataStr = Utils.toUTF8(metadataBytes);
            const metadata = JSON.parse(metadataStr);
            
            console.log('Parsed Type-42 metadata:', metadata);
            
            return {
              encrypted: encryptedData,
              metadata
            };
          } catch (e) {
            console.log('Failed to parse as Type-42, treating as standard');
          }
        }
      }
      
      // Standard format (no metadata)
      return {
        encrypted: dataAfterPrefix,
        metadata: null
      };
    } catch (error) {
      console.error('Error parsing message data:', error);
      return null;
    }
  }

  async tryDecrypt(
    encryptedHex: string, 
    type42: Type42AdvancedEncryption,
    privateKey: PrivateKey, 
    contacts: SavedContact[], 
    isFromMe: boolean, 
    senderAddr: string, 
    recipientAddr: string, 
    metadata: any = null
  ): Promise<{ message: string, sender: string, recipient: string, contactName?: string } | null> {
    try {
      console.log('Attempting to decrypt message', { 
        encryptedLength: encryptedHex.length, 
        hasMetadata: !!metadata,
        contactCount: contacts.length 
      });
      
      // Try decrypting with each contact's public key
      for (const contact of contacts) {
        try {
          const contactPubKey = PublicKey.fromString(contact.publicKeyHex);
          let decrypted: string;
          
          if (metadata && (metadata.v === 'type42-v1' || metadata.v === '42v2')) {
            // Use Type-42 decryption
            console.log('Attempting Type-42 decryption with contact:', contact.name);
            decrypted = await type42.decryptMessage(contactPubKey, encryptedHex, metadata);
          } else {
            // Use standard ECDH decryption
            console.log('Attempting standard decryption with contact:', contact.name);
            decrypted = await type42.decryptStandardMessage(contactPubKey, encryptedHex);
          }
          
          console.log(`Successfully decrypted with contact: ${contact.name}`);
          
          return {
            message: decrypted,
            sender: isFromMe ? senderAddr : contact.name,
            recipient: isFromMe ? contact.name : senderAddr,
            contactName: contact.name
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

  // Clear caches to free memory
  clearCache() {
    this.messageCache.clear();
    this.txCache.clear();
    this.lastFetchTime.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      messageCacheSize: this.messageCache.size,
      txCacheSize: this.txCache.size,
      totalCachedMessages: Array.from(this.messageCache.values()).reduce((sum, msgs) => sum + msgs.length, 0)
    };
  }
}

// File Drop Zone Component for importing backups
interface FileDropZoneProps {
  onFileDropped: (fileContent: string, fileName: string) => void;
  acceptedFormats?: string;
  label: string;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({ onFileDropped, acceptedFormats = '.json', label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      alert('Please upload a JSON backup file');
      return;
    }

    try {
      const content = await file.text();
      onFileDropped(content, file.name);
    } catch (error) {
      alert('Error reading file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragging 
          ? 'border-purple-500 bg-purple-900 bg-opacity-20' 
          : 'border-gray-600 hover:border-gray-500'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="text-gray-400">
        <svg 
          className="mx-auto h-12 w-12 mb-3"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
          />
        </svg>
        <p className="mb-2">{label}</p>
        <p className="text-sm text-gray-500">
          Drag and drop your backup file here, or click to browse
        </p>
      </div>
    </div>
  );
};

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
  
  // Message encryption state
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [encryptedMessage, setEncryptedMessage] = useState<string>('');
  const [decryptedMessage, setDecryptedMessage] = useState<string>('');
  const [messageError, setMessageError] = useState<string>('');

  const [showDecrypted, setShowDecrypted] = useState<boolean>(false);
  const [selectedConversation, setSelectedConversation] = useState<string>('');
  const [newConversationMessage, setNewConversationMessage] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [selectedConversationContact, setSelectedConversationContact] = useState<SavedContact | null>(null);

  // New state for UTXO and blockchain features
  const [utxoManager, setUtxoManager] = useState<UTXOManager | null>(null);
  const [messageTransaction, setMessageTransaction] = useState<MessageTransaction | null>(null);
  const [messageReader, setMessageReader] = useState<BlockchainMessageReader | null>(null);
  const [onChainMessages, setOnChainMessages] = useState<OnChainMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [blockchainConversations, setBlockchainConversations] = useState<BlockchainConversation[]>([]);
  const [sentTransactions, setSentTransactions] = useState<string[]>([]);
  const [whatsOnChainApiKey, setWhatsOnChainApiKey] = useState<string>('');
  const [messageViewMode, setMessageViewMode] = useState<'all' | 'contact' | 'conversations'>('all');
  const [selectedMessageContact, setSelectedMessageContact] = useState<string>('');
  const [selectedConversationView, setSelectedConversationView] = useState<string | null>(null);
  const [useType42Encryption, setUseType42Encryption] = useState<boolean>(true);
  const [storageManager, setStorageManager] = useState<Type42StorageManager | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState<'type42' | 'transactions'>('type42');
  const [fetchLimit, setFetchLimit] = useState(50); // Default to recent 50, 0 means all

  // Initialize storage manager when address is available
  useEffect(() => {
    if (keyData.address) {
      const storage = new Type42StorageManager(keyData.address);
      setStorageManager(storage);
      
      // Clean up old data on init
      storage.cleanup(30); // Keep 30 days of data
    }
  }, [keyData.address]);

  // Initialize managers when private key is set
  useEffect(() => {
    if (keyData.privateKey && keyData.address && storageManager) {
      console.log('Initializing managers for address:', keyData.address);
      const manager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      setUtxoManager(manager);
      
      // Create enhanced Type42 encryption with storage manager
      const type42 = new Type42AdvancedEncryption(keyData.privateKey, network, storageManager);
      
      // Create message transaction with the enhanced Type42
      const msgTx = new MessageTransaction(keyData.privateKey, network, useType42Encryption);
      msgTx.type42Encryption = type42;
      
      setMessageTransaction(msgTx);
      setMessageReader(new BlockchainMessageReader(network, whatsOnChainApiKey));
    }
  }, [keyData.privateKey, keyData.address, network, whatsOnChainApiKey, useType42Encryption, storageManager]);

  // Fetch on-chain messages when wallet is initialized
  useEffect(() => {
    if (messageReader && keyData.privateKey && keyData.address) {
      fetchOnChainMessages().then(() => {
        // After fetching, check if we need to re-decrypt with Type-42
        if (storageManager && storageManager.getStats().messages > 0) {
          console.log('Type-42 metadata found, attempting re-decryption...');
          reDecryptMessagesWithType42Metadata();
        }
      });
    }
  }, [messageReader, keyData.privateKey, keyData.address]);

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
      const pubKey = PublicKey.fromString(newContactPubKey.trim());
      
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

  // Remove contact
  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  // Check balance for address
  const checkBalance = async (address: string) => {
    if (!address) return;
    
    setBalance(prev => ({ ...prev, loading: true, error: null }));
    
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

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  // Decrypt conversation message
  const decryptConversationMessage = (encryptedHex: string, contactPublicKey: string): string => {
    if (!keyData.privateKey) {
      return '[No private key]';
    }

    try {
      const contactPubKey = PublicKey.fromString(contactPublicKey);
      const sharedSecret = keyData.privateKey.deriveSharedSecret(contactPubKey);
      
      let sharedSecretArray;
      if (typeof sharedSecret.toArray === 'function') {
        sharedSecretArray = sharedSecret.toArray();
      } else if (typeof sharedSecret.toHex === 'function') {
        sharedSecretArray = Utils.toArray(sharedSecret.toHex(), 'hex');
      } else if (typeof sharedSecret.toString === 'function') {
        sharedSecretArray = Utils.toArray(sharedSecret.toString(), 'hex');
      } else {
        const hexString = sharedSecret.toString(16).padStart(64, '0');
        sharedSecretArray = Utils.toArray(hexString, 'hex');
      }
      
      const symmetricKey = new SymmetricKey(Hash.sha256(sharedSecretArray));
      
      try {
        const encryptedBytes = Utils.toArray(encryptedHex, 'hex');
        const decrypted = symmetricKey.decrypt(encryptedBytes, 'utf8');
        return decrypted;
      } catch (decryptError) {
        return '[Cannot decrypt - wrong key pair]';
      }
      
    } catch (err) {
      console.error('Decryption error:', err);
      return '[Decryption error]';
    }
  };

  // Organize messages into conversations
  const organizeMessagesIntoConversations = (messages: OnChainMessage[], myContacts: SavedContact[]) => {
    const conversationMap = new Map<string, BlockchainConversation>();
    
    messages.forEach(msg => {
      // Determine the other party in the conversation
      const otherParty = msg.isFromMe ? msg.recipient : msg.sender;
      
      // Find contact info
      const contact = myContacts.find(c => {
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
    
    // Sort messages within each conversation by timestamp
    conversationMap.forEach(conv => {
      conv.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
    
    return Array.from(conversationMap.values());
  };

  // Fetch on-chain messages
  const fetchOnChainMessages = async (limit?: number) => {
    if (!messageReader || !keyData.privateKey || !keyData.address) return;
    
    setLoadingMessages(true);
    try {
      // Use provided limit or the state limit
      const messageLimit = limit !== undefined ? limit : fetchLimit;
      const messages = await messageReader.fetchMessages(
        keyData.address,
        keyData.privateKey,
        contacts,
        messageLimit
      );
      setOnChainMessages(messages);
      
      // Organize into conversations
      const conversations = organizeMessagesIntoConversations(messages, contacts);
      setBlockchainConversations(conversations);
      
      // Auto-select first conversation if none selected
      if (!selectedConversation && conversations.length > 0) {
        setSelectedConversation(conversations[0].contactId);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Export transaction history
  const exportTransactionHistory = async () => {
    if (!messageReader || onChainMessages.length === 0) {
      alert('No messages to export');
      return;
    }

    try {
      const exportData = await messageReader.exportTransactionHistory(onChainMessages);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tx-history-${keyData.address.substring(0, 8)}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting transaction history: ' + error.message);
    }
  };

  // Import Type-42 backup
  const handleType42Import = async (fileContent: string, fileName: string) => {
    if (!storageManager) {
      alert('Storage manager not initialized');
      return;
    }

    try {
      const result = storageManager.importData(fileContent);
      
      if (result && result.success) {
        alert('Type-42 backup imported successfully. Re-decrypting messages...');
        setShowImportDialog(false);
        
        // Re-decrypt existing messages with the imported metadata
        await reDecryptMessagesWithType42Metadata();
      }
    } catch (error) {
      alert('Error importing Type-42 backup: ' + error.message);
    }
  };

  // Re-decrypt messages after Type-42 import
  const reDecryptMessagesWithType42Metadata = async () => {
    if (!keyData.privateKey || !storageManager || onChainMessages.length === 0) {
      // No messages loaded yet, fetch them first
      if (messageReader && keyData.privateKey && keyData.address) {
        await fetchOnChainMessages();
      }
      return;
    }

    console.log('Re-decrypting messages with Type-42 metadata...');
    setLoadingMessages(true);

    try {
      const type42 = new Type42AdvancedEncryption(keyData.privateKey, network, storageManager);
      const updatedMessages = [...onChainMessages];
      let decryptedCount = 0;

      for (let i = 0; i < updatedMessages.length; i++) {
        const msg = updatedMessages[i];
        
        // Skip if already decrypted
        if (!msg.message.startsWith('[Encrypted:')) {
          continue;
        }

        // Get metadata for this txid
        const metadata = storageManager.getMessageMetadata(msg.txid);
        
        if (metadata) {
          console.log(`Found Type-42 metadata for txid ${msg.txid}:`, metadata);
          
          // Try to decrypt with each contact
          for (const contact of contacts) {
            try {
              const contactPubKey = PublicKey.fromString(contact.publicKeyHex);
              const decrypted = await type42.decryptMessage(contactPubKey, msg.encrypted, metadata);
              
              // Update the message
              updatedMessages[i] = {
                ...msg,
                message: decrypted,
                contactName: contact.name,
                sender: msg.isFromMe ? msg.sender : contact.name,
                recipient: msg.isFromMe ? contact.name : msg.recipient,
                encryptionType: 'type42'
              };
              
              decryptedCount++;
              console.log(`Successfully decrypted message ${msg.txid} with contact ${contact.name}`);
              break;
            } catch (e) {
              // Try next contact
            }
          }
        }
      }

      // Update state with re-decrypted messages
      setOnChainMessages(updatedMessages);
      
      // Reorganize conversations
      const conversations = organizeMessagesIntoConversations(updatedMessages, contacts);
      setBlockchainConversations(conversations);
      
      console.log(`Re-decrypted ${decryptedCount} messages`);
      
      if (decryptedCount === 0) {
        alert('No messages were decrypted. Make sure you have the correct contacts added.');
      } else {
        alert(`Successfully decrypted ${decryptedCount} messages!`);
      }
    } catch (error) {
      console.error('Error re-decrypting messages:', error);
      alert('Error re-decrypting messages: ' + error.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch messages from stored TXIDs
  const fetchMessagesFromStoredTxids = async () => {
    if (!messageReader || !keyData.privateKey || !keyData.address || !storageManager) return;
    
    const storedTxids = storageManager.getAllStoredTxids();
    if (storedTxids.length === 0) {
      console.log('No stored TXIDs to fetch');
      return;
    }

    console.log(`Fetching ${storedTxids.length} messages from stored TXIDs...`);
    setLoadingMessages(true);

    try {
      const messages: OnChainMessage[] = [];
      const baseUrl = network === 'testnet' 
        ? 'https://api.whatsonchain.com/v1/bsv/test'
        : 'https://api.whatsonchain.com/v1/bsv/main';

      // Fetch each transaction
      for (const txid of storedTxids) {
        try {
          const response = await fetch(`${baseUrl}/tx/${txid}`, {
            headers: messageReader.getHeaders()
          });

          if (response.ok) {
            const txDetail = await response.json();
            const message = await messageReader.extractMessage(
              txDetail, 
              keyData.privateKey, 
              keyData.address, 
              contacts
            );
            
            if (message) {
              messages.push(message);
            }
          }
        } catch (e) {
          console.error(`Error fetching tx ${txid}:`, e);
        }
      }

      // Merge with existing messages
      const existingTxids = new Set(onChainMessages.map(m => m.txid));
      const newMessages = messages.filter(m => !existingTxids.has(m.txid));
      
      const allMessages = [...onChainMessages, ...newMessages];
      allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setOnChainMessages(allMessages);
      
      // Reorganize conversations
      const conversations = organizeMessagesIntoConversations(allMessages, contacts);
      setBlockchainConversations(conversations);
      
      console.log(`Fetched ${newMessages.length} new messages from stored TXIDs`);
    } catch (error) {
      console.error('Error fetching messages from TXIDs:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Update transaction import to trigger message fetching
  const handleTransactionImport = async (fileContent: string, fileName: string) => {
    if (!messageReader || !keyData.privateKey) {
      alert('Wallet not initialized');
      return;
    }

    try {
      const importedMessages = await messageReader.importTransactionHistory(
        fileContent,
        keyData.privateKey,
        contacts
      );
      
      // Store imported TXIDs in storage manager if available
      if (storageManager && importedMessages.length > 0) {
        for (const msg of importedMessages) {
          if (msg.messageId && msg.encryptionType === 'type42') {
            // Extract contact ID from message data
            const contactId = msg.isFromMe ? msg.recipient : msg.sender;
            // Store the txid with its invoice number
            const metadata = await messageReader.txCache.get(msg.txid);
            if (metadata) {
              storageManager.storeMessageMetadata(msg.txid, metadata);
            }
          }
        }
      }
      
      // Merge with existing messages
      const existingTxids = new Set(onChainMessages.map(m => m.txid));
      const newMessages = importedMessages.filter(m => !existingTxids.has(m.txid));
      
      const allMessages = [...onChainMessages, ...newMessages];
      allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setOnChainMessages(allMessages);
      
      // Reorganize conversations
      const conversations = organizeMessagesIntoConversations(allMessages, contacts);
      setBlockchainConversations(conversations);
      
      alert(`Imported ${newMessages.length} new messages from backup`);
      setShowImportDialog(false);
      
      // Try to re-decrypt with Type-42 if metadata is available
      if (storageManager) {
        await reDecryptMessagesWithType42Metadata();
      }
    } catch (error) {
      alert('Error importing transaction history: ' + error.message);
    }
  };

  // Send message to blockchain - REAL BROADCASTING
  const sendMessageToBlockchain = async () => {
    if (!keyData.privateKey || !newConversationMessage.trim()) {
      setTransactionStatus('Error: Missing private key or message');
      return;
    }

    const selectedContact = contacts.find(c => c.id === selectedConversation);
    if (!selectedContact) {
      setTransactionStatus('Error: Please select a contact');
      return;
    }

    try {
      setSendingMessage(true);
      setTransactionStatus('Preparing transaction...');

      // Get recipient's public key
      const recipientPubKey = PublicKey.fromString(selectedContact.publicKeyHex);
      console.log('=== TRANSACTION CREATION DEBUG ===');
      console.log('Selected contact:', selectedContact.name);
      console.log('Contact public key:', selectedContact.publicKeyHex);
      console.log('Message to send:', newConversationMessage);
      console.log('Sender private key:', keyData.privateKey.toHex().substring(0, 10) + '...');

      // Check if we have the necessary managers
      if (!utxoManager || !messageTransaction) {
        setTransactionStatus('Error: Wallet not properly initialized');
        return;
      }

      // Fetch UTXOs
      setTransactionStatus('Fetching UTXOs...');
      const utxos = await utxoManager.fetchUTXOs();
      console.log(`Fetched ${utxos.length} UTXOs`);
      
      if (utxos.length === 0) {
        // Try to get more info about why
        const balanceCheck = await fetch(
          `https://api.whatsonchain.com/v1/bsv/test/address/${keyData.address}/balance`
        );
        const balanceData = await balanceCheck.json();
        console.log('Balance check:', balanceData);
        
        setTransactionStatus(`Error: No UTXOs found. Balance: ${balanceData.confirmed} confirmed, ${balanceData.unconfirmed} unconfirmed`);
        return;
      }
      
      // Select UTXOs (need at least 1500 sats for fee + dust)
      const { selected, total } = utxoManager.selectUTXOs(1500);
      
      if (selected.length === 0 || total < 1500) {
        setTransactionStatus(`Error: Insufficient funds. Found ${total} satoshis but need at least 1500`);
        return;
      }

      setTransactionStatus('Creating transaction...');
      
      // Use the messageTransaction helper to create the tx
      const tx = await messageTransaction.createMessageTx(
        recipientPubKey,
        newConversationMessage,
        selected
      );

      setTransactionStatus('Broadcasting transaction...');
      
      // Broadcast the transaction
      const broadcaster = new SimpleTestnetBroadcaster();
      const result = await broadcaster.broadcast(tx);
      
      if (result.status === 'success' && result.txid) {
        setTransactionStatus(`Success! TXID: ${result.txid}`);
        console.log(`Transaction broadcasted! TXID: ${result.txid}`);
        console.log(`View on WhatsOnChain: https://whatsonchain.com/tx/${result.txid}`);
        
        // Store metadata after successful broadcast
        if (storageManager && useType42Encryption) {
          const contactId = selectedContact.publicKeyHex.substring(0, 8);
          
          // Extract metadata from the transaction
          const opReturnOutput = tx.outputs.find(out => out.satoshis === 0);
          if (opReturnOutput) {
            const asm = opReturnOutput.lockingScript.toASM();
            const parts = asm.split(' ');
            const dataIndex = parts.indexOf('OP_RETURN') + 1;
            
            if (dataIndex > 0 && dataIndex < parts.length) {
              let hexData = parts[dataIndex];
              if (parts[dataIndex] === 'OP_PUSHDATA1' && dataIndex + 2 < parts.length) {
                hexData = parts[dataIndex + 2];
              }
              
              // Parse metadata from the transaction
              if (hexData.startsWith('1933')) {
                const dataAfterPrefix = hexData.substring(4);
                const metadataLength = parseInt(dataAfterPrefix.substring(0, 4), 16);
                const metadataHex = dataAfterPrefix.substring(4, 4 + metadataLength * 2);
                const metadataBytes = Utils.toArray(metadataHex, 'hex');
                const metadataStr = Utils.toUTF8(metadataBytes);
                const metadata = JSON.parse(metadataStr);
                
                // Store the invoice number and metadata
                storageManager.storeInvoiceNumber(contactId, metadata.i, result.txid);
                storageManager.storeMessageMetadata(result.txid, metadata);
              }
            }
          }
        }
        
        // Store the transaction ID
        setSentTransactions(prev => [...prev, result.txid!]);
        
        // Clear message
        setNewConversationMessage('');
        
        // Refresh messages after a delay (to allow for propagation)
        setTimeout(() => {
          fetchOnChainMessages();
          checkBalance(keyData.address);
        }, 5000); // Increased delay to 5 seconds for better propagation
      } else {
        throw new Error(result.error || 'Broadcast failed');
      }
      
    } catch (error) {
      console.error('Transaction error:', error);
      setTransactionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Encrypt message using ECDH shared secret
  const encryptMessage = () => {
    if (!selectedContactId) {
      setMessageError('Please select a contact');
      return;
    }
    if (!messageText.trim()) {
      setMessageError('Please enter a message');
      return;
    }
    if (!keyData.privateKey) {
      setMessageError('Please generate or import a private key first');
      return;
    }

    try {
      const contact = contacts.find(c => c.id === selectedContactId);
      if (!contact) {
        setMessageError('Contact not found');
        return;
      }

      const contactPubKey = PublicKey.fromString(contact.publicKeyHex);
      console.log('Test encryption - Contact public key:', contact.publicKeyHex);
      console.log('Test encryption - Message:', messageText);
      
      const sharedSecret = keyData.privateKey.deriveSharedSecret(contactPubKey);
      console.log('Test encryption - Shared secret:', sharedSecret.toString());
      
      let sharedSecretArray;
      if (typeof sharedSecret.toArray === 'function') {
        sharedSecretArray = sharedSecret.toArray();
      } else if (typeof sharedSecret.toHex === 'function') {
        sharedSecretArray = Utils.toArray(sharedSecret.toHex(), 'hex');
      } else if (typeof sharedSecret.toString === 'function') {
        sharedSecretArray = Utils.toArray(sharedSecret.toString(), 'hex');
      } else {
        const hexString = sharedSecret.toString(16).padStart(64, '0');
        sharedSecretArray = Utils.toArray(hexString, 'hex');
      }
      
      const symmetricKey = new SymmetricKey(Hash.sha256(sharedSecretArray));
      const encrypted = symmetricKey.encrypt(messageText);
      const encryptedHex = Utils.toHex(encrypted);
      
      console.log('Test encryption - Encrypted hex:', encryptedHex);
      
      setEncryptedMessage(encryptedHex);
      setMessageError('');
      setDecryptedMessage('');
    } catch (err) {
      setMessageError('Encryption failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Encryption error:', err);
    }
  };

  // Decrypt message using ECDH shared secret
  const decryptMessage = (encryptedHex: string) => {
    if (!selectedContactId) {
      setMessageError('Please select a contact');
      return;
    }
    if (!keyData.privateKey) {
      setMessageError('Please generate or import a private key first');
      return;
    }

    try {
      const contact = contacts.find(c => c.id === selectedContactId);
      if (!contact) {
        setMessageError('Contact not found');
        return;
      }

      const contactPubKey = PublicKey.fromString(contact.publicKeyHex);
      const sharedSecret = keyData.privateKey.deriveSharedSecret(contactPubKey);
      
      let sharedSecretArray;
      if (typeof sharedSecret.toArray === 'function') {
        sharedSecretArray = sharedSecret.toArray();
      } else if (typeof sharedSecret.toHex === 'function') {
        sharedSecretArray = Utils.toArray(sharedSecret.toHex(), 'hex');
      } else if (typeof sharedSecret.toString === 'function') {
        sharedSecretArray = Utils.toArray(sharedSecret.toString(), 'hex');
      } else {
        const hexString = sharedSecret.toString(16).padStart(64, '0');
        sharedSecretArray = Utils.toArray(hexString, 'hex');
      }
      
      const symmetricKey = new SymmetricKey(Hash.sha256(sharedSecretArray));
      const encryptedBytes = Utils.toArray(encryptedHex, 'hex');
      const decrypted = symmetricKey.decrypt(encryptedBytes, 'utf8');
      
      setDecryptedMessage(decrypted);
      setMessageError('');
    } catch (err) {
      setMessageError('Decryption failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Decryption error:', err);
    }
  };

  // Load example contacts on component mount
  useEffect(() => {
    const loadedContacts: SavedContact[] = examplePublicKeys.map(example => ({
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

  // Update addresses and shared secrets when network or keys change
  useEffect(() => {
    if (keyData.publicKey) {
      const address = network === 'testnet'
        ? keyData.publicKey.toAddress('testnet').toString()
        : keyData.publicKey.toAddress('mainnet').toString();
      
      setKeyData(prev => ({ ...prev, address }));
      checkBalance(address);
    }
    
    if (keyData.privateKey) {
      updateContactSharedSecrets(keyData.privateKey);
    }
  }, [network, keyData.publicKey, keyData.privateKey]);

  // Get filtered messages based on view mode
  const getFilteredMessages = () => {
    if (messageViewMode === 'all') {
      return onChainMessages;
    } else if (messageViewMode === 'contact' && selectedMessageContact) {
      // Find the contact
      const contact = contacts.find(c => c.id === selectedMessageContact);
      if (!contact) return [];
      
      // Get contact's address
      const contactAddress = PublicKey.fromString(contact.publicKeyHex).toAddress(network).toString();
      
      // Filter messages for this contact
      return onChainMessages.filter(msg => 
        msg.sender === contactAddress || msg.recipient === contactAddress ||
        msg.sender === contact.name || msg.recipient === contact.name
      );
    } else if (messageViewMode === 'conversations') {
      // Show only latest message from each contact
      const latestMessages: { [key: string]: OnChainMessage } = {};
      
      onChainMessages.forEach(msg => {
        const otherParty = msg.isFromMe ? msg.recipient : msg.sender;
        if (!latestMessages[otherParty] || msg.timestamp > latestMessages[otherParty].timestamp) {
          latestMessages[otherParty] = msg;
        }
      });
      
      return Object.values(latestMessages);
    }
    return [];
  };

  // Get conversation messages for a specific contact
  const getConversationMessages = (contactAddress: string) => {
    return onChainMessages.filter(msg => 
      msg.sender === contactAddress || msg.recipient === contactAddress
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };
  
  // Load saved API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('whatsOnChainApiKey');
    if (savedApiKey) {
      setWhatsOnChainApiKey(savedApiKey);
    }
  }, []);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (whatsOnChainApiKey) {
      localStorage.setItem('whatsOnChainApiKey', whatsOnChainApiKey);
    }
  }, [whatsOnChainApiKey]);
  
  // Update selected conversation contact when conversation changes
  useEffect(() => {
    const contact = contacts.find(c => c.id === selectedConversation);
    setSelectedConversationContact(contact || null);
  }, [selectedConversation, contacts]);

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

        {/* Conversations View */}
        {viewMode === 'conversations' && (
          <div>
            <div className="mb-4 p-4 bg-cyan-900 bg-opacity-20 rounded-lg border border-cyan-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-white">Encrypted Conversations</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">Decrypt Messages</span>
                  <button
                    onClick={() => setShowDecrypted(!showDecrypted)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showDecrypted ? 'bg-cyan-500' : 'bg-gray-600'
                    } ${!keyData.privateKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!keyData.privateKey}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showDecrypted ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
              
              {/* Conversation Selector */}
              <div className="flex gap-2">
                <label className="text-sm text-gray-300">Select Contact:</label>
                <select
                  value={selectedConversation}
                  onChange={(e) => setSelectedConversation(e.target.value)}
                  className="flex-1 px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  disabled={!keyData.privateKey}
                >
                  <option value="">Choose a contact to message...</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {!keyData.privateKey && (
                <p className="mt-2 text-sm text-yellow-400">⚠️ Generate or import a private key to decrypt messages</p>
              )}
            </div>

            {/* On-Chain Messages Section */}
            {keyData.privateKey && (
              <div className="mb-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">On-Chain Messages</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={fetchLimit}
                      onChange={(e) => {
                        const newLimit = parseInt(e.target.value);
                        setFetchLimit(newLimit);
                        fetchOnChainMessages(newLimit);
                      }}
                      className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                      title="Message history limit"
                    >
                      <option value="50">Last 50 messages</option>
                      <option value="100">Last 100 messages</option>
                      <option value="500">Last 500 messages</option>
                      <option value="0">All messages</option>
                    </select>
                    <button
                      onClick={() => fetchOnChainMessages()}
                      disabled={loadingMessages}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm disabled:bg-gray-600"
                    >
                      {loadingMessages ? 'Loading...' : 'Refresh'}
                    </button>
                    <button
                      onClick={reDecryptMessagesWithType42Metadata}
                      disabled={loadingMessages || onChainMessages.length === 0}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm disabled:bg-gray-600"
                      title="Re-decrypt messages with Type-42 metadata"
                    >
                      Re-decrypt
                    </button>
                    <button
                      onClick={() => {
                        const apiKey = prompt('Enter WhatsOnChain API Key:', whatsOnChainApiKey);
                        if (apiKey !== null) {
                          setWhatsOnChainApiKey(apiKey);
                        }
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                      title="Set API Key for higher rate limits"
                    >
                      API Key
                    </button>
                  </div>
                </div>
                
                {whatsOnChainApiKey && (
                  <p className="text-xs text-green-400 mb-2">✓ Using API key for enhanced rate limits</p>
                )}

                {/* View Mode Selector */}
                <div className="mb-3 flex items-center gap-2">
                  <label className="text-sm text-gray-300">View:</label>
                  <select
                    value={messageViewMode}
                    onChange={(e) => {
                      setMessageViewMode(e.target.value as any);
                      setSelectedConversationView(null);
                    }}
                    className="flex-1 px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="all">View All Messages</option>
                    <option value="contact">Filter by Contact</option>
                    <option value="conversations">Conversation List</option>
                  </select>
                  
                  {messageViewMode === 'contact' && (
                    <select
                      value={selectedMessageContact}
                      onChange={(e) => setSelectedMessageContact(e.target.value)}
                      className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Select contact...</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                {/* Messages Display */}
                {selectedConversationView ? (
                  // Conversation View
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setSelectedConversationView(null)}
                        className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                      >
                        ← Back to list
                      </button>
                      <span className="text-sm text-gray-400">
                        Conversation with {selectedConversationView}
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto bg-gray-800 rounded p-3">
                      {getConversationMessages(selectedConversationView).map((msg) => (
                        <div
                          key={msg.txid}
                          className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs ${msg.isFromMe ? 'order-2' : 'order-1'}`}>
                            <div className={`px-3 py-2 rounded-lg ${
                              msg.isFromMe 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-600 text-white'
                            }`}>
                              <p className="text-sm">
                                {msg.message.startsWith('[Encrypted:') ? (
                                  <span className="text-yellow-300">{msg.message}</span>
                                ) : (
                                  <span>{msg.message}</span>
                                )}
                              </p>
                              {msg.encryptionType === 'type42' && (
                                <p className="text-xs text-purple-300 mt-1">
                                  🔐 Type-42 Encrypted
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between px-1 mt-1">
                              <p className="text-xs text-gray-400">
                                {msg.timestamp.toLocaleTimeString()}
                              </p>
                              <a 
                                href={`https://whatsonchain.com/tx/${msg.txid}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-cyan-400 hover:text-cyan-300"
                              >
                                TX
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // List View
                  <div>
                    {getFilteredMessages().length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {getFilteredMessages().map((msg) => (
                          <div 
                            key={msg.txid} 
                            className={`p-2 rounded cursor-pointer hover:bg-opacity-50 ${
                              msg.isFromMe ? 'bg-blue-900 bg-opacity-30' : 'bg-gray-800'
                            } ${messageViewMode === 'conversations' ? 'hover:bg-gray-700' : ''}`}
                            onClick={() => {
                              if (messageViewMode === 'conversations') {
                                const otherParty = msg.isFromMe ? msg.recipient : msg.sender;
                                setSelectedConversationView(otherParty);
                              }
                            }}
                          >
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>
                                {msg.isFromMe ? 'To: ' + msg.recipient : 'From: ' + msg.sender}
                              </span>
                              <span>{msg.timestamp.toLocaleString()}</span>
                            </div>
                            <p className="text-sm mt-1">
                              {msg.message.startsWith('[Encrypted:') ? (
                                <span className="text-yellow-400">{msg.message}</span>
                              ) : (
                                <span>{msg.message}</span>
                              )}
                            </p>
                            {msg.encryptionType === 'type42' && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-purple-400">🔐 Type-42</span>
                                {msg.messageId && (
                                  <span className="text-xs text-gray-500">ID: {msg.messageId.substring(0, 8)}...</span>
                                )}
                              </div>
                            )}
                            {messageViewMode === 'conversations' && (
                              <p className="text-xs text-cyan-400 mt-1">
                                Click to view conversation →
                              </p>
                            )}
                            {msg.message.startsWith('[Encrypted:') && messageViewMode !== 'conversations' && (
                              <details className="mt-1">
                                <summary className="text-xs text-gray-400 cursor-pointer">View full encrypted data</summary>
                                <p className="text-xs font-mono text-gray-500 break-all mt-1">
                                  {msg.encrypted}
                                </p>
                              </details>
                            )}
                            {messageViewMode !== 'conversations' && (
                              <a 
                                href={`https://whatsonchain.com/tx/${msg.txid}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-cyan-400 hover:text-cyan-300 inline-block mt-1"
                              >
                                View TX
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">
                        <p>
                          {messageViewMode === 'contact' && !selectedMessageContact
                            ? 'Please select a contact to view messages'
                            : 'No messages found'}
                        </p>
                        {sentTransactions.length > 0 && messageViewMode === 'all' && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Recent sent transactions:</p>
                            {sentTransactions.slice(-3).map(txid => (
                              <a 
                                key={txid}
                                href={`https://whatsonchain.com/tx/${txid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-cyan-400 hover:text-cyan-300"
                              >
                                {txid.substring(0, 16)}...
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Send Message Section */}
            <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
              <h3 className="text-lg font-semibold mb-3 text-white">Send Encrypted Message</h3>
              
              <div className="space-y-3">
                <textarea
                  value={newConversationMessage}
                  onChange={(e) => setNewConversationMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  disabled={!keyData.privateKey || sendingMessage}
                />
                
                <div className="flex items-center justify-between">
                  <button
                    onClick={sendMessageToBlockchain}
                    disabled={!keyData.privateKey || !newConversationMessage.trim() || sendingMessage}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {sendingMessage ? 'Sending...' : 'Send to Blockchain'}
                  </button>
                  
                  {transactionStatus && (
                    <p className={`text-sm ${
                      transactionStatus.includes('Error') ? 'text-red-400' : 
                      transactionStatus.includes('Demo') ? 'text-yellow-400' : 
                      'text-green-400'
                    }`}>
                      {transactionStatus}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    <span className="font-medium text-cyan-400">How it works:</span> Your message will be encrypted using 
                    {useType42Encryption ? ' Type-42 Advanced encryption with forward secrecy' : ' standard ECDH'} 
                    with {selectedConversationContact?.name || 'the selected contact'}'s public key.
                  </p>
                  <button
                    onClick={() => setUseType42Encryption(!useType42Encryption)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      useType42Encryption 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-gray-600 hover:bg-gray-500 text-white'
                    }`}
                  >
                    {useType42Encryption ? 'Type-42 ✓' : 'Standard'}
                  </button>
                </div>
                {useType42Encryption && (
                  <div className="text-xs text-purple-400 mt-1">
                    <p>🔐 Type-42 Advanced Features:</p>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• BRC-42 compliant invoice numbers</li>
                      <li>• Hierarchical key derivation (3 layers)</li>
                      <li>• Message integrity verification (SHA256)</li>
                      <li>• Persistent metadata storage</li>
                    </ul>
                  </div>
                )}
                {network === 'testnet' && (
                  <p className="text-xs text-green-400 mt-2">
                    ✓ Testnet Mode: Real transactions will be broadcast to the BSV testnet.
                  </p>
                )}
                {balance.confirmed < 2000 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ Low Balance: You need at least 2000 satoshis to send a message. Current: {balance.confirmed} sats
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messages View */}
        {viewMode === 'messages' && (
          <div>
            <div className="mb-6 p-4 bg-orange-900 bg-opacity-20 rounded-lg border border-orange-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Encrypt Message</h2>
              
              {!keyData.privateKey && (
                <div className="mb-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded">
                  <p className="text-yellow-400 text-sm">⚠️ Please generate or import a private key first to encrypt messages.</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">Select Contact:</label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={!keyData.privateKey}
                  >
                    <option value="">Choose a contact...</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} {contact.sharedSecret ? '✓' : '(No shared secret)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">Message to Encrypt:</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Enter your secret message..."
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={!keyData.privateKey}
                  />
                </div>

                <button
                  onClick={encryptMessage}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  disabled={!keyData.privateKey || !messageText.trim() || !selectedContactId}
                >
                  Encrypt Message
                </button>

                {messageError && (
                  <p className="text-red-400 text-sm">{messageError}</p>
                )}
              </div>
            </div>

            {encryptedMessage && (
              <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold mb-2 text-white">Encrypted Message</h3>
                <div className="flex items-start gap-2">
                  <code className="flex-1 p-3 bg-gray-800 rounded border border-gray-600 text-xs break-all text-orange-300">
                    {encryptedMessage}
                  </code>
                  <button
                    onClick={() => copyToClipboard(encryptedMessage, 'Encrypted Message')}
                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
                    title="Copy encrypted message"
                  >
                    📋
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  This message can only be decrypted by you and {contacts.find(c => c.id === selectedContactId)?.name}
                </p>
              </div>
            )}

            <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
              <h3 className="text-lg font-semibold mb-3 text-white">Decrypt Message</h3>
              <div className="space-y-3">
                <textarea
                  placeholder="Paste encrypted message here..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  onChange={(e) => {
                    if (e.target.value.trim()) {
                      decryptMessage(e.target.value.trim());
                    } else {
                      setDecryptedMessage('');
                    }
                  }}
                  disabled={!keyData.privateKey || !selectedContactId}
                />
                
                {decryptedMessage && (
                  <div className="p-3 bg-green-900 bg-opacity-20 border border-green-700 rounded">
                    <p className="text-sm font-medium text-green-400 mb-1">Decrypted Message:</p>
                    <p className="text-white">{decryptedMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                
                {/* Type-42 Storage Statistics */}
                {storageManager && (
                  <div className="mb-6 p-4 bg-purple-900 bg-opacity-20 rounded-lg border border-purple-700">
                    <h2 className="text-xl font-semibold mb-4 text-white">Type-42 Storage</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-300">Total Invoice Numbers:</span>
                        <span className="ml-2 text-white font-medium">{storageManager.getStats().totalInvoices}</span>
                      </div>
                      <div>
                        <span className="text-gray-300">Stored Messages:</span>
                        <span className="ml-2 text-white font-medium">{storageManager.getStats().messages}</span>
                      </div>
                      <div>
                        <span className="text-gray-300">Storage Size:</span>
                        <span className="ml-2 text-white font-medium">{(storageManager.getStats().storageSize / 1024).toFixed(2)} KB</span>
                      </div>
                      <div>
                        <span className="text-gray-300">Cache Size:</span>
                        <span className="ml-2 text-white font-medium">
                          {messageReader ? messageReader.getCacheStats().messageCacheSize : 0} messages
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          if (storageManager) {
                            const data = storageManager.exportData();
                            const blob = new Blob([data], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `type42-backup-${Date.now()}.json`;
                            a.click();
                          }
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                      >
                        Export Type-42
                      </button>
                      <button
                        onClick={exportTransactionHistory}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        disabled={onChainMessages.length === 0}
                      >
                        Export TX History
                      </button>
                      <button
                        onClick={() => setShowImportDialog(true)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                      >
                        Import Backup
                      </button>
                      <button
                        onClick={() => {
                          if (storageManager) {
                            storageManager.cleanup(30);
                            alert('Old data cleaned up');
                          }
                        }}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                      >
                        Clean Old Data
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
        </div>

        {/* Import Dialog Modal */}
        {showImportDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full border border-gray-700">
              <h2 className="text-2xl font-semibold text-white mb-4">Import Backup</h2>
              
              {/* Import Type Selector */}
              <div className="mb-4">
                <label className="text-sm text-gray-300 mb-2 block">Select backup type:</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="type42"
                      checked={importType === 'type42'}
                      onChange={(e) => setImportType('type42')}
                      className="mr-2"
                    />
                    <span className="text-white">Type-42 Storage Backup</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="transactions"
                      checked={importType === 'transactions'}
                      onChange={(e) => setImportType('transactions')}
                      className="mr-2"
                    />
                    <span className="text-white">Transaction History Backup</span>
                  </label>
                </div>
              </div>

              {/* File Drop Zone */}
              <FileDropZone
                onFileDropped={
                  importType === 'type42' 
                    ? handleType42Import 
                    : handleTransactionImport
                }
                label={
                  importType === 'type42'
                    ? "Drop Type-42 backup file here"
                    : "Drop transaction history backup file here"
                }
              />

              {/* Import Notes */}
              <div className="mt-4 p-3 bg-gray-700 rounded text-sm text-gray-300">
                {importType === 'type42' ? (
                  <>
                    <p className="font-semibold text-purple-400 mb-1">Type-42 Backup includes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Invoice numbers and counters</li>
                      <li>Message metadata</li>
                      <li>Conversation keys</li>
                      <li>Conversation states</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-blue-400 mb-1">Transaction History includes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>All message transactions</li>
                      <li>Block information and confirmations</li>
                      <li>Encrypted message data</li>
                      <li>Sender/recipient information</li>
                    </ul>
                    <p className="mt-2 text-yellow-400">Note: Messages will be re-decrypted using your current contacts.</p>
                  </>
                )}
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;

























































// import React, { useState, useEffect } from 'react';
// import { PrivateKey, PublicKey, Utils, Hash } from '@bsv/sdk';
// import { Copy, Key, Users, MessageCircle, RefreshCw, Download, Upload, Eye, EyeOff } from 'lucide-react';

// type Network = 'mainnet' | 'testnet';

// interface KeyData {
//   privateKey: PrivateKey | null;
//   publicKey: PublicKey | null;
//   privateKeyHex: string;
//   privateKeyWif: string;
//   privateKeyBinary: number[];
//   publicKeyHex: string;
//   publicKeyDER: string;
//   address: string;
// }

// interface Contact {
//   id: string;
//   name: string;
//   publicKeyHex: string;
//   publicKey: PublicKey;
//   sharedSecret?: string;
//   addedAt: Date;
// }

// const Wallet: React.FC = () => {
//   const [network, setNetwork] = useState<Network>('mainnet');
//   const [keyData, setKeyData] = useState<KeyData | null>(null);
//   const [showPrivateKey, setShowPrivateKey] = useState(false);
//   const [importKeyValue, setImportKeyValue] = useState('');
//   const [importKeyType, setImportKeyType] = useState<'hex' | 'wif'>('wif');
//   const [contacts, setContacts] = useState<Contact[]>([]);
//   const [newContactName, setNewContactName] = useState('');
//   const [newContactPubKey, setNewContactPubKey] = useState('');
//   const [activeTab, setActiveTab] = useState<'wallet' | 'contacts'>('wallet');
//   const [error, setError] = useState('');

//   // Load saved data from localStorage
//   useEffect(() => {
//     const savedNetwork = localStorage.getItem('bsv-wallet-network') as Network;
//     if (savedNetwork) setNetwork(savedNetwork);

//     const savedPrivateKey = localStorage.getItem('bsv-wallet-privkey');
//     if (savedPrivateKey) {
//       try {
//         const privKey = PrivateKey.fromWif(savedPrivateKey);
//         generateKeyData(privKey);
//       } catch (e) {
//         console.error('Failed to load saved private key:', e);
//       }
//     }

//     const savedContacts = localStorage.getItem('bsv-wallet-contacts');
//     if (savedContacts) {
//       const parsedContacts = JSON.parse(savedContacts);
//       const hydratedContacts = parsedContacts.map((c: any) => ({
//         ...c,
//         publicKey: PublicKey.fromString(c.publicKeyHex),
//         addedAt: new Date(c.addedAt)
//       }));
//       setContacts(hydratedContacts);
//     }
//   }, []);

//   // Save network preference
//   useEffect(() => {
//     localStorage.setItem('bsv-wallet-network', network);
//   }, [network]);

//   // Save contacts
//   useEffect(() => {
//     const contactsToSave = contacts.map(({ publicKey, sharedSecret, ...rest }) => rest);
//     localStorage.setItem('bsv-wallet-contacts', JSON.stringify(contactsToSave));
//   }, [contacts]);

//   const generateKeyData = (privKey: PrivateKey) => {
//     const pubKey = privKey.toPublicKey();
//     const addressNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';
    
//     const data: KeyData = {
//       privateKey: privKey,
//       publicKey: pubKey,
//       privateKeyHex: privKey.toHex(),
//       privateKeyWif: privKey.toWif(),
//       privateKeyBinary: privKey.toArray(),
//       publicKeyHex: pubKey.toString(),
//       publicKeyDER: Utils.toHex(pubKey.toDER()),
//       address: pubKey.toAddress(addressNetwork).toString()
//     };

//     setKeyData(data);
//     localStorage.setItem('bsv-wallet-privkey', data.privateKeyWif);
    
//     // Update shared secrets for existing contacts
//     if (contacts.length > 0) {
//       updateSharedSecrets(privKey);
//     }
//   };

//   const updateSharedSecrets = (privKey: PrivateKey) => {
//     setContacts(prevContacts => 
//       prevContacts.map(contact => ({
//         ...contact,
//         sharedSecret: privKey.deriveSharedSecret(contact.publicKey).toString()
//       }))
//     );
//   };

//   const generateNewKey = () => {
//     setError('');
//     const privKey = PrivateKey.fromRandom();
//     generateKeyData(privKey);
//   };

//   const importKey = () => {
//     setError('');
//     try {
//       let privKey: PrivateKey;
//       if (importKeyType === 'hex') {
//         privKey = PrivateKey.fromHex(importKeyValue.trim());
//       } else {
//         privKey = PrivateKey.fromWif(importKeyValue.trim());
//       }
//       generateKeyData(privKey);
//       setImportKeyValue('');
//     } catch (e) {
//       setError(`Failed to import key: ${e.message}`);
//     }
//   };

//   const addContact = () => {
//     setError('');
//     try {
//       const pubKey = PublicKey.fromString(newContactPubKey.trim());
//       const newContact: Contact = {
//         id: Date.now().toString(),
//         name: newContactName.trim(),
//         publicKeyHex: pubKey.toString(),
//         publicKey: pubKey,
//         sharedSecret: keyData?.privateKey ? 
//           keyData.privateKey.deriveSharedSecret(pubKey).toString() : undefined,
//         addedAt: new Date()
//       };
      
//       setContacts([...contacts, newContact]);
//       setNewContactName('');
//       setNewContactPubKey('');
//     } catch (e) {
//       setError(`Failed to add contact: ${e.message}`);
//     }
//   };

//   const removeContact = (id: string) => {
//     setContacts(contacts.filter(c => c.id !== id));
//   };

//   const copyToClipboard = async (text: string, label: string) => {
//     try {
//       await navigator.clipboard.writeText(text);
//       // Could add a toast notification here
//     } catch (e) {
//       console.error('Failed to copy:', e);
//     }
//   };

//   const exportWallet = () => {
//     if (!keyData) return;
    
//     const walletData = {
//       network,
//       privateKeyWif: keyData.privateKeyWif,
//       publicKeyHex: keyData.publicKeyHex,
//       address: keyData.address,
//       contacts: contacts.map(({ publicKey, ...rest }) => rest)
//     };
    
//     const blob = new Blob([JSON.stringify(walletData, null, 2)], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `bsv-wallet-${network}-${Date.now()}.json`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <div className="container mx-auto p-4 max-w-4xl">
//       <div className="bg-white rounded-lg shadow-lg p-6">
//         <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">BSV Wallet</h1>
        
//         {/* Network Selector */}
//         <div className="flex justify-center mb-6">
//           <div className="bg-gray-100 rounded-lg p-1 flex">
//             <button
//               className={`px-4 py-2 rounded ${network === 'mainnet' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
//               onClick={() => setNetwork('mainnet')}
//             >
//               Mainnet
//             </button>
//             <button
//               className={`px-4 py-2 rounded ${network === 'testnet' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
//               onClick={() => setNetwork('testnet')}
//             >
//               Testnet
//             </button>
//           </div>
//         </div>

//         {/* Tab Navigation */}
//         <div className="flex border-b mb-6">
//           <button
//             className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 ${
//               activeTab === 'wallet' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'
//             }`}
//             onClick={() => setActiveTab('wallet')}
//           >
//             <Key size={20} />
//             Wallet
//           </button>
//           <button
//             className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 ${
//               activeTab === 'contacts' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'
//             }`}
//             onClick={() => setActiveTab('contacts')}
//           >
//             <Users size={20} />
//             Contacts
//           </button>
//         </div>

//         {/* Error Display */}
//         {error && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//             {error}
//           </div>
//         )}

//         {/* Wallet Tab */}
//         {activeTab === 'wallet' && (
//           <div className="space-y-6">
//             {!keyData ? (
//               <div className="space-y-4">
//                 <div className="text-center">
//                   <button
//                     onClick={generateNewKey}
//                     className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
//                   >
//                     <RefreshCw size={20} />
//                     Generate New Key
//                   </button>
//                 </div>
                
//                 <div className="border-t pt-4">
//                   <h3 className="text-lg font-semibold mb-2">Import Existing Key</h3>
//                   <div className="flex gap-2 mb-2">
//                     <select
//                       value={importKeyType}
//                       onChange={(e) => setImportKeyType(e.target.value as 'hex' | 'wif')}
//                       className="border rounded px-3 py-2"
//                     >
//                       <option value="wif">WIF</option>
//                       <option value="hex">Hex</option>
//                     </select>
//                     <input
//                       type="text"
//                       value={importKeyValue}
//                       onChange={(e) => setImportKeyValue(e.target.value)}
//                       placeholder={`Enter private key (${importKeyType.toUpperCase()})`}
//                       className="flex-1 border rounded px-3 py-2"
//                     />
//                     <button
//                       onClick={importKey}
//                       className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
//                     >
//                       <Upload size={20} />
//                       Import
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <div className="space-y-4">
//                 {/* Address */}
//                 <div className="bg-gray-50 p-4 rounded-lg">
//                   <div className="flex justify-between items-center mb-2">
//                     <h3 className="font-semibold text-gray-700">Address ({network})</h3>
//                     <button
//                       onClick={() => copyToClipboard(keyData.address, 'Address')}
//                       className="text-blue-500 hover:text-blue-600"
//                     >
//                       <Copy size={16} />
//                     </button>
//                   </div>
//                   <p className="font-mono text-sm break-all">{keyData.address}</p>
//                 </div>

//                 {/* Public Key */}
//                 <div className="bg-gray-50 p-4 rounded-lg">
//                   <div className="flex justify-between items-center mb-2">
//                     <h3 className="font-semibold text-gray-700">Public Key (Hex)</h3>
//                     <button
//                       onClick={() => copyToClipboard(keyData.publicKeyHex, 'Public Key')}
//                       className="text-blue-500 hover:text-blue-600"
//                     >
//                       <Copy size={16} />
//                     </button>
//                   </div>
//                   <p className="font-mono text-sm break-all">{keyData.publicKeyHex}</p>
//                 </div>

//                 {/* Private Key */}
//                 <div className="bg-red-50 p-4 rounded-lg">
//                   <div className="flex justify-between items-center mb-2">
//                     <h3 className="font-semibold text-red-700">Private Key (WIF)</h3>
//                     <div className="flex gap-2">
//                       <button
//                         onClick={() => setShowPrivateKey(!showPrivateKey)}
//                         className="text-red-500 hover:text-red-600"
//                       >
//                         {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
//                       </button>
//                       <button
//                         onClick={() => copyToClipboard(keyData.privateKeyWif, 'Private Key')}
//                         className="text-red-500 hover:text-red-600"
//                       >
//                         <Copy size={16} />
//                       </button>
//                     </div>
//                   </div>
//                   <p className="font-mono text-sm break-all">
//                     {showPrivateKey ? keyData.privateKeyWif : '•'.repeat(52)}
//                   </p>
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="flex gap-2 justify-center">
//                   <button
//                     onClick={exportWallet}
//                     className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center gap-2"
//                   >
//                     <Download size={20} />
//                     Export Wallet
//                   </button>
//                   <button
//                     onClick={() => {
//                       if (confirm('Are you sure you want to generate a new key? This will replace your current key.')) {
//                         generateNewKey();
//                       }
//                     }}
//                     className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
//                   >
//                     <RefreshCw size={20} />
//                     New Key
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Contacts Tab */}
//         {activeTab === 'contacts' && (
//           <div className="space-y-6">
//             {keyData ? (
//               <>
//                 {/* Add Contact Form */}
//                 <div className="border p-4 rounded-lg">
//                   <h3 className="font-semibold mb-2">Add New Contact</h3>
//                   <div className="space-y-2">
//                     <input
//                       type="text"
//                       value={newContactName}
//                       onChange={(e) => setNewContactName(e.target.value)}
//                       placeholder="Contact Name"
//                       className="w-full border rounded px-3 py-2"
//                     />
//                     <input
//                       type="text"
//                       value={newContactPubKey}
//                       onChange={(e) => setNewContactPubKey(e.target.value)}
//                       placeholder="Public Key (Hex)"
//                       className="w-full border rounded px-3 py-2"
//                     />
//                     <button
//                       onClick={addContact}
//                       disabled={!newContactName || !newContactPubKey}
//                       className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center gap-2"
//                     >
//                       <Users size={20} />
//                       Add Contact
//                     </button>
//                   </div>
//                 </div>

//                 {/* Contacts List */}
//                 <div className="space-y-2">
//                   {contacts.length === 0 ? (
//                     <p className="text-gray-500 text-center py-4">No contacts yet</p>
//                   ) : (
//                     contacts.map(contact => (
//                       <div key={contact.id} className="border rounded-lg p-4">
//                         <div className="flex justify-between items-start mb-2">
//                           <h4 className="font-semibold text-lg">{contact.name}</h4>
//                           <button
//                             onClick={() => removeContact(contact.id)}
//                             className="text-red-500 hover:text-red-600"
//                           >
//                             ×
//                           </button>
//                         </div>
                        
//                         <div className="space-y-2 text-sm">
//                           <div>
//                             <span className="text-gray-600">Public Key: </span>
//                             <span className="font-mono break-all">{contact.publicKeyHex}</span>
//                           </div>
                          
//                           {contact.sharedSecret && (
//                             <div className="bg-yellow-50 p-2 rounded">
//                               <div className="flex items-center gap-2 mb-1">
//                                 <MessageCircle size={16} className="text-yellow-600" />
//                                 <span className="text-gray-700 font-semibold">ECDH Shared Secret</span>
//                               </div>
//                               <div className="flex items-center gap-2">
//                                 <span className="font-mono text-xs break-all flex-1">
//                                   {contact.sharedSecret.substring(0, 32)}...
//                                 </span>
//                                 <button
//                                   onClick={() => copyToClipboard(contact.sharedSecret!, 'Shared Secret')}
//                                   className="text-blue-500 hover:text-blue-600"
//                                 >
//                                   <Copy size={14} />
//                                 </button>
//                               </div>
//                               <p className="text-xs text-gray-600 mt-1">
//                                 Use this secret for encrypted messaging with {contact.name}
//                               </p>
//                             </div>
//                           )}
                          
//                           <div className="text-xs text-gray-500">
//                             Added: {contact.addedAt.toLocaleString()}
//                           </div>
//                         </div>
//                       </div>
//                     ))
//                   )}
//                 </div>
//               </>
//             ) : (
//               <div className="text-center py-8 text-gray-500">
//                 <Key size={48} className="mx-auto mb-4 text-gray-300" />
//                 <p>Please generate or import a key first</p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Wallet;

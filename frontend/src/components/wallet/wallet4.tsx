    // No. me =  xpub 03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416 /  
    // xpri / 6811543cdaae96cc602c2ed5efe517bf86cecdb0abbe678eb957b86bf8d3ff13
    // muCRZXdunSqaKv5REC37Ahf6ZUAK2yqKes
    // Working3.tsx file is development of conversations ID's 
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////  balance
// key api   allConversations currentConv SimpleTestnetBroadcaster send to Blockchain

//  this code is proir to the introduction of Thewallet;section4updates  "Standard"

import React, { useState, useEffect } from 'react';
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
  // messageId?: string; // For Type-42
  // encryptionType?: 'standard' | 'type42';
    encryptionType?: 'standard' ;
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

// Message Transaction Creator Class - Updated for Type-42
class MessageTransaction {
  privateKey: PrivateKey;
  network: Network;
  feePerKb: number;
  // useType42: boolean;
  // type42Encryption: Type42AdvancedEncryption | null;

  constructor(privateKey: PrivateKey, network: Network = 'mainnet', ) {
    this.privateKey = privateKey;
    this.network = network;
    this.feePerKb = 50;
    // this.useType42 = useType42;
    // this.type42Encryption = useType42 ? new Type42AdvancedEncryption(privateKey, network) : null;
  }

  async createMessageTx(recipientPubKey: PublicKey, message: string, utxos: UTXO[]) {
    const tx = new Transaction();
    
    let encryptedHex: string;
    let messageMetadata: any = {};
    
    // 
     {
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
    
    console.log('Encrypted message hex:', encryptedHex);
    
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

  createOpReturnScript(data: string, metadata: any = {}): Script {
    const prefix = '1933'; // Protocol identifier
    let fullData = prefix;
    
    // If using Type-42, include metadata
    if (metadata.version === 'type42-v1') {
      // Encode metadata as hex
      const metadataStr = JSON.stringify({
        v: metadata.version,
        d: metadata.dailyKeyId,
        m: metadata.messageKeyId,
        t: metadata.timestamp
      });
      const metadataHex = Utils.toHex(Utils.toArray(metadataStr, 'utf8'));
      
      // Format: prefix + metadataLength + metadata + encryptedData
      const metadataLength = (metadataHex.length / 2).toString(16).padStart(4, '0');
      fullData += metadataLength + metadataHex + data;
    } else {
      // Standard format: prefix + encryptedData
      fullData += data;
    }
    
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








// class Type42AdvancedEncryption {
//   masterKey: PrivateKey;
//   network: Network;

//   constructor(masterPrivateKey: PrivateKey, network: Network = 'mainnet') {
//     this.masterKey = masterPrivateKey;
//     this.network = network;
//   }

//   // Generate deterministic daily key
//   getDailyKeyId(): string {
//     const today = new Date();
//     return `daily-${today.getUTCFullYear()}-${today.getUTCMonth() + 1}-${today.getUTCDate()}`;
//   }

//   // Generate unique message ID
//   generateMessageId(): string {
//     const timestamp = Date.now();
//     const random = Math.random().toString(36).substring(2, 15);
//     return `msg-${timestamp}-${random}`;
//   }

//   // Encrypt message with Type-42 Advanced (multi-layer)
//   async encryptMessage(recipientMasterPubKey: PublicKey, message: string): Promise<{ encrypted: string, metadata: any }> {
//     try {
//       // Layer 1: Daily conversation key
//       const dailyKeyId = this.getDailyKeyId();
//       const dailyKey = this.masterKey.deriveChild(recipientMasterPubKey, dailyKeyId);
      
//       // Layer 2: Message-specific key
//       const messageKeyId = this.generateMessageId();
//       const messageKey = dailyKey.deriveChild(recipientMasterPubKey, messageKeyId);
      
//       // Layer 3: Use SDK's EncryptedMessage for additional security
//       const messageBytes = Utils.toArray(message, 'utf8');
//       const encrypted = EncryptedMessage.encrypt(
//         messageBytes,
//         messageKey,
//         recipientMasterPubKey
//       );
      
//       return {
//         encrypted: Utils.toHex(encrypted),
//         metadata: {
//           dailyKeyId,
//           messageKeyId,
//           timestamp: Date.now(),
//           version: 'type42-v1'
//         }
//       };
//     } catch (error) {
//       console.error('Type-42 encryption error:', error);
//       throw error;
//     }
//   }

//   // Decrypt message with Type-42 Advanced
//   async decryptMessage(senderMasterPubKey: PublicKey, encryptedHex: string, metadata: any): Promise<string> {
//     try {
//       // Recreate the same key derivation path
//       const dailyKey = this.masterKey.deriveChild(senderMasterPubKey, metadata.dailyKeyId);
//       const messageKey = dailyKey.deriveChild(senderMasterPubKey, metadata.messageKeyId);
      
//       // Decrypt using the SDK
//       const encryptedBytes = Utils.toArray(encryptedHex, 'hex');
//       const decrypted = EncryptedMessage.decrypt(encryptedBytes, messageKey);
      
//       return Utils.toUTF8(decrypted);
//     } catch (error) {
//       console.error('Type-42 decryption error:', error);
//       throw error;
//     }
//   }

//   // Fallback to standard ECDH for backward compatibility
//   async decryptStandardMessage(senderPubKey: PublicKey, encryptedHex: string): Promise<string> {
//     try {
//       const sharedSecret = this.masterKey.deriveSharedSecret(senderPubKey);
//       let sharedSecretArray;
      
//       if (typeof sharedSecret.toArray === 'function') {
//         sharedSecretArray = sharedSecret.toArray();
//       } else if (typeof sharedSecret.toHex === 'function') {
//         sharedSecretArray = Utils.toArray(sharedSecret.toHex(), 'hex');
//       } else {
//         const hexString = sharedSecret.toString(16).padStart(64, '0');
//         sharedSecretArray = Utils.toArray(hexString, 'hex');
//       }
      
//       const symmetricKey = new SymmetricKey(Hash.sha256(sharedSecretArray));
//       const encryptedBytes = Utils.toArray(encryptedHex, 'hex');
//       return symmetricKey.decrypt(encryptedBytes, 'utf8');
//     } catch (error) {
//       throw error;
//     }
//   }
// }  

































// Blockchain Message Reader Class
class BlockchainMessageReader {
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

  // Helper to add API key to headers if available
  getHeaders() {
    const headers: any = {};
    if (this.apiKey) {
      headers['Authorization'] = this.apiKey;
    }
    return headers;
  }

  async fetchMessages(address: string, privateKey: PrivateKey, contacts: SavedContact[]): Promise<OnChainMessage[]> {
    try {
      // Get transaction history with API key support
      const response = await fetch(`${this.baseUrl}/address/${address}/history`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch transaction history');
      
      const txHistory = await response.json();
      const messages: OnChainMessage[] = [];
      
      // Process each transaction
      for (const txInfo of txHistory) {
        // For each transaction, fetch its details
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

  async getTransactionHistory(address: string) {
    const response = await fetch(`${this.baseUrl}/address/${address}/history`);
    if (!response.ok) throw new Error('Failed to fetch transaction history');
    return await response.json();
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
      
      if (returnIndex === -1 || returnIndex + 1 >= parts.length) {
        return null;
      }

      const hexData = parts[returnIndex + 1];
      
      // Check for our protocol prefix
      if (!hexData || !hexData.startsWith('1933')) {
        return null;
      }

      // Remove protocol prefix
      const dataAfterPrefix = hexData.substring(4);
      
      // Check if this is Type-42 encrypted (has metadata)  Type42AdvancedEncryption 
      let encryptedHex: string;
      let messageMetadata: any = null;
      let encryptionType: 'standard' | 'standard';
      
      // Try to parse Type-42 metadata
      if (dataAfterPrefix.length > 4) {
        try {
          const metadataLength = parseInt(dataAfterPrefix.substring(0, 4), 16) * 2;
          if (metadataLength > 0 && metadataLength < dataAfterPrefix.length - 4) {
            const metadataHex = dataAfterPrefix.substring(4, 4 + metadataLength);
            const encryptedData = dataAfterPrefix.substring(4 + metadataLength);
            
            // Try to parse metadata
            const metadataBytes = Utils.toArray(metadataHex, 'hex');
            const metadataStr = Utils.toUTF8(metadataBytes);
            const metadata = JSON.parse(metadataStr);
            
            if (metadata.v === 'type42-v1') {
              messageMetadata = {
                version: metadata.v,
                dailyKeyId: metadata.d,
                messageKeyId: metadata.m,
                timestamp: metadata.t
              };
              encryptedHex = encryptedData;
              encryptionType = 'type42';
              console.log('Detected Type-42 message with metadata:', messageMetadata);
            }
          }
        } catch (e) {
          // Not Type-42 format, treat as standard
        }
      }
      
      // If not Type-42, use standard format
      if (!messageMetadata) {
        encryptedHex = dataAfterPrefix;
      }

      console.log('Encrypted message from chain:', encryptedHex);

      // Determine if this is a sent or received message
      const isFromMe = txInfo.vin?.some((input: any) => 
        input.voutDetails?.addresses?.includes(myAddress) || 
        input.addr === myAddress
      );

      // Get sender and recipient addresses
      let senderAddr = myAddress;
      let recipientAddr = '';

      if (isFromMe) {
        // For sent messages, find the recipient
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

      // Try to decrypt the message
      const decrypted = await this.tryDecrypt(
        encryptedHex, 
        privateKey, 
        contacts,
        isFromMe,
        senderAddr,
        recipientAddr,
        messageMetadata,
        encryptionType
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
          messageId: messageMetadata?.messageKeyId,
          encryptionType
        };
      }

      // If we couldn't decrypt, still return the message info with encrypted data
      return {
        txid: txInfo.txid || txInfo.tx_hash,
        timestamp: new Date(txInfo.time * 1000),
        message: `[Encrypted: ${encryptedHex.substring(0, 20)}...]`,
        sender: senderAddr,
        recipient: recipientAddr,
        encrypted: encryptedHex,
        isFromMe,
        messageId: messageMetadata?.messageKeyId,
        encryptionType
      };

    } catch (error) {
      console.error('Error extracting message from tx:', error);
      return null;
    }
  }

  async tryDecrypt(encryptedHex: string, privateKey: PrivateKey, contacts: SavedContact[], isFromMe: boolean, senderAddr: string, recipientAddr: string, metadata: any = null, encryptionType: 'standard' | 'type42' = 'standard'): Promise<{ message: string, sender: string, recipient: string } | null> {
    try {
      const encryptedBytes = Utils.toArray(encryptedHex, 'hex');
      console.log('Attempting to decrypt:', encryptedHex);
      console.log('Encryption type:', encryptionType);
      
      // Create Type-42 encryption instance if needed
     // const type42 = encryptionType === 'type42' ? new Type42AdvancedEncryption(privateKey, this.network) : null;
      
      // Try decrypting with each contact's public key
      for (const contact of contacts) {
        try {
          const contactPubKey = PublicKey.fromString(contact.publicKeyHex);
          let decrypted: string;
          
          if (encryptionType === 'type42' && type42 && metadata) {
            // Use Type-42 decryption
            decrypted = await type42.decryptMessage(contactPubKey, encryptedHex, metadata);
          } else {
            // Use standard ECDH decryption
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
            decrypted = symmetricKey.decrypt(encryptedBytes, 'utf8');
          }
          
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

  // Initialize managers when private key is set
  useEffect(() => {
    if (keyData.privateKey && keyData.address) {
      console.log('Initializing managers for address:', keyData.address);
      const manager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      setUtxoManager(manager);
      setMessageTransaction(new MessageTransaction(keyData.privateKey, network, useType42Encryption));
      setMessageReader(new BlockchainMessageReader(network, whatsOnChainApiKey));
    }
  }, [keyData.privateKey, keyData.address, network, whatsOnChainApiKey, useType42Encryption]);

  // Fetch on-chain messages when wallet is initialized
  useEffect(() => {
    if (messageReader && keyData.privateKey && keyData.address) {
      fetchOnChainMessages();
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
  const fetchOnChainMessages = async () => {
    if (!messageReader || !keyData.privateKey || !keyData.address) return;
    
    setLoadingMessages(true);
    try {
      const messages = await messageReader.fetchMessages(
        keyData.address,
        keyData.privateKey,
        contacts
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
  };// Load saved API key from localStorage
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
  }, [whatsOnChainApiKey]);  // Update selected conversation contact when conversation changes
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
                    <button
                      onClick={fetchOnChainMessages}
                      disabled={loadingMessages}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm disabled:bg-gray-600"
                    >
                      {loadingMessages ? 'Loading...' : 'Refresh'}
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
    <div className="mb-2">
      <p className="text-xs text-gray-400">
        <span className="font-medium text-cyan-400">How it works:</span> Your message will be encrypted using 
        standard ECDH with {selectedConversationContact?.name || 'the selected contact'}'s public key.
      </p>
    </div>
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

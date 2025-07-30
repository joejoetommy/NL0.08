import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../store/WalletStore';
import { UTXOManager } from '../utils/blockchain';
import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import { BroadcastService } from '../services/BroadcastService';
import { useMessageHandlers } from '../hooks/useMessageHandlers';

// Test data templates
const TEST_DATA = {
  text: { type: 'test', message: 'Hello BSV!' },
  profile: { 
    type: 'profile',
    username: 'testuser',
    title: 'BSV Developer',
    bio: 'Building on Bitcoin SV'
  },
  image: {
    type: 'image',
    name: 'test-image.png',
    description: 'Test image inscription'
  }
};

// Add encryption level type
type EncryptionLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Add these interfaces
interface InscriptionFile {
  hash: string;
  size: number;
  type: string;
}

interface Inscription {
  id: number;
  txid: string;
  vout: number;
  file: InscriptionFile;
  origin: string;
  ordinal: number;
  height: number;
  idx: number;
  lock: string;
  spend?: string;
  MAP?: any;
  B?: any;
  content?: any;
  inscriptionType?: string;
}

interface InscriptionData {
  id: number;
  txid: string;
  vout: number;
  timestamp: Date;
  inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'unknown';
  content?: any;
  size: number;
  origin: string;
  scriptHex?: string;
  encryptionLevel?: EncryptionLevel;
  encrypted?: boolean;
}

// Add encryption utilities using Web Crypto API
class BlogEncryption {
  static async deriveEncryptionKey(keySegment: string, salt: string = 'blog-encryption'): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keySegment),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: string, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoder.encode(data)
    );
    
    return { encrypted, iv };
  }

  static async decrypt(encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  static async prepareEncryptedInscription(
    data: any,
    encryptionLevel: EncryptionLevel,
    keySegment: string | null
  ): Promise<{ encryptedData: string; metadata: any }> {
    if (encryptionLevel === 0 || !keySegment) {
      return {
        encryptedData: typeof data === 'string' ? data : JSON.stringify(data),
        metadata: { encrypted: false, level: 0 }
      };
    }

    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const encryptionKey = await this.deriveEncryptionKey(keySegment);
    const { encrypted, iv } = await this.encrypt(dataStr, encryptionKey);
    
    const metadata = {
      encrypted: true,
      level: encryptionLevel,
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      algorithm: 'aes-256-gcm'
    };

    // Convert encrypted ArrayBuffer to base64 in chunks to avoid call stack issues
    const encryptedArray = new Uint8Array(encrypted);
    let encryptedBase64 = '';
    
    // Process in 64KB chunks
    const chunkSize = 65536;
    for (let i = 0; i < encryptedArray.length; i += chunkSize) {
      const chunk = encryptedArray.slice(i, i + chunkSize);
      // Convert chunk to string without using spread operator
      let chunkString = '';
      for (let j = 0; j < chunk.length; j++) {
        chunkString += String.fromCharCode(chunk[j]);
      }
      encryptedBase64 += btoa(chunkString);
    }

    return {
      encryptedData: encryptedBase64,
      metadata
    };
  }
}

export const ProfileToken: React.FC = () => {
  const [inscriptionType, setInscriptionType] = useState<'text' | 'image' | 'profile' | 'profile2'>('text');
  const [textData, setTextData] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [profileData, setProfileData] = useState({
    username: '',
    title: '',
    bio: '',
    avatar: ''
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [transactionQueue, setTransactionQueue] = useState(false);
  const [lastTransactionTime, setLastTransactionTime] = useState(0);
  const [currentFeeRate, setCurrentFeeRate] = useState<number>(1);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
    type: null, 
    message: '' 
  });
  const [lastTxid, setLastTxid] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Add encryption-related state
  const [encryptionLevel, setEncryptionLevel] = useState<EncryptionLevel>(0);
  const [showEncryptionOptions, setShowEncryptionOptions] = useState(false);
  const [encryptedData, setEncryptedData] = useState<string>('');
  const [encryptedSize, setEncryptedSize] = useState<number>(0);
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Add new state variables for viewing inscriptions
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
  const [inscriptions, setInscriptions] = useState<InscriptionData[]>([]);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);
  const [inscriptionError, setInscriptionError] = useState<string>('');
  const [selectedInscription, setSelectedInscription] = useState<InscriptionData | null>(null);
  const [inscriptionContent, setInscriptionContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [inscriptionFilter, setInscriptionFilter] = useState<'all' | 'text' | 'image' | 'profile' | 'profile2'>('all');

  const { keyData, network, balance, whatsOnChainApiKey, blogKeyHistory, getKeySegmentForLevel } = useWalletStore();
  const { fetchOnChainMessages } = useMessageHandlers();

  // Backend proxy URL
  const BROADCAST_PROXY_URL = 'http://localhost:3001';

  // Get encryption level label
  const getEncryptionLevelLabel = (level: EncryptionLevel): string => {
    const labels = {
      0: 'Public (No encryption)',
      1: 'Friends',
      2: 'Close Friends',
      3: 'Inner Circle',
      4: 'Closed Group',
      5: 'Completely Private'
    };
    return labels[level];
  };

  // Get encryption level color
  const getEncryptionLevelColor = (level: EncryptionLevel): string => {
    const colors = {
      0: 'gray',
      1: 'orange',
      2: 'yellow',
      3: 'indigo',
      4: 'purple',
      5: 'red'
    };
    return colors[level];
  };

  // Auto-encrypt data when inputs or encryption level change
  useEffect(() => {
    if (encryptionLevel > 0 && blogKeyHistory.current) {
      encryptCurrentData();
    } else {
      setEncryptedData('');
      setEncryptedSize(0);
    }
  }, [textData, imageFile, profileData, profileImageFile, backgroundImageFile, encryptionLevel, inscriptionType]);

  // Encrypt current data based on inscription type
  const encryptCurrentData = async () => {
    if (!blogKeyHistory.current || encryptionLevel === 0) {
      setEncryptedData('');
      setEncryptedSize(0);
      return;
    }

    setIsEncrypting(true);
    
    try {
      const keySegment = getKeySegmentForLevel(encryptionLevel);
      if (!keySegment) {
        throw new Error('No key segment available for encryption level');
      }

      let dataToEncrypt: any;
      let contentType = '';

      if (inscriptionType === 'text') {
        if (!textData) {
          setEncryptedData('');
          setEncryptedSize(0);
          setIsEncrypting(false);
          return;
        }
        dataToEncrypt = textData;
        contentType = 'text';
      } 
      else if (inscriptionType === 'image' && imageFile) {
        // Show status for large files
        if (imageFile.size > 1000000) {
          setStatus({ 
            type: 'info', 
            message: `Compressing ${(imageFile.size / 1024 / 1024).toFixed(1)}MB image for encryption...` 
          });
        }
        
        // For encrypted images, compress to 2.5MB before encryption
        const base64Data = await imageToBase64(imageFile, undefined, true, 2.5);
        
        dataToEncrypt = {
          name: imageFile.name,
          type: imageFile.type,
          size: imageFile.size,
          data: base64Data
        };
        contentType = 'image';
      }
      else if (inscriptionType === 'profile' || inscriptionType === 'profile2') {
        if (!profileData.username && !profileData.title && !profileData.bio) {
          setEncryptedData('');
          setEncryptedSize(0);
          setIsEncrypting(false);
          return;
        }

        const profileDataToSave: any = {
          p: inscriptionType,
          username: profileData.username || 'Anonymous',
          title: profileData.title || 'BSV User',
          bio: profileData.bio || 'On-chain profile',
          timestamp: Date.now()
        };
        
        if (profileImageFile) {
          if (profileImageFile.size > 1000000) {
            setStatus({ 
              type: 'info', 
              message: 'Compressing profile image...' 
            });
          }
          // For profile, compress to 2.5MB before encryption; for profile2, compress to 0.95MB
          const targetSize = inscriptionType === 'profile' ? 2.5 : 0.95;
          const base64Data = await imageToBase64(profileImageFile, 600, true, targetSize);
          profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
        }
        
        if (inscriptionType === 'profile2' && backgroundImageFile) {
          if (backgroundImageFile.size > 1000000) {
            setStatus({ 
              type: 'info', 
              message: 'Compressing background image...' 
            });
          }
          // For profile2, compress to 0.95MB before encryption
          const base64Data = await imageToBase64(backgroundImageFile, 800, true, 0.95);
          profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
        }
        
        dataToEncrypt = profileDataToSave;
        contentType = inscriptionType;
      } else {
        setEncryptedData('');
        setEncryptedSize(0);
        setIsEncrypting(false);
        return;
      }

      // Clear compression status
      if (status.type === 'info' && status.message.includes('Compressing')) {
        setStatus({ type: null, message: '' });
      }

      // Encrypt the data
      const { encryptedData, metadata } = await BlogEncryption.prepareEncryptedInscription(
        dataToEncrypt,
        encryptionLevel,
        keySegment
      );
      
      // Create the wrapper
      const wrapper = {
        encrypted: true,
        originalType: contentType,
        data: encryptedData,
        metadata
      };
      
      const encryptedJson = JSON.stringify(wrapper);
      const encryptedSizeBytes = new TextEncoder().encode(encryptedJson).length;
      
      // Check final size
      if (encryptedSizeBytes > 4800000) { // 4.8MB limit to leave margin
        throw new Error(`Encrypted data too large: ${(encryptedSizeBytes / 1024 / 1024).toFixed(1)}MB. Maximum safe size is 4.8MB.`);
      }
      
      setEncryptedData(encryptedJson);
      setEncryptedSize(encryptedSizeBytes);
      
    } catch (error) {
      console.error('Encryption error:', error);
      setStatus({ 
        type: 'error', 
        message: 'Failed to encrypt data: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
      setEncryptedData('');
      setEncryptedSize(0);
    } finally {
      setIsEncrypting(false);
    }
  };

  // Fetch current fee rate from the network
  const fetchCurrentFeeRate = async () => {
    try {
      const defaultRateSatPerKB = 1;
      
      const response = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/fee/estimates`
      ).catch(() => null);

      if (response && response.ok) {
        const feeData = await response.json();
        const feeRatePerByte = feeData.standard || feeData.halfHour || 0.001;
        const feeRatePerKB = feeRatePerByte * 1000;
        
        const actualRate = Math.max(defaultRateSatPerKB, Math.round(feeRatePerKB));
        setCurrentFeeRate(actualRate);
        console.log(`Current network fee rate: ${actualRate} sat/KB`);
        return actualRate;
      }
    } catch (error) {
      console.log('Could not fetch fee rate, using default BSV rate');
    }
    
    const defaultRate = 1;
    setCurrentFeeRate(defaultRate);
    console.log(`Using default BSV fee rate: ${defaultRate} sat/KB`);
    return defaultRate;
  };

  // Calculate transaction size and fee based on BSV's sat/KB model
  const calculateTransactionFee = (
    numInputs: number,
    numOutputs: number,
    dataSize: number,
    feeRatePerKB: number = currentFeeRate
  ): { estimatedSize: number; fee: number; remainingCapacity: number } => {
    const baseSize = 10;
    const inputSize = numInputs * 148;
    const outputSize = numOutputs * 34;
    const inscriptionOverhead = 10;
    
    const totalSizeBytes = baseSize + inputSize + outputSize + inscriptionOverhead + dataSize;
    const totalSizeKB = totalSizeBytes / 1000;
    
    const fee = Math.max(1, Math.ceil(totalSizeKB * feeRatePerKB));
    
    // Calculate remaining capacity before hitting 5MB limit
    const MAX_TX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    const remainingCapacity = MAX_TX_SIZE - totalSizeBytes;
    
    console.log(`Transaction size calculation (BSV sat/KB model):`);
    console.log(`- Base: ${baseSize} bytes`);
    console.log(`- Inputs (${numInputs}): ${inputSize} bytes`);
    console.log(`- Outputs (${numOutputs}): ${outputSize} bytes`);
    console.log(`- Inscription data: ${dataSize} bytes`);
    console.log(`- Total size: ${totalSizeBytes} bytes (${totalSizeKB.toFixed(3)} KB)`);
    console.log(`- Fee rate: ${feeRatePerKB} sat/KB`);
    console.log(`- Total fee: ${fee} sats`);
    console.log(`- Actual rate: ${(fee / totalSizeKB).toFixed(3)} sat/KB`);
    console.log(`- Remaining capacity: ${(remainingCapacity / 1024 / 1024).toFixed(2)} MB`);
    
    return { estimatedSize: totalSizeBytes, fee, remainingCapacity };
  };

  // Add function to filter inscriptions
  const getFilteredInscriptions = () => {
    if (inscriptionFilter === 'all') {
      return inscriptions;
    }
    return inscriptions.filter(inscription => inscription.inscriptionType === inscriptionFilter);
  };

  // Fetch inscriptions using the same pattern as Conversations
  const fetchInscriptions = async () => {
    if (!keyData.address) {
      setInscriptionError('Please connect your wallet first');
      return;
    }

    setLoadingInscriptions(true);
    setInscriptionError('');
    
    try {
      const headers: any = {};
      if (whatsOnChainApiKey) {
        headers['woc-api-key'] = whatsOnChainApiKey;
      }

      const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${keyData.address}/history`;
      console.log('Fetching from:', historyUrl);
      
      const historyResponse = await fetch(historyUrl, { headers });
      
      if (!historyResponse.ok) {
        throw new Error(`Failed to fetch history: ${historyResponse.status}`);
      }

      const history = await historyResponse.json();
      console.log(`Found ${history.length} transactions`);

      const foundInscriptions: InscriptionData[] = [];
      
      for (const tx of history.slice(0, 30)) {
        try {
          const txResponse = await fetch(
            `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
            { headers }
          );

          if (!txResponse.ok) continue;

          const txData = await txResponse.json();
          
          for (let i = 0; i < txData.vout.length; i++) {
            const vout = txData.vout[i];
            
            if (vout.value === 0.00000001) {
              console.log(`Found 1 sat output in ${tx.tx_hash}:${i}`);
              
              const scriptHex = vout.scriptPubKey?.hex || '';
              
              let inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'unknown' = 'unknown';
              let content: any = null;
              let encrypted = false;
              let encryptionLevel = 0;
              
              if (scriptHex.includes('746578742f706c61696e')) { // "text/plain"
                inscriptionType = 'text';
                try {
                  const textMatch = scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
                  if (textMatch && textMatch[1]) {
                    const hexStr = textMatch[1];
                    let extractedContent = '';
                    for (let i = 0; i < hexStr.length; i += 2) {
                      extractedContent += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
                    }
                    
                    try {
                      const parsed = JSON.parse(extractedContent);
                      if (parsed.encrypted && parsed.data) {
                        encrypted = true;
                        encryptionLevel = parsed.metadata?.level || 0;
                        content = parsed;
                      } else {
                        content = extractedContent;
                      }
                    } catch {
                      content = extractedContent;
                    }
                  }
                } catch (e) {
                  console.error('Error extracting text:', e);
                }
              } else if (scriptHex.includes('6170706c69636174696f6e2f6a736f6e')) { // "application/json"
                try {
                  const jsonMatch = scriptHex.match(/6170706c69636174696f6e2f6a736f6e[0-9a-f]*?00([0-9a-f]+?)68/);
                  if (jsonMatch && jsonMatch[1]) {
                    const hexStr = jsonMatch[1];
                    let jsonStr = '';
                    for (let i = 0; i < hexStr.length; i += 2) {
                      jsonStr += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
                    }
                    try {
                      content = JSON.parse(jsonStr);
                      
                      if (content.encrypted && content.data) {
                        encrypted = true;
                        encryptionLevel = content.metadata?.level || 0;
                      }
                      
                      if (content.p === 'profile2' || (content.encrypted && content.originalType === 'profile2')) {
                        inscriptionType = 'profile2';
                      } else if (content.p === 'profile' || (content.encrypted && content.originalType === 'profile')) {
                        inscriptionType = 'profile';
                      } else {
                        inscriptionType = 'profile';
                      }
                    } catch (parseError) {
                      console.error('Error parsing JSON:', parseError);
                      inscriptionType = 'profile';
                    }
                  }
                } catch (e) {
                  console.error('Error extracting JSON:', e);
                  inscriptionType = 'profile';
                }
              } else if (scriptHex.includes('696d6167652f')) { // "image/"
                inscriptionType = 'image';
              }
              
              foundInscriptions.push({
                id: foundInscriptions.length,
                txid: tx.tx_hash,
                vout: i,
                timestamp: new Date(tx.time * 1000 || Date.now()),
                inscriptionType,
                content,
                size: scriptHex.length / 2,
                origin: `${tx.tx_hash}_${i}`,
                scriptHex,
                encrypted,
                encryptionLevel: encryptionLevel as EncryptionLevel
              });
            }
          }
        } catch (e) {
          console.error(`Error processing tx ${tx.tx_hash}:`, e);
        }
      }
      
      console.log(`Found ${foundInscriptions.length} inscriptions`);
      setInscriptions(foundInscriptions);
      
    } catch (error) {
      console.error('Error fetching inscriptions:', error);
      setInscriptionError(error instanceof Error ? error.message : 'Failed to fetch inscriptions');
    } finally {
      setLoadingInscriptions(false);
    }
  };

  // Fetch inscription content details
  const fetchInscriptionContent = async (selectedInscription: InscriptionData) => {
    setLoadingContent(true);
    setSelectedInscription(selectedInscription);
    
    try {
      if (selectedInscription.content) {
        if (selectedInscription.encrypted && selectedInscription.content.encrypted) {
          const keySegment = getKeySegmentForLevel(selectedInscription.encryptionLevel || 0);
          
          if (keySegment && selectedInscription.content.data && selectedInscription.content.metadata) {
            try {
              const encryptionKey = await BlogEncryption.deriveEncryptionKey(keySegment);
              
              const encryptedData = selectedInscription.content.data;
              const binaryString = atob(encryptedData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              const ivHex = selectedInscription.content.metadata.iv;
              const iv = new Uint8Array(ivHex.match(/.{2}/g).map((byte: string) => parseInt(byte, 16)));
              
              const decryptedStr = await BlogEncryption.decrypt(bytes.buffer, encryptionKey, iv);
              
              try {
                const parsedContent = JSON.parse(decryptedStr);
                setInscriptionContent(parsedContent);
              } catch {
                setInscriptionContent(decryptedStr);
              }
            } catch (decryptError) {
              console.error('Decryption failed:', decryptError);
              setInscriptionContent({
                error: 'Unable to decrypt - insufficient access level',
                requiredLevel: selectedInscription.encryptionLevel
              });
            }
          } else {
            setInscriptionContent({
              error: 'Encrypted content - key required',
              requiredLevel: selectedInscription.encryptionLevel
            });
          }
        } else {
          setInscriptionContent(selectedInscription.content);
        }
        setLoadingContent(false);
        return;
      }
      
      if (selectedInscription.scriptHex) {
        if (selectedInscription.inscriptionType === 'image') {
          setInscriptionContent({
            type: 'image',
            message: 'Image inscription - view transaction for full data',
            txid: selectedInscription.txid,
            encrypted: selectedInscription.encrypted
          });
        } else if (selectedInscription.inscriptionType === 'text') {
          const textMatch = selectedInscription.scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
          if (textMatch && textMatch[1]) {
            const hexStr = textMatch[1];
            let text = '';
            for (let i = 0; i < hexStr.length; i += 2) {
              text += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
            }
            setInscriptionContent(text);
          }
        }
      }
      
      setLoadingContent(false);
    } catch (error) {
      console.error('Error fetching content:', error);
      setInscriptionContent(null);
      setLoadingContent(false);
    }
  };

  // Update timer for button
  useEffect(() => {
    if (lastTransactionTime > 0) {
      const interval = setInterval(() => {
        const timePassed = Date.now() - lastTransactionTime;
        if (timePassed >= 5000) {
          clearInterval(interval);
        }
        setStatus(prev => ({ ...prev }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lastTransactionTime]);

  // Fetch fee rate on component mount and network change
  useEffect(() => {
    fetchCurrentFeeRate();
  }, [network]);

  // Add effect to fetch inscriptions when tab changes
  useEffect(() => {
    if (activeTab === 'view' && keyData.address) {
      fetchInscriptions();
    }
  }, [activeTab, keyData.address]);

  // Handle image selection - now allows up to 25MB
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow up to 25MB
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `Image too large. Maximum size is 25MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      });
      return;
    }

    // Show size info
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ 
        type: 'info', 
        message: `Large image detected (${(file.size / 1024 / 1024).toFixed(1)}MB). It will be automatically compressed to fit within limits.` 
      });
    } else {
      const base64Size = Math.ceil(file.size * 1.37); // Base64 overhead
      const { estimatedSize, fee } = calculateTransactionFee(1, 2, base64Size);
      
      setStatus({ 
        type: 'info', 
        message: `Image size: ${(file.size / 1024).toFixed(0)}KB. Estimated fee: ${fee} sats` 
      });
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle profile image selection
  const handleProfileImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, isBackground: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow up to 25MB per image
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `Image too large. Maximum size is 25MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      });
      return;
    }

    if (isBackground) {
      setBackgroundImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    if (file.size > 3 * 1024 * 1024) {
      setStatus({ 
        type: 'info', 
        message: `Large image (${(file.size / 1024 / 1024).toFixed(1)}MB) will be compressed automatically.` 
      });
    }
  };

  // Convert image to base64 with optional compression
  const imageToBase64 = (file: File, maxWidth?: number, isEncrypted: boolean = false, targetSizeMB?: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // Determine compression threshold based on inscription type and encryption
      let compressionThreshold = 4.95 * 1024 * 1024; // Default for unencrypted images
      
      if (!isEncrypted && !targetSizeMB) {
        // Unencrypted thresholds
        if (inscriptionType === 'image') {
          compressionThreshold = 4.95 * 1024 * 1024; // 4.95MB
          targetSizeMB = 4.95;
        } else if (inscriptionType === 'profile') {
          compressionThreshold = 3.7 * 1024 * 1024; // 3.7MB
          targetSizeMB = 3.7;
        } else if (inscriptionType === 'profile2') {
          compressionThreshold = 1.7 * 1024 * 1024; // 1.7MB
          targetSizeMB = 1.7;
        }
      }
      
      // For smaller files that don't need compression
      if (file.size < compressionThreshold && !maxWidth && !isEncrypted) {
        reader.onload = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }
      
      // For larger files, compress using canvas
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Calculate new dimensions based on file size
          let width = img.width;
          let height = img.height;
          
          // Adaptive compression for transaction size limits
          let maxDimension = maxWidth;
          if (!maxDimension) {
            // For encrypted content with specific target sizes
            if (isEncrypted && targetSizeMB) {
              const targetBytes = targetSizeMB * 1024 * 1024;
              const currentDataSize = file.size * 1.37; // Base64 overhead
              
              if (currentDataSize > targetBytes) {
                // Need to compress more aggressively to meet target
                const reductionFactor = Math.sqrt(targetBytes / currentDataSize) * 0.9; // 0.9 for safety
                maxDimension = Math.max(400, Math.floor(Math.max(width, height) * reductionFactor));
              } else {
                // File is already under target, minimal compression
                maxDimension = 2000;
              }
            } else {
              // Non-encrypted compression logic
              const MAX_SAFE_DATA_SIZE = targetSizeMB ? targetSizeMB * 1024 * 1024 : 4.5 * 1024 * 1024;
              const currentDataSize = file.size * 1.37; // Base64 overhead
              
              if (currentDataSize > MAX_SAFE_DATA_SIZE) {
                // Need to compress more aggressively
                const reductionFactor = Math.sqrt(MAX_SAFE_DATA_SIZE / currentDataSize);
                maxDimension = Math.max(600, Math.floor(Math.max(width, height) * reductionFactor));
              } else {
                // No compression needed
                maxDimension = Math.max(width, height);
              }
            }
          }
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try different quality levels to get under size limit
          let quality = 0.92;
          let targetSize = 3500000; // Default target ~3.5MB base64
          
          // Adjust target based on encryption and specific limits
          if (isEncrypted && targetSizeMB) {
            targetSize = targetSizeMB * 1024 * 1024 * 0.9; // 90% of target to be safe
            quality = 0.85;
          } else if (targetSizeMB) {
            targetSize = targetSizeMB * 1024 * 1024 * 0.95; // 95% of target for unencrypted
          }
          
          let dataUrl = canvas.toDataURL(file.type || 'image/jpeg', quality);
          
          // Reduce quality until size is acceptable
          while (dataUrl.length > targetSize && quality > 0.3) {
            quality -= 0.05;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          // If still too large, reduce dimensions further
          if (dataUrl.length > targetSize) {
            const scaleFactor = Math.sqrt(targetSize / dataUrl.length) * 0.9; // 0.9 for safety margin
            canvas.width = Math.round(width * scaleFactor);
            canvas.height = Math.round(height * scaleFactor);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
          
          const base64Data = dataUrl.split(',')[1];
          const compressedSizeKB = (base64Data.length * 0.75 / 1024).toFixed(0);
          const originalSizeKB = (file.size / 1024).toFixed(0);
          
          console.log(`Image compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB (${width}x${height}, quality ${quality.toFixed(2)})`);
          if (isEncrypted && targetSizeMB) {
            console.log(`Target size: ${targetSizeMB}MB, Achieved: ${(base64Data.length / 1024 / 1024).toFixed(2)}MB`);
          }
          
          resolve(base64Data);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Create the inscription script with proper handling for large data
  const createInscriptionScript = (pubKeyHash: number[], contentType: string, data: Uint8Array): Script => {
    let scriptHex = '';
    
    try {
      scriptHex += '76a914';
      scriptHex += pubKeyHash.map(b => b.toString(16).padStart(2, '0')).join('');
      scriptHex += '88ac';
      
      scriptHex += '0063';
      scriptHex += '03';
      scriptHex += '6f7264';
      scriptHex += '51';
      
      const ctBytes = Utils.toArray(contentType, 'utf8');
      const ctLength = ctBytes.length;
      
      if (ctLength <= 75) {
        scriptHex += ctLength.toString(16).padStart(2, '0');
      } else if (ctLength <= 255) {
        scriptHex += '4c';
        scriptHex += ctLength.toString(16).padStart(2, '0');
      } else {
        scriptHex += '4d';
        scriptHex += (ctLength & 0xff).toString(16).padStart(2, '0');
        scriptHex += ((ctLength >> 8) & 0xff).toString(16).padStart(2, '0');
      }
      scriptHex += ctBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      scriptHex += '00';
      
      const dataArray = Array.from(data);
      const dataLength = dataArray.length;
      
      console.log(`Encoding ${dataLength} bytes of inscription data`);
      
      if (dataLength <= 75) {
        scriptHex += dataLength.toString(16).padStart(2, '0');
      } else if (dataLength <= 255) {
        scriptHex += '4c';
        scriptHex += dataLength.toString(16).padStart(2, '0');
      } else if (dataLength <= 65535) {
        scriptHex += '4d';
        scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
        scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
      } else {
        scriptHex += '4e';
        scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
        scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
        scriptHex += ((dataLength >> 16) & 0xff).toString(16).padStart(2, '0');
        scriptHex += ((dataLength >> 24) & 0xff).toString(16).padStart(2, '0');
      }
      
      const chunkSize = 10000;
      for (let i = 0; i < dataArray.length; i += chunkSize) {
        const chunk = dataArray.slice(i, Math.min(i + chunkSize, dataArray.length));
        scriptHex += chunk.map(b => b.toString(16).padStart(2, '0')).join('');
      }
      
      scriptHex += '68';
      
      const script = Script.fromHex(scriptHex);
      
      console.log(`Created inscription script: ${(scriptHex.length / 2 / 1024).toFixed(2)}KB`);
      
      return script;
      
    } catch (error) {
      console.error('Error creating inscription script:', error);
      console.error('Script hex length so far:', scriptHex.length);
      throw new Error('Failed to create inscription script: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Broadcast transaction with multiple fallback methods
  const broadcastTransaction = async (txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> => {
    const broadcastService = new BroadcastService(network);
    
    const result = await broadcastService.broadcast(txHex);
    
    if (result.success) {
      return result;
    }
    
    console.log('\n=== MANUAL BROADCAST REQUIRED ===');
    console.log('Transaction hex:');
    console.log(txHex);
    console.log('=================================\n');
    
    try {
      await navigator.clipboard.writeText(txHex);
      console.log('✓ Transaction hex copied to clipboard!');
    } catch (e) {
      console.log('Could not copy to clipboard');
    }
    
    return {
      success: false,
      error: 'Automatic broadcast failed. Transaction copied to clipboard. Click the link below to broadcast manually.'
    };
  };

  // Create ordinal inscription with proper UTXO management
  const createOrdinal = async () => {
    if (!keyData.privateKey) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    // Check if blog key is available when encryption is requested
    if (encryptionLevel > 0 && !blogKeyHistory.current) {
      setStatus({ type: 'error', message: 'Please generate a blog encryption key first' });
      return;
    }

    // If encrypted, use the encrypted data
    if (encryptionLevel > 0 && !encryptedData) {
      setStatus({ type: 'error', message: 'No encrypted data available. Please wait for encryption to complete.' });
      return;
    }

    const timeSinceLastTx = Date.now() - lastTransactionTime;
    if (timeSinceLastTx < 5000) {
      setStatus({ 
        type: 'error', 
        message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another ordinal` 
      });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Preparing inscription...' });

    try {
      let contentType: string;
      let inscriptionData: Uint8Array;

      if (encryptionLevel > 0 && encryptedData) {
        // Use the encrypted data
        contentType = 'application/json';
        inscriptionData = Utils.toArray(encryptedData, 'utf8');
        console.log(`Creating encrypted inscription, size: ${inscriptionData.length} bytes, encryption level: ${encryptionLevel}`);
      } else {
        // Non-encrypted path
        if (inscriptionType === 'text') {
          const text = textData || 'Hello, 1Sat Ordinals!';
          contentType = 'text/plain;charset=utf-8';
          inscriptionData = Utils.toArray(text, 'utf8');
        } 
        else if (inscriptionType === 'image' && imageFile) {
          // For unencrypted images, compress if over 4.95MB
          const base64Data = await imageToBase64(imageFile, undefined, false, 4.95);
          contentType = imageFile.type || 'image/png';
          inscriptionData = Utils.toArray(base64Data, 'base64');
          console.log(`Image inscription: ${imageFile.name}, size: ${inscriptionData.length} bytes`);
        }
        else if (inscriptionType === 'profile' || inscriptionType === 'profile2') {
          const profileDataToSave: any = {
            p: inscriptionType,
            username: profileData.username || 'Anonymous',
            title: profileData.title || 'BSV User',
            bio: profileData.bio || 'On-chain profile',
            timestamp: Date.now()
          };
          
          if (profileImageFile) {
            // For unencrypted profiles, compress based on type
            const maxSize = inscriptionType === 'profile' ? 3.7 : 1.7;
            const base64Data = await imageToBase64(profileImageFile, 800, false, maxSize);
            profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
          }
          
          if (inscriptionType === 'profile2' && backgroundImageFile) {
            // For unencrypted profile2, compress to 1.7MB
            const base64Data = await imageToBase64(backgroundImageFile, 1200, false, 1.7);
            profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
          }
          
          contentType = 'application/json';
          inscriptionData = Utils.toArray(JSON.stringify(profileDataToSave), 'utf8');
        }
        else {
          throw new Error('Invalid inscription type or missing data');
        }
      }

      console.log(`Creating ${inscriptionType} inscription, size: ${inscriptionData.length} bytes`);

      if (inscriptionData.length > 1000000) {
        const sizeMB = (inscriptionData.length / 1024 / 1024).toFixed(2);
        console.warn(`Large inscription detected: ${sizeMB}MB`);
        setStatus({
          type: 'info',
          message: `Creating large inscription (${sizeMB}MB). This may take longer to process...`
        });
      }

      const feeRate = await fetchCurrentFeeRate();

      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs(true);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available. Please wait for previous transactions to confirm.');
      }

      let { estimatedSize, fee: estimatedFee, remainingCapacity } = calculateTransactionFee(1, 2, inscriptionData.length, feeRate);
      
      // Check if transaction would exceed 5MB limit
      if (estimatedSize > 5 * 1024 * 1024) {
        throw new Error(`Transaction size would be ${(estimatedSize / 1024 / 1024).toFixed(2)}MB, which exceeds the 5MB limit. Please use smaller content.`);
      }
      
      if (remainingCapacity < 100000) { // Less than 100KB remaining
        console.warn(`Transaction is close to 5MB limit. Only ${(remainingCapacity / 1024).toFixed(0)}KB remaining.`);
      }
      
      let { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee);
      
      if (selected.length > 1) {
        const recalc = calculateTransactionFee(selected.length, 2, inscriptionData.length, feeRate);
        estimatedFee = recalc.fee;
        
        const result = utxoManager.selectUTXOs(1 + estimatedFee);
        selected = result.selected;
        total = result.total;
      }
      
      if (selected.length === 0) {
        throw new Error(`Insufficient funds. Need ${1 + estimatedFee} satoshis, have ${total}`);
      }

      console.log(`Selected ${selected.length} UTXOs, total: ${total} sats, estimated fee: ${estimatedFee} sats`);

      if (inscriptionData.length > 100000) {
        const sizeKB = (inscriptionData.length / 1024).toFixed(1);
        setStatus({
          type: 'info',
          message: `Large inscription (${sizeKB}KB). Fee: ${estimatedFee} sats at ${feeRate} sat/KB`
        });
      }

      const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
      const publicKey = privateKey.toPublicKey();
      const address = publicKey.toAddress();
      const pubKeyHash = publicKey.toHash();

      const inscriptionScript = createInscriptionScript(pubKeyHash, contentType, inscriptionData);
      
      const scriptSize = inscriptionScript.toHex().length / 2;
      console.log(`Inscription script size: ${(scriptSize / 1024).toFixed(2)}KB`);
      
      if (scriptSize > 100000) {
        console.warn(`Very large script: ${(scriptSize / 1024).toFixed(2)}KB`);
      }

      const tx = new Transaction();

      let totalInput = 0;
      for (const utxo of selected) {
        const txid = utxo.tx_hash || utxo.txid;
        const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.sourceOutputIndex || 0);
        const satoshis = utxo.value || utxo.satoshis || 0;
        
        totalInput += satoshis;

        if (utxo.sourceTransaction) {
          tx.addInput({
            sourceTXID: txid,
            sourceOutputIndex: utxo.sourceOutputIndex || 0,
            unlockingScriptTemplate: new P2PKH().unlock(privateKey),
            sourceTransaction: utxo.sourceTransaction
          });
        } else {
          console.log(`Creating inline source for UTXO ${txid}:${vout}`);
          tx.addInput({
            sourceTXID: txid,
            sourceOutputIndex: vout,
            unlockingScriptTemplate: new P2PKH().unlock(privateKey),
            sourceTransaction: {
              id: txid,
              version: 1,
              inputs: [],
              outputs: [{
                satoshis: satoshis,
                lockingScript: new P2PKH().lock(address)
              }],
              lockTime: 0
            }
          });
        }
      }

      tx.addOutput({
        lockingScript: inscriptionScript,
        satoshis: 1
      });

      const change = totalInput - 1 - estimatedFee;
      if (change > 0) {
        tx.addOutput({
          lockingScript: new P2PKH().lock(address),
          satoshis: change
        });
      } else if (change < 0) {
        throw new Error(`Insufficient funds for fee. Need ${Math.abs(change)} more satoshis.`);
      }

      await tx.sign();

      const txHex = tx.toHex();
      const txSize = txHex.length / 2;
      const txSizeKB = txSize / 1000;
      const actualFeeRate = estimatedFee / txSizeKB;

      console.log('Transaction created:');
      console.log(`- Size: ${txSize} bytes (${txSizeKB.toFixed(3)}KB)`);
      console.log(`- Fee: ${estimatedFee} sats`);
      console.log(`- Actual fee rate: ${actualFeeRate.toFixed(3)} sat/KB`);
      console.log(`- Target fee rate: ${feeRate} sat/KB`);
      console.log(`- Encryption level: ${encryptionLevel}`);

      setStatus({ type: 'info', message: 'Broadcasting transaction...' });
      const result = await broadcastTransaction(txHex);

      if (result.success) {
        utxoManager.markAsSpent(selected);
        
        setLastTxid(result.txid!);
        setLastTransactionTime(Date.now());
        
        const encryptionInfo = encryptionLevel > 0 
          ? ` (Encrypted: Level ${encryptionLevel} - ${getEncryptionLevelLabel(encryptionLevel)})` 
          : '';
        
        setStatus({ 
          type: 'success', 
          message: `Ordinal created${encryptionInfo}! TXID: ${result.txid}` 
        });
        
        console.log(`Inscription ID: ${result.txid}_0`);
        
        setTextData('');
        setImageFile(null);
        setImagePreview('');
        setProfileData({ username: '', title: '', bio: '', avatar: '' });
        setProfileImageFile(null);
        setProfileImagePreview('');
        setBackgroundImageFile(null);
        setBackgroundImagePreview('');
        setEncryptedData('');
        setEncryptedSize(0);
        
        setTimeout(() => {
          setStatus(prev => ({
            ...prev,
            message: prev.message + '\n\nWait at least 5 seconds before creating another ordinal.'
          }));
        }, 1000);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error creating ordinal:', error);
      
      let errorMessage = 'Failed to create ordinal';
      
      if (error instanceof Error) {
        if (error.message.includes('too many function arguments')) {
          errorMessage = 'Transaction too complex. Try reducing image sizes or removing one image.';
        } else if (error.message.includes('too large')) {
          errorMessage = error.message;
        } else if (error.message.includes('Insufficient funds')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setStatus({ 
        type: 'error', 
        message: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
        <h2 className="text-xl font-semibold text-white">1Sat Ordinals Creator</h2>
        <p className="text-sm text-gray-300 mt-1">Create text, image, or profile inscriptions on BSV</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Create Inscription
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'view'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            View My Inscriptions
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div>
          {/* Status Message */}
          {status.type && (
            <div className={`mb-4 p-3 rounded-lg ${
              status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
              status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
              'bg-blue-900 bg-opacity-50 text-blue-300'
            }`}>
              {status.message}
              {lastTxid && status.type === 'success' && (
                <div className="mt-2 space-y-1">
                  <a 
                    href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${lastTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-sm block"
                  >
                    View Transaction →
                  </a>
                  <a 
                    href={`https://1satordinals.com/inscription/${lastTxid}_0`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline text-sm block"
                  >
                    View on 1SatOrdinals →
                  </a>
                </div>
              )}
              {status.type === 'error' && status.message.includes('clipboard') && (
                <div className="mt-3 p-2 bg-gray-800 rounded">
                  <p className="text-xs text-gray-300 mb-2">Broadcast manually:</p>
                  <a 
                    href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/broadcast`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    Open WhatsOnChain Broadcast
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <div className="space-y-4">
              {/* Inscription Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Inscription Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInscriptionType('text')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inscriptionType === 'text'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    📝 Text
                  </button>
                  <button
                    onClick={() => setInscriptionType('image')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inscriptionType === 'image'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    🖼️ Image
                  </button>
                  <button
                    onClick={() => setInscriptionType('profile')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inscriptionType === 'profile'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    👤 Profile
                  </button>
                  <button
                    onClick={() => setInscriptionType('profile2')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inscriptionType === 'profile2'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    🖼️ Profile2
                  </button>
                </div>
              </div>

              {/* Encryption Level Selection */}
              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Encryption Level</label>
                  <button
                    onClick={() => setShowEncryptionOptions(!showEncryptionOptions)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {showEncryptionOptions ? 'Hide' : 'Show'} Options
                  </button>
                </div>
                
                {!blogKeyHistory.current && encryptionLevel > 0 && (
                  <div className="mb-2 p-2 bg-yellow-900 bg-opacity-50 rounded text-xs text-yellow-300">
                    ⚠️ No blog key found. Generate one in the Wallet section first.
                  </div>
                )}
                
                <div className={`grid grid-cols-3 gap-2 ${showEncryptionOptions ? '' : 'mb-0'}`}>
                  {([0, 1, 2, 3, 4, 5] as EncryptionLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setEncryptionLevel(level)}
                      disabled={level > 0 && !blogKeyHistory.current}
                      className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                        encryptionLevel === level
                          ? `bg-${getEncryptionLevelColor(level)}-600 text-white`
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                      style={{
                        backgroundColor: encryptionLevel === level 
                          ? {
                              0: '#6B7280',
                              1: '#F59E0B',
                              2: '#EAB308',
                              3: '#6366F1',
                              4: '#A855F7',
                              5: '#EF4444'
                            }[level]
                          : undefined
                      }}
                    >
                      Level {level}
                    </button>
                  ))}
                </div>
                
                {showEncryptionOptions && (
                  <div className="mt-3 text-xs text-gray-400 space-y-1">
                    <p className="font-medium text-gray-300">Selected: {getEncryptionLevelLabel(encryptionLevel)}</p>
                    {encryptionLevel > 0 && (
                      <>
                        <p>• Only contacts with level {encryptionLevel} access or higher can decrypt</p>
                        <p>• Uses {Math.floor(64 * encryptionLevel / 5)} characters of your blog key</p>
                        <p>• Adds ~10% size overhead to inscription</p>
                        {inscriptionType === 'image' && <p className="text-yellow-400">• Images above 4.9MB will be compressed to 4.9MB</p>}
                        {inscriptionType === 'profile' && <p className="text-yellow-400">• Images above 3.7MB will be compressed to 3.7MB</p>}
                        {inscriptionType === 'profile2' && <p className="text-yellow-400">• Images above 1.7MB will be compressed to 1.7MB each</p>}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Side by Side Layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left Side - Original Data Input */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Original Data</h3>
                  
                  {/* Text Input */}
                  {inscriptionType === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Text Message</label>
                      <textarea
                        value={textData}
                        onChange={(e) => setTextData(e.target.value)}
                        placeholder="Enter your message..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                        rows={4}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {textData.length} characters ({new TextEncoder().encode(textData).length} bytes)
                      </p>
                    </div>
                  )}

                  {/* Image Upload */}
                  {inscriptionType === 'image' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Select Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                      >
                        {imagePreview ? (
                          <div className="text-center">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="max-h-32 mx-auto rounded mb-2"
                            />
                            <p className="text-sm text-gray-400">
                              {imageFile?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Size: {((imageFile?.size || 0) / 1024).toFixed(0)}KB
                            </p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-400">Click to upload image</p>
                            <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                          </div>
                        )}
                      </label>
                    </div>
                  )}

                  {/* Profile Form */}
                  {(inscriptionType === 'profile' || inscriptionType === 'profile2') && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                        <input
                          type="text"
                          value={profileData.username}
                          onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                          placeholder="satoshi"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                        <input
                          type="text"
                          value={profileData.title}
                          onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                          placeholder="Bitcoin Creator"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                        <textarea
                          value={profileData.bio}
                          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                          placeholder="Building peer-to-peer electronic cash..."
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                          rows={3}
                        />
                      </div>
                      
                      {/* Profile Images */}
                      <div className={inscriptionType === 'profile2' ? 'grid grid-cols-2 gap-2' : ''}>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            {inscriptionType === 'profile2' ? 'Avatar' : 'Profile Image'}
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleProfileImageSelect(e, false)}
                            className="hidden"
                            id="profile-avatar-upload"
                          />
                          <label
                            htmlFor="profile-avatar-upload"
                            className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                          >
                            {profileImagePreview ? (
                              <div className="text-center">
                                <img
                                  src={profileImagePreview}
                                  alt="Profile preview"
                                  className="w-16 h-16 mx-auto rounded-full object-cover mb-1"
                                />
                                <p className="text-xs text-gray-400">
                                  {((profileImageFile?.size || 0) / 1024).toFixed(0)}KB
                                </p>
                              </div>
                            ) : (
                              <div className="text-center">
                                <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <p className="text-xs text-gray-400">Upload</p>
                              </div>
                            )}
                          </label>
                        </div>

                        {inscriptionType === 'profile2' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Background</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleProfileImageSelect(e, true)}
                              className="hidden"
                              id="profile-background-upload"
                            />
                            <label
                              htmlFor="profile-background-upload"
                              className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                            >
                              {backgroundImagePreview ? (
                                <div className="text-center">
                                  <img
                                    src={backgroundImagePreview}
                                    alt="Background preview"
                                    className="w-full h-16 mx-auto object-cover rounded mb-1"
                                  />
                                  <p className="text-xs text-gray-400">
                                    {((backgroundImageFile?.size || 0) / 1024).toFixed(0)}KB
                                  </p>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <p className="text-xs text-gray-400">Upload</p>
                                </div>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Wallet Info */}
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Address:</span>
                      <span className="text-gray-300 font-mono text-xs">
                        {keyData.address ? `${keyData.address.substring(0, 12)}...${keyData.address.substring(keyData.address.length - 8)}` : 'Not connected'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span className="text-gray-400">Balance:</span>
                      <span className="text-gray-300">{balance.confirmed.toLocaleString()} sats</span>
                    </div>
                    {blogKeyHistory.current && (
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-gray-400">Blog Key:</span>
                        <span className="text-gray-300">
                          {blogKeyHistory.current.version} 
                          <span className="text-gray-500 ml-1">({blogKeyHistory.current.fullKey.substring(0, 8)}...)</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Non-encrypted Create Button */}
                  {encryptionLevel === 0 && (
                    <button
                      onClick={createOrdinal}
                      disabled={loading || !keyData.privateKey || balance.confirmed < 500 || 
                        (inscriptionType === 'image' && !imageFile) ||
                        (inscriptionType === 'profile2' && !profileImageFile && !backgroundImageFile) ||
                        (Date.now() - lastTransactionTime < 5000)}
                      className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating Inscription...' : 
                       (Date.now() - lastTransactionTime < 5000) ? 
                        `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
                        `Create ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`}
                    </button>
                  )}
                </div>

                {/* Right Side - Encrypted Data Display */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">
                    {encryptionLevel > 0 ? 'Encrypted Data' : 'Preview'}
                  </h3>
                  
                  {/* Encrypted Data Display */}
                  {encryptionLevel > 0 ? (
                    <div className="h-full">
                      {isEncrypting ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                          <span className="ml-2 text-gray-300">Encrypting...</span>
                        </div>
                      ) : encryptedData ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-400">Encrypted Data</span>
                              <span className={`text-xs px-2 py-1 rounded bg-${getEncryptionLevelColor(encryptionLevel)}-600 text-white`}
                                style={{
                                  backgroundColor: {
                                    0: '#6B7280',
                                    1: '#F59E0B',
                                    2: '#EAB308',
                                    3: '#6366F1',
                                    4: '#A855F7',
                                    5: '#EF4444'
                                  }[encryptionLevel]
                                }}
                              >
                                Level {encryptionLevel}
                              </span>
                            </div>
                            <pre className="text-xs font-mono text-green-400 break-all max-h-64 overflow-y-auto">
                              {encryptedData.substring(0, 500)}
                              {encryptedData.length > 500 && '...'}
                            </pre>
                          </div>
                          
                          <div className="p-3 bg-gray-800 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Encrypted Size:</span>
                              <span className="text-gray-300">
                                {(encryptedSize / 1024).toFixed(2)} KB
                                {encryptedSize > 1024 * 1024 && ` (${(encryptedSize / 1024 / 1024).toFixed(2)} MB)`}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Est. Transaction Size:</span>
                              <span className="text-gray-300">
                                {(() => {
                                  const { estimatedSize } = calculateTransactionFee(1, 2, encryptedSize, currentFeeRate);
                                  return `${(estimatedSize / 1024 / 1024).toFixed(2)} MB / 5.0 MB`;
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Estimated Fee:</span>
                              <span className="text-gray-300">
                                {(() => {
                                  const { fee } = calculateTransactionFee(1, 2, encryptedSize, currentFeeRate);
                                  return `${fee.toLocaleString()} sats`;
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Access Level:</span>
                              <span className="text-gray-300">{getEncryptionLevelLabel(encryptionLevel)}</span>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-indigo-900 bg-opacity-30 rounded-lg border border-indigo-700">
                            <p className="text-xs text-indigo-300">
                              🔒 This data will be encrypted on-chain. Only holders of your blog key with level {encryptionLevel} access or higher can decrypt it.
                            </p>
                          </div>

                          {/* Create Encrypted Ordinal Button */}
                          <button
                            onClick={createOrdinal}
                            disabled={loading || !keyData.privateKey || balance.confirmed < 500 || !encryptedData ||
                              (Date.now() - lastTransactionTime < 5000) || !blogKeyHistory.current}
                            className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Creating Encrypted Inscription...' : 
                             (Date.now() - lastTransactionTime < 5000) ? 
                              `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
                              `Create Encrypted ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 text-gray-500">
                          <p className="text-sm">Enter data to see encrypted preview</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Non-encrypted preview
                    <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">Data Preview (Unencrypted)</p>
                      {inscriptionType === 'text' && textData && (
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">{textData}</pre>
                      )}
                      {inscriptionType === 'image' && imagePreview && (
                        <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                      )}
                      {(inscriptionType === 'profile' || inscriptionType === 'profile2') && (
                        <div className="text-sm text-gray-300 space-y-1">
                          <p><span className="text-gray-400">Username:</span> {profileData.username || 'Not set'}</p>
                          <p><span className="text-gray-400">Title:</span> {profileData.title || 'Not set'}</p>
                          <p><span className="text-gray-400">Bio:</span> {profileData.bio || 'Not set'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Status */}
              {lastTransactionTime > 0 && (
                <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
                  <p className="text-xs text-yellow-300">
                    ⚠️ <strong>Important:</strong> Wait for your previous transaction to be picked up by miners before creating another ordinal. 
                    BSV transactions need time to propagate through the network.
                  </p>
                  {Date.now() - lastTransactionTime < 30000 && (
                    <p className="text-xs text-gray-300 mt-1">
                      Last transaction: {Math.floor((Date.now() - lastTransactionTime) / 1000)} seconds ago
                    </p>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
                <h4 className="text-sm font-medium text-blue-300 mb-1">💡 Tips:</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Text inscriptions: ~1 sat minimum</li>
                  <li>• Image fees: ~1 sat per KB</li>
                  <li>• 1MB image: ~1,000 sats</li>
                  <li>• Max transaction size: 5MB total</li>
                  <li>• Safe data size: ~4.5MB (leaves room for overhead)</li>
                  <li>• Profile with images stores full data on-chain</li>
                  <li>• Profile2 supports avatar + background</li>
                  <li>• BSV fee rate: {currentFeeRate} sat/KB</li>
                  <li className="text-indigo-300">• Encryption adds ~10% size overhead</li>
                  <li className="text-indigo-300">• Higher levels = more exclusive access</li>
                  {encryptionLevel > 0 && (
                    <>
                      <li className="text-yellow-300">• Encrypted images are auto-compressed:</li>
                      <li className="text-yellow-300">  - Image tab: 4.9MB max</li>
                      <li className="text-yellow-300">  - Profile tab: 3.7MB max</li>
                      <li className="text-yellow-300">  - Profile2 tab: 1.7MB max per image</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // View inscriptions tab
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
          {loadingInscriptions ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <p className="text-gray-300 mt-2">Loading inscriptions...</p>
            </div>
          ) : inscriptionError ? (
            <div className="text-center py-8">
              <p className="text-red-400">{inscriptionError}</p>
              <button
                onClick={fetchInscriptions}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Retry
              </button>
            </div>
          ) : inscriptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No inscriptions found for this address</p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Create Your First Inscription
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">
                  Your Inscriptions ({inscriptions.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={fetchInscriptions}
                    disabled={loadingInscriptions}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    {loadingInscriptions ? '🔄 Loading...' : '🔄 Refresh'}
                  </button>
                </div>
              </div>

              {/* Inscription Type Filter */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {['all', 'text', 'image', 'profile', 'profile2'].map((type) => {
                  const count = type === 'all' 
                    ? inscriptions.length 
                    : inscriptions.filter(i => i.inscriptionType === type).length;
                  
                  return (
                    <button
                      key={type}
                      onClick={() => setInscriptionFilter(type as any)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        inscriptionFilter === type
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Inscriptions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredInscriptions().map((inscription) => (
                  <div
                    key={inscription.origin}
                    className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer relative"
                    onClick={() => fetchInscriptionContent(inscription)}
                  >
                    {/* Encryption Badge */}
                    {inscription.encrypted && (
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium bg-${getEncryptionLevelColor(inscription.encryptionLevel || 0)}-600 text-white`}
                        style={{
                          backgroundColor: {
                            0: '#6B7280',
                            1: '#F59E0B',
                            2: '#EAB308',
                            3: '#6366F1',
                            4: '#A855F7',
                            5: '#EF4444'
                          }[inscription.encryptionLevel || 0]
                        }}
                      >
                        🔒 L{inscription.encryptionLevel}
                      </div>
                    )}

                    {/* Inscription Preview */}
                    <div className="mb-3">
                      {inscription.inscriptionType === 'image' ? (
                        <div className="h-32 bg-gray-900 rounded flex flex-col items-center justify-center">
                          <span className="text-4xl mb-2">🖼️</span>
                          <span className="text-xs text-gray-400">
                            Image Inscription
                            {inscription.encrypted && ' (Encrypted)'}
                          </span>
                        </div>
                      ) : inscription.inscriptionType === 'profile' || inscription.inscriptionType === 'profile2' ? (
                        <div className="h-32 bg-gray-900 rounded p-3">
                          {inscription.encrypted && (!inscription.content || inscription.content.encrypted) ? (
                            <div className="text-center h-full flex flex-col items-center justify-center">
                              <span className="text-2xl mb-2">🔒</span>
                              <p className="text-xs text-gray-400">Encrypted Profile</p>
                              <p className="text-xs text-gray-500">Level {inscription.encryptionLevel} access required</p>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-300">
                              <p className="font-medium text-white">
                                {inscription.content?.username || 'Profile'}
                              </p>
                              <p className="text-xs mt-1">{inscription.content?.title}</p>
                              <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                                {inscription.content?.bio}
                              </p>
                              {inscription.inscriptionType === 'profile2' && inscription.content?.background && (
                                <span className="text-xs text-purple-400">📸 Has background</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : inscription.inscriptionType === 'text' ? (
                        <div className="h-32 bg-gray-900 rounded p-3">
                          {inscription.encrypted && (!inscription.content || inscription.content.encrypted) ? (
                            <div className="text-center h-full flex flex-col items-center justify-center">
                              <span className="text-2xl mb-2">🔒</span>
                              <p className="text-xs text-gray-400">Encrypted Text</p>
                              <p className="text-xs text-gray-500">Level {inscription.encryptionLevel} access required</p>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-gray-400 mb-1">📝 Text</p>
                              <p className="text-sm text-gray-300 line-clamp-4">
                                {inscription.content || 'Text inscription'}
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="h-32 bg-gray-900 rounded flex items-center justify-center">
                          <span className="text-gray-400">Unknown type</span>
                        </div>
                      )}
                    </div>

                    {/* Inscription Info */}
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-gray-400">
                        {inscription.txid.substring(0, 8)}...{inscription.txid.substring(inscription.txid.length - 6)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {inscription.timestamp.toLocaleDateString()} {inscription.timestamp.toLocaleTimeString()}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {inscription.inscriptionType}
                        </span>
                        <span className="text-xs text-gray-400">
                          ~{(inscription.size / 1024).toFixed(1)}KB
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Inscription Modal */}
              {selectedInscription && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
                  onClick={() => {
                    setSelectedInscription(null);
                    setInscriptionContent(null);
                  }}
                >
                  <div 
                    className="bg-gray-800 rounded-lg max-w-3xl max-h-[90vh] overflow-auto p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-medium text-white">
                        Inscription Details
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedInscription(null);
                          setInscriptionContent(null);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    {loadingContent ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                    ) : (
                      <div>
                        {/* Encryption Status */}
                        {selectedInscription.encrypted && (
                          <div className={`mb-4 p-3 rounded-lg bg-${getEncryptionLevelColor(selectedInscription.encryptionLevel || 0)}-900 bg-opacity-50`}>
                            <p className="text-sm font-medium text-white">
                              🔒 Encrypted Content - {getEncryptionLevelLabel(selectedInscription.encryptionLevel || 0)}
                            </p>
                            {inscriptionContent?.error ? (
                              <p className="text-xs text-gray-300 mt-1">{inscriptionContent.error}</p>
                            ) : (
                              <p className="text-xs text-gray-300 mt-1">Successfully decrypted with your blog key</p>
                            )}
                          </div>
                        )}

                        {/* Content Display */}
                        {inscriptionContent?.error ? (
                          <div className="bg-gray-900 p-4 rounded mb-4">
                            <p className="text-red-400">{inscriptionContent.error}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              You need level {inscriptionContent.requiredLevel} access to decrypt this content.
                            </p>
                          </div>
                        ) : (
                          <>
                            {selectedInscription.inscriptionType === 'image' && inscriptionContent && (
                              <div className="bg-gray-900 p-4 rounded mb-4">
                                <p className="text-gray-300">{inscriptionContent.message}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  Image data is embedded in the transaction. View on blockchain explorer for full data.
                                </p>
                              </div>
                            )}
                            
                            {selectedInscription.inscriptionType === 'text' && inscriptionContent && !inscriptionContent.error && (
                              <pre className="bg-gray-900 p-4 rounded mb-4 whitespace-pre-wrap text-gray-300 text-sm">
                                {typeof inscriptionContent === 'string' ? inscriptionContent : JSON.stringify(inscriptionContent, null, 2)}
                              </pre>
                            )}
                            
                            {(selectedInscription.inscriptionType === 'profile' || 
                              selectedInscription.inscriptionType === 'profile2') && inscriptionContent && !inscriptionContent.error && (
                              <div className="bg-gray-900 p-4 rounded mb-4">
                                {inscriptionContent.avatar && (
                                  <img 
                                    src={inscriptionContent.avatar} 
                                    alt="Avatar" 
                                    className="w-24 h-24 rounded-full mb-4"
                                  />
                                )}
                                <h4 className="text-lg font-medium text-white">{inscriptionContent.username}</h4>
                                <p className="text-gray-300">{inscriptionContent.title}</p>
                                <p className="text-gray-400 mt-2">{inscriptionContent.bio}</p>
                                {inscriptionContent.background && (
                                  <img 
                                    src={inscriptionContent.background} 
                                    alt="Background" 
                                    className="w-full h-32 object-cover rounded mt-4"
                                  />
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Transaction Details */}
                        <div className="border-t border-gray-700 pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">TXID:</span>
                            <a
                              href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${selectedInscription.txid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                            >
                              {selectedInscription.txid.substring(0, 16)}...
                            </a>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Output:</span>
                            <span className="text-gray-300">{selectedInscription.vout}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Type:</span>
                            <span className="text-gray-300">
                              {selectedInscription.inscriptionType}
                              {selectedInscription.encrypted && ' (encrypted)'}
                            </span>
                          </div>
                          {selectedInscription.encrypted && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Encryption Level:</span>
                              <span className="text-gray-300">
                                Level {selectedInscription.encryptionLevel} - {getEncryptionLevelLabel(selectedInscription.encryptionLevel || 0)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Size:</span>
                            <span className="text-gray-300">~{(selectedInscription.size / 1024).toFixed(2)}KB</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Created:</span>
                            <span className="text-gray-300">{selectedInscription.timestamp.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <a
                            href={`https://1satordinals.com/inscription/${selectedInscription.origin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                          >
                            View on 1SatOrdinals
                          </a>
                          <a
                            href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${selectedInscription.txid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                          >
                            View Transaction
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
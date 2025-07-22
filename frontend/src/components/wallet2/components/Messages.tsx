import React, { useState } from 'react';
import { PublicKey, Utils, SymmetricKey, Hash } from '@bsv/sdk';
import { useWalletStore } from '../store/WalletStore';

export const Messages: React.FC = () => {
  const [messageText, setMessageText] = useState<string>('');
  const [encryptedMessage, setEncryptedMessage] = useState<string>('');
  const [decryptedMessage, setDecryptedMessage] = useState<string>('');
  const [messageError, setMessageError] = useState<string>('');

  // 1933 Decoder states
  const [transactionData, setTransactionData] = useState<string>('');
  const [extractedHex, setExtractedHex] = useState<string>('');
  const [decoderError, setDecoderError] = useState<string>('');
  const [sharedSecretFor1933, setSharedSecretFor1933] = useState<string>('');
  const [decoded1933Message, setDecoded1933Message] = useState<string>('');
  const [showDecryptSection, setShowDecryptSection] = useState<boolean>(false);
  
  // Inscription Decoder states
  const [inscriptionJson, setInscriptionJson] = useState<string>('');
  const [decryptionKey, setDecryptionKey] = useState<string>('');
  const [inscriptionError, setInscriptionError] = useState<string>('');
  const [decryptedInscription, setDecryptedInscription] = useState<string>('');
  const [inscriptionMetadata, setInscriptionMetadata] = useState<any>(null);
  const [decryptedImage, setDecryptedImage] = useState<string>(''); // Add state for decrypted images
  const [decryptedBackgroundImage, setDecryptedBackgroundImage] = useState<string>(''); // Add state for background images
  const [decryptedContentType, setDecryptedContentType] = useState<'text' | 'image' | 'profile' | null>(null);
  const [decryptionProgress, setDecryptionProgress] = useState<string>(''); // Progress indicator for large files

  const {
    keyData,
    contacts,
    selectedContactId,
    setSelectedContactId
  } = useWalletStore();

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
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

  // Extract 1933 message from transaction data
  const extract1933Message = () => {
    if (!transactionData.trim()) {
      setDecoderError('Please enter transaction data to analyze');
      setShowDecryptSection(false);
      return;
    }

    try {
      // Look for "1933" in the data
      const prefix = '1933';
      const prefixIndex = transactionData.indexOf(prefix);
      
      if (prefixIndex === -1) {
        setDecoderError('No "1933" prefix found in the transaction data');
        setShowDecryptSection(false);
        setExtractedHex('');
        return;
      }
      
      // Extract everything after "1933"
      let remainingData = transactionData.substring(prefixIndex + 4);
      
      // Clean up the data - remove any non-hex characters that might follow
      const hexMatch = remainingData.match(/^[0-9a-fA-F]+/);
      
      if (!hexMatch) {
        setDecoderError('No valid hex data found after "1933" prefix');
        setShowDecryptSection(false);
        setExtractedHex('');
        return;
      }
      
      const extracted = hexMatch[0];
      setExtractedHex(extracted);
      setDecoderError('');
      setShowDecryptSection(true);
      setDecoded1933Message('');
      
    } catch (error) {
      setDecoderError('Error processing data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setShowDecryptSection(false);
      setExtractedHex('');
    }
  };

  // Decrypt 1933 message with shared secret
  const decrypt1933Message = () => {
    if (!sharedSecretFor1933.trim()) {
      setDecoderError('Please enter your ECDH shared secret');
      return;
    }
    
    if (!extractedHex) {
      setDecoderError('No encrypted data to decrypt. Please extract a message first');
      return;
    }
    
    try {
      // Convert shared secret and encrypted data to arrays
      const sharedSecretArray = Utils.toArray(sharedSecretFor1933.trim(), 'hex');
      const encryptedArray = Utils.toArray(extractedHex, 'hex');
      
      // Create symmetric key from SHA256 of shared secret
      const symmetricKey = new SymmetricKey(Hash.sha256(sharedSecretArray));
      
      // Decrypt the message
      const decrypted = symmetricKey.decrypt(encryptedArray, 'utf8');
      
      setDecoded1933Message(decrypted);
      setDecoderError('');
      
    } catch (error) {
      setDecoderError('Decryption failed: ' + (error instanceof Error ? error.message : 'The encoded data was not valid'));
      setDecoded1933Message('');
    }
  };

  // Blog Encryption utilities (Web Crypto API)
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

    static async decrypt(encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
      try {
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
      } catch (error) {
        console.error('Decryption error details:', error);
        throw error;
      }
    }
  }

  // Decrypt inscription from JSON transaction
  const decryptInscription = async () => {
    if (!inscriptionJson.trim()) {
      setInscriptionError('Please paste a transaction JSON');
      return;
    }
    
    if (!decryptionKey.trim()) {
      setInscriptionError('Please enter a decryption key');
      return;
    }

    try {
      // Parse the JSON transaction
      let transaction;
      try {
        transaction = JSON.parse(inscriptionJson);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        setInscriptionError('Invalid JSON format. Please check that you\'ve pasted valid JSON.');
        return;
      }
      
      // Look for the inscription in vout[0].scriptPubKey
      const scriptHex = transaction.vout?.[0]?.scriptPubKey?.hex;
      if (!scriptHex) {
        console.error('Transaction structure:', transaction);
        setInscriptionError('No inscription found in vout[0]. Transaction structure may be incorrect.');
        return;
      }

      console.log('Script hex length:', scriptHex.length);
      console.log('Script hex preview:', scriptHex.substring(0, 100) + '...');

      // Extract JSON content from hex
      // Look for application/json marker: 6170706c69636174696f6e2f6a736f6e
      const jsonMarker = '6170706c69636174696f6e2f6a736f6e';
      const jsonIndex = scriptHex.indexOf(jsonMarker);
      
      if (jsonIndex === -1) {
        console.error('No JSON marker found in script hex');
        setInscriptionError('No JSON inscription found in transaction. Looking for marker: ' + jsonMarker);
        return;
      }

      console.log('JSON marker found at index:', jsonIndex);

      // Find the JSON data after the marker
      let dataStart = jsonIndex + jsonMarker.length;
      
      // Skip over protocol bytes
      // Common patterns: 0100, 014c, 01bc, 4cbc, etc.
      let skippedBytes = '';
      while (dataStart < scriptHex.length && !scriptHex.substring(dataStart, dataStart + 2).match(/7b/)) {
        skippedBytes += scriptHex.substring(dataStart, dataStart + 2);
        dataStart += 2;
        
        // Safety check to prevent infinite loop
        if (skippedBytes.length > 20) {
          console.error('Could not find JSON start after skipping:', skippedBytes);
          break;
        }
      }
      
      console.log('Skipped bytes:', skippedBytes);
      console.log('JSON data starts at index:', dataStart);

      // Extract the JSON hex - look for the ending pattern
      let jsonHex = '';
      let extractedLength = 0;
      const maxExtractLength = 10000000; // 10MB hex chars (5MB actual data)
      
      // For large files, we need to handle the data more carefully
      setDecryptionProgress('Extracting inscription data...');
      
      for (let i = dataStart; i < scriptHex.length && extractedLength < maxExtractLength; i += 2) {
        const byte = scriptHex.substring(i, i + 2);
        const nextByte = i + 2 < scriptHex.length ? scriptHex.substring(i + 2, i + 4) : '';
        
        // Check for end markers
        if (byte === '01' && nextByte === '68') {
          console.log('Found end marker 0168 at position:', i);
          break;
        }
        
        // Also check if we're at the very end
        if (i + 4 >= scriptHex.length) {
          const remaining = scriptHex.substring(i);
          if (remaining === '0168' || remaining === '68') {
            console.log('Found end marker at end of script');
            break;
          }
        }
        
        jsonHex += byte;
        extractedLength++;
        
        // For very large inscriptions, log progress
        if (extractedLength % 10000 === 0) {
          const progressPercent = Math.min(100, (i - dataStart) / (scriptHex.length - dataStart) * 100);
          setDecryptionProgress(`Extracting data... ${progressPercent.toFixed(1)}%`);
          console.log(`Extracted ${extractedLength} bytes so far...`);
          
          // Allow UI to update
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      console.log('Extracted JSON hex length:', jsonHex.length, 'characters (', jsonHex.length / 2, 'bytes)');
      
      if (extractedLength >= maxExtractLength) {
        console.warn('Reached maximum extraction length. Data may be truncated.');
        setInscriptionError('Warning: Large inscription may be truncated at 5MB limit');
      }

      // Convert hex to string in chunks for large data
      setDecryptionProgress('Converting data...');
      let jsonStr = '';
      const chunkSize = 10000; // Process 5KB at a time
      
      try {
        for (let i = 0; i < jsonHex.length; i += chunkSize) {
          const chunk = jsonHex.substring(i, Math.min(i + chunkSize, jsonHex.length));
          let chunkStr = '';
          
          for (let j = 0; j < chunk.length; j += 2) {
            chunkStr += String.fromCharCode(parseInt(chunk.substr(j, 2), 16));
          }
          
          jsonStr += chunkStr;
          
          if (i % 100000 === 0 && i > 0) {
            const progressPercent = (i / jsonHex.length * 100);
            setDecryptionProgress(`Converting data... ${progressPercent.toFixed(1)}%`);
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      } catch (convError) {
        console.error('Error converting hex to string:', convError);
        setInscriptionError('Failed to convert hex data to string. Data may be corrupted.');
        return;
      }

      console.log('Extracted JSON string length:', jsonStr.length);
      console.log('JSON string preview:', jsonStr.substring(0, 200) + '...');

      // Parse the extracted JSON
      let inscriptionData;
      try {
        inscriptionData = JSON.parse(jsonStr);
      } catch (jsonError) {
        console.error('Error parsing inscription JSON:', jsonError);
        console.error('Failed JSON string:', jsonStr.substring(0, 500));
        setInscriptionError('Failed to parse inscription JSON. The data may be truncated or corrupted.');
        return;
      }
      
      if (!inscriptionData.encrypted || !inscriptionData.data || !inscriptionData.metadata) {
        console.error('Invalid inscription format:', inscriptionData);
        setInscriptionError('This inscription is not encrypted or has invalid format. Expected fields: encrypted, data, metadata');
        return;
      }

      setInscriptionMetadata(inscriptionData.metadata);
      console.log('Inscription metadata:', inscriptionData.metadata);
      console.log('Encrypted data length:', inscriptionData.data.length);

      // Use the key as provided
      const keySegment = decryptionKey.trim();
      console.log('Using key segment:', keySegment, 'Length:', keySegment.length);

      // For level 1, the key should be approximately 13 characters
      if (inscriptionData.metadata.level === 1 && keySegment.length < 12) {
        console.warn('Key segment seems too short for level 1. Expected ~13 characters, got:', keySegment.length);
      }

      // Derive encryption key
      const encryptionKey = await BlogEncryption.deriveEncryptionKey(keySegment);
      
      // Convert base64 encrypted data to ArrayBuffer
      const encryptedData = inscriptionData.data;
      console.log('Encrypted data (base64) length:', encryptedData.length);
      
      let bytes;
      try {
        const binaryString = atob(encryptedData);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } catch (base64Error) {
        console.error('Error decoding base64:', base64Error);
        setInscriptionError('Failed to decode base64 encrypted data.');
        return;
      }
      
      console.log('Encrypted bytes length:', bytes.length);
      
      // Convert hex IV to Uint8Array
      const ivHex = inscriptionData.metadata.iv;
      console.log('IV hex:', ivHex);
      
      if (!ivHex || ivHex.length % 2 !== 0) {
        setInscriptionError('Invalid IV in metadata');
        return;
      }
      
      const iv = new Uint8Array(ivHex.match(/.{2}/g).map((byte: string) => parseInt(byte, 16)));
      console.log('IV array:', Array.from(iv));
      
      // Decrypt the data
      setDecryptionProgress('Decrypting data...');
      console.log('Attempting decryption...');
      const decryptedStr = await BlogEncryption.decrypt(bytes.buffer, encryptionKey, iv);
      console.log('Decryption successful! Decrypted length:', decryptedStr.length);
      
      // Handle different content types
      let displayContent = decryptedStr;
      setDecryptedImage(''); // Reset image state
      setDecryptedBackgroundImage(''); // Reset background image state
      setDecryptedContentType(null);
      setDecryptionProgress('Processing decrypted content...');
      
      if (inscriptionData.originalType === 'profile' || inscriptionData.originalType === 'profile2') {
        try {
          const profileData = JSON.parse(decryptedStr);
          displayContent = `Profile: ${profileData.username}\nTitle: ${profileData.title}\nBio: ${profileData.bio}`;
          if (profileData.timestamp) {
            displayContent += `\nCreated: ${new Date(profileData.timestamp).toLocaleString()}`;
          }
          
          // If profile has avatar, display it
          if (profileData.avatar && profileData.avatar.startsWith('data:')) {
            console.log('Profile has avatar image');
            setDecryptedImage(profileData.avatar);
          }
          
          // Handle Profile2 background image
          if (profileData.background && profileData.background.startsWith('data:') && inscriptionData.originalType === 'profile2') {
            console.log('Profile2 has background image');
            setDecryptedBackgroundImage(profileData.background);
            displayContent += '\n\n[Profile includes avatar and background images]';
          }
          
          setDecryptedContentType('profile');
        } catch {
          // If not valid JSON, display as is
          setDecryptedContentType('text');
        }
      } else if (inscriptionData.originalType === 'image') {
        try {
          console.log('Processing decrypted image data...');
          const imageData = JSON.parse(decryptedStr);
          console.log('Image metadata:', { name: imageData.name, type: imageData.type, size: imageData.size });
          
          // If the decrypted data contains the actual image
          if (imageData.data) {
            // For large images, handle the base64 data carefully
            const mimeType = imageData.type || 'image/png';
            
            // Check if the data is already a data URL or just base64
            let imageDataUrl;
            if (imageData.data.startsWith('data:')) {
              imageDataUrl = imageData.data;
            } else {
              setDecryptionProgress('Reconstructing image...');
              imageDataUrl = `data:${mimeType};base64,${imageData.data}`;
            }
            
            console.log('Image data URL length:', imageDataUrl.length);
            
            // For very large images, validate the base64
            if (imageDataUrl.length > 1000000) { // > 1MB
              console.log('Large image detected, size:', (imageDataUrl.length / 1024 / 1024).toFixed(2), 'MB');
            }
            
            setDecryptedImage(imageDataUrl);
            
            const sizeInKB = imageData.size ? (imageData.size / 1024).toFixed(2) : 'Unknown';
            const sizeInMB = imageData.size && imageData.size > 1048576 ? ` (${(imageData.size / 1024 / 1024).toFixed(2)} MB)` : '';
            
            displayContent = `Image: ${imageData.name || 'Untitled'}\nType: ${mimeType}\nSize: ${sizeInKB} KB${sizeInMB}`;
            setDecryptedContentType('image');
          } else {
            displayContent = `Image metadata decrypted but no image data found`;
            setDecryptedContentType('text');
          }
        } catch (imgError) {
          console.error('Error processing image data:', imgError);
          // If not valid JSON, might be raw image data
          try {
            // Check if it might be base64 image data
            if (decryptedStr.length > 100) {
              // For large data, check just a sample
              const sample = decryptedStr.substring(0, 1000);
              if (/^[A-Za-z0-9+/]+=*$/.test(sample)) {
                // Assume it's base64 image data
                setDecryptionProgress('Processing raw image data...');
                const imageDataUrl = `data:image/png;base64,${decryptedStr}`;
                setDecryptedImage(imageDataUrl);
                displayContent = `Decrypted image (raw data)\nSize: ${(decryptedStr.length * 0.75 / 1024).toFixed(2)} KB`;
                setDecryptedContentType('image');
              } else {
                setDecryptedContentType('text');
              }
            } else {
              setDecryptedContentType('text');
            }
          } catch {
            setDecryptedContentType('text');
          }
        }
      } else {
        // Plain text
        setDecryptedContentType('text');
      }
      
      setDecryptedInscription(displayContent);
      setInscriptionError('');
      setDecryptionProgress(''); // Clear progress
      
    } catch (error) {
      console.error('Decryption error:', error);
      setDecryptionProgress(''); // Clear progress on error
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes('operation-specific')) {
          setInscriptionError('Decryption failed: Wrong key or corrupted data. Make sure you\'re using the exact key segment that was used for encryption.');
        } else if (error.message.includes('JSON')) {
          setInscriptionError('Failed to parse transaction or inscription data. Please check the format.');
        } else {
          setInscriptionError('Decryption failed: ' + error.message);
        }
      } else {
        setInscriptionError('Decryption failed: Unknown error');
      }
      
      setDecryptedInscription('');
      setDecryptedImage('');
      setDecryptedBackgroundImage('');
      setDecryptedContentType(null);
      setInscriptionMetadata(null);
      setDecryptionProgress('');
    }
  };

  return (
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

      {/* 1933 Message Decoder Section */}
      <div className="mt-6 p-4 bg-purple-900 bg-opacity-20 rounded-lg border border-purple-700">
        <h2 className="text-xl font-semibold mb-4 text-white">🔍 1933 Message Decoder</h2>
        <p className="text-sm text-gray-400 mb-4">Extract and decrypt messages from BSV transactions</p>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-purple-300">Step 1: Input Transaction Data</h3>
          <div className="space-y-3">
            <textarea
              value={transactionData}
              onChange={(e) => setTransactionData(e.target.value)}
              placeholder="Enter the transaction data containing '1933' prefix...

Example formats:
- Full hex string: 1933a70c705c2e4fba25d4aaed3671caf82d...
- OP_RETURN data: 0 OP_RETURN 1933a70c705c2e4fba25d4aaed3671caf82d...
- ASM format: OP_FALSE OP_RETURN 1933a70c705c2e4fba25d4aaed3671caf82d..."
              rows={4}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
            />
            
            <button
              onClick={extract1933Message}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              🔍 Extract Encrypted Message
            </button>
          </div>
        </div>

        {extractedHex && (
          <div className="mb-6 p-4 bg-green-900 bg-opacity-20 border border-green-700 rounded">
            <h4 className="text-sm font-semibold text-green-400 mb-2">✅ Successfully Extracted Encrypted Data!</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <code className="flex-1 p-3 bg-gray-800 rounded text-xs break-all text-green-300 font-mono">
                  {extractedHex}
                </code>
                <button
                  onClick={() => copyToClipboard(extractedHex, 'Extracted Data')}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  title="Copy"
                >
                  📋
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Length: {extractedHex.length} chars ({extractedHex.length/2} bytes)
              </p>
            </div>
          </div>
        )}

        {showDecryptSection && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-purple-300">Step 2: Decrypt Message</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">ECDH Shared Secret (Hex)</label>
                <input
                  type="text"
                  value={sharedSecretFor1933}
                  onChange={(e) => setSharedSecretFor1933(e.target.value)}
                  placeholder="Enter your ECDH shared secret (64 or 66 character hex)..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The shared secret derived from your private key and the contact's public key
                </p>
              </div>
              
              <button
                onClick={decrypt1933Message}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                🔓 Decrypt Message
              </button>
            </div>
          </div>
        )}

        {decoded1933Message && (
          <div className="p-4 bg-blue-900 bg-opacity-20 border border-blue-700 rounded">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">✅ Decryption Complete!</h4>
            <div className="p-3 bg-gray-800 rounded">
              <p className="text-white text-lg">{decoded1933Message}</p>
            </div>
            <button
              onClick={() => copyToClipboard(decoded1933Message, 'Decrypted Message')}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              📋 Copy Message
            </button>
          </div>
        )}

        {decoderError && (
          <div className="p-4 bg-red-900 bg-opacity-20 border border-red-700 rounded">
            <p className="text-red-400 text-sm">{decoderError}</p>
          </div>
        )}
      </div>

      {/* Blog Inscription Decoder Section */}
      <div className="mt-6 p-4 bg-indigo-900 bg-opacity-20 rounded-lg border border-indigo-700">
        <h2 className="text-xl font-semibold mb-4 text-white">🔐 Blog Inscription Decoder</h2>
        <p className="text-sm text-gray-400 mb-4">Decrypt encrypted blog inscriptions from transaction JSON</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Transaction JSON</label>
            <textarea
              value={inscriptionJson}
              onChange={(e) => setInscriptionJson(e.target.value)}
              placeholder='Paste the full transaction JSON here...

Example:
{
  "txid": "...",
  "vout": [
    {
      "scriptPubKey": {
        "hex": "..."
      }
    }
  ]
}'
              rows={8}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Blog Encryption Key</label>
            <input
              type="text"
              value={decryptionKey}
              onChange={(e) => setDecryptionKey(e.target.value)}
              placeholder="Enter the blog key (or key segment) used for encryption..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              For level 3 encryption, you need at least the first 38 characters of the blog key
            </p>
          </div>

          <button
            onClick={decryptInscription}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            🔓 Decrypt Inscription
          </button>
        </div>

        {inscriptionMetadata && (
          <div className="mt-4 p-3 bg-gray-800 rounded">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Encryption Metadata:</h4>
            <div className="text-xs text-gray-400 space-y-1">
              <p>• Algorithm: {inscriptionMetadata.algorithm}</p>
              <p>• Encryption Level: {inscriptionMetadata.level}</p>
              <p>• IV: {inscriptionMetadata.iv}</p>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {decryptionProgress && (
          <div className="mt-4 p-3 bg-blue-900 bg-opacity-20 border border-blue-700 rounded">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
              <p className="text-sm text-blue-300">{decryptionProgress}</p>
            </div>
          </div>
        )}

        {decryptedInscription && (
          <div className="mt-4 p-4 bg-green-900 bg-opacity-20 border border-green-700 rounded">
            <h4 className="text-sm font-semibold text-green-400 mb-2">✅ Successfully Decrypted!</h4>
            
            {/* Display Profile2 background image if available */}
            {decryptedBackgroundImage && decryptedContentType === 'profile' && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-300 mb-2">Background Image:</h5>
                <div className="p-3 bg-gray-800 rounded">
                  <img 
                    src={decryptedBackgroundImage} 
                    alt="Profile background" 
                    className="w-full max-h-64 object-cover rounded"
                    onError={(e) => {
                      console.error('Background image failed to load');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <a
                    href={decryptedBackgroundImage}
                    download={`background-${Date.now()}.png`}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                  >
                    💾 Download Background
                  </a>
                </div>
              </div>
            )}
            
            {/* Display decrypted avatar/main image if available */}
            {decryptedImage && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-300 mb-2">
                  {decryptedContentType === 'profile' ? 'Avatar:' : 'Image:'}
                </h5>
                <div className="p-3 bg-gray-800 rounded">
                  <img 
                    src={decryptedImage} 
                    alt="Decrypted content" 
                    className={`max-w-full mx-auto rounded ${
                      decryptedContentType === 'profile' ? 'max-h-32 w-32 h-32 object-cover rounded-full' : 'max-h-96'
                    }`}
                    onError={(e) => {
                      console.error('Image failed to load');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <a
                    href={decryptedImage}
                    download={`${decryptedContentType === 'profile' ? 'avatar' : 'image'}-${Date.now()}.png`}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    💾 Download {decryptedContentType === 'profile' ? 'Avatar' : 'Image'}
                  </a>
                  <button
                    onClick={() => {
                      const newWindow = window.open();
                      if (newWindow) {
                        newWindow.document.write(`<img src="${decryptedImage}" style="max-width:100%;" />`);
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    🔍 View Full Size
                  </button>
                </div>
              </div>
            )}
            
            {/* Display text content */}
            <div className="p-3 bg-gray-800 rounded">
              <pre className="text-white whitespace-pre-wrap">{decryptedInscription}</pre>
            </div>
            
            {/* Copy button for text content */}
            {decryptedContentType !== 'image' && (
              <button
                onClick={() => copyToClipboard(decryptedInscription, 'Decrypted Inscription')}
                className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                📋 Copy Decrypted Content
              </button>
            )}
            
            {/* Note about large files */}
            {(decryptedImage || decryptedBackgroundImage) && decryptedInscription.includes('MB') && (
              <div className="mt-3 p-2 bg-yellow-900 bg-opacity-30 rounded text-xs text-yellow-300">
                <p>⚠️ Large file detected. If the image doesn't display properly, try downloading it instead.</p>
              </div>
            )}
          </div>
        )}

        {inscriptionError && (
          <div className="mt-4 p-4 bg-red-900 bg-opacity-20 border border-red-700 rounded">
            <p className="text-red-400 text-sm">{inscriptionError}</p>
          </div>
        )}
      </div>

    </div>
  );
};
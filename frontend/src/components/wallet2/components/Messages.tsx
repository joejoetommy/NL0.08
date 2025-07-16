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



    </div>
  );
};
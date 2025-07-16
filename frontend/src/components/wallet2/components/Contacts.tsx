import React, { useState } from 'react';
import { PublicKey } from '@bsv/sdk';
import { useWalletStore } from '../store/WalletStore';
import { getRandomExamplePublicKey } from '../../wallet/data2';

export const Contacts: React.FC = () => {
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactPubKey, setNewContactPubKey] = useState<string>('');
  const [contactError, setContactError] = useState<string>('');
  
  const {
    keyData,
    contacts,
    addContact,
    removeContact
  } = useWalletStore();

  // Add new contact
  const handleAddContact = () => {
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

      const newContact = {
        id: Date.now().toString(),
        name: newContactName.trim(),
        publicKeyHex: pubKey.toString(),
        sharedSecret
      };

      addContact(newContact);
      setNewContactName('');
      setNewContactPubKey('');
      setContactError('');
    } catch (err) {
      setContactError('Invalid public key format');
    }
  };

  const loadExampleContact = () => {
    const example = getRandomExamplePublicKey();
    setNewContactName(example.name);
    setNewContactPubKey(example.publicKey);
  };

  return (
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
              onClick={handleAddContact}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Add Contact
            </button>
            <button
              onClick={loadExampleContact}
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
  );
};
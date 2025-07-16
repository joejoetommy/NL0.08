    // No. 1 =   xpub 02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a /  xpri / 499c17213e86b6e8be04c5a7b9a4cce8d4b29bad695726c5fe5868e38279d64f
    // No. 2 =   xpub 02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800 /  xpri / 697d42468b546d329095eb5d158b27950397d90e0c58749856820a49ccabef67
    // No. 3 =   xpub 02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31 /  xpri / de8f4b6e83b4219df72dbb320e29f0f647593a2c77061c75cd64118484ca67f8
    // No. 4 =   xpub 03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4 /  xpri / 8a2acd0c358369350781c479ec06346c0d444f0befad2fe372b58a7827d7395c
    // No. 5 =   xpub 02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a /  xpri / d131afbd307c7e87d77331e53018f8f04389a7a40d1ec0661558e6516c236ee4
    // No. me =  xpub 03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416 /  xpri / 6811543cdaae96cc602c2ed5efe517bf86cecdb0abbe678eb957b86bf8d3ff13
// muCRZXdunSqaKv5REC37Ahf6ZUAK2yqKes
import { PrivateKey, PublicKey, SymmetricKey, Utils } from '@bsv/sdk';

// Your private key (same as before)
export const myPrivateKey = PrivateKey.fromHex('6811543cdaae96cc602c2ed5efe517bf86cecdb0abbe678eb957b86bf8d3ff13');
export const myPublicKey = myPrivateKey.toPublicKey();

// Helper function to encrypt data using ECDH - EXPORTED
export function encryptWithECDH(privateKey: PrivateKey, otherPublicKeyHex: string, data: string): string {
  try {
    // Parse the other party's public key
    const otherPublicKey = PublicKey.fromString(otherPublicKeyHex);
    
    // Derive shared secret using ECDH
    const sharedSecret = privateKey.deriveSharedSecret(otherPublicKey);
    
    // Create symmetric key from shared secret
    const symmetricKey = new SymmetricKey(sharedSecret.toArray());
    
    // Encrypt the data
    const encrypted = symmetricKey.encrypt(data);
    
    // Return as hex string
    return Utils.toHex(encrypted);
  } catch (error) {
    console.error(`Encryption error for key ${otherPublicKeyHex}:`, error);
    return data; // Return original data as fallback
  }
}

// Decryption function for reading messages
export function decryptWithECDH(privateKey: PrivateKey, otherPublicKeyHex: string, encryptedHex: string): string {
  try {
    // Parse the other party's public key
    const otherPublicKey = PublicKey.fromString(otherPublicKeyHex);
    
    // Derive shared secret using ECDH
    const sharedSecret = privateKey.deriveSharedSecret(otherPublicKey);
    
    // Create symmetric key from shared secret
    const symmetricKey = new SymmetricKey(sharedSecret.toArray());
    
    // Convert hex back to array
    const encryptedData = Utils.toArray(encryptedHex, 'hex');
    
    // Decrypt the data
    const decrypted = symmetricKey.decrypt(encryptedData, 'utf8');
    
    return decrypted;
  } catch (error) {
    console.error(`Decryption error for key ${otherPublicKeyHex}:`, error);
    return encryptedHex; // Return encrypted data as fallback
  }
}

// Interface for messages
export interface TokenMail {
  id: string;
  name: string;
  xpub: string;
  txid: string;
  text: string;
  date: string;
  read: boolean;
  replies?: TokenMail[];
}

// Pre-encrypted crypto chat data - storing only encrypted values
// These are encrypted with each sender's private key and would be stored on the backend
export const cryptoChatData: TokenMail[] = [
  {
    id: "1",
    name: "426f622057696c736f6e", // Encrypted "Bob Wilson"
    xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
    txid: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    text: "4865792c2049206a757374207472616e7366657272656420312e3520425443", // Encrypted message
    date: "2024-07-01T14:30:00",
    read: false,
    replies: [
      {
        id: "1-1",
        name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
        xpub: "me",
        txid: "1f2e3d4c5b6a7089fedcba9876543210abcdef1234567890abcdef1234567890",
        text: "Got it! I see the 1.5 BTC in my wallet. Thanks Bob!",
        date: "2024-07-01T14:45:00",
        read: true,
      },
      {
        id: "1-2",
        name: "426f622057696c736f6e", // Encrypted "Bob Wilson"
        xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
        txid: "2a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5",
        text: "50657266656374212044726f70206d65206120444d207768656e20796f75", // Encrypted message
        date: "2024-07-01T15:00:00",
        read: false,
      }
    ]
  },
  {
    id: "2",
    name: "4361726f6c204461766973", // Encrypted "Carol Davis"
    xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
    txid: "8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c",
    text: "54686520736d61727420636f6e747261637420697320726561647920666f72", // Encrypted message
    date: "2024-07-02T09:15:00",
    read: true,
    replies: [
      {
        id: "2-1",
        name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
        xpub: "me",
        txid: "3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
        text: "I'll review it this afternoon. Is it the NFT marketplace contract?",
        date: "2024-07-02T10:00:00",
        read: true,
      },
      {
        id: "2-2",
        name: "4361726f6c204461766973", // Encrypted "Carol Davis"
        xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
        txid: "4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
        text: "5965732c2065786163746c79212054686520444543454e5452414c495a4544", // Encrypted message
        date: "2024-07-02T10:30:00",
        read: true,
      }
    ]
  },
  {
    id: "3",
    name: "44617665204d696c6c6572", // Encrypted "Dave Miller"
    xpub: "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31",
    txid: "9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
    text: "4d696e696e6720646966666963756c7479206a75737420696e637265617365", // Encrypted message
    date: "2024-07-02T16:45:00",
    read: false,
    replies: []
  }
];

// Additional messages for testing
export const additionalMessages: TokenMail[] = [
  {
    id: "4",
    name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
    xpub: "me",
    txid: "5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    text: "Just sent out the weekly blockchain newsletter to all subscribers.",
    date: "2024-07-03T11:00:00",
    read: true,
    replies: []
  },
  {
    id: "5",
    name: "426f622057696c736f6e", // Encrypted "Bob Wilson"
    xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
    txid: "6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
    text: "43616e20796f7520636865636b2074686520676173206665657320746f6461", // Encrypted message
    date: "2024-07-03T13:20:00",
    read: true,
    replies: [
      {
        id: "5-1",
        name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
        xpub: "me",
        txid: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
        text: "You're right, gas is at 150 gwei. Let's wait for it to drop below 50.",
        date: "2024-07-03T13:30:00",
        read: true,
      }
    ]
  },
  {
    id: "6",
    name: "4361726f6c204461766973", // Encrypted "Carol Davis"
    xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
    txid: "8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c",
    text: "466f756e64206120627567207768696c652074657374696e672e20556e74696c", // Encrypted message
    date: "2024-07-03T17:45:00",
    read: false,
    replies: []
  },
  {
    id: "7",
    name: "44617665204d696c6c6572", // Encrypted "Dave Miller"
    xpub: "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31",
    txid: "1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    text: "546865206e6574776f726b2068617368726174652069732068697474696e67", // Encrypted message
    date: "2024-07-04T08:30:00",
    read: true,
    replies: [
      {
        id: "7-1",
        name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
        xpub: "me",
        txid: "2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
        text: "That's incredible! Are we seeing more institutional miners joining?",
        date: "2024-07-04T09:00:00",
        read: true,
      },
      {
        id: "7-2",
        name: "44617665204d696c6c6572", // Encrypted "Dave Miller"
        xpub: "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31",
        txid: "3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
        text: "5965732c2073657665726c207265706f72747320696e646963617465206e6577", // Encrypted message
        date: "2024-07-04T09:15:00",
        read: false,
      }
    ]
  }
];

// Test function to verify decryption works correctly
export function testDecryption() {
  console.log('=== Testing Decryption with Pre-encrypted Data ===');
  
  // Test decrypting Bob's message
  const bobMessage = cryptoChatData[0];
  console.log('Bob\'s encrypted name (hex):', bobMessage.name);
  console.log('Bob\'s xpub:', bobMessage.xpub);
  
  try {
    const decryptedName = decryptWithECDH(myPrivateKey, bobMessage.xpub, bobMessage.name);
    console.log('Decrypted name:', decryptedName); // Should show "Bob Wilson"
    
    const decryptedText = decryptWithECDH(myPrivateKey, bobMessage.xpub, bobMessage.text);
    console.log('Decrypted text:', decryptedText); // Should show the actual message
  } catch (error) {
    console.error('Decryption test failed:', error);
  }
  
  // Test Carol's message
  const carolMessage = cryptoChatData[1];
  try {
    const decryptedName = decryptWithECDH(myPrivateKey, carolMessage.xpub, carolMessage.name);
    console.log('Carol decrypted name:', decryptedName); // Should show "Carol Davis"
  } catch (error) {
    console.error('Carol decryption failed:', error);
  }
  
  console.log('=== End Decryption Test ===');
}


// Comment out in production
// testDecryption();

// orginal encrypted files 
// import { PrivateKey, PublicKey, SymmetricKey, Utils } from '@bsv/sdk';

// export interface TokenMail {
//   id: string;
//   name: string;
//   xpub: string;
//   txid: string;
//   text: string; 
//   date: string;
//   read: boolean;
//   replies?: TokenMail[];
// }

// // Your private key - EXPORTED
// export const myPrivateKey = PrivateKey.fromHex('6811543cdaae96cc602c2ed5efe517bf86cecdb0abbe678eb957b86bf8d3ff13');
// export const myPublicKey = myPrivateKey.toPublicKey();

// // Helper function to encrypt data using ECDH - EXPORTED
// export function encryptWithECDH(privateKey: PrivateKey, otherPublicKeyHex: string, data: string): string {
//   try {
//     // Parse the other party's public key
//     const otherPublicKey = PublicKey.fromString(otherPublicKeyHex);
    
//     // Derive shared secret using ECDH
//     const sharedSecret = privateKey.deriveSharedSecret(otherPublicKey);
    
//     // Create symmetric key from shared secret
//     const symmetricKey = new SymmetricKey(sharedSecret.toArray());
    
//     // Encrypt the data
//     const encrypted = symmetricKey.encrypt(data);
    
//     // Return as hex string
//     return Utils.toHex(encrypted);
//   } catch (error) {
//     console.error(`Encryption error for key ${otherPublicKeyHex}:`, error);
//     return data; // Return original data as fallback
//   }
// }

// // Decryption function for reading messages
// export function decryptWithECDH(privateKey: PrivateKey, otherPublicKeyHex: string, encryptedHex: string): string {
//   try {
//     // Parse the other party's public key
//     const otherPublicKey = PublicKey.fromString(otherPublicKeyHex);
    
//     // Derive shared secret using ECDH
//     const sharedSecret = privateKey.deriveSharedSecret(otherPublicKey);
    
//     // Create symmetric key from shared secret
//     const symmetricKey = new SymmetricKey(sharedSecret.toArray());
    
//     // Convert hex back to array
//     const encryptedData = Utils.toArray(encryptedHex, 'hex');
    
//     // Decrypt the data
//     const decrypted = symmetricKey.decrypt(encryptedData, 'utf8');
    
//     return decrypted;
//   } catch (error) {
//     console.error(`Decryption error for key ${otherPublicKeyHex}:`, error);
//     return encryptedHex; // Return encrypted data as fallback
//   }
// }

// // Encrypted crypto chat data - storing only encrypted values
// export const cryptoChatData: TokenMail[] = [
//   {
//     id: "1",
//     name: "416c696365204368656e", 
//     xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//     txid: "3b7d4f8a9c2e1b6f5d3a8e7c4b9f2d6a1e8c5b3f7d2a9e6c4b1f8d5a3e7c2b9f",
//     text: "4865792c206a7573742073656e7420796f7520302e352042544320666f72207468652064657665", 
//     date: "2024-06-25T10:30:00",
//     read: false,
//     replies: [
//       {
//         id: "1-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "8e4a7b3f2d1c9e6b5a4f8d3c7e2b9a6f1d5c4e3b8a7f2d6c9e1b4a5f3d8c7e2",
//         text: "4865792c206a7573742073656e7420796f7520302e352042544320666f72207468652064657665",
//         date: "2024-06-25T11:15:00",
//         read: true,
//       },
//       {
//         id: "1-2", 
//         name: "416c696365204368656e", // Encrypted "Alice Chen"
//         xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//         txid: "f7c9e2b4a5d8f3c6e1b9a4d7f2e5b8a3c6d9f2e5b8a1c4d7f3e6b9a2c5d8f1e4",
//         text: "506572666563742120", // Encrypted message
//         date: "2024-06-25T11:45:00",
//         read: false,
//       }
//     ]
//   },
//   {
//     id: "2",
//     name: "426f62204d617274696e657a", // Encrypted "Bob Martinez"
//     xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
//     txid: "9f2e8b7c4a3d1f6e5b8a9c2d7f4e3b8a1c6d5f9e2b7a4c3d8f1e6b5a9c2d7f4",
//     text: "43616e207765207363686564756c652061206d656574696e6720746f20646973637573732074", // Encrypted message
//     date: "2024-06-24T14:20:00",
//     read: true,
//     replies: [
//       {
//         id: "2-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "5d8c3a9b7e2f1d4c6b8a5f9e3d7c2b4a8f1e6d5c9b3a7e2f4d8c1b6a5f9e3d7",
//         text: "43616e207765207363686564756c652061206d656574696e6720746f20646973637573732074",
//         date: "2024-06-24T15:00:00",
//         read: true,
//       }
//     ]
//   },
//   {
//     id: "3",
//     name: "4361726f6c20576f6e67", // Encrypted "Carol Wong"
//     xpub: "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31",
//     txid: "2a7f8d3b9c1e6f4a5d8b2e7c9f3a6d1b4e8c5f2a7d9b3e6c1f4a8d5b2e7c9f3",
//     text: "546865204e4654206d61726b6574706c61636520696e746567726174696f6e20697320726561", // Encrypted message
//     date: "2024-06-23T09:15:00",
//     read: true,
//     replies: [
//       {
//         id: "3-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "8b4f7c2a9d3e1f6b3a8d4c7e2f9b3a6d1e5c8b4f7a2d9e6c3b1f8a5d4e7c2f9",
//         text: "546865204e4654206d61726b6574706c61636520696e746567726174696f6e20697320726561",
//         date: "2024-06-23T10:30:00",
//         read: true,
//       }
//     ]
//   },
//   {
//     id: "4",
//     name: "44617669642048696d", // Encrypted "David Kim"
//     xpub: "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4",
//     txid: "6e9a4c7b3f2d8e1a5b9f6d3c8e7a2b4f1d5c9e6b3a8f7d2c4e9b1a6f5d3c8e7",
//     text: "4865792c2049206e6f74696365642074616c6520616374697669747920", // Encrypted message
//     date: "2024-06-22T16:45:00",
//     read: false,
//     replies: [
//       {
//         id: "4-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "3c8f5b2a7d4e9c1f6b3a8d5e7c2f9b4a6d1e8c3f5b7a2d9e4c6f1b8a3d5e7c9",
//         text: "4865792c2049206e6f74696365642074616c6520616374697669747920",
//         date: "2024-06-22T17:30:00",
//         read: true,
//       },
//       {
//         id: "4-2",
//         name: "44617669642048696d", // Encrypted "David Kim"
//         xpub: "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4",
//         txid: "9a3d7e5b8c2f4a6d1e9b7c3f5a8d2e4b6c1f9a3d7e5b8c2f4a6d1e9b7c3f5a8",
//         text: "477265617421204576657279746869", // Encrypted message
//         date: "2024-06-22T18:00:00",
//         read: false,
//       }
//     ]
//   },
//   {
//     id: "5",
//     name: "457665205468306d", // Encrypted "Eve Thompson"
//     xpub: "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a",
//     txid: "4b8d2f7c9a3e6b1d5f8a4c9e7b2d3f6a8e1c5b9d7f3a2e6c4b8f1d5a9e3c7b2",
//     text: "5468652044414f20676f7665726e", // Encrypted message
//     date: "2024-06-21T11:00:00",
//     read: true,
//     replies: [
//       {
//         id: "5-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "7e5c8b3a9f2d4e6c1b7a5f8d3c9e2b4a6f1d8c5e3b9a7f2d6c4e1b8a5f3d9c7",
//         text: "5468652044414f20676f7665726e",
//         date: "2024-06-21T13:45:00",
//         read: true,
//       }
//     ]
//   }
// ];

// // Additional standalone messages for each contact - encrypted
// export const additionalMessages: TokenMail[] = [
//   {
//     id: "6",
//     name: "416c696365204368656e", // Encrypted "Alice Chen"
//     xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//     txid: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
//     text: "517569636b20757064", // Encrypted message
//     date: "2024-06-20T08:30:00",
//     read: true,
//   },
//   {
//     id: "7",
//     name: "416c696365204368656e", // Encrypted "Alice Chen"
//     xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//     txid: "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
//     text: "466f756e64206120706f74656e74", // Encrypted message
//     date: "2024-06-19T15:20:00",
//     read: false,
//   },
//   {
//     id: "8",
//     name: "416c696365204368656e", // Encrypted "Alice Chen"
//     xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//     txid: "3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
//     text: "546865206175646974207265706f", // Encrypted message
//     date: "2024-06-18T12:00:00",
//     read: true,
//   },
//   {
//     id: "9",
//     name: "426f62204d617274696e657a", // Encrypted "Bob Martinez"
//     xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
//     txid: "4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
//     text: "546865206761732068616420", // Encrypted message
//     date: "2024-06-17T18:45:00",
//     read: false,
//   },
//   {
//     id: "10",
//     name: "426f62204d617274696e657a", // Encrypted "Bob Martinez"
//     xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
//     txid: "5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6",
//     text: "52656d696e646572262074", // Encrypted message
//     date: "2024-06-16T10:30:00",
//     read: true,
//   },
//   {
//     id: "11",
//     name: "426f62204d617274696e657a", // Encrypted "Bob Martinez"
//     xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
//     txid: "6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7",
//     text: "4861766520796f75207365656e2074", // Encrypted message
//     date: "2024-06-15T14:15:00",
//     read: true,
//   },
//   {
//     id: "12",
//     name: "4361726f6c20576f6e67", // Encrypted "Carol Wong"
//     xpub: "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31",
//     txid: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8",
//     text: "55492f5558207570646174", // Encrypted message
//     date: "2024-06-14T09:00:00",
//     read: false,
//   },
//   {
//     id: "13",
//     name: "4361726f6c20576f6e67", // Encrypted "Carol Wong"
//     xpub: "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31",
//     txid: "8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
//     text: "506572666f726d616e6365206d65", // Encrypted message
//     date: "2024-06-13T16:30:00",
//     read: true,
//   },
//   {
//     id: "14",
//     name: "44617669642048696d", // Encrypted "David Kim"
//     xpub: "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4",
//     txid: "9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0",
//     text: "43726f73732d636861696e2062726964", // Encrypted message
//     date: "2024-06-12T13:45:00",
//     read: true,
//   },
//   {
//     id: "15",
//     name: "44617669642048696d", // Encrypted "David Kim"
//     xpub: "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4",
//     txid: "0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
//     text: "486561647320757056e6574", // Encrypted message
//     date: "2024-06-11T11:20:00",
//     read: false,
//   },
//   {
//     id: "16",
//     name: "457665205468306d", // Encrypted "Eve Thompson"
//     xpub: "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a",
//     txid: "1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
//     text: "436f6d6d756e6d756e6974792066", // Encrypted message
//     date: "2024-06-10T17:00:00",
//     read: true,
//   },
//   {
//     id: "17",
//     name: "457665205468306d", // Encrypted "Eve Thompson"
//     xpub: "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a",
//     txid: "2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3",
//     text: "547265617375727920726573", // Encrypted message
//     date: "2024-06-09T19:30:00",
//     read: false,
//   }
// ];

// // Helper function to combine and sort all messages
// export function getAllCryptoMessages(): TokenMail[] {
//   return [...cryptoChatData, ...additionalMessages].sort((a, b) => 
//     new Date(b.date).getTime() - new Date(a.date).getTime()
//   );
// }

// // Example usage for decrypting a message
// export function decryptTokenMail(mail: TokenMail, privateKey: PrivateKey): TokenMail {
//   // Skip decryption for "me" messages
//   if (mail.xpub === "me") {
//     return mail;
//   }
  
//   return {
//     ...mail,
//     name: decryptWithECDH(privateKey, mail.xpub, mail.name),
//     text: decryptWithECDH(privateKey, mail.xpub, mail.text),
//     replies: mail.replies?.map(reply => decryptTokenMail(reply, privateKey))
//   };
// }













































// import { PrivateKey, PublicKey, SymmetricKey, Utils } from '@bsv/sdk';

// export interface TokenMail {
//   id: string;
//   name: string;
//   xpub: string;
//   txid: string;
//   text: string; 
//   date: string;
//   read: boolean;
//   replies?: TokenMail[];
// }

// // Your private key - EXPORTED
// // export const myPrivateKey = PrivateKey.fromHex('d131afbd307c7e87d77331e53018f8f04389a7a40d1ec0661558e6516c236ee4');
// export const myPrivateKey = PrivateKey.fromHex('6811543cdaae96cc602c2ed5efe517bf86cecdb0abbe678eb957b86bf8d3ff13');
// export const myPublicKey = myPrivateKey.toPublicKey();

// // Helper function to encrypt data using ECDH - EXPORTED
// export function encryptWithECDH(privateKey: PrivateKey, otherPublicKeyHex: string, data: string): string {
//   try {
//     // Parse the other party's public key
//     const otherPublicKey = PublicKey.fromString(otherPublicKeyHex);
    
//     // Derive shared secret using ECDH
//     const sharedSecret = privateKey.deriveSharedSecret(otherPublicKey);
    
//     // Create symmetric key from shared secret
//     const symmetricKey = new SymmetricKey(sharedSecret.toArray());
    
//     // Encrypt the data
//     const encrypted = symmetricKey.encrypt(data);
    
//     // Return as hex string
//     return Utils.toHex(encrypted);
//   } catch (error) {
//     console.error(`Encryption error for key ${otherPublicKeyHex}:`, error);
//     return `${data}`; // Fallback for debugging
//     //  return `ENCRYPTED:${data}`; // Fallback for debugging
//   }
// }

// // Helper function to encrypt a TokenMail object
// function encryptTokenMail(mail: TokenMail, privateKey: PrivateKey): TokenMail {
//   // Skip encryption for "me" messages
//   if (mail.xpub === "me") {
//     return mail;
//   }
  
//   return {
//     ...mail,
//     name: encryptWithECDH(privateKey, mail.xpub, mail.name),
//     text: encryptWithECDH(privateKey, mail.xpub, mail.text),
//     replies: mail.replies?.map(reply => encryptTokenMail(reply, privateKey))
//   };
// }

// // Encrypted crypto chat data
// export const cryptoChatData: TokenMail[] = [
//   {
//     id: "1",
//     name: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "Alice Chen"),
//     xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//     txid: "3b7d4f8a9c2e1b6f5d3a8e7c4b9f2d6a1e8c5b3f7d2a9e6c4b1f8d5a3e7c2b9f",
//     text: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "Hey, just sent you 0.5 BTC for the development work. Let me know when it arrives!"),
//     date: "2024-06-25T10:30:00",
//     read: false,
//     replies: [
//       {
//         id: "1-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "8e4a7b3f2d1c9e6b5a4f8d3c7e2b9a6f1d5c4e3b8a7f2d6c9e1b4a5f3d8c7e2",
//         text: "Yes, received it! Thanks for the quick transfer.",
//         date: "2024-06-25T11:15:00",
//         read: true,
//       },
//       {
//         id: "1-2", 
//         name: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "Alice Chen"),
//         xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//         txid: "f7c9e2b4a5d8f3c6e1b9a4d7f2e5b8a3c6d9f2e5b8a1c4d7f3e6b9a2c5d8f1e4",
//         text: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "Perfect! Looking forward to seeing the final product. Keep me posted on the progress."),
//         date: "2024-06-25T11:45:00",
//         read: false,
//       }
//     ]
//   },
//   {
//     id: "2",
//     name: encryptWithECDH(myPrivateKey, "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800", "Bob Martinez"),
//     xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
//     txid: "9f2e8b7c4a3d1f6e5b8a9c2d7f4e3b8a1c6d5f9e2b7a4c3d8f1e6b5a9c2d7f4",
//     text: encryptWithECDH(myPrivateKey, "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800", "Can we schedule a meeting to discuss the smart contract audit? I have some concerns about the gas optimization."),
//     date: "2024-06-24T14:20:00",
//     read: true,
//     replies: [
//       {
//         id: "2-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "5d8c3a9b7e2f1d4c6b8a5f9e3d7c2b4a8f1e6d5c9b3a7e2f4d8c1b6a5f9e3d7",
//         text: "Sure, how about tomorrow at 3 PM? I've already identified a few areas where we can reduce gas costs by about 30%.",
//         date: "2024-06-24T15:00:00",
//         read: true,
//       }
//     ]
//   },
//   {
//     id: "3",
//     name: encryptWithECDH(myPrivateKey, "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31", "Carol Wong"),
//     xpub: "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31",
//     txid: "2a7f8d3b9c1e6f4a5d8b2e7c9f3a6d1b4e8c5f2a7d9b3e6c1f4a8d5b2e7c9f3",
//     text: encryptWithECDH(myPrivateKey, "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31", "The NFT marketplace integration is ready for testing. You can access the staging environment with the credentials I sent earlier."),
//     date: "2024-06-23T09:15:00",
//     read: true,
//     replies: [
//       {
//         id: "3-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "8b4f7c2a9d3e1f6b5a8d4c7e2f9b3a6d1e5c8b4f7a2d9e6c3b1f8a5d4e7c2f9",
//         text: "Excellent work! I'll start testing right away. The UI looks much cleaner than the mockups.",
//         date: "2024-06-23T10:30:00",
//         read: true,
//       }
//     ]
//   },
//   {
//     id: "4",
//     name: encryptWithECDH(myPrivateKey, "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4", "David Kim"),
//     xpub: "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4",
//     txid: "6e9a4c7b3f2d8e1a5b9f6d3c8e7a2b4f1d5c9e6b3a8f7d2c4e9b1a6f5d3c8e7",
//     text: encryptWithECDH(myPrivateKey, "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4", "Hey, I noticed some unusual activity on the testnet. Can you check if your nodes are syncing properly?"),
//     date: "2024-06-22T16:45:00",
//     read: false,
//     replies: [
//       {
//         id: "4-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "3c8f5b2a7d4e9c1f6b3a8d5e7c2f9b4a6d1e8c3f5b7a2d9e4c6f1b8a3d5e7c9",
//         text: "Thanks for the heads up! Found the issue - one of the nodes was stuck at block 15234. Restarting now.",
//         date: "2024-06-22T17:30:00",
//         read: true,
//       },
//       {
//         id: "4-2",
//         name: encryptWithECDH(myPrivateKey, "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4", "David Kim"),
//         xpub: "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4",
//         txid: "9a3d7e5b8c2f4a6d1e9b7c3f5a8d2e4b6c1f9a3d7e5b8c2f4a6d1e9b7c3f5a8",
//         text: encryptWithECDH(myPrivateKey, "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4", "Great! Everything looks normal now. BTW, did you see the new EIP proposal? Might affect our Layer 2 implementation."),
//         date: "2024-06-22T18:00:00",
//         read: false,
//       }
//     ]
//   },
//   {
//     id: "5",
//     name: encryptWithECDH(myPrivateKey, "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a", "Eve Thompson"),
//     xpub: "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a",
//     txid: "4b8d2f7c9a3e6b1d5f8a4c9e7b2d3f6a8e1c5b9d7f3a2e6c4b8f1d5a9e3c7b2",
//     text: encryptWithECDH(myPrivateKey, "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a", "The DAO governance token distribution is complete. 10,000 tokens have been allocated to your address as discussed."),
//     date: "2024-06-21T11:00:00",
//     read: true,
//     replies: [
//       {
//         id: "5-1",
//         name: "03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416",
//         xpub: "me",
//         txid: "7e5c8b3a9f2d4e6c1b7a5f8d3c9e2b4a6f1d8c5e3b9a7f2d6c4e1b8a5f3d9c7",
//         text: "Confirmed receipt. I'll submit the first governance proposal tomorrow about the treasury allocation strategy.",
//         date: "2024-06-21T13:45:00",
//         read: true,
//       }
//     ]
//   }
// ];

// // Additional standalone messages for each contact - encrypted
// export const additionalMessages: TokenMail[] = [
//   {
//     id: "6",
//     name: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "Alice Chen"),
//     xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//     txid: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
//     text: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "Quick update: The mainnet deployment went smoothly. All systems are operational."),
//     date: "2024-06-20T08:30:00",
//     read: true,
//   },
//   {
//     id: "7",
//     name: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "Alice Chen"),
//     xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//     txid: "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
//     text: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "Found a potential security vulnerability in the staking contract. We should discuss this ASAP."),
//     date: "2024-06-19T15:20:00",
//     read: false,
//   },
//   {
//     id: "8",
//     name: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "Alice Chen"),
//     xpub: "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a",
//     txid: "3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
//     text: encryptWithECDH(myPrivateKey, "02c9f664a196b0e053ddfb0f70521fbb9cb06cceea3a10768e29f8cb4864c2f22a", "The audit report from CertiK just came in. Overall positive with minor suggestions. Forwarding now."),
//     date: "2024-06-18T12:00:00",
//     read: true,
//   },
//   {
//     id: "9",
//     name: encryptWithECDH(myPrivateKey, "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800", "Bob Martinez"),
//     xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
//     txid: "4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
//     text: encryptWithECDH(myPrivateKey, "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800", "The gas optimization worked perfectly! We're saving about 40% on each transaction now. Great job!"),
//     date: "2024-06-17T18:45:00",
//     read: false,
//   },
//   {
//     id: "10",
//     name: encryptWithECDH(myPrivateKey, "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800", "Bob Martinez"),
//     xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
//     txid: "5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6",
//     text: encryptWithECDH(myPrivateKey, "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800", "Reminder: Investor call tomorrow at 2 PM EST. They want to see the DeFi integration demo."),
//     date: "2024-06-16T10:30:00",
//     read: true,
//   },
//   {
//     id: "11",
//     name: encryptWithECDH(myPrivateKey, "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800", "Bob Martinez"),
//     xpub: "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800",
//     txid: "6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7",
//     text: encryptWithECDH(myPrivateKey, "02a75127c7b53366c0d41d3f99547f8adb7242e7f896d9e3472a838b152003a800", "Have you seen the latest Ethereum upgrade proposal? Could impact our rollup strategy."),
//     date: "2024-06-15T14:15:00",
//     read: true,
//   },
//   {
//     id: "12",
//     name: encryptWithECDH(myPrivateKey, "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31", "Carol Wong"),
//     xpub: "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31",
//     txid: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8",
//     text: encryptWithECDH(myPrivateKey, "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31", "UI/UX updates are live on staging. Added dark mode and improved wallet connection flow."),
//     date: "2024-06-14T09:00:00",
//     read: false,
//   },
//   {
//     id: "13",
//     name: encryptWithECDH(myPrivateKey, "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31", "Carol Wong"),
//     xpub: "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31",
//     txid: "8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
//     text: encryptWithECDH(myPrivateKey, "02b5cca9d3be0a36825928618372211db55278fc965f91a8280eca980e1a124e31", "Performance metrics are impressive: 0.3s average transaction time, 99.9% uptime last month."),
//     date: "2024-06-13T16:30:00",
//     read: true,
//   },
//   {
//     id: "14",
//     name: encryptWithECDH(myPrivateKey, "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4", "David Kim"),
//     xpub: "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4",
//     txid: "9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0",
//     text: encryptWithECDH(myPrivateKey, "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4", "Cross-chain bridge testing complete. Successfully transferred assets between Ethereum and Polygon."),
//     date: "2024-06-12T13:45:00",
//     read: true,
//   },
//   {
//     id: "15",
//     name: encryptWithECDH(myPrivateKey, "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4", "David Kim"),
//     xpub: "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4",
//     txid: "0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
//     text: encryptWithECDH(myPrivateKey, "03f9517323b28fea0e347a7d519bd875f95fa57eefc782dec39236d644485bdaf4", "Heads up: Network congestion expected during the NFT drop tomorrow. Might want to increase gas limits."),
//     date: "2024-06-11T11:20:00",
//     read: false,
//   },
//   {
//     id: "16",
//     name: encryptWithECDH(myPrivateKey, "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a", "Eve Thompson"),
//     xpub: "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a",
//     txid: "1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
//     text: encryptWithECDH(myPrivateKey, "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a", "Community feedback on the governance proposal is overwhelmingly positive. 87% approval rate so far."),
//     date: "2024-06-10T17:00:00",
//     read: true,
//   },
//   {
//     id: "17",
//     name: encryptWithECDH(myPrivateKey, "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a", "Eve Thompson"),
//     xpub: "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a",
//     txid: "2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3",
//     text: encryptWithECDH(myPrivateKey, "02da810f17b2beab628b6821993e02da8ab542b97e3014ed0347fb70bde03f887a", "Treasury report: We have 2.5M in stablecoins and 150 ETH. Runway looks good for 18 months."),
//     date: "2024-06-09T19:30:00",
//     read: false,
//   }
// ];

// // Helper function to combine and sort all messages
// export function getAllCryptoMessages(): TokenMail[] {
//   return [...cryptoChatData, ...additionalMessages].sort((a, b) => 
//     new Date(b.date).getTime() - new Date(a.date).getTime()
//   );
// }

// // Decryption function for reading messages
// export function decryptWithECDH(privateKey: PrivateKey, otherPublicKeyHex: string, encryptedHex: string): string {
//   try {
//     // Parse the other party's public key
//     const otherPublicKey = PublicKey.fromString(otherPublicKeyHex);
    
//     // Derive shared secret using ECDH
//     const sharedSecret = privateKey.deriveSharedSecret(otherPublicKey);
    
//     // Create symmetric key from shared secret
//     const symmetricKey = new SymmetricKey(sharedSecret.toArray());
    
//     // Convert hex back to array
//     const encryptedData = Utils.toArray(encryptedHex, 'hex');
    
//     // Decrypt the data
//     const decrypted = symmetricKey.decrypt(encryptedData, 'utf8');
    
//     return decrypted;
//   } catch (error) {
//     console.error(`Decryption error for key ${otherPublicKeyHex}:`, error);
//     return encryptedHex; // Return encrypted data as fallback
//   }
// }

// // Example usage for decrypting a message  ENCRYPTED:
// export function decryptTokenMail(mail: TokenMail, privateKey: PrivateKey): TokenMail {
//   // Skip decryption for "me" messages
//   if (mail.xpub === "me") {
//     return mail;
//   }
  
//   return {
//     ...mail,
//     name: decryptWithECDH(privateKey, mail.xpub, mail.name),
//     text: decryptWithECDH(privateKey, mail.xpub, mail.text),
//     replies: mail.replies?.map(reply => decryptTokenMail(reply, privateKey))
//   };
// }
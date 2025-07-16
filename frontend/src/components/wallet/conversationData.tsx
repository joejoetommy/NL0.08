// conversationData.tsx
// Encrypted messages between you and Alice Test
// These are pre-encrypted messages that can only be decrypted by the parties involved
// conversationData.tsx
// Encrypted messages between you and Alice Test
// These are pre-encrypted messages that can only be decrypted by the parties involved

// conversationData.tsx
// Encrypted messages between you and Alice Test
// These are pre-encrypted messages that can only be decrypted by the parties involved
// conversationData.tsx
// Real encrypted messages between you and your contacts
// These messages were encrypted using the Messages tab with ECDH + AES-GCM

export interface EncryptedMessage {
  id: string;
  name: string;  // sender name
  text: string;  // encrypted message content (hex)
  timestamp: string;
}

export interface Conversation {
  contactId: string;
  contactName: string;
  contactPublicKey: string;
  messages: EncryptedMessage[];
}

    // No. me =  xpub 03486fc70e31b45fb24094e714ef2f2fed9d86cf9f2158413be380280fdd3f2416 / 
    // My funded test net key  xpri / 6811543cdaae96cc602c2ed5efe517bf86cecdb0abbe678eb957b86bf8d3ff13
// muCRZXdunSqaKv5REC37Ahf6ZUAK2yqKes


// Alice Test
// Public Key: 02b4632d08485ff1df2db55b9dafd23347d1c47a457072a1e87be26896549a8737    used ; xpri / 6811543cdaae96cc602c2ed5efe517bf86cecdb0abbe678eb957b86bf8d3ff13
// ECDH Shared Secret: 027eda5bc0d571f9439aea0f2326c4b70e0a1073675fc120ef64d5ee7b20396c2a


// Conversation 1: You and Alice TestAlice Test  
// Public Key: 02b4632d08485ff1df2db55b9dafd23347d1c47a457072a1e87be26896549a8737  my key used = a6b806e062f2d53ad6dcb895d886f48e1c347eb6620b73f15631b7e2c54bc362
// ECDH Shared Secret: 02782e03af917677dcaa3f651de30da0af8552cf939fc16e810633ffdf75a630a9
const aliceConversation: Conversation = {
  contactId: "alice-test",
  contactName: "Alice Test",
  contactPublicKey: "02b4632d08485ff1df2db55b9dafd23347d1c47a457072a1e87be26896549a8737",
  messages: [
    {
      id: "msg-alice-1",
      name: "You",
      text: "e5c091658bb2277373e94dec7e7555f1671c922497e70e4ce0e5d6b14b0b80a3eeafc55ba438f687a3644926e1cacd672ee2cc284fa75843a0690b034fe5434581904341305eb2ab945864f77fb71e",
      timestamp: "2024-01-15 10:30:00"
    },
    {
      id: "msg-alice-2",
      name: "Alice Test",
      text: "13781907525269289e88c85ddc2905e0fe3da664cff20ed8d4ef2265ded0d5266d6d4e129dcb826da5e61d335e402130626be4d86cafb740a7c8efc2c5d177a94808f3f93d47ae7299e53e369370db",
      timestamp: "2024-01-15 10:32:15"
    },
    {
      id: "msg-alice-3",
      name: "You",
      text: "9fbe5498f5a7532abce3d222d9b95507b59c38c8a25500632b07ca25584165b190682770988eca3255fa72fbe9c60a63f336023a0b2bd0211117f7d47bbc719a6de1f5a93c1b0a8c269549d3b9c388",
      timestamp: "2024-01-15 10:35:42"
    },
    {
      id: "msg-alice-4",
      name: "Alice Test",
      text: "0368861e569717a9153c17ebfadeec915ac0989b242defc2082b069042b22f825c2ab12de117f1c5ef7ccb574f727c813fd961d51778a502cf8bd7b548ecfa2e1db518436ffa378ad97a2c55290b90",
      timestamp: "2024-01-15 10:38:20"
    },
    {
      id: "msg-alice-5",
      name: "You",
      text: "b35bbae8a6a528b449fca96d87e09329127f6b335e87b8c7755f4b410caccf302dd61fb414d4546cee5506fb37aa0d676588d2238bedaa4b381d19b003b9749d608698ffc12fce3fddd7b6718669a6",
      timestamp: "2024-01-15 10:40:55"
    }
  ]
};

// Conversation 2: You and Bob Test
const bobConversation: Conversation = {
  contactId: "bob-test",
  contactName: "Bob Test",
  contactPublicKey: "024d4b6cd1361032ca9bd2aeb9d900aa4d45d9ead80ac9423374c451a7254d0766",
  messages: [
    {
      id: "msg-bob-1",
      name: "You",
      text: "09d156647af6dcfb5ffcc7b9d727ea4849c257931e75b44af8433be6667f7b044112a3d5133ea7699374e3541a065975d4e4b755555652b343e2aedcda472a793a611d9a4f97b1f7340525a70e9e04d67576df",
      timestamp: "2024-01-15 11:00:00"
    },
    {
      id: "msg-bob-2",
      name: "Bob Test",
      text: "7a61c815825cebbd5d3e845f03b57dd663636e3215d89d69e8c5053a839a7fc5aa635d63b0762fa15b72537b28f13f18afda18297fadee6b9acc4245bc5399923c65ec8af8b2defe6e3b8a29c60f63a37232fd",
      timestamp: "2024-01-15 11:02:30"
    },
    {
      id: "msg-bob-3",
      name: "You",
      text: "0dfbf3880ce2717ac698e7a766aa0e5d55f5d91b16f582ed15fc0d1a6701a2168c04bc6f7d2aecc4c0480bada1291b4de3a11c2e9195de27b4cc79b750cf10e53a91c36c4d07f8ef02029fa9e0e2d9bf78e5ee",
      timestamp: "2024-01-15 11:05:15"
    },
    {
      id: "msg-bob-4",
      name: "Bob Test",
      text: "2fba581ba4322a23ec3b467b09f71f041754df8e2a278cf3c60c0de5ee6754d00a7c08c896c68ec09df49397919ae750619c0bd9e3363d1dd7be8204783f8fac5273ae799e274233dae31aef9695cce814fcdc",
      timestamp: "2024-01-15 11:08:45"
    },
    {
      id: "msg-bob-5",
      name: "You",
      text: "d11b13a63de9c35636b94d902c7d004a6241f269badcc3025d3668b7e2de0ddc4bda83febceb0737dfeedc282a052bde9ab83503fd14c6aa68379aa68ad3e7ca712f91068155b8520eb45d34f33ce5059fdd08",
      timestamp: "2024-01-15 11:10:00"
    },
    {
      id: "msg-bob-6",
      name: "Bob Test",
      text: "6e7fcf1df922819e49bf2974bb805773609414d7a15274cfbcebfeb7ce54de5e46577913db0e336209b95e7ac291f76e5f9a71cac5f8f9689795963189ff822753438dafd92a61c5f6be9278093f5872170a33",
      timestamp: "2024-01-15 11:12:30"
    }
  ]
};

// Conversation 3: You and Charlie Demo
const charlieConversation: Conversation = {
  contactId: "charlie-demo",
  contactName: "Charlie Demo",
  contactPublicKey: "02531fe6068134503d2723133227c867ac8fa6c83c537e9a44c3c5bdbf0b5142be",
  messages: [
    {
      id: "msg-charlie-1",
      name: "You",
      text: "000d4dbd324eb6cd5b1eb9a1853353e45ae87bae719f48a251537f14446642b7c711ca028e3cb2e054cdde53edfc2c0c045c1db305d095ecdca05695ea0329e1d84637c197460d901ef0172a2e7ef1a0fd48ecdd9900",
      timestamp: "2024-01-15 14:00:00"
    },
    {
      id: "msg-charlie-2",
      name: "Charlie Demo",
      text: "1d16df2e155c9b47c60f9934423dbe26c218ff46784a03891ea5401d3274deaf3c9485cc36de10ad537d9382024e8cb6083aa6c5628393d137685f77b2e666766e119b7751aa7c0bcf5c3b909c4c79f5e1f7664c7ad5ab",
      timestamp: "2024-01-15 14:03:45"
    },
    {
      id: "msg-charlie-3",
      name: "You",
      text: "616bf3f0080e64d2af5bca5bd301a42af7a628679d6e09cedad1619245b3968e7726424df9a04676324e2bc83471ebcdfa1b6c8b8b5b850347d46c8bc02f7b9a741d3429408b4973c891c15b0cd781b6d07cff0b761560",
      timestamp: "2024-01-15 14:06:20"
    },
    {
      id: "msg-charlie-4",
      name: "Charlie Demo",
      text: "8c3cb34a1a4d65ae9079c29c4185082ca5f0ed5a2e0bdcf1f4c78a250c2242012b2825fce19754f5bb22a700646fedd0e60af90fc6efc7caa0e4eb5e8366721e66df37f3720dca1fed72b1984472c9ed634b5887913ce4",
      timestamp: "2024-01-15 14:09:10"
    },
    {
      id: "msg-charlie-5",
      name: "You",
      text: "8ea4e4e12914d951ccd785c57d0a95b5e922417232eea0eec00d59d50597c76fd144d64cfbae4e86ab56fb64d18e28a57aab7d0980ea3cb252926ba21821c1c9ed4f4df67cdc66373ddeb12984fe5068660e7bb9efe3ea",
      timestamp: "2024-01-15 14:12:00"
    },
    {
      id: "msg-charlie-6",
      name: "Charlie Demo",
      text: "b37cfab80ae57a24a5a074fcf8a38f7b34936f3f7e920ffad1d2d8cef0e8990eedf5198371d41a985ac41041b9809fe6937b8e7ee5a9cf6071b88350959ea0418757d08b10be793c7348a2b2b31965d6822a43d86532d7",
      timestamp: "2024-01-15 14:15:30"
    },
    {
      id: "msg-charlie-7",
      name: "You",
      text: "d76f60935e8a564d4ca2e0bb1bff3599a7db794d59240fdbb0e48fea850d789ad74591d9993eef4f3ff014d586b848b25170b0b8094ce3962fa577f2631e35c225b8fb5d2f131673635fdd84e9af276bd956a0faf8167b",
      timestamp: "2024-01-15 14:18:45"
    },
    {
      id: "msg-charlie-8",
      name: "Charlie Demo",
      text: "6d6e3a63162ba1ef31c24fb599ca2719d1ae7d5f51c55f4e3c67f2abf0aa55e9d8e812ea8bb0e9bd11cf375c2b982589b295703af7a95543078b6aed5f9e381dc98dbaac8386d2d238052635e962be3162e30c26eca3e5",
      timestamp: "2024-01-15 14:22:00"
    }
  ]
};

// Export all conversations as an array
export const allConversations: Conversation[] = [
  aliceConversation,
  bobConversation,
  charlieConversation
];

// Helper function to get conversation by contact ID
export const getConversationByContactId = (contactId: string): Conversation | undefined => {
  return allConversations.find(conv => conv.contactId === contactId);
};

// Helper function to get all contact names
export const getAllContactNames = (): string[] => {
  return allConversations.map(conv => conv.contactName);
};

// Helper function to find conversation by contact public key
export const getConversationByPublicKey = (publicKey: string): Conversation | undefined => {
  return allConversations.find(conv => conv.contactPublicKey === publicKey);
};
// export interface EncryptedMessage {
//   id: string;
//   name: string;  // sender name
//   text: string;  // encrypted message content
//   timestamp: string;
// }

// // These messages are encrypted using ECDH shared secret between:
// // - Your private key: 0000000000000000000000000000000000000000000000000000000000000001
// // - Alice's public key: 02b4632d08485ff1df2db55b9dafd23347d1c47a457072a1e87be26896549a8737

// // Note: These are actual encrypted messages using the SDK's SymmetricKey encryption
// export const allConversations: EncryptedMessage[] = [
//   {
//     id: "msg-1",
//     name: "You",
//     text: "a6f3d8e91c5b2a7f4e8d3c6b9a5f4e3d2c1b8a7f6e5d4c3b2a1f9e8d7c6b5a4f3e2d1c9b8a7f6e5d4c3b2a1f9e8d7c6b5a4f3e2d1c9b8a7f6e5d4c3b2a1f9e8d7c6b5a4f3e2d1c9b8a7f6e5d4c3b2a1f9e8d7c6b5a4f3e2d1c9b8a7f6e",
//     timestamp: "2024-01-15 10:30:00"
//   },
//   {
//     id: "msg-2",
//     name: "Alice Test",
//     text: "b7e4d9f82a6c3e8f1d5b7a9c4e6f8d3a2c5e7b9f1d4a6c8e2b5d7f9a3c6e8b1d4f7a9c2e5b8d1f4a7c9e2b6d8f1a4c7e9b3d6f8a2c5e8b1d4f7a9c2e5b8d1f4a7c9e2b6d8f1a4c7e9b3d6f8a2c5e8b1d4f7a9c2e5b8d1f4a7c9e2b6d8f1a4c7e9b3d6f8a2c5e8b1d4f7a",
//     timestamp: "2024-01-15 10:32:15"
//   },
//   {
//     id: "msg-3",
//     name: "You",
//     text: "c8f5e2a9d6b3f7c4e1a8d5b2f9c6e3a7d4b1f8c5e2a9d6b3f7c4e1a8d5b2f9c6e3a7d4b1f8c5e2a9d6b3f7c4e1a8d5b2f9c6e3a7d4b1f8c5e2a9d6b3f7c4e1a8d5b2f9c6e3a7d4b1f8c5e2a9d6b3f7c4e1a8d5b2f9c6e3a7d4b1f8c5e2a9d6b3f7c4e1a8d5b2f9c6e3a7d4b1f8c5e2a9d6b3f7c4e1a8d5b2f9c6",
//     timestamp: "2024-01-15 10:35:42"
//   },
//   {
//     id: "msg-4",
//     name: "Alice Test",
//     text: "d9a6f3b8c5e2d7a4f1b9c6e3d8a5f2b7c4e1d9a6f3b8c5e2d7a4f1b9c6e3d8a5f2b7c4e1d9a6f3b8c5e2d7a4f1b9c6e3d8a5f2b7c4e1d9a6f3b8c5e2d7a4f1b9c6e3d8a5f2b7c4e1d9a6f3b8c5e2d7a4f1b9c6e3d8a5f2b7c4e1d9a6f3b8c5e2d7a4f1b9c6e3d8a5f2b7c4e1d9a6f3b8c5e2d7a4f1b9c6e3d8a5f2b7c4",
//     timestamp: "2024-01-15 10:38:20"
//   },
//   {
//     id: "msg-5",
//     name: "You",
//     text: "e1b7d4a9c6f3e8b5d2a7f4c1e9b6d3a8f5c2e7b4d1a9f6c3e8b5d2a7f4c1e9b6d3a8f5c2e7b4d1a9f6c3e8b5d2a7f4c1e9b6d3a8f5c2e7b4d1a9f6c3e8b5d2a7f4c1e9b6d3a8f5c2e7b4d1a9f6c3e8b5d2a7f4c1",
//     timestamp: "2024-01-15 10:40:55"
//   },
//   {
//     id: "msg-6",
//     name: "Alice Test",
//     text: "f2c8e5b1d7a3f9c6e2b8d4a1f7c3e9b5d1a7f3c9e5b1d7a3f9c6e2b8d4a1f7c3e9b5d1a7f3c9e5b1d7a3f9c6e2b8d4a1f7c3e9b5d1a7f3c9e5b1d7a3f9c6e2b8d4a1f7c3e9b5d1a7f3c9e5b1d7a3f9c6e2b8d4a1f7c3e9b5d1a7f3c9e5b1d7a3f9c6e2b8d4a1f7c3e9b5d1a7f3c9e5b1d7a3f9c6e2b8d4a1f7c3e9b5d1a7f3c9e5b1d7a3f9c6e2b8d4a1f7c3e9b5d1a7f3c9",
//     timestamp: "2024-01-15 10:43:30"
//   },
//   {
//     id: "msg-7",
//     name: "You",
//     text: "a3d9f6c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2",
//     timestamp: "2024-01-15 10:45:12"
//   },
//   {
//     id: "msg-8",
//     name: "Alice Test",
//     text: "b4e1a7d3f9c5e2b8d4a1f6c3e9b5d2a8f4c1e7b3d9a5f2c8e4b1d7a3f9c5e2b8d4a1f6c3e9b5d2a8f4c1e7b3d9a5f2c8e4b1d7a3f9c5e2b8d4a1f6c3e9b5d2a8f4c1e7b3d9a5f2c8e4b1d7a3f9c5e2b8d4a1f6c3e9b5d2a8f4c1e7b3d9a5f2c8e4b1d7a3f9c5e2b8d4a1f6c3e9b5d2a8f4c1e7b3d9a5f2c8e4b1d7a3f9",
//     timestamp: "2024-01-15 10:47:45"
//   },
//   {
//     id: "msg-9",
//     name: "You",
//     text: "c5f2b8e4d1a7f3b9c6e2d8a4f1b7c3e9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5",
//     timestamp: "2024-01-15 10:50:00"
//   },
//   {
//     id: "msg-10",
//     name: "Alice Test",
//     text: "d6a3f9c5e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4f1c7e3b9d5a2f8c4e1b7d3a9f5c2e8b4d1a7f3c9e5b2d8a4",
//     timestamp: "2024-01-15 10:52:30"
//   }
// ];

// // Alice Test's contact info for reference
// export const aliceTestContact = {
//   name: "Alice Test",
//   publicKey: "02b4632d08485ff1df2db55b9dafd23347d1c47a457072a1e87be26896549a8737",
//   // Test private key for Alice (ONLY for development/testing)
//   testPrivateKey: "0000000000000000000000000000000000000000000000000000000000000001"
// };



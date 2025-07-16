// testnet = (191,642 satoshis)
// Used xpub =  0396952911c77db5bf81e1a102cd21f50b95a40d0eb860d5bbc2fde4581bbef403
// Used KEY  xpr = 7997a3e7c543e5ffa0c05482e4bba0dacd26ead1eb8dd13cff059090154330d5
// address = mpXKEnxxyfbQTN5NGETsCrHnMVZp4S8oyt ECDH Shared Secret: entered below are just for me & side decryption testing

export interface ExampleContact {
  name: string;
  publicKey: string;
  description: string;
  // Optional: corresponding private key for testing (NEVER use in production)  03d01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85a
  testPrivateKey?: string;
}

export const examplePublicKeys: ExampleContact[] = [
  {
    name: "Alice Test",
    // PRI b92a10f7b8a2da754ae9a573c982b6662c4d80ce0059e99638719853e2ee2a62
    publicKey: "0260392349bb201143b89dfd0b0ad114e9e12dd154a38194ac7e23c0a626d4a998",
    // ECDH Shared Secret: 0382f9a30cc1be1ba5a40bd89cdbbf8a09068c58d0565631dd770145ba0fd47e
    description: "Test key 1 - commonly used in examples",
  },
  {
    name: "Bob Test",
    // dd0ec094ab8c94f8b6476f4c53ff2b13362fcfca7a0e95ebae22cb45ac71a5aa
    publicKey: "02f46878d8dd99d12a3f61a3cb4436b33f854d051ed04b35afa8e14a71f01b1ea2",
    // ECDH Shared Secret: 026d12e817912e0a128250d2bf45aac16f229e0ad44f6b37935ef01643859095
    description: "Test key 2 - for ECDH demonstrations",
  },
  {
    name: "Charlie Demo",
    // 8f29184e8a709f4b94da89ebfba50ce9375e81a5b03e56517493736b9e3750eb
    publicKey: "02a48979ce4fd3869a8fc6fa57c5a1de207cdc5923d439123373c5b5f07a2131c6",
    // ECDH Shared Secret: 0352825479a70ddfd82b44d6f34539caab7766e16100cc5efb79bd8bdd8f12f9
    description: "Test key 3 - for multi-sig examples",

  },
  {
    name: "Dana Example",
    // b4eab93f2395183bfffaf167fc8dd8adaa6ba7ebd22b6741b3f23a8b646bdbe2   
    publicKey: "028d6788a1450567d827b5def59bfeccd1034005eb6f81e1dd62af7179e1a780ff",
    // ECDH Shared Secret: 0325e2dbf1bcf871c4f5b34158c1918174261c387a08052ed10a20123442c3009
    description: "Test key 4 - for script examples",
  },
  {
    name: "Eve Testing",
    // c756944a8e5bd6685f4ff6f2a03b560d90692ad66e91b48c4319be3e3bd04b0d
    publicKey: "03ee9d19d9d6b4519830384b7cbd90cccd879b18408db3ceeb3e6611625b7b0d64",
    // ECDH Shared Secret: 0298ee126ed6feb4ed4c0c47081e38c99024104fdb00fbe896fd5a5543a0447
    // Balance = (+0.00201808 )
    description: "Test key 5 - for signature verification",
  },
  //   {
  //   name: "Me Testing",
  //   // 7997a3e7c543e5ffa0c05482e4bba0dacd26ead1eb8dd13cff059090154330d5
  //   publicKey: "0396952911c77db5bf81e1a102cd21f50b95a40d0eb860d5bbc2fde4581bbef403",
  //   // ECDH Shared Secret: 0298ee126ed6feb4ed4c0c47081e38c99024104fdb00fbe896fd5a5543a0447
  //   // Balance = (191,642  )
  //   description: "Test key 5 - for signature verification",
  // },

];

// Utility function to get a random example public key getRandomExamplePublicKey
export const getRandomExamplePublicKey = (): ExampleContact => {
  const randomIndex = Math.floor(Math.random() * examplePublicKeys.length);
  return examplePublicKeys[randomIndex];
};

// // Utility function to get example keys for ECDH demonstration
// export const getECDHPair = (): { alice: ExampleContact, bob: ExampleContact } => {
//   return {
//     alice: examplePublicKeys[0],
//     bob: examplePublicKeys[1]
//   };
// };

// Pre-calculated ECDH shared secrets for the test keys above 02671fc4679fa5df017437d17345486cc7cd5ddb8d8f24a094921901131560e921
// These are for demonstration purposes only
// export const exampleSharedSecrets = {
//   "alice_bob": "02a8fb85ff2b4ccc67a8c3c51ba36c2fd19ad8e8ce3b9d3e8f9a6fb7d99c3e5d3f",
//   "alice_charlie": "0353dc79b91771e049fece77c2de6e8e895e9e1c8e9b3583389c9a83428e006f7e",
//   "bob_charlie": "02e40337f0ee80579a79e2a36b7ad2bc36de85549bbfad96a350cf135c262daee8"
// };

// // Example addresses for different networks
// export const exampleAddresses = {
//   mainnet: [
//     "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", // Genesis block address
//     "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
//     "1CK6KHY6MHgYvmRQ4PAafKYDrg1ejbH1cE"
//   ],
//   testnet: [
//     "mfWxJ45yp2SFn7UciZyNpvDKrzzbdK6bmw",
//     "mhaMcBxNh5cqXm4aTQ6EcVbKtfL6LGyK6H",
//     "mkH3Yeb9atbrFmB5pYYmPQYusdGHcNxYKt"
//   ]
// };
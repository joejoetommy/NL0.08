const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  num2bin,
  SigHashPreimage,
  signTx,
  PubKey,
  Sig
} = require('scryptlib');
const {
  DataLen,
  loadDesc,
  createLockingTx,
  sendTx,
  showError
} = require('../helper');
const { privateKey } = require('../privateKey');

// Profile Token Implementation
class ProfileTokenSystem {
  constructor() {
    this.network = 'testnet'
    this.apiBaseUrl = 'https://api.whatsonchain.com/v1/bsv/test'
  }

  // Encode profile data for storage
  encodeProfileData(data) {
    // For base64 images, we need to handle them specially
    // In production, you might want to store images on IPFS and only store hashes on-chain
    const encoded = {
      bg: this.compressImageData(data.backgroundImage) || '',
      pi: this.compressImageData(data.profileImage) || '',
      un: data.username || '',
      ti: data.title || '',
      mi: data.mission || ''
    }
    return Buffer.from(JSON.stringify(encoded)).toString('hex')
  }

  // Compress base64 image data for blockchain storage
  compressImageData(imageData) {
    if (!imageData) return '';
    
    // If it's already a URL, keep it as is
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return imageData;
    }
    
    // If it's base64, we could:
    // 1. Store it on IPFS and return the hash
    // 2. Compress it further
    // 3. For demo, we'll truncate it (NOT for production!)
    
    // In production, you would upload to IPFS like this:
    // const ipfsHash = await ipfs.add(imageData)
    // return `ipfs://${ipfsHash}`
    
    // For demo purposes, we'll store a reference
    if (imageData.startsWith('data:image')) {
      // Extract just the image type for demo
      const type = imageData.match(/data:image\/(\w+);/)?.[1] || 'png';
      return `local:${type}:${Date.now()}`; // Placeholder for demo
    }
    
    return imageData;
  }

  // Decode profile data from storage
  decodeProfileData(hex) {
    try {
      const jsonStr = Buffer.from(hex, 'hex').toString()
      const encoded = JSON.parse(jsonStr)
      return {
        backgroundImage: encoded.bg,
        profileImage: encoded.pi,
        username: encoded.un,
        title: encoded.ti,
        mission: encoded.mi
      }
    } catch (e) {
      console.error('Error decoding profile data:', e)
      return null
    }
  }

  // Push profile token to network
  async pushProfileToNetwork(profileData, userPrivateKey) {
    try {
      const userPublicKey = bsv.PublicKey.fromPrivateKey(userPrivateKey)
      
      // Load the modified token contract
      const Token = buildContractClass(loadDesc('token_desc.json'))
      const token = new Token()

      // Create token ID based on timestamp
      const tokenId = Date.now()
      
      // Encode profile data
      const encodedProfile = this.encodeProfileData(profileData)
      
      // Create state data: tokenId + publicKey + profileDataLength + profileData
      const stateData = num2bin(tokenId, 8) + 
                       toHex(userPublicKey) + 
                       num2bin(encodedProfile.length / 2, 4) + 
                       encodedProfile

      token.setDataPart(stateData)

      const inputSatoshis = 50000
      const FEE = 5000
      const tokenSatoshis = inputSatoshis - FEE

      // Create the locking transaction
      const lockingTx = await createLockingTx(privateKey.toAddress(), inputSatoshis, FEE)
      
      // Set the token as the first output
      lockingTx.outputs[0].setScript(token.lockingScript)
      lockingTx.outputs[0].satoshis = tokenSatoshis

      // Add OP_RETURN with profile metadata for easy retrieval
      // For production with image uploads, store images on IPFS first
      const metadataScript = bsv.Script.buildDataOut([
        Buffer.from('PROFILE'),
        Buffer.from(tokenId.toString()),
        Buffer.from(userPublicKey.toString()),
        Buffer.from(JSON.stringify({
          v: 1, // version
          t: 'profile',
          d: profileData,
          // In production, add IPFS hashes here
          ipfs: {
            profile: profileData.profileImage.startsWith('data:') ? 'QmProfileImageIPFSHash' : null,
            background: profileData.backgroundImage.startsWith('data:') ? 'QmBackgroundImageIPFSHash' : null
          }
        }))
      ])

      lockingTx.addOutput(new bsv.Transaction.Output({
        script: metadataScript,
        satoshis: 0
      }))

      // Sign and send
      lockingTx.sign(privateKey)
      
      // In production environment
      const txid = await sendTx(lockingTx)
      
      console.log('Profile token created:', {
        txid: txid,
        tokenId: tokenId,
        owner: userPublicKey.toString()
      })

      return {
        success: true,
        txid: txid,
        tokenId: tokenId,
        lockingScript: token.lockingScript.toHex(),
        profileData: profileData
      }

    } catch (error) {
      console.error('Error pushing profile token:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Retrieve profile token from network
  async retrieveProfileFromNetwork(txid) {
    try {
      // Fetch transaction from network
      const response = await fetch(`${this.apiBaseUrl}/tx/${txid}`)
      const txData = await response.json()

      if (!txData || !txData.vout) {
        throw new Error('Transaction not found')
      }

      // Find OP_RETURN output with profile data
      let profileData = null
      let tokenId = null

      for (const output of txData.vout) {
        if (output.scriptPubKey && output.scriptPubKey.type === 'nulldata') {
          // Parse OP_RETURN data
          const hex = output.scriptPubKey.hex
          const data = this.parseOpReturn(hex)
          
          if (data && data.prefix === 'PROFILE') {
            tokenId = data.tokenId
            profileData = data.profileData
            break
          }
        }
      }

      // If no OP_RETURN found, try parsing from token script
      if (!profileData) {
        const tokenOutput = txData.vout[0] // Assuming first output is token
        if (tokenOutput && tokenOutput.scriptPubKey) {
          const scriptData = this.parseTokenScript(tokenOutput.scriptPubKey.hex)
          if (scriptData) {
            tokenId = scriptData.tokenId
            profileData = scriptData.profileData
          }
        }
      }

      if (!profileData) {
        throw new Error('Profile data not found in transaction')
      }

      return {
        success: true,
        txid: txid,
        tokenId: tokenId,
        profileData: profileData,
        blockHeight: txData.blockheight,
        confirmations: txData.confirmations
      }

    } catch (error) {
      console.error('Error retrieving profile token:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Parse OP_RETURN output
  parseOpReturn(hex) {
    try {
      // Skip OP_RETURN opcode (0x6a) and push data length
      let offset = 4
      const data = Buffer.from(hex.slice(offset), 'hex')
      
      // Split by null bytes or parse as continuous data
      const parts = data.toString().split('\x00')
      
      if (parts[0] === 'PROFILE' && parts.length >= 4) {
        const metadata = JSON.parse(parts[3])
        return {
          prefix: parts[0],
          tokenId: parts[1],
          publicKey: parts[2],
          profileData: metadata.d
        }
      }
    } catch (e) {
      console.error('Error parsing OP_RETURN:', e)
    }
    return null
  }

  // Parse token script to extract profile data
  parseTokenScript(scriptHex) {
    try {
      // This is a simplified parser - adjust based on your actual contract structure
      // Skip the contract code part to get to the data part
      const codePartLength = 200 * 2 // Approximate, adjust based on your contract
      
      if (scriptHex.length > codePartLength) {
        const dataPart = scriptHex.slice(codePartLength)
        
        // Parse: tokenId(16) + publicKey(66) + dataLength(8) + profileData
        const tokenId = parseInt(dataPart.slice(0, 16), 16)
        const publicKey = dataPart.slice(16, 82)
        const dataLength = parseInt(dataPart.slice(82, 90), 16) * 2
        const profileDataHex = dataPart.slice(90, 90 + dataLength)
        
        const profileData = this.decodeProfileData(profileDataHex)
        
        return {
          tokenId: tokenId,
          publicKey: publicKey,
          profileData: profileData
        }
      }
    } catch (e) {
      console.error('Error parsing token script:', e)
    }
    return null
  }

  // Helper function to query multiple transactions
  async retrieveMultipleProfiles(txids) {
    const profiles = []
    
    for (const txid of txids) {
      const profile = await this.retrieveProfileFromNetwork(txid)
      if (profile.success) {
        profiles.push(profile)
      }
    }
    
    return profiles
  }
}

// Example usage
async function demonstrateProfileToken() {
  const profileSystem = new ProfileTokenSystem()
  
  // Create a new private key for the user
  const userPrivateKey = new bsv.PrivateKey.fromRandom('testnet')
  
  // Profile data to store
  const profileData = {
    backgroundImage: 'https://images.unsplash.com/photo-1614854262340-ab5ca71a0c43',
    profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    username: 'BlockchainPioneer',
    title: 'Senior Blockchain Developer',
    mission: 'Empowering decentralized communities through innovative smart contract solutions'
  }

  console.log('=== Pushing Profile Token to Network ===')
  const pushResult = await profileSystem.pushProfileToNetwork(profileData, userPrivateKey)
  
  if (pushResult.success) {
    console.log('Profile token successfully created!')
    console.log('Transaction ID:', pushResult.txid)
    console.log('Token ID:', pushResult.tokenId)
    
    // Wait a moment for transaction to propagate
    console.log('\n=== Waiting for transaction to propagate ===')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('\n=== Retrieving Profile Token from Network ===')
    const retrieveResult = await profileSystem.retrieveProfileFromNetwork(pushResult.txid)
    
    if (retrieveResult.success) {
      console.log('Profile token successfully retrieved!')
      console.log('Profile Data:', retrieveResult.profileData)
      console.log('Confirmations:', retrieveResult.confirmations)
    } else {
      console.log('Failed to retrieve profile token:', retrieveResult.error)
    }
  } else {
    console.log('Failed to create profile token:', pushResult.error)
  }
}

// Export for use
module.exports = { ProfileTokenSystem, demonstrateProfileToken }
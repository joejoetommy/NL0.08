import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../store/WalletStore';
import { UTXOManager } from '../utils/blockchain';
import { PrivateKey, PublicKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import axios from 'axios';

interface ProfileFormData {
  username: string;
  title: string;
  mission: string;
  profileImage: string;
  backgroundImage: string;
}

// TAAL Token Studio Service for 1Sat Ordinals
class TAALTokenStudioService {
  private apiKey: string;
  private baseUrl: string;
  private network: string;
  
  constructor(apiKey: string, network: string = 'main') {
    this.apiKey = apiKey;
    this.network = network;
    this.baseUrl = 'https://platform.taal.com/token-studio/api/v1';
  }

  // Create a project for profile tokens
  async createProject(name: string): Promise<{ success: boolean; projectUid?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/project/create`,
        {
          name: name,
          isFungible: false,
          type: 'single',
          tokenProtocol: 'OneSatOrdinal'
        },
        {
          headers: {
            'Apikey': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          projectUid: response.data.data.projectUid
        };
      }
      
      return {
        success: false,
        error: 'Failed to create project'
      };
    } catch (error) {
      console.error('Error creating project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create an output (the actual token content)
  async createOutput(
    projectUid: string,
    profileData: {
      username: string;
      title: string;
      mission: string;
      profileImage: string;
      backgroundImage: string;
    }
  ): Promise<{ success: boolean; outputUid?: string; error?: string }> {
    try {
      // Create the profile content as HTML
      const htmlContent = this.generateProfileHTML(profileData);
      const b64Content = Buffer.from(htmlContent).toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/token/one-sat-ord/create-output`,
        {
          projectUid: projectUid,
          contentType: 'text/html;charset=utf8',
          b64File: b64Content,
          metadata: {
            name: profileData.username,
            subType: 'single',
            subTypeData: JSON.stringify({
              description: profileData.mission,
              title: profileData.title
            }),
            type: 'ord',
            description: profileData.mission,
            username: profileData.username,
            title: profileData.title
          }
        },
        {
          headers: {
            'Apikey': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          outputUid: response.data.data.uid
        };
      }
      
      return {
        success: false,
        error: 'Failed to create output'
      };
    } catch (error) {
      console.error('Error creating output:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create unsigned transaction
  async createTransaction(
    projectUid: string,
    publicKey: string,
    recipientAddress: string,
    outputUid: string,
    utxos: any[]
  ): Promise<{ success: boolean; transactionUid?: string; txObj?: any; error?: string }> {
    try {
      // Format UTXOs for TAAL API
      const utxoList = utxos.map(utxo => ({
        txId: utxo.tx_hash || utxo.txid,
        outputIndex: utxo.tx_pos !== undefined ? utxo.tx_pos : utxo.vout
      }));

      const response = await axios.post(
        `${this.baseUrl}/token/one-sat-ord/create-transaction`,
        {
          projectUid: projectUid,
          publicKey: publicKey,
          dstAddress: recipientAddress,
          outputList: [outputUid],
          utxoList: utxoList
        },
        {
          headers: {
            'Apikey': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          transactionUid: response.data.data.transactionUid,
          txObj: response.data.data.txObj
        };
      }
      
      return {
        success: false,
        error: 'Failed to create transaction'
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Sign transaction using BSV SDK
  async signTransaction(txObj: any, privateKey: PrivateKey): Promise<string> {
    try {
      // Create transaction from TAAL's txObj
      const tx = Transaction.fromHex(txObj.hex);
      
      // Sign the transaction
      await tx.sign();
      
      return tx.toHex();
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  // Broadcast signed transaction
  async broadcastTransaction(
    transactionUid: string,
    signedTx: string
  ): Promise<{ success: boolean; txid?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/submit`,
        {
          transactionUid: transactionUid,
          tx: signedTx
        },
        {
          headers: {
            'Apikey': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          txid: response.data.data.txId
        };
      }
      
      return {
        success: false,
        error: 'Failed to broadcast transaction'
      };
    } catch (error) {
      console.error('Error broadcasting transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Generate HTML content for the profile
  private generateProfileHTML(profileData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${profileData.username} - Profile</title>
    <style>
        body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: white;
        }
        .profile-container {
            max-width: 800px;
            margin: 0 auto;
            background: #2a2a2a;
            border-radius: 10px;
            overflow: hidden;
        }
        .background {
            height: 200px;
            background-image: url('${profileData.backgroundImage}');
            background-size: cover;
            background-position: center;
            position: relative;
        }
        .profile-content {
            padding: 20px;
            margin-top: -50px;
            position: relative;
        }
        .profile-image {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 4px solid #2a2a2a;
            background-image: url('${profileData.profileImage}');
            background-size: cover;
            background-position: center;
        }
        .username {
            font-size: 24px;
            font-weight: bold;
            margin-top: 10px;
        }
        .title {
            color: #9b59b6;
            margin: 5px 0;
        }
        .mission {
            margin-top: 15px;
            line-height: 1.6;
        }
        .metadata {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #444;
            font-size: 12px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="profile-container">
        <div class="background"></div>
        <div class="profile-content">
            <div class="profile-image"></div>
            <div class="username">${profileData.username}</div>
            <div class="title">${profileData.title}</div>
            <div class="mission">${profileData.mission}</div>
            <div class="metadata">
                <p>Protocol: BSV Profile Ordinal</p>
                <p>Created: ${new Date().toISOString()}</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  // Get project list
  async getProjects(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/project/`, {
        headers: {
          'Apikey': this.apiKey
        }
      });

      if (response.data.success) {
        return response.data.data.projectList;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  // Get outputs for a project
  async getOutputs(projectUid: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/output/by-project/${projectUid}?on-chain=1`,
        {
          headers: {
            'Apikey': this.apiKey
          }
        }
      );

      if (response.data.success) {
        return response.data.data.outputList;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching outputs:', error);
      return [];
    }
  }
}

export const ProfileToken: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'view' | 'list'>('create');
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    title: '',
    mission: '',
    profileImage: '',
    backgroundImage: ''
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
  const [retrieveTxid, setRetrieveTxid] = useState('');
  const [retrievedProfile, setRetrievedProfile] = useState<any>(null);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [taalApiKey, setTaalApiKey] = useState('');
  const [projectUid, setProjectUid] = useState('');

  const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();

  // Initialize TAAL service
  const getTAALService = () => {
    if (!taalApiKey) {
      throw new Error('Please set your TAAL API key first');
    }
    return new TAALTokenStudioService(taalApiKey, network);
  };

  // Load or create project on component mount
  useEffect(() => {
    const loadProject = async () => {
      if (taalApiKey) {
        try {
          const service = getTAALService();
          const projects = await service.getProjects();
          
          // Find existing profile project or create new one
          let profileProject = projects.find(p => p.name.includes('BSV Profile Ordinals'));
          
          if (!profileProject) {
            const result = await service.createProject('BSV Profile Ordinals Project');
            if (result.success && result.projectUid) {
              setProjectUid(result.projectUid);
            }
          } else {
            setProjectUid(profileProject.uid);
          }
        } catch (error) {
          console.error('Error loading project:', error);
        }
      }
    };

    loadProject();
  }, [taalApiKey]);

  // Handle image file selection
  const handleImageUpload = async (file: File, type: 'profile' | 'background') => {
    if (!file) return;

    // Validate file - reduced limits for ordinals
    const maxSize = type === 'profile' ? 500 * 1024 : 1 * 1024 * 1024; // 500KB for profile, 1MB for background
    if (file.size > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `File size exceeds ${type === 'profile' ? '500KB' : '1MB'} limit for ordinals` 
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', message: 'Please upload an image file' });
      return;
    }

    try {
      // Compress and convert to base64 - more aggressive compression for ordinals
      const base64 = await compressImage(file, type === 'profile' ? 150 : 600, 0.6);
      
      if (type === 'profile') {
        setProfileImageFile(file);
        setFormData({ ...formData, profileImage: base64 });
      } else {
        setBackgroundImageFile(file);
        setFormData({ ...formData, backgroundImage: base64 });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Error processing image' });
    }
  };

  // Compress image to base64
  const compressImage = (file: File, maxWidth: number, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Create profile token using TAAL API
  const createProfileToken = async () => {
    if (!keyData.privateKey) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    if (!taalApiKey) {
      setStatus({ type: 'error', message: 'Please set your TAAL API key in the settings' });
      return;
    }

    if (!projectUid) {
      setStatus({ type: 'error', message: 'No project found. Please create a project first.' });
      return;
    }

    if (!formData.username || !formData.title || !formData.mission) {
      setStatus({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Creating profile ordinal with TAAL Token Studio...' });

    try {
      const service = getTAALService();
      
      // Get UTXOs
      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs();
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available');
      }

      // Select UTXOs - TAAL handles fee calculation
      const { selected } = utxoManager.selectUTXOs(1000); // Select enough for fees
      
      if (selected.length === 0) {
        throw new Error('Insufficient funds');
      }

      // Create profile data with images
      const profileData = {
        username: formData.username,
        title: formData.title,
        mission: formData.mission,
        profileImage: formData.profileImage || generateDefaultAvatar(formData.username),
        backgroundImage: formData.backgroundImage || generateDefaultBackground()
      };

      // Step 1: Create output (token content)
      setStatus({ type: 'info', message: 'Creating token output...' });
      const outputResult = await service.createOutput(projectUid, profileData);
      
      if (!outputResult.success || !outputResult.outputUid) {
        throw new Error(outputResult.error || 'Failed to create output');
      }

      // Step 2: Create unsigned transaction
      setStatus({ type: 'info', message: 'Creating transaction...' });
      
      // Get public key from private key
      const privateKey = PrivateKey.fromWif(keyData.privateKey) || PrivateKey.fromHex(keyData.privateKey);
      const publicKey = privateKey.toPublicKey();
      const publicKeyHex = publicKey.toHex();
      
      const txResult = await service.createTransaction(
        projectUid,
        publicKeyHex,
        keyData.address, // Send to self
        outputResult.outputUid,
        selected
      );
      
      if (!txResult.success || !txResult.transactionUid || !txResult.txObj) {
        throw new Error(txResult.error || 'Failed to create transaction');
      }

      // Step 3: Sign transaction
      setStatus({ type: 'info', message: 'Signing transaction...' });
      const signedTx = await service.signTransaction(txResult.txObj, privateKey);

      // Step 4: Broadcast transaction
      setStatus({ type: 'info', message: 'Broadcasting transaction...' });
      const broadcastResult = await service.broadcastTransaction(
        txResult.transactionUid,
        signedTx
      );

      if (broadcastResult.success && broadcastResult.txid) {
        setStatus({ 
          type: 'success', 
          message: `Profile ordinal created! TX: ${broadcastResult.txid}` 
        });
        
        // Clear form
        setFormData({
          username: '',
          title: '',
          mission: '',
          profileImage: '',
          backgroundImage: ''
        });
        setProfileImageFile(null);
        setBackgroundImageFile(null);
        
        // Switch to view tab with the new txid
        setRetrieveTxid(broadcastResult.txid);
        setActiveTab('view');
      } else {
        throw new Error(broadcastResult.error || 'Failed to broadcast transaction');
      }
    } catch (error) {
      console.error('Error creating profile ordinal:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create profile ordinal' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Retrieve profile token
  const retrieveProfileToken = async () => {
    if (!retrieveTxid) {
      setStatus({ type: 'error', message: 'Please enter a transaction ID' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Retrieving profile...' });

    try {
      // For TAAL-created ordinals, we can fetch the transaction from WhatsOnChain
      const networkParam = network === 'testnet' ? 'test' : 'main';
      const response = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${networkParam}/tx/${retrieveTxid}`
      );
      
      if (response.ok) {
        const txData = await response.json();
        // Extract profile data from transaction
        // This is a simplified version - you might need to parse the actual ordinal data
        setRetrievedProfile({
          txid: retrieveTxid,
          timestamp: txData.time * 1000,
          profileData: {
            username: 'Profile Token',
            title: 'Retrieved from blockchain',
            mission: 'Transaction ID: ' + retrieveTxid
          }
        });
        setStatus({ type: 'success', message: 'Profile retrieved successfully!' });
      } else {
        setStatus({ type: 'error', message: 'Transaction not found' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to retrieve profile' });
    } finally {
      setLoading(false);
    }
  };

  // List user's profile tokens
  const listUserProfiles = async () => {
    if (!keyData.address || !taalApiKey || !projectUid) {
      setStatus({ type: 'error', message: 'Please connect wallet and set API key first' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Loading your profile ordinals...' });

    try {
      const service = getTAALService();
      const outputs = await service.getOutputs(projectUid);
      
      // Filter outputs that belong to the user
      const userOutputs = outputs.filter(output => {
        // You might need to check ownership differently
        return output.metadata && output.metadata.username;
      });
      
      setUserProfiles(userOutputs.map(output => ({
        tokenId: output.txId || output.uid,
        profileData: {
          username: output.metadata.username,
          title: output.metadata.title || '',
          mission: output.metadata.description || '',
          profileImage: '', // Would need to extract from HTML content
          backgroundImage: ''
        },
        timestamp: output.createdAt
      })));
      
      if (userOutputs.length === 0) {
        setStatus({ type: 'info', message: 'No profile ordinals found' });
      } else {
        setStatus({ type: 'success', message: `Found ${userOutputs.length} profile ordinal(s)` });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to load profiles' });
    } finally {
      setLoading(false);
    }
  };

  // Generate default avatar
  const generateDefaultAvatar = (username: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    
    ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
    ctx.fillRect(0, 0, 200, 200);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = username.substring(0, 2).toUpperCase();
    ctx.fillText(initials, 100, 100);
    
    return canvas.toDataURL('image/png');
  };

  // Generate default background
  const generateDefaultBackground = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 800, 400);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 400);
    
    return canvas.toDataURL('image/png');
  };

  // Load user profiles when switching to list tab
  useEffect(() => {
    if (activeTab === 'list' && keyData.address && taalApiKey && projectUid) {
      listUserProfiles();
    }
  }, [activeTab, keyData.address, taalApiKey, projectUid]);

  return (
    <div>
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
        <h2 className="text-xl font-semibold text-white">BSV Profile Ordinals (TAAL Token Studio)</h2>
        <p className="text-sm text-gray-300 mt-1">Create and manage your decentralized profile using 1Sat Ordinals</p>
        <p className="text-xs text-purple-300 mt-1">Powered by TAAL Token Studio API - No CORS issues!</p>
      </div>
      
      {/* API Key Setup */}
      {!taalApiKey && (
        <div className="mb-4 p-4 bg-yellow-900 bg-opacity-20 rounded-lg border border-yellow-700">
          <h3 className="text-lg font-semibold text-yellow-300 mb-2">Setup Required</h3>
          <p className="text-sm text-gray-300 mb-3">Please enter your TAAL API key to use Token Studio:</p>
          <input
            type="password"
            placeholder="Enter your TAAL API key"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            onChange={(e) => setTaalApiKey(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-2">
            Get your API key from <a href="https://platform.taal.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">platform.taal.com</a>
          </p>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="flex mb-4 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'create'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Create Profile
        </button>
        <button
          onClick={() => setActiveTab('view')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'view'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          View Profile
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'list'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          My Profiles
        </button>
      </div>

      {/* Status Message */}
      {status.type && (
        <div className={`mb-4 p-3 rounded-lg ${
          status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
          status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
          'bg-blue-900 bg-opacity-50 text-blue-300'
        }`}>
          {status.message}
        </div>
      )}

      {/* Create Profile Tab */}
      {activeTab === 'create' && taalApiKey && (
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your professional title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Mission Statement *</label>
              <textarea
                value={formData.mission}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your mission or bio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'profile')}
                  className="hidden"
                  id="profile-image-input"
                />
                <label
                  htmlFor="profile-image-input"
                  className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                >
                  {formData.profileImage ? (
                    <img
                      src={formData.profileImage}
                      alt="Profile preview"
                      className="w-32 h-32 mx-auto rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-gray-400">Click to upload profile image</p>
                      <p className="text-xs text-gray-500 mt-1">Max 500KB (optimized for ordinals)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Background Image</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'background')}
                  className="hidden"
                  id="background-image-input"
                />
                <label
                  htmlFor="background-image-input"
                  className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                >
                  {formData.backgroundImage ? (
                    <img
                      src={formData.backgroundImage}
                      alt="Background preview"
                      className="w-full h-32 mx-auto object-cover rounded"
                    />
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-400">Click to upload background image</p>
                      <p className="text-xs text-gray-500 mt-1">Max 1MB (optimized for ordinals)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <button
              onClick={createProfileToken}
              disabled={loading || !keyData.privateKey || !projectUid}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Profile Ordinal'}
            </button>

            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400">
                <span className="font-medium text-purple-400">Note:</span> Your profile will be inscribed as a 1Sat Ordinal using TAAL Token Studio.
                This service handles all the complexity of ordinal creation and broadcasting.
              </p>
              {balance.confirmed < 1000 && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ You need at least 1000 satoshis for fees. Current balance: {balance.confirmed} sats
                </p>
              )}
              <p className="text-xs text-green-400 mt-2">
                ✅ No CORS issues - TAAL API handles everything server-side
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View Profile Tab */}
      {activeTab === 'view' && (
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Transaction ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={retrieveTxid}
                  onChange={(e) => setRetrieveTxid(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter transaction ID"
                />
                <button
                  onClick={retrieveProfileToken}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Retrieve'}
                </button>
              </div>
            </div>

            {retrievedProfile && (
              <div className="mt-6 bg-gray-800 rounded-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {retrievedProfile.profileData.username}
                  </h3>
                  <p className="text-purple-400 mb-2">{retrievedProfile.profileData.title}</p>
                  <p className="text-gray-300 mb-4">{retrievedProfile.profileData.mission}</p>
                  
                  <div className="pt-4 border-t border-gray-700 text-xs text-gray-400">
                    <p>Transaction ID: {retrievedProfile.txid}</p>
                    <p>Created: {new Date(retrievedProfile.timestamp).toLocaleString()}</p>
                    <p className="text-green-400 mt-1">✅ 1Sat Ordinal (Created with TAAL)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List Profiles Tab */}
      {activeTab === 'list' && (
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
          <div className="space-y-4">
            {userProfiles.length > 0 ? (
              userProfiles.map((profile) => (
                <div key={profile.tokenId} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{profile.profileData.username}</h4>
                      <p className="text-sm text-gray-400">{profile.profileData.title}</p>
                      <p className="text-xs text-gray-500">ID: {profile.tokenId}</p>
                      <p className="text-xs text-green-400">TAAL Ordinal</p>
                    </div>
                    <button
                      onClick={() => {
                        setRetrieveTxid(profile.tokenId);
                        setActiveTab('view');
                      }}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No profile ordinals found</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 text-purple-400 hover:text-purple-300"
                >
                  Create your first profile ordinal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// import React, { useEffect, useState } from 'react';
// import { createOrdinals, fetchNftUtxos } from 'js-1sat-ord';
// import { useWalletStore } from '../store/WalletStore';

// export const ProfileToken: React.FC = () => {
//   const { keyData, network } = useWalletStore();

//   const [username, setUsername] = useState('');
//   const [title, setTitle] = useState('');
//   const [mission, setMission] = useState('');
//   const [profileImage, setProfileImage] = useState<File | null>(null);
//   const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
//   const [status, setStatus] = useState<string>('');

//   const readFileBuffer = async (file: File): Promise<Uint8Array> => {
//     if (!file) throw new Error('File not provided');
//     const buffer = await file.arrayBuffer();
//     if (!buffer || buffer.byteLength === 0) throw new Error(`Buffer empty for: ${file.name}`);
//     return new Uint8Array(buffer);
//   };

//   const createProfileInscription = async () => {
//     setStatus('⏳ Creating inscription...');

//     if (!keyData?.privateKey || !keyData?.address) {
//       setStatus('❌ Missing wallet. Please generate or import a key first.');
//       return;
//     }

//     if (!username || !title || !mission) {
//       setStatus('❌ All fields are required.');
//       return;
//     }

//     if (!profileImage || !backgroundImage) {
//       setStatus('❌ Profile and background images are required.');
//       return;
//     }

//     try {
//       const profileBuffer = await readFileBuffer(profileImage);
//       const backgroundBuffer = await readFileBuffer(backgroundImage);

//       if (!profileBuffer?.length || !backgroundBuffer?.length) {
//         console.error('❌ One or more buffers are empty:', {
//           profileBuffer,
//           backgroundBuffer,
//           profileImage,
//           backgroundImage
//         });
//         setStatus('❌ File buffers are invalid.');
//         return;
//       }

//       console.log('🔍 Debug Buffers:', {
//         profileBuffer,
//         backgroundBuffer,
//         profileImage,
//         backgroundImage
//       });

//       const profileData = {
//         app: 'ProfileDApp',
//         type: 'ord',
//         name: username,
//         title,
//         mission,
//       };

//       const data = [
//         {
//           body: JSON.stringify(profileData),
//           contentType: 'application/json'
//         },
//         {
//           body: profileBuffer,
//           contentType: profileImage?.type || 'image/png'
//         },
//         {
//           body: backgroundBuffer,
//           contentType: backgroundImage?.type || 'image/png'
//         }
//       ];

//       await createOrdinals({
//         payKey: keyData.privateKey,
//         network: network === 'testnet' ? 'test' : 'main',
//         data,
//         postage: 10000
//       });

//       setStatus('✅ Profile inscribed successfully!');
//     } catch (err: any) {
//       console.error('Inscription error:', err);
//       setStatus('❌ Failed to inscribe profile.');
//     }
//   };

//   const loadInscriptions = async () => {
//     try {
//       const address = typeof keyData.address === 'string' ? keyData.address : keyData.address?.toString?.();

//       if (!address || address.length < 20) {
//         console.warn('Invalid address for fetching UTXOs:', keyData.address);
//         return;
//       }

//       const utxos = await fetchNftUtxos({ owner: address });
//       console.log('Fetched inscriptions:', utxos);
//     } catch (err) {
//       console.error('Fetch inscriptions failed:', err);
//     }
//   };

//   useEffect(() => {
//     loadInscriptions();
//   }, [keyData.address]);

//   return (
//     <div className="p-4">
//       <h2 className="text-xl font-bold text-white mb-4">Create Profile Ordinal</h2>
//       <div className="space-y-4">
//         <input
//           type="text"
//           placeholder="Username"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//           className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
//         />
//         <input
//           type="text"
//           placeholder="Title"
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//           className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
//         />
//         <textarea
//           placeholder="Mission Statement"
//           value={mission}
//           onChange={(e) => setMission(e.target.value)}
//           className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
//         />
//         <div>
//           <label className="text-white">Profile Image</label>
//           <input
//             type="file"
//             accept="image/*"
//             onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
//             className="block text-white mt-1"
//           />
//         </div>
//         <div>
//           <label className="text-white">Background Image</label>
//           <input
//             type="file"
//             accept="image/*"
//             onChange={(e) => setBackgroundImage(e.target.files?.[0] || null)}
//             className="block text-white mt-1"
//           />
//         </div>
//         <button
//           onClick={createProfileInscription}
//           className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
//         >
//           Inscribe Profile
//         </button>
//         {status && <p className="text-sm text-white mt-2">{status}</p>}
//       </div>
//     </div>
//   );
// };




















// Above is ChatGPT Develomment
// This is claude wallet development; Tried But failed mostly to get this into a 1SAT ordinal transaction. 
// import React, { useState, useEffect } from 'react';
// import { useWalletStore } from '../store/WalletStore';
// import { PrivateKey } from '@bsv/sdk';

// // Polyfill Buffer for browser environment
// if (typeof window !== 'undefined' && !window.Buffer) {
//   window.Buffer = {
//     from: (data: any, encoding?: string) => {
//       if (encoding === 'hex') {
//         const bytes = [];
//         for (let i = 0; i < data.length; i += 2) {
//           bytes.push(parseInt(data.substr(i, 2), 16));
//         }
//         return new Uint8Array(bytes);
//       } else if (typeof data === 'string') {
//         return new TextEncoder().encode(data);
//       }
//       return new Uint8Array(data);
//     },
//     alloc: (size: number) => new Uint8Array(size),
//     concat: (arrays: Uint8Array[]) => {
//       const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
//       const result = new Uint8Array(totalLength);
//       let offset = 0;
//       for (const arr of arrays) {
//         result.set(arr, offset);
//         offset += arr.length;
//       }
//       return result;
//     },
//     isBuffer: (obj: any) => obj instanceof Uint8Array
//   } as any;
// }

// // Import js-1sat-ord after Buffer polyfill
// const { 
//   createOrdinals,
//   OneSatBroadcaster
// } = require('js-1sat-ord');

// interface ProfileFormData {
//   username: string;
//   title: string;
//   mission: string;
//   profileImage: string;
//   backgroundImage: string;
// }

// interface ProfileInscription {
//   p: string; // protocol identifier
//   op: string; // operation
//   data: ProfileFormData;
//   timestamp: number;
//   version: string;
// }

// // Helper function to convert string to base64 (browser-compatible)
// const stringToBase64 = (str: string): string => {
//   return btoa(unescape(encodeURIComponent(str)));
// };

// // Helper function to convert base64 to string (browser-compatible)
// const base64ToString = (base64: string): string => {
//   return decodeURIComponent(escape(atob(base64)));
// };

// export const ProfileToken: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<'create' | 'view' | 'list'>('create');
//   const [formData, setFormData] = useState<ProfileFormData>({
//     username: '',
//     title: '',
//     mission: '',
//     profileImage: '',
//     backgroundImage: ''
//   });
//   const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
//   const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
//   const [retrieveTxid, setRetrieveTxid] = useState('');
//   const [retrievedProfile, setRetrievedProfile] = useState<any>(null);
//   const [userProfiles, setUserProfiles] = useState<any[]>([]);

//   const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();

//   // Handle image file selection
//   const handleImageUpload = async (file: File, type: 'profile' | 'background') => {
//     if (!file) return;

//     // Validate file
//     const maxSize = type === 'profile' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
//     if (file.size > maxSize) {
//       setStatus({ 
//         type: 'error', 
//         message: `File size exceeds ${type === 'profile' ? '2MB' : '5MB'} limit` 
//       });
//       return;
//     }

//     if (!file.type.startsWith('image/')) {
//       setStatus({ type: 'error', message: 'Please upload an image file' });
//       return;
//     }

//     try {
//       // Compress and convert to base64
//       const base64 = await compressImage(file, type === 'profile' ? 400 : 1200);
      
//       if (type === 'profile') {
//         setProfileImageFile(file);
//         setFormData({ ...formData, profileImage: base64 });
//       } else {
//         setBackgroundImageFile(file);
//         setFormData({ ...formData, backgroundImage: base64 });
//       }
//     } catch (error) {
//       setStatus({ type: 'error', message: 'Error processing image' });
//     }
//   };

//   // Compress image to base64
//   const compressImage = (file: File, maxWidth: number): Promise<string> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const img = new Image();
//         img.onload = () => {
//           const canvas = document.createElement('canvas');
//           const ctx = canvas.getContext('2d')!;
          
//           let width = img.width;
//           let height = img.height;
          
//           if (width > height) {
//             if (width > maxWidth) {
//               height = Math.round((height * maxWidth) / width);
//               width = maxWidth;
//             }
//           } else {
//             if (height > maxWidth) {
//               width = Math.round((width * maxWidth) / height);
//               height = maxWidth;
//             }
//           }
          
//           canvas.width = width;
//           canvas.height = height;
//           ctx.drawImage(img, 0, 0, width, height);
          
//           resolve(canvas.toDataURL('image/jpeg', 0.8));
//         };
//         img.onerror = reject;
//         img.src = e.target?.result as string;
//       };
//       reader.onerror = reject;
//       reader.readAsDataURL(file);
//     });
//   };

//   // Create profile token using 1satordinals
//   const createProfileToken = async () => {
//     if (!keyData.privateKey) {
//       setStatus({ type: 'error', message: 'Please connect your wallet first' });
//       return;
//     }

//     if (!formData.username || !formData.title || !formData.mission) {
//       setStatus({ type: 'error', message: 'Please fill in all required fields' });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Creating profile inscription...' });

//     try {
//       // Create profile inscription data
//       const profileInscription: ProfileInscription = {
//         p: 'bsv-profile',
//         op: 'create',
//         data: {
//           username: formData.username,
//           title: formData.title,
//           mission: formData.mission,
//           profileImage: formData.profileImage || generateDefaultAvatar(formData.username),
//           backgroundImage: formData.backgroundImage || generateDefaultBackground()
//         },
//         timestamp: Date.now(),
//         version: '1.0'
//       };

//       // Convert to base64 using browser-compatible method
//       const inscriptionJson = JSON.stringify(profileInscription);
//       const inscriptionBase64 = stringToBase64(inscriptionJson);
      
//       // Get the private key in the correct format
//       let paymentPk: PrivateKey;
//       if (keyData.privateKey && typeof keyData.privateKey.toHex === 'function') {
//         // If it's already a PrivateKey object from @bsv/sdk
//         paymentPk = keyData.privateKey as any;
//       } else if (keyData.privateKeyHex) {
//         // Create from hex
//         paymentPk = PrivateKey.fromHex(keyData.privateKeyHex);
//       } else if (keyData.privateKeyWif) {
//         // Create from WIF
//         paymentPk = PrivateKey.fromWif(keyData.privateKeyWif);
//       } else {
//         throw new Error('Private key not available in correct format');
//       }

//       // Fetch UTXOs for the address
//       const paymentAddress = keyData.address;
//       console.log('Fetching UTXOs for address:', paymentAddress);
//       console.log('Network:', network);
//       console.log('API Key available:', !!whatsOnChainApiKey);
      
//       let utxos;
//       try {
//         // Prepare headers with API key if available
//         const headers: HeadersInit = {
//           'Accept': 'application/json',
//           'Content-Type': 'application/json'
//         };
        
//         if (whatsOnChainApiKey) {
//           headers['Authorization'] = `Bearer ${whatsOnChainApiKey}`;
//         }
        
//         // Always use WhatsOnChain API directly for reliability
//         const utxoResponse = await fetch(
//           `https://api.whatsonchain.com/v1/bsv/${network}/address/${paymentAddress}/unspent`,
//           { headers }
//         );
        
//         if (!utxoResponse.ok) {
//           const errorText = await utxoResponse.text();
//           console.error('UTXO fetch error response:', errorText);
          
//           if (utxoResponse.status === 401) {
//             throw new Error('API authentication failed. Please check your WhatsOnChain API key.');
//           } else if (utxoResponse.status === 404) {
//             throw new Error('Address not found or has no UTXOs.');
//           } else if (utxoResponse.status === 429) {
//             throw new Error('API rate limit exceeded. Please try again later.');
//           }
          
//           throw new Error(`Failed to fetch UTXOs: ${utxoResponse.status}`);
//         }
        
//         const rawUtxos = await utxoResponse.json();
//         console.log('Raw UTXOs from WhatsOnChain:', rawUtxos);
        
//         if (!Array.isArray(rawUtxos)) {
//           throw new Error('Invalid UTXO response format');
//         }
        
//         if (rawUtxos.length === 0) {
//           // Check balance to provide better error message
//           const balanceResponse = await fetch(
//             `https://api.whatsonchain.com/v1/bsv/${network}/address/${paymentAddress}/balance`,
//             { headers }
//           );
          
//           if (balanceResponse.ok) {
//             const balanceData = await balanceResponse.json();
//             if (balanceData.confirmed === 0) {
//               throw new Error('No funds available in wallet. Please add funds to create inscriptions.');
//             } else {
//               throw new Error(`Wallet shows ${balanceData.confirmed} satoshis but no spendable UTXOs found.`);
//             }
//           }
//           throw new Error('No UTXOs available for this address.');
//         }
        
//         // Convert to the format expected by js-1sat-ord
//         utxos = [];
//         for (const utxo of rawUtxos) {
//           try {
//             // Fetch the full transaction to get the script
//             const txResponse = await fetch(
//               `https://api.whatsonchain.com/v1/bsv/${network}/tx/${utxo.tx_hash}`,
//               { headers }
//             );
            
//             if (!txResponse.ok) {
//               console.error(`Failed to fetch tx ${utxo.tx_hash}: ${txResponse.status}`);
//               continue;
//             }
            
//             const txData = await txResponse.json();
//             const output = txData.vout[utxo.tx_pos];
            
//             if (!output || !output.scriptPubKey || !output.scriptPubKey.hex) {
//               console.error(`Invalid output format for tx ${utxo.tx_hash} vout ${utxo.tx_pos}`);
//               continue;
//             }
            
//             // Convert hex script to base64
//             const hexScript = output.scriptPubKey.hex;
//             // Create a proper base64 encoding from hex
//             const bytes = [];
//             for (let i = 0; i < hexScript.length; i += 2) {
//               bytes.push(parseInt(hexScript.substr(i, 2), 16));
//             }
//             const base64Script = btoa(String.fromCharCode.apply(null, bytes));
            
//             utxos.push({
//               satoshis: utxo.value,
//               txid: utxo.tx_hash,
//               vout: utxo.tx_pos,
//               script: base64Script
//             });
            
//             console.log(`Processed UTXO: ${utxo.tx_hash}:${utxo.tx_pos} with ${utxo.value} satoshis`);
//           } catch (txError) {
//             console.error('Error processing UTXO:', txError);
//             // Continue with other UTXOs
//           }
//         }
        
//         if (utxos.length === 0) {
//           throw new Error('Failed to process any UTXOs. Transaction data may be corrupted.');
//         }
        
//         console.log(`Successfully processed ${utxos.length} UTXOs`);
//       } catch (fetchError) {
//         console.error('Error fetching UTXOs:', fetchError);
        
//         // Provide helpful error messages
//         if (fetchError instanceof Error) {
//           if (fetchError.message.includes('Failed to fetch')) {
//             throw new Error('Network error: Unable to connect to WhatsOnChain API. Please check your internet connection.');
//           }
//           throw fetchError;
//         }
        
//         throw new Error('Failed to fetch UTXOs. Please check your network connection and try again.');
//       }

//       if (!utxos || utxos.length === 0) {
//         throw new Error('No UTXOs available. Please fund your wallet first.');
//       }

//       console.log('Using UTXOs:', utxos);

//       // Create the inscription object
//       const inscription = {
//         dataB64: inscriptionBase64,
//         contentType: 'application/json'
//       };

//       // Create ordinals inscription
//       const ordinalsConfig = {
//         utxos: utxos,
//         destinations: [{
//           address: paymentAddress,
//           inscription: inscription
//         }],
//         paymentPk: paymentPk,
//         changeAddress: paymentAddress,
//         satsPerKb: 50,
//         network: network === 'testnet' ? 'testnet' : 'mainnet'
//       };

//       console.log('Creating ordinals with config:', {
//         ...ordinalsConfig,
//         paymentPk: 'PrivateKey[hidden]'
//       });

//       const result = await createOrdinals(ordinalsConfig);
//       console.log('createOrdinals result:', result);

//       // Get the raw transaction hex
//       const rawTx = result.hex || result.tx?.hex || result;
      
//       if (!rawTx) {
//         throw new Error('Failed to get transaction hex from createOrdinals');
//       }

//       // Broadcast the transaction
//       console.log('Broadcasting transaction...');
      
//       let txid: string;
      
//       // Try using OneSatBroadcaster if available
//       try {
//         const broadcaster = new OneSatBroadcaster(network);
//         const broadcastResult = await result.tx.broadcast(broadcaster);
        
//         if (broadcastResult.status === 'success') {
//           txid = broadcastResult.txid;
//         } else {
//           throw new Error(broadcastResult.message || 'Broadcast failed');
//         }
//       } catch (broadcasterError) {
//         console.log('OneSatBroadcaster failed, using WhatsOnChain API');
        
//         // Fallback to WhatsOnChain API
//         const broadcastResponse = await fetch(
//           `https://api.whatsonchain.com/v1/bsv/${network}/tx/raw`,
//           {
//             method: 'POST',
//             headers: headers,
//             body: JSON.stringify({ txhex: rawTx })
//           }
//         );

//         if (!broadcastResponse.ok) {
//           const errorData = await broadcastResponse.text();
//           throw new Error(`Broadcast failed: ${errorData}`);
//         }

//         txid = await broadcastResponse.text();
//         txid = txid.replace(/['"]/g, '');
//       }

//       console.log('Transaction broadcast successful:', txid);

//       setStatus({ 
//         type: 'success', 
//         message: `Profile inscription created! TX: ${txid}` 
//       });
      
//       // Clear form
//       setFormData({
//         username: '',
//         title: '',
//         mission: '',
//         profileImage: '',
//         backgroundImage: ''
//       });
//       setProfileImageFile(null);
//       setBackgroundImageFile(null);
      
//       // Switch to view tab with the new txid
//       setRetrieveTxid(txid);
//       setActiveTab('view');

//     } catch (error) {
//       console.error('Error creating profile inscription:', error);
//       setStatus({ 
//         type: 'error', 
//         message: error instanceof Error ? error.message : 'Failed to create profile inscription' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Retrieve profile inscription from 1satordinals
//   const retrieveProfileToken = async () => {
//     if (!retrieveTxid) {
//       setStatus({ type: 'error', message: 'Please enter a transaction ID' });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Retrieving profile inscription...' });

//     try {
//       // First, get the transaction to find the inscription
//       const txResponse = await fetch(
//         `https://api.whatsonchain.com/v1/bsv/${network}/tx/${retrieveTxid}/hex`
//       );

//       if (!txResponse.ok) {
//         throw new Error('Transaction not found');
//       }

//       const txHex = await txResponse.text();
      
//       // Parse the transaction to extract inscription data
//       // In a real implementation, you would use a proper parser
//       // For now, we'll use the ordinals API if available
//       const ordinalsResponse = await fetch(
//         `https://ordinals.gorillapool.io/api/inscriptions/txid/${retrieveTxid}`
//       );

//       if (ordinalsResponse.ok) {
//         const inscriptions = await ordinalsResponse.json();
        
//         if (inscriptions.length > 0) {
//           const inscription = inscriptions[0];
          
//           // Fetch the inscription content
//           const contentResponse = await fetch(
//             `https://ordinals.gorillapool.io/api/files/inscriptions/${inscription.origin}`
//           );
          
//           if (contentResponse.ok) {
//             const contentText = await contentResponse.text();
//             const profileData = JSON.parse(contentText);
            
//             setRetrievedProfile({
//               profileData: profileData.data,
//               tokenId: retrieveTxid,
//               inscriptionId: inscription.origin,
//               inscriptionNumber: inscription.id,
//               owner: keyData.address, // This would need to be determined from UTXOs
//               timestamp: profileData.timestamp
//             });
            
//             setStatus({ type: 'success', message: 'Profile inscription retrieved successfully!' });
//           }
//         } else {
//           setStatus({ type: 'error', message: 'No inscription found in this transaction' });
//         }
//       } else {
//         // Fallback: try to parse from raw transaction
//         setStatus({ type: 'error', message: 'Unable to retrieve inscription data' });
//       }
//     } catch (error) {
//       console.error('Error retrieving profile:', error);
//       setStatus({ 
//         type: 'error', 
//         message: 'Failed to retrieve profile inscription' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // List user's profile inscriptions
//   const listUserProfiles = async () => {
//     if (!keyData.address) {
//       setStatus({ type: 'error', message: 'Please connect your wallet first' });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Loading your profile inscriptions...' });

//     try {
//       // Get all UTXOs for the address that might contain inscriptions
//       const utxosResponse = await fetch(
//         `https://ordinals.gorillapool.io/api/utxos/address/${keyData.address}/inscriptions`
//       );

//       if (utxosResponse.ok) {
//         const utxos = await utxosResponse.json();
        
//         // Filter for profile inscriptions
//         const profilePromises = utxos.map(async (utxo: any) => {
//           try {
//             const contentResponse = await fetch(
//               `https://ordinals.gorillapool.io/api/files/inscriptions/${utxo.origin}`
//             );
            
//             if (contentResponse.ok) {
//               const contentText = await contentResponse.text();
//               const data = JSON.parse(contentText);
              
//               if (data.p === 'bsv-profile' && data.op === 'create') {
//                 return {
//                   profileData: data.data,
//                   tokenId: utxo.txid,
//                   inscriptionId: utxo.origin,
//                   timestamp: data.timestamp
//                 };
//               }
//             }
//           } catch (e) {
//             // Not a valid profile inscription
//           }
//           return null;
//         });

//         const profiles = (await Promise.all(profilePromises)).filter(p => p !== null);
//         setUserProfiles(profiles);
        
//         if (profiles.length === 0) {
//           setStatus({ type: 'info', message: 'No profile inscriptions found for your address' });
//         } else {
//           setStatus({ type: 'success', message: `Found ${profiles.length} profile inscription(s)` });
//         }
//       } else {
//         throw new Error('Failed to fetch inscriptions');
//       }
//     } catch (error) {
//       console.error('Error loading profiles:', error);
//       setStatus({ type: 'error', message: 'Failed to load profile inscriptions' });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Generate default avatar
//   const generateDefaultAvatar = (username: string): string => {
//     const canvas = document.createElement('canvas');
//     canvas.width = 200;
//     canvas.height = 200;
//     const ctx = canvas.getContext('2d')!;
    
//     let hash = 0;
//     for (let i = 0; i < username.length; i++) {
//       hash = username.charCodeAt(i) + ((hash << 5) - hash);
//     }
//     const hue = Math.abs(hash % 360);
    
//     ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
//     ctx.fillRect(0, 0, 200, 200);
    
//     ctx.fillStyle = 'white';
//     ctx.font = 'bold 80px Arial';
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';
//     const initials = username.substring(0, 2).toUpperCase();
//     ctx.fillText(initials, 100, 100);
    
//     return canvas.toDataURL('image/png');
//   };

//   // Generate default background
//   const generateDefaultBackground = (): string => {
//     const canvas = document.createElement('canvas');
//     canvas.width = 800;
//     canvas.height = 400;
//     const ctx = canvas.getContext('2d')!;
    
//     const gradient = ctx.createLinearGradient(0, 0, 800, 400);
//     gradient.addColorStop(0, '#667eea');
//     gradient.addColorStop(1, '#764ba2');
//     ctx.fillStyle = gradient;
//     ctx.fillRect(0, 0, 800, 400);
    
//     return canvas.toDataURL('image/png');
//   };

//   // Load user profiles when switching to list tab
//   useEffect(() => {
//     if (activeTab === 'list' && keyData.address) {
//       listUserProfiles();
//     }
//   }, [activeTab, keyData.address]);

//   return (
//     <div>
//       <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
//         <h2 className="text-xl font-semibold text-white">BSV Profile Inscriptions (1Sat Ordinals)</h2>
//         <p className="text-sm text-gray-300 mt-1">Create and manage your decentralized profile using 1satordinals protocol</p>
//       </div>
      
//       {/* Tab Navigation */}
//       <div className="flex mb-4 bg-gray-800 rounded-lg p-1">
//         <button
//           onClick={() => setActiveTab('create')}
//           className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
//             activeTab === 'create'
//               ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
//               : 'text-gray-400 hover:text-white'
//           }`}
//         >
//           Inscribe Profile
//         </button>
//         <button
//           onClick={() => setActiveTab('view')}
//           className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
//             activeTab === 'view'
//               ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
//               : 'text-gray-400 hover:text-white'
//           }`}
//         >
//           View Inscription
//         </button>
//         <button
//           onClick={() => setActiveTab('list')}
//           className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
//             activeTab === 'list'
//               ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
//               : 'text-gray-400 hover:text-white'
//           }`}
//         >
//           My Inscriptions
//         </button>
//       </div>

//       {/* Status Message */}
//       {status.type && (
//         <div className={`mb-4 p-3 rounded-lg ${
//           status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
//           status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
//           'bg-blue-900 bg-opacity-50 text-blue-300'
//         }`}>
//           {status.message}
//         </div>
//       )}

//       {/* Create Profile Tab */}
//       {activeTab === 'create' && (
//         <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//           <div className="space-y-4">
//             <div className="p-3 bg-purple-900 bg-opacity-30 rounded-lg mb-4">
//               <p className="text-sm text-purple-300">
//                 <span className="font-semibold">1Sat Ordinals:</span> Your profile will be inscribed on a single satoshi, creating a permanent and transferable digital identity.
//               </p>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Username *</label>
//               <input
//                 type="text"
//                 value={formData.username}
//                 onChange={(e) => setFormData({ ...formData, username: e.target.value })}
//                 className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 placeholder="Enter your username"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
//               <input
//                 type="text"
//                 value={formData.title}
//                 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
//                 className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 placeholder="Your professional title"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Mission Statement *</label>
//               <textarea
//                 value={formData.mission}
//                 onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
//                 rows={3}
//                 className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 placeholder="Your mission or bio"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image</label>
//               <div className="relative">
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'profile')}
//                   className="hidden"
//                   id="profile-image-input"
//                 />
//                 <label
//                   htmlFor="profile-image-input"
//                   className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                 >
//                   {formData.profileImage ? (
//                     <img
//                       src={formData.profileImage}
//                       alt="Profile preview"
//                       className="w-32 h-32 mx-auto rounded-full object-cover"
//                     />
//                   ) : (
//                     <div className="text-center">
//                       <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                       </svg>
//                       <p className="text-gray-400">Click to upload profile image</p>
//                       <p className="text-xs text-gray-500 mt-1">Max 2MB (will be inscribed on-chain)</p>
//                     </div>
//                   )}
//                 </label>
//               </div>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Background Image</label>
//               <div className="relative">
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'background')}
//                   className="hidden"
//                   id="background-image-input"
//                 />
//                 <label
//                   htmlFor="background-image-input"
//                   className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                 >
//                   {formData.backgroundImage ? (
//                     <img
//                       src={formData.backgroundImage}
//                       alt="Background preview"
//                       className="w-full h-32 mx-auto object-cover rounded"
//                     />
//                   ) : (
//                     <div className="text-center">
//                       <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                       </svg>
//                       <p className="text-gray-400">Click to upload background image</p>
//                       <p className="text-xs text-gray-500 mt-1">Max 5MB (will be inscribed on-chain)</p>
//                     </div>
//                   )}
//                 </label>
//               </div>
//             </div>

//             <button
//               onClick={createProfileToken}
//               disabled={loading || !keyData.privateKey}
//               className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {loading ? 'Creating Inscription...' : 'Create Profile Inscription'}
//             </button>

//             <div className="p-3 bg-gray-800 rounded-lg">
//               <p className="text-xs text-gray-400">
//                 <span className="font-medium text-purple-400">Note:</span> Your profile will be permanently inscribed on a single satoshi using the 1satordinals protocol.
//                 This creates a unique, transferable digital identity on the BSV blockchain.
//               </p>
//               {balance.confirmed < 2000 && (
//                 <p className="text-xs text-yellow-400 mt-2">
//                   ⚠️ You need at least 2000 satoshis to create a profile inscription. Current balance: {balance.confirmed} sats
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* View Profile Tab */}
//       {activeTab === 'view' && (
//         <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Transaction ID or Inscription ID</label>
//               <div className="flex gap-2">
//                 <input
//                   type="text"
//                   value={retrieveTxid}
//                   onChange={(e) => setRetrieveTxid(e.target.value)}
//                   className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
//                   placeholder="Enter transaction ID or inscription ID"
//                 />
//                 <button
//                   onClick={retrieveProfileToken}
//                   disabled={loading}
//                   className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
//                 >
//                   {loading ? 'Loading...' : 'Retrieve'}
//                 </button>
//               </div>
//             </div>

//             {retrievedProfile && (
//               <div className="mt-6 bg-gray-800 rounded-lg overflow-hidden">
//                 <div
//                   className="h-48 bg-cover bg-center relative"
//                   style={{ backgroundImage: `url(${retrievedProfile.profileData.backgroundImage})` }}
//                 >
//                   <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent" />
//                   <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
//                     Inscription #{retrievedProfile.inscriptionNumber || 'N/A'}
//                   </div>
//                 </div>
                
//                 <div className="p-6 -mt-16 relative">
//                   <img
//                     src={retrievedProfile.profileData.profileImage}
//                     alt={retrievedProfile.profileData.username}
//                     className="w-32 h-32 rounded-full border-4 border-gray-800 mb-4"
//                   />
                  
//                   <h3 className="text-2xl font-bold text-white mb-1">
//                     {retrievedProfile.profileData.username}
//                   </h3>
//                   <p className="text-purple-400 mb-3">{retrievedProfile.profileData.title}</p>
//                   <p className="text-gray-300 mb-4">{retrievedProfile.profileData.mission}</p>
                  
//                   <div className="pt-4 border-t border-gray-700 text-xs text-gray-400 space-y-1">
//                     <p><span className="font-medium">Transaction ID:</span> {retrievedProfile.tokenId}</p>
//                     <p><span className="font-medium">Inscription ID:</span> {retrievedProfile.inscriptionId}</p>
//                     <p><span className="font-medium">Owner:</span> {retrievedProfile.owner}</p>
//                     <p><span className="font-medium">Created:</span> {new Date(retrievedProfile.timestamp).toLocaleString()}</p>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* List Profiles Tab */}
//       {activeTab === 'list' && (
//         <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//           <div className="space-y-4">
//             {userProfiles.length > 0 ? (
//               userProfiles.map((profile) => (
//                 <div key={profile.inscriptionId} className="bg-gray-800 rounded-lg p-4">
//                   <div className="flex items-center gap-4">
//                     <img
//                       src={profile.profileData.profileImage}
//                       alt={profile.profileData.username}
//                       className="w-16 h-16 rounded-full"
//                     />
//                     <div className="flex-1">
//                       <h4 className="text-white font-medium">{profile.profileData.username}</h4>
//                       <p className="text-sm text-gray-400">{profile.profileData.title}</p>
//                       <p className="text-xs text-gray-500">Inscription: {profile.inscriptionId}</p>
//                       <p className="text-xs text-gray-500">Created: {new Date(profile.timestamp).toLocaleDateString()}</p>
//                     </div>
//                     <button
//                       onClick={() => {
//                         setRetrieveTxid(profile.tokenId);
//                         setActiveTab('view');
//                         retrieveProfileToken();
//                       }}
//                       className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
//                     >
//                       View
//                     </button>
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <div className="text-center py-8 text-gray-400">
//                 <p>No profile inscriptions found</p>
//                 <button
//                   onClick={() => setActiveTab('create')}
//                   className="mt-4 text-purple-400 hover:text-purple-300"
//                 >
//                   Create your first profile inscription
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };













//// orginal working Code lacking the 1Sat integrateion 

// import React, { useState, useEffect } from 'react';
// import { useWalletStore } from '../store/WalletStore';
// import { ProfileTokenService } from '../services/ProfileTokenService';
// import { UTXOManager } from '../utils/blockchain';

// interface ProfileFormData {
//   username: string;
//   title: string;
//   mission: string;
//   profileImage: string;
//   backgroundImage: string;
// }

// export const ProfileToken: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<'create' | 'view' | 'list'>('create');
//   const [formData, setFormData] = useState<ProfileFormData>({
//     username: '',
//     title: '',
//     mission: '',
//     profileImage: '',
//     backgroundImage: ''
//   });
//   const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
//   const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
//   const [retrieveTxid, setRetrieveTxid] = useState('');
//   const [retrievedProfile, setRetrievedProfile] = useState<any>(null);
//   const [userProfiles, setUserProfiles] = useState<any[]>([]);

//   const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();
//   const profileService = new ProfileTokenService(network, whatsOnChainApiKey);

//   // Handle image file selection
//   const handleImageUpload = async (file: File, type: 'profile' | 'background') => {
//     if (!file) return;

//     // Validate file
//     const maxSize = type === 'profile' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
//     if (file.size > maxSize) {
//       setStatus({ 
//         type: 'error', 
//         message: `File size exceeds ${type === 'profile' ? '2MB' : '5MB'} limit` 
//       });
//       return;
//     }

//     if (!file.type.startsWith('image/')) {
//       setStatus({ type: 'error', message: 'Please upload an image file' });
//       return;
//     }

//     try {
//       // Compress and convert to base64
//       const base64 = await compressImage(file, type === 'profile' ? 400 : 1200);
      
//       if (type === 'profile') {
//         setProfileImageFile(file);
//         setFormData({ ...formData, profileImage: base64 });
//       } else {
//         setBackgroundImageFile(file);
//         setFormData({ ...formData, backgroundImage: base64 });
//       }
//     } catch (error) {
//       setStatus({ type: 'error', message: 'Error processing image' });
//     }
//   };

//   // Compress image to base64
//   const compressImage = (file: File, maxWidth: number): Promise<string> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const img = new Image();
//         img.onload = () => {
//           const canvas = document.createElement('canvas');
//           const ctx = canvas.getContext('2d')!;
          
//           let width = img.width;
//           let height = img.height;
          
//           if (width > height) {
//             if (width > maxWidth) {
//               height = Math.round((height * maxWidth) / width);
//               width = maxWidth;
//             }
//           } else {
//             if (height > maxWidth) {
//               width = Math.round((width * maxWidth) / height);
//               height = maxWidth;
//             }
//           }
          
//           canvas.width = width;
//           canvas.height = height;
//           ctx.drawImage(img, 0, 0, width, height);
          
//           resolve(canvas.toDataURL('image/jpeg', 0.8));
//         };
//         img.onerror = reject;
//         img.src = e.target?.result as string;
//       };
//       reader.onerror = reject;
//       reader.readAsDataURL(file);
//     });
//   };

//   // Create profile token
//   const createProfileToken = async () => {
//     if (!keyData.privateKey) {
//       setStatus({ type: 'error', message: 'Please connect your wallet first' });
//       return;
//     }

//     if (!formData.username || !formData.title || !formData.mission) {
//       setStatus({ type: 'error', message: 'Please fill in all required fields' });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Creating profile token...' });

//     try {
//       // Get UTXOs - matching the pattern from Conversations
//       const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//       const utxos = await utxoManager.fetchUTXOs();
      
//       console.log(`Fetched ${utxos.length} UTXOs for profile token creation`);
//       console.log('Sample UTXO structure:', utxos[0]);
      
//       if (utxos.length === 0) {
//         // Check balance to provide better error message
//         const balanceCheck = await fetch(
//           `https://api.whatsonchain.com/v1/bsv/${network}/address/${keyData.address}/balance`
//         );
//         const balanceData = await balanceCheck.json();
//         throw new Error(`No UTXOs available. Balance: ${balanceData.confirmed} confirmed, ${balanceData.unconfirmed} unconfirmed satoshis`);
//       }

//       // Select UTXOs for transaction - use the same amount as Conversations (1500 + fee buffer)
//       const { selected, total } = utxoManager.selectUTXOs(1500);
      
//       if (selected.length === 0) {
//         throw new Error(`Insufficient funds. You have ${total} satoshis but need at least 1500.`);
//       }

//       console.log(`Selected ${selected.length} UTXOs with total: ${total} satoshis`);

//       // Create profile with default images if not provided
//       const profileData = {
//         username: formData.username,
//         title: formData.title,
//         mission: formData.mission,
//         profileImage: formData.profileImage || generateDefaultAvatar(formData.username),
//         backgroundImage: formData.backgroundImage || generateDefaultBackground()
//       };

//       // Create and broadcast transaction
//       const result = await profileService.createProfileToken(
//         keyData.privateKey,
//         profileData,
//         selected
//       );

//       if (result.success && result.txid) {
//         setStatus({ 
//           type: 'success', 
//           message: `Profile token created! TX: ${result.txid}` 
//         });
        
//         // Clear form
//         setFormData({
//           username: '',
//           title: '',
//           mission: '',
//           profileImage: '',
//           backgroundImage: ''
//         });
//         setProfileImageFile(null);
//         setBackgroundImageFile(null);
        
//         // Switch to view tab with the new txid
//         setRetrieveTxid(result.txid);
//         setActiveTab('view');
//       } else {
//         throw new Error(result.error || 'Failed to create profile token');
//       }
//     } catch (error) {
//       console.error('Error creating profile token:', error);
//       setStatus({ 
//         type: 'error', 
//         message: error instanceof Error ? error.message : 'Failed to create profile token' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Retrieve profile token
//   const retrieveProfileToken = async () => {
//     if (!retrieveTxid) {
//       setStatus({ type: 'error', message: 'Please enter a transaction ID' });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Retrieving profile...' });

//     try {
//       const profile = await profileService.retrieveProfileToken(retrieveTxid);
      
//       if (profile) {
//         setRetrievedProfile(profile);
//         setStatus({ type: 'success', message: 'Profile retrieved successfully!' });
//       } else {
//         setStatus({ type: 'error', message: 'Profile not found' });
//       }
//     } catch (error) {
//       setStatus({ 
//         type: 'error', 
//         message: 'Failed to retrieve profile' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // List user's profile tokens
//   const listUserProfiles = async () => {
//     if (!keyData.address) {
//       setStatus({ type: 'error', message: 'Please connect your wallet first' });
//       return;
//     }

//     setLoading(true);
//     setStatus({ type: 'info', message: 'Loading your profiles...' });

//     try {
//       const profiles = await profileService.listProfileTokens(keyData.address);
//       setUserProfiles(profiles);
      
//       if (profiles.length === 0) {
//         setStatus({ type: 'info', message: 'No profile tokens found for your address' });
//       } else {
//         setStatus({ type: 'success', message: `Found ${profiles.length} profile token(s)` });
//       }
//     } catch (error) {
//       setStatus({ type: 'error', message: 'Failed to load profiles' });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Generate default avatar
//   const generateDefaultAvatar = (username: string): string => {
//     const canvas = document.createElement('canvas');
//     canvas.width = 200;
//     canvas.height = 200;
//     const ctx = canvas.getContext('2d')!;
    
//     let hash = 0;
//     for (let i = 0; i < username.length; i++) {
//       hash = username.charCodeAt(i) + ((hash << 5) - hash);
//     }
//     const hue = Math.abs(hash % 360);
    
//     ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
//     ctx.fillRect(0, 0, 200, 200);
    
//     ctx.fillStyle = 'white';
//     ctx.font = 'bold 80px Arial';
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';
//     const initials = username.substring(0, 2).toUpperCase();
//     ctx.fillText(initials, 100, 100);
    
//     return canvas.toDataURL('image/png');
//   };

//   // Generate default background
//   const generateDefaultBackground = (): string => {
//     const canvas = document.createElement('canvas');
//     canvas.width = 800;
//     canvas.height = 400;
//     const ctx = canvas.getContext('2d')!;
    
//     const gradient = ctx.createLinearGradient(0, 0, 800, 400);
//     gradient.addColorStop(0, '#667eea');
//     gradient.addColorStop(1, '#764ba2');
//     ctx.fillStyle = gradient;
//     ctx.fillRect(0, 0, 800, 400);
    
//     return canvas.toDataURL('image/png');
//   };

//   // Load user profiles when switching to list tab
//   useEffect(() => {
//     if (activeTab === 'list' && keyData.address) {
//       listUserProfiles();
//     }
//   }, [activeTab, keyData.address]);

//   return (
//     <div>
//       <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
//         <h2 className="text-xl font-semibold text-white">BSV Profile Tokens</h2>
//         <p className="text-sm text-gray-300 mt-1">Create and manage your decentralized profile on the blockchain</p>
//       </div>
      
//       {/* Tab Navigation */}
//       <div className="flex mb-4 bg-gray-800 rounded-lg p-1">
//         <button
//           onClick={() => setActiveTab('create')}
//           className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
//             activeTab === 'create'
//               ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
//               : 'text-gray-400 hover:text-white'
//           }`}
//         >
//           Create Profile
//         </button>
//         <button
//           onClick={() => setActiveTab('view')}
//           className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
//             activeTab === 'view'
//               ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
//               : 'text-gray-400 hover:text-white'
//           }`}
//         >
//           View Profile
//         </button>
//         <button
//           onClick={() => setActiveTab('list')}
//           className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
//             activeTab === 'list'
//               ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
//               : 'text-gray-400 hover:text-white'
//           }`}
//         >
//           My Profiles
//         </button>
//       </div>

//       {/* Status Message */}
//       {status.type && (
//         <div className={`mb-4 p-3 rounded-lg ${
//           status.type === 'error' ? 'bg-red-900 bg-opacity-50 text-red-300' :
//           status.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' :
//           'bg-blue-900 bg-opacity-50 text-blue-300'
//         }`}>
//           {status.message}
//         </div>
//       )}

//       {/* Create Profile Tab */}
//       {activeTab === 'create' && (
//         <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Username *</label>
//               <input
//                 type="text"
//                 value={formData.username}
//                 onChange={(e) => setFormData({ ...formData, username: e.target.value })}
//                 className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 placeholder="Enter your username"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
//               <input
//                 type="text"
//                 value={formData.title}
//                 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
//                 className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 placeholder="Your professional title"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Mission Statement *</label>
//               <textarea
//                 value={formData.mission}
//                 onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
//                 rows={3}
//                 className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 placeholder="Your mission or bio"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image</label>
//               <div className="relative">
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'profile')}
//                   className="hidden"
//                   id="profile-image-input"
//                 />
//                 <label
//                   htmlFor="profile-image-input"
//                   className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                 >
//                   {formData.profileImage ? (
//                     <img
//                       src={formData.profileImage}
//                       alt="Profile preview"
//                       className="w-32 h-32 mx-auto rounded-full object-cover"
//                     />
//                   ) : (
//                     <div className="text-center">
//                       <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                       </svg>
//                       <p className="text-gray-400">Click to upload profile image</p>
//                       <p className="text-xs text-gray-500 mt-1">Max 2MB</p>
//                     </div>
//                   )}
//                 </label>
//               </div>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Background Image</label>
//               <div className="relative">
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'background')}
//                   className="hidden"
//                   id="background-image-input"
//                 />
//                 <label
//                   htmlFor="background-image-input"
//                   className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//                 >
//                   {formData.backgroundImage ? (
//                     <img
//                       src={formData.backgroundImage}
//                       alt="Background preview"
//                       className="w-full h-32 mx-auto object-cover rounded"
//                     />
//                   ) : (
//                     <div className="text-center">
//                       <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                       </svg>
//                       <p className="text-gray-400">Click to upload background image</p>
//                       <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
//                     </div>
//                   )}
//                 </label>
//               </div>
//             </div>

//             <button
//               onClick={createProfileToken}
//               disabled={loading || !keyData.privateKey}
//               className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {loading ? 'Creating...' : 'Create Profile Token'}
//             </button>

//             <div className="p-3 bg-gray-800 rounded-lg">
//               <p className="text-xs text-gray-400">
//                 <span className="font-medium text-purple-400">Note:</span> Your profile will be permanently stored on the BSV blockchain.
//                 Images will be uploaded to IPFS for decentralized storage.
//               </p>
//               {balance.confirmed < 3000 && (
//                 <p className="text-xs text-yellow-400 mt-2">
//                   ⚠️ You need at least 3000 satoshis to create a profile token. Current balance: {balance.confirmed} sats
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* View Profile Tab */}
//       {activeTab === 'view' && (
//         <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-300 mb-2">Transaction ID</label>
//               <div className="flex gap-2">
//                 <input
//                   type="text"
//                   value={retrieveTxid}
//                   onChange={(e) => setRetrieveTxid(e.target.value)}
//                   className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
//                   placeholder="Enter transaction ID"
//                 />
//                 <button
//                   onClick={retrieveProfileToken}
//                   disabled={loading}
//                   className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
//                 >
//                   {loading ? 'Loading...' : 'Retrieve'}
//                 </button>
//               </div>
//             </div>

//             {retrievedProfile && (
//               <div className="mt-6 bg-gray-800 rounded-lg overflow-hidden">
//                 <div
//                   className="h-48 bg-cover bg-center relative"
//                   style={{ backgroundImage: `url(${retrievedProfile.profileData.backgroundImage})` }}
//                 >
//                   <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent" />
//                 </div>
                
//                 <div className="p-6 -mt-16 relative">
//                   <img
//                     src={retrievedProfile.profileData.profileImage}
//                     alt={retrievedProfile.profileData.username}
//                     className="w-32 h-32 rounded-full border-4 border-gray-800 mb-4"
//                   />
                  
//                   <h3 className="text-2xl font-bold text-white mb-1">
//                     {retrievedProfile.profileData.username}
//                   </h3>
//                   <p className="text-purple-400 mb-3">{retrievedProfile.profileData.title}</p>
//                   <p className="text-gray-300 mb-4">{retrievedProfile.profileData.mission}</p>
                  
//                   <div className="pt-4 border-t border-gray-700 text-xs text-gray-400">
//                     <p>Token ID: {retrievedProfile.tokenId}</p>
//                     <p>Owner: {retrievedProfile.owner}</p>
//                     <p>Created: {new Date(retrievedProfile.timestamp).toLocaleString()}</p>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* List Profiles Tab */}
//       {activeTab === 'list' && (
//         <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//           <div className="space-y-4">
//             {userProfiles.length > 0 ? (
//               userProfiles.map((profile) => (
//                 <div key={profile.tokenId} className="bg-gray-800 rounded-lg p-4">
//                   <div className="flex items-center gap-4">
//                     <img
//                       src={profile.profileData.profileImage}
//                       alt={profile.profileData.username}
//                       className="w-16 h-16 rounded-full"
//                     />
//                     <div className="flex-1">
//                       <h4 className="text-white font-medium">{profile.profileData.username}</h4>
//                       <p className="text-sm text-gray-400">{profile.profileData.title}</p>
//                       <p className="text-xs text-gray-500">Token ID: {profile.tokenId}</p>
//                     </div>
//                     <button
//                       onClick={() => {
//                         setRetrieveTxid(profile.tokenId);
//                         setActiveTab('view');
//                         retrieveProfileToken();
//                       }}
//                       className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
//                     >
//                       View
//                     </button>
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <div className="text-center py-8 text-gray-400">
//                 <p>No profile tokens found</p>
//                 <button
//                   onClick={() => setActiveTab('create')}
//                   className="mt-4 text-purple-400 hover:text-purple-300"
//                 >
//                   Create your first profile
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };
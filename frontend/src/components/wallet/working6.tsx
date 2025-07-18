
1de096339a813a63f3bb829ddbcd307086e426c498811986700c275f35c1ac04

mzoFnR9fpyLh3Sabvx3oiXDFtPspXKusms


















import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../store/WalletStore';
import { ProfileTokenService } from '../services/ProfileTokenService';
import { UTXOManager } from '../utils/blockchain';


interface ProfileFormData {
  username: string;
  title: string;
  mission: string;
  profileImage: string;
  backgroundImage: string;
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

  const { keyData, network, balance, whatsOnChainApiKey } = useWalletStore();
  const profileService = new ProfileTokenService(network, whatsOnChainApiKey);

  // Handle image file selection
  const handleImageUpload = async (file: File, type: 'profile' | 'background') => {
    if (!file) return;

    // Validate file
    const maxSize = type === 'profile' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `File size exceeds ${type === 'profile' ? '2MB' : '5MB'} limit` 
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', message: 'Please upload an image file' });
      return;
    }

    try {
      // Compress and convert to base64
      const base64 = await compressImage(file, type === 'profile' ? 400 : 1200);
      
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
  const compressImage = (file: File, maxWidth: number): Promise<string> => {
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
          
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Create profile token
  const createProfileToken = async () => {
    if (!keyData.privateKey) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    if (!formData.username || !formData.title || !formData.mission) {
      setStatus({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Creating profile token...' });

    try {
      // Get UTXOs - matching the pattern from Conversations
      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs();
      
      console.log(`Fetched ${utxos.length} UTXOs for profile token creation`);
      console.log('Sample UTXO structure:', utxos[0]);
      
      if (utxos.length === 0) {
        // Check balance to provide better error message
        const balanceCheck = await fetch(
          `https://api.whatsonchain.com/v1/bsv/${network}/address/${keyData.address}/balance`
        );
        const balanceData = await balanceCheck.json();
        throw new Error(`No UTXOs available. Balance: ${balanceData.confirmed} confirmed, ${balanceData.unconfirmed} unconfirmed satoshis`);
      }

      // Select UTXOs for transaction - use the same amount as Conversations (1500 + fee buffer)
      const { selected, total } = utxoManager.selectUTXOs(1500);
      
      if (selected.length === 0) {
        throw new Error(`Insufficient funds. You have ${total} satoshis but need at least 1500.`);
      }

      console.log(`Selected ${selected.length} UTXOs with total: ${total} satoshis`);

      // Create profile with default images if not provided
      const profileData = {
        username: formData.username,
        title: formData.title,
        mission: formData.mission,
        profileImage: formData.profileImage || generateDefaultAvatar(formData.username),
        backgroundImage: formData.backgroundImage || generateDefaultBackground()
      };

      // Create and broadcast transaction
      const result = await profileService.createProfileToken(
        keyData.privateKey,
        profileData,
        selected
      );

      if (result.success && result.txid) {
        setStatus({ 
          type: 'success', 
          message: `Profile token created! TX: ${result.txid}` 
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
        setRetrieveTxid(result.txid);
        setActiveTab('view');
      } else {
        throw new Error(result.error || 'Failed to create profile token');
      }
    } catch (error) {
      console.error('Error creating profile token:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create profile token' 
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
      const profile = await profileService.retrieveProfileToken(retrieveTxid);
      
      if (profile) {
        setRetrievedProfile(profile);
        setStatus({ type: 'success', message: 'Profile retrieved successfully!' });
      } else {
        setStatus({ type: 'error', message: 'Profile not found' });
      }
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: 'Failed to retrieve profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  // List user's profile tokens
  const listUserProfiles = async () => {
    if (!keyData.address) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Loading your profiles...' });

    try {
      const profiles = await profileService.listProfileTokens(keyData.address);
      setUserProfiles(profiles);
      
      if (profiles.length === 0) {
        setStatus({ type: 'info', message: 'No profile tokens found for your address' });
      } else {
        setStatus({ type: 'success', message: `Found ${profiles.length} profile token(s)` });
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
    if (activeTab === 'list' && keyData.address) {
      listUserProfiles();
    }
  }, [activeTab, keyData.address]);

  return (
    <div>
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
        <h2 className="text-xl font-semibold text-white">BSV Profile Tokens</h2>
        <p className="text-sm text-gray-300 mt-1">Create and manage your decentralized profile on the blockchain</p>
      </div>
      
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
      {activeTab === 'create' && (
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
                      <p className="text-xs text-gray-500 mt-1">Max 2MB</p>
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
                      <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <button
              onClick={createProfileToken}
              disabled={loading || !keyData.privateKey}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Profile Token'}
            </button>

            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400">
                <span className="font-medium text-purple-400">Note:</span> Your profile will be permanently stored on the BSV blockchain.
                Images will be uploaded to IPFS for decentralized storage.
              </p>
              {balance.confirmed < 3000 && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ You need at least 3000 satoshis to create a profile token. Current balance: {balance.confirmed} sats
                </p>
              )}
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
                <div
                  className="h-48 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${retrievedProfile.profileData.backgroundImage})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent" />
                </div>
                
                <div className="p-6 -mt-16 relative">
                  <img
                    src={retrievedProfile.profileData.profileImage}
                    alt={retrievedProfile.profileData.username}
                    className="w-32 h-32 rounded-full border-4 border-gray-800 mb-4"
                  />
                  
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {retrievedProfile.profileData.username}
                  </h3>
                  <p className="text-purple-400 mb-3">{retrievedProfile.profileData.title}</p>
                  <p className="text-gray-300 mb-4">{retrievedProfile.profileData.mission}</p>
                  
                  <div className="pt-4 border-t border-gray-700 text-xs text-gray-400">
                    <p>Token ID: {retrievedProfile.tokenId}</p>
                    <p>Owner: {retrievedProfile.owner}</p>
                    <p>Created: {new Date(retrievedProfile.timestamp).toLocaleString()}</p>
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
                    <img
                      src={profile.profileData.profileImage}
                      alt={profile.profileData.username}
                      className="w-16 h-16 rounded-full"
                    />
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{profile.profileData.username}</h4>
                      <p className="text-sm text-gray-400">{profile.profileData.title}</p>
                      <p className="text-xs text-gray-500">Token ID: {profile.tokenId}</p>
                    </div>
                    <button
                      onClick={() => {
                        setRetrieveTxid(profile.tokenId);
                        setActiveTab('view');
                        retrieveProfileToken();
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
                <p>No profile tokens found</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 text-purple-400 hover:text-purple-300"
                >
                  Create your first profile
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
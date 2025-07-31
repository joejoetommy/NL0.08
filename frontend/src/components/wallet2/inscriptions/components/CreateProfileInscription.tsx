import React from 'react';

interface ProfileData {
  username: string;
  title: string;
  bio: string;
  avatar: string;
}

interface CreateProfileInscriptionProps {
  profileData: ProfileData;
  setProfileData: (data: ProfileData) => void;
  profileImageFile: File | null;
  setProfileImageFile: (file: File | null) => void;
  profileImagePreview: string;
  setProfileImagePreview: (preview: string) => void;
  setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
}

export const CreateProfileInscription: React.FC<CreateProfileInscriptionProps> = ({
  profileData,
  setProfileData,
  profileImageFile,
  setProfileImageFile,
  profileImagePreview,
  setProfileImagePreview,
  setStatus
}) => {
  const handleProfileImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size - increased limits
    const maxSize = 3.6 * 1024 * 1024; // 3.6MB for both encrypted and unencrypted
    if (file.size > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `Profile image too large. Maximum size is 3.6MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      });
      return;
    }

    setProfileImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setStatus({ 
      type: 'info', 
      message: `Profile image: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
    });
  };

  const removeProfileImage = () => {
    setProfileImageFile(null);
    setProfileImagePreview('');
  };

  return (
    <div className="space-y-3">
      {/* Username Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Username
        </label>
        <input
          type="text"
          value={profileData.username}
          onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
          placeholder="satoshi"
          maxLength={50}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1">
          {profileData.username.length}/50 characters
        </p>
      </div>

      {/* Title Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Title
        </label>
        <input
          type="text"
          value={profileData.title}
          onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
          placeholder="Bitcoin Creator"
          maxLength={100}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1">
          {profileData.title.length}/100 characters
        </p>
      </div>

      {/* Bio Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Bio
        </label>
        <textarea
          value={profileData.bio}
          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
          placeholder="Building peer-to-peer electronic cash..."
          maxLength={500}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          rows={3}
        />
        <p className="text-xs text-gray-400 mt-1">
          {profileData.bio.length}/500 characters
        </p>
      </div>

      {/* Profile Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Profile Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleProfileImageSelect}
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
                className="w-20 h-20 mx-auto rounded-full object-cover mb-2"
              />
              <p className="text-xs text-gray-300 font-medium">
                {profileImageFile?.name}
              </p>
              <div className="flex items-center justify-center gap-4 mt-1">
                <p className="text-xs text-gray-400">
                  {((profileImageFile?.size || 0) / 1024).toFixed(0)}KB
                </p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeProfileImage();
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <svg 
                className="w-10 h-10 mx-auto text-gray-400 mb-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
              <p className="text-xs text-gray-400">Upload Avatar</p>
              <p className="text-xs text-gray-500">Recommended: 400x400px</p>
            </div>
          )}
        </label>
      </div>

      {/* Profile Preview */}
      {(profileData.username || profileData.title || profileData.bio || profileImagePreview) && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Profile Preview</h4>
          <div className="flex items-start gap-3">
            {profileImagePreview ? (
              <img
                src={profileImagePreview}
                alt="Avatar"
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {profileData.username || 'Anonymous'}
              </p>
              <p className="text-xs text-gray-300">
                {profileData.title || 'BSV User'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {profileData.bio || 'On-chain profile'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
        <h4 className="text-xs font-medium text-blue-300 mb-1">Profile Tips:</h4>
        <ul className="text-xs text-gray-300 space-y-0.5">
          <li>• Profile data is stored permanently on-chain</li>
          <li>• Avatar images will be compressed if needed</li>
          <li>• Keep usernames unique and memorable</li>
          <li>• Profile can be encrypted for privacy</li>
        </ul>
      </div>
    </div>
  );
};
import React from 'react';

interface ProfileData {
  username: string;
  title: string;
  bio: string;
  avatar: string;
}

interface CreateProfile2InscriptionProps {
  profileData: ProfileData;
  setProfileData: (data: ProfileData) => void;
  profileImageFile: File | null;
  setProfileImageFile: (file: File | null) => void;
  profileImagePreview: string;
  setProfileImagePreview: (preview: string) => void;
  backgroundImageFile: File | null;
  setBackgroundImageFile: (file: File | null) => void;
  backgroundImagePreview: string;
  setBackgroundImagePreview: (preview: string) => void;
  setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
}

export const CreateProfile2Inscription: React.FC<CreateProfile2InscriptionProps> = ({
  profileData,
  setProfileData,
  profileImageFile,
  setProfileImageFile,
  profileImagePreview,
  setProfileImagePreview,
  backgroundImageFile,
  setBackgroundImageFile,
  backgroundImagePreview,
  setBackgroundImagePreview,
  setStatus
}) => {
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, isBackground: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Calculate total size
    let totalSize = file.size;
    if (isBackground && profileImageFile) {
      totalSize += profileImageFile.size;
    } else if (!isBackground && backgroundImageFile) {
      totalSize += backgroundImageFile.size;
    }

    const maxSize = 5 * 1024 * 1024;
    if (totalSize > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `Combined images too large. Maximum total size is 5MB, current total is ${(totalSize / (1024 * 1024)).toFixed(2)}MB.` 
      });
      return;
    }

    if (isBackground) {
      setBackgroundImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    setStatus({ 
      type: 'info', 
      message: `Total size: ${(totalSize / 1024).toFixed(0)}KB` 
    });
  };

  const removeImage = (isBackground: boolean) => {
    if (isBackground) {
      setBackgroundImageFile(null);
      setBackgroundImagePreview('');
    } else {
      setProfileImageFile(null);
      setProfileImagePreview('');
    }
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
      </div>

      {/* Profile Images - Side by Side */}
      <div className="grid grid-cols-2 gap-2">
        {/* Avatar Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Avatar
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e, false)}
            className="hidden"
            id="profile2-avatar-upload"
          />
          <label
            htmlFor="profile2-avatar-upload"
            className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
          >
            {profileImagePreview ? (
              <div className="text-center">
                <img
                  src={profileImagePreview}
                  alt="Avatar preview"
                  className="w-16 h-16 mx-auto rounded-full object-cover mb-1"
                />
                <p className="text-xs text-gray-400">
                  {((profileImageFile?.size || 0) / 1024).toFixed(0)}KB
                </p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeImage(false);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 mt-1"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-xs text-gray-400">Upload</p>
              </div>
            )}
          </label>
        </div>

        {/* Background Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Background
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e, true)}
            className="hidden"
            id="profile2-background-upload"
          />
          <label
            htmlFor="profile2-background-upload"
            className="block w-full p-4 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
          >
            {backgroundImagePreview ? (
              <div className="text-center">
                <img
                  src={backgroundImagePreview}
                  alt="Background preview"
                  className="w-full h-16 mx-auto object-cover rounded mb-1"
                />
                <p className="text-xs text-gray-400">
                  {((backgroundImageFile?.size || 0) / 1024).toFixed(0)}KB
                </p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeImage(true);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 mt-1"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-400">Upload</p>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Enhanced Profile Preview */}
      {(profileData.username || profileData.title || profileData.bio || profileImagePreview || backgroundImagePreview) && (
        <div className="mt-4 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <h4 className="text-xs font-medium text-gray-400 p-3 pb-0">Profile2 Preview</h4>
          
          {/* Background */}
          <div className="relative">
            {backgroundImagePreview ? (
              <img
                src={backgroundImagePreview}
                alt="Background"
                className="w-full h-24 object-cover"
              />
            ) : (
              <div className="w-full h-24 bg-gradient-to-br from-purple-900 to-pink-900"></div>
            )}
            
            {/* Avatar overlay */}
            <div className="absolute -bottom-8 left-3">
              {profileImagePreview ? (
                <img
                  src={profileImagePreview}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover border-4 border-gray-900"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-700 border-4 border-gray-900 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Profile info */}
          <div className="pt-10 px-3 pb-3">
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
      )}

      <div className="mt-3 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
        <h4 className="text-xs font-medium text-blue-300 mb-1">Profile2 Tips:</h4>
        <ul className="text-xs text-gray-300 space-y-0.5">
          <li>• Profile2 supports avatar + background images</li>
          <li>• Combined image size must be under 5MB</li>
          <li>• Background: 1200x400px recommended</li>
          <li>• Avatar: 400x400px recommended</li>
          <li>• Images compressed more aggressively when encrypted</li>
        </ul>
      </div>
    </div>
  );
};
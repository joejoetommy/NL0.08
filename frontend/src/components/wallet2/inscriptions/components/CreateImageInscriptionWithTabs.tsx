import React, { useState } from 'react';
import { validateImageFile, imageToBase64, getImageDimensions } from '../../utils/imageUtils';
import { ImageInscriptionViewer } from './ImageInscriptionViewer';

interface CreateImageInscriptionProps {
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  imagePreview: string;
  setImagePreview: (preview: string) => void;
  setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
  currentFeeRate: number;
  encryptionLevel: number;
  keyData: any;
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
}

export const CreateImageInscription: React.FC<CreateImageInscriptionProps> = ({
  imageFile,
  setImageFile,
  imagePreview,
  setImagePreview,
  setStatus,
  currentFeeRate,
  encryptionLevel,
  keyData,
  network,
  whatsOnChainApiKey
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setStatus({ type: 'error', message: validation.error! });
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const preview = e.target?.result as string;
      setImagePreview(preview);

      // Get dimensions
      try {
        const dimensions = await getImageDimensions(file);
        console.log('Image dimensions:', dimensions);

        // Estimate compressed size
        const base64Data = await imageToBase64(file, undefined, encryptionLevel > 0, undefined, 'image');
        const estimatedSize = base64Data.length;
        const estimatedSizeMB = (estimatedSize / 1024 / 1024).toFixed(2);

        setStatus({ 
          type: 'info', 
          message: `Image loaded: ${dimensions.width}x${dimensions.height}, ~${estimatedSizeMB}MB after processing` 
        });
      } catch (error) {
        console.error('Error processing image:', error);
      }
    };
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Failed to read image file' });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setUploadProgress(0);
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-600">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'create'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          🖼️ Create Image
        </button>
        <button
          onClick={() => setActiveTab('view')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'view'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          🔍 View & Decode
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'create' ? (
        <>
          {/* Encryption Notice */}
          {encryptionLevel > 0 && (
            <div className="p-3 bg-indigo-900 bg-opacity-30 rounded-lg border border-indigo-700">
              <p className="text-sm text-indigo-300">
                🔒 Encryption Level {encryptionLevel} is active. Your image will be encrypted before inscription.
              </p>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Upload Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
            >
              {imagePreview ? (
                <div className="text-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded mb-3"
                  />
                  <p className="text-sm text-gray-400">
                    {imageFile?.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Size: {((imageFile?.size || 0) / (1024 * 1024)).toFixed(2)}MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeImage();
                    }}
                    className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400">Drop image here or click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG, GIF, WebP (max 5MB)</p>
                </div>
              )}
            </label>
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-300 mb-2">Processing image...</p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Image Info */}
          {imageFile && (
            <div className="p-4 bg-gray-800 rounded-lg space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Image Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Format:</span>
                  <p className="text-white">{imageFile.type}</p>
                </div>
                <div>
                  <span className="text-gray-400">Original Size:</span>
                  <p className="text-white">{((imageFile.size || 0) / 1024).toFixed(0)}KB</p>
                </div>
                <div>
                  <span className="text-gray-400">Estimated Fee:</span>
                  <p className="text-white">~{Math.ceil(imageFile.size / 1000 * currentFeeRate)} sats</p>
                </div>
                <div>
                  <span className="text-gray-400">Encryption:</span>
                  <p className="text-white">{encryptionLevel > 0 ? `Level ${encryptionLevel}` : 'None'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
            <h4 className="text-xs font-medium text-blue-300 mb-1">Image Inscription Tips:</h4>
            <ul className="text-xs text-gray-300 space-y-0.5">
              <li>• Images are automatically compressed to fit within transaction limits</li>
              <li>• Large images will be resized while maintaining aspect ratio</li>
              <li>• Encrypted images may be compressed more aggressively</li>
              <li>• Consider using BCAT protocol for very large images</li>
            </ul>
          </div>
        </>
      ) : (
        <ImageInscriptionViewer
          keyData={keyData}
          network={network}
          whatsOnChainApiKey={whatsOnChainApiKey}
        />
      )}
    </div>
  );
};
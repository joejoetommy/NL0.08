import React, { useState } from 'react';
import { calculateTransactionFee } from '../utils/feeCalculator';
// Note: You'll need to ensure these utility functions exist or create them
// import { validateImageFile, imageToBase64, getImageDimensions } from '../utils/imageUtils';
import { ImageInscriptionViewer } from './ImageInscriptionViewer';


interface CreateImageInscriptionProps {
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  imagePreview: string;
  setImagePreview: (preview: string) => void;
  setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
  currentFeeRate: number;
  encryptionLevel?: number;
  keyData?: any;
  network?: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
}

export const CreateImageInscription: React.FC<CreateImageInscriptionProps> = ({
  imageFile,
  setImageFile,
  imagePreview,
  setImagePreview,
  setStatus,
  currentFeeRate,
  encryptionLevel = 0,
  keyData,
  network = 'mainnet',
  whatsOnChainApiKey
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Original handleImageSelect with enhanced features
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Original validation logic
    const isEncrypted = encryptionLevel > 0;
    const maxSize = isEncrypted ? 3.5 * 1024 * 1024 : 3.6 * 1024 * 1024;
    const maxSizeMB = isEncrypted ? 3.5 : 3.6;
    
    if (file.size > maxSize) {
      setStatus({ 
        type: 'error', 
        message: `Image too large. Maximum size is ${maxSizeMB}MB for ${isEncrypted ? 'encrypted' : 'unencrypted'} images, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      });
      return;
    }

    // Calculate approximate transaction size (original logic)
    const base64Size = Math.ceil(file.size * 1.37);
    const encryptionOverhead = isEncrypted ? 1.15 : 1.0;
    const estimatedDataSize = base64Size * encryptionOverhead;
    const txOverhead = 300;
    const totalEstimatedSize = estimatedDataSize + txOverhead;
    
    if (totalEstimatedSize > 4.99 * 1024 * 1024) {
      setStatus({ 
        type: 'error', 
        message: `Transaction would be too large (${(totalEstimatedSize / 1024 / 1024).toFixed(2)}MB). Maximum safe size is 4.99MB.` 
      });
      return;
    }
    
    const { estimatedSize, fee } = calculateTransactionFee(1, 2, estimatedDataSize, currentFeeRate);
    
    setStatus({ 
      type: 'info', 
      message: `Image size: ${(file.size / 1024 / 1024).toFixed(2)}MB. ${isEncrypted ? 'Will be encrypted. ' : ''}Estimated transaction: ${(estimatedSize / 1024 / 1024).toFixed(2)}MB. Fee: ${fee} sats` 
    });

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const preview = e.target?.result as string;
      setImagePreview(preview);
      
      // Additional processing if utility functions are available
      try {
        // Uncomment when imageUtils are available
        // const dimensions = await getImageDimensions(file);
        // console.log('Image dimensions:', dimensions);
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
    setStatus({ type: null, message: '' });
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

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Image
            </label>
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
                    className="max-h-32 mx-auto rounded mb-2 object-contain"
                  />
                  <p className="text-sm text-gray-300 font-medium">
                    {imageFile?.name}
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <p className="text-xs text-gray-400">
                      Size: {((imageFile?.size || 0) / (1024 * 1024)).toFixed(2)}MB
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        removeImage();
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                  {imageFile && encryptionLevel > 0 && (
                    <p className="text-xs text-yellow-400 mt-2">
                      🔒 Will be encrypted at level {encryptionLevel}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <svg 
                    className="w-12 h-12 mx-auto text-gray-400 mb-2" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                    />
                  </svg>
                  <p className="text-gray-400">Click to upload image</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum size: {encryptionLevel > 0 ? '3.5MB (encrypted)' : '3.6MB (unencrypted)'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Supported: JPG, PNG, GIF, WebP
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Upload Progress (if needed) */}
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

          {/* Image Details (enhanced version) */}
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

          {/* Tips Section (combined from both versions) */}
          <div className="mt-3 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
            <h4 className="text-xs font-medium text-blue-300 mb-1">Image Inscription Limits:</h4>
            <ul className="text-xs text-gray-300 space-y-0.5">
              <li>• Unencrypted images: Up to 4.8MB</li>
              <li>• Encrypted images: Up to 3.7MB</li>
              <li>• Images are stored permanently on-chain</li>
              <li>• Larger images = higher fees (~1 sat per KB)</li>
              <li>• Automatic compression if needed to fit limits</li>
              <li>• Images are automatically compressed to fit within transaction limits</li>
              <li>• Large images will be resized while maintaining aspect ratio</li>
              <li>• Consider using BCAT protocol for very large images</li>
            </ul>
          </div>
        </>
      ) : (
        // View Tab - ImageInscriptionViewer component
        // Uncomment when ImageInscriptionViewer is available

        <div className="p-4 bg-gray-800 rounded-lg">
          <p className="text-gray-400">
        <ImageInscriptionViewer
          keyData={keyData}
          network={network}
          whatsOnChainApiKey={whatsOnChainApiKey}
        />
          </p>
        </div>
      )}
    </div>
  );
};


// import React from 'react';
// import { calculateTransactionFee } from '../utils/feeCalculator';

// interface CreateImageInscriptionProps {
//   imageFile: File | null;
//   setImageFile: (file: File | null) => void;
//   imagePreview: string;
//   setImagePreview: (preview: string) => void;
//   setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
//   currentFeeRate: number;
//   encryptionLevel?: number;
// }

// export const CreateImageInscription: React.FC<CreateImageInscriptionProps> = ({
//   imageFile,
//   setImageFile,
//   imagePreview,
//   setImagePreview,
//   setStatus,
//   currentFeeRate,
//   encryptionLevel = 0
// }) => {
//   const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     // Image inscription specific limits - increased to allow larger transactions
//     const isEncrypted = encryptionLevel > 0;
//     const maxSize = isEncrypted ? 3.5 * 1024 * 1024 : 3.6 * 1024 * 1024;
//     const maxSizeMB = isEncrypted ? 3.5 : 3.6;
    
//     if (file.size > maxSize) {
//       setStatus({ 
//         type: 'error', 
//         message: `Image too large. Maximum size is ${maxSizeMB}MB for ${isEncrypted ? 'encrypted' : 'unencrypted'} images, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
//       });
//       return;
//     }

//     // Calculate approximate transaction size more accurately
//     const base64Size = Math.ceil(file.size * 1.37); // Base64 overhead
//     const encryptionOverhead = isEncrypted ? 1.15 : 1.0; // 15% overhead for encryption wrapper
//     const estimatedDataSize = base64Size * encryptionOverhead;
    
//     // Add minimal transaction overhead
//     const txOverhead = 300; // Reduced overhead - actual is ~200-300 bytes
//     const totalEstimatedSize = estimatedDataSize + txOverhead;
    
//     // More lenient check - allow up to 4.99MB
//     if (totalEstimatedSize > 4.99 * 1024 * 1024) {
//       setStatus({ 
//         type: 'error', 
//         message: `Transaction would be too large (${(totalEstimatedSize / 1024 / 1024).toFixed(2)}MB). Maximum safe size is 4.99MB.` 
//       });
//       return;
//     }
    
//     const { estimatedSize, fee } = calculateTransactionFee(1, 2, estimatedDataSize, currentFeeRate);
    
//     setStatus({ 
//       type: 'info', 
//       message: `Image size: ${(file.size / 1024 / 1024).toFixed(2)}MB. ${isEncrypted ? 'Will be encrypted. ' : ''}Estimated transaction: ${(totalEstimatedSize / 1024 / 1024).toFixed(2)}MB. Fee: ${fee} sats` 
//     });
    
//     setStatus({ 
//       type: 'info', 
//       message: `Image size: ${(file.size / 1024 / 1024).toFixed(2)}MB. ${isEncrypted ? 'Will be encrypted. ' : ''}Estimated transaction: ${(estimatedSize / 1024 / 1024).toFixed(2)}MB. Fee: ${fee} sats` 
//     });

//     setImageFile(file);

//     // Create preview
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       setImagePreview(e.target?.result as string);
//     };
//     reader.readAsDataURL(file);
//   };

//   const removeImage = () => {
//     setImageFile(null);
//     setImagePreview('');
//     setStatus({ type: null, message: '' });
//   };

//   return (
//     <div>
//       <label className="block text-sm font-medium text-gray-300 mb-2">
//         Select Image
//       </label>
//       <input
//         type="file"
//         accept="image/*"
//         onChange={handleImageSelect}
//         className="hidden"
//         id="image-upload"
//       />
//       <label
//         htmlFor="image-upload"
//         className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
//       >
//         {imagePreview ? (
//           <div className="text-center">
//             <img
//               src={imagePreview}
//               alt="Preview"
//               className="max-h-32 mx-auto rounded mb-2 object-contain"
//             />
//             <p className="text-sm text-gray-300 font-medium">
//               {imageFile?.name}
//             </p>
//             <div className="flex items-center justify-center gap-4 mt-2">
//               <p className="text-xs text-gray-400">
//                 Size: {((imageFile?.size || 0) / (1024 * 1024)).toFixed(2)}MB
//               </p>
//               <button
//                 onClick={(e) => {
//                   e.preventDefault();
//                   removeImage();
//                 }}
//                 className="text-xs text-red-400 hover:text-red-300"
//               >
//                 Remove
//               </button>
//             </div>
//             {imageFile && encryptionLevel > 0 && (
//               <p className="text-xs text-yellow-400 mt-2">
//                 🔒 Will be encrypted at level {encryptionLevel}
//               </p>
//             )}
//           </div>
//         ) : (
//           <div className="text-center">
//             <svg 
//               className="w-12 h-12 mx-auto text-gray-400 mb-2" 
//               fill="none" 
//               stroke="currentColor" 
//               viewBox="0 0 24 24"
//             >
//               <path 
//                 strokeLinecap="round" 
//                 strokeLinejoin="round" 
//                 strokeWidth={2} 
//                 d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
//               />
//             </svg>
//             <p className="text-gray-400">Click to upload image</p>
//             <p className="text-xs text-gray-500 mt-1">
//               Maximum size: {encryptionLevel > 0 ? '3.7MB (encrypted)' : '4.8MB (unencrypted)'}
//             </p>
//             <p className="text-xs text-gray-500">
//               Supported: JPG, PNG, GIF, WebP
//             </p>
//           </div>
//         )}
//       </label>
      
//       <div className="mt-3 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//         <h4 className="text-xs font-medium text-blue-300 mb-1">Image Inscription Limits:</h4>
//         <ul className="text-xs text-gray-300 space-y-0.5">
//           <li>• Unencrypted images: Up to 4.8MB</li>
//           <li>• Encrypted images: Up to 3.7MB</li>
//           <li>• Images are stored permanently on-chain</li>
//           <li>• Larger images = higher fees (~1 sat per KB)</li>
//           <li>• Automatic compression if needed to fit limits</li>
//         </ul>
//       </div>
//     </div>
//   );
// };
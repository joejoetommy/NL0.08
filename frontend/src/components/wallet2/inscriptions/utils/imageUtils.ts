// Convert image to base64 with optional compression
export const imageToBase64 = (
  file: File, 
  maxWidth?: number, 
  isEncrypted: boolean = false, 
  targetSizeMB?: number,
  inscriptionType: 'image' | 'profile' | 'profile2' = 'image'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    // Define size limits based on inscription type and encryption
    // These are the actual data limits that will fit in a 5MB transaction
    const getSizeLimit = () => {
      if (inscriptionType === 'image') {
        // For ~4.9MB transactions, we can have ~3.55MB of base64 data
        return isEncrypted ? 3.4 : 3.55;
      } else if (inscriptionType === 'profile') {
        return isEncrypted ? 3.4 : 3.55;
      } else if (inscriptionType === 'profile2') {
        // For profile2, two images need to fit
        return isEncrypted ? 2.2 : 2.4;
      }
      return targetSizeMB || 3.55;
    };
    
    const maxSizeMB = targetSizeMB || getSizeLimit();
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    // Calculate if we need compression
    const base64Overhead = 1.37;
    const estimatedBase64Size = file.size * base64Overhead;
    
    // Only compress if we're over the limit or maxWidth is specified
    if (estimatedBase64Size <= maxSizeBytes && !maxWidth) {
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        const base64SizeMB = (base64Data.length / 1024 / 1024).toFixed(2);
        console.log(`Image passed through without compression: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${base64SizeMB}MB base64`);
        console.log(`Inscription type: ${inscriptionType}, Encrypted: ${isEncrypted}`);
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    
    // Need compression
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        let width = img.width;
        let height = img.height;
        
        // Calculate dimension reduction if needed
        if (maxWidth && (width > maxWidth || height > maxWidth)) {
          if (width > height) {
            height = Math.round((height / width) * maxWidth);
            width = maxWidth;
          } else {
            width = Math.round((width / height) * maxWidth);
            height = maxWidth;
          }
        } else if (estimatedBase64Size > maxSizeBytes) {
          // Only resize if we must to fit size limit
          const reductionFactor = Math.sqrt(maxSizeBytes / estimatedBase64Size) * 0.98;
          const maxDimension = Math.max(1200, Math.floor(Math.max(width, height) * reductionFactor));
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Start with very high quality
        let quality = 0.98;
        let targetSize = maxSizeBytes;
        
        // Try PNG first if original was PNG and size permits
        let dataUrl: string;
        if (file.type === 'image/png' && estimatedBase64Size < maxSizeBytes * 1.2) {
          dataUrl = canvas.toDataURL('image/png');
          if (dataUrl.length <= targetSize) {
            const base64Data = dataUrl.split(',')[1];
            console.log(`PNG preserved: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(base64Data.length / 1024 / 1024).toFixed(2)}MB base64`);
            resolve(base64Data);
            return;
          }
        }
        
        // Use JPEG with progressive quality reduction
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Only reduce quality if necessary
        while (dataUrl.length > targetSize && quality > 0.85) {
          quality -= 0.01; // Very small decrements
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        // If still too large, try one more dimension reduction
        if (dataUrl.length > targetSize) {
          const scaleFactor = Math.sqrt(targetSize / dataUrl.length) * 0.99;
          canvas.width = Math.round(width * scaleFactor);
          canvas.height = Math.round(height * scaleFactor);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', Math.min(quality + 0.02, 0.98));
        }
        
        const base64Data = dataUrl.split(',')[1];
        const base64SizeMB = (base64Data.length / 1024 / 1024).toFixed(2);
        const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
        
        console.log(`Image compressed: ${originalSizeMB}MB → ${base64SizeMB}MB base64 (${canvas.width}x${canvas.height}, quality ${quality.toFixed(2)})`);
        console.log(`Type: ${inscriptionType}, Encrypted: ${isEncrypted}, Target limit: ${maxSizeMB}MB`);
        
        // Final safety check
        const estimatedTxSize = base64Data.length + 300;
        if (estimatedTxSize > 4.98 * 1024 * 1024) {
          reject(new Error(`Compressed data too large: ${base64SizeMB}MB. Please use a smaller image.`));
          return;
        }
        
        resolve(base64Data);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Validate image file
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please use JPG, PNG, GIF, or WebP.'
    };
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is 5MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
    };
  }
  
  return { valid: true };
};

// Get image dimensions
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};


// import { SAFE_TX_SIZE } from './feeCalculator';

// // Convert image to base64 with optional compression
// export const imageToBase64 = (
//   file: File, 
//   maxWidth?: number, 
//   isEncrypted: boolean = false, 
//   targetSizeMB?: number,
//   inscriptionType: 'image' | 'profile' | 'profile2' = 'image'
// ): Promise<string> => {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
    
//     // Define size limits based on inscription type and encryption
//     // Account for transaction overhead to stay under 4.95MB safe limit
//     const getSizeLimit = () => {
//       // Calculate based on safe transaction size minus overhead
//       const overheadBytes = 300 * 1024; // ~300KB overhead for transaction structure
//       const safeDataSize = SAFE_TX_SIZE - overheadBytes;
//       const base64ToDataRatio = 0.75; // Base64 is ~33% larger than binary
//       const maxBase64MB = (safeDataSize * base64ToDataRatio) / (1024 * 1024);
      
//       if (inscriptionType === 'image') {
//         return isEncrypted ? Math.min(3.4, maxBase64MB) : Math.min(3.55, maxBase64MB);
//       } else if (inscriptionType === 'profile') {
//         return isEncrypted ? Math.min(3.4, maxBase64MB) : Math.min(3.55, maxBase64MB);
//       } else if (inscriptionType === 'profile2') {
//         // For profile2, two images need to fit
//         return isEncrypted ? Math.min(2.2, maxBase64MB / 2) : Math.min(2.4, maxBase64MB / 2);
//       }
//       return targetSizeMB || Math.min(3.55, maxBase64MB);
//     };
    
//     const maxSizeMB = targetSizeMB || getSizeLimit();
//     const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
//     // Calculate if we need compression
//     const base64Overhead = 1.37;
//     const estimatedBase64Size = file.size * base64Overhead;
    
//     // Only compress if we're over the limit or maxWidth is specified
//     if (estimatedBase64Size <= maxSizeBytes && !maxWidth) {
//       reader.onload = () => {
//         const base64 = reader.result as string;
//         const base64Data = base64.split(',')[1];
//         const base64SizeMB = (base64Data.length / 1024 / 1024).toFixed(2);
//         console.log(`Image passed through without compression: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${base64SizeMB}MB base64`);
//         console.log(`Inscription type: ${inscriptionType}, Encrypted: ${isEncrypted}`);
//         resolve(base64Data);
//       };
//       reader.onerror = () => reject(new Error('Failed to read file'));
//       reader.readAsDataURL(file);
//       return;
//     }
    
//     // Need compression
//     reader.onload = (e) => {
//       const img = new Image();
//       img.onload = () => {
//         const canvas = document.createElement('canvas');
//         const ctx = canvas.getContext('2d');
//         if (!ctx) {
//           reject(new Error('Failed to get canvas context'));
//           return;
//         }
        
//         let width = img.width;
//         let height = img.height;
        
//         // Calculate dimension reduction if needed
//         if (maxWidth && (width > maxWidth || height > maxWidth)) {
//           if (width > height) {
//             height = Math.round((height / width) * maxWidth);
//             width = maxWidth;
//           } else {
//             width = Math.round((width / height) * maxWidth);
//             height = maxWidth;
//           }
//         } else if (estimatedBase64Size > maxSizeBytes) {
//           // Only resize if we must to fit size limit
//           const reductionFactor = Math.sqrt(maxSizeBytes / estimatedBase64Size) * 0.98;
//           const maxDimension = Math.max(1200, Math.floor(Math.max(width, height) * reductionFactor));
          
//           if (width > maxDimension || height > maxDimension) {
//             if (width > height) {
//               height = Math.round((height / width) * maxDimension);
//               width = maxDimension;
//             } else {
//               width = Math.round((width / height) * maxDimension);
//               height = maxDimension;
//             }
//           }
//         }
        
//         canvas.width = width;
//         canvas.height = height;
        
//         // High quality rendering
//         ctx.imageSmoothingEnabled = true;
//         ctx.imageSmoothingQuality = 'high';
//         ctx.drawImage(img, 0, 0, width, height);
        
//         // Start with very high quality
//         let quality = 0.98;
//         let targetSize = maxSizeBytes;
        
//         // Try PNG first if original was PNG and size permits
//         let dataUrl: string;
//         if (file.type === 'image/png' && estimatedBase64Size < maxSizeBytes * 1.2) {
//           dataUrl = canvas.toDataURL('image/png');
//           if (dataUrl.length <= targetSize) {
//             const base64Data = dataUrl.split(',')[1];
//             console.log(`PNG preserved: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(base64Data.length / 1024 / 1024).toFixed(2)}MB base64`);
//             resolve(base64Data);
//             return;
//           }
//         }
        
//         // Use JPEG with progressive quality reduction
//         dataUrl = canvas.toDataURL('image/jpeg', quality);
        
//         // Only reduce quality if necessary
//         while (dataUrl.length > targetSize && quality > 0.85) {
//           quality -= 0.01; // Very small decrements
//           dataUrl = canvas.toDataURL('image/jpeg', quality);
//         }
        
//         // If still too large, try one more dimension reduction
//         if (dataUrl.length > targetSize) {
//           const scaleFactor = Math.sqrt(targetSize / dataUrl.length) * 0.99;
//           canvas.width = Math.round(width * scaleFactor);
//           canvas.height = Math.round(height * scaleFactor);
//           ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
//           dataUrl = canvas.toDataURL('image/jpeg', Math.min(quality + 0.02, 0.98));
//         }
        
//         const base64Data = dataUrl.split(',')[1];
//         const base64SizeMB = (base64Data.length / 1024 / 1024).toFixed(2);
//         const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
        
//         console.log(`Image compressed: ${originalSizeMB}MB → ${base64SizeMB}MB base64 (${canvas.width}x${canvas.height}, quality ${quality.toFixed(2)})`);
//         console.log(`Type: ${inscriptionType}, Encrypted: ${isEncrypted}, Target limit: ${maxSizeMB}MB`);
        
//         // Final safety check - ensure it will fit in transaction
//         const estimatedTxSize = (base64Data.length / 0.75) + 300 * 1024; // Convert base64 to binary + overhead
//         if (estimatedTxSize > SAFE_TX_SIZE) {
//           reject(new Error(`Compressed image still too large: ${base64SizeMB}MB. Please use a smaller image or try the Large Profile option for files over 10MB.`));
//           return;
//         }
        
//         resolve(base64Data);
//       };
//       img.onerror = () => reject(new Error('Failed to load image'));
//       img.src = e.target?.result as string;
//     };
//     reader.onerror = () => reject(new Error('Failed to read file'));
//     reader.readAsDataURL(file);
//   });
// };

// // Validate image file
// export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
//   // Check file type
//   const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
//   if (!validTypes.includes(file.type)) {
//     return {
//       valid: false,
//       error: 'Invalid file type. Please use JPG, PNG, GIF, or WebP.'
//     };
//   }
  
//   // Check file size (10MB limit for regular inscriptions, larger files should use BCAT)
//   const maxSize = 10 * 1024 * 1024;
//   if (file.size > maxSize) {
//     return {
//       valid: false,
//       error: `File too large for regular inscription. Files over 10MB should use the Large Profile (BCAT) option. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
//     };
//   }
  
//   return { valid: true };
// };

// // Get image dimensions
// export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const img = new Image();
//       img.onload = () => {
//         resolve({ width: img.width, height: img.height });
//       };
//       img.onerror = () => reject(new Error('Failed to load image'));
//       img.src = e.target?.result as string;
//     };
//     reader.onerror = () => reject(new Error('Failed to read file'));
//     reader.readAsDataURL(file);
//   });
// };

// // Estimate final transaction size for an image
// export const estimateImageTransactionSize = async (
//   file: File,
//   isEncrypted: boolean = false,
//   inscriptionType: 'image' | 'profile' | 'profile2' = 'image'
// ): Promise<{ estimatedSize: number; requiresCompression: boolean }> => {
//   const base64Overhead = 1.37;
//   const txOverhead = 300 * 1024; // 300KB for transaction structure
  
//   const estimatedBase64Size = file.size * base64Overhead;
//   const estimatedTxSize = (estimatedBase64Size / 0.75) + txOverhead;
  
//   const requiresCompression = estimatedTxSize > SAFE_TX_SIZE;
  
//   return {
//     estimatedSize: estimatedTxSize,
//     requiresCompression
//   };
// };
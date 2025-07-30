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
    const getSizeLimit = () => {
      if (inscriptionType === 'image') {
        // Allow larger sizes that will fit in 5MB transaction
        return isEncrypted ? 3.5 : 3.6; // Actual limit for data that fits in 5MB tx
      } else if (inscriptionType === 'profile') {
        return isEncrypted ? 3.5 : 3.6; // Increased limits
      } else if (inscriptionType === 'profile2') {
        return isEncrypted ? 1.7 : 1.8; // Increased limits for profile2
      }
      return targetSizeMB || 3.5; // Default fallback
    };
    
    const maxSizeMB = targetSizeMB || getSizeLimit();
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    // For smaller files that are under the limit, just convert directly
    const base64Overhead = 1.37;
    const estimatedBase64Size = file.size * base64Overhead;
    
    // More aggressive passthrough - only compress if really needed
    if (estimatedBase64Size < maxSizeBytes * 0.98 && !maxWidth) { // 98% to leave small margin
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        console.log(`Image passed through without compression: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(base64Data.length / 1024 / 1024).toFixed(2)}MB base64`);
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    
    // For larger files or when maxWidth is specified, use compression
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Calculate new dimensions based on file size
        let width = img.width;
        let height = img.height;
        
        // Only resize if absolutely necessary or maxWidth is specified
        let maxDimension = maxWidth;
        if (!maxDimension) {
          const currentDataSize = file.size * base64Overhead;
          
          if (currentDataSize > maxSizeBytes) {
            // Only compress if we exceed the size limit
            const reductionFactor = Math.sqrt(maxSizeBytes / currentDataSize) * 0.95; // 0.95 for safety
            maxDimension = Math.max(800, Math.floor(Math.max(width, height) * reductionFactor));
          } else {
            // Don't resize if under limit
            maxDimension = Math.max(width, height);
          }
        }
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Higher quality for less compression
        let quality = inscriptionType === 'image' ? 0.98 : 0.95; // Very high quality
        let targetSize = maxSizeBytes * 0.98; // 98% of limit
        
        let dataUrl = canvas.toDataURL(file.type || 'image/jpeg', quality);
        
        // Only reduce quality if absolutely necessary
        while (dataUrl.length > targetSize && quality > 0.7) { // Higher minimum quality
          quality -= 0.02; // Smaller decrements
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        // If still too large, reduce dimensions slightly
        if (dataUrl.length > targetSize && !maxWidth) {
          const scaleFactor = Math.sqrt(targetSize / dataUrl.length) * 0.98;
          canvas.width = Math.round(width * scaleFactor);
          canvas.height = Math.round(height * scaleFactor);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', quality + 0.05); // Slightly higher quality after resize
        }
        
        const base64Data = dataUrl.split(',')[1];
        const compressedSizeMB = (base64Data.length / 1024 / 1024).toFixed(2);
        const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
        
        console.log(`Image processed: ${originalSizeMB}MB → ${compressedSizeMB}MB base64 (${width}x${height}, quality ${quality.toFixed(2)})`);
        console.log(`Type: ${inscriptionType}, Encrypted: ${isEncrypted}`);
        
        // Final check - ensure we're under 5MB transaction limit
        const estimatedTxSize = base64Data.length + 300; // Minimal overhead
        const txLimitMB = 4.99; // Very close to 5MB limit
        if (estimatedTxSize > txLimitMB * 1024 * 1024) {
          reject(new Error(`Image still too large: ${(estimatedTxSize / 1024 / 1024).toFixed(2)}MB. Maximum is ${txLimitMB}MB.`));
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
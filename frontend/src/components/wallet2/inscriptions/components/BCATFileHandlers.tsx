import React from 'react';
import * as pdfjs from 'pdfjs-dist';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// File handler configurations
export const FILE_HANDLERS = {
  'image/*': {
    chunkSize: 200 * 1024,
    preview: 'ImagePreview',
    generateThumbnail: 'generateImageThumbnail'
  },
  'video/*': {
    chunkSize: 490 * 1024,
    preview: 'VideoPreview',
    generateThumbnail: 'generateVideoThumbnail'
  },
  'audio/*': {
    chunkSize: 200 * 1024,
    preview: 'AudioPreview',
    generateThumbnail: 'generateAudioThumbnail'
  },
  'application/pdf': {
    chunkSize: 200 * 1024,
    preview: 'PDFPreview',
    generateThumbnail: 'generatePDFThumbnail'
  },
  'model/gltf+json': {
    chunkSize: 100 * 1024,
    preview: 'ThreeJSPreview',
    generateThumbnail: 'generate3DThumbnail'
  },
  'model/gltf-binary': {
    chunkSize: 200 * 1024,
    preview: 'ThreeJSPreview',
    generateThumbnail: 'generate3DThumbnail'
  },
  'text/*': {
    chunkSize: 50 * 1024,
    preview: 'TextPreview',
    generateThumbnail: 'generateTextThumbnail'
  },
  'application/json': {
    chunkSize: 50 * 1024,
    preview: 'JSONPreview',
    generateThumbnail: 'generateTextThumbnail'
  }
};

export class FileTypeHandler {
  
  // Generate thumbnail based on file type
  async generateThumbnail(file: File): Promise<string> {
    const type = file.type;
    
    if (type.startsWith('image/')) {
      return this.generateImageThumbnail(file);
    } else if (type.startsWith('video/')) {
      return this.generateVideoThumbnail(file);
    } else if (type.startsWith('audio/')) {
      return this.generateAudioThumbnail(file);
    } else if (type === 'application/pdf') {
      return this.generatePDFThumbnail(file);
    } else if (type.includes('gltf')) {
      return this.generate3DThumbnail(file);
    } else if (type.startsWith('text/') || type === 'application/json') {
      return this.generateTextThumbnail(file);
    } else {
      return this.generateGenericThumbnail(file);
    }
  }

  // Image thumbnail
  private generateImageThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          
          const scale = Math.min(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (size - w) / 2;
          const y = (size - h) / 2;
          
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, x, y, w, h);
          
          // Add format label
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(0, size - 25, size, 25);
          ctx.fillStyle = '#fff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(file.type.split('/')[1].toUpperCase(), size/2, size - 8);
          
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  // Video thumbnail
  private generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = 200;
      canvas.height = 200;
      
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 10); // Seek to 10% or 1 second
      };
      
      video.onseeked = () => {
        const scale = Math.min(200 / video.videoWidth, 200 / video.videoHeight);
        const w = video.videoWidth * scale;
        const h = video.videoHeight * scale;
        const x = (200 - w) / 2;
        const y = (200 - h) / 2;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 200, 200);
        ctx.drawImage(video, x, y, w, h);
        
        // Add play button overlay
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(80, 70);
        ctx.lineTo(80, 130);
        ctx.lineTo(130, 100);
        ctx.closePath();
        ctx.fill();
        
        // Add duration
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 175, 200, 25);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const duration = Math.floor(video.duration);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, 100, 192);
        
        resolve(canvas.toDataURL('image/jpeg', 0.7));
        
        // Clean up
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        resolve(this.generateGenericThumbnail(file));
      };
      
      video.src = URL.createObjectURL(file);
    });
  }

  // Audio thumbnail
  private generateAudioThumbnail(file: File): Promise<string> {
    return new Promise(async (resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 200;
      canvas.height = 200;
      
      // Create waveform visualization
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, 200, 200);
      
      // Draw fake waveform
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let x = 0; x < 200; x += 4) {
        const y = 100 + Math.sin(x * 0.1) * 30 * Math.random();
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // Add audio icon
      ctx.fillStyle = '#fff';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🎵', 100, 60);
      
      // Add file info
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 160, 200, 40);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(file.name.substring(0, 20), 100, 180);
      ctx.fillText(`${(file.size / (1024 * 1024)).toFixed(1)}MB`, 100, 195);
      
      resolve(canvas.toDataURL('image/png'));
    });
  }

  // PDF thumbnail
  private async generatePDFThumbnail(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      
      const scale = 200 / Math.max(viewport.width, viewport.height);
      const scaledViewport = page.getViewport({ scale });
      
      canvas.width = 200;
      canvas.height = 200;
      
      // Center the PDF page
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
        transform: [
          1, 0, 0, 1,
          (200 - scaledViewport.width) / 2,
          (200 - scaledViewport.height) / 2
        ]
      };
      
      await page.render(renderContext).promise;
      
      // Add PDF label
      context.fillStyle = 'rgba(220, 38, 38, 0.9)';
      context.fillRect(140, 10, 50, 25);
      context.fillStyle = '#fff';
      context.font = 'bold 12px Arial';
      context.textAlign = 'center';
      context.fillText('PDF', 165, 27);
      
      // Add page count
      context.fillStyle = 'rgba(0,0,0,0.7)';
      context.fillRect(0, 175, 200, 25);
      context.fillStyle = '#fff';
      context.font = '12px Arial';
      context.fillText(`${pdf.numPages} pages`, 100, 192);
      
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (error) {
      console.error('PDF thumbnail generation failed:', error);
      return this.generateGenericThumbnail(file);
    }
  }

  // 3D model thumbnail
  private async generate3DThumbnail(file: File): Promise<string> {
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      
      renderer.setSize(200, 200);
      renderer.setClearColor(0x1a1a1a);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);
      
      // Load model
      const loader = new GLTFLoader();
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer]);
      const url = URL.createObjectURL(blob);
      
      return new Promise((resolve) => {
        loader.load(
          url,
          (gltf) => {
            scene.add(gltf.scene);
            
            // Center and scale model
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            gltf.scene.scale.multiplyScalar(scale);
            gltf.scene.position.sub(center.multiplyScalar(scale));
            
            // Position camera
            camera.position.set(3, 3, 3);
            camera.lookAt(0, 0, 0);
            
            // Render
            renderer.render(scene, camera);
            const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.7);
            
            // Clean up
            URL.revokeObjectURL(url);
            renderer.dispose();
            
            resolve(dataUrl);
          },
          undefined,
          () => {
            URL.revokeObjectURL(url);
            resolve(this.generateGenericThumbnail(file));
          }
        );
      });
    } catch (error) {
      console.error('3D thumbnail generation failed:', error);
      return this.generateGenericThumbnail(file);
    }
  }

  // Text/JSON thumbnail
  private async generateTextThumbnail(file: File): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 200;
    canvas.height = 200;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 200, 200);
    
    // Read first part of file
    const text = await file.slice(0, 1000).text();
    
    // Draw text preview
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '10px monospace';
    
    const lines = text.split('\n').slice(0, 15);
    let y = 20;
    
    for (const line of lines) {
      ctx.fillText(line.substring(0, 30), 10, y);
      y += 12;
    }
    
    // Add overlay
    const gradient = ctx.createLinearGradient(0, 100, 0, 200);
    gradient.addColorStop(0, 'rgba(26,26,26,0)');
    gradient.addColorStop(1, 'rgba(26,26,26,1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 100, 200, 100);
    
    // Add file type icon
    ctx.fillStyle = '#6b7280';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    const icon = file.type === 'application/json' ? '{ }' : 'Aa';
    ctx.fillText(icon, 100, 160);
    
    // Add file info
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText(file.type.split('/')[1].toUpperCase(), 100, 185);
    
    return canvas.toDataURL('image/png');
  }

  // Generic thumbnail for unknown types
  private generateGenericThumbnail(file: File): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 200;
    canvas.height = 200;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 200, 200);
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    
    let icon = '📄';
    const type = file.type.toLowerCase();
    if (type.includes('zip') || type.includes('archive')) icon = '📦';
    else if (type.includes('word')) icon = '📝';
    else if (type.includes('excel') || type.includes('spreadsheet')) icon = '📊';
    else if (type.includes('powerpoint') || type.includes('presentation')) icon = '📽️';
    
    ctx.fillText(icon, 100, 90);
    
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '14px Arial';
    const displayName = file.name.length > 20 ? 
      file.name.substring(0, 17) + '...' : 
      file.name;
    ctx.fillText(displayName, 100, 130);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`${(file.size / (1024 * 1024)).toFixed(1)}MB`, 100, 150);
    ctx.fillText(file.type || 'Unknown type', 100, 170);
    
    return canvas.toDataURL('image/png');
  }

  // Get optimal chunk size for file type
  getOptimalChunkSize(mimeType: string): number {
    for (const [pattern, config] of Object.entries(FILE_HANDLERS)) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*'));
        if (regex.test(mimeType)) {
          return config.chunkSize;
        }
      } else if (pattern === mimeType) {
        return config.chunkSize;
      }
    }
    
    // Default chunk size
    return 100 * 1024;
  }
}
// Encryption level type
export type EncryptionLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Get encryption level label
export const getEncryptionLevelLabel = (level: EncryptionLevel): string => {
  const labels = {
    0: 'Public (No encryption)',
    1: 'Friends',
    2: 'Close Friends',
    3: 'Inner Circle',
    4: 'Closed Group',
    5: 'Completely Private'
  };
  return labels[level];
};

// Get encryption level color
export const getEncryptionLevelColor = (level: EncryptionLevel): string => {
  const colors = {
    0: 'gray',
    1: 'orange',
    2: 'yellow',
    3: 'indigo',
    4: 'purple',
    5: 'red'
  };
  return colors[level];
};

// Blog encryption utilities using Web Crypto API
export class BlogEncryption {
  static async deriveEncryptionKey(keySegment: string, salt: string = 'blog-encryption'): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keySegment),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: string, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoder.encode(data)
    );
    
    return { encrypted, iv };
  }

  static async decrypt(encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  static async prepareEncryptedInscription(
    data: any,
    encryptionLevel: EncryptionLevel,
    keySegment: string | null
  ): Promise<{ encryptedData: string; metadata: any }> {
    if (encryptionLevel === 0 || !keySegment) {
      return {
        encryptedData: typeof data === 'string' ? data : JSON.stringify(data),
        metadata: { encrypted: false, level: 0 }
      };
    }

    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const encryptionKey = await this.deriveEncryptionKey(keySegment);
    const { encrypted, iv } = await this.encrypt(dataStr, encryptionKey);
    
    const metadata = {
      encrypted: true,
      level: encryptionLevel,
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      algorithm: 'aes-256-gcm'
    };

    // Convert encrypted ArrayBuffer to base64 in chunks to avoid call stack issues
    const encryptedArray = new Uint8Array(encrypted);
    let encryptedBase64 = '';
    
    // Process in 64KB chunks
    const chunkSize = 65536;
    for (let i = 0; i < encryptedArray.length; i += chunkSize) {
      const chunk = encryptedArray.slice(i, i + chunkSize);
      // Convert chunk to string without using spread operator
      let chunkString = '';
      for (let j = 0; j < chunk.length; j++) {
        chunkString += String.fromCharCode(chunk[j]);
      }
      encryptedBase64 += btoa(chunkString);
    }

    return {
      encryptedData: encryptedBase64,
      metadata
    };
  }
}
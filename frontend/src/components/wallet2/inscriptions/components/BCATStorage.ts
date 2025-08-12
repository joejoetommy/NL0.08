import { compress, decompress } from 'fflate';

interface CacheEntry {
  data: Blob;
  timestamp: number;
  metadata?: any;
}

interface SessionData {
  [key: string]: any;
}

// Cache for reconstructed files
export class BCATCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge = 3600000; // 1 hour
  private maxSize = 100 * 1024 * 1024; // 100MB max cache size
  private currentSize = 0;

  constructor() {
    this.loadFromIndexedDB();
  }

  // Set item in cache
  async set(txid: string, data: Blob, metadata?: any): Promise<void> {
    // Check size limits
    if (data.size > this.maxSize / 2) {
      console.warn('File too large for cache');
      return;
    }

    // Evict old entries if needed
    while (this.currentSize + data.size > this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(txid, {
      data,
      timestamp: Date.now(),
      metadata
    });

    this.currentSize += data.size;

    // Persist to IndexedDB
    await this.saveToIndexedDB(txid, data, metadata);
  }

  // Get item from cache
  get(txid: string): Blob | null {
    const entry = this.cache.get(txid);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(txid);
      this.currentSize -= entry.data.size;
      this.removeFromIndexedDB(txid);
      return null;
    }

    // Update timestamp (LRU)
    entry.timestamp = Date.now();
    return entry.data;
  }

  // Check if item exists
  has(txid: string): boolean {
    const entry = this.cache.get(txid);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(txid);
      this.currentSize -= entry.data.size;
      return false;
    }
    
    return true;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.clearIndexedDB();
  }

  // Evict oldest entry
  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldest = key;
        oldestTime = value.timestamp;
      }
    }

    if (oldest) {
      const entry = this.cache.get(oldest);
      if (entry) {
        this.currentSize -= entry.data.size;
        this.cache.delete(oldest);
        this.removeFromIndexedDB(oldest);
      }
    }
  }

  // IndexedDB operations
  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BCATCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'txid' });
        }
      };
    });
  }

  private async saveToIndexedDB(txid: string, data: Blob, metadata?: any): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      // Compress data before storing
      const arrayBuffer = await data.arrayBuffer();
      const compressed = compress(new Uint8Array(arrayBuffer));
      
      store.put({
        txid,
        data: compressed,
        type: data.type,
        timestamp: Date.now(),
        metadata
      });
      
      await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = reject;
      });
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error);
    }
  }

  private async loadFromIndexedDB(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();
      
      const items = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = reject;
      });
      
      for (const item of items) {
        // Skip expired items
        if (Date.now() - item.timestamp > this.maxAge) continue;
        
        // Decompress data
        const decompressed = decompress(item.data);
        const blob = new Blob([decompressed], { type: item.type });
        
        this.cache.set(item.txid, {
          data: blob,
          timestamp: item.timestamp,
          metadata: item.metadata
        });
        
        this.currentSize += blob.size;
      }
      
      console.log(`Loaded ${this.cache.size} items from cache`);
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
    }
  }

  private async removeFromIndexedDB(txid: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.delete(txid);
    } catch (error) {
      console.error('Failed to remove from IndexedDB:', error);
    }
  }

  private async clearIndexedDB(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.clear();
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
  }

  // Get cache statistics
  getStats(): {
    items: number;
    size: number;
    maxSize: number;
    usage: number;
  } {
    return {
      items: this.cache.size,
      size: this.currentSize,
      maxSize: this.maxSize,
      usage: (this.currentSize / this.maxSize) * 100
    };
  }
}

// Session manager for upload persistence
export class BCATSessionManager {
  private readonly SESSION_PREFIX = 'bcat_session_';
  private readonly MAX_SESSIONS = 10;

  // Save session
  async saveSession(session: any): Promise<void> {
    const key = `${this.SESSION_PREFIX}${session.fileHash}`;
    
    try {
      // Compress session data
      const jsonString = JSON.stringify(session);
      const compressed = compress(new TextEncoder().encode(jsonString));
      const base64 = btoa(String.fromCharCode(...compressed));
      
      localStorage.setItem(key, base64);
      
      // Clean up old sessions
      this.cleanupOldSessions();
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  // Get session
  async getSession(fileHash: string): Promise<any | null> {
    const key = `${this.SESSION_PREFIX}${fileHash}`;
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    try {
      // Decompress session data
      const compressed = new Uint8Array(
        atob(data).split('').map(c => c.charCodeAt(0))
      );
      const decompressed = decompress(compressed);
      const jsonString = new TextDecoder().decode(decompressed);
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  // Delete session
  async deleteSession(fileHash: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${fileHash}`;
    localStorage.removeItem(key);
  }

  // Get all sessions
  async getAllSessions(): Promise<any[]> {
    const sessions: any[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.SESSION_PREFIX)) {
        const fileHash = key.replace(this.SESSION_PREFIX, '');
        const session = await this.getSession(fileHash);
        if (session) {
          sessions.push(session);
        }
      }
    }
    
    return sessions.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Clean up old sessions
  private cleanupOldSessions(): void {
    const sessions: { key: string; timestamp: number }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.SESSION_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const compressed = new Uint8Array(
              atob(data).split('').map(c => c.charCodeAt(0))
            );
            const decompressed = decompress(compressed);
            const jsonString = new TextDecoder().decode(decompressed);
            const session = JSON.parse(jsonString);
            sessions.push({ key, timestamp: session.timestamp });
          } catch (error) {
            // Remove corrupted session
            localStorage.removeItem(key);
          }
        }
      }
    }
    
    // Remove oldest sessions if over limit
    if (sessions.length > this.MAX_SESSIONS) {
      sessions.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = sessions.slice(0, sessions.length - this.MAX_SESSIONS);
      for (const item of toRemove) {
        localStorage.removeItem(item.key);
      }
    }
  }

  // Clear all sessions
  clearAllSessions(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.SESSION_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }
}
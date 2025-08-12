import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import { UTXOManager } from '../../utils/blockchain';
import { BroadcastService } from '../../services/BroadcastService';
import { createInscriptionScript } from '../utils/inscriptionCreator';
import { BCATSessionManager } from './BCATStorage';
import { FileTypeHandler } from './BCATFileHandlers';

const BCAT_NAMESPACE = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up';
const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

interface Settings {
  parallelUploads: number;
  autoRetry: boolean;
  chunkSize: number;
  useCache: boolean;
  verifyIntegrity: boolean;
}

export class BCATUploadManager {
  private sessionManager: BCATSessionManager;
  private fileHandler: FileTypeHandler;
  
  constructor(
    private keyData: any,
    private network: 'mainnet' | 'testnet',
    private whatsOnChainApiKey?: string,
    private currentFeeRate: number = 1,
    private settings: Settings = {
      parallelUploads: 3,
      autoRetry: true,
      chunkSize: 95 * 1024,
      useCache: true,
      verifyIntegrity: true
    }
  ) {
    this.sessionManager = new BCATSessionManager();
    this.fileHandler = new FileTypeHandler();
  }

  public async uploadLargeFile(
    file: File,
    onProgress?: (current: number, total: number, phase: string) => void
  ): Promise<{ success: boolean; txid?: string; error?: string }> {
    try {
      // Calculate file hash
      const fileHash = await this.calculateFileHash(file);
      
      // Check for existing session
      let session = await this.sessionManager.getSession(fileHash);
      
      if (session?.status === 'completed') {
        return { 
          success: false, 
          error: 'This file has already been uploaded',
          txid: session.mainTxId 
        };
      }
      
      // Create new session if needed
      if (!session) {
        onProgress?.(0, 100, 'Preparing file...');
        const { chunks, hashes } = await this.chunkFile(file);
        
        session = await this.createSession(file, fileHash, chunks, hashes);
        await this.sessionManager.saveSession(session);
      }
      
      // Upload chunks
      onProgress?.(0, session.chunks.length, 'Uploading chunks...');
      const chunkTxIds = await this.uploadChunks(session, file, onProgress);
      
      // Create main BCAT transaction
      onProgress?.(90, 100, 'Creating BCAT reference...');
      const thumbnail = await this.fileHandler.generateThumbnail(file);
      const mainTxid = await this.createMainBCATTransaction(file, thumbnail, chunkTxIds, session);
      
      // Update session
      session.status = 'completed';
      session.mainTxId = mainTxid;
      await this.sessionManager.saveSession(session);
      
      onProgress?.(100, 100, 'Complete!');
      
      return { success: true, txid: mainTxid };
      
    } catch (error) {
      console.error('Upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  public async resumeSession(
    fileHash: string,
    onProgress?: (current: number, total: number, phase: string) => void
  ): Promise<{ success: boolean; txid?: string; error?: string }> {
    const session = await this.sessionManager.getSession(fileHash);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    if (session.status === 'completed') {
      return { success: true, txid: session.mainTxId };
    }
    
    // Resume upload with existing session
    // Implementation would be similar to uploadLargeFile but resuming from session state
    
    return { success: false, error: 'Resume not implemented' };
  }

  private async calculateFileHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async chunkFile(file: File): Promise<{ chunks: ArrayBuffer[], hashes: string[] }> {
    const chunkSize = this.settings.chunkSize;
    const chunks: ArrayBuffer[] = [];
    const hashes: string[] = [];
    
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const chunk = await file.slice(offset, offset + chunkSize).arrayBuffer();
      chunks.push(chunk);
      
      if (this.settings.verifyIntegrity) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', chunk);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        hashes.push(hashHex);
      }
    }
    
    return { chunks, hashes };
  }

  private async createSession(
    file: File,
    fileHash: string,
    chunks: ArrayBuffer[],
    hashes: string[]
  ): Promise<any> {
    return {
      sessionId: `bcat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileHash,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      chunks: chunks.map((chunk, index) => ({
        index,
        txid: null,
        size: chunk.byteLength,
        hash: hashes[index] || '',
        attempts: 0,
        status: 'pending'
      })),
      metadata: {
        chunkSize: this.settings.chunkSize,
        totalChunks: chunks.length
      },
      timestamp: Date.now(),
      status: 'pending',
      completedChunks: 0,
      totalChunks: chunks.length,
      failedChunks: 0
    };
  }

  private async uploadChunks(
    session: any,
    file: File,
    onProgress?: (current: number, total: number, phase: string) => void
  ): Promise<string[]> {
    const { chunks } = await this.chunkFile(file);
    const txids: string[] = new Array(chunks.length);
    
    // Check for already uploaded chunks
    for (const chunk of session.chunks) {
      if (chunk.txid) {
        txids[chunk.index] = chunk.txid;
      }
    }
    
    // Upload in parallel batches
    const batchSize = this.settings.parallelUploads;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
      const batchIndices = Array.from({ length: batch.length }, (_, idx) => i + idx);
      
      // Skip already uploaded
      const toUpload = batchIndices.filter(idx => !txids[idx]);
      if (toUpload.length === 0) continue;
      
      const uploadPromises = toUpload.map(idx => 
        this.uploadSingleChunk(chunks[idx], idx, session)
      );
      
      const results = await Promise.allSettled(uploadPromises);
      
      results.forEach((result, batchIdx) => {
        const chunkIdx = toUpload[batchIdx];
        if (result.status === 'fulfilled' && result.value) {
          txids[chunkIdx] = result.value;
          session.chunks[chunkIdx].txid = result.value;
          session.chunks[chunkIdx].status = 'completed';
          session.completedChunks++;
        } else {
          session.chunks[chunkIdx].status = 'failed';
          session.failedChunks++;
        }
      });
      
      await this.sessionManager.saveSession(session);
      
      const completed = txids.filter(t => t).length;
      onProgress?.(completed, chunks.length, `Uploading chunks...`);
      
      // Rate limiting
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Verify all chunks uploaded
    const missing = txids.map((tx, i) => tx ? null : i).filter(i => i !== null);
    if (missing.length > 0) {
      throw new Error(`Failed to upload chunks: ${missing.join(', ')}`);
    }
    
    return txids;
  }

  private async uploadSingleChunk(
    chunk: ArrayBuffer,
    index: number,
    session: any,
    attempt: number = 1
  ): Promise<string | null> {
    const maxRetries = this.settings.autoRetry ? 3 : 1;
    
    if (attempt > maxRetries) {
      return null;
    }
    
    try {
      const privateKey = PrivateKey.fromWif(this.keyData.privateKeyWif) || 
                       PrivateKey.fromHex(this.keyData.privateKeyHex);
      const address = privateKey.toPublicKey().toAddress();
      
      const utxoManager = new UTXOManager(this.keyData.address, this.network, this.whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs(true);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available');
      }
      
      const chunkData = new Uint8Array(chunk);
      const estimatedFee = Math.ceil((300 + chunkData.length) / 1000) * this.currentFeeRate;
      const { selected } = utxoManager.selectUTXOs(estimatedFee);
      
      if (selected.length === 0) {
        throw new Error('Insufficient funds');
      }
      
      const tx = new Transaction();
      
      // Add inputs
      let totalInput = 0;
      for (const utxo of selected) {
        const txid = utxo.tx_hash || utxo.txid;
        const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
        const satoshis = utxo.value || utxo.satoshis || 0;
        
        totalInput += satoshis;
        
        const sourceTransaction = {
          id: txid,
          version: 1,
          inputs: [],
          outputs: Array(vout + 1).fill(null).map((_, i) => ({
            satoshis: i === vout ? satoshis : 0,
            lockingScript: new P2PKH().lock(address)
          })),
          lockTime: 0
        };
        
        tx.addInput({
          sourceTXID: txid,
          sourceOutputIndex: vout,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
          sourceTransaction
        });
      }
      
      // Create BCAT part OP_RETURN
      const opReturnScript = this.createBCATPartScript(chunkData);
      tx.addOutput({
        lockingScript: opReturnScript,
        satoshis: 0
      });
      
      // Add change
      const change = totalInput - estimatedFee;
      if (change > 0) {
        tx.addOutput({
          lockingScript: new P2PKH().lock(address),
          satoshis: change
        });
      }
      
      await tx.sign();
      const txHex = tx.toHex();
      
      const broadcastService = new BroadcastService(this.network);
      const result = await broadcastService.broadcast(txHex);
      
      if (!result.success || !result.txid) {
        throw new Error(result.error || 'Broadcast failed');
      }
      
      utxoManager.markAsSpent(selected);
      return result.txid;
      
    } catch (error) {
      console.error(`Chunk ${index} attempt ${attempt} failed:`, error);
      
      if (this.settings.autoRetry && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        return this.uploadSingleChunk(chunk, index, session, attempt + 1);
      }
      
      return null;
    }
  }

  private createBCATPartScript(data: Uint8Array): Script {
    let scriptHex = '6a'; // OP_RETURN
    
    // Push namespace
    const namespaceBytes = Utils.toArray(BCAT_PART_NAMESPACE, 'utf8');
    scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
    scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Push data
    const dataLength = data.length;
    if (dataLength <= 75) {
      scriptHex += dataLength.toString(16).padStart(2, '0');
    } else if (dataLength <= 255) {
      scriptHex += '4c' + dataLength.toString(16).padStart(2, '0');
    } else if (dataLength <= 65535) {
      scriptHex += '4d';
      scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
      scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
    } else {
      scriptHex += '4e';
      scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
      scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
      scriptHex += ((dataLength >> 16) & 0xff).toString(16).padStart(2, '0');
      scriptHex += ((dataLength >> 24) & 0xff).toString(16).padStart(2, '0');
    }
    
    scriptHex += Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return Script.fromHex(scriptHex);
  }

  private async createMainBCATTransaction(
    file: File,
    thumbnail: string,
    chunkTxIds: string[],
    session: any
  ): Promise<string> {
    const privateKey = PrivateKey.fromWif(this.keyData.privateKeyWif) || 
                     PrivateKey.fromHex(this.keyData.privateKeyHex);
    const address = privateKey.toPublicKey().toAddress();
    const pubKeyHash = privateKey.toPublicKey().toHash();
    
    // Prepare thumbnail
    const thumbnailData = thumbnail.split(',')[1];
    const thumbnailBytes = Utils.toArray(thumbnailData, 'base64');
    
    // Get UTXOs
    const utxoManager = new UTXOManager(this.keyData.address, this.network, this.whatsOnChainApiKey);
    const utxos = await utxoManager.fetchUTXOs(true);
    
    // Calculate fee
    const opReturnSize = 100 + (chunkTxIds.length * 32);
    const estimatedTxSize = 300 + thumbnailBytes.length + opReturnSize;
    const estimatedFee = Math.ceil((estimatedTxSize / 1000) * this.currentFeeRate) + 100;
    
    const { selected } = utxoManager.selectUTXOs(1 + estimatedFee + 546);
    
    if (selected.length === 0) {
      throw new Error('Insufficient funds for BCAT main transaction');
    }
    
    const tx = new Transaction();
    
    // Add inputs
    let totalInput = 0;
    for (const utxo of selected) {
      const txid = utxo.tx_hash || utxo.txid;
      const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
      const satoshis = utxo.value || utxo.satoshis || 0;
      
      totalInput += satoshis;
      
      const sourceTransaction = {
        id: txid,
        version: 1,
        inputs: [],
        outputs: Array(vout + 1).fill(null).map((_, i) => ({
          satoshis: i === vout ? satoshis : 0,
          lockingScript: new P2PKH().lock(address)
        })),
        lockTime: 0
      };
      
      tx.addInput({
        sourceTXID: txid,
        sourceOutputIndex: vout,
        unlockingScriptTemplate: new P2PKH().unlock(privateKey),
        sourceTransaction
      });
    }
    
    // Add inscription with thumbnail
    const inscriptionScript = createInscriptionScript(
      pubKeyHash,
      'image/jpeg',
      thumbnailBytes
    );
    
    tx.addOutput({
      lockingScript: inscriptionScript,
      satoshis: 1
    });
    
    // Add BCAT OP_RETURN
    let scriptHex = '6a'; // OP_RETURN
    
    // Namespace
    const namespaceBytes = Utils.toArray(BCAT_NAMESPACE, 'utf8');
    scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
    scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Info
    const info = 'BCAT';
    const infoBytes = Utils.toArray(info, 'utf8');
    scriptHex += infoBytes.length.toString(16).padStart(2, '0');
    scriptHex += infoBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // MIME type
    const mimeBytes = Utils.toArray(file.type || 'application/octet-stream', 'utf8');
    scriptHex += mimeBytes.length.toString(16).padStart(2, '0');
    scriptHex += mimeBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Charset - NULL
    scriptHex += '00';
    
    // Filename
    const filename = file.name.substring(0, 50);
    const filenameBytes = Utils.toArray(filename, 'utf8');
    scriptHex += filenameBytes.length.toString(16).padStart(2, '0');
    scriptHex += filenameBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Flag - NULL
    scriptHex += '00';
    
    // Transaction IDs (little-endian)
    for (const txid of chunkTxIds) {
      scriptHex += '20'; // Push 32 bytes
      for (let i = txid.length - 2; i >= 0; i -= 2) {
        scriptHex += txid.substr(i, 2);
      }
    }
    
    const bcatScript = Script.fromHex(scriptHex);
    
    tx.addOutput({
      lockingScript: bcatScript,
      satoshis: 0
    });
    
    // Add change
    const change = totalInput - 1 - estimatedFee;
    if (change > 546) {
      tx.addOutput({
        lockingScript: new P2PKH().lock(address),
        satoshis: change
      });
    }
    
    await tx.sign();
    const txHex = tx.toHex();
    
    const broadcastService = new BroadcastService(this.network);
    const result = await broadcastService.broadcast(txHex);
    
    if (!result.success || !result.txid) {
      throw new Error(`Failed to broadcast: ${result.error}`);
    }
    
    utxoManager.markAsSpent(selected);
    
    return result.txid;
  }
}


// import React, { useState, useEffect, useCallback } from 'react';
// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
// import { UTXOManager } from '../../utils/blockchain';
// import { BroadcastService } from '../../services/BroadcastService';
// import { createInscriptionScript } from '../utils/inscriptionCreator';
// import { BCATCache, BCATSessionManager } from './BCATStorage';
// import { FileTypeHandler, FILE_HANDLERS } from './BCATFileHandlers';
// import { BCATTestSuite } from './BCATTestSuite';

// // Constants for chunk management
// const CHUNK_SIZES = {
//   SMALL: 50 * 1024,    // 50KB - for testing
//   MEDIUM: 100 * 1024,   // 100KB - current
//   LARGE: 200 * 1024,    // 200KB - once stable
//   XLARGE: 490 * 1024,   // 490KB - maximum safe
// };

// const BCAT_NAMESPACE = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up';
// const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

// interface UploadSession {
//   sessionId: string;
//   fileHash: string;
//   fileName: string;
//   fileSize: number;
//   mimeType: string;
//   chunks: Array<{
//     index: number;
//     txid: string | null;
//     size: number;
//     hash: string;
//     attempts: number;
//     lastError?: string;
//   }>;
//   metadata: any;
//   timestamp: number;
//   status: 'pending' | 'uploading' | 'completed' | 'failed';
//   totalChunks: number;
//   completedChunks: number;
// }

// interface ChunkUploadResult {
//   success: boolean;
//   txid?: string;
//   error?: string;
//   attempts: number;
// }

// export class BCATUploadManager {
//   private cache: BCATCache;
//   private sessionManager: BCATSessionManager;
//   private fileHandler: FileTypeHandler;
//   private testSuite: BCATTestSuite;
  
//   constructor(
//     private keyData: any,
//     private network: 'mainnet' | 'testnet',
//     private whatsOnChainApiKey?: string,
//     private currentFeeRate: number = 1
//   ) {
//     this.cache = new BCATCache();
//     this.sessionManager = new BCATSessionManager();
//     this.fileHandler = new FileTypeHandler();
//     this.testSuite = new BCATTestSuite(network, whatsOnChainApiKey);
//   }

//   // Calculate optimal chunk size based on network conditions
//   private async getOptimalChunkSize(fileSize: number): Promise<number> {
//     // Run quick test to determine best chunk size
//     const testResult = await this.testSuite.quickChunkTest();
    
//     if (testResult.recommendedSize) {
//       return testResult.recommendedSize;
//     }
    
//     // Fallback logic
//     if (this.network === 'testnet') {
//       return CHUNK_SIZES.SMALL;
//     }
    
//     if (fileSize < 1024 * 1024) { // < 1MB
//       return CHUNK_SIZES.SMALL;
//     } else if (fileSize < 10 * 1024 * 1024) { // < 10MB
//       return CHUNK_SIZES.MEDIUM;
//     } else {
//       return CHUNK_SIZES.LARGE;
//     }
//   }

//   // Chunk file with optimal sizing
//   private async chunkFile(
//     file: File, 
//     chunkSize?: number
//   ): Promise<{ chunks: ArrayBuffer[], hashes: string[] }> {
//     const optimalChunkSize = chunkSize || await this.getOptimalChunkSize(file.size);
//     const chunks: ArrayBuffer[] = [];
//     const hashes: string[] = [];
    
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       let offset = 0;

//       const readNextChunk = async () => {
//         const slice = file.slice(offset, offset + optimalChunkSize);
//         reader.readAsArrayBuffer(slice);
//       };

//       reader.onload = async (e) => {
//         if (e.target?.result) {
//           const chunk = e.target.result as ArrayBuffer;
//           chunks.push(chunk);
          
//           // Calculate hash for verification
//           const hashBuffer = await crypto.subtle.digest('SHA-256', chunk);
//           const hashArray = Array.from(new Uint8Array(hashBuffer));
//           const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
//           hashes.push(hashHex);
          
//           offset += optimalChunkSize;
          
//           if (offset < file.size) {
//             readNextChunk();
//           } else {
//             resolve({ chunks, hashes });
//           }
//         }
//       };

//       reader.onerror = reject;
//       readNextChunk();
//     });
//   }

//   // Upload single chunk with retry logic
//   private async uploadChunkWithRetry(
//     chunk: ArrayBuffer,
//     index: number,
//     session: UploadSession,
//     maxRetries: number = 3
//   ): Promise<ChunkUploadResult> {
//     let attempts = 0;
//     let lastError: string = '';

//     while (attempts < maxRetries) {
//       attempts++;
      
//       try {
//         console.log(`Uploading chunk ${index + 1}, attempt ${attempts}`);
        
//         const txid = await this.uploadSingleChunk(chunk, index);
        
//         // Update session
//         session.chunks[index].txid = txid;
//         session.chunks[index].attempts = attempts;
//         session.completedChunks++;
//         await this.sessionManager.saveSession(session);
        
//         return { success: true, txid, attempts };
        
//       } catch (error) {
//         lastError = error instanceof Error ? error.message : 'Unknown error';
//         console.error(`Chunk ${index + 1} upload failed (attempt ${attempts}):`, lastError);
        
//         // Update session with error
//         session.chunks[index].attempts = attempts;
//         session.chunks[index].lastError = lastError;
//         await this.sessionManager.saveSession(session);
        
//         if (attempts < maxRetries) {
//           // Exponential backoff
//           const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
//           console.log(`Retrying chunk ${index + 1} in ${delay}ms...`);
//           await new Promise(resolve => setTimeout(resolve, delay));
//         }
//       }
//     }

//     return { 
//       success: false, 
//       error: lastError, 
//       attempts 
//     };
//   }

//   // Upload single chunk transaction
//   private async uploadSingleChunk(chunk: ArrayBuffer, index: number): Promise<string> {
//     const privateKey = PrivateKey.fromWif(this.keyData.privateKeyWif) || 
//                       PrivateKey.fromHex(this.keyData.privateKeyHex);
//     const address = privateKey.toPublicKey().toAddress();
    
//     // Get UTXOs
//     const utxoManager = new UTXOManager(this.keyData.address, this.network, this.whatsOnChainApiKey);
//     const utxos = await utxoManager.fetchUTXOs(true);
    
//     if (utxos.length === 0) {
//       throw new Error('No UTXOs available');
//     }
    
//     const chunkData = new Uint8Array(chunk);
    
//     // Estimate fee
//     const estimatedFee = Math.ceil((300 + chunkData.length) / 1000) * this.currentFeeRate;
//     const { selected, total } = utxoManager.selectUTXOs(estimatedFee);
    
//     if (selected.length === 0) {
//       throw new Error(`Insufficient funds for chunk ${index + 1}`);
//     }
    
//     // Build transaction
//     const tx = new Transaction();
    
//     // Add inputs
//     let totalInput = 0;
//     for (const utxo of selected) {
//       const txid = utxo.tx_hash || utxo.txid;
//       const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//       const satoshis = utxo.value || utxo.satoshis || 0;
      
//       totalInput += satoshis;
      
//       const sourceTransaction = {
//         id: txid,
//         version: 1,
//         inputs: [],
//         outputs: Array(vout + 1).fill(null).map((_, i) => ({
//           satoshis: i === vout ? satoshis : 0,
//           lockingScript: new P2PKH().lock(address)
//         })),
//         lockTime: 0
//       };
      
//       tx.addInput({
//         sourceTXID: txid,
//         sourceOutputIndex: vout,
//         unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//         sourceTransaction
//       });
//     }
    
//     // Create BCAT part OP_RETURN
//     const opReturnScript = this.createBCATPartScript(chunkData);
//     tx.addOutput({
//       lockingScript: opReturnScript,
//       satoshis: 0
//     });
    
//     // Add change
//     const change = totalInput - estimatedFee;
//     if (change > 0) {
//       tx.addOutput({
//         lockingScript: new P2PKH().lock(address),
//         satoshis: change
//       });
//     }
    
//     // Sign and broadcast
//     await tx.sign();
//     const txHex = tx.toHex();
    
//     const broadcastService = new BroadcastService(this.network);
//     const result = await broadcastService.broadcast(txHex);
    
//     if (!result.success || !result.txid) {
//       throw new Error(`Broadcast failed: ${result.error}`);
//     }
    
//     // Mark UTXOs as spent
//     utxoManager.markAsSpent(selected);
    
//     return result.txid;
//   }

//   // Create BCAT part script
//   private createBCATPartScript(data: Uint8Array): Script {
//     let scriptHex = '6a'; // OP_RETURN
    
//     // Push namespace
//     const namespaceBytes = Utils.toArray(BCAT_PART_NAMESPACE, 'utf8');
//     if (namespaceBytes.length <= 75) {
//       scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
//     } else {
//       scriptHex += '4c';
//       scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
//     }
//     scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
//     // Push data
//     const dataLength = data.length;
//     if (dataLength <= 75) {
//       scriptHex += dataLength.toString(16).padStart(2, '0');
//     } else if (dataLength <= 255) {
//       scriptHex += '4c';
//       scriptHex += dataLength.toString(16).padStart(2, '0');
//     } else if (dataLength <= 65535) {
//       scriptHex += '4d';
//       scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
//       scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
//     } else {
//       scriptHex += '4e';
//       scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
//       scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
//       scriptHex += ((dataLength >> 16) & 0xff).toString(16).padStart(2, '0');
//       scriptHex += ((dataLength >> 24) & 0xff).toString(16).padStart(2, '0');
//     }
    
//     // Add data
//     scriptHex += Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
    
//     return Script.fromHex(scriptHex);
//   }

//   // Upload chunks in parallel batches
//   private async uploadChunksInParallel(
//     chunks: ArrayBuffer[],
//     hashes: string[],
//     session: UploadSession,
//     batchSize: number = 3,
//     onProgress?: (current: number, total: number) => void
//   ): Promise<string[]> {
//     const txids: string[] = new Array(chunks.length);
    
//     // Check for existing progress
//     const existingChunks = session.chunks.filter(c => c.txid !== null);
//     console.log(`Resuming with ${existingChunks.length} already uploaded chunks`);
    
//     for (const chunk of existingChunks) {
//       txids[chunk.index] = chunk.txid!;
//     }
    
//     // Upload remaining chunks in batches
//     for (let i = 0; i < chunks.length; i += batchSize) {
//       const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
//       const batchIndices = Array.from({ length: batch.length }, (_, idx) => i + idx);
      
//       // Skip already uploaded chunks
//       const toUpload = batchIndices.filter(idx => !txids[idx]);
      
//       if (toUpload.length === 0) continue;
      
//       console.log(`Uploading batch: chunks ${toUpload.join(', ')}`);
      
//       const batchPromises = toUpload.map(idx => 
//         this.uploadChunkWithRetry(chunks[idx], idx, session)
//       );
      
//       const results = await Promise.allSettled(batchPromises);
      
//       // Process results
//       results.forEach((result, batchIdx) => {
//         const chunkIdx = toUpload[batchIdx];
//         if (result.status === 'fulfilled' && result.value.success) {
//           txids[chunkIdx] = result.value.txid!;
//         } else {
//           console.error(`Failed to upload chunk ${chunkIdx + 1}`);
//           throw new Error(`Failed to upload chunk ${chunkIdx + 1}: ${
//             result.status === 'rejected' ? result.reason : result.value.error
//           }`);
//         }
//       });
      
//       // Update progress
//       const completed = txids.filter(t => t !== undefined).length;
//       onProgress?.(completed, chunks.length);
      
//       // Save progress
//       await this.sessionManager.saveSession(session);
      
//       // Rate limiting between batches
//       if (i + batchSize < chunks.length) {
//         await new Promise(resolve => setTimeout(resolve, 2000));
//       }
//     }
    
//     return txids;
//   }

//   // Main upload function with session management
//   public async uploadLargeFile(
//     file: File,
//     onProgress?: (current: number, total: number, phase: string) => void
//   ): Promise<{ success: boolean; txid?: string; error?: string }> {
//     try {
//       // Calculate file hash for session management
//       const fileArrayBuffer = await file.arrayBuffer();
//       const hashBuffer = await crypto.subtle.digest('SHA-256', fileArrayBuffer);
//       const hashArray = Array.from(new Uint8Array(hashBuffer));
//       const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
//       // Check for existing session
//       let session = await this.sessionManager.getSession(fileHash);
      
//       if (session && session.status === 'completed') {
//         return { 
//           success: false, 
//           error: 'This file has already been uploaded' 
//         };
//       }
      
//       // Create or resume session
//       if (!session) {
//         // Chunk the file
//         onProgress?.(0, 100, 'Preparing file...');
//         const { chunks, hashes } = await this.chunkFile(file);
        
//         // Create new session
//         session = {
//           sessionId: `bcat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//           fileHash,
//           fileName: file.name,
//           fileSize: file.size,
//           mimeType: file.type || 'application/octet-stream',
//           chunks: chunks.map((_, index) => ({
//             index,
//             txid: null,
//             size: chunks[index].byteLength,
//             hash: hashes[index],
//             attempts: 0
//           })),
//           metadata: {
//             originalSize: file.size,
//             chunkSize: chunks[0]?.byteLength || 0,
//             totalChunks: chunks.length,
//             compression: 'none',
//             encryption: 'none'
//           },
//           timestamp: Date.now(),
//           status: 'pending',
//           totalChunks: chunks.length,
//           completedChunks: 0
//         };
        
//         await this.sessionManager.saveSession(session);
//       }
      
//       // Get chunks for upload
//       const fileBuffer = await file.arrayBuffer();
//       const { chunks } = await this.chunkFile(file);
      
//       // Update session status
//       session.status = 'uploading';
//       await this.sessionManager.saveSession(session);
      
//       // Upload chunks
//       const chunkTxIds = await this.uploadChunksInParallel(
//         chunks,
//         session.chunks.map(c => c.hash),
//         session,
//         3, // Batch size
//         (current, total) => onProgress?.(current, total, 'Uploading chunks...')
//       );
      
//       // Generate thumbnail
//       onProgress?.(90, 100, 'Creating thumbnail...');
//       const thumbnail = await this.fileHandler.generateThumbnail(file);
      
//       // Create main BCAT transaction
//       onProgress?.(95, 100, 'Creating BCAT reference...');
//       const mainTxid = await this.createMainBCATTransaction(
//         file,
//         thumbnail,
//         chunkTxIds,
//         session.metadata
//       );
      
//       // Update session
//       session.status = 'completed';
//       await this.sessionManager.saveSession(session);
      
//       // Cache the result
//       this.cache.set(mainTxid, new Blob([fileBuffer], { type: file.type }));
      
//       onProgress?.(100, 100, 'Complete!');
      
//       return { 
//         success: true, 
//         txid: mainTxid 
//       };
      
//     } catch (error) {
//       console.error('Upload failed:', error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : 'Upload failed'
//       };
//     }
//   }

//   // Create main BCAT reference transaction
//   private async createMainBCATTransaction(
//     file: File,
//     thumbnail: string,
//     chunkTxIds: string[],
//     metadata: any
//   ): Promise<string> {
//     const privateKey = PrivateKey.fromWif(this.keyData.privateKeyWif) || 
//                       PrivateKey.fromHex(this.keyData.privateKeyHex);
//     const address = privateKey.toPublicKey().toAddress();
//     const pubKeyHash = privateKey.toPublicKey().toHash();
    
//     // Prepare thumbnail
//     const thumbnailData = thumbnail.split(',')[1];
//     const thumbnailBytes = Utils.toArray(thumbnailData, 'base64');
    
//     // Get UTXOs
//     const utxoManager = new UTXOManager(this.keyData.address, this.network, this.whatsOnChainApiKey);
//     const utxos = await utxoManager.fetchUTXOs(true);
    
//     // Calculate fee
//     const opReturnSize = 100 + (chunkTxIds.length * 32);
//     const estimatedTxSize = 300 + thumbnailBytes.length + opReturnSize;
//     const estimatedFee = Math.ceil((estimatedTxSize / 1000) * this.currentFeeRate) + 100;
    
//     const { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee + 546);
    
//     if (selected.length === 0) {
//       throw new Error('Insufficient funds for BCAT main transaction');
//     }
    
//     // Create transaction
//     const tx = new Transaction();
    
//     // Add inputs
//     let totalInput = 0;
//     for (const utxo of selected) {
//       const txid = utxo.tx_hash || utxo.txid;
//       const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//       const satoshis = utxo.value || utxo.satoshis || 0;
      
//       totalInput += satoshis;
      
//       const sourceTransaction = {
//         id: txid,
//         version: 1,
//         inputs: [],
//         outputs: Array(vout + 1).fill(null).map((_, i) => ({
//           satoshis: i === vout ? satoshis : 0,
//           lockingScript: new P2PKH().lock(address)
//         })),
//         lockTime: 0
//       };
      
//       tx.addInput({
//         sourceTXID: txid,
//         sourceOutputIndex: vout,
//         unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//         sourceTransaction
//       });
//     }
    
//     // Add inscription output with thumbnail
//     const inscriptionScript = createInscriptionScript(
//       pubKeyHash,
//       'image/jpeg',
//       thumbnailBytes
//     );
    
//     tx.addOutput({
//       lockingScript: inscriptionScript,
//       satoshis: 1
//     });
    
//     // Add BCAT OP_RETURN
//     const bcatScript = this.createMainBCATScript(file, chunkTxIds, metadata);
//     tx.addOutput({
//       lockingScript: bcatScript,
//       satoshis: 0
//     });
    
//     // Add change
//     const change = totalInput - 1 - estimatedFee;
//     if (change > 546) {
//       tx.addOutput({
//         lockingScript: new P2PKH().lock(address),
//         satoshis: change
//       });
//     }
    
//     // Sign and broadcast
//     await tx.sign();
//     const txHex = tx.toHex();
    
//     const broadcastService = new BroadcastService(this.network);
//     const result = await broadcastService.broadcast(txHex);
    
//     if (!result.success || !result.txid) {
//       throw new Error(`Failed to broadcast BCAT main: ${result.error}`);
//     }
    
//     utxoManager.markAsSpent(selected);
    
//     return result.txid;
//   }

//   // Create main BCAT script
//   private createMainBCATScript(
//     file: File,
//     chunkTxIds: string[],
//     metadata: any
//   ): Script {
//     let scriptHex = '6a'; // OP_RETURN
    
//     // Push namespace
//     const namespaceBytes = Utils.toArray(BCAT_NAMESPACE, 'utf8');
//     scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
//     scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
//     // Info
//     const info = 'BCAT';
//     const infoBytes = Utils.toArray(info, 'utf8');
//     scriptHex += infoBytes.length.toString(16).padStart(2, '0');
//     scriptHex += infoBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
//     // MIME type
//     const mimeType = file.type || 'application/octet-stream';
//     const mimeBytes = Utils.toArray(mimeType, 'utf8');
//     scriptHex += mimeBytes.length.toString(16).padStart(2, '0');
//     scriptHex += mimeBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
//     // Charset - NULL
//     scriptHex += '00';
    
//     // Filename
//     const filename = file.name.substring(0, 50);
//     const filenameBytes = Utils.toArray(filename, 'utf8');
//     scriptHex += filenameBytes.length.toString(16).padStart(2, '0');
//     scriptHex += filenameBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    
//     // Flag - NULL or compression type
//     if (metadata.compression && metadata.compression !== 'none') {
//       const flagBytes = Utils.toArray(metadata.compression, 'utf8');
//       scriptHex += flagBytes.length.toString(16).padStart(2, '0');
//       scriptHex += flagBytes.map(b => b.toString(16).padStart(2, '0')).join('');
//     } else {
//       scriptHex += '00';
//     }
    
//     // Transaction IDs (little-endian)
//     for (const txid of chunkTxIds) {
//       scriptHex += '20'; // Push 32 bytes
//       // Reverse for little-endian
//       for (let i = txid.length - 2; i >= 0; i -= 2) {
//         scriptHex += txid.substr(i, 2);
//       }
//     }
    
//     return Script.fromHex(scriptHex);
//   }

//   // Resume interrupted upload
//   public async resumeUpload(
//     fileHash: string,
//     file: File,
//     onProgress?: (current: number, total: number, phase: string) => void
//   ): Promise<{ success: boolean; txid?: string; error?: string }> {
//     const session = await this.sessionManager.getSession(fileHash);
    
//     if (!session) {
//       return { 
//         success: false, 
//         error: 'No session found for this file' 
//       };
//     }
    
//     if (session.status === 'completed') {
//       return { 
//         success: false, 
//         error: 'This file has already been uploaded' 
//       };
//     }
    
//     console.log(`Resuming upload: ${session.completedChunks}/${session.totalChunks} chunks completed`);
    
//     return this.uploadLargeFile(file, onProgress);
//   }

//   // Get upload sessions
//   public async getUploadSessions(): Promise<UploadSession[]> {
//     return this.sessionManager.getAllSessions();
//   }

//   // Clear completed sessions
//   public async clearCompletedSessions(): Promise<void> {
//     const sessions = await this.sessionManager.getAllSessions();
//     for (const session of sessions) {
//       if (session.status === 'completed') {
//         await this.sessionManager.deleteSession(session.fileHash);
//       }
//     }
//   }
// }
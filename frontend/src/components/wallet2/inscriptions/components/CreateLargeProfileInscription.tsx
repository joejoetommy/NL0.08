import React, { useState } from 'react';
import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import { UTXOManager } from '../../utils/blockchain';
import { BroadcastService } from '../../services/BroadcastService';
import { createInscriptionScript } from '../utils/inscriptionCreator';
import { BCATViewer } from './BCATViewer';  //  broadcastService

interface CreateLargeProfileInscriptionProps {
  keyData: any;
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
  currentFeeRate: number;
  balance: { confirmed: number; unconfirmed: number };
  lastTransactionTime: number;
  setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
  setLastTxid: (txid: string) => void;
  setLastTransactionTime: (time: number) => void;
}

// Chunk upload state interface
interface ChunkUploadState {
  chunkIndex: number;
  chunkData: Uint8Array;
  txid: string | null;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  attempts: number;
  error?: string;
  lastAttemptTime?: number;
}

// BCAT Protocol Constants
const BCAT_NAMESPACE = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up';
const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

export const CreateLargeProfileInscription: React.FC<CreateLargeProfileInscriptionProps> = ({
  keyData,
  network,
  whatsOnChainApiKey,
  currentFeeRate,
  balance,
  lastTransactionTime,
  setStatus,
  setLastTxid,
  setLastTransactionTime
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
  const [largeProfileFile, setLargeProfileFile] = useState<File | null>(null);
  const [largeProfileThumbnail, setLargeProfileThumbnail] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Chunk size configuration
  const [chunkSizeMB, setChunkSizeMB] = useState<number>(2.0);
  const [customChunkSize, setCustomChunkSize] = useState<string>('2.0');
  
  // Chunk management state
  const [chunkStates, setChunkStates] = useState<ChunkUploadState[]>([]);
  const [processingMode, setProcessingMode] = useState<'sequential' | 'manual'>('sequential');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
  
  // Pause/Resume state
  const [isPaused, setIsPaused] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);

  // Helper function to chunk large files
  const chunkFile = (file: File, chunkSizeMB: number): Promise<ArrayBuffer[]> => {
    return new Promise((resolve) => {
      const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024);
      const chunks: ArrayBuffer[] = [];
      const reader = new FileReader();
      let offset = 0;

      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSizeBytes);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        if (e.target?.result) {
          chunks.push(e.target.result as ArrayBuffer);
          offset += chunkSizeBytes;
          
          if (offset < file.size) {
            readNextChunk();
          } else {
            resolve(chunks);
          }
        }
      };

      readNextChunk();
    });
  };

  // Generate thumbnail from large file
  const generateThumbnail = async (file: File): Promise<string> => {
    if (file.type.startsWith('image/')) {
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
            
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    } else {
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
      if (file.type.startsWith('video/')) icon = '🎥';
      else if (file.type.startsWith('audio/')) icon = '🎵';
      else if (file.type.includes('zip') || file.type.includes('archive')) icon = '📦';
      else if (file.type.includes('pdf')) icon = '📕';
      
      ctx.fillText(icon, 100, 90);
      
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '14px Arial';
      const displayName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
      ctx.fillText(displayName, 100, 130);
      ctx.font = '12px Arial';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`${(file.size / (1024 * 1024)).toFixed(1)}MB`, 100, 150);
      
      return canvas.toDataURL('image/png');
    }
  };

  // Handle chunk size change
  const handleChunkSizeChange = (value: string) => {
    setCustomChunkSize(value);
    const size = parseFloat(value);
    if (!isNaN(size) && size > 0 && size <= 10) {
      setChunkSizeMB(size);
      
      // Rechunk the file if already selected
      if (largeProfileFile) {
        rechunkFile(largeProfileFile, size);
      }
    }
  };

  // Rechunk file with new size
  const rechunkFile = async (file: File, newChunkSize: number) => {
    setStatus({ type: 'info', message: 'Rechunking file with new chunk size...' });
    const chunks = await chunkFile(file, newChunkSize);
    const newChunkStates: ChunkUploadState[] = chunks.map((chunk, index) => ({
      chunkIndex: index,
      chunkData: new Uint8Array(chunk),
      txid: null,
      status: 'pending',
      attempts: 0
    }));
    
    setChunkStates(newChunkStates);
    
    setStatus({ 
      type: 'info', 
      message: `File rechunked: ${chunks.length} chunks of ${newChunkSize}MB each.` 
    });
  };

  // Handle large file selection
  const handleLargeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLargeProfileFile(file);
    
    setStatus({ type: 'info', message: 'Generating thumbnail...' });
    const thumbnail = await generateThumbnail(file);
    setLargeProfileThumbnail(thumbnail);
    
    // Chunk the file with current chunk size
    const chunks = await chunkFile(file, chunkSizeMB);
    const initialChunkStates: ChunkUploadState[] = chunks.map((chunk, index) => ({
      chunkIndex: index,
      chunkData: new Uint8Array(chunk),
      txid: null,
      status: 'pending',
      attempts: 0
    }));
    
    setChunkStates(initialChunkStates);
    
    setStatus({ 
      type: 'info', 
      message: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Split into ${chunks.length} chunks of ${chunkSizeMB}MB each.` 
    });
  };

  // Upload a single chunk with improved timeout and retry logic
  const uploadSingleChunk = async (chunkIndex: number, forceNewUTXOs: boolean = false): Promise<{ success: boolean; txid?: string; error?: string }> => {
    const chunkState = chunkStates[chunkIndex];
    if (!chunkState) {
      return { success: false, error: 'Chunk not found' };
    }

    // Check if already completed
    if (chunkState.status === 'success' && chunkState.txid) {
      console.log(`Chunk ${chunkIndex + 1} already completed with txid: ${chunkState.txid}`);
      return { success: true, txid: chunkState.txid };
    }

    // Create broadcast service with shorter timeout (10 seconds instead of 30)
    const broadcastService = new BroadcastService(network, (message: string) => {
      setStatus({ 
        type: 'info', 
        message: `Chunk ${chunkIndex + 1}: ${message}` 
      });
    }, 10000); // 10 second timeout
    
    const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
    const address = privateKey.toPublicKey().toAddress();
    
    try {
      // Update state to uploading ONLY for this specific chunk
      setChunkStates(prevStates => {
        const newStates = [...prevStates];
        newStates[chunkIndex] = { 
          ...newStates[chunkIndex], 
          status: 'uploading',
          attempts: newStates[chunkIndex].attempts + 1,
          lastAttemptTime: Date.now()
        };
        return newStates;
      });

      // Force fresh UTXO fetch if requested or after mempool conflict
      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      
      // Add delay if we're forcing new UTXOs (after a conflict)
      if (forceNewUTXOs) {
        console.log(`Waiting 5 seconds before fetching new UTXOs for chunk ${chunkIndex + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      const utxos = await utxoManager.fetchUTXOs(true);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available');
      }
      
      const chunkData = chunkState.chunkData;
      const estimatedFee = Math.ceil((300 + chunkData.length) / 1000) * currentFeeRate;
      const { selected, total } = utxoManager.selectUTXOs(estimatedFee);
      
      if (selected.length === 0) {
        throw new Error(`Insufficient funds. Need ${estimatedFee} sats`);
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
          outputs: [],
          lockTime: 0
        };
        
        for (let i = 0; i <= vout; i++) {
          sourceTransaction.outputs[i] = {
            satoshis: i === vout ? satoshis : 0,
            lockingScript: new P2PKH().lock(address)
          };
        }
        
        tx.addInput({
          sourceTXID: txid,
          sourceOutputIndex: vout,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
          sourceTransaction: sourceTransaction
        });
      }
      
      // Create OP_RETURN with BCAT part namespace and data
      let scriptHex = '6a'; // OP_RETURN
      
      // Push BCAT part namespace
      const namespaceBytes = Utils.toArray(BCAT_PART_NAMESPACE, 'utf8');
      if (namespaceBytes.length <= 75) {
        scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
      } else {
        scriptHex += '4c';
        scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
      }
      scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Push chunk data with proper opcodes
      const dataLength = chunkData.length;
      if (dataLength <= 75) {
        scriptHex += dataLength.toString(16).padStart(2, '0');
      } else if (dataLength <= 255) {
        scriptHex += '4c';
        scriptHex += dataLength.toString(16).padStart(2, '0');
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
      
      // Add data in smaller batches
      const BATCH_SIZE = 10000;
      for (let j = 0; j < chunkData.length; j += BATCH_SIZE) {
        const batch = chunkData.slice(j, Math.min(j + BATCH_SIZE, chunkData.length));
        scriptHex += Array.from(batch).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      
      const script = Script.fromHex(scriptHex);
      
      tx.addOutput({
        lockingScript: script,
        satoshis: 0
      });
      
      // Add change output
      const change = totalInput - estimatedFee;
      if (change > 0) {
        tx.addOutput({
          lockingScript: new P2PKH().lock(address),
          satoshis: change
        });
      }
      
      await tx.sign();
      const txHex = tx.toHex();
      const result = await broadcastService.broadcast(txHex);
      
      if (result.success && result.txid) {
        utxoManager.markAsSpent(selected);
        
        // Update ONLY this chunk's state to success
        setChunkStates(prevStates => {
          const newStates = [...prevStates];
          newStates[chunkIndex] = { 
            ...newStates[chunkIndex], 
            status: 'success', 
            txid: result.txid,
            error: undefined
          };
          return newStates;
        });
        
        console.log(`✅ Chunk ${chunkIndex + 1} successfully uploaded: ${result.txid}`);
        return { success: true, txid: result.txid };
      } else {
        throw new Error(result.error || 'Broadcast failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a mempool conflict
      const isMempoolConflict = errorMessage.includes('txn-mempool-conflict');
      
      // Update ONLY this chunk's state to failed
      setChunkStates(prevStates => {
        const newStates = [...prevStates];
        newStates[chunkIndex] = { 
          ...newStates[chunkIndex], 
          status: 'failed', 
          error: errorMessage
        };
        return newStates;
      });
      
      console.error(`❌ Chunk ${chunkIndex + 1} failed: ${errorMessage}`);
      
      // If it's a mempool conflict and we haven't tried with fresh UTXOs yet, retry automatically
      if (isMempoolConflict && !forceNewUTXOs && chunkState.attempts < 3) {
        console.log(`Mempool conflict detected for chunk ${chunkIndex + 1}, retrying with fresh UTXOs...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return uploadSingleChunk(chunkIndex, true);
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  // Upload a specific chunk (manual mode)
  const uploadChunk = async (chunkIndex: number) => {
    // Get current state of the specific chunk
    const currentChunkState = chunkStates[chunkIndex];
    
    if (!currentChunkState) {
      setStatus({ type: 'error', message: `Chunk ${chunkIndex + 1} not found` });
      return;
    }
    
    if (currentChunkState.status === 'uploading') {
      setStatus({ type: 'error', message: `Chunk ${chunkIndex + 1} is already uploading` });
      return;
    }
    
    if (currentChunkState.status === 'success' && currentChunkState.txid) {
      setStatus({ type: 'info', message: `Chunk ${chunkIndex + 1} already completed: ${currentChunkState.txid}` });
      return;
    }

    setCurrentProcessingIndex(chunkIndex);
    
    setStatus({ 
      type: 'info', 
      message: `Starting upload for chunk ${chunkIndex + 1} of ${chunkStates.length}...` 
    });
    
    const result = await uploadSingleChunk(chunkIndex, false);
    
    if (result.success && result.txid) {
      setStatus({ 
        type: 'success', 
        message: `Chunk ${chunkIndex + 1} uploaded successfully! TXID: ${result.txid.substring(0, 8)}...` 
      });
      
      // Check if all chunks are complete using the latest state
      setChunkStates(prevStates => {
        checkAllChunksComplete(prevStates);
        return prevStates;
      });
    } else {
      setStatus({ 
        type: 'error', 
        message: `Chunk ${chunkIndex + 1} failed: ${result.error}` 
      });
    }
    
    setCurrentProcessingIndex(null);
  };

  // Process chunks sequentially with pause/resume support
  const processChunksSequentially = async () => {
    setIsProcessing(true);
    setShouldStop(false);
    setIsPaused(false);
    
    for (let i = 0; i < chunkStates.length; i++) {
      // Check if we should stop
      if (shouldStop) {
        console.log('Sequential processing stopped by user');
        break;
      }
      
      // Wait while paused
      while (isPaused && !shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Check again after pause
      if (shouldStop) {
        console.log('Sequential processing stopped by user after pause');
        break;
      }
      
      // Get fresh state for this chunk
      const currentState = chunkStates[i];
      
      // Skip already successful chunks
      if (currentState.status === 'success' && currentState.txid) {
        console.log(`Skipping chunk ${i + 1} - already completed: ${currentState.txid}`);
        continue;
      }
      
      setCurrentProcessingIndex(i);
      
      // Upload this chunk
      const result = await uploadSingleChunk(i, false);
      
      if (!result.success) {
        console.error(`Failed to upload chunk ${i + 1}: ${result.error}`);
        
        // Check if we should auto-retry based on error type
        const shouldAutoRetry = result.error?.includes('timeout') || 
                               result.error?.includes('txn-mempool-conflict');
        
        if (shouldAutoRetry && currentState.attempts < 3) {
          console.log(`Auto-retrying chunk ${i + 1} after failure...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          const retryResult = await uploadSingleChunk(i, true);
          if (!retryResult.success) {
            // Skip to next chunk after retry failure
            continue;
          }
        }
      }
      
      // Wait between chunks to avoid conflicts
      if (i < chunkStates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    setIsProcessing(false);
    setCurrentProcessingIndex(null);
    setShouldStop(false);
    setIsPaused(false);
    
    // Final check of all chunks
    const finalStates = chunkStates;
    checkAllChunksComplete(finalStates);
  };

  // Stop processing
  const stopProcessing = () => {
    setShouldStop(true);
    setIsPaused(false);
    setStatus({ type: 'info', message: 'Stopping chunk upload process...' });
  };

  // Pause processing
  const pauseProcessing = () => {
    setIsPaused(true);
    setStatus({ type: 'info', message: 'Paused chunk upload process' });
  };

  // Resume processing
  const resumeProcessing = () => {
    setIsPaused(false);
    setStatus({ type: 'info', message: 'Resumed chunk upload process' });
  };

  // Check if all chunks are complete
  const checkAllChunksComplete = (states: ChunkUploadState[]) => {
    const allSuccess = states.every(state => state.status === 'success' && state.txid);
    if (allSuccess) {
      setStatus({ 
        type: 'success', 
        message: '✅ All chunks uploaded successfully! You can now create the BCAT reference transaction.' 
      });
    }
  };

  // Get all chunks complete status
  const getAllChunksComplete = () => {
    return chunkStates.length > 0 && 
           chunkStates.every(state => state.status === 'success' && state.txid);
  };

  // Create main BCAT transaction
  const createLargeProfileOrdinal = async () => {
    if (!largeProfileFile || !largeProfileThumbnail || !keyData.privateKey) {
      setStatus({ type: 'error', message: 'Missing required data' });
      return;
    }

    // Check if all chunks are uploaded (in order)
    const successfulChunks = chunkStates.filter(state => state.status === 'success' && state.txid);
    if (successfulChunks.length !== chunkStates.length) {
      setStatus({ 
        type: 'error', 
        message: `Not all chunks uploaded. ${successfulChunks.length} of ${chunkStates.length} chunks complete.` 
      });
      return;
    }

    const timeSinceLastTx = Date.now() - lastTransactionTime;
    if (timeSinceLastTx < 5000) {
      setStatus({ 
        type: 'error', 
        message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another inscription`
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Get chunk transaction IDs IN ORDER
      const chunkTxIds = chunkStates
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map(state => state.txid!);
      
      setStatus({ type: 'info', message: 'Waiting for chunks to propagate...' });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setStatus({ type: 'info', message: 'Creating BCAT reference transaction...' });
      
      // Prepare thumbnail
      const thumbnailData = largeProfileThumbnail.split(',')[1];
      const thumbnailBytes = Utils.toArray(thumbnailData, 'base64');
      
      // Get UTXOs
      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs(true);
      
      console.log(`Available UTXOs for BCAT main TX: ${utxos.length}`);
      
      // Calculate fee
      const opReturnSize = 1 + 1 + 35 + 
                          1 + 10 + 
                          1 + (largeProfileFile.type?.length || 24) + 
                          1 + 
                          1 + Math.min(largeProfileFile.name.length, 50) + 
                          1 + 
                          (chunkTxIds.length * 33);
      
      const estimatedTxSize = 300 + thumbnailBytes.length + opReturnSize;
      const estimatedFee = Math.ceil((estimatedTxSize / 1000) * currentFeeRate) + 100;
      
      console.log(`BCAT main TX estimated size: ${estimatedTxSize} bytes, fee: ${estimatedFee} sats`);
      
      // Select UTXOs
      const { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee + 546);
      
      if (selected.length === 0) {
        throw new Error(`Insufficient funds. Need ${1 + estimatedFee + 546} sats, have ${total} sats`);
      }
      
      const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
      const pubKeyHash = privateKey.toPublicKey().toHash();
      const address = privateKey.toPublicKey().toAddress();
      
      // Create inscription with thumbnail
      const inscriptionScript = createInscriptionScript(
        pubKeyHash,
        'image/jpeg',
        thumbnailBytes
      );
      
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
          outputs: [],
          lockTime: 0
        };
        
        for (let i = 0; i <= vout; i++) {
          sourceTransaction.outputs[i] = sourceTransaction.outputs[i] || {
            satoshis: i === vout ? satoshis : 0,
            lockingScript: new P2PKH().lock(address)
          };
        }
        
        tx.addInput({
          sourceTXID: txid,
          sourceOutputIndex: vout,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
          sourceTransaction: sourceTransaction
        });
      }
      
      console.log(`BCAT main TX total input: ${totalInput} sats from ${selected.length} UTXOs`);
      
      // Output 1: Inscription with thumbnail
      tx.addOutput({
        lockingScript: inscriptionScript,
        satoshis: 1
      });
      
      // Output 2: BCAT reference in OP_RETURN
      let scriptHex = '6a'; // OP_RETURN
      
      // Push BCAT namespace
      const namespaceBytes = Utils.toArray(BCAT_NAMESPACE, 'utf8');
      scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
      scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Info string
      const info = 'BCAT';
      const infoBytes = Utils.toArray(info, 'utf8');
      scriptHex += infoBytes.length.toString(16).padStart(2, '0');
      scriptHex += infoBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // MIME type
      const mimeType = largeProfileFile.type || 'application/octet-stream';
      const mimeBytes = Utils.toArray(mimeType.substring(0, 128), 'utf8');
      scriptHex += mimeBytes.length.toString(16).padStart(2, '0');
      scriptHex += mimeBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Charset - NULL
      scriptHex += '00';
      
      // Filename
      const filename = largeProfileFile.name.substring(0, 50);
      const filenameBytes = Utils.toArray(filename, 'utf8');
      scriptHex += filenameBytes.length.toString(16).padStart(2, '0');
      scriptHex += filenameBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Flag - NULL
      scriptHex += '00';
      
      // Transaction IDs in order (little-endian)
      for (const txid of chunkTxIds) {
        scriptHex += '20'; // Push 32 bytes
        for (let i = txid.length - 2; i >= 0; i -= 2) {
          scriptHex += txid.substr(i, 2);
        }
      }
      
      console.log(`BCAT OP_RETURN script size: ${scriptHex.length / 2} bytes`);
      
      const bcatScript = Script.fromHex(scriptHex);
      
      tx.addOutput({
        lockingScript: bcatScript,
        satoshis: 0
      });
      
      // Output 3: Change
      const change = totalInput - 1 - estimatedFee;
      console.log(`Change amount: ${change} sats`);
      
      if (change > 546) {
        tx.addOutput({
          lockingScript: new P2PKH().lock(address),
          satoshis: change
        });
      } else if (change < 0) {
        throw new Error(`Insufficient funds. Need ${Math.abs(change)} more satoshis`);
      }
      
      // Sign transaction
      await tx.sign();
      const txHex = tx.toHex();
      const actualSize = txHex.length / 2;
      
      console.log(`BCAT main TX final size: ${actualSize} bytes`);
      
      if (actualSize > 100000) {
        throw new Error(`Transaction too large: ${actualSize} bytes. Maximum is 100KB`);
      }
      
      // Broadcast with real-time status updates
      const broadcastService = new BroadcastService(network, (message: string) => {
        setStatus({ 
          type: 'info', 
          message: `BCAT Reference TX: ${message}` 
        });
      });
      const result = await broadcastService.broadcast(txHex);
      
      if (result.success) {
        setLastTxid(result.txid!);
        setLastTransactionTime(Date.now());
        setStatus({ 
          type: 'success', 
          message: `BCAT file created successfully!\nMain TX: ${result.txid}\nChunks: ${chunkTxIds.length}\n\nYour file "${filename}" can now be reconstructed using the BCAT viewer.` 
        });
        
        console.log(`BCAT created successfully! Main TX: ${result.txid}`);
        
        // Clear form
        setLargeProfileFile(null);
        setLargeProfileThumbnail('');
        setChunkStates([]);
      } else {
        throw new Error(result.error || 'Failed to broadcast BCAT transaction');
      }
      
    } catch (error) {
      console.error('Error creating BCAT inscription:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create BCAT inscription' 
      });
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !keyData.privateKey || !largeProfileFile || 
    (Date.now() - lastTransactionTime < 5000) || balance.confirmed < 5000;

  const allChunksComplete = getAllChunksComplete();

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
          📤 Create BCAT
        </button>
        <button
          onClick={() => setActiveTab('view')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'view'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          📦 View & Reconstruct
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'create' ? (
        <>
          <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
            <p className="text-sm text-yellow-300">
              📦 BCAT Protocol - Store large files across multiple transactions
            </p>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-yellow-200">Chunk size:</label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={customChunkSize}
                onChange={(e) => handleChunkSizeChange(e.target.value)}
                className="px-2 py-1 w-20 bg-gray-800 border border-gray-600 rounded text-white text-xs"
                disabled={isProcessing}
              />
              <span className="text-xs text-yellow-200">MB per chunk</span>
              <button
                onClick={() => handleChunkSizeChange('2.0')}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
              >
                Reset to 2MB
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Upload Large File</label>
            <input
              type="file"
              onChange={handleLargeFileSelect}
              className="hidden"
              id="large-file-upload"
              disabled={isProcessing || loading}
            />
            <label
              htmlFor="large-file-upload"
              className={`block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors ${
                (isProcessing || loading) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {largeProfileFile ? (
                <div className="text-center">
                  {largeProfileThumbnail && (
                    <img 
                      src={largeProfileThumbnail} 
                      alt="Thumbnail" 
                      className="w-32 h-32 mx-auto rounded mb-3 object-cover"
                    />
                  )}
                  <p className="text-sm font-medium text-white">{largeProfileFile.name}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Size: {(largeProfileFile.size / (1024 * 1024)).toFixed(2)}MB
                  </p>
                  <p className="text-xs text-purple-400 mt-2">
                    {chunkStates.length} chunks of {chunkSizeMB}MB each
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-400">Drop large file here or click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">Uses official BCAT protocol</p>
                </div>
              )}
            </label>
          </div>

          {/* Upload Mode Selection */}
          {chunkStates.length > 0 && (
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-300">Upload Mode:</span>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="sequential"
                    checked={processingMode === 'sequential'}
                    onChange={(e) => setProcessingMode('sequential')}
                    disabled={isProcessing}
                  />
                  <span className="text-sm text-gray-300">Sequential (Auto)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="manual"
                    checked={processingMode === 'manual'}
                    onChange={(e) => setProcessingMode('manual')}
                    disabled={isProcessing}
                  />
                  <span className="text-sm text-gray-300">Manual (Individual Control)</span>
                </label>
              </div>
            </div>
          )}

          {/* Chunk Upload Status */}
          {chunkStates.length > 0 && (
            <div className="p-4 bg-gray-800 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-300">
                  Chunk Upload Status 
                  ({chunkStates.filter(s => s.status === 'success').length}/{chunkStates.length} complete)
                </h4>
                <div className="flex gap-2">
                  {processingMode === 'sequential' && !allChunksComplete && (
                    <>
                      {!isProcessing ? (
                        <button
                          onClick={processChunksSequentially}
                          className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded flex items-center gap-1"
                        >
                          ▶️ Start Upload
                        </button>
                      ) : (
                        <>
                          {!isPaused ? (
                            <>
                              <button
                                onClick={pauseProcessing}
                                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded flex items-center gap-1"
                              >
                                ⏸️ Pause
                              </button>
                              <button
                                onClick={stopProcessing}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded flex items-center gap-1"
                              >
                                ⏹️ Stop
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={resumeProcessing}
                                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded flex items-center gap-1"
                              >
                                ▶️ Resume
                              </button>
                              <button
                                onClick={stopProcessing}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded flex items-center gap-1"
                              >
                                ⏹️ Stop
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                  {allChunksComplete && (
                    <span className="px-3 py-1 bg-green-500 text-white text-sm rounded">
                      ✅ All Complete
                    </span>
                  )}
                </div>
              </div>
              
              {/* Progress bar */}
              {isProcessing && currentProcessingIndex !== null && (
                <div>
                  <p className="text-sm text-gray-300 mb-2">
                    {isPaused ? '⏸️ Paused at' : 'Uploading'} chunk {currentProcessingIndex + 1} of {chunkStates.length}
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${((currentProcessingIndex + 1) / chunkStates.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Chunk list */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {chunkStates.map((state) => (
                  <div 
                    key={state.chunkIndex} 
                    className={`flex items-center justify-between text-xs p-2 rounded ${
                      state.status === 'success' ? 'bg-green-900 bg-opacity-30' :
                      state.status === 'failed' ? 'bg-red-900 bg-opacity-30' :
                      state.status === 'uploading' ? 'bg-blue-900 bg-opacity-30' :
                      'bg-gray-700'
                    }`}
                  >
                    <span className="text-gray-300 font-medium">
                      Chunk {state.chunkIndex + 1}
                      {state.attempts > 0 && ` (Attempts: ${state.attempts})`}
                    </span>
                    <div className="flex items-center gap-2">
                      {state.status === 'success' && state.txid && (
                        <a 
                          href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${state.txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300"
                        >
                          ✓ {state.txid.substring(0, 8)}...
                        </a>
                      )}
                      {state.status === 'failed' && (
                        <>
                          <span className="text-red-400" title={state.error}>
                            ✗ {state.error?.includes('timeout') ? 'Timeout' : 
                                state.error?.includes('mempool') ? 'Conflict' : 'Failed'}
                          </span>
                          <button
                            onClick={() => uploadChunk(state.chunkIndex)}
                            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded"
                            disabled={isProcessing}
                          >
                            Retry
                          </button>
                        </>
                      )}
                      {state.status === 'uploading' && (
                        <span className="text-blue-400">⟳ Uploading...</span>
                      )}
                      {state.status === 'pending' && (
                        <>
                          <span className="text-gray-400">⏸ Pending</span>
                          {processingMode === 'manual' && (
                            <button
                              onClick={() => uploadChunk(state.chunkIndex)}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                              disabled={isProcessing}
                            >
                              Upload
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Show last error */}
              {chunkStates.find(s => s.status === 'failed')?.error && (
                <p className="text-xs text-red-400 mt-1">
                  Last error: {chunkStates.find(s => s.status === 'failed')?.error}
                </p>
              )}
            </div>
          )}

          {/* Create BCAT button */}
          {chunkStates.length > 0 && allChunksComplete && (
            <div className="space-y-3">
              <div className="p-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-700">
                <p className="text-sm text-green-300">
                  ✅ All {chunkStates.length} chunks uploaded successfully!
                </p>
                <p className="text-xs text-green-200 mt-1">
                  Chunks will be assembled in order: {chunkStates.map(s => `#${s.chunkIndex + 1}`).join(', ')}
                </p>
              </div>
              
              <button
                onClick={createLargeProfileOrdinal}
                disabled={loading || (Date.now() - lastTransactionTime < 5000)}
                className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
              >
                {loading ? 'Creating BCAT Reference Transaction...' : 
                 (Date.now() - lastTransactionTime < 5000) ? 
                  `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
                  '🚀 Create BCAT Reference Transaction'}
              </button>
            </div>
          )}

          <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
            <h4 className="text-sm font-medium text-blue-300 mb-1">BCAT Features:</h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Configurable chunk size (0.1 - 10MB)</li>
              <li>• Sequential or manual upload modes</li>
              <li>• Pause/Resume/Stop controls for sequential mode</li>
              <li>• Auto-retry on timeout and mempool conflicts</li>
              <li>• Individual chunk control and retry</li>
              <li>• 10-second timeout for faster failure detection</li>
              <li>• Chunks always assembled in correct order</li>
            </ul>
          </div>

          {/* Balance warning */}
          {largeProfileFile && balance.confirmed < 10000 && (
            <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
              <p className="text-xs text-red-300">
                ⚠️ Large files require multiple transactions. Ensure sufficient balance.
                Current: {balance.confirmed} sats. Recommended: 10,000+ sats.
              </p>
            </div>
          )}
        </>
      ) : (
        <BCATViewer
          keyData={keyData}
          network={network}
          whatsOnChainApiKey={whatsOnChainApiKey}
        />
      )}
    </div>
  );
};





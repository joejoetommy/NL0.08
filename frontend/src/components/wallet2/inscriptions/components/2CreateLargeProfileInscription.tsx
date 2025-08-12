import React, { useState } from 'react';
import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import { UTXOManager } from '../../utils/blockchain';
import { BroadcastService } from '../../services/BroadcastService';
import { createInscriptionScript } from '../utils/inscriptionCreator';
import { BCATViewer } from './BCATViewer';

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

// CHUNK SIZE CONFIGURATION
// Testing with 100KB to find the actual API limit
// Current: 100KB = 100 * 1024 bytes
const CHUNK_SIZE_KB = 100;
const CHUNK_SIZE_BYTES = CHUNK_SIZE_KB * 1024;

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
  const [uploadingChunks, setUploadingChunks] = useState(false);
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
  const [bcatTransactionIds, setBcatTransactionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper function to chunk large files
  const chunkFile = (file: File, chunkSize: number = CHUNK_SIZE_BYTES): Promise<ArrayBuffer[]> => {
    return new Promise((resolve) => {
      const chunks: ArrayBuffer[] = [];
      const reader = new FileReader();
      let offset = 0;

      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        if (e.target?.result) {
          chunks.push(e.target.result as ArrayBuffer);
          offset += chunkSize;
          
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

  // Handle large file selection
  const handleLargeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLargeProfileFile(file);
    
    setStatus({ type: 'info', message: 'Generating thumbnail...' });
    const thumbnail = await generateThumbnail(file);
    setLargeProfileThumbnail(thumbnail);
    
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);
    
    setStatus({ 
      type: 'info', 
      message: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Will be split into ${totalChunks} chunks of ${CHUNK_SIZE_MB}MB each.` 
    });
  };

  // Create BCAT part transactions according to protocol
  const createBCATTransactions = async (): Promise<string[]> => {
    if (!largeProfileFile || !keyData.privateKey) {
      throw new Error('Missing file or private key');
    }

    setUploadingChunks(true);
    const txids: string[] = [];
    const broadcastService = new BroadcastService(network);
    
    try {
      const chunks = await chunkFile(largeProfileFile);
      setChunkProgress({ current: 0, total: chunks.length });
      
      const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
      const address = privateKey.toPublicKey().toAddress();
      
      for (let i = 0; i < chunks.length; i++) {
        setChunkProgress({ current: i + 1, total: chunks.length });
        setStatus({ 
          type: 'info', 
          message: `Uploading chunk ${i + 1} of ${chunks.length} (${CHUNK_SIZE_KB}KB each)...` 
        });
        
        const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
        const utxos = await utxoManager.fetchUTXOs(true);
        
        if (utxos.length === 0) {
          throw new Error('No UTXOs available');
        }
        
        const chunkData = new Uint8Array(chunks[i]);
        
        // Build BCAT part transaction according to protocol
        const estimatedFee = Math.ceil((300 + chunkData.length) / 1000) * currentFeeRate;
        const { selected, total } = utxoManager.selectUTXOs(estimatedFee);
        
        if (selected.length === 0) {
          throw new Error(`Insufficient funds for chunk ${i + 1}.`);
        }
        
        const tx = new Transaction();
        
        // Add inputs
        let totalInput = 0;
        for (const utxo of selected) {
          const txid = utxo.tx_hash || utxo.txid;
          const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
          const satoshis = utxo.value || utxo.satoshis || 0;
          
          totalInput += satoshis;
          
          // Create source transaction with proper output array
          const sourceTransaction = {
            id: txid,
            version: 1,
            inputs: [],
            outputs: [],
            lockTime: 0
          };
          
          // Ensure the outputs array has enough elements
          for (let i = 0; i <= vout; i++) {
            sourceTransaction.outputs[i] = {
              satoshis: i === vout ? satoshis : 0,
              lockingScript: new P2PKH().lock(address)
            };
          }
          
          console.log(`Adding input: ${txid}:${vout} with ${satoshis} sats`);
          
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
          scriptHex += '4c'; // OP_PUSHDATA1
          scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
        }
        scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Push chunk data with proper opcodes
        const dataLength = chunkData.length;
        if (dataLength <= 75) {
          scriptHex += dataLength.toString(16).padStart(2, '0');
        } else if (dataLength <= 255) {
          scriptHex += '4c'; // OP_PUSHDATA1
          scriptHex += dataLength.toString(16).padStart(2, '0');
        } else if (dataLength <= 65535) {
          scriptHex += '4d'; // OP_PUSHDATA2
          scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
          scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
        } else {
          scriptHex += '4e'; // OP_PUSHDATA4
          scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
          scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
          scriptHex += ((dataLength >> 16) & 0xff).toString(16).padStart(2, '0');
          scriptHex += ((dataLength >> 24) & 0xff).toString(16).padStart(2, '0');
        }
        
        // Add data in smaller batches to avoid memory issues
        const BATCH_SIZE = 10000;
        for (let j = 0; j < chunkData.length; j += BATCH_SIZE) {
          const batch = chunkData.slice(j, Math.min(j + BATCH_SIZE, chunkData.length));
          scriptHex += Array.from(batch).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        
        const script = Script.fromHex(scriptHex);
        
        // Add OP_RETURN output
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
        
        if (!result.success || !result.txid) {
          throw new Error(`Failed to broadcast chunk ${i + 1}: ${result.error}`);
        }
        
        txids.push(result.txid);
        utxoManager.markAsSpent(selected);
        
        // Wait between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return txids;
      
    } finally {
      setUploadingChunks(false);
    }
  };

  // Create main BCAT transaction according to protocol
  const createLargeProfileOrdinal = async () => {
    if (!largeProfileFile || !largeProfileThumbnail || !keyData.privateKey) {
      setStatus({ type: 'error', message: 'Missing required data' });
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
      // Upload chunks
      setStatus({ type: 'info', message: 'Uploading file chunks...' });
      const chunkTxIds = await createBCATTransactions();
      setBcatTransactionIds(chunkTxIds);
      
      // Wait longer to ensure chunks are confirmed
      setStatus({ type: 'info', message: 'Waiting for chunks to propagate...' });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setStatus({ type: 'info', message: 'Creating BCAT reference transaction...' });
      
      // Prepare thumbnail - make it smaller to reduce transaction size
      const thumbnailData = largeProfileThumbnail.split(',')[1];
      const thumbnailBytes = Utils.toArray(thumbnailData, 'base64');
      
      // Force refresh UTXOs after chunk transactions
      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs(true);
      
      console.log(`Available UTXOs for BCAT main TX: ${utxos.length}`);
      
      // Sort UTXOs by vout to prefer lower indices
      const sortedUtxos = [...utxos].sort((a, b) => {
        const voutA = a.tx_pos !== undefined ? a.tx_pos : (a.vout || 0);
        const voutB = b.tx_pos !== undefined ? b.tx_pos : (b.vout || 0);
        return voutA - voutB;
      });
      
      // Calculate fee more accurately
      // Base size + inscription size + OP_RETURN size
      const opReturnSize = 1 + 1 + 35 + // OP_RETURN + push + namespace
                          1 + 10 + // info (shortened)
                          1 + (largeProfileFile.type?.length || 24) + // mime
                          1 + // charset null
                          1 + Math.min(largeProfileFile.name.length, 50) + // filename (limited)
                          1 + // flag null
                          (chunkTxIds.length * 33); // txids
      
      const estimatedTxSize = 300 + thumbnailBytes.length + opReturnSize;
      const estimatedFee = Math.ceil((estimatedTxSize / 1000) * currentFeeRate) + 100; // Add buffer
      
      console.log(`BCAT main TX estimated size: ${estimatedTxSize} bytes, fee: ${estimatedFee} sats`);
      
      // Select UTXOs manually from sorted list
      const selected: any[] = [];
      let totalSelected = 0;
      const targetAmount = 1 + estimatedFee + 546; // inscription + fee + dust
      
      for (const utxo of sortedUtxos) {
        if (totalSelected >= targetAmount) break;
        const satoshis = utxo.value || utxo.satoshis || 0;
        if (satoshis > 0) {
          selected.push(utxo);
          totalSelected += satoshis;
        }
      }
      
      if (totalSelected < targetAmount) {
        throw new Error(`Insufficient funds for BCAT transaction. Need ${targetAmount} sats, have ${totalSelected} sats`);
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
      
      // Add inputs with proper source transactions
      let totalInput = 0;
      for (const utxo of selected) {
        const txid = utxo.tx_hash || utxo.txid;
        const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
        const satoshis = utxo.value || utxo.satoshis || 0;
        
        totalInput += satoshis;
        
        // Create proper source transaction structure
        const sourceTransaction = {
          id: txid,
          version: 1,
          inputs: [],
          outputs: [],
          lockTime: 0
        };
        
        // Ensure outputs array has enough elements
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
      
      // Output 1: Inscription with thumbnail (1 sat)
      tx.addOutput({
        lockingScript: inscriptionScript,
        satoshis: 1
      });
      
      // Output 2: BCAT reference in OP_RETURN
      // Build the script manually to ensure correct format
      let scriptHex = '6a'; // OP_RETURN
      
      // Push BCAT namespace
      const namespaceBytes = Utils.toArray(BCAT_NAMESPACE, 'utf8');
      scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
      scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // 1. Info string (shortened to reduce size)
      const info = 'BCAT';
      const infoBytes = Utils.toArray(info, 'utf8');
      scriptHex += infoBytes.length.toString(16).padStart(2, '0');
      scriptHex += infoBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // 2. MIME type
      const mimeType = largeProfileFile.type || 'application/octet-stream';
      const mimeBytes = Utils.toArray(mimeType.substring(0, 128), 'utf8');
      scriptHex += mimeBytes.length.toString(16).padStart(2, '0');
      scriptHex += mimeBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // 3. Charset - NULL
      scriptHex += '00';
      
      // 4. Filename (limited to 50 chars to save space)
      const filename = largeProfileFile.name.substring(0, 50);
      const filenameBytes = Utils.toArray(filename, 'utf8');
      scriptHex += filenameBytes.length.toString(16).padStart(2, '0');
      scriptHex += filenameBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // 5. Flag - NULL
      scriptHex += '00';
      
      // 6+. Transaction IDs (32 bytes each, little-endian)
      for (const txid of chunkTxIds) {
        scriptHex += '20'; // Push 32 bytes
        // Reverse the txid for little-endian
        for (let i = txid.length - 2; i >= 0; i -= 2) {
          scriptHex += txid.substr(i, 2);
        }
      }
      
      console.log(`BCAT OP_RETURN script size: ${scriptHex.length / 2} bytes`);
      
      // Create script from hex
      const bcatScript = Script.fromHex(scriptHex);
      
      tx.addOutput({
        lockingScript: bcatScript,
        satoshis: 0
      });
      
      // Output 3: Change
      const change = totalInput - 1 - estimatedFee;
      console.log(`Change amount: ${change} sats`);
      
      if (change > 546) { // Only add change if above dust limit
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
      
      console.log(`BCAT main TX final size: ${actualSize} bytes, hex length: ${txHex.length}`);
      
      if (actualSize > 100000) { // 100KB limit
        throw new Error(`Transaction too large: ${actualSize} bytes. Maximum is 100KB`);
      }
      
      // Broadcast
      const broadcastService = new BroadcastService(network);
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
        setBcatTransactionIds([]);
      } else {
        console.error('Broadcast failed:', result.error);
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

  const isDisabled = loading || !keyData.privateKey || !largeProfileFile || uploadingChunks ||
    (Date.now() - lastTransactionTime < 5000) || balance.confirmed < 5000;

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
            <p className="text-xs text-yellow-200 mt-1">
              Chunk size: {CHUNK_SIZE_KB}KB per chunk (Testing API limits)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Upload Large File</label>
            <input
              type="file"
              onChange={handleLargeFileSelect}
              className="hidden"
              id="large-file-upload"
              disabled={uploadingChunks || loading}
            />
            <label
              htmlFor="large-file-upload"
              className={`block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors ${
                (uploadingChunks || loading) ? 'opacity-50 cursor-not-allowed' : ''
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
                    Will be split into {Math.ceil(largeProfileFile.size / CHUNK_SIZE_BYTES)} chunks
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

          {/* Progress indicator */}
          {uploadingChunks && chunkProgress.total > 0 && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-300 mb-2">
                Uploading chunk {chunkProgress.current} of {chunkProgress.total}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* BCAT transaction list */}
          {bcatTransactionIds.length > 0 && (
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-300 mb-2">BCAT Chunk Transactions:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {bcatTransactionIds.map((txid, index) => (
                  <div key={txid} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Chunk {index + 1}:</span>
                    <a 
                      href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-mono"
                    >
                      {txid.substring(0, 16)}...
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={createLargeProfileOrdinal}
            disabled={isDisabled}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating BCAT Transaction...' : 
             uploadingChunks ? `Uploading Chunks (${chunkProgress.current}/${chunkProgress.total})...` :
             (Date.now() - lastTransactionTime < 5000) ? 
              `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
              'Create BCAT File'}
          </button>

          <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
            <h4 className="text-sm font-medium text-blue-300 mb-1">How BCAT Works:</h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Large files are split into {CHUNK_SIZE_KB}KB chunks</li>
              <li>• Each chunk is stored in a separate transaction</li>
              <li>• Main inscription contains thumbnail + BCAT references</li>
              <li>• Files can be reassembled using the transaction IDs</li>
              <li>• Testing with {CHUNK_SIZE_KB}KB to find API retrieval limits</li>
              <li>• Requires more satoshis for multiple transactions</li>
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

// import React, { useState } from 'react';
// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
// import { UTXOManager } from '../../utils/blockchain';
// import { BroadcastService } from '../../services/BroadcastService';
// import { createInscriptionScript } from '../utils/inscriptionCreator';
// import { BCATViewer } from './BCATViewer';

// interface CreateLargeProfileInscriptionProps {
//   keyData: any;
//   network: 'mainnet' | 'testnet';
//   whatsOnChainApiKey?: string;
//   currentFeeRate: number;
//   balance: { confirmed: number; unconfirmed: number };
//   lastTransactionTime: number;
//   setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
//   setLastTxid: (txid: string) => void;
//   setLastTransactionTime: (time: number) => void;
// }

// // CHUNK SIZE CONFIGURATION
// // Adjust this value to change the chunk size (in bytes)
// // Current: 4.5MB = 4.5 * 1024 * 1024 bytes
// const CHUNK_SIZE_MB = 1.0; // Change this value to adjust chunk size
// const CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024;

// export const CreateLargeProfileInscription: React.FC<CreateLargeProfileInscriptionProps> = ({
//   keyData,
//   network,
//   whatsOnChainApiKey,
//   currentFeeRate,
//   balance,
//   lastTransactionTime,
//   setStatus,
//   setLastTxid,
//   setLastTransactionTime
// }) => {
//   const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
//   const [largeProfileFile, setLargeProfileFile] = useState<File | null>(null);
//   const [largeProfileThumbnail, setLargeProfileThumbnail] = useState<string>('');
//   const [uploadingChunks, setUploadingChunks] = useState(false);
//   const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
//   const [bcatTransactionIds, setBcatTransactionIds] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);

//   // Helper function to chunk large files
//   // CHUNK SIZE: Configured at the top of the file (CHUNK_SIZE_BYTES)
//   const chunkFile = (file: File, chunkSize: number = CHUNK_SIZE_BYTES): Promise<ArrayBuffer[]> => {
//     return new Promise((resolve) => {
//       const chunks: ArrayBuffer[] = [];
//       const reader = new FileReader();
//       let offset = 0;

//       const readNextChunk = () => {
//         const slice = file.slice(offset, offset + chunkSize);
//         reader.readAsArrayBuffer(slice);
//       };

//       reader.onload = (e) => {
//         if (e.target?.result) {
//           chunks.push(e.target.result as ArrayBuffer);
//           offset += chunkSize;
          
//           if (offset < file.size) {
//             readNextChunk();
//           } else {
//             resolve(chunks);
//           }
//         }
//       };

//       readNextChunk();
//     });
//   };

//   // Generate thumbnail from large file
//   const generateThumbnail = async (file: File): Promise<string> => {
//     // For images, create a small thumbnail
//     if (file.type.startsWith('image/')) {
//       return new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           const img = new Image();
//           img.onload = () => {
//             const canvas = document.createElement('canvas');
//             const ctx = canvas.getContext('2d')!;
            
//             // Create 200x200 thumbnail
//             const size = 200;
//             canvas.width = size;
//             canvas.height = size;
            
//             // Calculate dimensions to maintain aspect ratio
//             const scale = Math.min(size / img.width, size / img.height);
//             const w = img.width * scale;
//             const h = img.height * scale;
//             const x = (size - w) / 2;
//             const y = (size - h) / 2;
            
//             ctx.fillStyle = '#1a1a1a';
//             ctx.fillRect(0, 0, size, size);
//             ctx.drawImage(img, x, y, w, h);
            
//             resolve(canvas.toDataURL('image/jpeg', 0.7));
//           };
//           img.src = e.target?.result as string;
//         };
//         reader.readAsDataURL(file);
//       });
//     } else {
//       // For non-images, create a generic thumbnail
//       const canvas = document.createElement('canvas');
//       const ctx = canvas.getContext('2d')!;
//       canvas.width = 200;
//       canvas.height = 200;
      
//       // Dark background
//       ctx.fillStyle = '#1a1a1a';
//       ctx.fillRect(0, 0, 200, 200);
      
//       // File icon based on type
//       ctx.fillStyle = '#6b7280';
//       ctx.font = '60px Arial';
//       ctx.textAlign = 'center';
      
//       let icon = '📄';
//       if (file.type.startsWith('video/')) icon = '🎥';
//       else if (file.type.startsWith('audio/')) icon = '🎵';
//       else if (file.type.includes('zip') || file.type.includes('archive')) icon = '📦';
//       else if (file.type.includes('pdf')) icon = '📕';
      
//       ctx.fillText(icon, 100, 90);
      
//       // File info
//       ctx.fillStyle = '#e5e7eb';
//       ctx.font = '14px Arial';
//       const displayName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
//       ctx.fillText(displayName, 100, 130);
//       ctx.font = '12px Arial';
//       ctx.fillStyle = '#9ca3af';
//       ctx.fillText(`${(file.size / (1024 * 1024)).toFixed(1)}MB`, 100, 150);
      
//       return canvas.toDataURL('image/png');
//     }
//   };

//   // Handle large file selection
//   const handleLargeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setLargeProfileFile(file);
    
//     // Generate thumbnail
//     setStatus({ type: 'info', message: 'Generating thumbnail...' });
//     const thumbnail = await generateThumbnail(file);
//     setLargeProfileThumbnail(thumbnail);
    
//     // Calculate chunks with configured chunk size
//     const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);
    
//     setStatus({ 
//       type: 'info', 
//       message: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Will be split into ${totalChunks} chunks of ${CHUNK_SIZE_MB}MB each.` 
//     });
//   };

//   // Create BCAT transactions using official protocol
//   const createBCATTransactions = async (): Promise<string[]> => {
//     if (!largeProfileFile || !keyData.privateKey) {
//       throw new Error('Missing file or private key');
//     }

//     setUploadingChunks(true);
//     const txids: string[] = [];
//     const broadcastService = new BroadcastService(network);
    
//     try {
//       // Chunk the file using configured chunk size
//       const chunks = await chunkFile(largeProfileFile);
//       setChunkProgress({ current: 0, total: chunks.length });
      
//       // Get the private key and address
//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const address = privateKey.toPublicKey().toAddress();
      
//       // Create a transaction for each chunk using BCAT part format
//       for (let i = 0; i < chunks.length; i++) {
//         setChunkProgress({ current: i + 1, total: chunks.length });
//         setStatus({ 
//           type: 'info', 
//           message: `Uploading chunk ${i + 1} of ${chunks.length} (${CHUNK_SIZE_MB}MB each)...` 
//         });
        
//         // Get UTXOs
//         const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//         const utxos = await utxoManager.fetchUTXOs(true);
        
//         if (utxos.length === 0) {
//           throw new Error('No UTXOs available');
//         }
        
//         // Convert chunk to Uint8Array
//         const chunkData = new Uint8Array(chunks[i]);
        
//         // Estimate fee for this chunk
//         const chunkSize = chunkData.length;
//         const estimatedFee = Math.ceil((300 + chunkSize) / 1000) * currentFeeRate;
//         const { selected, total } = utxoManager.selectUTXOs(estimatedFee);
        
//         if (selected.length === 0) {
//           throw new Error(`Insufficient funds for chunk ${i + 1}. Need ${estimatedFee} sats.`);
//         }
        
//         // Create transaction with BCAT part data using official namespace
//         const tx = new Transaction();
        
//         // Add inputs with proper error handling
//         let totalInput = 0;
//         for (const utxo of selected) {
//           const txid = utxo.tx_hash || utxo.txid;
//           const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//           const satoshis = utxo.value || utxo.satoshis || 0;
          
//           totalInput += satoshis;
          
//           // Get the source transaction if available
//           let sourceTransaction: any;
//           if (utxo.sourceTransaction) {
//             sourceTransaction = utxo.sourceTransaction;
//           } else {
//             // Create inline source transaction with proper structure
//             sourceTransaction = {
//               id: txid,
//               version: 1,
//               inputs: [],
//               outputs: []
//             };
            
//             // Make sure we have enough outputs
//             for (let j = 0; j <= vout; j++) {
//               sourceTransaction.outputs[j] = sourceTransaction.outputs[j] || {
//                 satoshis: j === vout ? satoshis : 0,
//                 lockingScript: new P2PKH().lock(address)
//               };
//             }
            
//             sourceTransaction.lockTime = 0;
//           }
          
//           tx.addInput({
//             sourceTXID: txid,
//             sourceOutputIndex: vout,
//             unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//             sourceTransaction: sourceTransaction
//           });
//         }
        
//         // Create OP_RETURN output with BCAT part data using official namespace
//         const script = new Script();
//         script.writeBin([0x6a]); // OP_RETURN
        
//         // BCAT part namespace: 1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL
//         const bcatPartNamespace = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';
//         const bcatPartBytes = Utils.toArray(bcatPartNamespace, 'utf8');
//         script.writeBin([bcatPartBytes.length]);
//         script.writeBin(bcatPartBytes);
        
//         // Raw chunk data
//         if (chunkData.length <= 75) {
//           script.writeBin([chunkData.length]);
//           script.writeBin(Array.from(chunkData));
//         } else if (chunkData.length <= 255) {
//           script.writeBin([0x4c]); // OP_PUSHDATA1
//           script.writeBin([chunkData.length]);
//           script.writeBin(Array.from(chunkData));
//         } else if (chunkData.length <= 65535) {
//           script.writeBin([0x4d]); // OP_PUSHDATA2
//           script.writeBin([chunkData.length & 0xff]);
//           script.writeBin([chunkData.length >> 8]);
//           script.writeBin(Array.from(chunkData));
//         } else {
//           script.writeBin([0x4e]); // OP_PUSHDATA4
//           script.writeBin([chunkData.length & 0xff]);
//           script.writeBin([chunkData.length >> 8]);
//           script.writeBin([chunkData.length >> 16]);
//           script.writeBin([chunkData.length >> 24]);
//           script.writeBin(Array.from(chunkData));
//         }
        
//         // Add OP_RETURN output (0 sats)
//         tx.addOutput({
//           lockingScript: script,
//           satoshis: 0
//         });
        
//         // Add change output - send change back to the same address
//         const change = totalInput - estimatedFee;
        
//         if (change > 0) {
//           tx.addOutput({
//             lockingScript: new P2PKH().lock(address),
//             satoshis: change
//           });
//         }
        
//         // Sign and broadcast
//         await tx.sign();
//         const txHex = tx.toHex();
//         const result = await broadcastService.broadcast(txHex);
        
//         if (!result.success || !result.txid) {
//           throw new Error(`Failed to broadcast chunk ${i + 1}: ${result.error}`);
//         }
        
//         txids.push(result.txid);
//         utxoManager.markAsSpent(selected);
        
//         // Wait between chunks to avoid rate limiting
//         if (i < chunks.length - 1) {
//           await new Promise(resolve => setTimeout(resolve, 2000));
//         }
//       }
      
//       return txids;
      
//     } finally {
//       setUploadingChunks(false);
//     }
//   };

//   // Create the main inscription with BCAT reference
//   const createLargeProfileOrdinal = async () => {
//     if (!largeProfileFile || !largeProfileThumbnail || !keyData.privateKey) {
//       setStatus({ type: 'error', message: 'Missing required data' });
//       return;
//     }

//     // Check timing
//     const timeSinceLastTx = Date.now() - lastTransactionTime;
//     if (timeSinceLastTx < 5000) {
//       setStatus({ 
//         type: 'error', 
//         message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another inscription`
//       });
//       return;
//     }
    
//     setLoading(true);
    
//     try {
//       // First, upload all chunks
//       setStatus({ type: 'info', message: 'Uploading file chunks...' });
//       const chunkTxIds = await createBCATTransactions();
//       setBcatTransactionIds(chunkTxIds);
      
//       // Wait a bit before creating the final transaction
//       await new Promise(resolve => setTimeout(resolve, 3000));
      
//       setStatus({ type: 'info', message: 'Creating main inscription with BCAT reference...' });
      
//       // Create the main inscription with thumbnail and BCAT reference
//       const thumbnailData = largeProfileThumbnail.split(',')[1];
//       const thumbnailBytes = Utils.toArray(thumbnailData, 'base64');
      
//       // Get UTXOs
//       const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//       const utxos = await utxoManager.fetchUTXOs(true);
      
//       // Calculate fee more accurately
//       const thumbnailSize = thumbnailBytes.length;
//       const bcatDataSize = 4 + (chunkTxIds.length * 33) + 200; // BCAT prefix + txids + metadata estimate
//       const estimatedTxSize = 300 + thumbnailSize + bcatDataSize;
//       const estimatedFee = Math.ceil((estimatedTxSize / 1000) * currentFeeRate);
      
//       console.log(`Final TX: Thumbnail size: ${thumbnailSize}, BCAT data size: ${bcatDataSize}, Est. fee: ${estimatedFee}`);
      
//       const { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee + 546); // 1 for inscription + fee + dust for safety
      
//       if (selected.length === 0) {
//         throw new Error('Insufficient funds for main inscription');
//       }
      
//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const pubKeyHash = privateKey.toPublicKey().toHash();
//       const address = privateKey.toPublicKey().toAddress();
      
//       // Create inscription script with thumbnail
//       const inscriptionScript = createInscriptionScript(
//         pubKeyHash,
//         'image/jpeg',
//         thumbnailBytes
//       );
      
//       // Create transaction
//       const tx = new Transaction();
      
//       // Add inputs with proper error handling
//       let totalInput = 0;
//       for (const utxo of selected) {
//         const txid = utxo.tx_hash || utxo.txid;
//         const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//         const satoshis = utxo.value || utxo.satoshis || 0;
        
//         totalInput += satoshis;
        
//         const sourceTransaction = utxo.sourceTransaction || {
//           id: txid,
//           version: 1,
//           inputs: [],
//           outputs: []
//         };
        
//         // Make sure we have enough outputs
//         for (let j = 0; j <= vout; j++) {
//           sourceTransaction.outputs[j] = sourceTransaction.outputs[j] || {
//             satoshis: j === vout ? satoshis : 0,
//             lockingScript: new P2PKH().lock(address)
//           };
//         }
        
//         sourceTransaction.lockTime = 0;
        
//         tx.addInput({
//           sourceTXID: txid,
//           sourceOutputIndex: vout,
//           unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//           sourceTransaction: sourceTransaction
//         });
//       }
      
//       console.log(`Final TX: Total input: ${totalInput} sats`);
      
//       // Output 1: Inscription (1 sat) - sent to the user's address
//       tx.addOutput({
//         lockingScript: inscriptionScript,
//         satoshis: 1
//       });
      
//       // Output 2: BCAT reference in OP_RETURN
//       // Build the OP_RETURN script carefully
//       const script = new Script();
      
//       // OP_RETURN
//       script.writeBin([0x6a]);
      
//       // BCAT prefix
//       const bcatPrefixBytes = Utils.toArray('BCAT', 'utf8');
//       script.writeBin([bcatPrefixBytes.length]);
//       script.writeBin(bcatPrefixBytes);
      
//       // Add each chunk transaction ID
//       for (const txid of chunkTxIds) {
//         const txidBytes = Utils.toArray(txid, 'hex').reverse(); // Reverse for little-endian
//         script.writeBin([0x20]); // Push 32 bytes
//         script.writeBin(txidBytes);
//       }
      
//       // Add metadata
//       const metadata = {
//         filename: largeProfileFile.name,
//         size: largeProfileFile.size,
//         type: largeProfileFile.type,
//         chunks: chunkTxIds.length,
//         chunkSize: CHUNK_SIZE_MB
//       };
//       const metadataStr = JSON.stringify(metadata);
//       const metadataBytes = Utils.toArray(metadataStr, 'utf8');
      
//       // Push metadata with appropriate opcode
//       if (metadataBytes.length <= 75) {
//         script.writeBin([metadataBytes.length]);
//         script.writeBin(metadataBytes);
//       } else if (metadataBytes.length <= 255) {
//         script.writeBin([0x4c]); // OP_PUSHDATA1
//         script.writeBin([metadataBytes.length]);
//         script.writeBin(metadataBytes);
//       } else {
//         script.writeBin([0x4d]); // OP_PUSHDATA2
//         script.writeBin([metadataBytes.length & 0xff]);
//         script.writeBin([metadataBytes.length >> 8]);
//         script.writeBin(metadataBytes);
//       }
      
//       tx.addOutput({
//         lockingScript: script,
//         satoshis: 0
//       });
      
//       // Output 3: Change - sent back to the user's address
//       const change = totalInput - 1 - estimatedFee;
      
//       if (change > 546) { // Only add change if it's above dust limit
//         tx.addOutput({
//           lockingScript: new P2PKH().lock(address),
//           satoshis: change
//         });
//         console.log(`Final TX: Change output: ${change} sats`);
//       }
      
//       // Sign and broadcast
//       await tx.sign();
//       const txHex = tx.toHex();
//       const txSize = txHex.length / 2;
//       console.log(`Final TX: Size: ${txSize} bytes, Hex length: ${txHex.length}`);
      
//       const broadcastService = new BroadcastService(network);
//       const result = await broadcastService.broadcast(txHex);
      
//       if (result.success) {
//         setLastTxid(result.txid!);
//         setLastTransactionTime(Date.now());
//         setStatus({ 
//           type: 'success', 
//           message: `Large profile created!\nMain TX: ${result.txid}\nBCAT chunks: ${chunkTxIds.length}\n\nYour file can now be reassembled using the BCAT transaction.` 
//         });
        
//         console.log(`BCAT inscription created successfully!`);
//         console.log(`Main TX: ${result.txid}`);
//         console.log(`Chunk TXs: ${chunkTxIds.join(', ')}`);
        
//         // Clear form
//         setLargeProfileFile(null);
//         setLargeProfileThumbnail('');
//         setBcatTransactionIds([]);
//       } else {
//         throw new Error(result.error || 'Failed to broadcast final transaction');
//       }
      
//     } catch (error) {
//       console.error('Error creating large profile:', error);
//       setStatus({ 
//         type: 'error', 
//         message: error instanceof Error ? error.message : 'Failed to create large profile' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isDisabled = loading || !keyData.privateKey || !largeProfileFile || uploadingChunks ||
//     (Date.now() - lastTransactionTime < 5000) || balance.confirmed < 5000;

//   return (
//     <div className="space-y-4">
//       {/* Tab Navigation */}
//       <div className="flex gap-2 border-b border-gray-600">
//         <button
//           onClick={() => setActiveTab('create')}
//           className={`px-4 py-2 font-medium transition-all ${
//             activeTab === 'create'
//               ? 'text-purple-400 border-b-2 border-purple-400'
//               : 'text-gray-400 hover:text-gray-300'
//           }`}
//         >
//           📤 Create BCAT
//         </button>
//         <button
//           onClick={() => setActiveTab('view')}
//           className={`px-4 py-2 font-medium transition-all ${
//             activeTab === 'view'
//               ? 'text-purple-400 border-b-2 border-purple-400'
//               : 'text-gray-400 hover:text-gray-300'
//           }`}
//         >
//           📦 View & Reconstruct
//         </button>
//       </div>

//       {/* Tab Content */}
//       {activeTab === 'create' ? (
//         <>
//           <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
//             <p className="text-sm text-yellow-300">
//               📦 Large Profile uses BCAT protocol to store files over 10MB across multiple transactions.
//             </p>
//             <p className="text-xs text-yellow-200 mt-1">
//               Current chunk size: {CHUNK_SIZE_MB}MB per chunk
//             </p>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-300 mb-2">Upload Large File</label>
//             <input
//               type="file"
//               onChange={handleLargeFileSelect}
//               className="hidden"
//               id="large-file-upload"
//               disabled={uploadingChunks || loading}
//             />
//             <label
//               htmlFor="large-file-upload"
//               className={`block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors ${
//                 (uploadingChunks || loading) ? 'opacity-50 cursor-not-allowed' : ''
//               }`}
//             >
//               {largeProfileFile ? (
//                 <div className="text-center">
//                   {largeProfileThumbnail && (
//                     <img 
//                       src={largeProfileThumbnail} 
//                       alt="Thumbnail" 
//                       className="w-32 h-32 mx-auto rounded mb-3 object-cover"
//                     />
//                   )}
//                   <p className="text-sm font-medium text-white">{largeProfileFile.name}</p>
//                   <p className="text-sm text-gray-400 mt-1">
//                     Size: {(largeProfileFile.size / (1024 * 1024)).toFixed(2)}MB
//                   </p>
//                   <p className="text-xs text-purple-400 mt-2">
//                     Will be split into {Math.ceil(largeProfileFile.size / CHUNK_SIZE_BYTES)} chunks of {CHUNK_SIZE_MB}MB each
//                   </p>
//                 </div>
//               ) : (
//                 <div className="text-center">
//                   <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//                   </svg>
//                   <p className="text-gray-400">Drop large file here or click to upload</p>
//                   <p className="text-xs text-gray-500 mt-1">No size limit - uses BCAT protocol</p>
//                 </div>
//               )}
//             </label>
//           </div>

//           {/* Progress indicator */}
//           {uploadingChunks && chunkProgress.total > 0 && (
//             <div className="p-4 bg-gray-800 rounded-lg">
//               <p className="text-sm text-gray-300 mb-2">
//                 Uploading chunk {chunkProgress.current} of {chunkProgress.total}
//               </p>
//               <div className="w-full bg-gray-700 rounded-full h-2">
//                 <div 
//                   className="bg-purple-500 h-2 rounded-full transition-all"
//                   style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
//                 />
//               </div>
//             </div>
//           )}

//           {/* BCAT transaction list */}
//           {bcatTransactionIds.length > 0 && (
//             <div className="p-3 bg-gray-800 rounded-lg">
//               <p className="text-sm font-medium text-gray-300 mb-2">BCAT Chunk Transactions:</p>
//               <div className="space-y-1 max-h-32 overflow-y-auto">
//                 {bcatTransactionIds.map((txid, index) => (
//                   <div key={txid} className="flex items-center justify-between text-xs">
//                     <span className="text-gray-400">Chunk {index + 1}:</span>
//                     <a 
//                       href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="text-blue-400 hover:text-blue-300 font-mono"
//                     >
//                       {txid.substring(0, 16)}...
//                     </a>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           <button
//             onClick={createLargeProfileOrdinal}
//             disabled={isDisabled}
//             className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {loading ? 'Creating Large Profile...' : 
//              uploadingChunks ? `Uploading Chunks (${chunkProgress.current}/${chunkProgress.total})...` :
//              (Date.now() - lastTransactionTime < 5000) ? 
//               `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
//               'Create Large Profile with BCAT'}
//           </button>

//           <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//             <h4 className="text-sm font-medium text-blue-300 mb-1">How BCAT Works:</h4>
//             <ul className="text-xs text-gray-300 space-y-1">
//               <li>• Large files are split into {CHUNK_SIZE_MB}MB chunks</li>
//               <li>• Each chunk is stored in a separate transaction</li>
//               <li>• Main inscription contains thumbnail + BCAT references</li>
//               <li>• Files can be reassembled using the transaction IDs</li>
//               <li>• No file size limit - perfect for videos, archives, etc.</li>
//               <li>• Requires more satoshis for multiple transactions</li>
//             </ul>
//           </div>

//           {/* Balance warning for large files */}
//           {largeProfileFile && balance.confirmed < 10000 && (
//             <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
//               <p className="text-xs text-red-300">
//                 ⚠️ Large files require multiple transactions. Ensure you have enough satoshis. 
//                 Current balance: {balance.confirmed} sats. Recommended: 10,000+ sats.
//               </p>
//             </div>
//           )}
//         </>
//       ) : (
//         <BCATViewer
//           keyData={keyData}
//           network={network}
//           whatsOnChainApiKey={whatsOnChainApiKey}
//         />
//       )}
//     </div>
//   );
// };


// This is the proir to BCAP development 2 

// import React, { useState } from 'react';
// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
// import { UTXOManager } from '../../utils/blockchain';
// import { BroadcastService } from '../../services/BroadcastService';
// import { createInscriptionScript } from '../utils/inscriptionCreator';

// interface CreateLargeProfileInscriptionProps {
//   keyData: any;
//   network: 'mainnet' | 'testnet';
//   whatsOnChainApiKey?: string;
//   currentFeeRate: number;
//   balance: { confirmed: number; unconfirmed: number };
//   lastTransactionTime: number;
//   setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
//   setLastTxid: (txid: string) => void;
//   setLastTransactionTime: (time: number) => void;
// }

// // CHUNK SIZE CONFIGURATION
// // Adjust this value to change the chunk size (in bytes)
// // Current: 4.5MB = 4.5 * 1024 * 1024 bytes
// const CHUNK_SIZE_MB = 4.5; // Change this value to adjust chunk size
// const CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024;

// export const CreateLargeProfileInscription: React.FC<CreateLargeProfileInscriptionProps> = ({
//   keyData,
//   network,
//   whatsOnChainApiKey,
//   currentFeeRate,
//   balance,
//   lastTransactionTime,
//   setStatus,
//   setLastTxid,
//   setLastTransactionTime
// }) => {
//   const [largeProfileFile, setLargeProfileFile] = useState<File | null>(null);
//   const [largeProfileThumbnail, setLargeProfileThumbnail] = useState<string>('');
//   const [uploadingChunks, setUploadingChunks] = useState(false);
//   const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
//   const [bcatTransactionIds, setBcatTransactionIds] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);

//   // Helper function to chunk large files
//   // CHUNK SIZE: Configured at the top of the file (CHUNK_SIZE_BYTES)
//   const chunkFile = (file: File, chunkSize: number = CHUNK_SIZE_BYTES): Promise<ArrayBuffer[]> => {
//     return new Promise((resolve) => {
//       const chunks: ArrayBuffer[] = [];
//       const reader = new FileReader();
//       let offset = 0;

//       const readNextChunk = () => {
//         const slice = file.slice(offset, offset + chunkSize);
//         reader.readAsArrayBuffer(slice);
//       };

//       reader.onload = (e) => {
//         if (e.target?.result) {
//           chunks.push(e.target.result as ArrayBuffer);
//           offset += chunkSize;
          
//           if (offset < file.size) {
//             readNextChunk();
//           } else {
//             resolve(chunks);
//           }
//         }
//       };

//       readNextChunk();
//     });
//   };

//   // Generate thumbnail from large file
//   const generateThumbnail = async (file: File): Promise<string> => {
//     // For images, create a small thumbnail
//     if (file.type.startsWith('image/')) {
//       return new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           const img = new Image();
//           img.onload = () => {
//             const canvas = document.createElement('canvas');
//             const ctx = canvas.getContext('2d')!;
            
//             // Create 200x200 thumbnail
//             const size = 200;
//             canvas.width = size;
//             canvas.height = size;
            
//             // Calculate dimensions to maintain aspect ratio
//             const scale = Math.min(size / img.width, size / img.height);
//             const w = img.width * scale;
//             const h = img.height * scale;
//             const x = (size - w) / 2;
//             const y = (size - h) / 2;
            
//             ctx.fillStyle = '#1a1a1a';
//             ctx.fillRect(0, 0, size, size);
//             ctx.drawImage(img, x, y, w, h);
            
//             resolve(canvas.toDataURL('image/jpeg', 0.7));
//           };
//           img.src = e.target?.result as string;
//         };
//         reader.readAsDataURL(file);
//       });
//     } else {
//       // For non-images, create a generic thumbnail
//       const canvas = document.createElement('canvas');
//       const ctx = canvas.getContext('2d')!;
//       canvas.width = 200;
//       canvas.height = 200;
      
//       // Dark background
//       ctx.fillStyle = '#1a1a1a';
//       ctx.fillRect(0, 0, 200, 200);
      
//       // File icon based on type
//       ctx.fillStyle = '#6b7280';
//       ctx.font = '60px Arial';
//       ctx.textAlign = 'center';
      
//       let icon = '📄';
//       if (file.type.startsWith('video/')) icon = '🎥';
//       else if (file.type.startsWith('audio/')) icon = '🎵';
//       else if (file.type.includes('zip') || file.type.includes('archive')) icon = '📦';
//       else if (file.type.includes('pdf')) icon = '📕';
      
//       ctx.fillText(icon, 100, 90);
      
//       // File info
//       ctx.fillStyle = '#e5e7eb';
//       ctx.font = '14px Arial';
//       const displayName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
//       ctx.fillText(displayName, 100, 130);
//       ctx.font = '12px Arial';
//       ctx.fillStyle = '#9ca3af';
//       ctx.fillText(`${(file.size / (1024 * 1024)).toFixed(1)}MB`, 100, 150);
      
//       return canvas.toDataURL('image/png');
//     }
//   };

//   // Handle large file selection
//   const handleLargeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setLargeProfileFile(file);
    
//     // Generate thumbnail
//     setStatus({ type: 'info', message: 'Generating thumbnail...' });
//     const thumbnail = await generateThumbnail(file);
//     setLargeProfileThumbnail(thumbnail);
    
//     // Calculate chunks with configured chunk size
//     const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);
    
//     setStatus({ 
//       type: 'info', 
//       message: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Will be split into ${totalChunks} chunks of ${CHUNK_SIZE_MB}MB each.` 
//     });
//   };

//   // Create BCAT transactions
//   const createBCATTransactions = async (): Promise<string[]> => {
//     if (!largeProfileFile || !keyData.privateKey) {
//       throw new Error('Missing file or private key');
//     }

//     setUploadingChunks(true);
//     const txids: string[] = [];
//     const broadcastService = new BroadcastService(network);
    
//     try {
//       // Chunk the file using configured chunk size
//       const chunks = await chunkFile(largeProfileFile);
//       setChunkProgress({ current: 0, total: chunks.length });
      
//       // Get the private key and address
//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const address = privateKey.toPublicKey().toAddress();
      
//       // Create a transaction for each chunk
//       for (let i = 0; i < chunks.length; i++) {
//         setChunkProgress({ current: i + 1, total: chunks.length });
//         setStatus({ 
//           type: 'info', 
//           message: `Uploading chunk ${i + 1} of ${chunks.length} (${CHUNK_SIZE_MB}MB each)...` 
//         });
        
//         // Get UTXOs
//         const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//         const utxos = await utxoManager.fetchUTXOs(true);
        
//         if (utxos.length === 0) {
//           throw new Error('No UTXOs available');
//         }
        
//         // Convert chunk to Uint8Array
//         const chunkData = new Uint8Array(chunks[i]);
        
//         // Estimate fee for this chunk
//         const chunkSize = chunkData.length;
//         const estimatedFee = Math.ceil((300 + chunkSize) / 1000) * currentFeeRate;
//         const { selected, total } = utxoManager.selectUTXOs(estimatedFee);
        
//         if (selected.length === 0) {
//           throw new Error(`Insufficient funds for chunk ${i + 1}. Need ${estimatedFee} sats.`);
//         }
        
//         // Create transaction with BCAT_PART data
//         const tx = new Transaction();
        
//         // Add inputs with proper error handling
//         let totalInput = 0;
//         for (const utxo of selected) {
//           const txid = utxo.tx_hash || utxo.txid;
//           const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//           const satoshis = utxo.value || utxo.satoshis || 0;
          
//           totalInput += satoshis;
          
//           // Get the source transaction if available
//           let sourceTransaction: any;
//           if (utxo.sourceTransaction) {
//             sourceTransaction = utxo.sourceTransaction;
//           } else {
//             // Create inline source transaction with proper structure
//             sourceTransaction = {
//               id: txid,
//               version: 1,
//               inputs: [],
//               outputs: []
//             };
            
//             // Make sure we have enough outputs
//             for (let j = 0; j <= vout; j++) {
//               sourceTransaction.outputs[j] = sourceTransaction.outputs[j] || {
//                 satoshis: j === vout ? satoshis : 0,
//                 lockingScript: new P2PKH().lock(address)
//               };
//             }
            
//             sourceTransaction.lockTime = 0;
//           }
          
//           tx.addInput({
//             sourceTXID: txid,
//             sourceOutputIndex: vout,
//             unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//             sourceTransaction: sourceTransaction
//           });
//         }
        
//         // Create OP_RETURN output with BCAT_PART data
//         let scriptHex = '6a'; // OP_RETURN
        
//         // BCAT_PART prefix
//         const bcatPartPrefix = 'BCAT_PART';
//         const bcatPartBytes = Utils.toArray(bcatPartPrefix, 'utf8');
//         scriptHex += bcatPartBytes.length.toString(16).padStart(2, '0');
//         scriptHex += bcatPartBytes.map(b => b.toString(16).padStart(2, '0')).join('');
        
//         // Add chunk data with proper push data opcodes
//         if (chunkData.length <= 75) {
//           scriptHex += chunkData.length.toString(16).padStart(2, '0');
//         } else if (chunkData.length <= 255) {
//           scriptHex += '4c'; // OP_PUSHDATA1
//           scriptHex += chunkData.length.toString(16).padStart(2, '0');
//         } else if (chunkData.length <= 65535) {
//           scriptHex += '4d'; // OP_PUSHDATA2
//           scriptHex += (chunkData.length & 0xff).toString(16).padStart(2, '0');
//           scriptHex += ((chunkData.length >> 8) & 0xff).toString(16).padStart(2, '0');
//         } else {
//           scriptHex += '4e'; // OP_PUSHDATA4
//           scriptHex += (chunkData.length & 0xff).toString(16).padStart(2, '0');
//           scriptHex += ((chunkData.length >> 8) & 0xff).toString(16).padStart(2, '0');
//           scriptHex += ((chunkData.length >> 16) & 0xff).toString(16).padStart(2, '0');
//           scriptHex += ((chunkData.length >> 24) & 0xff).toString(16).padStart(2, '0');
//         }
        
//         // Add chunk data in batches to avoid memory issues
//         for (let j = 0; j < chunkData.length; j += 10000) {
//           const batch = chunkData.slice(j, Math.min(j + 10000, chunkData.length));
//           scriptHex += Array.from(batch).map(b => b.toString(16).padStart(2, '0')).join('');
//         }
        
//         const script = Script.fromHex(scriptHex);
        
//         // Add OP_RETURN output (0 sats)
//         tx.addOutput({
//           lockingScript: script,
//           satoshis: 0
//         });
        
//         // Add change output - send change back to the same address
//         const change = totalInput - estimatedFee;
        
//         if (change > 0) {
//           tx.addOutput({
//             lockingScript: new P2PKH().lock(address),
//             satoshis: change
//           });
//         }
        
//         // Sign and broadcast
//         await tx.sign();
//         const txHex = tx.toHex();
//         const result = await broadcastService.broadcast(txHex);
        
//         if (!result.success || !result.txid) {
//           throw new Error(`Failed to broadcast chunk ${i + 1}: ${result.error}`);
//         }
        
//         txids.push(result.txid);
//         utxoManager.markAsSpent(selected);
        
//         // Wait between chunks to avoid rate limiting
//         if (i < chunks.length - 1) {
//           await new Promise(resolve => setTimeout(resolve, 2000));
//         }
//       }
      
//       return txids;
      
//     } finally {
//       setUploadingChunks(false);
//     }
//   };

//   // Create the main inscription with BCAT reference
//   const createLargeProfileOrdinal = async () => {
//     if (!largeProfileFile || !largeProfileThumbnail || !keyData.privateKey) {
//       setStatus({ type: 'error', message: 'Missing required data' });
//       return;
//     }

//     // Check timing
//     const timeSinceLastTx = Date.now() - lastTransactionTime;
//     if (timeSinceLastTx < 5000) {
//       setStatus({ 
//         type: 'error', 
//         message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another inscription`
//       });
//       return;
//     }
    
//     setLoading(true);
    
//     try {
//       // First, upload all chunks
//       setStatus({ type: 'info', message: 'Uploading file chunks...' });
//       const chunkTxIds = await createBCATTransactions();
//       setBcatTransactionIds(chunkTxIds);
      
//       setStatus({ type: 'info', message: 'Creating main inscription with BCAT reference...' });
      
//       // Create the main inscription with thumbnail and BCAT reference
//       const thumbnailData = largeProfileThumbnail.split(',')[1];
//       const thumbnailBytes = Utils.toArray(thumbnailData, 'base64');
      
//       // Get UTXOs
//       const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//       const utxos = await utxoManager.fetchUTXOs(true);
      
//       const estimatedFee = 2000; // Rough estimate for main transaction
//       const { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee);
      
//       if (selected.length === 0) {
//         throw new Error('Insufficient funds for main inscription');
//       }
      
//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const pubKeyHash = privateKey.toPublicKey().toHash();
//       const address = privateKey.toPublicKey().toAddress();
      
//       // Create inscription script with thumbnail
//       const inscriptionScript = createInscriptionScript(
//         pubKeyHash,
//         'image/jpeg',
//         thumbnailBytes
//       );
      
//       // Create transaction
//       const tx = new Transaction();
      
//       // Add inputs with proper error handling
//       let totalInput = 0;
//       for (const utxo of selected) {
//         const txid = utxo.tx_hash || utxo.txid;
//         const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//         const satoshis = utxo.value || utxo.satoshis || 0;
        
//         totalInput += satoshis;
        
//         // Get the source transaction if available
//         let sourceTransaction: any;
//         if (utxo.sourceTransaction) {
//           sourceTransaction = utxo.sourceTransaction;
//         } else {
//           // Create inline source transaction with proper structure
//           sourceTransaction = {
//             id: txid,
//             version: 1,
//             inputs: [],
//             outputs: []
//           };
          
//           // Make sure we have enough outputs
//           for (let j = 0; j <= vout; j++) {
//             sourceTransaction.outputs[j] = sourceTransaction.outputs[j] || {
//               satoshis: j === vout ? satoshis : 0,
//               lockingScript: new P2PKH().lock(address)
//             };
//           }
          
//           sourceTransaction.lockTime = 0;
//         }
        
//         tx.addInput({
//           sourceTXID: txid,
//           sourceOutputIndex: vout,
//           unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//           sourceTransaction: sourceTransaction
//         });
//       }
      
//       // Output 1: Inscription (1 sat) - sent to the user's address
//       tx.addOutput({
//         lockingScript: inscriptionScript,
//         satoshis: 1
//       });
      
//       // Output 2: BCAT reference in OP_RETURN
//       let bcatScriptHex = '6a'; // OP_RETURN
      
//       // Add "BCAT" prefix to identify this as a BCAT transaction
//       const bcatPrefix = 'BCAT';
//       const bcatPrefixBytes = Utils.toArray(bcatPrefix, 'utf8');
//       bcatScriptHex += bcatPrefixBytes.length.toString(16).padStart(2, '0');
//       bcatScriptHex += bcatPrefixBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
//       // Add each chunk transaction ID
//       for (const txid of chunkTxIds) {
//         const txidBytes = Utils.toArray(txid, 'hex').reverse(); // Reverse for little-endian
//         bcatScriptHex += '20'; // Push 32 bytes
//         bcatScriptHex += txidBytes.map(b => b.toString(16).padStart(2, '0')).join('');
//       }
      
//       // Add metadata
//       const metadata = {
//         filename: largeProfileFile.name,
//         size: largeProfileFile.size,
//         type: largeProfileFile.type,
//         chunks: chunkTxIds.length,
//         chunkSize: CHUNK_SIZE_MB // Include chunk size in metadata
//       };
//       const metadataBytes = Utils.toArray(JSON.stringify(metadata), 'utf8');
      
//       if (metadataBytes.length <= 75) {
//         bcatScriptHex += metadataBytes.length.toString(16).padStart(2, '0');
//       } else {
//         bcatScriptHex += '4c'; // OP_PUSHDATA1
//         bcatScriptHex += metadataBytes.length.toString(16).padStart(2, '0');
//       }
//       bcatScriptHex += metadataBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
//       const bcatScript = Script.fromHex(bcatScriptHex);
      
//       tx.addOutput({
//         lockingScript: bcatScript,
//         satoshis: 0
//       });
      
//       // Output 3: Change - sent back to the user's address
//       const change = totalInput - 1 - estimatedFee;
      
//       if (change > 0) {
//         tx.addOutput({
//           lockingScript: new P2PKH().lock(address),
//           satoshis: change
//         });
//       }
      
//       // Sign and broadcast
//       await tx.sign();
//       const txHex = tx.toHex();
//       const broadcastService = new BroadcastService(network);
//       const result = await broadcastService.broadcast(txHex);
      
//       if (result.success) {
//         setLastTxid(result.txid!);
//         setLastTransactionTime(Date.now());
//         setStatus({ 
//           type: 'success', 
//           message: `Large profile created! Main TX: ${result.txid}\nBCAT chunks: ${chunkTxIds.length}` 
//         });
        
//         // Clear form
//         setLargeProfileFile(null);
//         setLargeProfileThumbnail('');
//         setBcatTransactionIds([]);
//       } else {
//         throw new Error(result.error);
//       }
      
//     } catch (error) {
//       console.error('Error creating large profile:', error);
//       setStatus({ 
//         type: 'error', 
//         message: error instanceof Error ? error.message : 'Failed to create large profile' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isDisabled = loading || !keyData.privateKey || !largeProfileFile || uploadingChunks ||
//     (Date.now() - lastTransactionTime < 5000) || balance.confirmed < 5000;

//   return (
//     <div className="space-y-4">
//       <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
//         <p className="text-sm text-yellow-300">
//           📦 Large Profile uses BCAT protocol to store files over 10MB across multiple transactions.
//         </p>
//         <p className="text-xs text-yellow-200 mt-1">
//           Current chunk size: {CHUNK_SIZE_MB}MB per chunk
//         </p>
//       </div>

//       <div>
//         <label className="block text-sm font-medium text-gray-300 mb-2">Upload Large File</label>
//         <input
//           type="file"
//           onChange={handleLargeFileSelect}
//           className="hidden"
//           id="large-file-upload"
//           disabled={uploadingChunks || loading}
//         />
//         <label
//           htmlFor="large-file-upload"
//           className={`block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors ${
//             (uploadingChunks || loading) ? 'opacity-50 cursor-not-allowed' : ''
//           }`}
//         >
//           {largeProfileFile ? (
//             <div className="text-center">
//               {largeProfileThumbnail && (
//                 <img 
//                   src={largeProfileThumbnail} 
//                   alt="Thumbnail" 
//                   className="w-32 h-32 mx-auto rounded mb-3 object-cover"
//                 />
//               )}
//               <p className="text-sm font-medium text-white">{largeProfileFile.name}</p>
//               <p className="text-sm text-gray-400 mt-1">
//                 Size: {(largeProfileFile.size / (1024 * 1024)).toFixed(2)}MB
//               </p>
//               <p className="text-xs text-purple-400 mt-2">
//                 Will be split into {Math.ceil(largeProfileFile.size / CHUNK_SIZE_BYTES)} chunks of {CHUNK_SIZE_MB}MB each
//               </p>
//             </div>
//           ) : (
//             <div className="text-center">
//               <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//               </svg>
//               <p className="text-gray-400">Drop large file here or click to upload</p>
//               <p className="text-xs text-gray-500 mt-1">No size limit - uses BCAT protocol</p>
//             </div>
//           )}
//         </label>
//       </div>

//       {/* Progress indicator */}
//       {uploadingChunks && chunkProgress.total > 0 && (
//         <div className="p-4 bg-gray-800 rounded-lg">
//           <p className="text-sm text-gray-300 mb-2">
//             Uploading chunk {chunkProgress.current} of {chunkProgress.total}
//           </p>
//           <div className="w-full bg-gray-700 rounded-full h-2">
//             <div 
//               className="bg-purple-500 h-2 rounded-full transition-all"
//               style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
//             />
//           </div>
//         </div>
//       )}

//       {/* BCAT transaction list */}
//       {bcatTransactionIds.length > 0 && (
//         <div className="p-3 bg-gray-800 rounded-lg">
//           <p className="text-sm font-medium text-gray-300 mb-2">BCAT Chunk Transactions:</p>
//           <div className="space-y-1 max-h-32 overflow-y-auto">
//             {bcatTransactionIds.map((txid, index) => (
//               <div key={txid} className="flex items-center justify-between text-xs">
//                 <span className="text-gray-400">Chunk {index + 1}:</span>
//                 <a 
//                   href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="text-blue-400 hover:text-blue-300 font-mono"
//                 >
//                   {txid.substring(0, 16)}...
//                 </a>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       <button
//         onClick={createLargeProfileOrdinal}
//         disabled={isDisabled}
//         className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//       >
//         {loading ? 'Creating Large Profile...' : 
//          uploadingChunks ? `Uploading Chunks (${chunkProgress.current}/${chunkProgress.total})...` :
//          (Date.now() - lastTransactionTime < 5000) ? 
//           `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
//           'Create Large Profile with BCAT'}
//       </button>

//       <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//         <h4 className="text-sm font-medium text-blue-300 mb-1">How BCAT Works:</h4>
//         <ul className="text-xs text-gray-300 space-y-1">
//           <li>• Large files are split into {CHUNK_SIZE_MB}MB chunks</li>
//           <li>• Each chunk is stored in a separate transaction</li>
//           <li>• Main inscription contains thumbnail + BCAT references</li>
//           <li>• Files can be reassembled using the transaction IDs</li>
//           <li>• No file size limit - perfect for videos, archives, etc.</li>
//           <li>• Requires more satoshis for multiple transactions</li>
//         </ul>
//       </div>

//       {/* Balance warning for large files */}
//       {largeProfileFile && balance.confirmed < 10000 && (
//         <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
//           <p className="text-xs text-red-300">
//             ⚠️ Large files require multiple transactions. Ensure you have enough satoshis. 
//             Current balance: {balance.confirmed} sats. Recommended: 10,000+ sats.
//           </p>
//         </div>
//       )}
//     </div>
//   );
// };










// TRied end result of the chat  "BCAP Protocol further Development2"

// import React, { useState } from 'react';
// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
// import { UTXOManager } from '../../utils/blockchain';
// import { BroadcastService } from '../../services/BroadcastService';
// import { createInscriptionScript } from '../utils/inscriptionCreator';
// import { LargeProfileInscriptionList } from './LargeProfileInscriptionList';

// interface CreateLargeProfileInscriptionProps {
//   keyData: any;
//   network: 'mainnet' | 'testnet';
//   whatsOnChainApiKey?: string;
//   currentFeeRate: number;
//   balance: { confirmed: number; unconfirmed: number };
//   lastTransactionTime: number;
//   setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
//   setLastTxid: (txid: string) => void;
//   setLastTransactionTime: (time: number) => void;
// }

// // CHUNK SIZE CONFIGURATION - Adjust this value to change chunk size
// const CHUNK_SIZE_MB = 1.0; // 1MB chunks for better reliability
// const CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024;

// export const CreateLargeProfileInscription: React.FC<CreateLargeProfileInscriptionProps> = ({
//   keyData,
//   network,
//   whatsOnChainApiKey,
//   currentFeeRate,
//   balance,
//   lastTransactionTime,
//   setStatus,
//   setLastTxid,
//   setLastTransactionTime
// }) => {
//   const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
//   const [largeProfileFile, setLargeProfileFile] = useState<File | null>(null);
//   const [largeProfileThumbnail, setLargeProfileThumbnail] = useState<string>('');
//   const [uploadingChunks, setUploadingChunks] = useState(false);
//   const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
//   const [bcatTransactionIds, setBcatTransactionIds] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [refreshTrigger, setRefreshTrigger] = useState(0);

//   // Helper function to chunk large files
//   const chunkFile = (file: File, chunkSize: number = CHUNK_SIZE_BYTES): Promise<ArrayBuffer[]> => {
//     return new Promise((resolve) => {
//       const chunks: ArrayBuffer[] = [];
//       const reader = new FileReader();
//       let offset = 0;

//       const readNextChunk = () => {
//         const slice = file.slice(offset, offset + chunkSize);
//         reader.readAsArrayBuffer(slice);
//       };

//       reader.onload = (e) => {
//         if (e.target?.result) {
//           chunks.push(e.target.result as ArrayBuffer);
//           offset += chunkSize;
          
//           if (offset < file.size) {
//             readNextChunk();
//           } else {
//             resolve(chunks);
//           }
//         }
//       };

//       readNextChunk();
//     });
//   };

//   // Generate thumbnail from large file
//   const generateThumbnail = async (file: File): Promise<string> => {
//     if (file.type.startsWith('image/')) {
//       return new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           const img = new Image();
//           img.onload = () => {
//             const canvas = document.createElement('canvas');
//             const ctx = canvas.getContext('2d')!;
            
//             // Create 200x200 thumbnail
//             const size = 200;
//             canvas.width = size;
//             canvas.height = size;
            
//             // Calculate dimensions to maintain aspect ratio
//             const scale = Math.min(size / img.width, size / img.height);
//             const w = img.width * scale;
//             const h = img.height * scale;
//             const x = (size - w) / 2;
//             const y = (size - h) / 2;
            
//             ctx.fillStyle = '#1a1a1a';
//             ctx.fillRect(0, 0, size, size);
//             ctx.drawImage(img, x, y, w, h);
            
//             resolve(canvas.toDataURL('image/jpeg', 0.7));
//           };
//           img.src = e.target?.result as string;
//         };
//         reader.readAsDataURL(file);
//       });
//     } else {
//       // For non-images, create a generic thumbnail
//       const canvas = document.createElement('canvas');
//       const ctx = canvas.getContext('2d')!;
//       canvas.width = 200;
//       canvas.height = 200;
      
//       ctx.fillStyle = '#1a1a1a';
//       ctx.fillRect(0, 0, 200, 200);
      
//       ctx.fillStyle = '#6b7280';
//       ctx.font = '60px Arial';
//       ctx.textAlign = 'center';
//       ctx.fillText('📄', 100, 90);
      
//       ctx.fillStyle = '#e5e7eb';
//       ctx.font = '14px Arial';
//       ctx.fillText(file.name.substring(0, 20), 100, 130);
//       ctx.font = '12px Arial';
//       ctx.fillStyle = '#9ca3af';
//       ctx.fillText(`${(file.size / (1024 * 1024)).toFixed(1)}MB`, 100, 150);
      
//       return canvas.toDataURL('image/png');
//     }
//   };

//   // Handle large file selection
//   const handleLargeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setLargeProfileFile(file);
    
//     // Generate thumbnail
//     setStatus({ type: 'info', message: 'Generating thumbnail...' });
//     const thumbnail = await generateThumbnail(file);
//     setLargeProfileThumbnail(thumbnail);
    
//     // Calculate chunks
//     const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);
    
//     setStatus({ 
//       type: 'info', 
//       message: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Will be split into ${totalChunks} chunks.` 
//     });
//   };

//   // Create BCAT transactions
//   const createBCATTransactions = async (): Promise<string[]> => {
//     if (!largeProfileFile || !keyData.privateKey) {
//       throw new Error('Missing file or private key');
//     }

//     setUploadingChunks(true);
//     const txids: string[] = [];
    
//     try {
//       // Chunk the file
//       const chunks = await chunkFile(largeProfileFile);
//       setChunkProgress({ current: 0, total: chunks.length });
      
//       console.log(`Creating ${chunks.length} BCAT transactions for file: ${largeProfileFile.name}`);
      
//       // Get private key and address once
//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const address = privateKey.toPublicKey().toAddress();
      
//       // Create a transaction for each chunk
//       for (let i = 0; i < chunks.length; i++) {
//         try {
//           setChunkProgress({ current: i + 1, total: chunks.length });
//           setStatus({ 
//             type: 'info', 
//             message: `Uploading chunk ${i + 1} of ${chunks.length}...` 
//           });
          
//           // Get fresh UTXOs for each chunk
//           const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//           const utxos = await utxoManager.fetchUTXOs(true);
          
//           if (utxos.length === 0) {
//             throw new Error('No UTXOs available');
//           }
          
//           // Convert chunk to Uint8Array
//           const chunkData = new Uint8Array(chunks[i]);
//           console.log(`Chunk ${i + 1} size: ${chunkData.length} bytes`);
          
//           // Create OP_RETURN script with BCAT_PART data
//           let scriptArray: number[] = [];
          
//           // OP_RETURN
//           scriptArray.push(0x6a);
          
//           // BCAT_PART prefix
//           const bcatPartPrefix = 'BCAT_PART';
//           const bcatPartBytes = Utils.toArray(bcatPartPrefix, 'utf8');
//           scriptArray.push(bcatPartBytes.length);
//           scriptArray = scriptArray.concat(bcatPartBytes);
          
//           // Add chunk data with proper push opcode
//           if (chunkData.length <= 75) {
//             scriptArray.push(chunkData.length);
//           } else if (chunkData.length <= 255) {
//             scriptArray.push(0x4c); // OP_PUSHDATA1
//             scriptArray.push(chunkData.length);
//           } else if (chunkData.length <= 65535) {
//             scriptArray.push(0x4d); // OP_PUSHDATA2
//             scriptArray.push(chunkData.length & 0xff);
//             scriptArray.push((chunkData.length >> 8) & 0xff);
//           } else {
//             scriptArray.push(0x4e); // OP_PUSHDATA4
//             scriptArray.push(chunkData.length & 0xff);
//             scriptArray.push((chunkData.length >> 8) & 0xff);
//             scriptArray.push((chunkData.length >> 16) & 0xff);
//             scriptArray.push((chunkData.length >> 24) & 0xff);
//           }
          
//           // Add the actual chunk data
//           scriptArray = scriptArray.concat(Array.from(chunkData));
          
//           // Create script from array
//           const script = new Script();
//           script.writeBin(scriptArray);
          
//           // Estimate transaction size and fee
//           const scriptSize = scriptArray.length;
//           const estimatedTxSize = 300 + scriptSize; // Base tx size + script
//           const estimatedFee = Math.max(1, Math.ceil((estimatedTxSize / 1000) * currentFeeRate));
          
//           console.log(`Chunk ${i + 1} - Script size: ${scriptSize}, Est. fee: ${estimatedFee} sats`);
          
//           // Select UTXOs for the fee
//           const { selected, total } = utxoManager.selectUTXOs(estimatedFee);
          
//           if (selected.length === 0) {
//             throw new Error(`Insufficient funds for chunk ${i + 1}. Need ${estimatedFee} sats.`);
//           }
          
//           // Create transaction
//           const tx = new Transaction();
          
//           // Add inputs
//           let totalInput = 0;
//           for (const utxo of selected) {
//             const txid = utxo.tx_hash || utxo.txid;
//             const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//             const satoshis = utxo.value || utxo.satoshis || 0;
            
//             totalInput += satoshis;
            
//             // Create source transaction
//             const sourceTransaction = {
//               id: txid,
//               version: 1,
//               inputs: [],
//               outputs: [{
//                 satoshis: satoshis,
//                 lockingScript: new P2PKH().lock(address)
//               }],
//               lockTime: 0
//             };
            
//             // If vout is not 0, we need to adjust the outputs array
//             if (vout > 0) {
//               sourceTransaction.outputs = [];
//               for (let j = 0; j <= vout; j++) {
//                 sourceTransaction.outputs[j] = {
//                   satoshis: j === vout ? satoshis : 0,
//                   lockingScript: new P2PKH().lock(address)
//                 };
//               }
//             }
            
//             tx.addInput({
//               sourceTXID: txid,
//               sourceOutputIndex: vout,
//               unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//               sourceTransaction: sourceTransaction
//             });
//           }
          
//           console.log(`Chunk ${i + 1} - Total input: ${totalInput} sats`);
          
//           // Add OP_RETURN output (0 sats)
//           tx.addOutput({
//             lockingScript: script,
//             satoshis: 0
//           });
          
//           // Add change output if needed
//           const change = totalInput - estimatedFee;
//           if (change > 0) {
//             tx.addOutput({
//               lockingScript: new P2PKH().lock(address),
//               satoshis: change
//             });
//             console.log(`Chunk ${i + 1} - Change: ${change} sats`);
//           }
          
//           // Sign and broadcast
//           await tx.sign();
//           const txHex = tx.toHex();
//           const finalSize = txHex.length / 2;
//           console.log(`Chunk ${i + 1} - Final tx size: ${finalSize} bytes`);
          
//           const broadcastService = new BroadcastService(network);
//           const result = await broadcastService.broadcast(txHex);
          
//           if (!result.success || !result.txid) {
//             console.error(`Failed to broadcast chunk ${i + 1}:`, result.error);
//             throw new Error(`Failed to broadcast chunk ${i + 1}: ${result.error || 'Unknown error'}`);
//           }
          
//           console.log(`Chunk ${i + 1} broadcast successfully: ${result.txid}`);
//           txids.push(result.txid);
          
//           // Mark UTXOs as spent
//           utxoManager.markAsSpent(selected);
          
//           // Wait between chunks to avoid rate limiting
//           if (i < chunks.length - 1) {
//             await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds between chunks
//           }
          
//         } catch (chunkError) {
//           console.error(`Error processing chunk ${i + 1}:`, chunkError);
//           throw new Error(`Failed to process chunk ${i + 1}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`);
//         }
//       }
      
//       return txids;
      
//     } catch (error) {
//       console.error('Error in createBCATTransactions:', error);
//       throw error;
//     } finally {
//       setUploadingChunks(false);
//     }
//   };

//   // Create the main inscription with BCAT reference
//   const createLargeProfileOrdinal = async () => {
//     if (!largeProfileFile || !largeProfileThumbnail || !keyData.privateKey) {
//       setStatus({ type: 'error', message: 'Missing required data' });
//       return;
//     }
    
//     setLoading(true);
    
//     try {
//       // First, upload all chunks
//       setStatus({ type: 'info', message: 'Uploading file chunks...' });
//       const chunkTxIds = await createBCATTransactions();
//       setBcatTransactionIds(chunkTxIds);
      
//       setStatus({ type: 'info', message: 'Creating main inscription with BCAT reference...' });
      
//       // Create the main inscription with thumbnail and BCAT reference
//       const thumbnailData = largeProfileThumbnail.split(',')[1]; // Remove data URL prefix
//       const thumbnailBytes = Utils.toArray(thumbnailData, 'base64');
      
//       // Get UTXOs
//       const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//       const utxos = await utxoManager.fetchUTXOs(true);
      
//       const { selected, total } = utxoManager.selectUTXOs(2000);
      
//       if (selected.length === 0) {
//         throw new Error('Insufficient funds for main inscription');
//       }
      
//       const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//       const pubKeyHash = privateKey.toPublicKey().toHash();
//       const address = privateKey.toPublicKey().toAddress();
      
//       // Create inscription script with thumbnail
//       const inscriptionScript = createInscriptionScript(
//         pubKeyHash,
//         'image/jpeg',
//         thumbnailBytes
//       );
      
//       // Create transaction
//       const tx = new Transaction();
      
//       // Add inputs
//       let totalInput = 0;
//       for (const utxo of selected) {
//         const txid = utxo.tx_hash || utxo.txid;
//         const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//         const satoshis = utxo.value || utxo.satoshis || 0;
        
//         totalInput += satoshis;
        
//         // Create source transaction
//         const sourceTransaction = {
//           id: txid,
//           version: 1,
//           inputs: [],
//           outputs: [{
//             satoshis: satoshis,
//             lockingScript: new P2PKH().lock(address)
//           }],
//           lockTime: 0
//         };
        
//         // If vout is not 0, adjust outputs array
//         if (vout > 0) {
//           sourceTransaction.outputs = [];
//           for (let j = 0; j <= vout; j++) {
//             sourceTransaction.outputs[j] = {
//               satoshis: j === vout ? satoshis : 0,
//               lockingScript: new P2PKH().lock(address)
//             };
//           }
//         }
        
//         tx.addInput({
//           sourceTXID: txid,
//           sourceOutputIndex: vout,
//           unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//           sourceTransaction: sourceTransaction
//         });
//       }
      
//       // Output 1: Inscription (1 sat)
//       tx.addOutput({
//         lockingScript: inscriptionScript,
//         satoshis: 1
//       });
      
//       // Output 2: BCAT reference in OP_RETURN
//       let bcatScriptArray: number[] = [];
      
//       // OP_RETURN
//       bcatScriptArray.push(0x6a);
      
//       // BCAT prefix
//       const bcatPrefixBytes = Utils.toArray('BCAT', 'utf8');
//       bcatScriptArray.push(bcatPrefixBytes.length);
//       bcatScriptArray = bcatScriptArray.concat(bcatPrefixBytes);
      
//       // Add each chunk transaction ID
//       for (const txid of chunkTxIds) {
//         const txidBytes = Utils.toArray(txid, 'hex').reverse(); // Reverse for little-endian
//         bcatScriptArray.push(32); // Push 32 bytes
//         bcatScriptArray = bcatScriptArray.concat(txidBytes);
//       }
      
//       // Add metadata
//       const metadata = {
//         filename: largeProfileFile.name,
//         size: largeProfileFile.size,
//         type: largeProfileFile.type,
//         chunks: chunkTxIds.length
//       };
//       const metadataStr = JSON.stringify(metadata);
//       const metadataBytes = Utils.toArray(metadataStr, 'utf8');
      
//       if (metadataBytes.length <= 75) {
//         bcatScriptArray.push(metadataBytes.length);
//       } else {
//         bcatScriptArray.push(0x4c); // OP_PUSHDATA1
//         bcatScriptArray.push(metadataBytes.length);
//       }
//       bcatScriptArray = bcatScriptArray.concat(metadataBytes);
      
//       const bcatScript = new Script();
//       bcatScript.writeBin(bcatScriptArray);
      
//       tx.addOutput({
//         lockingScript: bcatScript,
//         satoshis: 0
//       });
      
//       // Output 3: Change
//       const estimatedFee = 500; // Rough estimate
//       const change = totalInput - 1 - estimatedFee;
      
//       if (change > 0) {
//         tx.addOutput({
//           lockingScript: new P2PKH().lock(address),
//           satoshis: change
//         });
//       }
      
//       // Sign and broadcast
//       await tx.sign();
//       const txHex = tx.toHex();
//       const broadcastService = new BroadcastService(network);
//       const result = await broadcastService.broadcast(txHex);
      
//       if (result.success) {
//         setLastTxid(result.txid!);
//         setLastTransactionTime(Date.now());
//         setStatus({ 
//           type: 'success', 
//           message: `Large profile created! Main TX: ${result.txid}\nBCAT chunks: ${chunkTxIds.length}` 
//         });
        
//         // Clear form
//         setLargeProfileFile(null);
//         setLargeProfileThumbnail('');
//         setBcatTransactionIds([]);
        
//         // Trigger refresh of view tab
//         setRefreshTrigger(prev => prev + 1);
//       } else {
//         throw new Error(result.error);
//       }
      
//     } catch (error) {
//       console.error('Error creating large profile:', error);
//       setStatus({ 
//         type: 'error', 
//         message: error instanceof Error ? error.message : 'Failed to create large profile' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isDisabled = loading || !keyData.privateKey || !largeProfileFile || uploadingChunks ||
//     (Date.now() - lastTransactionTime < 5000);

//   return (
//     <div className="space-y-4">
//       {/* Tab Navigation */}
//       <div className="flex gap-2 border-b border-gray-600">
//         <button
//           onClick={() => setActiveTab('create')}
//           className={`px-4 py-2 font-medium transition-all ${
//             activeTab === 'create'
//               ? 'text-purple-400 border-b-2 border-purple-400'
//               : 'text-gray-400 hover:text-gray-300'
//           }`}
//         >
//           📤 Create Inscription
//         </button>
//         <button
//           onClick={() => setActiveTab('view')}
//           className={`px-4 py-2 font-medium transition-all ${
//             activeTab === 'view'
//               ? 'text-purple-400 border-b-2 border-purple-400'
//               : 'text-gray-400 hover:text-gray-300'
//           }`}
//         >
//           📦 View Inscriptions
//         </button>
//       </div>

//       {/* Tab Content */}
//       {activeTab === 'create' ? (
//         <>
//           <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
//             <p className="text-sm text-yellow-300">
//               📦 Large Profile uses BCAT protocol to store files over 10MB across multiple transactions.
//             </p>
//             <p className="text-xs text-yellow-200 mt-1">
//               Current chunk size: {CHUNK_SIZE_MB}MB per chunk
//             </p>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-300 mb-2">Upload Large File</label>
//             <input
//               type="file"
//               onChange={handleLargeFileSelect}
//               className="hidden"
//               id="large-file-upload"
//               disabled={uploadingChunks || loading}
//             />
//             <label
//               htmlFor="large-file-upload"
//               className={`block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors ${
//                 (uploadingChunks || loading) ? 'opacity-50 cursor-not-allowed' : ''
//               }`}
//             >
//               {largeProfileFile ? (
//                 <div className="text-center">
//                   {largeProfileThumbnail && (
//                     <img 
//                       src={largeProfileThumbnail} 
//                       alt="Thumbnail" 
//                       className="w-32 h-32 mx-auto rounded mb-3 object-cover"
//                     />
//                   )}
//                   <p className="text-sm font-medium text-white">{largeProfileFile.name}</p>
//                   <p className="text-sm text-gray-400 mt-1">
//                     Size: {(largeProfileFile.size / (1024 * 1024)).toFixed(2)}MB
//                   </p>
//                   <p className="text-xs text-purple-400 mt-2">
//                     Will be split into {Math.ceil(largeProfileFile.size / CHUNK_SIZE_BYTES)} chunks of {CHUNK_SIZE_MB}MB each
//                   </p>
//                 </div>
//               ) : (
//                 <div className="text-center">
//                   <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//                   </svg>
//                   <p className="text-gray-400">Drop large file here or click to upload</p>
//                   <p className="text-xs text-gray-500 mt-1">No size limit - uses BCAT protocol</p>
//                 </div>
//               )}
//             </label>
//           </div>

//           {/* Progress indicator */}
//           {uploadingChunks && chunkProgress.total > 0 && (
//             <div className="p-4 bg-gray-800 rounded-lg">
//               <p className="text-sm text-gray-300 mb-2">
//                 Uploading chunk {chunkProgress.current} of {chunkProgress.total}
//               </p>
//               <div className="w-full bg-gray-700 rounded-full h-2">
//                 <div 
//                   className="bg-purple-500 h-2 rounded-full transition-all"
//                   style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
//                 />
//               </div>
//             </div>
//           )}

//           {/* BCAT transaction list */}
//           {bcatTransactionIds.length > 0 && (
//             <div className="p-3 bg-gray-800 rounded-lg">
//               <p className="text-sm font-medium text-gray-300 mb-2">BCAT Chunk Transactions:</p>
//               <div className="space-y-1 max-h-32 overflow-y-auto">
//                 {bcatTransactionIds.map((txid, index) => (
//                   <div key={txid} className="flex items-center justify-between text-xs">
//                     <span className="text-gray-400">Chunk {index + 1}:</span>
//                     <a 
//                       href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="text-blue-400 hover:text-blue-300 font-mono"
//                     >
//                       {txid.substring(0, 16)}...
//                     </a>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           <button
//             onClick={createLargeProfileOrdinal}
//             disabled={isDisabled}
//             className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {loading ? 'Creating Large Profile...' : 
//              uploadingChunks ? `Uploading Chunks (${chunkProgress.current}/${chunkProgress.total})...` :
//              (Date.now() - lastTransactionTime < 5000) ? 
//               `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...` :
//               'Create Large Profile with BCAT'}
//           </button>

//           <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//             <h4 className="text-sm font-medium text-blue-300 mb-1">How BCAT Works:</h4>
//             <ul className="text-xs text-gray-300 space-y-1">
//               <li>• Large files are split into {CHUNK_SIZE_MB}MB chunks</li>
//               <li>• Each chunk is stored in a separate transaction</li>
//               <li>• Main inscription contains thumbnail + BCAT references</li>
//               <li>• Files can be reassembled using the transaction IDs</li>
//               <li>• No file size limit - perfect for videos, archives, etc.</li>
//               <li>• Requires more satoshis for multiple transactions</li>
//             </ul>
//           </div>
//         </>
//       ) : (
//         <LargeProfileInscriptionList
//           keyData={keyData}
//           network={network}
//           whatsOnChainApiKey={whatsOnChainApiKey}
//           refreshTrigger={refreshTrigger}
//         />
//       )}
//     </div>
//   );
// };
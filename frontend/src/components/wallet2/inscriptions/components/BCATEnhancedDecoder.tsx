import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Utils } from '@bsv/sdk';
import { BCATCache } from './BCATStorage';
import { FileTypeHandler } from './BCATFileHandlers';

interface BCATDecoderProps {
  bcatTxId: string;
  chunkTxIds: string[];
  metadata: {
    filename: string;
    mimeType: string;
    charset?: string | null;
    flag?: string | null;
    info?: string;
    chunks: number;
  };
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
}

interface ChunkStatus {
  index: number;
  txid: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  size?: number;
  error?: string;
  attempts: number;
  data?: Uint8Array;
}

const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

export const BCATEnhancedDecoder: React.FC<BCATDecoderProps> = ({
  bcatTxId,
  chunkTxIds,
  metadata,
  network,
  whatsOnChainApiKey
}) => {
  // State management
  const [reconstructing, setReconstructing] = useState(false);
  const [chunkStatuses, setChunkStatuses] = useState<ChunkStatus[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string>('');
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewType, setPreviewType] = useState<string>('');
  
  // Advanced features
  const [useCache, setUseCache] = useState(true);
  const [parallelDownloads, setParallelDownloads] = useState(3);
  const [retryFailed, setRetryFailed] = useState(true);
  const [verifyIntegrity, setVerifyIntegrity] = useState(true);
  
  // Services
  const cache = useMemo(() => new BCATCache(), []);
  const fileHandler = useMemo(() => new FileTypeHandler(), []);
  
  // Initialize chunk statuses
  useEffect(() => {
    const statuses: ChunkStatus[] = chunkTxIds.map((txid, index) => ({
      index,
      txid,
      status: 'pending',
      attempts: 0
    }));
    setChunkStatuses(statuses);
  }, [chunkTxIds]);

  // Check cache first
  const checkCache = useCallback(async () => {
    if (!useCache) return null;
    
    const cached = cache.get(bcatTxId);
    if (cached) {
      console.log('File found in cache');
      setFileBlob(cached);
      await handlePreview(cached);
      return cached;
    }
    return null;
  }, [bcatTxId, cache, useCache]);

  // Extract chunk with multiple fallback methods
  const extractChunkWithFallbacks = async (
    txid: string,
    chunkIndex: number,
    attempt: number = 1
  ): Promise<Uint8Array> => {
    const methods = [
      () => extractChunkViaWhatsOnChain(txid, chunkIndex),
      () => extractChunkViaGorillaPool(txid, chunkIndex),
      () => extractChunkViaTaal(txid, chunkIndex),
      () => extractChunkViaPublicNode(txid, chunkIndex)
    ];
    
    let lastError: Error | null = null;
    
    for (const method of methods) {
      try {
        console.log(`Attempting method ${methods.indexOf(method) + 1} for chunk ${chunkIndex + 1}`);
        const data = await method();
        if (data && data.length > 0) {
          return data;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Method failed for chunk ${chunkIndex + 1}:`, error);
      }
    }
    
    throw lastError || new Error(`All methods failed for chunk ${chunkIndex + 1}`);
  };

  // WhatsOnChain extraction
  const extractChunkViaWhatsOnChain = async (
    txid: string,
    chunkIndex: number
  ): Promise<Uint8Array> => {
    const headers: any = {};
    if (whatsOnChainApiKey) {
      headers['woc-api-key'] = whatsOnChainApiKey;
    }
    
    const response = await fetch(
      `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${txid}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`WhatsOnChain API error: ${response.status}`);
    }
    
    const txData = await response.json();
    
    // Find OP_RETURN output
    const opReturnOutput = txData.vout.find((out: any) => 
      out.value === 0 && out.scriptPubKey?.asm?.startsWith('OP_RETURN')
    );
    
    if (!opReturnOutput) {
      throw new Error('No OP_RETURN output found');
    }
    
    // Parse ASM to extract data
    const asm = opReturnOutput.scriptPubKey.asm;
    const parts = asm.split(' ');
    
    if (parts.length >= 3 && parts[0] === 'OP_RETURN') {
      const dataHex = parts[2]; // Assuming namespace is parts[1], data is parts[2]
      
      // Check if data is truncated
      if (dataHex.length >= 200000) { // ~100KB in hex
        console.warn(`Data appears truncated at ${dataHex.length / 2} bytes`);
        throw new Error('Data truncated by API');
      }
      
      // Convert to Uint8Array
      const data = new Uint8Array(dataHex.length / 2);
      for (let i = 0; i < dataHex.length; i += 2) {
        data[i / 2] = parseInt(dataHex.substr(i, 2), 16);
      }
      
      return data;
    }
    
    throw new Error('Invalid OP_RETURN structure');
  };

  // GorillaPool extraction
  const extractChunkViaGorillaPool = async (
    txid: string,
    chunkIndex: number
  ): Promise<Uint8Array> => {
    // GorillaPool API endpoint
    const response = await fetch(
      `https://api.gorillapool.io/v1/transaction/${txid}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!response.ok) {
      throw new Error(`GorillaPool API error: ${response.status}`);
    }
    
    const txData = await response.json();
    // Parse transaction data similar to WhatsOnChain
    // ... implementation
    
    throw new Error('GorillaPool extraction not yet implemented');
  };

  // Taal extraction
  const extractChunkViaTaal = async (
    txid: string,
    chunkIndex: number
  ): Promise<Uint8Array> => {
    // Taal API endpoint
    const response = await fetch(
      `https://api.taal.com/api/v1/transactions/${txid}`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) {
      throw new Error(`Taal API error: ${response.status}`);
    }
    
    const txData = await response.json();
    // Parse transaction data
    // ... implementation
    
    throw new Error('Taal extraction not yet implemented');
  };

  // Public node extraction
  const extractChunkViaPublicNode = async (
    txid: string,
    chunkIndex: number
  ): Promise<Uint8Array> => {
    // Try public BSV nodes
    const nodes = [
      'https://api.mattercloud.net',
      'https://api.bitindex.network'
    ];
    
    for (const node of nodes) {
      try {
        const response = await fetch(`${node}/api/v1/tx/${txid}`);
        if (response.ok) {
          const txData = await response.json();
          // Parse transaction data
          // ... implementation
        }
      } catch (error) {
        console.warn(`Node ${node} failed:`, error);
      }
    }
    
    throw new Error('Public node extraction failed');
  };

  // Download chunks in parallel with retry
  const downloadChunksParallel = async (
    statuses: ChunkStatus[],
    batchSize: number = 3,
    maxRetries: number = 3
  ): Promise<Uint8Array[]> => {
    const results: Uint8Array[] = new Array(statuses.length);
    const queue = [...statuses];
    
    const downloadChunk = async (status: ChunkStatus): Promise<void> => {
      try {
        // Update status
        setChunkStatuses(prev => prev.map(s => 
          s.index === status.index 
            ? { ...s, status: 'downloading' } 
            : s
        ));
        
        // Download with retries
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const data = await extractChunkWithFallbacks(
              status.txid,
              status.index,
              attempt
            );
            
            results[status.index] = data;
            
            // Update status
            setChunkStatuses(prev => prev.map(s => 
              s.index === status.index 
                ? { ...s, status: 'completed', size: data.length, data } 
                : s
            ));
            
            // Update progress
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            
            return;
            
          } catch (error) {
            lastError = error as Error;
            
            if (attempt < maxRetries && retryFailed) {
              console.log(`Retry ${attempt} for chunk ${status.index + 1}`);
              await new Promise(resolve => 
                setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000))
              );
            }
          }
        }
        
        throw lastError || new Error('Download failed');
        
      } catch (error) {
        // Update status with error
        setChunkStatuses(prev => prev.map(s => 
          s.index === status.index 
            ? { 
                ...s, 
                status: 'failed', 
                error: error instanceof Error ? error.message : 'Unknown error' 
              } 
            : s
        ));
        
        throw error;
      }
    };
    
    // Process queue in parallel batches
    while (queue.length > 0) {
      const batch = queue.splice(0, Math.min(batchSize, queue.length));
      
      await Promise.allSettled(
        batch.map(status => downloadChunk(status))
      );
    }
    
    // Check for failed chunks
    const failed = statuses.filter(s => s.status === 'failed');
    if (failed.length > 0) {
      throw new Error(`${failed.length} chunks failed to download`);
    }
    
    return results;
  };

  // Verify chunk integrity
  const verifyChunkIntegrity = async (
    chunks: Uint8Array[],
    expectedHashes?: string[]
  ): Promise<boolean> => {
    if (!verifyIntegrity || !expectedHashes) return true;
    
    console.log('Verifying chunk integrity...');
    
    for (let i = 0; i < chunks.length; i++) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', chunks[i]);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (expectedHashes[i] && hashHex !== expectedHashes[i]) {
        throw new Error(`Chunk ${i + 1} integrity check failed`);
      }
    }
    
    console.log('All chunks verified successfully');
    return true;
  };

  // Handle decompression
  const decompressData = async (
    data: Uint8Array,
    compression: string
  ): Promise<Uint8Array> => {
    if (compression === 'gzip') {
      const decompressionStream = new DecompressionStream('gzip');
      const writer = decompressionStream.writable.getWriter();
      writer.write(data);
      writer.close();
      
      const reader = decompressionStream.readable.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    }
    
    return data;
  };

  // Handle file preview
  const handlePreview = async (blob: Blob): Promise<void> => {
    const mimeType = blob.type || metadata.mimeType;
    
    if (mimeType.startsWith('image/')) {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType('image');
    } else if (mimeType.startsWith('video/')) {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType('video');
    } else if (mimeType.startsWith('audio/')) {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType('audio');
    } else if (mimeType === 'application/pdf') {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType('pdf');
    } else if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      const text = await blob.text();
      setPreviewUrl(text);
      setPreviewType('text');
    } else if (mimeType.includes('gltf')) {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType('3d');
    } else {
      setPreviewType('download');
    }
  };

  // Main reconstruction function
  const reconstructFile = async () => {
    setReconstructing(true);
    setError('');
    setProgress({ current: 0, total: chunkTxIds.length });
    
    try {
      // Check cache first
      const cached = await checkCache();
      if (cached) {
        setReconstructing(false);
        return;
      }
      
      // Download chunks in parallel
      console.log(`Downloading ${chunkTxIds.length} chunks...`);
      const chunks = await downloadChunksParallel(
        chunkStatuses,
        parallelDownloads
      );
      
      // Verify integrity if enabled
      if (verifyIntegrity) {
        await verifyChunkIntegrity(chunks);
      }
      
      // Combine chunks
      console.log('Combining chunks...');
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Handle decompression if needed
      let finalData = combined;
      if (metadata.flag && metadata.flag !== 'none') {
        console.log(`Decompressing with ${metadata.flag}...`);
        finalData = await decompressData(combined, metadata.flag);
      }
      
      // Create blob
      const mimeType = metadata.mimeType || 'application/octet-stream';
      const blob = new Blob([finalData], { type: mimeType });
      setFileBlob(blob);
      
      // Cache the result
      if (useCache) {
        await cache.set(bcatTxId, blob, metadata);
      }
      
      // Generate preview
      await handlePreview(blob);
      
      console.log('File reconstructed successfully');
      
    } catch (error) {
      console.error('Reconstruction failed:', error);
      setError(error instanceof Error ? error.message : 'Reconstruction failed');
    } finally {
      setReconstructing(false);
    }
  };

  // Download file
  const downloadFile = () => {
    if (!fileBlob) return;
    
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = metadata.filename || `bcat-${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Retry failed chunks
  const retryFailedChunks = async () => {
    const failed = chunkStatuses.filter(s => s.status === 'failed');
    if (failed.length === 0) return;
    
    console.log(`Retrying ${failed.length} failed chunks...`);
    
    // Reset failed chunks to pending
    setChunkStatuses(prev => prev.map(s => 
      s.status === 'failed' 
        ? { ...s, status: 'pending', error: undefined } 
        : s
    ));
    
    // Re-download
    await downloadChunksParallel(failed, parallelDownloads);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewType !== 'text') {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, previewType]);

  return (
    <div className="space-y-4">
      {/* Settings Panel */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Decoder Settings</h4>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useCache}
              onChange={(e) => setUseCache(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-400">Use Cache</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={verifyIntegrity}
              onChange={(e) => setVerifyIntegrity(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-400">Verify Integrity</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={retryFailed}
              onChange={(e) => setRetryFailed(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-400">Auto Retry</span>
          </label>
          
          <label className="flex flex-col">
            <span className="text-sm text-gray-400 mb-1">Parallel Downloads</span>
            <input
              type="number"
              min="1"
              max="10"
              value={parallelDownloads}
              onChange={(e) => setParallelDownloads(parseInt(e.target.value))}
              className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white"
            />
          </label>
        </div>
      </div>

      {/* File Info */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-3">File Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Filename:</span>
            <p className="text-white break-all">{metadata.filename}</p>
          </div>
          <div>
            <span className="text-gray-400">Type:</span>
            <p className="text-white">{metadata.mimeType}</p>
          </div>
          <div>
            <span className="text-gray-400">Chunks:</span>
            <p className="text-white">{metadata.chunks}</p>
          </div>
          <div>
            <span className="text-gray-400">Compression:</span>
            <p className="text-white">{metadata.flag || 'None'}</p>
          </div>
        </div>
      </div>

      {/* Chunk Status Grid */}
      {chunkStatuses.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            Chunk Status ({chunkStatuses.filter(s => s.status === 'completed').length}/{chunkStatuses.length})
          </h4>
          <div className="grid grid-cols-10 gap-1">
            {chunkStatuses.map((status) => (
              <div
                key={status.index}
                className={`
                  w-8 h-8 rounded flex items-center justify-center text-xs font-medium
                  ${status.status === 'completed' ? 'bg-green-600' :
                    status.status === 'downloading' ? 'bg-blue-600 animate-pulse' :
                    status.status === 'failed' ? 'bg-red-600' :
                    'bg-gray-700'}
                `}
                title={`Chunk ${status.index + 1}: ${status.status}${
                  status.size ? ` (${(status.size / 1024).toFixed(1)}KB)` : ''
                }${status.error ? ` - ${status.error}` : ''}`}
              >
                {status.index + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={reconstructFile}
          disabled={reconstructing}
          className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reconstructing ? 
            `Reconstructing... ${progress.current}/${progress.total}` : 
            '🔨 Reconstruct File'}
        </button>
        
        {fileBlob && (
          <button
            onClick={downloadFile}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            💾 Download
          </button>
        )}
        
        {chunkStatuses.some(s => s.status === 'failed') && (
          <button
            onClick={retryFailedChunks}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
          >
            🔄 Retry Failed
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {reconstructing && progress.total > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Processing chunks...</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
          <p className="text-sm text-red-300 whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* Preview Area */}
      {previewUrl && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Preview</h4>
          
          {previewType === 'image' && (
            <img 
              src={previewUrl} 
              alt={metadata.filename}
              className="max-w-full max-h-96 rounded mx-auto"
            />
          )}
          
          {previewType === 'video' && (
            <video 
              controls 
              className="max-w-full max-h-96 rounded mx-auto"
              src={previewUrl}
            />
          )}
          
          {previewType === 'audio' && (
            <audio 
              controls 
              className="w-full"
              src={previewUrl}
            />
          )}
          
          {previewType === 'pdf' && (
            <iframe
              src={previewUrl}
              className="w-full h-96 rounded"
              title="PDF Preview"
            />
          )}
          
          {previewType === 'text' && (
            <div className="bg-gray-900 rounded p-3 max-h-96 overflow-y-auto">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap">
                {previewUrl}
              </pre>
            </div>
          )}
          
          {previewType === '3d' && (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-3">3D model ready</p>
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Open 3D Viewer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cache Stats */}
      {useCache && (
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Cache: {cache.getStats().items} items</span>
            <span>{(cache.getStats().size / (1024 * 1024)).toFixed(1)}MB / {(cache.getStats().maxSize / (1024 * 1024)).toFixed(0)}MB</span>
            <button
              onClick={() => cache.clear()}
              className="text-red-400 hover:text-red-300"
            >
              Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
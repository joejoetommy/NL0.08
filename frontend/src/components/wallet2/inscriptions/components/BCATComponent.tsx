import React, { useState, useEffect } from 'react';
import { BCATUploadManager } from './BCATUploadManager';
import { BCATEnhancedDecoder } from './BCATEnhancedDecoder';
import { BCATTestSuite } from './BCATTestSuite';
import { BCATSessionManager } from './BCATStorage';

interface UploadSession {
  sessionId: string;
  fileHash: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused';
  completedChunks: number;
  totalChunks: number;
  mainTxId?: string;
  timestamp: number;
}

export const BCATManager: React.FC<{ keyData: any; network: string }> = ({ 
  keyData, 
  network 
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'decode' | 'sessions' | 'test'>('upload');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, phase: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; txid?: string; error?: string } | null>(null);
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [decodeTxId, setDecodeTxId] = useState('');
  
  // Settings
  const [settings, setSettings] = useState({
    parallelUploads: 3,
    autoRetry: true,
    chunkSize: 95 * 1024, // 95KB default
    useCache: true,
    verifyIntegrity: true
  });

  const uploadManager = new BCATUploadManager(
    keyData,
    network as 'mainnet' | 'testnet',
    undefined,
    1,
    settings
  );

  const sessionManager = new BCATSessionManager();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const allSessions = await sessionManager.getAllSessions();
    setSessions(allSessions);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleFileUpload = async (file: File) => {
    setUploadResult(null);
    
    const result = await uploadManager.uploadLargeFile(
      file,
      (current, total, phase) => setUploadProgress({ current, total, phase })
    );
    
    setUploadResult(result);
    
    if (result.success) {
      console.log('Upload successful:', result.txid);
      await loadSessions(); // Refresh sessions
      setSelectedFile(null);
    } else {
      console.error('Upload failed:', result.error);
    }
  };

  const handleResumeUpload = async (sessionId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;

    const result = await uploadManager.resumeSession(
      session.fileHash,
      (current, total, phase) => setUploadProgress({ current, total, phase })
    );

    setUploadResult(result);
    await loadSessions();
  };

  const handleDeleteSession = async (fileHash: string) => {
    await sessionManager.deleteSession(fileHash);
    await loadSessions();
  };

  const handleClearSessions = async () => {
    if (confirm('Clear all completed sessions?')) {
      for (const session of sessions) {
        if (session.status === 'completed') {
          await sessionManager.deleteSession(session.fileHash);
        }
      }
      await loadSessions();
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-600">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'upload' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'
          }`}
        >
          📤 Upload
        </button>
        <button
          onClick={() => setActiveTab('decode')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'decode' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'
          }`}
        >
          📥 Decode
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'sessions' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'
          }`}
        >
          📝 Sessions
          {sessions.filter(s => s.status !== 'completed').length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">
              {sessions.filter(s => s.status !== 'completed').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'test' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'
          }`}
        >
          🧪 Test
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          {/* Settings Panel */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Upload Settings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoRetry}
                  onChange={(e) => setSettings({ ...settings, autoRetry: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-400">Auto Retry</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.verifyIntegrity}
                  onChange={(e) => setSettings({ ...settings, verifyIntegrity: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-400">Verify Integrity</span>
              </label>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-400">Parallel:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.parallelUploads}
                  onChange={(e) => setSettings({ ...settings, parallelUploads: parseInt(e.target.value) })}
                  className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-400">Chunk:</label>
                <select
                  value={settings.chunkSize}
                  onChange={(e) => setSettings({ ...settings, chunkSize: parseInt(e.target.value) })}
                  className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white"
                >
                  <option value={50 * 1024}>50KB</option>
                  <option value={75 * 1024}>75KB</option>
                  <option value={95 * 1024}>95KB</option>
                  <option value={100 * 1024}>100KB</option>
                  <option value={200 * 1024}>200KB</option>
                </select>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div>
            <label 
              htmlFor="file-upload"
              className="block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
            >
              <input
                id="file-upload"
                type="file"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-purple-900 rounded-lg flex items-center justify-center">
                    <span className="text-3xl">📄</span>
                  </div>
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p className="text-purple-400 text-xs mt-2">
                    Will be split into {Math.ceil(selectedFile.size / settings.chunkSize)} chunks
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-400">Drop file here or click to browse</p>
                  <p className="text-xs text-gray-500 mt-1">Any file type, any size</p>
                </div>
              )}
            </label>
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <button
              onClick={() => handleFileUpload(selectedFile)}
              disabled={uploadProgress.phase !== ''}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
            >
              {uploadProgress.phase ? 'Uploading...' : 'Start Upload'}
            </button>
          )}

          {/* Progress Display */}
          {uploadProgress.phase && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-300">{uploadProgress.phase}</p>
                <span className="text-xs text-gray-400">
                  {uploadProgress.current}/{uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress.total ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Result Display */}
          {uploadResult && (
            <div className={`p-4 rounded-lg ${
              uploadResult.success ? 'bg-green-900 bg-opacity-30 border border-green-700' : 'bg-red-900 bg-opacity-30 border border-red-700'
            }`}>
              {uploadResult.success ? (
                <>
                  <p className="text-green-300 font-medium mb-2">✅ Upload Successful!</p>
                  <a
                    href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${uploadResult.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View Transaction: {uploadResult.txid}
                  </a>
                </>
              ) : (
                <>
                  <p className="text-red-300 font-medium mb-2">❌ Upload Failed</p>
                  <p className="text-red-200 text-sm">{uploadResult.error}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Decode Tab */}
      {activeTab === 'decode' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={decodeTxId}
              onChange={(e) => setDecodeTxId(e.target.value)}
              placeholder="Enter BCAT transaction ID..."
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400"
            />
            <button
              onClick={() => {/* Trigger decode */}}
              className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium"
            >
              Decode
            </button>
          </div>
          
          {decodeTxId && (
            <BCATEnhancedDecoder
              bcatTxId={decodeTxId}
              network={network as 'mainnet' | 'testnet'}
              settings={settings}
            />
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Upload Sessions</h3>
            <div className="flex gap-2">
              <button
                onClick={loadSessions}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleClearSessions}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
              >
                Clear Completed
              </button>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No upload sessions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.sessionId} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{session.fileName}</h4>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                        <span>{(session.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>•</span>
                        <span>{session.completedChunks}/{session.totalChunks} chunks</span>
                        <span>•</span>
                        <span className={`font-medium ${
                          session.status === 'completed' ? 'text-green-400' :
                          session.status === 'failed' ? 'text-red-400' :
                          session.status === 'uploading' ? 'text-blue-400' :
                          'text-yellow-400'
                        }`}>
                          {session.status.toUpperCase()}
                        </span>
                      </div>
                      {session.mainTxId && (
                        <a
                          href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${session.mainTxId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                        >
                          TX: {session.mainTxId.substring(0, 16)}...
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {session.status !== 'completed' && (
                        <button
                          onClick={() => handleResumeUpload(session.sessionId)}
                          className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSession(session.fileHash)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {session.status !== 'completed' && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-700 rounded-full h-1">
                        <div
                          className="bg-purple-500 h-1 rounded-full"
                          style={{ width: `${(session.completedChunks / session.totalChunks) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <BCATTestSuite 
          network={network as 'mainnet' | 'testnet'}
          onComplete={(result) => {
            if (result.recommendedSize) {
              setSettings({ ...settings, chunkSize: result.recommendedSize });
            }
          }}
        />
      )}
    </div>
  );
};
// import React, { useState } from 'react';
// import { BCATUploadManager } from './BCATUploadManager';
// import { BCATEnhancedDecoder } from './BCATEnhancedDecoder';
// import { BCATTestSuite } from './BCATTestSuite';

// export const BCATManager: React.FC<{ keyData: any; network: string }> = ({ 
//   keyData, 
//   network 
// }) => {
//   const [activeTab, setActiveTab] = useState<'upload' | 'decode' | 'test'>('upload');
//   const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, phase: '' });
  
//   const uploadManager = new BCATUploadManager(
//     keyData,
//     network as 'mainnet' | 'testnet',
//     undefined,
//     1
//   );

//   const handleFileUpload = async (file: File) => {
//     const result = await uploadManager.uploadLargeFile(
//       file,
//       (current, total, phase) => setUploadProgress({ current, total, phase })
//     );
    
//     if (result.success) {
//       console.log('Upload successful:', result.txid);
//     } else {
//       console.error('Upload failed:', result.error);
//     }
//   };

//   return (
//     <div className="space-y-4">
//       {/* Tab Navigation */}
//       <div className="flex gap-2 border-b border-gray-600">
//         <button
//           onClick={() => setActiveTab('upload')}
//           className={`px-4 py-2 ${activeTab === 'upload' ? 'border-b-2 border-purple-400' : ''}`}
//         >
//           Upload
//         </button>
//         <button
//           onClick={() => setActiveTab('decode')}
//           className={`px-4 py-2 ${activeTab === 'decode' ? 'border-b-2 border-purple-400' : ''}`}
//         >
//           Decode
//         </button>
//         <button
//           onClick={() => setActiveTab('test')}
//           className={`px-4 py-2 ${activeTab === 'test' ? 'border-b-2 border-purple-400' : ''}`}
//         >
//           Test Suite
//         </button>
//       </div>

//       {/* Content */}
//       {activeTab === 'upload' && (
//         <div>
//           <input
//             type="file"
//             onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
//           />
//           {uploadProgress.phase && (
//             <div className="mt-4">
//               <p>{uploadProgress.phase}</p>
//               <div className="w-full bg-gray-700 rounded-full h-2">
//                 <div 
//                   className="bg-purple-500 h-2 rounded-full"
//                   style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
//                 />
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === 'test' && (
//         <BCATTestSuite network={network as any} />
//       )}
//     </div>
//   );
// };
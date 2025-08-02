import React, { useState } from 'react';

interface InscriptionLargeProfileViewProps {
  content: any;
  timestamp: Date;
  txid: string;
  size: number;
  network: 'mainnet' | 'testnet';
  bcatInfo?: {
    chunks: string[];
    metadata: any;
  };
}

export const InscriptionLargeProfileView: React.FC<InscriptionLargeProfileViewProps> = ({
  content,
  timestamp,
  txid,
  size,
  network,
  bcatInfo
}) => {
  const [showChunks, setShowChunks] = useState(false);

  return (
    <div className="space-y-4">
      {/* BCAT Info */}
      <div className="p-3 rounded-lg bg-purple-900 bg-opacity-50">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">
            📦 Large Profile - BCAT Protocol
          </p>
          <span className="text-xs px-2 py-1 rounded bg-purple-600 text-white">
            {bcatInfo?.chunks.length || 0} chunks
          </span>
        </div>
        <p className="text-xs text-gray-300 mt-1">
          Large file stored across multiple transactions
        </p>
      </div>

      {/* Thumbnail Display */}
      {content && (
        <div className="bg-gray-900 p-4 rounded">
          <p className="text-sm text-gray-400 mb-2">Thumbnail Preview</p>
          <div className="flex justify-center">
            <img 
              src={content} 
              alt="Thumbnail" 
              className="max-w-full max-h-64 rounded object-contain"
            />
          </div>
        </div>
      )}

      {/* File Metadata */}
      {bcatInfo?.metadata && (
        <div className="bg-gray-900 p-4 rounded space-y-2">
          <h4 className="text-sm font-medium text-gray-300">File Information</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400 block">Filename:</span>
              <span className="text-gray-300 break-all">{bcatInfo.metadata.filename || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-400 block">File Size:</span>
              <span className="text-gray-300">
                {bcatInfo.metadata.size ? `${(bcatInfo.metadata.size / (1024 * 1024)).toFixed(2)}MB` : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">File Type:</span>
              <span className="text-gray-300">{bcatInfo.metadata.type || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Total Chunks:</span>
              <span className="text-gray-300">{bcatInfo.metadata.chunks || bcatInfo.chunks.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* BCAT Chunks */}
      {bcatInfo?.chunks && bcatInfo.chunks.length > 0 && (
        <div className="bg-gray-900 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-300">BCAT Chunk Transactions</h4>
            <button
              onClick={() => setShowChunks(!showChunks)}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              {showChunks ? 'Hide' : 'Show'} Chunks
            </button>
          </div>
          
          {showChunks && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {bcatInfo.chunks.map((chunkTxid, index) => (
                <div key={chunkTxid} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Chunk {index + 1}:</span>
                  <a
                    href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${chunkTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono"
                  >
                    {chunkTxid.substring(0, 16)}...{chunkTxid.substring(chunkTxid.length - 8)}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="border-t border-gray-700 pt-4 space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400 block">Created:</span>
            <span className="text-gray-300">{timestamp.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Inscription Size:</span>
            <span className="text-gray-300">~{(size / 1024).toFixed(2)}KB</span>
          </div>
          <div>
            <span className="text-gray-400 block">Type:</span>
            <span className="text-gray-300">Large Profile (BCAT)</span>
          </div>
          <div>
            <span className="text-gray-400 block">Protocol:</span>
            <span className="text-gray-300">BCAT</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <a
          href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
        >
          🔍 View Main TX
        </a>
        {bcatInfo?.chunks && bcatInfo.chunks.length > 0 && (
          <button
            onClick={() => {
              const chunkList = bcatInfo.chunks.join('\n');
              navigator.clipboard.writeText(chunkList);
            }}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            📋 Copy Chunk TXIDs
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
        <h4 className="text-xs font-medium text-blue-300 mb-1">About BCAT Inscriptions:</h4>
        <ul className="text-xs text-gray-300 space-y-0.5">
          <li>• Large files are split into multiple transactions</li>
          <li>• Each chunk contains up to 9MB of data</li>
          <li>• Files can be reassembled using chunk transaction IDs</li>
          <li>• Suitable for videos, large images, and archives</li>
        </ul>
      </div>
    </div>
  );
};



// import React, { useState } from 'react';

// interface InscriptionLargeProfileViewProps {
//   content: any;
//   timestamp: Date;
//   txid: string;
//   size: number;
//   network: 'mainnet' | 'testnet';
//   bcatInfo?: {
//     chunks: string[];
//     metadata: any;
//   };
// }

// export const InscriptionLargeProfileView: React.FC<InscriptionLargeProfileViewProps> = ({
//   content,
//   timestamp,
//   txid,
//   size,
//   network,
//   bcatInfo
// }) => {
//   const [showChunks, setShowChunks] = useState(false);

//   return (
//     <div className="space-y-4">
//       {/* BCAT Info */}
//       <div className="p-3 rounded-lg bg-purple-900 bg-opacity-50">
//         <div className="flex items-center justify-between">
//           <p className="text-sm font-medium text-white">
//             📦 Large Profile - BCAT Protocol
//           </p>
//           <span className="text-xs px-2 py-1 rounded bg-purple-600 text-white">
//             {bcatInfo?.chunks.length || 0} chunks
//           </span>
//         </div>
//         <p className="text-xs text-gray-300 mt-1">
//           Large file stored across multiple transactions
//         </p>
//       </div>

//       {/* Thumbnail Display */}
//       {content && (
//         <div className="bg-gray-900 p-4 rounded">
//           <p className="text-sm text-gray-400 mb-2">Thumbnail Preview</p>
//           <div className="flex justify-center">
//             <img 
//               src={content} 
//               alt="Thumbnail" 
//               className="max-w-full max-h-64 rounded object-contain"
//             />
//           </div>
//         </div>
//       )}

//       {/* File Metadata */}
//       {bcatInfo?.metadata && (
//         <div className="bg-gray-900 p-4 rounded space-y-2">
//           <h4 className="text-sm font-medium text-gray-300">File Information</h4>
//           <div className="grid grid-cols-2 gap-2 text-xs">
//             <div>
//               <span className="text-gray-400 block">Filename:</span>
//               <span className="text-gray-300 break-all">{bcatInfo.metadata.filename || 'Unknown'}</span>
//             </div>
//             <div>
//               <span className="text-gray-400 block">File Size:</span>
//               <span className="text-gray-300">
//                 {bcatInfo.metadata.size ? `${(bcatInfo.metadata.size / (1024 * 1024)).toFixed(2)}MB` : 'Unknown'}
//               </span>
//             </div>
//             <div>
//               <span className="text-gray-400 block">File Type:</span>
//               <span className="text-gray-300">{bcatInfo.metadata.type || 'Unknown'}</span>
//             </div>
//             <div>
//               <span className="text-gray-400 block">Total Chunks:</span>
//               <span className="text-gray-300">{bcatInfo.metadata.chunks || bcatInfo.chunks.length}</span>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* BCAT Chunks */}
//       {bcatInfo?.chunks && bcatInfo.chunks.length > 0 && (
//         <div className="bg-gray-900 p-4 rounded">
//           <div className="flex items-center justify-between mb-2">
//             <h4 className="text-sm font-medium text-gray-300">BCAT Chunk Transactions</h4>
//             <button
//               onClick={() => setShowChunks(!showChunks)}
//               className="text-xs text-purple-400 hover:text-purple-300"
//             >
//               {showChunks ? 'Hide' : 'Show'} Chunks
//             </button>
//           </div>
          
//           {showChunks && (
//             <div className="space-y-1 max-h-40 overflow-y-auto">
//               {bcatInfo.chunks.map((chunkTxid, index) => (
//                 <div key={chunkTxid} className="flex items-center justify-between text-xs">
//                   <span className="text-gray-400">Chunk {index + 1}:</span>
//                   <a
//                     href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${chunkTxid}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="text-blue-400 hover:text-blue-300 font-mono"
//                   >
//                     {chunkTxid.substring(0, 16)}...{chunkTxid.substring(chunkTxid.length - 8)}
//                   </a>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       {/* Metadata */}
//       <div className="border-t border-gray-700 pt-4 space-y-2">
//         <div className="grid grid-cols-2 gap-4 text-sm">
//           <div>
//             <span className="text-gray-400 block">Created:</span>
//             <span className="text-gray-300">{timestamp.toLocaleString()}</span>
//           </div>
//           <div>
//             <span className="text-gray-400 block">Inscription Size:</span>
//             <span className="text-gray-300">~{(size / 1024).toFixed(2)}KB</span>
//           </div>
//           <div>
//             <span className="text-gray-400 block">Type:</span>
//             <span className="text-gray-300">Large Profile (BCAT)</span>
//           </div>
//           <div>
//             <span className="text-gray-400 block">Protocol:</span>
//             <span className="text-gray-300">BCAT</span>
//           </div>
//         </div>
//       </div>

//       {/* Actions */}
//       <div className="flex gap-2 flex-wrap">
//         <a
//           href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
//           target="_blank"
//           rel="noopener noreferrer"
//           className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
//         >
//           🔍 View Main TX
//         </a>
//         {bcatInfo?.chunks && bcatInfo.chunks.length > 0 && (
//           <button
//             onClick={() => {
//               const chunkList = bcatInfo.chunks.join('\n');
//               navigator.clipboard.writeText(chunkList);
//             }}
//             className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
//           >
//             📋 Copy Chunk TXIDs
//           </button>
//         )}
//       </div>

//       {/* Info Box */}
//       <div className="p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
//         <h4 className="text-xs font-medium text-blue-300 mb-1">About BCAT Inscriptions:</h4>
//         <ul className="text-xs text-gray-300 space-y-0.5">
//           <li>• Large files are split into multiple transactions</li>
//           <li>• Each chunk contains up to 9MB of data</li>
//           <li>• Files can be reassembled using chunk transaction IDs</li>
//           <li>• Suitable for videos, large images, and archives</li>
//         </ul>
//       </div>
//     </div>
//   );
// };

// // [input.sourceOutputIndex]
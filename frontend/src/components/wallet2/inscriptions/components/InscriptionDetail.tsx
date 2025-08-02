import React from 'react';
import { InscriptionData } from './ViewInscriptions';
import { InscriptionTextView } from './InscriptionTextView';
import { InscriptionImageView } from './InscriptionImageView';
import { InscriptionProfileView } from './InscriptionProfileView';
import { InscriptionLargeProfileView } from './InscriptionLargeProfileView';
import { getEncryptionLevelLabel } from '../utils/BlogEncryption';

interface InscriptionDetailProps {
  inscription: InscriptionData;
  inscriptionContent: any;
  loadingContent: boolean;
  network: 'mainnet' | 'testnet';
  onClose: () => void;
}

export const InscriptionDetail: React.FC<InscriptionDetailProps> = ({
  inscription,
  inscriptionContent,
  loadingContent,
  network,
  onClose
}) => {
  const getInscriptionIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'profile': return '👤';
      case 'profile2': return '🎨';
      case 'largeProfile': return '📦';
      default: return '📄';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg max-w-3xl max-h-[90vh] overflow-auto p-6 w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getInscriptionIcon(inscription.inscriptionType)}</span>
            <div>
              <h3 className="text-xl font-medium text-white">
                {inscription.inscriptionType.charAt(0).toUpperCase() + inscription.inscriptionType.slice(1)} Inscription
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                {inscription.txid.substring(0, 16)}...{inscription.txid.substring(inscription.txid.length - 8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {loadingContent ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="text-gray-300 mt-2">Loading content...</p>
          </div>
        ) : (
          <div>
            {/* Type-specific views */}
            {inscription.inscriptionType === 'text' && (
              <InscriptionTextView
                content={inscriptionContent}
                encrypted={inscription.encrypted}
                encryptionLevel={inscription.encryptionLevel}
                timestamp={inscription.timestamp}
                txid={inscription.txid}
                size={inscription.size}
              />
            )}

            {inscription.inscriptionType === 'image' && (
              <InscriptionImageView
                content={inscriptionContent}
                encrypted={inscription.encrypted}
                encryptionLevel={inscription.encryptionLevel}
                timestamp={inscription.timestamp}
                txid={inscription.txid}
                size={inscription.size}
                network={network}
              />
            )}

            {(inscription.inscriptionType === 'profile' || inscription.inscriptionType === 'profile2') && (
              <InscriptionProfileView
                content={inscriptionContent}
                encrypted={inscription.encrypted}
                encryptionLevel={inscription.encryptionLevel}
                timestamp={inscription.timestamp}
                txid={inscription.txid}
                size={inscription.size}
                isProfile2={inscription.inscriptionType === 'profile2'}
              />
            )}

            {inscription.inscriptionType === 'largeProfile' && (
              <InscriptionLargeProfileView
                content={inscriptionContent}
                timestamp={inscription.timestamp}
                txid={inscription.txid}
                size={inscription.size}
                network={network}
                bcatInfo={inscription.bcatInfo}
              />
            )}

            {/* Transaction Details */}
            <div className="mt-6 border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Transaction Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400 block">Transaction ID:</span>
                  <a
                    href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono text-xs break-all"
                  >
                    {inscription.txid}
                  </a>
                </div>
                <div>
                  <span className="text-gray-400 block">Output:</span>
                  <span className="text-gray-300">{inscription.vout}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Origin:</span>
                  <span className="text-gray-300 font-mono text-xs">{inscription.origin}</span>
                </div>
                {inscription.encrypted && (
                  <div>
                    <span className="text-gray-400 block">Encryption:</span>
                    <span className="text-gray-300">
                      Level {inscription.encryptionLevel} - {getEncryptionLevelLabel(inscription.encryptionLevel || 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-2 flex-wrap">
              <a
                href={`https://1satordinals.com/inscription/${inscription.origin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                View on 1SatOrdinals
              </a>
              <a
                href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
              >
                View Transaction
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(inscription.txid)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
              >
                Copy TXID
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};









// import React from 'react';
// import { InscriptionData } from './ViewInscriptions';
// import { InscriptionTextView } from './InscriptionTextView';
// import { InscriptionImageView } from './InscriptionImageView';
// import { InscriptionProfileView } from './InscriptionProfileView';
// import { InscriptionLargeProfileView } from './InscriptionLargeProfileView';
// import { getEncryptionLevelLabel } from '../utils/BlogEncryption';

// interface InscriptionDetailProps {
//   inscription: InscriptionData;
//   inscriptionContent: any;
//   loadingContent: boolean;
//   network: 'mainnet' | 'testnet';
//   onClose: () => void;
// }

// export const InscriptionDetail: React.FC<InscriptionDetailProps> = ({
//   inscription,
//   inscriptionContent,
//   loadingContent,
//   network,
//   onClose
// }) => {
//   const getInscriptionIcon = (type: string) => {
//     switch (type) {
//       case 'text': return '📝';
//       case 'image': return '🖼️';
//       case 'profile': return '👤';
//       case 'profile2': return '🎨';
//       case 'largeProfile': return '📦';
//       default: return '📄';
//     }
//   };

//   return (
//     <div 
//       className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
//       onClick={onClose}
//     >
//       <div 
//         className="bg-gray-800 rounded-lg max-w-3xl max-h-[90vh] overflow-auto p-6 w-full"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Header */}
//         <div className="flex justify-between items-start mb-4">
//           <div className="flex items-center gap-3">
//             <span className="text-2xl">{getInscriptionIcon(inscription.inscriptionType)}</span>
//             <div>
//               <h3 className="text-xl font-medium text-white">
//                 {inscription.inscriptionType.charAt(0).toUpperCase() + inscription.inscriptionType.slice(1)} Inscription
//               </h3>
//               <p className="text-xs text-gray-400 font-mono mt-1">
//                 {inscription.txid.substring(0, 16)}...{inscription.txid.substring(inscription.txid.length - 8)}
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             className="text-gray-400 hover:text-white transition-colors"
//           >
//             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         {/* Content */}
//         {loadingContent ? (
//           <div className="text-center py-8">
//             <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
//             <p className="text-gray-300 mt-2">Loading content...</p>
//           </div>
//         ) : (
//           <div>
//             {/* Type-specific views */}
//             {inscription.inscriptionType === 'text' && (
//               <InscriptionTextView
//                 content={inscriptionContent}
//                 encrypted={inscription.encrypted}
//                 encryptionLevel={inscription.encryptionLevel}
//                 timestamp={inscription.timestamp}
//                 txid={inscription.txid}
//                 size={inscription.size}
//               />
//             )}

//             {inscription.inscriptionType === 'image' && (
//               <InscriptionImageView
//                 content={inscriptionContent}
//                 encrypted={inscription.encrypted}
//                 encryptionLevel={inscription.encryptionLevel}
//                 timestamp={inscription.timestamp}
//                 txid={inscription.txid}
//                 size={inscription.size}
//                 network={network}
//               />
//             )}

//             {(inscription.inscriptionType === 'profile' || inscription.inscriptionType === 'profile2') && (
//               <InscriptionProfileView
//                 content={inscriptionContent}
//                 encrypted={inscription.encrypted}
//                 encryptionLevel={inscription.encryptionLevel}
//                 timestamp={inscription.timestamp}
//                 txid={inscription.txid}
//                 size={inscription.size}
//                 isProfile2={inscription.inscriptionType === 'profile2'}
//               />
//             )}

//             {inscription.inscriptionType === 'largeProfile' && (
//               <InscriptionLargeProfileView
//                 content={inscriptionContent}
//                 timestamp={inscription.timestamp}
//                 txid={inscription.txid}
//                 size={inscription.size}
//                 network={network}
//                 bcatInfo={inscription.bcatInfo}
//               />
//             )}

//             {/* Transaction Details */}
//             <div className="mt-6 border-t border-gray-700 pt-4">
//               <h4 className="text-sm font-medium text-gray-300 mb-3">Transaction Details</h4>
//               <div className="grid grid-cols-2 gap-4 text-sm">
//                 <div>
//                   <span className="text-gray-400 block">Transaction ID:</span>
//                   <a
//                     href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="text-blue-400 hover:text-blue-300 font-mono text-xs break-all"
//                   >
//                     {inscription.txid}
//                   </a>
//                 </div>
//                 <div>
//                   <span className="text-gray-400 block">Output:</span>
//                   <span className="text-gray-300">{inscription.vout}</span>
//                 </div>
//                 <div>
//                   <span className="text-gray-400 block">Origin:</span>
//                   <span className="text-gray-300 font-mono text-xs">{inscription.origin}</span>
//                 </div>
//                 {inscription.encrypted && (
//                   <div>
//                     <span className="text-gray-400 block">Encryption:</span>
//                     <span className="text-gray-300">
//                       Level {inscription.encryptionLevel} - {getEncryptionLevelLabel(inscription.encryptionLevel || 0)}
//                     </span>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Action Buttons */}
//             <div className="mt-6 flex gap-2 flex-wrap">
//               <a
//                 href={`https://1satordinals.com/inscription/${inscription.origin}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
//               >
//                 View on 1SatOrdinals
//               </a>
//               <a
//                 href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${inscription.txid}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
//               >
//                 View Transaction
//               </a>
//               <button
//                 onClick={() => navigator.clipboard.writeText(inscription.txid)}
//                 className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
//               >
//                 Copy TXID
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
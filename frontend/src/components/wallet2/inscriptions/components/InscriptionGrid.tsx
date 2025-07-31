import React from 'react';
import { InscriptionData } from '../ViewInscriptions';
import { getEncryptionLevelColor } from '../../utils/BlogEncryption';

interface InscriptionGridProps {
  inscriptions: InscriptionData[];
  onSelectInscription: (inscription: InscriptionData) => void;
}

export const InscriptionGrid: React.FC<InscriptionGridProps> = ({
  inscriptions,
  onSelectInscription
}) => {
  const getInscriptionIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'profile': return '👤';
      case 'profile2': return '🎨';
      case 'largeProfile': return '📦';
      case 'largeProfile':
        return (
          <div className="h-32 bg-gray-900 rounded p-3">
            <div className="text-center h-full flex flex-col items-center justify-center">
              <span className="text-4xl mb-2">📦</span>
              <p className="text-xs text-gray-400">Large Profile (BCAT)</p>
              {inscription.bcatInfo && (
                <p className="text-xs text-gray-500 mt-1">
                  {inscription.bcatInfo.chunks.length} chunks
                </p>
              )}
            </div>
          </div>
        );

      default: return '📄';
    }
  };

  const renderInscriptionPreview = (inscription: InscriptionData) => {
    const isEncrypted = inscription.encrypted && (!inscription.content || inscription.content.encrypted);

    switch (inscription.inscriptionType) {
      case 'image':
        return (
          <div className="h-32 bg-gray-900 rounded flex flex-col items-center justify-center">
            <span className="text-4xl mb-2">🖼️</span>
            <span className="text-xs text-gray-400">
              Image Inscription
              {inscription.encrypted && ' (Encrypted)'}
            </span>
          </div>
        );

      case 'profile':
      case 'profile2':
        if (isEncrypted) {
          return (
            <div className="h-32 bg-gray-900 rounded p-3">
              <div className="text-center h-full flex flex-col items-center justify-center">
                <span className="text-2xl mb-2">🔒</span>
                <p className="text-xs text-gray-400">Encrypted Profile</p>
                <p className="text-xs text-gray-500">Level {inscription.encryptionLevel} access required</p>
              </div>
            </div>
          );
        }
        return (
          <div className="h-32 bg-gray-900 rounded p-3">
            <div className="flex items-start gap-2">
              {inscription.content?.avatar ? (
                <img 
                  src={inscription.content.avatar} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">
                  {inscription.content?.username || 'Profile'}
                </p>
                <p className="text-xs text-gray-300 truncate">{inscription.content?.title}</p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {inscription.content?.bio}
                </p>
                {inscription.inscriptionType === 'profile2' && inscription.content?.background && (
                  <span className="text-xs text-purple-400 mt-1 inline-block">📸 Has background</span>
                )}
              </div>
            </div>
          </div>
        );

      case 'text':
        if (isEncrypted) {
          return (
            <div className="h-32 bg-gray-900 rounded p-3">
              <div className="text-center h-full flex flex-col items-center justify-center">
                <span className="text-2xl mb-2">🔒</span>
                <p className="text-xs text-gray-400">Encrypted Text</p>
                <p className="text-xs text-gray-500">Level {inscription.encryptionLevel} access required</p>
              </div>
            </div>
          );
        }
        return (
          <div className="h-32 bg-gray-900 rounded p-3">
            <p className="text-xs text-gray-400 mb-1">📝 Text</p>
            <p className="text-sm text-gray-300 line-clamp-4">
              {inscription.content || 'Text inscription'}
            </p>
          </div>
        );

      default:
        return (
          <div className="h-32 bg-gray-900 rounded flex items-center justify-center">
            <span className="text-gray-400">Unknown type</span>
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {inscriptions.map((inscription) => (
        <div
          key={inscription.origin}
          className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-all cursor-pointer relative group hover:shadow-lg hover:shadow-purple-500/10 hover:scale-[1.02]"
          onClick={() => onSelectInscription(inscription)}
        >
          {/* Encryption Badge */}
          {inscription.encrypted && (
            <div 
              className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium text-white z-10`}
              style={{
                backgroundColor: {
                  0: '#6B7280',
                  1: '#F59E0B',
                  2: '#EAB308',
                  3: '#6366F1',
                  4: '#A855F7',
                  5: '#EF4444'
                }[inscription.encryptionLevel || 0]
              }}
            >
              🔒 L{inscription.encryptionLevel}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />

          {/* Inscription Preview */}
          <div className="mb-3 relative">
            {renderInscriptionPreview(inscription)}
          </div>

          {/* Inscription Info */}
          <div className="space-y-1 relative">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-gray-400 truncate max-w-[200px]">
                {inscription.txid.substring(0, 8)}...{inscription.txid.substring(inscription.txid.length - 6)}
              </p>
              <span className="text-xs bg-gray-700 px-2 py-0.5 rounded flex items-center gap-1">
                {getInscriptionIcon(inscription.inscriptionType)}
                {inscription.inscriptionType}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                {inscription.timestamp.toLocaleDateString()}
              </span>
              <span className="text-gray-400">
                ~{(inscription.size / 1024).toFixed(1)}KB
              </span>
            </div>

            {/* Quick view hint */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-800 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pt-8 pb-2">
              <p className="text-xs text-center text-purple-400">Click to view details</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
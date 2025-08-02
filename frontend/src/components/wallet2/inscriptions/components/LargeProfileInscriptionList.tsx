import React, { useState, useEffect } from 'react';
import { fetchInscriptionsFromChain } from '../utils/inscriptionFetcher';
import { InscriptionData } from './ViewInscriptions';
import { InscriptionDetail } from './InscriptionDetail';

interface LargeProfileInscriptionListProps {
  keyData: any;
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
  refreshTrigger?: number;
}

export const LargeProfileInscriptionList: React.FC<LargeProfileInscriptionListProps> = ({
  keyData,
  network,
  whatsOnChainApiKey,
  refreshTrigger
}) => {
  const [inscriptions, setInscriptions] = useState<InscriptionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedInscription, setSelectedInscription] = useState<InscriptionData | null>(null);
  const [inscriptionContent, setInscriptionContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Fetch inscriptions
  const fetchInscriptions = async () => {
    if (!keyData.address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const allInscriptions = await fetchInscriptionsFromChain(
        keyData.address,
        network,
        whatsOnChainApiKey
      );
      
      // Filter for large profile inscriptions only
      const largeProfileInscriptions = allInscriptions.filter(
        inscription => inscription.inscriptionType === 'largeProfile'
      );
      
      setInscriptions(largeProfileInscriptions);
      console.log(`Found ${largeProfileInscriptions.length} large profile inscriptions`);
      
    } catch (error) {
      console.error('Error fetching inscriptions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch inscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch inscription content
  const fetchInscriptionContent = async (inscription: InscriptionData) => {
    setLoadingContent(true);
    setSelectedInscription(inscription);
    
    try {
      // For large profile inscriptions, the content is the thumbnail
      if (inscription.scriptHex) {
        // Extract thumbnail from inscription script
        const imageTypes = [
          { hex: '696d6167652f6a706567', type: 'image/jpeg' },
          { hex: '696d6167652f706e67', type: 'image/png' }
        ];
        
        for (const imgType of imageTypes) {
          if (inscription.scriptHex.includes(imgType.hex)) {
            const regex = new RegExp(`${imgType.hex}[0-9a-f]*?00([0-9a-f]+?)68`);
            const match = inscription.scriptHex.match(regex);
            
            if (match && match[1]) {
              const hexData = match[1];
              // Convert hex to base64
              let binary = '';
              for (let i = 0; i < hexData.length; i += 2) {
                binary += String.fromCharCode(parseInt(hexData.substr(i, 2), 16));
              }
              const base64 = btoa(binary);
              setInscriptionContent(`data:${imgType.type};base64,${base64}`);
              break;
            }
          }
        }
      }
      
      setLoadingContent(false);
    } catch (error) {
      console.error('Error fetching content:', error);
      setInscriptionContent(null);
      setLoadingContent(false);
    }
  };

  // Refresh on mount and when refreshTrigger changes
  useEffect(() => {
    if (keyData.address) {
      fetchInscriptions();
    }
  }, [keyData.address, refreshTrigger]);

  const getFileIcon = (metadata: any) => {
    if (!metadata || !metadata.type) return '📄';
    
    if (metadata.type.startsWith('video/')) return '🎥';
    if (metadata.type.startsWith('audio/')) return '🎵';
    if (metadata.type.startsWith('image/')) return '🖼️';
    if (metadata.type.includes('zip') || metadata.type.includes('archive')) return '📦';
    if (metadata.type.includes('pdf')) return '📕';
    
    return '📄';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <p className="text-gray-300 mt-2">Loading large profile inscriptions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchInscriptions}
          className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (inscriptions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-block mb-4">
          <span className="text-6xl">📦</span>
        </div>
        <p className="text-gray-400">No large profile inscriptions found</p>
        <p className="text-xs text-gray-500 mt-2">Create your first large profile inscription to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">
          Large Profile Inscriptions ({inscriptions.length})
        </h3>
        <button
          onClick={fetchInscriptions}
          disabled={loading}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inscriptions.map((inscription) => (
          <div
            key={inscription.origin}
            className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-all cursor-pointer group hover:shadow-lg hover:shadow-purple-500/10"
            onClick={() => fetchInscriptionContent(inscription)}
          >
            <div className="flex items-start gap-4">
              {/* Icon/Thumbnail */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gray-900 rounded flex items-center justify-center">
                  <span className="text-2xl">
                    {inscription.bcatInfo?.metadata ? 
                      getFileIcon(inscription.bcatInfo.metadata) : 
                      '📦'
                    }
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">
                  {inscription.bcatInfo?.metadata?.filename || 'Large File'}
                </h4>
                
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span>
                    {inscription.bcatInfo?.metadata?.size ? 
                      `${(inscription.bcatInfo.metadata.size / (1024 * 1024)).toFixed(2)}MB` : 
                      'Unknown size'
                    }
                  </span>
                  <span>•</span>
                  <span>
                    {inscription.bcatInfo?.chunks?.length || inscription.bcatInfo?.metadata?.chunks || 0} chunks
                  </span>
                </div>

                <div className="mt-2">
                  <p className="text-xs font-mono text-gray-500 truncate">
                    TX: {inscription.txid.substring(0, 16)}...
                  </p>
                  <p className="text-xs text-gray-500">
                    {inscription.timestamp.toLocaleDateString()}
                  </p>
                </div>

                {/* BCAT Badge */}
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-900 bg-opacity-50 text-purple-300">
                    BCAT Protocol
                  </span>
                </div>
              </div>
            </div>

            {/* Hover effect */}
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs text-center text-purple-400">Click to view details</p>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedInscription && (
        <InscriptionDetail
          inscription={selectedInscription}
          inscriptionContent={inscriptionContent}
          loadingContent={loadingContent}
          network={network}
          onClose={() => {
            setSelectedInscription(null);
            setInscriptionContent(null);
          }}
        />
      )}
    </div>
  );
};
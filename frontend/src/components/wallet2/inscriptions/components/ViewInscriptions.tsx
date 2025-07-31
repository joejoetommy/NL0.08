import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../../store/WalletStore';
import { InscriptionFilter } from './InscriptionFilter';
import { InscriptionGrid } from './InscriptionGrid';
import { InscriptionDetail } from './InscriptionDetail';
import { fetchInscriptionsFromChain } from '../utils/inscriptionFetcher';
import { BlogEncryption, EncryptionLevel } from '../utils/BlogEncryption';


export interface InscriptionData {
  id: number;
  txid: string;
  vout: number;
  timestamp: Date;
  inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile' | 'unknown';
  content?: any;
  size: number;
  origin: string;
  scriptHex?: string;
  encryptionLevel?: EncryptionLevel;
  encrypted?: boolean;
  bcatInfo?: {
    chunks: string[];
    metadata: any;
  };
}

interface ViewInscriptionsProps {
  network: 'mainnet' | 'testnet';
}

export const ViewInscriptions: React.FC<ViewInscriptionsProps> = ({ network }) => {
  const [inscriptions, setInscriptions] = useState<InscriptionData[]>([]);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);
  const [inscriptionError, setInscriptionError] = useState<string>('');
  const [selectedInscription, setSelectedInscription] = useState<InscriptionData | null>(null);
  const [inscriptionContent, setInscriptionContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [inscriptionFilter, setInscriptionFilter] = useState<'all' | 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile'>('all');

  const { keyData, whatsOnChainApiKey, getKeySegmentForLevel } = useWalletStore();

  // Fetch inscriptions from blockchain
  const fetchInscriptions = async () => {
    if (!keyData.address) {
      setInscriptionError('Please connect your wallet first');
      return;
    }

    setLoadingInscriptions(true);
    setInscriptionError('');
    
    try {
      const inscriptions = await fetchInscriptionsFromChain(
        keyData.address,
        network,
        whatsOnChainApiKey
      );
      
      setInscriptions(inscriptions);
      console.log(`Found ${inscriptions.length} inscriptions`);
      
    } catch (error) {
      console.error('Error fetching inscriptions:', error);
      setInscriptionError(error instanceof Error ? error.message : 'Failed to fetch inscriptions');
    } finally {
      setLoadingInscriptions(false);
    }
  };

  // Fetch inscription content details
  const fetchInscriptionContent = async (inscription: InscriptionData) => {
    setLoadingContent(true);
    setSelectedInscription(inscription);
    
    try {
      if (inscription.content) {
        // Handle encrypted content
        if (inscription.encrypted && inscription.content.encrypted) {
          const keySegment = getKeySegmentForLevel(inscription.encryptionLevel || 0);
          
          if (keySegment && inscription.content.data && inscription.content.metadata) {
            try {
              const encryptionKey = await BlogEncryption.deriveEncryptionKey(keySegment);
              
              // Decode base64 encrypted data
              const encryptedData = inscription.content.data;
              const binaryString = atob(encryptedData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Decode IV
              const ivHex = inscription.content.metadata.iv;
              const iv = new Uint8Array(ivHex.match(/.{2}/g).map((byte: string) => parseInt(byte, 16)));
              
              // Decrypt
              const decryptedStr = await BlogEncryption.decrypt(bytes.buffer, encryptionKey, iv);
              
              try {
                const parsedContent = JSON.parse(decryptedStr);
                setInscriptionContent(parsedContent);
              } catch {
                setInscriptionContent(decryptedStr);
              }
            } catch (decryptError) {
              console.error('Decryption failed:', decryptError);
              setInscriptionContent({
                error: 'Unable to decrypt - insufficient access level',
                requiredLevel: inscription.encryptionLevel
              });
            }
          } else {
            setInscriptionContent({
              error: 'Encrypted content - key required',
              requiredLevel: inscription.encryptionLevel
            });
          }
        } else {
          // Non-encrypted content
          setInscriptionContent(inscription.content);
        }
        setLoadingContent(false);
        return;
      }
      
      // Extract content from scriptHex if needed
      if (inscription.scriptHex) {
        if (inscription.inscriptionType === 'image') {
          setInscriptionContent({
            type: 'image',
            message: 'Image inscription - view transaction for full data',
            txid: inscription.txid,
            encrypted: inscription.encrypted
          });
        } else if (inscription.inscriptionType === 'text') {
          const textMatch = inscription.scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
          if (textMatch && textMatch[1]) {
            const hexStr = textMatch[1];
            let text = '';
            for (let i = 0; i < hexStr.length; i += 2) {
              text += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
            }
            setInscriptionContent(text);
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

  // Filter inscriptions
  const getFilteredInscriptions = () => {
    if (inscriptionFilter === 'all') {
      return inscriptions;
    }
    return inscriptions.filter(inscription => inscription.inscriptionType === inscriptionFilter);
  };

  // Fetch inscriptions on mount
  useEffect(() => {
    if (keyData.address) {
      fetchInscriptions();
    }
  }, [keyData.address]);

  return (
    <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
      {loadingInscriptions ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-gray-300 mt-2">Loading inscriptions...</p>
        </div>
      ) : inscriptionError ? (
        <div className="text-center py-8">
          <p className="text-red-400">{inscriptionError}</p>
          <button
            onClick={fetchInscriptions}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Retry
          </button>
        </div>
      ) : inscriptions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No inscriptions found for this address</p>
          <p className="text-xs text-gray-500 mt-2">Create your first inscription to see it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white">
              Your Inscriptions ({inscriptions.length})
            </h3>
            <button
              onClick={fetchInscriptions}
              disabled={loadingInscriptions}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {loadingInscriptions ? '🔄 Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {/* Filter */}
          <InscriptionFilter
            inscriptionFilter={inscriptionFilter}
            setInscriptionFilter={setInscriptionFilter}
            inscriptions={inscriptions}
          />

          {/* Grid */}
          <InscriptionGrid
            inscriptions={getFilteredInscriptions()}
            onSelectInscription={fetchInscriptionContent}
          />

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
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../../components/wallet2/store/WalletStore';
import { fetchInscriptionsFromChain } from '../../components/wallet2/inscriptions/utils/inscriptionFetcher';
import { BlogEncryption } from '../../components/wallet2/inscriptions/utils/BlogEncryption';
import { UTXOManager } from '../../components/wallet2/utils/blockchain';

import { Switch } from '../../components/ui/switch';
import { CreateLargeProfileInscription1 } from './addWallt5.1';
import { Label } from '../../components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../../components/ui/pagination';
import { SearchToken } from './searchToken';
import { TransactionLookup } from './TransactionLookup';

// Keep all your existing parsing functions exactly as they are
const parseWallt4Inscription = (inscription: any) => {
  // ... existing implementation stays the same
  try {
    const isWallt4Type = inscription.scriptHex && 
      inscription.scriptHex.includes('6170706c69636174696f6e2f77616c6c74342b6a736f6e');
    
    if (!isWallt4Type) {
      return null;
    }
    
    const hex = inscription.scriptHex;
    const contentTypeMarker = '6170706c69636174696f6e2f77616c6c74342b6a736f6e';
    const contentTypePos = hex.indexOf(contentTypeMarker);
    
    if (contentTypePos === -1) return null;
    
    const afterContentType = contentTypePos + contentTypeMarker.length;
    const opZeroPos = hex.indexOf('00', afterContentType);
    
    if (opZeroPos === -1) return null;
    
    let dataStart = opZeroPos + 2;
    const pushOpcode = hex.substring(dataStart, dataStart + 2);
    dataStart += 2;
    
    let dataLength = 0;
    
    if (parseInt(pushOpcode, 16) <= 75) {
      dataLength = parseInt(pushOpcode, 16);
    } else if (pushOpcode === '4c') {
      dataLength = parseInt(hex.substring(dataStart, dataStart + 2), 16);
      dataStart += 2;
    } else if (pushOpcode === '4d') {
      const byte1 = hex.substring(dataStart, dataStart + 2);
      const byte2 = hex.substring(dataStart + 2, dataStart + 4);
      dataLength = parseInt(byte1, 16) + (parseInt(byte2, 16) << 8);
      dataStart += 4;
    }
    
    const dataHex = hex.substring(dataStart, dataStart + (dataLength * 2));
    const dataString = Buffer.from(dataHex, 'hex').toString('utf8');
    const wallt4Data = JSON.parse(dataString);
    
    if (wallt4Data.protocol !== 'wallt4') {
      return null;
    }
    
    return {
      txid: inscription.txid,
      vout: inscription.vout || 0,
      timestamp: inscription.timestamp || Date.now(),
      origin: inscription.origin || inscription.txid,
      inscriptionType: 'wallt4',
      content: wallt4Data,
      size: inscription.size,
      encrypted: wallt4Data.encrypted || false,
      encryptionLevel: wallt4Data.encryptionLevel || 0,
      scriptHex: inscription.scriptHex,
      rawInscription: inscription,
      isWallt4: true
    };
  } catch (error) {
    console.error('Error parsing wallt4 inscription:', error);
    return null;
  }
};

const parseLegacyInscription = (inscription: any) => {
  // ... existing implementation stays the same
  try {
    const extractJSON = (str: string): any | null => {
      if (!str) return null;
      const jsonStart = str.indexOf('{');
      if (jsonStart === -1) return null;
      
      let jsonStr = str.substring(jsonStart);
      let braceCount = 0;
      let endIndex = -1;
      
      for (let i = 0; i < jsonStr.length; i++) {
        if (jsonStr[i] === '{') braceCount++;
        if (jsonStr[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
      
      if (endIndex > -1) {
        jsonStr = jsonStr.substring(0, endIndex);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          return null;
        }
      }
      return null;
    };
    
    if (typeof inscription.content === 'string') {
      const parsed = extractJSON(inscription.content);
      if (parsed) {
        return {
          ...inscription,
          content: parsed,
          isWallt4: parsed.app === 'wallt4' || parsed.protocol === 'wallt4'
        };
      }
    }
    
    if (inscription.content && typeof inscription.content === 'object') {
      return {
        ...inscription,
        isWallt4: inscription.content.app === 'wallt4' || inscription.content.protocol === 'wallt4'
      };
    }
    
    return inscription;
  } catch (error) {
    console.error('Error in legacy parser:', error);
    return inscription;
  }
};

const parseInscription = (inscription: any) => {
  const wallt4Parsed = parseWallt4Inscription(inscription);
  if (wallt4Parsed) {
    console.log('Parsed as wallt4 inscription:', wallt4Parsed);
    return wallt4Parsed;
  }
  
  return parseLegacyInscription(inscription);
};

const transformInscriptionToPost = (inscription: any) => {
  // ... existing implementation stays the same
  if (!inscription.content || typeof inscription.content === 'string' || inscription.content === null) {
    inscription = parseInscription(inscription);
  }
  
  const content = inscription.content || {};
  const rawTxData = inscription.rawInscription || inscription;
  
  if (inscription.inscriptionType === 'wallt4' || content.protocol === 'wallt4') {
    const data = content.data || content;
    return {
      id: inscription.txid,
      title: data.title || 'Untitled',
      user: inscription.origin || 'Unknown',
      content: data.content || 'No content',
      imageUrl: data.image || '/api/placeholder/200/200',
      type: data.type || 'Article',
      date: data.timestamp || inscription.timestamp || Date.now(),
      createdAt: new Date(data.timestamp || inscription.timestamp || Date.now()).toLocaleDateString(),
      encrypted: inscription.encrypted || content.encrypted || false,
      encryptionLevel: inscription.encryptionLevel || content.encryptionLevel || 0,
      txid: inscription.txid,
      vout: inscription.vout || 0,
      size: inscription.size,
      rawTransaction: rawTxData,
      isWallt4: true,
      inscriptionType: 'wallt4',
      Interact: {
        Likes: [],
        Dislikes: [],
        Tip: [],
        Comment: []
      },
      commentList: []
    };
  }
  
  if (content.app === 'wallt4') {
    return {
      id: inscription.txid,
      title: content.title || 'Untitled',
      user: inscription.origin || 'Unknown',
      content: content.content || 'No content',
      imageUrl: content.image || '/api/placeholder/200/200',
      type: content.type || 'Article',
      date: content.timestamp || inscription.timestamp || Date.now(),
      createdAt: new Date(content.timestamp || inscription.timestamp || Date.now()).toLocaleDateString(),
      encrypted: inscription.encrypted || false,
      encryptionLevel: inscription.encryptionLevel || 0,
      txid: inscription.txid,
      vout: inscription.vout || 0,
      size: inscription.size,
      rawTransaction: rawTxData,
      isWallt4: true,
      inscriptionType: inscription.inscriptionType || 'text',
      Interact: {
        Likes: [],
        Dislikes: [],
        Tip: [],
        Comment: []
      },
      commentList: []
    };
  }
  
  if (content.title && content.content) {
    return {
      id: inscription.txid,
      title: content.title,
      user: inscription.origin || 'Unknown',
      content: content.content,
      imageUrl: content.image || '/api/placeholder/200/200',
      type: content.type || 'Article',
      date: content.timestamp || inscription.timestamp || Date.now(),
      createdAt: new Date(content.timestamp || inscription.timestamp || Date.now()).toLocaleDateString(),
      encrypted: inscription.encrypted || false,
      encryptionLevel: inscription.encryptionLevel || 0,
      txid: inscription.txid,
      vout: inscription.vout || 0,
      size: inscription.size,
      rawTransaction: rawTxData,
      isWallt4: false,
      inscriptionType: inscription.inscriptionType || 'text',
      Interact: {
        Likes: [],
        Dislikes: [],
        Tip: [],
        Comment: []
      },
      commentList: []
    };
  }
  
  return {
    id: inscription.txid,
    title: 'Unable to parse',
    user: inscription.origin || 'Unknown',
    content: 'Content could not be parsed',
    imageUrl: '/api/placeholder/200/200',
    type: 'Unknown',
    date: inscription.timestamp || Date.now(),
    createdAt: new Date(inscription.timestamp || Date.now()).toLocaleDateString(),
    encrypted: false,
    encryptionLevel: 0,
    txid: inscription.txid,
    vout: inscription.vout || 0,
    size: inscription.size,
    rawTransaction: rawTxData,
    isWallt4: false,
    inscriptionType: inscription.inscriptionType || 'unknown',
    Interact: {
      Likes: [],
      Dislikes: [],
      Tip: [],
      Comment: []
    },
    commentList: []
  };
};

const WallT5: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyWallt4, setShowOnlyWallt4] = useState(false);
  const itemsPerPage = 10;

  // ADD THESE NEW STATE VARIABLES THAT WERE MISSING
  const [currentFeeRate, setCurrentFeeRate] = useState<number>(1);
  const [balance, setBalance] = useState({ confirmed: 0, unconfirmed: 0 });
  const [lastTransactionTime, setLastTransactionTime] = useState<number>(0);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
  const [lastTxid, setLastTxid] = useState<string>('');

  const { keyData, network, whatsOnChainApiKey, blogKeyHistory, getKeySegmentForLevel } = useWalletStore();

  // Fetch balance and fee rate on mount
  useEffect(() => {
    const fetchBalanceAndFeeRate = async () => {
      if (!keyData.address) return;
      
      try {
        // Fetch balance
        const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
        const utxos = await utxoManager.fetchUTXOs();
        const totalBalance = utxos.reduce((acc: number, utxo: any) => {
          return acc + (utxo.value || utxo.satoshis || 0);
        }, 0);
        
        setBalance({
          confirmed: totalBalance,
          unconfirmed: 0
        });
        
        // Set a default fee rate (you may want to fetch this from a fee estimation API)
        setCurrentFeeRate(1); // 1 sat/byte default
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };
    
    if (keyData.address) {
      fetchBalanceAndFeeRate();
    }
  }, [keyData.address, network, whatsOnChainApiKey]);

  // Display status messages
  useEffect(() => {
    if (status.message) {
      console.log(`Status [${status.type}]: ${status.message}`);
    }
  }, [status]);

  const handleTransactionFound = (post: any) => {
    const exists = posts.some(p => p.txid === post.txid);
    
    if (!exists) {
      const updatedPosts = [post, ...posts];
      setPosts(updatedPosts);
      setFilteredPosts(updatedPosts);
      setCurrentPage(1);
    }
  };

  const fetchPosts = async () => {
    if (!keyData.address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const inscriptions = await fetchInscriptionsFromChain(
        keyData.address,
        network,
        whatsOnChainApiKey
      );

      console.log('Raw inscriptions from chain:', inscriptions);

      const processedInscriptions = inscriptions.map((item: any) => {
        return parseInscription(item);
      });

      console.log('Processed inscriptions:', processedInscriptions);

      let relevantInscriptions = processedInscriptions.filter((inscription: any) => {
        if (showOnlyWallt4) {
          return inscription.isWallt4 || 
                 inscription.inscriptionType === 'wallt4' || 
                 inscription.content?.protocol === 'wallt4' ||
                 inscription.content?.app === 'wallt4';
        }
        
        return inscription.inscriptionType === 'wallt4' ||
               inscription.inscriptionType === 'text' || 
               inscription.inscriptionType === 'profile' || 
               inscription.inscriptionType === 'profile2' ||
               (inscription.content && (
                 inscription.content.type === 'Article' || 
                 inscription.content.type === 'Snippet' ||
                 inscription.content.protocol === 'wallt4' ||
                 inscription.content.app === 'wallt4'
               ));
      });

      const decryptedPosts = await Promise.all(
        relevantInscriptions.map(async (inscription: any) => {
          if (inscription.encrypted && inscription.content?.data && inscription.content?.metadata) {
            try {
              const keySegment = getKeySegmentForLevel(inscription.encryptionLevel || 0);
              if (keySegment) {
                const encryptionKey = await BlogEncryption.deriveEncryptionKey(keySegment);
                const encryptedData = inscription.content.data;
                const binaryString = atob(encryptedData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const ivHex = inscription.content.metadata.iv;
                const iv = new Uint8Array(ivHex.match(/.{2}/g).map((byte: string) => parseInt(byte, 16)));
                const decryptedStr = await BlogEncryption.decrypt(bytes.buffer, encryptionKey, iv);
                const decryptedContent = JSON.parse(decryptedStr);
                
                if (decryptedContent.protocol === 'wallt4') {
                  inscription.content = decryptedContent;
                } else {
                  inscription.content = decryptedContent;
                }
              }
            } catch (error) {
              console.error('Failed to decrypt content:', error);
            }
          }
          return inscription;
        })
      );

      const transformedPosts = decryptedPosts.map(transformInscriptionToPost);
      
      console.log('Transformed posts:', transformedPosts);
      
      setPosts(transformedPosts);
      setFilteredPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to fetch inscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (keyData.address) {
      fetchPosts();
    }
  }, [keyData.address, showOnlyWallt4]);

  const handleSearch = ({ searchTerm, searchContent, startDate, endDate, type }: any) => {
    const filtered = posts.filter(post => {
      const matchesTitle = searchTerm ? post.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      const matchesContent = searchContent ? post.content.toLowerCase().includes(searchContent.toLowerCase()) : true;
      const matchesStartDate = startDate ? new Date(post.date) >= new Date(startDate) : true;
      const matchesEndDate = endDate ? new Date(post.date) <= new Date(endDate) : true;
      const matchesType = type !== 'All' ? post.type === type : true;

      return matchesTitle && matchesContent && matchesStartDate && matchesEndDate && matchesType;
    });

    setFilteredPosts(filtered);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setFilteredPosts(posts);
    setCurrentPage(1);
  };

  const handleSortOrderChange = (checked: boolean) => {
    setSortOrder(checked ? 'newest' : 'oldest');
    setCurrentPage(1);
  };

  const onReviewAdded = (newPost: any) => {
    fetchPosts();
  };

  const getSortedPosts = () => {
    return [...filteredPosts].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });
  };

  const indexOfLastPost = currentPage * itemsPerPage;
  const indexOfFirstPost = indexOfLastPost - itemsPerPage;
  const currentPosts = getSortedPosts().slice(indexOfFirstPost, indexOfLastPost);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-gray-300 mt-2">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchPosts}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Status message display */}
      {status.message && (
        <div className={`mb-4 p-3 rounded ${
          status.type === 'success' ? 'bg-green-900 text-green-300' :
          status.type === 'error' ? 'bg-red-900 text-red-300' :
          'bg-blue-900 text-blue-300'
        }`}>
          {status.message}
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="sort-order"
              checked={sortOrder === 'newest'}
              onCheckedChange={handleSortOrderChange}
            />
            <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="wallt4-only"
              checked={showOnlyWallt4}
              onCheckedChange={setShowOnlyWallt4}
            />
            <Label htmlFor="wallt4-only">Wallt5 Only</Label>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <TransactionLookup 
            network={network} 
            onTransactionFound={handleTransactionFound} 
          />
          <button
            onClick={fetchPosts}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            🔄 Refresh
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <SearchToken onSearch={handleSearch} onClear={handleClear} />
        </div>
        <div className="flex items-center space-x-2">
          <p className="pr-1 text-white">Count:</p>
          <span className="px-2 py-1 bg-gray-700 text-white rounded">{filteredPosts.length}</span>
        </div>
      </div>

      <div className="text-center py-8">
        <CreateLargeProfileInscription1                
          keyData={keyData}
          network={network}
          whatsOnChainApiKey={whatsOnChainApiKey}
          currentFeeRate={currentFeeRate}
          balance={balance}
          lastTransactionTime={lastTransactionTime}
          setStatus={setStatus}
          setLastTxid={setLastTxid}
          setLastTransactionTime={setLastTransactionTime}
          blogKeyHistory={blogKeyHistory}
          getKeySegmentForLevel={getKeySegmentForLevel}
        />
      </div>
      
      {/* Display current posts if any */}
      {currentPosts.length > 0 && (
        <div className="grid gap-4 mt-6">
          {currentPosts.map((post) => (
            <div key={post.id} className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">{post.title}</h3>
              <p className="text-gray-300 text-sm mb-2">{post.content}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{post.createdAt}</span>
                <a 
                  href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${post.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300"
                >
                  View TX
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredPosts.length > itemsPerPage && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={() => paginate(currentPage > 1 ? currentPage - 1 : currentPage)} 
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext 
                href="#" 
                onClick={() => paginate(currentPage < Math.ceil(filteredPosts.length / itemsPerPage) ? currentPage + 1 : currentPage)} 
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default WallT5;
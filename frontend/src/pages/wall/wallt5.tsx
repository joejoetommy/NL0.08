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

















// import React, { useState, useEffect } from 'react';
// import { useWalletStore } from '../../components/wallet2/store/WalletStore';
// import { fetchInscriptionsFromChain } from '../../components/wallet2/inscriptions/utils/inscriptionFetcher';
// import { BlogEncryption } from '../../components/wallet2/inscriptions/utils/BlogEncryption';

// import { Switch } from '../../components/ui/switch';
//  import { CreateLargeProfileInscription1 } from './addWallt5.1';
// // import { CreateLargeProfileInscription1 }  from './addWallt5';
// //   
// import { Label } from '../../components/ui/label';
// import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../../components/ui/pagination';
// import { SearchToken } from './searchToken';
// import { TransactionLookup } from './TransactionLookup';
// /// import DialogBasicTwo from './DialogBasicTwo';

// // Simplified parser specifically for wallt4 inscriptions
// const parseWallt4Inscription = (inscription: any) => {
//   try {
//     // Check if content type indicates wallt4
//     const isWallt4Type = inscription.scriptHex && 
//       inscription.scriptHex.includes('6170706c69636174696f6e2f77616c6c74342b6a736f6e'); // application/wallt4+json
    
//     if (!isWallt4Type) {
//       return null;
//     }
    
//     // Extract JSON data from scriptHex
//     const hex = inscription.scriptHex;
    
//     // Find the wallt4 content type marker
//     const contentTypeMarker = '6170706c69636174696f6e2f77616c6c74342b6a736f6e';
//     const contentTypePos = hex.indexOf(contentTypeMarker);
    
//     if (contentTypePos === -1) return null;
    
//     // Skip to data section (after content type, OP_0, and push opcode)
//     const afterContentType = contentTypePos + contentTypeMarker.length;
//     const opZeroPos = hex.indexOf('00', afterContentType);
    
//     if (opZeroPos === -1) return null;
    
//     let dataStart = opZeroPos + 2; // Skip "00"
//     const pushOpcode = hex.substring(dataStart, dataStart + 2);
//     dataStart += 2;
    
//     let dataLength = 0;
    
//     // Parse push opcode to get data length
//     if (parseInt(pushOpcode, 16) <= 75) {
//       dataLength = parseInt(pushOpcode, 16);
//     } else if (pushOpcode === '4c') {
//       dataLength = parseInt(hex.substring(dataStart, dataStart + 2), 16);
//       dataStart += 2;
//     } else if (pushOpcode === '4d') {
//       const byte1 = hex.substring(dataStart, dataStart + 2);
//       const byte2 = hex.substring(dataStart + 2, dataStart + 4);
//       dataLength = parseInt(byte1, 16) + (parseInt(byte2, 16) << 8);
//       dataStart += 4;
//     }
    
//     // Extract and parse the JSON data
//     const dataHex = hex.substring(dataStart, dataStart + (dataLength * 2));
//     const dataString = Buffer.from(dataHex, 'hex').toString('utf8');
//     const wallt4Data = JSON.parse(dataString);
    
//     // Validate it's a wallt4 protocol inscription
//     if (wallt4Data.protocol !== 'wallt4') {
//       return null;
//     }
    
//     return {
//       txid: inscription.txid,
//       vout: inscription.vout || 0,
//       timestamp: inscription.timestamp || Date.now(),
//       origin: inscription.origin || inscription.txid,
//       inscriptionType: 'wallt4',
//       content: wallt4Data,
//       size: inscription.size,
//       encrypted: wallt4Data.encrypted || false,
//       encryptionLevel: wallt4Data.encryptionLevel || 0,
//       scriptHex: inscription.scriptHex,
//       rawInscription: inscription,
//       isWallt4: true
//     };
//   } catch (error) {
//     console.error('Error parsing wallt4 inscription:', error);
//     return null;
//   }
// };

// // Fallback parser for legacy inscriptions and other types
// const parseLegacyInscription = (inscription: any) => {
//   try {
//     // Helper to extract JSON from string content
//     const extractJSON = (str: string): any | null => {
//       if (!str) return null;
//       const jsonStart = str.indexOf('{');
//       if (jsonStart === -1) return null;
      
//       let jsonStr = str.substring(jsonStart);
//       let braceCount = 0;
//       let endIndex = -1;
      
//       for (let i = 0; i < jsonStr.length; i++) {
//         if (jsonStr[i] === '{') braceCount++;
//         if (jsonStr[i] === '}') {
//           braceCount--;
//           if (braceCount === 0) {
//             endIndex = i + 1;
//             break;
//           }
//         }
//       }
      
//       if (endIndex > -1) {
//         jsonStr = jsonStr.substring(0, endIndex);
//         try {
//           return JSON.parse(jsonStr);
//         } catch (e) {
//           return null;
//         }
//       }
//       return null;
//     };
    
//     // Try parsing content if it's a string
//     if (typeof inscription.content === 'string') {
//       const parsed = extractJSON(inscription.content);
//       if (parsed) {
//         return {
//           ...inscription,
//           content: parsed,
//           isWallt4: parsed.app === 'wallt4' || parsed.protocol === 'wallt4'
//         };
//       }
//     }
    
//     // If content is already valid object
//     if (inscription.content && typeof inscription.content === 'object') {
//       return {
//         ...inscription,
//         isWallt4: inscription.content.app === 'wallt4' || inscription.content.protocol === 'wallt4'
//       };
//     }
    
//     return inscription;
//   } catch (error) {
//     console.error('Error in legacy parser:', error);
//     return inscription;
//   }
// };

// // Main parsing function that tries wallt4 first, then falls back to legacy
// const parseInscription = (inscription: any) => {
//   // First try wallt4-specific parsing
//   const wallt4Parsed = parseWallt4Inscription(inscription);
//   if (wallt4Parsed) {
//     console.log('Parsed as wallt4 inscription:', wallt4Parsed);
//     return wallt4Parsed;
//   }
  
//   // Fall back to legacy parsing
//   return parseLegacyInscription(inscription);
// };

// // Transform inscription to post format
// const transformInscriptionToPost = (inscription: any) => {
//   // Ensure inscription is parsed
//   if (!inscription.content || typeof inscription.content === 'string' || inscription.content === null) {
//     inscription = parseInscription(inscription);
//   }
  
//   const content = inscription.content || {};
//   const rawTxData = inscription.rawInscription || inscription;
  
//   // Handle wallt4 inscriptions with the new structure
//   if (inscription.inscriptionType === 'wallt4' || content.protocol === 'wallt4') {
//     const data = content.data || content;
//     return {
//       id: inscription.txid,
//       title: data.title || 'Untitled',
//       user: inscription.origin || 'Unknown',
//       content: data.content || 'No content',
//       imageUrl: data.image || '/api/placeholder/200/200',
//       type: data.type || 'Article',
//       date: data.timestamp || inscription.timestamp || Date.now(),
//       createdAt: new Date(data.timestamp || inscription.timestamp || Date.now()).toLocaleDateString(),
//       encrypted: inscription.encrypted || content.encrypted || false,
//       encryptionLevel: inscription.encryptionLevel || content.encryptionLevel || 0,
//       txid: inscription.txid,
//       vout: inscription.vout || 0,
//       size: inscription.size,
//       rawTransaction: rawTxData,
//       isWallt4: true,
//       inscriptionType: 'wallt4',
//       Interact: {
//         Likes: [],
//         Dislikes: [],
//         Tip: [],
//         Comment: []
//       },
//       commentList: []
//     };
//   }
  
//   // Handle legacy wallt4 posts (with app: "wallt4")
//   if (content.app === 'wallt4') {
//     return {
//       id: inscription.txid,
//       title: content.title || 'Untitled',
//       user: inscription.origin || 'Unknown',
//       content: content.content || 'No content',
//       imageUrl: content.image || '/api/placeholder/200/200',
//       type: content.type || 'Article',
//       date: content.timestamp || inscription.timestamp || Date.now(),
//       createdAt: new Date(content.timestamp || inscription.timestamp || Date.now()).toLocaleDateString(),
//       encrypted: inscription.encrypted || false,
//       encryptionLevel: inscription.encryptionLevel || 0,
//       txid: inscription.txid,
//       vout: inscription.vout || 0,
//       size: inscription.size,
//       rawTransaction: rawTxData,
//       isWallt4: true,
//       inscriptionType: inscription.inscriptionType || 'text',
//       Interact: {
//         Likes: [],
//         Dislikes: [],
//         Tip: [],
//         Comment: []
//       },
//       commentList: []
//     };
//   }
  
//   // Handle other text inscriptions
//   if (content.title && content.content) {
//     return {
//       id: inscription.txid,
//       title: content.title,
//       user: inscription.origin || 'Unknown',
//       content: content.content,
//       imageUrl: content.image || '/api/placeholder/200/200',
//       type: content.type || 'Article',
//       date: content.timestamp || inscription.timestamp || Date.now(),
//       createdAt: new Date(content.timestamp || inscription.timestamp || Date.now()).toLocaleDateString(),
//       encrypted: inscription.encrypted || false,
//       encryptionLevel: inscription.encryptionLevel || 0,
//       txid: inscription.txid,
//       vout: inscription.vout || 0,
//       size: inscription.size,
//       rawTransaction: rawTxData,
//       isWallt4: false,
//       inscriptionType: inscription.inscriptionType || 'text',
//       Interact: {
//         Likes: [],
//         Dislikes: [],
//         Tip: [],
//         Comment: []
//       },
//       commentList: []
//     };
//   }
  
//   // Default fallback
//   return {
//     id: inscription.txid,
//     title: 'Unable to parse',
//     user: inscription.origin || 'Unknown',
//     content: 'Content could not be parsed',
//     imageUrl: '/api/placeholder/200/200',
//     type: 'Unknown',
//     date: inscription.timestamp || Date.now(),
//     createdAt: new Date(inscription.timestamp || Date.now()).toLocaleDateString(),
//     encrypted: false,
//     encryptionLevel: 0,
//     txid: inscription.txid,
//     vout: inscription.vout || 0,
//     size: inscription.size,
//     rawTransaction: rawTxData,
//     isWallt4: false,
//     inscriptionType: inscription.inscriptionType || 'unknown',
//     Interact: {
//       Likes: [],
//       Dislikes: [],
//       Tip: [],
//       Comment: []
//     },
//     commentList: []
//   };
// };


// const WallT5: React.FC = () => {
//   const [posts, setPosts] = useState<any[]>([]);
//   const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
//   const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
//   const [currentPage, setCurrentPage] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [showOnlyWallt4, setShowOnlyWallt4] = useState(false);
//   const itemsPerPage = 10;

//   const { keyData, network, whatsOnChainApiKey, blogKeyHistory, getKeySegmentForLevel } = useWalletStore();

//   // Handle transaction found from lookup
//   const handleTransactionFound = (post: any) => {
//     // Check if transaction already exists in posts
//     const exists = posts.some(p => p.txid === post.txid);
    
//     if (!exists) {
//       // Add the new post to the beginning of the list
//       const updatedPosts = [post, ...posts];
//       setPosts(updatedPosts);
//       setFilteredPosts(updatedPosts);
      
//       // Reset to first page to show the new post
//       setCurrentPage(1);
//     }
//   };

//   // Fetch inscriptions from blockchain
//   const fetchPosts = async () => {
//     if (!keyData.address) {
//       setError('Please connect your wallet first');
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     try {
//       const inscriptions = await fetchInscriptionsFromChain(
//         keyData.address,
//         network,
//         whatsOnChainApiKey
//       );

//       console.log('Raw inscriptions from chain:', inscriptions);

//       // Parse all inscriptions
//       const processedInscriptions = inscriptions.map((item: any) => {
//         return parseInscription(item);
//       });

//       console.log('Processed inscriptions:', processedInscriptions);

//       // Filter for relevant inscriptions
//       let relevantInscriptions = processedInscriptions.filter((inscription: any) => {
//         // Apply wallt4 filter if enabled
//         if (showOnlyWallt4) {
//           return inscription.isWallt4 || 
//                  inscription.inscriptionType === 'wallt4' || 
//                  inscription.content?.protocol === 'wallt4' ||
//                  inscription.content?.app === 'wallt4';
//         }
        
//         // Show wallt4 inscriptions and text/profile inscriptions
//         return inscription.inscriptionType === 'wallt4' ||
//                inscription.inscriptionType === 'text' || 
//                inscription.inscriptionType === 'profile' || 
//                inscription.inscriptionType === 'profile2' ||
//                (inscription.content && (
//                  inscription.content.type === 'Article' || 
//                  inscription.content.type === 'Snippet' ||
//                  inscription.content.protocol === 'wallt4' ||
//                  inscription.content.app === 'wallt4'
//                ));
//       });

//       // Decrypt encrypted content if we have the keys
//       const decryptedPosts = await Promise.all(
//         relevantInscriptions.map(async (inscription: any) => {
//           if (inscription.encrypted && inscription.content?.data && inscription.content?.metadata) {
//             try {
//               const keySegment = getKeySegmentForLevel(inscription.encryptionLevel || 0);
//               if (keySegment) {
//                 const encryptionKey = await BlogEncryption.deriveEncryptionKey(keySegment);
//                 const encryptedData = inscription.content.data;
//                 const binaryString = atob(encryptedData);
//                 const bytes = new Uint8Array(binaryString.length);
//                 for (let i = 0; i < binaryString.length; i++) {
//                   bytes[i] = binaryString.charCodeAt(i);
//                 }
//                 const ivHex = inscription.content.metadata.iv;
//                 const iv = new Uint8Array(ivHex.match(/.{2}/g).map((byte: string) => parseInt(byte, 16)));
//                 const decryptedStr = await BlogEncryption.decrypt(bytes.buffer, encryptionKey, iv);
//                 const decryptedContent = JSON.parse(decryptedStr);
                
//                 // For wallt4 encrypted content, structure is already correct
//                 if (decryptedContent.protocol === 'wallt4') {
//                   inscription.content = decryptedContent;
//                 } else {
//                   inscription.content = decryptedContent;
//                 }
//               }
//             } catch (error) {
//               console.error('Failed to decrypt content:', error);
//             }
//           }
//           return inscription;
//         })
//       );

//       const transformedPosts = decryptedPosts.map(transformInscriptionToPost);
      
//       console.log('Transformed posts:', transformedPosts);
      
//       setPosts(transformedPosts);
//       setFilteredPosts(transformedPosts);
//     } catch (error) {
//       console.error('Error fetching posts:', error);
//       setError('Failed to fetch inscriptions');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch posts on mount
//   useEffect(() => {
//     if (keyData.address) {
//       fetchPosts();
//     }
//   }, [keyData.address, showOnlyWallt4]);

//   const handleSearch = ({ searchTerm, searchContent, startDate, endDate, type }: any) => {
//     const filtered = posts.filter(post => {
//       const matchesTitle = searchTerm ? post.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
//       const matchesContent = searchContent ? post.content.toLowerCase().includes(searchContent.toLowerCase()) : true;
//       const matchesStartDate = startDate ? new Date(post.date) >= new Date(startDate) : true;
//       const matchesEndDate = endDate ? new Date(post.date) <= new Date(endDate) : true;
//       const matchesType = type !== 'All' ? post.type === type : true;

//       return matchesTitle && matchesContent && matchesStartDate && matchesEndDate && matchesType;
//     });

//     setFilteredPosts(filtered);
//     setCurrentPage(1);
//   };

//   const handleClear = () => {
//     setFilteredPosts(posts);
//     setCurrentPage(1);
//   };

//   const handleSortOrderChange = (checked: boolean) => {
//     setSortOrder(checked ? 'newest' : 'oldest');
//     setCurrentPage(1);
//   };

//   const onReviewAdded = (newPost: any) => {
//     // Refresh the list after new post created
//     fetchPosts();
//   };

//   const getSortedPosts = () => {
//     return [...filteredPosts].sort((a, b) => {
//       const dateA = new Date(a.date);
//       const dateB = new Date(b.date);
//       return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
//     });
//   };

//   const indexOfLastPost = currentPage * itemsPerPage;
//   const indexOfFirstPost = indexOfLastPost - itemsPerPage;
//   const currentPosts = getSortedPosts().slice(indexOfFirstPost, indexOfLastPost);

//   const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

//   if (loading) {
//     return (
//       <div className="container mx-auto p-4">
//         <div className="text-center py-8">
//           <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
//           <p className="text-gray-300 mt-2">Loading posts...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-4">
//         <div className="text-center py-8">
//           <p className="text-red-400">{error}</p>
//           <button
//             onClick={fetchPosts}
//             className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
//           >
//             Retry
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-4">
//       <div className="flex justify-between items-center mt-4">
//         <div className="flex items-center space-x-4">
//           <div className="flex items-center space-x-2">
//             <Switch
//               id="sort-order"
//               checked={sortOrder === 'newest'}
//               onCheckedChange={handleSortOrderChange}
//             />
//             <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
//           </div>
//           <div className="flex items-center space-x-2">
//             <Switch
//               id="wallt4-only"
//               checked={showOnlyWallt4}
//               onCheckedChange={setShowOnlyWallt4}
//             />
//             <Label htmlFor="wallt4-only">Wallt5 Only</Label>
//           </div>
//         </div>
//         <div className="flex items-center space-x-2">
//           {/* <CreateLargeProfileInscription1 onReviewAdded={onReviewAdded} /> */}
//           <TransactionLookup 
//             network={network} 
//             onTransactionFound={handleTransactionFound} 
//           />
//           <button
//             onClick={fetchPosts}
//             className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
//           >
//             🔄 Refresh
//           </button>
//         </div>
//         <div className="flex items-center space-x-2">
//           <SearchToken onSearch={handleSearch} onClear={handleClear} />
//         </div>
//         <div className="flex items-center space-x-2">
//           <p className="pr-1 text-white">Count:</p>
//           <span className="px-2 py-1 bg-gray-700 text-white rounded">{filteredPosts.length}</span>
//         </div>
//       </div>


//         <div className="text-center py-8">

//         <CreateLargeProfileInscription1                
//                 keyData={keyData}
//                 network={network}
//                 whatsOnChainApiKey={whatsOnChainApiKey}
//                 currentFeeRate={currentFeeRate}
//                 balance={balance}
//                 lastTransactionTime={lastTransactionTime}
//                 setStatus={setStatus}
//                 setLastTxid={setLastTxid}
//                 setLastTransactionTime={setLastTransactionTime} /> 
//         </div>
//           <>
//           <Pagination>
//             <PaginationContent>
//               <PaginationItem>
//                 <PaginationPrevious 
//                   href="#" 
//                   onClick={() => paginate(currentPage > 1 ? currentPage - 1 : currentPage)} 
//                 />
//               </PaginationItem>
//               <PaginationItem>
//                 <PaginationNext 
//                   href="#" 
//                   onClick={() => paginate(currentPage < Math.ceil(filteredPosts.length / itemsPerPage) ? currentPage + 1 : currentPage)} 
//                 />
//               </PaginationItem>
//             </PaginationContent>
//           </Pagination>
//         </>
//       {/* )} */}
//     </div>
//   );
// };

// export default WallT5;
























































































      {/* {currentPosts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No posts found</p>
          <p className="text-xs text-gray-500 mt-2">Create your first post to see it here</p>
        <CreateLargeProfileInscription1 onReviewAdded={onReviewAdded} /> 
        </div>
      ) : (
        <>
<div className="grid grid-cols-1 gap-0.5 mt-4">
  {currentPosts.map((post, index) => (
    <DialogBasicTwo 
      key={post.id} 
      post={post} 
      index={index}
      network={network}
      whatsOnChainApiKey={whatsOnChainApiKey}
    />
  ))}
</div> */}




// import React from 'react';


// const WallT5: React.FC = () => {


//     return (

//     <div className="container mx-auto p-4">
//         <h1>WallT5</h1>
//     </div>
//   );
// };

// export default WallT5;

// const formatReviewContent = (content: string, expanded: boolean, toggleReadMore: () => void) => {
//   const maxLength = 140;
//   if (expanded || content.length <= maxLength) {
//     return content;
//   }
//   const shortContent = content.slice(0, maxLength);
//   return (
//     <>
//       {shortContent}...{' '}
//       <button onClick={toggleReadMore} className="text-blue-500 hover:underline">
//         read more
//       </button>
//     </>
//   );
// };

// const DialogBasicTwo: React.FC<{ post: any; index: number }> = ({ post }) => {
//   const [expandedReviewIds, setExpandedReviewIds] = useState<string[]>([]);
//   const [showDownloadMenu, setShowDownloadMenu] = useState(false);
//   const { network } = useWalletStore();

//   const toggleReadMore = (id: string) => {
//     setExpandedReviewIds((prevIds) =>
//       prevIds.includes(id) ? prevIds.filter((reviewId) => reviewId !== id) : [...prevIds, id]
//     );
//   };

//   const preventClose = (e: React.MouseEvent) => {
//     e.stopPropagation();
//   };

//   // Download functions (same as before)   AddWallt5 
//   const downloadJSON = () => {
//     const transactionData = post.rawTransaction || {
//       txid: post.txid,
//       inscriptionType: post.inscriptionType,
//       content: {
//         title: post.title,
//         content: post.content,
//         type: post.type,
//         image: post.imageUrl,
//         timestamp: post.date
//       },
//       metadata: {
//         size: post.size,
//         encrypted: post.encrypted,
//         encryptionLevel: post.encryptionLevel,
//         user: post.user,
//         vout: post.vout,
//         isWallt4: post.isWallt4
//       }
//     };

//     const jsonString = JSON.stringify(transactionData, null, 2);
//     const blob = new Blob([jsonString], { type: 'application/json' });
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `tx_${post.txid.substring(0, 8)}.json`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(url);
//   };

//   const downloadCSV = () => {
//     const csvContent = `Transaction ID,Title,Content,Type,User,Date,Size,Encrypted,Wallt4,InscriptionType
// "${post.txid}","${post.title}","${post.content.replace(/"/g, '""')}","${post.type}","${post.user}","${post.createdAt}",${post.size},${post.encrypted},${post.isWallt4},${post.inscriptionType}`;
    
//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `tx_${post.txid.substring(0, 8)}.csv`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(url);
//   };

//   const downloadTXT = () => {
//     const textContent = `TRANSACTION DETAILS
// ==================
// Transaction ID: ${post.txid}
// Title: ${post.title}
// Content: ${post.content}
// Type: ${post.type}
// User: ${post.user}
// Date: ${post.createdAt}
// Size: ${post.size} bytes
// Encrypted: ${post.encrypted}
// Encryption Level: ${post.encryptionLevel}
// Wallt4 Post: ${post.isWallt4 ? 'Yes' : 'No'}
// Inscription Type: ${post.inscriptionType}

// Blockchain URL: https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${post.txid}`;
    
//     const blob = new Blob([textContent], { type: 'text/plain' });
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `tx_${post.txid.substring(0, 8)}.txt`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(url);
//   };

//   return (
//     <Dialog
//       transition={{
//         type: 'spring',
//         stiffness: 200,
//         damping: 24,
//       }}
//     >
//       <DialogTrigger
//         style={{
//           borderRadius: '4px',
//         }}
//         className="p-2 cursor-pointer"
//       >
//         <div className="flex flex-col bg-gray-900 text-white rounded-lg border border-gray-700 p-3 relative">
//           {/* Wallt4 Badge - Now shows for inscriptionType === 'wallt4' */}
//           {(post.isWallt4 || post.inscriptionType === 'wallt4') && (
//             <div className="absolute top-2 left-2 z-10">
//               <span className="text-xs px-2 py-1 rounded bg-purple-600 text-white">
//                 W4
//               </span>
//             </div>
//           )}
          
//           {/* Encryption Badge */}
//           {post.encrypted && (
//             <div className="absolute top-2 right-2 z-10">
//               <span className={`text-xs px-2 py-1 rounded bg-opacity-75 ${
//                 post.encryptionLevel === 5 ? 'bg-red-600' :
//                 post.encryptionLevel === 4 ? 'bg-purple-600' :
//                 post.encryptionLevel === 3 ? 'bg-indigo-600' :
//                 post.encryptionLevel === 2 ? 'bg-yellow-600' :
//                 post.encryptionLevel === 1 ? 'bg-amber-600' :
//                 'bg-gray-600'
//               } text-white`}>
//                 🔒 L{post.encryptionLevel}
//               </span>
//             </div>
//           )}

//           <div className="flex flex-row">
//             <div className="border border-grey-700 pt-2 pl-2 relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden">
//               <img
//                 src={post.imageUrl}
//                 alt={post.title}
//                 className="w-full h-full object-cover"
//               />
//             </div>

//             <div className="flex-1 flex flex-col ml-4 space-y-3">
//               <div className="flex items-center space-x-3">
//                 <p className="text-lg font-semibold truncate">{post.title}</p>
//               </div>

//               <div className="flex items-center justify-between text-xs">
//                 <div className="font-semibold">{post.user.substring(0, 8)}...{post.user.substring(post.user.length - 6)}</div>
//                 <div>{post.createdAt}</div>
//               </div>
//             </div>
//           </div>

//           <div className="mt-4">
//             <p className="rounded w-full">
//               {formatReviewContent(post.content, expandedReviewIds.includes(post.id), () => toggleReadMore(post.id))}
//             </p>
//           </div>
//         </div>
//       </DialogTrigger>

//       <DialogContainer>
//         <DialogContent
//           style={{
//             borderRadius: '12px',
//           }}
//           className="relative h-auto w-[500px] border border-gray-100 bg-white"
//           onClick={preventClose}
//           onMouseDown={preventClose}
//         >
//           <div className="flex font-sans">
//             <div className="flex-none w-48 relative">
//               <img 
//                 src={post.imageUrl}
//                 alt={post.title} 
//                 className="pt-2 pl-2 absolute inset-0 w-full h-full object-cover border border-grey-700" 
//                 loading="lazy" 
//               />
//             </div>
//             <form className="flex-auto p-6">
//               <div className="flex flex-wrap">
//                 <h1 className="flex-auto text-lg font-semibold text-slate-900">
//                   {post.title}
//                 </h1>
//                 <div className="text-lg font-semibold text-slate-500">
//                   {post.user.substring(0, 12)}...
//                 </div>
//                 <div className="w-full flex-none text-sm font-medium text-slate-700 mt-2">
//                   {post.type} • {post.createdAt}
//                   {(post.isWallt4 || post.inscriptionType === 'wallt4') && 
//                     <span className="ml-2 text-xs text-purple-600">• Wallt4</span>}
//                 </div>
//               </div>
//               <div className="flex space-x-4 mb-6 text-sm font-medium"></div>
//             </form>
//           </div>

//           <div className="p-6 space-y-4 text-gray-700">
//             <div
//               className="max-h-[300px] overflow-auto p-2 border border-gray-200 rounded"
//               style={{
//                 wordBreak: 'break-word',
//               }}
//             >
//               <p className="text-base">{post.content}</p>
//             </div>
//           </div>

//           <div className="px-6 pb-4">
//             <div className="flex justify-between items-center mb-2">
//               <div className="text-xs text-gray-500">
//                 <a
//                   href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${post.txid}`}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="text-blue-500 hover:text-blue-400"
//                 >
//                   View on blockchain →
//                 </a>
//               </div>
//               <div className="relative">
//                 <button
//                   onClick={() => setShowDownloadMenu(!showDownloadMenu)}
//                   className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
//                 >
//                   📥 Download ▼
//                 </button>
//                 {showDownloadMenu && (
//                   <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50">
//                     <button
//                       onClick={() => { downloadJSON(); setShowDownloadMenu(false); }}
//                       className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-100"
//                     >
//                       📄 JSON Format
//                     </button>
//                     <button
//                       onClick={() => { downloadCSV(); setShowDownloadMenu(false); }}
//                       className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-100"
//                     >
//                       📊 CSV Format
//                     </button>
//                     <button
//                       onClick={() => { downloadTXT(); setShowDownloadMenu(false); }}
//                       className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-100"
//                     >
//                       📝 Text Format
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           <button
//             className="absolute bg-gray-900 text-white px-4 py-2 rounded-full"
//             style={{
//               bottom: '3px',
//               right: '3px',
//             }}
//             onClick={preventClose}
//           >
//             X
//           </button>

//           <DialogClose className='absolute top-1 right-3 text-black hover:text-red-500 transition-transform hover:scale-125'>
//             &times;
//           </DialogClose>
//         </DialogContent>
//       </DialogContainer>
//     </Dialog>
//   );
// };




// import AudioPlayer from "@/components/item/audioplayer";

// import { Switch } from '@/components/ui/switch';
// import { Label } from '@/components/ui/label';
// import React, { useState, useRef, useEffect } from "react";
// import { audioData as initialAudioData } from "@/components/data/(wall)/wallt5";
// import {
//   PlayIcon,
//   PauseIcon,
//   HeartIcon,
//   Share2Icon,
//   LinkIcon,
//   MessageSquareIcon,
//   ThumbsDown,
//   HandCoins,
// } from "lucide-react";
// import { SearchRating } from "@/components/item/(wallt5items)/searchrating";
// import ReviewCount from "@/components/item/(wallt5items)/reviewcount";
// import { AddRating } from '@/components/item/(wallt5items)/addrating';
// import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';


// const AudioCard: React.FC<{
//   track: typeof initialAudioData[0];
//   isPlaying: boolean;
//   onPlayPause: (track: typeof initialAudioData[0]) => void;
// }> = ({ track, isPlaying, onPlayPause }) => {
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const [duration, setDuration] = useState<string>("0:00");

//   useEffect(() => {
//     if (audioRef.current) {
//       audioRef.current.addEventListener("loadedmetadata", () => {
//         if (audioRef.current?.duration) {
//           const minutes = Math.floor(audioRef.current.duration / 60);
//           const seconds = Math.floor(audioRef.current.duration % 60);
//           setDuration(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
//         }
//       });
//     }
//   }, []);

//   return (
//     <div className="p-2">
//       <div className="flex flex-col bg-gray-900 text-white rounded-lg border border-gray-700 p-3 relative sm:flex-row">
//         {/* Album Art */}
//         <div className="relative flex-shrink-0 w-full sm:w-32 h-32 rounded-md overflow-hidden">
//           <img
//             src={track.imageUrl}
//             alt={track.title}
//             className="w-full border border-grey-700 h-full object-cover"
//           />
//         </div>
 
//         {/* Right Section */}
//         <div className="flex-1 flex flex-col mt-4 sm:mt-0 sm:ml-4 space-y-3">
//           {/* Title with Play Button */}
//           <div className="flex items-center space-x-3">
//             {/* Orange Play Button */}
//             <button
//               className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center"
//               onClick={() => onPlayPause(track)}
//             >
//               {isPlaying ? (
//                 <PauseIcon className="w-6 h-6 text-white" />
//               ) : (
//                 <PlayIcon className="w-6 h-6 text-white" />
//               )}
//             </button>
//             <p className="text-lg font-semibold truncate">{track.title}</p>
//           </div>

//           {/* User and Created At */}
//           <div className="flex items-center justify-between text-xs">
//             <div className="font-semibold">{track.user}</div>
//             <div>{track.createdAt}</div>
//           </div>

//           {/* Interaction Icons */}
//           <div className="flex flex-wrap gap-2">
//             <div className="flex items-center bg-gray-700 text-white p-2 rounded">
//               <HeartIcon className="w-4 h-4 mr-1" />
//               <span className="text-sm">{track.likes}</span>
//             </div>
//             <div className="flex items-center bg-gray-700 text-white p-2 rounded">
//               <ThumbsDown className="w-4 h-4 mr-1" />
//               <span className="text-sm">{track.dislikes}</span>
//             </div>
//             <div className="flex items-center bg-gray-700 text-white p-2 rounded">
//               <HandCoins className="w-4 h-4 mr-1" />
//               <span className="text-sm">{track.tips}</span>
//             </div>

//             <div className="bg-gray-700 p-2 rounded">
//               <Share2Icon className="w-4 h-4 text-white" />
//             </div>
//             <div className="bg-gray-700 p-2 rounded">
//               <LinkIcon className="w-4 h-4 text-white" />
//             </div>
//             <div className="bg-gray-700 p-2 rounded">
//               <MessageSquareIcon className="w-4 h-4 text-white" />
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };




// const WallT5: React.FC = () => {
//   const [currentTrack, setCurrentTrack] = useState<typeof initialAudioData[0] | null>(
//     null
//   );
//   const [isPlaying, setIsPlaying] = useState(false);
//   const itemsPerPage = 15;
//   const handlePlayPause = (track: typeof initialAudioData[0]) => {
//     if (currentTrack?.id === track.id) {
//       setIsPlaying(!isPlaying);
//     } else {
//       setCurrentTrack(track);
//       setIsPlaying(true);
//     }
//   };



//   const [sortOrder, setSortOrder] = useState('newest');
//   const [audioData, setAudioData] = useState(initialAudioData);
//   const [filteredAudios, setFilteredAudios] = useState(initialAudioData);
//   const [currentPage, setCurrentPage] = useState(1);

//   const paginate = (pageNumber: number) => setCurrentPage(pageNumber);


//   const handleSortOrderChange = (order: string) => {
//     setSortOrder(order);
//     const sortedData = [...filteredAudios].sort((a, b) => {
//       const dateA = new Date(a.createdAt).getTime();
//       const dateB = new Date(b.createdAt).getTime();
//       return order === "newest" ? dateB - dateA : dateA - dateB;
//     });
//     setFilteredAudios(sortedData);
//   };
//   const handleReviewAdded = (newReview: typeof initialAudioData[0]) => {
//     setAudioData([newReview, ...initialAudioData]);
//   };


//   const handleSearch = ({
//     searchTerm = "",
//     searchUser = "",
//     startDate = "",
//     endDate = "",
//   }: {
//     searchTerm: string;
//     searchUser: string;
//     startDate?: string;
//     endDate?: string;
//   }) => {
//     const filtered = audioData.filter((track) => {
//       const matchesTitle = track.title.toLowerCase().includes(searchTerm.toLowerCase());
//       const matchesUser = track.user.toLowerCase().includes(searchUser.toLowerCase());
//       const matchesDate =
//         (!startDate || new Date(track.createdAt) >= new Date(startDate)) &&
//         (!endDate || new Date(track.createdAt) <= new Date(endDate));
//       return matchesTitle && matchesUser && matchesDate;
//     });
//     setFilteredAudios(filtered);
//   };

//   const handleClear = () => {
//     setFilteredAudios(audioData);
//   };



//   return (
//     <div className="container mx-auto p-4">
//       <div className="pb-5">
//         <div className="flex justify-between items-center mt-4">
//           <div className="flex items-center space-x-2">
//             <Switch
//               id="sort-order"
//               checked={sortOrder === 'newest'}
//               onCheckedChange={(checked) => handleSortOrderChange(checked ? 'newest' : 'oldest')}
//             />
//                       <Label htmlFor="sort-order">
//               {sortOrder === "newest" ? "Newest" : "Oldest"}
//             </Label>
//           </div>
//           <div className="flex justify-between items-center">
//             <AddRating onReviewAdded={handleReviewAdded} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" />
//           </div>
//           <div className="flex items-center space-x-2">
//             <SearchRating onSearch={handleSearch} onClear={handleClear} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" />
//           </div> 
//           <div className="flex items-center space-x-2">
//             <p className="pr-1">Count:</p>
//             <ReviewCount count={filteredAudios.length}/>
//           </div>
//         </div>
//       </div>
//    <div className="grid grid-cols-1 gap-0.5">
//       {filteredAudios.map((track) => (
//         <AudioCard
//           key={track.id}
//           track={track}
//           isPlaying={currentTrack?.id === track.id && isPlaying}
//           onPlayPause={handlePlayPause}
//         />
//       ))}
//       <AudioPlayer
//         tracks={audioData}
//         currentTrack={currentTrack}
//         onSetCurrentTrack={setCurrentTrack}
//       />
//       <Pagination>
//         <PaginationContent>
//           <PaginationItem>
//             <PaginationPrevious href="#" onClick={() => paginate(currentPage > 1 ? currentPage - 1 : currentPage)} />
//           </PaginationItem>
//           <PaginationItem>
//             <PaginationNext href="#" onClick={() => paginate(currentPage < Math.ceil(filteredAudios.length / itemsPerPage) ? currentPage + 1 : currentPage)} />
//           </PaginationItem>
//         </PaginationContent>
//       </Pagination>
//     </div>
//     </div>
//   );
// };

// export default WallT5;




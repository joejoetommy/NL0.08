


import React, { useState, useEffect } from 'react';
import { Utils } from '@bsv/sdk';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Switch } from '../ui/switch';
import { Label } from "../ui/label";
import { BCATDecoderDisplay } from '../wallet2/inscriptions/components/BCATDecoderDisplay';

// PropertyViewer component would be imported here
// import PropertyViewer from './PropertyViewer';
// import { BCATDecoderDisplay } from './BCATDecoderDisplay';

interface WalletAppProps {
  keyData?: any;
  network?: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
}

interface BCATTransaction {
  txid: string;
  timestamp: Date;
  metadata: {
    info: string;
    mimeType: string;
    charset: string | null;
    filename: string | null;
    flag: string | null;
    chunks: number;
  };
  chunkTxIds: string[];
  thumbnail?: string;
}

// Official BCAT protocol namespaces
const BCAT_NAMESPACE = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up';
const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

const WalletApp1: React.FC<WalletAppProps> = ({
  keyData = { address: null },
  network = 'mainnet',
  whatsOnChainApiKey
}) => {
  const [data, setData] = useState<BCATTransaction[]>([]);
  const [filteredData, setFilteredData] = useState<BCATTransaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('newest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<BCATTransaction | null>(null);
  const itemsPerPage = 15;

  // Convert namespace to hex
  const namespaceToHex = (namespace: string): string => {
    return Utils.toArray(namespace, 'utf8').map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const BCAT_NAMESPACE_HEX = namespaceToHex(BCAT_NAMESPACE);

  // Parse BCAT protocol data from script hex
  const parseBCATProtocolData = (scriptHex: string): { metadata: any; chunkTxIds: string[] } | null => {
    try {
      let pos = 2;
      const data: any[] = [];
      
      while (pos < scriptHex.length) {
        if (pos + 2 > scriptHex.length) break;
        
        const opcode = parseInt(scriptHex.substr(pos, 2), 16);
        let dataLength = 0;
        let dataStart = pos;
        
        if (opcode <= 75) {
          dataLength = opcode;
          dataStart = pos + 2;
        } else if (opcode === 0x4c && pos + 4 <= scriptHex.length) {
          dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16);
          dataStart = pos + 4;
        } else if (opcode === 0x4d && pos + 6 <= scriptHex.length) {
          dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16) + 
                       (parseInt(scriptHex.substr(pos + 4, 2), 16) << 8);
          dataStart = pos + 6;
        } else {
          break;
        }
        
        if (dataStart + dataLength * 2 > scriptHex.length) break;
        
        const dataHex = scriptHex.substr(dataStart, dataLength * 2);
        
        if (dataLength === 32) {
          let txid = '';
          for (let i = dataHex.length - 2; i >= 0; i -= 2) {
            txid += dataHex.substr(i, 2);
          }
          data.push({ type: 'txid', value: txid });
        } else {
          let str = '';
          for (let i = 0; i < dataHex.length; i += 2) {
            const byte = parseInt(dataHex.substr(i, 2), 16);
            str += String.fromCharCode(byte);
          }
          data.push({ type: 'string', value: str });
        }
        
        pos = dataStart + dataLength * 2;
      }
      
      if (data.length < 7) return null;
      if (data[0].type !== 'string' || data[0].value !== BCAT_NAMESPACE) return null;
      
      const chunkTxIds: string[] = [];
      for (let i = 6; i < data.length; i++) {
        if (data[i].type === 'txid') {
          chunkTxIds.push(data[i].value);
        }
      }
      
      return {
        metadata: {
          info: data[1]?.value || '',
          mimeType: data[2]?.value || '',
          charset: data[3]?.value || null,
          filename: data[4]?.value || null,
          flag: data[5]?.value || null,
          chunks: chunkTxIds.length
        },
        chunkTxIds
      };
    } catch (e) {
      console.error('Error parsing BCAT data:', e);
      return null;
    }
  };

  // Parse BCAT transaction
  const parseBCATTransaction = async (txData: any, txid: string, timestamp?: number): Promise<BCATTransaction | null> => {
    try {
      const opReturnOutput = txData.vout.find((out: any) => 
        out.scriptPubKey?.hex?.startsWith('6a')
      );
      
      if (!opReturnOutput) return null;
      
      const scriptHex = opReturnOutput.scriptPubKey.hex;
      
      if (!scriptHex.includes(BCAT_NAMESPACE_HEX)) return null;
      
      const bcatData = parseBCATProtocolData(scriptHex);
      if (!bcatData) return null;
      
      let thumbnail: string | undefined;
      if (txData.vout[0]?.value === 0.00000001) {
        thumbnail = 'inscription';
      }
      
      return {
        txid,
        timestamp: new Date((timestamp || 0) * 1000),
        metadata: bcatData.metadata,
        chunkTxIds: bcatData.chunkTxIds,
        thumbnail
      };
    } catch (e) {
      console.error('Error parsing BCAT transaction:', e);
      return null;
    }
  };

  // Fetch BCAT transactions
  const fetchBCATTransactions = async () => {
    if (!keyData.address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const headers: any = {};
      if (whatsOnChainApiKey) {
        headers['woc-api-key'] = whatsOnChainApiKey;
      }

      const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${keyData.address}/history`;
      const historyResponse = await fetch(historyUrl, { headers });
      
      if (!historyResponse.ok) {
        throw new Error(`Failed to fetch history: ${historyResponse.status}`);
      }

      const history = await historyResponse.json();
      console.log(`Found ${history.length} transactions for address`);

      const foundBcats: BCATTransaction[] = [];
      
      for (const tx of history.slice(0, 50)) {
        try {
          const txResponse = await fetch(
            `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
            { headers }
          );

          if (!txResponse.ok) continue;

          const txData = await txResponse.json();
          
          const bcatData = await parseBCATTransaction(txData, tx.tx_hash, tx.time);
          if (bcatData) {
            foundBcats.push(bcatData);
          }
        } catch (e) {
          console.error(`Error processing tx ${tx.tx_hash}:`, e);
        }
      }
      
      setData(foundBcats);
      setFilteredData(foundBcats);
      console.log(`Found ${foundBcats.length} BCAT transactions`);
      
    } catch (error) {
      console.error('Error fetching BCAT transactions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch BCAT transactions');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (keyData.address) {
      fetchBCATTransactions();
    }
  }, [keyData.address]);

  // Sort data when sort order changes
  useEffect(() => { 
    const sortedData = [...filteredData].sort((a, b) => {
      const dateA = a.timestamp.getTime();
      const dateB = b.timestamp.getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    setFilteredData(sortedData);
  }, [sortOrder, data]);

  const handleSortOrderChange = (order: string) => {
    setSortOrder(order);
    setCurrentPage(1);
  };

  const handleSearch = ({ searchTerm, searchUser, startDate, endDate }: any) => {
    const filtered = data.filter(item => {
      const matchesTitle = item.metadata.filename?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.metadata.info?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesContent = item.metadata.mimeType?.toLowerCase().includes(searchUser.toLowerCase());
      const matchesDate = (!startDate || item.timestamp >= new Date(startDate)) &&
                          (!endDate || item.timestamp <= new Date(endDate));
      return matchesTitle && matchesContent && matchesDate;
    });
    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setFilteredData(data);
    setCurrentPage(1);
  };

  const handleReviewAdded = (newReview: BCATTransaction) => {
    setData([newReview, ...data]);
    setFilteredData([newReview, ...filteredData]);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // PropertyViewer Card Component (placeholder - would be replaced with actual PropertyViewer)
  const PropertyCard: React.FC<{ item: BCATTransaction }> = ({ item }) => (
    <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-all cursor-pointer"
         onClick={() => setSelectedItem(item)}>
      <div className="space-y-2">
        <h4 className="font-medium text-white truncate">
          {item.metadata.filename || 'Unnamed File'}
        </h4>
        <div className="text-xs text-gray-400 space-y-1">
          <p>{item.metadata.mimeType}</p>
          <p>{item.metadata.chunks} chunks</p>
          <p>{item.timestamp.toLocaleDateString()}</p>
        </div>
        {item.metadata.flag && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-900 bg-opacity-50 text-yellow-300">
            {item.metadata.flag}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className='container mx-auto p-4'>
      <div className="pb-5">
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="sort-order"
              checked={sortOrder === 'newest'}
              onCheckedChange={(checked) => handleSortOrderChange(checked ? 'newest' : 'oldest')}
            />
            <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
          </div>
          
          <div className="flex justify-between items-center">
            <button
              onClick={fetchBCATTransactions}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <p className="pr-1 text-white">Items: {filteredData.length}</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-900 bg-opacity-30 rounded-lg border border-red-700 mb-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-gray-300 mt-2">Loading BCAT files...</p>
        </div>
      )}

      {/* Grid of items */}
      {!loading && (
        <div className='grid grid-cols-1 gap-2 
          xxxxs:grid-cols-1
          xxxs:grid-cols-2
          xxs:grid-cols-2
          xs:grid-cols-2 
          s:grid-cols-3 
          sm:grid-cols-3 
          md:grid-cols-3 
          lg:grid-cols-4
          xl:grid-cols-4'>
          {currentItems.map((item, index) => (
            <div key={item.txid} className='flex justify-center'>
              <PropertyCard item={item} />
              {/* Replace with: <PropertyViewer data={item} /> */}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredData.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-block mb-4">
            <span className="text-6xl">📦</span>
          </div>
          <p className="text-gray-400">No BCAT files found</p>
          <p className="text-xs text-gray-500 mt-2">Create a BCAT file to see it here</p>
        </div>
      )}

      {/* Pagination */}
      {filteredData.length > itemsPerPage && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  paginate(currentPage > 1 ? currentPage - 1 : currentPage);
                }} 
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  paginate(currentPage < Math.ceil(filteredData.length / itemsPerPage) ? currentPage + 1 : currentPage);
                }} 
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Modal for selected item - uses BCATDecoderDisplay for full reconstruction */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-auto p-6 w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-medium text-white">BCAT File Viewer</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <BCATDecoderDisplay
              bcatTxId={selectedItem.txid}
              chunkTxIds={selectedItem.chunkTxIds}
              metadata={selectedItem.metadata}
              network={network}
              whatsOnChainApiKey={whatsOnChainApiKey}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletApp1;



// import React, { useState, useEffect } from 'react';
// // import { sheet1DataStore } from '@/components/data/Forms/(Accommadation)/sheet1';
// // import Sheet1 from '@/components/Account/(sheets)/(Accommadation)/sheet1';
// import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../../components/ui/pagination';
// import { Switch } from '../../components/ui/switch';
// // import { Label } from '@/components/ui/label';
// import { Label } from "../../components/ui/label";
//         // import Count001 from '@/components/item/(wallt2items)/Count001';
// // import { SearchRating } from "@/components/item/(wallt2items)/searchrating";
//         // import { SearchRating } from "@/components/item/(wallt2items)/searchrating";
// // import Count001 from '@/components/item/(formitems)/(Accommadation)/count001';
//         // import { FormSheet1 } from '@/components/item/(wallt2items)/FormSheet1';
// // import FormSheet1 from '@/components/Forms/(Accommadation)/sheet1';

// const WalletApp1: React.FC = () => {
//   const [data, setData] = useState(sheet1DataStore);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [sortOrder, setSortOrder] = useState('newest');
// //  const [filteredData, setFilteredData] = useState(sheet1DataStore);
//   const itemsPerPage = 15;

//   const handleReviewAdded = (newReview) => {
//     setData([newReview, ...data]);
//   };

//   useEffect(() => { 
//     const sortedData = [...filteredData].sort((a, b) => {
//       const dateA = new Date(a.uploadDate);
//       const dateB = new Date(b.uploadDate);
//       return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
//     });
//     setFilteredData(sortedData);
//   }, [sortOrder]);

//   const handleSortOrderChange = (order: string) => {
//     setSortOrder(order);
//     setCurrentPage(1);
//   };

//   const handleSearch = ({ searchTerm, searchUser, startDate, endDate }) => {
//     const filtered = data.filter(item => {
//       const matchesTitle = item.title.toLowerCase().includes(searchTerm.toLowerCase());
//       const matchesContent = item.content.toLowerCase().includes(searchUser.toLowerCase());
//       const matchesDate = (!startDate || new Date(item.date) >= new Date(startDate)) &&
//                           (!endDate || new Date(item.date) <= new Date(endDate));
//       return matchesTitle && matchesContent && matchesDate;
//     });
//     setFilteredData(filtered);
//     setCurrentPage(1);
//   };

//   const handleClear = () => {
//     setFilteredData(data);
//     setCurrentPage(1);
//   };

//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

//   const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

//   return (
//     <div className='container mx-auto p-4'>
//       <div className="pb-5">
//         <div className="flex justify-between items-center mt-4">
//           <div className="flex items-center space-x-2">
//               <Switch
//                 id="sort-order"
//                 checked={sortOrder === 'newest'}
//                 onCheckedChange={(checked) => handleSortOrderChange(checked ? 'newest' : 'oldest')}
//                 />
//                 <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
//           </div>
          
//           <div className="flex justify-between items-center">
//             {/* <FormSheet1 onReviewAdded={handleReviewAdded} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" /> */}
//           </div>

//           <div className="flex items-center space-x-2">
//             {/* <SearchRating onSearch={handleSearch} onClear={handleClear} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" /> */}
//           </div>

//           <div className="flex items-center space-x-2">
//             {/* <p className="pr-1">Items:</p>
//             <Count001 /> */}
//           </div>
//         </div>
//       </div>
//       <div className='grid grid-cols-1 gap-2 
//         xxxxs:grid-cols-1
//         xxxs:grid-cols-2
//         xxs:grid-cols-2
//         xs:grid-cols-2 
//         s:grid-cols-3 
//         sm:grid-cols-3 
//         md:grid-cols-3 
//         lg:grid-cols-4
//         xl:grid-cols-4'>
//         {currentItems.map((data, index) => (
//           <div key={index} className='flex justify-center'>
//             {/* <Sheet1 data={data} /> */}
//           </div>
//         ))}
//       </div>
//       <Pagination>
//         <PaginationContent>
//           <PaginationItem>
//             <PaginationPrevious href="#" onClick={() => paginate(currentPage > 1 ? currentPage - 1 : currentPage)} />
//           </PaginationItem>
//           <PaginationItem>
//             <PaginationNext href="#" onClick={() => paginate(currentPage < Math.ceil(filteredData.length / itemsPerPage) ? currentPage + 1 : currentPage)} />
//           </PaginationItem>
//         </PaginationContent>
//       </Pagination>
//     </div>
//   );
// };

// export default WalletApp1;




// export default WalletApp1;
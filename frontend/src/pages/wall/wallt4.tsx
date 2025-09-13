import React, { useState, useEffect } from 'react';
import { useWalletStore } from '@/store/WalletStore';
import { fetchInscriptionsFromChain } from '@/utils/inscriptionFetcher';
import { BlogEncryption } from '@/utils/BlogEncryption';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogContainer,
} from '@/components/core/dialog';
import { ScrollArea } from '@/components/core/scroll-area';
import { Button } from '@/components/ui/button';
import { SearchToken } from '@/components/item/(wallt4items)/searchToken';
import { Switch } from '@/components/ui/switch';
import { AddWallt4 } from '@/components/item/(wallt4items)/addWallt4';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

// Transform inscription data to wall post format
const transformInscriptionToPost = (inscription: any) => {
  const content = inscription.content || {};
  return {
    id: inscription.txid,
    title: content.username || 'Anonymous',
    user: inscription.origin || 'Unknown',
    content: content.bio || 'On-chain profile',
    imageUrl: content.avatar || '/api/placeholder/200/200',
    backgroundImage: content.background || null,
    type: inscription.inscriptionType === 'profile2' ? 'Profile+' : 'Profile',
    date: inscription.timestamp,
    createdAt: new Date(inscription.timestamp).toLocaleDateString(),
    encrypted: inscription.encrypted || false,
    encryptionLevel: inscription.encryptionLevel || 0,
    txid: inscription.txid,
    vout: inscription.vout,
    size: inscription.size,
    bcatInfo: inscription.bcatInfo || null
  };
};

const formatReviewContent = (content: string, expanded: boolean, toggleReadMore: () => void) => {
  const maxLength = 140;
  if (expanded || content.length <= maxLength) {
    return content;
  }
  const shortContent = content.slice(0, maxLength);
  return (
    <>
      {shortContent}...{' '}
      <button onClick={toggleReadMore} className="text-blue-500 hover:underline">
        read more
      </button>
    </>
  );
};

const DialogBasicTwo: React.FC<{ post: any; index: number }> = ({ post }) => {
  const [expandedReviewIds, setExpandedReviewIds] = useState<string[]>([]);
  const { network } = useWalletStore();

  const toggleReadMore = (id: string) => {
    setExpandedReviewIds((prevIds) =>
      prevIds.includes(id) ? prevIds.filter((reviewId) => reviewId !== id) : [...prevIds, id]
    );
  };

  const preventClose = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Dialog
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 24,
      }}
    >
      <DialogTrigger
        style={{ borderRadius: '4px' }}
        className="p-2 cursor-pointer"
      >
        <div className="flex flex-col bg-gray-900 text-white rounded-lg border border-gray-700 p-3 relative">
          {/* Encryption Badge */}
          {post.encrypted && (
            <div className="absolute top-2 right-2 z-10">
              <span className={`text-xs px-2 py-1 rounded bg-opacity-75 ${
                post.encryptionLevel === 5 ? 'bg-red-600' :
                post.encryptionLevel === 4 ? 'bg-purple-600' :
                post.encryptionLevel === 3 ? 'bg-indigo-600' :
                post.encryptionLevel === 2 ? 'bg-yellow-600' :
                post.encryptionLevel === 1 ? 'bg-amber-600' :
                'bg-gray-600'
              } text-white`}>
                🔒 L{post.encryptionLevel}
              </span>
            </div>
          )}

          {/* Top Section */}
          <div className="flex flex-row">
            {/* Avatar */}
            <div className="border border-grey-700 pt-2 pl-2 relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Right Section */}
            <div className="flex-1 flex flex-col ml-4 space-y-3">
              {/* Username */}
              <div className="flex items-center space-x-3">
                <p className="text-lg font-semibold truncate">{post.title}</p>
              </div>

              {/* Address and Created At */}
              <div className="flex items-center justify-between text-xs">
                <div className="font-mono truncate max-w-[150px]" title={post.user}>
                  {post.user.substring(0, 8)}...{post.user.substring(post.user.length - 6)}
                </div>
                <div>{post.createdAt}</div>
              </div>

              {/* Type Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                  {post.type}
                </span>
                {post.bcatInfo && (
                  <span className="text-xs px-2 py-1 bg-purple-700 rounded">
                    BCAT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Bio Content */}
          <div className="mt-4">
            <p className="rounded w-full">
              {formatReviewContent(post.content, expandedReviewIds.includes(post.id), () => toggleReadMore(post.id))}
            </p>
          </div>

          {/* Transaction Info */}
          <div className="mt-2 pt-2 border-t border-gray-800">
            <a
              href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${post.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              TX: {post.txid.substring(0, 12)}...
            </a>
          </div>
        </div>
      </DialogTrigger>

      {/* Dialog Content - Full Profile View */}
      <DialogContainer>
        <DialogContent
          style={{ borderRadius: '12px' }}
          className="relative h-auto w-[600px] max-h-[90vh] overflow-y-auto border border-gray-100 bg-white"
          onClick={preventClose}
          onMouseDown={preventClose}
        >
          {/* Background Image for Profile2 */}
          {post.type === 'Profile+' && post.backgroundImage && (
            <div className="absolute top-0 left-0 w-full h-48 overflow-hidden rounded-t-lg">
              <img 
                src={post.backgroundImage} 
                alt="Background" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90"></div>
            </div>
          )}

          <div className={`relative ${post.type === 'Profile+' && post.backgroundImage ? 'pt-32' : ''} p-6`}>
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <img 
                src={post.imageUrl}
                alt={post.title} 
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
                <p className="text-sm text-gray-600 font-mono mt-1">
                  {post.user}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                    {post.type}
                  </span>
                  {post.encrypted && (
                    <span className={`text-xs px-2 py-1 rounded text-white ${
                      post.encryptionLevel === 5 ? 'bg-red-600' :
                      post.encryptionLevel === 4 ? 'bg-purple-600' :
                      post.encryptionLevel === 3 ? 'bg-indigo-600' :
                      post.encryptionLevel === 2 ? 'bg-yellow-600' :
                      post.encryptionLevel === 1 ? 'bg-amber-600' :
                      'bg-gray-600'
                    }`}>
                      🔒 Level {post.encryptionLevel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio Content */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Bio</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Metadata */}
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 text-gray-700">{post.createdAt}</span>
              </div>
              <div>
                <span className="text-gray-500">Size:</span>
                <span className="ml-2 text-gray-700">~{(post.size / 1024).toFixed(2)}KB</span>
              </div>
              <div>
                <span className="text-gray-500">Output:</span>
                <span className="ml-2 text-gray-700">{post.vout}</span>
              </div>
              {post.encrypted && (
                <div>
                  <span className="text-gray-500">Access Level:</span>
                  <span className="ml-2 text-gray-700">
                    {post.encryptionLevel === 5 ? 'Owner Only' :
                     post.encryptionLevel === 4 ? 'Inner Circle' :
                     post.encryptionLevel === 3 ? 'Friends' :
                     post.encryptionLevel === 2 ? 'Followers' :
                     post.encryptionLevel === 1 ? 'Subscribers' :
                     'Public'}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-2">
              <a
                href={`https://1satordinals.com/inscription/${post.user}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                View on 1SatOrdinals
              </a>
              <a
                href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${post.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
              >
                View Transaction
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(post.txid)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
              >
                Copy TXID
              </button>
            </div>
          </div>

          {/* Close Button */}
          <DialogClose className='absolute top-3 right-3 text-gray-600 hover:text-red-500 text-2xl transition-transform hover:scale-110'>
            &times;
          </DialogClose>
        </DialogContent>
      </DialogContainer>
    </Dialog>
  );
};

const WallT4: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;

  const { keyData, network, whatsOnChainApiKey, blogKeyHistory, getKeySegmentForLevel } = useWalletStore();

  // Fetch profile inscriptions from blockchain
  const fetchProfiles = async () => {
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

      // Filter for profile inscriptions only
      const profileInscriptions = inscriptions.filter(
        (inscription: any) => 
          inscription.inscriptionType === 'profile' || 
          inscription.inscriptionType === 'profile2' ||
          inscription.inscriptionType === 'largeProfile'
      );

      // Decrypt encrypted profiles if we have the keys
      const decryptedProfiles = await Promise.all(
        profileInscriptions.map(async (inscription: any) => {
          if (inscription.encrypted && inscription.content?.encrypted) {
            try {
              const keySegment = getKeySegmentForLevel(inscription.encryptionLevel || 0);
              if (keySegment && inscription.content.data && inscription.content.metadata) {
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
                inscription.content = JSON.parse(decryptedStr);
              }
            } catch (error) {
              console.error('Failed to decrypt profile:', error);
            }
          }
          return inscription;
        })
      );

      const transformedPosts = decryptedProfiles.map(transformInscriptionToPost);
      setPosts(transformedPosts);
      setFilteredPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setError('Failed to fetch profile inscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch profiles on mount
  useEffect(() => {
    if (keyData.address) {
      fetchProfiles();
    }
  }, [keyData.address]);

  const handleSearch = ({ searchTerm, searchContent, startDate, endDate, type }: any) => {
    const filtered = posts.filter(post => {
      const matchesTitle = searchTerm ? post.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      const matchesContent = searchContent ? post.content.toLowerCase().includes(searchContent.toLowerCase()) : true;
      const matchesStartDate = startDate ? new Date(post.date) >= new Date(startDate) : true;
      const matchesEndDate = endDate ? new Date(post.date) <= new Date(endDate) : true;
      const matchesType = type !== 'All' ? 
        (type === 'Profile' ? post.type === 'Profile' : 
         type === 'Profile+' ? post.type === 'Profile+' : true) : true;

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
    // This will be called when a new inscription is created
    // We'll refresh the list instead of manually adding
    fetchProfiles();
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
          <p className="text-gray-300 mt-2">Loading profile inscriptions...</p>
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
            onClick={fetchProfiles}
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
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="sort-order"
            checked={sortOrder === 'newest'}
            onCheckedChange={handleSortOrderChange}
          />
          <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <AddWallt4 onReviewAdded={onReviewAdded} />
          <button
            onClick={fetchProfiles}
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

      {currentPosts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No profile inscriptions found</p>
          <p className="text-xs text-gray-500 mt-2">Create your first profile inscription to see it here</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-0.5 mt-4">
            {currentPosts.map((post, index) => (
              <DialogBasicTwo key={post.id} post={post} index={index} />
            ))}
          </div>
          
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
        </>
      )}
    </div>
  );
};

export default WallT4;







// import React from 'react';


// const WallT4: React.FC = () => {


//     return (

//     <div className="container mx-auto p-4">
//         <h1>WallT4</h1>
//     </div>
//   );
// };

// export default WallT4;










// import React, { useState } from 'react';
// import { textPosts } from '@/components/data/(wall)/wallt4';
// import {
//   Dialog,
//   DialogTrigger,
//   DialogContent,
//   DialogTitle,
//   DialogImage,
//   DialogSubtitle,
//   DialogClose,
//   DialogContainer,
// } from '@/components/core/dialog';
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
// import { ScrollArea } from '@/components/core/scroll-area';
// import { Button } from '@/components/ui/button';
// import { SearchRating } from '@/components/item/(wallt4items)/searchrating';
// import { Switch } from '@/components/ui/switch';
// import { AddRating } from '@/components/item/(wallt4items)/addrating';
// import ReviewCount from '@/components/item/(wallt4items)/reviewcount';
// import { Label } from '@/components/ui/label';
// import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

// import { DrawerComment } from '@/components/Frames/comments/pow';
// import { DrawerShare } from '@/components/Frames/share/pow';
// import { DrawerTip } from '@/components/Frames/tip/pow';
// import { DrawerSave } from '@/components/Frames/save/pow';
// import { DrawerLikes } from '@/components/Frames/likes/pow';
// import { DrawerDislikes } from '@/components/Frames/dislikes/pow';


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

// const formatReviewContent1 = (content: string) => {
//   const chunkSize = 40;
//   const regex = new RegExp(`.{1,${chunkSize}}`, 'g');
//   const lines = content.match(regex) || [];
//   return lines.join('\n');
// };

// const toggleReadMore = (id) => {
//   setExpandedReviewIds((prevIds) =>
//     prevIds.includes(id) ? prevIds.filter((reviewId) => reviewId !== id) : [...prevIds, id]
//   );
// };

// const DialogBasicTwo: React.FC<{ post: typeof textPosts[0]; index: number; onNavigate: (index: number) => void }> = ({ post }) => {
//   const [comments, setComments] = useState<Comment[]>(post.commentList);
//  const [expandedReviewIds, setExpandedReviewIds] = useState<string[]>([]);

//   const preventClose = (e: React.MouseEvent) => {
//     e.stopPropagation();
//   };

//   return (
    
//     <Dialog
//       transition={{
//         type: 'spring',
//         stiffness: 200,
//         damping: 24,
//       }}
//     >
//       {/* Display Dialog */}
//       <DialogTrigger
//   style={{
//     borderRadius: '4px',
//   }}
//   className="p-2 cursor-pointer"
// >
//   <div className="flex flex-col bg-gray-900 text-white rounded-lg border border-gray-700 p-3 relative">
//     {/* Top Section */}
//     <div className="flex flex-row">
//       {/* Album Art */}
//       <div className="border border-grey-700 pt-2 pl-2 relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden">
//         <img
//           src={post.imageUrl}
//           alt={post.title}
//           className="w-full h-full object-cover"
//         />
//       </div>

//       {/* Right Section */}
//       <div className="flex-1 flex flex-col ml-4 space-y-3">
//         {/* Title */}
//         <div className="flex items-center space-x-3">
//           <p className="text-lg font-semibold truncate">{post.title}</p>
//         </div>

//         {/* User and Created At */}
//         <div className="flex items-center justify-between text-xs">
//           <div className="font-semibold">{post.user}</div>
//           <div>{post.createdAt}</div>
//         </div>
//       </div>
//     </div>

//     {/* Bottom Row: Review Content */}
//     <div className="mt-4">
//       <p className="rounded w-full">
//         {formatReviewContent(post.content, expandedReviewIds.includes(post.id), () => toggleReadMore(post.id))}
//       </p>
//     </div>

//     {/* Interaction Buttons */}
//     <div className="mt-4">
//       <div className="flex flex-wrap gap-2 items-center">
//         {/* Likes with Drawer */}
//         <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
//           <DrawerLikes image={post} className="w-0 h-0" />
//           <span className="text-sm">{post.Interact.Likes.length}</span>
//         </div>

//         {/* Dislikes */}
//         <div className="flex items-center bg-gray-700 text-white p-1 rounded">
//           <DrawerDislikes image={post} className="w-0 h-0" />
//           <span className="text-sm">{post.Interact.Dislikes.length}</span>
//         </div>

//         {/* Tips with Drawer */}
//         <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
//           <DrawerTip className="w-0 h-0" />
//           <span className="text-sm">{post.Interact.Tip.length}</span>
//         </div>

//         {/* Share with Drawer */}
//         <div className="bg-gray-700 p-1 rounded cursor-pointer">
//           <DrawerShare image={post} className="w-0 h-0 text-white" />
//         </div>

//         {/* Save with Drawer */}
//         <div className="bg-gray-700 p-1 rounded cursor-pointer">
//           <DrawerSave image={post} className="w-0 h-0 text-white" />
//         </div>

//         {/* Comments with Drawer */}
//         <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
//           <DrawerComment image={post} className="w-0 h-0 text-white" />
//           <span className="text-sm">{post.Interact.Comment.length}</span>
//         </div>
//       </div>
//     </div>
//   </div>
// </DialogTrigger>



//       {/* Dialog Content */}
// {/* Dialog Content */}
// <DialogContainer>
//   <DialogContent
//     style={{
//       borderRadius: '12px',
//     }}
//     className="relative h-auto w-[500px] border border-gray-100 bg-white"
//     onClick={preventClose}
//     onMouseDown={preventClose}
//   >

// <div className="flex font-sans ">
//   <div className="flex-none w-48 relative">
//     <img src={post.imageUrl}
//       alt={post.title} className ="pt-2 pl-2 absolute inset-0 w-full h-full object-cover border border-grey-700" loading="lazy" />
//   </div>
//   <form className="flex-auto p-6">
//     <div className="flex flex-wrap">
//       <h1 className="flex-auto text-lg font-semibold text-slate-900"> 
//       {post.title}
//       </h1>
//       <div className="text-lg font-semibold text-slate-500">
//       {post.user}  
//       </div>
//       <div className="w-full flex-none text-sm font-medium text-slate-700 mt-2">
//       {post.type}          {post.createdAt} 
//       </div>
//       <div className="w-full flex-none text-sm font-medium text-slate-700 ">
//                   {/* Interaction Buttons */}
//           <div className="flex flex-wrap pt-4 gap-1 items-center">
//       {/* Likes with Drawer */}
//             <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
//               <DrawerLikes image={post} className="w-2 h-2" />
//               <span className="text-sm">{post.Interact.Likes.length}</span>
//             </div>

//             {/* Dislikes */}
//             <div className="flex items-center bg-gray-700 text-white p-1 rounded">
//               <DrawerDislikes image={post} className="w-2 h-2" />
//               <span className="text-sm">{post.Interact.Dislikes.length}</span>
//             </div>

//             {/* Tips with Drawer */}
//             <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
//               <DrawerTip className="w-2 h-2" />
//               <span className="text-sm">{post.Interact.Tip.length}</span>
//             </div>

//             {/* Share with Drawer */}
//             <div className="bg-gray-700 p-1 rounded cursor-pointer">
//               <DrawerShare image={post} className="w-2 h-2 text-white" />
//             </div>

//             {/* Save with Drawer */}
//             <div className="bg-gray-700 p-1 rounded cursor-pointer">
//               <DrawerSave image={post} className="w-2 h-2 text-white" />
//             </div>

//             {/* Comments with Drawer */}
//             <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
//               <DrawerComment image={post}  className="w-2 h-2 text-white" />
//               <span className="text-sm">{post.Interact.Comment.length}</span>
//             </div>
//           </div>
//       </div>
//     </div>

//     <div className="flex space-x-4 mb-6 text-sm font-medium">


//     </div>
//   </form>
// </div>

//     <div className="p-6 space-y-4 text-gray-700">
//       {/* Content (Scrollable Section) */}
//       <div
//         className="max-h-[300px] overflow-auto p-2 border border-gray-200 rounded"
//         style={{
//           wordBreak: 'break-word',
//         }}
//       >
//         <p className="text-base">{post.content}</p>
//       </div>
//     </div>



//     {/* Close Button */}
//     <button
//       className="absolute bg-gray-900 text-white px-4 py-2 rounded-full"
//       style={{
//         bottom: '3px',
//         right: '3px',
//       }}
//       onClick={preventClose}
//     >
//       X
//     </button>

//             <DialogClose className='absolute top-1 right-3 text-black  hover:text-red-500 transition-transform hover:scale-525'>
//               &times;
//             </DialogClose>

//   </DialogContent>
// </DialogContainer>


//     </Dialog>
//   );
// };



// const WallT4: React.FC = () => {
//   const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
//   const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
//   const [filteredPosts, setFilteredPosts] = useState(textPosts);
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   const handleNavigate = (index: number) => {
//     if (index >= 0 && index < filteredPosts.length) {
//       setSelectedIndex(index);
//     }
//   };

//   const handleClose = () => {
//     setSelectedIndex(null);
//   };

//   const onReviewAdded = (newPost) => {
//     const updatedPosts = [newPost, ...textPosts];
//     setFilteredPosts(updatedPosts);
//     setSelectedIndex(0);
//   };

//   const handleSearch = ({ searchTerm, searchUser, startDate, endDate, type }) => {
//     const filtered = textPosts.filter(post => {
//       const matchesTitle = searchTerm ? post.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
//       const matchesContent = searchUser ? post.content.toLowerCase().includes(searchUser.toLowerCase()) : true;
//       const matchesStartDate = startDate ? new Date(post.date) >= new Date(startDate) : true;
//       const matchesEndDate = endDate ? new Date(post.date) <= new Date(endDate) : true;
//       const matchesType = type !== 'All' ? post.type === type : true;

//       return matchesTitle && matchesContent && matchesStartDate && matchesEndDate && matchesType;
//     });

//     setFilteredPosts(filtered);
//   };

//   const handleClear = () => {
//     setFilteredPosts(textPosts);
//   };

//   const handleSortOrderChange = (checked: boolean) => {
//     setSortOrder(checked ? 'newest' : 'oldest');
//     setCurrentPage(1);
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

//   return (
//     <div className="container mx-auto p-4">
//       <div className="flex justify-between items-center mt-4">
//         <div className="flex items-center space-x-2">
//           <Switch
//             id="sort-order"
//             checked={sortOrder === 'newest'}
//             onCheckedChange={(checked) => handleSortOrderChange(checked)}
//           />
//           <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
//         </div>
//         <div className="flex items-center space-x-2">
//           <AddRating onReviewAdded={onReviewAdded} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" />
//         </div>
//         <div className="flex items-center space-x-2">
//           <SearchRating onSearch={handleSearch} onClear={handleClear} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" />
//         </div>
//         <div className="flex items-center space-x-2">
//           <p className="pr-1">Count:</p>
//           <ReviewCount />
//         </div>
//       </div>
//       {/* <div className="flex flex-col space-y-4"> */}
//            <div className="grid grid-cols-1 gap-0.5">
//         {currentPosts.map((post, index) => (
//           <DialogBasicTwo key={post.id} post={post} index={index} onNavigate={handleNavigate} onClose={handleClose} />
//         ))}
//       </div>
//       <Pagination>
//         <PaginationContent>
//           <PaginationItem>
//             <PaginationPrevious href="#" onClick={() => paginate(currentPage > 1 ? currentPage - 1 : currentPage)} />
//           </PaginationItem>
//           <PaginationItem>
//             <PaginationNext href="#" onClick={() => paginate(currentPage < Math.ceil(filteredPosts.length / itemsPerPage) ? currentPage + 1 : currentPage)} />
//           </PaginationItem>
//         </PaginationContent>
//       </Pagination>
//     </div>
//   );
// };

// export default WallT4;





import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../../components/wallet2/store/WalletStore';
import { fetchInscriptionsFromChain } from '../../components/wallet2/inscriptions/utils/inscriptionFetcher';
// import { fetchInscriptionsFromChain } from '../utils/inscriptionFetcher';
import { BlogEncryption } from '../../components/wallet2/inscriptions/utils/BlogEncryption';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogContainer,
} from '../../components/ui/dialog3';
// import { ScrollArea } from '../../components/ui/scroll-area';
// import { Button } from '../../components/ui/button';
import { SearchToken } from './searchToken';
import { Switch } from '../../components/ui/switch';
import { AddWallt4 } from './addWallt4';
import { Label } from '../../components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../../components/ui/pagination';



// For interaction buttons (commented out as per your code)
// import { DrawerComment } from '@/components/Frames/comments/pow';
// import { DrawerShare } from '@/components/Frames/share/pow';
// import { DrawerTip } from '@/components/Frames/tip/pow';
// import { DrawerSave } from '@/components/Frames/save/pow';
// import { DrawerLikes } from '@/components/Frames/likes/pow';
// import { DrawerDislikes } from '@/components/Frames/dislikes/pow';

// Transform inscription data to post format
const transformInscriptionToPost = (inscription: any) => {
  const content = inscription.content || {};
  
  // Check if this is a text inscription with title/content structure
  if (inscription.inscriptionType === 'text' && typeof content === 'object' && content.title) {
    return {
      id: inscription.txid,
      title: content.title || 'Untitled',
      user: inscription.origin || 'Unknown',
      content: content.content || content.text || 'No content',
      imageUrl: content.image || '/api/placeholder/200/200',
      type: content.type || 'Article',
      date: inscription.timestamp,
      createdAt: new Date(inscription.timestamp).toLocaleDateString(),
      encrypted: inscription.encrypted || false,
      encryptionLevel: inscription.encryptionLevel || 0,
      txid: inscription.txid,
      vout: inscription.vout,
      size: inscription.size,
      // Mock interaction data - would be fetched from chain
      Interact: {
        Likes: [],
        Dislikes: [],
        Tip: [],
        Comment: []
      },
      commentList: []
    };
  }
  
  // Handle profile inscriptions (backwards compatibility)
  return {
    id: inscription.txid,
    title: content.username || 'Anonymous',
    user: inscription.origin || 'Unknown',
    content: content.bio || content.text || 'On-chain content',
    imageUrl: content.avatar || content.image || '/api/placeholder/200/200',
    type: inscription.inscriptionType === 'profile2' ? 'Profile+' : 
          inscription.inscriptionType === 'profile' ? 'Profile' : 
          content.type || 'Article',
    date: inscription.timestamp,
    createdAt: new Date(inscription.timestamp).toLocaleDateString(),
    encrypted: inscription.encrypted || false,
    encryptionLevel: inscription.encryptionLevel || 0,
    txid: inscription.txid,
    vout: inscription.vout,
    size: inscription.size,
    Interact: {
      Likes: [],
      Dislikes: [],
      Tip: [],
      Comment: []
    },
    commentList: []
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
      {/* Display Dialog Trigger */}
      <DialogTrigger
        style={{
          borderRadius: '4px',
        }}
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
            {/* Album Art / Image */}
            <div className="border border-grey-700 pt-2 pl-2 relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Right Section */}
            <div className="flex-1 flex flex-col ml-4 space-y-3">
              {/* Title */}
              <div className="flex items-center space-x-3">
                <p className="text-lg font-semibold truncate">{post.title}</p>
              </div>

              {/* User and Created At */}
              <div className="flex items-center justify-between text-xs">
                <div className="font-semibold">{post.user.substring(0, 8)}...{post.user.substring(post.user.length - 6)}</div>
                <div>{post.createdAt}</div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Review Content */}
          <div className="mt-4">
            <p className="rounded w-full">
              {formatReviewContent(post.content, expandedReviewIds.includes(post.id), () => toggleReadMore(post.id))}
            </p>
          </div>

          {/* Interaction Buttons - Uncomment when drawers are available */}
          {/* <div className="mt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
                <DrawerLikes image={post} className="w-0 h-0" />
                <span className="text-sm">{post.Interact.Likes.length}</span>
              </div>
              <div className="flex items-center bg-gray-700 text-white p-1 rounded">
                <DrawerDislikes image={post} className="w-0 h-0" />
                <span className="text-sm">{post.Interact.Dislikes.length}</span>
              </div>
              <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
                <DrawerTip className="w-0 h-0" />
                <span className="text-sm">{post.Interact.Tip.length}</span>
              </div>
              <div className="bg-gray-700 p-1 rounded cursor-pointer">
                <DrawerShare image={post} className="w-0 h-0 text-white" />
              </div>
              <div className="bg-gray-700 p-1 rounded cursor-pointer">
                <DrawerSave image={post} className="w-0 h-0 text-white" />
              </div>
              <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
                <DrawerComment image={post} className="w-0 h-0 text-white" />
                <span className="text-sm">{post.Interact.Comment.length}</span>
              </div>
            </div>
          </div> */}
        </div>
      </DialogTrigger>

      {/* Dialog Content */}
      <DialogContainer>
        <DialogContent
          style={{
            borderRadius: '12px',
          }}
          className="relative h-auto w-[500px] border border-gray-100 bg-white"
          onClick={preventClose}
          onMouseDown={preventClose}
        >
          <div className="flex font-sans">
            <div className="flex-none w-48 relative">
              <img 
                src={post.imageUrl}
                alt={post.title} 
                className="pt-2 pl-2 absolute inset-0 w-full h-full object-cover border border-grey-700" 
                loading="lazy" 
              />
            </div>
            <form className="flex-auto p-6">
              <div className="flex flex-wrap">
                <h1 className="flex-auto text-lg font-semibold text-slate-900">
                  {post.title}
                </h1>
                <div className="text-lg font-semibold text-slate-500">
                  {post.user.substring(0, 12)}...
                </div>
                <div className="w-full flex-none text-sm font-medium text-slate-700 mt-2">
                  {post.type} • {post.createdAt}
                </div>
                <div className="w-full flex-none text-sm font-medium text-slate-700">
                  {/* Interaction Buttons - Uncomment when drawers are available */}
                  {/* <div className="flex flex-wrap pt-4 gap-1 items-center">
                    <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
                      <DrawerLikes image={post} className="w-2 h-2" />
                      <span className="text-sm">{post.Interact.Likes.length}</span>
                    </div>
                    <div className="flex items-center bg-gray-700 text-white p-1 rounded">
                      <DrawerDislikes image={post} className="w-2 h-2" />
                      <span className="text-sm">{post.Interact.Dislikes.length}</span>
                    </div>
                    <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
                      <DrawerTip className="w-2 h-2" />
                      <span className="text-sm">{post.Interact.Tip.length}</span>
                    </div>
                    <div className="bg-gray-700 p-1 rounded cursor-pointer">
                      <DrawerShare image={post} className="w-2 h-2 text-white" />
                    </div>
                    <div className="bg-gray-700 p-1 rounded cursor-pointer">
                      <DrawerSave image={post} className="w-2 h-2 text-white" />
                    </div>
                    <div className="flex items-center bg-gray-700 text-white p-1 rounded cursor-pointer">
                      <DrawerComment image={post} className="w-2 h-2 text-white" />
                      <span className="text-sm">{post.Interact.Comment.length}</span>
                    </div>
                  </div> */}
                </div>
              </div>
              <div className="flex space-x-4 mb-6 text-sm font-medium"></div>
            </form>
          </div>

          <div className="p-6 space-y-4 text-gray-700">
            {/* Content (Scrollable Section) */}
            <div
              className="max-h-[300px] overflow-auto p-2 border border-gray-200 rounded"
              style={{
                wordBreak: 'break-word',
              }}
            >
              <p className="text-base">{post.content}</p>
            </div>
          </div>

          {/* Transaction Info */}
          <div className="px-6 pb-4">
            <div className="text-xs text-gray-500">
              <a
                href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${post.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400"
              >
                View on blockchain →
              </a>
            </div>
          </div>

          {/* Close Button */}
          <button
            className="absolute bg-gray-900 text-white px-4 py-2 rounded-full"
            style={{
              bottom: '3px',
              right: '3px',
            }}
            onClick={preventClose}
          >
            X
          </button>

          <DialogClose className='absolute top-1 right-3 text-black hover:text-red-500 transition-transform hover:scale-125'>
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

  // Fetch inscriptions from blockchain
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

      // Filter for text inscriptions and profiles
      const relevantInscriptions = inscriptions.filter(
        (inscription: any) => 
          inscription.inscriptionType === 'text' || 
          inscription.inscriptionType === 'profile' || 
          inscription.inscriptionType === 'profile2'
      );

      // Decrypt encrypted content if we have the keys
      const decryptedPosts = await Promise.all(
        relevantInscriptions.map(async (inscription: any) => {
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
              console.error('Failed to decrypt content:', error);
            }
          }
          return inscription;
        })
      );

      const transformedPosts = decryptedPosts.map(transformInscriptionToPost);
      setPosts(transformedPosts);
      setFilteredPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to fetch inscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts on mount
  useEffect(() => {
    if (keyData.address) {
      fetchPosts();
    }
  }, [keyData.address]);

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
    // Refresh the list after new post created
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

      {currentPosts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No posts found</p>
          <p className="text-xs text-gray-500 mt-2">Create your first post to see it here</p>
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





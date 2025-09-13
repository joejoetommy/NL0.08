import React from 'react';


const WallT2: React.FC = () => {


    return (

    <div className="container mx-auto p-4">
        <h1>WallT2 </h1>
    </div>
  );
};

export default WallT2;











// // button imageURL
// //import { videoShorts } from '@/components/data/(wall)/wallt2'; 

// import React, { useState, useRef, useEffect } from 'react';
// import Image from 'next/image';
// import { videoShorts as initialVideoShorts } from '@/components/data/(wall)/wallt2';
// import { DrawerComment } from '@/components/Frames/comments/pow';
// import { DrawerShare } from '@/components/Frames/share/pow';
// import { DrawerTip } from '@/components/Frames/tip/pow';
// import { DrawerSave } from '@/components/Frames/save/pow';
// import { DrawerLikes } from '@/components/Frames/likes/pow';

// import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
// import { Switch } from '@/components/ui/switch';
// import { Label } from '@/components/ui/label';

// import ReviewCount from '@/components/item/(wallt2items)/reviewcount';
// import { SearchRating } from "@/components/item/(wallt2items)/searchrating";
// import { AddRating } from '@/components/item/(wallt2items)/addrating';

// const VideoDetail: React.FC<{ video: typeof initialVideoShorts[0]; onClick: () => void; isScrolling: boolean }> = ({ video, onClick, isScrolling }) => {
//   const [liked, setLiked] = useState(false);
//   const [disliked, setDisliked] = useState(false);
//   const [comments, setComments] = useState<Comment[]>([]);
//   const [commentText, setCommentText] = useState('');
//   const [replyTexts, setReplyTexts] = useState<{ [key: number]: string }>({});

//   const toggleLikeDislike = (id: number, type: 'like' | 'dislike') => {
//     const updatedComments = comments.map(comment => {
//       if (comment.id === id) {
//         const isLiked = type === 'like';
//         return {
//           ...comment,
//           likes: isLiked ? comment.likes + 1 : comment.likes - (comment.likes > 0 ? 1 : 0),
//           dislikes: !isLiked ? comment.dislikes + 1 : comment.dislikes - (comment.dislikes > 0 ? 1 : 0),
//         };
//       }
//       return comment;
//     });
//     setComments(updatedComments);
//   }; 

//   const submitComment = (parentId?: number) => {
//     if (parentId === undefined) {
//       if (commentText.trim() !== '') {
//         const newComment: Comment = {
//           id: Date.now(),
//           text: commentText,
//           likes: 0,
//           dislikes: 0,
//           replies: [],
//           tips: 0
//         };
//         setComments([...comments, newComment]);
//         setCommentText('');
//       }
//     } else {
//       const newReply: Comment = {
//         id: Date.now(),
//         text: replyTexts[parentId],
//         likes: 0,
//         dislikes: 0,
//         replies: [],
//         tips: 0
//       };
//       const updatedComments = comments.map(comment => {
//         if (comment.id === parentId) {
//           return { ...comment, replies: [...comment.replies, newReply] };
//         }
//         return comment;
//       });
//       setComments(updatedComments);
//       setReplyTexts({ ...replyTexts, [parentId]: '' });
//     }
//   };

//   const toggleLike = () => {
//     if (disliked) {
//       setDisliked(false);
//     }
//     setLiked(!liked);
//   };

//   const toggleDislike = () => {
//     if (liked) {
//       setLiked(false);
//     }
//     setDisliked(!disliked);
//   };

//   const handleLikeComment = (id: number) => {
//     const updatedComments = comments.map(comment => {
//       if (comment.id === id) {
//         return { ...comment, likes: comment.likes + 1 };
//       }
//       return comment;
//     });
//     setComments(updatedComments);
//   };

//   const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>, id?: number) => {
//     if (id !== undefined) {
//       setReplyTexts({ ...replyTexts, [id]: e.target.value });
//     } else {
//       setCommentText(e.target.value);
//     }
//   };

//   const handleTipComment = (id: number) => {
//     const updatedComments = comments.map(comment => {
//       if (comment.id === id) {
//         return { ...comment, tips: comment.tips + 1 };
//       }
//       return comment;
//     });
//     setComments(updatedComments);
//   };

//   return (
//     <div className={`relative bg-black ${isScrolling ? 'h-[80vh]' : 'h-[calc(100vh-2rem)]'}`}>
//       <video className="object-cover w-full h-full" src={video.imageUrl} controls />
//       <div className="absolute bottom-0 left-0 p-4 text-white w-full">
//         <div className="flex items-center mb-2">
//           <Image  src={video.imageUrl} alt={video.title} width={40} height={40} className="rounded-full" />
//           <div className="ml-2">
//             <p className="font-semibold" width={40} height={40} >{video.author}</p>
//             <p className="text-xs text-gray-400">{video.createdAt}</p>
//           </div>
//         </div>
//         <p>{video.content}</p>
//         <div className="absolute bottom-12 right-4 flex flex-col space-y-4">
//           <span className="icon-like">
//             <DrawerLikes image={video} />
//           </span>
//           <span className="icon-comment">
//             <DrawerComment image={video} comments={comments} />
//           </span>
//           <span className="icon-tip">
//             <DrawerTip image={video} />
//           </span>
//           <span className="icon-share">
//             <DrawerShare image={video} />
//           </span>
//           <span className="icon-save">
//             <DrawerSave image={video} />
//           </span>
//         </div>

//         <p className="mt-2 text-xs text-gray-400">{video.likes} likes</p>
//         <p className="text-xs text-gray-400">{video.comments} comments</p>
//         <p className="pb-12 text-xs text-gray-400">{video.views} views</p>
//       </div>
//     </div>
//   );
// };

// const WallT2: React.FC = () => {
//   const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
//   const [videoShorts, setVideoShorts] = useState(initialVideoShorts);
//   const [isScrolling, setIsScrolling] = useState(false);
//   const scrollRef = useRef<HTMLDivElement>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [sortOrder, setSortOrder] = useState('newest');
//   const [filteredVideos, setFilteredVideos] = useState(initialVideoShorts);
//   const itemsPerPage = 15;

//   const handleReviewAdded = (newReview) => {
//     setVideoShorts([newReview, ...videoShorts]);
//   };

//   useEffect(() => {
//     if (scrollRef.current && selectedVideoIndex !== null) {
//       const scrollElements = scrollRef.current.children;
//       const elementToScroll = scrollElements[selectedVideoIndex];
//       elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'end' });
//     }
//   }, [selectedVideoIndex]);

//   const handleReturnToList = () => {
//     setSelectedVideoIndex(null);
//   };

//   const renderReturnButton = () => (
//     selectedVideoIndex !== null && (
//       <button
//         onClick={handleReturnToList}
//         style={{ right: '1rem', bottom: '5rem' }}
//         className="fixed z-10 group flex h-10 w-10 select-none items-center justify-center rounded-lg border border-zinc-100 bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-[0_-1px_0_0px_#d4d4d8_inset,0_0_0_1px_#f4f4f5_inset,0_0.5px_0_1.5px_#fff_inset] hover:bg-zinc-50 active:shadow-[-1px_0px_1px_0px_#e4e4e7_inset,1px_0px_1px_0px_#e4e4e7_inset,0px_0.125rem_1px_0px_#d4d4d8_inset] py-2 px-4 rounded"
//         aria-label="Change language"
//       >
//         <span className="flex items-center group-active:[transform:translate3d(0,1px,0)]">
//           ↩
//         </span>
//       </button>
//     )
//   );

//   const handleScroll = () => {
//     if (scrollRef.current) {
//       const children = Array.from(scrollRef.current.children);
//       const { scrollTop, clientHeight } = scrollRef.current;
//       const scrollThreshold = 4 * 16; // 4 rem in pixels
//       const bottomThreshold = clientHeight - scrollThreshold - 3 * 16; // 3 rem above the bottom of the screen

//       for (let i = 0; i < children.length; i++) {
//         const child = children[i] as HTMLElement;
//         const rect = child.getBoundingClientRect();
//         if (rect.top >= scrollThreshold && rect.bottom <= bottomThreshold) {
//           setSelectedVideoIndex(i);
//           break;
//         }
//       }
//     }
//   };

//   const handleSortOrderChange = (order: string) => {
//     setSortOrder(order);
//     setCurrentPage(1);
//   };

//   const getSortedVideos = () => {
//     const sortedVideos = [...filteredVideos].sort((a, b) => {
//       const dateA = new Date(a.createdAt);
//       const dateB = new Date(b.createdAt);
//       return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
//     });
//     return sortedVideos;
//   };

//   const indexOfLastVideo = currentPage * itemsPerPage;
//   const indexOfFirstVideo = indexOfLastVideo - itemsPerPage;
//   const currentVideos = getSortedVideos().slice(indexOfFirstVideo, indexOfLastVideo);

//   const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

//   const handleSearch = ({ searchTerm, searchUser, startDate, endDate }) => {
//     const filtered = videoShorts.filter(video => {
//       const matchesTitle = video.title.toLowerCase().includes(searchTerm.toLowerCase());
//       const matchesContent = video.content.toLowerCase().includes(searchUser.toLowerCase());
//       const matchesDate = (!startDate || new Date(video.createdAt) >= new Date(startDate)) &&
//                           (!endDate || new Date(video.createdAt) <= new Date(endDate));
//       return matchesTitle && matchesContent && matchesDate;
//     });
//     setFilteredVideos(filtered);
//     setCurrentPage(1);
//   };

//   const handleClear = () => {
//     setFilteredVideos(videoShorts);
//     setCurrentPage(1);
//   };

//   return selectedVideoIndex !== null ? (
//     <div ref={scrollRef} className="space-y-8 overflow-auto" style={{ height: '100vh' }} onScroll={handleScroll}>
//       {currentVideos.map((video, index) => (
//         <VideoDetail key={video.id} video={video} onClick={() => setSelectedVideoIndex(null)} isScrolling={isScrolling} />
//       ))}
//       {renderReturnButton()}
//     </div>
//   ) : (
//     <div className="container mx-auto p-4">
//       <div className="pb-5">
//         <div className="flex justify-between items-center mt-4">
//           <div className="flex items-center space-x-2">
//             <Switch
//               id="sort-order"
//               checked={sortOrder === 'newest'}
//               onCheckedChange={(checked) => handleSortOrderChange(checked ? 'newest' : 'oldest')}
//             />
//             <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
//           </div>
//           <div className="flex justify-between items-center">
//             <AddRating onReviewAdded={handleReviewAdded} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" />
//           </div>
//           <div className="flex items-center space-x-2">
//             <SearchRating onSearch={handleSearch} onClear={handleClear} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" />
//           </div>
//           <div className="flex items-center space-x-2">
//             <p className="pr-1">Count:</p>
//             <ReviewCount />
//           </div>
//         </div>
//       </div>
      
//       <div className="grid grid-cols-3 gap-0.5">
//         {currentVideos.map((video, index) => (
//           <div key={video.id} className="cursor-pointer" onClick={() => setSelectedVideoIndex(index)}>
//             <Image
//               src={video.imageUrl} 
//               alt={video.title}
//               width={300}
//               height={200}
//               layout="responsive"
//               objectFit="cover"
//             />
//           </div>
//         ))}
//       </div>
//       <Pagination>
//         <PaginationContent>
//           <PaginationItem>
//             <PaginationPrevious href="#" onClick={() => paginate(currentPage > 1 ? currentPage - 1 : currentPage)} />
//           </PaginationItem>
//           <PaginationItem>
//             <PaginationNext href="#" onClick={() => paginate(currentPage < Math.ceil(filteredVideos.length / itemsPerPage) ? currentPage + 1 : currentPage)} />
//           </PaginationItem>
//         </PaginationContent>
//       </Pagination>
//     </div>
//   );
// };

// export default WallT2;
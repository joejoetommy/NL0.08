import React from 'react';


const WallT4: React.FC = () => {


    return (

    <div className="container mx-auto p-4">
        <h1>WallT4</h1>
    </div>
  );
};

export default WallT4;










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





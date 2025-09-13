import React from 'react';


const WallT5: React.FC = () => {


    return (

    <div className="container mx-auto p-4">
        <h1>WallT5</h1>
    </div>
  );
};

export default WallT5;





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




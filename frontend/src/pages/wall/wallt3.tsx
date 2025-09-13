import React from 'react';


const WallT3: React.FC = () => {


    return (

    <div className="container mx-auto p-4">
        <h1>WallT3</h1>
    </div>
  );
};

export default WallT3;

// import React, { useState, useRef, useEffect } from "react";
// import { video as initialVideos } from "@/components/data/(wall)/wallt3";
// import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
// import { Switch } from "@/components/ui/switch";
// import { Label } from "@/components/ui/label";
// import ReviewCount from "@/components/item/(wallt3items)/reviewcount";
// import { AddRating } from "@/components/item/(wallt3items)/addrating";
// import { SearchRating } from "@/components/item/(wallt3items)/searchrating";
// import { Skeleton } from "@/components/ui/skeleton";

// const WallT3: React.FC = () => {
//   const [videos, setVideos] = useState(initialVideos);
//   const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
//   const scrollRef = useRef<HTMLDivElement>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [sortOrder, setSortOrder] = useState("newest");
//   const [filteredVideos, setFilteredVideos] = useState(initialVideos);
//   const [imageLoadingStates, setImageLoadingStates] = useState(initialVideos.map(() => true)); // For images
//   const itemsPerPage = 10;

//   useEffect(() => {
//     if (scrollRef.current && selectedImageIndex !== null) {
//       const scrollElements = scrollRef.current.children;
//       const elementToScroll = scrollElements[selectedImageIndex];
//       elementToScroll.scrollIntoView({ behavior: "smooth", block: "nearest" });
//     }
//   }, [selectedImageIndex]);

//   const handleReturnToList = () => {
//     setSelectedImageIndex(null);
//   };

//   const renderReturnButton = () => (
//     selectedImageIndex !== null && (
//       <button
//         onClick={handleReturnToList}
//         style={{ right: "1rem", bottom: "5rem" }}
//         className="fixed z-10 group flex h-10 w-10 select-none items-center justify-center rounded-lg border border-zinc-100 bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-[0_-1px_0_0px_#d4d4d8_inset,0_0_0_1px_#f4f4f5_inset,0_0.5px_0_1.5px_#fff_inset] hover:bg-zinc-50 active:shadow-[-1px_0px_1px_0px_#e4e4e7_inset,1px_0px_1px_0px_#e4e4e7_inset,0px_0.125rem_1px_0px_#d4d4d8_inset] py-2 px-4 rounded"
//         aria-label="Return to list"
//       >
//         <span className="flex items-center group-active:[transform:translate3d(0,1px,0)]">↩</span>
//       </button>
//     )
//   ); 

//   const handleSortOrderChange = (order: string) => {
//     setSortOrder(order);
//     setCurrentPage(1);
//   };

//   const getSortedVideos = () => {
//     const sortedVideos = [...filteredVideos].sort((a, b) => {
//       const dateA = new Date(a.createdAt);
//       const dateB = new Date(b.createdAt);
//       return sortOrder === "newest" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
//     });
//     return sortedVideos;
//   };

//   const handleImageLoad = (index: number) => {
//     setImageLoadingStates((prev) => {
//       const updated = [...prev];
//       updated[index] = false;
//       return updated;
//     });
//   };

//   const handleReviewAdded = (newVideo: typeof initialVideos[0]) => {
//     setVideos((prevVideos) => [newVideo, ...prevVideos]);
//   };

//   const handleSearch = ({ searchTerm, searchUser, startDate, endDate }) => {
//     const filtered = videos.filter((video) => {
//       const matchesTitle = video.title.toLowerCase().includes(searchTerm.toLowerCase());
//       const matchesContent = video.content.toLowerCase().includes(searchUser.toLowerCase());
//       const matchesDate =
//         (!startDate || new Date(video.createdAt) >= new Date(startDate)) &&
//         (!endDate || new Date(video.createdAt) <= new Date(endDate));
//       return matchesTitle && matchesContent && matchesDate;
//     });
//     setFilteredVideos(filtered);
//     setCurrentPage(1);
//   };

//   const handleClear = () => {
//     setFilteredVideos(videos);
//     setCurrentPage(1);
//   };

//   const currentVideos = getSortedVideos().slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );

//   return (
//     <div className="container mx-auto p-4">
//       <div className="pb-5">
//         <div className="flex justify-between items-center mt-4">
//           <div className="flex items-center space-x-2">
//             <Switch
//               id="sort-order"
//               checked={sortOrder === "newest"}
//               onCheckedChange={(checked) => handleSortOrderChange(checked ? "newest" : "oldest")}
//             />
//             <Label htmlFor="sort-order">{sortOrder === "newest" ? "Newest" : "Oldest"}</Label>
//           </div>
//           <div className="flex items-center space-x-2">
//             <AddRating
//               onReviewAdded={handleReviewAdded}
//               className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2"
//             />
//           </div>
//           <div className="flex items-center space-x-2">
//             <SearchRating
//               onSearch={handleSearch}
//               onClear={handleClear}
//               className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2"
//             />
//           </div>
//           <div className="flex items-center space-x-2">
//             <p className="pr-1">Count:</p>
//             <ReviewCount />
//           </div>
//         </div>
//       </div>
//       {selectedImageIndex !== null ? (
//         <div ref={scrollRef} className="space-y-8 overflow-auto" style={{ height: "80vh" }}>
//           {currentVideos.map((videoItem, index) => (
//             <div key={videoItem.id} className="text-center">
//               <p>Video details</p>
//             </div>
//           ))}
//           {renderReturnButton()}
//         </div>
//       ) : (
//         <div>
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
//             {currentVideos.map((videoItem, index) => (
//               <div key={videoItem.id} className="cursor-pointer">
//                 <div className="relative">
//                   {imageLoadingStates[index] ? (
//                     <Skeleton className="w-full h-32 object-cover rounded-lg" />
//                   ) : (
//                     <img
//                       src={videoItem.imageUrl}
//                       className="w-full h-32 object-cover rounded-lg"
//                       alt="Video thumbnail"
//                       onLoad={() => handleImageLoad(index)}
//                     />
//                   )}
//                   <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
//                     {Math.floor(videoItem.duration / 60)}:
//                     {String(videoItem.duration % 60).padStart(2, "0")}
//                   </span>
//                 </div>
//                 <div className="mt-2">
//                   <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
//                     {videoItem.title}
//                   </h3>
//                   <p className="text-xs text-gray-500">
//                     {videoItem.comments} comments • {videoItem.likes} likes
//                   </p>
//                 </div>
//               </div>
//             ))}
//           </div>
//           <Pagination>
//             <PaginationContent>
//               <PaginationItem>
//                 <PaginationPrevious
//                   href="#"
//                   onClick={() =>
//                     setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev))
//                   }
//                 />
//               </PaginationItem>
//               <PaginationItem>
//                 <PaginationNext
//                   href="#"
//                   onClick={() =>
//                     setCurrentPage((prev) =>
//                       prev < Math.ceil(filteredVideos.length / itemsPerPage)
//                         ? prev + 1
//                         : prev
//                     )
//                   }
//                 />
//               </PaginationItem>
//             </PaginationContent>
//           </Pagination>
//         </div>
//       )}
//     </div>
//   );
// };

// export default WallT3;


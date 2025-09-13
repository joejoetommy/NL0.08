import React from 'react';


const WallT7: React.FC = () => {


    return (

    <div className="container mx-auto p-4">
        <h1>WallT7</h1>
    </div>
  );
};

export default WallT7;





// import React, { useState, useRef, useEffect } from 'react';
// import Image from 'next/image';
// import { imageDataTag } from '@/components/data/(wall)/walltag';
// import { WallPost } from '@/components/models/(wall)/PostType';
// import { Icon } from '@iconify/react';
// // Ive just plugged in the existing  wallT 1-6 tabs for now;however this is for Tags
// import WallT1 from '@/components/wall/wallt1';
// import WallT2 from '@/components/wall/wallt2';
// import WallT3 from '@/components/wall/wallt3';
// import WallT4 from '@/components/wall/wallt4';
// import WallT5 from '@/components/wall/wallt5';
// import WallT6 from '@/components/wall/wallt6';
// import { motion } from "framer-motion";


// const ImageDetailTag: React.FC<{ image: WallPost }> = ({ image }) => (
//   <div className="text-center">
//     <Image
//       src={image.imageUrl}
//       alt={image.title}
//       width={600}
//       height={400}
//       layout="responsive"
//       objectFit="cover"
//     />
//     <div className="my-4">
//       <h2 className="text-2xl font-bold">{image.title}</h2>
//       <p>{image.content}</p>
//       <p>Likes: {image.likes}</p>
//       <p>Comments: {image.comments}</p>
//     </div>
//   </div>
// );

// const subTabs = {
//   1: 'mdi:wall',
//   2: 'simple-icons:youtubeshorts',
//   3: 'bxs:videos',
//   4: 'hugeicons:quill-write-02',
//   5: 'ant-design:audio-filled',
//   6: 'ep:goods-filled'
// };

// const WallT7: React.FC = () => {
//   const [selectedSubTab, setSelectedSubTab] = useState<number>(1);
//   const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
//   const scrollRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (scrollRef.current && selectedImageIndex !== null) {
//       const scrollElements = scrollRef.current.children;
//       const elementToScroll = scrollElements[selectedImageIndex];
//       elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
//     }
//   }, [selectedImageIndex]);

//   const handleReturnToList = () => {
//     setSelectedImageIndex(null);
//   }; 

//   const renderReturnButton = () => (
//     selectedImageIndex !== null && (
//       <button
//         onClick={handleReturnToList}
//         style={{ right: '1rem', bottom: '2.5rem' }}
//         className="fixed z-10 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
//       >
//         Return
//       </button>
//     )
//   );

//   const renderSubTabContent = () => {
//     switch (selectedSubTab) {
//       case 1:
//         return <WallT1 />;
//       case 2:
//         return <WallT2 />;
//       case 3:
//         return <WallT3 />;
//       case 4:
//         return <WallT4 />;
//       case 5:
//         return <WallT5 />;
//       case 6:
//         return <WallT6 />;
//       default:
//         return <div>Unknown sub-tab</div>;
//     }
//   };

//   return (
//     <div>
//       <div className="flex justify-center mb-4">
//         {Object.entries(subTabs).map(([num, icon]) => (
//           // <button
//           //   key={num}
//           //   className={`px-1 py-1 mx-1 ${selectedSubTab === parseInt(num)
//           //        ? "text-white  rounded"
//           //     : "hover:text-blue-600 text-bold bg-white-500 rounded"
//           //     }`}
//           //   onClick={() => setSelectedSubTab(parseInt(num))}
//           // >
//           //   <Icon icon={icon} width="18" height="18" />
              
//           // </button>

// <button
//   key={num}
//   className={`px-1 py-1 mx-1 relative ${
//     selectedSubTab === parseInt(num)
//       ? "text-white rounded"
//       : "hover:text-sky-500 text-bold bg-white-500 rounded"
//   }`}
//   onClick={() => setSelectedSubTab(parseInt(num))}
// >
//   <Icon icon={icon} width="18" height="18" />

//   {selectedSubTab === parseInt(num) && (
//     <div className="absolute inset-0 flex items-center justify-center">
//       {/* Top-left corner */}
//       <div className="absolute top-0 left-0 border-t-2 border-l-2 border-sky-500 w-2 h-2 rounded-tl" />
//       {/* Top-right corner */}
//       <div className="absolute top-0 right-0 border-t-2 border-r-2 border-sky-500 w-2 h-2 rounded-tr" />
//       {/* Bottom-left corner */}
//       <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-sky-500 w-2 h-2 rounded-bl" />
//       {/* Bottom-right corner */}
//       <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-sky-500 w-2 h-2 rounded-br" />
//     </div>
//   )}
// </button>
//         ))}
//       </div>
//       {renderSubTabContent()}
//     </div>
//   );
// };

// export default WallT7;

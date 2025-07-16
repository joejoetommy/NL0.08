// src/components/home/Post.tsx
// Post.tsx  // Add Network Connection
import React, { useState } from 'react';
import DMProfile from '../profile/item/dmprofile';
import { XpubDisplay } from '../profile/FormCards/profile/xpubdisplay';
import AccountSettings from '../profile/item/accountsettings';

interface PostProps {
  xpub: string;
  name: string;
  username: string;
  title: string;
  body: string;
  backgroundImage: string;
  profileImage: string;
  lastUpdated: string;
  addedDate: string;
}

const Post: React.FC<PostProps> = ({ 
  xpub, 
  name, 
  username, 
  title, 
  body,
  backgroundImage,
  profileImage,
  lastUpdated,
  addedDate
}) => {
  const [isDMOpen, setIsDMOpen] = useState(false);
  const [isXpubOpen, setIsXpubOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Function to render profile image (color or actual image)
  const renderProfileImage = () => {
    if (profileImage.startsWith('#')) {
      return (
        <div 
          className="h-12 w-12 rounded-full flex-shrink-0"
          style={{ backgroundColor: profileImage }}
        />
      );
    }
    return (
      <img 
        src={profileImage} 
        alt={name} 
        className="h-12 w-12 rounded-full flex-shrink-0 object-cover"
      />
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const handleShare = async () => {
    const shareData = {
      title: `${name} - ${title}`,
      text: `Check out ${name}'s profile: ${body}`,
      url: `${window.location.origin}/contact/${xpub}` // You can customize this URL
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        const textToCopy = `${shareData.title}\n${shareData.text}\nXpub: ${xpub}`;
        await navigator.clipboard.writeText(textToCopy);
        alert('Contact information copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <>
      <div 
        className="p-4 border-b border-zinc-700 hover:bg-white/5 transition-colors cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex space-x-4">
          {renderProfileImage()}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-baseline space-x-2 flex-wrap">
                <span className="font-bold truncate">{name}</span>
                <span className="text-gray-500 text-sm">@{username}</span>
              </div>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                {formatDate(lastUpdated)}
              </span>
            </div>
            
            {/* Title */}
            <p className="text-sm text-sky-400 mb-2 truncate">{title}</p>
            
            {/* Mission/Body */}
            <p className={`text-gray-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
              {body}
            </p>
            
            {/* Contact since date (shown when expanded) */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-gray-500">
                  Contact since: {new Date(addedDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                  Xpub: {xpub.substring(0, 20)}...{xpub.substring(xpub.length - 20)}
                </p>
              </div>
            )}
            
            {/* Interaction buttons */}
            <div className="flex items-center justify-between mt-3 max-w-md">
              {/* DM Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDMOpen(true);
                }}
                className="flex items-center space-x-2 text-gray-500 hover:text-sky-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5"
                title="Send Message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              
              {/* XpubDisplay Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsXpubOpen(true);
                }}
                className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors p-2 rounded-lg hover:bg-white/5"
                title="View QR Code"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
              
              {/* Share Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-white/5"
                title="Share Contact"
              >
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
                  <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
                </svg>
              </button>
              
              {/* Settings Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsOpen(true);
                }}
                className="text-gray-500 hover:text-purple-500 transition-colors p-2 -mr-2 rounded-lg hover:bg-white/5"
                title="Contact Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DM Dialog - You might need to pass xpub or contact info here */}
      {isDMOpen && (
        <DMProfile 
          isOpen3={isDMOpen} 
          onClose3={() => setIsDMOpen(false)} 
        />
      )}

      {/* XpubDisplay Dialog - Modified to show contact's xpub */}
      {isXpubOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <h3 className="text-lg font-semibold">Contact QR Code</h3>
              <button
                onClick={() => setIsXpubOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="text-center mb-4">
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-gray-500">@{username}</p>
              </div>
              {/* You can integrate your existing XpubDisplay component here */}
              <div className="bg-white p-4 rounded-lg">
                {/* QR Code would go here */}
                <div className="h-48 w-48 mx-auto bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500">QR Code</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center font-mono break-all">
                {xpub}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Dialog */}
      {isSettingsOpen && (
        <AccountSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          name={name}
          username={username}
        />
      )}
    </>
  );
};

export default Post;


// this is the orginal post from the website api call 
// import React, { useState } from 'react';
// import DMProfile from '../profile/item/dmprofile';
// import { XpubDisplay } from '../profile/FormCards/profile/xpubdisplay';
// import AccountSettings from '../profile/item/accountsettings';

// interface PostProps {
//   name: string;
//   username: string;
//   body: string;
// }

// const Post: React.FC<PostProps> = ({ name, username, body }) => {
//   const [isDMOpen, setIsDMOpen] = useState(false);
//   const [isXpubOpen, setIsXpubOpen] = useState(false);
//   const [isSettingsOpen, setIsSettingsOpen] = useState(false);

//   const handleShare = async () => {
//     const shareData = {
//       title: `${name} (@${username})`,
//       text: `Check out ${name}'s profile @${username}`,
//       url: window.location.href // You can customize this URL
//     };

//     try {
//       if (navigator.share) {
//         await navigator.share(shareData);
//       } else {
//         // Fallback for browsers that don't support Web Share API
//         // Copy to clipboard instead
//         const textToCopy = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
//         await navigator.clipboard.writeText(textToCopy);
//         alert('Contact information copied to clipboard!');
//       }
//     } catch (error) {
//       console.error('Error sharing:', error);
//     }
//   };

//   return (
//     <>
//       <div className="p-4 border-b border-zinc-700 hover:bg-white/5 transition-colors cursor-pointer">
//         <div className="flex space-x-4">
//           <span className="h-12 w-12 bg-zinc-300 rounded-full flex-shrink-0"></span>
//           <div className="flex-1">
//             <div className="mb-2">
//               <span className="font-bold">{name}</span>
//               <span className="text-gray-500"> @{username}</span>
//             </div>
//             <p>{body}</p>
            
//             {/* Updated interaction buttons */}
//             <div className="flex items-center justify-between mt-3 max-w-md">
//               {/* DM Button */}
//               <button 
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setIsDMOpen(true);
//                 }}
//                 className="flex items-center space-x-2 text-gray-500 hover:text-sky-500 transition-colors"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//                 </svg>
//               </button>
              
//               {/* XpubDisplay Button */}
//               <button 
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setIsXpubOpen(true);
//                 }}
//                 className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
//                 </svg>
//               </button>
              
//               {/* Share Button */}
//               <button 
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   handleShare();
//                 }}
//                 className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
//               >
//                 <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                   <circle cx="18" cy="5" r="3"/>
//                   <circle cx="6" cy="12" r="3"/>
//                   <circle cx="18" cy="19" r="3"/>
//                   <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
//                   <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
//                 </svg>
//               </button>
              
//               {/* Settings Button (4th button) */}
//               <button 
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setIsSettingsOpen(true);
//                 }}
//                 className="text-gray-500 hover:text-purple-500 transition-colors"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                 </svg>
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* DM Dialog */}
//       {isDMOpen && (
//         <DMProfile 
//           isOpen3={isDMOpen} 
//           onClose3={() => setIsDMOpen(false)} 
//         />
//       )}

//       {/* XpubDisplay Dialog */}
//       {isXpubOpen && (
//         <XpubDisplay 
//           isOpen2={isXpubOpen} 
//           onClose2={() => setIsXpubOpen(false)} 
//         />
//       )}

//       {/* Account Settings Dialog */}
//       {isSettingsOpen && (
//         <AccountSettings
//           isOpen={isSettingsOpen}
//           onClose={() => setIsSettingsOpen(false)}
//           name={name}
//           username={username}
//         />
//       )}
//     </>
//   );
// };

// export default Post;




// import React from 'react';

// interface PostProps {
//   name: string;
//   username: string;
//   body: string;
// }

// const Post: React.FC<PostProps> = ({ name, username, body }) => {
//   return (
//     <div className="p-4 border-b border-zinc-700 hover:bg-white/5 transition-colors cursor-pointer">
//       <div className="flex space-x-4">
//         <span className="h-12 w-12 bg-zinc-300 rounded-full flex-shrink-0"></span>
//         <div className="flex-1">
//           <div className="mb-2">
//             <span className="font-bold">{name}</span>
//             <span className="text-gray-500"> @{username}</span>
//           </div>
//           <p>{body}</p>
          
//           {/* Tweet interaction buttons */}
//           <div className="flex items-center justify-between mt-3 max-w-md">
//             <button className="flex items-center space-x-2 text-gray-500 hover:text-sky-500 transition-colors">
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//               </svg>
//             </button>
//             <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
//               </svg>
//             </button>
//             <button className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors">
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
//               </svg>
//             </button>
//             <button className="text-gray-500 hover:text-sky-500 transition-colors">
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
//               </svg>
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Post;
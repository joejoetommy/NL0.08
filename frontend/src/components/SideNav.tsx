// src/components/SideNav.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  SquareUserRound, 
  Search, 
  Wallet, 
  Mail,
  User,
  MailOpen 
} from 'lucide-react';
import EntryDialog from './EntryDialog';

const SideNav: React.FC = () => {
  const location = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Navigation state based on current path
  const isHomeActive = location.pathname === '/';
  const isExploreActive = location.pathname === '/explore';
  const isWalletActive = location.pathname === '/wallet';
  const isMessagesActive = location.pathname === '/messages';

  return (
    <div className="flex-col space-y-4 items-center py-8 hidden sm:flex border-r border-zinc-700 h-full w-[120px] md:w-[250px] md:items-start fixed">
      {/* Account Button */}
      <div
        onClick={() => setDialogOpen(true)}
        className="flex flex-row space-x-1 items-center hover:bg-white/10 p-4 rounded-full duration-200 cursor-pointer"
      >
        <SquareUserRound size={38} className="text-gray-400 hover:text-sky-500 transition-colors" />
      </div>
      
      <EntryDialog 
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />

      <Link
        to="/"
        className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
      >
        <div className="flex items-center justify-center">
          <div className={isHomeActive ? 'rounded-full border-2 border-sky-500 p-1 bg-black' : ''}>
            {isHomeActive ? (
              <User 
                size={38}
                className="text-white"
              />
            ) : (
              <SquareUserRound 
                size={38}
                className="text-gray-500"
              />
            )}
          </div>
        </div>

        <span
          className={`text-2xl pt-2 hidden md:flex ${isHomeActive ? 'font-bold text-white' : 'text-gray-400'}`}
        >
          Profile
        </span>
      </Link>

      <Link
        to="/explore"
        className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
      >
        <div className={isExploreActive ? 'rounded-full border-2 border-sky-500 p-1 bg-black' : ''}>
          <Search size={38} className={isExploreActive ? 'text-white stroke-[2.5]' : 'text-gray-500'} />
        </div>
        <span
          className={`text-2xl pt-2 hidden md:flex ${isExploreActive ? 'font-bold' : ''}`}
        >
          Explore
        </span>
      </Link>

      <Link
        to="/wallet"
        className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
      >
        <div className={isWalletActive ? 'rounded-full border-2 border-sky-500 p-1 bg-black' : ''}>
          <Wallet
            size={38}
            fill={isWalletActive ? 'currentColor' : 'none'}
            className={isWalletActive ? 'text-white' : 'text-gray-500'}
          />
        </div>
        <span
          className={`text-2xl pt-2 hidden md:flex ${isWalletActive ? 'font-bold' : ''}`}
        >
          Wallet
        </span>
      </Link>

      <Link
        to="/messages"
        className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
      >
        <div className={isMessagesActive ? 'rounded-full border-2 border-sky-500 p-1 bg-black' : ''}>
          {isMessagesActive ? (
            <MailOpen size={38} className="text-white" />
          ) : (
            <Mail size={38} className="text-gray-500" />
          )}
        </div>
        <span
          className={`text-2xl pt-2 hidden md:flex ${isMessagesActive ? 'font-bold' : ''}`}
        >
          Messages
        </span>
      </Link>
    </div>
  );
};

export default SideNav;























// // src/components/SideNav.tsx
// import React from 'react';
// import { Link, useLocation } from 'react-router-dom';
// import { 
//   SquareUserRound, 
//   Search, 
//   Wallet, 
//   Mail,
//   User,
//   MailOpen 
// } from 'lucide-react';
// // import EntryPage from '../pages/EntryPage';

// const SideNav: React.FC = () => {
//   const location = useLocation();
  
//   // Navigation state based on current path
//  // const isHomeActive = location.pathname === '/profile';
//    //  const isProfileActive = location.pathname === '/profile';
//   const isHomeActive = location.pathname === '/';
//   const isExploreActive = location.pathname === '/explore';
//   //  const isContentActive = location.pathname === '/content';
//   const isWalletActive = location.pathname === '/wallet';
//   const isMessagesActive = location.pathname === '/messages';


//   return (
//     <div className="flex-col space-y-4 items-center py-8 hidden sm:flex border-r border-zinc-700 h-full w-[120px] md:w-[250px] md:items-start fixed">
//       <Link
//         to="/"
//         className="flex flex-row space-x-1 items-center hover:bg-white/10 p-4 rounded-full duration-200"
//       >
//         <SquareUserRound size={38} />

//       </Link>
      

//         <Link
//           to="/"
//           className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
//         >
//           <div className="flex items-center justify-center">
//             <div className={isHomeActive ? 'rounded-full border-2 border-sky-500 p-1 bg-black' : ''}>
//               {isHomeActive ? (
//                 <User 
//                   size={38}
//                   className="text-white"
//                 />
//               ) : (
//                 <SquareUserRound 
//                   size={38}
//                   className="text-gray-500"
//                 />
//               )}
//             </div>
//           </div>


//           <span
//             className={`text-2xl pt-2 hidden md:flex ${isHomeActive ? 'font-bold text-white' : 'text-gray-400'}`}
//           >
//             Profile
//           </span>
//         </Link>

//   <Link
//     to="/explore"
//     className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
//   >
//     <div className={isExploreActive ? 'rounded-full border-2 border-sky-500 p-1 bg-black' : ''}>
//       <Search size={38} className={isExploreActive ? 'text-white stroke-[2.5]' : 'text-gray-500'} />
//     </div>
//     <span
//       className={`text-2xl pt-2 hidden md:flex ${isExploreActive ? 'font-bold' : ''}`}
//     >
//       Explore
//     </span>
//   </Link>
//     {/* <Link
//     to="/content"
//     className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
//   >
//     <div className={isContentActive ? 'rounded-full border-2 border-sky-500 p-1 bg-black' : ''}>
//       <Search size={38} className={isContentActive ? 'text-white stroke-[2.5]' : 'text-gray-500'} />
//     </div>
//     <span
//       className={`text-2xl pt-2 hidden md:flex ${isContentActive ? 'font-bold' : ''}`}
//     >
//       Content
//     </span>
//   </Link> */}

//   <Link
//     to="/wallet"
//     className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
//   >
//     <div className={isWalletActive ? 'rounded-full border-2 border-sky-500 p-1 bg-black' : ''}>
//       <Wallet
//         size={38}
//         fill={isWalletActive ? 'currentColor' : 'none'}
//         className={isWalletActive ? 'text-white' : 'text-gray-500'}
//       />
//     </div>
//     <span
//       className={`text-2xl pt-2 hidden md:flex ${isWalletActive ? 'font-bold' : ''}`}
//     >
//       Wallet
//     </span>
//   </Link>

//   <Link
//     to="/messages"
//     className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
//   >
//     <div className={isMessagesActive ? 'rounded-full border-2 border-sky-500 p-1 bg-black' : ''}>
//       {isMessagesActive ? (
//         <MailOpen size={38} className="text-white" />
//       ) : (
//         <Mail size={38} className="text-gray-500" />
//       )}
//     </div>
//     <span
//       className={`text-2xl pt-2 hidden md:flex ${isMessagesActive ? 'font-bold' : ''}`}
//     >
//       Messages
//     </span>
//   </Link>
//     </div>
//   );
// };

// export default SideNav;

















































      {/* <Link
        to="/"
        className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
      >
        <Home 
          size={38} 
          fill={isHomeActive ? 'currentColor' : 'none'}
          className={isHomeActive ? 'text-white' : ''}
        />
        <span
          className={`text-2xl pt-2 hidden md:flex ${
            isHomeActive ? 'font-bold' : ''
          }`}
        >
          Home
        </span>
      </Link> */}
            {/* <Link
        to="/profile"
        className="flex flex-row space-x-4 items-center px-4 py-3 rounded-full duration-200 hover:bg-white/10"
      >
        <Mail 
          size={38}
          fill={isHomeActive ? 'currentColor' : 'none'}
          className={isHomeActive ? 'text-white' : ''}
        />
        <span
          className={`text-2xl pt-2 hidden md:flex ${
            isHomeActive ? 'font-bold' : ''
          }`}
        >
          Home
        </span>
      </Link> */}
// Profile.tsx - Enhanced with profile change detection
'use client';
// Home feed
import React, { useState } from 'react';

import useScrollingEffect from '../../hooks/use-scroll';
import { useTabs } from '../../hooks/use-tabs';
import { Framer } from '../../lib/framer';

// import ProfilePage from '@/components/Account/profile';

// import PowPage from '@/components/Account/pow';
            // import NetworkPage from '@/components/Account/network'; 
            // import ReviewPage from '@/components/Account/reviews';
// import AccountReview from '@/components/Account/accountreview';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";


// import { MdAccountBox } from "react-icons/md";
// import { RxComponent2 } from "react-icons/rx";  import WallPage from '../../components/profile/wall';
import { Icon } from '@iconify/react';
import HomeFeed from '../../components/profile/Profile1';
import WallPage from '../../components/profile/wall';
import { useWalletStore } from '../../components/wallet2/store/WalletStore';

interface TabInfo {
  id: string;
  displayName: string;
}

// <Icon icon="mdi:cards-heart" width="32" height="32" />   <Icon icon="fluent-mdl2:web-components" /> blue
const HomePage = () => {
  const scrollDirection = useScrollingEffect();
  const headerClass =
    scrollDirection === 'up' ? 'translate-y-0' : 'translate-y-[-50%]';
      const { network } = useWalletStore();

    
  const [hookProps] = useState({
    tabs: [
      {
        label: <Icon icon="iconamoon:profile-circle-fill" width="32" height="32" />,
        children: <HomeFeed network={network} />,
        id: 'Profile',
        displayName: 'Profile',
      },
            {
        label: <Icon icon="fluent-mdl2:web-components" width="32" height="32" />,
        children: <WallPage network={network} />,
        id: 'Profile',
        displayName: 'Profile',
      }
      // {
      //   label: <Icon icon="fluent-mdl2:web-components" width="32" height="32" />,
      //   children: <WallPage />,
      //   id: 'Wall',
      //   displayName: 'Wall',
      // },
      // {
      //   label: <Icon icon="akar-icons:link-chain" width="32" height="32" />,
      //   children: <PowPage />,
      //   id: 'POW',
      //   displayName: 'Proof on-Chain',
      // },
      // {
      //   label: <Icon icon="mdi:account-group" width="32" height="32" />,
      //   children: <NetworkPage />,
      //   id: 'Network',
      //   displayName: 'Network',
      // },
      // {
      //   label: <Icon icon="fluent-mdl2:account-activity" width="32" height="32" />,
      //   children: <ReviewPage />,
      //   id: 'Reviews',
      //   displayName: 'Reviews',
      // },
      // {
      //   label: <Icon icon="fluent-mdl2:account-activity" width="32" height="32" />,
      //   children: <AccountReview />,
      //   id: 'Reviews',
      //   displayName: 'Account reviews',
      // },
    ],
    initialTabId: 'Profile',
  });
  const framer = useTabs(hookProps);

 
    // State to hold the currently active tab's display name
   const [activeTabDisplayName, setActiveTabDisplayName] = useState<string>('displayName');
  
    // Handler to update the active tab
    const handleTabClick = (tab: TabInfo) => {
      setActiveTabDisplayName(tab.displayName);
    };
    

  return (
    <div className="flex flex-col flex-1">
      <div
        className={`flex flex-col border-b border-zinc-700 sticky inset-x-0 pt-2 top-0 z-30 w-full transition-all backdrop-blur-xl  ${headerClass} md:translate-y-0`}
      >
        <div className="flex justify-between">
      
        <span className=" flex px-4 font-bold text-2xl">{framer.selectedTab.displayName}
        </span>
            <div className="flex justify-end pr-6" >
              <Avatar className="flex">
              <AvatarImage src="" alt="@shadcn" />
              <AvatarFallback>NL</AvatarFallback>
              </Avatar>
            </div>
        </div>
        <div className="flex flex-row w-full items-center justify-around mt-4">
          <Framer.Tabs {...framer.tabProps} />
        </div>
      </div>

      <div className="pt-10 flex  flex-1 h-screen">
        {framer.selectedTab.children}
      </div>
    </div>
  );
};

export default HomePage;


























































// src/components/home/Profile.tsx

// import React, { useState } from 'react';
// import { FaEnvelope   } from 'react-icons/fa';
// import { BsQrCode   } from 'react-icons/bs';
// import { NetworkRequest } from '../profile/FormCards/profile/networkrequest';
// import { XpubDisplay } from '../profile/FormCards/profile/xpubdisplay';
// import { getProfileData, updateProfileData } from '../profile/data/profiledata';
// import DMProfile from '../profile/item/dmprofile';
// import SettingProfile from '../profile/item/settingprofile';

// const Profile: React.FC = () => {
//   const profileData = getProfileData();
//   const [isExpanded, setIsExpanded] = useState<boolean>(false);
//   const [showNetworkDialog, setShowNetworkDialog] = useState<boolean>(false);
//   const [isExpanded1, setIsExpanded1] = useState<boolean>(false);

//   const handleClick = (): void => {
//     setIsExpanded(!isExpanded);
//     setShowNetworkDialog(true);
//   };

//   const handleClick1 = (): void => {
//     setIsExpanded1(!isExpanded1);
//   };

//   const [isOpen2, setIsOpen2] = useState<boolean>(false);
//   const [isOpen3, setIsOpen3] = useState<boolean>(false);
//   const handleOpen2 = (): void => setIsOpen2(true);
//   const handleClose2 = (): void => setIsOpen2(false);
//   const handleOpen3 = (): void => setIsOpen3(true);
//   const handleClose3 = (): void => setIsOpen3(false);

//   return (
//     <div className="container mx-auto p-1">
//       <div className="flex justify-center mb-4">
//         <div className="relative h-64 w-full">
//           <img
//             src={profileData.backgroundImage}
//             alt="Background Image"
//             className="rounded w-full h-full object-cover"
//           />
//           <div className="absolute right-0 pr-6 transform bottom-[-64px]">
//             <div className="border-4 border-white rounded-full w-32 h-32 overflow-hidden">
//               <img
//                 src={profileData.profileImage}
//                 alt="Profile"
//                 className="object-cover w-32 h-32"
//                 width={128}
//                 height={128}
//               />
//             </div>
//           </div>
//         </div>
//       </div>

//       <div>
//         <div className="relative w-full flex items-center border-bottom">
//           <div className="absolute pl-5 pb-3 left-2 flex space-x-12">
//             <div className="relative">
//               <FaEnvelope className="cursor-pointer" onClick={handleOpen3} />
//               {isOpen3 && 
//                 <DMProfile isOpen3={isOpen3} onClose3={handleClose3} />}
//             </div>
//             <div className="relative">

//               <BsQrCode  className="cursor-pointer" onClick={handleOpen2} />
//               {isOpen2 && 
//                 <XpubDisplay isOpen2={isOpen2} onClose2={handleClose2} />}
//             </div>
//             <div className="relative">

//             </div>
//           </div>
//           <div className='absolute pt-8 right-10 flex'>
//             <SettingProfile className="absolute cursor-pointer" />  
//           </div>
//           <div className="pt-4">
//             <div className="absolute pt-18 left-2 flex text-center items-center">
//               <p className="text-ms font-bold cursor-pointer">
//                 {profileData.Profile.username}
//               </p>
//               <p className="text-ms font-bold">@NL</p>
//             </div>
//           </div>
//           <div className="w-full">
//             <div className="absolute text-align-center pl-2 pb-6 pt-10 left-2 flex text-center items-center text-xl font-bold">
//               <p className="text-ms font-bold cursor-pointer">
//                 {profileData.Profile.title}
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="w-full pt-11">
//         <div className="flex w-full mt-4">
//           <div className="flex-1 flex justify-center items-center p-3">
//             <div className="flex items-center space-x-3 mb-2">
//               <p className="t-2 line-clamp-4 overflow-hidden">
//                 {profileData.Profile.mision}
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="w-full flex border-t border-black pt-2">

//         </div>
//       </div>

//           <div className="mt-4">
//             <div className="flex flex-col w-full">
//               <div className="flex w-full">
//                 <div className="flex-1 flex flex-col items-start pl-4">
//                   <button
//                     className="group relative min-w-[11rem] h-12 overflow-hidden rounded-[16px] border border-neutral-200 bg-gray-500 bg-opacity-60 px-4 text-neutral-950"
//                     onClick={handleClick}
//                   >
//                     <span className="relative inline-flex">
//                       Net
//                       <span className="duration-700 [transition-delay:0.02s] group-hover:[transform:rotateY(360deg)]"></span>
//                       <span className="duration-700 [transition-delay:0.08s] group-hover:[transform:rotateY(360deg)]">w</span>
//                       <span className="duration-700 [transition-delay:0.10s] group-hover:[transform:rotateY(360deg)]">o</span>
//                       <span className="duration-700 [transition-delay:0.12s] group-hover:[transform:rotateY(360deg)]">r</span>
//                       <span className="duration-700 [transition-delay:0.14s] group-hover:[transform:rotateY(360deg)]">k</span>
//                       {isExpanded && (
//                         <>
//                           <span className="duration-700 [transition-delay:0.16s] group-hover:[transform:rotateY(360deg)]">i</span>
//                           <span className="duration-700 [transition-delay:0.18s] group-hover:[transform:rotateY(360deg)]">n</span>
//                           <span className="duration-700 [transition-delay:0.20s] group-hover:[transform:rotateY(360deg)]">g</span>
//                         </>
//                       )}
//                     </span>
//                   </button>
//                   <NetworkRequest open={showNetworkDialog} onOpenChange={setShowNetworkDialog} />
//                 </div>
//               </div>
//             </div>
//           </div>
//     </div>
//   );
// };

// export default Profile;

































// import React, { useState } from 'react';
// import { FaEnvelope   } from 'react-icons/fa';
// import { BsQrCode   } from 'react-icons/bs';
// // import { FaEnvelope, FaMapMarkerAlt, FaFileAlt, FaPlus, FaCog } from 'react-icons/fa';
// //  import { addDays, format } from 'date-fns';
// // import { Calendar as CalendarIcon } from 'lucide-react';

// // UI Components
// // import { Input } from "./components/ui/input";
// // import { Slider } from "./components/ui/slider";
// // import { Button } from "./components/ui/button";
// // import { Calendar } from "./components/ui/calendar";
// // import {
// //   Popover,
// //   PopoverContent,
// //   PopoverTrigger,
// // } from "./components/ui/popover";

// // Data imports
// // import { ITEMS, ITEMS1 } from '../profile/data/card';

// // Profile components
// import { NetworkRequest } from '../profile/FormCards/profile/networkrequest';
// import { XpubDisplay } from '../profile/FormCards/profile/xpubdisplay';
// // import { NetworkList } from '../profile/FormCards/profile/networklist';
// // import { FollowingList } from '../profile/FormCards/profile/followinglist';
// // import { FollowerList } from '../profile/FormCards/profile/followerlist';
// // import { PowList } from '../profile/FormCards/profile/powpush';

// // // User contact data
// // import { networkUsers } from "../profile/data/profile/networkcontacts";
// // import { followingUsers } from "../profile/data/profile/followingcontacts";
// // import { followerUsers } from "../profile/data/profile/followercontacts";
// // import { POWPushs } from "../profile/data/profile/powpush";

// import { getProfileData, updateProfileData } from '../profile/data/profiledata';

// // Item components
// // import Subtle3DCarousel from '../profile/item/card';              
// // import SettingProfile from '../profile/item/settingprofile';
// // import CVProfile from '../profile/item/cvprofile';
// // import LocationProfile from '../profile/item/locationprofile';
// import DMProfile from '../profile/item/dmprofile';
// // import FamilyPopoverMenu from '../profile/item/popout';
// import SettingProfile from '../profile/item/settingprofile';

// // Utility function for className concatenation
// // import { cn } from '../../lib/utils';

// // Types
// // interface DateRange {
// //   from: Date;
// //   to?: Date;
// // }

// const Profile: React.FC = () => {
//   const profileData = getProfileData();
//   // const [carouselItems1, setCarouselItems1] = useState(profileData.carouselItems1);

//   // const [networkRequested, setNetworkRequested] = useState<boolean>(false);
//   // const [networking, setnetworking] = useState<boolean>(false);
//   // const [bio, setBio] = useState<string>(profileData.Profile.bio);
//   // const [title, setTitle] = useState<string>(profileData.Profile.title);
//   // const [skills, setSkills] = useState(profileData.carouselItems1);
  
//   // const [jobs, setJobs] = useState(profileData.carouselItems2);
//   // const [date, setDate] = useState<DateRange | undefined>({
//   //   from: new Date(2022, 0, 20),
//   //   to: addDays(new Date(2022, 0, 20), 20),
//   // });

//   // Expansion states
//   const [isExpanded, setIsExpanded] = useState<boolean>(false);
//   const [showNetworkDialog, setShowNetworkDialog] = useState<boolean>(false);
//   const [isExpanded1, setIsExpanded1] = useState<boolean>(false);
// //   const [isExpanded2, setIsExpanded2] = useState<boolean>(false);

//   const handleClick = (): void => {
//     setIsExpanded(!isExpanded);
//     setShowNetworkDialog(true);
//   };

//   const handleClick1 = (): void => {
//     setIsExpanded1(!isExpanded1);
//   };

//   // const handleClick2 = (): void => {
//   //   setIsExpanded2(!isExpanded2);
//   // };

//   // // Dialog states
//   // const [isOpen, setIsOpen] = useState<boolean>(false);
//   // const [isOpen1, setIsOpen1] = useState<boolean>(false);
//   const [isOpen2, setIsOpen2] = useState<boolean>(false);
//   const [isOpen3, setIsOpen3] = useState<boolean>(false);

//   // const handleOpen = (): void => setIsOpen(true);
//   // const handleClose = (): void => setIsOpen(false);
  
//   // const handleOpen1 = (): void => setIsOpen1(true);
//   // const handleClose1 = (): void => setIsOpen1(false);
  
//   const handleOpen2 = (): void => setIsOpen2(true);
//   const handleClose2 = (): void => setIsOpen2(false);
  
//   const handleOpen3 = (): void => setIsOpen3(true);
//   const handleClose3 = (): void => setIsOpen3(false);

//   // List dialog states
//   // const [showNetworkList, setShowNetworkList] = useState<boolean>(false);
//   // const [showFollowingList, setShowFollowingList] = useState<boolean>(false);
//   // const [showFollowerList, setShowFollowerList] = useState<boolean>(false);
//   // const [showPowList, setShowPowList] = useState<boolean>(false);

//   return (
//     <div className="container mx-auto p-1">
//       <div className="flex justify-center mb-4">
//         <div className="relative h-64 w-full">
//           <img
//             src={profileData.backgroundImage}
//             alt="Background Image"
//             className="rounded w-full h-full object-cover"
//           />
//           <div className="absolute right-0 pr-6 transform bottom-[-64px]">
//             <div className="border-4 border-white rounded-full w-32 h-32 overflow-hidden">
//               <img
//                 src={profileData.profileImage}
//                 alt="Profile"
//                 className="object-cover w-32 h-32"
//                 width={128}
//                 height={128}
//               />
//             </div>
//           </div>
//         </div>
//       </div>

//       <div>
//         <div className="relative w-full flex items-center border-bottom">
//           <div className="absolute pl-5 pb-3 left-2 flex space-x-12">
//             <div className="relative">
//               <FaEnvelope className="cursor-pointer" onClick={handleOpen3} />
//               {isOpen3 && 
//                 <DMProfile isOpen3={isOpen3} onClose3={handleClose3} />}
//             </div>
//             <div className="relative">
//               {/* <BsQrCode    className="cursor-pointer" onClick={handleOpen2} />
//                {isOpen2 && 
//                 <XpubDisplay isOpen2={isOpen2} onClose2={handleClose2} />} */}

//               <BsQrCode  className="cursor-pointer" onClick={handleOpen2} />
//               {isOpen2 && 
//                 <XpubDisplay isOpen2={isOpen2} onClose2={handleClose2} />}
//             </div>
//             <div className="relative">
//               {/* <FaFileAlt className="cursor-pointer" onClick={handleOpen1} /> */}
//               {/* {isOpen1 && 
//                 <CVProfile isOpen1={isOpen1} onClose1={handleClose1} />} */}
//             </div>
//           </div>
//           <div className='absolute pt-8 right-5 flex'>
//             <SettingProfile className="absolute cursor-pointer" />  
//           </div>
//           <div className="pt-4">
//             <div className="absolute pt-18 left-2 flex text-center items-center">
//               <p className="text-ms font-bold cursor-pointer">
//                 {profileData.Profile.username}
//               </p>
//               <p className="text-ms font-bold">@NL</p>
//             </div>
//           </div>
//           <div className="w-full">
//             <div className="absolute text-align-center pl-2 pb-6 pt-10 left-2 flex text-center items-center text-xl font-bold">
//               <p className="text-ms font-bold cursor-pointer">
//                 {profileData.Profile.title}
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="w-full pt-11">
//         <div className="flex w-full mt-4">
//           <div className="flex-1 flex justify-center items-center p-3">
//             <div className="flex items-center space-x-3 mb-2">
//               <p className="t-2 line-clamp-4 overflow-hidden">
//                 {profileData.Profile.mision}
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="w-full flex border-t border-black pt-2">
//           {/* <div className="w-1/4 flex justify-center items-center">
//             <div
//               className="flex pt-1 space-x-4 justify-center items-center cursor-pointer"
//               onClick={() => setShowPowList(true)}
//             >
//               <div className="text-center justify-center items-center">
//                 <p className="text-xl font-bold">{POWPushs.length}</p>
//                 <p>POW</p>
//               </div>
//             </div>
//             <PowList open={showPowList} onOpenChange={setShowPowList} />
//           </div> */}

//           {/* <div className="w-1/4 flex justify-center items-center">
//             <div
//               className="flex pt-1 space-x-4 justify-center items-center cursor-pointer"
//               onClick={() => setShowNetworkList(true)}
//             >
//               <div className="text-center justify-center items-center">
//                 <p className="text-xl font-bold">{networkUsers.length}</p>
//                 <p>Network</p>
//               </div>
//             </div>
//             <NetworkList open={showNetworkList} onOpenChange={setShowNetworkList} />
//           </div> */}

//           {/* <div className="w-1/4 flex justify-center items-center">
//             <div
//               className="flex pt-1 space-x-4 justify-center items-center cursor-pointer"
//               onClick={() => setShowFollowerList(true)}
//             >
//               <div className="text-center justify-center items-center">
//                 <p className="text-xl font-bold">{followerUsers.length}</p>
//                 <p>Follower</p>
//               </div>
//             </div>
//             <FollowerList open={showFollowerList} onOpenChange={setShowFollowerList} />
//           </div> */}

//           {/* <div className="w-1/4 flex justify-center items-center">
//             <div
//               className="flex pt-1 space-x-4 justify-center items-center cursor-pointer"
//               onClick={() => setShowFollowingList(true)}
//             >
//               <div className="text-center justify-center items-center">
//                 <p className="text-xl font-bold">{followingUsers.length}</p>
//                 <p>Following</p>
//               </div>
//             </div>
//             <FollowingList open={showFollowingList} onOpenChange={setShowFollowingList} />
//           </div> */}
//         </div>
//       </div>

//       <div className="mt-4">
//         <div className="flex flex-col w-full">
//           <div className="flex w-full">
//             <div className="flex-1 flex flex-col items-center">
//               <button
//                 className="group relative min-w-[11rem] h-12 overflow-hidden rounded-[16px] border border-neutral-200 bg-gray-500 bg-opacity-60 px-4 text-neutral-950"
//                 onClick={handleClick}
//               >
//                 <span className="relative inline-flex">
//                   Net
//                   <span className="duration-700 [transition-delay:0.02s] group-hover:[transform:rotateY(360deg)]"></span>
//                   <span className="duration-700 [transition-delay:0.08s] group-hover:[transform:rotateY(360deg)]">w</span>
//                   <span className="duration-700 [transition-delay:0.10s] group-hover:[transform:rotateY(360deg)]">o</span>
//                   <span className="duration-700 [transition-delay:0.12s] group-hover:[transform:rotateY(360deg)]">r</span>
//                   <span className="duration-700 [transition-delay:0.14s] group-hover:[transform:rotateY(360deg)]">k</span>
//                   {isExpanded && (
//                     <>
//                       <span className="duration-700 [transition-delay:0.16s] group-hover:[transform:rotateY(360deg)]">i</span>
//                       <span className="duration-700 [transition-delay:0.18s] group-hover:[transform:rotateY(360deg)]">n</span>
//                       <span className="duration-700 [transition-delay:0.20s] group-hover:[transform:rotateY(360deg)]">g</span>
//                     </>
//                   )}
//                 </span>
//               </button>
//               <NetworkRequest open={showNetworkDialog} onOpenChange={setShowNetworkDialog} />
//             </div>

//             <div className="flex-1 flex justify-center items-center">
//               <button
//                 className="group relative min-w-[11rem] h-12 overflow-hidden rounded-[16px] border border-neutral-200 bg-blue-500 px-4 text-neutral-950"
//                 onClick={handleClick1}
//               >
//                 <span className="relative inline-flex">
//                   F
//                   <span className="duration-700 [transition-delay:0.02s] group-hover:[transform:rotateY(360deg)]">o</span>
//                   <span className="duration-700 [transition-delay:0.08s] group-hover:[transform:rotateY(360deg)]">l</span>
//                   <span className="duration-700 [transition-delay:0.10s] group-hover:[transform:rotateY(360deg)]">l</span>
//                   <span className="duration-700 [transition-delay:0.12s] group-hover:[transform:rotateY(360deg)]">o</span>
//                   <span className="duration-700 [transition-delay:0.14s] group-hover:[transform:rotateY(360deg)]">w</span>
//                   {isExpanded1 && (
//                     <>
//                       <span className="duration-700 [transition-delay:0.16s] group-hover:[transform:rotateY(360deg)]">i</span>
//                       <span className="duration-700 [transition-delay:0.18s] group-hover:[transform:rotateY(360deg)]">n</span>
//                       <span className="duration-700 [transition-delay:0.20s] group-hover:[transform:rotateY(360deg)]">g</span>
//                     </>
//                   )}
//                 </span>
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* <div className="flex flex-col w-full pr-1 pt-2">
//           <div className="flex w-full">
//             <div className="flex-1 w-20 h-30 flex items-center justify-center">
//               <Subtle3DCarousel items={ITEMS} />
//             </div> 
//             <div className="flex-1 w-20 h-30 flex items-center justify-center">
//               <Subtle3DCarousel items={ITEMS1} />
//             </div>
//           </div>
//         </div> */}

//         {/* <div className="w-full max-w-screen-lg mx-auto">
//           <div className="p-4 border-b border-zinc-700">
//             <div className="flex space-x-4">
//               <div className="flex-1">
//                 <div className="mb-2">
//                   <span className="font-bold">Story</span>
//                   <span className="text-gray-500">@NL</span>
//                 </div>
//                 <div className="flex flex-col items-center space-x-3 mb-1">
//                   <p className={cn(
//                     "t-2 overflow-hidden",
//                     !isExpanded2 && "line-clamp-4"
//                   )}>
//                     {profileData.Profile.bio}
//                   </p>
//                   {!isExpanded2 ? (
//                     <button className="text-blue-500 mt-2" onClick={() => setIsExpanded2(true)}>
//                       Read more...
//                     </button>
//                   ) : (
//                     <button className="text-blue-500 mt-2" onClick={() => setIsExpanded2(false)}>
//                       Read less
//                     </button>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div> */}
//       </div>
//     </div>
//   );
// };

// export default Profile;



// Profile.tsx - Enhanced with profile change detection

import React, { useState, useEffect } from 'react';
import { FaEnvelope } from 'react-icons/fa';
import { BsQrCode } from 'react-icons/bs';
import { NetworkRequest } from '../profile/FormCards/profile/networkrequest';
import { XpubDisplay } from '../profile/FormCards/profile/xpubdisplay';
import { 
  getProfileData, 
  getCurrentProfileNumber,
  ProfileData 
} from '../profile/data/profiledata';
import DMProfile from '../profile/item/dmprofile';
import SettingProfile from '../profile/item/settingprofile';

// Custom event for profile changes - must match the one in settingprofile.tsx
const PROFILE_CHANGE_EVENT = 'profileChanged';

const Profile: React.FC = () => {
  const [profileData, setProfileData] = useState<ProfileData>(getProfileData());
  const [currentProfileNumber, setCurrentProfileNumber] = useState(getCurrentProfileNumber());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showNetworkDialog, setShowNetworkDialog] = useState<boolean>(false);
  // const [isExpanded1, setIsExpanded1] = useState<boolean>(false);

  // Listen for profile changes
  useEffect(() => {
    const handleProfileChange = () => {
      const newProfileData = getProfileData();
      const newProfileNumber = getCurrentProfileNumber();
      setProfileData(newProfileData);
      setCurrentProfileNumber(newProfileNumber);
    };

    // Listen for custom profile change event
    window.addEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);

    // Check for changes periodically (fallback)
    const interval = setInterval(() => {
      const currentNumber = getCurrentProfileNumber();
      if (currentNumber !== currentProfileNumber) {
        handleProfileChange();
      }
    }, 500);

    return () => {
      window.removeEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
      clearInterval(interval);
    };
  }, [currentProfileNumber]);

  const handleClick = (): void => {
    setIsExpanded(!isExpanded);
    setShowNetworkDialog(true);
  };

  // const handleClick1 = (): void => {
  //   setIsExpanded1(!isExpanded1);
  // };

  const [isOpen2, setIsOpen2] = useState<boolean>(false);
  const [isOpen3, setIsOpen3] = useState<boolean>(false);
  const handleOpen2 = (): void => setIsOpen2(true);
  const handleClose2 = (): void => setIsOpen2(false);
  const handleOpen3 = (): void => setIsOpen3(true);
  const handleClose3 = (): void => setIsOpen3(false);

  // Handle profile update callback from SettingProfile
  const handleProfileUpdate = () => {
    const newProfileData = getProfileData();
    setProfileData(newProfileData);
  };

  // Function to render image or color
  const renderImage = (src: string, alt: string, className: string) => {
    if (src && src.startsWith('#')) {
      // It's a color code
      return (
        <div 
          className={className}
          style={{ backgroundColor: src }}
        />
      );
    }
    // It's an image URL
    return (
      <img
        src={src}
        alt={alt}
        className={className}
      />
    );
  };

  return (
    <div className="container mx-auto p-1">
      <div className="flex justify-center mb-4">
        <div className="relative h-64 w-full">
          {renderImage(
            profileData.backgroundImage,
            "Background Image",
            "rounded w-full h-full object-cover"
          )}
          <div className="absolute right-0 pr-6 transform bottom-[-64px]">
            <div className="border-4 border-white rounded-full w-32 h-32 overflow-hidden">
              {renderImage(
                profileData.profileImage,
                "Profile",
                "w-32 h-32 object-cover"
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="relative w-full flex items-center border-bottom">
          <div className="absolute pl-5 pb-3 left-2 flex space-x-12">
            <div className="relative">
              <FaEnvelope className="cursor-pointer" onClick={handleOpen3} />
              {isOpen3 && 
                <DMProfile isOpen3={isOpen3} onClose3={handleClose3} />}
            </div>
            <div className="relative">
              <BsQrCode className="cursor-pointer" onClick={handleOpen2} />
              {isOpen2 && 
                <XpubDisplay isOpen2={isOpen2} onClose2={handleClose2} />}
            </div>
            <div className="relative">
            </div>
          </div>
          <div className='absolute pt-8 right-10 flex'>
            <SettingProfile 
              className="absolute cursor-pointer" 
              onProfileUpdate={handleProfileUpdate}
            />  
          </div>
          <div className="pt-4">
            <div className="absolute pt-18 left-2 flex text-center items-center">
              <p className="text-ms font-bold cursor-pointer">
                {profileData.Profile.username}
              </p>
              <p className="text-ms font-bold">@NL</p>
            </div>
          </div>
        </div>
      </div>

                {/* <div className="w-full flex">
            <div className="absolute text-align-center pl-2 pb-6 pt-10 left-2 flex text-center items-center text-xl font-bold">
              <p className="text-s font-bold cursor-pointer">
                {profileData.Profile.title}
              </p>
            </div>
          </div>

      <div className="w-full pt-11">
        <div className="flex w-full mt-4">
          <div className="flex-1 flex justify-center items-center p-3">
            <div className="flex items-center space-x-3 mb-2">
              <p className="t-2 line-clamp-4 overflow-hidden">
                {profileData.Profile.mision}
              </p>
            </div>
          </div>
        </div>


      </div> */}
<div className="w-full">
  <div className="p-3 mt-4">
    <p className="text-s font-bold cursor-pointer mb-2">
      {profileData.Profile.title}
    </p>
    <p className="t-2 line-clamp-4 overflow-hidden">
      {profileData.Profile.mision}
    </p>
  </div>
</div>

      <div className="mt-4">
        <div className="flex flex-col w-full">
          <div className="flex w-full">
            <div className="flex-1 flex flex-col items-start pl-4">
              <button
                className="group relative min-w-[11rem] h-12 overflow-hidden rounded-[16px] border border-neutral-200 bg-gray-500 bg-opacity-60 px-4 text-neutral-950"
                onClick={handleClick}
              >
                <span className="relative inline-flex">
                  Net
                  <span className="duration-700 [transition-delay:0.02s] group-hover:[transform:rotateY(360deg)]"></span>
                  <span className="duration-700 [transition-delay:0.08s] group-hover:[transform:rotateY(360deg)]">w</span>
                  <span className="duration-700 [transition-delay:0.10s] group-hover:[transform:rotateY(360deg)]">o</span>
                  <span className="duration-700 [transition-delay:0.12s] group-hover:[transform:rotateY(360deg)]">r</span>
                  <span className="duration-700 [transition-delay:0.14s] group-hover:[transform:rotateY(360deg)]">k</span>
                  {isExpanded && (
                    <>
                      <span className="duration-700 [transition-delay:0.16s] group-hover:[transform:rotateY(360deg)]">i</span>
                      <span className="duration-700 [transition-delay:0.18s] group-hover:[transform:rotateY(360deg)]">n</span>
                      <span className="duration-700 [transition-delay:0.20s] group-hover:[transform:rotateY(360deg)]">g</span>
                    </>
                  )}
                </span>
              </button>
              <NetworkRequest open={showNetworkDialog} onOpenChange={setShowNetworkDialog} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;



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



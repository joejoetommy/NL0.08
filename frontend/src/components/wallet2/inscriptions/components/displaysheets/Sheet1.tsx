'use client';

// import { NextPage } from 'next'
import Calendar from '../../../../ui/calendersheet'

import { LuBedSingle } from "react-icons/lu";
import { LuBath } from "react-icons/lu";
import { LuBedDouble } from "react-icons/lu";
import { MdKingBed } from "react-icons/md";
import { MdBedroomChild } from "react-icons/md";
import { TbBedFlat } from "react-icons/tb";
import { IoPeople } from "react-icons/io5";
import { MdOutlineDriveFileRenameOutline } from "react-icons/md";
import { MdOutlineNumbers } from "react-icons/md";
import { MdBedroomParent } from "react-icons/md";
import { FaCheckSquare } from "react-icons/fa";
import { SiGoogleclassroom } from "react-icons/si";
import { IoWifi } from "react-icons/io5";
import { BsPersonVideo3 } from "react-icons/bs";
import { IoIosFitness } from "react-icons/io";
import { LiaSpaSolid } from "react-icons/lia";
// import { MdDescription } from "react-icons/md";
import { TfiWrite } from "react-icons/tfi";
// import { FaSmoking } from "react-icons/fa";
// import { TbClockCancel } from "react-icons/tb";
// import { MdPets } from "react-icons/md";
// import { FaChildren } from "react-icons/fa6";
// import { LuPartyPopper } from "react-icons/lu";
// import { MdOutlineNoteAlt } from "react-icons/md";
import { BsDatabaseAdd } from "react-icons/bs";
import { FaUser } from "react-icons/fa";
// import { DrawerLikes } from '@/components/Frames/likes2/pow';
import { DrawerLikes } from './Frames/likes2/pow';
import { DrawerComment } from './Frames/comments2/pow';
import { DrawerReport } from './Frames/report2/pow';
import { DrawerReview } from './Frames/review2/pow';
import { Direct } from './Frames/DM/pow';
import { DrawerShare } from './Frames/share2/pow';
import { DrawerTip } from './Frames/tip2/pow';
import { DrawerSave } from './Frames/save2/pow';

// import { ReviewCounterWithRating  } from "@/components/Account/(sheets)/(BuildingOut)/reviewstaraverage"
// import { ReviewCounter  } from "@/components/Account/(sheets)/(BuildingOut)/reviewcounteropen"

import {
  MenubarSeparator,
} from '../../../../../components/ui/menubar';

import React, { useState, useEffect, useRef } from 'react';
// import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogSubtitle,
  DialogTitle,
  DialogClose,
  DialogContainer,
} from '../../../../../components/ui/dialog1';
import {
  AlertDialogFooter,
} from "../../../../../components/ui/alert-dialog"
import { PlusIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTabs } from '../../../../../hooks/use-tabs'; 
import { Framer } from '../../../../../lib/framercard';
// import { Framer } from './lib/framercard';
import { motion } from 'framer-motion';
import { DoubleArrowDownIcon, DoubleArrowUpIcon, CardStackPlusIcon, CameraIcon, StarIcon, ClockIcon } from "@radix-ui/react-icons"
// import { ScrollArea } from "@/components/ui/scroll-area"
import { Icon } from '@iconify/react';

// Define SheetData interface to match your data structure
export interface SheetData {
  // Alert dialog data
  alertDialogTitle: string;
  alertDialogDescription: string;
  alertDialogImage: string;
  
  // Property details
  propertyName: string;
  numberOfGuests: number;
  numberOfBathrooms: number;
  numberOfSingleBeds: number;
  numberOfQueenBeds: number;
  numberOfKingBeds: number;
  numberOfKidBeds: number;
  numberOfTufanBeds: number;
  hotelRoomForOccupants: string;
  hotelRoomBedType: string;
  arrangementAndFacilities: string;
  otherTypesOfHotelRooms: string;
  hotelRoomFacilities: string[];
  gymOrFitness: string;
  dedicatedWorkstation: string;
  spaFacilities: string[];
  general: string[];
  freeWifi: string;
  rules: {
    smokingAllowed: boolean;
    petsAllowed: boolean;
    childrenAllowed: boolean;
    partiesAllowed: boolean;
    additionalRules: string;
  };
  checkInFrom: string;
  checkInUntil: string;
  checkOutFrom: string;
  checkOutUntil: string;
  receptionDetails: string;
  hotelRoomDescription: string;
  additionalHotelFeatures: string;
  cancellationPolicy: string;
  yourRole: string;
  sellersName: string;
  contactDetails: string;
  hostLanguages: string[];
  
  // Images
  profileImage: string;
  roomPhotos: string[];
  hotelPhotos: string[];
  facilitiesPhotos: string[];
  
  // Additional metadata
  uploadDate: string;
  user: string;
  
  // Interaction data
  Interact: {
    Comment: any[];
    Likes: any[];
    Dislikes: any[];
    Reactions: any[];
    Report: any[];
    Review: any[];
    Tip: any;
    Direct: any[];
  };
}

interface Sheet1Props {
  data: SheetData;
  standalone?: boolean; // Optional prop to control if it should render as standalone or in dialog
}

const tabs = {
  Tab1: 'mdi:comment-text-multiple',
  Tab2: 'mdi:like',
  Tab3: 'ic:baseline-report',
  Tab4: 'mdi:rate-review',
  Tab5: 'ic:baseline-bookmark',
  Tab6: 'mdi:hand-coin',
  Tab7: 'uiw:tags',
  Tab8: 'uil:message',
} as const;

type TabKey = keyof typeof tabs;
type SubTabKey = 'subTab1' | 'subTab2' | 'subTab3' | 'subTab4' | 'subTab5' | 'subTab6' | 'subTab7';

const Interact: React.FC<{ data: SheetData; }> = ({ data }) => {
  const [selectedTab, setSelectedTab] = useState<TabKey>('Tab1');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && selectedImageIndex !== null) {
      const scrollElements = scrollRef.current.children;
      const elementToScroll = scrollElements[selectedImageIndex];
      elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedImageIndex]);

  const handleReturnToList = () => {
    setSelectedImageIndex(null);
  };

  const renderReturnButton = () => (
    selectedImageIndex !== null && (
      <button
        onClick={handleReturnToList}
        style={{ right: '1rem', bottom: '2.5rem' }}
        className="fixed z-10 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
      >
        Return
      </button>
    )
  );

  const renderTabContent = () => {
    if (!data || !data.Interact) {
      return <div>Loading...</div>;
    }

    switch (selectedTab) {
      case 'Tab1':
        return <DrawerComment comments={data.Interact.Comment || []} />;
      case 'Tab2':
        return <Direct directs={data.Interact.Direct || []} />;
      case 'Tab3':
        return <DrawerReport reports={data.Interact.Report || []} />;
      case 'Tab4':
        return <DrawerReview reviews={data.Interact.Review || []} />;
      case 'Tab5':
        return <DrawerSave />;
      case 'Tab6':
        return <DrawerTip tips={data.Interact.Tip} onSubmitTip={(newTip) => console.log(newTip)} />;
      case 'Tab7':
        return <DrawerShare />;
      case 'Tab8':
        return (
          <DrawerLikes
            likes={data.Interact.Likes || []}
            dislikes={data.Interact.Dislikes || []}
            reactions={data.Interact.Reactions || []}
          />
        );
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-center mb-4"> 
        {Object.entries(tabs).map(([tab, icon]) => (
          <button
            key={tab}
            className={`px-1 py-1 mx-1 ${selectedTab === tab ? 'bg-blue-500 text-white rounded-[8px]' : 'bg-black-200'}`}
            onClick={() => {
              setSelectedTab(tab as TabKey);
            }}
          >
            <Icon icon={icon} width="18" height="18" />
          </button>
        ))}
      </div>
      {renderTabContent()}
    </div>
  );
};

const Sheet1: React.FC<Sheet1Props> = ({ data, standalone = false }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeImageTab, setActiveImageTab] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<SubTabKey>('subTab1');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showImages, setShowImages] = useState(true);

  const imageCategories = [
    { title: "Room", images: data.roomPhotos || [] },
    { title: "Hotel", images: data.hotelPhotos || [] },
    { title: "Facilities", images: data.facilitiesPhotos || [] },
  ];

  const handlePreviousImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? imageCategories[activeImageTab].images.length - 1 : prevIndex - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === imageCategories[activeImageTab].images.length - 1 ? 0 : prevIndex + 1
    );
  };

  useEffect(() => {
    if (scrollRef.current && selectedImageIndex !== null) {
      const scrollElements = scrollRef.current.children;
      const elementToScroll = scrollElements[selectedImageIndex];
      elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedImageIndex]);

  const ITEMS = [
    {
      label: 'Details',
      children: (
        <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Property Details</h2>
      
          <div className="space-y-4">
            <div className="mb-2 flex items-center">
              <MdOutlineDriveFileRenameOutline />
              <strong className="ml-3 text-gray-300">Property Name:</strong>
              <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.propertyName}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <IoPeople />
              <strong className="ml-3 text-gray-300">Number of Guests:</strong>
              <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfGuests}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <LuBath />
              <strong className="ml-3 text-gray-300">Number of Bathrooms:</strong>
              <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfBathrooms}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <LuBedSingle />
              <strong className="ml-3 text-gray-300">Single Beds:</strong>
              <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfSingleBeds}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <LuBedDouble />
              <strong className="ml-3 text-gray-300">Queen Beds:</strong>
              <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfQueenBeds}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <MdKingBed />
              <strong className="ml-3 text-gray-300">King Beds:</strong>
              <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfKingBeds}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <MdBedroomChild />
              <strong className="ml-3 text-gray-300">Kid Beds:</strong>
              <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfKidBeds}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <TbBedFlat />
              <strong className="ml-3 text-gray-300">Tufan Beds:</strong>
              <span className="ml-auto font-sans">{data.numberOfTufanBeds}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <MdOutlineNumbers />
              <strong className="ml-3 text-gray-300">Hotel Room for Occupants:</strong>
              <span className="ml-auto font-sans">{data.hotelRoomForOccupants}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <MdBedroomParent />
              <strong className="ml-3 text-gray-300">Hotel Room Bed Type:</strong>
              <span className="ml-auto font-sans">{data.hotelRoomBedType}</span>
            </div>
      
            <div className="mb-2 flex items-center"> 
              <FaCheckSquare />  
              <strong className="ml-3 text-gray-300">Arrangement and Facilities:</strong>
              <span className="ml-auto font-sans">{data.arrangementAndFacilities}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <SiGoogleclassroom />
              <strong className="ml-3 text-gray-300">Type of Hotel Room:</strong>
              <span className="ml-auto font-sans">{data.otherTypesOfHotelRooms}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <FaCheckSquare />
              <strong className="ml-3 text-gray-300">Hotel Room Facilities:</strong>
              <span className="ml-auto font-sans">{data.hotelRoomFacilities?.join(', ') || 'N/A'}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <IoWifi />
              <strong className="ml-3 text-gray-300">Free Wifi:</strong>
              <span className="ml-auto font-sans">{data.freeWifi}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <BsPersonVideo3 />
              <strong className="ml-3 text-gray-300">Reception Details:</strong>
              <span className="ml-auto font-sans">{data.receptionDetails}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <IoIosFitness />
              <strong className="ml-3 text-gray-300">Gym or Fitness:</strong>
              <span className="ml-auto font-sans">{data.gymOrFitness}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <LiaSpaSolid />
              <strong className="ml-3 text-gray-300">Spa Facilities:</strong>
              <span className="ml-auto font-sans">
                {data.spaFacilities?.join(', ') || 'N/A'}
              </span>
            </div>
      
            <div className="mb-2 flex items-center">
              <TfiWrite />
              <strong className="ml-3 text-gray-300">Dedicated Workstation:</strong>
              <span className="ml-auto font-sans">{data.dedicatedWorkstation}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <TfiWrite />
              <strong className="ml-3 text-gray-300">Hotel Room Description:</strong>
              <span className="ml-auto font-sans">{data.hotelRoomDescription}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <FaCheckSquare />
              <strong className="ml-3 text-gray-300">General:</strong>
              <span className="ml-auto font-sans">{data.general?.join(', ') || 'N/A'}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <TfiWrite />
              <strong className="ml-3 text-gray-300">Additional Hotel Features:</strong>
              <span className="ml-auto font-sans">{data.additionalHotelFeatures}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <FaCheckSquare />
              <strong className="ml-3 text-gray-300">Rules:</strong>
              <span className="ml-auto font-sans">
                {data.rules ? 
                  `Smoking: ${data.rules.smokingAllowed ? 'Yes' : 'No'}, Pets: ${data.rules.petsAllowed ? 'Yes' : 'No'}, Children: ${data.rules.childrenAllowed ? 'Yes' : 'No'}, Parties: ${data.rules.partiesAllowed ? 'Yes' : 'No'}` 
                  : 'N/A'}
              </span>
            </div>
      
            <div className="mb-2 flex items-center">
              <IoIosFitness />
              <strong className="ml-3 text-gray-300">Check-In:</strong>
              <span className="ml-auto font-sans">From {data.checkInFrom} until {data.checkInUntil}</span>
            </div>
      
            <div className="mb-2 flex items-center">
              <IoIosFitness />
              <strong className="ml-3 text-gray-300">Check-Out:</strong>
              <span className="ml-auto font-sans">From {data.checkOutFrom} until {data.checkOutUntil}</span>
            </div>

            <div className="mb-2 flex items-center">
              <IoIosFitness />
              <strong className="ml-3 text-gray-300">Cancellation policy:</strong>
              <span className="ml-auto font-sans">{data.cancellationPolicy}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Interact',
      children: (
        <div className="bg-black text-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
          <Interact data={data} />
        </div>
      ),
    },
    {
      label: 'Book',
      children: (
        <div className="bg-black text-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
          <Calendar />
        </div>
      ),
    },
    {
      label: 'Host',
      children: (
        <div className="bg-black text-white p-6 rounded-lg max-w-sm mx-auto ">
          <h2 className="text-2xl font-semibold mb-4">Meet your Host</h2>
          <div className="flex items-center space-x-4">
            <img
              src={data.profileImage || '/placeholder-profile.jpg'}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
            <div>
              <h3 className="text-xl font-bold">{data.sellersName}</h3>
              <p className="text-sm">{data.yourRole}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex space-x-2 items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8h18M9 12h6m-7 8h8a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v13a2 2 0 002 2h1z" />
              </svg>
              <p className="text-sm">{data.contactDetails}</p>
            </div>
            <div className="flex space-x-2 items-center mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm"><strong>Languages:</strong> {data.hostLanguages?.join(', ') || 'N/A'}</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const [hookProps] = useState({
    tabs: ITEMS,
    initialTabId: 'Details',
  });

  const framer = useTabs(hookProps);

  // If standalone mode, render without dialog wrapper
  if (standalone) {
    return (
      <div className="bg-[#121212] rounded-lg overflow-hidden">
        <motion.div
          className='p-0.5'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
        >
          {showImages && imageCategories[activeImageTab].images.length > 0 && (
            <div className='relative'>
              <img
                src={imageCategories[activeImageTab].images[currentImageIndex] || '/placeholder-image.jpg'}
                alt={`Image ${currentImageIndex + 1}`}
                className='h-[400px] w-full object-cover rounded-t-lg transition-opacity duration-500 ease-in-out'
              />
              <div className='absolute bottom-1 left-1 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded'>
                Price
              </div>
              {imageCategories[activeImageTab].images.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className='absolute left-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110'
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className='absolute right-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110'
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
          )}

          <div className="flex justify-between items-center p-2">
            <div className="flex space-x-4">
              {imageCategories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageTab(index)}
                  className={`px-4 py-2 rounded-[8px] text-sm transition-all duration-300 ${
                    activeImageTab === index
                      ? 'bg-gray-200 text-black underline font-bold underline underline decoration-2 decoration-blue-500'
                      : 'bg-black text-white font-light hover:bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between">
                    <div>{category.title}</div>
                    <div>{activeImageTab === index && <CameraIcon className="ml-2" />}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowImages(!showImages)}
              className="px-4 mb-1 py-2 bg-blue-500 text-white rounded-[8px] pr-8"
            >
              {showImages ? (
                <div className="flex space-x-3">
                  <DoubleArrowUpIcon className="scale-150" />
                  <p className='text-sm text-white font-bold'>Up</p>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <DoubleArrowDownIcon className="scale-150" />
                  <p className='text-sm text-white font-bold'>Down</p>
                </div>
              )}
            </button>
          </div>

          <div className='text-left pt-3 pl-4 mb-'>
            <h2 className='text-white text-3xl font-semibold'>
              {data.propertyName}
            </h2>
            <p className='text-gray-400 text-lg font-normal space-x-2'>
              {data.hotelRoomDescription}
            </p>
            <div className="text-white space-y-1">
              <p className="text-sm text-gray-300">
                {data.numberOfGuests} guests · {data.hotelRoomForOccupants} bedroom · {data.hotelRoomBedType} bed · {data.numberOfBathrooms} bathroom
              </p>

              <div className="flex items-center space-x-1 pb-1">
                <StarIcon className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-semibold">5.0</span>
                <span className="text-sm text-gray-300">·</span>
                <a href="#reviews" className="text-sm underline text-white-400">
                  {/* <ReviewCounterWithRating data={data} /> */}
                  Reviews
                </a>
                <span className="pl-4 pr-1 text-sm text-gray-300"><BsDatabaseAdd /></span>
                <span className="text-sm font-semibold">{data.uploadDate}</span>
                <span className="pl-2 pr-1 text-sm text-gray-300"><FaUser /></span>
                <a href="#reviews" className="text-sm underline text-blue-400">
                  {data.user}@mono
                </a>
              </div>
            </div>
            <MenubarSeparator className="align-center w-full" />
          </div>

          <div className='flex justify-center pb-2'>
            <Framer.Tabs {...framer.tabProps} />
          </div>

          <div className="h-[580px] overflow-y-auto">
            {framer.selectedTab.children}
          </div>

          <MenubarSeparator className="align-center w-full" />
        </motion.div>
      </div>
    );
  }

  // Original dialog mode
  return (
    <Dialog transition={{ type: 'spring', bounce: 0.05, duration: 0.25 }}>
      <DialogTrigger
        style={{ borderRadius: '12px' }}
        className='flex justify-center align-items-center w-[250px] h-[330px] xxxxs:w-[300px] xxxxs:h-[400px] xxxs:w-[170px] xxxs:h-[267px] xxs:w-[170px] xxs:h-[267px] xs:w-[225px] xs:h-[310px] s:w-[170px] s:h-[267px] sm:w-[170px] sm:h-[267px] md:w-[165px] md:h-[267px] lg:w-[170px] lg:h-[267px] xl:w-[170px] xl:h-[267px] flex-col overflow-hidden border border-zinc-950/10 dark:border-zinc-50/10 bg-[#121212] hover:shadow-lg transition-all duration-300'
      >
        <div className='relative w-full h-full'>
          <img
            src={data.alertDialogImage || '/placeholder-image.jpg'}
            alt={data.alertDialogTitle}
            className='h-full w-full object-cover rounded-md'
          />
          <div className='absolute bottom-1 left-1 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded'>
            Price
          </div>
        </div>

        <div className='flex flex-col justify-end p-2'>
          <DialogTitle className='text-white text-lg font-semibold'>
            {data.alertDialogTitle}
          </DialogTitle>
          <DialogSubtitle className='text-sm text-zinc-200'>
            {data.alertDialogDescription}
          </DialogSubtitle>
          <div className="flex items-center space-x-1 pb-1">
            <StarIcon className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-white font-semibold">
              {/* <ReviewCounter data={data}/> */}
              5.0
            </span>
            <a href="#reviews" className="text-sm underline text-blue-400">
              {data.user}
            </a>
          </div>
        </div>
      </DialogTrigger>

      <DialogContainer className='overflow-y-auto max-h-screen'>
        <DialogContent className='bg-[#121212] w-[750px] h-[850px] shadow-2xl rounded-lg relative overflow-hidden transition-all'>
          {/* Same content as standalone mode */}
          <motion.div
            className='p-0.5'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
          >
            {/* Content same as standalone... */}
            {showImages && imageCategories[activeImageTab].images.length > 0 && (
              <div className='relative'>
                <img
                  src={imageCategories[activeImageTab].images[currentImageIndex] || '/placeholder-image.jpg'}
                  alt={`Image ${currentImageIndex + 1}`}
                  className='h-[400px] w-full object-cover rounded-t-lg transition-opacity duration-500 ease-in-out'
                />
                <div className='absolute bottom-1 left-1 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded'>
                  Price
                </div>
                <button
                  onClick={handlePreviousImage}
                  className='absolute left-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110'
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={handleNextImage}
                  className='absolute right-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110'
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}

            {/* Rest of content... */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                {imageCategories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageTab(index)}
                    className={`px-4 py-2 rounded-[8px] text-sm transition-all duration-300 ${
                      activeImageTab === index
                        ? 'bg-gray-200 text-black underline font-bold underline underline decoration-2 decoration-blue-500'
                        : 'bg-black text-white font-light hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between">
                      <div>{category.title}</div>
                      <div>{activeImageTab === index && <CameraIcon className="ml-2" />}</div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowImages(!showImages)}
                className="px-4 mb-1 py-2 bg-blue-500 text-white rounded-[8px] pr-8"
              >
                {showImages ? (
                  <div className="flex space-x-3">
                    <DoubleArrowUpIcon className="scale-150" />
                    <p className='text-sm text-white font-bold'>Up</p>
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    <DoubleArrowDownIcon className="scale-150" />
                    <p className='text-sm text-white font-bold'>Down</p>
                  </div>
                )}
              </button>
            </div>

            <div className='text-left pt-3 pl-4 mb-'>
              <DialogTitle className='text-white text-3xl font-semibold'>
                {data.propertyName}
              </DialogTitle>
              <DialogSubtitle className='text-gray-400 text-lg font-normal space-x-2'>
                {data.hotelRoomDescription}
              </DialogSubtitle>
              <div className="text-white space-y-1">
                <p className="text-sm text-gray-300">
                  {data.numberOfGuests} guests · {data.hotelRoomForOccupants} bedroom · {data.hotelRoomBedType} bed · {data.numberOfBathrooms} bathroom
                </p>

                <div className="flex items-center space-x-1 pb-1">
                  <StarIcon className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-semibold">5.0</span>
                  <span className="text-sm text-gray-300">·</span>
                  <a href="#reviews" className="text-sm underline text-white-400">
                    Reviews
                  </a>
                  <span className="pl-4 pr-1 text-sm text-gray-300"><BsDatabaseAdd /></span>
                  <span className="text-sm font-semibold">{data.uploadDate}</span>
                  <span className="pl-2 pr-1 text-sm text-gray-300"><FaUser /></span>
                  <a href="#reviews" className="text-sm underline text-blue-400">
                    {data.user}@mono
                  </a>
                </div>
              </div>
              <MenubarSeparator className="align-center w-full" />
            </div>

            <div className='flex justify-center pb-2'>
              <Framer.Tabs {...framer.tabProps} />
            </div>

            <div className="h-[580px] overflow-y-auto">
              {framer.selectedTab.children}
            </div>

            <MenubarSeparator className="align-center w-full" />
          </motion.div>

          <DialogClose className='absolute top-4 right-4 text-white hover:text-red-500 transition-transform hover:scale-525'>
            &times;
          </DialogClose>

          <AlertDialogFooter>
            <MenubarSeparator className="align-center w-full" />
          </AlertDialogFooter>
        </DialogContent>
      </DialogContainer>
    </Dialog>
  );
};

export default Sheet1;
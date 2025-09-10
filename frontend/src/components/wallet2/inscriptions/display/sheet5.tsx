// Working correctly 
// This is with the dailog trigger / cardform thats clickable
// sheet4 is the without alertdialog trigger version


"use client";
import React, { useState, useMemo } from "react";
import { MenubarSeparator } from "../../../ui/menubar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
 // DialogFooter,
  DialogTitle,
  DialogSubtitle,
  DialogClose,
  DialogContainer,
} from '../../../ui/dialog2';
// import {
//   AlertDialogFooter,
// } from "../../../ui/alert-dialog"
import { useTabs } from "../../../../hooks/use-tabs";
import { Framer } from "../../../../lib/framercard";
import { motion } from 'framer-motion'; 
// Icons
import { LuBedSingle, LuBath, LuBedDouble } from "react-icons/lu";
import {
  MdKingBed,
  MdBedroomChild,
  MdBedroomParent,
  MdOutlineDriveFileRenameOutline,
  MdOutlineNumbers,
} from "react-icons/md";
// import { TbBedFlat } from "react-icons/tb";
import { IoPeople, IoWifi, IoFitness } from "react-icons/io5";
import { FaCheckSquare, FaUser } from "react-icons/fa";
// import { SiGoogleclassroom } from "react-icons/si";
import { BsPersonVideo3, BsDatabaseAdd } from "react-icons/bs";
import { LiaSpaSolid } from "react-icons/lia";
import { TfiWrite } from "react-icons/tfi";
import { CameraIcon, DoubleArrowDownIcon, DoubleArrowUpIcon, StarIcon } from "@radix-ui/react-icons";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PropertyData {
  propertyName?: string;
  numberOfGuests?: number;
  numberOfBathrooms?: number;
  numberOfSingleBeds?: number;
  numberOfQueenBeds?: number;
  numberOfKingBeds?: number;
  numberOfKidBeds?: number;
  numberOfTufanBeds?: number;
  hotelRoomForOccupants?: string;
  hotelRoomBedType?: string;
  arrangementAndFacilities?: string;
  otherTypesOfHotelRooms?: string;
  hotelRoomFacilities?: string[];
  freeWifi?: string;
  receptionDetails?: string;
  gymOrFitness?: string;
  spaFacilities?: string[];
  dedicatedWorkstation?: string;
  hotelRoomDescription?: string;
  general?: string[];
  additionalHotelFeatures?: string;
  rules?: {
    smokingAllowed?: boolean;
    petsAllowed?: boolean;
    childrenAllowed?: boolean;
    partiesAllowed?: boolean;
    additionalRules?: string;
  };
  checkInFrom?: string;
  checkInUntil?: string;
  checkOutFrom?: string;
  checkOutUntil?: string;
  cancellationPolicy?: string;
  profileImage?: string;
  sellersName?: string;
  yourRole?: string;
  contactDetails?: string;
  hostLanguages?: string[];
  roomPhotos?: string[];
  hotelPhotos?: string[];
  facilitiesPhotos?: string[];
  alertDialogImage?: string;
  alertDialogTitle?: string;
  alertDialogDescription?: string;
  uploadDate?: string;
  user?: string;
  createdAt?: string;
  selectedLanguages?: string[];
  Interact?: any;
}

interface PropertyViewerProps {
  content: string;
}

interface ParsedBCATData {
  jsonData: PropertyData;
  images: { [key: string]: string }; // base64 URLs
}

// Enhanced parsing function that handles multiple formats
function parseBCATPropertyData(content: string): ParsedBCATData | null {
  try {
    // First try to parse as JSON with embedded images
    try {
      const parsed = JSON.parse(content);
      
      // Check if it has embedded images from our enhanced format
      if (parsed._embeddedImages) {
        const images = parsed._embeddedImages;
        delete parsed._embeddedImages;
        delete parsed._images; // Remove if exists
        return { jsonData: parsed, images };
      }
      
      // Check for _images array format
      if (parsed._images && Array.isArray(parsed._images)) {
        const images: { [key: string]: string } = {};
        parsed._images.forEach((img: any) => {
          if (img.label && img.data) {
            images[img.label] = `data:image/jpeg;base64,${img.data}`;
          }
        });
        delete parsed._images;
        return { jsonData: parsed, images };
      }
      
      // Standard JSON without images
      return { jsonData: parsed, images: {} };
    } catch (e) {
      // Not JSON, continue to other formats
    }
    
    // Try to extract structured data from text
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const jsonData: any = {};
    const images: { [key: string]: string } = {};
    
    // Look for key-value pairs
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        // Convert to camelCase
        const camelKey = key
          .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
          .replace(/^\w/, c => c.toLowerCase())
          .replace(/[^\w]/g, ''); // Remove special chars
        
        // Parse value based on type
        if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          jsonData[camelKey] = value.toLowerCase() === 'true';
        } else if (value.toLowerCase() === 'yes') {
          jsonData[camelKey] = true;
        } else if (value.toLowerCase() === 'no') {
          jsonData[camelKey] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          jsonData[camelKey] = Number(value);
        } else if (value.includes(',')) {
          // Might be an array
          jsonData[camelKey] = value.split(',').map(v => v.trim());
        } else {
          jsonData[camelKey] = value;
        }
      }
    }
    
    // If we got some data, return it
    if (Object.keys(jsonData).length > 0) {
      return { jsonData, images };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing BCAT property data:', error);
    return null;
  }
}

// Helper functions
function toBoolFromYesNo(v: any): boolean | undefined {
  if (v === true || v === false) return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["yes", "true", "1"].includes(s)) return true;
    if (["no", "false", "0"].includes(s)) return false;
  }
  return undefined;
}

function normalizeNumber(v: any): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

// Enhanced mapping function
function mapToBetterPropertyStructure(rawData: any, images: { [key: string]: string }): PropertyData {
  const data: PropertyData = {};

  // Basic mappings
  data.propertyName = rawData.propertyName || rawData.title || rawData.name || "";
  data.hotelRoomDescription = rawData.hotelRoomDescription || rawData.description || "";
  data.alertDialogTitle = rawData.alertDialogTitle || rawData.title || data.propertyName;
  data.alertDialogDescription = rawData.alertDialogDescription || rawData.description || data.hotelRoomDescription;

  // Numbers
  data.numberOfGuests = normalizeNumber(rawData.numberOfGuests || rawData.guests);
  data.numberOfBathrooms = normalizeNumber(rawData.numberOfBathrooms || rawData.bathrooms);
  data.numberOfSingleBeds = normalizeNumber(rawData.numberOfSingleBeds || rawData.singleBeds);
  data.numberOfQueenBeds = normalizeNumber(rawData.numberOfQueenBeds || rawData.queenBeds);
  data.numberOfKingBeds = normalizeNumber(rawData.numberOfKingBeds || rawData.kingBeds);
  data.numberOfKidBeds = normalizeNumber(rawData.numberOfKidBeds || rawData.kidBeds);
  data.numberOfTufanBeds = normalizeNumber(rawData.numberOfTufanBeds || rawData.tufanBeds);

  // Room details
  data.hotelRoomForOccupants = rawData.hotelRoomForOccupants || rawData.occupants;
  data.hotelRoomBedType = rawData.hotelRoomBedType || rawData.bedType;
  data.arrangementAndFacilities = rawData.arrangementAndFacilities || rawData.arrangement;
  data.otherTypesOfHotelRooms = rawData.otherTypesOfHotelRooms || rawData.roomTypes;

  // Arrays
  const ensureArray = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.includes(',')) {
      return val.split(',').map(v => v.trim());
    }
    return [val];
  };
  
  data.hotelRoomFacilities = ensureArray(rawData.hotelRoomFacilities || rawData.facilities);
  data.spaFacilities = ensureArray(rawData.spaFacilities || rawData.spa);
  data.general = ensureArray(rawData.general);
  data.selectedLanguages = ensureArray(rawData.selectedLanguages || rawData.languages);
  data.hostLanguages = data.selectedLanguages;

  // Facilities
  data.freeWifi = rawData.freeWifi || rawData.wifi;
  data.receptionDetails = rawData.receptionDetails || rawData.reception;
  data.gymOrFitness = rawData.gymOrFitness || rawData.gym;
  data.dedicatedWorkstation = rawData.dedicatedWorkstation || rawData.workstation;
  data.additionalHotelFeatures = rawData.additionalHotelFeatures || rawData.additionalFeatures;

  // Rules
  if (rawData.rules && typeof rawData.rules === 'object') {
    data.rules = {
      smokingAllowed: toBoolFromYesNo(rawData.rules.smokingAllowed || rawData.rules.smoking),
      petsAllowed: toBoolFromYesNo(rawData.rules.petsAllowed || rawData.rules.pets),
      childrenAllowed: toBoolFromYesNo(rawData.rules.childrenAllowed || rawData.rules.children),
      partiesAllowed: toBoolFromYesNo(rawData.rules.partiesAllowed || rawData.rules.parties),
      additionalRules: rawData.rules.additionalRules || rawData.rules.additional || ""
    };
  } else {
    // Try to extract rules from flat structure
    data.rules = {
      smokingAllowed: toBoolFromYesNo(rawData.smokingAllowed),
      petsAllowed: toBoolFromYesNo(rawData.petsAllowed),
      childrenAllowed: toBoolFromYesNo(rawData.childrenAllowed),
      partiesAllowed: toBoolFromYesNo(rawData.partiesAllowed),
      additionalRules: rawData.additionalRules || ""
    };
  }

  // Times
  data.checkInFrom = rawData.checkInFrom || rawData.checkinFrom || "";
  data.checkInUntil = rawData.checkInUntil || rawData.checkinUntil || "";
  data.checkOutFrom = rawData.checkOutFrom || rawData.checkoutFrom || "";
  data.checkOutUntil = rawData.checkOutUntil || rawData.checkoutUntil || "";
  data.cancellationPolicy = rawData.cancellationPolicy || rawData.cancellation || "";

  // Host info
  data.sellersName = rawData.sellersName || rawData.sellerName || rawData.hostName || "";
  data.yourRole = rawData.yourRole || rawData.role || "";
  data.contactDetails = rawData.contactDetails || rawData.contact || "";

  // Handle images
  data.alertDialogImage = images.alertDialogImage || images.mainImage || images.image1;
  data.profileImage = images.profileImage || images.hostImage;
  
  // Initialize photo arrays
  data.roomPhotos = [];
  data.hotelPhotos = [];
  data.facilitiesPhotos = [];
  
  // Populate photo arrays from images object
  Object.keys(images).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('room') && !lowerKey.includes('profile')) {
      data.roomPhotos!.push(images[key]);
    } else if (lowerKey.includes('hotel')) {
      data.hotelPhotos!.push(images[key]);
    } else if (lowerKey.includes('facilit')) {
      data.facilitiesPhotos!.push(images[key]);
    } else if (lowerKey.match(/^(image|photo)\d+$/)) {
      // Generic numbered images go to room photos
      data.roomPhotos!.push(images[key]);
    }
  });
  
  // If no categorized photos but we have images, add them as room photos
  if (data.roomPhotos!.length === 0 && data.hotelPhotos!.length === 0 && data.facilitiesPhotos!.length === 0) {
    Object.values(images).forEach(url => {
      if (url && !url.includes('profile')) {
        data.roomPhotos!.push(url);
      }
    });
  }

  // Metadata
  data.uploadDate = rawData.uploadDate || rawData.createdAt || rawData.date;
  data.user = rawData.user || rawData.uploader;
  data.createdAt = rawData.createdAt;

  console.log('Mapped property data:', data);
  return data;
}

const PropertyViewer: React.FC<PropertyViewerProps> = ({ content }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeImageTab, setActiveImageTab] = useState(0);
  const [showImages, setShowImages] = useState(true);

  const parsedData = useMemo(() => {
    const result = parseBCATPropertyData(content);
    console.log('PropertyViewer: Parsed data:', result);
    return result;
  }, [content]);

  const data = useMemo(() => {
    if (!parsedData) return null;
    const mapped = mapToBetterPropertyStructure(parsedData.jsonData, parsedData.images);
    console.log('PropertyViewer: Mapped data:', mapped);
    console.log('PropertyViewer: Profile image:', mapped?.profileImage);
    console.log('PropertyViewer: Room photos:', mapped?.roomPhotos);
    console.log('PropertyViewer: Hotel photos:', mapped?.hotelPhotos);
    return mapped;
  }, [parsedData]);

  const imageCategories = useMemo(
    () =>
      [
        { title: "Room", images: data?.roomPhotos ?? [] },
        { title: "Hotel", images: data?.hotelPhotos ?? [] },
        { title: "Facilities", images: data?.facilitiesPhotos ?? [] },
      ].filter((c) => c.images.length > 0),
    [data]
  );

  const handlePreviousImage = () => {
    if (imageCategories.length === 0) return;
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0
        ? imageCategories[activeImageTab].images.length - 1
        : prevIndex - 1
    );
  };

  const handleNextImage = () => {
    if (imageCategories.length === 0) return;
    setCurrentImageIndex((prevIndex) =>
      prevIndex === imageCategories[activeImageTab].images.length - 1
        ? 0
        : prevIndex + 1
    );
  };

  const ITEMS = useMemo(() => {
    if (!data) {
      return [
        {
          label: "Raw",
          children: (
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-300 mb-4">Raw Content</h3>
              <pre className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-800 p-4 rounded max-h-96 overflow-y-auto">
                {content || "(no readable properties)"}
              </pre>
              <div className="mt-4 p-3 bg-yellow-900 bg-opacity-30 rounded border border-yellow-700">
                <p className="text-yellow-300 text-sm">
                  ⚠️ Could not parse this content as property data.
                </p>
                <p className="text-yellow-200 text-xs mt-2">
                  The content might need to be reconstructed first, or it may not be property data.
                </p>
              </div>
            </div>
          ),
        },
      ];
    }

    // Return tabs with property data
    return [
      {
        label: "Details",
        children: (
          <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Property Details</h2>
            <div className="space-y-4">
              {data.propertyName && (
                <div className="mb-2 flex items-center">
                  <MdOutlineDriveFileRenameOutline />
                  <strong className="ml-3 text-gray-300">Property Name:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.propertyName}
                  </span>
                </div>
              )}
              {data.numberOfGuests !== undefined && (
                <div className="mb-2 flex items-center">
                  <IoPeople />
                  <strong className="ml-3 text-gray-300">Number of Guests:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.numberOfGuests}
                  </span>
                </div>
              )}
              {data.numberOfBathrooms !== undefined && (
                <div className="mb-2 flex items-center">
                  <LuBath />
                  <strong className="ml-3 text-gray-300">Number of Bathrooms:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.numberOfBathrooms}
                  </span>
                </div>
              )}
              {/* Bed counts */}
              {data.numberOfSingleBeds !== undefined && data.numberOfSingleBeds > 0 && (
                <div className="mb-2 flex items-center">
                  <LuBedSingle />
                  <strong className="ml-3 text-gray-300">Single Beds:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.numberOfSingleBeds}
                  </span>
                </div>
              )}
              {data.numberOfQueenBeds !== undefined && data.numberOfQueenBeds > 0 && (
                <div className="mb-2 flex items-center">
                  <LuBedDouble />
                  <strong className="ml-3 text-gray-300">Queen Beds:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.numberOfQueenBeds}
                  </span>
                </div>
              )}
              {data.numberOfKingBeds !== undefined && data.numberOfKingBeds > 0 && (
                <div className="mb-2 flex items-center">
                  <MdKingBed />
                  <strong className="ml-3 text-gray-300">King Beds:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.numberOfKingBeds}
                  </span>
                </div>
              )}
              {/* Other property details */}
              {data.hotelRoomFacilities && data.hotelRoomFacilities.length > 0 && (
                <div className="mb-2 flex items-center">
                  <FaCheckSquare />
                  <strong className="ml-3 text-gray-300">Room Facilities:</strong>
                  <span className="ml-auto font-sans text-right">
                    {data.hotelRoomFacilities.join(", ")}
                  </span>
                </div>
              )}
              {data.freeWifi && (
                <div className="mb-2 flex items-center">
                  <IoWifi />
                  <strong className="ml-3 text-gray-300">Free Wifi:</strong>
                  <span className="ml-auto font-sans">{data.freeWifi}</span>
                </div>
              )}
              {/* Rules section */}
              {data.rules && Object.keys(data.rules).some(k => data.rules![k as keyof typeof data.rules] !== undefined) && (
                <div className="mb-2">
                  <div className="flex items-center mb-2">
                    <FaCheckSquare />
                    <strong className="ml-3 text-gray-300">House Rules:</strong>
                  </div>
                  <div className="ml-8 space-y-1 text-sm">
                    {data.rules.smokingAllowed !== undefined && (
                      <div>Smoking: {data.rules.smokingAllowed ? "✅ Allowed" : "❌ Not Allowed"}</div>
                    )}
                    {data.rules.petsAllowed !== undefined && (
                      <div>Pets: {data.rules.petsAllowed ? "✅ Allowed" : "❌ Not Allowed"}</div>
                    )}
                    {data.rules.childrenAllowed !== undefined && (
                      <div>Children: {data.rules.childrenAllowed ? "✅ Allowed" : "❌ Not Allowed"}</div>
                    )}
                    {data.rules.partiesAllowed !== undefined && (
                      <div>Parties: {data.rules.partiesAllowed ? "✅ Allowed" : "❌ Not Allowed"}</div>
                    )}
                    {data.rules.additionalRules && (
                      <div className="mt-2 text-gray-400">{data.rules.additionalRules}</div>
                    )}
                  </div>
                </div>
              )}
              {/* Check-in/out times */}
              {(data.checkInFrom || data.checkInUntil) && (
                <div className="mb-2 flex items-center">
                  <IoFitness />
                  <strong className="ml-3 text-gray-300">Check-In:</strong>
                  <span className="ml-auto font-sans">
                    {data.checkInFrom && <>From {data.checkInFrom}</>}
                    {data.checkInUntil && <> until {data.checkInUntil}</>}
                  </span>
                </div>
              )}
              {(data.checkOutFrom || data.checkOutUntil) && (
                <div className="mb-2 flex items-center">
                  <IoFitness />
                  <strong className="ml-3 text-gray-300">Check-Out:</strong>
                  <span className="ml-auto font-sans">
                    {data.checkOutFrom && <>From {data.checkOutFrom}</>}
                    {data.checkOutUntil && <> until {data.checkOutUntil}</>}
                  </span>
                </div>
              )}
              {data.cancellationPolicy && (
                <div className="mb-2 flex items-center">
                  <TfiWrite />
                  <strong className="ml-3 text-gray-300">Cancellation Policy:</strong>
                  <span className="ml-auto font-sans">{data.cancellationPolicy}</span>
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        label: "Host",
        children: (
          <div className="bg-black text-white p-6 rounded-lg max-w-sm mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Meet your Host</h2>
            <div className="flex items-center space-x-4">
              {data.profileImage ? (
                <img src={data.profileImage} alt="Host" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                  <FaUser className="text-gray-400 text-2xl" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{data.sellersName || "Host"}</h3>
                {data.yourRole && <p className="text-sm text-gray-400">{data.yourRole}</p>}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {data.contactDetails && (
                <div className="flex items-start space-x-2">
                  <BsPersonVideo3 className="mt-1 flex-shrink-0" />
                  <p className="text-sm">{data.contactDetails}</p>
                </div>
              )}
              {data.hostLanguages && data.hostLanguages.length > 0 && (
                <div className="flex items-start space-x-2">
                  <TfiWrite className="mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    <strong>Languages:</strong> {data.hostLanguages.join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        ),
      },
    ];
  }, [data, content]);

  const framer = useTabs({ tabs: ITEMS, initialTabId: ITEMS[0]?.label || "Raw" });

  // If no data, show simple error state
  if (!data) {
    return (
      <div className="bg-[#121212] text-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-300 mb-4">Property Data</h3>
        <pre className="text-gray-400 text-sm whitespace-pre-wrap bg-gray-800 p-4 rounded max-h-96 overflow-y-auto">
          {content || "(no content available)"}
        </pre>
        <p className="text-yellow-400 text-sm mt-4">
          ℹ️ Unable to parse property data. The file may need to be reconstructed first.
        </p>
      </div>
    );
  }

  return (
    <Dialog>
      {/* DialogTrigger - Card View */}
      <DialogTrigger
        style={{ borderRadius: '12px' }}
        className='flex justify-center align-items-center w-[250px] h-[330px] xxxxs:w-[300px] xxxxs:h-[400px] xxxs:w-[170px] xxxs:h-[267px] xxs:w-[170px] xxs:h-[267px] xs:w-[225px] xs:h-[310px] s:w-[170px] s:h-[267px] sm:w-[170px] sm:h-[267px] md:w-[165px] md:h-[267px] lg:w-[170px] lg:h-[267px] xl:w-[170px] xl:h-[267px] flex-col overflow-hidden border border-zinc-950/10 dark:border-zinc-50/10 bg-[#121212] hover:shadow-lg transition-all duration-300'
      >
        {/* Container with relative positioning */}
        <div className='relative w-full h-full'>
          {/* Image */}
          <img
            src={data?.alertDialogImage || data?.roomPhotos?.[0] || '/placeholder.jpg'}
            alt={data?.alertDialogTitle || data?.propertyName || 'Property'}
            className='h-full w-full object-cover rounded-md'
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkltYWdlIE5vdCBBdmFpbGFibGU8L3RleHQ+PC9zdmc+';
            }}
          />

          {/* Price overlay (placeholder - you can add price field to data) */}
          <div className='absolute bottom-1 left-1 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded'>
            Price
          </div>
        </div>

        {/* Content below the image */}
        <div className='flex flex-col justify-end p-2'>
          <DialogTitle className='text-white text-lg font-semibold'>
            {data?.alertDialogTitle || data?.propertyName || 'Property'}
          </DialogTitle>
          <DialogSubtitle className='text-sm text-zinc-200'>
            {data?.alertDialogDescription || data?.hotelRoomDescription || 'Property description'}
          </DialogSubtitle>
          <div className="flex items-center space-x-1 pb-1">
            {/* Star and rating */}
            <StarIcon className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-white font-semibold">
              5.0
            </span>
            <span className="text-sm text-gray-300">·</span>
            <a href="#" className="text-sm underline text-blue-400">
              {data?.user || 'Host'}
            </a>
          </div>
        </div>
      </DialogTrigger>

      {/* DialogContainer - Full View */}
      <DialogContainer className='overflow-y-auto max-h-screen'>
        <DialogContent className='bg-[#121212] w-[750px] h-[850px] shadow-2xl rounded-lg relative overflow-hidden transition-all'>
          <motion.div
            className='p-0.5'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
          >
            {/* Image Gallery */}
            {imageCategories.length > 0 && showImages && (
              <div className='relative'>
                <img
                  src={imageCategories[activeImageTab].images[currentImageIndex]}
                  alt={`Property ${currentImageIndex + 1}`}
                  className='h-[400px] w-full object-cover rounded-t-lg transition-opacity duration-500 ease-in-out'
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkltYWdlIE5vdCBBdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                  }}
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

            {/* Image Category Tabs */}
            {imageCategories.length > 0 && (
              <div className="flex justify-between items-center mb-4 px-4">
                <div className="flex space-x-4">
                  {imageCategories.map((category, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveImageTab(index);
                        setCurrentImageIndex(0);
                      }}
                      className={`px-4 py-2 rounded-[8px] text-sm transition-all duration-300 ${
                        activeImageTab === index
                          ? "bg-gray-200 text-black underline font-bold decoration-2 decoration-blue-500"
                          : "bg-black text-white font-light hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>{category.title}</div>
                        {activeImageTab === index && <CameraIcon className="ml-2" />}
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowImages(!showImages)} className="px-4 py-2 bg-blue-500 text-white rounded-[8px] flex items-center space-x-2">
                  {showImages ? (
                    <>
                      <DoubleArrowUpIcon className="scale-150" />
                      <span className="text-sm font-bold">Hide</span>
                    </>
                  ) : (
                    <>
                      <DoubleArrowDownIcon className="scale-150" />
                      <span className="text-sm font-bold">Show</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Property Header */}
            <div className="px-4 mb-4">
              <h1 className="text-white text-3xl font-semibold mb-2">
                {data?.propertyName || data?.alertDialogTitle || "Property"}
              </h1>
              {(data?.hotelRoomDescription || data?.alertDialogDescription) && (
                <p className="text-gray-400 text-lg font-normal mb-2">
                  {data?.hotelRoomDescription || data?.alertDialogDescription}
                </p>
              )}
              <div className="text-white space-y-1">
                <p className="text-sm text-gray-300">
                  {data?.numberOfGuests !== undefined && `${data.numberOfGuests} guests`}
                  {data?.hotelRoomForOccupants && ` · ${data.hotelRoomForOccupants} bedroom`}
                  {data?.hotelRoomBedType && ` · ${data.hotelRoomBedType} bed`}
                  {data?.numberOfBathrooms !== undefined && ` · ${data.numberOfBathrooms} bathroom${data.numberOfBathrooms !== 1 ? 's' : ''}`}
                </p>
                <div className="flex items-center space-x-1 pb-1">
                  {/* Star and rating */}
                  <StarIcon className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-semibold">5.0</span>
                  {data?.uploadDate && (
                    <>
                      <span className="pl-4 pr-1 text-sm text-gray-300">
                        <BsDatabaseAdd className="inline w-4 h-4" />
                      </span>
                      <span className="text-sm font-semibold">{data.uploadDate}</span>
                    </>
                  )}
                  {data?.user && (
                    <>
                      <span className="pl-2 pr-1 text-sm text-gray-300">
                        <FaUser className="inline w-4 h-4" />
                      </span>
                      <a href="#" className="text-sm underline text-blue-400">
                        {data.user}@mono
                      </a>
                    </>
                  )}
                </div>
              </div>
              <MenubarSeparator className="w-full my-4" />
            </div>

            {/* Tabs */}
            <div className="flex justify-center pb-2">
              <Framer.Tabs {...framer.tabProps} />
            </div>

            {/* Tab Content */}
            <div className="h-[580px] overflow-y-auto">
              {framer.selectedTab.children}
            </div>

            <MenubarSeparator className="w-full mt-4" />
          </motion.div>

          {/* Close button */}
          <DialogClose className='absolute top-4 right-4 text-white hover:text-red-500 transition-transform hover:scale-125 text-2xl'>
            &times;
          </DialogClose>
        </DialogContent>
      </DialogContainer>
    </Dialog>
  );
};

export default PropertyViewer;
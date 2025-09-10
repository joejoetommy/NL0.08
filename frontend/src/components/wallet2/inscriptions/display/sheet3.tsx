"use client";
import React, { useState, useMemo } from "react";
import { MenubarSeparator } from "../../../ui/menubar";
import { useTabs } from "../../../../hooks/use-tabs";
import { Framer } from "../../../../lib/framercard";
// Icons
import { LuBedSingle, LuBath, LuBedDouble } from "react-icons/lu";
import {
  MdKingBed,
  MdBedroomChild,
  MdBedroomParent,
  MdOutlineDriveFileRenameOutline,
  MdOutlineNumbers,
} from "react-icons/md";
import { TbBedFlat } from "react-icons/tb";
import { IoPeople, IoWifi, IoFitness } from "react-icons/io5";
import { FaCheckSquare, FaUser } from "react-icons/fa";
import { SiGoogleclassroom } from "react-icons/si";
import { BsPersonVideo3, BsDatabaseAdd } from "react-icons/bs";
import { LiaSpaSolid } from "react-icons/lia";
import { TfiWrite } from "react-icons/tfi";
import { CameraIcon, DoubleArrowDownIcon, DoubleArrowUpIcon } from "@radix-ui/react-icons";
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

// --- BCAT Data Parsing Functions ---------------------------------------------------------

function parseBCATPropertyData(content: string): ParsedBCATData | null {
  try {
    // First, try to parse as reconstructed content (text)
    if (typeof content === 'string') {
      // Try JSON first
      try {
        const jsonData = JSON.parse(content);
        return { jsonData, images: {} };
      } catch {}
      
      // If not JSON, it might be binary data that was decoded as text
      // We need to work with the actual binary data, but we'll fall back to simple parsing
      return parseSimplePropertyFormat(content);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing BCAT data:', error);
    return null;
  }
}

function parseSimplePropertyFormat(text: string): ParsedBCATData | null {
  try {
    // Try to extract JSON from text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[0]);
      return { jsonData, images: {} };
    }
    
    // If no JSON found, try key-value parsing
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    const jsonData: any = {};
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        // Convert key to camelCase and handle special cases
        const camelKey = key.replace(/\s+(.)/g, (_, char) => char.toUpperCase()).replace(/^\w/, c => c.toLowerCase());
        
        // Handle arrays (comma-separated values)
        if (value.includes(',')) {
          jsonData[camelKey] = value.split(',').map(v => v.trim());
        } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          jsonData[camelKey] = value.toLowerCase() === 'true';
        } else if (!isNaN(Number(value)) && value !== '') {
          jsonData[camelKey] = Number(value);
        } else {
          jsonData[camelKey] = value;
        }
      }
    }
    
    return { jsonData, images: {} };
  } catch (error) {
    console.error('Error parsing simple format:', error);
    return null;
  }
}

// This function would be used if we had access to the actual Uint8Array data
function parseBCATBinaryData(data: Uint8Array): ParsedBCATData | null {
  try {
    let offset = 0;
    const images: { [key: string]: string } = {};
    
    // Read JSON size
    if (offset + 4 > data.length) return null;
    const jsonSize = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
    offset += 4;
    
    // Read JSON data
    if (offset + jsonSize > data.length) return null;
    const jsonBytes = data.slice(offset, offset + jsonSize);
    const jsonText = new TextDecoder().decode(jsonBytes);
    const jsonData = JSON.parse(jsonText);
    offset += jsonSize;
    
    // Read images
    while (offset < data.length) {
      // Read label size
      if (offset + 4 > data.length) break;
      const labelSize = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
      offset += 4;
      
      // Read label
      if (offset + labelSize > data.length) break;
      const labelBytes = data.slice(offset, offset + labelSize);
      const label = new TextDecoder().decode(labelBytes);
      offset += labelSize;
      
      // Read image size
      if (offset + 4 > data.length) break;
      const imageSize = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
      offset += 4;
      
      // Read image data
      if (offset + imageSize > data.length) break;
      const imageBytes = data.slice(offset, offset + imageSize);
      offset += imageSize;
      
      // Convert to base64 URL
      const base64 = btoa(String.fromCharCode(...imageBytes));
      const mimeType = label.includes('Image') ? 'image/jpeg' : 'image/png';
      images[label] = `data:${mimeType};base64,${base64}`;
    }
    
    return { jsonData, images };
  } catch (error) {
    console.error('Error parsing BCAT binary data:', error);
    return null;
  }
}

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

function mapToBetterPropertyStructure(rawData: any, images: { [key: string]: string }): PropertyData {
  const data: PropertyData = {};

  // Basic mappings
  data.propertyName = rawData.propertyName || rawData.title || "";
  data.hotelRoomDescription = rawData.hotelRoomDescription || rawData.description || "";
  data.alertDialogTitle = rawData.title || rawData.alertDialogTitle || rawData.propertyName || "";
  data.alertDialogDescription = rawData.description || rawData.alertDialogDescription || rawData.hotelRoomDescription || "";

  // Numbers
  data.numberOfGuests = normalizeNumber(rawData.numberOfGuests);
  data.numberOfBathrooms = normalizeNumber(rawData.numberOfBathrooms);
  data.numberOfSingleBeds = normalizeNumber(rawData.numberOfSingleBeds);
  data.numberOfQueenBeds = normalizeNumber(rawData.numberOfQueenBeds);
  data.numberOfKingBeds = normalizeNumber(rawData.numberOfKingBeds);
  data.numberOfKidBeds = normalizeNumber(rawData.numberOfKidBeds);
  data.numberOfTufanBeds = normalizeNumber(rawData.numberOfTufanBeds);

  // Room details
  data.hotelRoomForOccupants = rawData.hotelRoomForOccupants;
  data.hotelRoomBedType = rawData.hotelRoomBedType;
  data.arrangementAndFacilities = rawData.arrangementAndFacilities;
  data.otherTypesOfHotelRooms = rawData.otherTypesOfHotelRooms;

  // Arrays
  data.hotelRoomFacilities = Array.isArray(rawData.hotelRoomFacilities) ? rawData.hotelRoomFacilities : [];
  data.spaFacilities = Array.isArray(rawData.spaFacilities) ? rawData.spaFacilities : [];
  data.general = Array.isArray(rawData.general) ? rawData.general : [];
  data.selectedLanguages = Array.isArray(rawData.selectedLanguages) ? rawData.selectedLanguages : [];
  data.hostLanguages = data.selectedLanguages; // Alias

  // Facilities
  data.freeWifi = rawData.freeWifi;
  data.receptionDetails = rawData.receptionDetails;
  data.gymOrFitness = rawData.gymOrFitness;
  data.dedicatedWorkstation = rawData.dedicatedWorkstation;
  data.additionalHotelFeatures = rawData.additionalHotelFeatures;

  // Rules - handle both raw rules object and the nested structure
  if (rawData.rules && typeof rawData.rules === 'object') {
    const rulesObj = rawData.rules;
    data.rules = {
      smokingAllowed: toBoolFromYesNo(rulesObj.smokingallowed || rulesObj.smokingAllowed),
      petsAllowed: toBoolFromYesNo(rulesObj.petsallowed || rulesObj.petsAllowed),
      childrenAllowed: toBoolFromYesNo(rulesObj.childrenallowed || rulesObj.childrenAllowed),
      partiesAllowed: toBoolFromYesNo(rulesObj.partieseventsallowed || rulesObj.partiesAllowed),
      additionalRules: rulesObj.additionalRules || rulesObj.additionalrules
    };
  }

  // Times
  data.checkInFrom = rawData.checkInFrom;
  data.checkInUntil = rawData.checkInUntil;
  data.checkOutFrom = rawData.checkOutFrom;
  data.checkOutUntil = rawData.checkOutUntil;
  data.cancellationPolicy = rawData.cancellationPolicy;

  // Host info
  data.sellersName = rawData.sellersName;
  data.yourRole = rawData.yourRole;
  data.contactDetails = rawData.contactDetails;

  // Images - convert from base64 or use placeholders
  data.alertDialogImage = images.mainImage || images.alertDialogImage;
  data.profileImage = images.profileImage;
  
  // For photos arrays, we'll populate them if we have the images
  data.roomPhotos = [];
  data.hotelPhotos = [];
  data.facilitiesPhotos = [];
  
  // Look for numbered images
  Object.keys(images).forEach(key => {
    if (key.startsWith('roomPhoto_')) {
      data.roomPhotos!.push(images[key]);
    } else if (key.startsWith('hotelPhoto_')) {
      data.hotelPhotos!.push(images[key]);
    } else if (key.startsWith('facilitiesPhoto_')) {
      data.facilitiesPhotos!.push(images[key]);
    }
  });

  // Metadata
  data.uploadDate = rawData.createdAt || rawData.uploadDate;
  data.user = rawData.user;
  data.createdAt = rawData.createdAt;

  return data;
}

const PropertyViewer: React.FC<PropertyViewerProps> = ({ content }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeImageTab, setActiveImageTab] = useState(0);
  const [showImages, setShowImages] = useState(true);

  const parsedData = useMemo(() => {
    return parseBCATPropertyData(content);
  }, [content]);

  const data = useMemo(() => {
    if (!parsedData) return null;
    return mapToBetterPropertyStructure(parsedData.jsonData, parsedData.images);
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
                  ⚠️ Could not parse this content as property data. This might be:
                </p>
                <ul className="text-yellow-200 text-xs mt-2 space-y-1">
                  <li>• Raw binary data that needs special parsing</li>
                  <li>• Incomplete or corrupted BCAT reconstruction</li>
                  <li>• Non-property file content</li>
                </ul>
              </div>
            </div>
          ),
        },
      ];
    }

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
              {data.numberOfSingleBeds !== undefined && (
                <div className="mb-2 flex items-center">
                  <LuBedSingle />
                  <strong className="ml-3 text-gray-300">Single Beds:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.numberOfSingleBeds}
                  </span>
                </div>
              )}
              {data.numberOfQueenBeds !== undefined && (
                <div className="mb-2 flex items-center">
                  <LuBedDouble />
                  <strong className="ml-3 text-gray-300">Queen Beds:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.numberOfQueenBeds}
                  </span>
                </div>
              )}
              {data.numberOfKingBeds !== undefined && (
                <div className="mb-2 flex items-center">
                  <MdKingBed />
                  <strong className="ml-3 text-gray-300">King Beds:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.numberOfKingBeds}
                  </span>
                </div>
              )}
              {data.numberOfKidBeds !== undefined && (
                <div className="mb-2 flex items-center">
                  <MdBedroomChild />
                  <strong className="ml-3 text-gray-300">Kid Beds:</strong>
                  <span className="ml-auto font-[Arial,Helvetica,sans-serif]">
                    {data.numberOfKidBeds}
                  </span>
                </div>
              )}
              {data.numberOfTufanBeds !== undefined && (
                <div className="mb-2 flex items-center">
                  <TbBedFlat />
                  <strong className="ml-3 text-gray-300">Tufan Beds:</strong>
                  <span className="ml-auto font-sans">{data.numberOfTufanBeds}</span>
                </div>
              )}
              {data.hotelRoomForOccupants && (
                <div className="mb-2 flex items-center">
                  <MdOutlineNumbers />
                  <strong className="ml-3 text-gray-300">Hotel Room for Occupants:</strong>
                  <span className="ml-auto font-sans">{data.hotelRoomForOccupants}</span>
                </div>
              )}
              {data.hotelRoomBedType && (
                <div className="mb-2 flex items-center">
                  <MdBedroomParent />
                  <strong className="ml-3 text-gray-300">Hotel Room Bed Type:</strong>
                  <span className="ml-auto font-sans">{data.hotelRoomBedType}</span>
                </div>
              )}
              {data.arrangementAndFacilities && (
                <div className="mb-2 flex items-center">
                  <FaCheckSquare />
                  <strong className="ml-3 text-gray-300">Arrangement and Facilities:</strong>
                  <span className="ml-auto font-sans">{data.arrangementAndFacilities}</span>
                </div>
              )}
              {data.otherTypesOfHotelRooms && (
                <div className="mb-2 flex items-center">
                  <SiGoogleclassroom />
                  <strong className="ml-3 text-gray-300">Type of Hotel Room:</strong>
                  <span className="ml-auto font-sans">{data.otherTypesOfHotelRooms}</span>
                </div>
              )}
              {data.hotelRoomFacilities && data.hotelRoomFacilities.length > 0 && (
                <div className="mb-2 flex items-center">
                  <FaCheckSquare />
                  <strong className="ml-3 text-gray-300">Hotel Room Facilities:</strong>
                  <span className="ml-auto font-sans">{data.hotelRoomFacilities.join(", ")}</span>
                </div>
              )}
              {data.freeWifi && (
                <div className="mb-2 flex items-center">
                  <IoWifi />
                  <strong className="ml-3 text-gray-300">Free Wifi:</strong>
                  <span className="ml-auto font-sans">{data.freeWifi}</span>
                </div>
              )}
              {data.receptionDetails && (
                <div className="mb-2 flex items-center">
                  <BsPersonVideo3 />
                  <strong className="ml-3 text-gray-300">Reception Details:</strong>
                  <span className="ml-auto font-sans">{data.receptionDetails}</span>
                </div>
              )}
              {data.gymOrFitness && (
                <div className="mb-2 flex items-center">
                  <IoFitness />
                  <strong className="ml-3 text-gray-300">Gym or Fitness:</strong>
                  <span className="ml-auto font-sans">{data.gymOrFitness}</span>
                </div>
              )}
              {data.spaFacilities && data.spaFacilities.length > 0 && (
                <div className="mb-2 flex items-center">
                  <LiaSpaSolid />
                  <strong className="ml-3 text-gray-300">Spa Facilities:</strong>
                  <span className="ml-auto font-sans">{data.spaFacilities.join(", ")}</span>
                </div>
              )}
              {data.dedicatedWorkstation && (
                <div className="mb-2 flex items-center">
                  <TfiWrite />
                  <strong className="ml-3 text-gray-300">Dedicated Workstation:</strong>
                  <span className="ml-auto font-sans">{data.dedicatedWorkstation}</span>
                </div>
              )}
              {data.hotelRoomDescription && (
                <div className="mb-2 flex items-center">
                  <TfiWrite />
                  <strong className="ml-3 text-gray-300">Hotel Room Description:</strong>
                  <span className="ml-auto font-sans">{data.hotelRoomDescription}</span>
                </div>
              )}
              {data.general && data.general.length > 0 && (
                <div className="mb-2 flex items-center">
                  <FaCheckSquare />
                  <strong className="ml-3 text-gray-300">General:</strong>
                  <span className="ml-auto font-sans">{data.general.join(", ")}</span>
                </div>
              )}
              {data.additionalHotelFeatures && (
                <div className="mb-2 flex items-center">
                  <TfiWrite />
                  <strong className="ml-3 text-gray-300">Additional Hotel Features:</strong>
                  <span className="ml-auto font-sans">{data.additionalHotelFeatures}</span>
                </div>
              )}
              {data.rules && (
                <div className="mb-2 flex items-center">
                  <FaCheckSquare />
                  <strong className="ml-3 text-gray-300">Rules:</strong>
                  <span className="ml-auto font-sans text-left">
                    Smoking: {data.rules.smokingAllowed === undefined ? "—" : data.rules.smokingAllowed ? "Yes" : "No"}, {" "}
                    Pets: {data.rules.petsAllowed === undefined ? "—" : data.rules.petsAllowed ? "Yes" : "No"}, {" "}
                    Children: {data.rules.childrenAllowed === undefined ? "—" : data.rules.childrenAllowed ? "Yes" : "No"}, {" "}
                    Parties: {data.rules.partiesAllowed === undefined ? "—" : data.rules.partiesAllowed ? "Yes" : "No"}
                    {data.rules.additionalRules && (
                      <>
                        {", Additional: "}
                        {data.rules.additionalRules}
                      </>
                    )}
                  </span>
                </div>
              )}
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
                  <IoFitness />
                  <strong className="ml-3 text-gray-300">Cancellation policy:</strong>
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
              {data.profileImage && (
                <img src={data.profileImage} alt="Profile" className="w-20 h-20 rounded-full" />
              )}
              <div>
                <h3 className="text-xl font-bold">{data.sellersName || "Host"}</h3>
                <p className="text-sm">{data.yourRole || "Property Owner"}</p>
              </div>
            </div>
            <div className="mt-4">
              {data.contactDetails && (
                <div className="flex space-x-2 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8h18M9 12h6m-7 8h8a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v13a2 2 0 002 2h1z" />
                  </svg>
                  <p className="text-sm">{data.contactDetails}</p>
                </div>
              )}
              {data.hostLanguages && data.hostLanguages.length > 0 && (
                <div className="flex space-x-2 items-center mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm"><strong>Languages:</strong> {data.hostLanguages.join(", ")}</p>
                </div>
              )}
            </div>
          </div>
        ),
      },
    ];
  }, [data, content]);

  const framer = useTabs({ tabs: ITEMS, initialTabId: ITEMS[0]?.label || "Raw" });

  return (
    <div className="bg-[#121212] text-white rounded-lg shadow-md max-w-4xl mx-auto">
      {/* Image Gallery */}
      {imageCategories.length > 0 && showImages && (
        <div className="relative mb-4">
          <img
            src={imageCategories[activeImageTab].images[currentImageIndex]}
            alt={`Image ${currentImageIndex + 1}`}
            className="h-[400px] w-full object-cover rounded-t-lg transition-opacity duration-500 ease-in-out"
          />
          <button onClick={handlePreviousImage} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110">
            <ChevronLeft size={24} />
          </button>
          <button onClick={handleNextImage} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110">
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
                <span className="text-sm font-bold">Up</span>
              </>
            ) : (
              <>
                <DoubleArrowDownIcon className="scale-150" />
                <span className="text-sm font-bold">Down</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Property Header */}
      <div className="px-4 mb-4">
        <h1 className="text-white text-3xl font-semibold mb-2">{data?.propertyName || data?.alertDialogTitle || "Property"}</h1>
        <p className="text-gray-400 text-lg font-normal mb-2">{data?.hotelRoomDescription || data?.alertDialogDescription || "Property description"}</p>
        <div className="text-white space-y-1">
          <p className="text-sm text-gray-300">
            {data?.numberOfGuests !== undefined && `${data.numberOfGuests} guests`}
            {data?.hotelRoomForOccupants && ` · ${data.hotelRoomForOccupants} bedroom`}
            {data?.hotelRoomBedType && ` · ${data.hotelRoomBedType} bed`}
            {data?.numberOfBathrooms !== undefined && ` · ${data.numberOfBathrooms} bathroom`}
          </p>
          <div className="flex items-center space-x-1 pb-1">
            {data?.uploadDate && (
              <>
                <BsDatabaseAdd className="w-4 h-4" />
                <span className="text-sm font-semibold">{data.uploadDate}</span>
              </>
            )}
            {data?.user && (
              <>
                <FaUser className="w-4 h-4 ml-4" />
                <span className="text-sm text-blue-400">{data.user}</span>
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
      <div className="h-[580px] overflow-y-auto">{framer.selectedTab.children}</div>
    </div>
  );
};

export default PropertyViewer;
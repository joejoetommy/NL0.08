"use client";
import React, { useState, useMemo } from "react";
// import { Button } from "@/components/ui/button";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { MenubarSeparator } from "../../../ui/menubar";
// import { motion } from 'framer-motion';
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
import {
  CameraIcon,
  DoubleArrowDownIcon,
  DoubleArrowUpIcon,
} from "@radix-ui/react-icons";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PropertyData {
  // Basic property info
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
  // Rules
  rules?: {
    smokingAllowed?: boolean;
    petsAllowed?: boolean;
    childrenAllowed?: boolean;
    partiesAllowed?: boolean;
    additionalRules?: string;
  };
  // Check-in/out
  checkInFrom?: string;
  checkInUntil?: string;
  checkOutFrom?: string;
  checkOutUntil?: string;
  cancellationPolicy?: string;
  // Host info
  profileImage?: string;
  sellersName?: string;
  yourRole?: string;
  contactDetails?: string;
  hostLanguages?: string[];
  // Images
  roomPhotos?: string[];
  hotelPhotos?: string[];
  facilitiesPhotos?: string[];
  alertDialogImage?: string;
  // Metadata
  alertDialogTitle?: string;
  alertDialogDescription?: string;
  uploadDate?: string;
  user?: string;
  // Interactive data
  Interact?: any;
}

interface PropertyViewerProps {
  content: string;
}

// Lightweight parser: JSON → key/value; otherwise INI / "key: value" / "key=value" lines
function parseProperties(text = ""): [string, string][] {
  if (!text || typeof text !== "string") return [];
  // Try JSON first
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object") {
      return Object.entries(obj).map(([k, v]) => [k, formatValue(v)]);
    }
  } catch (_) {}

  // Fallback: parse "key: value" or "key=value" lines
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: [string, string][] = [];
  for (const line of lines) {
    const m = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
    if (m) rows.push([m[1].trim(), m[2].trim()]);
  }
  return rows;
}

function formatValue(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v, null, 2);
}

// Convert parsed properties to PropertyData structure
function convertToPropertyData(rows: [string, string][]): PropertyData {
  const data: PropertyData = {};
  for (const [key, value] of rows) {
    const lowerKey = key.toLowerCase().replace(/\s+/g, "");
    // Map common property fields
    switch (lowerKey) {
      case "propertyname":
      case "name":
      case "title":
        data.propertyName = value;
        break;
      case "numberofguests":
      case "guests":
        data.numberOfGuests = parseInt(value) || 0;
        break;
      case "numberofbathrooms":
      case "bathrooms":
        data.numberOfBathrooms = parseInt(value) || 0;
        break;
      case "singlebeds":
      case "numberofsinglebeds":
        data.numberOfSingleBeds = parseInt(value) || 0;
        break;
      case "queenbeds":
      case "numberofqueenbeds":
        data.numberOfQueenBeds = parseInt(value) || 0;
        break;
      case "kingbeds":
      case "numberofkingbeds":
        data.numberOfKingBeds = parseInt(value) || 0;
        break;
      case "kidbeds":
      case "numberofkidbeds":
        data.numberOfKidBeds = parseInt(value) || 0;
        break;
      case "description":
      case "hotelroomdescription":
        data.hotelRoomDescription = value;
        break;
      case "wifi":
      case "freewifi":
        data.freeWifi = value;
        break;
      case "smokingallowed":
        data.rules = {
          ...data.rules,
          smokingAllowed:
            value.toLowerCase() === "true" || value.toLowerCase() === "yes",
        };
        break;
      case "petsallowed":
        data.rules = {
          ...data.rules,
          petsAllowed:
            value.toLowerCase() === "true" || value.toLowerCase() === "yes",
        };
        break;
      case "childrenallowed":
        data.rules = {
          ...data.rules,
          childrenAllowed:
            value.toLowerCase() === "true" || value.toLowerCase() === "yes",
        };
        break;
      case "partiesallowed":
        data.rules = {
          ...data.rules,
          partiesAllowed:
            value.toLowerCase() === "true" || value.toLowerCase() === "yes",
        };
        break;
      case "checkin":
      case "checkinfrom":
        data.checkInFrom = value;
        break;
      case "checkinuntil":
        data.checkInUntil = value;
        break;
      case "checkout":
      case "checkoutfrom":
        data.checkOutFrom = value;
        break;
      case "checkoutuntil":
        data.checkOutUntil = value;
        break;
      case "host":
      case "sellersname":
        data.sellersName = value;
        break;
      case "contact":
      case "contactdetails":
        data.contactDetails = value;
        break;
      case "uploaddate":
      case "date":
        data.uploadDate = value;
        break;
      case "user":
      case "owner":
        data.user = value;
        break;
      // Handle array fields
      case "facilities":
      case "hotelroomfacilities":
        data.hotelRoomFacilities = value.split(",").map((s) => s.trim());
        break;
      case "spafacilities":
        data.spaFacilities = value.split(",").map((s) => s.trim());
        break;
      case "general":
        data.general = value.split(",").map((s) => s.trim());
        break;
      case "hostlanguages":
      case "languages":
        data.hostLanguages = value.split(",").map((s) => s.trim());
        break;
      // Handle image URLs
      case "image":
      case "alertdialogimage":
      case "mainimage":
        data.alertDialogImage = value;
        break;
      case "roomphotos":
        data.roomPhotos = value.split(",").map((s) => s.trim());
        break;
      case "hotelphotos":
        data.hotelPhotos = value.split(",").map((s) => s.trim());
        break;
      case "facilitiesphotos":
        data.facilitiesPhotos = value.split(",").map((s) => s.trim());
        break;
    }
  }

  // Set defaults for required fields
  data.alertDialogTitle = data.propertyName || "Property";
  data.alertDialogDescription = data.hotelRoomDescription || "Property listing";
  data.roomPhotos = data.roomPhotos || [];
  data.hotelPhotos = data.hotelPhotos || [];
  data.facilitiesPhotos = data.facilitiesPhotos || [];
  data.hotelRoomFacilities = data.hotelRoomFacilities || [];
  data.spaFacilities = data.spaFacilities || [];
  data.general = data.general || [];
  data.hostLanguages = data.hostLanguages || [];
  data.rules = data.rules || {};

  return data;
}

const PropertyViewer: React.FC<PropertyViewerProps> = ({ content }) => {
  // 🔧 Hooks must be called unconditionally and in the same order
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeImageTab, setActiveImageTab] = useState(0);
  const [showImages, setShowImages] = useState(true);

  // Parse & normalize content (safe even if content is empty)
  const data = useMemo(() => {
    const rows = parseProperties(content);
    if (!rows.length) return null; // we won't early-return the component
    return convertToPropertyData(rows);
  }, [content]);

  // Build image categories regardless; will be empty if data is null
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

  // Tabs content — if parsing fails, show a "Raw" tab instead of early-returning
  const ITEMS = useMemo(() => {
    if (!data) {
      return [
        {
          label: "Raw",
          children: (
            <pre className="text-gray-300 text-sm whitespace-pre-wrap">
              {content || "(no readable properties)"}
            </pre>
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
                  <strong className="ml-3 text-gray-300">
                    Hotel Room for Occupants:
                  </strong>
                  <span className="ml-auto font-sans">
                    {data.hotelRoomForOccupants}
                  </span>
                </div>
              )}
              {data.hotelRoomBedType && (
                <div className="mb-2 flex items-center">
                  <MdBedroomParent />
                  <strong className="ml-3 text-gray-300">
                    Hotel Room Bed Type:
                  </strong>
                  <span className="ml-auto font-sans">{data.hotelRoomBedType}</span>
                </div>
              )}
              {data.arrangementAndFacilities && (
                <div className="mb-2 flex items-center">
                  <FaCheckSquare />
                  <strong className="ml-3 text-gray-300">
                    Arrangement and Facilities:
                  </strong>
                  <span className="ml-auto font-sans">
                    {data.arrangementAndFacilities}
                  </span>
                </div>
              )}
              {data.otherTypesOfHotelRooms && (
                <div className="mb-2 flex items-center">
                  <SiGoogleclassroom />
                  <strong className="ml-3 text-gray-300">Type of Hotel Room:</strong>
                  <span className="ml-auto font-sans">
                    {data.otherTypesOfHotelRooms}
                  </span>
                </div>
              )}
              {data.hotelRoomFacilities && data.hotelRoomFacilities.length > 0 && (
                <div className="mb-2 flex items-center">
                  <FaCheckSquare />
                  <strong className="ml-3 text-gray-300">
                    Hotel Room Facilities:
                  </strong>
                  <span className="ml-auto font-sans">
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
                  <span className="ml-auto font-sans">
                    {data.spaFacilities.join(", ")}
                  </span>
                </div>
              )}
              {data.dedicatedWorkstation && (
                <div className="mb-2 flex items-center">
                  <TfiWrite />
                  <strong className="ml-3 text-gray-300">Dedicated Workstation:</strong>
                  <span className="ml-auto font-sans">
                    {data.dedicatedWorkstation}
                  </span>
                </div>
              )}
              {data.hotelRoomDescription && (
                <div className="mb-2 flex items-center">
                  <TfiWrite />
                  <strong className="ml-3 text-gray-300">
                    Hotel Room Description:
                  </strong>
                  <span className="ml-auto font-sans">
                    {data.hotelRoomDescription}
                  </span>
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
                  <strong className="ml-3 text-gray-300">
                    Additional Hotel Features:
                  </strong>
                  <span className="ml-auto font-sans">
                    {data.additionalHotelFeatures}
                  </span>
                </div>
              )}
              {data.rules && (
                <div className="mb-2 flex items-center">
                  <FaCheckSquare />
                  <strong className="ml-3 text-gray-300">Rules:</strong>
                  <span className="ml-auto font-sans">
                    Smoking: {data.rules.smokingAllowed ? "Yes" : "No"}, Pets: {" "}
                    {data.rules.petsAllowed ? "Yes" : "No"}, Children: {" "}
                    {data.rules.childrenAllowed ? "Yes" : "No"}, Parties: {" "}
                    {data.rules.partiesAllowed ? "Yes" : "No"}
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
                <img
                  src={data.profileImage}
                  alt="Profile"
                  className="w-20 h-20 rounded-full"
                />
              )}
              <div>
                <h3 className="text-xl font-bold">{data.sellersName || "Host"}</h3>
                <p className="text-sm">{data.yourRole || "Property Owner"}</p>
              </div>
            </div>
            <div className="mt-4">
              {data.contactDetails && (
                <div className="flex space-x-2 items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8h18M9 12h6m-7 8h8a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v13a2 2 0 002 2h1z"
                    />
                  </svg>
                  <p className="text-sm">{data.contactDetails}</p>
                </div>
              )}
              {data.hostLanguages && data.hostLanguages.length > 0 && (
                <div className="flex space-x-2 items-center mt-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
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

  // Always call hooks (no conditional). useTabs depends on ITEMS.
  const framer = useTabs({
    tabs: ITEMS,
    initialTabId: ITEMS[0]?.label || "Raw",
  });

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
          <button
            onClick={handlePreviousImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110"
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
          <button
            onClick={() => setShowImages(!showImages)}
            className="px-4 py-2 bg-blue-500 text-white rounded-[8px] flex items-center space-x-2"
          >
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
        <h1 className="text-white text-3xl font-semibold mb-2">
          {data?.propertyName || "Property"}
        </h1>
        <p className="text-gray-400 text-lg font-normal mb-2">
          {data?.hotelRoomDescription || "Property description"}
        </p>
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








// 'use client';

// import React, { useState, useMemo } from 'react';
// // import { Button } from "@/components/ui/button";
// // import { Button } from "../../../../../components/ui/button"
// // import { ScrollArea } from "@/components/ui/scroll-area";
// import { MenubarSeparator } from "../../../ui/menubar";
// // import { motion } from 'framer-motion';
// import { useTabs } from '../../../../hooks/use-tabs';
// import { Framer } from '../../../../lib/framercard';
// //import { Icon } from '@iconify/react';

// // Icons
// import { LuBedSingle, LuBath, LuBedDouble } from "react-icons/lu";
// import { MdKingBed, MdBedroomChild, MdBedroomParent, MdOutlineDriveFileRenameOutline, MdOutlineNumbers } from "react-icons/md";
// import { TbBedFlat } from "react-icons/tb";
// import { IoPeople, IoWifi, IoFitness } from "react-icons/io5";
// import { FaCheckSquare, FaUser } from "react-icons/fa";

// import { SiGoogleclassroom } from "react-icons/si";
// import { BsPersonVideo3, BsDatabaseAdd } from "react-icons/bs";
// import { LiaSpaSolid } from "react-icons/lia";
// import { TfiWrite } from "react-icons/tfi";
// //import { LuPartyPopper } from "react-icons/lu";
// import { CameraIcon, DoubleArrowDownIcon, DoubleArrowUpIcon } from "@radix-ui/react-icons";
// import { ChevronLeft, ChevronRight } from 'lucide-react';

// interface PropertyData {
//   // Basic property info
//   propertyName?: string;
//   numberOfGuests?: number;
//   numberOfBathrooms?: number;
//   numberOfSingleBeds?: number;
//   numberOfQueenBeds?: number;
//   numberOfKingBeds?: number;
//   numberOfKidBeds?: number;
//   numberOfTufanBeds?: number;
//   hotelRoomForOccupants?: string;
//   hotelRoomBedType?: string;
//   arrangementAndFacilities?: string;
//   otherTypesOfHotelRooms?: string;
//   hotelRoomFacilities?: string[];
//   freeWifi?: string;
//   receptionDetails?: string;
//   gymOrFitness?: string;
//   spaFacilities?: string[];
//   dedicatedWorkstation?: string;
//   hotelRoomDescription?: string;
//   general?: string[];
//   additionalHotelFeatures?: string;
  
//   // Rules
//   rules?: {
//     smokingAllowed?: boolean;
//     petsAllowed?: boolean;
//     childrenAllowed?: boolean;
//     partiesAllowed?: boolean;
//     additionalRules?: string;
//   };
  
//   // Check-in/out
//   checkInFrom?: string;
//   checkInUntil?: string;
//   checkOutFrom?: string;
//   checkOutUntil?: string;
//   cancellationPolicy?: string;
  
//   // Host info
//   profileImage?: string;
//   sellersName?: string;
//   yourRole?: string;
//   contactDetails?: string;
//   hostLanguages?: string[];
  
//   // Images
//   roomPhotos?: string[];
//   hotelPhotos?: string[];
//   facilitiesPhotos?: string[];
//   alertDialogImage?: string;
  
//   // Metadata
//   alertDialogTitle?: string;
//   alertDialogDescription?: string;
//   uploadDate?: string;
//   user?: string;
  
//   // Interactive data
//   Interact?: any;
// }

// interface PropertyViewerProps {
//   content: string;
// }

// // Lightweight parser: JSON → key/value; otherwise INI / "key: value" / "key=value" lines
// function parseProperties(text = ""): [string, string][] {
//   if (!text || typeof text !== "string") return [];

//   // Try JSON first
//   try {
//     const obj = JSON.parse(text);
//     if (obj && typeof obj === "object") {
//       return Object.entries(obj).map(([k, v]) => [k, formatValue(v)]);
//     }
//   } catch (_) {}

//   // Fallback: parse "key: value" or "key=value" lines
//   const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
//   const rows = [];
//   for (const line of lines) {
//     const m = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
//     if (m) rows.push([m[1].trim(), m[2].trim()]);
//   }
//   return rows;
// }

// function formatValue(v: any): string {
//   if (v == null) return "";
//   if (typeof v === "string") return v;
//   if (typeof v === "number" || typeof v === "boolean") return String(v);
//   return JSON.stringify(v, null, 2);
// }

// // Convert parsed properties to PropertyData structure
// function convertToPropertyData(rows: [string, string][]): PropertyData {
//   const data: PropertyData = {};
  
//   for (const [key, value] of rows) {
//     const lowerKey = key.toLowerCase().replace(/\s+/g, '');
    
//     // Map common property fields
//     switch (lowerKey) {
//       case 'propertyname':
//       case 'name':
//       case 'title':
//         data.propertyName = value;
//         break;
//       case 'numberofguests':
//       case 'guests':
//         data.numberOfGuests = parseInt(value) || 0;
//         break;
//       case 'numberofbathrooms':
//       case 'bathrooms':
//         data.numberOfBathrooms = parseInt(value) || 0;
//         break;
//       case 'singlebeds':
//       case 'numberofsingle beds':
//         data.numberOfSingleBeds = parseInt(value) || 0;
//         break;
//       case 'queenbeds':
//       case 'numberofqueenbeds':
//         data.numberOfQueenBeds = parseInt(value) || 0;
//         break;
//       case 'kingbeds':
//       case 'numberofkingbeds':
//         data.numberOfKingBeds = parseInt(value) || 0;
//         break;
//       case 'kidbeds':
//       case 'numberofkidbeds':
//         data.numberOfKidBeds = parseInt(value) || 0;
//         break;
//       case 'description':
//       case 'hotelroomdescription':
//         data.hotelRoomDescription = value;
//         break;
//       case 'wifi':
//       case 'freewifi':
//         data.freeWifi = value;
//         break;
//       case 'smokingallowed':
//         data.rules = { ...data.rules, smokingAllowed: value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' };
//         break;
//       case 'petsallowed':
//         data.rules = { ...data.rules, petsAllowed: value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' };
//         break;
//       case 'childrenallowed':
//         data.rules = { ...data.rules, childrenAllowed: value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' };
//         break;
//       case 'partiesallowed':
//         data.rules = { ...data.rules, partiesAllowed: value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' };
//         break;
//       case 'checkin':
//       case 'checkinfrom':
//         data.checkInFrom = value;
//         break;
//       case 'checkout':
//       case 'checkoutfrom':
//         data.checkOutFrom = value;
//         break;
//       case 'host':
//       case 'sellersname':
//         data.sellersName = value;
//         break;
//       case 'contact':
//       case 'contactdetails':
//         data.contactDetails = value;
//         break;
//       case 'uploaddate':
//       case 'date':
//         data.uploadDate = value;
//         break;
//       case 'user':
//       case 'owner':
//         data.user = value;
//         break;
//       // Handle array fields
//       case 'facilities':
//       case 'hotelroomfacilities':
//         data.hotelRoomFacilities = value.split(',').map(s => s.trim());
//         break;
//       case 'spafacilities':
//         data.spaFacilities = value.split(',').map(s => s.trim());
//         break;
//       case 'general':
//         data.general = value.split(',').map(s => s.trim());
//         break;
//       case 'hostlanguages':
//       case 'languages':
//         data.hostLanguages = value.split(',').map(s => s.trim());
//         break;
//       // Handle image URLs
//       case 'image':
//       case 'alertdialogimage':
//       case 'mainimage':
//         data.alertDialogImage = value;
//         break;
//       case 'roomphotos':
//         data.roomPhotos = value.split(',').map(s => s.trim());
//         break;
//       case 'hotelphotos':
//         data.hotelPhotos = value.split(',').map(s => s.trim());
//         break;
//       case 'facilitiesphotos':
//         data.facilitiesPhotos = value.split(',').map(s => s.trim());
//         break;
//     }
//   }
  
//   // Set defaults for required fields
//   data.alertDialogTitle = data.propertyName || 'Property';
//   data.alertDialogDescription = data.hotelRoomDescription || 'Property listing';
//   data.roomPhotos = data.roomPhotos || [];
//   data.hotelPhotos = data.hotelPhotos || [];
//   data.facilitiesPhotos = data.facilitiesPhotos || [];
//   data.hotelRoomFacilities = data.hotelRoomFacilities || [];
//   data.spaFacilities = data.spaFacilities || [];
//   data.general = data.general || [];
//   data.hostLanguages = data.hostLanguages || [];
//   data.rules = data.rules || {};
  
//   return data;
// }

// const PropertyViewer: React.FC<PropertyViewerProps> = ({ content }) => {
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const [activeImageTab, setActiveImageTab] = useState(0);
//   const [showImages, setShowImages] = useState(true);
  
//   // Parse the content and convert to PropertyData
//   const data = useMemo(() => {
//     const rows = parseProperties(content);
//     if (!rows.length) {
//       return null; // Will show raw content fallback
//     }
//     return convertToPropertyData(rows);
//   }, [content]);

//   // If we can't parse the content as property data, show raw content
//   if (!data) {
//     return (
//       <pre className="text-gray-300 text-sm whitespace-pre-wrap">
//         {content || "(no readable properties)"}
//       </pre>
//     );
//   }

//   const imageCategories = [
//     { title: "Room", images: data.roomPhotos || [] },
//     { title: "Hotel", images: data.hotelPhotos || [] },
//     { title: "Facilities", images: data.facilitiesPhotos || [] },
//   ].filter(category => category.images.length > 0);

//   const handlePreviousImage = () => {
//     if (imageCategories.length === 0) return;
//     setCurrentImageIndex((prevIndex) =>
//       prevIndex === 0 ? imageCategories[activeImageTab].images.length - 1 : prevIndex - 1
//     );
//   };

//   const handleNextImage = () => {
//     if (imageCategories.length === 0) return;
//     setCurrentImageIndex((prevIndex) =>
//       prevIndex === imageCategories[activeImageTab].images.length - 1 ? 0 : prevIndex + 1
//     );
//   };

//   const ITEMS = [
//     {
//       label: 'Details',
//       children: (
//         <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-2xl mx-auto">
//           <h2 className="text-2xl font-bold mb-6">Property Details</h2>
      
//           <div className="space-y-4">
//             {data.propertyName && (
//               <div className="mb-2 flex items-center">
//                 <MdOutlineDriveFileRenameOutline />
//                 <strong className="ml-3 text-gray-300">Property Name:</strong>
//                 <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.propertyName}</span>
//               </div>
//             )}
      
//             {data.numberOfGuests && (
//               <div className="mb-2 flex items-center">
//                 <IoPeople />
//                 <strong className="ml-3 text-gray-300">Number of Guests:</strong>
//                 <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfGuests}</span>
//               </div>
//             )}
      
//             {data.numberOfBathrooms && (
//               <div className="mb-2 flex items-center">
//                 <LuBath />
//                 <strong className="ml-3 text-gray-300">Number of Bathrooms:</strong>
//                 <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfBathrooms}</span>
//               </div>
//             )}
      
//             {data.numberOfSingleBeds && (
//               <div className="mb-2 flex items-center">
//                 <LuBedSingle />
//                 <strong className="ml-3 text-gray-300">Single Beds:</strong>
//                 <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfSingleBeds}</span>
//               </div>
//             )}
      
//             {data.numberOfQueenBeds && (
//               <div className="mb-2 flex items-center">
//                 <LuBedDouble />
//                 <strong className="ml-3 text-gray-300">Queen Beds:</strong>
//                 <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfQueenBeds}</span>
//               </div>
//             )}
      
//             {data.numberOfKingBeds && (
//               <div className="mb-2 flex items-center">
//                 <MdKingBed />
//                 <strong className="ml-3 text-gray-300">King Beds:</strong>
//                 <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfKingBeds}</span>
//               </div>
//             )}
      
//             {data.numberOfKidBeds && (
//               <div className="mb-2 flex items-center">
//                 <MdBedroomChild />
//                 <strong className="ml-3 text-gray-300">Kid Beds:</strong>
//                 <span className="ml-auto font-[Arial,Helvetica,sans-serif]">{data.numberOfKidBeds}</span>
//               </div>
//             )}
      
//             {data.numberOfTufanBeds && (
//               <div className="mb-2 flex items-center">
//                 <TbBedFlat />
//                 <strong className="ml-3 text-gray-300">Tufan Beds:</strong>
//                 <span className="ml-auto font-sans">{data.numberOfTufanBeds}</span>
//               </div>
//             )}
      
//             {data.hotelRoomForOccupants && (
//               <div className="mb-2 flex items-center">
//                 <MdOutlineNumbers />
//                 <strong className="ml-3 text-gray-300">Hotel Room for Occupants:</strong>
//                 <span className="ml-auto font-sans">{data.hotelRoomForOccupants}</span>
//               </div>
//             )}
      
//             {data.hotelRoomBedType && (
//               <div className="mb-2 flex items-center">
//                 <MdBedroomParent />
//                 <strong className="ml-3 text-gray-300">Hotel Room Bed Type:</strong>
//                 <span className="ml-auto font-sans">{data.hotelRoomBedType}</span>
//               </div>
//             )}
      
//             {data.arrangementAndFacilities && (
//               <div className="mb-2 flex items-center"> 
//                 <FaCheckSquare />  
//                 <strong className="ml-3 text-gray-300">Arrangement and Facilities:</strong>
//                 <span className="ml-auto font-sans">{data.arrangementAndFacilities}</span>
//               </div>
//             )}
      
//             {data.otherTypesOfHotelRooms && (
//               <div className="mb-2 flex items-center">
//                 <SiGoogleclassroom />
//                 <strong className="ml-3 text-gray-300">Type of Hotel Room:</strong>
//                 <span className="ml-auto font-sans">{data.otherTypesOfHotelRooms}</span>
//               </div>
//             )}
      
//             {data.hotelRoomFacilities && data.hotelRoomFacilities.length > 0 && (
//               <div className="mb-2 flex items-center">
//                 <FaCheckSquare />
//                 <strong className="ml-3 text-gray-300">Hotel Room Facilities:</strong>
//                 <span className="ml-auto font-sans">{data.hotelRoomFacilities.join(', ')}</span>
//               </div>
//             )}
      
//             {data.freeWifi && (
//               <div className="mb-2 flex items-center">
//                 <IoWifi />
//                 <strong className="ml-3 text-gray-300">Free Wifi:</strong>
//                 <span className="ml-auto font-sans">{data.freeWifi}</span>
//               </div>
//             )}
      
//             {data.receptionDetails && (
//               <div className="mb-2 flex items-center">
//                 <BsPersonVideo3 />
//                 <strong className="ml-3 text-gray-300">Reception Details:</strong>
//                 <span className="ml-auto font-sans">{data.receptionDetails}</span>
//               </div>
//             )}
      
//             {data.gymOrFitness && (
//               <div className="mb-2 flex items-center">
//                 <IoFitness />
//                 <strong className="ml-3 text-gray-300">Gym or Fitness:</strong>
//                 <span className="ml-auto font-sans">{data.gymOrFitness}</span>
//               </div>
//             )}
      
//             {data.spaFacilities && data.spaFacilities.length > 0 && (
//               <div className="mb-2 flex items-center">
//                 <LiaSpaSolid />
//                 <strong className="ml-3 text-gray-300">Spa Facilities:</strong>
//                 <span className="ml-auto font-sans">{data.spaFacilities.join(', ')}</span>
//               </div>
//             )}
      
//             {data.dedicatedWorkstation && (
//               <div className="mb-2 flex items-center">
//                 <TfiWrite />
//                 <strong className="ml-3 text-gray-300">Dedicated Workstation:</strong>
//                 <span className="ml-auto font-sans">{data.dedicatedWorkstation}</span>
//               </div>
//             )}
      
//             {data.hotelRoomDescription && (
//               <div className="mb-2 flex items-center">
//                 <TfiWrite />
//                 <strong className="ml-3 text-gray-300">Hotel Room Description:</strong>
//                 <span className="ml-auto font-sans">{data.hotelRoomDescription}</span>
//               </div>
//             )}
      
//             {data.general && data.general.length > 0 && (
//               <div className="mb-2 flex items-center">
//                 <FaCheckSquare />
//                 <strong className="ml-3 text-gray-300">General:</strong>
//                 <span className="ml-auto font-sans">{data.general.join(', ')}</span>
//               </div>
//             )}
      
//             {data.additionalHotelFeatures && (
//               <div className="mb-2 flex items-center">
//                 <TfiWrite />
//                 <strong className="ml-3 text-gray-300">Additional Hotel Features:</strong>
//                 <span className="ml-auto font-sans">{data.additionalHotelFeatures}</span>
//               </div>
//             )}
      
//             {data.rules && (
//               <div className="mb-2 flex items-center">
//                 <FaCheckSquare />
//                 <strong className="ml-3 text-gray-300">Rules:</strong>
//                 <span className="ml-auto font-sans">
//                   Smoking: {data.rules.smokingAllowed ? 'Yes' : 'No'}, 
//                   Pets: {data.rules.petsAllowed ? 'Yes' : 'No'}, 
//                   Children: {data.rules.childrenAllowed ? 'Yes' : 'No'}, 
//                   Parties: {data.rules.partiesAllowed ? 'Yes' : 'No'}
//                   {data.rules.additionalRules && `, Additional: ${data.rules.additionalRules}`}
//                 </span>
//               </div>
//             )}
      
//             {(data.checkInFrom || data.checkInUntil) && (
//               <div className="mb-2 flex items-center">
//                 <IoFitness />
//                 <strong className="ml-3 text-gray-300">Check-In:</strong>
//                 <span className="ml-auto font-sans">
//                   {data.checkInFrom && `From ${data.checkInFrom}`} 
//                   {data.checkInUntil && ` until ${data.checkInUntil}`}
//                 </span>
//               </div>
//             )}
      
//             {(data.checkOutFrom || data.checkOutUntil) && (
//               <div className="mb-2 flex items-center">
//                 <IoFitness />
//                 <strong className="ml-3 text-gray-300">Check-Out:</strong>
//                 <span className="ml-auto font-sans">
//                   {data.checkOutFrom && `From ${data.checkOutFrom}`} 
//                   {data.checkOutUntil && ` until ${data.checkOutUntil}`}
//                 </span>
//               </div>
//             )}

//             {data.cancellationPolicy && (
//               <div className="mb-2 flex items-center">
//                 <IoFitness />
//                 <strong className="ml-3 text-gray-300">Cancellation policy:</strong>
//                 <span className="ml-auto font-sans">{data.cancellationPolicy}</span>
//               </div>
//             )}
//           </div>
//         </div>
//       ),
//     },
//     {
//       label: 'Host',
//       children: (
//         <div className="bg-black text-white p-6 rounded-lg max-w-sm mx-auto">
//           <h2 className="text-2xl font-semibold mb-4">Meet your Host</h2>
//           <div className="flex items-center space-x-4">
//             {data.profileImage && (
//               <img
//                 src={data.profileImage}
//                 alt="Profile"
//                 className="w-20 h-20 rounded-full"
//               />
//             )}
//             <div>
//               <h3 className="text-xl font-bold">{data.sellersName || 'Host'}</h3>
//               <p className="text-sm">{data.yourRole || 'Property Owner'}</p>
//             </div>
//           </div>
//           <div className="mt-4">
//             {data.contactDetails && (
//               <div className="flex space-x-2 items-center">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8h18M9 12h6m-7 8h8a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v13a2 2 0 002 2h1z" />
//                 </svg>
//                 <p className="text-sm">{data.contactDetails}</p>
//               </div>
//             )}
//             {data.hostLanguages && data.hostLanguages.length > 0 && (
//               <div className="flex space-x-2 items-center mt-2">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                 </svg>
//                 <p className="text-sm"><strong>Languages:</strong> {data.hostLanguages.join(', ')}</p>
//               </div>
//             )}
//           </div>
//         </div>
//       ),
//     }
//   ];

//   const [hookProps] = useState({
//     tabs: ITEMS,
//     initialTabId: 'Details',
//   });

//   const framer = useTabs(hookProps);

//   return (
//     <div className="bg-[#121212] text-white rounded-lg shadow-md max-w-4xl mx-auto">
//       {/* Image Gallery */}
//       {imageCategories.length > 0 && showImages && (
//         <div className='relative mb-4'>
//           <img
//             src={imageCategories[activeImageTab].images[currentImageIndex]}
//             alt={`Image ${currentImageIndex + 1}`}
//             className='h-[400px] w-full object-cover rounded-t-lg transition-opacity duration-500 ease-in-out'
//           />
//           <button
//             onClick={handlePreviousImage}
//             className='absolute left-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110'
//           >
//             <ChevronLeft size={24} />
//           </button>
//           <button
//             onClick={handleNextImage}
//             className='absolute right-4 top-1/2 transform -translate-y-1/2 bg-[#000f2f]/70 text-white rounded-full p-3 hover:bg-[#001f3f]/90 transition-transform hover:scale-110'
//           >
//             <ChevronRight size={24} />
//           </button>
//         </div>
//       )}

//       {/* Image Category Tabs */}
//       {imageCategories.length > 0 && (
//         <div className="flex justify-between items-center mb-4 px-4">
//           <div className="flex space-x-4">
//             {imageCategories.map((category, index) => (
//               <button
//                 key={index}
//                 onClick={() => {
//                   setActiveImageTab(index);
//                   setCurrentImageIndex(0);
//                 }}
//                 className={`px-4 py-2 rounded-[8px] text-sm transition-all duration-300 ${
//                   activeImageTab === index
//                     ? 'bg-gray-200 text-black underline font-bold decoration-2 decoration-blue-500'
//                     : 'bg-black text-white font-light hover:bg-gray-700'
//                 }`}
//               >
//                 <div className="flex justify-between items-center">
//                   <div>{category.title}</div>
//                   {activeImageTab === index && <CameraIcon className="ml-2" />}
//                 </div>
//               </button>
//             ))}
//           </div>

//           <button
//             onClick={() => setShowImages(!showImages)}
//             className="px-4 py-2 bg-blue-500 text-white rounded-[8px] flex items-center space-x-2"
//           >
//             {showImages ? (
//               <>
//                 <DoubleArrowUpIcon className="scale-150" />
//                 <span className="text-sm font-bold">Up</span>
//               </>
//             ) : (
//               <>
//                 <DoubleArrowDownIcon className="scale-150" />
//                 <span className="text-sm font-bold">Down</span>
//               </>
//             )}
//           </button>
//         </div>
//       )}

//       {/* Property Header */}
//       <div className='px-4 mb-4'>
//         <h1 className='text-white text-3xl font-semibold mb-2'>
//           {data.propertyName || 'Property'}
//         </h1>
//         <p className='text-gray-400 text-lg font-normal mb-2'>
//           {data.hotelRoomDescription || 'Property description'}
//         </p>
//         <div className="text-white space-y-1">
//           <p className="text-sm text-gray-300">
//             {data.numberOfGuests && `${data.numberOfGuests} guests`}
//             {data.hotelRoomForOccupants && ` · ${data.hotelRoomForOccupants} bedroom`}
//             {data.hotelRoomBedType && ` · ${data.hotelRoomBedType} bed`}
//             {data.numberOfBathrooms && ` · ${data.numberOfBathrooms} bathroom`}
//           </p>

//           <div className="flex items-center space-x-1 pb-1">
//             {data.uploadDate && (
//               <>
//                 <BsDatabaseAdd className="w-4 h-4" />
//                 <span className="text-sm font-semibold">{data.uploadDate}</span>
//               </>
//             )}
//             {data.user && (
//               <>
//                 <FaUser className="w-4 h-4 ml-4" />
//                 <span className="text-sm text-blue-400">{data.user}</span>
//               </>
//             )}
//           </div>
//         </div>
//         <MenubarSeparator className="w-full my-4" />
//       </div>

//       {/* Tabs */}
//       <div className='flex justify-center pb-2'>
//         <Framer.Tabs {...framer.tabProps} />
//       </div>

//       {/* Tab Content */}
//       <div className="h-[580px] overflow-y-auto">
//         {framer.selectedTab.children}
//       </div>
//     </div>
//   );
// };

// export default PropertyViewer;
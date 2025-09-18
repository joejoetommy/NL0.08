import React, { useState, useEffect } from 'react';
import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import { UTXOManager } from '../../components/wallet2/utils/blockchain';
import { BroadcastService } from '../../components/wallet2/services/BroadcastService';
import { createInscriptionScript } from '../../components/wallet2/inscriptions/utils/inscriptionCreator';
import { BCATViewer } from '../../components/wallet2/inscriptions/components/BCATViewer';
import { BlogEncryption, EncryptionLevel, getEncryptionLevelColor, getEncryptionLevelLabel } from '../../components/wallet2/inscriptions/utils/BlogEncryption';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Checkbox } from "../../components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";
import { UploadCloud } from "lucide-react";
import { TimePicker } from "antd";
import moment from 'moment';

// Define the props interface exactly as in the working file
interface CreateLargeProfileInscriptionProps {
  keyData: any;
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
  currentFeeRate: number;
  balance: { confirmed: number; unconfirmed: number };
  lastTransactionTime: number;
  setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
  setLastTxid: (txid: string) => void;
  setLastTransactionTime: (time: number) => void;
  blogKeyHistory?: any;
  getKeySegmentForLevel?: (level: number) => string | null;
}

interface ChunkUploadState {
  chunkIndex: number;
  chunkData: Uint8Array;
  txid: string | null;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  attempts: number;
  error?: string;
  lastAttemptTime?: number;
}

interface FormData {
 propertyName: string;
 receptionDetails: string;
 hotelRoomDescription: string;
 additionalHotelFeatures: string;
 cancellationPolicy: string;
 yourRole: string;
 sellersName: string;
 contactDetails: string;
}

// Alert Dialog Component with Encryption
const AlertDialogDemo: React.FC<{
 totalSizeMb: number;
 handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
 handleImageRemove: () => void;
 image: string | null;
 handleSubmit: (title: string, description: string, encryptionLevel: number) => void;
 blogKeyHistory: any;
}> = ({ totalSizeMb, handleImageChange, handleImageRemove, image, handleSubmit, blogKeyHistory }) => {
 const [title, setTitle] = useState<string>('');
 const [description, setDescription] = useState<string>('');
 const [encryptionLevel, setEncryptionLevel] = useState<EncryptionLevel>(0);
 const [showEncryptionOptions, setShowEncryptionOptions] = useState(false);

 const isFormValid = title.trim() !== '' && description.trim() !== '' && image !== null;

 return (
   <AlertDialog>
     <AlertDialogTrigger asChild>
       <Button type="button" className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700">
         Create BCAT Property
       </Button>
     </AlertDialogTrigger>
     <AlertDialogContent className="max-w-2xl">
       <AlertDialogHeader>
         <AlertDialogTitle>Property Token View</AlertDialogTitle>
         <AlertDialogDescription>
           <form className="grid gap-1 p-1">
             <div className="w-full flex justify-center">
               <div className="border border-blue-700 p-0 flex items-center justify-center w-80 h-80 relative overflow-hidden">
                 {!image && (
                   <Label htmlFor="alertImage" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                     <UploadCloud className="text-gray-400 mb-2" style={{ height: '1.5rem', width: '1.5rem' }} />
                     <p className="text-gray-600 text-xs">Upload property main image</p>
                   </Label>
                 )}
                 <input type="file" id="alertImage" name="alertImage" accept="image/*" onChange={handleImageChange} className="hidden" />
                 {image && (
                   <div style={{ position: 'relative', width: '20rem', height: '20rem', overflow: 'hidden' }}>
                     <img src={image} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     <Button type="button" onClick={handleImageRemove} style={{ position: 'absolute', top: '5px', right: '5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px' }}>
                       x
                     </Button>
                   </div>
                 )}
               </div>
             </div>

             <div className="grid gap-1 w-full justify-center">
               <Input placeholder='Property Title...' type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={36} required />
               <textarea placeholder='Property Description...' id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none rounded-md border px-3 py-1" maxLength={96} rows={4} required />
             </div>

             {/* Encryption Options */}
             {blogKeyHistory?.current && (
               <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                 <div className="flex items-center justify-between mb-2">
                   <label className="text-sm font-medium text-gray-300">
                     🔐 Encryption Options
                   </label>
                   <button
                     type="button"
                     onClick={() => setShowEncryptionOptions(!showEncryptionOptions)}
                     className="text-xs text-purple-400 hover:text-purple-300"
                   >
                     {showEncryptionOptions ? 'Hide' : 'Configure'}
                   </button>
                 </div>
                 
                 {showEncryptionOptions && (
                   <div className="space-y-2">
                     <p className="text-xs text-gray-400">
                       Encrypt property data with your blog key. Only holders with the appropriate access level can decrypt.
                     </p>
                     <div className="grid grid-cols-3 gap-2">
                       {[0, 1, 2, 3, 4, 5].map((level) => (
                         <button
                           key={level}
                           type="button"
                           onClick={() => setEncryptionLevel(level as EncryptionLevel)}
                           className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                             encryptionLevel === level
                               ? `bg-${getEncryptionLevelColor(level as EncryptionLevel)}-600 text-white`
                               : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                           }`}
                           style={encryptionLevel === level ? {
                             backgroundColor: {
                               0: '#6B7280',
                               1: '#F59E0B',
                               2: '#EAB308',
                               3: '#6366F1',
                               4: '#A855F7',
                               5: '#EF4444'
                             }[level]
                           } : {}}
                         >
                           {level === 0 ? '🔓 None' : `🔒 Level ${level}`}
                         </button>
                       ))}
                     </div>
                     {encryptionLevel > 0 && (
                       <div className="mt-2 p-2 bg-indigo-900 bg-opacity-30 rounded border border-indigo-700">
                         <p className="text-xs text-indigo-300">
                           <span className="font-medium">{getEncryptionLevelLabel(encryptionLevel)}</span>
                           <br />
                           Data will be encrypted before chunking. Only key holders with level {encryptionLevel} access or higher can decrypt.
                         </p>
                       </div>
                     )}
                   </div>
                 )}
                 
                 {!showEncryptionOptions && (
                   <p className="text-xs text-gray-400">
                     Current: {encryptionLevel === 0 ? '🔓 No encryption' : `🔒 Level ${encryptionLevel} - ${getEncryptionLevelLabel(encryptionLevel)}`}
                   </p>
                 )}
               </div>
             )}
           </form>
           <br />
           Total data size: {totalSizeMb} MB {encryptionLevel > 0 && '(will be encrypted)'}
         </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
         <AlertDialogCancel>Cancel</AlertDialogCancel>
         <AlertDialogAction onClick={() => handleSubmit(title, description, encryptionLevel)} disabled={!isFormValid}>
           {encryptionLevel > 0 ? `🔒 Create Encrypted BCAT ${totalSizeMb} MB` : `Create BCAT ${totalSizeMb} MB`}
         </AlertDialogAction>
       </AlertDialogFooter>
     </AlertDialogContent>
   </AlertDialog>
 );
};

// Counter Input Component
const CounterInput: React.FC<{ 
 id: string; 
 label: string; 
 value: number; 
 setValue: React.Dispatch<React.SetStateAction<number>> 
}> = ({ id, label, value, setValue }) => (
 <div className="flex items-center space-x-2">
   <Button type="button" onClick={() => setValue(prev => Math.max(0, prev - 1))} className="w-8 h-8">-</Button>
   <Input id={id} type="number" value={value} readOnly className="text-center w-16" />
   <Button type="button" onClick={() => setValue(prev => prev + 1)} className="w-8 h-8">+</Button>
   <Label htmlFor={id}>{label}</Label>
 </div>
);

// BCAT Protocol Constants
const BCAT_NAMESPACE = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up';
const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

// Main Component - matching the working file's pattern
export const CreateLargeProfileInscription1: React.FC<CreateLargeProfileInscriptionProps> = ({
 keyData,
 network,
 whatsOnChainApiKey,
 currentFeeRate,
 balance,
 lastTransactionTime,
 setStatus,
 setLastTxid,
 setLastTransactionTime,
 blogKeyHistory,
 getKeySegmentForLevel
}) => {
 const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
 const [loading, setLoading] = useState(false);
 
 // File upload state for standard mode
 const [largeProfileFile, setLargeProfileFile] = useState<File | null>(null);
 const [largeProfileThumbnail, setLargeProfileThumbnail] = useState<string>('');
 const [usePropertyForm, setUsePropertyForm] = useState(true); // Default to property form
 
 // Encryption state
 const [selectedEncryptionLevel, setSelectedEncryptionLevel] = useState<EncryptionLevel>(0);
 const [isEncrypting, setIsEncrypting] = useState(false);
 
 // Chunk management
 const [chunkSizeMB, setChunkSizeMB] = useState<number>(2.0);
 const [customChunkSize, setCustomChunkSize] = useState<string>('2.0');
 const [chunkStates, setChunkStates] = useState<ChunkUploadState[]>([]);
 const [processingMode, setProcessingMode] = useState<'sequential' | 'manual'>('sequential');
 const [isProcessing, setIsProcessing] = useState(false);
 const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
 const [isPaused, setIsPaused] = useState(false);
 const [shouldStop, setShouldStop] = useState(false);

 // Form data
 const [formData, setFormData] = useState<FormData>({
   propertyName: '',
   receptionDetails: '',
   hotelRoomDescription: '',
   additionalHotelFeatures: '',
   cancellationPolicy: '',
   yourRole: '',
   sellersName: '',
   contactDetails: '',
 });

 // Form inputs
 const [numberOfGuests, setNumberOfGuests] = useState(1);
 const [numberOfBathrooms, setNumberOfBathrooms] = useState(1);
 const [numberOfSingleBeds, setNumberOfSingleBeds] = useState(0);
 const [numberOfQueenBeds, setNumberOfQueenBeds] = useState(0);
 const [numberOfKingBeds, setNumberOfKingBeds] = useState(0);
 const [numberOfKidBeds, setNumberOfKidBeds] = useState(0);
 const [numberOfTufanBeds, setNumberOfTufanBeds] = useState(0);
 const [hotelRoomForOccupants, setHotelRoomForOccupants] = useState('');
 const [hotelRoomBedType, setHotelRoomBedType] = useState('');
 const [arrangementAndFacilities, setArrangementAndFacilities] = useState('');
 const [otherTypesOfHotelRooms, setOtherTypesOfHotelRooms] = useState('');
 const [hotelRoomFacilities, setHotelRoomFacilities] = useState<string[]>([]);
 const [gymOrFitness, setGymOrFitness] = useState('');
 const [dedicatedWorkstation, setDedicatedWorkstation] = useState('');
 const [spaFacilities, setSpaFacilities] = useState<string[]>([]);
 const [general, setGeneral] = useState<string[]>([]);
 const [checkInFrom, setCheckInFrom] = useState('');
 const [checkInUntil, setCheckInUntil] = useState('');
 const [checkOutFrom, setCheckOutFrom] = useState('');
 const [checkOutUntil, setCheckOutUntil] = useState('');
 const [freeWifi, setFreeWifi] = useState('Yes');
 const [rules, setRules] = useState({
   smokingallowed: 'No',
   petsallowed: 'No',
   childrenallowed: 'No',
   partieseventsallowed: 'No',
   additionalRules: ''
 });
 const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
 const [showMore, setShowMore] = useState(false);
 
 const languages = [
   "English", "French", "German", "Japanese",
   "Italian", "Russian", "Spanish", "Chinese (Simplified)",
   "Arabic", "Hindi", "Portuguese", "Turkish"
 ];
 
 // Images
 const [roomPhotos, setRoomPhotos] = useState<File[]>([]);
 const [hotelPhotos, setHotelPhotos] = useState<File[]>([]);
 const [facilitiesPhotos, setFacilitiesPhotos] = useState<File[]>([]);
 const [profileImage, setProfileImage] = useState<File | null>(null);
 const [alertDialogImage, setAlertDialogImage] = useState<File | null>(null);
 
 // Alert dialog data
 const [alertDialogTitle, setAlertDialogTitle] = useState<string>('');
 const [alertDialogDescription, setAlertDialogDescription] = useState<string>('');
 
 const [totalSizeMb, setTotalSizeMb] = useState<number>(0);
 const [showSheet, setShowSheet] = useState(false);

 // Calculate total size
 useEffect(() => {
   if (usePropertyForm) {
     const textFields = Object.values(formData).reduce((total, field) => total + new Blob([field]).size, 0);
     const imagesSize = [...roomPhotos, ...hotelPhotos, ...facilitiesPhotos].reduce((total, image) => total + image.size, 0);
     const profileImageSize = profileImage ? profileImage.size : 0;
     const alertDialogImageSize = alertDialogImage ? alertDialogImage.size : 0;
     const totalSizeBytes = textFields + imagesSize + profileImageSize + alertDialogImageSize;
     const totalSizeMb = totalSizeBytes / (1024 * 1024);
     setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
   } else if (largeProfileFile) {
     const totalSizeMb = largeProfileFile.size / (1024 * 1024);
     setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
   }
 }, [formData, roomPhotos, hotelPhotos, facilitiesPhotos, profileImage, alertDialogImage, largeProfileFile, usePropertyForm]);

 // Helper functions
 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
   const { id, value } = e.target;
   setFormData(prev => ({ ...prev, [id]: value }));
 };

 const handleRadioChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
   setter(value);
 };

 const handleMultiSelectChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
   setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
 };

 const handleFileUpload = (setter: React.Dispatch<React.SetStateAction<File[]>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
   if (e.target.files) {
     const newFiles = Array.from(e.target.files);
     setter(prev => [...prev, ...newFiles]);
   }
 };

 const handleImageRemove = (setter: React.Dispatch<React.SetStateAction<File[]>>, index: number) => {
   setter(prev => prev.filter((_, i) => i !== index));
 };

 const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
   const file = e.target.files?.[0];
   if (file) {
     setProfileImage(file);
   }
 };

 const handleProfileImageRemove = () => {
   setProfileImage(null);
 };

 const handleAlertDialogImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
   const file = e.target.files?.[0];
   if (file) {
     setAlertDialogImage(file);
   }
 };

 const handleAlertDialogImageRemove = () => {
   setAlertDialogImage(null);
 };

 const handleLanguageChange = (language: string) => {
   setSelectedLanguages(prev =>
     prev.includes(language)
       ? prev.filter(l => l !== language)
       : [...prev, language]
   );
 };

 // Handle chunk size change
 const handleChunkSizeChange = (value: string) => {
   setCustomChunkSize(value);
   const size = parseFloat(value);
   if (!isNaN(size) && size > 0 && size <= 10) {
     setChunkSizeMB(size);
     
     if (largeProfileFile && !usePropertyForm) {
       rechunkFile(largeProfileFile, size);
     }
   }
 };

 // Generate thumbnail
 const generateThumbnail = async (file: File): Promise<string> => {
   if (file.type.startsWith('image/')) {
     return new Promise((resolve) => {
       const reader = new FileReader();
       reader.onload = (e) => {
         const img = new Image();
         img.onload = () => {
           const canvas = document.createElement('canvas');
           const ctx = canvas.getContext('2d')!;
           
           const size = 200;
           canvas.width = size;
           canvas.height = size;
           
           const scale = Math.min(size / img.width, size / img.height);
           const w = img.width * scale;
           const h = img.height * scale;
           const x = (size - w) / 2;
           const y = (size - h) / 2;
           
           ctx.fillStyle = '#1a1a1a';
           ctx.fillRect(0, 0, size, size);
           ctx.drawImage(img, x, y, w, h);
           
           resolve(canvas.toDataURL('image/jpeg', 0.7));
         };
         img.src = e.target?.result as string;
       };
       reader.readAsDataURL(file);
     });
   } else {
     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d')!;
     canvas.width = 200;
     canvas.height = 200;
     
     ctx.fillStyle = '#1a1a1a';
     ctx.fillRect(0, 0, 200, 200);
     
     ctx.fillStyle = '#6b7280';
     ctx.font = '60px Arial';
     ctx.textAlign = 'center';
     
     let icon = '📄';
     if (file.type.startsWith('video/')) icon = '🎥';
     else if (file.type.startsWith('audio/')) icon = '🎵';
     else if (file.type.includes('zip') || file.type.includes('archive')) icon = '📦';
     else if (file.type.includes('pdf')) icon = '📕';
     
     ctx.fillText(icon, 100, 90);
     
     ctx.fillStyle = '#e5e7eb';
     ctx.font = '14px Arial';
     const displayName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
     ctx.fillText(displayName, 100, 130);
     ctx.font = '12px Arial';
     ctx.fillStyle = '#9ca3af';
     ctx.fillText(`${(file.size / (1024 * 1024)).toFixed(1)}MB`, 100, 150);
     
     return canvas.toDataURL('image/png');
   }
 };

 // Handle large file selection
 const handleLargeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
   const file = e.target.files?.[0];
   if (!file) return;

   setLargeProfileFile(file);
   
   setStatus({ type: 'info', message: 'Generating thumbnail...' });
   const thumbnail = await generateThumbnail(file);
   setLargeProfileThumbnail(thumbnail);
   
   const chunks = await chunkFile(file, chunkSizeMB);
   const initialChunkStates: ChunkUploadState[] = chunks.map((chunk, index) => ({
     chunkIndex: index,
     chunkData: new Uint8Array(chunk),
     txid: null,
     status: 'pending',
     attempts: 0
   }));
   
   setChunkStates(initialChunkStates);
   
   setStatus({ 
     type: 'info', 
     message: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Split into ${chunks.length} chunks of ${chunkSizeMB}MB each.` 
   });
 };

 // Chunk file function
 const chunkFile = (file: File, chunkSizeMB: number): Promise<ArrayBuffer[]> => {
   return new Promise((resolve) => {
     const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024);
     const chunks: ArrayBuffer[] = [];
     const reader = new FileReader();
     let offset = 0;

     const readNextChunk = () => {
       const slice = file.slice(offset, offset + chunkSizeBytes);
       reader.readAsArrayBuffer(slice);
     };

     reader.onload = (e) => {
       if (e.target?.result) {
         chunks.push(e.target.result as ArrayBuffer);
         offset += chunkSizeBytes;
         
         if (offset < file.size) {
           readNextChunk();
         } else {
           resolve(chunks);
         }
       }
     };

     readNextChunk();
   });
 };

 // Rechunk file with new size
 const rechunkFile = async (file: File, newChunkSize: number) => {
   setStatus({ type: 'info', message: 'Rechunking file with new chunk size...' });
   const chunks = await chunkFile(file, newChunkSize);
   const newChunkStates: ChunkUploadState[] = chunks.map((chunk, index) => ({
     chunkIndex: index,
     chunkData: new Uint8Array(chunk),
     txid: null,
     status: 'pending',
     attempts: 0
   }));
   
   setChunkStates(newChunkStates);
   
   setStatus({ 
     type: 'info', 
     message: `File rechunked: ${chunks.length} chunks of ${newChunkSize}MB each.` 
   });
 };

 // Compile property data
 const compilePropertyData = () => {
   return {
     title: alertDialogTitle,
     description: alertDialogDescription,
     mainImage: alertDialogImage ? alertDialogImage.name : null,
     propertyName: formData.propertyName,
     numberOfGuests,
     numberOfBathrooms,
     numberOfSingleBeds,
     numberOfQueenBeds,
     numberOfKingBeds,
     numberOfKidBeds,
     numberOfTufanBeds,
     hotelRoomForOccupants,
     hotelRoomBedType,
     arrangementAndFacilities,
     otherTypesOfHotelRooms,
     hotelRoomFacilities,
     gymOrFitness,
     dedicatedWorkstation,
     spaFacilities,
     general,
     freeWifi,
     rules,
     checkInFrom,
     checkInUntil,
     checkOutFrom,
     checkOutUntil,
     selectedLanguages,
     receptionDetails: formData.receptionDetails,
     hotelRoomDescription: formData.hotelRoomDescription,
     additionalHotelFeatures: formData.additionalHotelFeatures,
     cancellationPolicy: formData.cancellationPolicy,
     yourRole: formData.yourRole,
     sellersName: formData.sellersName,
     contactDetails: formData.contactDetails,
     roomPhotosCount: roomPhotos.length,
     hotelPhotosCount: hotelPhotos.length,
     facilitiesPhotosCount: facilitiesPhotos.length,
     hasProfileImage: profileImage !== null,
     createdAt: new Date().toISOString(),
     totalSizeMB: totalSizeMb
   };
 };

 // Prepare files for BCAT chunking
 const prepareFilesForBCAT = async (): Promise<Uint8Array> => {
   const propertyData = compilePropertyData();
   const jsonData = JSON.stringify(propertyData);
   
   const parts: Uint8Array[] = [];
   
   const jsonBytes = new TextEncoder().encode(jsonData);
   const jsonSizeBytes = new Uint8Array(4);
   new DataView(jsonSizeBytes.buffer).setUint32(0, jsonBytes.length, true);
   parts.push(jsonSizeBytes);
   parts.push(jsonBytes);
   
   const addImage = async (file: File | null, label: string) => {
     if (file) {
       const arrayBuffer = await file.arrayBuffer();
       const bytes = new Uint8Array(arrayBuffer);
       
       const labelBytes = new TextEncoder().encode(label);
       const labelSizeBytes = new Uint8Array(4);
       new DataView(labelSizeBytes.buffer).setUint32(0, labelBytes.length, true);
       parts.push(labelSizeBytes);
       parts.push(labelBytes);
       
       const sizeBytes = new Uint8Array(4);
       new DataView(sizeBytes.buffer).setUint32(0, bytes.length, true);
       parts.push(sizeBytes);
       parts.push(bytes);
     }
   };
   
   await addImage(alertDialogImage, 'mainImage');
   await addImage(profileImage, 'profileImage');
   
   for (let i = 0; i < roomPhotos.length; i++) {
     await addImage(roomPhotos[i], `roomPhoto_${i}`);
   }
   
   for (let i = 0; i < hotelPhotos.length; i++) {
     await addImage(hotelPhotos[i], `hotelPhoto_${i}`);
   }
   
   for (let i = 0; i < facilitiesPhotos.length; i++) {
     await addImage(facilitiesPhotos[i], `facilitiesPhoto_${i}`);
   }
   
   const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
   const combined = new Uint8Array(totalLength);
   let offset = 0;
   
   for (const part of parts) {
     combined.set(part, offset);
     offset += part.length;
   }
   
   return combined;
 };

 // Chunk data function
 const chunkData = (data: Uint8Array, chunkSizeMB: number): Uint8Array[] => {
   const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024);
   const chunks: Uint8Array[] = [];
   
   for (let offset = 0; offset < data.length; offset += chunkSizeBytes) {
     const chunk = data.slice(offset, Math.min(offset + chunkSizeBytes, data.length));
     chunks.push(chunk);
   }
   
   return chunks;
 };

 // Process form submission from alert dialog with encryption
 const handleFinalSubmit = async (title: string, description: string, encryptionLevel: number) => {
   setAlertDialogTitle(title);
   setAlertDialogDescription(description);
   setSelectedEncryptionLevel(encryptionLevel as EncryptionLevel);
   
   setStatus({ type: 'info', message: encryptionLevel > 0 ? 'Encrypting and preparing property data for BCAT...' : 'Preparing property data for BCAT...' });
   
   try {
     setIsEncrypting(encryptionLevel > 0);
     
     // Prepare the property data
     let allData = await prepareFilesForBCAT();
     
     // Encrypt if encryption level is selected
     if (encryptionLevel > 0 && blogKeyHistory?.current && getKeySegmentForLevel) {
       const keySegment = getKeySegmentForLevel(encryptionLevel);
       if (!keySegment) {
         throw new Error(`No key segment available for encryption level ${encryptionLevel}`);
       }
       
       setStatus({ type: 'info', message: `Encrypting with level ${encryptionLevel} (${getEncryptionLevelLabel(encryptionLevel)})...` });
       
       // Encrypt the entire data before chunking
       const { encryptedData, metadata } = await BlogEncryption.prepareEncryptedInscription(
         allData,
         encryptionLevel,
         keySegment
       );
       
       // Create encrypted wrapper
       const wrapper = {
         encrypted: true,
         encryptionLevel: encryptionLevel,
         originalType: 'property',
         data: encryptedData,
         metadata: metadata,
         propertyTitle: title,
         propertyDescription: description
       };
       
       // Convert wrapper to bytes for chunking
       const encryptedJson = JSON.stringify(wrapper);
       allData = new TextEncoder().encode(encryptedJson);
       
       setStatus({ type: 'info', message: `Data encrypted successfully. Size: ${(allData.length / (1024 * 1024)).toFixed(2)}MB` });
     }
     
     setIsEncrypting(false);
     
     // Chunk the data (encrypted or not)
     const chunks = chunkData(allData, chunkSizeMB);
     const newChunkStates: ChunkUploadState[] = chunks.map((chunk, index) => ({
       chunkIndex: index,
       chunkData: chunk,
       txid: null,
       status: 'pending',
       attempts: 0
     }));
     
     setChunkStates(newChunkStates);
     setShowSheet(false);
     
     const statusMessage = encryptionLevel > 0 
       ? `🔒 Encrypted property data prepared: ${(allData.length / (1024 * 1024)).toFixed(2)}MB split into ${chunks.length} chunks of ${chunkSizeMB}MB each.`
       : `Property data prepared: ${(allData.length / (1024 * 1024)).toFixed(2)}MB split into ${chunks.length} chunks of ${chunkSizeMB}MB each.`;
     
     setStatus({ 
       type: 'info', 
       message: statusMessage
     });
   } catch (error) {
     console.error('Error preparing BCAT data:', error);
     setIsEncrypting(false);
     setStatus({ 
       type: 'error', 
       message: error instanceof Error ? error.message : 'Failed to prepare data' 
     });
   }
 };

 // Upload a single chunk
 const uploadSingleChunk = async (chunkIndex: number, forceNewUTXOs: boolean = false): Promise<{ success: boolean; txid?: string; error?: string }> => {
   const chunkState = chunkStates[chunkIndex];
   if (!chunkState) {
     return { success: false, error: 'Chunk not found' };
   }

   if (chunkState.status === 'success' && chunkState.txid) {
     console.log(`Chunk ${chunkIndex + 1} already completed with txid: ${chunkState.txid}`);
     return { success: true, txid: chunkState.txid };
   }

   const broadcastService = new BroadcastService(network, (message: string) => {
     setStatus({ 
       type: 'info', 
       message: `Chunk ${chunkIndex + 1}: ${message}` 
     });
   }, 10000);
   
   const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
   const address = privateKey.toPublicKey().toAddress();
   
   try {
     setChunkStates(prevStates => {
       const newStates = [...prevStates];
       newStates[chunkIndex] = { 
         ...newStates[chunkIndex], 
         status: 'uploading',
         attempts: newStates[chunkIndex].attempts + 1,
         lastAttemptTime: Date.now()
       };
       return newStates;
     });

     const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
     
     if (forceNewUTXOs) {
       console.log(`Waiting 5 seconds before fetching new UTXOs for chunk ${chunkIndex + 1}...`);
       await new Promise(resolve => setTimeout(resolve, 5000));
     }
     
     const utxos = await utxoManager.fetchUTXOs(true);
     
     if (utxos.length === 0) {
       throw new Error('No UTXOs available');
     }
     
     const chunkData = chunkState.chunkData;
     const estimatedFee = Math.ceil((300 + chunkData.length) / 1000) * currentFeeRate;
     const { selected, total } = utxoManager.selectUTXOs(estimatedFee);
     
     if (selected.length === 0) {
       throw new Error(`Insufficient funds. Need ${estimatedFee} sats`);
     }
     
     const tx = new Transaction();
     
     let totalInput = 0;
     for (const utxo of selected) {
       const txid = utxo.tx_hash || utxo.txid;
       const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
       const satoshis = utxo.value || utxo.satoshis || 0;
       
       totalInput += satoshis;
       
       const sourceTransaction = {
         id: txid,
         version: 1,
         inputs: [],
         outputs: [],
         lockTime: 0
       };
       
       for (let i = 0; i <= vout; i++) {
         sourceTransaction.outputs[i] = {
           satoshis: i === vout ? satoshis : 0,
           lockingScript: new P2PKH().lock(address)
         };
       }
       
       tx.addInput({
         sourceTXID: txid,
         sourceOutputIndex: vout,
         unlockingScriptTemplate: new P2PKH().unlock(privateKey),
         sourceTransaction: sourceTransaction
       });
     }
     
     // Create OP_RETURN script with BCAT part namespace and data
     let scriptHex = '6a';
     
     const namespaceBytes = Utils.toArray(BCAT_PART_NAMESPACE, 'utf8');
     if (namespaceBytes.length <= 75) {
       scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
     } else {
       scriptHex += '4c';
       scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
     }
     scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
     const dataLength = chunkData.length;
     if (dataLength <= 75) {
       scriptHex += dataLength.toString(16).padStart(2, '0');
     } else if (dataLength <= 255) {
       scriptHex += '4c';
       scriptHex += dataLength.toString(16).padStart(2, '0');
     } else if (dataLength <= 65535) {
       scriptHex += '4d';
       scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
       scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
     } else {
       scriptHex += '4e';
       scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
       scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
       scriptHex += ((dataLength >> 16) & 0xff).toString(16).padStart(2, '0');
       scriptHex += ((dataLength >> 24) & 0xff).toString(16).padStart(2, '0');
     }
     
     const BATCH_SIZE = 10000;
     for (let j = 0; j < chunkData.length; j += BATCH_SIZE) {
       const batch = chunkData.slice(j, Math.min(j + BATCH_SIZE, chunkData.length));
       scriptHex += Array.from(batch).map(b => b.toString(16).padStart(2, '0')).join('');
     }
     
     const script = Script.fromHex(scriptHex);
     
     tx.addOutput({
       lockingScript: script,
       satoshis: 0
     });
     
     const change = totalInput - estimatedFee;
     if (change > 0) {
       tx.addOutput({
         lockingScript: new P2PKH().lock(address),
         satoshis: change
       });
     }
     
     await tx.sign();
     const txHex = tx.toHex();
     const result = await broadcastService.broadcast(txHex);
     
     if (result.success && result.txid) {
       utxoManager.markAsSpent(selected);
       
       setChunkStates(prevStates => {
         const newStates = [...prevStates];
         newStates[chunkIndex] = { 
           ...newStates[chunkIndex], 
           status: 'success', 
           txid: result.txid,
           error: undefined
         };
         return newStates;
       });
       
       console.log(`✅ Chunk ${chunkIndex + 1} successfully uploaded: ${result.txid}`);
       return { success: true, txid: result.txid };
     } else {
       throw new Error(result.error || 'Broadcast failed');
     }
     
   } catch (error) {
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     const isMempoolConflict = errorMessage.includes('txn-mempool-conflict');
     
     setChunkStates(prevStates => {
       const newStates = [...prevStates];
       newStates[chunkIndex] = { 
         ...newStates[chunkIndex], 
         status: 'failed', 
         error: errorMessage
       };
       return newStates;
     });
     
     console.error(`❌ Chunk ${chunkIndex + 1} failed: ${errorMessage}`);
     
     if (isMempoolConflict && !forceNewUTXOs && chunkState.attempts < 3) {
       console.log(`Mempool conflict detected for chunk ${chunkIndex + 1}, retrying with fresh UTXOs...`);
       await new Promise(resolve => setTimeout(resolve, 5000));
       return uploadSingleChunk(chunkIndex, true);
     }
     
     return { 
       success: false, 
       error: errorMessage
     };
   }
 };

 // Upload a specific chunk (manual mode)
 const uploadChunk = async (chunkIndex: number) => {
   const currentChunkState = chunkStates[chunkIndex];
   
   if (!currentChunkState) {
     setStatus({ type: 'error', message: `Chunk ${chunkIndex + 1} not found` });
     return;
   }
   
   if (currentChunkState.status === 'uploading') {
     setStatus({ type: 'error', message: `Chunk ${chunkIndex + 1} is already uploading` });
     return;
   }
   
   if (currentChunkState.status === 'success' && currentChunkState.txid) {
     setStatus({ type: 'info', message: `Chunk ${chunkIndex + 1} already completed: ${currentChunkState.txid}` });
     return;
   }

   setCurrentProcessingIndex(chunkIndex);
   
   setStatus({ 
     type: 'info', 
     message: `Starting upload for chunk ${chunkIndex + 1} of ${chunkStates.length}...` 
   });
   
   const result = await uploadSingleChunk(chunkIndex, false);
   
   if (result.success && result.txid) {
     setStatus({ 
       type: 'success', 
       message: `Chunk ${chunkIndex + 1} uploaded successfully! TXID: ${result.txid.substring(0, 8)}...` 
     });
     
     setChunkStates(prevStates => {
       checkAllChunksComplete(prevStates);
       return prevStates;
     });
   } else {
     setStatus({ 
       type: 'error', 
       message: `Chunk ${chunkIndex + 1} failed: ${result.error}` 
     });
   }
   
   setCurrentProcessingIndex(null);
 };

 // Process chunks sequentially
 const processChunksSequentially = async () => {
   setIsProcessing(true);
   setShouldStop(false);
   setIsPaused(false);
   
   for (let i = 0; i < chunkStates.length; i++) {
     if (shouldStop) {
       console.log('Sequential processing stopped by user');
       break;
     }
     
     while (isPaused && !shouldStop) {
       await new Promise(resolve => setTimeout(resolve, 100));
     }
     
     if (shouldStop) {
       console.log('Sequential processing stopped by user after pause');
       break;
     }
     
     const currentState = chunkStates[i];
     
     if (currentState.status === 'success' && currentState.txid) {
       console.log(`Skipping chunk ${i + 1} - already completed: ${currentState.txid}`);
       continue;
     }
     
     setCurrentProcessingIndex(i);
     
     const result = await uploadSingleChunk(i, false);
     
     if (!result.success) {
       console.error(`Failed to upload chunk ${i + 1}: ${result.error}`);
       
       const shouldAutoRetry = result.error?.includes('timeout') || 
                              result.error?.includes('txn-mempool-conflict');
       
       if (shouldAutoRetry && currentState.attempts < 3) {
         console.log(`Auto-retrying chunk ${i + 1} after failure...`);
         await new Promise(resolve => setTimeout(resolve, 5000));
         const retryResult = await uploadSingleChunk(i, true);
         if (!retryResult.success) {
           continue;
         }
       }
     }
     
     if (i < chunkStates.length - 1) {
       await new Promise(resolve => setTimeout(resolve, 3000));
     }
   }
   
   setIsProcessing(false);
   setCurrentProcessingIndex(null);
   setShouldStop(false);
   setIsPaused(false);
   
   const finalStates = chunkStates;
   checkAllChunksComplete(finalStates);
 };

 // Control functions
 const stopProcessing = () => {
   setShouldStop(true);
   setIsPaused(false);
   setStatus({ type: 'info', message: 'Stopping chunk upload process...' });
 };

 const pauseProcessing = () => {
   setIsPaused(true);
   setStatus({ type: 'info', message: 'Paused chunk upload process' });
 };

 const resumeProcessing = () => {
   setIsPaused(false);
   setStatus({ type: 'info', message: 'Resumed chunk upload process' });
 };

 const checkAllChunksComplete = (states: ChunkUploadState[]) => {
   const allSuccess = states.every(state => state.status === 'success' && state.txid);
   if (allSuccess) {
     setStatus({ 
       type: 'success', 
       message: '✅ All chunks uploaded successfully! You can now create the BCAT reference transaction.' 
     });
   }
 };

 const getAllChunksComplete = () => {
   return chunkStates.length > 0 && 
          chunkStates.every(state => state.status === 'success' && state.txid);
 };

 // Create final BCAT transaction
 const createLargeProfileOrdinal = async () => {
   if (usePropertyForm) {
     if (!alertDialogTitle || !alertDialogDescription || !keyData.privateKey) {
       setStatus({ type: 'error', message: 'Missing required data' });
       return;
     }
   } else {
     if (!largeProfileFile || !largeProfileThumbnail || !keyData.privateKey) {
       setStatus({ type: 'error', message: 'Missing required data' });
       return;
     }
   }

   const successfulChunks = chunkStates.filter(state => state.status === 'success' && state.txid);
   if (successfulChunks.length !== chunkStates.length) {
     setStatus({ 
       type: 'error', 
       message: `Not all chunks uploaded. ${successfulChunks.length} of ${chunkStates.length} chunks complete.` 
     });
     return;
   }

   const timeSinceLastTx = Date.now() - lastTransactionTime;
   if (timeSinceLastTx < 5000) {
     setStatus({ 
       type: 'error', 
       message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another inscription`
     });
     return;
   }
   
   setLoading(true);
   
   try {
     const chunkTxIds = chunkStates
       .sort((a, b) => a.chunkIndex - b.chunkIndex)
       .map(state => state.txid!);
     
     setStatus({ type: 'info', message: 'Waiting for chunks to propagate...' });
     await new Promise(resolve => setTimeout(resolve, 5000));
     
     setStatus({ type: 'info', message: 'Creating BCAT reference transaction...' });
     
     let thumbnailBytes = new Uint8Array();
     let metadataObject: any = {};
     let filename = '';
     
     if (usePropertyForm) {
       if (alertDialogImage) {
         const reader = new FileReader();
         const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
           reader.onload = () => resolve(reader.result as ArrayBuffer);
           reader.onerror = reject;
           reader.readAsArrayBuffer(alertDialogImage);
         });
         thumbnailBytes = new Uint8Array(arrayBuffer);
       }
       
       metadataObject = {
         title: alertDialogTitle,
         description: alertDialogDescription,
         propertyName: formData.propertyName,
         type: 'property',
         encrypted: selectedEncryptionLevel > 0,
         encryptionLevel: selectedEncryptionLevel,
         chunks: chunkTxIds.length,
         created: new Date().toISOString()
       };
       
       filename = `${alertDialogTitle.substring(0, 30)}_property.bcat`;
     } else {
       const thumbnailData = largeProfileThumbnail.split(',')[1];
       thumbnailBytes = Utils.toArray(thumbnailData, 'base64');
       
       metadataObject = {
         filename: largeProfileFile!.name,
         size: largeProfileFile!.size,
         type: largeProfileFile!.type,
         chunks: chunkTxIds.length
       };
       
       filename = largeProfileFile!.name.substring(0, 50);
     }
     
     const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
     const utxos = await utxoManager.fetchUTXOs(true);
     
     const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
     const pubKeyHash = privateKey.toPublicKey().toHash();
     const address = privateKey.toPublicKey().toAddress();
     
     const metadataBytes = new TextEncoder().encode(JSON.stringify(metadataObject));
     
     const inscriptionScript = createInscriptionScript(
       pubKeyHash,
       usePropertyForm ? 'application/json' : 'image/jpeg',
       usePropertyForm ? metadataBytes : thumbnailBytes
     );
     
     const opReturnSize = 1 + 1 + 35 + 1 + 10 + 1 + 24 + 1 + 1 + 50 + 1 + (chunkTxIds.length * 33);
     const estimatedTxSize = 300 + (usePropertyForm ? metadataBytes.length : thumbnailBytes.length) + opReturnSize;
     const estimatedFee = Math.ceil((estimatedTxSize / 1000) * currentFeeRate) + 100;
     
     const { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee + 546);
     
     if (selected.length === 0) {
       throw new Error(`Insufficient funds. Need ${1 + estimatedFee + 546} sats, have ${total} sats`);
     }
     
     const tx = new Transaction();
     
     let totalInput = 0;
     for (const utxo of selected) {
       const txid = utxo.tx_hash || utxo.txid;
       const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
       const satoshis = utxo.value || utxo.satoshis || 0;
       
       totalInput += satoshis;
       
       const sourceTransaction = {
         id: txid,
         version: 1,
         inputs: [],
         outputs: [],
         lockTime: 0
       };
       
       for (let i = 0; i <= vout; i++) {
         sourceTransaction.outputs[i] = sourceTransaction.outputs[i] || {
           satoshis: i === vout ? satoshis : 0,
           lockingScript: new P2PKH().lock(address)
         };
       }
       
       tx.addInput({
         sourceTXID: txid,
         sourceOutputIndex: vout,
         unlockingScriptTemplate: new P2PKH().unlock(privateKey),
         sourceTransaction: sourceTransaction
       });
     }
     
     tx.addOutput({
       lockingScript: inscriptionScript,
       satoshis: 1
     });
     
     // BCAT reference in OP_RETURN
     let scriptHex = '6a';
     
     const namespaceBytes = Utils.toArray(BCAT_NAMESPACE, 'utf8');
     scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
     scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
     const info = 'BCAT';
     const infoBytes = Utils.toArray(info, 'utf8');
     scriptHex += infoBytes.length.toString(16).padStart(2, '0');
     scriptHex += infoBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
     const mimeType = usePropertyForm ? 'application/json' : (largeProfileFile?.type || 'application/octet-stream');
     const mimeBytes = Utils.toArray(mimeType.substring(0, 128), 'utf8');
     scriptHex += mimeBytes.length.toString(16).padStart(2, '0');
     scriptHex += mimeBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
     scriptHex += '00';
     
     const filenameBytes = Utils.toArray(filename, 'utf8');
     scriptHex += filenameBytes.length.toString(16).padStart(2, '0');
     scriptHex += filenameBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
     scriptHex += '00';
     
     for (const txid of chunkTxIds) {
       scriptHex += '20';
       for (let i = txid.length - 2; i >= 0; i -= 2) {
         scriptHex += txid.substr(i, 2);
       }
     }
     
     const bcatScript = Script.fromHex(scriptHex);
     
     tx.addOutput({
       lockingScript: bcatScript,
       satoshis: 0
     });
     
     const change = totalInput - 1 - estimatedFee;
     
     if (change > 546) {
       tx.addOutput({
         lockingScript: new P2PKH().lock(address),
         satoshis: change
       });
     }
     
     await tx.sign();
     const txHex = tx.toHex();
     
     const broadcastService = new BroadcastService(network, (message: string) => {
       setStatus({ 
         type: 'info', 
         message: `BCAT Reference TX: ${message}` 
       });
     });
     const result = await broadcastService.broadcast(txHex);
     
     if (result.success) {
       setLastTxid(result.txid!);
       setLastTransactionTime(Date.now());
       setLastBCATTxid(result.txid!); // Store the BCAT transaction ID
       
       const successMessage = usePropertyForm 
         ? `Property BCAT created successfully!\nMain TX: ${result.txid}\nProperty: "${alertDialogTitle}"\nChunks: ${chunkTxIds.length}`
         : `BCAT file created successfully!\nMain TX: ${result.txid}\nFile: "${filename}"\nChunks: ${chunkTxIds.length}`;
       
       setStatus({ 
         type: 'success', 
         message: successMessage 
       });
       
       // Clear the success message after 30 seconds
       setTimeout(() => {
         setLastBCATTxid('');
       }, 30000);
       
       // Clear form
       if (usePropertyForm) {
         setFormData({
           propertyName: '',
           receptionDetails: '',
           hotelRoomDescription: '',
           additionalHotelFeatures: '',
           cancellationPolicy: '',
           yourRole: '',
           sellersName: '',
           contactDetails: '',
         });
         setRoomPhotos([]);
         setHotelPhotos([]);
         setFacilitiesPhotos([]);
         setProfileImage(null);
         setAlertDialogImage(null);
         setAlertDialogTitle('');
         setAlertDialogDescription('');
       } else {
         setLargeProfileFile(null);
         setLargeProfileThumbnail('');
       }
       setChunkStates([]);
     } else {
       throw new Error(result.error || 'Failed to broadcast BCAT transaction');
     }
     
   } catch (error) {
     console.error('Error creating BCAT inscription:', error);
     setStatus({ 
       type: 'error', 
       message: error instanceof Error ? error.message : 'Failed to create BCAT inscription' 
     });
   } finally {
     setLoading(false);
   }
 };

 const allChunksComplete = getAllChunksComplete();

 const [lastBCATTxid, setLastBCATTxid] = useState<string>('');

 // Main render - with all features from the original file
 return (
   <div className="space-y-4">
     {/* Show success message with transaction link if BCAT was created */}
     {lastBCATTxid && (
       <div className="p-4 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg">
         <p className="text-green-300 mb-2">✅ BCAT Property Created Successfully!</p>
         <a 
           href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${lastBCATTxid}`}
           target="_blank"
           rel="noopener noreferrer"
           className="text-green-400 hover:text-green-300 underline"
         >
           View Transaction on WhatsOnChain →
         </a>
       </div>
     )}

     {/* Display only Create Property mode */}
     {!chunkStates.length && (
       <Sheet open={showSheet} onOpenChange={setShowSheet}>
         <SheetTrigger asChild>
           <Button variant="outline" className="w-full">
             🏠 Create Property Listing
           </Button>
         </SheetTrigger>
         <SheetContent className="h-screen max-h-screen overflow-y-auto w-[500px]">
           <SheetHeader>
             <SheetTitle>Property Details</SheetTitle>
             <SheetDescription>
               Fill in property details and click Create BCAT Property when done.
             </SheetDescription>
           </SheetHeader>

           <form onSubmit={(e) => e.preventDefault()} className="grid gap-4 py-4">
             {/* Property Name */}
             <div className="grid gap-2">
               <Label htmlFor="propertyName">Property Name</Label>
               <Input id="propertyName" placeholder="Property name*" value={formData.propertyName} onChange={handleChange} required />
             </div>

             {/* All counters */}
             <CounterInput id="numberOfGuests" label="How many guests" value={numberOfGuests} setValue={setNumberOfGuests} />
             <CounterInput id="numberOfBathrooms" label="Bathrooms" value={numberOfBathrooms} setValue={setNumberOfBathrooms} />
             <CounterInput id="numberOfSingleBeds" label="Single beds" value={numberOfSingleBeds} setValue={setNumberOfSingleBeds} />
             <CounterInput id="numberOfQueenBeds" label="Queen beds" value={numberOfQueenBeds} setValue={setNumberOfQueenBeds} />
             <CounterInput id="numberOfKingBeds" label="King beds" value={numberOfKingBeds} setValue={setNumberOfKingBeds} />
             <CounterInput id="numberOfKidBeds" label="Kid beds" value={numberOfKidBeds} setValue={setNumberOfKidBeds} />
             <CounterInput id="numberOfTufanBeds" label="Tufan beds" value={numberOfTufanBeds} setValue={setNumberOfTufanBeds} />

             {/* Hotel Room for Occupants */}
             <div className="grid gap-2">
               <Label>Hotel room for occupants</Label>
               <RadioGroup value={hotelRoomForOccupants} onValueChange={setHotelRoomForOccupants}>
                 {['Single Room', 'Twin Room', 'Double Room', 'Triple Room', 'Quadruple Room'].map(option => (
                   <div key={option} className="flex items-center space-x-2">
                     <RadioGroupItem value={option} id={option} />
                     <Label htmlFor={option}>{option}</Label>
                   </div>
                 ))}
               </RadioGroup>
             </div>

             {/* Hotel Room Bed Type */}
             <div className="grid gap-2">
               <Label>Hotel room bed type</Label>
               <RadioGroup value={hotelRoomBedType} onValueChange={setHotelRoomBedType}>
                 {['Single', 'Queen Room', 'King Room', 'Hollywood Twin Room'].map(option => (
                   <div key={option} className="flex items-center space-x-2">
                     <RadioGroupItem value={option} id={`bed-${option}`} />
                     <Label htmlFor={`bed-${option}`}>{option}</Label>
                   </div>
                 ))}
               </RadioGroup>
             </div>

             {/* Arrangement and Facilities */}
             <div className="grid gap-2">
               <Label>Arrangement and Facilities</Label>
               <RadioGroup value={arrangementAndFacilities} onValueChange={setArrangementAndFacilities}>
                 {['Studio Room', 'Duplex Room', 'Deluxe Room', 'Adjoining Room', 'Apartment-Style Room'].map(option => (
                   <div key={option} className="flex items-center space-x-2">
                     <RadioGroupItem value={option} id={`arr-${option}`} />
                     <Label htmlFor={`arr-${option}`}>{option}</Label>
                   </div>
                 ))}
               </RadioGroup>
             </div>

             {/* Other Types of Hotel Rooms */}
             <div className="grid gap-2">
               <Label>Other types of hotel Rooms</Label>
               <RadioGroup value={otherTypesOfHotelRooms} onValueChange={setOtherTypesOfHotelRooms}>
                 {['Suite', 'Junior Suite', 'Presidential Suite', 'Penthouse Suite', 'Cabana', 'Villa'].map(option => (
                   <div key={option} className="flex items-center space-x-2">
                     <RadioGroupItem value={option} id={`other-${option}`} />
                     <Label htmlFor={`other-${option}`}>{option}</Label>
                   </div>
                 ))}
               </RadioGroup>
             </div>

             {/* Hotel Room Facilities */}
             <div className="grid gap-2">
               <Label>Hotel Room Facilities</Label>
               {['Shampoo', 'Conditioner', 'Lotion', 'Coffee maker', 'Mini Bar', 'Free WiFi'].map(option => (
                 <div key={option} className="flex items-center space-x-2">
                   <Checkbox
                     checked={hotelRoomFacilities.includes(option)}
                     onCheckedChange={() => handleMultiSelectChange(setHotelRoomFacilities, option)}
                   />
                   <Label>{option}</Label>
                 </div>
               ))}
             </div>

             {/* Reception Details */}
             <div className="grid gap-2">
               <Label htmlFor="receptionDetails">Reception Details</Label>
               <textarea
                 id="receptionDetails"
                 placeholder="Reception details"
                 value={formData.receptionDetails}
                 onChange={handleChange}
                 className="resize-none w-full rounded-md border px-3 py-1"
                 rows={3}
                 required
               />
             </div>

             {/* Gym or Fitness */}
             <div className="grid gap-2">
               <Label>Gym or Fitness</Label>
               <RadioGroup value={gymOrFitness} onValueChange={setGymOrFitness}>
                 {['Yes', 'No'].map(option => (
                   <div key={option} className="flex items-center space-x-2">
                     <RadioGroupItem value={option} id={`gym-${option}`} />
                     <Label htmlFor={`gym-${option}`}>{option}</Label>
                   </div>
                 ))}
               </RadioGroup>
             </div>

             {/* Dedicated Workstation */}
             <div className="grid gap-2">
               <Label>Dedicated Workstation</Label>
               <RadioGroup value={dedicatedWorkstation} onValueChange={setDedicatedWorkstation}>
                 {['Yes', 'No'].map(option => (
                   <div key={option} className="flex items-center space-x-2">
                     <RadioGroupItem value={option} id={`workstation-${option}`} />
                     <Label htmlFor={`workstation-${option}`}>{option}</Label>
                   </div>
                 ))}
               </RadioGroup>
             </div>

             {/* Spa Facilities */}
             <div className="grid gap-2">
               <Label>Spa Facilities</Label>
               {['Sauna', 'Steam', 'Massage', 'Yoga', 'Hot-tub', 'Pool'].map(option => (
                 <div key={option} className="flex items-center space-x-2">
                   <Checkbox
                     checked={spaFacilities.includes(option)}
                     onCheckedChange={() => handleMultiSelectChange(setSpaFacilities, option)}
                   />
                   <Label>{option}</Label>
                 </div>
               ))}
             </div>

             {/* Hotel Room Description */}
             <div className="grid gap-2">
               <Label htmlFor="hotelRoomDescription">Hotel Room Description</Label>
               <textarea
                 id="hotelRoomDescription"
                 placeholder="Describe the room..."
                 value={formData.hotelRoomDescription}
                 onChange={handleChange}
                 className="resize-none w-full rounded-md border px-3 py-1"
                 rows={4}
                 required
               />
             </div>

             {/* General */}
             <div className="grid gap-2">
               <Label>General</Label>
               {['Air Conditioning', 'Heating', 'Flat screen TV', 'Balcony', 'Garden view', 'Safe'].map(option => (
                 <div key={option} className="flex items-center space-x-2">
                   <Checkbox
                     checked={general.includes(option)}
                     onCheckedChange={() => handleMultiSelectChange(setGeneral, option)}
                   />
                   <Label>{option}</Label>
                 </div>
               ))}
             </div>

             {/* Additional Hotel Features */}
             <div className="grid gap-2">
               <Label htmlFor="additionalHotelFeatures">Additional Hotel Features</Label>
               <textarea
                 id="additionalHotelFeatures"
                 placeholder="Additional features..."
                 value={formData.additionalHotelFeatures}
                 onChange={handleChange}
                 className="resize-none w-full rounded-md border px-3 py-1"
                 rows={3}
               />
             </div>

             {/* Rules */}
             <div className="grid gap-2">
               <Label>Rules</Label>
               {Object.entries(rules).filter(([key]) => key !== 'additionalRules').map(([key, value]) => (
                 <RadioGroup key={key} value={value} onValueChange={(newValue) => setRules(prev => ({ ...prev, [key]: newValue }))}>
                   <div className="flex items-center justify-between">
                     <Label>{key.replace('allowed', ' allowed').charAt(0).toUpperCase() + key.replace('allowed', ' allowed').slice(1)}</Label>
                     <div className="flex items-center space-x-4">
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="Yes" id={`${key}-yes`} />
                         <Label htmlFor={`${key}-yes`}>Yes</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="No" id={`${key}-no`} />
                         <Label htmlFor={`${key}-no`}>No</Label>
                       </div>
                     </div>
                   </div>
                 </RadioGroup>
               ))}
               <textarea
                 placeholder="Additional rules..."
                 value={rules.additionalRules}
                 onChange={(e) => setRules(prev => ({ ...prev, additionalRules: e.target.value }))}
                 className="resize-none w-full rounded-md border px-3 py-1"
                 rows={2}
               />
             </div>

             {/* Check-in Times */}
             <div className="grid gap-2">
               <Label>Check-in Times</Label>
               <div className="flex space-x-2">
                 <TimePicker 
                   value={checkInFrom ? moment(checkInFrom, 'HH:mm') : null} 
                   onChange={(_, timeString) => setCheckInFrom(timeString as string)} 
                   format="HH:mm"
                   placeholder="From"
                 />
                 <TimePicker 
                   value={checkInUntil ? moment(checkInUntil, 'HH:mm') : null} 
                   onChange={(_, timeString) => setCheckInUntil(timeString as string)} 
                   format="HH:mm"
                   placeholder="Until"
                 />
               </div>
             </div>

             {/* Check-out Times */}
             <div className="grid gap-2">
               <Label>Check-out Times</Label>
               <div className="flex space-x-2">
                 <TimePicker 
                   value={checkOutFrom ? moment(checkOutFrom, 'HH:mm') : null} 
                   onChange={(_, timeString) => setCheckOutFrom(timeString as string)} 
                   format="HH:mm"
                   placeholder="From"
                 />
                 <TimePicker 
                   value={checkOutUntil ? moment(checkOutUntil, 'HH:mm') : null} 
                   onChange={(_, timeString) => setCheckOutUntil(timeString as string)} 
                   format="HH:mm"
                   placeholder="Until"
                 />
               </div>
             </div>

             {/* Image Uploads */}
             <div className="grid gap-2">
               <Label>Room Photos</Label>
               <div className="border-dashed border-2 border-gray-300 p-2 rounded-md text-center cursor-pointer h-24" onClick={() => document.getElementById('roomPhotos')?.click()}>
                 <input id="roomPhotos" type="file" accept="image/*" multiple onChange={handleFileUpload(setRoomPhotos)} className="hidden" />
                 <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                 <p className="text-gray-600 text-xs">Click to select room photos</p>
               </div>
               {roomPhotos.length > 0 && (
                 <div className="grid grid-cols-3 gap-2">
                   {roomPhotos.map((photo, index) => (
                     <div key={index} className="relative">
                       <img src={URL.createObjectURL(photo)} alt={`Room ${index}`} className="w-full h-20 object-cover rounded" />
                       <button onClick={() => handleImageRemove(setRoomPhotos, index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">×</button>
                     </div>
                   ))}
                 </div>
               )}
             </div>

             <div className="grid gap-2">
               <Label>Hotel Photos</Label>
               <div className="border-dashed border-2 border-gray-300 p-2 rounded-md text-center cursor-pointer h-24" onClick={() => document.getElementById('hotelPhotos')?.click()}>
                 <input id="hotelPhotos" type="file" accept="image/*" multiple onChange={handleFileUpload(setHotelPhotos)} className="hidden" />
                 <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                 <p className="text-gray-600 text-xs">Click to select hotel photos</p>
               </div>
               {hotelPhotos.length > 0 && (
                 <div className="grid grid-cols-3 gap-2">
                   {hotelPhotos.map((photo, index) => (
                     <div key={index} className="relative">
                       <img src={URL.createObjectURL(photo)} alt={`Hotel ${index}`} className="w-full h-20 object-cover rounded" />
                       <button onClick={() => handleImageRemove(setHotelPhotos, index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">×</button>
                     </div>
                   ))}
                 </div>
               )}
             </div>

             <div className="grid gap-2">
               <Label>Facilities Photos</Label>
               <div className="border-dashed border-2 border-gray-300 p-2 rounded-md text-center cursor-pointer h-24" onClick={() => document.getElementById('facilitiesPhotos')?.click()}>
                 <input id="facilitiesPhotos" type="file" accept="image/*" multiple onChange={handleFileUpload(setFacilitiesPhotos)} className="hidden" />
                 <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                 <p className="text-gray-600 text-xs">Click to select facilities photos</p>
               </div>
               {facilitiesPhotos.length > 0 && (
                 <div className="grid grid-cols-3 gap-2">
                   {facilitiesPhotos.map((photo, index) => (
                     <div key={index} className="relative">
                       <img src={URL.createObjectURL(photo)} alt={`Facility ${index}`} className="w-full h-20 object-cover rounded" />
                       <button onClick={() => handleImageRemove(setFacilitiesPhotos, index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">×</button>
                     </div>
                   ))}
                 </div>
               )}
             </div>

             {/* Cancellation Policy */}
             <div className="grid gap-2">
               <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
               <textarea
                 id="cancellationPolicy"
                 placeholder="Cancellation policy details..."
                 value={formData.cancellationPolicy}
                 onChange={handleChange}
                 className="resize-none w-full rounded-md border px-3 py-1"
                 rows={3}
                 required
               />
             </div>

             {/* Your Role */}
             <div className="grid gap-2">
               <Label htmlFor="yourRole">Your Role</Label>
               <Input id="yourRole" placeholder="Your role with the property" value={formData.yourRole} onChange={handleChange} required />
             </div>

             {/* Property Host Profile */}
             <div className="grid gap-2">
               <Label>Property Host Profile</Label>
               <div className="border-dashed border-2 border-gray-300 p-4 rounded-md text-center cursor-pointer" onClick={() => document.getElementById('profileImage')?.click()}>
                 <input id="profileImage" type="file" accept="image/*" onChange={handleProfileImageChange} className="hidden" />
                 {profileImage ? (
                   <div className="relative inline-block">
                     <img src={URL.createObjectURL(profileImage)} alt="Profile" className="w-24 h-24 object-cover rounded-full" />
                     <button onClick={(e) => { e.stopPropagation(); handleProfileImageRemove(); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 text-xs">×</button>
                   </div>
                 ) : (
                   <>
                     <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                     <p className="text-gray-600 text-xs">Upload host profile image</p>
                   </>
                 )}
               </div>
             </div>

             {/* Host's Name */}
             <div className="grid gap-2">
               <Label htmlFor="sellersName">Host's Name</Label>
               <Input id="sellersName" placeholder="Host's name" value={formData.sellersName} onChange={handleChange} required />
             </div>

             {/* Contact Details */}
             <div className="grid gap-2">
               <Label htmlFor="contactDetails">Contact Details</Label>
               <Input id="contactDetails" placeholder="Contact details" value={formData.contactDetails} onChange={handleChange} required />
             </div>

             {/* Host Languages */}
             <div className="grid gap-2">
               <Label>Host Languages</Label>
               {languages.slice(0, showMore ? languages.length : 4).map((language) => (
                 <div key={language} className="flex items-center space-x-2">
                   <Checkbox
                     checked={selectedLanguages.includes(language)}
                     onCheckedChange={() => handleLanguageChange(language)}
                   />
                   <Label>{language}</Label>
                 </div>
               ))}
               <button
                 type="button"
                 onClick={() => setShowMore(!showMore)}
                 className="text-blue-600 text-sm text-left"
               >
                 {showMore ? "Show less" : "Show more"}
               </button>
             </div>

             <p className="text-sm text-gray-600">Total size: {totalSizeMb} MB</p>

             <SheetFooter>
               <AlertDialogDemo 
                 totalSizeMb={totalSizeMb}
                 handleImageChange={handleAlertDialogImageChange}
                 handleImageRemove={handleAlertDialogImageRemove}
                 image={alertDialogImage ? URL.createObjectURL(alertDialogImage) : null}
                 handleSubmit={handleFinalSubmit}
                 blogKeyHistory={blogKeyHistory}
               />
             </SheetFooter>
           </form>
         </SheetContent>
       </Sheet>
     )}

     {/* Chunk Configuration */}
     {chunkStates.length > 0 && (
       <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
         <p className="text-sm text-yellow-300">
           📦 {usePropertyForm ? 'Property data' : 'File'} ready for BCAT upload
         </p>
         <div className="flex items-center gap-2 mt-2">
           <label className="text-xs text-yellow-200">Chunk size:</label>
           <input
             type="number"
             min="0.1"
             max="10"
             step="0.1"
             value={customChunkSize}
             onChange={(e) => handleChunkSizeChange(e.target.value)}
             className="px-2 py-1 w-20 bg-gray-800 border border-gray-600 rounded text-white text-xs"
             disabled={isProcessing}
           />
           <span className="text-xs text-yellow-200">MB per chunk</span>
           <button
             onClick={() => handleChunkSizeChange('2.0')}
             className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
           >
             Reset to 2MB
           </button>
         </div>
       </div>
     )}

     {/* Upload Mode Selection */}
     {chunkStates.length > 0 && (
       <div className="p-3 bg-gray-800 rounded-lg">
         <div className="flex items-center gap-4">
           <span className="text-sm text-gray-300">Upload Mode:</span>
           <label className="flex items-center gap-2">
             <input
               type="radio"
               value="sequential"
               checked={processingMode === 'sequential'}
               onChange={() => setProcessingMode('sequential')}
               disabled={isProcessing}
             />
             <span className="text-sm text-gray-300">Sequential (Auto)</span>
           </label>
           <label className="flex items-center gap-2">
             <input
               type="radio"
               value="manual"
               checked={processingMode === 'manual'}
               onChange={() => setProcessingMode('manual')}
               disabled={isProcessing}
             />
             <span className="text-sm text-gray-300">Manual (Individual Control)</span>
           </label>
         </div>
       </div>
     )}

     {/* Chunk Upload Status */}
     {chunkStates.length > 0 && (
       <div className="p-4 bg-gray-800 rounded-lg space-y-3">
         <div className="flex justify-between items-center">
           <h4 className="text-sm font-medium text-gray-300">
             Chunk Upload Status 
             ({chunkStates.filter(s => s.status === 'success').length}/{chunkStates.length} complete)
           </h4>
           <div className="flex gap-2">
             {processingMode === 'sequential' && !allChunksComplete && (
               <>
                 {!isProcessing ? (
                   <button
                     onClick={processChunksSequentially}
                     className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded"
                   >
                     Start Upload
                   </button>
                 ) : (
                   <>
                     {!isPaused ? (
                       <>
                         <button
                           onClick={pauseProcessing}
                           className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded"
                         >
                           Pause
                         </button>
                         <button
                           onClick={stopProcessing}
                           className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                         >
                           Stop
                         </button>
                       </>
                     ) : (
                       <>
                         <button
                           onClick={resumeProcessing}
                           className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded"
                         >
                           Resume
                         </button>
                         <button
                           onClick={stopProcessing}
                           className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                         >
                           Stop
                         </button>
                       </>
                     )}
                   </>
                 )}
               </>
             )}
             {allChunksComplete && (
               <span className="px-3 py-1 bg-green-500 text-white text-sm rounded">
                 All Complete
               </span>
             )}
           </div>
         </div>
         
         {/* Progress bar */}
         {isProcessing && currentProcessingIndex !== null && (
           <div>
             <p className="text-sm text-gray-300 mb-2">
               {isPaused ? 'Paused at' : 'Uploading'} chunk {currentProcessingIndex + 1} of {chunkStates.length}
             </p>
             <div className="w-full bg-gray-700 rounded-full h-2">
               <div 
                 className="bg-purple-500 h-2 rounded-full transition-all"
                 style={{ width: `${((currentProcessingIndex + 1) / chunkStates.length) * 100}%` }}
               />
             </div>
           </div>
         )}
         
         {/* Chunk list */}
         <div className="space-y-1 max-h-64 overflow-y-auto">
           {chunkStates.map((state) => (
             <div 
               key={state.chunkIndex} 
               className={`flex items-center justify-between text-xs p-2 rounded ${
                 state.status === 'success' ? 'bg-green-900 bg-opacity-30' :
                 state.status === 'failed' ? 'bg-red-900 bg-opacity-30' :
                 state.status === 'uploading' ? 'bg-blue-900 bg-opacity-30' :
                 'bg-gray-700'
               }`}
             >
               <span className="text-gray-300 font-medium">
                 Chunk {state.chunkIndex + 1}
                 {state.attempts > 0 && ` (Attempts: ${state.attempts})`}
               </span>
               <div className="flex items-center gap-2">
                 {state.status === 'success' && state.txid && (
                   <a 
                     href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${state.txid}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-green-400 hover:text-green-300"
                   >
                     {state.txid.substring(0, 8)}...
                   </a>
                 )}
                 {state.status === 'failed' && (
                   <>
                     <span className="text-red-400" title={state.error}>
                       {state.error?.includes('timeout') ? 'Timeout' : 
                        state.error?.includes('mempool') ? 'Conflict' : 'Failed'}
                     </span>
                     <button
                       onClick={() => uploadChunk(state.chunkIndex)}
                       className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded"
                       disabled={isProcessing}
                     >
                       Retry
                     </button>
                   </>
                 )}
                 {state.status === 'uploading' && (
                   <span className="text-blue-400">Uploading...</span>
                 )}
                 {state.status === 'pending' && (
                   <>
                     <span className="text-gray-400">Pending</span>
                     {processingMode === 'manual' && (
                       <button
                         onClick={() => uploadChunk(state.chunkIndex)}
                         className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                         disabled={isProcessing}
                       >
                         Upload
                       </button>
                     )}
                   </>
                 )}
               </div>
             </div>
           ))}
         </div>
       </div>
     )}

     {/* Create BCAT button */}
     {chunkStates.length > 0 && allChunksComplete && (
       <button
         onClick={createLargeProfileOrdinal}
         disabled={loading}
         className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
       >
         {loading ? 'Creating BCAT Reference...' : 'Create Property BCAT Reference'}
       </button>
     )}
   </div>
 );
};






































// import React, { useState, useEffect } from 'react';
// import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
// import { UTXOManager } from '../../components/wallet2/utils/blockchain';
// //  import { createInscriptionScript } from '../../components/wallet2/utils/inscriptionCreator';
// import { BroadcastService } from '../../components/wallet2/services/BroadcastService';
// import { createInscriptionScript } from '../../components/wallet2/inscriptions/utils/inscriptionCreator';
// import { BCATViewer } from '../../components/wallet2/inscriptions/components/BCATViewer';
// import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
// import { Button } from "../../components/ui/button";
// import { Input } from "../../components/ui/input";
// import { Label } from "../../components/ui/label";
// import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
// import { Checkbox } from "../../components/ui/checkbox";
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";
// import { UploadCloud } from "lucide-react";
// import { TimePicker } from "antd";
// import moment from 'moment';
// // 

// interface CreateLargeProfileInscriptionProps {
//   keyData: any;
//   network: 'mainnet' | 'testnet';
//   whatsOnChainApiKey?: string;
//   currentFeeRate: number;
//   balance: { confirmed: number; unconfirmed: number };
//   lastTransactionTime: number;
//   setStatus: (status: { type: 'success' | 'error' | 'info' | null; message: string }) => void;
//   setLastTxid: (txid: string) => void;
//   setLastTransactionTime: (time: number) => void;
// }

// interface ChunkUploadState {
//   chunkIndex: number;
//   chunkData: Uint8Array;
//   txid: string | null;
//   status: 'pending' | 'uploading' | 'success' | 'failed';
//   attempts: number;
//   error?: string;
//   lastAttemptTime?: number;
// }

// interface FormData {
//  propertyName: string;
//  receptionDetails: string;
//  hotelRoomDescription: string;
//  additionalHotelFeatures: string;
//  cancellationPolicy: string;
//  yourRole: string;
//  sellersName: string;
//  contactDetails: string;
// }

// // Alert Dialog Component  STANDARD FILE ULOAD   handleFinal
// const AlertDialogDemo: React.FC<{
//  totalSizeMb: number;
//  handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
//  handleImageRemove: () => void;
//  image: string | null;
//  handleSubmit: (title: string, description: string) => void;
// }> = ({ totalSizeMb, handleImageChange, handleImageRemove, image, handleSubmit }) => {
//  const [title, setTitle] = useState<string>('');
//  const [description, setDescription] = useState<string>('');

//  const isFormValid = title.trim() !== '' && description.trim() !== '' && image !== null;

//  return (
//    <AlertDialog>
//      <AlertDialogTrigger asChild>
//        <Button type="button" className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700">
//          Create BCAT Property
//        </Button>
//      </AlertDialogTrigger>
//      <AlertDialogContent>
//        <AlertDialogHeader>
//          <AlertDialogTitle>Property Token View</AlertDialogTitle>
//          <AlertDialogDescription>
//            <form className="grid gap-1 p-1">
//              <div className="w-full flex justify-center">
//                <div className="border border-blue-700 p-0 flex items-center justify-center w-80 h-80 relative overflow-hidden">
//                  {!image && (
//                    <Label htmlFor="alertImage" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                      <UploadCloud className="text-gray-400 mb-2" style={{ height: '1.5rem', width: '1.5rem' }} />
//                      <p className="text-gray-600 text-xs">Upload property main image</p>
//                    </Label>
//                  )}
//                  <input type="file" id="alertImage" name="alertImage" accept="image/*" onChange={handleImageChange} className="hidden" />
//                  {image && (
//                    <div style={{ position: 'relative', width: '20rem', height: '20rem', overflow: 'hidden' }}>
//                      <img src={image} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
//                      <Button type="button" onClick={handleImageRemove} style={{ position: 'absolute', top: '5px', right: '5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px' }}>
//                        x
//                      </Button>
//                    </div>
//                  )}
//                </div>
//              </div>

//              <div className="grid gap-1 w-full justify-center">
//                <Input placeholder='Property Title...' type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={36} required />
//                <textarea placeholder='Property Description...' id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none rounded-md border px-3 py-1" maxLength={96} rows={4} required />
//              </div>
//            </form>
//            <br />
//            Total data size: {totalSizeMb} MB
//          </AlertDialogDescription>
//        </AlertDialogHeader>
//        <AlertDialogFooter>
//          <AlertDialogCancel>Cancel</AlertDialogCancel>
//          <AlertDialogAction onClick={() => handleSubmit(title, description)} disabled={!isFormValid}>
//            Create BCAT {totalSizeMb} MB
//          </AlertDialogAction>
//        </AlertDialogFooter>
//      </AlertDialogContent>
//    </AlertDialog>
//  );
// };

// // Counter Input Component
// const CounterInput: React.FC<{ 
//  id: string; 
//  label: string; 
//  value: number; 
//  setValue: React.Dispatch<React.SetStateAction<number>> 
// }> = ({ id, label, value, setValue }) => (
//  <div className="flex items-center space-x-2">
//    <Button type="button" onClick={() => setValue(prev => Math.max(0, prev - 1))} className="w-8 h-8">-</Button>
//    <Input id={id} type="number" value={value} readOnly className="text-center w-16" />
//    <Button type="button" onClick={() => setValue(prev => prev + 1)} className="w-8 h-8">+</Button>
//    <Label htmlFor={id}>{label}</Label>
//  </div>
// );

// // BCAT Protocol Constants
// const BCAT_NAMESPACE = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up';
// const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';

// export const CreateLargeProfileInscription1: React.FC<CreateLargeProfileInscriptionProps> = ({
//  keyData,
//  network,
//  whatsOnChainApiKey,
//  currentFeeRate,
//  balance,
//  lastTransactionTime,
//  setStatus,
//  setLastTxid,
//  setLastTransactionTime
// }) => {
//  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
//  const [loading, setLoading] = useState(false);
 
//  // File upload state for standard mode
//  const [largeProfileFile, setLargeProfileFile] = useState<File | null>(null);
//  const [largeProfileThumbnail, setLargeProfileThumbnail] = useState<string>('');
//  const [usePropertyForm, setUsePropertyForm] = useState(false);
 
//  // Chunk management - shared between both modes
//  const [chunkSizeMB, setChunkSizeMB] = useState<number>(2.0);
//  const [customChunkSize, setCustomChunkSize] = useState<string>('2.0');
//  const [chunkStates, setChunkStates] = useState<ChunkUploadState[]>([]);
//  const [processingMode, setProcessingMode] = useState<'sequential' | 'manual'>('sequential');
//  const [isProcessing, setIsProcessing] = useState(false);
//  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
//  const [isPaused, setIsPaused] = useState(false);
//  const [shouldStop, setShouldStop] = useState(false);

//  // Form data from FormSheet1
//  const [formData, setFormData] = useState<FormData>({
//    propertyName: '',
//    receptionDetails: '',
//    hotelRoomDescription: '',
//    additionalHotelFeatures: '',
//    cancellationPolicy: '',
//    yourRole: '',
//    sellersName: '',
//    contactDetails: '',
//  });

//  // All form inputs from FormSheet1
//  const [numberOfGuests, setNumberOfGuests] = useState(1);
//  const [numberOfBathrooms, setNumberOfBathrooms] = useState(1);
//  const [numberOfSingleBeds, setNumberOfSingleBeds] = useState(0);
//  const [numberOfQueenBeds, setNumberOfQueenBeds] = useState(0);
//  const [numberOfKingBeds, setNumberOfKingBeds] = useState(0);
//  const [numberOfKidBeds, setNumberOfKidBeds] = useState(0);
//  const [numberOfTufanBeds, setNumberOfTufanBeds] = useState(0);
//  const [hotelRoomForOccupants, setHotelRoomForOccupants] = useState('');
//  const [hotelRoomBedType, setHotelRoomBedType] = useState('');
//  const [arrangementAndFacilities, setArrangementAndFacilities] = useState('');
//  const [otherTypesOfHotelRooms, setOtherTypesOfHotelRooms] = useState('');
//  const [hotelRoomFacilities, setHotelRoomFacilities] = useState<string[]>([]);
//  const [gymOrFitness, setGymOrFitness] = useState('');
//  const [dedicatedWorkstation, setDedicatedWorkstation] = useState('');
//  const [spaFacilities, setSpaFacilities] = useState<string[]>([]);
//  const [general, setGeneral] = useState<string[]>([]);
//  const [checkInFrom, setCheckInFrom] = useState('');
//  const [checkInUntil, setCheckInUntil] = useState('');
//  const [checkOutFrom, setCheckOutFrom] = useState('');
//  const [checkOutUntil, setCheckOutUntil] = useState('');
//  const [freeWifi, setFreeWifi] = useState('Yes');
//  const [rules, setRules] = useState({
//    smokingallowed: 'No',
//    petsallowed: 'No',
//    childrenallowed: 'No',
//    partieseventsallowed: 'No',
//    additionalRules: ''
//  });
//  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
//  const [showMore, setShowMore] = useState(false);
 
//  const languages = [
//    "English", "French", "German", "Japanese",
//    "Italian", "Russian", "Spanish", "Chinese (Simplified)",
//    "Arabic", "Hindi", "Portuguese", "Turkish"
//  ];
 
//  // Images
//  const [roomPhotos, setRoomPhotos] = useState<File[]>([]);
//  const [hotelPhotos, setHotelPhotos] = useState<File[]>([]);
//  const [facilitiesPhotos, setFacilitiesPhotos] = useState<File[]>([]);
//  const [profileImage, setProfileImage] = useState<File | null>(null);
//  const [alertDialogImage, setAlertDialogImage] = useState<File | null>(null);
 
//  // Final alert dialog data
//  const [alertDialogTitle, setAlertDialogTitle] = useState<string>('');
//  const [alertDialogDescription, setAlertDialogDescription] = useState<string>('');
 
//  const [totalSizeMb, setTotalSizeMb] = useState<number>(0);
//  const [showSheet, setShowSheet] = useState(false);

//  // Calculate total size
//  useEffect(() => {
//    if (usePropertyForm) {
//      const textFields = Object.values(formData).reduce((total, field) => total + new Blob([field]).size, 0);
//      const imagesSize = [...roomPhotos, ...hotelPhotos, ...facilitiesPhotos].reduce((total, image) => total + image.size, 0);
//      const profileImageSize = profileImage ? profileImage.size : 0;
//      const alertDialogImageSize = alertDialogImage ? alertDialogImage.size : 0;
//      const totalSizeBytes = textFields + imagesSize + profileImageSize + alertDialogImageSize;
//      const totalSizeMb = totalSizeBytes / (1024 * 1024);
//      setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
//    } else if (largeProfileFile) {
//      const totalSizeMb = largeProfileFile.size / (1024 * 1024);
//      setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
//    }
//  }, [formData, roomPhotos, hotelPhotos, facilitiesPhotos, profileImage, alertDialogImage, largeProfileFile, usePropertyForm]);

//  // Helper functions
//  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//    const { id, value } = e.target;
//    setFormData(prev => ({ ...prev, [id]: value }));
//  };

//  const handleRadioChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
//    setter(value);
//  };

//  const handleMultiSelectChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
//    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
//  };

//  const handleFileUpload = (setter: React.Dispatch<React.SetStateAction<File[]>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
//    if (e.target.files) {
//      const newFiles = Array.from(e.target.files);
//      setter(prev => [...prev, ...newFiles]);
//    }
//  };

//  const handleImageRemove = (setter: React.Dispatch<React.SetStateAction<File[]>>, index: number) => {
//    setter(prev => prev.filter((_, i) => i !== index));
//  };

//  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//    const file = e.target.files?.[0];
//    if (file) {
//      setProfileImage(file);
//    }
//  };

//  const handleProfileImageRemove = () => {
//    setProfileImage(null);
//  };

//  const handleAlertDialogImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//    const file = e.target.files?.[0];
//    if (file) {
//      setAlertDialogImage(file);
//    }
//  };

//  const handleAlertDialogImageRemove = () => {
//    setAlertDialogImage(null);
//  };

//  const handleLanguageChange = (language: string) => {
//    setSelectedLanguages(prev =>
//      prev.includes(language)
//        ? prev.filter(l => l !== language)
//        : [...prev, language]
//    );
//  };

//  // Handle chunk size change
//  const handleChunkSizeChange = (value: string) => {
//    setCustomChunkSize(value);
//    const size = parseFloat(value);
//    if (!isNaN(size) && size > 0 && size <= 10) {
//      setChunkSizeMB(size);
     
//      if (largeProfileFile && !usePropertyForm) {
//        rechunkFile(largeProfileFile, size);
//      }
//    }
//  };

//  // Generate thumbnail
//  const generateThumbnail = async (file: File): Promise<string> => {
//    if (file.type.startsWith('image/')) {
//      return new Promise((resolve) => {
//        const reader = new FileReader();
//        reader.onload = (e) => {
//          const img = new Image();
//          img.onload = () => {
//            const canvas = document.createElement('canvas');
//            const ctx = canvas.getContext('2d')!;
           
//            const size = 200;
//            canvas.width = size;
//            canvas.height = size;
           
//            const scale = Math.min(size / img.width, size / img.height);
//            const w = img.width * scale;
//            const h = img.height * scale;
//            const x = (size - w) / 2;
//            const y = (size - h) / 2;
           
//            ctx.fillStyle = '#1a1a1a';
//            ctx.fillRect(0, 0, size, size);
//            ctx.drawImage(img, x, y, w, h);
           
//            resolve(canvas.toDataURL('image/jpeg', 0.7));
//          };
//          img.src = e.target?.result as string;
//        };
//        reader.readAsDataURL(file);
//      });
//    } else {
//      const canvas = document.createElement('canvas');
//      const ctx = canvas.getContext('2d')!;
//      canvas.width = 200;
//      canvas.height = 200;
     
//      ctx.fillStyle = '#1a1a1a';
//      ctx.fillRect(0, 0, 200, 200);
     
//      ctx.fillStyle = '#6b7280';
//      ctx.font = '60px Arial';
//      ctx.textAlign = 'center';
     
//      let icon = '📄';
//      if (file.type.startsWith('video/')) icon = '🎥';
//      else if (file.type.startsWith('audio/')) icon = '🎵';
//      else if (file.type.includes('zip') || file.type.includes('archive')) icon = '📦';
//      else if (file.type.includes('pdf')) icon = '📕';
     
//      ctx.fillText(icon, 100, 90);
     
//      ctx.fillStyle = '#e5e7eb';
//      ctx.font = '14px Arial';
//      const displayName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
//      ctx.fillText(displayName, 100, 130);
//      ctx.font = '12px Arial';
//      ctx.fillStyle = '#9ca3af';
//      ctx.fillText(`${(file.size / (1024 * 1024)).toFixed(1)}MB`, 100, 150);
     
//      return canvas.toDataURL('image/png');
//    }
//  };

//  // Handle large file selection
//  const handleLargeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
//    const file = e.target.files?.[0];
//    if (!file) return;

//    setLargeProfileFile(file);
   
//    setStatus({ type: 'info', message: 'Generating thumbnail...' });
//    const thumbnail = await generateThumbnail(file);
//    setLargeProfileThumbnail(thumbnail);
   
//    const chunks = await chunkFile(file, chunkSizeMB);
//    const initialChunkStates: ChunkUploadState[] = chunks.map((chunk, index) => ({
//      chunkIndex: index,
//      chunkData: new Uint8Array(chunk),
//      txid: null,
//      status: 'pending',
//      attempts: 0
//    }));
   
//    setChunkStates(initialChunkStates);
   
//    setStatus({ 
//      type: 'info', 
//      message: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Split into ${chunks.length} chunks of ${chunkSizeMB}MB each.` 
//    });
//  };

//  // Chunk file function
//  const chunkFile = (file: File, chunkSizeMB: number): Promise<ArrayBuffer[]> => {
//    return new Promise((resolve) => {
//      const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024);
//      const chunks: ArrayBuffer[] = [];
//      const reader = new FileReader();
//      let offset = 0;

//      const readNextChunk = () => {
//        const slice = file.slice(offset, offset + chunkSizeBytes);
//        reader.readAsArrayBuffer(slice);
//      };

//      reader.onload = (e) => {
//        if (e.target?.result) {
//          chunks.push(e.target.result as ArrayBuffer);
//          offset += chunkSizeBytes;
         
//          if (offset < file.size) {
//            readNextChunk();
//          } else {
//            resolve(chunks);
//          }
//        }
//      };

//      readNextChunk();
//    });
//  };

//  // Rechunk file with new size
//  const rechunkFile = async (file: File, newChunkSize: number) => {
//    setStatus({ type: 'info', message: 'Rechunking file with new chunk size...' });
//    const chunks = await chunkFile(file, newChunkSize);
//    const newChunkStates: ChunkUploadState[] = chunks.map((chunk, index) => ({
//      chunkIndex: index,
//      chunkData: new Uint8Array(chunk),
//      txid: null,
//      status: 'pending',
//      attempts: 0
//    }));
   
//    setChunkStates(newChunkStates);
   
//    setStatus({ 
//      type: 'info', 
//      message: `File rechunked: ${chunks.length} chunks of ${newChunkSize}MB each.` 
//    });
//  };

//  // Compile property data (for form mode)
//  const compilePropertyData = () => {
//    return {
//      // ALERT DIALOG DATA
//      title: alertDialogTitle,
//      description: alertDialogDescription,
//      mainImage: alertDialogImage ? alertDialogImage.name : null,
     
//      // PROPERTY DETAILS
//      propertyName: formData.propertyName,
//      numberOfGuests,
//      numberOfBathrooms,
//      numberOfSingleBeds,
//      numberOfQueenBeds,
//      numberOfKingBeds,
//      numberOfKidBeds,
//      numberOfTufanBeds,
//      hotelRoomForOccupants,
//      hotelRoomBedType,
//      arrangementAndFacilities,
//      otherTypesOfHotelRooms,
//      hotelRoomFacilities,
//      gymOrFitness,
//      dedicatedWorkstation,
//      spaFacilities,
//      general,
//      freeWifi,
//      rules,
//      checkInFrom,
//      checkInUntil,
//      checkOutFrom,
//      checkOutUntil,
//      selectedLanguages,
     
//      // DESCRIPTIONS
//      receptionDetails: formData.receptionDetails,
//      hotelRoomDescription: formData.hotelRoomDescription,
//      additionalHotelFeatures: formData.additionalHotelFeatures,
//      cancellationPolicy: formData.cancellationPolicy,
     
//      // HOST INFO
//      yourRole: formData.yourRole,
//      sellersName: formData.sellersName,
//      contactDetails: formData.contactDetails,
     
//      // IMAGES COUNT
//      roomPhotosCount: roomPhotos.length,
//      hotelPhotosCount: hotelPhotos.length,
//      facilitiesPhotosCount: facilitiesPhotos.length,
//      hasProfileImage: profileImage !== null,
     
//      // METADATA
//      createdAt: new Date().toISOString(),
//      totalSizeMB: totalSizeMb
//    };
//  };

//  // Prepare files for BCAT chunking
//  const prepareFilesForBCAT = async (): Promise<Uint8Array> => {
//    const propertyData = compilePropertyData();
//    const jsonData = JSON.stringify(propertyData);
   
//    const parts: Uint8Array[] = [];
   
//    const jsonBytes = new TextEncoder().encode(jsonData);
//    const jsonSizeBytes = new Uint8Array(4);
//    new DataView(jsonSizeBytes.buffer).setUint32(0, jsonBytes.length, true);
//    parts.push(jsonSizeBytes);
//    parts.push(jsonBytes);
   
//    const addImage = async (file: File | null, label: string) => {
//      if (file) {
//        const arrayBuffer = await file.arrayBuffer();
//        const bytes = new Uint8Array(arrayBuffer);
       
//        const labelBytes = new TextEncoder().encode(label);
//        const labelSizeBytes = new Uint8Array(4);
//        new DataView(labelSizeBytes.buffer).setUint32(0, labelBytes.length, true);
//        parts.push(labelSizeBytes);
//        parts.push(labelBytes);
       
//        const sizeBytes = new Uint8Array(4);
//        new DataView(sizeBytes.buffer).setUint32(0, bytes.length, true);
//        parts.push(sizeBytes);
//        parts.push(bytes);
//      }
//    };
   
//    await addImage(alertDialogImage, 'mainImage');
//    await addImage(profileImage, 'profileImage');
   
//    for (let i = 0; i < roomPhotos.length; i++) {
//      await addImage(roomPhotos[i], `roomPhoto_${i}`);
//    }
   
//    for (let i = 0; i < hotelPhotos.length; i++) {
//      await addImage(hotelPhotos[i], `hotelPhoto_${i}`);
//    }
   
//    for (let i = 0; i < facilitiesPhotos.length; i++) {
//      await addImage(facilitiesPhotos[i], `facilitiesPhoto_${i}`);
//    }
   
//    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
//    const combined = new Uint8Array(totalLength);
//    let offset = 0;
   
//    for (const part of parts) {
//      combined.set(part, offset);
//      offset += part.length;
//    }
   
//    return combined;
//  };

//  // Chunk data function
//  const chunkData = (data: Uint8Array, chunkSizeMB: number): Uint8Array[] => {
//    const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024);
//    const chunks: Uint8Array[] = [];
   
//    for (let offset = 0; offset < data.length; offset += chunkSizeBytes) {
//      const chunk = data.slice(offset, Math.min(offset + chunkSizeBytes, data.length));
//      chunks.push(chunk);
//    }
   
//    return chunks;
//  };

//  // Process form submission from alert dialog
//  const handleFinalSubmit = async (title: string, description: string) => {
//    setAlertDialogTitle(title);
//    setAlertDialogDescription(description);
   
//    setStatus({ type: 'info', message: 'Preparing property data for BCAT...' });
   
//    try {
//      const allData = await prepareFilesForBCAT();
//      const chunks = chunkData(allData, chunkSizeMB);
//      const newChunkStates: ChunkUploadState[] = chunks.map((chunk, index) => ({
//        chunkIndex: index,
//        chunkData: chunk,
//        txid: null,
//        status: 'pending',
//        attempts: 0
//      }));
     
//      setChunkStates(newChunkStates);
//      setShowSheet(false);
     
//      setStatus({ 
//        type: 'info', 
//        message: `Property data prepared: ${(allData.length / (1024 * 1024)).toFixed(2)}MB split into ${chunks.length} chunks of ${chunkSizeMB}MB each.` 
//      });
//    } catch (error) {
//      console.error('Error preparing BCAT data:', error);
//      setStatus({ 
//        type: 'error', 
//        message: error instanceof Error ? error.message : 'Failed to prepare data' 
//      });
//    }
//  };

//  // Upload a single chunk
//  const uploadSingleChunk = async (chunkIndex: number, forceNewUTXOs: boolean = false): Promise<{ success: boolean; txid?: string; error?: string }> => {
//    const chunkState = chunkStates[chunkIndex];
//    if (!chunkState) {
//      return { success: false, error: 'Chunk not found' };
//    }

//    if (chunkState.status === 'success' && chunkState.txid) {
//      console.log(`Chunk ${chunkIndex + 1} already completed with txid: ${chunkState.txid}`);
//      return { success: true, txid: chunkState.txid };
//    }

//    const broadcastService = new BroadcastService(network, (message: string) => {
//      setStatus({ 
//        type: 'info', 
//        message: `Chunk ${chunkIndex + 1}: ${message}` 
//      });
//    }, 10000);
   
//    const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//    const address = privateKey.toPublicKey().toAddress();
   
//    try {
//      setChunkStates(prevStates => {
//        const newStates = [...prevStates];
//        newStates[chunkIndex] = { 
//          ...newStates[chunkIndex], 
//          status: 'uploading',
//          attempts: newStates[chunkIndex].attempts + 1,
//          lastAttemptTime: Date.now()
//        };
//        return newStates;
//      });

//      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
     
//      if (forceNewUTXOs) {
//        console.log(`Waiting 5 seconds before fetching new UTXOs for chunk ${chunkIndex + 1}...`);
//        await new Promise(resolve => setTimeout(resolve, 5000));
//      }
     
//      const utxos = await utxoManager.fetchUTXOs(true);
     
//      if (utxos.length === 0) {
//        throw new Error('No UTXOs available');
//      }
     
//      const chunkData = chunkState.chunkData;
//      const estimatedFee = Math.ceil((300 + chunkData.length) / 1000) * currentFeeRate;
//      const { selected, total } = utxoManager.selectUTXOs(estimatedFee);
     
//      if (selected.length === 0) {
//        throw new Error(`Insufficient funds. Need ${estimatedFee} sats`);
//      }
     
//      const tx = new Transaction();
     
//      let totalInput = 0;
//      for (const utxo of selected) {
//        const txid = utxo.tx_hash || utxo.txid;
//        const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//        const satoshis = utxo.value || utxo.satoshis || 0;
       
//        totalInput += satoshis;
       
//        const sourceTransaction = {
//          id: txid,
//          version: 1,
//          inputs: [],
//          outputs: [],
//          lockTime: 0
//        };
       
//        for (let i = 0; i <= vout; i++) {
//          sourceTransaction.outputs[i] = {
//            satoshis: i === vout ? satoshis : 0,
//            lockingScript: new P2PKH().lock(address)
//          };
//        }
       
//        tx.addInput({
//          sourceTXID: txid,
//          sourceOutputIndex: vout,
//          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//          sourceTransaction: sourceTransaction
//        });
//      }
     
//      let scriptHex = '6a';
     
//      const namespaceBytes = Utils.toArray(BCAT_PART_NAMESPACE, 'utf8');
//      if (namespaceBytes.length <= 75) {
//        scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
//      } else {
//        scriptHex += '4c';
//        scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
//      }
//      scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
//      const dataLength = chunkData.length;
//      if (dataLength <= 75) {
//        scriptHex += dataLength.toString(16).padStart(2, '0');
//      } else if (dataLength <= 255) {
//        scriptHex += '4c';
//        scriptHex += dataLength.toString(16).padStart(2, '0');
//      } else if (dataLength <= 65535) {
//        scriptHex += '4d';
//        scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
//        scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
//      } else {
//        scriptHex += '4e';
//        scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
//        scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
//        scriptHex += ((dataLength >> 16) & 0xff).toString(16).padStart(2, '0');
//        scriptHex += ((dataLength >> 24) & 0xff).toString(16).padStart(2, '0');
//      }
     
//      const BATCH_SIZE = 10000;
//      for (let j = 0; j < chunkData.length; j += BATCH_SIZE) {
//        const batch = chunkData.slice(j, Math.min(j + BATCH_SIZE, chunkData.length));
//        scriptHex += Array.from(batch).map(b => b.toString(16).padStart(2, '0')).join('');
//      }
     
//      const script = Script.fromHex(scriptHex);
     
//      tx.addOutput({
//        lockingScript: script,
//        satoshis: 0
//      });
     
//      const change = totalInput - estimatedFee;
//      if (change > 0) {
//        tx.addOutput({
//          lockingScript: new P2PKH().lock(address),
//          satoshis: change
//        });
//      }
     
//      await tx.sign();
//      const txHex = tx.toHex();
//      const result = await broadcastService.broadcast(txHex);
     
//      if (result.success && result.txid) {
//        utxoManager.markAsSpent(selected);
       
//        setChunkStates(prevStates => {
//          const newStates = [...prevStates];
//          newStates[chunkIndex] = { 
//            ...newStates[chunkIndex], 
//            status: 'success', 
//            txid: result.txid,
//            error: undefined
//          };
//          return newStates;
//        });
       
//        console.log(`✅ Chunk ${chunkIndex + 1} successfully uploaded: ${result.txid}`);
//        return { success: true, txid: result.txid };
//      } else {
//        throw new Error(result.error || 'Broadcast failed');
//      }
     
//    } catch (error) {
//      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//      const isMempoolConflict = errorMessage.includes('txn-mempool-conflict');
     
//      setChunkStates(prevStates => {
//        const newStates = [...prevStates];
//        newStates[chunkIndex] = { 
//          ...newStates[chunkIndex], 
//          status: 'failed', 
//          error: errorMessage
//        };
//        return newStates;
//      });
     
//      console.error(`❌ Chunk ${chunkIndex + 1} failed: ${errorMessage}`);
     
//      if (isMempoolConflict && !forceNewUTXOs && chunkState.attempts < 3) {
//        console.log(`Mempool conflict detected for chunk ${chunkIndex + 1}, retrying with fresh UTXOs...`);
//        await new Promise(resolve => setTimeout(resolve, 5000));
//        return uploadSingleChunk(chunkIndex, true);
//      }
     
//      return { 
//        success: false, 
//        error: errorMessage
//      };
//    }
//  };

//  // Upload a specific chunk (manual mode)
//  const uploadChunk = async (chunkIndex: number) => {
//    const currentChunkState = chunkStates[chunkIndex];
   
//    if (!currentChunkState) {
//      setStatus({ type: 'error', message: `Chunk ${chunkIndex + 1} not found` });
//      return;
//    }
   
//    if (currentChunkState.status === 'uploading') {
//      setStatus({ type: 'error', message: `Chunk ${chunkIndex + 1} is already uploading` });
//      return;
//    }
   
//    if (currentChunkState.status === 'success' && currentChunkState.txid) {
//      setStatus({ type: 'info', message: `Chunk ${chunkIndex + 1} already completed: ${currentChunkState.txid}` });
//      return;
//    }

//    setCurrentProcessingIndex(chunkIndex);
   
//    setStatus({ 
//      type: 'info', 
//      message: `Starting upload for chunk ${chunkIndex + 1} of ${chunkStates.length}...` 
//    });
   
//    const result = await uploadSingleChunk(chunkIndex, false);
   
//    if (result.success && result.txid) {
//      setStatus({ 
//        type: 'success', 
//        message: `Chunk ${chunkIndex + 1} uploaded successfully! TXID: ${result.txid.substring(0, 8)}...` 
//      });
     
//      setChunkStates(prevStates => {
//        checkAllChunksComplete(prevStates);
//        return prevStates;
//      });
//    } else {
//      setStatus({ 
//        type: 'error', 
//        message: `Chunk ${chunkIndex + 1} failed: ${result.error}` 
//      });
//    }
   
//    setCurrentProcessingIndex(null);
//  };

//  // Process chunks sequentially
//  const processChunksSequentially = async () => {
//    setIsProcessing(true);
//    setShouldStop(false);
//    setIsPaused(false);
   
//    for (let i = 0; i < chunkStates.length; i++) {
//      if (shouldStop) {
//        console.log('Sequential processing stopped by user');
//        break;
//      }
     
//      while (isPaused && !shouldStop) {
//        await new Promise(resolve => setTimeout(resolve, 100));
//      }
     
//      if (shouldStop) {
//        console.log('Sequential processing stopped by user after pause');
//        break;
//      }
     
//      const currentState = chunkStates[i];
     
//      if (currentState.status === 'success' && currentState.txid) {
//        console.log(`Skipping chunk ${i + 1} - already completed: ${currentState.txid}`);
//        continue;
//      }
     
//      setCurrentProcessingIndex(i);
     
//      const result = await uploadSingleChunk(i, false);
     
//      if (!result.success) {
//        console.error(`Failed to upload chunk ${i + 1}: ${result.error}`);
       
//        const shouldAutoRetry = result.error?.includes('timeout') || 
//                               result.error?.includes('txn-mempool-conflict');
       
//        if (shouldAutoRetry && currentState.attempts < 3) {
//          console.log(`Auto-retrying chunk ${i + 1} after failure...`);
//          await new Promise(resolve => setTimeout(resolve, 5000));
//          const retryResult = await uploadSingleChunk(i, true);
//          if (!retryResult.success) {
//            continue;
//          }
//        }
//      }
     
//      if (i < chunkStates.length - 1) {
//        await new Promise(resolve => setTimeout(resolve, 3000));
//      }
//    }
   
//    setIsProcessing(false);
//    setCurrentProcessingIndex(null);
//    setShouldStop(false);
//    setIsPaused(false);
   
//    const finalStates = chunkStates;
//    checkAllChunksComplete(finalStates);
//  };

//  // Control functions
//  const stopProcessing = () => {
//    setShouldStop(true);
//    setIsPaused(false);
//    setStatus({ type: 'info', message: 'Stopping chunk upload process...' });
//  };

//  const pauseProcessing = () => {
//    setIsPaused(true);
//    setStatus({ type: 'info', message: 'Paused chunk upload process' });
//  };

//  const resumeProcessing = () => {
//    setIsPaused(false);
//    setStatus({ type: 'info', message: 'Resumed chunk upload process' });
//  };

//  const checkAllChunksComplete = (states: ChunkUploadState[]) => {
//    const allSuccess = states.every(state => state.status === 'success' && state.txid);
//    if (allSuccess) {
//      setStatus({ 
//        type: 'success', 
//        message: '✅ All chunks uploaded successfully! You can now create the BCAT reference transaction.' 
//      });
//    }
//  };

//  const getAllChunksComplete = () => {
//    return chunkStates.length > 0 && 
//           chunkStates.every(state => state.status === 'success' && state.txid);
//  };

//  // Create final BCAT transaction
//  const createLargeProfileOrdinal = async () => {
//    if (usePropertyForm) {
//      if (!alertDialogTitle || !alertDialogDescription || !keyData.privateKey) {
//        setStatus({ type: 'error', message: 'Missing required data' });
//        return;
//      }
//    } else {
//      if (!largeProfileFile || !largeProfileThumbnail || !keyData.privateKey) {
//        setStatus({ type: 'error', message: 'Missing required data' });
//        return;
//      }
//    }

//    const successfulChunks = chunkStates.filter(state => state.status === 'success' && state.txid);
//    if (successfulChunks.length !== chunkStates.length) {
//      setStatus({ 
//        type: 'error', 
//        message: `Not all chunks uploaded. ${successfulChunks.length} of ${chunkStates.length} chunks complete.` 
//      });
//      return;
//    }

//    const timeSinceLastTx = Date.now() - lastTransactionTime;
//    if (timeSinceLastTx < 5000) {
//      setStatus({ 
//        type: 'error', 
//        message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another inscription`
//      });
//      return;
//    }
   
//    setLoading(true);
   
//    try {
//      const chunkTxIds = chunkStates
//        .sort((a, b) => a.chunkIndex - b.chunkIndex)
//        .map(state => state.txid!);
     
//      setStatus({ type: 'info', message: 'Waiting for chunks to propagate...' });
//      await new Promise(resolve => setTimeout(resolve, 5000));
     
//      setStatus({ type: 'info', message: 'Creating BCAT reference transaction...' });
     
//      let thumbnailBytes = new Uint8Array();
//      let metadataObject: any = {};
//      let filename = '';
     
//      if (usePropertyForm) {
//        if (alertDialogImage) {
//          const reader = new FileReader();
//          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
//            reader.onload = () => resolve(reader.result as ArrayBuffer);
//            reader.onerror = reject;
//            reader.readAsArrayBuffer(alertDialogImage);
//          });
//          thumbnailBytes = new Uint8Array(arrayBuffer);
//        }
       
//        // ALERT DIALOG DATA EMBEDDING
//        metadataObject = {
//          title: alertDialogTitle,
//          description: alertDialogDescription,
//          propertyName: formData.propertyName,
//          type: 'property',
//          chunks: chunkTxIds.length,
//          created: new Date().toISOString()
//        };
       
//        filename = `${alertDialogTitle.substring(0, 30)}_property.bcat`;
//      } else {
//        const thumbnailData = largeProfileThumbnail.split(',')[1];
//        thumbnailBytes = Utils.toArray(thumbnailData, 'base64');
       
//        metadataObject = {
//          filename: largeProfileFile!.name,
//          size: largeProfileFile!.size,
//          type: largeProfileFile!.type,
//          chunks: chunkTxIds.length
//        };
       
//        filename = largeProfileFile!.name.substring(0, 50);
//      }
     
//      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
//      const utxos = await utxoManager.fetchUTXOs(true);
     
//      const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
//      const pubKeyHash = privateKey.toPublicKey().toHash();
//      const address = privateKey.toPublicKey().toAddress();
     
//      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadataObject));
     
//      const inscriptionScript = createInscriptionScript(
//        pubKeyHash,
//        usePropertyForm ? 'application/json' : 'image/jpeg',
//        usePropertyForm ? metadataBytes : thumbnailBytes
//      );
     
//      const opReturnSize = 1 + 1 + 35 + 1 + 10 + 1 + 24 + 1 + 1 + 50 + 1 + (chunkTxIds.length * 33);
//      const estimatedTxSize = 300 + (usePropertyForm ? metadataBytes.length : thumbnailBytes.length) + opReturnSize;
//      const estimatedFee = Math.ceil((estimatedTxSize / 1000) * currentFeeRate) + 100;
     
//      const { selected, total } = utxoManager.selectUTXOs(1 + estimatedFee + 546);
     
//      if (selected.length === 0) {
//        throw new Error(`Insufficient funds. Need ${1 + estimatedFee + 546} sats, have ${total} sats`);
//      }
     
//      const tx = new Transaction();
     
//      let totalInput = 0;
//      for (const utxo of selected) {
//        const txid = utxo.tx_hash || utxo.txid;
//        const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
//        const satoshis = utxo.value || utxo.satoshis || 0;
       
//        totalInput += satoshis;
       
//        const sourceTransaction = {
//          id: txid,
//          version: 1,
//          inputs: [],
//          outputs: [],
//          lockTime: 0
//        };
       
//        for (let i = 0; i <= vout; i++) {
//          sourceTransaction.outputs[i] = sourceTransaction.outputs[i] || {
//            satoshis: i === vout ? satoshis : 0,
//            lockingScript: new P2PKH().lock(address)
//          };
//        }
       
//        tx.addInput({
//          sourceTXID: txid,
//          sourceOutputIndex: vout,
//          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
//          sourceTransaction: sourceTransaction
//        });
//      }
     
//      tx.addOutput({
//        lockingScript: inscriptionScript,
//        satoshis: 1
//      });
     
//      // BCAT reference in OP_RETURN
//      let scriptHex = '6a';
     
//      const namespaceBytes = Utils.toArray(BCAT_NAMESPACE, 'utf8');
//      scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
//      scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
//      const info = 'BCAT';
//      const infoBytes = Utils.toArray(info, 'utf8');
//      scriptHex += infoBytes.length.toString(16).padStart(2, '0');
//      scriptHex += infoBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
//      const mimeType = usePropertyForm ? 'application/json' : (largeProfileFile?.type || 'application/octet-stream');
//      const mimeBytes = Utils.toArray(mimeType.substring(0, 128), 'utf8');
//      scriptHex += mimeBytes.length.toString(16).padStart(2, '0');
//      scriptHex += mimeBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
//      scriptHex += '00';
     
//      const filenameBytes = Utils.toArray(filename, 'utf8');
//      scriptHex += filenameBytes.length.toString(16).padStart(2, '0');
//      scriptHex += filenameBytes.map(b => b.toString(16).padStart(2, '0')).join('');
     
//      scriptHex += '00';
     
//      for (const txid of chunkTxIds) {
//        scriptHex += '20';
//        for (let i = txid.length - 2; i >= 0; i -= 2) {
//          scriptHex += txid.substr(i, 2);
//        }
//      }
     
//      const bcatScript = Script.fromHex(scriptHex);
     
//      tx.addOutput({
//        lockingScript: bcatScript,
//        satoshis: 0
//      });
     
//      const change = totalInput - 1 - estimatedFee;
     
//      if (change > 546) {
//        tx.addOutput({
//          lockingScript: new P2PKH().lock(address),
//          satoshis: change
//        });
//      }
     
//      await tx.sign();
//      const txHex = tx.toHex();
     
//      const broadcastService = new BroadcastService(network, (message: string) => {
//        setStatus({ 
//          type: 'info', 
//          message: `BCAT Reference TX: ${message}` 
//        });
//      });
//      const result = await broadcastService.broadcast(txHex);
     
//      if (result.success) {
//        setLastTxid(result.txid!);
//        setLastTransactionTime(Date.now());
       
//        const successMessage = usePropertyForm 
//          ? `Property BCAT created successfully!\nMain TX: ${result.txid}\nProperty: "${alertDialogTitle}"\nChunks: ${chunkTxIds.length}`
//          : `BCAT file created successfully!\nMain TX: ${result.txid}\nFile: "${filename}"\nChunks: ${chunkTxIds.length}`;
       
//        setStatus({ 
//          type: 'success', 
//          message: successMessage 
//        });
       
//        // Clear form
//        if (usePropertyForm) {
//          setFormData({
//            propertyName: '',
//            receptionDetails: '',
//            hotelRoomDescription: '',
//            additionalHotelFeatures: '',
//            cancellationPolicy: '',
//            yourRole: '',
//            sellersName: '',
//            contactDetails: '',
//          });
//          setRoomPhotos([]);
//          setHotelPhotos([]);
//          setFacilitiesPhotos([]);
//          setProfileImage(null);
//          setAlertDialogImage(null);
//        } else {
//          setLargeProfileFile(null);
//          setLargeProfileThumbnail('');
//        }
//        setChunkStates([]);
//      } else {
//        throw new Error(result.error || 'Failed to broadcast BCAT transaction');
//      }
     
//    } catch (error) {
//      console.error('Error creating BCAT inscription:', error);
//      setStatus({ 
//        type: 'error', 
//        message: error instanceof Error ? error.message : 'Failed to create BCAT inscription' 
//      });
//    } finally {
//      setLoading(false);
//    }
//  };

//  const allChunksComplete = getAllChunksComplete();

//  return (
//    <div className="space-y-4">
//      {/* Tab Navigation */}
//      <div className="flex gap-2 border-b border-gray-600">
//        <button
//          onClick={() => setActiveTab('create')}
//          className={`px-4 py-2 font-medium transition-all ${
//            activeTab === 'create'
//              ? 'text-purple-400 border-b-2 border-purple-400'
//              : 'text-gray-400 hover:text-gray-300'
//          }`}
//        >
//          📤 Create BCAT
//        </button>
//        {/* <button
//          onClick={() => setActiveTab('view')}
//          className={`px-4 py-2 font-medium transition-all ${
//            activeTab === 'view'
//              ? 'text-purple-400 border-b-2 border-purple-400'
//              : 'text-gray-400 hover:text-gray-300'
//          }`}
//        >
//          📦 View & Reconstruct
//        </button> */}
//      </div>

//      {activeTab === 'create' ? (
//        <>
//          {/* Mode Selection */}
//          <div className="flex gap-2">
//            {/* <button
//              onClick={() => {
//                setUsePropertyForm(false);
//                setChunkStates([]);
//              }}
//              className={`flex-1 py-2 px-4 rounded ${!usePropertyForm ? 'bg-purple-500 text-white' : 'bg-gray-600 text-gray-300'}`}
//            >
//              📁 Standard File Upload
//            </button> */}
//            <button
//              onClick={() => {
//                setUsePropertyForm(true);
//                setChunkStates([]);
//              }}
//              className={`flex-1 py-2 px-4 rounded ${usePropertyForm ? 'bg-purple-500 text-white' : 'bg-gray-600 text-gray-300'}`}
//            >
//              🏠 Property Listing Form
//            </button>
//          </div>

//          {/* Chunk Configuration - Always visible when chunks exist */}
//          {chunkStates.length > 0 && (
//            <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
//              <p className="text-sm text-yellow-300">
//                📦 {usePropertyForm ? 'Property data' : 'File'} ready for BCAT upload
//              </p>
//              <div className="flex items-center gap-2 mt-2">
//                <label className="text-xs text-yellow-200">Chunk size:</label>
//                <input
//                  type="number"
//                  min="0.1"
//                  max="10"
//                  step="0.1"
//                  value={customChunkSize}
//                  onChange={(e) => handleChunkSizeChange(e.target.value)}
//                  className="px-2 py-1 w-20 bg-gray-800 border border-gray-600 rounded text-white text-xs"
//                  disabled={isProcessing}
//                />
//                <span className="text-xs text-yellow-200">MB per chunk</span>
//                <button
//                  onClick={() => handleChunkSizeChange('2.0')}
//                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
//                >
//                  Reset to 2MB
//                </button>
//              </div>
//            </div>
//          )}

//          {/* Standard File Upload Mode */}
//          {!usePropertyForm && !chunkStates.length && (
//            <>
//              <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
//                <p className="text-sm text-yellow-300">
//                  📦 BCAT Protocol - Store large files across multiple transactions
//                </p>
//                <div className="flex items-center gap-2 mt-2">
//                  <label className="text-xs text-yellow-200">Chunk size:</label>
//                  <input
//                    type="number"
//                    min="0.1"
//                    max="10"
//                    step="0.1"
//                    value={customChunkSize}
//                    onChange={(e) => handleChunkSizeChange(e.target.value)}
//                    className="px-2 py-1 w-20 bg-gray-800 border border-gray-600 rounded text-white text-xs"
//                    disabled={isProcessing}
//                  />
//                  <span className="text-xs text-yellow-200">MB per chunk</span>
//                  <button
//                    onClick={() => handleChunkSizeChange('2.0')}
//                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
//                  >
//                    Reset to 2MB
//                  </button>
//                </div>
//              </div>

//              <div>
//                <label className="block text-sm font-medium text-gray-300 mb-2">Upload Large File</label>
//                <input
//                  type="file"
//                  onChange={handleLargeFileSelect}
//                  className="hidden"
//                  id="large-file-upload"
//                  disabled={isProcessing || loading}
//                />
//                <label
//                  htmlFor="large-file-upload"
//                  className={`block w-full p-8 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors ${
//                    (isProcessing || loading) ? 'opacity-50 cursor-not-allowed' : ''
//                  }`}
//                >
//                  {largeProfileFile ? (
//                    <div className="text-center">
//                      {largeProfileThumbnail && (
//                        <img 
//                          src={largeProfileThumbnail} 
//                          alt="Thumbnail" 
//                          className="w-32 h-32 mx-auto rounded mb-3 object-cover"
//                        />
//                      )}
//                      <p className="text-sm font-medium text-white">{largeProfileFile.name}</p>
//                      <p className="text-sm text-gray-400 mt-1">
//                        Size: {(largeProfileFile.size / (1024 * 1024)).toFixed(2)}MB
//                      </p>
//                      <p className="text-xs text-purple-400 mt-2">
//                        {chunkStates.length} chunks of {chunkSizeMB}MB each
//                      </p>
//                    </div>
//                  ) : (
//                    <div className="text-center">
//                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//                      </svg>
//                      <p className="text-gray-400">Drop large file here or click to upload</p>
//                      <p className="text-xs text-gray-500 mt-1">Uses official BCAT protocol</p>
//                    </div>
//                  )}
//                </label>
//              </div>
//            </>
//          )}

//          {/* Property Form Mode */}
//          {usePropertyForm && !chunkStates.length && (
//            <Sheet open={showSheet} onOpenChange={setShowSheet}>
//              <SheetTrigger asChild>
//                <Button variant="outline" className="w-full">
//                  Create Property Listing
//                </Button>
//              </SheetTrigger>
//              <SheetContent className="h-screen max-h-screen overflow-y-auto w-[500px]">
//                <SheetHeader>
//                  <SheetTitle>Property Details</SheetTitle>
//                  <SheetDescription>
//                    Fill in property details and click Create BCAT Property when done.
//                  </SheetDescription>
//                </SheetHeader>

//                <form onSubmit={(e) => e.preventDefault()} className="grid gap-4 py-4">
//                  {/* All Original Form Inputs */}
//                  <div className="grid gap-2">
//                    <Label htmlFor="propertyName">Property Name</Label>
//                    <Input id="propertyName" placeholder="Property name*" value={formData.propertyName} onChange={handleChange} required />
//                  </div>

//                  <CounterInput id="numberOfGuests" label="How many guests" value={numberOfGuests} setValue={setNumberOfGuests} />
//                  <CounterInput id="numberOfBathrooms" label="Bathrooms" value={numberOfBathrooms} setValue={setNumberOfBathrooms} />
//                  <CounterInput id="numberOfSingleBeds" label="Single beds" value={numberOfSingleBeds} setValue={setNumberOfSingleBeds} />
//                  <CounterInput id="numberOfQueenBeds" label="Queen beds" value={numberOfQueenBeds} setValue={setNumberOfQueenBeds} />
//                  <CounterInput id="numberOfKingBeds" label="King beds" value={numberOfKingBeds} setValue={setNumberOfKingBeds} />
//                  <CounterInput id="numberOfKidBeds" label="Kid beds" value={numberOfKidBeds} setValue={setNumberOfKidBeds} />
//                  <CounterInput id="numberOfTufanBeds" label="Tufan beds" value={numberOfTufanBeds} setValue={setNumberOfTufanBeds} />

//                  <div className="grid gap-2">
//                    <Label htmlFor="hotelRoomForOccupants">Hotel room for occupants</Label>
//                    <RadioGroup value={hotelRoomForOccupants} onValueChange={handleRadioChange(setHotelRoomForOccupants)}>
//                      {['Single Room', 'Twin Room', 'Double Room', 'Triple Room', 'Quadruple Room'].map(option => (
//                        <div key={option} className="flex items-center space-x-2">
//                          <RadioGroupItem value={option} id={option} />
//                          <Label htmlFor={option}>{option}</Label>
//                        </div>
//                      ))}
//                    </RadioGroup>
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="hotelRoomBedType">Hotel room bed type</Label>
//                    <RadioGroup value={hotelRoomBedType} onValueChange={handleRadioChange(setHotelRoomBedType)}>
//                      {['Single', 'Queen Room', 'King Room', 'Hollywood Twin Room'].map(option => (
//                        <div key={option} className="flex items-center space-x-2">
//                          <RadioGroupItem value={option} id={option} />
//                          <Label htmlFor={option}>{option}</Label>
//                        </div>
//                      ))}
//                    </RadioGroup>
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="arrangementAndFacilities">Arrangement and Facilities</Label>
//                    <RadioGroup value={arrangementAndFacilities} onValueChange={handleRadioChange(setArrangementAndFacilities)}>
//                      {['Studio Room', 'Duplex Room', 'Deluxe Room', 'Adjoining Room', 'Apartment-Style Room'].map(option => (
//                        <div key={option} className="flex items-center space-x-2">
//                          <RadioGroupItem value={option} id={option} />
//                          <Label htmlFor={option}>{option}</Label>
//                        </div>
//                      ))}
//                    </RadioGroup>
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="otherTypesOfHotelRooms">Other types of hotel Rooms</Label>
//                    <RadioGroup value={otherTypesOfHotelRooms} onValueChange={handleRadioChange(setOtherTypesOfHotelRooms)}>
//                      {['Suite', 'Junior Suite', 'Presidential Suite', 'Penthouse Suite', 'Cabana', 'Villa'].map(option => (
//                        <div key={option} className="flex items-center space-x-2">
//                          <RadioGroupItem value={option} id={option} />
//                          <Label htmlFor={option}>{option}</Label>
//                        </div>
//                      ))}
//                    </RadioGroup>
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Hotel Room Facilities</Label>
//                    {['Shampoo', 'Conditioner', 'Lotion', 'Coffee maker', 'Mini Bar', 'Free WiFi'].map(option => (
//                      <div key={option} className="flex items-center space-x-2">
//                        <Checkbox
//                          checked={hotelRoomFacilities.includes(option)}
//                          onCheckedChange={() => handleMultiSelectChange(setHotelRoomFacilities, option)}
//                        />
//                        <Label>{option}</Label>
//                      </div>
//                    ))}
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Free WiFi</Label>
//                    <RadioGroup value={freeWifi} onValueChange={setFreeWifi}>
//                      {['Yes', 'No'].map(option => (
//                        <div key={option} className="flex items-center space-x-2">
//                          <RadioGroupItem value={option} id={`freeWifi-${option}`} />
//                          <Label htmlFor={`freeWifi-${option}`}>{option}</Label>
//                        </div>
//                      ))}
//                    </RadioGroup>
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="receptionDetails">Reception Details</Label>
//                    <textarea
//                      id="receptionDetails"
//                      placeholder="Reception details"
//                      value={formData.receptionDetails}
//                      onChange={handleChange}
//                      className="resize-none w-full rounded-md border px-3 py-1"
//                      rows={3}
//                      required
//                    />
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Gym or Fitness</Label>
//                    <RadioGroup value={gymOrFitness} onValueChange={handleRadioChange(setGymOrFitness)}>
//                      {['Yes', 'No'].map(option => (
//                        <div key={option} className="flex items-center space-x-2">
//                          <RadioGroupItem value={option} id={`gym-${option}`} />
//                          <Label htmlFor={`gym-${option}`}>{option}</Label>
//                        </div>
//                      ))}
//                    </RadioGroup>
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Dedicated Workstation</Label>
//                    <RadioGroup value={dedicatedWorkstation} onValueChange={handleRadioChange(setDedicatedWorkstation)}>
//                      {['Yes', 'No'].map(option => (
//                        <div key={option} className="flex items-center space-x-2">
//                          <RadioGroupItem value={option} id={`workstation-${option}`} />
//                          <Label htmlFor={`workstation-${option}`}>{option}</Label>
//                        </div>
//                      ))}
//                    </RadioGroup>
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Spa Facilities</Label>
//                    {['Sauna', 'Steam', 'Massage', 'Yoga', 'Hot-tub', 'Pool'].map(option => (
//                      <div key={option} className="flex items-center space-x-2">
//                        <Checkbox
//                          checked={spaFacilities.includes(option)}
//                          onCheckedChange={() => handleMultiSelectChange(setSpaFacilities, option)}
//                        />
//                        <Label>{option}</Label>
//                      </div>
//                    ))}
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="hotelRoomDescription">Hotel Room Description</Label>
//                    <textarea
//                      id="hotelRoomDescription"
//                      placeholder="Describe the room..."
//                      value={formData.hotelRoomDescription}
//                      onChange={handleChange}
//                      className="resize-none w-full rounded-md border px-3 py-1"
//                      rows={4}
//                      required
//                    />
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>General</Label>
//                    {['Air Conditioning', 'Heating', 'Flat screen TV', 'Balcony', 'Garden view', 'Safe'].map(option => (
//                      <div key={option} className="flex items-center space-x-2">
//                        <Checkbox
//                          checked={general.includes(option)}
//                          onCheckedChange={() => handleMultiSelectChange(setGeneral, option)}
//                        />
//                        <Label>{option}</Label>
//                      </div>
//                    ))}
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="additionalHotelFeatures">Additional Hotel Features</Label>
//                    <textarea
//                      id="additionalHotelFeatures"
//                      placeholder="Additional features..."
//                      value={formData.additionalHotelFeatures}
//                      onChange={handleChange}
//                      className="resize-none w-full rounded-md border px-3 py-1"
//                      rows={3}
//                    />
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Rules</Label>
//                    {Object.entries(rules).filter(([key]) => key !== 'additionalRules').map(([key, value]) => (
//                      <RadioGroup key={key} value={value} onValueChange={(newValue) => setRules(prev => ({ ...prev, [key]: newValue }))}>
//                        <div className="flex items-center justify-between">
//                          <Label>{key.replace('allowed', ' allowed').charAt(0).toUpperCase() + key.replace('allowed', ' allowed').slice(1)}</Label>
//                          <div className="flex items-center space-x-4">
//                            <div className="flex items-center space-x-2">
//                              <RadioGroupItem value="Yes" id={`${key}-yes`} />
//                              <Label htmlFor={`${key}-yes`}>Yes</Label>
//                            </div>
//                            <div className="flex items-center space-x-2">
//                              <RadioGroupItem value="No" id={`${key}-no`} />
//                              <Label htmlFor={`${key}-no`}>No</Label>
//                            </div>
//                          </div>
//                        </div>
//                      </RadioGroup>
//                    ))}
//                    <textarea
//                      placeholder="Additional rules..."
//                      value={rules.additionalRules}
//                      onChange={(e) => setRules(prev => ({ ...prev, additionalRules: e.target.value }))}
//                      className="resize-none w-full rounded-md border px-3 py-1"
//                      rows={2}
//                    />
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Check-in Times</Label>
//                    <div className="flex space-x-2">
//                      <TimePicker 
//                        value={checkInFrom ? moment(checkInFrom, 'HH:mm') : null} 
//                        onChange={(_, timeString) => setCheckInFrom(timeString as string)} 
//                        format="HH:mm"
//                        placeholder="From"
//                      />
//                      <TimePicker 
//                        value={checkInUntil ? moment(checkInUntil, 'HH:mm') : null} 
//                        onChange={(_, timeString) => setCheckInUntil(timeString as string)} 
//                        format="HH:mm"
//                        placeholder="Until"
//                      />
//                    </div>
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Check-out Times</Label>
//                    <div className="flex space-x-2">
//                      <TimePicker 
//                        value={checkOutFrom ? moment(checkOutFrom, 'HH:mm') : null} 
//                        onChange={(_, timeString) => setCheckOutFrom(timeString as string)} 
//                        format="HH:mm"
//                        placeholder="From"
//                      />
//                      <TimePicker 
//                        value={checkOutUntil ? moment(checkOutUntil, 'HH:mm') : null} 
//                        onChange={(_, timeString) => setCheckOutUntil(timeString as string)} 
//                        format="HH:mm"
//                        placeholder="Until"
//                      />
//                    </div>
//                  </div>

//                  {/* Image Uploads */}
//                  <div className="grid gap-2">
//                    <Label>Room Photos</Label>
//                    <div className="border-dashed border-2 border-gray-300 p-2 rounded-md text-center cursor-pointer h-24" onClick={() => document.getElementById('roomPhotos')?.click()}>
//                      <input id="roomPhotos" type="file" accept="image/*" multiple onChange={handleFileUpload(setRoomPhotos)} className="hidden" />
//                      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
//                      <p className="text-gray-600 text-xs">Click to select room photos</p>
//                    </div>
//                    {roomPhotos.length > 0 && (
//                      <div className="grid grid-cols-3 gap-2">
//                        {roomPhotos.map((photo, index) => (
//                          <div key={index} className="relative">
//                            <img src={URL.createObjectURL(photo)} alt={`Room ${index}`} className="w-full h-20 object-cover rounded" />
//                            <button onClick={() => handleImageRemove(setRoomPhotos, index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">×</button>
//                          </div>
//                        ))}
//                      </div>
//                    )}
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Hotel Photos</Label>
//                    <div className="border-dashed border-2 border-gray-300 p-2 rounded-md text-center cursor-pointer h-24" onClick={() => document.getElementById('hotelPhotos')?.click()}>
//                      <input id="hotelPhotos" type="file" accept="image/*" multiple onChange={handleFileUpload(setHotelPhotos)} className="hidden" />
//                      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
//                      <p className="text-gray-600 text-xs">Click to select hotel photos</p>
//                    </div>
//                    {hotelPhotos.length > 0 && (
//                      <div className="grid grid-cols-3 gap-2">
//                        {hotelPhotos.map((photo, index) => (
//                          <div key={index} className="relative">
//                            <img src={URL.createObjectURL(photo)} alt={`Hotel ${index}`} className="w-full h-20 object-cover rounded" />
//                            <button onClick={() => handleImageRemove(setHotelPhotos, index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">×</button>
//                          </div>
//                        ))}
//                      </div>
//                    )}
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Facilities Photos</Label>
//                    <div className="border-dashed border-2 border-gray-300 p-2 rounded-md text-center cursor-pointer h-24" onClick={() => document.getElementById('facilitiesPhotos')?.click()}>
//                      <input id="facilitiesPhotos" type="file" accept="image/*" multiple onChange={handleFileUpload(setFacilitiesPhotos)} className="hidden" />
//                      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
//                      <p className="text-gray-600 text-xs">Click to select facilities photos</p>
//                    </div>
//                    {facilitiesPhotos.length > 0 && (
//                      <div className="grid grid-cols-3 gap-2">
//                        {facilitiesPhotos.map((photo, index) => (
//                          <div key={index} className="relative">
//                            <img src={URL.createObjectURL(photo)} alt={`Facility ${index}`} className="w-full h-20 object-cover rounded" />
//                            <button onClick={() => handleImageRemove(setFacilitiesPhotos, index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">×</button>
//                          </div>
//                        ))}
//                      </div>
//                    )}
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
//                    <textarea
//                      id="cancellationPolicy"
//                      placeholder="Cancellation policy details..."
//                      value={formData.cancellationPolicy}
//                      onChange={handleChange}
//                      className="resize-none w-full rounded-md border px-3 py-1"
//                      rows={3}
//                      required
//                    />
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="yourRole">Your Role</Label>
//                    <Input id="yourRole" placeholder="Your role with the property" value={formData.yourRole} onChange={handleChange} required />
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Property Host Profile</Label>
//                    <div className="border-dashed border-2 border-gray-300 p-4 rounded-md text-center cursor-pointer" onClick={() => document.getElementById('profileImage')?.click()}>
//                      <input id="profileImage" type="file" accept="image/*" onChange={handleProfileImageChange} className="hidden" />
//                      {profileImage ? (
//                        <div className="relative inline-block">
//                          <img src={URL.createObjectURL(profileImage)} alt="Profile" className="w-24 h-24 object-cover rounded-full" />
//                          <button onClick={(e) => { e.stopPropagation(); handleProfileImageRemove(); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 text-xs">×</button>
//                        </div>
//                      ) : (
//                        <>
//                          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
//                          <p className="text-gray-600 text-xs">Upload host profile image</p>
//                        </>
//                      )}
//                    </div>
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="sellersName">Host's Name</Label>
//                    <Input id="sellersName" placeholder="Host's name" value={formData.sellersName} onChange={handleChange} required />
//                  </div>

//                  <div className="grid gap-2">
//                    <Label htmlFor="contactDetails">Contact Details</Label>
//                    <Input id="contactDetails" placeholder="Contact details" value={formData.contactDetails} onChange={handleChange} required />
//                  </div>

//                  <div className="grid gap-2">
//                    <Label>Host Languages</Label>
//                    {languages.slice(0, showMore ? languages.length : 4).map((language) => (
//                      <div key={language} className="flex items-center space-x-2">
//                        <Checkbox
//                          checked={selectedLanguages.includes(language)}
//                          onCheckedChange={() => handleLanguageChange(language)}
//                        />
//                        <Label>{language}</Label>
//                      </div>
//                    ))}
//                    <button
//                      type="button"
//                      onClick={() => setShowMore(!showMore)}
//                      className="text-blue-600 text-sm text-left"
//                    >
//                      {showMore ? "Show less" : "Show more"}
//                    </button>
//                  </div>

//                  <p className="text-sm text-gray-600">Total size: {totalSizeMb} MB</p>

//                  <SheetFooter>
//                    <AlertDialogDemo 
//                      totalSizeMb={totalSizeMb}
//                      handleImageChange={handleAlertDialogImageChange}
//                      handleImageRemove={handleAlertDialogImageRemove}
//                      image={alertDialogImage ? URL.createObjectURL(alertDialogImage) : null}
//                      handleSubmit={handleFinalSubmit}
//                    />
//                  </SheetFooter>
//                </form>
//              </SheetContent>
//            </Sheet>
//          )}

//          {/* Upload Mode Selection - Shown for both modes when chunks exist  Create BCAT Property */}
//          {chunkStates.length > 0 && (
//            <div className="p-3 bg-gray-800 rounded-lg">
//              <div className="flex items-center gap-4">
//                <span className="text-sm text-gray-300">Upload Mode:</span>
//                <label className="flex items-center gap-2">
//                  <input
//                    type="radio"
//                    value="sequential"
//                    checked={processingMode === 'sequential'}
//                    onChange={() => setProcessingMode('sequential')}
//                    disabled={isProcessing}
//                  />
//                  <span className="text-sm text-gray-300">Sequential (Auto)</span>
//                </label>
//                <label className="flex items-center gap-2">
//                  <input
//                    type="radio"
//                    value="manual"
//                    checked={processingMode === 'manual'}
//                    onChange={() => setProcessingMode('manual')}
//                    disabled={isProcessing}
//                  />
//                  <span className="text-sm text-gray-300">Manual (Individual Control)</span>
//                </label>
//              </div>
//            </div>
//          )}

//          {/* Chunk Upload Status - Shown for both modes when chunks exist */}
//          {chunkStates.length > 0 && (
//            <div className="p-4 bg-gray-800 rounded-lg space-y-3">
//              <div className="flex justify-between items-center">
//                <h4 className="text-sm font-medium text-gray-300">
//                  Chunk Upload Status 
//                  ({chunkStates.filter(s => s.status === 'success').length}/{chunkStates.length} complete)
//                </h4>
//                <div className="flex gap-2">
//                  {processingMode === 'sequential' && !allChunksComplete && (
//                    <>
//                      {!isProcessing ? (
//                        <button
//                          onClick={processChunksSequentially}
//                          className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded"
//                        >
//                          Start Upload
//                        </button>
//                      ) : (
//                        <>
//                          {!isPaused ? (
//                            <>
//                              <button
//                                onClick={pauseProcessing}
//                                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded"
//                              >
//                                Pause
//                              </button>
//                              <button
//                                onClick={stopProcessing}
//                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
//                              >
//                                Stop
//                              </button>
//                            </>
//                          ) : (
//                            <>
//                              <button
//                                onClick={resumeProcessing}
//                                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded"
//                              >
//                                Resume
//                              </button>
//                              <button
//                                onClick={stopProcessing}
//                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
//                              >
//                                Stop
//                              </button>
//                            </>
//                          )}
//                        </>
//                      )}
//                    </>
//                  )}
//                  {allChunksComplete && (
//                    <span className="px-3 py-1 bg-green-500 text-white text-sm rounded">
//                      All Complete
//                    </span>
//                  )}
//                </div>
//              </div>
             
//              {/* Progress bar Resume */}
//              {isProcessing && currentProcessingIndex !== null && (
//                <div>
//                  <p className="text-sm text-gray-300 mb-2">
//                    {isPaused ? 'Paused at' : 'Uploading'} chunk {currentProcessingIndex + 1} of {chunkStates.length}
//                  </p>
//                  <div className="w-full bg-gray-700 rounded-full h-2">
//                    <div 
//                      className="bg-purple-500 h-2 rounded-full transition-all"
//                      style={{ width: `${((currentProcessingIndex + 1) / chunkStates.length) * 100}%` }}
//                    />
//                  </div>
//                </div>
//              )}
             
//              {/* Chunk list */}
//              <div className="space-y-1 max-h-64 overflow-y-auto">
//                {chunkStates.map((state) => (
//                  <div 
//                    key={state.chunkIndex} 
//                    className={`flex items-center justify-between text-xs p-2 rounded ${
//                      state.status === 'success' ? 'bg-green-900 bg-opacity-30' :
//                      state.status === 'failed' ? 'bg-red-900 bg-opacity-30' :
//                      state.status === 'uploading' ? 'bg-blue-900 bg-opacity-30' :
//                      'bg-gray-700'
//                    }`}
//                  >
//                    <span className="text-gray-300 font-medium">
//                      Chunk {state.chunkIndex + 1}
//                      {state.attempts > 0 && ` (Attempts: ${state.attempts})`}
//                    </span>
//                    <div className="flex items-center gap-2">
//                      {state.status === 'success' && state.txid && (
//                        <a 
//                          href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${state.txid}`}
//                          target="_blank"
//                          rel="noopener noreferrer"
//                          className="text-green-400 hover:text-green-300"
//                        >
//                          {state.txid.substring(0, 8)}...
//                        </a>
//                      )}
//                      {state.status === 'failed' && (
//                        <>
//                          <span className="text-red-400" title={state.error}>
//                            {state.error?.includes('timeout') ? 'Timeout' : 
//                             state.error?.includes('mempool') ? 'Conflict' : 'Failed'}
//                          </span>
//                          <button
//                            onClick={() => uploadChunk(state.chunkIndex)}
//                            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded"
//                            disabled={isProcessing}
//                          >
//                            Retry
//                          </button>
//                        </>
//                      )}
//                      {state.status === 'uploading' && (
//                        <span className="text-blue-400">Uploading...</span>
//                      )}
//                      {state.status === 'pending' && (
//                        <>
//                          <span className="text-gray-400">Pending</span>
//                          {processingMode === 'manual' && (
//                            <button
//                              onClick={() => uploadChunk(state.chunkIndex)}
//                              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
//                              disabled={isProcessing}
//                            >
//                              Upload
//                            </button>
//                          )}
//                        </>
//                      )}
//                    </div>
//                  </div>
//                ))}
//              </div>
//            </div>
//          )}

//          {/* Create BCAT button */}
//          {chunkStates.length > 0 && allChunksComplete && (
//            <button
//              onClick={createLargeProfileOrdinal}
//              disabled={loading}
//              className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
//            >
//              {loading ? 'Creating BCAT Reference...' : 
//               usePropertyForm ? 'Create Property BCAT Reference' : 'Create BCAT Reference Transaction'}
//            </button>
//          )}
//        </>
//      ) : (
//        <BCATViewer
//          keyData={keyData}
//          network={network}
//          whatsOnChainApiKey={whatsOnChainApiKey}
//        />
//      )}
//    </div>
//  );
// };

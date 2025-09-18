import React, { useState } from 'react';
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
import { EncryptionLevel, getEncryptionLevelColor, getEncryptionLevelLabel } from '../../components/wallet2/inscriptions/utils/BlogEncryption';

// Types
export interface FormData {
  propertyName: string;
  receptionDetails: string;
  hotelRoomDescription: string;
  additionalHotelFeatures: string;
  cancellationPolicy: string;
  yourRole: string;
  sellersName: string;
  contactDetails: string;
}

export interface PropertySheetProps {
  showSheet: boolean;
  setShowSheet: (show: boolean) => void;
  onSubmit: (data: any) => void;
  blogKeyHistory?: any;
}

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

// Main Property Sheet Component
export const PropertySheet: React.FC<PropertySheetProps> = ({
  showSheet,
  setShowSheet,
  onSubmit,
  blogKeyHistory
}) => {
  // Form state
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

  // Room configuration
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [numberOfBathrooms, setNumberOfBathrooms] = useState(1);
  const [numberOfSingleBeds, setNumberOfSingleBeds] = useState(0);
  const [numberOfQueenBeds, setNumberOfQueenBeds] = useState(0);
  const [numberOfKingBeds, setNumberOfKingBeds] = useState(0);
  const [numberOfKidBeds, setNumberOfKidBeds] = useState(0);
  const [numberOfTufanBeds, setNumberOfTufanBeds] = useState(0);

  // Room types and facilities
  const [hotelRoomForOccupants, setHotelRoomForOccupants] = useState('');
  const [hotelRoomBedType, setHotelRoomBedType] = useState('');
  const [arrangementAndFacilities, setArrangementAndFacilities] = useState('');
  const [otherTypesOfHotelRooms, setOtherTypesOfHotelRooms] = useState('');
  const [hotelRoomFacilities, setHotelRoomFacilities] = useState<string[]>([]);
  const [gymOrFitness, setGymOrFitness] = useState('');
  const [dedicatedWorkstation, setDedicatedWorkstation] = useState('');
  const [spaFacilities, setSpaFacilities] = useState<string[]>([]);
  const [general, setGeneral] = useState<string[]>([]);
  const [freeWifi, setFreeWifi] = useState('Yes');

  // Check-in/out times
  const [checkInFrom, setCheckInFrom] = useState('');
  const [checkInUntil, setCheckInUntil] = useState('');
  const [checkOutFrom, setCheckOutFrom] = useState('');
  const [checkOutUntil, setCheckOutUntil] = useState('');

  // Rules
  const [rules, setRules] = useState({
    smokingallowed: 'No',
    petsallowed: 'No',
    childrenallowed: 'No',
    partieseventsallowed: 'No',
    additionalRules: ''
  });

  // Languages
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

  // Calculate total size
  const calculateTotalSize = () => {
    const textFields = Object.values(formData).reduce((total, field) => total + new Blob([field]).size, 0);
    const imagesSize = [...roomPhotos, ...hotelPhotos, ...facilitiesPhotos].reduce((total, image) => total + image.size, 0);
    const profileImageSize = profileImage ? profileImage.size : 0;
    const alertDialogImageSize = alertDialogImage ? alertDialogImage.size : 0;
    const totalSizeBytes = textFields + imagesSize + profileImageSize + alertDialogImageSize;
    return parseFloat((totalSizeBytes / (1024 * 1024)).toFixed(2));
  };

  const totalSizeMb = calculateTotalSize();

  // Helper functions
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
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
    if (file) setProfileImage(file);
  };

  const handleProfileImageRemove = () => {
    setProfileImage(null);
  };

  const handleAlertDialogImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAlertDialogImage(file);
  };

  const handleAlertDialogImageRemove = () => {
    setAlertDialogImage(null);
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguages(prev =>
      prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]
    );
  };

  // Handle final submission
  const handleFinalSubmit = (title: string, description: string, encryptionLevel: number) => {
    const allFormData = {
      title,
      description,
      encryptionLevel,
      formData,
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
      roomPhotos,
      hotelPhotos,
      facilitiesPhotos,
      profileImage,
      alertDialogImage
    };
    
    onSubmit(allFormData);
    setShowSheet(false);
  };

  return (
    <Sheet open={showSheet} onOpenChange={setShowSheet}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full">
          Create Property Listing 5.0
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

          {/* Room Configuration Counters */}
          <CounterInput id="numberOfGuests" label="How many guests" value={numberOfGuests} setValue={setNumberOfGuests} />
          <CounterInput id="numberOfBathrooms" label="Bathrooms" value={numberOfBathrooms} setValue={setNumberOfBathrooms} />
          <CounterInput id="numberOfSingleBeds" label="Single beds" value={numberOfSingleBeds} setValue={setNumberOfSingleBeds} />
          <CounterInput id="numberOfQueenBeds" label="Queen beds" value={numberOfQueenBeds} setValue={setNumberOfQueenBeds} />
          <CounterInput id="numberOfKingBeds" label="King beds" value={numberOfKingBeds} setValue={setNumberOfKingBeds} />
          <CounterInput id="numberOfKidBeds" label="Kid beds" value={numberOfKidBeds} setValue={setNumberOfKidBeds} />
          <CounterInput id="numberOfTufanBeds" label="Tufan beds" value={numberOfTufanBeds} setValue={setNumberOfTufanBeds} />

          {/* Hotel Room Types */}
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

          {/* General Facilities */}
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
  );
};
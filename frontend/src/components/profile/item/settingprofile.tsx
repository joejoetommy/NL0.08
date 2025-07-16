import React, { useState, useEffect } from 'react';
import { Button } from "../../ui/button";
import { useForm } from 'react-hook-form';
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { UploadCloud } from "lucide-react";
import { FaCog } from 'react-icons/fa';
import { 
  getProfileData, 
  updateProfileData, 
  createNewProfile, 
  ProfileData,
  getCurrentProfileNumber,
  getAllProfiles,
  switchToProfile
} from '../data/profiledata';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../ui/tabs";

// Define the event constant locally to avoid circular dependencies
const PROFILE_CHANGE_EVENT = 'profileChanged';

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  totalSizeMb: number;
  handleSubmit: () => void;
  isNewProfile: boolean;
  username: string;
  title: string;
  mision: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  onOpenChange, 
  totalSizeMb, 
  handleSubmit,
  isNewProfile,
  username,
  title,
  mision
}) => {
  const [calculatedSizeMb, setCalculatedSizeMb] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Calculate text size when dialog opens using the current form values
      const textSizeBytes = new Blob([username, title, mision]).size;
      const textSizeMb = textSizeBytes / (1024 * 1024);
      
      // Add text size to the total image size
      setCalculatedSizeMb(totalSizeMb + textSizeMb);
    }
  }, [isOpen, totalSizeMb, username, title, mision]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Confirm Profile {isNewProfile ? 'Creation' : 'Update'}</DialogTitle>
          <DialogDescription>
            <br />
            Total data size: {calculatedSizeMb.toFixed(2)} MB
            <br />
            {isNewProfile 
              ? 'This will create a new profile with the next available number.' 
              : 'This will update the current profile with your changes.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex space-x-4">
            <div className="flex-1 flex justify-center items-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </div>
            <div className="flex-1 flex justify-center items-center">
              <Button 
                className='bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out' 
                type="button" 
                variant="secondary" 
                onClick={handleSubmit}
              >
                Complete transaction
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface SwitchProfileConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  handleSubmit: () => void;
  targetProfile: string;
}

const SwitchProfileConfirmDialog: React.FC<SwitchProfileConfirmDialogProps> = ({ 
  isOpen, 
  onOpenChange, 
  handleSubmit,
  targetProfile 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Confirm Profile Switch</DialogTitle>
          <DialogDescription>
            <br />
            Are you sure you want to switch to {targetProfile}?
            <br />
            This will change your active profile.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex space-x-4">
            <div className="flex-1 flex justify-center items-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </div>
            <div className="flex-1 flex justify-center items-center">
              <Button 
                className='bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out' 
                type="button" 
                variant="secondary" 
                onClick={handleSubmit}
              >
                Switch Profile
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface SettingProfileProps {
  className?: string;
  onProfileUpdate?: () => void;
}

const SettingProfile: React.FC<SettingProfileProps> = ({ className, onProfileUpdate }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSwitchProfileConfirmOpen, setIsSwitchProfileConfirmOpen] = useState(false);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [selectedProfileNumber, setSelectedProfileNumber] = useState(getCurrentProfileNumber());
  const [pendingProfileSwitch, setPendingProfileSwitch] = useState<string>('');
  const [activeTab, setActiveTab] = useState('edit');
  
  // Form state
  const [backgroundImage, setBackgroundImage] = useState<string | File | null>(null);
  const [profileImage, setProfileImage] = useState<string | File | null>(null);
  const [username, setUsername] = useState('');
  const [title, setTitle] = useState('');
  const [mision, setMision] = useState('');
  const [totalSizeMb, setTotalSizeMb] = useState<number>(0);
  
  // View state for tab 2
  const [viewBackgroundImage, setViewBackgroundImage] = useState<string | null>(null);
  const [viewProfileImage, setViewProfileImage] = useState<string | null>(null);
  const [viewUsername, setViewUsername] = useState('');
  const [viewTitle, setViewTitle] = useState('');
  const [viewMision, setViewMision] = useState('');
  const [viewLastUpdated, setViewLastUpdated] = useState<string>('');
  
  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    backgroundImage: null as string | File | null,
    profileImage: null as string | File | null,
    username: '',
    title: '',
    mision: ''
  });
  const [hasEdited, setHasEdited] = useState(false);

  // Format date function
  const formatAddedDate = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${hours}h ${minutes}min ${day}/${month}/${year}`;
  };

  // Load profile data when dialog opens or profile changes
  useEffect(() => {
    if (isDialogOpen && !isNewProfile) {
      const profileData = getProfileData();
      const bgImage = profileData.backgroundImage || null;
      const profImage = profileData.profileImage || null;
      const user = profileData.Profile.username || '';
      const ttl = profileData.Profile.title || '';
      const msn = profileData.Profile.mision || '';
      
      setBackgroundImage(bgImage);
      setProfileImage(profImage);
      setUsername(user);
      setTitle(ttl);
      setMision(msn);
      
      // Store original values
      setOriginalValues({
        backgroundImage: bgImage,
        profileImage: profImage,
        username: user,
        title: ttl,
        mision: msn
      });
      
      // Reset edit tracking
      setHasEdited(false);
    }
  }, [isDialogOpen, isNewProfile, selectedProfileNumber]);

  // Load view data when selected profile changes in tab 2
  useEffect(() => {
    if (activeTab === 'view' && selectedProfileNumber) {
      // Get all profiles and find the selected one
      const allProfiles = getAllProfiles();
      const selectedProfile = allProfiles.find(p => p.number === selectedProfileNumber);
      
      if (selectedProfile) {
        setViewBackgroundImage(selectedProfile.backgroundImage || null);
        setViewProfileImage(selectedProfile.profileImage || null);
        setViewUsername(selectedProfile.Profile?.username || selectedProfile.username || '');
        setViewTitle(selectedProfile.Profile?.title || selectedProfile.title || '');
        setViewMision(selectedProfile.Profile?.mision || selectedProfile.mision || '');
        setViewLastUpdated(selectedProfile.Profile?.lastUpdated || selectedProfile.lastUpdated || '');
      }
    }
  }, [activeTab, selectedProfileNumber]);

  // Reset form for new profile
  const resetFormForNewProfile = () => {
    setBackgroundImage(null);
    setProfileImage(null);
    setUsername('');
    setTitle('');
    setMision('');
    setIsNewProfile(true);
    setHasEdited(false);
  };

  const handleImageChange = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file);
    }
  };

  const handleFileRemove = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => () => {
    setter(null);
  };

  // Calculate total size (images only, text will be calculated in ConfirmDialog)
  useEffect(() => {
    const calculateSize = async () => {
      let totalSizeBytes = 0;
      
      // Calculate background image size
      if (backgroundImage instanceof File) {
        totalSizeBytes += backgroundImage.size;
      } else if (typeof backgroundImage === 'string' && backgroundImage) {
        // For existing images (URLs), estimate size
        if (backgroundImage.startsWith('#')) {
          // Color code
          totalSizeBytes += 50;
        } else if (backgroundImage.startsWith('blob:') || backgroundImage.startsWith('http')) {
          // For existing images, we need to fetch and calculate actual size
          try {
            const response = await fetch(backgroundImage);
            const blob = await response.blob();
            totalSizeBytes += blob.size;
          } catch (error) {
            // If fetch fails, use a reasonable estimate for an image
            totalSizeBytes += 500000; // 500KB estimate
          }
        }
      }
      
      // Calculate profile image size
      if (profileImage instanceof File) {
        totalSizeBytes += profileImage.size;
      } else if (typeof profileImage === 'string' && profileImage) {
        // For existing images (URLs), estimate size
        if (profileImage.startsWith('#')) {
          // Color code
          totalSizeBytes += 50;
        } else if (profileImage.startsWith('blob:') || profileImage.startsWith('http')) {
          // For existing images, we need to fetch and calculate actual size
          try {
            const response = await fetch(profileImage);
            const blob = await response.blob();
            totalSizeBytes += blob.size;
          } catch (error) {
            // If fetch fails, use a reasonable estimate for an image
            totalSizeBytes += 200000; // 200KB estimate for profile images
          }
        }
      }
      
      const totalSizeMb = totalSizeBytes / (1024 * 1024);
      setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
    };
    
    calculateSize();
  }, [backgroundImage, profileImage]);

  const handleSubmit = async () => {
    const profileData: ProfileData = {
      backgroundImage: typeof backgroundImage === 'string' 
        ? backgroundImage 
        : backgroundImage 
          ? URL.createObjectURL(backgroundImage) 
          : '#CCCCCC', // Default gray
      profileImage: typeof profileImage === 'string' 
        ? profileImage 
        : profileImage 
          ? URL.createObjectURL(profileImage) 
          : '#999999', // Default darker gray
      Profile: {
        username: username || 'User',
        title: title || 'No title',
        mision: mision || 'No mission statement',
      },
    };

    if (isNewProfile) {
      const newNumber = createNewProfile(profileData);
      console.log('New Profile Created with number:', newNumber);
    } else {
      updateProfileData(profileData);
      console.log('Profile Data Updated');
    }
    
    setIsConfirmDialogOpen(false);
    setIsDialogOpen(false);
    setIsNewProfile(false);
    
    // Emit profile change event
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    
    // Call the callback if provided
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  };

  const handleProfileSwitch = (value: string) => {
    if (value === 'new') {
      resetFormForNewProfile();
      setActiveTab('edit');
    } else {
      // Just update the selected profile number, don't open the confirm dialog
      setSelectedProfileNumber(parseInt(value, 10));
    }
  };

  const handleSwitchProfileClick = () => {
    setPendingProfileSwitch(selectedProfileNumber.toString());
    setIsSwitchProfileConfirmOpen(true);
  };

  const confirmProfileSwitch = () => {
    const profileNumber = parseInt(pendingProfileSwitch, 10);
    setIsNewProfile(false);
    switchToProfile(profileNumber);
    setSelectedProfileNumber(profileNumber);
    
    // Emit profile change event when switching profiles
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    
    // Call the callback if provided
    if (onProfileUpdate) {
      onProfileUpdate();
    }
    
    setIsSwitchProfileConfirmOpen(false);
    setPendingProfileSwitch('');
  };

  const { handleSubmit: formHandleSubmit } = useForm();
  const allProfiles = getAllProfiles();
  const currentProfile = allProfiles.find(p => p.number === getCurrentProfileNumber());

  const renderProfileForm = (isEditable: boolean) => {
    const bgImg = isEditable ? backgroundImage : viewBackgroundImage;
    const profImg = isEditable ? profileImage : viewProfileImage;
    const user = isEditable ? username : viewUsername;
    const ttl = isEditable ? title : viewTitle;
    const msn = isEditable ? mision : viewMision;

    return (
      <>
        <div className="grid gap-2">
          <Label htmlFor="backgroundImage" className="text-left">Background Image</Label>
          <div className="w-full flex justify-center">
            <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-40 relative overflow-hidden">
              {bgImg && (
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                  {typeof bgImg === 'string' && bgImg.startsWith('#') ? (
                    <div style={{ width: '100%', height: '100%', backgroundColor: bgImg }} />
                  ) : (
                    <img 
                      src={bgImg instanceof File ? URL.createObjectURL(bgImg) : bgImg} 
                      alt="Background" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  )}
                  {isEditable && (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileRemove(setBackgroundImage)();
                      }}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: 'red',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        textAlign: 'center',
                        lineHeight: '20px',
                        cursor: 'pointer',
                      }}
                    >
                      x
                    </Button>
                  )}
                </div>
              )}
              {isEditable && (
                <input
                  type="file"
                  id="backgroundImageInput"
                  name="backgroundImage"
                  accept="image/*"
                  onChange={handleImageChange(setBackgroundImage)}
                  className="hidden"
                />
              )}
              {isEditable && !bgImg && (
                <Label htmlFor="backgroundImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                  <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
                  <p className="text-gray-600 text-aligned-center text-xs">
                    Click to select image or use color code
                  </p>
                </Label>
              )}
              {!isEditable && !bgImg && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">No image</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profileImage" className="text-left">Profile Image</Label>
          <div className="w-full flex justify-center">
            <div className="border border-blue-700 p-0 flex items-center justify-center w-40 h-40 relative overflow-hidden rounded-full">
              {profImg && (
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                  {typeof profImg === 'string' && profImg.startsWith('#') ? (
                    <div style={{ width: '100%', height: '100%', backgroundColor: profImg }} />
                  ) : (
                    <img 
                      src={profImg instanceof File ? URL.createObjectURL(profImg) : profImg} 
                      alt="Profile" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  )}
                  {isEditable && (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileRemove(setProfileImage)();
                      }}
                      style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'red',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        textAlign: 'center',
                        lineHeight: '20px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ×
                    </Button>
                  )}
                </div>
              )}
              {isEditable && (
                <input
                  type="file"
                  id="profileImageInput"
                  name="profileImage"
                  accept="image/*"
                  onChange={handleImageChange(setProfileImage)}
                  className="hidden"
                />
              )}
              {isEditable && !profImg && (
                <Label htmlFor="profileImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                  <UploadCloud className="text-gray-400 mb-2" style={{ height: '2rem', width: '2rem' }} />
                  <p className="text-gray-600 text-aligned-center text-xs">
                    Click to select
                  </p>
                </Label>
              )}
              {!isEditable && !profImg && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">No image</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Added Date Display - only show in view mode */}
        {!isEditable && viewLastUpdated && (
          <div className="grid gap-2">
            <Label className="text-left">Profile Created</Label>
            <div className="w-full rounded-md border border-input bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm">
              {formatAddedDate(viewLastUpdated)}
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="username" className="text-left">Username</Label>
          <Input
            id="username"
            placeholder="Username"
            value={user}
            onChange={isEditable ? (e) => setUsername(e.target.value) : undefined}
            onClick={(e) => e.stopPropagation()}
            maxLength={25}
            className="w-full"
            required={isEditable}
            readOnly={!isEditable}
            disabled={!isEditable}
          />
          {isEditable && isNewProfile && user.length < 2 && user.length > 0 && (
            <p className="text-red-500 text-sm">Minimum of 2 characters required</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="title" className="text-left">Title</Label>
          <Input
            id="title"
            placeholder="Title"
            value={ttl}
            onChange={isEditable ? (e) => setTitle(e.target.value) : undefined}
            onClick={(e) => e.stopPropagation()}
            maxLength={50}
            className="w-full"
            required={isEditable}
            readOnly={!isEditable}
            disabled={!isEditable}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="mision" className="text-left">Mission</Label>
          <textarea
            id="mision"
            placeholder="Mission statement"
            value={msn}
            maxLength={250}
            onChange={isEditable ? (e) => setMision(e.target.value) : undefined}
            onClick={(e) => e.stopPropagation()}
            className="resize-none w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            rows={7}
            readOnly={!isEditable}
            disabled={!isEditable}
          />
        </div>
      </>
    );
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <button 
            className={`flex w-full items-center py-3 bg-mauve-dark-2 active:scale-[0.98] dark:bg-mauve-light-2 ${className || ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsDialogOpen(true);
            }}
          >
            <div className="h-5 w-5 pr-8">
              <FaCog className="h-5 w-5 text-mauve-dark-12 dark:text-mauve-light-12" />
            </div>
          </button>
        </DialogTrigger>
        <DialogContent 
          className="max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription>
              {activeTab === 'edit' 
                ? (isNewProfile ? 'Create a new profile' : 'Edit your current profile') 
                : 'View and switch between profiles'}
            </DialogDescription>
          </DialogHeader>

<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <TabsList className="grid w-full grid-cols-2 bg-gray-900 rounded-md border border-gray-700 overflow-hidden">
    
<TabsTrigger
  value="edit"
  className="flex items-center justify-center px-4 py-3 min-h-[12px] text-sm md:text-base transition-colors
             data-[state=active]:bg-sky-500 data-[state=active]:text-white
             data-[state=inactive]:bg-gray-800 data-[state=inactive]:text-sky-500
             hover:bg-gray-700 focus:outline-none"
>
  Update Profile
</TabsTrigger>

<TabsTrigger
  value="view"
  className="flex items-center justify-center px-4 py-3 min-h-[12px] text-sm md:text-base transition-colors
             data-[state=active]:bg-sky-500 data-[state=active]:text-white
             data-[state=inactive]:bg-gray-800 data-[state=inactive]:text-sky-500
             hover:bg-gray-700 focus:outline-none"
>
  Past Updates
</TabsTrigger>

  </TabsList>

            <TabsContent value="edit">
              <div className="grid gap-1 py-2">
                {renderProfileForm(true)}

                <p className="mt-2 text-gray-600">
                  Total data size: {totalSizeMb.toFixed(2)} MB
                  <span className="text-xs block text-gray-500">
                    (All profile data is submitted together)
                  </span>
                </p>

                <DialogFooter>
                  <div className="flex space-x-4 w-full">
                    <div className="flex-1 flex justify-center items-center">
                      <Button 
                        type="button" 
                        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setIsConfirmDialogOpen(true)}
                        disabled={isNewProfile && username.length < 2}
                      >
                        {isNewProfile ? 'Create New Profile' : 'Update Profile'}
                      </Button>
                    </div>
                    <div className="flex-1 pt-2 flex justify-center items-center">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          setIsNewProfile(false);
                        }}
                      >
                        Exit
                      </Button>
                    </div>
                  </div>
                </DialogFooter>
              </div>
            </TabsContent>

            <TabsContent value="view">
              <div className="grid gap-4 py-4">
                {/* Profile Selector */}
                <div className="grid gap-2">
                  <Label>Select Profile</Label>
                  <Select 
                    value={selectedProfileNumber.toString()} 
                    onValueChange={handleProfileSwitch}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a profile" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      {allProfiles.map(profile => (
                        <SelectItem key={profile.number} value={profile.number.toString()}>
                          Profile {profile.number}: {profile.Profile.username}
                          {profile.number === getCurrentProfileNumber() && ' (Current)'}
                        </SelectItem>
                      ))}
                      <SelectItem value="new">+ Create New Profile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {renderProfileForm(false)}

                <DialogFooter>
                  <div className="flex space-x-4 w-full">
                    <div className="flex-1 flex justify-center items-center">
                      <Button 
                        type="button" 
                        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSwitchProfileClick}
                        disabled={selectedProfileNumber === getCurrentProfileNumber()}
                      >
                        Switch to Profile
                      </Button>
                    </div>
                    <div className="flex-1 pt-2 flex justify-center items-center">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          setIsNewProfile(false);
                        }}
                      >
                        Exit
                      </Button>
                    </div>
                  </div>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog 
        isOpen={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        totalSizeMb={totalSizeMb}
        handleSubmit={handleSubmit}
        isNewProfile={isNewProfile}
        username={username}
        title={title}
        mision={mision}
      />

      <SwitchProfileConfirmDialog
        isOpen={isSwitchProfileConfirmOpen}
        onOpenChange={setIsSwitchProfileConfirmOpen}
        handleSubmit={confirmProfileSwitch}
        targetProfile={`Profile ${pendingProfileSwitch}`}
      />
    </>
  );
};

export default SettingProfile;














// settingprofile.tsx  V10 File
// import React, { useState, useEffect } from 'react';
// import { Button } from "../../ui/button";
// import { useForm } from 'react-hook-form';
// import { Input } from "../../ui/input";
// import { Label } from "../../ui/label";
// import { UploadCloud } from "lucide-react";
// import { FaCog } from 'react-icons/fa';
// import { 
//   getProfileData, 
//   updateProfileData, 
//   createNewProfile, 
//   ProfileData,
//   getCurrentProfileNumber,
//   getAllProfiles,
//   switchToProfile
// } from '../data/profiledata';
// import {
//   Dialog,
//   //DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "../../ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../../ui/select";

// // Define the event constant locally to avoid circular dependencies
// const PROFILE_CHANGE_EVENT = 'profileChanged';

// interface ConfirmDialogProps {
//   isOpen: boolean;
//   onOpenChange: (open: boolean) => void;
//   totalSizeMb: number;
//   handleSubmit: () => void;
//   isNewProfile: boolean;
// }

// const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
//   isOpen, 
//   onOpenChange, 
//   totalSizeMb, 
//   handleSubmit,
//   isNewProfile 
// }) => {
//   return (
//     <Dialog open={isOpen} onOpenChange={onOpenChange}>
//       <DialogContent className="bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
//         <DialogHeader>
//           <DialogTitle>Confirm Profile {isNewProfile ? 'Creation' : 'Update'}</DialogTitle>
//           <DialogDescription>
//             <br />
//             Total data size: {totalSizeMb} MB
//             <br />
//             {isNewProfile 
//               ? 'This will create a new profile with the next available number.' 
//               : 'This will update the current profile with your changes.'}
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <div className="flex space-x-4">
//             <div className="flex-1 flex justify-center items-center">
//               <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//             </div>
//             <div className="flex-1 flex justify-center items-center">
//               <Button 
//                 className='bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out' 
//                 type="button" 
//                 variant="secondary" 
//                 onClick={handleSubmit}
//               >
//                 Complete transaction
//               </Button>
//             </div>
//           </div>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// interface SettingProfileProps {
//   className?: string;
//   onProfileUpdate?: () => void;
// }

// const SettingProfile: React.FC<SettingProfileProps> = ({ className, onProfileUpdate }) => {
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
//   const [isNewProfile, setIsNewProfile] = useState(false);
//   const [selectedProfileNumber, setSelectedProfileNumber] = useState(getCurrentProfileNumber());
  
//   // Form state
//   const [backgroundImage, setBackgroundImage] = useState<string | File | null>(null);
//   const [profileImage, setProfileImage] = useState<string | File | null>(null);
//   const [username, setUsername] = useState('');
//   const [title, setTitle] = useState('');
//   const [mision, setMision] = useState('');
//   const [totalSizeMb, setTotalSizeMb] = useState<number>(0);
  
//   // Track original values to detect changes
//   const [originalValues, setOriginalValues] = useState({
//     backgroundImage: null as string | File | null,
//     profileImage: null as string | File | null,
//     username: '',
//     title: '',
//     mision: ''
//   });
//   const [hasEdited, setHasEdited] = useState(false);

//   // Load profile data when dialog opens or profile changes
//   useEffect(() => {
//     if (isDialogOpen && !isNewProfile) {
//       const profileData = getProfileData();
//       const bgImage = profileData.backgroundImage || null;
//       const profImage = profileData.profileImage || null;
//       const user = profileData.Profile.username || '';
//       const ttl = profileData.Profile.title || '';
//       const msn = profileData.Profile.mision || '';
      
//       setBackgroundImage(bgImage);
//       setProfileImage(profImage);
//       setUsername(user);
//       setTitle(ttl);
//       setMision(msn);
      
//       // Store original values
//       setOriginalValues({
//         backgroundImage: bgImage,
//         profileImage: profImage,
//         username: user,
//         title: ttl,
//         mision: msn
//       });
      
//       // Reset edit tracking
//       setHasEdited(false);
//     }
//   }, [isDialogOpen, isNewProfile, selectedProfileNumber]);

//   // Reset form for new profile
//   const resetFormForNewProfile = () => {
//     setBackgroundImage(null);
//     setProfileImage(null);
//     setUsername('');
//     setTitle('');
//     setMision('');
//     setIsNewProfile(true);
//     setHasEdited(false);
//   };

//   const handleImageChange = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setter(file);
//     }
//   };

//   const handleFileRemove = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => () => {
//     setter(null);
//   };

//   // Calculate total size
//   useEffect(() => {
//     const calculateSize = async () => {
//       let totalSizeBytes = 0;
      
//       // Calculate text size - all text fields are always included
//       const textSize = new Blob([username, title, mision]).size;
//       totalSizeBytes += textSize;
      
//       // Calculate background image size
//       if (backgroundImage instanceof File) {
//         totalSizeBytes += backgroundImage.size;
//       } else if (typeof backgroundImage === 'string' && backgroundImage) {
//         // For existing images (URLs), estimate size
//         if (backgroundImage.startsWith('#')) {
//           // Color code
//           totalSizeBytes += 50;
//         } else if (backgroundImage.startsWith('blob:') || backgroundImage.startsWith('http')) {
//           // For existing images, we need to fetch and calculate actual size
//           try {
//             const response = await fetch(backgroundImage);
//             const blob = await response.blob();
//             totalSizeBytes += blob.size;
//           } catch (error) {
//             // If fetch fails, use a reasonable estimate for an image
//             totalSizeBytes += 500000; // 500KB estimate
//           }
//         }
//       }
      
//       // Calculate profile image size
//       if (profileImage instanceof File) {
//         totalSizeBytes += profileImage.size;
//       } else if (typeof profileImage === 'string' && profileImage) {
//         // For existing images (URLs), estimate size
//         if (profileImage.startsWith('#')) {
//           // Color code
//           totalSizeBytes += 50;
//         } else if (profileImage.startsWith('blob:') || profileImage.startsWith('http')) {
//           // For existing images, we need to fetch and calculate actual size
//           try {
//             const response = await fetch(profileImage);
//             const blob = await response.blob();
//             totalSizeBytes += blob.size;
//           } catch (error) {
//             // If fetch fails, use a reasonable estimate for an image
//             totalSizeBytes += 200000; // 200KB estimate for profile images
//           }
//         }
//       }
      
//       const totalSizeMb = totalSizeBytes / (1024 * 1024);
//       setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
//     };
    
//     calculateSize();
//   }, [username, title, mision, backgroundImage, profileImage]);

//   const handleSubmit = async () => {
//     const profileData: ProfileData = {
//       backgroundImage: typeof backgroundImage === 'string' 
//         ? backgroundImage 
//         : backgroundImage 
//           ? URL.createObjectURL(backgroundImage) 
//           : '#CCCCCC', // Default gray
//       profileImage: typeof profileImage === 'string' 
//         ? profileImage 
//         : profileImage 
//           ? URL.createObjectURL(profileImage) 
//           : '#999999', // Default darker gray
//       Profile: {
//         username: username || 'User',
//         title: title || 'No title',
//         mision: mision || 'No mission statement',
//       },
//     };

//     if (isNewProfile) {
//       const newNumber = createNewProfile(profileData);
//       console.log('New Profile Created with number:', newNumber);
//     } else {
//       updateProfileData(profileData);
//       console.log('Profile Data Updated');
//     }
    
//     setIsConfirmDialogOpen(false);
//     setIsDialogOpen(false);
//     setIsNewProfile(false);
    
//     // Emit profile change event
//     window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    
//     // Call the callback if provided
//     if (onProfileUpdate) {
//       onProfileUpdate();
//     }
//   };

//   const handleProfileSwitch = (value: string) => {
//     const profileNumber = parseInt(value, 10);
//     if (value === 'new') {
//       resetFormForNewProfile();
//     } else {
//       setIsNewProfile(false);
//       switchToProfile(profileNumber);
//       setSelectedProfileNumber(profileNumber);
      
//       // Emit profile change event when switching profiles
//       window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
      
//       // Call the callback if provided
//       if (onProfileUpdate) {
//         onProfileUpdate();
//       }
//     }
//   };

//   const { handleSubmit: formHandleSubmit } = useForm();
//   const allProfiles = getAllProfiles();

//   return (
//     <>
//       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//         <DialogTrigger asChild>
//           <button 
//             className={`flex w-full items-center py-3 bg-mauve-dark-2 active:scale-[0.98] dark:bg-mauve-light-2 ${className || ''}`}
//             onClick={(e) => {
//               e.stopPropagation();
//               setIsDialogOpen(true);
//             }}
//           >
//             <div className="h-5 w-5 pr-8">
//               <FaCog className="h-5 w-5 text-mauve-dark-12 dark:text-mauve-light-12" />
//             </div>
//           </button>
//         </DialogTrigger>
//         <DialogContent 
//           className="h-screen max-h-screen overflow-y-auto bg-white dark:bg-gray-900"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <DialogHeader>
//             <DialogTitle>Profile Settings</DialogTitle>
//             <DialogDescription>
//               {isNewProfile ? 'Create a new profile' : 'Edit your current profile or create a new one'}
//             </DialogDescription>
//           </DialogHeader>

//           {/* Profile Selector */}
//           <div className="grid gap-2 mb-4">
//             <Label>Select Profile</Label>
//             <Select 
//               value={isNewProfile ? 'new' : selectedProfileNumber.toString()} 
//               onValueChange={handleProfileSwitch}
//             >
//               <SelectTrigger className="w-full">
//                 <SelectValue placeholder="Select a profile" />
//               </SelectTrigger>
//               <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
//                 {allProfiles.map(profile => (
//                   <SelectItem key={profile.number} value={profile.number.toString()}>
//                     Update {profile.number}: {profile.Profile.username}
//                   </SelectItem>
//                 ))}
//                 <SelectItem value="new">+ Create New Profile</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <form onSubmit={formHandleSubmit(handleSubmit)} className="grid gap-4 py-4">
//             <div className="grid gap-2">
//               <Label htmlFor="backgroundImage" className="text-left">Background Image</Label>
//               <div className="w-full flex justify-center">
//                 <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-40 relative overflow-hidden">
//                   {backgroundImage && (
//                     <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
//                       {typeof backgroundImage === 'string' && backgroundImage.startsWith('#') ? (
//                         <div style={{ width: '100%', height: '100%', backgroundColor: backgroundImage }} />
//                       ) : (
//                         <img 
//                           src={backgroundImage instanceof File ? URL.createObjectURL(backgroundImage) : backgroundImage} 
//                           alt="Background" 
//                           style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
//                         />
//                       )}
//                       <Button
//                         type="button"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleFileRemove(setBackgroundImage)();
//                         }}
//                         style={{
//                           position: 'absolute',
//                           top: '5px',
//                           right: '5px',
//                           background: 'red',
//                           color: 'white',
//                           border: 'none',
//                           borderRadius: '50%',
//                           width: '20px',
//                           height: '20px',
//                           textAlign: 'center',
//                           lineHeight: '20px',
//                           cursor: 'pointer',
//                         }}
//                       >
//                         x
//                       </Button>
//                     </div>
//                   )}
//                   <input
//                     type="file"
//                     id="backgroundImageInput"
//                     name="backgroundImage"
//                     accept="image/*"
//                     onChange={handleImageChange(setBackgroundImage)}
//                     className="hidden"
//                   />
//                   {!backgroundImage && (
//                     <Label htmlFor="backgroundImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                       <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
//                       <p className="text-gray-600 text-aligned-center text-xs">
//                         Click to select image or use color code
//                       </p>
//                     </Label>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="profileImage" className="text-left">Profile Image</Label>
//               <div className="w-full flex justify-center">
//                 <div className="border border-blue-700 p-0 flex items-center justify-center w-40 h-40 relative overflow-hidden rounded-full">
//                   {profileImage && (
//                     <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
//                       {typeof profileImage === 'string' && profileImage.startsWith('#') ? (
//                         <div style={{ width: '100%', height: '100%', backgroundColor: profileImage }} />
//                       ) : (
//                         <img 
//                           src={profileImage instanceof File ? URL.createObjectURL(profileImage) : profileImage} 
//                           alt="Profile" 
//                           style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
//                         />
//                       )}
//                       <Button
//                         type="button"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleFileRemove(setProfileImage)();
//                         }}
//                         style={{
//                           position: 'absolute',
//                           top: '15px',
//                           right: '15px',
//                           background: 'red',
//                           color: 'white',
//                           border: 'none',
//                           borderRadius: '50%',
//                           width: '20px',
//                           height: '20px',
//                           textAlign: 'center',
//                           lineHeight: '20px',
//                           cursor: 'pointer',
//                           fontSize: '12px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                         }}
//                       >
//                         ×
//                       </Button>
//                     </div>
//                   )}
//                   <input
//                     type="file"
//                     id="profileImageInput"
//                     name="profileImage"
//                     accept="image/*"
//                     onChange={handleImageChange(setProfileImage)}
//                     className="hidden"
//                   />
//                   {!profileImage && (
//                     <Label htmlFor="profileImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                       <UploadCloud className="text-gray-400 mb-2" style={{ height: '2rem', width: '2rem' }} />
//                       <p className="text-gray-600 text-aligned-center text-xs">
//                         Click to select
//                       </p>
//                     </Label>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="username" className="text-left">Username</Label>
//               <Input
//                 id="username"
//                 placeholder="Username"
//                 value={username}
//                 onChange={(e) => setUsername(e.target.value)}
//                 onClick={(e) => e.stopPropagation()}
//                 maxLength={25}
//                 className="w-full"
//                 required
//               />
//               {isNewProfile && username.length < 2 && username.length > 0 && (
//                 <p className="text-red-500 text-sm">Minimum of 2 characters required</p>
//               )}
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="title" className="text-left">Title</Label>
//               <Input
//                 id="title"
//                 placeholder="Title"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 onClick={(e) => e.stopPropagation()}
//                 maxLength={50}
//                 className="w-full"
//                 required
//               />
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="mision" className="text-left">Mission</Label>
//               <textarea
//                 id="mision"
//                 placeholder="Mission statement"
//                 value={mision}
//                 maxLength={250}
//                 onChange={(e) => setMision(e.target.value)}
//                 onClick={(e) => e.stopPropagation()}
//                 className="resize-none w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
//                 rows={7}
//               />
//             </div>

//             <p className="mt-2 text-gray-600">
//               Total data size: {totalSizeMb} MB
//               <span className="text-xs block text-gray-500">
//                 (All profile data is submitted together)
//               </span>
//             </p>

//             <DialogFooter>
//               <div className="flex space-x-4 w-full">
//                 <div className="flex-1 flex justify-center items-center">
//                   <Button 
//                     type="button" 
//                     className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
//                     onClick={() => setIsConfirmDialogOpen(true)}
//                     disabled={isNewProfile && username.length < 2}
//                   >
//                     {isNewProfile ? 'Create New Profile' : 'Update Profile'}
//                   </Button>
//                 </div>
//                 <div className="flex-1 pt-2 flex justify-center items-center">
//                   <Button 
//                     type="button" 
//                     variant="outline" 
//                     onClick={() => {
//                       setIsDialogOpen(false);
//                       setIsNewProfile(false);
//                     }}
//                   >
//                     Exit
//                   </Button>
//                 </div>
//               </div>
//             </DialogFooter>
//           </form>
//         </DialogContent>
//       </Dialog>
      
//       <ConfirmDialog 
//         isOpen={isConfirmDialogOpen}
//         onOpenChange={setIsConfirmDialogOpen}
//         totalSizeMb={totalSizeMb}
//         handleSubmit={handleSubmit}
//         isNewProfile={isNewProfile}
//       />
//     </>
//   );
// };

// export default SettingProfile;



// settingprofile.tsx
// import React, { useState, useEffect } from 'react';
// import { Button } from "../../ui/button";
// import { useForm } from 'react-hook-form';
// import { Input } from "../../ui/input";
// import { Label } from "../../ui/label";
// import { UploadCloud } from "lucide-react";
// import { FaCog } from 'react-icons/fa';
// import { 
//   getProfileData, 
//   updateProfileData, 
//   createNewProfile, 
//   ProfileData,
//   getCurrentProfileNumber,
//   getAllProfiles,
//   switchToProfile
// } from '../data/profiledata';
// import {
//   Dialog,
//   //DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "../../ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../../ui/select";
// import { Separator } from "../../ui/separator"
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "../../ui/tabs";

// // Define the event constant locally to avoid circular dependencies
// const PROFILE_CHANGE_EVENT = 'profileChanged';

// // Independent MB Calculator Component
// interface MBCalculatorProps {
//   username: string;
//   title: string;
//   mision: string;
//   backgroundImage: string | File | null;
//   profileImage: string | File | null;
//   isNewProfile: boolean;
//   hasEdited: boolean;
// }

// const MBCalculator: React.FC<MBCalculatorProps> = React.memo(({ 
//   username, 
//   title, 
//   mision, 
//   backgroundImage, 
//   profileImage, 
//   isNewProfile, 
//   hasEdited 
// }) => {
//   const [mbSize, setMbSize] = useState<number>(0);
  
//   useEffect(() => {
//     const calculateSize = () => {
//       // For existing profiles, only calculate if user has made edits
//       if (!isNewProfile && !hasEdited) {
//         setMbSize(0);
//         return;
//       }
      
//       let totalSizeBytes = 0;
      
//       // Calculate text size - all text fields
//       const textEncoder = new TextEncoder();
//       const usernameBytes = textEncoder.encode(username || '').length;
//       const titleBytes = textEncoder.encode(title || '').length;
//       const misionBytes = textEncoder.encode(mision || '').length;
//       totalSizeBytes += usernameBytes + titleBytes + misionBytes;
      
//       // Calculate background image size
//       if (backgroundImage) {
//         if (backgroundImage instanceof File) {
//           totalSizeBytes += backgroundImage.size;
//         } else if (typeof backgroundImage === 'string') {
//           if (backgroundImage.startsWith('#')) {
//             totalSizeBytes += textEncoder.encode(backgroundImage).length;
//           } else if (backgroundImage.startsWith('data:')) {
//             const base64Data = backgroundImage.split(',')[1];
//             if (base64Data) {
//               totalSizeBytes += Math.ceil((base64Data.length * 3) / 4);
//             }
//           } else if (backgroundImage.startsWith('blob:') || backgroundImage.startsWith('http')) {
//             totalSizeBytes += 500000;
//           }
//         }
//       }
      
//       // Calculate profile image size  
//       if (profileImage) {
//         if (profileImage instanceof File) {
//           totalSizeBytes += profileImage.size;
//         } else if (typeof profileImage === 'string') {
//           if (profileImage.startsWith('#')) {
//             totalSizeBytes += textEncoder.encode(profileImage).length;
//           } else if (profileImage.startsWith('data:')) {
//             const base64Data = profileImage.split(',')[1];
//             if (base64Data) {
//               totalSizeBytes += Math.ceil((base64Data.length * 3) / 4);
//             }
//           } else if (profileImage.startsWith('blob:') || profileImage.startsWith('http')) {
//             totalSizeBytes += 200000;
//           }
//         }
//       }
      
//       // Add overhead
//       const structureOverhead = 150;
//       totalSizeBytes += structureOverhead;
      
//       const xpubSize = 130;
//       totalSizeBytes += xpubSize;
      
//       const totalSizeMb = totalSizeBytes / (1024 * 1024);
//       setMbSize(parseFloat(totalSizeMb.toFixed(6)));
//     };
    
//     // Use requestAnimationFrame to avoid blocking the main thread
//     const timeoutId = setTimeout(() => {
//       requestAnimationFrame(calculateSize);
//     }, 300);
    
//     return () => clearTimeout(timeoutId);
//   }, [username, title, mision, backgroundImage, profileImage, isNewProfile, hasEdited]);
  
//   return (
//     <p className="mt-2 text-gray-600">
//       Total data size: {mbSize > 0 ? `${mbSize.toFixed(6)} MB` : '0.000000 MB'}
//       <span className="text-xs block text-gray-500">
//         {isNewProfile ? '(New profile data)' : hasEdited && mbSize > 0 ? '(All profile data is submitted together)' : '(No changes made)'}
//       </span>
//     </p>
//   );
// });

// MBCalculator.displayName = 'MBCalculator';

// interface ConfirmDialogProps {
//   isOpen: boolean;
//   onOpenChange: (open: boolean) => void;
//   totalSizeMb: number;
//   handleSubmit: () => void;
//   isNewProfile: boolean;
// }

// const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
//   isOpen, 
//   onOpenChange, 
//   totalSizeMb, 
//   handleSubmit,
//   isNewProfile 
// }) => {
//   // Calculate MB size for confirm dialog
//   const [confirmMbSize, setConfirmMbSize] = useState<number>(0);
  
//   useEffect(() => {
//     if (isOpen) {
//       setConfirmMbSize(totalSizeMb);
//     }
//   }, [isOpen, totalSizeMb]);
  
//   return (
//     <Dialog open={isOpen} onOpenChange={onOpenChange}>
//       <DialogContent className="bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
//         <DialogHeader>
//           <DialogTitle>Confirm Profile {isNewProfile ? 'Creation' : 'Update'}</DialogTitle>
//           <DialogDescription>
//             <br />
//             Total data size: {confirmMbSize.toFixed(6)} MB
//             <br />
//             {isNewProfile 
//               ? 'This will create a new profile with the next available number.' 
//               : 'This will update the current profile with your changes.'}
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <div className="flex space-x-4">
//             <div className="flex-1 flex justify-center items-center">
//               <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//             </div>
//             <div className="flex-1 flex justify-center items-center">
//               <Button 
//                 className='bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out' 
//                 type="button" 
//                 variant="secondary" 
//                 onClick={handleSubmit}
//               >
//                 Complete transaction
//               </Button>
//             </div>
//           </div>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// interface SwitchProfileDialogProps {
//   isOpen: boolean;
//   onOpenChange: (open: boolean) => void;
//   handleSwitch: () => void;
//   selectedProfileNumber: number;
// }

// const SwitchProfileDialog: React.FC<SwitchProfileDialogProps> = ({ 
//   isOpen, 
//   onOpenChange, 
//   handleSwitch,
//   selectedProfileNumber
// }) => {
//   return (
//     <Dialog open={isOpen} onOpenChange={onOpenChange}>
//       <DialogContent className="bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
//         <DialogHeader>
//           <DialogTitle>Switch Profile</DialogTitle>
//           <DialogDescription>
//             <br />
//             Switch to Profile {selectedProfileNumber}?
//             <br />
//             This will change your active profile.
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <div className="flex space-x-4">
//             <div className="flex-1 flex justify-center items-center">
//               <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//             </div>
//             <div className="flex-1 flex justify-center items-center">
//               <Button 
//                 className='bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out' 
//                 type="button" 
//                 variant="secondary" 
//                 onClick={handleSwitch}
//               >
//                 Switch Profile
//               </Button>
//             </div>
//           </div>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// interface SettingProfileProps {
//   className?: string;
//   onProfileUpdate?: () => void;
// }

// const SettingProfile: React.FC<SettingProfileProps> = ({ className, onProfileUpdate }) => {
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
//   const [isSwitchProfileDialogOpen, setIsSwitchProfileDialogOpen] = useState(false);
//   const [isNewProfile, setIsNewProfile] = useState(false);
//   const [selectedProfileNumber, setSelectedProfileNumber] = useState(getCurrentProfileNumber());
//   const [pendingSwitchNumber, setPendingSwitchNumber] = useState<number>(getCurrentProfileNumber());
//   const [activeTab, setActiveTab] = useState("edit");
//   const [totalSizeMbForDialog, setTotalSizeMbForDialog] = useState<number>(0);
  
//   // Form state
//   const [backgroundImage, setBackgroundImage] = useState<string | File | null>(null);
//   const [profileImage, setProfileImage] = useState<string | File | null>(null);
//   const [username, setUsername] = useState('');
//   const [title, setTitle] = useState('');
//   const [mision, setMision] = useState('');
  
//   // View mode state for tab 2
//   const [viewBackgroundImage, setViewBackgroundImage] = useState<string | null>(null);
//   const [viewProfileImage, setViewProfileImage] = useState<string | null>(null);
//   const [viewUsername, setViewUsername] = useState('');
//   const [viewTitle, setViewTitle] = useState('');
//   const [viewMision, setViewMision] = useState('');
  
//   // Track original values to detect changes
//   const [originalValues, setOriginalValues] = useState({
//     backgroundImage: null as string | File | null,
//     profileImage: null as string | File | null,
//     username: '',
//     title: '',
//     mision: ''
//   });
//   const [hasEdited, setHasEdited] = useState(false);

//   // Load profile data when dialog opens or profile changes
//   useEffect(() => {
//     if (isDialogOpen && !isNewProfile && activeTab === "edit") {
//       const profileData = getProfileData();
//       const bgImage = profileData.backgroundImage || null;
//       const profImage = profileData.profileImage || null;
//       const user = profileData.Profile.username || '';
//       const ttl = profileData.Profile.title || '';
//       const msn = profileData.Profile.mision || '';
      
//       setBackgroundImage(bgImage);
//       setProfileImage(profImage);
//       setUsername(user);
//       setTitle(ttl);
//       setMision(msn);
      
//       // Store original values
//       setOriginalValues({
//         backgroundImage: bgImage,
//         profileImage: profImage,
//         username: user,
//         title: ttl,
//         mision: msn
//       });
      
//       // Reset edit tracking
//       setHasEdited(false);
//     }
//   }, [isDialogOpen, isNewProfile, selectedProfileNumber, activeTab]);

//   // Load view data when selected profile changes in view tab
//   useEffect(() => {
//     if (activeTab === "view" && selectedProfileNumber) {
//       const profiles = getAllProfiles();
//       const profile = profiles.find(p => p.number === selectedProfileNumber);
//       if (profile) {
//         setViewBackgroundImage(profile.backgroundImage);
//         setViewProfileImage(profile.profileImage);
//         setViewUsername(profile.Profile.username);
//         setViewTitle(profile.Profile.title);
//         setViewMision(profile.Profile.mision);
//       }
//     }
//   }, [selectedProfileNumber, activeTab]);

//   // Separate state for debounced values
//   const [debouncedUsername, setDebouncedUsername] = useState(username);
//   const [debouncedTitle, setDebouncedTitle] = useState(title);
//   const [debouncedMision, setDebouncedMision] = useState(mision);

//   // Debounce text inputs
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedUsername(username);
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [username]);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedTitle(title);
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [title]);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedMision(mision);
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [mision]);

//   // Reset form for new profile
//   const resetFormForNewProfile = () => {
//     setBackgroundImage(null);
//     setProfileImage(null);
//     setUsername('');
//     setTitle('');
//     setMision('');
//     setIsNewProfile(true);
//     setHasEdited(false);
//   };

//   const handleImageChange = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setter(file);
//     }
//   };

//   const handleFileRemove = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => () => {
//     setter(null);
//   };

//   const handleSubmit = async () => {
//     // Only proceed if there's actually data to submit
//     if (!isNewProfile && !hasEdited) {
//       console.log('No changes made - no submission needed');
//       setIsConfirmDialogOpen(false);
//       setIsDialogOpen(false);
//       return;
//     }
    
//     const profileData: ProfileData = {
//       backgroundImage: typeof backgroundImage === 'string' 
//         ? backgroundImage 
//         : backgroundImage 
//           ? URL.createObjectURL(backgroundImage) 
//           : '#CCCCCC', // Default gray
//       profileImage: typeof profileImage === 'string' 
//         ? profileImage 
//         : profileImage 
//           ? URL.createObjectURL(profileImage) 
//           : '#999999', // Default darker gray
//       Profile: {
//         username: username || 'User',
//         title: title || 'No title',
//         mision: mision || 'No mission statement',
//       },
//     };

//     if (isNewProfile) {
//       const newNumber = createNewProfile(profileData);
//       console.log('New Profile Created with number:', newNumber);
//     } else {
//       updateProfileData(profileData);
//       console.log('Profile Data Updated');
//     }
    
//     setIsConfirmDialogOpen(false);
//     setIsDialogOpen(false);
//     setIsNewProfile(false);
    
//     // Emit profile change event
//     window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    
//     // Call the callback if provided
//     if (onProfileUpdate) {
//       onProfileUpdate();
//     }
//   };

//   const handleProfileSwitch = (value: string) => {
//     const profileNumber = parseInt(value, 10);
//     if (value === 'new') {
//       resetFormForNewProfile();
//       setActiveTab("edit");
//     } else {
//       setPendingSwitchNumber(profileNumber);
//       setIsSwitchProfileDialogOpen(true);
//     }
//   };

//   const confirmProfileSwitch = () => {
//     setIsNewProfile(false);
//     switchToProfile(pendingSwitchNumber);
//     setSelectedProfileNumber(pendingSwitchNumber);
    
//     // Emit profile change event when switching profiles
//     window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    
//     // Call the callback if provided
//     if (onProfileUpdate) {
//       onProfileUpdate();
//     }
    
//     setIsSwitchProfileDialogOpen(false);
//     setIsDialogOpen(false);
//   };

//   const { handleSubmit: formHandleSubmit } = useForm();
//   const allProfiles = getAllProfiles();

//   // Profile form component (reusable for both tabs)
//   const ProfileForm = ({ isViewMode = false }) => (
//     <form onSubmit={formHandleSubmit(handleSubmit)} className="grid gap-4 py-4">
//       <div className="grid gap-2">
//         <Label htmlFor="backgroundImage" className="text-left">Background Image</Label>
//         <div className="w-full flex justify-center">
//           <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-40 relative overflow-hidden">
//             {(isViewMode ? viewBackgroundImage : backgroundImage) && (
//               <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
//                 {typeof (isViewMode ? viewBackgroundImage : backgroundImage) === 'string' && (isViewMode ? viewBackgroundImage : backgroundImage)?.startsWith('#') ? (
//                   <div style={{ width: '100%', height: '100%', backgroundColor: isViewMode ? viewBackgroundImage : backgroundImage }} />
//                 ) : (
//                   <img 
//                     src={(isViewMode ? viewBackgroundImage : backgroundImage) instanceof File ? URL.createObjectURL(backgroundImage as File) : (isViewMode ? viewBackgroundImage : backgroundImage) as string} 
//                     alt="Background" 
//                     style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
//                   />
//                 )}
//                 {!isViewMode && (
//                   <Button
//                     type="button"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleFileRemove(setBackgroundImage)();
//                     }}
//                     style={{
//                       position: 'absolute',
//                       top: '5px',
//                       right: '5px',
//                       background: 'red',
//                       color: 'white',
//                       border: 'none',
//                       borderRadius: '50%',
//                       width: '20px',
//                       height: '20px',
//                       textAlign: 'center',
//                       lineHeight: '20px',
//                       cursor: 'pointer',
//                     }}
//                   >
//                     x
//                   </Button>
//                 )}
//               </div>
//             )}
//             {!isViewMode && (
//               <input
//                 type="file"
//                 id="backgroundImageInput"
//                 name="backgroundImage"
//                 accept="image/*"
//                 onChange={handleImageChange(setBackgroundImage)}
//                 className="hidden"
//               />
//             )}
//             {!isViewMode && !backgroundImage && (
//               <Label htmlFor="backgroundImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                 <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
//                 <p className="text-gray-600 text-aligned-center text-xs">
//                   Click to select image or use color code
//                 </p>
//               </Label>
//             )}
//           </div>
//         </div>
//       </div>

//       <div className="grid gap-2">
//         <Label htmlFor="profileImage" className="text-left">Profile Image</Label>
//         <div className="w-full flex justify-center">
//           <div className="border border-blue-700 p-0 flex items-center justify-center w-40 h-40 relative overflow-hidden rounded-full">
//             {(isViewMode ? viewProfileImage : profileImage) && (
//               <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
//                 {typeof (isViewMode ? viewProfileImage : profileImage) === 'string' && (isViewMode ? viewProfileImage : profileImage)?.startsWith('#') ? (
//                   <div style={{ width: '100%', height: '100%', backgroundColor: isViewMode ? viewProfileImage : profileImage }} />
//                 ) : (
//                   <img 
//                     src={(isViewMode ? viewProfileImage : profileImage) instanceof File ? URL.createObjectURL(profileImage as File) : (isViewMode ? viewProfileImage : profileImage) as string} 
//                     alt="Profile" 
//                     style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
//                   />
//                 )}
//                 {!isViewMode && (
//                   <Button
//                     type="button"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleFileRemove(setProfileImage)();
//                     }}
//                     style={{
//                       position: 'absolute',
//                       top: '15px',
//                       right: '15px',
//                       background: 'red',
//                       color: 'white',
//                       border: 'none',
//                       borderRadius: '50%',
//                       width: '20px',
//                       height: '20px',
//                       textAlign: 'center',
//                       lineHeight: '20px',
//                       cursor: 'pointer',
//                       fontSize: '12px',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                     }}
//                   >
//                     ×
//                   </Button>
//                 )}
//               </div>
//             )}
//             {!isViewMode && (
//               <input
//                 type="file"
//                 id="profileImageInput"
//                 name="profileImage"
//                 accept="image/*"
//                 onChange={handleImageChange(setProfileImage)}
//                 className="hidden"
//               />
//             )}
//             {!isViewMode && !profileImage && (
//               <Label htmlFor="profileImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                 <UploadCloud className="text-gray-400 mb-2" style={{ height: '2rem', width: '2rem' }} />
//                 <p className="text-gray-600 text-aligned-center text-xs">
//                   Click to select
//                 </p>
//               </Label>
//             )}
//           </div>
//         </div>
//       </div>

//       <div className="grid gap-2">
//         <Label htmlFor="username" className="text-left">Username</Label>
//         <Input
//           id="username"
//           placeholder="Username"
//           value={isViewMode ? viewUsername : username}
//           onChange={(e) => !isViewMode && setUsername(e.target.value)}
//           onClick={(e) => e.stopPropagation()}
//           maxLength={25}
//           className="w-full"
//           required
//           disabled={isViewMode}
//         />
//         {!isViewMode && isNewProfile && username.length < 2 && username.length > 0 && (
//           <p className="text-red-500 text-sm">Minimum of 2 characters required</p>
//         )}
//       </div>

//       <div className="grid gap-2">
//         <Label htmlFor="title" className="text-left">Title</Label>
//         <Input
//           id="title"
//           placeholder="Title"
//           value={isViewMode ? viewTitle : title}
//           onChange={(e) => !isViewMode && setTitle(e.target.value)}
//           onClick={(e) => e.stopPropagation()}
//           maxLength={50}
//           className="w-full"
//           required
//           disabled={isViewMode}
//         />
//       </div>

//       <div className="grid gap-2">
//         <Label htmlFor="mision" className="text-left">Mission</Label>
//         <textarea
//           id="mision"
//           placeholder="Mission statement"
//           value={isViewMode ? viewMision : mision}
//           maxLength={250}
//           onChange={(e) => !isViewMode && setMision(e.target.value)}
//           onClick={(e) => e.stopPropagation()}
//           className="resize-none w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
//           rows={7}
//           disabled={isViewMode}
//         />
//       </div>

//       {!isViewMode && (
//         <>
//           <MBCalculator
//             username={username}
//             title={title}
//             mision={mision}
//             backgroundImage={backgroundImage}
//             profileImage={profileImage}
//             isNewProfile={isNewProfile}
//             hasEdited={hasEdited}
//           />

//           <DialogFooter>
//             <div className="flex space-x-4 w-full">
//               <div className="flex-1 flex justify-center items-center">
//                 <Button 
//                   type="button" 
//                   className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
//                   onClick={() => {
//                     // Calculate MB size at the moment of clicking
//                     let totalSizeBytes = 0;
//                     const textEncoder = new TextEncoder();
//                     totalSizeBytes += textEncoder.encode(username || '').length;
//                     totalSizeBytes += textEncoder.encode(title || '').length;
//                     totalSizeBytes += textEncoder.encode(mision || '').length;
                    
//                     if (backgroundImage) {
//                       if (backgroundImage instanceof File) {
//                         totalSizeBytes += backgroundImage.size;
//                       } else if (typeof backgroundImage === 'string') {
//                         if (backgroundImage.startsWith('#')) {
//                           totalSizeBytes += textEncoder.encode(backgroundImage).length;
//                         } else if (backgroundImage.startsWith('data:')) {
//                           const base64Data = backgroundImage.split(',')[1];
//                           if (base64Data) totalSizeBytes += Math.ceil((base64Data.length * 3) / 4);
//                         } else {
//                           totalSizeBytes += 500000;
//                         }
//                       }
//                     }
                    
//                     if (profileImage) {
//                       if (profileImage instanceof File) {
//                         totalSizeBytes += profileImage.size;
//                       } else if (typeof profileImage === 'string') {
//                         if (profileImage.startsWith('#')) {
//                           totalSizeBytes += textEncoder.encode(profileImage).length;
//                         } else if (profileImage.startsWith('data:')) {
//                           const base64Data = profileImage.split(',')[1];
//                           if (base64Data) totalSizeBytes += Math.ceil((base64Data.length * 3) / 4);
//                         } else {
//                           totalSizeBytes += 200000;
//                         }
//                       }
//                     }
                    
//                     totalSizeBytes += 150 + 130; // overhead + xpub
//                     const totalSizeMb = totalSizeBytes / (1024 * 1024);
//                     setTotalSizeMbForDialog(parseFloat(totalSizeMb.toFixed(6)));
//                     setIsConfirmDialogOpen(true);
//                   }}
//                   disabled={(isNewProfile && username.length < 2) || (!isNewProfile && !hasEdited)}
//                 >
//                   {isNewProfile ? 'Create New Profile' : hasEdited ? 'Update Profile' : 'No Changes to Update'}
//                 </Button>
//               </div>
//               <div className="flex-1 pt-2 flex justify-center items-center">
//                 <Button 
//                   type="button" 
//                   variant="outline" 
//                   onClick={() => {
//                     setIsDialogOpen(false);
//                     setIsNewProfile(false);
//                   }}
//                 >
//                   Exit
//                 </Button>
//               </div>
//             </div>
//           </DialogFooter>
//         </>
//       )}
//     </form>
//   );

//   return (
//     <>
//       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//         <DialogTrigger asChild>
//           <button 
//             className={`flex w-full items-center py-3 bg-mauve-dark-2 active:scale-[0.98] dark:bg-mauve-light-2 ${className || ''}`}
//             onClick={(e) => {
//               e.stopPropagation();
//               setIsDialogOpen(true);
//             }}
//           >
//             <div className="h-5 w-5 pr-8">
//               <FaCog className="h-5 w-5 text-mauve-dark-12 dark:text-mauve-light-12" />
//             </div>
//           </button>
//         </DialogTrigger>
//         <DialogContent 
//           className="h-screen max-h-screen overflow-y-auto bg-white dark:bg-gray-900"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <DialogHeader>
//             <DialogTitle>Profile Settings</DialogTitle>
//             <DialogDescription>
//               Manage your profiles
//             </DialogDescription>
//           </DialogHeader>

//           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//             <TabsList className="grid w-full grid-cols-2">
//               <TabsTrigger value="edit">Edit Current Profile</TabsTrigger>
//               <TabsTrigger value="view">View Profiles</TabsTrigger>
//             </TabsList>
            
//             <TabsContent value="edit">
//               <ProfileForm isViewMode={false} />
//             </TabsContent>
            
//             <TabsContent value="view">
//               <div className="grid gap-4">
//                 <div className="grid gap-2">
//                   <Label>Select Profile</Label>
//                   <Select 
//                     value={selectedProfileNumber.toString()} 
//                     onValueChange={handleProfileSwitch}
//                   >
//                     <SelectTrigger className="w-full">
//                       <SelectValue placeholder="Select a profile" />
//                     </SelectTrigger>
//                     <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 max-h-[300px] overflow-y-auto">
//                       {allProfiles.map(profile => (
//                         <SelectItem key={profile.number} value={profile.number.toString()}>
//                           Update {profile.number}: {profile.Profile.username}
//                         </SelectItem>
//                       ))}
//                       <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
//                       <SelectItem value="new">+ Create new updated profile</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <ProfileForm isViewMode={true} />
//               </div>
//             </TabsContent>
//           </Tabs>
//         </DialogContent>
//       </Dialog>
      
//       <ConfirmDialog 
//         isOpen={isConfirmDialogOpen}
//         onOpenChange={setIsConfirmDialogOpen}
//         totalSizeMb={totalSizeMbForDialog}
//         handleSubmit={handleSubmit}
//         isNewProfile={isNewProfile}
//       />
      
//       <SwitchProfileDialog
//         isOpen={isSwitchProfileDialogOpen}
//         onOpenChange={setIsSwitchProfileDialogOpen}
//         handleSwitch={confirmProfileSwitch}
//         selectedProfileNumber={pendingSwitchNumber}
//       />
//     </>
//   );
// };

// export default SettingProfile;
























































// proir to the debounce. 
// // settingprofile.tsx
// import React, { useState, useEffect } from 'react';
// import { Button } from "../../ui/button";
// import { useForm } from 'react-hook-form';
// import { Input } from "../../ui/input";
// import { Label } from "../../ui/label";
// import { UploadCloud } from "lucide-react";
// import { FaCog } from 'react-icons/fa';
// import { 
//   getProfileData, 
//   updateProfileData, 
//   createNewProfile, 
//   ProfileData,
//   getCurrentProfileNumber,
//   getAllProfiles,
//   switchToProfile
// } from '../data/profiledata';
// import {
//   Dialog,
//   //DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "../../ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../../ui/select";
// import { Separator } from "../../ui/separator"
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "../../ui/tabs";

// // Define the event constant locally to avoid circular dependencies
// const PROFILE_CHANGE_EVENT = 'profileChanged';

// interface ConfirmDialogProps {
//   isOpen: boolean;
//   onOpenChange: (open: boolean) => void;
//   totalSizeMb: number;
//   handleSubmit: () => void;
//   isNewProfile: boolean;
// }

// const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
//   isOpen, 
//   onOpenChange, 
//   totalSizeMb, 
//   handleSubmit,
//   isNewProfile 
// }) => {
//   return (
//     <Dialog open={isOpen} onOpenChange={onOpenChange}>
//       <DialogContent className="bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
//         <DialogHeader>
//           <DialogTitle>Confirm Profile {isNewProfile ? 'Creation' : 'Update'}</DialogTitle>
//           <DialogDescription>
//             <br />
//             Total data size: {totalSizeMb} MB
//             <br />
//             {isNewProfile 
//               ? 'This will create a new profile with the next available number.' 
//               : 'This will update the current profile with your changes.'}
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <div className="flex space-x-4">
//             <div className="flex-1 flex justify-center items-center">
//               <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//             </div>
//             <div className="flex-1 flex justify-center items-center">
//               <Button 
//                 className='bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out' 
//                 type="button" 
//                 variant="secondary" 
//                 onClick={handleSubmit}
//               >
//                 Complete transaction
//               </Button>
//             </div>
//           </div>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// interface SwitchProfileDialogProps {
//   isOpen: boolean;
//   onOpenChange: (open: boolean) => void;
//   handleSwitch: () => void;
//   selectedProfileNumber: number;
// }

// const SwitchProfileDialog: React.FC<SwitchProfileDialogProps> = ({ 
//   isOpen, 
//   onOpenChange, 
//   handleSwitch,
//   selectedProfileNumber
// }) => {
//   return (
//     <Dialog open={isOpen} onOpenChange={onOpenChange}>
//       <DialogContent className="bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
//         <DialogHeader>
//           <DialogTitle>Switch Profile</DialogTitle>
//           <DialogDescription>
//             <br />
//             Switch to Profile {selectedProfileNumber}?
//             <br />
//             This will change your active profile.
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <div className="flex space-x-4">
//             <div className="flex-1 flex justify-center items-center">
//               <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//             </div>
//             <div className="flex-1 flex justify-center items-center">
//               <Button 
//                 className='bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out' 
//                 type="button" 
//                 variant="secondary" 
//                 onClick={handleSwitch}
//               >
//                 Switch Profile
//               </Button>
//             </div>
//           </div>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// interface SettingProfileProps {
//   className?: string;
//   onProfileUpdate?: () => void;
// }

// const SettingProfile: React.FC<SettingProfileProps> = ({ className, onProfileUpdate }) => {
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
//   const [isSwitchProfileDialogOpen, setIsSwitchProfileDialogOpen] = useState(false);
//   const [isNewProfile, setIsNewProfile] = useState(false);
//   const [selectedProfileNumber, setSelectedProfileNumber] = useState(getCurrentProfileNumber());
//   const [pendingSwitchNumber, setPendingSwitchNumber] = useState<number>(getCurrentProfileNumber());
//   const [activeTab, setActiveTab] = useState("edit");
  
//   // Form state
//   const [backgroundImage, setBackgroundImage] = useState<string | File | null>(null);
//   const [profileImage, setProfileImage] = useState<string | File | null>(null);
//   const [username, setUsername] = useState('');
//   const [title, setTitle] = useState('');
//   const [mision, setMision] = useState('');
//   const [totalSizeMb, setTotalSizeMb] = useState<number>(0);
  
//   // View mode state for tab 2
//   const [viewBackgroundImage, setViewBackgroundImage] = useState<string | null>(null);
//   const [viewProfileImage, setViewProfileImage] = useState<string | null>(null);
//   const [viewUsername, setViewUsername] = useState('');
//   const [viewTitle, setViewTitle] = useState('');
//   const [viewMision, setViewMision] = useState('');
  
//   // Track original values to detect changes
//   const [originalValues, setOriginalValues] = useState({
//     backgroundImage: null as string | File | null,
//     profileImage: null as string | File | null,
//     username: '',
//     title: '',
//     mision: ''
//   });
//   const [hasEdited, setHasEdited] = useState(false);

//   // Load profile data when dialog opens or profile changes
//   useEffect(() => {
//     if (isDialogOpen && !isNewProfile && activeTab === "edit") {
//       const profileData = getProfileData();
//       const bgImage = profileData.backgroundImage || null;
//       const profImage = profileData.profileImage || null;
//       const user = profileData.Profile.username || '';
//       const ttl = profileData.Profile.title || '';
//       const msn = profileData.Profile.mision || '';
      
//       setBackgroundImage(bgImage);
//       setProfileImage(profImage);
//       setUsername(user);
//       setTitle(ttl);
//       setMision(msn);
      
//       // Store original values
//       setOriginalValues({
//         backgroundImage: bgImage,
//         profileImage: profImage,
//         username: user,
//         title: ttl,
//         mision: msn
//       });
      
//       // Reset edit tracking
//       setHasEdited(false);
//     }
//   }, [isDialogOpen, isNewProfile, selectedProfileNumber, activeTab]);

//   // Load view data when selected profile changes in view tab
//   useEffect(() => {
//     if (activeTab === "view" && selectedProfileNumber) {
//       const profiles = getAllProfiles();
//       const profile = profiles.find(p => p.number === selectedProfileNumber);
//       if (profile) {
//         setViewBackgroundImage(profile.backgroundImage);
//         setViewProfileImage(profile.profileImage);
//         setViewUsername(profile.Profile.username);
//         setViewTitle(profile.Profile.title);
//         setViewMision(profile.Profile.mision);
//       }
//     }
//   }, [selectedProfileNumber, activeTab]);

//   // Check for edits
//   useEffect(() => {
//     if (!isNewProfile) {
//       const edited = 
//         backgroundImage !== originalValues.backgroundImage ||
//         profileImage !== originalValues.profileImage ||
//         username !== originalValues.username ||
//         title !== originalValues.title ||
//         mision !== originalValues.mision;
      
//       setHasEdited(edited);
//     }
//   }, [backgroundImage, profileImage, username, title, mision, originalValues, isNewProfile]);

//   // Reset form for new profile
//   const resetFormForNewProfile = () => {
//     setBackgroundImage(null);
//     setProfileImage(null);
//     setUsername('');
//     setTitle('');
//     setMision('');
//     setIsNewProfile(true);
//     setHasEdited(false);
//   };

//   const handleImageChange = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setter(file);
//     }
//   };

//   const handleFileRemove = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => () => {
//     setter(null);
//   };

//   // Calculate total size
//   useEffect(() => {
//     const calculateSize = async () => {
//       // For existing profiles, only calculate if user has made edits
//       if (!isNewProfile && !hasEdited) {
//         setTotalSizeMb(0);
//         return;
//       }
      
//       let totalSizeBytes = 0;
      
//       // Calculate text size - all text fields
//       const textEncoder = new TextEncoder();
//       const usernameBytes = textEncoder.encode(username || '').length;
//       const titleBytes = textEncoder.encode(title || '').length;
//       const misionBytes = textEncoder.encode(mision || '').length;
//       totalSizeBytes += usernameBytes + titleBytes + misionBytes;
      
//       // Calculate background image size
//       if (backgroundImage) {
//         if (backgroundImage instanceof File) {
//           // New file upload - use actual file size
//           totalSizeBytes += backgroundImage.size;
//         } else if (typeof backgroundImage === 'string') {
//           if (backgroundImage.startsWith('#')) {
//             // Color code (hex string)
//             totalSizeBytes += textEncoder.encode(backgroundImage).length;
//           } else if (backgroundImage.startsWith('data:')) {
//             // Data URL - extract base64 and calculate size
//             const base64Data = backgroundImage.split(',')[1];
//             if (base64Data) {
//               // Base64 to bytes: (base64.length * 3) / 4
//               totalSizeBytes += Math.ceil((base64Data.length * 3) / 4);
//             }
//           } else if (backgroundImage.startsWith('blob:') || backgroundImage.startsWith('http')) {
//             // URL reference - since we can't fetch due to CORS, use estimates
//             totalSizeBytes += 500000; // 500KB estimate for background images
//           }
//         }
//       }
      
//       // Calculate profile image size  
//       if (profileImage) {
//         if (profileImage instanceof File) {
//           // New file upload - use actual file size
//           totalSizeBytes += profileImage.size;
//         } else if (typeof profileImage === 'string') {
//           if (profileImage.startsWith('#')) {
//             // Color code (hex string)
//             totalSizeBytes += textEncoder.encode(profileImage).length;
//           } else if (profileImage.startsWith('data:')) {
//             // Data URL - extract base64 and calculate size
//             const base64Data = profileImage.split(',')[1];
//             if (base64Data) {
//               // Base64 to bytes: (base64.length * 3) / 4
//               totalSizeBytes += Math.ceil((base64Data.length * 3) / 4);
//             }
//           } else if (profileImage.startsWith('blob:') || profileImage.startsWith('http')) {
//             // URL reference - since we can't fetch due to CORS, use estimates
//             totalSizeBytes += 200000; // 200KB estimate for profile images
//           }
//         }
//       }
      
//       // Add overhead for JSON structure, field names, etc.
//       // Approximately: {"backgroundImage":"...","profileImage":"...","Profile":{"username":"...","title":"...","mision":"..."},"xpub":"..."}
//       const structureOverhead = 150; // Rough estimate for JSON structure
//       totalSizeBytes += structureOverhead;
      
//       // Add xpub size (from profiledata.ts it's a constant)
//       const xpubSize = 130; // The xpub string is 130 characters
//       totalSizeBytes += xpubSize;
      
//       // Convert to MB with 6 decimal places for precision with small sizes
//       const totalSizeMb = totalSizeBytes / (1024 * 1024);
//       setTotalSizeMb(parseFloat(totalSizeMb.toFixed(6)));
//     };
    
//     calculateSize();
//   }, [username, title, mision, backgroundImage, profileImage, isNewProfile, hasEdited]);

//   const handleSubmit = async () => {
//     // Only proceed if there's actually data to submit
//     if (!isNewProfile && !hasEdited) {
//       console.log('No changes made - no submission needed');
//       setIsConfirmDialogOpen(false);
//       setIsDialogOpen(false);
//       return;
//     }
    
//     const profileData: ProfileData = {
//       backgroundImage: typeof backgroundImage === 'string' 
//         ? backgroundImage 
//         : backgroundImage 
//           ? URL.createObjectURL(backgroundImage) 
//           : '#CCCCCC', // Default gray
//       profileImage: typeof profileImage === 'string' 
//         ? profileImage 
//         : profileImage 
//           ? URL.createObjectURL(profileImage) 
//           : '#999999', // Default darker gray
//       Profile: {
//         username: username || 'User',
//         title: title || 'No title',
//         mision: mision || 'No mission statement',
//       },
//     };

//     if (isNewProfile) {
//       const newNumber = createNewProfile(profileData);
//       console.log('New Profile Created with number:', newNumber);
//     } else {
//       updateProfileData(profileData);
//       console.log('Profile Data Updated');
//     }
    
//     setIsConfirmDialogOpen(false);
//     setIsDialogOpen(false);
//     setIsNewProfile(false);
    
//     // Emit profile change event
//     window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    
//     // Call the callback if provided
//     if (onProfileUpdate) {
//       onProfileUpdate();
//     }
//   };

//   const handleProfileSwitch = (value: string) => {
//     const profileNumber = parseInt(value, 10);
//     if (value === 'new') {
//       resetFormForNewProfile();
//       setActiveTab("edit");
//     } else {
//       setPendingSwitchNumber(profileNumber);
//       setIsSwitchProfileDialogOpen(true);
//     }
//   };

//   const confirmProfileSwitch = () => {
//     setIsNewProfile(false);
//     switchToProfile(pendingSwitchNumber);
//     setSelectedProfileNumber(pendingSwitchNumber);
    
//     // Emit profile change event when switching profiles
//     window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    
//     // Call the callback if provided
//     if (onProfileUpdate) {
//       onProfileUpdate();
//     }
    
//     setIsSwitchProfileDialogOpen(false);
//     setIsDialogOpen(false);
//   };

//   const { handleSubmit: formHandleSubmit } = useForm();
//   const allProfiles = getAllProfiles();

//   // Profile form component (reusable for both tabs)
//   const ProfileForm = ({ isViewMode = false }) => (
//     <form onSubmit={formHandleSubmit(handleSubmit)} className="grid gap-4 py-4">
//       <div className="grid gap-2">
//         <Label htmlFor="backgroundImage" className="text-left">Background Image</Label>
//         <div className="w-full flex justify-center">
//           <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-40 relative overflow-hidden">
//             {(isViewMode ? viewBackgroundImage : backgroundImage) && (
//               <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
//                 {typeof (isViewMode ? viewBackgroundImage : backgroundImage) === 'string' && (isViewMode ? viewBackgroundImage : backgroundImage)?.startsWith('#') ? (
//                   <div style={{ width: '100%', height: '100%', backgroundColor: isViewMode ? viewBackgroundImage : backgroundImage }} />
//                 ) : (
//                   <img 
//                     src={(isViewMode ? viewBackgroundImage : backgroundImage) instanceof File ? URL.createObjectURL(backgroundImage as File) : (isViewMode ? viewBackgroundImage : backgroundImage) as string} 
//                     alt="Background" 
//                     style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
//                   />
//                 )}
//                 {!isViewMode && (
//                   <Button
//                     type="button"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleFileRemove(setBackgroundImage)();
//                     }}
//                     style={{
//                       position: 'absolute',
//                       top: '5px',
//                       right: '5px',
//                       background: 'red',
//                       color: 'white',
//                       border: 'none',
//                       borderRadius: '50%',
//                       width: '20px',
//                       height: '20px',
//                       textAlign: 'center',
//                       lineHeight: '20px',
//                       cursor: 'pointer',
//                     }}
//                   >
//                     x
//                   </Button>
//                 )}
//               </div>
//             )}
//             {!isViewMode && (
//               <input
//                 type="file"
//                 id="backgroundImageInput"
//                 name="backgroundImage"
//                 accept="image/*"
//                 onChange={handleImageChange(setBackgroundImage)}
//                 className="hidden"
//               />
//             )}
//             {!isViewMode && !backgroundImage && (
//               <Label htmlFor="backgroundImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                 <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
//                 <p className="text-gray-600 text-aligned-center text-xs">
//                   Click to select image or use color code
//                 </p>
//               </Label>
//             )}
//           </div>
//         </div>
//       </div>

//       <div className="grid gap-2">
//         <Label htmlFor="profileImage" className="text-left">Profile Image</Label>
//         <div className="w-full flex justify-center">
//           <div className="border border-blue-700 p-0 flex items-center justify-center w-40 h-40 relative overflow-hidden rounded-full">
//             {(isViewMode ? viewProfileImage : profileImage) && (
//               <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
//                 {typeof (isViewMode ? viewProfileImage : profileImage) === 'string' && (isViewMode ? viewProfileImage : profileImage)?.startsWith('#') ? (
//                   <div style={{ width: '100%', height: '100%', backgroundColor: isViewMode ? viewProfileImage : profileImage }} />
//                 ) : (
//                   <img 
//                     src={(isViewMode ? viewProfileImage : profileImage) instanceof File ? URL.createObjectURL(profileImage as File) : (isViewMode ? viewProfileImage : profileImage) as string} 
//                     alt="Profile" 
//                     style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
//                   />
//                 )}
//                 {!isViewMode && (
//                   <Button
//                     type="button"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleFileRemove(setProfileImage)();
//                     }}
//                     style={{
//                       position: 'absolute',
//                       top: '15px',
//                       right: '15px',
//                       background: 'red',
//                       color: 'white',
//                       border: 'none',
//                       borderRadius: '50%',
//                       width: '20px',
//                       height: '20px',
//                       textAlign: 'center',
//                       lineHeight: '20px',
//                       cursor: 'pointer',
//                       fontSize: '12px',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                     }}
//                   >
//                     ×
//                   </Button>
//                 )}
//               </div>
//             )}
//             {!isViewMode && (
//               <input
//                 type="file"
//                 id="profileImageInput"
//                 name="profileImage"
//                 accept="image/*"
//                 onChange={handleImageChange(setProfileImage)}
//                 className="hidden"
//               />
//             )}
//             {!isViewMode && !profileImage && (
//               <Label htmlFor="profileImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                 <UploadCloud className="text-gray-400 mb-2" style={{ height: '2rem', width: '2rem' }} />
//                 <p className="text-gray-600 text-aligned-center text-xs">
//                   Click to select
//                 </p>
//               </Label>
//             )}
//           </div>
//         </div>
//       </div>

//       <div className="grid gap-2">
//         <Label htmlFor="username" className="text-left">Username</Label>
//         <Input
//           id="username"
//           placeholder="Username"
//           value={isViewMode ? viewUsername : username}
//           onChange={(e) => !isViewMode && setUsername(e.target.value)}
//           onClick={(e) => e.stopPropagation()}
//           maxLength={25}
//           className="w-full"
//           required
//           disabled={isViewMode}
//         />
//         {!isViewMode && isNewProfile && username.length < 2 && username.length > 0 && (
//           <p className="text-red-500 text-sm">Minimum of 2 characters required</p>
//         )}
//       </div>

//       <div className="grid gap-2">
//         <Label htmlFor="title" className="text-left">Title</Label>
//         <Input
//           id="title"
//           placeholder="Title"
//           value={isViewMode ? viewTitle : title}
//           onChange={(e) => !isViewMode && setTitle(e.target.value)}
//           onClick={(e) => e.stopPropagation()}
//           maxLength={50}
//           className="w-full"
//           required
//           disabled={isViewMode}
//         />
//       </div>

//       <div className="grid gap-2">
//         <Label htmlFor="mision" className="text-left">Mission</Label>
//         <textarea
//           id="mision"
//           placeholder="Mission statement"
//           value={isViewMode ? viewMision : mision}
//           maxLength={250}
//           onChange={(e) => !isViewMode && setMision(e.target.value)}
//           onClick={(e) => e.stopPropagation()}
//           className="resize-none w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
//           rows={7}
//           disabled={isViewMode}
//         />
//       </div>

//       {!isViewMode && (
//         <>
//           <p className="mt-2 text-gray-600">
//             Total data size: {totalSizeMb > 0 ? `${totalSizeMb.toFixed(6)} MB` : '0.000000 MB'}
//             <span className="text-xs block text-gray-500">
//               {isNewProfile ? '(New profile data)' : hasEdited && totalSizeMb > 0 ? '(All profile data is submitted together)' : '(No changes made)'}
//             </span>
//           </p>

//           <DialogFooter>
//             <div className="flex space-x-4 w-full">
//               <div className="flex-1 flex justify-center items-center">
//                 <Button 
//                   type="button" 
//                   className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
//                   onClick={() => setIsConfirmDialogOpen(true)}
//                   disabled={(isNewProfile && username.length < 2) || (!isNewProfile && !hasEdited)}
//                 >
//                   {isNewProfile ? 'Create New Profile' : hasEdited ? 'Update Profile' : 'No Changes to Update'}
//                 </Button>
//               </div>
//               <div className="flex-1 pt-2 flex justify-center items-center">
//                 <Button 
//                   type="button" 
//                   variant="outline" 
//                   onClick={() => {
//                     setIsDialogOpen(false);
//                     setIsNewProfile(false);
//                   }}
//                 >
//                   Exit
//                 </Button>
//               </div>
//             </div>
//           </DialogFooter>
//         </>
//       )}
//     </form>
//   );

//   return (
//     <>
//       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//         <DialogTrigger asChild>
//           <button 
//             className={`flex w-full items-center py-3 bg-mauve-dark-2 active:scale-[0.98] dark:bg-mauve-light-2 ${className || ''}`}
//             onClick={(e) => {
//               e.stopPropagation();
//               setIsDialogOpen(true);
//             }}
//           >
//             <div className="h-5 w-5 pr-8">
//               <FaCog className="h-5 w-5 text-mauve-dark-12 dark:text-mauve-light-12" />
//             </div>
//           </button>
//         </DialogTrigger>
//         <DialogContent 
//           className="h-screen max-h-screen overflow-y-auto bg-white dark:bg-gray-900"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <DialogHeader>
//             <DialogTitle>Profile Settings</DialogTitle>
//             <DialogDescription>
//               Manage your profiles
//             </DialogDescription>
//           </DialogHeader>

//           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//             <TabsList className="grid w-full grid-cols-2">
//               <TabsTrigger value="edit">Edit Current Profile</TabsTrigger>
//               <TabsTrigger value="view">View Profiles</TabsTrigger>
//             </TabsList>
            
//             <TabsContent value="edit">
//               <ProfileForm isViewMode={false} />
//             </TabsContent>
            
//             <TabsContent value="view">
//               <div className="grid gap-4">
//                 <div className="grid gap-2">
//                   <Label>Select Profile</Label>
//                   <Select 
//                     value={selectedProfileNumber.toString()} 
//                     onValueChange={handleProfileSwitch}
//                   >
//                     <SelectTrigger className="w-full">
//                       <SelectValue placeholder="Select a profile" />
//                     </SelectTrigger>
//                     <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 max-h-[300px] overflow-y-auto">
//                       {allProfiles.map(profile => (
//                         <SelectItem key={profile.number} value={profile.number.toString()}>
//                           Update {profile.number}: {profile.Profile.username}
//                         </SelectItem>
//                       ))}
//                       <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
//                       <SelectItem value="new">+ Create new updated profile</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <ProfileForm isViewMode={true} />
//               </div>
//             </TabsContent>
//           </Tabs>
//         </DialogContent>
//       </Dialog>
      
//       <ConfirmDialog 
//         isOpen={isConfirmDialogOpen}
//         onOpenChange={setIsConfirmDialogOpen}
//         totalSizeMb={totalSizeMb}
//         handleSubmit={handleSubmit}
//         isNewProfile={isNewProfile}
//       />
      
//       <SwitchProfileDialog
//         isOpen={isSwitchProfileDialogOpen}
//         onOpenChange={setIsSwitchProfileDialogOpen}
//         handleSwitch={confirmProfileSwitch}
//         selectedProfileNumber={pendingSwitchNumber}
//       />
//     </>
//   );
// };

// export default SettingProfile;














// import React, { useState, useEffect } from 'react';
// import { Button } from "../../ui/button";
// import { useForm } from 'react-hook-form';
// import { Input } from "../../ui/input";
// import { Label } from "../../ui/label";
// import { UploadCloud } from "lucide-react";
// import { FaCog } from 'react-icons/fa';
// import { 
//   getProfileData, 
//   updateProfileData, 
//   createNewProfile, 
//   ProfileData,
//   getCurrentProfileNumber,
//   getAllProfiles,
//   switchToProfile
// } from '../data/profiledata';
// import {
//   Dialog,
//   //DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "../../ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../../ui/select";

// // Define the event constant locally to avoid circular dependencies
// const PROFILE_CHANGE_EVENT = 'profileChanged';

// interface ConfirmDialogProps {
//   isOpen: boolean;
//   onOpenChange: (open: boolean) => void;
//   totalSizeMb: number;
//   handleSubmit: () => void;
//   isNewProfile: boolean;
// }

// const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
//   isOpen, 
//   onOpenChange, 
//   totalSizeMb, 
//   handleSubmit,
//   isNewProfile 
// }) => {
//   return (
//     <Dialog open={isOpen} onOpenChange={onOpenChange}>
//       <DialogContent className="bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
//         <DialogHeader>
//           <DialogTitle>Confirm Profile {isNewProfile ? 'Creation' : 'Update'}</DialogTitle>
//           <DialogDescription>
//             <br />
//             Total data size: {totalSizeMb} MB
//             <br />
//             {isNewProfile 
//               ? 'This will create a new profile with the next available number.' 
//               : 'This will update the current profile with your changes.'}
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <div className="flex space-x-4">
//             <div className="flex-1 flex justify-center items-center">
//               <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//             </div>
//             <div className="flex-1 flex justify-center items-center">
//               <Button 
//                 className='bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out' 
//                 type="button" 
//                 variant="secondary" 
//                 onClick={handleSubmit}
//               >
//                 Complete transaction
//               </Button>
//             </div>
//           </div>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// interface SettingProfileProps {
//   className?: string;
//   onProfileUpdate?: () => void;
// }

// const SettingProfile: React.FC<SettingProfileProps> = ({ className, onProfileUpdate }) => {
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
//   const [isNewProfile, setIsNewProfile] = useState(false);
//   const [selectedProfileNumber, setSelectedProfileNumber] = useState(getCurrentProfileNumber());
  
//   // Form state
//   const [backgroundImage, setBackgroundImage] = useState<string | File | null>(null);
//   const [profileImage, setProfileImage] = useState<string | File | null>(null);
//   const [username, setUsername] = useState('');
//   const [title, setTitle] = useState('');
//   const [mision, setMision] = useState('');
//   const [totalSizeMb, setTotalSizeMb] = useState<number>(0);

//   // Load profile data when dialog opens or profile changes
//   useEffect(() => {
//     if (isDialogOpen && !isNewProfile) {
//       const profileData = getProfileData();
//       setBackgroundImage(profileData.backgroundImage || null);
//       setProfileImage(profileData.profileImage || null);
//       setUsername(profileData.Profile.username || '');
//       setTitle(profileData.Profile.title || '');
//       setMision(profileData.Profile.mision || '');
//     }
//   }, [isDialogOpen, isNewProfile, selectedProfileNumber]);

//   // Reset form for new profile
//   const resetFormForNewProfile = () => {
//     setBackgroundImage(null);
//     setProfileImage(null);
//     setUsername('');
//     setTitle('');
//     setMision('');
//     setIsNewProfile(true);
//   };

//   const handleImageChange = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setter(file);
//     }
//   };

//   const handleFileRemove = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => () => {
//     setter(null);
//   };

//   // Calculate total size
//   useEffect(() => {
//     const calculateSize = async () => {
//       let totalSizeBytes = 0;
      
//       // Calculate text size - all text fields are always included
//       const textSize = new Blob([username, title, mision]).size;
//       totalSizeBytes += textSize;
      
//       // Calculate background image size
//       if (backgroundImage instanceof File) {
//         totalSizeBytes += backgroundImage.size;
//       } else if (typeof backgroundImage === 'string' && backgroundImage) {
//         // For existing images (URLs), estimate size
//         if (backgroundImage.startsWith('#')) {
//           // Color code
//           totalSizeBytes += 50;
//         } else if (backgroundImage.startsWith('blob:') || backgroundImage.startsWith('http')) {
//           // For existing images, we need to fetch and calculate actual size
//           try {
//             const response = await fetch(backgroundImage);
//             const blob = await response.blob();
//             totalSizeBytes += blob.size;
//           } catch (error) {
//             // If fetch fails, use a reasonable estimate for an image
//             totalSizeBytes += 500000; // 500KB estimate
//           }
//         }
//       }
      
//       // Calculate profile image size
//       if (profileImage instanceof File) {
//         totalSizeBytes += profileImage.size;
//       } else if (typeof profileImage === 'string' && profileImage) {
//         // For existing images (URLs), estimate size
//         if (profileImage.startsWith('#')) {
//           // Color code
//           totalSizeBytes += 50;
//         } else if (profileImage.startsWith('blob:') || profileImage.startsWith('http')) {
//           // For existing images, we need to fetch and calculate actual size
//           try {
//             const response = await fetch(profileImage);
//             const blob = await response.blob();
//             totalSizeBytes += blob.size;
//           } catch (error) {
//             // If fetch fails, use a reasonable estimate for an image
//             totalSizeBytes += 200000; // 200KB estimate for profile images
//           }
//         }
//       }
      
//       const totalSizeMb = totalSizeBytes / (1024 * 1024);
//       setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
//     };
    
//     calculateSize();
//   }, [username, title, mision, backgroundImage, profileImage]);

//   const handleSubmit = async () => {
//     const profileData: ProfileData = {
//       backgroundImage: typeof backgroundImage === 'string' 
//         ? backgroundImage 
//         : backgroundImage 
//           ? URL.createObjectURL(backgroundImage) 
//           : '#CCCCCC', // Default gray
//       profileImage: typeof profileImage === 'string' 
//         ? profileImage 
//         : profileImage 
//           ? URL.createObjectURL(profileImage) 
//           : '#999999', // Default darker gray
//       Profile: {
//         username: username || 'User',
//         title: title || 'No title',
//         mision: mision || 'No mission statement',
//       },
//     };

//     if (isNewProfile) {
//       const newNumber = createNewProfile(profileData);
//       console.log('New Profile Created with number:', newNumber);
//     } else {
//       updateProfileData(profileData);
//       console.log('Profile Data Updated');
//     }
    
//     setIsConfirmDialogOpen(false);
//     setIsDialogOpen(false);
//     setIsNewProfile(false);
    
//     // Emit profile change event
//     window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    
//     // Call the callback if provided
//     if (onProfileUpdate) {
//       onProfileUpdate();
//     }
//   };

//   const handleProfileSwitch = (value: string) => {
//     const profileNumber = parseInt(value, 10);
//     if (value === 'new') {
//       resetFormForNewProfile();
//     } else {
//       setIsNewProfile(false);
//       switchToProfile(profileNumber);
//       setSelectedProfileNumber(profileNumber);
      
//       // Emit profile change event when switching profiles
//       window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
      
//       // Call the callback if provided
//       if (onProfileUpdate) {
//         onProfileUpdate();
//       }
//     }
//   };

//   const { handleSubmit: formHandleSubmit } = useForm();
//   const allProfiles = getAllProfiles();

//   return (
//     <>
//       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//         <DialogTrigger asChild>
//           <button 
//             className={`flex w-full items-center py-3 bg-mauve-dark-2 active:scale-[0.98] dark:bg-mauve-light-2 ${className || ''}`}
//             onClick={(e) => {
//               e.stopPropagation();
//               setIsDialogOpen(true);
//             }}
//           >
//             <div className="h-5 w-5 pr-8">
//               <FaCog className="h-5 w-5 text-mauve-dark-12 dark:text-mauve-light-12" />
//             </div>
//           </button>
//         </DialogTrigger>
//         <DialogContent 
//           className="h-screen max-h-screen overflow-y-auto bg-white dark:bg-gray-900"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <DialogHeader>
//             <DialogTitle>Profile Settings</DialogTitle>
//             <DialogDescription>
//               {isNewProfile ? 'Create a new profile' : 'Edit your current profile or create a new one'}
//             </DialogDescription>
//           </DialogHeader>

//           {/* Profile Selector */}
//           <div className="grid gap-2 mb-4">
//             <Label>Select Profile</Label>
//             <Select 
//               value={isNewProfile ? 'new' : selectedProfileNumber.toString()} 
//               onValueChange={handleProfileSwitch}
//             >
//               <SelectTrigger className="w-full">
//                 <SelectValue placeholder="Select a profile" />
//               </SelectTrigger>
//               <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
//                 {allProfiles.map(profile => (
//                   <SelectItem key={profile.number} value={profile.number.toString()}>
//                     Update {profile.number}: {profile.Profile.username}
//                   </SelectItem>
//                 ))}
//                 <SelectItem value="new">+ Create New Profile</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <form onSubmit={formHandleSubmit(handleSubmit)} className="grid gap-4 py-4">
//             <div className="grid gap-2">
//               <Label htmlFor="backgroundImage" className="text-left">Background Image</Label>
//               <div className="w-full flex justify-center">
//                 <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-40 relative overflow-hidden">
//                   {backgroundImage && (
//                     <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
//                       {typeof backgroundImage === 'string' && backgroundImage.startsWith('#') ? (
//                         <div style={{ width: '100%', height: '100%', backgroundColor: backgroundImage }} />
//                       ) : (
//                         <img 
//                           src={backgroundImage instanceof File ? URL.createObjectURL(backgroundImage) : backgroundImage} 
//                           alt="Background" 
//                           style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
//                         />
//                       )}
//                       <Button
//                         type="button"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleFileRemove(setBackgroundImage)();
//                         }}
//                         style={{
//                           position: 'absolute',
//                           top: '5px',
//                           right: '5px',
//                           background: 'red',
//                           color: 'white',
//                           border: 'none',
//                           borderRadius: '50%',
//                           width: '20px',
//                           height: '20px',
//                           textAlign: 'center',
//                           lineHeight: '20px',
//                           cursor: 'pointer',
//                         }}
//                       >
//                         x
//                       </Button>
//                     </div>
//                   )}
//                   <input
//                     type="file"
//                     id="backgroundImageInput"
//                     name="backgroundImage"
//                     accept="image/*"
//                     onChange={handleImageChange(setBackgroundImage)}
//                     className="hidden"
//                   />
//                   {!backgroundImage && (
//                     <Label htmlFor="backgroundImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                       <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
//                       <p className="text-gray-600 text-aligned-center text-xs">
//                         Click to select image or use color code
//                       </p>
//                     </Label>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="profileImage" className="text-left">Profile Image</Label>
//               <div className="w-full flex justify-center">
//                 <div className="border border-blue-700 p-0 flex items-center justify-center w-40 h-40 relative overflow-hidden rounded-full">
//                   {profileImage && (
//                     <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
//                       {typeof profileImage === 'string' && profileImage.startsWith('#') ? (
//                         <div style={{ width: '100%', height: '100%', backgroundColor: profileImage }} />
//                       ) : (
//                         <img 
//                           src={profileImage instanceof File ? URL.createObjectURL(profileImage) : profileImage} 
//                           alt="Profile" 
//                           style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
//                         />
//                       )}
//                       <Button
//                         type="button"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleFileRemove(setProfileImage)();
//                         }}
//                         style={{
//                           position: 'absolute',
//                           top: '15px',
//                           right: '15px',
//                           background: 'red',
//                           color: 'white',
//                           border: 'none',
//                           borderRadius: '50%',
//                           width: '20px',
//                           height: '20px',
//                           textAlign: 'center',
//                           lineHeight: '20px',
//                           cursor: 'pointer',
//                           fontSize: '12px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                         }}
//                       >
//                         ×
//                       </Button>
//                     </div>
//                   )}
//                   <input
//                     type="file"
//                     id="profileImageInput"
//                     name="profileImage"
//                     accept="image/*"
//                     onChange={handleImageChange(setProfileImage)}
//                     className="hidden"
//                   />
//                   {!profileImage && (
//                     <Label htmlFor="profileImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                       <UploadCloud className="text-gray-400 mb-2" style={{ height: '2rem', width: '2rem' }} />
//                       <p className="text-gray-600 text-aligned-center text-xs">
//                         Click to select
//                       </p>
//                     </Label>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="username" className="text-left">Username</Label>
//               <Input
//                 id="username"
//                 placeholder="Username"
//                 value={username}
//                 onChange={(e) => setUsername(e.target.value)}
//                 onClick={(e) => e.stopPropagation()}
//                 maxLength={25}
//                 className="w-full"
//                 required
//               />
//               {isNewProfile && username.length < 2 && username.length > 0 && (
//                 <p className="text-red-500 text-sm">Minimum of 2 characters required</p>
//               )}
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="title" className="text-left">Title</Label>
//               <Input
//                 id="title"
//                 placeholder="Title"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 onClick={(e) => e.stopPropagation()}
//                 maxLength={50}
//                 className="w-full"
//                 required
//               />
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="mision" className="text-left">Mission</Label>
//               <textarea
//                 id="mision"
//                 placeholder="Mission statement"
//                 value={mision}
//                 maxLength={250}
//                 onChange={(e) => setMision(e.target.value)}
//                 onClick={(e) => e.stopPropagation()}
//                 className="resize-none w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
//                 rows={7}
//               />
//             </div>

//             <p className="mt-2 text-gray-600">
//               Total data size: {totalSizeMb} MB
//               <span className="text-xs block text-gray-500">
//                 (All profile data is submitted together)
//               </span>
//             </p>

//             <DialogFooter>
//               <div className="flex space-x-4 w-full">
//                 <div className="flex-1 flex justify-center items-center">
//                   <Button 
//                     type="button" 
//                     className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
//                     onClick={() => setIsConfirmDialogOpen(true)}
//                     disabled={isNewProfile && username.length < 2}
//                   >
//                     {isNewProfile ? 'Create New Profile' : 'Update Profile'}
//                   </Button>
//                 </div>
//                 <div className="flex-1 pt-2 flex justify-center items-center">
//                   <Button 
//                     type="button" 
//                     variant="outline" 
//                     onClick={() => {
//                       setIsDialogOpen(false);
//                       setIsNewProfile(false);
//                     }}
//                   >
//                     Exit
//                   </Button>
//                 </div>
//               </div>
//             </DialogFooter>
//           </form>
//         </DialogContent>
//       </Dialog>
      
//       <ConfirmDialog 
//         isOpen={isConfirmDialogOpen}
//         onOpenChange={setIsConfirmDialogOpen}
//         totalSizeMb={totalSizeMb}
//         handleSubmit={handleSubmit}
//         isNewProfile={isNewProfile}
//       />
//     </>
//   );
// };

// export default SettingProfile;





















































// import React, { useState, useEffect } from 'react';
// import { Button } from "../../ui/button";
// import { useForm } from 'react-hook-form';
// import { Input } from "../../ui/input";
// import { Label } from "../../ui/label";
// import { UploadCloud } from "lucide-react";
// import { FaCog } from 'react-icons/fa';
// import { getProfileData, updateProfileData, ProfileData } from '../data/profiledata';
// import {
//   Dialog,
//   DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "../../ui/dialog";

// interface ConfirmDialogProps {
//   isOpen: boolean;
//   onOpenChange: (open: boolean) => void;
//   totalSizeMb: number;
//   handleSubmit: () => void;
// }

// const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, onOpenChange, totalSizeMb, handleSubmit }) => {
//   return (
//     <Dialog open={isOpen} onOpenChange={onOpenChange}>
//       <DialogContent className="bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
//         <DialogHeader>
//           <DialogTitle>Confirm Profile Settings</DialogTitle>
//           <DialogDescription>
//             <br />
//             Total data size: {totalSizeMb} MB
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <div className="flex space-x-4">
//             <div className="flex-1 flex justify-center items-center">
//               <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
//             </div>
//             <div className="flex-1 flex justify-center items-center">
//               <Button className='bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out' type="button" variant="secondary" onClick={handleSubmit}>Complete transaction</Button>
//             </div>
//           </div>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// const SettingProfile: React.FC<{ className?: string }> = ({ className }) => {
//   const initialData = getProfileData();
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

//   const [backgroundImage, setBackgroundImage] = useState<string | File | null>(initialData.backgroundImage || null);
//   const [profileImage, setProfileImage] = useState<string | File | null>(initialData.profileImage || null);
//   const [title, setTitle] = useState(initialData.Profile.title);
//   const [mision, setMision] = useState(initialData.Profile.mision);
//   const [totalSizeMb, setTotalSizeMb] = useState<number>(0);

//   const handleImageChange = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setter(file);
//     }
//   };

//   const handleFileRemove = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => () => {
//     setter(null);
//   };

//   useEffect(() => {
//     const calculateSize = async () => {
//       let totalSizeBytes = 0;
      
//       // Calculate text size
//       const textSize = new Blob([title, mision]).size;
//       totalSizeBytes += textSize;
      
//       // Calculate background image size
//       if (backgroundImage instanceof File) {
//         totalSizeBytes += backgroundImage.size;
//       } else if (typeof backgroundImage === 'string' && backgroundImage) {
//         try {
//           const response = await fetch(backgroundImage);
//           const blob = await response.blob();
//           totalSizeBytes += blob.size;
//         } catch (error) {
//           console.error('Error fetching background image:', error);
//         }
//       }
      
//       // Calculate profile image size
//       if (profileImage instanceof File) {
//         totalSizeBytes += profileImage.size;
//       } else if (typeof profileImage === 'string' && profileImage) {
//         try {
//           const response = await fetch(profileImage);
//           const blob = await response.blob();
//           totalSizeBytes += blob.size;
//         } catch (error) {
//           console.error('Error fetching profile image:', error);
//         }
//       }
      
//       const totalSizeMb = totalSizeBytes / (1024 * 1024);
//       setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
//     };
    
//     calculateSize();
//   }, [title, mision, backgroundImage, profileImage]);

//   const handleSubmit = async () => {
//     const profileData: ProfileData = {
//       backgroundImage: typeof backgroundImage === 'string' ? backgroundImage : backgroundImage ? URL.createObjectURL(backgroundImage) : '',
//       profileImage: typeof profileImage === 'string' ? profileImage : profileImage ? URL.createObjectURL(profileImage) : '',
//       Profile: {
//         username: initialData.Profile.username,
//         title,
//         mision,
//       },
//     };
//     updateProfileData(profileData);
//     console.log('Profile Data Saved:', profileData);
//     setIsConfirmDialogOpen(false);
//     setIsDialogOpen(false);
//   };

//   const { handleSubmit: formHandleSubmit } = useForm();

//   return (
//     <>
//       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//         <DialogTrigger asChild>
//           <button 
//             className={`flex w-full items-center py-3 bg-mauve-dark-2 active:scale-[0.98] dark:bg-mauve-light-2 ${className || ''}`}
//             onClick={(e) => {
//               e.stopPropagation();
//               setIsDialogOpen(true);
//             }}
//           >
//             <div className="h-5 w-5 pr-8">
//               <FaCog className="h-5 w-5 text-mauve-dark-12 dark:text-mauve-light-12" />
//             </div>
//           </button>
//         </DialogTrigger>
//         <DialogContent 
//           className="h-screen max-h-screen overflow-y-auto bg-white dark:bg-gray-900"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <DialogHeader>
//             <DialogTitle>Profile data:</DialogTitle>
//             <DialogDescription>
//               Customize your profile display below.
//             </DialogDescription>
//           </DialogHeader>

//           <form onSubmit={formHandleSubmit(handleSubmit)} className="grid gap-4 py-4">
//             <div className="grid gap-2">
//               <Label htmlFor="backgroundImage" className="text-left">Background Image</Label>
//               <div className="w-full flex justify-center">
//                 <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-60 relative overflow-hidden">
//                   {backgroundImage && (
//                     <div style={{ position: 'relative', width: '15rem', height: '10rem', overflow: 'hidden' }}>
//                       <img src={backgroundImage instanceof File ? URL.createObjectURL(backgroundImage) : backgroundImage} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
//                       <Button
//                         type="button"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleFileRemove(setBackgroundImage)();
//                         }}
//                         style={{
//                           position: 'absolute',
//                           top: '5px',
//                           right: '5px',
//                           background: 'red',
//                           color: 'white',
//                           border: 'none',
//                           borderRadius: '50%',
//                           width: '20px',
//                           height: '20px',
//                           textAlign: 'center',
//                           lineHeight: '20px',
//                           cursor: 'pointer',
//                         }}
//                       >
//                         x
//                       </Button>
//                     </div>
//                   )}
//                   <input
//                     type="file"
//                     id="backgroundImageInput"
//                     name="backgroundImage"
//                     accept="image/*"
//                     onChange={handleImageChange(setBackgroundImage)}
//                     className="hidden"
//                   />
//                   {!backgroundImage && (
//                     <Label htmlFor="backgroundImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                       <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
//                       <p className="text-gray-600 text-aligned-center text-xs">
//                         Drag & drop image here, or click to select image.
//                       </p>
//                     </Label>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="profileImage" className="text-left">Profile Image</Label>
//               <div className="w-full flex justify-center">
//                 <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-60 relative overflow-hidden">
//                   {profileImage && (
//                     <div style={{ position: 'relative', width: '15rem', height: '15rem', overflow: 'hidden' }}>
//                       <img src={profileImage instanceof File ? URL.createObjectURL(profileImage) : profileImage} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
//                       <Button
//                         type="button"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleFileRemove(setProfileImage)();
//                         }}
//                         style={{
//                           position: 'absolute',
//                           top: '5px',
//                           right: '5px',
//                           background: 'red',
//                           color: 'white',
//                           border: 'none',
//                           borderRadius: '50%',
//                           width: '20px',
//                           height: '20px',
//                           textAlign: 'center',
//                           lineHeight: '20px',
//                           cursor: 'pointer',
//                         }}
//                       >
//                         x
//                       </Button>
//                     </div>
//                   )}
//                   <input
//                     type="file"
//                     id="profileImageInput"
//                     name="profileImage"
//                     accept="image/*"
//                     onChange={handleImageChange(setProfileImage)}
//                     className="hidden"
//                   />
//                   {!profileImage && (
//                     <Label htmlFor="profileImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                       <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
//                       <p className="text-gray-600 text-aligned-center text-xs">
//                         Drag & drop image here, or click to select image.
//                       </p>
//                     </Label>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="title" className="text-left">Title</Label>
//               <Input
//                 id="title"
//                 placeholder="Title"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 onClick={(e) => e.stopPropagation()}
//                 maxLength={35}
//                 className="w-full"
//                 required
//               />
//             </div>

//             <div className="grid gap-2">
//               <Label htmlFor="mision" className="text-left">Mision</Label>
//               <textarea
//                 id="mision"
//                 placeholder="Mision"
//                 value={mision}
//                 maxLength={250}
//                 onChange={(e) => setMision(e.target.value)}
//                 onClick={(e) => e.stopPropagation()}
//                 className="resize-none w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
//                 rows={7}
//               />
//             </div>

//             <p className="mt-2 text-gray-600">Total data size: {totalSizeMb} MB</p>

//             <DialogFooter>
//               <div className="flex space-x-4 w-full">
//                 <div className="flex-1 flex justify-center items-center">
//                   <Button 
//                     type="button" 
//                     className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out"
//                     onClick={() => setIsConfirmDialogOpen(true)}
//                   >
//                     Create
//                   </Button>
//                 </div>
//                 <div className="flex-1 pt-2 flex justify-center items-center">
//                   <Button 
//                     type="button" 
//                     variant="outline" 
//                     onClick={() => setIsDialogOpen(false)}
//                   >
//                     Exit
//                   </Button>
//                 </div>
//               </div>
//             </DialogFooter>
//           </form>
//         </DialogContent>
//       </Dialog>
      
//       <ConfirmDialog 
//         isOpen={isConfirmDialogOpen}
//         onOpenChange={setIsConfirmDialogOpen}
//         totalSizeMb={totalSizeMb}
//         handleSubmit={handleSubmit}
//       />
//     </>
//   );
// };

// export default SettingProfile;























































































// import React, { useState, useEffect } from 'react';
// import { Button } from "../../ui/button";
// import { useForm } from 'react-hook-form';
// import { Input } from "../../ui/input";
// import { Label } from "../../ui/label";
// import { Switch } from "../../ui/switch";
// import { UploadCloud } from "lucide-react";
// import { FaCog } from 'react-icons/fa';
// import { getProfileData, updateProfileData, ProfileData } from '../data/profiledata';
// import {
//   Dialog,
//   DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "../../ui/dialog";

// interface DialogDemoProps {
//   totalSizeMb: number;
//   handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
//   handleImageRemove: () => void;
//   image: string | null;
//   handleSubmit: () => void;
// }

// const DialogDemo: React.FC<DialogDemoProps> = ({ totalSizeMb, handleImageChange, handleImageRemove, image, handleSubmit }) => {
//   const [title, setTitle] = useState<string>('');
//   const [description, setDescription] = useState<string>('');

//   const isFormValid = title.trim() !== '' && description.trim() !== '' && image !== null;

//   return (
//     <Dialog>
//       <DialogTrigger asChild>
//         <Button type="button" className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition duration-150 ease-in-out">
//           Save Settings
//         </Button>
//       </DialogTrigger>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Confirm Profile Settings</DialogTitle>
//           <DialogDescription>
//             <br />
//             Total data size: {totalSizeMb} Mb
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <div className="flex space-x-4">
//             <div className="flex-1 flex justify-center items-center">
//               <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
//             </div>
//             <div className="flex-1 flex justify-center items-center">
//               <DialogClose onClick={handleSubmit}><Button type="button" variant="secondary">Complete transaction</Button></DialogClose>
//             </div>
//           </div>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// const SettingProfile: React.FC<{ className?: string }> = ({ className }) => {
//   const initialData = getProfileData();

//   const [profileVisibility, setProfileVisibility] = useState(initialData.profileVisibility);
//   const [followerAccess, setFollowerAccess] = useState(initialData.followerAccess);
//   const [backgroundImage, setBackgroundImage] = useState<string | File | null>(initialData.backgroundImage || null);
//   const [profileImage, setProfileImage] = useState<string | File | null>(initialData.profileImage || null);
//   const [title, setTitle] = useState(initialData.Profile.title);
//   const [bio, setBio] = useState(initialData.Profile.bio);
//   const [mision, setMision] = useState(initialData.Profile.mision);
//   const [cv, setCv] = useState<File | null>(null);
//   const [mapPosition, setMapPosition] = useState<[number, number]>(initialData.mapPosition);
//   const [totalSizeMb, setTotalSizeMb] = useState<number>(0);
//   const [carouselItems1, setCarouselItems1] = useState(initialData.carouselItems1);
//   const [carouselItems2, setCarouselItems2] = useState(initialData.carouselItems2);

//   const handleImageChange = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setter(file);
//     }
//   };

//   const handleFileRemove = (setter: React.Dispatch<React.SetStateAction<string | File | null>>) => () => {
//     setter(null);
//   };

//   const handleMapClick = (e: any) => {
//     setMapPosition([e.latlng.lat, e.latlng.lng]);
//   };

//   useEffect(() => {
//     const textFields = new Blob([title, bio, mision]).size;
//     const imagesSize = (backgroundImage instanceof File ? backgroundImage.size : 0) + 
//                       (profileImage instanceof File ? profileImage.size : 0) + 
//                       (cv?.size || 0);
//     const totalSizeBytes = textFields + imagesSize;
//     const totalSizeMb = totalSizeBytes / (1024 * 1024);
//     setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
//   }, [title, bio, mision, backgroundImage, profileImage, cv]);

//   const handleSubmit = async () => {
//     const profileData: ProfileData = {
//       profileVisibility,
//       followerAccess,
//       backgroundImage: typeof backgroundImage === 'string' ? backgroundImage : backgroundImage ? URL.createObjectURL(backgroundImage) : '',
//       profileImage: typeof profileImage === 'string' ? profileImage : profileImage ? URL.createObjectURL(profileImage) : '',
//       Profile: {
//         username: initialData.Profile.username,
//         title,
//         mision,
//         bio,
//       },
//       counters: initialData.counters,
//       cv: cv ? URL.createObjectURL(cv) : null,
//       mapPosition,
//       carouselItems1,
//       carouselItems2,
//     };
//     updateProfileData(profileData);
//     console.log('Profile Data Saved:', profileData);
//   };

//   const { register, handleSubmit: formHandleSubmit } = useForm();

//   return (
//     <Dialog>
//       <DialogTrigger className={`flex w-full items-center py-3 bg-mauve-dark-2 active:scale-[0.98] dark:bg-mauve-light-2 ${className || ''}`}>
//         <div className="px-4">
//           <FaCog className="h-5 w-5 text-mauve-dark-12 dark:text-mauve-light-12" />
//         </div>
//         <div>
//           <h3 className="text-base text-mauve-dark-12 dark:text-mauve-light-12">Profile data</h3>
//           <p className="text-sm text-mauve-dark-11 dark:text-mauve-light-11">Manage your Profile</p>
//         </div>
//       </DialogTrigger>
//       <DialogContent className="h-screen max-h-screen overflow-y-auto bg-white dark:bg-gray-900 ">
//         <DialogHeader>
//           <DialogTitle>Profile Settings</DialogTitle>
//           <DialogDescription>
//             Customize your profile settings below.
//           </DialogDescription>
//         </DialogHeader>

//         <form onSubmit={formHandleSubmit(handleSubmit)} className="grid gap-4 py-4">
//           <div className="grid gap-2">
//             <Label htmlFor="profileVisibility" className="text-left">Profile Visibility</Label>
//             <div className="flex items-center">
//               <Switch id="profileVisibility" checked={profileVisibility} onCheckedChange={setProfileVisibility} />
//               <span className="ml-2">{profileVisibility ? "Public" : "Private"}</span>
//             </div>
//           </div>

//           <div className="grid gap-2">
//             <Label htmlFor="followerAccess" className="text-left">Follower Access</Label>
//             <div className="flex items-center">
//               <Switch className="bg-black" id="followerAccess" checked={followerAccess} onCheckedChange={setFollowerAccess} />
//               <span className="ml-2">{followerAccess ? "No request needed" : "Request needed"}</span>
//             </div>
//           </div>

//           <div className="grid gap-2">
//             <Label htmlFor="backgroundImage" className="text-left">Background Image</Label>
//             <div className="w-full flex justify-center">
//               <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-60 relative overflow-hidden">
//                 {backgroundImage && (
//                   <div style={{ position: 'relative', width: '15rem', height: '10rem', overflow: 'hidden' }}>
//                     <img src={backgroundImage instanceof File ? URL.createObjectURL(backgroundImage) : backgroundImage} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
//                     <Button
//                       type="button"
//                       onClick={handleFileRemove(setBackgroundImage)}
//                       style={{
//                         position: 'absolute',
//                         top: '5px',
//                         right: '5px',
//                         background: 'red',
//                         color: 'white',
//                         border: 'none',
//                         borderRadius: '50%',
//                         width: '20px',
//                         height: '20px',
//                         textAlign: 'center',
//                         lineHeight: '20px',
//                         cursor: 'pointer',
//                       }}
//                     >
//                       x
//                     </Button>
//                   </div>
//                 )}
//                 <input
//                   type="file"
//                   id="backgroundImageInput"
//                   name="backgroundImage"
//                   accept="image/*"
//                   onChange={handleImageChange(setBackgroundImage)}
//                   className="hidden"
//                 />
//                 {!backgroundImage && (
//                   <Label htmlFor="backgroundImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                     <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
//                     <p className="text-gray-600 text-aligned-center text-xs">
//                       Drag & drop image here, or click to select image.
//                     </p>
//                   </Label>
//                 )}
//               </div>
//             </div>
//           </div>

//           <div className="grid gap-2">
//             <Label htmlFor="profileImage" className="text-left">Profile Image</Label>
//             <div className="w-full flex justify-center">
//               <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-60 relative overflow-hidden">
//                 {profileImage && (
//                   <div style={{ position: 'relative', width: '15rem', height: '15rem', overflow: 'hidden' }}>
//                     <img src={profileImage instanceof File ? URL.createObjectURL(profileImage) : profileImage} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
//                     <Button
//                       type="button"
//                       onClick={handleFileRemove(setProfileImage)}
//                       style={{
//                         position: 'absolute',
//                         top: '5px',
//                         right: '5px',
//                         background: 'red',
//                         color: 'white',
//                         border: 'none',
//                         borderRadius: '50%',
//                         width: '20px',
//                         height: '20px',
//                         textAlign: 'center',
//                         lineHeight: '20px',
//                         cursor: 'pointer',
//                       }}
//                     >
//                       x
//                     </Button>
//                   </div>
//                 )}
//                 <input
//                   type="file"
//                   id="profileImageInput"
//                   name="profileImage"
//                   accept="image/*"
//                   onChange={handleImageChange(setProfileImage)}
//                   className="hidden"
//                 />
//                 {!profileImage && (
//                   <Label htmlFor="profileImageInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                     <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
//                     <p className="text-gray-600 text-aligned-center text-xs">
//                       Drag & drop image here, or click to select image.
//                     </p>
//                   </Label>
//                 )}
//               </div>
//             </div>
//           </div>

//           <div className="grid gap-2">
//             <Label htmlFor="title" className="text-left">Title</Label>
//             <Input
//               id="title"
//               placeholder="Title"
//               value={title}
//               onChange={(e) => setTitle(e.target.value)}
//               maxLength={35}
//               className="w-full"
//               required
//             />
//           </div>

//           <div className="grid gap-2">
//             <Label htmlFor="mision" className="text-left">Mision</Label>
//             <textarea
//               id="mision"
//               placeholder="Mision"
//               value={mision}
//               maxLength={250}
//               onChange={(e) => setMision(e.target.value)}
//               className="resize-none w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
//               rows={7}
//             />
//           </div>

//           {/* <div className="grid gap-2">
//             <Label htmlFor="bio" className="text-left">Story</Label>
//             <textarea
//               id="bio"
//               placeholder="Bio"
//               value={bio}
//               onChange={(e) => setBio(e.target.value)}
//               className="resize-none w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
//               rows={15}
//               required
//             />
//           </div> */}

//           {/* <div className="grid gap-2">
//             <Label htmlFor="cv" className="text-left">CV</Label>
//             <div className="w-full flex justify-center">
//               <div className="border border-blue-700 p-0 flex items-center justify-center w-60 h-60 relative overflow-hidden">
//                 {cv && (
//                   <div style={{ position: 'relative', width: '15rem', height: '15rem', overflow: 'hidden' }}>
//                     <Button
//                       type="button"
//                       onClick={() => setCv(null)}
//                       style={{
//                         position: 'absolute',
//                         top: '5px',
//                         right: '5px',
//                         background: 'red',
//                         color: 'white',
//                         border: 'none',
//                         borderRadius: '50%',
//                         width: '20px',
//                         height: '20px',
//                         textAlign: 'center',
//                         lineHeight: '20px',
//                         cursor: 'pointer',
//                       }}
//                     >
//                       x
//                     </Button>
//                   </div>
//                 )}
//                 <input
//                   type="file"
//                   id="cvInput"
//                   name="cv"
//                   accept="application/pdf"
//                   onChange={handleImageChange(setCv)}
//                   className="hidden"
//                 />
//                 {!cv && (
//                   <Label htmlFor="cvInput" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                     <UploadCloud className="text-gray-400 mb-2" style={{ height: '2.5rem', width: '2.5rem' }} />
//                     <p className="text-gray-600 text-aligned-center text-xs">
//                       Drag & drop PDF here, or click to select PDF.
//                     </p>
//                   </Label>
//                 )}
//               </div>
//             </div>
//           </div> */}

//           <p className="mt-2 text-gray-600">Total data size: {totalSizeMb} Mb</p>

//           <DialogFooter>
//             <div className="flex space-x-4">
//               <div className="flex-1 flex justify-center items-center">
//                 <DialogDemo 
//                   totalSizeMb={totalSizeMb}
//                   handleImageChange={handleImageChange(setCv)}
//                   handleImageRemove={handleFileRemove(setCv)}
//                   image={cv ? URL.createObjectURL(cv) : null}
//                   handleSubmit={handleSubmit}
//                 />
//               </div>
//               <div className="flex-1 pt-2 flex justify-center items-center">
//                 <DialogClose>Exit</DialogClose>
//               </div>
//             </div>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default SettingProfile;
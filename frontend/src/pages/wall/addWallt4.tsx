import React, { useState, useEffect } from 'react';
import { useWalletStore } from '@/store/WalletStore';
import { createInscription } from '@/utils/inscriptionCreator';
import { BlogEncryption, EncryptionLevel, getEncryptionLevelLabel } from '@/utils/BlogEncryption';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogClose,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UploadCloud } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddWallt4({ onReviewAdded }: { onReviewAdded: (newPost: any) => void }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Profile data states
  const [profileData, setProfileData] = useState({
    username: '',
    title: '',
    bio: '',
    avatar: ''
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>('');
  
  // Profile type selection
  const [profileType, setProfileType] = useState<'profile' | 'profile2'>('profile');
  
  // Encryption states
  const [encryptionLevel, setEncryptionLevel] = useState<EncryptionLevel>(0);
  const [encryptedData, setEncryptedData] = useState<string>('');
  const [encryptedSize, setEncryptedSize] = useState<number>(0);
  const [isEncrypting, setIsEncrypting] = useState(false);
  
  // Fee calculation
  const [currentFeeRate, setCurrentFeeRate] = useState<number>(1);
  const [estimatedFee, setEstimatedFee] = useState<number>(0);
  const [totalSizeMb, setTotalSizeMb] = useState<number>(0);
  
  const { keyData, balance, network, whatsOnChainApiKey, blogKeyHistory, getKeySegmentForLevel } = useWalletStore();

  // Fetch current fee rate
  useEffect(() => {
    const fetchFeeRate = async () => {
      try {
        const response = await fetch(
          `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/fee/estimates`
        );
        if (response.ok) {
          const feeData = await response.json();
          const feeRatePerByte = feeData.standard || 0.001;
          const feeRatePerKB = feeRatePerByte * 1000;
          setCurrentFeeRate(Math.max(1, Math.round(feeRatePerKB)));
        }
      } catch (error) {
        setCurrentFeeRate(1);
      }
    };
    fetchFeeRate();
  }, [network]);

  // Auto-encrypt when data changes
  useEffect(() => {
    if (encryptionLevel > 0 && blogKeyHistory.current) {
      encryptProfileData();
    } else {
      setEncryptedData('');
      setEncryptedSize(0);
    }
  }, [profileData, profileImageFile, backgroundImageFile, encryptionLevel, profileType]);

  // Calculate total size and fee
  useEffect(() => {
    let totalBytes = 0;
    
    // Calculate base profile data size
    const profileJson = JSON.stringify(profileData);
    totalBytes += new TextEncoder().encode(profileJson).length;
    
    // Add image sizes
    if (profileImageFile) {
      totalBytes += profileImageFile.size;
    }
    if (backgroundImageFile && profileType === 'profile2') {
      totalBytes += backgroundImageFile.size;
    }
    
    // If encrypted, use encrypted size
    if (encryptedSize > 0) {
      totalBytes = encryptedSize;
    }
    
    setTotalSizeMb(totalBytes / (1024 * 1024));
    
    // Estimate fee (simplified calculation)
    const estimatedTxSize = totalBytes + 500; // Add overhead for transaction structure
    const fee = Math.ceil((estimatedTxSize * currentFeeRate) / 1000);
    setEstimatedFee(fee);
  }, [profileData, profileImageFile, backgroundImageFile, encryptedSize, currentFeeRate, profileType]);

  const encryptProfileData = async () => {
    if (!blogKeyHistory.current || encryptionLevel === 0) return;
    
    setIsEncrypting(true);
    
    try {
      const keySegment = getKeySegmentForLevel(encryptionLevel);
      if (!keySegment) throw new Error('No key segment available');
      
      // Import image utilities
      const { imageToBase64 } = await import('@/utils/imageUtils');
      
      // Prepare profile data
      const profileDataToSave: any = {
        p: profileType,
        username: profileData.username || 'Anonymous',
        title: profileData.title || 'BSV User',
        bio: profileData.bio || 'On-chain profile',
        timestamp: Date.now()
      };
      
      // Convert images to base64
      if (profileImageFile) {
        const base64Data = await imageToBase64(profileImageFile, undefined, true, undefined, profileType);
        profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
      }
      
      if (profileType === 'profile2' && backgroundImageFile) {
        const base64Data = await imageToBase64(backgroundImageFile, undefined, true, undefined, profileType);
        profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
      }
      
      // Encrypt the data
      const { encryptedData, metadata } = await BlogEncryption.prepareEncryptedInscription(
        profileDataToSave,
        encryptionLevel,
        keySegment
      );
      
      const wrapper = {
        encrypted: true,
        originalType: profileType,
        data: encryptedData,
        metadata
      };
      
      const encryptedJson = JSON.stringify(wrapper);
      const encryptedSizeBytes = new TextEncoder().encode(encryptedJson).length;
      
      setEncryptedData(encryptedJson);
      setEncryptedSize(encryptedSizeBytes);
    } catch (error) {
      console.error('Encryption error:', error);
      toast({
        title: "Encryption Failed",
        description: "Failed to encrypt profile data",
        variant: "destructive"
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size
    const maxSize = 3.6 * 1024 * 1024; // 3.6MB
    if (file.size > maxSize) {
      toast({
        title: "Image Too Large",
        description: `Maximum size is 3.6MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        variant: "destructive"
      });
      return;
    }
    
    setProfileImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const maxSize = 3.6 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Image Too Large",
        description: `Maximum size is 3.6MB, your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        variant: "destructive"
      });
      return;
    }
    
    setBackgroundImageFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const result = await createInscription({
        inscriptionType: profileType,
        textData: '',
        imageFile: null,
        profileData,
        profileImageFile,
        backgroundImageFile: profileType === 'profile2' ? backgroundImageFile : null,
        encryptionLevel,
        encryptedData,
        keyData,
        network,
        whatsOnChainApiKey,
        blogKeyHistory,
        currentFeeRate,
        lastTransactionTime: 0
      });
      
      if (result.success) {
        toast({
          title: "Profile Created!",
          description: `Transaction ID: ${result.txid?.substring(0, 16)}...`,
        });
        
        // Reset form
        setProfileData({ username: '', title: '', bio: '', avatar: '' });
        setProfileImageFile(null);
        setProfileImagePreview('');
        setBackgroundImageFile(null);
        setBackgroundImagePreview('');
        setEncryptionLevel(0);
        setOpen(false);
        setConfirmOpen(false);
        
        // Trigger refresh
        onReviewAdded(null);
      } else {
        toast({
          title: "Creation Failed",
          description: result.error || 'Failed to create inscription',
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create inscription',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    setConfirmOpen(true);
  };

  const onCancel = () => {
    setProfileData({ username: '', title: '', bio: '', avatar: '' });
    setProfileImageFile(null);
    setProfileImagePreview('');
    setBackgroundImageFile(null);
    setBackgroundImagePreview('');
    setEncryptionLevel(0);
    setOpen(false);
    setConfirmOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">+ Profile</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Profile Inscription</DialogTitle>
            <DialogDescription>
              Create an on-chain profile that lives forever on BSV
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Profile Type Selection */}
            <div>
              <Label>Profile Type</Label>
              <Select value={profileType} onValueChange={(value: 'profile' | 'profile2') => setProfileType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">Standard Profile</SelectItem>
                  <SelectItem value="profile2">Profile+ (with background)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Encryption Level */}
            <div>
              <Label>Encryption Level</Label>
              <Select value={encryptionLevel.toString()} onValueChange={(value) => setEncryptionLevel(Number(value) as EncryptionLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">🔓 Public (No Encryption)</SelectItem>
                  <SelectItem value="1">🔒 Level 1 - Subscribers</SelectItem>
                  <SelectItem value="2">🔒 Level 2 - Followers</SelectItem>
                  <SelectItem value="3">🔒 Level 3 - Friends</SelectItem>
                  <SelectItem value="4">🔒 Level 4 - Inner Circle</SelectItem>
                  <SelectItem value="5">🔒 Level 5 - Owner Only</SelectItem>
                </SelectContent>
              </Select>
              {encryptionLevel > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {getEncryptionLevelLabel(encryptionLevel)} - Only key holders can decrypt
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="satoshi"
                maxLength={50}
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">{profileData.username.length}/50 characters</p>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Bitcoin Creator"
                maxLength={100}
                value={profileData.title}
                onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">{profileData.title.length}/100 characters</p>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Building peer-to-peer electronic cash..."
                maxLength={500}
                rows={3}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">{profileData.bio.length}/500 characters</p>
            </div>

            {/* Profile Image Upload */}
            <div>
              <Label>Profile Image</Label>
              {profileImagePreview ? (
                <div className="relative border border-gray-200 rounded-lg p-2">
                  <img
                    src={profileImagePreview}
                    alt="Profile preview"
                    className="w-32 h-32 mx-auto rounded-full object-cover"
                  />
                  <p className="text-xs text-center mt-2">{profileImageFile?.name}</p>
                  <p className="text-xs text-center text-gray-500">
                    {((profileImageFile?.size || 0) / 1024).toFixed(0)}KB
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileImageFile(null);
                      setProfileImagePreview('');
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                  >
                    X
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                  />
                  <Label htmlFor="profileImage" className="flex flex-col items-center cursor-pointer">
                    <UploadCloud className="text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload avatar</p>
                    <p className="text-xs text-gray-500">Recommended: 400x400px</p>
                  </Label>
                </div>
              )}
            </div>

            {/* Background Image Upload (Profile2 only) */}
            {profileType === 'profile2' && (
              <div>
                <Label>Background Image</Label>
                {backgroundImagePreview ? (
                  <div className="relative border border-gray-200 rounded-lg p-2">
                    <img
                      src={backgroundImagePreview}
                      alt="Background preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <p className="text-xs text-center mt-2">{backgroundImageFile?.name}</p>
                    <p className="text-xs text-center text-gray-500">
                      {((backgroundImageFile?.size || 0) / 1024).toFixed(0)}KB
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBackgroundImageFile(null);
                        setBackgroundImagePreview('');
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      id="backgroundImage"
                      accept="image/*"
                      onChange={handleBackgroundImageUpload}
                      className="hidden"
                    />
                    <Label htmlFor="backgroundImage" className="flex flex-col items-center cursor-pointer">
                      <UploadCloud className="text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to upload background</p>
                      <p className="text-xs text-gray-500">Recommended: 1200x400px</p>
                    </Label>
                  </div>
                )}
              </div>
            )}

            {/* Size and Fee Info */}
            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
              <p className="text-sm">Total Size: <span className="font-medium">{totalSizeMb.toFixed(2)} MB</span></p>
              <p className="text-sm">Estimated Fee: <span className="font-medium">{estimatedFee.toLocaleString()} sats</span></p>
              {encryptionLevel > 0 && (
                <p className="text-sm text-blue-600">🔒 Encrypted with Level {encryptionLevel}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel} className="w-1/2 mr-2">
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirm} 
              className="w-1/2"
              disabled={!profileData.username || !keyData.privateKey || balance.confirmed < estimatedFee || loading || isEncrypting}
            >
              {isEncrypting ? 'Encrypting...' : loading ? 'Creating...' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Profile Creation</DialogTitle>
            <DialogDescription>
              You are about to create a {profileType === 'profile2' ? 'Profile+' : 'Profile'} inscription
              {encryptionLevel > 0 && ` with Level ${encryptionLevel} encryption`}.
              <br />
              <br />
              Total size: {totalSizeMb.toFixed(2)} MB
              <br />
              Estimated fee: {estimatedFee.toLocaleString()} sats
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex space-x-4 w-full">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleSubmit} 
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Confirm & Create'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}










































// import { Label } from "@/components/ui/label";
// import React, { useState, useEffect } from 'react';
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogFooter,
//   DialogHeader,
//   DialogClose,
//   DialogDescription,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
// import { z } from "zod";
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// import { UploadCloud } from "lucide-react";
// import { toast } from "@/components/ui/use-toast";
// import { Switch } from "@/components/ui/switch";
// import { WallPost } from '../../models/(wall)/PostType';

// const FormSchema = z.object({
//   title: z.string().min(2, { message: "Title must be at least 2 characters." }).max(150, { message: "Title cannot exceed 150 characters." }),
//   content: z.string().min(2, { message: "Content must be at least 2 characters." }),
//   image: z.instanceof(File).nullable(),
//   type: z.enum(["Article", "Snippet"]),
// });

// interface IFormInput {
//   title: string;
//   content: string;
//   image: File | null;
//   type: "Article" | "Snippet";
// }

// export function AddToken({ onReviewAdded }: { onReviewAdded: (newPost: WallPost) => void }) {
//   const [open, setOpen] = useState(false);
//   const [confirmOpen, setConfirmOpen] = useState(false);
//   const [image, setImage] = useState<File | null>(null);
//   const [totalSizeMb, setTotalSizeMb] = useState<number>(0);

//   const methods = useForm<IFormInput>({
//     resolver: zodResolver(FormSchema),
//     defaultValues: {
//       title: "",
//       content: "",
//       image: null,
//       type: "Article",
//     },
//   });

//   useEffect(() => {
//     if (image) {
//       const totalSizeBytes = image.size;
//       const totalSizeMb = totalSizeBytes / (1024 * 1024);
//       setTotalSizeMb(parseFloat(totalSizeMb.toFixed(2)));
//     } else {
//       setTotalSizeMb(0);
//     }
//   }, [image]);

//   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files) {
//       const newImage = e.target.files[0];
//       setImage(newImage);
//       methods.setValue("image", newImage);
//     }
//   };

//   const handleImageRemove = () => {
//     setImage(null);
//     methods.setValue("image", null);
//   };

//   const onSubmit: SubmitHandler<IFormInput> = data => {
//     const newPost = {
//       id: Date.now(),
//       title: data.title,
//       content: data.content,
//       image: data.image ? URL.createObjectURL(data.image) : null,
//       type: data.type,
//       date: new Date().toISOString(),
//       likes: 0,
//       comments: 0,
//       commentList: [],
//     };

//     onReviewAdded(newPost);

//     toast({
//       title: "Post added successfully!",
//       description: (
//         <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
//           <code className="text-white">{JSON.stringify(newPost, null, 2)}</code>
//         </pre>
//       ),
//     });

//     methods.reset();
//     setImage(null);
//     setOpen(false);
//     setConfirmOpen(false);
//   };

//   const handleAddReview = () => {
//     setConfirmOpen(true);
//   };

//   const onCancel = () => {
//     methods.reset();
//     setImage(null);
//     setOpen(false);
//     setConfirmOpen(false);
//   };

//   return (
//     <>
//       <Dialog open={open} onOpenChange={setOpen}>
//         <DialogTrigger asChild>
//           <Button variant="outline">+</Button>
//         </DialogTrigger>
//         <DialogContent className="sm:max-w-[425px]">
//           <DialogHeader>
//             <DialogTitle>Add New Post</DialogTitle>
//           </DialogHeader>
//           <div className="overflow-y-auto max-h-96 p-2">
//             <FormProvider {...methods}>
//               <form onSubmit={methods.handleSubmit(handleAddReview)} className="space-y-4">
//                 <FormItem>
//                   <FormLabel>Upload Image</FormLabel>
//                   {image && (
//                     <div className="relative border border-blue-700 p-0 flex items-center justify-center w-full h-64 relative overflow-hidden">
//                       <img
//                         src={URL.createObjectURL(image)}
//                         alt="Uploaded"
//                         className="object-cover w-full h-full"
//                       />
//                       <button
//                         type="button"
//                         onClick={handleImageRemove}
//                         className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
//                       >
//                         X
//                       </button>
//                     </div>
//                   )}
//                   {!image && (
//                     <div className="border border-blue-700 p-0 flex items-center justify-center w-full h-64 relative overflow-hidden">
//                       <input
//                         type="file"
//                         id="alertImage"
//                         name="alertImage"
//                         accept="image/*"
//                         onChange={handleImageUpload}
//                         className="hidden"
//                       />
//                       <Label htmlFor="alertImage" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
//                         <UploadCloud className="text-gray-400 mb-2" style={{ height: '1.5rem', width: '1.5rem' }} />
//                         <p className="text-gray-600 text-xs">Drag & drop image here, or click to select Image</p>
//                       </Label>
//                     </div>
//                   )}
//                   <p className="mt-2 text-gray-600">Total data size: {totalSizeMb} Mb</p>
//                 </FormItem>
//                 <FormField
//                   name="title"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel htmlFor="title">Title</FormLabel>
//                       <FormControl>
//                         <Input id="title" placeholder="Title" maxLength={150} {...field} />
//                       </FormControl>
//                       {methods.formState.errors.title && <FormMessage>{methods.formState.errors.title.message}</FormMessage>}
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   name="content"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel htmlFor="content">Content</FormLabel>
//                       <FormControl>
//                         <Textarea id="content" placeholder="Content" {...field} />
//                       </FormControl>
//                       {methods.formState.errors.content && <FormMessage>{methods.formState.errors.content.message}</FormMessage>}
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   name="type"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel htmlFor="type">Type</FormLabel>
//                       <FormControl>
//                         <div className="flex items-center space-x-2">
//                           <Label htmlFor="article">Article</Label>
//                           <Switch id="article" checked={field.value === "Article"} onCheckedChange={() => field.onChange("Article")} />
//                           <Label htmlFor="snippet">Snippet</Label>
//                           <Switch id="snippet" checked={field.value === "Snippet"} onCheckedChange={() => field.onChange("Snippet")} />
//                         </div>
//                       </FormControl>
//                     </FormItem>
//                   )}
//                 />
//               </form>
//             </FormProvider>
//           </div>
//           <DialogFooter className="flex justify-between">
//             <Button variant="outline" onClick={onCancel} className="w-1/2 mr-2">Cancel</Button>
//             <Button type="button" onClick={methods.handleSubmit(handleAddReview)} className="w-1/2">Add Post</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Post Creation</DialogTitle>
//             <DialogDescription>
//               <br />
//               Total data size: {totalSizeMb} Mb
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <div className="flex space-x-4">
//               <div className="flex-1 flex justify-center items-center">
//                 <DialogClose><Button variant="outline" onClick={onCancel}>Cancel</Button></DialogClose>
//               </div>
//               <div className="flex-1 flex justify-center items-center">
//                 <DialogClose><Button type="button" variant="secondary" onClick={methods.handleSubmit(onSubmit)}>Complete Transaction</Button></DialogClose>
//               </div>
//             </div>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }
      // Import image utilities
     //  const { imageToBase64 } = await import('../../components/wallet2/inscriptions/utils/imageUtils');


import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../../components/wallet2/store/WalletStore';
import { createInscription } from '../../components/wallet2/inscriptions/utils/inscriptionCreator';
import { BlogEncryption, EncryptionLevel, getEncryptionLevelLabel } from '../../components/wallet2/inscriptions/utils/BlogEncryption';
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
 DialogClose,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { UploadCloud } from "lucide-react";
import { toast } from "../../components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";


import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";

// Schema for post inscription
const FormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }).max(150, { message: "Title cannot exceed 150 characters." }),
  content: z.string().min(2, { message: "Content must be at least 2 characters." }),
  image: z.instanceof(File).nullable(),
  type: z.enum(["Article", "Snippet"]),
});

interface IFormInput {
  title: string;
  content: string;
  image: File | null;
  type: "Article" | "Snippet";
}

export function AddWallt4({ onReviewAdded }: { onReviewAdded: (newPost: any) => void }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [totalSizeMb, setTotalSizeMb] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [encryptionLevel, setEncryptionLevel] = useState<EncryptionLevel>(0);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptedData, setEncryptedData] = useState<string>('');
  const [currentFeeRate, setCurrentFeeRate] = useState<number>(1);
  const [estimatedFee, setEstimatedFee] = useState<number>(0);

  const { keyData, balance, network, whatsOnChainApiKey, blogKeyHistory, getKeySegmentForLevel } = useWalletStore();

  const methods = useForm<IFormInput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
      content: "",
      image: null,
      type: "Article",
    },
  });

  // Calculate total size when data changes
  useEffect(() => {
    let totalBytes = 0;
    
    // Get form values
    const values = methods.getValues();
    const postData = { 
      title: values.title, 
      content: values.content,
      type: values.type
    };
    
    // Calculate text data size
    totalBytes += new TextEncoder().encode(JSON.stringify(postData)).length;
    
    // Add image size
    if (image) {
      totalBytes += image.size;
    }
    
    const totalMb = totalBytes / (1024 * 1024);
    setTotalSizeMb(parseFloat(totalMb.toFixed(2)));
    
    // Estimate fee
    const txOverhead = 500;
    const estimatedTxSize = totalBytes + txOverhead;
    const fee = Math.ceil((estimatedTxSize * currentFeeRate) / 1000);
    setEstimatedFee(fee);
  }, [image, methods.watch()]);

  // Auto-encrypt when encryption level changes
  useEffect(() => {
    const subscription = methods.watch((value) => {
      if (encryptionLevel > 0 && blogKeyHistory.current && value.title) {
        encryptPostData();
      } else {
        setEncryptedData('');
      }
    });
    return () => subscription.unsubscribe();
  }, [methods.watch, encryptionLevel, blogKeyHistory]);

  const encryptPostData = async () => {
    const values = methods.getValues();
    if (!blogKeyHistory.current || encryptionLevel === 0) return;
    
    setIsEncrypting(true);
    try {
      const keySegment = getKeySegmentForLevel(encryptionLevel);
      if (!keySegment) throw new Error('No key segment available');
      
      // Prepare post data for encryption
      const postDataToSave: any = {
        title: values.title,
        content: values.content,
        type: values.type,
        timestamp: Date.now()
      };
      
      // Add image if present
      if (image) {
const { imageToBase64 } = await import('../../components/wallet2/inscriptions/utils/imageUtils');
        const base64Data = await imageToBase64(image, undefined, true, undefined, 'image');
        postDataToSave.image = `data:${image.type};base64,${base64Data}`;
      }
      
      const { encryptedData, metadata } = await BlogEncryption.prepareEncryptedInscription(
        postDataToSave,
        encryptionLevel,
        keySegment
      );
      
      const wrapper = {
        encrypted: true,
        originalType: 'text',
        data: encryptedData,
        metadata
      };
      
      setEncryptedData(JSON.stringify(wrapper));
    } catch (error) {
      console.error('Encryption error:', error);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImage = e.target.files[0];
      const maxSize = 3.6 * 1024 * 1024;
      
      if (newImage.size > maxSize) {
        toast({
          title: "Image Too Large",
          description: `Maximum size is 3.6MB, your file is ${(newImage.size / (1024 * 1024)).toFixed(2)}MB`,
          variant: "destructive"
        });
        return;
      }
      
      setImage(newImage);
      methods.setValue("image", newImage);
    }
  };

  const handleImageRemove = () => {
    setImage(null);
    methods.setValue("image", null);
  };

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    setLoading(true);
    
    try {
      // Prepare the content object with structure matching display expectations
      const contentObj = {
        title: data.title,
        content: data.content,
        type: data.type,
        timestamp: Date.now()
      };
      
      // Add image if present
      if (image) {
        const { imageToBase64 } = await import('../../components/wallet2/inscriptions/utils/imageUtils');
        const base64Data = await imageToBase64(image, undefined, true, undefined, 'image');
        contentObj['image'] = `data:${image.type};base64,${base64Data}`;
      }
      
      // Create text inscription with structured content
      const textData = encryptionLevel > 0 ? encryptedData : JSON.stringify(contentObj);
      
      const result = await createInscription({
        inscriptionType: 'text',
        textData,
        imageFile: null,
        profileData: { username: '', title: '', bio: '', avatar: '' },
        profileImageFile: null,
        backgroundImageFile: null,
        encryptionLevel,
        encryptedData: encryptionLevel > 0 ? encryptedData : '',
        keyData,
        network,
        whatsOnChainApiKey,
        blogKeyHistory,
        currentFeeRate,
        lastTransactionTime: 0
      });
      
      if (result.success) {
        toast({
          title: "Post added successfully!",
          description: (
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
              <code className="text-white">TX: {result.txid?.substring(0, 32)}...</code>
            </pre>
          ),
        });
        
        // Reset form
        methods.reset();
        setImage(null);
        setEncryptionLevel(0);
        setOpen(false);
        setConfirmOpen(false);
        
        // Trigger refresh
        onReviewAdded(null);
      } else {
        throw new Error(result.error || 'Failed to create inscription');
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create inscription',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = () => {
    setConfirmOpen(true);
  };

  const onCancel = () => {
    methods.reset();
    setImage(null);
    setEncryptionLevel(0);
    setOpen(false);
    setConfirmOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">+</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Post</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-96 p-2">
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(handleAddReview)} className="space-y-4">
                <FormItem>
                  <FormLabel>Upload Image</FormLabel>
                  {image && (
                    <div className="relative border border-blue-700 p-0 flex items-center justify-center w-full h-64 relative overflow-hidden">
                      <img
                        src={URL.createObjectURL(image)}
                        alt="Uploaded"
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      >
                        X
                      </button>
                    </div>
                  )}
                  {!image && (
                    <div className="border border-blue-700 p-0 flex items-center justify-center w-full h-64 relative overflow-hidden">
                      <input
                        type="file"
                        id="alertImage"
                        name="alertImage"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Label htmlFor="alertImage" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                        <UploadCloud className="text-gray-400 mb-2" style={{ height: '1.5rem', width: '1.5rem' }} />
                        <p className="text-gray-600 text-xs">Drag & drop image here, or click to select Image</p>
                      </Label>
                    </div>
                  )}
                  <p className="mt-2 text-gray-600">Total data size: {totalSizeMb} Mb</p>
                </FormItem>
                
                <FormField
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="title">Title</FormLabel>
                      <FormControl>
                        <Input id="title" placeholder="Title" maxLength={150} {...field} />
                      </FormControl>
                      {methods.formState.errors.title && <FormMessage>{methods.formState.errors.title.message}</FormMessage>}
                    </FormItem>
                  )}
                />
                
                <FormField
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="content">Content</FormLabel>
                      <FormControl>
                        <Textarea id="content" placeholder="Content" {...field} />
                      </FormControl>
                      {methods.formState.errors.content && <FormMessage>{methods.formState.errors.content.message}</FormMessage>}
                    </FormItem>
                  )}
                />
                
                <FormField
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="type">Type</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="article">Article</Label>
                          <Switch id="article" checked={field.value === "Article"} onCheckedChange={() => field.onChange("Article")} />
                          <Label htmlFor="snippet">Snippet</Label>
                          <Switch id="snippet" checked={field.value === "Snippet"} onCheckedChange={() => field.onChange("Snippet")} />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Encryption Option */}
                <FormItem>
                  <FormLabel>Encryption (Optional)</FormLabel>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="public">Public</Label>
                    <Switch 
                      id="public" 
                      checked={encryptionLevel === 0} 
                      onCheckedChange={() => setEncryptionLevel(0)} 
                    />
                    <Label htmlFor="encrypted">Encrypted</Label>
                    <Switch 
                      id="encrypted" 
                      checked={encryptionLevel > 0} 
                      onCheckedChange={() => setEncryptionLevel(encryptionLevel === 0 ? 3 : 0)} 
                    />
                  </div>
                  {encryptionLevel > 0 && (
                    <div className="mt-2 flex items-center space-x-2">
                      <Label>Level:</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="5" 
                        value={encryptionLevel}
                        onChange={(e) => setEncryptionLevel(Number(e.target.value) as EncryptionLevel)}
                        className="w-16"
                      />
                      <span className="text-xs text-gray-500">
                        {encryptionLevel === 1 ? 'Subscribers' :
                         encryptionLevel === 2 ? 'Followers' :
                         encryptionLevel === 3 ? 'Friends' :
                         encryptionLevel === 4 ? 'Inner Circle' :
                         'Owner Only'}
                      </span>
                    </div>
                  )}
                </FormItem>
              </form>
            </FormProvider>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel} className="w-1/2 mr-2">Cancel</Button>
            <Button type="button" onClick={methods.handleSubmit(handleAddReview)} className="w-1/2">Add Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Post Creation</DialogTitle>
            <DialogDescription>
              <br />
              Total data size: {totalSizeMb} Mb
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex space-x-4">
              <div className="flex-1 flex justify-center items-center">
                <DialogClose><Button variant="outline" onClick={onCancel}>Cancel</Button></DialogClose>
              </div>
              <div className="flex-1 flex justify-center items-center">
                <DialogClose><Button type="button" variant="secondary" onClick={methods.handleSubmit(onSubmit)}>Complete Transaction</Button></DialogClose>
              </div>
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
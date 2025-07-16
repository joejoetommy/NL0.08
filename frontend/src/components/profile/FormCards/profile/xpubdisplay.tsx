// xpubdisplay.tsx
import { useState } from 'react';
import { Button } from "../../../ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../../../ui/alert-dialog";
import { getProfileData } from '../../data/profiledata';
import { QRCodeSVG } from 'qrcode.react';  // install via `npm install qrcode.react`

interface XpubDisplayProps {
  isOpen2: boolean;
  onClose2: (open: boolean) => void;
}

export function XpubDisplay({ isOpen2, onClose2 }: XpubDisplayProps) {
  const profileData = getProfileData();
  const xpub = profileData.xpub || "02f31c1bf421e450a248d01856986f1a781c7e02ff9a8c4d4797b7db4f64384b50"; // fallback to constant xpub
  const [copySuccess, setCopySuccess] = useState<string>("");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(xpub)
      .then(() => setCopySuccess("Copied!"))
      .catch(() => setCopySuccess("Failed to copy"));
    setTimeout(() => setCopySuccess(""), 2000);
  };

  return (
    <AlertDialog open={isOpen2} onOpenChange={onClose2}>
      <AlertDialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 text-black dark:text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Build your Network</AlertDialogTitle>
          <AlertDialogDescription>
            Make a network reference for {profileData.Profile.username}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-md">
            <QRCodeSVG value={xpub} size={200} includeMargin={true} />
          </div>

          {/* Xpub value and copy button */}
          <div className="flex w-full items-center gap-2 px-4">
            <span className="text-sm font-mono break-all flex-1">{xpub}</span>
            <Button size="sm" onClick={copyToClipboard} className="flex-shrink-0">
              Copy
            </Button>
          </div>

          {copySuccess && (
            <p className="text-sm text-green-600">{copySuccess}</p>
          )}
        </div>

        <AlertDialogFooter>
          <Button 
            className="group relative min-w-[11rem] h-12 overflow-hidden rounded-[16px] border border-neutral-200 bg-blue-500 px-4 text-neutral-950" 
            onClick={() => onClose2(false)}
          >
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}



// import  { useState } from 'react';
// import { Button } from "../../../ui/button";
// import {
//   AlertDialog,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle
// } from "../../../ui/alert-dialog";
// import { getProfileData } from '../../data/profiledata';
// import { QRCodeSVG } from 'qrcode.react';
//  // install via `npm install qrcode.react`

// interface XpubDisplayProps {
//   isOpen2: boolean;
//   onClose2: (open: boolean) => void;
// }

// export function XpubDisplay({ isOpen2, onClose2 }: XpubDisplayProps) {
//   const profileData = getProfileData();
//   const xpub = profileData.xpub || "unknown"; // adjust path as needed
//   const [copySuccess, setCopySuccess] = useState<string>("");

//   const copyToClipboard = () => {
//     navigator.clipboard.writeText(xpub)
//       .then(() => setCopySuccess("Copied!"))
//       .catch(() => setCopySuccess("Failed to copy"));
//     setTimeout(() => setCopySuccess(""), 2000);
//   };

//   return (
//     <AlertDialog open={isOpen2} onOpenChange={onClose2}>
//       <AlertDialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 text-black dark:text-white ">
//         <AlertDialogHeader>
//           <AlertDialogTitle>Build your Network</AlertDialogTitle>
//           <AlertDialogDescription>
//             Make a network reference for {profileData.Profile.username}
//           </AlertDialogDescription>
//         </AlertDialogHeader>

//         <div className="flex flex-col items-center gap-4 py-4">
//           {/* QR Code */}
//           <div className="bg-white p-4 rounded-md">
//             <QRCodeSVG  value={xpub} size={200} includeMargin={true} />
//           </div>

//           {/* Xpub value and copy button */}
//           <div className="flex w-full items-center justify-between px-4">
//             <span className="text-sm font-mono break-all">{xpub}</span>
//             <Button size="sm" onClick={copyToClipboard}>
//               Copy
//             </Button>
//           </div>

//           {copySuccess && (
//             <p className="text-sm text-green-600">{copySuccess}</p>
//           )}
//         </div>

//         <AlertDialogFooter>
//           <Button  className="group relative min-w-[11rem] h-12 overflow-hidden rounded-[16px] border border-neutral-200 bg-blue-500 px-4 text-neutral-950" onClick={() => onClose2(false)}>Close</Button>
//         </AlertDialogFooter>
//       </AlertDialogContent>
//     </AlertDialog>
//   );
// }

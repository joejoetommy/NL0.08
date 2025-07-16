import "react-day-picker/dist/style.css";
import { useState, useEffect } from "react";
import format from "date-fns/format";
import { Button } from "../ui/(mail)/button";
import { Separator } from "../ui/separator";
import { TokenMail, decryptWithECDH, myPrivateKey } from "../messages/encrypted-data";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import SwitchToggle from "./switchtoggle";

interface MailDisplayProps {
  mail: TokenMail | null;
}

// Chat mode reply component
const ReplyAccordion = ({ 
  replies, 
  mailName, 
  masterDecrypt
}: { 
  replies: TokenMail["replies"]; 
  mailName: string; 
  masterDecrypt?: boolean;
}) => {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="w-full">
      {replies.map((reply, index) => (
         <ReplyAccordionItem 
           key={reply.id || index} 
           reply={reply} 
           mailName={mailName} 
           masterDecrypt={masterDecrypt}
         />
      ))}
    </div>
  );
};

// Chat mode reply item
const ReplyAccordionItem = ({ 
  reply, 
  mailName, 
  masterDecrypt
}: { 
  reply: TokenMail; 
  mailName: string; 
  masterDecrypt?: boolean;
}) => {
  // Store decrypted values in state to ensure re-render
  const [decryptedName, setDecryptedName] = useState(reply.name);
  const [decryptedText, setDecryptedText] = useState(reply.text);

  useEffect(() => {
    if (masterDecrypt && reply.xpub !== "me") {
      try {
        const name = decryptWithECDH(myPrivateKey, reply.xpub, reply.name);
        const text = decryptWithECDH(myPrivateKey, reply.xpub, reply.text);
        setDecryptedName(name);
        setDecryptedText(text);
      } catch (error) {
        console.error('Reply decryption error:', error);
        setDecryptedName(reply.name);
        setDecryptedText(reply.text);
      }
    } else {
      setDecryptedName(reply.name);
      setDecryptedText(reply.text);
    }
  }, [masterDecrypt, reply]);

  return (
    <div className="flex flex-col space-y-1 mb-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {reply.read && <span className="w-2 h-2 bg-sky-300 rounded-full"></span>}
          <p className="text-xs text-sky-300">
            {reply.xpub === "me" ? "Me" : decryptedName}:
          </p>
          <span className="text-xs text-gray-400">
            {format(new Date(reply.date), "MMM d, p")}
          </span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-md p-2">
        <p className="text-sm text-white break-all">
          {decryptedText}
        </p>
      </div>
      
      <div className="text-xs text-gray-500">
        TXID: {reply.txid.substring(0, 20)}...
      </div>
      
      {reply.replies && reply.replies.length > 0 && (
        <div className="ml-4 mt-2 border-l-2 border-muted pl-4">
          <ReplyAccordion 
            replies={reply.replies} 
            mailName={mailName} 
            masterDecrypt={masterDecrypt}
          />
        </div>
      )}
    </div>
  );
};

export function MailDisplay({ mail }: MailDisplayProps) {
  const [masterDecrypt, setMasterDecrypt] = useState(false);
  const [decryptedName, setDecryptedName] = useState("");
  const [decryptedText, setDecryptedText] = useState("");

  // Debug logging
  useEffect(() => {
    console.log('MailDisplay - Current state:', {
      masterDecrypt,
      mailXpub: mail?.xpub,
      isOwnMessage: mail?.xpub === "me"
    });
  }, [masterDecrypt, mail]);

  // Handle decryption when mail or masterDecrypt changes
  useEffect(() => {
    if (!mail) return;

    if (masterDecrypt && mail.xpub !== "me") {
      console.log('Attempting decryption...');
      try {
        const name = decryptWithECDH(myPrivateKey, mail.xpub, mail.name);
        const text = decryptWithECDH(myPrivateKey, mail.xpub, mail.text);
        console.log('Decryption successful:', { name, text: text.substring(0, 30) + '...' });
        setDecryptedName(name);
        setDecryptedText(text);
      } catch (error) {
        console.error('Decryption error:', error);
        setDecryptedName(mail.name);
        setDecryptedText(mail.text);
      }
    } else {
      console.log('Not decrypting:', { masterDecrypt, isMe: mail.xpub === "me" });
      setDecryptedName(mail.name);
      setDecryptedText(mail.text);
    }
  }, [mail, masterDecrypt]);

  const handleMasterDecryptToggle = (checked: boolean) => {
    console.log('Toggle clicked, new value:', checked);
    setMasterDecrypt(checked);
  };

  if (!mail) {
    return <div className="p-4 text-center text-muted-foreground">No message selected</div>;
  }

  const isOwnMessage = mail.xpub === "me";
  const displayName = isOwnMessage ? "Me" : decryptedName;
  const displayText = isOwnMessage ? mail.text : decryptedText;

  return (
    <div className="flex h-full flex-col p-4">
      {/* Master Decrypt Switch at the top */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="master-decrypt" className="text-sm font-medium">
            {masterDecrypt ? "Decrypted" : "Encrypted"}
          </Label>
          <SwitchToggle
            id="master-decrypt"
            checked={masterDecrypt}
            onCheckedChange={handleMasterDecryptToggle}
          />
          {/* Debug info */}
          <span className="text-xs text-gray-500 ml-2">[{String(masterDecrypt)}]</span>
        </div>
      </div>

      {/* Debug Box */}
      <div className="mb-4 p-2 bg-gray-800 rounded text-xs text-gray-400">
        <div>Debug Info:</div>
        <div>- State: {String(masterDecrypt)}</div>
        <div>- XPUB: {mail.xpub}</div>
        <div>- Is Me: {String(isOwnMessage)}</div>
        <div>- Raw Name: {mail.name.substring(0, 20)}...</div>
        <div>- Display Name: {displayName}</div>
        <Button
          onClick={() => {
            console.log('Test button clicked');
            try {
              const testName = decryptWithECDH(myPrivateKey, mail.xpub, mail.name);
              const testText = decryptWithECDH(myPrivateKey, mail.xpub, mail.text);
              console.log('Test results:', { testName, testText });
              alert(`Decrypted: ${testName}\n\nText: ${testText.substring(0, 50)}...`);
            } catch (err) {
              console.error('Test error:', err);
              alert(`Error: ${err}`);
            }
          }}
          className="mt-1 bg-blue-500 text-white px-2 py-1"
          disabled={isOwnMessage}
        >
          Test Decrypt
        </Button>
      </div>

      {/* Contact Info */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {displayName}
          </h3>
          <span className="text-xs text-gray-400">
            {format(new Date(mail.date), "PPP")}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          <div>XPUB: {mail.xpub.substring(0, 30)}...</div>
          <div>TXID: {mail.txid.substring(0, 30)}...</div>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Main Message */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Message:</span>
        </div>
        
        <div className="bg-gray-800 rounded-md p-3 mb-4">
          <p className="text-sm text-white break-all">
            {displayText}
          </p>
        </div>
      </div>

      {/* Replies */}
      {mail.replies && mail.replies.length > 0 && (
        <div className="mt-4">
          <Separator className="mb-4" />
          <h4 className="text-sm font-semibold mb-3">Conversation:</h4>
          <ReplyAccordion 
            replies={mail.replies} 
            mailName={mail.name} 
            masterDecrypt={masterDecrypt}
          />
        </div>
      )}

      {/* Alternative Toggle for Testing */}
      <div className="mt-4 pt-4 border-t">
        <Button
          onClick={() => {
            const newValue = !masterDecrypt;
            console.log('Alternative button clicked, setting to:', newValue);
            setMasterDecrypt(newValue);
          }}
          className="bg-purple-500 text-white px-4 py-2 w-full"
        >
          Alternative Toggle (Current: {masterDecrypt ? 'DECRYPTED' : 'ENCRYPTED'})
        </Button>
      </div>
    </div>
  );
}


// import "react-day-picker/dist/style.css";
// import { useState } from "react";
// import format from "date-fns/format";
// import { Button } from "../ui/(mail)/button";
// import { Separator } from "../ui/separator";
// import { TokenMail, decryptWithECDH, myPrivateKey } from "../messages/encrypted-data";
// import { Switch } from "../ui/switch";
// import { Label } from "../ui/label";
// import { Input } from "../ui/input";
// import SwitchToggle from "./switchtoggle";

// interface MailDisplayProps {
//   mail: TokenMail | null;
//   childSecretKeys?: Record<string, string>;
//   onUpdateChildSecretKey?: (xpub: string, key: string) => void;
// }

// // Chat mode reply component
// const ReplyAccordion = ({ 
//   replies, 
//   mailName, 
//   masterDecrypt,
//   childSecretKeys,
//   onUpdateChildSecretKey 
// }: { 
//   replies: TokenMail["replies"]; 
//   mailName: string; 
//   masterDecrypt?: boolean;
//   childSecretKeys?: Record<string, string>;
//   onUpdateChildSecretKey?: (xpub: string, key: string) => void;
// }) => {
//   if (!replies || replies.length === 0) return null;

//   return (
//     <div className="w-full">
//       {replies.map((reply, index) => (
//          <ReplyAccordionItem 
//            key={reply.id || index} 
//            reply={reply} 
//            mailName={mailName} 
//            masterDecrypt={masterDecrypt}
//            childSecretKeys={childSecretKeys}
//            onUpdateChildSecretKey={onUpdateChildSecretKey}
//          />
//       ))}
//     </div>
//   );
// };

// // Chat mode reply item
// const ReplyAccordionItem = ({ 
//   reply, 
//   mailName, 
//   masterDecrypt,
//   childSecretKeys,
//   onUpdateChildSecretKey 
// }: { 
//   reply: TokenMail; 
//   mailName: string; 
//   masterDecrypt?: boolean;
//   childSecretKeys?: Record<string, string>;
//   onUpdateChildSecretKey?: (xpub: string, key: string) => void;
// }) => {
//   const getChildSecretKey = (xpub: string) => {
//     if (!childSecretKeys || !childSecretKeys[xpub]) {
//       try {
//         const sharedSecret = myPrivateKey.deriveSharedSecret(xpub);
//         return sharedSecret.toString();
//       } catch {
//         return "";
//       }
//     }
//     return childSecretKeys[xpub];
//   };

//   const getDisplayText = (text: string, xpub: string) => {
//     if (masterDecrypt && xpub !== "me") {
//       try {
//         return decryptWithECDH(myPrivateKey, xpub, text);
//       } catch {
//         return text;
//       }
//     }
//     return text;
//   };

//   const getDisplayName = (name: string, xpub: string) => {
//     if (masterDecrypt && xpub !== "me") {
//       try {
//         return decryptWithECDH(myPrivateKey, xpub, name);
//       } catch {
//         return name;
//       }
//     }
//     return name;
//   };

//   return (
//     <div className="flex flex-col space-y-1 mb-3">
//       <div className="flex justify-between items-center">
//         <div className="flex items-center gap-2">
//           {reply.read && <span className="w-2 h-2 bg-sky-300 rounded-full"></span>}
//           <p className="text-xs text-sky-300">
//             {reply.xpub === "me" ? "Me" : getDisplayName(reply.name, reply.xpub)}:
//           </p>
//           <span className="text-xs text-gray-400">
//             {format(new Date(reply.date), "MMM d, p")}
//           </span>
//         </div>
//       </div>

//       <div className="bg-gray-800 rounded-md p-2">
//         <p className="text-sm text-white break-all">{getDisplayText(reply.text, reply.xpub)}</p>
//       </div>
      
//       <div className="text-xs text-gray-500">
//         TXID: {reply.txid.substring(0, 20)}...
//       </div>

//       {/* Child Secret Key Input for non-me messages */}
//       {masterDecrypt && reply.xpub !== "me" && (
//         <div className="flex items-center gap-2 mt-2">
//           <Label className="text-xs">Child Secret:</Label>
//           <Input
//             type="text"
//             className="text-xs h-6 flex-1"
//             value={childSecretKeys?.[reply.xpub] || getChildSecretKey(reply.xpub)}
//             onChange={(e) => onUpdateChildSecretKey?.(reply.xpub, e.target.value)}
//             placeholder="Child secret key..."
//           />
//         </div>
//       )}
      
//       {reply.replies && reply.replies.length > 0 && (
//         <div className="ml-4 mt-2 border-l-2 border-muted pl-4">
//           <ReplyAccordion 
//             replies={reply.replies} 
//             mailName={mailName} 
//             masterDecrypt={masterDecrypt}
//             childSecretKeys={childSecretKeys}
//             onUpdateChildSecretKey={onUpdateChildSecretKey}
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// export function MailDisplay({ mail, childSecretKeys = {}, onUpdateChildSecretKey }: MailDisplayProps) {
//   const [isDecrypted, setIsDecrypted] = useState(false);
//   const [displayText, setDisplayText] = useState(mail?.text || "");
//   const [masterDecrypt, setMasterDecrypt] = useState(false);

//   const getChildSecretKey = (xpub: string) => {
//     if (!childSecretKeys[xpub]) {
//       try {
//         const sharedSecret = myPrivateKey.deriveSharedSecret(xpub);
//         return sharedSecret.toString();
//       } catch {
//         return "";
//       }
//     }
//     return childSecretKeys[xpub];
//   };

//   const handleDecryptToggle = (checked: boolean) => {
//     if (!mail || mail.xpub === "me") return;
    
//     if (checked) {
//       // Decrypt the message
//       try {
//         const decrypted = decryptWithECDH(myPrivateKey, mail.xpub, mail.text);
//         setDisplayText(decrypted);
//         setIsDecrypted(true);
//       } catch {
//         // If decryption fails, show original
//         setDisplayText(mail.text);
//         setIsDecrypted(false);
//       }
//     } else {
//       // Show encrypted
//       setDisplayText(mail.text);
//       setIsDecrypted(false);
//     }
//   };

//   const handleMasterDecryptToggle = (checked: boolean) => {
//     setMasterDecrypt(checked);
//     // This will trigger all child components to update
//   };

//   const getDisplayName = (name: string, xpub: string) => {
//     if (masterDecrypt && xpub !== "me") {
//       try {
//         return decryptWithECDH(myPrivateKey, xpub, name);
//       } catch {
//         return name;
//       }
//     }
//     return name;
//   };

//   const getDisplayText = (text: string, xpub: string) => {
//     if (masterDecrypt && xpub !== "me") {
//       try {
//         return decryptWithECDH(myPrivateKey, xpub, text);
//       } catch {
//         return text;
//       }
//     }
//     return text;
//   };

//   if (!mail) {
//     return <div className="p-4 text-center text-muted-foreground">No message selected</div>;
//   }

//   const isOwnMessage = mail.xpub === "me";

//   return (
//     <div className="flex h-full flex-col p-4">
//       {/* Master Decrypt Switch at the top */}
//       <div className="flex items-center justify-end mb-4">
//         <div className="flex items-center gap-2">
//           <Label htmlFor="master-decrypt" className="text-sm font-medium">
//             {masterDecrypt ? "Decrypted" : "Encrypted"}
//           </Label>
//           <SwitchToggle
//             id="master-decrypt"
//             checked={masterDecrypt}
//             onCheckedChange={handleMasterDecryptToggle}
//           />
//         </div>
//       </div>

//       {/* Contact Info */}
//       <div className="mb-4">
//         <div className="flex items-center justify-between">
//           <h3 className="text-lg font-semibold">
//             {isOwnMessage ? "Me" : getDisplayName(mail.name, mail.xpub)}
//           </h3>
//           <span className="text-xs text-gray-400">
//             {format(new Date(mail.date), "PPP")}
//           </span>
//         </div>
//         <div className="text-xs text-gray-500 mt-1">
//           <div>XPUB: {mail.xpub.substring(0, 30)}...</div>
//           <div>TXID: {mail.txid.substring(0, 30)}...</div>
//         </div>
//       </div>

//       {/* Child Secret Key Input for main message */}
//       {masterDecrypt && !isOwnMessage && (
//         <div className="mb-4">
//           <div className="flex items-center gap-2">
//             <Label className="text-sm">Child Secret Key:</Label>
//             <Input
//               type="text"
//               className="text-sm h-8 flex-1"
//               value={childSecretKeys[mail.xpub] || getChildSecretKey(mail.xpub)}
//               onChange={(e) => onUpdateChildSecretKey?.(mail.xpub, e.target.value)}
//               placeholder="Enter child secret key..."
//             />
//           </div>
//         </div>
//       )}

//       <Separator className="mb-4" />

//       {/* Main Message */}
//       <div className="flex-1">
//         <div className="flex items-center justify-between mb-2">
//           <span className="text-sm font-medium">Message:</span>
//         </div>
        
//         <div className="bg-gray-800 rounded-md p-3 mb-4">
//           <p className="text-sm text-white break-all">
//             {isOwnMessage ? mail.text : getDisplayText(mail.text, mail.xpub)}
//           </p>
//         </div>
//       </div>

//       {/* Replies */}
//       {mail.replies && mail.replies.length > 0 && (
//         <div className="mt-4">
//           <Separator className="mb-4" />
//           <h4 className="text-sm font-semibold mb-3">Conversation:</h4>
//           <ReplyAccordion 
//             replies={mail.replies} 
//             mailName={mail.name} 
//             masterDecrypt={masterDecrypt}
//             childSecretKeys={childSecretKeys}
//             onUpdateChildSecretKey={onUpdateChildSecretKey}
//           />
//         </div>
//       )}
//     </div>
//   );
// }



















































// Before Encryption EDCHA


// import "react-day-picker/dist/style.css";
// import { useState } from "react";
// import format from "date-fns/format";
// import { Button } from "../ui/(mail)/button";
// import { Separator } from "../ui/separator";
// import { TokenMail } from "../data/(mail)/data";
// import { Switch } from "../ui/switch";
// import { Label } from "../ui/label";
// import SwitchToggle from "./switchtoggle";

// interface MailDisplayProps {
//   mail: TokenMail | null;
// }

// // Chat mode reply component
// const ReplyAccordion = ({ replies, mailName, masterDecrypt }: { replies: TokenMail["replies"]; mailName: string; masterDecrypt?: boolean }) => {
//   if (!replies || replies.length === 0) return null;

//   return (
//     <div className="w-full">
//       {replies.map((reply, index) => (
//          <ReplyAccordionItem key={reply.id || index} reply={reply} mailName={mailName} masterDecrypt={masterDecrypt} />
//       ))}
//     </div>
//   );
// };

// // Chat mode reply item
// const ReplyAccordionItem = ({ reply, mailName, masterDecrypt }: { reply: TokenMail; mailName: string; masterDecrypt?: boolean }) => {
//   const getDisplayText = (text: string) => {
//     if (masterDecrypt) {
//       try {
//         return atob(text);
//       } catch {
//         return text;
//       }
//     }
//     return text;
//   };

//   const getDisplayName = (name: string) => {
//     if (masterDecrypt) {
//       try {
//         return atob(name);
//       } catch {
//         return name;
//       }
//     }
//     return name;
//   };

//   return (
//     <div className="flex flex-col space-y-1 mb-3">
//       <div className="flex justify-between items-center">
//         <div className="flex items-center gap-2">
//           {reply.read && <span className="w-2 h-2 bg-sky-300 rounded-full"></span>}
//           <p className="text-xs text-sky-300">{getDisplayName(reply.name)}:</p>
//           <span className="text-xs text-gray-400">
//             {format(new Date(reply.date), "MMM d, p")}
//           </span>
//         </div>
//       </div>

//       <div className="bg-gray-800 rounded-md p-2">
//         <p className="text-sm text-white break-all">{getDisplayText(reply.text)}</p>
//       </div>
      
//       <div className="text-xs text-gray-500">
//         TXID: {reply.txid.substring(0, 20)}...
//       </div>
      
//       {reply.replies && reply.replies.length > 0 && (
//         <div className="ml-4 mt-2 border-l-2 border-muted pl-4">
//           <ReplyAccordion replies={reply.replies} mailName={mailName} masterDecrypt={masterDecrypt} />
//         </div>
//       )}
//     </div>
//   );
// };

// export function MailDisplay({ mail }: MailDisplayProps) {
//   const [isDecrypted, setIsDecrypted] = useState(false);
//   const [displayText, setDisplayText] = useState(mail?.text || "");
//   const [masterDecrypt, setMasterDecrypt] = useState(false);

//   const handleDecryptToggle = (checked: boolean) => {
//     if (!mail) return;
    
//     if (checked) {
//       // Decrypt the message
//       try {
//         const decrypted = atob(mail.text);
//         setDisplayText(decrypted);
//         setIsDecrypted(true);
//       } catch {
//         // If decryption fails, show original
//         setDisplayText(mail.text);
//         setIsDecrypted(false);
//       }
//     } else {
//       // Show encrypted
//       setDisplayText(mail.text);
//       setIsDecrypted(false);
//     }
//   };

//   const handleMasterDecryptToggle = (checked: boolean) => {
//     setMasterDecrypt(checked);
//     // This will trigger all child components to update
//   };

//   const getDisplayName = (name: string) => {
//     if (masterDecrypt) {
//       try {
//         return atob(name);
//       } catch {
//         return name;
//       }
//     }
//     return name;
//   };

//   if (!mail) {
//     return <div className="p-4 text-center text-muted-foreground">No message selected</div>;
//   }

//   return (
//     <div className="flex h-full flex-col p-4">
//       {/* Master Decrypt Switch at the top */}
//       <div className="flex items-center justify-end mb-4">
//         <div className="flex items-center gap-2">
//           <Label htmlFor="master-decrypt" className="text-sm font-medium">
//             {masterDecrypt ? "Decrypted" : "Encrypted"}
//           </Label>
//           <SwitchToggle
//             id="master-decrypt"
//             checked={masterDecrypt}
//             onCheckedChange={handleMasterDecryptToggle}
//           />
//         </div>
//       </div>

//       {/* Contact Info */}
//       <div className="mb-4">
//         <div className="flex items-center justify-between">
//           <h3 className="text-lg font-semibold">{getDisplayName(mail.name)}</h3>
//           <span className="text-xs text-gray-400">
//             {format(new Date(mail.date), "PPP")}
//           </span>
//         </div>
//         <div className="text-xs text-gray-500 mt-1">
//           <div>XPUB: {mail.xpub.substring(0, 30)}...</div>
//           <div>TXID: {mail.txid.substring(0, 30)}...</div>
//         </div>
//       </div>

//       <Separator className="mb-4" />

//       {/* Main Message */}
//       <div className="flex-1">
//         <div className="flex items-center justify-between mb-2">
//           <span className="text-sm font-medium">Message:</span>
//         </div>
        
//         <div className="bg-gray-800 rounded-md p-3 mb-4">
//           <p className="text-sm text-white break-all">
//             {masterDecrypt ? (() => {
//               try {
//                 return atob(mail.text);
//               } catch {
//                 return mail.text;
//               }
//             })() : mail.text}
//           </p>
//         </div>
//       </div>

//       {/* Replies */}
//       {mail.replies && mail.replies.length > 0 && (
//         <div className="mt-4">
//           <Separator className="mb-4" />
//           <h4 className="text-sm font-semibold mb-3">Conversation:</h4>
//           <ReplyAccordion replies={mail.replies} mailName={mail.name} masterDecrypt={masterDecrypt} />
//         </div>
//       )}
//     </div>
//   );
// }






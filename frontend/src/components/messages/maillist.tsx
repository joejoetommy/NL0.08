"use client";

import { useState, useRef } from "react";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { Icon } from '@iconify/react';
import { Input } from "../ui/input";
import { cn } from "../../lib/utils"
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import SwitchToggle from "./switchtoggle";
import SwitchToggle1 from "./switchtoggle1";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { PlusIcon } from '@radix-ui/react-icons';

// Import the encrypted data and crypto functions  
import { 
  cryptoChatData, 
  additionalMessages, 
  TokenMail,
  decryptWithECDH,
  encryptWithECDH,
  myPrivateKey 
} from "../messages/encrypted-data";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "../ui/pagination";
import {
  RectangleComponent,
} from "../ui/(mail)/drawer";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/(mail)/sheet"
import { Button } from "../ui/(mail)/button";
import { MailDisplay } from "../messages/maildisplay";

interface MailListProps {
  itemsPerPage?: number;
}

export function MailList({ itemsPerPage = 5 }: MailListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMail, setSelectedMail] = useState<TokenMail | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [selectedContact, setSelectedContact] = useState<TokenMail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [hasEncryptedOnce, setHasEncryptedOnce] = useState(false);
  const [showDecryptedNames, setShowDecryptedNames] = useState(false);

  // Helper to decrypt name
  const getDecryptedName = (name: string, xpub: string) => {
    if (!showDecryptedNames || xpub === "me") return name;
    try {
      return decryptWithECDH(myPrivateKey, xpub, name);
    } catch {
      return name;
    }
  };

  // Helper to decrypt message for preview
  const getDecryptedPreview = (text: string, xpub: string, forceDecrypt: boolean = false) => {
    if ((!showDecryptedNames && !forceDecrypt) || xpub === "me") return text;
    try {
      return decryptWithECDH(myPrivateKey, xpub, text);
    } catch {
      return text;
    }
  };

  // Get all messages combining both arrays
  const getAllCryptoMessages = (): TokenMail[] => {
    return [...cryptoChatData, ...additionalMessages].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  // Get all messages and group by contact
  const allMessages = getAllCryptoMessages();
  const contactsMap = new Map<string, TokenMail[]>();
  
  // Group messages by contact xpub (more reliable than name)
  allMessages.forEach(message => {
    if (!contactsMap.has(message.xpub)) {
      contactsMap.set(message.xpub, []);
    }
    contactsMap.get(message.xpub)?.push(message);
  });

  // Convert to array of latest messages per contact
  const latestMessages = Array.from(contactsMap.entries()).map(([xpub, messages]) => {
    return messages[0]; // Get the latest message for each contact
  });

  // Filter messages based on search term
  const filteredMessages = searchTerm && showDecryptedNames
    ? latestMessages.filter(message => {
        const decryptedName = getDecryptedName(message.name, message.xpub).toLowerCase();
        const decryptedText = getDecryptedPreview(message.text, message.xpub, true).toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return decryptedName.includes(searchLower) || decryptedText.includes(searchLower);
      })
    : latestMessages;

  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredMessages.slice(startIndex, endIndex);

  // Get unique contacts for search
  const uniqueContacts = Array.from(new Set(allMessages.map(m => m.xpub)))
    .map(xpub => allMessages.find(m => m.xpub === xpub)!)
    .filter(contact => {
      if (contact.xpub === "me") return false;
      const decryptedName = showDecryptedNames ? getDecryptedName(contact.name, contact.xpub) : contact.name;
      return decryptedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             contact.xpub.toLowerCase().includes(searchQuery.toLowerCase());
    });

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearch = () => {
    if (showDecryptedNames && searchInput.trim()) {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setShowDecryptedNames(checked);
    if (!checked) {
      setSearchTerm("");
      setSearchInput("");
    }
  };

  const handleSend = () => {
    if (!selectedContact) {
      setError("Please select a recipient.");
      return;
    }
    
    if (!isEncrypted) {
      // Encrypt the message using ECDH
      if (messageText.trim()) {
        const encrypted = encryptWithECDH(myPrivateKey, selectedContact.xpub, messageText);
        setOriginalText(messageText);
        setMessageText(encrypted);
        setIsEncrypted(true);
        setHasEncryptedOnce(true);
      }
    } else {
      // Actually send
      setError("");
      console.log("Sending message to:", selectedContact.name);
      console.log("XPUB:", selectedContact.xpub);
      console.log("Encrypted message:", messageText);
      // Generate new TXID for the message
      const newTxid = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      console.log("New TXID:", newTxid);
      
      // Reset states after sending
      setMessageText("");
      setOriginalText("");
      setIsEncrypted(false);
      setHasEncryptedOnce(false);
      setSelectedContact(null);
      setIsSheetOpen(false);
    }
  };

  const handleMessageSwitchChange = (checked: boolean) => {
    if (!messageText.trim() || !selectedContact) return;
    
    if (checked) {
      // Switch to "Decrypt" - show decrypted text
      if (isEncrypted) {
        setMessageText(originalText);
        setIsEncrypted(false);
      }
    } else {
      // Switch to "Encrypt" - show encrypted text
      if (!isEncrypted && originalText) {
        setMessageText(encryptWithECDH(myPrivateKey, selectedContact.xpub, originalText));
        setIsEncrypted(true);
      } else if (!originalText && messageText) {
        // First time encrypting
        const encrypted = encryptWithECDH(myPrivateKey, selectedContact.xpub, messageText);
        setOriginalText(messageText);
        setMessageText(encrypted);
        setIsEncrypted(true);
        setHasEncryptedOnce(true);
      }
    }
  };

  const handleMailSelect = (item: TokenMail) => {
    setSelectedMail(item);
    setIsSearchMode(false);
    setIsSheetOpen(true);
  };

  const handleOpenSearch = () => {
    setIsSearchMode(true);
    setSelectedMail(null);
    setIsSheetOpen(true);
    setMessageText("");
    setOriginalText("");
    setIsEncrypted(false);
    setHasEncryptedOnce(false);
  };

  const handleContactSelect = (contact: TokenMail) => {
    setSelectedContact(contact);
    setSearchQuery("");
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Search Bar */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="20" height="20" />
            <Input
              type="text"
              placeholder={showDecryptedNames ? "Search mails subject..." : "Switch to Decrypted to search"}
              className={cn(
                "pl-8 flex-1",
                !showDecryptedNames && "cursor-not-allowed opacity-50"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!showDecryptedNames}
            />
          </div>
        </div>

        {/* Decrypt Names Switch */}
        <div className="flex items-center justify-end px-4 pb-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="list-decrypt" className="text-sm font-medium">
              {showDecryptedNames ? "Decrypted" : "Encrypted"}
            </Label>
            <SwitchToggle
              id="list-decrypt"
              checked={showDecryptedNames}
              onCheckedChange={handleSwitchChange}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 p-4 pt-0">
            {paginatedItems.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent",
                  selectedMail?.id === item.id && "bg-muted"
                )}
                onClick={() => handleMailSelect(item)}
              >
                <div className="flex w-full flex-col gap-1">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{getDecryptedName(item.name, item.xpub)}</div>
                      {!item.read && (
                        <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <div className={cn("ml-auto text-xs text-muted-foreground")}>
                      {formatDistanceToNow(new Date(item.date), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    TXID: {item.txid.substring(0, 20)}...
                  </div>
                </div>
                <div className="line-clamp-2 text-xs text-muted-foreground">
                  {getDecryptedPreview(item.text, item.xpub).substring(0, 100)}...
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <button
          className="fixed bottom-20 right-10 z-50 flex h-14 w-14 items-center justify-center 
          rounded-full bg-primary-dark-1 text-primary-dark-12 shadow-lg transition-all 
          border border-sky-300 hover:bg-black hover:border-sky-300 hover:text-white hover:scale-110 
          dark:bg-primary-light-1 dark:text-primary-light-12"
          onClick={handleOpenSearch}
        >
          <PlusIcon className="h-5 w-5 text-sky-300 dark:text-gray-50" />
        </button>

        {/* Pagination Controls */}
        <div className="p-1">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  -
                </Button>
              </PaginationItem>

              {[...Array(totalPages)]
                .map((_, index) => index + 1)
                .filter((page) => page >= Math.max(1, currentPage - 2) && page <= Math.min(totalPages, currentPage + 2))
                .map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === page}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

              <PaginationItem>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  disabled={currentPage === totalPages}
                >
                  +
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Sheet for Mail Display */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[90vw] max-w-[550px] pt-15 pr-0 pl-0 pb-4 bg-zinc-900 border border-zinc-700 shadow-lg">
          <SheetHeader>
            <div className="flex justify-between items-center">
              <SheetClose asChild>
                <div className="pb-2">
                  <Button
                    className="border border-white bg-grey-500 text-white px-4 py-4 rounded focus:outline-none mr-4"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    X
                  </Button>
                </div>
              </SheetClose>
              <SheetTitle className="mx-auto">
                {isSearchMode ? "New Message" : "Conversation"}
              </SheetTitle>
            </div>
          </SheetHeader>

          <RectangleComponent>
            <div className="flex h-full flex-col">
              {isSearchMode ? (
                <div className="flex flex-col overflow-auto h-full">
                  {/* Decrypt Names Switch for New Message */}
                  <div className="flex items-center justify-end mb-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="message-decrypt" className="text-sm font-medium">
                        {showDecryptedNames ? "Decrypted" : "Encrypted"}
                      </Label>
                      <SwitchToggle
                        id="message-decrypt"
                        checked={showDecryptedNames}
                        onCheckedChange={handleSwitchChange}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label>To:</Label>
                    <Input
                      type="text"
                      placeholder="Search contacts by name or xpub..."
                      className="w-full p-2 border rounded-md"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="mt-4">
                    {searchQuery && (
                      <div className="border border-gray-300 rounded-md mt-2 bg-white max-h-80 overflow-auto">
                        {uniqueContacts.map((contact) => (
                          <button
                            key={contact.id}
                            className="bg-[#111827] w-full text-left p-2 hover:bg-gray-400"
                            onClick={() => handleContactSelect(contact)}
                          >
                            <div className="font-bold text-[11px] text-white">{getDecryptedName(contact.name, contact.xpub)}</div>
                            <div className="text-[10px] text-gray-400">
                              {contact.xpub.substring(0, 30)}...
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedContact && (
                      <div className="flex flex-wrap gap-2 p-1 border rounded-md mt-2">
                        <div className="bg-[#111827] px-2 py-1 rounded-md flex items-center justify-between w-full">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-[11px] text-white">{getDecryptedName(selectedContact.name, selectedContact.xpub)}</span>
                            <span className="text-[10px] text-gray-400">
                              {selectedContact.xpub.substring(0, 40)}...
                            </span>
                          </div>
                          <button 
                            onClick={() => setSelectedContact(null)}
                            className="text-s text-red-500 hover:text-red-700"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
              ) : selectedMail ? (
                <MailDisplay mail={selectedMail} />
              ) : (
                <div className="text-center text-muted-foreground">No message selected</div>
              )}
            </div>
          </RectangleComponent>

          <SheetFooter>
            <div className="p-4 border-t bg-gray-900 text-white flex w-full">
              <form className="w-full" onSubmit={(e) => e.preventDefault()}>
                <div className="flex flex-col w-full">
                  <Textarea
                    className="bg-gray-800 text-white border border-gray-700 w-full min-h-[100px] resize-none p-2"
                    placeholder={isSearchMode ? "Type your message..." : `Reply ${selectedMail?.name}...`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={isEncrypted}
                  />

                  <div className="flex items-center justify-between w-full mt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <SwitchToggle1
                          id="encryptSwitch"
                          aria-label="Toggle encrypt/decrypt"
                          checked={!isEncrypted}
                          onCheckedChange={handleMessageSwitchChange}
                          disabled={!messageText.trim()}
                        />
                        <Label htmlFor="encryptSwitch" className="text-xs font-normal mt-1">
                          {isEncrypted ? "Decrypt" : "Encrypt"}
                        </Label>
                      </div>

                      <SheetClose asChild>
                        <Button
                          className="border border-gray-500 bg-transparent text-white px-3 py-2 rounded-md hover:bg-gray-700 transition"
                          onClick={() => setIsSheetOpen(false)}
                        >
                          Cancel
                        </Button>
                      </SheetClose>

                      <Button
                        onClick={handleSend}
                        className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-300 transition"
                        type="button"
                      >
                        {isEncrypted ? "Send" : "Encrypt"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

// "use client";

// import { useState, useRef } from "react";
// import formatDistanceToNow from "date-fns/formatDistanceToNow";
// import { Icon } from '@iconify/react';
// import { Input } from "../ui/input";
// import { cn } from "../../lib/utils"
// import { ScrollArea } from "../ui/scroll-area";
// import { Separator } from "../ui/separator";
// import SwitchToggle from "./switchtoggle";
// import SwitchToggle1 from "./switchtoggle1";
// import { Textarea } from "../ui/textarea";
// import { Label } from "../ui/label";
// import { PlusIcon } from '@radix-ui/react-icons';

// // Import the encrypted data and crypto functions  
// import { 
//   cryptoChatData, 
//   additionalMessages, 
//   TokenMail,
//   decryptWithECDH,
//   encryptWithECDH,
//   myPrivateKey 
// } from "../messages/encrypted-data";

// import {
//   Pagination,
//   PaginationContent,
//   PaginationItem,
//   PaginationLink,
// } from "../ui/pagination";
// import {
//   RectangleComponent,
// } from "../ui/(mail)/drawer";
// import {
//   Sheet,
//   SheetClose,
//   SheetContent,
//   SheetFooter,
//   SheetHeader,
//   SheetTitle,
// } from "../ui/(mail)/sheet"
// import { Button } from "../ui/(mail)/button";
// import { MailDisplay } from "../messages/maildisplay";

// interface MailListProps {
//   itemsPerPage?: number;
// }

// export function MailList({ itemsPerPage = 5 }: MailListProps) {
//   const [currentPage, setCurrentPage] = useState(1);
//   const [selectedMail, setSelectedMail] = useState<TokenMail | null>(null);
//   const [isSheetOpen, setIsSheetOpen] = useState(false);
//   const [isSearchMode, setIsSearchMode] = useState(false);
//   const [selectedContact, setSelectedContact] = useState<TokenMail | null>(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchInput, setSearchInput] = useState("");
//   const [error, setError] = useState("");
//   const [isEncrypted, setIsEncrypted] = useState(false);
//   const [messageText, setMessageText] = useState("");
//   const [originalText, setOriginalText] = useState("");
//   const [hasEncryptedOnce, setHasEncryptedOnce] = useState(false);
//   const [showDecryptedNames, setShowDecryptedNames] = useState(false);
  
//   // Store child secret keys for each contact
//   const [childSecretKeys, setChildSecretKeys] = useState<Record<string, string>>({});

//   // Helper to get or calculate child secret key
//   const getChildSecretKey = (xpub: string) => {
//     if (!childSecretKeys[xpub]) {
//       try {
//         // Calculate the shared secret for this contact
//         const sharedSecret = myPrivateKey.deriveSharedSecret(xpub);
//         const newKeys = { ...childSecretKeys, [xpub]: sharedSecret.toString() };
//         setChildSecretKeys(newKeys);
//         return sharedSecret.toString();
//       } catch (error) {
//         console.error("Error calculating child secret:", error);
//         return "";
//       }
//     }
//     return childSecretKeys[xpub];
//   };

//   // Helper to decrypt name with custom key
//   const getDecryptedName = (name: string, xpub: string) => {
//     if (!showDecryptedNames) return name;
//     try {
//       const secretKey = childSecretKeys[xpub] || getChildSecretKey(xpub);
//       if (!secretKey) return name;
//       return decryptWithECDH(myPrivateKey, xpub, name);
//     } catch {
//       return name;
//     }
//   };

//   // Helper to decrypt message for preview with custom key
//   const getDecryptedPreview = (text: string, xpub: string, forceDecrypt: boolean = false) => {
//     if (!showDecryptedNames && !forceDecrypt) return text;
//     try {
//       const secretKey = childSecretKeys[xpub] || getChildSecretKey(xpub);
//       if (!secretKey) return text;
//       return decryptWithECDH(myPrivateKey, xpub, text);
//     } catch {
//       return text;
//     }
//   };

//   // Update child secret key for a contact
//   const updateChildSecretKey = (xpub: string, newKey: string) => {
//     setChildSecretKeys({ ...childSecretKeys, [xpub]: newKey });
//   };

//   // Get all messages combining both arrays
//   const getAllCryptoMessages = (): TokenMail[] => {
//     return [...cryptoChatData, ...additionalMessages].sort((a, b) => 
//       new Date(b.date).getTime() - new Date(a.date).getTime()
//     );
//   };

//   // Get all messages and group by contact
//   const allMessages = getAllCryptoMessages();
//   const contactsMap = new Map<string, TokenMail[]>();
  
//   // Group messages by contact xpub (more reliable than name)
//   allMessages.forEach(message => {
//     if (!contactsMap.has(message.xpub)) {
//       contactsMap.set(message.xpub, []);
//     }
//     contactsMap.get(message.xpub)?.push(message);
//   });

//   // Convert to array of latest messages per contact
//   const latestMessages = Array.from(contactsMap.entries()).map(([xpub, messages]) => {
//     return messages[0]; // Get the latest message for each contact
//   });

//   // Filter messages based on search term
//   const filteredMessages = searchTerm && showDecryptedNames
//     ? latestMessages.filter(message => {
//         const decryptedName = getDecryptedName(message.name, message.xpub).toLowerCase();
//         const decryptedText = getDecryptedPreview(message.text, message.xpub, true).toLowerCase();
//         const searchLower = searchTerm.toLowerCase();
//         return decryptedName.includes(searchLower) || decryptedText.includes(searchLower);
//       })
//     : latestMessages;

//   const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const endIndex = startIndex + itemsPerPage;
//   const paginatedItems = filteredMessages.slice(startIndex, endIndex);

//   // Get unique contacts for search
//   const uniqueContacts = Array.from(new Set(allMessages.map(m => m.xpub)))
//     .map(xpub => allMessages.find(m => m.xpub === xpub)!)
//     .filter(contact => {
//       if (contact.xpub === "me") return false;
//       const decryptedName = showDecryptedNames ? getDecryptedName(contact.name, contact.xpub) : contact.name;
//       return decryptedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
//              contact.xpub.toLowerCase().includes(searchQuery.toLowerCase());
//     });

//   const handlePageChange = (page: number) => {
//     if (page >= 1 && page <= totalPages) {
//       setCurrentPage(page);
//     }
//   };

//   const handleSearch = () => {
//     if (showDecryptedNames && searchInput.trim()) {
//       setSearchTerm(searchInput);
//       setCurrentPage(1);
//     }
//   };

//   const handleSwitchChange = (checked: boolean) => {
//     setShowDecryptedNames(checked);
//     if (!checked) {
//       setSearchTerm("");
//       setSearchInput("");
//     }
//   };

//   const handleSend = () => {
//     if (!selectedContact) {
//       setError("Please select a recipient.");
//       return;
//     }
    
//     if (!isEncrypted) {
//       // Encrypt the message using ECDH
//       if (messageText.trim()) {
//         const encrypted = encryptWithECDH(myPrivateKey, selectedContact.xpub, messageText);
//         setOriginalText(messageText);
//         setMessageText(encrypted);
//         setIsEncrypted(true);
//         setHasEncryptedOnce(true);
//       }
//     } else {
//       // Actually send
//       setError("");
//       console.log("Sending message to:", selectedContact.name);
//       console.log("XPUB:", selectedContact.xpub);
//       console.log("Encrypted message:", messageText);
//       // Generate new TXID for the message
//       const newTxid = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
//       console.log("New TXID:", newTxid);
      
//       // Reset states after sending
//       setMessageText("");
//       setOriginalText("");
//       setIsEncrypted(false);
//       setHasEncryptedOnce(false);
//       setSelectedContact(null);
//       setIsSheetOpen(false);
//     }
//   };

//   const handleMessageSwitchChange = (checked: boolean) => {
//     if (!messageText.trim() || !selectedContact) return;
    
//     if (checked) {
//       // Switch to "Decrypt" - show decrypted text
//       if (isEncrypted) {
//         setMessageText(originalText);
//         setIsEncrypted(false);
//       }
//     } else {
//       // Switch to "Encrypt" - show encrypted text
//       if (!isEncrypted && originalText) {
//         setMessageText(encryptWithECDH(myPrivateKey, selectedContact.xpub, originalText));
//         setIsEncrypted(true);
//       } else if (!originalText && messageText) {
//         // First time encrypting
//         const encrypted = encryptWithECDH(myPrivateKey, selectedContact.xpub, messageText);
//         setOriginalText(messageText);
//         setMessageText(encrypted);
//         setIsEncrypted(true);
//         setHasEncryptedOnce(true);
//       }
//     }
//   };

//   const handleMailSelect = (item: TokenMail) => {
//     setSelectedMail(item);
//     setIsSearchMode(false);
//     setIsSheetOpen(true);
//   };

//   const handleOpenSearch = () => {
//     setIsSearchMode(true);
//     setSelectedMail(null);
//     setIsSheetOpen(true);
//     setMessageText("");
//     setOriginalText("");
//     setIsEncrypted(false);
//     setHasEncryptedOnce(false);
//   };

//   const handleContactSelect = (contact: TokenMail) => {
//     setSelectedContact(contact);
//     setSearchQuery("");
//   };

//   return (
//     <>
//       <div className="flex flex-col h-full">
//         {/* Search Bar */}
//         <div className="p-4 pb-2">
//           <div className="relative">
//             <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="20" height="20" />
//             <Input
//               type="text"
//               placeholder={showDecryptedNames ? "Search mails subject..." : "Switch to Decrypted to search"}
//               className={cn(
//                 "pl-8 flex-1",
//                 !showDecryptedNames && "cursor-not-allowed opacity-50"
//               )}
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               disabled={!showDecryptedNames}
//             />
//           </div>
//         </div>

//         {/* Decrypt Names Switch */}
//         <div className="flex items-center justify-end px-4 pb-2">
//           <div className="flex items-center gap-2">
//             <Label htmlFor="list-decrypt" className="text-sm font-medium">
//               {showDecryptedNames ? "Decrypted" : "Encrypted"}
//             </Label>
//             <SwitchToggle
//               id="list-decrypt"
//               checked={showDecryptedNames}
//               onCheckedChange={handleSwitchChange}
//             />
//           </div>
//         </div>

//         <ScrollArea className="flex-1">
//           <div className="flex flex-col gap-2 p-4 pt-0">
//             {paginatedItems.map((item) => (
//               <button
//                 key={item.id}
//                 className={cn(
//                   "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent",
//                   selectedMail?.id === item.id && "bg-muted"
//                 )}
//                 onClick={() => handleMailSelect(item)}
//               >
//                 <div className="flex w-full flex-col gap-1">
//                   <div className="flex items-center">
//                     <div className="flex items-center gap-2">
//                       <div className="font-semibold">{getDecryptedName(item.name, item.xpub)}</div>
//                       {!item.read && (
//                         <span className="flex h-2 w-2 rounded-full bg-blue-600" />
//                       )}
//                     </div>
//                     <div className={cn("ml-auto text-xs text-muted-foreground")}>
//                       {formatDistanceToNow(new Date(item.date), {
//                         addSuffix: true,
//                       })}
//                     </div>
//                   </div>
//                   <div className="text-xs text-muted-foreground">
//                     TXID: {item.txid.substring(0, 20)}...
//                   </div>
//                 </div>
//                 <div className="line-clamp-2 text-xs text-muted-foreground">
//                   {getDecryptedPreview(item.text, item.xpub).substring(0, 100)}...
//                 </div>
                
//                 {/* Child Secret Key Display */}
//                 {showDecryptedNames && item.xpub !== "me" && (
//                   <div className="w-full mt-2">
//                     <div className="flex items-center gap-2">
//                       <Label className="text-xs">Child Secret:</Label>
//                       <Input
//                         type="text"
//                         className="text-xs h-6 flex-1"
//                         value={childSecretKeys[item.xpub] || getChildSecretKey(item.xpub)}
//                         onChange={(e) => updateChildSecretKey(item.xpub, e.target.value)}
//                         onClick={(e) => e.stopPropagation()}
//                       />
//                     </div>
//                   </div>
//                 )}
//               </button>
//             ))}
//           </div>
//         </ScrollArea>

//         <button
//           className="fixed bottom-20 right-10 z-50 flex h-14 w-14 items-center justify-center 
//           rounded-full bg-primary-dark-1 text-primary-dark-12 shadow-lg transition-all 
//           border border-sky-300 hover:bg-black hover:border-sky-300 hover:text-white hover:scale-110 
//           dark:bg-primary-light-1 dark:text-primary-light-12"
//           onClick={handleOpenSearch}
//         >
//           <PlusIcon className="h-5 w-5 text-sky-300 dark:text-gray-50" />
//         </button>

//         {/* Pagination Controls */}
//         <div className="p-1">
//           <Pagination>
//             <PaginationContent>
//               <PaginationItem>
//                 <Button
//                   variant="outline"
//                   onClick={(e) => {
//                     e.preventDefault();
//                     handlePageChange(currentPage - 1);
//                   }}
//                   disabled={currentPage === 1}
//                 >
//                   -
//                 </Button>
//               </PaginationItem>

//               {[...Array(totalPages)]
//                 .map((_, index) => index + 1)
//                 .filter((page) => page >= Math.max(1, currentPage - 2) && page <= Math.min(totalPages, currentPage + 2))
//                 .map((page) => (
//                   <PaginationItem key={page}>
//                     <PaginationLink
//                       href="#"
//                       isActive={currentPage === page}
//                       onClick={(e) => {
//                         e.preventDefault();
//                         handlePageChange(page);
//                       }}
//                     >
//                       {page}
//                     </PaginationLink>
//                   </PaginationItem>
//                 ))}

//               <PaginationItem>
//                 <Button
//                   variant="outline"
//                   onClick={(e) => {
//                     e.preventDefault();
//                     handlePageChange(currentPage + 1);
//                   }}
//                   disabled={currentPage === totalPages}
//                 >
//                   +
//                 </Button>
//               </PaginationItem>
//             </PaginationContent>
//           </Pagination>
//         </div>
//       </div>

//       {/* Sheet for Mail Display with child secret key prop */}
//       <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
//         <SheetContent className="w-[90vw] max-w-[550px] pt-15 pr-0 pl-0 pb-4 bg-zinc-900 border border-zinc-700 shadow-lg">
//           <SheetHeader>
//             <div className="flex justify-between items-center">
//               <SheetClose asChild>
//                 <div className="pb-2">
//                   <Button
//                     className="border border-white bg-grey-500 text-white px-4 py-4 rounded focus:outline-none mr-4"
//                     onClick={() => setIsSheetOpen(false)}
//                   >
//                     X
//                   </Button>
//                 </div>
//               </SheetClose>
//               <SheetTitle className="mx-auto">
//                 {isSearchMode ? "New Message" : "Conversation"}
//               </SheetTitle>
//             </div>
//           </SheetHeader>

//           <RectangleComponent>
//             <div className="flex h-full flex-col">
//               {isSearchMode ? (
//                 <div className="flex flex-col overflow-auto h-full">
//                   {/* Decrypt Names Switch for New Message */}
//                   <div className="flex items-center justify-end mb-3">
//                     <div className="flex items-center gap-2">
//                       <Label htmlFor="message-decrypt" className="text-sm font-medium">
//                         {showDecryptedNames ? "Decrypted" : "Encrypted"}
//                       </Label>
//                       <SwitchToggle
//                         id="message-decrypt"
//                         checked={showDecryptedNames}
//                         onCheckedChange={handleSwitchChange}
//                       />
//                     </div>
//                   </div>
                  
//                   <div className="flex items-center gap-2">
//                     <Label>To:</Label>
//                     <Input
//                       type="text"
//                       placeholder="Search contacts by name or xpub..."
//                       className="w-full p-2 border rounded-md"
//                       value={searchQuery}
//                       onChange={(e) => setSearchQuery(e.target.value)}
//                     />
//                   </div>
//                   <ScrollArea className="mt-4">
//                     {searchQuery && (
//                       <div className="border border-gray-300 rounded-md mt-2 bg-white max-h-80 overflow-auto">
//                         {uniqueContacts.map((contact) => (
//                           <button
//                             key={contact.id}
//                             className="bg-[#111827] w-full text-left p-2 hover:bg-gray-400"
//                             onClick={() => handleContactSelect(contact)}
//                           >
//                             <div className="font-bold text-[11px] text-white">{getDecryptedName(contact.name, contact.xpub)}</div>
//                             <div className="text-[10px] text-gray-400">
//                               {contact.xpub.substring(0, 30)}...
//                             </div>
//                           </button>
//                         ))}
//                       </div>
//                     )}
//                     {selectedContact && (
//                       <div className="flex flex-wrap gap-2 p-1 border rounded-md mt-2">
//                         <div className="bg-[#111827] px-2 py-1 rounded-md flex items-center justify-between w-full">
//                           <div className="flex flex-col gap-1">
//                             <span className="font-bold text-[11px] text-white">{getDecryptedName(selectedContact.name, selectedContact.xpub)}</span>
//                             <span className="text-[10px] text-gray-400">
//                               {selectedContact.xpub.substring(0, 40)}...
//                             </span>
//                           </div>
//                           <button 
//                             onClick={() => setSelectedContact(null)}
//                             className="text-s text-red-500 hover:text-red-700"
//                           >
//                             &times;
//                           </button>
//                         </div>
//                       </div>
//                     )}
//                   </ScrollArea>
//                   {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
//                 </div>
//               ) : selectedMail ? (
//                 <MailDisplay 
//                   mail={selectedMail} 
//                   childSecretKeys={childSecretKeys}
//                   onUpdateChildSecretKey={updateChildSecretKey}
//                 />
//               ) : (
//                 <div className="text-center text-muted-foreground">No message selected</div>
//               )}
//             </div>
//           </RectangleComponent>

//           <SheetFooter>
//             <div className="p-4 border-t bg-gray-900 text-white flex w-full">
//               <form className="w-full" onSubmit={(e) => e.preventDefault()}>
//                 <div className="flex flex-col w-full">
//                   <Textarea
//                     className="bg-gray-800 text-white border border-gray-700 w-full min-h-[100px] resize-none p-2"
//                     placeholder={isSearchMode ? "Type your message..." : `Reply ${selectedMail?.name}...`}
//                     value={messageText}
//                     onChange={(e) => setMessageText(e.target.value)}
//                     disabled={isEncrypted}
//                   />

//                   <div className="flex items-center justify-between w-full mt-4">
//                     <div className="flex items-center gap-2">
//                       <div className="flex flex-col items-center">
//                         <SwitchToggle1
//                           id="encryptSwitch"
//                           aria-label="Toggle encrypt/decrypt"
//                           checked={!isEncrypted}
//                           onCheckedChange={handleMessageSwitchChange}
//                           disabled={!messageText.trim()}
//                         />
//                         <Label htmlFor="encryptSwitch" className="text-xs font-normal mt-1">
//                           {isEncrypted ? "Decrypt" : "Encrypt"}
//                         </Label>
//                       </div>

//                       <SheetClose asChild>
//                         <Button
//                           className="border border-gray-500 bg-transparent text-white px-3 py-2 rounded-md hover:bg-gray-700 transition"
//                           onClick={() => setIsSheetOpen(false)}
//                         >
//                           Cancel
//                         </Button>
//                       </SheetClose>

//                       <Button
//                         onClick={handleSend}
//                         className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-300 transition"
//                         type="button"
//                       >
//                         {isEncrypted ? "Send" : "Encrypt"}
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               </form>
//             </div>
//           </SheetFooter>
//         </SheetContent>
//       </Sheet>
//     </>
//   );
// }

// Before encrytion ECDHA

// "use client";

// import { useState, useRef } from "react";
// import formatDistanceToNow from "date-fns/formatDistanceToNow";
// import { Icon } from '@iconify/react';
// import { Input } from "../ui/input";
// import { cn } from "../../lib/utils"
// import { ScrollArea } from "../ui/scroll-area";
// import { Separator } from "../ui/separator";
// // import { Switch } from "../ui/switch";
// import SwitchToggle from "./switchtoggle";
// import SwitchToggle1 from "./switchtoggle1";
// import { Textarea } from "../ui/textarea";
// import { Label } from "../ui/label";
// import { PlusIcon } from '@radix-ui/react-icons';

// import {
//   Pagination,
//   PaginationContent,
//   PaginationItem,
//   PaginationLink,
// } from "../ui/pagination";
// import { TokenMail, getAllCryptoMessages } from "../messages/data1";
// import {
//   RectangleComponent,
// } from "../ui/(mail)/drawer";
// import {
//   Sheet,
//   SheetClose,
//   SheetContent,
//   SheetFooter,
//   SheetHeader,
//   SheetTitle,
// } from "../ui/(mail)/sheet"
// import { Button } from "../ui/(mail)/button";
// import { MailDisplay } from "../messages/maildisplay";

// interface MailListProps {
//   itemsPerPage?: number;
// }

// export function MailList({ itemsPerPage = 5 }: MailListProps) {
//   const [currentPage, setCurrentPage] = useState(1);
//   const [selectedMail, setSelectedMail] = useState<TokenMail | null>(null);
//   const [isSheetOpen, setIsSheetOpen] = useState(false);
//   const [isSearchMode, setIsSearchMode] = useState(false);
//   const [selectedContact, setSelectedContact] = useState<TokenMail | null>(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchInput, setSearchInput] = useState("");
//   const [error, setError] = useState("");
//   const [isEncrypted, setIsEncrypted] = useState(false);
//   const [messageText, setMessageText] = useState("");
//   const [originalText, setOriginalText] = useState("");
//   const [hasEncryptedOnce, setHasEncryptedOnce] = useState(false);
//   const [showDecryptedNames, setShowDecryptedNames] = useState(false);

//   // Helper to decrypt name
//   const getDecryptedName = (name: string) => {
//     if (!showDecryptedNames) return name;
//     try {
//       return atob(name);
//     } catch {
//       return name;
//     }
//   };

//   // Helper to decrypt message for preview
//   const getDecryptedPreview = (text: string, forceDecrypt: boolean = false) => {
//     if (!showDecryptedNames && !forceDecrypt) return text;
//     try {
//       return atob(text);
//     } catch {
//       return text; // Return as-is if not base64
//     }
//   };

//   // Get all messages and group by contact
//   const allMessages = getAllCryptoMessages();
//   const contactsMap = new Map<string, TokenMail[]>();
  
//   // Group messages by contact name
//   allMessages.forEach(message => {
//     if (!contactsMap.has(message.name)) {
//       contactsMap.set(message.name, []);
//     }
//     contactsMap.get(message.name)?.push(message);
//   });

//   // Convert to array of latest messages per contact
//   const latestMessages = Array.from(contactsMap.entries()).map(([name, messages]) => {
//     return messages[0]; // Get the latest message for each contact
//   });

//   // Filter messages based on search term
//   const filteredMessages = searchTerm && showDecryptedNames
//     ? latestMessages.filter(message => {
//         const decryptedName = getDecryptedName(message.name).toLowerCase();
//         const decryptedText = getDecryptedPreview(message.text, true).toLowerCase();
//         const searchLower = searchTerm.toLowerCase();
//         return decryptedName.includes(searchLower) || decryptedText.includes(searchLower);
//       })
//     : latestMessages;

//   const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const endIndex = startIndex + itemsPerPage;
//   const paginatedItems = filteredMessages.slice(startIndex, endIndex);

//   // Get unique contacts for search
//   const uniqueContacts = Array.from(new Set(allMessages.map(m => m.name)))
//     .map(name => allMessages.find(m => m.name === name)!)
//     .filter(contact => 
//       contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       contact.xpub.toLowerCase().includes(searchQuery.toLowerCase())
//     );

//   const handlePageChange = (page: number) => {
//     if (page >= 1 && page <= totalPages) {
//       setCurrentPage(page);
//     }
//   };

//   const handleSearch = () => {
//     if (showDecryptedNames && searchInput.trim()) {
//       setSearchTerm(searchInput);
//       setCurrentPage(1); // Reset to first page when searching
//     }
//   };

//   const handleSwitchChange = (checked: boolean) => {
//     setShowDecryptedNames(checked);
//     // Clear search when switching to encrypted mode
//     if (!checked) {
//       setSearchTerm("");
//       setSearchInput("");
//     }
//   };

//   const handleSend = () => {
//     if (!selectedContact) {
//       setError("Please select a recipient.");
//       return;
//     }
    
//     if (!isEncrypted) {
//       // Encrypt the message
//       if (messageText.trim()) {
//         const encrypted = btoa(messageText); // Simple base64 encoding for demo
//         setOriginalText(messageText);
//         setMessageText(encrypted);
//         setIsEncrypted(true);
//         setHasEncryptedOnce(true);
//       }
//     } else {
//       // Actually send
//       setError("");
//       console.log("Sending message to:", selectedContact.name);
//       console.log("XPUB:", selectedContact.xpub);
//       console.log("Encrypted message:", messageText);
//       // Generate new TXID for the message
//       const newTxid = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
//       console.log("New TXID:", newTxid);
      
//       // Reset states after sending
//       setMessageText("");
//       setOriginalText("");
//       setIsEncrypted(false);
//       setHasEncryptedOnce(false);
//       setSelectedContact(null);
//       setIsSheetOpen(false);
//     }
//   };

//   const handleMessageSwitchChange = (checked: boolean) => {
//     if (!messageText.trim()) return;
    
//     if (checked) {
//       // Switch to "Decrypt" - show decrypted text
//       if (isEncrypted) {
//         setMessageText(originalText);
//         setIsEncrypted(false);
//       }
//     } else {
//       // Switch to "Encrypt" - show encrypted text
//       if (!isEncrypted && originalText) {
//         setMessageText(btoa(originalText));
//         setIsEncrypted(true);
//       } else if (!originalText && messageText) {
//         // First time encrypting
//         const encrypted = btoa(messageText);
//         setOriginalText(messageText);
//         setMessageText(encrypted);
//         setIsEncrypted(true);
//         setHasEncryptedOnce(true);
//       }
//     }
//   };

//   const handleMailSelect = (item: TokenMail) => {
//     setSelectedMail(item);
//     setIsSearchMode(false);
//     setIsSheetOpen(true);
//   };

//   const handleOpenSearch = () => {
//     setIsSearchMode(true);
//     setSelectedMail(null);
//     setIsSheetOpen(true);
//     // Reset encryption states when opening new message
//     setMessageText("");
//     setOriginalText("");
//     setIsEncrypted(false);
//     setHasEncryptedOnce(false);
//   };

//   const handleContactSelect = (contact: TokenMail) => {
//     setSelectedContact(contact);
//     setSearchQuery("");
//   };

//   return (
//     <>
//       <div className="flex flex-col h-full">
//         {/* Search Bar */}
//         <div className="p-4 pb-2">
//           <div className="relative">
//             <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="20" height="20" />
//             {/* orginal ClassNames ="w-full pl-10 pr-4 py-2 bg-gray-800 border-gray-600 text-white rounded-lg" / NEW = (className="pl-8 flex-1") */}
//             <Input
//               type="text"
//               placeholder={showDecryptedNames ? "Search mails subject..." : "Switch to Decrypted to search"}
//               className={cn(
//                 "pl-8 flex-1",
//                 !showDecryptedNames && "cursor-not-allowed opacity-50"
//               )}
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               disabled={!showDecryptedNames}
//             />
//           </div>
//         </div>

//         {/* Decrypt Names Switch */}
//         <div className="flex items-center justify-end px-4 pb-2">
//           <div className="flex items-center gap-2">
//             <Label htmlFor="list-decrypt" className="text-sm font-medium">
//               {showDecryptedNames ? "Decrypted" : "Encrypted"}
//             </Label>
//             <SwitchToggle
//               id="list-decrypt"
//               checked={showDecryptedNames}
//               onCheckedChange={handleSwitchChange}
//             />
//           </div>
//         </div>

//         <ScrollArea className="flex-1">
//           <div className="flex flex-col gap-2 p-4 pt-0">
//             {paginatedItems.map((item) => (
//               <button
//                 key={item.id}
//                 className={cn(
//                   "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent",
//                   selectedMail?.id === item.id && "bg-muted"
//                 )}
//                 onClick={() => handleMailSelect(item)}
//               >
//                 <div className="flex w-full flex-col gap-1">
//                   <div className="flex items-center">
//                     <div className="flex items-center gap-2">
//                       <div className="font-semibold">{getDecryptedName(item.name)}</div>
//                       {!item.read && (
//                         <span className="flex h-2 w-2 rounded-full bg-blue-600" />
//                       )}
//                     </div>
//                     <div className={cn("ml-auto text-xs text-muted-foreground")}>
//                       {formatDistanceToNow(new Date(item.date), {
//                         addSuffix: true,
//                       })}
//                     </div>
//                   </div>
//                   <div className="text-xs text-muted-foreground">
//                     TXID: {item.txid.substring(0, 20)}...
//                   </div>
//                 </div>
//                 <div className="line-clamp-2 text-xs text-muted-foreground">
//                   {getDecryptedPreview(item.text).substring(0, 100)}...
//                 </div>
//               </button>
//             ))}
//           </div>
//         </ScrollArea>

//         <button
//           className="fixed bottom-20 right-10 z-50 flex h-14 w-14 items-center justify-center 
//           rounded-full bg-primary-dark-1 text-primary-dark-12 shadow-lg transition-all 
//           border border-sky-300 hover:bg-black hover:border-sky-300 hover:text-white hover:scale-110 
//           dark:bg-primary-light-1 dark:text-primary-light-12"
//           onClick={handleOpenSearch}
//         >
//           <PlusIcon className="h-5 w-5 text-sky-300 dark:text-gray-50" />
//         </button>

//         {/* Pagination Controls */}
//         <div className="p-1">
//           <Pagination>
//             <PaginationContent>
//               <PaginationItem>
//                 <Button
//                   variant="outline"
//                   onClick={(e) => {
//                     e.preventDefault();
//                     handlePageChange(currentPage - 1);
//                   }}
//                   disabled={currentPage === 1}
//                 >
//                   -
//                 </Button>
//               </PaginationItem>

//               {[...Array(totalPages)]
//                 .map((_, index) => index + 1)
//                 .filter((page) => page >= Math.max(1, currentPage - 2) && page <= Math.min(totalPages, currentPage + 2))
//                 .map((page) => (
//                   <PaginationItem key={page}>
//                     <PaginationLink
//                       href="#"
//                       isActive={currentPage === page}
//                       onClick={(e) => {
//                         e.preventDefault();
//                         handlePageChange(page);
//                       }}
//                     >
//                       {page}
//                     </PaginationLink>
//                   </PaginationItem>
//                 ))}

//               <PaginationItem>
//                 <Button
//                   variant="outline"
//                   onClick={(e) => {
//                     e.preventDefault();
//                     handlePageChange(currentPage + 1);
//                   }}
//                   disabled={currentPage === totalPages}
//                 >
//                   +
//                 </Button>
//               </PaginationItem>
//             </PaginationContent>
//           </Pagination>
//         </div>
//       </div>

//       {/* Sheet for Mail Display */}
//       <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
//         <SheetContent className="w-[90vw] max-w-[550px] pt-15 pr-0 pl-0 pb-4 bg-zinc-900 border border-zinc-700 shadow-lg">
//           <SheetHeader>
//             <div className="flex justify-between items-center">
//               <SheetClose asChild>
//                 <div className="pb-2">
//                   <Button
//                     className="border border-white bg-grey-500 text-white px-4 py-4 rounded focus:outline-none mr-4"
//                     onClick={() => setIsSheetOpen(false)}
//                   >
//                     X
//                   </Button>
//                 </div>
//               </SheetClose>
//               <SheetTitle className="mx-auto">
//                 {isSearchMode ? "New Message" : "Conversation"}
//               </SheetTitle>
//             </div>
//           </SheetHeader>

//           <RectangleComponent>
//             <div className="flex h-full flex-col">
//               {isSearchMode ? (
//                 <div className="flex flex-col overflow-auto h-full">
//                   {/* Decrypt Names Switch for New Message */}
//                   <div className="flex items-center justify-end mb-3">
//                     <div className="flex items-center gap-2">
//                       <Label htmlFor="message-decrypt" className="text-sm font-medium">
//                         {showDecryptedNames ? "Decrypted" : "Encrypted"}
//                       </Label>
//                       <SwitchToggle
//                         id="message-decrypt"
//                         checked={showDecryptedNames}
//                         onCheckedChange={handleSwitchChange}
//                       />
//                     </div>
//                   </div>
                  
//                   <div className="flex items-center gap-2">
//                     <Label>To:</Label>
//                     <Input
//                       type="text"
//                       placeholder="Search contacts by name or xpub..."
//                       className="w-full p-2 border rounded-md"
//                       value={searchQuery}
//                       onChange={(e) => setSearchQuery(e.target.value)}
//                     />
//                   </div>
//                   <ScrollArea className="mt-4">
//                     {searchQuery && (
//                       <div className="border border-gray-300 rounded-md mt-2 bg-white max-h-80 overflow-auto">
//                         {uniqueContacts.map((contact) => (
//                           <button
//                             key={contact.id}
//                             className="bg-[#111827] w-full text-left p-2 hover:bg-gray-400"
//                             onClick={() => handleContactSelect(contact)}
//                           >
//                             <div className="font-bold text-[11px] text-white">{getDecryptedName(contact.name)}</div>
//                             <div className="text-[10px] text-gray-400">
//                               {contact.xpub.substring(0, 30)}...
//                             </div>
//                           </button>
//                         ))}
//                       </div>
//                     )}
//                     {selectedContact && (
//                       <div className="flex flex-wrap gap-2 p-1 border rounded-md mt-2">
//                         <div className="bg-[#111827] px-2 py-1 rounded-md flex items-center justify-between w-full">
//                           <div className="flex flex-col gap-1">
//                             <span className="font-bold text-[11px] text-white">{getDecryptedName(selectedContact.name)}</span>
//                             <span className="text-[10px] text-gray-400">
//                               {selectedContact.xpub.substring(0, 40)}...
//                             </span>
//                           </div>
//                           <button 
//                             onClick={() => setSelectedContact(null)}
//                             className="text-s text-red-500 hover:text-red-700"
//                           >
//                             &times;
//                           </button>
//                         </div>
//                       </div>
//                     )}
//                   </ScrollArea>
//                   {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
//                 </div>
//               ) : selectedMail ? (
//                 <MailDisplay mail={selectedMail} />
//               ) : (
//                 <div className="text-center text-muted-foreground">No message selected</div>
//               )}
//             </div>
//           </RectangleComponent>

//           <SheetFooter>
//             <div className="p-4 border-t bg-gray-900 text-white flex w-full">
//               <form className="w-full" onSubmit={(e) => e.preventDefault()}>
//                 <div className="flex flex-col w-full">
//                   <Textarea
//                     className="bg-gray-800 text-white border border-gray-700 w-full min-h-[100px] resize-none p-2"
//                     placeholder={isSearchMode ? "Type your message..." : `Reply ${selectedMail?.name}...`}
//                     value={messageText}
//                     onChange={(e) => setMessageText(e.target.value)}
//                     disabled={isEncrypted}
//                   />

//                   <div className="flex items-center justify-between w-full mt-4">
//                     <div className="flex items-center gap-2">
//                       <div className="flex flex-col items-center">
//                         <SwitchToggle1
//                           id="encryptSwitch"
//                           aria-label="Toggle encrypt/decrypt"
//                           checked={!isEncrypted}
//                           onCheckedChange={handleMessageSwitchChange}
//                           disabled={!messageText.trim()}
//                         />
//                         <Label htmlFor="encryptSwitch" className="text-xs font-normal mt-1">
//                           {isEncrypted ? "Decrypt" : "Encrypt"}
//                         </Label>
//                       </div>

//                       <SheetClose asChild>
//                         <Button
//                           className="border border-gray-500 bg-transparent text-white px-3 py-2 rounded-md hover:bg-gray-700 transition"
//                           onClick={() => setIsSheetOpen(false)}
//                         >
//                           Cancel
//                         </Button>
//                       </SheetClose>

//                       <Button
//                         onClick={handleSend}
//                         className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-300 transition"
//                         type="button"
//                       >
//                         {isEncrypted ? "Send" : "Encrypt"}
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               </form>
//             </div>
//           </SheetFooter>
//         </SheetContent>
//       </Sheet>
//     </>
//   );
// }

// // share

// import React, { useState, useEffect } from 'react';
// import { Icon } from '@iconify/react';
// import contacts from '../../../../../../ui/contacts';
// //  import { Textarea } from "../../components/ui/textarea";
// import { Avatar, AvatarImage, AvatarFallback } from '../../../../../../ui/avatar';
// import { TextareaForm } from "../../textarea";
// //  import { Button } from "@/components/ui/button";

// // Interface for Contact
// interface Contact {
//   id: number;
//   username: string;
//   avatar: string;
// }

// // ShareSection Component
// const ShareSection: React.FC = () => {
//   const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
//   const [displayLimit, setDisplayLimit] = useState<number>(60);
//   const [searchTerm, setSearchTerm] = useState<string>('');

//   useEffect(() => {
//     // Filter contacts based on search term
//     const results = contacts.filter(contact =>
//       contact.username.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//     setFilteredContacts(results.slice(0, displayLimit));
//   }, [searchTerm, displayLimit]);

//   const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchTerm(event.target.value);
//   };

//   const loadMoreContacts = () => {
//     setDisplayLimit(prevLimit => prevLimit + 60);
//   };

//   return (
//     <div className="share-section p-4">
//       <div className="relative w-full">
//         <Icon icon="iconamoon:search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//         <input
//           type="text"
//           placeholder="   Search"
//           onChange={handleSearch}
//           value={searchTerm}
//           className="search-bar pl-10 pr-3 py-2 w-full border border-gray-300 rounded"
//         />
//       </div>
//       <div className="contacts-display grid grid-cols-3 gap-4 mt-4">
//         {filteredContacts.map((contact, index) => (
//           <div key={index} className="contact-item flex flex-col items-center">
//             <Avatar>
//               <AvatarImage src={contact.avatar} alt={`@${contact.username}`} />
//               <AvatarFallback>{contact.username[0]}</AvatarFallback>
//             </Avatar>
//             <div className="username text-sm">{contact.username}</div>
//           </div>
//         ))}
//       </div>
//       <button onClick={loadMoreContacts} className="mt-4 mx-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-grey-500 block">
//         View more contacts
//       </button>
//     </div>
//   );
// };

// // DrawerShare Component
// const DrawerShare: React.FC = () => {
//   const [placeholder, setPlaceholder] = useState("Add comment here ...");

//   const handleClearPlaceholder = () => {
//     setPlaceholder("");
//   };

//   return (
//     <div className="w-full mx-auto">
//       <h1 className="text-2xl font-bold mb-4">Share</h1>
//       <div className="flex-1 overflow-auto h-4/5">
//         <ShareSection />
//       </div>
//       <div className="fixed bottom-0 left-0 w-full z-10 bg-black p-4 border-t border-gray-600">
//         <TextareaForm placeholder={placeholder} onClearPlaceholder={handleClearPlaceholder} />
//       </div>
//     </div>
//   );
// };

// export { DrawerShare };


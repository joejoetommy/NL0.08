// src/pages/MessagesPage.tsx
import React, { useState } from 'react';
import MailDev1 from "../components/messages/maildev1";
import EntryDialog from '../components/EntryDialog';
import { User } from 'lucide-react';

const MessagesPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col pt-4 sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full">
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-700 px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Messages</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <User size={24} className="text-gray-400 hover:text-sky-500 transition-colors" />
        </button>
      </div>
      
      <EntryDialog 
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
      
      <MailDev1 />
    </div>
  );
};

export default MessagesPage;




// import MailDev1 from "../components/messages/maildev1"

// const MessagesPage: React.FC = () => (
//   <div className="flex flex-col pt-4 sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full">
//     <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-700 px-4 py-3">
//       <h1 className="text-xl font-bold">Messages</h1>
//     </div>
//         <MailDev1 />
//   </div>
// );
// export default MessagesPage;


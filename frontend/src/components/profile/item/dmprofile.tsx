import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { PlusIcon, Cross1Icon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";

interface DMProfileProps {
  isOpen3: boolean;
  onClose3: () => void;
}

const transitionDebug = {
  type: "easeOut",
  duration: 0.2,
};

const DMProfile: React.FC<DMProfileProps> = ({ isOpen3, onClose3 }) => {
  const [messages, setMessages] = useState<
    {
      id: number;
      text: string;
    }[]
  >([]);
  const [newMessage, setNewMessage] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newMessage.trim()) {
      const timestamp = new Date().getTime();
      setMessages([...messages, { id: timestamp, text: newMessage }]);
      setNewMessage("");
    }
  };

  return (
    <div>
      <AlertDialog open={isOpen3} onOpenChange={onClose3}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 text-black dark:text-white max-w-[500px] p-0">
          <AlertDialogHeader className="relative p-6 pb-4">
            <AlertDialogTitle className="pr-10 text-center">
              Send a Direct Message     
            </AlertDialogTitle>
            <button
              onClick={onClose3}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Cross1Icon className="w-5 h-5" />
            </button>
          </AlertDialogHeader>

          <div className="flex flex-col h-[400px] px-6 pb-6">
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="flex flex-col items-end space-y-2">
                <AnimatePresence mode="wait">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      layout="position"
                      className="max-w-[70%] break-words rounded-2xl bg-gray-200 dark:bg-gray-800"
                      layoutId={`container-[${messages.length - 1}]`}
                      transition={transitionDebug}
                    >
                      <div className="px-3 py-2 text-[15px] leading-[20px] text-gray-900 dark:text-gray-100">
                        {message.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                onChange={(e) => setNewMessage(e.target.value)}
                value={newMessage}
                className="flex-1 h-12 rounded-full border border-gray-300 bg-gray-50 px-4 text-[15px] outline-none placeholder:text-gray-500 focus:border-blue-500 focus:bg-white
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-900"
                placeholder="Type your message"
              />
              <button
                type="submit"
                className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
              >
                <PlusIcon className="h-5 w-5 text-white" />
              </button>
            </form>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DMProfile;



// import React, { useState } from 'react';
// import {
//   AlertDialog,
//   AlertDialogContent,
//   // AlertDialogDescription,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from '../../ui/alert-dialog';
// import { PlusIcon, Cross1Icon } from "@radix-ui/react-icons";
// import { AnimatePresence, motion } from "framer-motion";

// interface DMProfileProps {
//   isOpen3: boolean;
//   onClose3: () => void;
// }

// const transitionDebug = {
//   type: "easeOut",
//   duration: 0.2,
// };

// const DMProfile: React.FC<DMProfileProps> = ({ isOpen3, onClose3 }) => {
//   const [messages, setMessages] = useState<
//     {
//       id: number;
//       text: string;
//     }[]
//   >([]);
//   const [newMessage, setNewMessage] = useState<string>("");

//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     if (newMessage.trim()) {
//       const timestamp = new Date().getTime();
//       setMessages([...messages, { id: timestamp, text: newMessage }]);
//       setNewMessage("");
//     }
//   };

//   return (
//     <div>
//       <AlertDialog open={isOpen3} onOpenChange={onClose3}>
//         <AlertDialogContent>
//           <AlertDialogHeader className="flex justify-between items-center">
//             <AlertDialogTitle className="flex-grow">
//               Send a Direct Message     
//               <div className="absolute top-6 right-6">
//                 <button
//                   onClick={onClose3}
//                   className="pl-12 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
//                 >
//                   <Cross1Icon className="w-5 h-5" />
//                 </button>
//               </div>
//             </AlertDialogTitle>
//           </AlertDialogHeader>

//           <div className="p-4">
//             <div className="flex h-[300px] flex-col items-end justify-end pb-4">
//               <AnimatePresence mode="wait">
//                 {messages.map((message) => (
//                   <motion.div
//                     key={message.id}
//                     layout="position"
//                     className="z-10 mt-2 max-w-[250px] break-words rounded-2xl bg-gray-200 dark:bg-gray-800"
//                     layoutId={`container-[${messages.length - 1}]`}
//                     transition={transitionDebug}
//                   >
//                     <div className="px-3 py-2 text-[15px] leading-[15px] text-gray-900 dark:text-gray-100">
//                       {message.text}
//                     </div>
//                   </motion.div>
//                 ))}
//               </AnimatePresence>
//               <div className="mt-4 flex w-full">
//                 <form onSubmit={handleSubmit} className="flex w-full">
//                   <input
//                     type="text"
//                     onChange={(e) => setNewMessage(e.target.value)}
//                     value={newMessage}
//                     className="py- relative h-9 w-[250px] flex-grow rounded-full border border-gray-200 bg-white px-3 text-[15px] outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-blue-500/20 focus-visible:ring-offset-1
//                     dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus-visible:ring-blue-500/20 dark:focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-700"
//                     placeholder="Type your message"
//                   />
//                   <motion.div
//                     key={messages.length}
//                     layout="position"
//                     className="pointer-events-none absolute z-10 flex h-9 w-[250px] items-center overflow-hidden break-words rounded-full bg-gray-200 [word-break:break-word] dark:bg-gray-800"
//                     layoutId={`container-[${messages.length}]`}
//                     transition={transitionDebug}
//                     initial={{ opacity: 0.6, zIndex: -1 }}
//                     animate={{ opacity: 0.6, zIndex: -1 }}
//                     exit={{ opacity: 1, zIndex: 1 }}
//                   >
//                     <div className="px-3 py-2 text-[15px] leading-[15px] text-gray-900 dark:text-gray-100">
//                       {newMessage}
//                     </div>
//                   </motion.div>
//                   <button
//                     type="submit"
//                     className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800"
//                   >
//                     <PlusIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
//                   </button>
//                 </form>
//               </div>
//             </div>
//           </div>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// };

// export default DMProfile;
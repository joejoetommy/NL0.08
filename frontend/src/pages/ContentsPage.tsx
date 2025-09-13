


// import React, { useState, useRef, useEffect } from 'react';

//   const tabComponents = {
//     Wallet: <Wallet  />,
//     WalletApp: <WalletApp />,
//         CreateLargeProfileInscription1:               
        
//         <CreateLargeProfileInscription1
//                         // keyData={keyData}
//                         // network={network}
//                         // whatsOnChainApiKey={whatsOnChainApiKey}
//                         // currentFeeRate={currentFeeRate}
//                         // balance={balance}
//                         // lastTransactionTime={lastTransactionTime}
//                         // setStatus={setStatus}
//                         // setLastTxid={setLastTxid}
//                         // setLastTransactionTime={setLastTransactionTime}
//                       />,
//        // WalletProfile: <WalletProfile />,
//   };


// const ContentsPage: React.FC = () => {
//  const [activeTab, setActiveTab] = useState<TabType>('WalletApp');

//   return (
//     <div className="flex flex-col pt-4 sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full">

//     <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-700 px-4 py-3">
//           <h1 className="text-xl font-bold">content</h1>
//       </div>
//             {/* <Wallet /> */}
//              <div className="flex w-full">
//                       <button
//                         onClick={() => setActiveTab('Wallet')}
//                         className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
//                           activeTab === 'Wallet' ? 'font-bold' : 'text-gray-500'
//                         }`}
//                       >
//                         Wallet
//                         {activeTab === 'Wallet' && (
//                           <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
//                         )}
//                       </button>
//                                             <button
//                         onClick={() => setActiveTab('WalletApp')}
//                         className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
//                           activeTab === 'WalletApp' ? 'font-bold' : 'text-gray-500'
//                         }`}
//                       >
//                         WalletApp
//                         {activeTab === 'WalletApp' && (
//                           <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
//                         )}
//                       </button>

//                     </div>


//                   <div className="flex flex-1 h-screen overflow-y-auto">
//                     {tabComponents[activeTab] || null}
//                   </div>

//       </div>







//     );
//   };


// export default ContentsPage;



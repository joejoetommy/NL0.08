// const NotificationsPage: React.FC = () => (
//   <div className="flex flex-col pt-4 sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full">
//     <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-700 px-4 py-3">
//       <h1 className="text-xl font-bold">Notifications</h1>
//     </div>



//     <div className="p-6 text-center">
//       <p className="text-gray-500">No new notifications</p>
//     </div>
//   </div>
// );
// export default NotificationsPage;

import React, { useState } from 'react';

// import { getProfileData, updateProfileData } from '../components/profile/data/profiledata';
import Wallet from '../components/wallet/wallet4'; // This is ECDH WORKING
// import Wallet from '../components/wallet/wallet5'; // This has  TYPE-42 on  development
import WalletApp from '../components/wallet/wallet6';
import { CreateLargeProfileInscription1 } from '../components/wallet2/inscriptions/components/sheetwalls/sheet001';
// import WalletProfile from '../components/wallet/profilewallet';
// import mintProfileDataToken from '../components/wallet/profiledatatoken';

  const tabComponents = {
    Wallet: <Wallet  />,
    WalletApp: <WalletApp />,
        CreateLargeProfileInscription1:               
        
        <CreateLargeProfileInscription1
                        // keyData={keyData}
                        // network={network}
                        // whatsOnChainApiKey={whatsOnChainApiKey}
                        // currentFeeRate={currentFeeRate}
                        // balance={balance}
                        // lastTransactionTime={lastTransactionTime}
                        // setStatus={setStatus}
                        // setLastTxid={setLastTxid}
                        // setLastTransactionTime={setLastTransactionTime}
                      />,
       // WalletProfile: <WalletProfile />,
  };

const WalletPage: React.FC = () => {
 // const profileData = getProfileData();
 const [activeTab, setActiveTab] = useState<TabType>('WalletApp');

  return (
    <div className="flex flex-col pt-4 sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full">

    <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-700 px-4 py-3">
          <h1 className="text-xl font-bold">Wallet</h1>
      </div>
            {/* <Wallet /> */}
             <div className="flex w-full">
                      <button
                        onClick={() => setActiveTab('Wallet')}
                        className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
                          activeTab === 'Wallet' ? 'font-bold' : 'text-gray-500'
                        }`}
                      >
                        Wallet
                        {activeTab === 'Wallet' && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
                        )}
                      </button>
                                            <button
                        onClick={() => setActiveTab('WalletApp')}
                        className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
                          activeTab === 'WalletApp' ? 'font-bold' : 'text-gray-500'
                        }`}
                      >
                        WalletApp
                        {activeTab === 'WalletApp' && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
                        )}
                      </button>
                                                                  <button
                        onClick={() => setActiveTab('CreateLargeProfileInscription1')}
                        className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
                          activeTab === 'WalletApp' ? 'font-bold' : 'text-gray-500'
                        }`}
                      >
                        CreateLargeProfileInscription1
                        {activeTab === 'CreateLargeProfileInscription1' && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
                        )}
                      </button>
                                            {/* <button
                        onClick={() => setActiveTab('WalletProfile')}
                        className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
                          activeTab === 'WalletProfile' ? 'font-bold' : 'text-gray-500'
                        }`}
                      >
                        WalletProfile
                        {activeTab === 'WalletProfile' && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
                        )}
                      </button> */}
                    </div>


                  <div className="flex flex-1 h-screen overflow-y-auto">
                    {tabComponents[activeTab] || null}
                  </div>

      </div>







    );
  };


export default WalletPage;

           {/* 
            
<div className="flex flex-col pt-4 sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full">
  <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-700 px-4 py-3">
    <h1 className="text-xl font-bold">Messages</h1>
  </div>
      <MailDev1 />
</div>
            
            
            
            */}



import React, { useState, useRef, useEffect } from 'react';
import NetworkPage from '../components/contacts/Network';
import { XpubInputDialog } from '../components/contacts/XpubInputDialog'; 

type TabType = 'network' | 'contacts';
export type SortOption = 'recent' | 'alphabetical' | 'oldest';

const ExplorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('network');
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState<string>('');
  const [showXpubDialog, setShowXpubDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const tabComponents = {
    network: <NetworkPage searchTerm={searchTerm} sortBy={sortBy} />
  };

  const startCamera = async () => {
    try {
      setScanError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setShowScanner(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setScanError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
    setScanError('');
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSortMenu && !(event.target as Element).closest('.sort-menu-container')) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSortMenu]);

  const handleScan = () => {
    // This is where you would integrate a QR code scanning library
    // For now, we'll just show the camera interface
    console.log('Scanning for QR code...');
    // You can integrate libraries like qr-scanner or jsQR here
  };

  const handleXpubSubmit = (xpub: string) => {
    // Handle the submitted xpub here
    console.log('New xpub submitted:', xpub);
    // You can add logic here to save the xpub to your state/database
  };

  // Get sort button label
  const getSortLabel = (): string => {
    switch (sortBy) {
      case 'recent':
        return 'Most Recent';
      case 'alphabetical':
        return 'A-Z';
      case 'oldest':
        return 'Oldest First';
      default:
        return 'Sort';
    }
  };

  return (
    <div className="flex flex-col pt-4 sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full">
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-700 z-10">
        <div className="px-4">
          <div className="relative flex items-center gap-2">
            {/* Search input with integrated sort button */}
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 rounded-full py-3 pl-12 pr-4 outline-none focus:bg-zinc-800 focus:border focus:border-sky-500"
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Sort button with dropdown */}
              <div className="relative sort-menu-container">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 rounded-full py-3 px-4 transition-colors focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <span className="text-sm whitespace-nowrap">{getSortLabel()}</span>
                  <svg className={`w-3 h-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown menu */}
                {showSortMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-900 rounded-lg shadow-lg border border-zinc-700 py-1 z-20">
                    <button
                      onClick={() => {
                        setSortBy('recent');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                        sortBy === 'recent' ? 'text-sky-500' : ''
                      }`}
                    >
                      <span>Most Recent</span>
                      {sortBy === 'recent' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setSortBy('alphabetical');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                        sortBy === 'alphabetical' ? 'text-sky-500' : ''
                      }`}
                    >
                      <span>Alphabetical</span>
                      {sortBy === 'alphabetical' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setSortBy('oldest');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                        sortBy === 'oldest' ? 'text-sky-500' : ''
                      }`}
                    >
                      <span>Oldest First</span>
                      {sortBy === 'oldest' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setShowXpubDialog(true)}
              className="p-3 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors group"
              title="Add Connection"
            >
              <svg 
                className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            <button
              onClick={startCamera}
              className="p-3 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors group"
              title="Scan QR Code"
            >
              <svg 
                className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex w-full">
          <button
            onClick={() => setActiveTab('network')}
            className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
              activeTab === 'network' ? 'font-bold' : 'text-gray-500'
            }`}
          >
            Network
            {activeTab === 'network' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <h3 className="text-lg font-semibold">Scan QR Code</h3>
              <button
                onClick={stopCamera}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              {scanError ? (
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
                  {scanError}
                </div>
              ) : (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                    onLoadedMetadata={handleScan}
                  />
                  <div className="absolute inset-0 border-2 border-sky-500 rounded-lg pointer-events-none">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-500 rounded-br-lg"></div>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-400 mt-4 text-center">
                Position the QR code within the frame to scan
              </p>
            </div>
          </div>
        </div>
      )}

      {/* XpubInputDialog */}
      <XpubInputDialog 
        isOpen={showXpubDialog}
        onClose={setShowXpubDialog}
        onXpubSubmit={handleXpubSubmit}
      />

      <div className="flex flex-1 h-screen overflow-y-auto">
        {tabComponents[activeTab] || null}
      </div>
    </div>
  );
};

export default ExplorePage;



// Orginal proir to the development of the QR scanner
// import React, { useState } from 'react';
// import NetworkPage from '../components/contacts/Network';

// type TabType = 'network' | 'contacts' ;

// const ExplorePage: React.FC = () => {

//   const [activeTab, setActiveTab] = useState<TabType>('network');
//   const tabComponents = {
//   network: <NetworkPage />
// };

//   return (
//     <div className="flex flex-col pt-4 sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full">
//       <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-700">
  
//         <div className="px-4 ">
//           <div className="relative">
//             <input 
//               type="text" 
//               placeholder="Search" 
//               className="w-full bg-zinc-900 rounded-full py-3 pl-12 pr-4 outline-none focus:bg-zinc-800 focus:border focus:border-sky-500"
//             />
//             <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//             </svg>
//           </div>
//         </div>
//                 <div className="flex w-full">
//           <button
//             onClick={() => setActiveTab('network')}
//             className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
//               activeTab === 'network' ? 'font-bold' : 'text-gray-500'
//             }`}
//           >
//             Network
//             {activeTab === 'network' && (
//               <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
//             )}
//           </button>
//         </div>
//       </div>

//       <div className="flex flex-1 h-screen overflow-y-auto">
//         {tabComponents[activeTab] || null}
//       </div>


//     </div>
//   );
// };

// export default ExplorePage;
















































// import ContactsPage from '../components/contacts/Contacts';
// import RequestsPage from '../components/contacts/Requests';


// type TabType = 'network' | 'contacts' | 'requests';



  // contacts: <ContactsPage />,
  // requests: <RequestsPage />,


          {/* <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
              activeTab === 'contacts' ? 'font-bold' : 'text-gray-500'
            }`}
          >
            Contacts
            {activeTab === 'contacts' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
            )}
          </button> */}
                    {/* <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-4 hover:bg-white/10 transition-colors relative ${
              activeTab === 'requests' ? 'font-bold' : 'text-gray-500'
            }`}
          >
            Request
            {activeTab === 'requests' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 rounded-full"></div>
            )}
          </button> */}


      {/* <div className="px-4 py-6">
        <h2 className="text-2xl font-bold mb-4">Trends for you</h2>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="py-3 hover:bg-white/5 -mx-4 px-4 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Trending</p>
                <p className="font-bold text-lg">#Trend{i}</p>
                <p className="text-sm text-gray-500 mt-1">{12.5 * i}K posts</p>
              </div>
            </div>   : <RequestsPage />
          </div>
        ))}
      </div> */}
      {/* <div className="flex flex-1 h-screen overflow-y-auto">
        {activeTab === 'network' ? <NetworkPage /> : <ContactsPage /> : <RequestsPage /> }
      </div> */}
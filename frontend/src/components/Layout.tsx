// src/components/Layout.tsx
// import React, { useState, useEffect } from 'react';
// import { Outlet } from 'react-router-dom';
// import SideNav from './SideNav';
// import BottomNav from './BottomNav';
// import MaxWidthWrapper from './MaxWidthWrapper';
// import EntryDialog from './EntryDialog';
// import { useWalletStore } from '../components/wallet2/store/WalletStore';
// import { Key, Shield } from 'lucide-react';

// src/components/Layout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from './SideNav';
import BottomNav from './BottomNav';
import MaxWidthWrapper from './MaxWidthWrapper';
import EntryDialog from './EntryDialog';

const Layout: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Open dialog on mount
    setDialogOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <MaxWidthWrapper>
        <div className="flex">
          <SideNav />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </MaxWidthWrapper>
      <BottomNav />
      
      {/* Entry Dialog */}
      <EntryDialog 
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};

export default Layout;






// // src/components/Layout.tsx
// import React from 'react';
// import { Outlet } from 'react-router-dom';
// import SideNav from './SideNav';
// import BottomNav from './BottomNav';
// import MaxWidthWrapper from './MaxWidthWrapper';

// const Layout: React.FC = () => {
//   return (
//     <div className="min-h-screen bg-black text-white">
//       <MaxWidthWrapper>
//         <div className="flex">
//           <SideNav />
//           <main className="flex-1">
//             <Outlet />
//           </main>
//         </div>
//       </MaxWidthWrapper>
//       <BottomNav />
//     </div>
//   );
// };

// export default Layout;
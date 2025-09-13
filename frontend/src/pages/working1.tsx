// import React from 'react';
// import HomeFeed from '../components/profile/Profile';

// const HomePage: React.FC = () => {
//   return (
//     <div className="flex flex-col sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full min-h-screen">
//       <HomeFeed />
//     </div>
//   );
// };

// export default HomePage;

'use client';
// Home feed
import React, { useState } from 'react';

import useScrollingEffect from '../hooks/use-scroll';
import { useTabs } from '../hooks/use-tabs';
import { Framer } from '../../lib/framer';

// import ProfilePage from '@/components/Account/profile';
import WallPage from '@/components/Account/wall'; 
import PowPage from '@/components/Account/pow';
            // import NetworkPage from '@/components/Account/network'; 
            // import ReviewPage from '@/components/Account/reviews';
import AccountReview from '@/components/Account/accountreview';
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";


import { MdAccountBox } from "react-icons/md";
import { RxComponent2 } from "react-icons/rx";
import { Icon } from '@iconify/react';
import HomeFeed from '../components/profile/Profile';

interface TabInfo {
  id: string;
  displayName: string;
}

// <Icon icon="mdi:cards-heart" width="32" height="32" />   <Icon icon="fluent-mdl2:web-components" /> blue
const HomePage = () => {
  const scrollDirection = useScrollingEffect();
  const headerClass =
    scrollDirection === 'up' ? 'translate-y-0' : 'translate-y-[-50%]';

    
  const [hookProps] = useState({
    tabs: [
      {
        label: <Icon icon="iconamoon:profile-circle-fill" width="32" height="32" />,
        children: <HomeFeed />,
        id: 'Profile',
        displayName: 'Profile',
      },
            {
        label: <Icon icon="iconamoon:profile-circle-fill" width="32" height="32" />,
        children: <HomeFeed />,
        id: 'Profile',
        displayName: 'Profile',
      }
      // {
      //   label: <Icon icon="fluent-mdl2:web-components" width="32" height="32" />,
      //   children: <WallPage />,
      //   id: 'Wall',
      //   displayName: 'Wall',
      // },
      // {
      //   label: <Icon icon="akar-icons:link-chain" width="32" height="32" />,
      //   children: <PowPage />,
      //   id: 'POW',
      //   displayName: 'Proof on-Chain',
      // },
      // {
      //   label: <Icon icon="mdi:account-group" width="32" height="32" />,
      //   children: <NetworkPage />,
      //   id: 'Network',
      //   displayName: 'Network',
      // },
      // {
      //   label: <Icon icon="fluent-mdl2:account-activity" width="32" height="32" />,
      //   children: <ReviewPage />,
      //   id: 'Reviews',
      //   displayName: 'Reviews',
      // },
      // {
      //   label: <Icon icon="fluent-mdl2:account-activity" width="32" height="32" />,
      //   children: <AccountReview />,
      //   id: 'Reviews',
      //   displayName: 'Account reviews',
      // },
    ],
    initialTabId: 'Profile',
  });
  const framer = useTabs(hookProps);

 
    // State to hold the currently active tab's display name
   const [activeTabDisplayName, setActiveTabDisplayName] = useState<string>('displayName');
  
    // Handler to update the active tab
    const handleTabClick = (tab: TabInfo) => {
      setActiveTabDisplayName(tab.displayName);
    };
    

  return (
    <div className="flex flex-col flex-1">
      <div
        className={`flex flex-col border-b border-zinc-700 sticky inset-x-0 pt-2 top-0 z-30 w-full transition-all backdrop-blur-xl  ${headerClass} md:translate-y-0`}
      >
        <div className="flex justify-between">
      
        <span className=" flex px-4 font-bold text-2xl">{framer.selectedTab.displayName}
        </span>
            <div className="flex justify-end pr-6" >
              <Avatar className="flex">
              <AvatarImage src="" alt="@shadcn" />
              <AvatarFallback>NL</AvatarFallback>
              </Avatar>
            </div>
        </div>
        <div className="flex flex-row w-full items-center justify-around mt-4">
          <Framer.Tabs {...framer.tabProps} />
        </div>
      </div>

      <div className="pt-10 flex  flex-1 h-screen">
        {framer.selectedTab.children}
      </div>
    </div>
  );
};

export default HomePage;
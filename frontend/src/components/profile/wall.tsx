import React, { useState, useRef, useEffect } from 'react';
// import Image from 'next/image';
// import { imageData } from '@/components/data/(wall)/wallt1';
// import { imageDataTag } from '@/components/data/(wall)/walltag';
// import { videoShorts } from '@/components/data/(wall)/wallt2';
// import { WallPost } from '@/components/models/(wall)/PostType';
import { Icon } from '@iconify/react';
import WallT1 from '../../pages/wall/wallt1';
import WallT2 from '../../pages/wall/wallt2';
// Placeholder imports for remaining tabs
import WallT3 from '../../pages/wall/wallt3';
import WallT4 from '../../pages/wall/wallt4';
import WallT5 from '../../pages/wall/wallt5';
import WallT6 from '../../pages/wall/wallt6';
import WallT7 from '../../pages/wall/wallt7';
import { motion } from "framer-motion";

const tabs = {
  Tab1: 'mdi:wall',
  Tab2: 'simple-icons:youtubeshorts',
  Tab3: 'bxs:videos',
  Tab4: 'hugeicons:quill-write-02',
  Tab5: 'ant-design:audio-filled',
  Tab6: 'ep:goods-filled',
  Tab7: 'uiw:tags',
} as const;

type TabKey = keyof typeof tabs;

const subTabs = {
  1: 'mdi:wall',
  2: 'simple-icons:youtubeshorts',
  3: 'bxs:videos',
  4: 'hugeicons:quill-write-02',
  5: 'material-symbols:medical-services',
  6: 'ep:goods-filled'
};

// hugeicons:quill-write-02   ant-design:audio-filled

const WallPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<TabKey>('Tab1');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && selectedImageIndex !== null) {
      const scrollElements = scrollRef.current.children;
      const elementToScroll = scrollElements[selectedImageIndex];
      elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedImageIndex]);

  const handleReturnToList = () => {
    setSelectedImageIndex(null);
  };

  const renderReturnButton = () => (
    selectedImageIndex !== null && (
      <button
        onClick={handleReturnToList}
        style={{ right: '1rem', bottom: '2.5rem' }}
        className="fixed z-10 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
      >
        Return
      </button>
    )
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Tab1':
        return <WallT1 />;
      case 'Tab2':
        return <WallT2 />;
      case 'Tab3':
        return <WallT3 />;
      case 'Tab4':
        return <WallT4 />;
      case 'Tab5':
        return <WallT5 />;
      case 'Tab6':
        return <WallT6 />;
      case 'Tab7':
        return <WallT7 />;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-center mb-4">
        {Object.entries(tabs).map(([tab, icon]) => (
          <button
          key={tab}
          className={`px-1 py-1 mx-1 relative ${
            selectedTab === tab
              ? "text-white  rounded"
              : "hover:text-sky-500 text-bold bg-white-500 rounded"
          }`}
          onClick={() => {
            setSelectedTab(tab as TabKey);
            if (tab === "Tab7") setSelectedSubTab(1);
          }}
          >
          <Icon icon={icon} width="18" height="18" />
          {/* Underline animation for selected tab */}
          {selectedTab === tab && (
            <motion.div
              className="absolute bottom-[-2px] left-0 w-full h-[3px] bg-sky-500 rounded-full"
              layoutId="underline"
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                duration: 0.3,
              }}
            />
          )}
          </button>
        ))}
      </div>
      {renderTabContent()}
    </div>
  );
};

export default WallPage;



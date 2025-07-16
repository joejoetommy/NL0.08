// src/components/TopHeader.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface TopHeaderProps {
  onMenuClick: () => void;
  className?: string;
}

const TopHeader: React.FC<TopHeaderProps> = ({ onMenuClick, className }) => {
  const location = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Home';
      case '/explore':
        return 'Explore';
      case '/notifications':
        return 'Notifications';
      case '/messages':
        return 'Messages';
      case '/bookmarks':
        return 'Bookmarks';
      case '/lists':
        return 'Lists';
      case '/profile':
        return 'Profile';
      default:
        return 'Page';
    }
  };

  return (
    <header className={`sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 ${className}`}>
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-bold">{getPageTitle()}</h1>
        </div>
        
        {/* Optional: Add mobile user avatar */}
        <div className="w-8 h-8 bg-gray-300 rounded-full" />
      </div>
    </header>
  );
};

export default TopHeader;
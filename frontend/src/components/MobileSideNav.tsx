// components/MobileSideNav.tsx
import React, {  useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  Menu,
  X,
  Plus
} from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSideNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  const navItems = [
    { path: '/', label: 'Home', icon: <Home size={26} /> },
    { path: '/explore', label: 'Explore', icon: <Search size={26} /> },
    { path: '/notifications', label: 'Notifications', icon: <Bell size={26} /> },
    { path: '/messages', label: 'Messages', icon: <Mail size={26} /> },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 lg:hidden
          ${isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <nav className={`fixed left-0 top-0 h-full w-[280px] bg-white transform transition-transform duration-300 z-50 lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Account info</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gray-300 rounded-full" />
              <button className="ml-auto p-2 rounded-full border border-gray-300">
                <Plus size={20} />
              </button>
            </div>
            <div className="mb-2">
              <div className="font-bold text-gray-900">John Doe</div>
              <div className="text-gray-500">@johndoe</div>
            </div>
            <div className="flex space-x-4 text-sm">
              <div>
                <span className="font-bold">123</span>
                <span className="text-gray-500 ml-1">Following</span>
              </div>
              <div>
                <span className="font-bold">456</span>
                <span className="text-gray-500 ml-1">Followers</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <ul className="flex-1 py-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="flex items-center px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-700">{item.icon}</span>
                  <span className="ml-5 text-xl text-gray-900">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Footer Links */}
          <div className="border-t border-gray-200 p-4">
            <Link to="/settings" className="block py-2 text-gray-700 hover:text-gray-900">
              Settings and privacy
            </Link>
            <Link to="/help" className="block py-2 text-gray-700 hover:text-gray-900">
              Help Center
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
};

// Mobile Menu Button Component
export const MobileMenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full hover:bg-gray-100 transition-colors lg:hidden"
      aria-label="Open menu"
    >
      <Menu size={24} />
    </button>
  );
};

export default MobileSideNav;
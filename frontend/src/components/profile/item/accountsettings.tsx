import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '../../ui/alert-dialog';
import { Cross1Icon } from "@radix-ui/react-icons";

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  username: string;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ isOpen, onClose, name, username }) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleBlock = () => {
    setIsBlocked(!isBlocked);
    // Add your block/unblock logic here
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    // Add your mute/unmute logic here
  };

  const handleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    // Add your notification toggle logic here
  };

  const handleReport = () => {
    // Add your report logic here
    window.alert('Report functionality would be implemented here');
  };

  const handleRemoveFromNetwork = () => {
    // Add your remove from network logic here
    if (window.confirm(`Are you sure you want to remove ${name} from your network?`)) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white dark:bg-gray-900 text-black dark:text-white max-w-[400px]">
        <AlertDialogHeader className="relative">
          <AlertDialogTitle className="pr-10">
            Account Settings
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
            Manage your connection with {name}
          </AlertDialogDescription>
          <button
            onClick={onClose}
            className="absolute top-0 right-0 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Cross1Icon className="w-5 h-5" />
          </button>
        </AlertDialogHeader>

        <div className="space-y-2 mt-4">
          {/* Block/Unblock */}
          <button
            onClick={handleBlock}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="font-medium">
                {isBlocked ? 'Unblock' : 'Block'} @{username}
              </span>
            </div>
            <span className="text-sm text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">
              {isBlocked ? 'Blocked' : ''}
            </span>
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={handleMute}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              <span className="font-medium">
                {isMuted ? 'Unmute' : 'Mute'} notifications
              </span>
            </div>
            <span className="text-sm text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">
              {isMuted ? 'Muted' : ''}
            </span>
          </button>

          {/* Notification Settings */}
          <button
            onClick={handleNotifications}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="font-medium">
                Post notifications
              </span>
            </div>
            <span className="text-sm text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">
              {notificationsEnabled ? 'On' : 'Off'}
            </span>
          </button>

          {/* Report */}
          <button
            onClick={handleReport}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center space-x-3 group"
          >
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Report @{username}</span>
          </button>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

          {/* Remove from Network */}
          <button
            onClick={handleRemoveFromNetwork}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-3 group"
          >
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
            </svg>
            <span className="font-medium text-red-600">Remove from network</span>
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AccountSettings;
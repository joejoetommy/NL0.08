import React, { useState } from 'react';
import { LogOut, Download, AlertTriangle, RefreshCw } from 'lucide-react';

interface LogOutExitProps {
  isActive: boolean;
  onLogout: () => Promise<void>;
  network: 'mainnet' | 'testnet';
}

export const LogOutExit: React.FC<LogOutExitProps> = ({
  isActive,
  onLogout,
  network
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState<string>('');

  const handleLogoutClick = () => {
    if (!isActive) return;
    setShowConfirmation(true);
  };

  const cancelLogout = () => {
    setShowConfirmation(false);
    setLogoutMessage('');
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    setLogoutMessage('Creating backup and logging out...');
    
    try {
      // Call the parent's logout function which handles vault backup
      await onLogout();
      
      setLogoutMessage('Logout successful. Vault backed up.');
      
      // Clear the confirmation after a delay
      setTimeout(() => {
        setShowConfirmation(false);
        setLogoutMessage('');
        setIsLoggingOut(false);
      }, 2000);
    } catch (error) {
      setLogoutMessage('Error during logout: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Main Logout Button */}
      <button
        onClick={handleLogoutClick}
        disabled={!isActive || isLoggingOut}
        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
          isActive && !isLoggingOut
            ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
        title={isActive ? 'Logout and backup vault' : 'Enter wallet first to enable logout'}
      >
        <LogOut size={16} />
        LOGOUT
      </button>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999999 }}>
          <div 
            className="fixed inset-0 bg-black/90" 
            style={{ zIndex: 9999998 }}
            onClick={cancelLogout}
          />
          <div 
            className="relative bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 border border-zinc-700"
            style={{ zIndex: 9999999 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-900/30 rounded-full">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">Confirm Logout</h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-gray-300">
                Logging out will:
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <Download size={14} className="mt-0.5 text-green-400" />
                  <span>Automatically download an encrypted backup of your vault</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">×</span>
                  <span>Clear your master private key from memory</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">×</span>
                  <span>Clear all encryption keys from memory</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">×</span>
                  <span>Reset the wallet to initial state</span>
                </li>
              </ul>
              
              <div className="p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
                <p className="text-xs text-amber-400">
                  ⚠️ Make sure to save the backup file safely. You'll need it along with your master key to restore your wallet.
                </p>
              </div>
            </div>

            {logoutMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                logoutMessage.includes('Error') 
                  ? 'bg-red-900/30 text-red-400 border border-red-700'
                  : logoutMessage.includes('successful')
                    ? 'bg-green-900/30 text-green-400 border border-green-700'
                    : 'bg-blue-900/30 text-blue-400 border border-blue-700'
              }`}>
                {logoutMessage}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={cancelLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoggingOut ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    Confirm Logout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
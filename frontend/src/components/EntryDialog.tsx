// src/components/EntryDialog.tsx
// import React, { useState, useRef, useEffect } from 'react';
// import { PrivateKey, PublicKey, Utils } from '@bsv/sdk';
// import { useWalletStore } from '../components/wallet2/store/WalletStore';
// src/components/EntryDialog.tsx
// src/components/EntryDialog.tsx
// src/components/EntryDialog.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface EntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EntryDialog: React.FC<EntryDialogProps> = ({ 
  isOpen, 
  onClose
}) => {
  const [formData, setFormData] = useState({ name: '', username: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.username) {
      // Store the data if needed
      localStorage.setItem('userData', JSON.stringify(formData));
      onClose();
      setFormData({ name: '', username: '' }); // Reset form
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen || !mounted) return null;

  // Create the dialog content
  const dialogContent = (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 999999 }}>
      <div 
        className="fixed inset-0 bg-black/80" 
        style={{ zIndex: 999998 }}
        onClick={handleCancel}
      ></div>
      <div 
        className="relative bg-zinc-900 rounded-lg p-6 w-full max-w-[425px] mx-4 border border-zinc-700"
        style={{ zIndex: 999999 }}
      >
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white mb-2">
            Edit profile
          </h2>
          <p className="text-sm text-gray-400">
            Make changes to your profile here. Click save when you're done.
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Pedro Duarte"
                required
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="@peduarte"
                required
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Use React Portal to render at the document body level
  return ReactDOM.createPortal(
    dialogContent,
    document.body
  );
};

export default EntryDialog;
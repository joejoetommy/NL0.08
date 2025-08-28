// save

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { TextareaForm } from "../../textarea";
//   import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

// Interface for Folder
interface Folder {
  id: number;
  name: string;
}

// Simulated SavePostToFolder Component
export const SavePostToFolder: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([
    { id: 1, name: "Project A" },
    { id: 2, name: "Project B" },
    { id: 3, name: "Project C" },
    { id: 4, name: "Project D" },
    { id: 5, name: "Project E" },
    { id: 6, name: "Project F" },
    { id: 7, name: "Project G" },
    { id: 8, name: "Project H" },
    { id: 9, name: "Project I" },
    { id: 10, name: "Project J" },
    { id: 11, name: "Project K" },
    { id: 12, name: "Project L" },
    { id: 13, name: "Project M" },
    { id: 14, name: "Project N" },
    { id: 15, name: "Project O" },
    { id: 16, name: "Project P" },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [inputError, setInputError] = useState('');

  const handleModalOpen = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setInputError('');
    setNewFolderName('');
  };

  const handleCreateFolder = () => {
    if (newFolderName.length < 1) {
      setInputError('1 Character minimum');
      return;
    }
    if (newFolderName.length > 10) {
      setInputError('10 character limit');
      return;
    }
    const newFolder = { id: folders.length + 1, name: newFolderName };
    setFolders([...folders, newFolder]);
    handleModalClose();
  };

  return (
    // <div className="p-4">
    //   <div className="flex justify-start mb-4">
    <div className="space-y-2">
      <div className="flex items-start space-x-2 pt-1">
        <div className="flex items-center border-b border-black px-4 py-2 cursor-pointer" onClick={handleModalOpen}>
          <Icon icon="mdi:folder-add" className="text-3xl" />
          <span className="text-sm ml-2">  Add new folder</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 overflow-auto max-h-60">
        {folders.map(folder => (
          <div key={folder.id} className="flex flex-col items-center">
            <Icon icon="ic:outline-folder" className="text-3xl" />
            <span className="text-sm">{folder.name}</span>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="border border-gray-300 p-2 w-full mt-2"
              placeholder="Folder Name"
            />
            {inputError && <p className="text-red-500 text-xs mt-1">{inputError}</p>}
            <div className="flex justify-end space-x-2 mt-4">
              <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={handleModalClose}>Cancel</button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={handleCreateFolder}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// DrawerSave Component
const DrawerSave: React.FC = () => {
  const [placeholder, setPlaceholder] = useState("Add comment here ...");

  const handleClearPlaceholder = () => {
    setPlaceholder("");
  };

  const savePostToFolder = (folderId: string) => {
    // Example save function to call an API
    console.log(`Post saved to folder ${folderId}`);
    toast.notify(`Post saved to folder with ID: ${folderId}`);
  };

  return (
    <div className="w-full mx-auto">
      <h1 className="text-2xl font-bold mb-4">Save Post</h1>
      <SavePostToFolder savePost={savePostToFolder} />
      <div className="mt-4">
        <TextareaForm placeholder={placeholder} onClearPlaceholder={handleClearPlaceholder} />
      </div>
    </div>
  );
};

export { DrawerSave };


import React from 'react';
import { MapPin } from 'lucide-react';

interface PinEntryProps {
  // Currently placeholder - no active functionality
}

export const PinEntry: React.FC<PinEntryProps> = () => {
  return (
    <div className="p-8 text-center text-gray-500">
      <MapPin size={48} className="mx-auto mb-4 text-gray-600" />
      <h3 className="text-lg font-medium text-gray-400 mb-2">Pin-Lock Feature</h3>
      <p className="text-sm">Coming soon: Secure your vault with a PIN code</p>
    </div>
  );
};
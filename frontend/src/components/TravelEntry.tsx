import React from 'react';
import { Plane } from 'lucide-react';

interface TravelEntryProps {
  // Currently placeholder - no active functionality
}

export const TravelEntry: React.FC<TravelEntryProps> = () => {
  return (
    <div className="p-8 text-center text-gray-500">
      <Plane size={48} className="mx-auto mb-4 text-gray-600" />
      <h3 className="text-lg font-medium text-gray-400 mb-2">Travel-Lock Feature</h3>
      <p className="text-sm">Coming soon: Temporary travel security mode</p>
    </div>
  );
};
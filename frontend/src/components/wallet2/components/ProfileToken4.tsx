import React, { useState } from 'react';
import { CreateInscription } from '../inscriptions/components/CreateInscription';
import { ViewInscriptions } from '../inscriptions/components/ViewInscriptions';
import { useWalletStore } from '../store/WalletStore';

export const ProfileToken: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
  const { network } = useWalletStore();

  return (
    <div>
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
        <h2 className="text-xl font-semibold text-white">1Sat Ordinals Creator</h2>
        <p className="text-sm text-gray-300 mt-1">Create text, image, or profile inscriptions on BSV</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Create Inscription
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'view'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            View My Inscriptions
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'create' ? (
        <CreateInscription network={network} />
      ) : (
        <ViewInscriptions network={network} />
      )}
    </div>
  );
};
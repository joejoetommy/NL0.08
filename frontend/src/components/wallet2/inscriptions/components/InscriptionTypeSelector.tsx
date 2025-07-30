import React from 'react';

interface InscriptionTypeSelectorProps {
  inscriptionType: 'text' | 'image' | 'profile' | 'profile2';
  setInscriptionType: (type: 'text' | 'image' | 'profile' | 'profile2') => void;
}

export const InscriptionTypeSelector: React.FC<InscriptionTypeSelectorProps> = ({
  inscriptionType,
  setInscriptionType
}) => {
  const types: Array<{
    value: 'text' | 'image' | 'profile' | 'profile2';
    label: string;
    icon: string;
    description: string;
  }> = [
    {
      value: 'text',
      label: 'Text',
      icon: '📝',
      description: 'Plain text message'
    },
    {
      value: 'image',
      label: 'Image',
      icon: '🖼️',
      description: 'Upload an image'
    },
    {
      value: 'profile',
      label: 'Profile',
      icon: '👤',
      description: 'Create a profile'
    },
    {
      value: 'profile2',
      label: 'Profile2',
      icon: '🎨',
      description: 'Profile with background'
    }
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Inscription Type
      </label>
      <div className="flex gap-2">
        {types.map((type) => (
          <button
            key={type.value}
            onClick={() => setInscriptionType(type.value)}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              inscriptionType === type.value
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">{type.icon}</span>
              <span className="text-sm">{type.label}</span>
              <span className="text-xs opacity-75">{type.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
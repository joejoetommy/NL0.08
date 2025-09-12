import React from 'react';
import { InscriptionType } from './CreateInscription';

interface InscriptionTypeSelectorProps {
  inscriptionType: InscriptionType;
  setInscriptionType: (type: InscriptionType) => void;
}

export const InscriptionTypeSelector: React.FC<InscriptionTypeSelectorProps> = ({
  inscriptionType,
  setInscriptionType
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
      {/* Text Button */}
      <button
        onClick={() => setInscriptionType('text')}
        className={`p-3 rounded-lg text-center transition-all ${
          inscriptionType === 'text'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">📝</span>
          <span className="text-xs font-medium">Text</span>
        </div>
      </button>

      {/* Image Button */}
      <button
        onClick={() => setInscriptionType('image')}
        className={`p-3 rounded-lg text-center transition-all ${
          inscriptionType === 'image'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🖼️</span>
          <span className="text-xs font-medium">Image</span>
        </div>
      </button>

      {/* Profile Button */}
      <button
        onClick={() => setInscriptionType('profile')}
        className={`p-3 rounded-lg text-center transition-all ${
          inscriptionType === 'profile'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">👤</span>
          <span className="text-xs font-medium">Profile</span>
        </div>
      </button>

      {/* Profile 2 Button */}
      <button
        onClick={() => setInscriptionType('profile2')}
        className={`p-3 rounded-lg text-center transition-all ${
          inscriptionType === 'profile2'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🎨</span>
          <span className="text-xs font-medium">Profile+</span>
        </div>
      </button>

      {/* Large Profile Button */}
      <button
        onClick={() => setInscriptionType('largeProfile')}
        className={`p-3 rounded-lg text-center transition-all ${
          inscriptionType === 'largeProfile'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">📦</span>
          <span className="text-xs font-medium">BCAT</span>
          <span className="text-[10px] opacity-75">Large Files</span>
        </div>
      </button>

      {/* Large Profile 2 Button */}
      <button
        onClick={() => setInscriptionType('largeProfile2')}
        className={`p-3 rounded-lg text-center transition-all ${
          inscriptionType === 'largeProfile2'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🚀</span>
          <span className="text-xs font-medium">BCAT+</span>
          <span className="text-[10px] opacity-75">Manager</span>
        </div>
      </button>

      {/* Encrypted Property Button */}
      <button
        onClick={() => setInscriptionType('encryptedProperty')}
        className={`p-3 rounded-lg text-center transition-all ${
          inscriptionType === 'encryptedProperty'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🏠🔒</span>
          <span className="text-xs font-medium">Encrypted Property</span>
          <span className="text-[10px] opacity-75">BCAT + Encryption</span>
        </div>
      </button>
    </div>
  );
};

// import React from 'react';

// interface InscriptionTypeSelectorProps {
//   inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile';
//   setInscriptionType: (type: 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile') => void;
// }

// export const InscriptionTypeSelector: React.FC<InscriptionTypeSelectorProps> = ({
//   inscriptionType,
//   setInscriptionType
// }) => {
//   const types: Array<{
//     value: 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile';
//     label: string;
//     icon: string;
//     description: string;
//   }> = [
//     {
//       value: 'text',
//       label: 'Text',
//       icon: '📝',
//       description: 'Plain text message'
//     },
//     {
//       value: 'image',
//       label: 'Image',
//       icon: '🖼️',
//       description: 'Upload an image'
//     },
//     {
//       value: 'profile',
//       label: 'Profile',
//       icon: '👤',
//       description: 'Create a profile'
//     },
//     {
//       value: 'profile2',
//       label: 'Profile2',
//       icon: '🎨',
//       description: 'Profile with background'
//     },
//     {
//       value: 'largeProfile',
//       label: 'Large Profile',
//       icon: '📦',
//       description: 'Large files (10MB+)'
//     }
//   ];

//   return (
//     <div>
//       <label className="block text-sm font-medium text-gray-300 mb-2">
//         Inscription Type
//       </label>
//       <div className="flex gap-2 flex-wrap">
//         {types.map((type) => (
//           <button
//             key={type.value}
//             onClick={() => setInscriptionType(type.value)}
//             className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-medium transition-all ${
//               inscriptionType === type.value
//                 ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
//                 : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//             }`}
//           >
//             <div className="flex flex-col items-center gap-1">
//               <span className="text-xl">{type.icon}</span>
//               <span className="text-sm">{type.label}</span>
//               <span className="text-xs opacity-75">{type.description}</span>
//             </div>
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// };
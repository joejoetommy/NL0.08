import React from 'react';
import { InscriptionData } from './ViewInscriptions';

interface InscriptionFilterProps {
  inscriptionFilter: 'all' | 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile';
  setInscriptionFilter: (
    filter: 'all' | 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile'
  ) => void;
  inscriptions: InscriptionData[];
}

export const InscriptionFilter: React.FC<InscriptionFilterProps> = ({
  inscriptionFilter,
  setInscriptionFilter,
  inscriptions
}) => {
  const filterOptions: Array<{
    value: 'all' | 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile';
    label: string;
    icon: string;
  }> = [
    { value: 'all', label: 'All', icon: '📋' },
    { value: 'text', label: 'Text', icon: '📝' },
    { value: 'image', label: 'Image', icon: '🖼️' },
    { value: 'profile', label: 'Profile', icon: '👤' },
    { value: 'profile2', label: 'Profile2', icon: '🎨' },
    { value: 'largeProfile', label: 'Large Profile', icon: '📦' }
  ];

  const getCount = (
    type: 'all' | 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile'
  ) => {
    if (type === 'all') return inscriptions.length;
    return inscriptions.filter((i) => i.inscriptionType === type).length;
  };

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {filterOptions.map((option) => {
        const count = getCount(option.value);
        const isActive = inscriptionFilter === option.value;

        return (
          <button
            key={option.value}
            onClick={() => setInscriptionFilter(option.value)}
            disabled={count === 0 && option.value !== 'all'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              isActive
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : count === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            <span>{option.icon}</span>
            <span>{option.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                isActive ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// import React from 'react';
// import { InscriptionData } from '../ViewInscriptions';

// interface InscriptionFilterProps {
//   inscriptionFilter: 'all' | 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile';
//   setInscriptionFilter: (filter: 'all' | 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile') => void;
//   inscriptions: InscriptionData[];
// }

// export const InscriptionFilter: React.FC<InscriptionFilterProps> = ({
//   inscriptionFilter,
//   setInscriptionFilter,
//   inscriptions
// }) => {
//   const filterOptions: Array<{
//     value: 'all' | 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile';
//     label: string;
//     icon: string;
//   }> = [
//     { value: 'all', label: 'All', icon: '📋' },
//     { value: 'text', label: 'Text', icon: '📝' },
//     { value: 'image', label: 'Image', icon: '🖼️' },
//     { value: 'profile', label: 'Profile', icon: '👤' },
//     { value: 'profile2', label: 'Profile2', icon: '🎨' },
//     { value: 'largeProfile', label: 'Large Profile', icon: '📦' }
//   ];

//   const getCount = (type: 'all' | 'text' | 'image' | 'profile' | 'profile2') => {
//     if (type === 'all') return inscriptions.length;
//     return inscriptions.filter(i => i.inscriptionType === type).length;
//   };

//   return (
//     <div className="flex gap-2 mb-4 flex-wrap">
//       {filterOptions.map((option) => {
//         const count = getCount(option.value);
//         const isActive = inscriptionFilter === option.value;
        
//         return (
//           <button
//             key={option.value}
//             onClick={() => setInscriptionFilter(option.value)}
//             disabled={count === 0 && option.value !== 'all'}
//             className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
//               isActive
//                 ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
//                 : count === 0
//                 ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
//                 : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//             }`}
//           >
//             <span>{option.icon}</span>
//             <span>{option.label}</span>
//             <span className={`px-1.5 py-0.5 rounded text-xs ${
//               isActive ? 'bg-purple-600' : 'bg-gray-700'
//             }`}>
//               {count}
//             </span>
//           </button>
//         );
//       })}
//     </div>
//   );
// };
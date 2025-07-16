// This would be profile number 6 when added
// profiledata.ts - Updated data management file
import { profileData as exampleProfiles } from './data';

// Constant xpub
export const xpub = "02f31c1bf421e450a248d01856986f1a781c7e02ff9a8c4d4797b7db4f64384b50";

// Profile data interface matching your components
export interface ProfileData {
  backgroundImage: string;
  profileImage: string;
  Profile: {
    username: string;
    title: string;
    mision: string; // keeping your spelling
  };
  xpub?: string;
}

// Extended profile data with number
export interface NumberedProfileData extends ProfileData {
  number: number;
}

// Storage key for localStorage (in real app, use a database)
const PROFILE_STORAGE_KEY = 'userProfiles';
const CURRENT_PROFILE_KEY = 'currentProfileNumber';

// In-memory storage for demo (replace with actual storage in production)
let profilesCache: NumberedProfileData[] | null = null;
let currentProfileCache: number | null = null;

// Initialize profiles if not exists
const initializeProfiles = (): NumberedProfileData[] => {
  if (profilesCache) return profilesCache;
  
  // For demo, initialize with example profiles
  const initialProfiles: NumberedProfileData[] = exampleProfiles.map(profile => ({
    number: profile.number,
    backgroundImage: profile.backgroundImage,
    profileImage: profile.profileImage,
    Profile: {
      username: profile.username,
      title: profile.title,
      mision: profile.mission // mapping mission to mision
    },
    xpub: xpub
  }));
  
  profilesCache = initialProfiles;
  return initialProfiles;
};

// Get all profiles
export const getAllProfiles = (): NumberedProfileData[] => {
  return initializeProfiles();
};

// Get current profile number
export const getCurrentProfileNumber = (): number => {
  if (currentProfileCache !== null) return currentProfileCache;
  currentProfileCache = 1;
  return currentProfileCache;
};

// Set current profile number
export const setCurrentProfileNumber = (number: number): void => {
  currentProfileCache = number;
};

// Get current profile data
export const getProfileData = (): ProfileData => {
  const profiles = getAllProfiles();
  const currentNumber = getCurrentProfileNumber();
  const profile = profiles.find(p => p.number === currentNumber);
  
  if (!profile) {
    // Return first profile or default if not found
    return profiles[0] || {
      backgroundImage: '#FF6B6B',
      profileImage: '#4ECDC4',
      Profile: {
        username: 'DefaultUser',
        title: 'Default Title',
        mision: 'Default mission'
      },
      xpub: xpub
    };
  }
  
  // Return without the number field to match ProfileData interface
  const { number, ...profileWithoutNumber } = profile;
  return profileWithoutNumber;
};

// Update profile data (updates existing or creates new)
export const updateProfileData = (data: ProfileData): number => {
  const profiles = getAllProfiles();
  const currentNumber = getCurrentProfileNumber();
  
  // Find if we're updating an existing profile
  const existingIndex = profiles.findIndex(p => p.number === currentNumber);
  
  if (existingIndex !== -1) {
    // Update existing profile
    profiles[existingIndex] = {
      ...data,
      number: currentNumber,
      xpub: xpub
    };
  } else {
    // Create new profile with next number
    const nextNumber = Math.max(...profiles.map(p => p.number), 0) + 1;
    profiles.push({
      ...data,
      number: nextNumber,
      xpub: xpub
    });
    setCurrentProfileNumber(nextNumber);
    profilesCache = profiles;
    return nextNumber;
  }
  
  profilesCache = profiles;
  return currentNumber;
};

// Create a completely new profile (always creates new, never updates)
export const createNewProfile = (data: ProfileData): number => {
  const profiles = getAllProfiles();
  const nextNumber = Math.max(...profiles.map(p => p.number), 0) + 1;
  
  profiles.push({
    ...data,
    number: nextNumber,
    xpub: xpub
  });
  
  setCurrentProfileNumber(nextNumber);
  profilesCache = profiles;
  return nextNumber;
};

// Switch to a different profile
export const switchToProfile = (number: number): boolean => {
  const profiles = getAllProfiles();
  const profile = profiles.find(p => p.number === number);
  
  if (profile) {
    setCurrentProfileNumber(number);
    return true;
  }
  return false;
};

// Delete a profile
export const deleteProfile = (number: number): boolean => {
  const profiles = getAllProfiles();
  const filteredProfiles = profiles.filter(p => p.number !== number);
  
  if (filteredProfiles.length < profiles.length) {
    profilesCache = filteredProfiles;
    
    // If we deleted the current profile, switch to another
    if (getCurrentProfileNumber() === number && filteredProfiles.length > 0) {
      setCurrentProfileNumber(filteredProfiles[0].number);
    }
    
    return true;
  }
  return false;
};

// Get profile by number
export const getProfileByNumber = (number: number): NumberedProfileData | null => {
  const profiles = getAllProfiles();
  return profiles.find(p => p.number === number) || null;
};




































// // profiledata.ts - Updated data management file
// import { profileData as exampleProfiles } from './data';

// // Constant xpub
// export const xpub = "02f31c1bf421e450a248d01856986f1a781c7e02ff9a8c4d4797b7db4f64384b50";

// // Profile data interface matching your components
// export interface ProfileData {
//   backgroundImage: string;
//   profileImage: string;
//   Profile: {
//     username: string;
//     title: string;
//     mision: string; // keeping your spelling
//   };
//   xpub?: string;
// }

// // Extended profile data with number
// export interface NumberedProfileData extends ProfileData {
//   number: number;
// }

// // Storage key for localStorage
// const PROFILE_STORAGE_KEY = 'userProfiles';
// const CURRENT_PROFILE_KEY = 'currentProfileNumber';

// // Initialize profiles in localStorage if not exists
// const initializeProfiles = (): NumberedProfileData[] => {
//   const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
//   if (!stored) {
//     // Convert example profiles to the expected format
//     const initialProfiles: NumberedProfileData[] = exampleProfiles.map(profile => ({
//       number: profile.number,
//       backgroundImage: profile.backgroundImage,
//       profileImage: profile.profileImage,
//       Profile: {
//         username: profile.username,
//         title: profile.title,
//         mision: profile.mission // mapping mission to mision
//       },
//       xpub: xpub
//     }));
//     localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(initialProfiles));
//     return initialProfiles;
//   }
//   return JSON.parse(stored);
// };

// // Get all profiles
// export const getAllProfiles = (): NumberedProfileData[] => {
//   return initializeProfiles();
// };

// // Get current profile number
// export const getCurrentProfileNumber = (): number => {
//   const stored = localStorage.getItem(CURRENT_PROFILE_KEY);
//   return stored ? parseInt(stored, 10) : 1;
// };

// // Set current profile number
// export const setCurrentProfileNumber = (number: number): void => {
//   localStorage.setItem(CURRENT_PROFILE_KEY, number.toString());
// };

// // Get current profile data
// export const getProfileData = (): ProfileData => {
//   const profiles = getAllProfiles();
//   const currentNumber = getCurrentProfileNumber();
//   const profile = profiles.find(p => p.number === currentNumber);
  
//   if (!profile) {
//     // Return first profile or default if not found
//     return profiles[0] || {
//       backgroundImage: '#FF6B6B',
//       profileImage: '#4ECDC4',
//       Profile: {
//         username: 'DefaultUser',
//         title: 'Default Title',
//         mision: 'Default mission'
//       },
//       xpub: xpub
//     };
//   }
  
//   // Return without the number field to match ProfileData interface
//   const { number, ...profileWithoutNumber } = profile;
//   return profileWithoutNumber;
// };

// // Update profile data (updates existing or creates new)
// export const updateProfileData = (data: ProfileData): number => {
//   const profiles = getAllProfiles();
//   const currentNumber = getCurrentProfileNumber();
  
//   // Find if we're updating an existing profile
//   const existingIndex = profiles.findIndex(p => p.number === currentNumber);
  
//   if (existingIndex !== -1) {
//     // Update existing profile
//     profiles[existingIndex] = {
//       ...data,
//       number: currentNumber,
//       xpub: xpub
//     };
//   } else {
//     // Create new profile with next number
//     const nextNumber = Math.max(...profiles.map(p => p.number), 0) + 1;
//     profiles.push({
//       ...data,
//       number: nextNumber,
//       xpub: xpub
//     });
//     setCurrentProfileNumber(nextNumber);
//     localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
//     return nextNumber;
//   }
  
//   localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
//   return currentNumber;
// };

// // Create a completely new profile (always creates new, never updates)
// export const createNewProfile = (data: ProfileData): number => {
//   const profiles = getAllProfiles();
//   const nextNumber = Math.max(...profiles.map(p => p.number), 0) + 1;
  
//   profiles.push({
//     ...data,
//     number: nextNumber,
//     xpub: xpub
//   });
  
//   setCurrentProfileNumber(nextNumber);
//   localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
//   return nextNumber;
// };

// // Switch to a different profile
// export const switchToProfile = (number: number): boolean => {
//   const profiles = getAllProfiles();
//   const profile = profiles.find(p => p.number === number);
  
//   if (profile) {
//     setCurrentProfileNumber(number);
//     return true;
//   }
//   return false;
// };

// // Delete a profile
// export const deleteProfile = (number: number): boolean => {
//   const profiles = getAllProfiles();
//   const filteredProfiles = profiles.filter(p => p.number !== number);
  
//   if (filteredProfiles.length < profiles.length) {
//     localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(filteredProfiles));
    
//     // If we deleted the current profile, switch to another
//     if (getCurrentProfileNumber() === number && filteredProfiles.length > 0) {
//       setCurrentProfileNumber(filteredProfiles[0].number);
//     }
    
//     return true;
//   }
//   return false;
// };

// // Get profile by number
// export const getProfileByNumber = (number: number): NumberedProfileData | null => {
//   const profiles = getAllProfiles();
//   return profiles.find(p => p.number === number) || null;
// };






























































// export interface ProfileData {
//   profileVisibility: boolean;
//   followerAccess: boolean;
//   backgroundImage: string;
//   profileImage: string;
//   xpub: number;
//   Profile: {
//     username: string;
//     title: string;
//     mision: string;
//    // bio: string;
//   };
//   // counters: {
//   //   network: number;
//   //   followers: number;
//   //   following: number;
//   //   chain: number;
//   // };
//   // cv: string | null;
//   // mapPosition: [number, number];
//   // carouselItems1: {
//   //   icon: string;
//   //   title: string;
//   //   description: string;
//   //   id: number;
//   // }[];
//   // carouselItems2: {
//   //   icon: string;
//   //   title: string;
//   //   description: string;
//   //   id: number;
//   // }[];
// }

// // Default profile data
// const defaultProfileData: ProfileData = {
//   profileVisibility: false,
//   followerAccess: false,
//   backgroundImage: 'https://via.placeholder.com/600x400/00FF00/FFFFFF?Text=Background',
//   profileImage: 'https://via.placeholder.com/150/0000FF/808080?Text=UserProfile',
//   xpub: 1234567890,
//   Profile: {
//     username: 'JohnDoe',
//     title: 'JohnDoe_Painters_west_cork',
//     mision: 'This is John Does Mission statement, telling his mission within 250 characters',
//    // bio: 'This is John Does Bio section where he can eleabrate further on a short biographysection to help his customers gange further with him on a personal level, within 500 characters',
//   },
// //   counters: {
// //     network: 91,
// //     followers: 972,
// //     following: 744,
// //     chain: 440,
// //   },
// //   cv: null,
// //   mapPosition: [51.505, -0.09],
// //   carouselItems1: [
// //     { title: "Interior Painting", description: "Deliver smooth, high-quality finishes for interior walls and ceilings.", icon: "", id: 1 },
// //     { title: "Exterior Painting", description: "Protect and beautify building exteriors with durable coatings.", icon: "", id: 2 },
// //     { title: "Surface Preparation", description: "Prepare surfaces by cleaning, sanding, and priming to ensure longevity.", icon: "", id: 3 },
// //     { title: "Color Consultation", description: "Assist clients in selecting ideal color palettes and finishes.", icon: "", id: 4 },
// //     { title: "Finishing Touches", description: "Apply detailed finishes including trim, molding, and touch-ups.", icon: "", id: 5 },
// //   ],
// //   carouselItems2: [
// //     { title: "Project Estimation", description: "Provide accurate cost and time estimates for painting projects.", icon: "", id: 6 },
// //     { title: "Team Coordination", description: "Supervise painting crews to ensure quality and efficiency.", icon: "", id: 7 },
// //     { title: "Quality Assurance", description: "Inspect work to guarantee standards are met and exceeded.", icon: "", id: 8 },
// //     { title: "Client Communication", description: "Keep clients informed and satisfied throughout the project.", icon: "", id: 9 },
// //     { title: "Safety Compliance", description: "Adhere to safety standards and ensure a hazard-free work site.", icon: "", id: 10 },
// //   ],
//  };

// export const getProfileData = (): ProfileData => {
//   // Check if we're in a browser environment
//   if (typeof window !== 'undefined' && window.localStorage) {
//     try {
//       const data = localStorage.getItem('profileData');
//       if (data) {
//         return JSON.parse(data);
//       }
//     } catch (error) {
//       console.error('Error reading from localStorage:', error);
//     }
//   }
  
//   return defaultProfileData;
// };

// export const updateProfileData = (data: ProfileData): void => {
//   // Check if we're in a browser environment
//   if (typeof window !== 'undefined' && window.localStorage) {
//     try {
//       localStorage.setItem('profileData', JSON.stringify(data));
//       console.log('Profile data updated:', data);
//     } catch (error) {
//       console.error('Error writing to localStorage:', error);
//     }
//   } else {
//     console.log('localStorage not available, profile data update skipped:', data);
//   }
// };
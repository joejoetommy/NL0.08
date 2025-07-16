// Constant xpub
export const xpub = "02f31c1bf421e450a248d01856986f1a781c7e02ff9a8c4d4797b7db4f64384b50";

// Profile data type definition
export interface ProfileData {
  number: number;
  backgroundImage: string;
  profileImage: string;
  username: string; // max 20 characters
  title: string; // max 40 characters
  mission: string; // max 250 characters
  addedDate: string;
}

// Example profile data
export const profileData: ProfileData[] = [
  {
    number: 1,
    backgroundImage: "#FF6B6B", // Coral red
    profileImage: "#4ECDC4", // Turquoise
    username: "CryptoExplorer",
    title: "Blockchain Innovation PioneerInno",
    mission: "Dedicated to exploring cutting-edge blockchain technologies and fostering decentralized solutions for a more transparent future. Building bridges between traditional finance and the crypto ecosystem.",
    addedDate: "2023-06-12T08:00:00Z"
  },
  {
    number: 2,
    backgroundImage: "#45B7D1", // Sky blue
    profileImage: "#96CEB4", // Sage green
    username: "DigitalNomad2025",
    title: "Remote Work Advocate & Tech Enthusiast",
    mission: "Empowering individuals to embrace location independence through technology. Sharing insights on remote work best practices, digital tools, and creating sustainable work-life balance in the modern era.",
    addedDate: "2023-06-12T08:00:00Z"
  },
  {
    number: 3,
    backgroundImage: "#DDA0DD", // Plum
    profileImage: "#FFD93D", // Golden yellow
    username: "DataScientist_AI",
    title: "Machine Learning Researcher",
    mission: "Advancing the frontiers of artificial intelligence through ethical research and practical applications. Committed to making AI accessible and beneficial for all while ensuring responsible development.",
    addedDate: "2023-06-12T08:00:00Z"
  },
  {
    number: 4,
    backgroundImage: "#98D8C8", // Mint green
    profileImage: "#F7DC6F", // Soft yellow
    username: "EcoTechWarrior",
    title: "Sustainable Technology Innovator",
    mission: "Merging environmental consciousness with technological advancement. Creating solutions that protect our planet while driving progress. Every line of code can make a difference in building a greener tomorrow.",
    addedDate: "2023-06-12T08:00:00Z"
  },
  {
    number: 5,
    backgroundImage: "#FF8C94", // Light coral
    profileImage: "#91A8D0", // Periwinkle blue
    username: "Web3Designer",
    title: "UX/UI Designer for Decentralized Apps",
    mission: "Crafting intuitive and beautiful interfaces for the decentralized web. Bridging the gap between complex blockchain technology and user-friendly experiences that anyone can navigate with confidence.",
    addedDate: "2023-06-12T08:00:00Z"
  },
  {
    number: 6,
    backgroundImage: "#FF6B6B", // Coral red
    profileImage: "#4ECDC4", // Turquoise
    username: "CryptoExplorer",
    title: "Blockchain Innovation PioneerInno",
    mission: "Dedicated to exploring cutting-edge blockchain technologies and fostering decentralized solutions for a more transparent future. Building bridges between traditional finance and the crypto ecosystem.",
    addedDate: "2023-06-12T08:00:00Z"
  },
  {
    number: 7,
    backgroundImage: "#45B7D1", // Sky blue
    profileImage: "#96CEB4", // Sage green
    username: "DigitalNomad2025",
    title: "Remote Work Advocate & Tech Enthusiast",
    mission: "Empowering individuals to embrace location independence through technology. Sharing insights on remote work best practices, digital tools, and creating sustainable work-life balance in the modern era.",
    addedDate: "2023-06-12T08:00:00Z"
  },
  {
    number: 8,
    backgroundImage: "#DDA0DD", // Plum
    profileImage: "#FFD93D", // Golden yellow
    username: "DataScientist_AI",
    title: "Machine Learning Researcher",
    mission: "Advancing the frontiers of artificial intelligence through ethical research and practical applications. Committed to making AI accessible and beneficial for all while ensuring responsible development.",
    addedDate: "2023-06-12T08:00:00Z"
  },
  {
    number: 9,
    backgroundImage: "#98D8C8", // Mint green
    profileImage: "#F7DC6F", // Soft yellow
    username: "EcoTechWarrior",
    title: "Sustainable Technology Innovator",
    mission: "Merging environmental consciousness with technological advancement. Creating solutions that protect our planet while driving progress. Every line of code can make a difference in building a greener tomorrow.",
    addedDate: "2023-06-12T08:00:00Z"
  },
  {
    number: 10,
    backgroundImage: "#FF8C94", // Light coral
    profileImage: "#91A8D0", // Periwinkle blue
    username: "Web3Designer",
    title: "UX/UI Designer for Decentralized Apps",
    mission: "Crafting intuitive and beautiful interfaces for the decentralized web. Bridging the gap between complex blockchain technology and user-friendly experiences that anyone can navigate with confidence.",
    addedDate: "2023-06-12T08:00:00Z"
  }
];

// Function to add new profile data
export function addProfileData(newProfile: Omit<ProfileData, 'number'>): ProfileData {
  const nextNumber = profileData.length + 1;
  const profileWithNumber = {
    ...newProfile,
    number: nextNumber
  };
  profileData.push(profileWithNumber);
  return profileWithNumber;
}

// Validation functions
export function validateUsername(username: string): boolean {
  return username.length <= 20;
}

export function validateTitle(title: string): boolean {
  return title.length <= 40;
}

export function validateMission(mission: string): boolean {
  return mission.length <= 250;
}



// Example of how to add a new profile
// const exampleNewProfile = {
//   backgroundImage: "#B19CD9", // Lavender
//   profileImage: "#98FB98", // Pale green
//   username: "FutureBuilder",
//   title: "Innovation Strategist",
//   mission: "Connecting visionaries with resources to build tomorrow's solutions today. Focused on emerging technologies and their potential to transform industries."
// };



















































// Constant xpub
// export const xpub = "02f31c1bf421e450a248d01856986f1a781c7e02ff9a8c4d4797b7db4f64384b50";

// // Profile data type definition
// export interface ProfileData {
//   number: number;
//   backgroundImage: string;
//   profileImage: string;
//   username: string; // max 25 characters
//   title: string; // max 50 characters
//   mission: string; // max 250 characters
// }

// // Example profile data
// export const profileData: ProfileData[] = [
//   {
//     number: 1,
//     backgroundImage: "#FF6B6B", // Coral red
//     profileImage: "#4ECDC4", // Turquoise
//     username: "CryptoExplorer",
//     title: "Blockchain Innovation Pioneer",
//     mission: "Dedicated to exploring cutting-edge blockchain technologies and fostering decentralized solutions for a more transparent future. Building bridges between traditional finance and the crypto ecosystem."
//   },
//   {
//     number: 2,
//     backgroundImage: "#45B7D1", // Sky blue
//     profileImage: "#96CEB4", // Sage green
//     username: "DigitalNomad2025",
//     title: "Remote Work Advocate & Tech Enthusiast",
//     mission: "Empowering individuals to embrace location independence through technology. Sharing insights on remote work best practices, digital tools, and creating sustainable work-life balance in the modern era."
//   },
//   {
//     number: 3,
//     backgroundImage: "#DDA0DD", // Plum
//     profileImage: "#FFD93D", // Golden yellow
//     username: "DataScientist_AI",
//     title: "Machine Learning Researcher",
//     mission: "Advancing the frontiers of artificial intelligence through ethical research and practical applications. Committed to making AI accessible and beneficial for all while ensuring responsible development."
//   },
//   {
//     number: 4,
//     backgroundImage: "#98D8C8", // Mint green
//     profileImage: "#F7DC6F", // Soft yellow
//     username: "EcoTechWarrior",
//     title: "Sustainable Technology Innovator",
//     mission: "Merging environmental consciousness with technological advancement. Creating solutions that protect our planet while driving progress. Every line of code can make a difference in building a greener tomorrow."
//   },
//   {
//     number: 5,
//     backgroundImage: "#FF8C94", // Light coral
//     profileImage: "#91A8D0", // Periwinkle blue
//     username: "Web3Designer",
//     title: "UX/UI Designer for Decentralized Apps",
//     mission: "Crafting intuitive and beautiful interfaces for the decentralized web. Bridging the gap between complex blockchain technology and user-friendly experiences that anyone can navigate with confidence."
//   }
// ];

// // Function to add new profile data
// export function addProfileData(newProfile: Omit<ProfileData, 'number'>): ProfileData {
//   const nextNumber = profileData.length + 1;
//   const profileWithNumber = {
//     ...newProfile,
//     number: nextNumber
//   };
//   profileData.push(profileWithNumber);
//   return profileWithNumber;
// }

// // Validation functions
// export function validateUsername(username: string): boolean {
//   return username.length <= 25;
// }

// export function validateTitle(title: string): boolean {
//   return title.length <= 50;
// }

// export function validateMission(mission: string): boolean {
//   return mission.length <= 250;
// }

// // Example of how to add a new profile
// const exampleNewProfile = {
//   backgroundImage: "#B19CD9", // Lavender
//   profileImage: "#98FB98", // Pale green
//   username: "FutureBuilder",
//   title: "Innovation Strategist",
//   mission: "Connecting visionaries with resources to build tomorrow's solutions today. Focused on emerging technologies and their potential to transform industries."
// };

// // This would be profile number 6 when added
// // const newProfile = addProfileData(exampleNewProfile);
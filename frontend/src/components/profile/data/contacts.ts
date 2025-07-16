// contacts.ts - Contacts data structured with xpub as the primary key

// Profile data that can be updated
export interface ContactProfile {
  backgroundImage: string;
  profileImage: string;
  username: string;
  title: string;
  mision: string; // keeping your spelling
  lastUpdated: string;
}

// Contact entry with xpub as the identifier
export interface Contact {
  xpub: string; // Primary key - never changes
  profile: ContactProfile;
  addedDate: string;
}

// Store contacts in a Map for efficient lookup by xpub
export const contactsMap = new Map<string, ContactProfile & { addedDate: string }>();

// Initialize with example data
const initializeContacts = () => {
  const contacts: Array<{ xpub: string; profile: ContactProfile; addedDate: string }> = [
    {
      xpub: "03a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      profile: {
        backgroundImage: "#2563EB",
        profileImage: "#10B981",
        username: "TechVentures",
        title: "Venture Capital Partner",
        mision: "Investing in tomorrow's blockchain unicorns. Focused on DeFi, NFT infrastructure, and Web3 social platforms. Building a decentralized future through strategic partnerships and mentorship.",
        lastUpdated: "2024-01-15T10:30:00Z"
      },
      addedDate: "2023-06-12T08:00:00Z"
    },
    {
      xpub: "02f7e8d9c0a1b2345678901234567890abcdef1234567890abcdef1234567890ab",
      profile: {
        backgroundImage: "#7C3AED",
        profileImage: "#F59E0B",
        username: "CryptoSage",
        title: "DeFi Protocol Architect",
        mision: "Designing secure and efficient decentralized financial protocols. Specializing in yield optimization, liquidity provision strategies, and cross-chain interoperability solutions.",
        lastUpdated: "2024-02-20T14:15:00Z"
      },
      addedDate: "2023-07-23T09:30:00Z"
    },
    {
      xpub: "04b5c6d7e8f90123456789012345678901234567890abcdef1234567890abcdef12",
      profile: {
        backgroundImage: "#DC2626",
        profileImage: "#3B82F6",
        username: "NodeRunner24",
        title: "Infrastructure Engineer",
        mision: "Running validator nodes across multiple blockchain networks. Committed to network security and decentralization. Providing reliable staking services and technical consulting.",
        lastUpdated: "2024-03-01T16:45:00Z"
      },
      addedDate: "2023-08-05T11:00:00Z"
    },
    {
      xpub: "03e9f0a1b2c3d4567890123456789012345678901234567890abcdef1234567890",
      profile: {
        backgroundImage: "#059669",
        profileImage: "#8B5CF6",
        username: "SmartConDev",
        title: "Solidity Developer",
        mision: "Creating secure smart contracts for innovative DeFi projects. Expertise in gas optimization, security audits, and upgradeable contract patterns. Open source contributor.",
        lastUpdated: "2024-01-28T12:20:00Z"
      },
      addedDate: "2023-09-14T13:45:00Z"
    },
    {
      xpub: "02a3b4c5d6e7f89012345678901234567890123456789012345678901234567890",
      profile: {
        backgroundImage: "#F97316",
        profileImage: "#14B8A6",
        username: "DAOBuilder",
        title: "Governance Specialist",
        mision: "Helping communities build effective decentralized autonomous organizations. Expert in tokenomics, voting mechanisms, and treasury management. Advocate for fair governance.",
        lastUpdated: "2024-02-10T15:30:00Z"
      },
      addedDate: "2023-10-02T10:15:00Z"
    },
    {
      xpub: "05c7d8e9f0a1b234567890123456789012345678901234567890abcdef12345678",
      profile: {
        backgroundImage: "#84CC16",
        profileImage: "#EC4899",
        username: "MetaArchitect",
        title: "Metaverse Developer",
        mision: "Building immersive virtual worlds on blockchain. Specializing in NFT integration, virtual real estate, and cross-platform experiences. Pushing boundaries of digital ownership.",
        lastUpdated: "2024-03-05T09:00:00Z"
      },
      addedDate: "2023-11-11T14:30:00Z"
    },
    {
      xpub: "04f1a2b3c4d5e678901234567890123456789012345678901234567890abcdef12",
      profile: {
        backgroundImage: "#6366F1",
        profileImage: "#F43F5E",
        username: "ChainAnalyst",
        title: "Blockchain Data Scientist",
        mision: "Uncovering insights from on-chain data. Specializing in DeFi analytics, whale tracking, and market sentiment analysis. Making blockchain data accessible and actionable.",
        lastUpdated: "2024-02-25T11:45:00Z"
      },
      addedDate: "2023-12-20T16:00:00Z"
    },
    {
      xpub: "03b8c9d0e1f2345678901234567890123456789012345678901234567890123456",
      profile: {
        backgroundImage: "#0EA5E9",
        profileImage: "#A855F7",
        username: "L2Explorer",
        title: "Layer 2 Researcher",
        mision: "Exploring scaling solutions for Ethereum and beyond. Deep expertise in rollups, sidechains, and state channels. Contributing to a scalable blockchain ecosystem.",
        lastUpdated: "2024-01-05T13:20:00Z"
      },
      addedDate: "2024-01-02T08:30:00Z"
    },
    {
      xpub: "02d4e5f6789012345678901234567890123456789012345678901234567890abcd",
      profile: {
        backgroundImage: "#EF4444",
        profileImage: "#22D3EE",
        username: "NFTCurator",
        title: "Digital Art Collector",
        mision: "Discovering and promoting emerging digital artists. Building curated NFT collections that tell stories. Bridging traditional art world with blockchain technology.",
        lastUpdated: "2024-03-10T17:15:00Z"
      },
      addedDate: "2023-05-18T12:00:00Z"
    },
    {
      xpub: "05a2b3c4d5e6f78901234567890123456789012345678901234567890123456789",
      profile: {
        backgroundImage: "#A78BFA",
        profileImage: "#34D399",
        username: "PrivacyAdvocate",
        title: "Zero-Knowledge Developer",
        mision: "Building privacy-preserving blockchain applications. Expert in zk-SNARKs, zk-STARKs, and confidential transactions. Privacy is a fundamental human right in the digital age.",
        lastUpdated: "2024-02-15T10:00:00Z"
      },
      addedDate: "2023-09-25T15:45:00Z"
    },
    {
      xpub: "03f8901234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
      profile: {
        backgroundImage: "#FBBF24",
        profileImage: "#7C3AED",
        username: "YieldFarmer",
        title: "DeFi Strategist",
        mision: "Maximizing returns through innovative yield farming strategies. Expert in liquidity provision, impermanent loss mitigation, and cross-protocol optimization.",
        lastUpdated: "2024-03-08T14:30:00Z"
      },
      addedDate: "2023-11-30T11:15:00Z"
    },
    {
      xpub: "04c5d6e7f890123456789012345678901234567890abcdef1234567890abcdef12",
      profile: {
        backgroundImage: "#10B981",
        profileImage: "#F59E0B",
        username: "GameFiPioneer",
        title: "Blockchain Game Designer",
        mision: "Creating engaging play-to-earn experiences. Balancing fun gameplay with sustainable token economics. Building the future of gaming on blockchain technology.",
        lastUpdated: "2024-01-22T16:45:00Z"
      },
      addedDate: "2023-08-17T09:30:00Z"
    },
    {
      xpub: "02e7f8901234567890123456789012345678901234567890abcdef1234567890ab",
      profile: {
        backgroundImage: "#E11D48",
        profileImage: "#0891B2",
        username: "CrossChainDev",
        title: "Interoperability Engineer",
        mision: "Building bridges between blockchain ecosystems. Specializing in cross-chain messaging, atomic swaps, and wrapped asset protocols. One interconnected blockchain world.",
        lastUpdated: "2024-02-28T12:15:00Z"
      },
      addedDate: "2023-10-10T13:00:00Z"
    },
    {
      xpub: "05b3c4d5e6f789012345678901234567890abcdef1234567890abcdef123456789",
      profile: {
        backgroundImage: "#9333EA",
        profileImage: "#065F46",
        username: "TokenEconomist",
        title: "Tokenomics Designer",
        mision: "Crafting sustainable token economies for Web3 projects. Expert in incentive design, token distribution, and economic modeling. Making tokens work for communities.",
        lastUpdated: "2024-03-02T15:00:00Z"
      },
      addedDate: "2023-12-05T10:45:00Z"
    },
    {
      xpub: "03a9012345678901234567890abcdef1234567890abcdef1234567890abcdef123",
      profile: {
        backgroundImage: "#0369A1",
        profileImage: "#DC2626",
        username: "SecurityAuditor",
        title: "Smart Contract Auditor",
        mision: "Protecting DeFi protocols through comprehensive security audits. Specialized in finding vulnerabilities before attackers do. Making blockchain safer for everyone.",
        lastUpdated: "2024-01-18T11:30:00Z"
      },
      addedDate: "2023-07-08T14:15:00Z"
    },
    {
      xpub: "04f2345678901234567890abcdef1234567890abcdef1234567890abcdef123456",
      profile: {
        backgroundImage: "#047857",
        profileImage: "#7C2D12",
        username: "SocialTokens",
        title: "Creator Economy Builder",
        mision: "Empowering creators with blockchain-based monetization tools. Building social tokens, NFT memberships, and decentralized content platforms. Creators first, always.",
        lastUpdated: "2024-02-22T13:45:00Z"
      },
      addedDate: "2023-11-18T16:30:00Z"
    },
    {
      xpub: "02d890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
      profile: {
        backgroundImage: "#B91C1C",
        profileImage: "#1E40AF",
        username: "MEVSearcher",
        title: "MEV Researcher",
        mision: "Exploring Maximum Extractable Value in blockchain systems. Developing fair ordering solutions and MEV redistribution mechanisms. Making blockchain more equitable.",
        lastUpdated: "2024-03-12T09:15:00Z"
      },
      addedDate: "2024-01-20T12:00:00Z"
    },
    {
      xpub: "05c4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
      profile: {
        backgroundImage: "#581C87",
        profileImage: "#16A34A",
        username: "ReFiBuilder",
        title: "Regenerative Finance Advocate",
        mision: "Using blockchain for environmental and social good. Building carbon credit systems, impact tokens, and sustainable DeFi protocols. Finance that heals the planet.",
        lastUpdated: "2024-02-05T14:20:00Z"
      },
      addedDate: "2023-09-03T08:45:00Z"
    },
    {
      xpub: "03e567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123",
      profile: {
        backgroundImage: "#EA580C",
        profileImage: "#0F766E",
        username: "StablecoinDev",
        title: "Stablecoin Protocol Engineer",
        mision: "Designing next-generation stablecoin mechanisms. Expert in algorithmic stability, collateral management, and peg maintenance. Stable money for unstable times.",
        lastUpdated: "2024-01-30T17:00:00Z"
      },
      addedDate: "2023-10-28T15:30:00Z"
    },
    {
      xpub: "04a890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
      profile: {
        backgroundImage: "#4338CA",
        profileImage: "#BE185D",
        username: "Web3Educator",
        title: "Blockchain Education Lead",
        mision: "Making blockchain technology accessible to everyone. Creating educational content, workshops, and mentorship programs. Knowledge is the key to mass adoption.",
        lastUpdated: "2024-03-07T10:45:00Z"
      },
      addedDate: "2023-06-25T11:00:00Z"
    }
  ];

  // Populate the Map
  contacts.forEach(({ xpub, profile, addedDate }) => {
    contactsMap.set(xpub, { ...profile, addedDate });
  });
};

// Initialize on module load
initializeContacts();

// Core functions using xpub as the key

// Get contact profile by xpub
export const getContactByXpub = (xpub: string): (ContactProfile & { addedDate: string }) | undefined => {
  return contactsMap.get(xpub);
};

// Update contact profile (xpub stays the same)
export const updateContactProfile = (xpub: string, profileUpdates: Partial<ContactProfile>): boolean => {
  const contact = contactsMap.get(xpub);
  if (contact) {
    contactsMap.set(xpub, {
      ...contact,
      ...profileUpdates,
      lastUpdated: new Date().toISOString()
    });
    return true;
  }
  return false;
};

// Add new contact
export const addNewContact = (xpub: string, profile: Omit<ContactProfile, 'lastUpdated'>): boolean => {
  if (contactsMap.has(xpub)) {
    return false; // Contact with this xpub already exists
  }
  
  contactsMap.set(xpub, {
    ...profile,
    lastUpdated: new Date().toISOString(),
    addedDate: new Date().toISOString()
  });
  return true;
};

// Remove contact by xpub
export const removeContactByXpub = (xpub: string): boolean => {
  return contactsMap.delete(xpub);
};

// Get all contacts as array
export const getAllContacts = (): Contact[] => {
  const contacts: Contact[] = [];
  contactsMap.forEach((profile, xpub) => {
    const { addedDate, ...profileData } = profile;
    contacts.push({
      xpub,
      profile: profileData,
      addedDate
    });
  });
  return contacts;
};

// Search contacts by username
export const searchContactsByUsername = (searchTerm: string): Contact[] => {
  const lowercaseSearch = searchTerm.toLowerCase();
  const results: Contact[] = [];
  
  contactsMap.forEach((profile, xpub) => {
    if (profile.username.toLowerCase().includes(lowercaseSearch)) {
      const { addedDate, ...profileData } = profile;
      results.push({
        xpub,
        profile: profileData,
        addedDate
      });
    }
  });
  
  return results;
};

// Check if contact exists
export const contactExists = (xpub: string): boolean => {
  return contactsMap.has(xpub);
};

// Get contact count
export const getContactCount = (): number => {
  return contactsMap.size;
};

// Batch update profiles (useful for sync operations)
export const batchUpdateProfiles = (updates: Array<{ xpub: string; profile: Partial<ContactProfile> }>): number => {
  let successCount = 0;
  const timestamp = new Date().toISOString();
  
  updates.forEach(({ xpub, profile }) => {
    const existing = contactsMap.get(xpub);
    if (existing) {
      contactsMap.set(xpub, {
        ...existing,
        ...profile,
        lastUpdated: timestamp
      });
      successCount++;
    }
  });
  
  return successCount;
};

// Export contacts data for backup
export const exportContactsData = (): string => {
  const data = getAllContacts();
  return JSON.stringify(data, null, 2);
};

// Import contacts data from backup
export const importContactsData = (jsonData: string): { success: number; failed: number } => {
  try {
    const contacts = JSON.parse(jsonData) as Contact[];
    let success = 0;
    let failed = 0;
    
    contacts.forEach((contact) => {
      if (contact.xpub && contact.profile) {
        contactsMap.set(contact.xpub, {
          ...contact.profile,
          addedDate: contact.addedDate || new Date().toISOString()
        });
        success++;
      } else {
        failed++;
      }
    });
    
    return { success, failed };
  } catch (error) {
    return { success: 0, failed: -1 }; // -1 indicates parse error
  }
};
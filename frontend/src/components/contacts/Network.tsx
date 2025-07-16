// import { getAllContacts, Contact } from '../profile/data/contacts';
//// Add Network Connection
// Network.tsx
// Network.tsx
import React, { useEffect, useState } from 'react';
import Post from './Post';
import { getAllContacts, Contact } from '../profile/data/contacts';
import { SortOption } from '../../pages/ExplorePage'; // Adjust path as needed

interface NetworkPageProps {
  searchTerm: string;
  sortBy: SortOption;
}

const NetworkPage: React.FC<NetworkPageProps> = ({ searchTerm, sortBy }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay for better UX
    const loadContacts = async () => {
      try {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const allContacts = getAllContacts();
        setContacts(allContacts);
        setLoading(false);
      } catch (err) {
        console.error('Error loading contacts:', err);
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  // Sort contacts based on selected option
  const sortContacts = (contactsList: Contact[]): Contact[] => {
    const sorted = [...contactsList];
    
    switch (sortBy) {
      case 'recent':
        // Sort by last updated date (most recent first)
        return sorted.sort((a, b) => 
          new Date(b.profile.lastUpdated).getTime() - new Date(a.profile.lastUpdated).getTime()
        );
      
      case 'alphabetical':
        // Sort by username alphabetically
        return sorted.sort((a, b) => 
          a.profile.username.toLowerCase().localeCompare(b.profile.username.toLowerCase())
        );
      
      case 'oldest':
        // Sort by added date (oldest first)
        return sorted.sort((a, b) => 
          new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime()
        );
      
      default:
        return sorted;
    }
  };

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.profile.username.toLowerCase().includes(searchLower) ||
      contact.profile.title.toLowerCase().includes(searchLower) ||
      contact.profile.mision.toLowerCase().includes(searchLower)
    );
  });

  // Apply sorting to filtered contacts
  const sortedAndFilteredContacts = sortContacts(filteredContacts);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
          <p className="text-gray-500 mb-4">Start building your network by adding contacts using their xpub</p>
          <button className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors">
            Add First Contact
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      {/* Contacts list */}
      {sortedAndFilteredContacts.length === 0 && searchTerm ? (
        <div className="p-8 text-center text-gray-500">
          <p>No contacts found matching "{searchTerm}"</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-700">
          {sortedAndFilteredContacts.map((contact) => (
            <Post
              key={contact.xpub}
              xpub={contact.xpub}
              name={contact.profile.username}
              username={contact.profile.username}
              title={contact.profile.title}
              body={contact.profile.mision}
              backgroundImage={contact.profile.backgroundImage}
              profileImage={contact.profile.profileImage}
              lastUpdated={contact.profile.lastUpdated}
              addedDate={contact.addedDate}
            />
          ))}
        </div>
      )}
      
      {/* Stats footer */}
      <div className="p-4 text-center text-gray-500 text-sm border-t border-zinc-700">
        Showing {sortedAndFilteredContacts.length} of {contacts.length} contacts
        {sortBy !== 'recent' && (
          <span className="ml-2">• Sorted by {sortBy === 'alphabetical' ? 'A-Z' : 'Oldest First'}</span>
        )}
      </div>
    </div>
  );
};

export default NetworkPage;

// this is the orginl with  website api call  read 
// import React, { useEffect, useState } from 'react';
// import Post from './Post';

// interface User {
//   id: number;
//   name: string;
//   username: string;
// }

// interface PostData {
//   userId: number;
//   id: number;
//   title: string;
//   body: string;
// }

// interface CombinedData extends PostData {
//   user: User;
// }

// const NetworkPage: React.FC = () => {
//   const [combinedData, setCombinedData] = useState<CombinedData[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         // Fetch users and posts in parallel
//         const [usersRes, postsRes] = await Promise.all([
//           fetch('https://jsonplaceholder.typicode.com/users'),
//           fetch('https://jsonplaceholder.typicode.com/posts')
//         ]);

//         if (!usersRes.ok || !postsRes.ok) {
//           throw new Error('Failed to fetch data');
//         }

//         const users: User[] = await usersRes.json();
//         const posts: PostData[] = await postsRes.json();

//         // Combine posts with user data
//         const combined = posts.map((post) => {
//           const user = users.find((u) => u.id === post.userId);
//           return { ...post, user: user! };
//         });

//         setCombinedData(combined);
//         setLoading(false);
//       } catch (err) {
//         setError(err instanceof Error ? err.message : 'An error occurred');
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center py-8">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="p-4 text-center text-red-500">
//         <p>Error loading posts: {error}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full mx-auto">
//       {combinedData.map((data) => (
//         <Post
//           key={data.id}
//           name={data.user.name}
//           username={data.user.username}
//           body={data.body}
//         />
//       ))}
//     </div>
//   );
// };

// export default NetworkPage;


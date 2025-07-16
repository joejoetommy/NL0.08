// src/components/BottomNav.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  SquareUserRound, 
  Search, 
  Wallet, 
  Mail,
  User ,
  MailOpen
} from 'lucide-react';

const BottomNav: React.FC = () => {
  const location = useLocation();
  
  const isHomeActive = location.pathname === '/';
  const isExploreActive = location.pathname === '/explore';
  const isWalletActive = location.pathname === '/wallet';
  const isMessagesActive = location.pathname === '/messages';

  return (
    <div className="fixed bottom-0 bg-black w-full h-16 flex flex-row items-center justify-around sm:hidden border-t border-zinc-700">
          <Link to="/" className="p-2">
            <div className={isHomeActive ? 'rounded-full border-2 border-sky-500 p-[6px] bg-black' : ''}>
              {isHomeActive ? (
                <User 
                  size={28}
                  className="text-white"
                />
              ) : (
                <SquareUserRound 
                  size={28}
                  className="text-gray-500"
                />
              )}
            </div>
          </Link>
      
      <Link to="/explore" className="p-2">
        <Search 
          size={28}
          className={isExploreActive ? 'text-white stroke-[3]' : 'text-gray-500'}
        />
      </Link>
      
      <Link to="/wallet" className="p-2 relative">
        <Wallet 
          size={28}
          fill={isWalletActive ? 'currentColor' : 'none'}
          className={isWalletActive ? 'text-white' : 'text-gray-500'}
        />
        <span className="h-2 w-2 rounded-full bg-sky-500 absolute top-2 right-2"></span>
      </Link>
      
<Link to="/messages" className="p-2">
  <div className={isMessagesActive ? 'rounded-full border-2 border-sky-500 p-[6px] bg-black' : ''}>
    {isMessagesActive ? (
      <MailOpen 
        size={28}
        className="text-white"
      />
    ) : (
      <Mail 
        size={28}
        className="text-gray-500"
      />
    )}
  </div>
</Link>
      
    </div>
  );
};

export default BottomNav;

// <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-user-round-icon lucide-square-user-round"><path d="M18 21a6 6 0 0 0-12 0"/><circle cx="12" cy="11" r="4"/><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
// SquareUserRound
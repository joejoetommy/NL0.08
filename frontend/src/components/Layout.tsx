
// src/components/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from './SideNav';
import BottomNav from './BottomNav';
import MaxWidthWrapper from './MaxWidthWrapper';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <MaxWidthWrapper>
        <div className="flex">
          <SideNav />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </MaxWidthWrapper>
      <BottomNav />
    </div>
  );
};

export default Layout;
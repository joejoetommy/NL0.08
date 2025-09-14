import React from 'react';
import HomeFeed from '../components/profile/Profile';

const HomePage: React.FC = () => {

  return (
    <div className="flex flex-col sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full min-h-screen">
      <HomeFeed  />
    </div>
  );
};

export default HomePage;
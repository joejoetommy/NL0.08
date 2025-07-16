
import React from 'react';
import Post from './Post';

interface User {
  name: string;
  username: string;
  bio: string;
}

const RequestsPage: React.FC = () => {
  // Sample data - in a real app, this would come from an API
  const followingPosts: User[] = [
    {
      name: "Jane Doe",
      username: "janedoe",
      bio: "Ut sed mi nec lectus efficitur varius. Nulla facilisi. Nulla facilisi."
    },
    {
      name: "John Doe",
      username: "johndoe",
      bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam aliquam, nunc id fringilla faucibus, urna est cursus velit, nec egestas diam justo vitae lorem."
    }
  ];

  // Generate more posts by repeating the pattern
  const allPosts = Array(8).fill(null).flatMap((_, i) => 
    followingPosts.map((user, j) => ({
      ...user,
      id: `${i}-${j}`
    }))
  );

  return (
    <div className="w-full mx-auto">
      {allPosts.map((data) => (
        <Post
          key={data.id}
          name={data.name}
          username={data.username}
          body={data.bio}
        />
      ))}
    </div>
  );
};

export default RequestsPage;
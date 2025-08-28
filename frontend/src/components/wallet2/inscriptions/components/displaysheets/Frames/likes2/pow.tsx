import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Props for DrawerLikes
interface DrawerLikesProps {
  likes: Like[];
  dislikes: Dislike[];
  reactions: Reaction[];
}

// Props for TabContent
interface TabContentProps {
  data: (Like | Dislike | Reaction)[];
  loadMore: () => void;
  hasMore: boolean;
}

// TabContent component
const TabContent: React.FC<TabContentProps> = ({ data, loadMore, hasMore }) => (
  <div className="flex flex-col items-center space-y-2 p-4 w-full">
    {data.map((item) => (
      <div key={item.id} className="flex items-center space-x-2 justify-center w-full">
        <Avatar>
          <AvatarImage src={item.avatarUrl} alt={`Avatar of ${item.user}`} />
          <AvatarFallback>{item.user[0]}</AvatarFallback>
        </Avatar>
        <p className="text-sm font-semibold">{item.user}</p>
        {"emoji" in item && <Icon icon={item.emoji} width="24" height="24" />}
        <p className="text-sm">{item.content}</p>
      </div>
    ))}
    {hasMore && (
      <button onClick={loadMore} className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
        View more reactions
      </button>
    )}
  </div>
);

// Pagination hook
const ITEMS_PER_PAGE = 50;

const usePagination = (data: (Like | Dislike | Reaction)[]) => {
  const [visibleData, setVisibleData] = useState(data.slice(0, ITEMS_PER_PAGE));
  const [page, setPage] = useState(1);

  const loadMore = () => {
    const nextPage = page + 1;
    const newData = data.slice(0, nextPage * ITEMS_PER_PAGE);
    setVisibleData(newData);
    setPage(nextPage);
  };

  const hasMore = data.length > visibleData.length;

  return { visibleData, loadMore, hasMore };
};

// DrawerLikes component
const DrawerLikes: React.FC<DrawerLikesProps> = ({ likes, dislikes, reactions }) => {
  const [activeTab, setActiveTab] = useState('likes');
  const [likeCount, setLikeCount] = useState(likes.length);
  const [dislikeCount, setDislikeCount] = useState(dislikes.length);
  const [clickedIcon, setClickedIcon] = useState<string | null>(null);

  const reactionCounts = {
    "bxs:smile": reactions.filter((r) => r.emoji === "bxs:smile").length,
    "ri:emotion-unhappy-fill": reactions.filter((r) => r.emoji === "ri:emotion-unhappy-fill").length,
    "tdesign:angry-filled": reactions.filter((r) => r.emoji === "tdesign:angry-filled").length,
    "mdi:emoticon-cry": reactions.filter((r) => r.emoji === "mdi:emoticon-cry").length,
    "bxs:laugh": reactions.filter((r) => r.emoji === "bxs:laugh").length,
  };

  const { visibleData: visibleLikes, loadMore: loadMoreLikes, hasMore: hasMoreLikes } = usePagination(likes);
  const { visibleData: visibleDislikes, loadMore: loadMoreDislikes, hasMore: hasMoreDislikes } = usePagination(dislikes);
  const { visibleData: visibleReactions, loadMore: loadMoreReactions, hasMore: hasMoreReactions } = usePagination(reactions);

  const addLike = () => {
    setLikeCount((prev) => prev + 1);
    likes.push({
      id: `${likes.length + 1}`,
      user: "CurrentUser",
      avatarUrl: "/avatars/current-user.jpg",
      createdAt: new Date().toISOString(),
      content: "Liked this post",
    });
    setClickedIcon("like");
  };

  const addDislike = () => {
    setDislikeCount((prev) => prev + 1);
    dislikes.push({
      id: `${dislikes.length + 1}`,
      user: "CurrentUser",
      avatarUrl: "/avatars/current-user.jpg",
      createdAt: new Date().toISOString(),
      content: "Disliked this post",
    });
    setClickedIcon("dislike");
  };

  const addReaction = (emoji: string) => {
    reactions.push({
      id: `${reactions.length + 1}`,
      user: "CurrentUser",
      avatarUrl: "/avatars/current-user.jpg",
      createdAt: new Date().toISOString(),
      content: "Reacted",
      emoji,
    });
    setClickedIcon(emoji);
    setTimeout(() => setClickedIcon(null), 2000); // Reset styling after 2 seconds
  };

  return (
    <div className="w-full mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Reactions</h1>
      <div className="flex-1 overflow-auto h-4/5">
    
        <div className="flex justify-around items-center border-b mb-4">
          {/* Like Section */}
          <div className="relative flex items-center space-x-2">
              {/* Like Button */}
              <button
                onClick={() => {
                  addLike();
                  setClickedIcon("likeButton");
                  setTimeout(() => setClickedIcon(null), 2000); // Reset icon after 2 seconds
                }}
                className="p-2 relative"
              >
                 <Icon
                  icon={clickedIcon === "likeButton" ? "material-symbols:ecg-heart" : "wpf:like"}
                  width="24"
                  height="24"
                />
               </button>
                {clickedIcon === "likeButton" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute top-0 left-0 border-t-2 border-l-2 border-sky-500 w-2 h-2 rounded-tl" />
                    <div className="absolute top-0 right-0 border-t-2 border-r-2 border-sky-500 w-2 h-2 rounded-tr" />
                    <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-sky-500 w-2 h-2 rounded-bl" />
                    <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-sky-500 w-2 h-2 rounded-br" />
                  </div>
                )}
              {/* Like Count Button */}
              <button
                  onClick={() => {
                    setActiveTab('likes');
                    setClickedIcon('likeCount');
                  }}
                  className={`text-sm font-semibold pl-4 relative ${activeTab === 'likes' ? 'underline' : ''}`}
                >
                  <div className="relative">
                    {clickedIcon === "likeCount" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute top-0 left-0 border-t-2 border-l-2 border-sky-500 w-2 h-2 rounded-tl" />
                  <div className="absolute top-0 right-0 border-t-2 border-r-2 border-sky-500 w-2 h-2 rounded-tr" />
                  <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-sky-500 w-2 h-2 rounded-bl" />
                  <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-sky-500 w-2 h-2 rounded-br" />
                </div>
                    )}
                    <span className="relative z-10 px-4 py-2">{likeCount}</span>
                  </div>
                </button>
              </div>

          {/* Dislike Section */}
          <div className="relative flex items-center space-x-2">
            {/* <button onClick={addDislike} className="p-2"> */}
               <button
                onClick={() => {
                  addDislike();
                  setClickedIcon("dislike");
                  setTimeout(() => setClickedIcon(null), 2000); // Reset icon after 2 seconds
                }}
                className="p-2 relative"
              >
              {/* <Icon icon="mdi:dislike" width="24" height="24" /> */}
               <Icon
                  icon={clickedIcon === "dislike" ? "uil:heart-break" : "fluent:heart-off-24-filled"}
                  width="24"
                  height="24"
                />
            </button>
            {clickedIcon === "dislike" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute top-0 left-0 border-t-2 border-l-2 border-sky-500 w-2 h-2 rounded-tl" />
                  <div className="absolute top-0 right-0 border-t-2 border-r-2 border-sky-500 w-2 h-2 rounded-tr" />
                  <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-sky-500 w-2 h-2 rounded-bl" />
                  <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-sky-500 w-2 h-2 rounded-br" />
                </div>
            )}
               <button
                  onClick={() => {
                    setActiveTab('dislikes');
                    setClickedIcon('dislikeCount');
                  }}
                  className={`text-sm font-semibold pl-4 relative ${activeTab === 'dislikes' ? 'underline' : ''}`}
                >
                <div className="relative">
                    {clickedIcon === "dislikeCount" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute top-0 left-0 border-t-2 border-l-2 border-sky-500 w-2 h-2 rounded-tl" />
                  <div className="absolute top-0 right-0 border-t-2 border-r-2 border-sky-500 w-2 h-2 rounded-tr" />
                  <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-sky-500 w-2 h-2 rounded-bl" />
                  <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-sky-500 w-2 h-2 rounded-br" />
                </div>
                    )}
                    <span className="relative z-10 px-4 py-2">{dislikeCount}</span>
                  </div>
                </button>
          </div>

{/* Reactions Section */}
<div className="relative flex items-center">
  <button
    onClick={() => {
      setActiveTab('reactions');
      setClickedIcon('reactions');
    }}
    className="relative flex items-center space-x-2 p-2"
  >
    {/* Icon */}
    <Icon 
    icon={clickedIcon === "reactions" ? "ph:plus-fill" : "ic:baseline-plus"}
    width="24" height="24" 
    />
{/*            icon={clickedIcon === "reactions" ? "ic:baseline-plus" : "ph:plus-fill"} */}
    {/* Reaction Count */}
    <span className="text-sm font-semibold pl-4">{reactions.length}</span>

    {/* Styling Applied When Selected */}
    {clickedIcon === "reactions" && (
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Top-left corner */}
        <div className="absolute top-0 left-0 border-t-2 border-l-2 border-sky-500 w-2 h-2 rounded-tl" />
        {/* Top-right corner */}
        <div className="absolute top-0 right-0 border-t-2 border-r-2 border-sky-500 w-2 h-2 rounded-tr" />
        {/* Bottom-left corner */}
        <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-sky-500 w-2 h-2 rounded-bl" />
        {/* Bottom-right corner */}
        <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-sky-500 w-2 h-2 rounded-br" />
      </div>
    )}
  </button>
</div>

        </div>
      </div>

      <div>
        {activeTab === 'likes' && <TabContent data={visibleLikes} loadMore={loadMoreLikes} hasMore={hasMoreLikes} />}
        {activeTab === 'dislikes' && <TabContent data={visibleDislikes} loadMore={loadMoreDislikes} hasMore={hasMoreDislikes} />}
        {activeTab === 'reactions' && (
          <>
            <div className="flex justify-center space-x-4 mt-4">
              {["bxs:smile", "ri:emotion-unhappy-fill", "tdesign:angry-filled", "mdi:emoticon-cry", "bxs:laugh"].map((emoji) => (
                <div key={emoji} className="relative flex items-center space-x-2">
                  <button
                    onClick={() => addReaction(emoji)}
                    className="p-2 rounded hover:bg-sky-300"
                  >
                    <Icon icon={emoji} width="32" height="32" />
                  </button>
                  <span className="text-sm font-semibold">{reactionCounts[emoji]}</span>
                  {clickedIcon === emoji && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="absolute top-0 left-0 border-t-2 border-l-2 border-sky-500 w-2 h-2 rounded-tl" />
                      <div className="absolute top-0 right-0 border-t-2 border-r-2 border-sky-500 w-2 h-2 rounded-tr" />
                      <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-sky-500 w-2 h-2 rounded-bl" />
                      <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-sky-500 w-2 h-2 rounded-br" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <TabContent data={visibleReactions} loadMore={loadMoreReactions} hasMore={hasMoreReactions} />
          </>
        )}
      </div>
    </div>
  );
};

export { DrawerLikes };



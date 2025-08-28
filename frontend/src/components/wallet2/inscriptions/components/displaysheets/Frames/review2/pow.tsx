// review

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react'; // Ensure this is properly imported
import { TextareaForm } from "../../textarea";
//  import { Button } from "@/components/ui/button";

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

interface Review {
  id: number;
  user: string;
  avatarUrl: string;
  createdAt: string;
  content: string;
  likes: number;
  dislikes: number;
  tips: number;
  replies: Reply[];
}

interface Reply {
  id: number;
  user: string;
  avatarUrl: string;
  createdAt: string;
  content: string;
  likes: number;
  dislikes: number;
  tips: number;
}

interface CommentProps {
  review: Review;
  onReplyClick: (username: string) => void;
}

interface DrawerReviewProps {
  reviews: Review[];
}

const formatCount = (count: number): string => {
  if (count >= 1000) {
    return (count / 1000).toFixed(count % 1000 !== 0 ? 1 : 0) + 'K';
  }
  return count.toString();
};

const CommentItem: React.FC<CommentProps> = ({ review, onReplyClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [displayedReplies, setDisplayedReplies] = useState<Reply[]>([]);
  const [repliesPageIndex, setRepliesPageIndex] = useState(0);
  const repliesPerPage = 8;
  const [isLongContent, setIsLongContent] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<{ [key: string]: boolean }>({});
  const contentRef = useRef<HTMLParagraphElement>(null);
  const formattedDate = formatDate(review.createdAt);
  const { likes, dislikes, tips } = review;
  const replyRefs = useRef<{ [key: string]: HTMLParagraphElement | null }>({});
  const [longReplies, setLongReplies] = useState<{ [key: string]: boolean }>({});

  const [commentStatus, setCommentStatus] = useState({
    likeClicked: false,
    dislikeClicked: false,
    likes: review.likes,
    dislikes: review.dislikes,
    tip: { clicked: false, count: review.tips },
    linkOut: { clicked: false, count: 0 }
  });

  const [repliesStatus, setRepliesStatus] = useState(review.replies.map(reply => ({
    id: reply.id,
    likeClicked: false,
    dislikeClicked: false,
    likes: reply.likes,
    dislikes: reply.dislikes,
    tip: { clicked: false, count: reply.tips },
    linkOut: { clicked: false, count: 0 }
  })));

  useEffect(() => {
    const checkContentHeight = () => {
      if (contentRef.current) {
        const lineHeight = parseInt(window.getComputedStyle(contentRef.current).lineHeight, 10);
        const maxLinesVisible = 5;
        setIsLongContent(contentRef.current.scrollHeight > lineHeight * maxLinesVisible);
      }
    };
    checkContentHeight();
  }, [review.content]);

  useEffect(() => {
    const checkRepliesContentHeight = () => {
      const repliesHeights: { [key: string]: boolean } = {};
      Object.entries(replyRefs.current).forEach(([key, ref]) => {
        if (ref) {
          const lineHeight = parseInt(window.getComputedStyle(ref).lineHeight, 10);
          const maxLinesVisible = 5;
          repliesHeights[key] = ref.scrollHeight > lineHeight * maxLinesVisible;
        }
      });
      setLongReplies(repliesHeights);
    };
    checkRepliesContentHeight();
  }, [review.replies, showReplies]);

  const toggleReplies = () => {
    setShowReplies(!showReplies);
    if (!showReplies) {
      setDisplayedReplies(review.replies.slice(0, repliesPerPage));
      setRepliesPageIndex(1);
    }
  };

  const toggleReplyExpansion = (replyId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [replyId]: !prev[replyId]
    }));
  };

  const handleLoadMoreReplies = () => {
    const nextPageIndex = repliesPageIndex + 1;
    const additionalReplies = review.replies.slice(
      nextPageIndex * repliesPerPage,
      (nextPageIndex + 1) * repliesPerPage
    );
    setDisplayedReplies([...displayedReplies, ...additionalReplies]);
    setRepliesPageIndex(nextPageIndex);
  };

  const handleIconClick = (iconName: 'like' | 'dislike' | 'tip') => {
    setCommentStatus(prev => ({
      ...prev,
      [iconName]: {
        clicked: !prev[iconName].clicked,
        count: prev[iconName].count + 1
      }
    }));

    if (iconName === 'tip') {
      setTimeout(() => {
        setCommentStatus(prev => ({
          ...prev,
          tip: { ...prev.tip, clicked: false }
        }));
      }, 3000);
    }
  };

  const handleReplyIconClick = (replyId: number, iconName: 'like' | 'dislike' | 'tip') => {
    setRepliesStatus(prev => prev.map(reply => {
      if (reply.id === replyId) {
        return {
          ...reply,
          [iconName]: {
            clicked: !reply[iconName].clicked,
            count: reply[iconName].count + 1
          }
        };
      }
      return reply;
    }));

    if (iconName === 'tip') {
      setTimeout(() => {
        setRepliesStatus(prev => prev.map(reply => {
          if (reply.id === replyId) {
            return {
              ...reply,
              tip: { ...reply.tip, clicked: false }
            };
          }
          return reply;
        }));
      }, 3000);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-2 pt-1">
        <img
          src={review.avatarUrl}
          alt={`${review.user}'s avatar`}
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-300 cursor-pointer" onClick={() => alert('Redirect to profile')}>{review.user}</span>
            <span className="text-sm text-gray-500">{formattedDate}</span>
          </div>
          <p ref={contentRef} className={`mt-1 ${!isExpanded ? 'line-clamp-5' : ''}`}>
            {review.content}
          </p>
          {!isExpanded && isLongContent && (
            <button className="text-sm text-center block w-full mt-1" onClick={() => setIsExpanded(true)}>
              -view more
            </button>
          )}
          {isExpanded && (
            <button className="text-sm text-center block w-full mt-1" onClick={() => setIsExpanded(false)}>
              -view less
            </button>
          )}
        </div>
      </div>

      <div className="px-8 flex justify-between items-center w-full">
        <button className="text-sm" onClick={() => onReplyClick(review.user)}>Reply</button>
        <div className="flex items-center space-x-2 justify-end">
          <Icon
            icon={commentStatus.likeClicked ? "ph:heart-fill" : "ph:heart-bold"}
            className="h-5 w-5 cursor-pointer"
            onClick={() => handleIconClick('like')}
          />
          <span className="text-xs w-8 text-center">{commentStatus.likes}</span>

          <Icon
            icon={commentStatus.dislikeClicked ? "mdi:thumbs-down" : "mdi:thumbs-down-outline"}
            className="h-5 w-5 cursor-pointer"
            onClick={() => handleIconClick('dislike')}
          />
          <span className="text-xs w-8 text-center">{commentStatus.dislikes}</span>

          <Icon
            icon={commentStatus.tip.clicked ? "mdi:hand-coin" : "mdi:hand-coin-outline"}
            className="h-5 w-5 cursor-pointer"
            onClick={() => handleIconClick('tip')}
          />
          <span className="text-xs w-8 text-center">{commentStatus.tip.count}</span>
        </div>
      </div>

      {review.replies && review.replies.length > 0 && (
        <div className="px-1 py-1">
          <button onClick={toggleReplies} className="text-sm">
            {showReplies ? 'Hide replies' : `View replies (${formatCount(review.replies.length)})`}
          </button>
          {showReplies && (
            <>
              {displayedReplies.map((reply, index) => (
                <div key={index} className="flex items-start pt-2">
                  <img
                    src={reply.avatarUrl}
                    alt={`${reply.user}'s avatar`}
                    className="w-8 h-8 rounded-full mr-4"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-300 cursor-pointer" onClick={() => alert('Redirect to profile')}>{reply.user}</span>
                      <span className="text-sm text-gray-500">{formatDate(reply.createdAt)}</span>
                    </div>
                    <p ref={el => replyRefs.current[reply.id] = el} className={`mt-1 ${!expandedReplies[reply.id] && longReplies[reply.id] ? 'line-clamp-5' : ''}`}>
                      {reply.content}
                    </p>
                    {!expandedReplies[reply.id] && longReplies[reply.id] && (
                      <button className="text-sm text-center block w-full mt-1" onClick={() => setExpandedReplies({ ...expandedReplies, [reply.id]: true })}>
                        -view more
                      </button>
                    )}
                    {expandedReplies[reply.id] && (
                      <button className="text-sm text-center block w-full mt-1" onClick={() => setExpandedReplies({ ...expandedReplies, [reply.id]: false })}>
                        -view less
                      </button>
                    )}
                    <div className="flex items-center space-x-4">
                      <Icon
                        icon={repliesStatus[index].likeClicked ? "ph:heart-fill" : "ph:heart-bold"}
                        className="h-5 w-5 cursor-pointer"
                        onClick={() => handleReplyIconClick(reply.id, 'like')}
                      />
                      <span className="text-xs w-8 text-center">{repliesStatus[index].likes}</span>

                      <Icon
                        icon={repliesStatus[index].dislikeClicked ? "mdi:thumbs-down" : "mdi:thumbs-down-outline"}
                        className="h-5 w-5 cursor-pointer"
                        onClick={() => handleReplyIconClick(reply.id, 'dislike')}
                      />
                      <span className="text-xs w-8 text-center">{repliesStatus[index].dislikes}</span>

                      <Icon
                        icon={repliesStatus[index].tip.clicked ? "mdi:hand-coin" : "mdi:hand-coin-outline"}
                        className="h-5 w-5 cursor-pointer"
                        onClick={() => handleReplyIconClick(reply.id, 'tip')}
                      />
                      <span className="text-xs w-8 text-center">{repliesStatus[index].tip.count}</span>
                    </div>
                  </div>
                </div>
              ))}
              {review.replies.length > repliesPageIndex * repliesPerPage && (
                <button onClick={handleLoadMoreReplies} className="text-sm mt-2">
                  -View more replies
                </button>
              )}
            </>
          )}
        </div>
      )}
      <div className="border-b border-gray-200 mt-2"></div>
    </div>
  );
};

const DrawerReview: React.FC<DrawerReviewProps> = ({ reviews }) => {
  const [placeholder, setPlaceholder] = useState("Add review here ...");

  const handleReplyClick = (username: string) => {
    setPlaceholder(`Add reply to ${username} here ...`);
  };

  const handleClearPlaceholder = () => {
    setPlaceholder("Add comment here ...");
  };

  return (
    <div className="w-full mx-auto">
      <h1 className="text-2xl font-bold mb-4">Reviews</h1>
      <div className="flex-1 overflow-auto h-4/5">
        {reviews.map(review => (
          <CommentItem key={review.id} review={review} onReplyClick={handleReplyClick} />
        ))}
      </div>
      <div className="fixed bottom-0 left-0 w-full z-10 bg-black p-4 border-t border-gray-600">
        <TextareaForm placeholder={placeholder} onClearPlaceholder={handleClearPlaceholder} />
      </div>
    </div>
  );
};

export { DrawerReview };

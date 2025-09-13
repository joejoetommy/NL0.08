
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextareaForm } from "@/components/Frames/textarea";
import { Icon } from "@iconify/react";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import TokenCount from '@/components/item/(wallt1items)/tokencount';
import { SearchToken } from "@/components/item/(wallt1items)/searchToken";
import { AddToken } from '@/components/item/(wallt1items)/addToken';
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  RectangleComponent,
} from "@/components/Frames/drawer";
import React, { useState, useRef, useEffect } from 'react';
import Image from "next/image";
import { imageData as initialImageData } from "@/components/data/(wall)/wallt1";
// DrawerComment

const titleMapping = {
  "Interact.Comment": "Comments",
  "Interact.Review": "Reviews",
  "Interact.Report": "Reports",
  "Interact.Direct": "DM",
};


const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const formatCount = (count: number): string => {
  if (count >= 1000) {
    return (count / 1000).toFixed(count % 1000 !== 0 ? 1 : 0) + 'K';
  }
  return count.toString();
};



const CommentItem: React.FC<CommentProps> = ({ comment, onReplyClick  }) => {
  const maxComments = 15;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [displayedReplies, setDisplayedReplies] = useState<Reply[]>([]);
  const [repliesPageIndex, setRepliesPageIndex] = useState(0);
  const repliesPerPage = 8; // Max replies per load
  const [isLongContent, setIsLongContent] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<{ [key: string]: boolean }>({});
  const contentRef = useRef<HTMLParagraphElement>(null);
  const formattedDate = formatDate(comment.createdAt);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const { likes, dislikes, tips } = comment;
  const replyRefs = useRef<{ [key: string]: HTMLParagraphElement | null }>({});
  const [longReplies, setLongReplies] = useState<{ [key: string]: boolean }>({});
 
  const [commentStatus, setCommentStatus] = useState({
    likeClicked: false,
    dislikeClicked: false,
    likes: comment.likes,
    dislikes: comment.dislikes, 
    tip: { clicked: false, count: comment.tips }, 
    linkOut: { clicked: false, count: 0 } });

 const [repliesStatus, setRepliesStatus] = useState(
          comment.replies.map(reply => ({
    //   (comment.replies ?? []).map(reply => ({
  id: reply.id,
  likeClicked: false,
  dislikeClicked: false,
  likes: reply.likes,
  dislikes: reply.dislikes,
  tip: { clicked: false, count: reply.tips },
  linkOut: { clicked: false, count: 0 },
})
));

  // This section is the amount of comment lines are visable
  useEffect(() => {
    const checkContentHeight = () => {
      if (contentRef.current) {
        const lineHeight = parseInt(window.getComputedStyle(contentRef.current).lineHeight, 10);
        const maxLinesVisible = 5;
        setIsLongContent(contentRef.current.scrollHeight > lineHeight * maxLinesVisible);
      }
    };
    checkContentHeight();
  }, [comment.content]); // Ensure effect is dependent on comment content changes

  // Check each reply content height
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
  }, [comment.replies, showReplies]); // Added showReplies to trigger re-check when replies are shown

  const toggleReplies = () => {
    setShowReplies(!showReplies);
    if (!showReplies) {
      setDisplayedReplies(comment.replies.slice(0, repliesPerPage));
      setRepliesPageIndex(1); // Initialize or reset the page index
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
    const additionalReplies = comment.replies.slice(
      nextPageIndex * repliesPerPage,
      (nextPageIndex + 1) * repliesPerPage
    );
    setDisplayedReplies([...displayedReplies, ...additionalReplies]);
    setRepliesPageIndex(nextPageIndex);
  };

  const handleUsernameClick = () => {
    // Redirect to user profile (adjust the URL to your application's routing logic)
    window.location.href = `/profile/${comment.user}`;
  };

  const handleIconClick = (iconName: 'like' | 'dislike' | 'tip') => {
    setCommentStatus(prev => ({
      ...prev,
      [iconName]: {
        clicked: !prev[iconName].clicked,
        count: prev[iconName].count + 1  // Increment the count on click
      }
    }));

    // If it's the 3rd icon (databaseHeart), set a timeout to revert clicked state after 3 seconds
    if (iconName === 'tip') {
      setTimeout(() => {
        setCommentStatus(prev => ({
          ...prev,
          tip: { ...prev.tip, clicked: false }
        }));
      }, 3000); // 3000 milliseconds or 3 seconds
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

    // Automatically revert the 'tip' icon click after 3 seconds prev[iconName]
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

  const handleCommentInteraction = (type: 'like' | 'dislike') => {
    setCommentStatus(prev => {
      if (type === 'like') {
        return {
          ...prev,
          likeClicked: !prev.likeClicked,
          likes: prev.likeClicked ? prev.likes - 1 : prev.likes + 1
        };
      } else if (type === 'dislike') {
        return {
          ...prev,
          dislikeClicked: !prev.dislikeClicked,
          dislikes: prev.dislikeClicked ? prev.dislikes - 1 : prev.dislikes + 1
        };
      }
      return prev;
    });
  };

  const handleReplyInteraction = (replyId: number, type: 'like' | 'dislike') => {
    setRepliesStatus(prev => prev.map(reply => {
      if (reply.id === replyId) {
        if (type === 'like') {
          return {
            ...reply,
            likeClicked: !reply.likeClicked,
            likes: reply.likeClicked ? reply.likes - 1 : reply.likes + 1
          };
        } else if (type === 'dislike') {
          return {
            ...reply,
            dislikeClicked: !reply.dislikeClicked,
            dislikes: reply.dislikeClicked ? reply.dislikes - 1 : reply.dislikes + 1
          };
        }
      }
      return reply;
    }));
  };


  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-2 pt-1">
        <img
          src={comment.avatarUrl}
          alt={`${comment.user}'s avatar`}
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-300 cursor-pointer" onClick={() => alert('Redirect to profile')}>{comment.user}</span>
            <span className="text-sm text-gray-500">{formattedDate}</span>
          </div>
          <p ref={contentRef} className={` mt-1 ${!isExpanded ? 'line-clamp-5' : ''}`}>
            {comment.content}
          </p>
          {!isExpanded && isLongContent &&  (
            <button className="text-sm text-center block w-full mt-1" 
            onClick={() => setIsExpanded(true)}>
              -view more
            </button>
          )}
          {isExpanded && (
            <button className="text-sm text-center block w-full mt-1" 
            onClick={() => setIsExpanded(false)}>
              -view less
            </button>
          )}
        </div>
      </div> 
      <div className="px-8 flex justify-between items-center w-full">
      <button className="text-sm" onClick={() => onReplyClick(comment.user)}>Reply</button>
        <div className="flex items-center space-x-2 justify-end">
        
        <Icon
          icon={commentStatus.likeClicked ? "ph:heart-fill" : "ph:heart-bold"}
          className="h-5 w-5 cursor-pointer"
          onClick={() => handleCommentInteraction('like')}
        />
        <span className="text-xs w-8 text-center">{commentStatus.likes}</span>
          
          <Icon
          icon={commentStatus.dislikeClicked ? "mdi:thumbs-down" : "mdi:thumbs-down-outline"}
          className="h-5 w-5 cursor-pointer"
          onClick={() => handleCommentInteraction('dislike')}
        />
        <span className="text-xs w-8 text-center">{commentStatus.dislikes}</span>
          
          <Icon  icon={commentStatus.tip.clicked ? "mdi:hand-coin" : "mdi:hand-coin-outline"}
                className="h-5 w-5 cursor-pointer" 
                onClick={() => handleIconClick('tip')}
             />
          <span className="text-xs w-8 text-center">{commentStatus.tip.count}</span>
           {/* Next icon is a clickable link go it on-chain transaction */}
          <Icon icon="pepicons-pop:chain" className="h-5 w-5 cursor-pointer" onClick={() => window.open(commentUrl, '_blank')} />
        </div>
      </div>

      {/* Comment Replies section */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="px-1 py-1">
        <button onClick={toggleReplies} className="text-sm">
            {showReplies ? 'Hide replies' : `View replies (${formatCount(comment.replies.length)})`}
          </button>
          {showReplies && (
            <>
              {/* {displayedReplies.map((reply, index) => ( */}
      {showReplies && displayedReplies.map((reply, index) => (
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
               
                  {/* Icon row moved here to be below the content (ph:heart-bold) */}
                  {/* <Icon icon="mdi:cards-heart" className="h-5 w-5" /> */}
                  {/* <Icon icon="mdi:thumbs-down" className="h-5 w-5" /> */}
                  {/* <Icon icon="game-icon:coinflip" className="h-5 w-5" /> */}
                  <div className="flex items-center space-x-4">
                  <Icon
                icon={repliesStatus[index].likeClicked ? "ph:heart-fill" : "ph:heart-bold"}
                className="h-5 w-5 cursor-pointer"
                onClick={() => handleReplyInteraction(reply.id, 'like')}
              />
              <span className="text-xs w-8 text-center">{repliesStatus[index].likes}</span>

              <Icon
                icon={repliesStatus[index].dislikeClicked ? "mdi:thumbs-down" : "mdi:thumbs-down-outline"}
                className="h-5 w-5 cursor-pointer"
                onClick={() => handleReplyInteraction(reply.id, 'dislike')}
              />
              <span className="text-xs w-8 text-center">{repliesStatus[index].dislikes}</span>

              <Icon
                icon={repliesStatus[index].tip.clicked ? "mdi:hand-coin" : "mdi:hand-coin-outline"}
                className="h-5 w-5 cursor-pointer"
                onClick={() => handleReplyIconClick(reply.id, 'tip')}
              />
              <span className="text-xs w-8 text-center">{repliesStatus[index].tip.count}</span>      
      
              {/* Add the comment or Reply on-chain link below */}
              <Icon icon="pepicons-pop:chain" className="h-5 w-5 cursor-pointer" onClick={() => window.open(commentreplytUrl, '_blank')} />
            </div>
                </div>
              </div>
              ))}
              {comment.replies.length > repliesPageIndex * repliesPerPage && (
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



const DrawerComment = ({ data, title, icon }) => {
  const [placeholder, setPlaceholder] = useState("Add comment here ...");

  return (
    <div className="w-full mx-auto">
      <Drawer>
        <DrawerTrigger asChild>
          <Button className="hover:text-blue-600 text-bold bg-white-500 rounded">
            <Icon icon={icon} width="18" height="18" />
            <span>{data.length}</span> {/* Display count here */}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex justify-between items-center">
              <DrawerTitle className="mx-auto">{title}</DrawerTitle>
              <DrawerClose asChild>
                <Button className="border border-white bg-grey-500 text-white px-4 py-4 rounded focus:outline-none mr-4">
                  X
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <RectangleComponent>
            {/* <div className="flex-1 overflow-auto h-4/5">
              {data.map((comment) => (
                <div key={comment.id} className="border-b py-2">
                  <p className="font-semibold">{comment.user}</p>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}
            </div> */}
           <div className="flex-1 overflow-auto h-4/5">
              {data.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          </RectangleComponent>
          <DrawerFooter>
            <TextareaForm placeholder={placeholder} onClearPlaceholder={() => setPlaceholder("Add comment here ...")} />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

const ImageDetail: React.FC<{ image: typeof initialImageData[0]; onClick: () => void }> = ({ image, onClick }) => {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState<{ [key: number]: string }>({});

  const toggleLikeDislike = (id: number, type: 'like' | 'dislike') => {
    const updatedComments = comments.map(comment => {
      if (comment.id === id) {
        const isLiked = type === 'like';
        return {
          ...comment,
          likes: isLiked ? comment.likes + 1 : comment.likes - (comment.likes > 0 ? 1 : 0),
          dislikes: !isLiked ? comment.dislikes + 1 : comment.dislikes - (comment.dislikes > 0 ? 1 : 0),
        };
      }
      return comment;
    });
    setComments(updatedComments);
  };

  const submitComment = (parentId?: number) => {
    if (parentId === undefined) {
      if (commentText.trim() !== '') {
        const newComment: Comment = {
          id: Date.now(),
          text: commentText,
          likes: 0,
          dislikes: 0,
          replies: [],
          tips: 0
        };
        setComments([...comments, newComment]);
        setCommentText('');
      }
    } else {
      const newReply: Comment = {
        id: Date.now(),
        text: replyTexts[parentId],
        likes: 0,
        dislikes: 0,
        replies: [],
        tips: 0
      };
      const updatedComments = comments.map(comment => {
        if (comment.id === parentId) {
          return { ...comment, replies: [...comment.replies, newReply] };
        }
        return comment;
      });
      setComments(updatedComments);
      setReplyTexts({ ...replyTexts, [parentId]: '' });
    }
  };

  const toggleLike = () => {
    if (disliked) {
      setDisliked(false);
    }
    setLiked(!liked);
  };

  const toggleDislike = () => {
    if (liked) {
      setLiked(false);
    }
    setDisliked(!disliked);
  };

  const handleLikeComment = (id: number) => {
    const updatedComments = comments.map(comment => {
      if (comment.id === id) {
        return { ...comment, likes: comment.likes + 1 };
      }
      return comment;
    });
    setComments(updatedComments);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>, id?: number) => {
    if (id !== undefined) {
      setReplyTexts({ ...replyTexts, [id]: e.target.value });
    } else {
      setCommentText(e.target.value);
    }
  };

  const handleTipComment = (id: number) => {
    const updatedComments = comments.map(comment => {
      if (comment.id === id) {
        return { ...comment, tips: comment.tips + 1 };
      }
      return comment;
    });
    setComments(updatedComments);
  };

  return (
    <div className="border border-gray-300 rounded-lg shadow-lg my-4">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Image
            src={image.avatarUrl}
            alt={image.author}
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <p className="font-semibold">{image.author}</p>
            <p className="text-xs text-gray-500">{image.createdAt}</p>
          </div>
        </div>
        <Image
          src={image.imageUrl}
          alt={image.title}
          width={600}
          height={400}
          layout="responsive"
          objectFit="cover"
          className="rounded-lg"
        />
        <div className="py-2 px-1 border-t border-gray-300">
          <div className="flex space-x-4">
            <DrawerComment
              data={image.Interact.Comment}
              title={titleMapping["Interact.Comment"]}
              icon="mdi:comment-text-multiple"
            />
            <DrawerComment
              data={image.Interact.Review}
              title={titleMapping["Interact.Review"]}
              icon="mdi:rate-review"
            />
            <DrawerComment
              data={image.Interact.Report}
              title={titleMapping["Interact.Report"]}
              icon="ic:baseline-report"
            />
            <DrawerComment
              data={image.Interact.Direct}
              title={titleMapping["Interact.Direct"]}
              icon="mdi:email"
            />
          </div>
        </div>
        <div className="p-2">
          <p className="font-semibold">{image.likes} likes</p>
          <p className="mt-2">
            <span className="font-semibold">{image.title}</span> {image.content}
          </p>
          <p className="text-xs text-gray-500 mt-1">{image.Interact.Comment.length} comments</p>
        </div>
      </div>
    </div>
  );
};


const WallT1: React.FC = () => {
  const [imageData, setImageData] = useState(initialImageData);
  const [filteredImages, setFilteredImages] = useState(initialImageData);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('newest');
  const itemsPerPage = 15;

  useEffect(() => {
    if (scrollRef.current && selectedImageIndex !== null) {
      const scrollElements = scrollRef.current.children;
      const elementToScroll = scrollElements[selectedImageIndex];
      elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedImageIndex]);

  const handleReturnToList = () => {
    setSelectedImageIndex(null);
  };


  const renderReturnButton = () => (
    selectedImageIndex !== null && (
      <button
        onClick={handleReturnToList}
        style={{ right: '1rem', bottom: '5rem' }}
        className="fixed z-10 group flex h-10 w-10 select-none items-center justify-center rounded-lg border border-zinc-100 bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-[0_-1px_0_0px_#d4d4d8_inset,0_0_0_1px_#f4f4f5_inset,0_0.5px_0_1.5px_#fff_inset] hover:bg-zinc-50 active:shadow-[-1px_0px_1px_0px_#e4e4e7_inset,1px_0px_1px_0px_#e4e4e7_inset,0px_0.125rem_1px_0px_#d4d4d8_inset] py-2 px-4 rounded"
        aria-label="Change language"
      >
        <span className="flex items-center group-active:[transform:translate3d(0,1px,0)]">
          ↩
        </span>
      </button>
  )
  );


  const handleSortOrderChange = (order: string) => {
    setSortOrder(order);
    setCurrentPage(1);
  };

  const getSortedImages = () => {
    const sortedImages = [...filteredImages].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });
    return sortedImages;
  };

  const indexOfLastImage = currentPage * itemsPerPage;
  const indexOfFirstImage = indexOfLastImage - itemsPerPage;
  const currentImages = getSortedImages().slice(indexOfFirstImage, indexOfLastImage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleReviewAdded = (newReview: typeof imageData[0]) => {
    setImageData([newReview, ...imageData]);
  };

  const handleSearch = ({ searchTerm, searchUser, startDate, endDate }) => {
    const filtered = imageData.filter(image => {
      const matchesTitle = image.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesContent = image.content.toLowerCase().includes(searchUser.toLowerCase());
      const matchesDate = (!startDate || new Date(image.createdAt) >= new Date(startDate)) &&
                          (!endDate || new Date(image.createdAt) <= new Date(endDate));
      return matchesTitle && matchesContent && matchesDate;
    });
    setFilteredImages(filtered);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setFilteredImages(imageData);
    setCurrentPage(1);
  };

  return selectedImageIndex !== null ? (
    <div ref={scrollRef} className="space-y-8 overflow-auto" style={{ height: '80vh' }}>
      {currentImages.map((image, index) => (
        <ImageDetail key={image.id} image={image} onClick={() => setSelectedImageIndex(null)} />
      ))}
      {renderReturnButton()}
    </div>
  ) : (
    <div className="container mx-auto p-4">
      <div className="pb-5">
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="sort-order"
              checked={sortOrder === 'newest'}
              onCheckedChange={(checked) => handleSortOrderChange(checked ? 'newest' : 'oldest')}
            />
            <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
          </div>
          <div className="flex justify-between items-center">
            <AddToken onReviewAdded={handleReviewAdded} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" />
          </div>
          <div className="flex items-center space-x-2">
            <SearchToken onSearch={handleSearch} onClear={handleClear} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" />
          </div>
          <div className="flex items-center space-x-2">
            <p className="pr-1">Count:</p>
            <TokenCount />
          </div>
        </div>
      </div>


      <div className="grid grid-cols-3 gap-0.5">
        {currentImages.map((image, index) => (
          <div key={image.id} className="cursor-pointer" onClick={() => setSelectedImageIndex(index)}>
            <Image
              src={image.imageUrl}
              alt={image.title}
              width={300}
              height={200}
              layout="responsive"
              objectFit="cover"
            />
          </div>
        ))}
      </div>

      
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={() => paginate(currentPage > 1 ? currentPage - 1 : currentPage)} />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" onClick={() => paginate(currentPage < Math.ceil(filteredImages.length / itemsPerPage) ? currentPage + 1 : currentPage)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default WallT1;





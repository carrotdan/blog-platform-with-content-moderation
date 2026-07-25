import { useState } from 'react';
import { Heart, Bookmark, AlertTriangle, Repeat, Quote, Check } from 'lucide-react';
import { toggleInteraction, bookmarkPost, unbookmarkPost } from '../services/interaction.service';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import ReportModal from './ReportModal';

export default function InteractionBar({ targetId, targetModel, initialLikes = 0, initialBookmarks = 0, initialIsLiked = false, initialIsBookmarked = false, initialShares = 0, initialIsReposted = false }) {
  const [liked, setLiked] = useState(initialIsLiked);
  const [bookmarked, setBookmarked] = useState(initialIsBookmarked);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [bookmarksCount, setBookmarksCount] = useState(initialBookmarks);
  const [sharesCount, setSharesCount] = useState(initialShares);
  const [reposted, setReposted] = useState(initialIsReposted);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleAuthRedirect = (action) => {
    toast.error(`Please login to ${action}`);
    router.push('/login');
  };

  const handleLike = async () => {
    if (!isAuthenticated) return handleAuthRedirect('like stories');
    try {
      const newStatus = !liked;
      setLiked(newStatus);
      setLikesCount(prev => newStatus ? prev + 1 : Math.max(0, prev - 1));
      await toggleInteraction(targetId, targetModel, 'LIKE');
    } catch (error) {
      setLiked(liked);
      setLikesCount(likesCount);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) return handleAuthRedirect('bookmark stories');
    try {
      const newStatus = !bookmarked;
      setBookmarked(newStatus);
      setBookmarksCount(prev => newStatus ? prev + 1 : Math.max(0, prev - 1));
      
      if (newStatus) {
        await bookmarkPost(targetId);
      } else {
        await unbookmarkPost(targetId);
      }
    } catch (error) {
      setBookmarked(bookmarked);
      setBookmarksCount(bookmarksCount);
    }
  };

  const handleRepost = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isAuthenticated) return handleAuthRedirect('repost stories');
    try {
      const api = require('../services/api').default;
      const res = await api.post(`/posts/${targetId}/repost`, {});
      if (res.data.data?.action === 'unreposted') {
        setSharesCount(prev => Math.max(0, prev - 1));
        setReposted(false);
      } else {
        setSharesCount(prev => prev + 1);
        setReposted(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error reposting');
    }
  };

  const handleReport = () => {
    if (!isAuthenticated) return handleAuthRedirect('report stories');
    setIsReportModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between py-4 border-y border-neutral-100 my-6">
        <div className="flex items-center space-x-6">
          <button onClick={handleLike} className={`flex items-center space-x-2 transition-colors ${liked ? 'text-red-500' : 'text-neutral-500 hover:text-red-500'}`}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-500' : ''}`} strokeWidth={1.8} />
            <span className="text-sm font-bold">{likesCount}</span>
          </button>
          <button onClick={handleBookmark} className={`flex items-center space-x-2 transition-colors ${bookmarked ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}>
            <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-neutral-900' : ''}`} strokeWidth={1.8} />
            <span className="text-sm font-bold">{bookmarksCount}</span>
          </button>
          
          {targetModel === 'Post' && (
            <div className="relative">
              <button 
                onClick={() => setShowRepostMenu(!showRepostMenu)} 
                className={`flex items-center space-x-2 transition-colors ${reposted ? 'text-green-600' : 'text-neutral-500 hover:text-green-600'}`}
              >
                <Repeat className={`w-5 h-5`} strokeWidth={1.8} />
                <span className="text-sm font-bold">{sharesCount > 0 ? sharesCount : ''}</span>
              </button>
              
              {showRepostMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRepostMenu(false)}></div>
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden py-1 z-50">
                    <button 
                      onClick={(e) => {
                        setShowRepostMenu(false);
                        handleRepost(e);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-neutral-50 text-sm font-medium text-neutral-700 transition-colors"
                    >
                      {reposted ? <Check className="w-4 h-4 text-green-600" /> : <Repeat className="w-4 h-4" />}
                      <span className={reposted ? "text-green-600 font-bold" : "font-semibold"}>{reposted ? 'Unrepost' : 'Repost'}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setShowRepostMenu(false);
                        toast('Quote feature is coming soon!');
                      }}
                      className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-neutral-50 text-sm font-medium text-neutral-700 transition-colors"
                    >
                      <Quote className="w-4 h-4" />
                      <span className="font-semibold">Quote Repost</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <button onClick={handleReport} className="flex items-center space-x-2 text-neutral-400 hover:text-red-500 transition-colors group">
          <AlertTriangle className="w-4 h-4 group-hover:fill-red-50" />
          <span className="text-xs font-bold uppercase tracking-wider">Report</span>
        </button>
      </div>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        targetId={targetId} 
        targetModel={targetModel} 
      />
    </>
  );
}

"use client";

import Link from 'next/link';
import { useState } from 'react';
import { toggleInteraction, bookmarkPost, unbookmarkPost } from '../services/interaction.service';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Repeat, Quote, Check, Heart, Bookmark, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MediaGrid from './MediaGrid';

export default function PostCard({ post: initialPost }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(initialPost.isLiked);
  const [bookmarked, setBookmarked] = useState(initialPost.isBookmarked);
  const [likesCount, setLikesCount] = useState(initialPost.likesCount || 0);
  const [bookmarksCount, setBookmarksCount] = useState(initialPost.bookmarksCount || 0);
  const [sharesCount, setSharesCount] = useState(initialPost.sharesCount || 0);
  const [revealed, setRevealed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);

  const isRepost = !!initialPost.original_post;
  const displayPost = isRepost ? initialPost.original_post : initialPost;

  const amIAuthorOfRepost = isRepost && isAuthenticated && user?.id === initialPost.author?._id;
  const [reposted, setReposted] = useState(amIAuthorOfRepost || initialPost.isReposted || false);

  if (deleted) return null;

  const handleLike = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login to like stories");
      router.push('/login');
      return;
    }
    try {
      const newStatus = !liked;
      setLiked(newStatus);
      setLikesCount(prev => newStatus ? prev + 1 : Math.max(0, prev - 1));
      await toggleInteraction(initialPost._id, 'Post', 'LIKE');
    } catch { setLiked(liked); setLikesCount(likesCount); }
  };

  const handleBookmark = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login to bookmark stories");
      router.push('/login');
      return;
    }
    try {
      const newStatus = !bookmarked;
      setBookmarked(newStatus);
      setBookmarksCount(prev => newStatus ? prev + 1 : Math.max(0, prev - 1));
      if (newStatus) await bookmarkPost(initialPost._id);
      else await unbookmarkPost(initialPost._id);
    } catch { setBookmarked(bookmarked); setBookmarksCount(bookmarksCount); }
  };

  const handleRepost = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login to repost stories");
      router.push('/login');
      return;
    }
    try {
      const api = require('../services/api').default;
      const res = await api.post(`/posts/${displayPost._id}/repost`, {});
      if (res.data.data?.action === 'unreposted') {
        setSharesCount(prev => Math.max(0, prev - 1));
        setReposted(false);
        if (amIAuthorOfRepost) setDeleted(true);
      } else {
        setSharesCount(prev => prev + 1);
        setReposted(true);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Error reposting'); }
  };

  const plainText = displayPost.content_html
    ? displayPost.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  const hasTitle = displayPost.title && displayPost.title !== 'No Title' && displayPost.title !== 'Untitled';
  const hasMedia = displayPost.media && displayPost.media.length > 0;

  return (
    <article className="premium-card p-6 mb-6 group relative overflow-hidden">
      {/* Sensitive content overlay */}
      {displayPost.is_sensitive && !revealed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-md rounded-2xl p-6 text-center border border-amber-100">
          <AlertTriangle className="w-9 h-9 text-amber-500 mb-2 animate-pulse" />
          <h4 className="text-sm font-bold text-neutral-900 mb-1">Nội dung nhạy cảm</h4>
          <p className="text-xs text-neutral-500 max-w-xs mb-4">
            Bài viết này chứa nội dung nhạy cảm được đánh dấu bởi quản trị viên.
          </p>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setRevealed(true);
            }}
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            Hiển thị nội dung
          </button>
        </div>
      )}

      {/* Repost indicator */}
      {isRepost && (
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-3 font-medium tracking-wide">
          <Repeat className="w-3.5 h-3.5" />
          <Link href={`/u/${initialPost.author?.username}`} className="hover:text-neutral-600 transition-colors">
            {initialPost.author?.username} reposted
          </Link>
        </div>
      )}

      <div>
        {/* ── Author row ── */}
        <div className="flex items-center gap-2 mb-3">
          <Link href={`/u/${displayPost.author?.username}`} className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0 ring-1 ring-neutral-100 hover:opacity-80 transition-opacity">
            {displayPost.author?.avatar ? (
              <img src={displayPost.author.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-500">
                {displayPost.author?.username?.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-1.5 min-w-0">
            <Link href={`/u/${displayPost.author?.username}`} className="text-sm font-semibold text-neutral-800 hover:text-neutral-600 cursor-pointer truncate">
              {displayPost.author?.username}
            </Link>
            <span className="text-neutral-300 text-xs">·</span>
            <span className="text-xs text-neutral-400 whitespace-nowrap">
              {displayPost.createdAt ? formatDistanceToNow(new Date(displayPost.createdAt), { addSuffix: true }) : 'just now'}
            </span>
          </div>
        </div>

        {/* ── Repost quote ── */}
        {isRepost && initialPost.content_html && (
          <p className="text-sm text-neutral-500 italic border-l-2 border-neutral-200 pl-3 mb-3 line-clamp-2">
            {initialPost.content_html.replace(/<[^>]+>/g, '')}
          </p>
        )}

        {/* ── Main content (no title, direct focus on text) ── */}
        <Link href={`/post/${displayPost.slug}`} className="block group/link">
          {plainText && (
            <p className="text-sm sm:text-[15px] text-neutral-500 leading-relaxed line-clamp-3 mb-3">
              {plainText}
            </p>
          )}
        </Link>

        {/* ── Media grid ── */}
        {hasMedia && (
          <div className="mb-4" onClick={e => e.stopPropagation()}>
            <MediaGrid media={displayPost.media} />
          </div>
        )}

        {/* ── Cover image (if no embedded media) ── */}
        {!hasMedia && displayPost.cover_image && (
          <Link href={`/post/${displayPost.slug}`} className="block mb-4">
            <div className="w-full h-48 sm:h-56 rounded-xl overflow-hidden bg-neutral-100">
              <img
                src={displayPost.cover_image}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          </Link>
        )}

        {/* ── Footer row ── */}
        <div className="flex items-center justify-between">
          {/* Tags */}
          <div className="flex items-center gap-2 min-w-0">
            {displayPost.tags?.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="text-xs font-medium text-neutral-500 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-full cursor-pointer transition-colors truncate"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 text-neutral-400">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-red-50 hover:text-red-500 ${liked ? 'text-red-500' : ''}`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 stroke-red-500' : ''}`} strokeWidth={1.8} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>

            {/* Comment */}
            <Link
              href={`/post/${displayPost.slug}#comments`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-neutral-100 hover:text-neutral-700"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
            </Link>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-neutral-100 hover:text-neutral-800 ${bookmarked ? 'text-neutral-900' : ''}`}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-neutral-900 stroke-neutral-900' : ''}`} strokeWidth={1.8} />
              {bookmarksCount > 0 && <span>{bookmarksCount}</span>}
            </button>

            {/* Repost */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setShowRepostMenu(!showRepostMenu); }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-green-50 hover:text-green-600 ${reposted ? 'text-green-600' : ''}`}
              >
                <Repeat className="w-4 h-4" strokeWidth={1.8} />
                {sharesCount > 0 && <span>{sharesCount}</span>}
              </button>

              {showRepostMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={e => { e.preventDefault(); e.stopPropagation(); setShowRepostMenu(false); }} />
                  <div className="absolute bottom-full right-0 mb-2 w-44 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 z-50 overflow-hidden">
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setShowRepostMenu(false); handleRepost(e); }}
                      className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-neutral-50 text-sm text-neutral-700 transition-colors"
                    >
                      {reposted ? <Check className="w-4 h-4 text-green-600" /> : <Repeat className="w-4 h-4" />}
                      <span className={reposted ? 'text-green-600 font-semibold' : 'font-medium'}>{reposted ? 'Unrepost' : 'Repost'}</span>
                    </button>
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setShowRepostMenu(false); alert('Coming soon!'); }}
                      className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-neutral-50 text-sm text-neutral-700 transition-colors"
                    >
                      <Quote className="w-4 h-4" />
                      <span className="font-medium">Quote</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

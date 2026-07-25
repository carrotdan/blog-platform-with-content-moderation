"use client";

import { useEffect, useState } from 'react';
import { getPosts } from '../services/post.service';
import PostCard from '../components/PostCard';
import Link from 'next/link';
import { PenLine, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function SkeletonCard() {
  return (
    <div className="py-7 border-b border-neutral-100 last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="skeleton w-8 h-8 rounded-full" />
        <div className="skeleton w-24 h-3.5 rounded" />
        <div className="skeleton w-16 h-3 rounded" />
      </div>
      <div className="skeleton w-3/4 h-5 rounded mb-2" />
      <div className="skeleton w-full h-3.5 rounded mb-1.5" />
      <div className="skeleton w-5/6 h-3.5 rounded mb-1.5" />
      <div className="skeleton w-2/3 h-3.5 rounded mb-5" />
      <div className="flex items-center gap-3">
        <div className="skeleton w-16 h-3 rounded" />
        <div className="skeleton w-12 h-3 rounded" />
      </div>
    </div>
  );
}

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLimited, setIsLimited] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const res = await getPosts(0, 20, selectedTags);
        setPosts(res.data || []);
        setIsLimited(res.meta?.isLimited || false);
      } catch (error) {
        console.error('Failed to load posts', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [selectedTags, isAuthenticated]);

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  const uniqueTags = Array.from(new Set(posts.flatMap(p => p.tags || []))).slice(0, 12);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-16">

          {/* ── Main column ── */}
          <main className="min-w-0">
            {/* Write CTA – top of feed */}
            {isAuthenticated && (
              <div className="mb-8 pb-6 border-b border-neutral-100">
                <p className="text-base font-semibold text-neutral-800 mb-0.5">Share your thoughts</p>
                <p className="text-sm text-neutral-400 mb-4">
                  Write articles, share ideas, and connect with readers.
                </p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 text-sm font-bold text-white bg-neutral-900 hover:bg-neutral-700 px-5 py-2 rounded-full transition-all"
                >
                  <PenLine className="w-4 h-4" />
                  Start Writing
                </Link>
              </div>
            )}

            {/* Feed */}
            {loading ? (
              <div>
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-neutral-400 text-sm">No posts yet.</p>
                {isAuthenticated && (
                  <Link href="/create" className="mt-4 inline-block text-sm font-semibold text-[#1a8917] hover:underline">
                    Be the first to write →
                  </Link>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="space-y-0">
                  {posts.map(post => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>

                {/* Substack-style Guest Limit Overlay */}
                {!isAuthenticated && isLimited && (
                  <div className="relative mt-10">
                    <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#fafafa] via-[#fafafa]/95 to-transparent z-10" />
                    <div className="relative z-20 py-20 px-6 text-center glass rounded-3xl max-w-lg mx-auto shadow-2xl border border-white">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Lock className="w-8 h-8 text-blue-500" />
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Unlock the full experience</h3>
                      <p className="text-gray-500 mb-8 leading-relaxed text-lg">
                        Join our community of readers to access all stories, follow your favorite writers, and never miss an update.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link 
                          href="/register"
                          className="btn-premium btn-primary px-8 py-3.5 rounded-full text-sm font-bold shadow-blue-500/20 shadow-lg hover:shadow-blue-500/40"
                        >
                          Sign up for free
                        </Link>
                        <Link 
                          href="/login"
                          className="btn-premium btn-secondary px-8 py-3.5 rounded-full text-sm font-bold"
                        >
                          Sign in
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </main>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              {/* Topics */}
              {uniqueTags.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Topics</h3>
                    {selectedTags.length > 0 && (
                      <button 
                        onClick={() => setSelectedTags([])}
                        className="text-[10px] font-bold text-[#1a8917] hover:text-[#156d12] uppercase tracking-tighter"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          selectedTags.includes(tag)
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

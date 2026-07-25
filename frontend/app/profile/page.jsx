"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMyPosts, getBookmarkedPosts } from '../../services/post.service';
import PostCard from '../../components/PostCard';

export default function Profile() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('stories'); // 'stories' or 'bookmarks'
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const fetchData = async (tab) => {
    setFetching(true);
    try {
      const { data } = tab === 'stories' ? await getMyPosts() : await getBookmarkedPosts();
      setPosts(data || []);
    } catch (err) {
      console.error(`Failed to fetch ${tab}:`, err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData(activeTab);
    }
  }, [isAuthenticated, activeTab]);

  if (loading || !isAuthenticated) return null;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 border-b border-gray-100 pb-12 mb-8">
        <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl text-gray-500 font-bold">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
          )}
        </div>
        <div className="text-center md:text-left flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{user?.username || 'User'}</h1>
          <p className="text-gray-500 mb-3">{user?.email}</p>
          
          {/* Trạng thái tài khoản & Điểm vi phạm */}
          <div className="flex flex-wrap gap-2.5 justify-center md:justify-start items-center mb-4">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
              user?.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                : user?.status === 'WARNING'
                ? 'bg-amber-50 text-amber-700 border-amber-200/60 animate-pulse'
                : 'bg-rose-50 text-rose-700 border-rose-200/60'
            }`}>
              Trạng thái: {user?.status === 'ACTIVE' ? 'Hoạt động' : user?.status === 'WARNING' ? 'Cảnh cáo' : user?.status}
            </span>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
              (user?.violationScore || 0) > 0
                ? 'bg-rose-50 text-rose-600 border-rose-100'
                : 'bg-slate-50 text-slate-600 border-slate-200/80'
            }`}>
              Điểm vi phạm: <strong className="font-extrabold">{user?.violationScore || 0}/10</strong>
            </span>
          </div>

          <p className="text-gray-700 italic max-w-lg mx-auto md:mx-0 leading-relaxed">
            {user?.bio || 'No bio provided yet.'}
          </p>
          <div className="mt-6 flex items-center justify-center md:justify-start space-x-6">
            <Link href="/profile/edit" className="text-sm font-semibold text-[#1a8917] hover:text-[#156d12] transition-colors">
              Edit Profile
            </Link>
            <button onClick={logout} className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors">Sign Out</button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-8 border-b border-gray-100 mb-8">
        <button 
          onClick={() => setActiveTab('stories')}
          className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'stories' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Your Stories
          {activeTab === 'stories' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />}
        </button>
        <button 
          onClick={() => setActiveTab('bookmarks')}
          className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'bookmarks' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Saved Stories
          {activeTab === 'bookmarks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />}
        </button>
      </div>

      <div>
        {fetching ? (
          <div className="flex flex-col items-center py-12 gap-3">
             <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
             <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map(post => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-gray-500 py-16 text-center border border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
            <p className="font-medium text-gray-900">No {activeTab} yet</p>
            <p className="text-sm mt-1">
              {activeTab === 'stories' ? "Start writing your first story!" : "Save stories to read them later."}
            </p>
            {activeTab === 'stories' && (
              <Link href="/create" className="mt-4 inline-block bg-gray-900 text-white px-6 py-2 rounded-full text-sm font-medium">
                Write a story
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

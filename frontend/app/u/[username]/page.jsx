"use client";

import { useEffect, useState, use } from 'react';
import { getUserProfile } from '../../../services/user.service';
import { toggleFollow, getFollowers, getFollowing } from '../../../services/follow.service';
import PostCard from '../../../components/PostCard';
import UserListModal from '../../../components/UserListModal';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { UserPlus, UserMinus, MessageCircle, Calendar, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function UserProfile({ params }) {
  const { username } = use(params);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLimited, setIsLimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalUsers, setModalUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const { user: currentUser, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await getUserProfile(username);
        setProfile(data.user);
        setPosts(data.posts || []);
        setIsLimited(data.meta?.isLimited || false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username, isAuthenticated]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to follow users");
      router.push('/login');
      return;
    }

    try {
      setFollowLoading(true);
      const { data } = await toggleFollow(profile.id);
      const isNowFollowing = data.message.includes('followed') && !data.message.includes('unfollowed');
      
      setProfile(prev => ({
        ...prev,
        isFollowing: isNowFollowing,
        followersCount: isNowFollowing 
          ? (prev.followersCount || 0) + 1 
          : Math.max(0, (prev.followersCount || 0) - 1)
      }));

      toast.success(isNowFollowing ? `Followed ${profile.username}` : `Unfollowed ${profile.username}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShowFollowers = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to see followers");
      router.push('/login');
      return;
    }
    setModalTitle('Followers');
    setModalOpen(true);
    setModalLoading(true);
    try {
      const { data } = await getFollowers(profile.id);
      setModalUsers(data.data || data);
    } catch (err) {
      toast.error("Failed to load followers");
    } finally {
      setModalLoading(false);
    }
  };

  const handleShowFollowing = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to see following list");
      router.push('/login');
      return;
    }
    setModalTitle('Following');
    setModalOpen(true);
    setModalLoading(true);
    try {
      const { data } = await getFollowing(profile.id);
      setModalUsers(data.data || data);
    } catch (err) {
      toast.error("Failed to load following list");
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto py-20 text-center">
      <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-neutral-500 text-sm">Loading profile...</p>
    </div>
  );

  if (error) return (
    <div className="max-w-3xl mx-auto py-20 text-center">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">User not found</h1>
      <p className="text-neutral-500 mb-6">{error}</p>
      <button 
        onClick={() => router.push('/')}
        className="text-sm font-semibold text-neutral-900 border border-neutral-200 px-6 py-2 rounded-full hover:bg-neutral-50 transition-all"
      >
        Go back home
      </button>
    </div>
  );

  const isOwnProfile = currentUser?.id === profile?.id || currentUser?.username === username;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-16">
        
        {/* ── Main content: Posts ── */}
        <main className="min-w-0 order-2 lg:order-1">
          <div className="mb-8 pb-4 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Stories</h2>
          </div>
          
          {posts.length > 0 ? (
            <div className="relative">
              <div className="space-y-2">
                {posts.map(post => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>

              {/* Guest Limit Overlay */}
              {!isAuthenticated && isLimited && (
                <div className="relative mt-10">
                  <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#fafafa] via-[#fafafa]/95 to-transparent z-10" />
                  <div className="relative z-20 py-16 px-6 text-center glass rounded-3xl shadow-2xl max-w-lg mx-auto border border-white">
                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                      <Lock className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Keep reading from {profile.username}</h3>
                    <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                      Follow this writer and others to get unlimited access to their latest stories and newsletters.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link 
                        href="/register"
                        className="btn-premium btn-primary px-8 py-3 rounded-full text-sm font-bold shadow-blue-500/20 shadow-lg hover:shadow-blue-500/40"
                      >
                        Sign up for free
                      </Link>
                      <Link 
                        href="/login"
                        className="btn-premium btn-secondary px-8 py-3 rounded-full text-sm font-bold"
                      >
                        Sign in
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center border border-dashed border-neutral-100 rounded-2xl bg-neutral-50/50">
              <p className="text-neutral-400 text-sm">No stories published yet.</p>
            </div>
          )}
        </main>

        {/* ── Sidebar: User Info ── */}
        <aside className="order-1 lg:order-2">
          <div className="sticky top-24 space-y-8">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 border border-neutral-100 mb-5 shadow-sm">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-neutral-400">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Identity */}
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">{profile.username}</h1>
              <div className="flex items-center gap-1.5 text-neutral-400 text-sm mb-4">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {profile.createdAt ? format(new Date(profile.createdAt), 'MMMM yyyy') : 'Recently'}</span>
              </div>

              {/* Bio */}
              <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                {profile.bio || "This user hasn't written a bio yet."}
              </p>

              {/* Actions */}
              {!isOwnProfile ? (
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                      profile.isFollowing 
                        ? 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50' 
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {profile.isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                  <button 
                    onClick={async () => {
                      if (!isAuthenticated) {
                        toast.error("Please login to send messages");
                        router.push('/login');
                        return;
                      }
                      try {
                        const { createConversation } = require('../../../services/message.service');
                        const { data } = await createConversation(profile.id);
                        router.push(`/messages/${data.data._id}`);
                      } catch (err) {
                        toast.error("Could not open messages");
                      }
                    }}
                    className="flex items-center justify-center gap-2 border border-neutral-200 text-neutral-700 px-6 py-2.5 rounded-full text-sm font-bold hover:bg-neutral-50 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => router.push('/profile/edit')}
                  className="w-full text-center border border-neutral-200 text-neutral-700 px-6 py-2.5 rounded-full text-sm font-bold hover:bg-neutral-50 transition-all"
                >
                  Edit profile
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="pt-8 border-t border-neutral-100">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-lg font-bold text-neutral-900">{posts.length}</p>
                  <p className="text-xs text-neutral-400 uppercase font-semibold">Posts</p>
                </div>
                <button onClick={handleShowFollowers} className="text-left hover:opacity-70 transition-opacity">
                  <p className="text-lg font-bold text-neutral-900">{profile.followersCount || 0}</p>
                  <p className="text-xs text-neutral-400 uppercase font-semibold">Followers</p>
                </button>
                <button onClick={handleShowFollowing} className="text-left hover:opacity-70 transition-opacity">
                  <p className="text-lg font-bold text-neutral-900">{profile.followingCount || 0}</p>
                  <p className="text-xs text-neutral-400 uppercase font-semibold">Following</p>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <UserListModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalTitle}
          users={modalUsers}
          loading={modalLoading}
        />
      </div>
    </div>
  );
}

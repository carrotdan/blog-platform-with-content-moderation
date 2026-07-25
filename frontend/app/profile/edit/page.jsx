"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { updateProfile } from '../../../services/user.service';
import { useRouter } from 'next/navigation';

export default function EditProfile() {
  const { user, login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setAvatar(user.avatar || '');
      setBio(user.bio || '');
      setUsername(user.username || '');
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await updateProfile({ avatar, bio, username });
      // res.data is the updated user object from the server
      const updatedUser = res.data;

      // Normalize to the same shape stored at login time
      const normalizedUser = {
        id: updatedUser.id || updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar || '',
        bio: updatedUser.bio || ''
      };

      // Update context + localStorage
      login(normalizedUser);
      router.push('/profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <h1 className="text-3xl font-bold font-serif text-gray-900 mb-8">Edit Profile</h1>
      
      {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a8917] focus:border-[#1a8917]"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
          <input
            type="url"
            placeholder="https://example.com/avatar.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a8917] focus:border-[#1a8917]"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
          />
          {avatar && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-xs text-gray-500">Preview:</span>
              <img src={avatar} alt="Preview" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1a8917] focus:border-[#1a8917] resize-none"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button 
            type="button" 
            onClick={() => router.push('/profile')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-[#1a8917] text-white rounded-full font-medium hover:bg-[#156d12] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

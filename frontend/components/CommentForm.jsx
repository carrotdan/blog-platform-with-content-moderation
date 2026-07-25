"use client";

import { useState } from 'react';
import { createComment } from '../services/comment.service';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function CommentForm({ postId, parentId = null, onSuccess }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!isAuthenticated) {
      toast.error("Please login to comment");
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment(postId, content, parentId);
      setContent('');
      toast.success("Comment posted!");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 text-center">
        <p className="text-sm text-neutral-600 mb-4">Join the conversation</p>
        <Link 
          href="/login" 
          className="inline-block bg-neutral-900 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-neutral-800 transition-all"
        >
          Sign in to respond
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
      <textarea
        rows="3"
        className="w-full text-sm text-neutral-900 bg-transparent border-0 focus:ring-0 placeholder-neutral-400 resize-none outline-none"
        placeholder="What are your thoughts?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <div className="flex items-center justify-end border-t border-neutral-100 pt-3 mt-2">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="inline-flex items-center py-2 px-6 text-sm font-bold text-white bg-neutral-900 rounded-full hover:bg-neutral-800 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? 'Posting...' : 'Respond'}
        </button>
      </div>
    </form>
  );
}

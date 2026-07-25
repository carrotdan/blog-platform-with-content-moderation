"use client";

import { useState, useEffect } from 'react';
import { getAllPosts, hidePost, unhidePost, markSensitive, unmarkSensitive, deletePostByAdmin } from '../../../services/admin.service';
import Link from 'next/link';

const VISIBILITY_STYLE = {
  PUBLIC: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  HIDDEN: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  PRIVATE: { bg: 'rgba(107,114,128,0.2)', color: '#9ca3af' },
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await getAllPosts();
      setPosts(res.data || []);
    } catch {
      showToast('Failed to load posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleHide = async (id) => {
    if (!confirm(`Hide this post?`)) return;
    setActionLoading(id);
    try {
      await hidePost(id);
      showToast('Post hidden successfully');
      fetchPosts();
    } catch {
      showToast('Failed to hide post', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnhide = async (id) => {
    if (!confirm(`Restore this post?`)) return;
    setActionLoading(id);
    try {
      await unhidePost(id);
      showToast('Post restored successfully');
      fetchPosts();
    } catch {
      showToast('Failed to restore post', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSensitive = async (id, isSensitive) => {
    setActionLoading(id);
    try {
      if (isSensitive) {
        await unmarkSensitive(id);
        showToast('Sensitive mark removed');
      } else {
        await markSensitive(id);
        showToast('Post marked as sensitive');
      }
      fetchPosts();
    } catch {
      showToast('Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePost = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn bài viết này không?')) return;
    setActionLoading(id);
    try {
      await deletePostByAdmin(id);
      showToast('Xóa bài viết thành công');
      fetchPosts();
    } catch {
      showToast('Xóa bài viết thất bại', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getPlainText = (html) => html?.replace(/<[^>]+>/g, '').slice(0, 80) || 'No content';

  const filtered = posts.filter(p => {
    const searchLower = search.toLowerCase();
    const contentText = getPlainText(p.content_html).toLowerCase();
    return !search || contentText.includes(searchLower) || p.author?.email?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl" style={{ background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`, color: toast.type === 'error' ? '#f87171' : '#34d399' }}>
          {toast.msg}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-white">Content Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">{posts.length} total posts on platform</p>
      </div>

      <div className="relative">
        <input type="text" placeholder="Search by title or author email..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-4 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="col-span-6">Content Preview</div>
          <div className="col-span-3">Author</div>
          <div className="col-span-2 text-center">Visibility</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading posts...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500">No posts found.</div>
        ) : (
          filtered.map((post, idx) => {
            const visStyle = VISIBILITY_STYLE[post.visibility] || VISIBILITY_STYLE.PRIVATE;
            return (
              <div key={post._id} className="grid grid-cols-12 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors" style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="col-span-6 pr-4">
                  <p className="text-white text-sm font-medium line-clamp-1">{getPlainText(post.content_html)}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-slate-300 text-sm truncate">{post.author?.username || post.author?.email}</p>
                </div>
                <div className="col-span-2 flex flex-col items-center gap-1">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: visStyle.bg, color: visStyle.color }}>{post.visibility}</span>
                  {post.is_sensitive && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-tight">Sensitive</span>
                  )}
                </div>
                 <div className="col-span-1 flex justify-end gap-1.5">
                   <button onClick={() => handleToggleSensitive(post._id, post.is_sensitive)} disabled={actionLoading === post._id} title={post.is_sensitive ? "Remove Sensitive Mark" : "Mark as Sensitive"} className={`p-1.5 rounded-lg transition-colors ${post.is_sensitive ? 'text-amber-500 hover:bg-amber-500/10' : 'text-slate-500 hover:bg-slate-500/10'}`}>
                      <svg className="w-4 h-4" fill={post.is_sensitive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" /></svg>
                   </button>
                   {post.visibility === 'PUBLIC' && (
                     <button onClick={() => handleHide(post._id)} disabled={actionLoading === post._id} title="Hide Post" className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                     </button>
                   )}
                   {post.visibility === 'HIDDEN' && (
                     <button onClick={() => handleUnhide(post._id)} disabled={actionLoading === post._id} title="Restore Post" className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                     </button>
                   )}
                   <button onClick={() => handleDeletePost(post._id)} disabled={actionLoading === post._id} title="Delete Post" className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

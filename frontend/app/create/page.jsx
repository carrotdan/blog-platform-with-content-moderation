"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Video, X, Loader2 } from 'lucide-react';
import api from '../../services/api';

// ── Thumb: một ô ảnh/video trong grid preview ──────────────────────────────
function Thumb({ item, idx, total, onRemove }) {
  return (
    <div className="relative w-full h-full group bg-gray-200 overflow-hidden">
      {item.type === 'IMAGE' ? (
        <img src={item.url} className="w-full h-full object-cover" alt="" />
      ) : (
        <>
          <video src={item.url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/25">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1" />
            </div>
          </div>
        </>
      )}

      {/* Nút xóa – hiện khi hover */}
      <button
        type="button"
        onClick={() => onRemove(idx)}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg"
      >
        <X size={15} strokeWidth={2.5} />
      </button>

      {/* Số thứ tự */}
      <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all pointer-events-none select-none">
        {idx + 1}/{total}
      </div>
    </div>
  );
}

// ── PreviewGrid: layout giống Facebook ─────────────────────────────────────
function PreviewGrid({ previews, onRemove }) {
  const n = previews.length;
  if (n === 0) return null;

  const T = (idx) => (
    <Thumb key={idx} item={previews[idx]} idx={idx} total={n} onRemove={onRemove} />
  );

  let grid;

  if (n === 1) {
    grid = (
      <div className="h-72 sm:h-[420px] rounded-xl overflow-hidden border border-gray-100">
        {T(0)}
      </div>
    );
  } else if (n === 2) {
    grid = (
      <div className="grid grid-cols-2 gap-0.5 h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-100">
        {T(0)}{T(1)}
      </div>
    );
  } else if (n === 3) {
    grid = (
      <div className="grid grid-cols-2 gap-0.5 h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-100">
        {T(0)}
        <div className="grid grid-rows-2 gap-0.5 h-full">
          {T(1)}{T(2)}
        </div>
      </div>
    );
  } else if (n === 4) {
    grid = (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-100">
        {T(0)}{T(1)}{T(2)}{T(3)}
      </div>
    );
  } else {
    // 5+: cột trái 2 ô, cột phải 3 ô, ô cuối cùng có overlay
    grid = (
      <div className="grid grid-cols-2 gap-0.5 h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-100">
        <div className="grid grid-rows-2 gap-0.5 h-full">
          {T(0)}{T(1)}
        </div>
        <div className="grid grid-rows-3 gap-0.5 h-full">
          {T(2)}{T(3)}
          <div className="relative w-full h-full overflow-hidden">
            {T(4)}
            {n > 5 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xl font-bold pointer-events-none">
                +{n - 5}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400">
          {n} file · hover để xóa từng ảnh
        </span>
        <button
          type="button"
          onClick={() => onRemove('all')}
          className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
        >
          Xóa tất cả
        </button>
      </div>
      {grid}
    </div>
  );
}

// ── CreatePost ──────────────────────────────────────────────────────────────
export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) return null;

  const addFiles = (fileList) => {
    const valid = Array.from(fileList).filter(f => {
      if (f.type.startsWith('video/') && f.size > 100 * 1024 * 1024) return false;
      if (f.type.startsWith('image/') && f.size > 10 * 1024 * 1024) return false;
      return f.type.startsWith('image/') || f.type.startsWith('video/');
    });
    const newPreviews = valid.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
    }));
    setMediaFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeMedia = (idx) => {
    if (idx === 'all') {
      setMediaFiles([]);
      setPreviews([]);
      return;
    }
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!content && mediaFiles.length === 0) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', ''); // No title requested by user
      fd.append('content', content);
      fd.append('content_html', `<p>${content.replace(/\n/g, '<br/>')}</p>`);
      fd.append('content_json', JSON.stringify({ text: content }));
      fd.append('visibility', visibility);
      tags.split(',').filter(t => t.trim()).forEach(t => fd.append('tags', t.trim()));
      mediaFiles.forEach(f => fd.append('media', f));

      const { data } = await api.post('/posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.push(`/post/${data.data.slug}`);
    } catch (err) {
      alert('Đăng bài thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`max-w-3xl mx-auto py-10 px-4 sm:px-0 transition-all duration-200 ${isDragging ? 'scale-[0.99]' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
      onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
    >
      <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative ${isDragging ? 'border-green-400 border-2' : 'border-gray-100'}`}>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-green-50/95 z-50 flex flex-col items-center justify-center border-4 border-dashed border-green-400 rounded-2xl">
            <ImageIcon size={56} className="text-green-500 mb-3 animate-bounce" />
            <p className="text-2xl font-bold text-green-700">Thả ảnh / video vào đây</p>
            <p className="text-green-600 text-sm mt-1">Hỗ trợ JPG, PNG, GIF, MP4, MOV...</p>
          </div>
        )}

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/40">
          <div className="flex items-center space-x-3">
            {user?.avatar ? (
              <img src={user.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-white" alt="" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center ring-2 ring-white">
                <span className="text-white font-bold text-lg">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{user?.username || 'You'}</p>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
                className="text-xs font-semibold text-gray-500 bg-transparent border-none p-0 cursor-pointer focus:ring-0 mt-0.5"
              >
                <option value="PUBLIC">🌍 Public</option>
                <option value="PRIVATE">🔒 Private</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content && mediaFiles.length === 0)}
            className="bg-[#1a8917] hover:bg-[#156d12] disabled:opacity-40 text-white px-6 py-2 rounded-full font-bold text-sm transition-all shadow active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Đang đăng...</> : 'Đăng bài'}
          </button>
        </div>

        {/* ── Editor ── */}
        <div className="p-6 pb-2">
          <input
            type="text"
            placeholder="Tags (ví dụ: công nghệ, cuộc sống)..."
            className="w-full text-sm font-medium text-gray-400 placeholder-gray-300 bg-transparent border-none focus:ring-0 px-0 outline-none mb-4"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />

          <textarea
            placeholder="Bạn đang nghĩ gì?"
            className="w-full text-base sm:text-lg text-gray-800 placeholder-gray-300 border-none focus:ring-0 px-0 outline-none resize-none leading-relaxed min-h-[120px]"
            value={content}
            onChange={e => {
              setContent(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />

          {/* ── Preview Grid ── */}
          <PreviewGrid previews={previews} onRemove={removeMedia} />
        </div>

        {/* ── Toolbar ── */}
        <div className="px-6 py-3 mt-2 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-400 mr-auto">Thêm vào bài viết</span>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Thêm ảnh"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-200 text-green-600 transition-colors text-sm font-medium"
          >
            <ImageIcon size={20} strokeWidth={2} />
            Ảnh
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Thêm video"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-200 text-blue-600 transition-colors text-sm font-medium"
          >
            <Video size={20} strokeWidth={2} />
            Video
          </button>

          <input
            type="file"
            multiple
            hidden
            ref={fileInputRef}
            accept="image/*,video/*"
            onChange={e => addFiles(e.target.files)}
          />
        </div>
      </div>
    </div>
  );
}

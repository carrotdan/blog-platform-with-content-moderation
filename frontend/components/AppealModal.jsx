"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X, AlertTriangle, CheckCircle, Loader2, FileText, MessageSquare } from 'lucide-react';
import api from '../services/api';

export default function AppealModal({ target, onClose, onSuccess }) {
  const [reason, setReason]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState('');
  const [displayContent, setDisplayContent] = useState(null);
  const [fetchingContent, setFetchingContent] = useState(true);

  const { entity_id, entity_model, ai_label, spam_score, toxicity_score, content_preview } = target;
  const targetType = entity_model === 'Post' ? 'bài viết' : 'bình luận';
  const scoreValue = ai_label === 'SPAM' ? spam_score : toxicity_score;
  const scorePct   = Math.round((scoreValue || 0) * 100);
  const isSpam     = ai_label === 'SPAM';

  useEffect(() => {
    const fetchContent = async () => {
      // Nếu không có entity_id, dùng content_preview từ metadata
      if (!entity_id) {
        setDisplayContent(content_preview || null);
        setFetchingContent(false);
        return;
      }
      try {
        let text = '';
        if (entity_model === 'Post') {
          const res = await api.get(`/posts/${entity_id}/content`);
          const post = res.data.data;
          const title = post.title && post.title !== 'No Title' ? post.title : '';
          const body  = post.content_html
            ? post.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            : '';
          text = [title, body].filter(Boolean).join('\n').trim();
        } else {
          const res = await api.get(`/comments/${entity_id}`);
          text = res.data.data?.content || '';
        }
        setDisplayContent(text || content_preview || null);
      } catch {
        setDisplayContent(content_preview || null);
      } finally {
        setFetchingContent(false);
      }
    };
    fetchContent();
  }, [entity_id, entity_model, content_preview]);

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      setError('Vui lòng nhập lý do kháng cáo (tối thiểu 10 ký tự).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/appeals', {
        target_id: entity_id,
        target_model: entity_model,
        ai_label,
        ai_spam_score: spam_score || 0,
        ai_toxicity_score: toxicity_score || 0,
        reason: reason.trim()
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Portal: render vào document.body để thoát khỏi stacking context của navbar
  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-gray-900 text-base">Gửi kháng cáo</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Đã gửi kháng cáo!</h3>
            <p className="text-sm text-gray-500 mb-5">
              Admin sẽ xem xét và thông báo kết quả sớm nhất có thể.
            </p>
            <a href="/appeals" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
              Xem kháng cáo của tôi →
            </a>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">

            {/* 1. AI verdict */}
            <div className={`rounded-xl p-4 flex gap-3 ${isSpam ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isSpam ? 'text-yellow-500' : 'text-red-500'}`} />
              <div>
                <p className={`text-sm font-semibold ${isSpam ? 'text-yellow-800' : 'text-red-800'}`}>
                  {targetType.charAt(0).toUpperCase() + targetType.slice(1)} của bạn bị hệ thống phát hiện là{' '}
                  <span className="font-black">{ai_label || 'vi phạm'}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Độ tin cậy: <span className="font-semibold">{scorePct}%</span> · Nội dung đã bị ẩn
                </p>
              </div>
            </div>

            {/* 2. Nội dung gốc */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                {entity_model === 'Post'
                  ? <FileText className="w-4 h-4 text-gray-400" />
                  : <MessageSquare className="w-4 h-4 text-gray-400" />}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {entity_model === 'Post' ? 'Bài viết bạn đã đăng' : 'Bình luận bạn đã viết'}
                </p>
              </div>
              <div className="px-4 py-3 min-h-[52px]">
                {fetchingContent ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-4/5" />
                  </div>
                ) : displayContent ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {displayContent.slice(0, 400)}
                    {displayContent.length > 400 && <span className="text-gray-400 italic"> ...(rút gọn)</span>}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Không thể tải nội dung gốc.</p>
                )}
              </div>
            </div>

            {/* 3. Lý do kháng cáo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lý do kháng cáo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Giải thích tại sao bạn cho rằng AI đã nhận định sai về nội dung này..."
                rows={3}
                maxLength={500}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none"
              />
              <div className="flex justify-between mt-1">
                {error && <p className="text-xs text-red-500">{error}</p>}
                <p className="text-xs text-gray-400 ml-auto">{reason.length}/500</p>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              📌 Admin sẽ xem xét trong vòng 24 giờ và thông báo kết quả qua hệ thống.
            </p>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Huỷ
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !reason.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</> : 'Gửi kháng cáo'}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}

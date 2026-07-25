"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ShieldAlert, CheckCircle, XCircle, Clock, FileText, MessageSquare } from 'lucide-react';
import Link from 'next/link';

function StatusCard({ appeal }) {
  const statusConfig = {
    PENDING:  { icon: <Clock className="w-4 h-4" />, color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', label: 'Đang chờ xét' },
    APPROVED: { icon: <CheckCircle className="w-4 h-4" />, color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', label: 'Được chấp nhận' },
    REJECTED: { icon: <XCircle className="w-4 h-4" />, color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: 'Bị từ chối' },
  };
  const cfg = statusConfig[appeal.status] || statusConfig.PENDING;
  const isPost = appeal.target_model === 'Post';

  // Lấy nội dung gốc
  const originalContent = isPost
    ? (appeal.target_id?.title
        ? `${appeal.target_id.title}\n\n${appeal.target_id?.content_html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''}`
        : appeal.target_id?.content_html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Nội dung không còn khả dụng')
    : (appeal.target_id?.content || 'Nội dung không còn khả dụng');

  const aiScorePct = Math.round(
    (appeal.ai_label === 'SPAM' ? appeal.ai_spam_score : appeal.ai_toxicity_score) * 100
  );

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">

      {/* Status bar */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
        <div className="flex items-center gap-2" style={{ color: cfg.color }}>
          {cfg.icon}
          <span className="text-sm font-bold">{cfg.label}</span>
        </div>
        <span className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(appeal.createdAt), { addSuffix: true, locale: vi })}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Thông tin AI phán quyết */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: isPost ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)',
              color: isPost ? '#818cf8' : '#fbbf24'
            }}>
            {isPost ? <FileText className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
            {isPost ? 'Bài viết' : 'Bình luận'}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: appeal.ai_label === 'SPAM' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              color: appeal.ai_label === 'SPAM' ? '#fbbf24' : '#f87171'
            }}>
            <ShieldAlert className="w-3.5 h-3.5" />
            AI phát hiện: {appeal.ai_label}
          </div>
          <span className="text-xs text-gray-400">Độ tin cậy: <strong className="text-gray-700">{aiScorePct}%</strong></span>
        </div>

        {/* Nội dung gốc của user */}
        <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {isPost ? '📝 Bài viết của bạn' : '💬 Bình luận của bạn'}
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {originalContent}
          </p>
        </div>

        {/* Lý do kháng cáo của user */}
        <div className="rounded-xl p-4" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
          <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">🗣️ Lý do kháng cáo của bạn</p>
          <p className="text-sm text-gray-700 italic">"{appeal.reason}"</p>
        </div>

        {/* Kết quả (nếu đã xử lý) */}
        {appeal.status !== 'PENDING' && (
          <div className="rounded-xl p-4"
            style={{
              background: appeal.status === 'APPROVED' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${appeal.status === 'APPROVED' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
            }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: appeal.status === 'APPROVED' ? '#34d399' : '#f87171' }}>
              {appeal.status === 'APPROVED' ? '✅ Phản hồi từ Admin' : '❌ Phản hồi từ Admin'}
            </p>
            <p className="text-sm text-gray-700">
              {appeal.admin_note || (appeal.status === 'APPROVED'
                ? 'Nội dung của bạn đã được khôi phục và hiển thị lại bình thường.'
                : 'Kháng cáo không được chấp nhận sau khi xem xét.')}
            </p>
          </div>
        )}

        {/* PENDING: thông báo đang chờ */}
        {appeal.status === 'PENDING' && (
          <p className="text-xs text-gray-400 text-center">
            ⏳ Admin sẽ xem xét và phản hồi trong vòng 24 giờ
          </p>
        )}
      </div>
    </div>
  );
}

export default function MyAppealsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/appeals/my')
      .then(res => setAppeals(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const pending  = appeals.filter(a => a.status === 'PENDING').length;
  const approved = appeals.filter(a => a.status === 'APPROVED').length;
  const rejected = appeals.filter(a => a.status === 'REJECTED').length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-flex items-center gap-1">
            ← Về trang chủ
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Kháng cáo của tôi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Xem lại nội dung bạn đã kháng cáo và kết quả từ admin
          </p>

          {/* Stats */}
          {appeals.length > 0 && (
            <div className="flex gap-4 mt-4">
              {pending  > 0 && <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">⏳ {pending} đang chờ</span>}
              {approved > 0 && <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">✅ {approved} được chấp nhận</span>}
              {rejected > 0 && <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">❌ {rejected} bị từ chối</span>}
            </div>
          )}
        </div>

        {appeals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">Chưa có kháng cáo nào</p>
            <p className="text-sm text-gray-400 mt-1">
              Khi nội dung của bạn bị hệ thống flag, bạn có thể gửi kháng cáo từ thông báo.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {appeals.map(appeal => (
              <StatusCard key={appeal._id} appeal={appeal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

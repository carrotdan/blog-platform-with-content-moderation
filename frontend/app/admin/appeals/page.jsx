"use client";

import { useState, useEffect } from 'react';
import { getPendingAppeals, getAllAppeals, approveAppeal, rejectAppeal } from '../../../services/appeal.service';

function StatusBadge({ status }) {
  const styles = {
    PENDING:  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'Chờ duyệt' },
    APPROVED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Chấp nhận' },
    REJECTED: { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', label: 'Từ chối' },
  };
  const s = styles[status] || styles.PENDING;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function ScoreBadge({ label, score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#34d399';
  const bg   = pct > 70 ? 'rgba(239,68,68,0.12)' : pct > 40 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)';
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: bg, color }}>
      {label}: {pct}%
    </span>
  );
}

export default function AdminAppealsPage() {
  const [appeals, setAppeals]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('PENDING'); // PENDING | ALL
  const [actionLoading, setActionLoading] = useState(null);
  const [noteInputs, setNoteInputs]   = useState({});
  const [toast, setToast]             = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const res = filter === 'PENDING' ? await getPendingAppeals() : await getAllAppeals();
      setAppeals(res.data || []);
    } catch {
      showToast('Không thể tải danh sách kháng cáo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppeals(); }, [filter]);

  const handleApprove = async (id) => {
    setActionLoading(id + 'approve');
    try {
      await approveAppeal(id, noteInputs[id] || '');
      showToast('✅ Kháng cáo đã được chấp nhận. Nội dung được khôi phục.');
      fetchAppeals();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi khi chấp nhận kháng cáo', 'error');
    } finally { setActionLoading(null); }
  };

  const handleReject = async (id) => {
    setActionLoading(id + 'reject');
    try {
      await rejectAppeal(id, noteInputs[id] || '');
      showToast('❌ Kháng cáo đã bị từ chối.');
      fetchAppeals();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi khi từ chối kháng cáo', 'error');
    } finally { setActionLoading(null); }
  };

  const pendingCount = appeals.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl"
          style={{
            background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            color: toast.type === 'error' ? '#f87171' : '#34d399'
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Kháng cáo kiểm duyệt AI</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Xem xét và giải quyết kháng cáo của người dùng về quyết định AI
          </p>
        </div>
        <div className="flex gap-2">
          {['PENDING', 'ALL'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={filter === f
                ? { background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.4)' }
                : { background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {f === 'PENDING' ? `Chờ duyệt ${pendingCount > 0 ? `(${pendingCount})` : ''}` : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">Đang tải kháng cáo...</div>
      ) : appeals.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-white font-semibold">Không có kháng cáo nào!</p>
          <p className="text-slate-500 text-sm mt-1">
            {filter === 'PENDING' ? 'Không có kháng cáo chờ xử lý.' : 'Chưa có kháng cáo nào được gửi.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map(appeal => (
            <div
              key={appeal._id}
              className="rounded-2xl p-5 space-y-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Row 1: user + status + scores */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                    {appeal.user_id?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{appeal.user_id?.username}</p>
                    <p className="text-slate-500 text-xs">{appeal.user_id?.email}</p>
                  </div>
                </div>
                <StatusBadge status={appeal.status} />
                <span className="px-2.5 py-1 rounded-full text-xs font-bold ml-auto"
                  style={{ background: appeal.target_model === 'Post' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)', color: appeal.target_model === 'Post' ? '#818cf8' : '#fbbf24' }}>
                  {appeal.target_model}
                </span>
                <ScoreBadge label="SPAM"  score={appeal.ai_spam_score} />
                <ScoreBadge label="TOXIC" score={appeal.ai_toxicity_score} />
                <span className="px-2.5 py-1 rounded-full text-xs font-black"
                  style={{ background: appeal.ai_label === 'SPAM' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', color: appeal.ai_label === 'SPAM' ? '#fbbf24' : '#f87171' }}>
                  AI: {appeal.ai_label}
                </span>
              </div>

              {/* Nội dung bị flag */}
              {appeal.target_id && (
                <div className="p-3 rounded-xl text-sm text-slate-300"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Nội dung bị flag:</p>
                  <p className="line-clamp-3">
                    {appeal.target_model === 'Post'
                      ? (appeal.target_id.content_html?.replace(/<[^>]+>/g, '') || appeal.target_id.title || 'Không có nội dung')
                      : (appeal.target_id.content || 'Nội dung không khả dụng')}
                  </p>
                </div>
              )}

              {/* Lý do kháng cáo */}
              <div className="p-3 rounded-xl text-sm"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <p className="text-xs text-violet-400 mb-1 uppercase font-bold tracking-wider">Lý do kháng cáo:</p>
                <p className="text-slate-200 italic">"{appeal.reason}"</p>
              </div>

              {/* Admin note + actions (chỉ hiện khi PENDING) */}
              {appeal.status === 'PENDING' ? (
                <div className="space-y-3 pt-1">
                  <textarea
                    value={noteInputs[appeal._id] || ''}
                    onChange={(e) => setNoteInputs(prev => ({ ...prev, [appeal._id]: e.target.value }))}
                    placeholder="Ghi chú của admin (tuỳ chọn)..."
                    rows={2}
                    className="w-full rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(appeal._id)}
                      disabled={!!actionLoading}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' }}
                    >
                      ✅ Chấp nhận — Khôi phục nội dung
                    </button>
                    <button
                      onClick={() => handleReject(appeal._id)}
                      disabled={!!actionLoading}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                    >
                      ❌ Từ chối kháng cáo
                    </button>
                  </div>
                </div>
              ) : (
                /* Hiện kết quả đã xử lý */
                appeal.admin_note && (
                  <div className="p-3 rounded-xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Ghi chú admin:</p>
                    <p className="text-slate-400">{appeal.admin_note}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Xử lý bởi: {appeal.reviewed_by?.username || appeal.reviewed_by?.email || 'Admin'}
                    </p>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

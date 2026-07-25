"use client";

import { useState, useEffect } from 'react';
import { getModerationQueue, approveModerationItem, hideModerationItem } from '../../../services/moderation.service';
import { ShieldAlert, CheckCircle, Trash2, Clock } from 'lucide-react';

function RiskBadge({ score, label }) {
  const pct = Math.round((score ?? 0) * 100);
  const color = pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#34d399';
  const bg    = pct > 70 ? 'rgba(239,68,68,0.15)' : pct > 40 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: bg, color }}>{pct}%</span>
    </div>
  );
}

export default function ModerationQueue() {
  const [queue, setQueue]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast]               = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getModerationQueue();
      setQueue(res.data || []);
    } catch {
      showToast('Không tải được hàng đợi kiểm duyệt', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleAction = async (action, id) => {
    setActionLoading(id + action);
    try {
      if (action === 'APPROVE') {
        await approveModerationItem(id);
        showToast('✅ Đã cho phép — nội dung hiển thị bình thường');
      } else if (action === 'DELETE') {
        await hideModerationItem(id);
        showToast('🗑️ Đã xóa — nội dung bị ẩn hoàn toàn');
      }
      fetchQueue();
    } catch {
      showToast(`Lỗi khi thực hiện thao tác`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getContent = (item) => {
    if (item.target_model === 'Post') {
      const title = item.target_id?.title;
      const body  = item.target_id?.content_html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return title ? `${title}\n${body || ''}` : (body || 'Không có nội dung');
    }
    return item.target_id?.content || 'Nội dung không khả dụng';
  };

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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-violet-400" />
            Moderation Queue
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Nội dung bị hệ thống flag — chờ admin xem xét</p>
        </div>
        {queue.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-xs font-semibold">{queue.length} chờ xử lý</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">Đang tải...</div>
      ) : queue.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3 opacity-60" />
          <p className="text-white font-semibold">Hàng đợi sạch!</p>
          <p className="text-slate-500 text-sm">Không có nội dung nào cần xem xét.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(item => (
            <div
              key={item._id}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Header: badges + scores */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: item.target_model === 'Post' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                    color: item.target_model === 'Post' ? '#818cf8' : '#fbbf24'
                  }}>
                  {item.target_model}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: item.reason?.includes('TOXIC') ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    color: item.reason?.includes('TOXIC') ? '#f87171' : '#fbbf24'
                  }}>
                  {item.reason}
                </span>
                <div className="flex items-center gap-3 ml-auto">
                  <RiskBadge score={item.spam_score ?? 0} label="Spam" />
                  <RiskBadge score={item.toxicity_score ?? 0} label="Toxic" />
                </div>
              </div>

              {/* Nội dung — hiển thị thẳng, không blur */}
              <div className="p-4 rounded-xl mb-4 whitespace-pre-wrap"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Nội dung bị flag:</p>
                <p className="text-slate-200 text-sm leading-relaxed line-clamp-5">{getContent(item)}</p>
              </div>

              {/* 2 nút: Cho phép hoặc Xóa */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('APPROVE', item._id)}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  {actionLoading === item._id + 'APPROVE'
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle className="w-4 h-4" />}
                  Cho phép
                </button>
                <button
                  onClick={() => handleAction('DELETE', item._id)}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  {actionLoading === item._id + 'DELETE'
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

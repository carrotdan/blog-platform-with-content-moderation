"use client";

import { useState, useEffect } from 'react';
import { getViolations, muteUser, banUser, resetScore } from '../../../services/admin.service';

const STATUS_STYLES = {
  ACTIVE: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  MUTED: { bg: 'rgba(107,114,128,0.2)', color: '#9ca3af' },
  WARNING: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  BANNED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
};

export default function ViolationsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const res = await getViolations();
      setUsers(res.data || []);
    } catch {
      showToast('Failed to load violations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchViolations(); }, []);

  const handleAction = async (action, id) => {
    setActionLoading(id + action);
    try {
      if (action === 'BAN') await banUser(id);
      if (action === 'MUTE') await muteUser(id);
      if (action === 'RESET') await resetScore(id);
      showToast(`Action "${action}" applied successfully`);
      fetchViolations();
    } catch {
      showToast(`Failed to ${action} user`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(u => filter === 'ALL' || u.status === filter).sort((a, b) => b.violationScore - a.violationScore);

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl" style={{ background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`, color: toast.type === 'error' ? '#f87171' : '#34d399' }}>
          {toast.msg}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-white">Violations Center</h2>
        <p className="text-slate-500 text-sm mt-0.5">Users with high violation scores or restrictive status</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['ALL', 'ACTIVE', 'MUTED', 'BANNED'].map(f => {
          const count = f === 'ALL' ? users.length : users.filter(u => u.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${filter === f ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40' : 'bg-white/5 text-slate-500 border border-white/10 hover:text-slate-300'}`}>
              {f}
              <span className={`px-1.5 rounded ${filter === f ? 'bg-violet-500/30' : 'bg-white/5'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="col-span-4">User</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-center">Spam</div>
          <div className="col-span-2 text-center">Toxic</div>
          <div className="col-span-1 text-center">Score</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading violations...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500">No violations found.</div>
        ) : (
          filtered.map((user, idx) => {
            const statusStyle = STATUS_STYLES[user.status] || STATUS_STYLES.ACTIVE;
            return (
              <div key={user.userId} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors" style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="col-span-4 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user.email}</p>
                </div>
                <div className="col-span-2 flex justify-center">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: statusStyle.bg, color: statusStyle.color }}>{user.status}</span>
                </div>
                <div className="col-span-2 text-center text-slate-400 text-sm font-bold">{user.spamCount ?? 0}</div>
                <div className="col-span-2 text-center text-slate-400 text-sm font-bold">{user.toxicCount ?? 0}</div>
                <div className="col-span-1 text-center font-bold" style={{ color: user.violationScore > 10 ? '#f87171' : user.violationScore > 5 ? '#fbbf24' : '#94a3b8' }}>{user.violationScore ?? 0}</div>
                <div className="col-span-1 flex justify-end gap-1">
                  <button onClick={() => handleAction('MUTE', user.userId)} disabled={user.status === 'MUTED' || !!actionLoading} className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30" title="Mute user">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                  </button>
                  <button onClick={() => handleAction('BAN', user.userId)} disabled={user.status === 'BANNED' || !!actionLoading} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30" title="Ban user">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  </button>
                  <button onClick={() => handleAction('RESET', user.userId)} disabled={!!actionLoading} className="p-1.5 rounded-lg hover:bg-green-500/10 text-slate-500 hover:text-green-400 transition-colors" title="Reset score">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
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

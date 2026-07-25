"use client";

import { useState, useEffect } from 'react';
import { getUsers, changeRole, banUser, muteUser, resetScore } from '../../../services/admin.service';

const ROLE_COLORS = {
  ADMIN: { bg: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: 'rgba(124,58,237,0.3)' },
  MODERATOR: { bg: 'rgba(16,185,129,0.2)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
  USER: { bg: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' },
};

const STATUS_COLORS = {
  ACTIVE: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  MUTED: { bg: 'rgba(107,114,128,0.2)', color: '#9ca3af' },
  WARNING: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  BANNED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data || []);
    } catch (error) {
      showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (id, role) => {
    setActionLoading(id + 'role');
    try {
      await changeRole(id, role);
      showToast('Role updated successfully');
      fetchUsers();
    } catch {
      showToast('Failed to change role', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (action, id, username) => {
    const messages = { BAN: `Ban ${username}?`, MUTE: `Mute ${username}?`, RESET: `Reset ${username}'s score?` };
    if (!confirm(messages[action])) return;
    setActionLoading(id + action);
    try {
      if (action === 'BAN') await banUser(id);
      if (action === 'MUTE') await muteUser(id);
      if (action === 'RESET') await resetScore(id);
      showToast(`User ${action.toLowerCase()}${action === 'RESET' ? ' score reset' : 'ned'} successfully`);
      fetchUsers();
    } catch {
      showToast(`Failed to ${action.toLowerCase()} user`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = search === '' || u.email?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl transition-all"
          style={{
            background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            color: toast.type === 'error' ? '#f87171' : '#34d399',
          }}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">User Management</h2>
          <p className="text-slate-500 text-sm mt-0.5">{users.length} total users registered</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm text-white outline-none cursor-pointer" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="ALL" style={{ background: '#1a1d2e' }}>All Roles</option>
          <option value="USER" style={{ background: '#1a1d2e' }}>USER</option>
          <option value="MODERATOR" style={{ background: '#1a1d2e' }}>MODERATOR</option>
          <option value="ADMIN" style={{ background: '#1a1d2e' }}>ADMIN</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm text-white outline-none cursor-pointer" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="ALL" style={{ background: '#1a1d2e' }}>All Status</option>
          <option value="ACTIVE" style={{ background: '#1a1d2e' }}>ACTIVE</option>
          <option value="MUTED" style={{ background: '#1a1d2e' }}>MUTED</option>
          <option value="BANNED" style={{ background: '#1a1d2e' }}>BANNED</option>
        </select>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="col-span-5">User</div>
          <div className="col-span-3 text-center">Status</div>
          <div className="col-span-2 text-center">Role</div>
          <div className="col-span-2 text-right">Violation Score</div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500">No users found.</div>
        ) : (
          filtered.map((user, idx) => {
            const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.USER;
            const statusStyle = STATUS_COLORS[user.status] || STATUS_COLORS.ACTIVE;
            return (
              <div key={user._id} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors" style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(79,70,229,0.3))', border: '1px solid rgba(124,58,237,0.3)' }}>
                    {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : user.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.username || user.email.split('@')[0]}</p>
                    <p className="text-slate-500 text-xs truncate">{user.email}</p>
                  </div>
                </div>
                <div className="col-span-3 flex justify-center">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: statusStyle.bg, color: statusStyle.color }}>{user.status || 'ACTIVE'}</span>
                </div>
                <div className="col-span-2 flex justify-center">
                  <select value={user.role} onChange={e => handleRoleChange(user._id, e.target.value)} disabled={actionLoading === user._id + 'role'} className="text-xs font-semibold px-2 py-1 rounded-full outline-none cursor-pointer appearance-none transition-opacity disabled:opacity-50" style={{ background: roleStyle.bg, color: roleStyle.color, border: `1px solid ${roleStyle.border}` }}>
                    <option value="USER" style={{ background: '#1a1d2e' }}>USER</option>
                    <option value="MODERATOR" style={{ background: '#1a1d2e' }}>MODERATOR</option>
                    <option value="ADMIN" style={{ background: '#1a1d2e' }}>ADMIN</option>
                  </select>
                </div>
                <div className="col-span-2 text-right pr-4 text-sm font-bold text-slate-400">{user.violationScore ?? 0}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

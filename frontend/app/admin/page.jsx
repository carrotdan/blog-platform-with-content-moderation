"use client";

import { useEffect, useState } from 'react';
import { getViolations, getUsers, getAllPosts, getReports } from '../../services/admin.service';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

function StatCard({ label, value, icon, colorStyle, delta, loading, href }) {
  const inner = (
    <div className="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group transition-all duration-200 hover:scale-[1.02]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl"
        style={{ background: colorStyle.glow }} />
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: colorStyle.bg, border: `1px solid ${colorStyle.border}` }}>
          <span style={{ color: colorStyle.icon }}>{icon}</span>
        </div>
        {delta !== undefined && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-red-400"
            style={{ background: 'rgba(239,68,68,0.12)' }}>
            ▲ {delta}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      ) : (
        <div>
          <p className="text-3xl font-bold text-white tabular-nums">{value ?? '—'}</p>
          <p className="text-slate-500 text-sm mt-0.5">{label}</p>
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function AlertRow({ level, text, time }) {
  const styles = {
    high: { dot: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'HIGH', labelColor: '#f87171', labelBg: 'rgba(239,68,68,0.15)' },
    medium: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.18)', label: 'MED', labelColor: '#fbbf24', labelBg: 'rgba(245,158,11,0.15)' },
    low: { dot: '#6366f1', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.15)', label: 'INFO', labelColor: '#818cf8', labelBg: 'rgba(99,102,241,0.15)' },
  };
  const s = styles[level] || styles.low;
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: s.dot }} />
      <div className="flex-1 min-w-0">
        <p className="text-slate-300 text-sm leading-snug">{text}</p>
        <p className="text-slate-500 text-xs mt-0.5">{time}</p>
      </div>
      <span className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
        style={{ background: s.labelBg, color: s.labelColor }}>{s.label}</span>
    </div>
  );
}

function HealthBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-slate-400 text-xs">{label}</span>
        <span className="text-slate-300 text-xs font-semibold tabular-nums">
          {value}<span className="text-slate-600 font-normal"> / {total}</span>
          <span className="ml-1.5 text-slate-500">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [vRes, uRes, pRes, rRes] = await Promise.allSettled([
        getViolations(), getUsers(), getAllPosts(), getReports(),
      ]);
      const v = vRes.status === 'fulfilled' ? (vRes.value?.data || []) : [];
      const u = uRes.status === 'fulfilled' ? (uRes.value?.data || []) : [];
      const p = pRes.status === 'fulfilled' ? (pRes.value?.data || []) : [];
      const r = rRes.status === 'fulfilled' ? (rRes.value?.data || []) : [];

      const banned = v.filter(x => x.status === 'BANNED').length;
      const muted = v.filter(x => x.status === 'MUTED').length;
      const warning = v.filter(x => x.status === 'WARNING').length;
      const publicPosts = p.filter(x => x.visibility === 'PUBLIC').length;
      const hiddenPosts = p.filter(x => x.visibility !== 'PUBLIC').length;

      setStats({
        totalUsers: u.length, totalPosts: p.length, pendingReports: r.length,
        bannedUsers: banned, mutedUsers: muted, warningUsers: warning,
        publicPosts, hiddenPosts, activeViolations: v.length,
        healthyUsers: Math.max(0, u.length - banned - muted),
      });

      const newAlerts = [];
      if (r.length > 0) newAlerts.push({ level: 'high', text: `${r.length} user report${r.length > 1 ? 's' : ''} pending review`, time: 'Requires immediate attention' });
      if (banned > 0) newAlerts.push({ level: 'medium', text: `${banned} user${banned > 1 ? 's' : ''} currently banned`, time: 'Ongoing enforcement' });
      if (warning > 0) newAlerts.push({ level: 'medium', text: `${warning} user${warning > 1 ? 's' : ''} on warning status`, time: 'Monitor closely' });
      if (hiddenPosts > 0) newAlerts.push({ level: 'low', text: `${hiddenPosts} post${hiddenPosts > 1 ? 's are' : ' is'} hidden or private`, time: 'Content management' });
      if (newAlerts.length === 0) newAlerts.push({ level: 'low', text: 'No critical issues detected. Platform is healthy.', time: 'All systems normal' });

      setAlerts(newAlerts);
      setLastUpdated(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const statCards = [
    { label: 'Registered Users', value: stats?.totalUsers, href: '/admin/users', colorStyle: { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', icon: '#818cf8', glow: 'rgba(99,102,241,0.4)' }, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { label: 'Published Posts', value: stats?.publicPosts, href: '/admin/posts', colorStyle: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', icon: '#34d399', glow: 'rgba(16,185,129,0.4)' }, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { label: 'Pending Reports', value: stats?.pendingReports, href: '/admin/reports', delta: stats?.pendingReports > 0 ? stats.pendingReports : undefined, colorStyle: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', icon: '#fbbf24', glow: 'rgba(245,158,11,0.4)' }, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg> },
    { label: 'Banned Users', value: stats?.bannedUsers, href: '/admin/violations', delta: stats?.bannedUsers > 0 ? stats.bannedUsers : undefined, colorStyle: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', icon: '#f87171', glow: 'rgba(239,68,68,0.4)' }, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
    { label: 'Users on Warning', value: stats?.warningUsers, href: '/admin/violations', colorStyle: { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.3)', icon: '#fb923c', glow: 'rgba(251,146,60,0.4)' }, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> },
    { label: 'Moderation Cases', value: stats?.activeViolations, href: '/admin/moderation', colorStyle: { bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.3)', icon: '#a78bfa', glow: 'rgba(124,58,237,0.4)' }, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
  ];

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="rounded-2xl px-7 py-6 flex items-center justify-between gap-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(120deg, rgba(124,58,237,0.25) 0%, rgba(79,70,229,0.15) 60%, rgba(15,17,23,0) 100%)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="relative z-10">
          <p className="text-slate-400 text-sm mb-0.5">{greeting},</p>
          <h1 className="text-2xl font-bold text-white capitalize">{displayName} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="relative z-10 flex flex-col items-end gap-2">
          <button onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.35)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
          {lastUpdated && <p className="text-slate-600 text-xs">Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(card => <StatCard key={card.label} {...card} loading={loading} />)}
      </div>

      {/* Alerts + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Alerts */}
        <div className="lg:col-span-3 rounded-2xl p-5 flex flex-col"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">System Alerts</h3>
            {!loading && alerts.some(a => a.level === 'high') && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Action Required
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>
          ) : (
            <div className="space-y-2 flex-1">{alerts.map((a, i) => <AlertRow key={i} {...a} />)}</div>
          )}
          <div className="mt-4 pt-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/admin/reports" className="flex-1 text-center py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>View All Reports</Link>
            <Link href="/admin/moderation" className="flex-1 text-center py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>Moderation Queue</Link>
          </div>
        </div>

        {/* Health */}
        <div className="lg:col-span-2 rounded-2xl p-5 flex flex-col"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-white font-semibold text-sm mb-5">Platform Health</h3>
          {loading ? (
            <div className="space-y-5">{[...Array(3)].map((_, i) => <div key={i} className="space-y-2"><div className="h-3 w-28 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} /><div className="h-2 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} /></div>)}</div>
          ) : stats ? (
            <div className="space-y-5 flex-1">
              <HealthBar label="Healthy Users" value={stats.healthyUsers} total={stats.totalUsers} color="#34d399" />
              <HealthBar label="Public Content" value={stats.publicPosts} total={stats.totalPosts} color="#818cf8" />
              <HealthBar label="Users with Issues" value={stats.bannedUsers + stats.mutedUsers + stats.warningUsers} total={stats.totalUsers} color="#f87171" />
            </div>
          ) : null}
          {!loading && stats && (
            <div className="mt-5 pt-4 flex items-center gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={stats.totalUsers > 0 && stats.healthyUsers / stats.totalUsers > 0.8 ? '#34d399' : '#f59e0b'}
                    strokeWidth="2.5"
                    strokeDasharray={`${stats.totalUsers > 0 ? Math.round((stats.healthyUsers / stats.totalUsers) * 100) : 0} 100`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{stats.totalUsers > 0 ? Math.round((stats.healthyUsers / stats.totalUsers) * 100) : 0}%</span>
                </div>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Overall Score</p>
                <p className="text-slate-500 text-xs mt-0.5">{stats.healthyUsers} of {stats.totalUsers} users in good standing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

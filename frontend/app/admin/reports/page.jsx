"use client";

import { useState, useEffect } from 'react';
import { getReports, resolveReport } from '../../../services/admin.service';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await getReports();
      setReports(res.data || []);
    } catch {
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleResolve = async (id, action) => {
    setActionLoading(id);
    try {
      await resolveReport(id, action);
      showToast(action === 'HIDE' ? 'Content removed and report resolved' : 'Report dismissed');
      fetchReports();
    } catch {
      showToast('Failed to handle report', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const typeColors = {
    POST: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
    COMMENT: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    USER: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  };

  const getPlainText = (html) => html?.replace(/<[^>]+>/g, '').slice(0, 100) || 'No content';

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl" style={{ background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`, color: toast.type === 'error' ? '#f87171' : '#34d399' }}>
          {toast.msg}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-white">Report Center</h2>
        <p className="text-slate-500 text-sm mt-0.5">{reports.length} pending user reports</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-white font-semibold">All clear!</p>
          <p className="text-slate-500 text-sm">No pending reports to handle.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const typeStyle = typeColors[report.target_model] || typeColors.POST;
            return (
              <div key={report._id} className="rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-white/[0.015] transition-colors" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: typeStyle.bg, color: typeStyle.color }}>{report.target_model}</span>
                    <span className="text-slate-500 text-xs">By {report.reporter_id?.username || report.reporter_id?.email || 'Anonymous'}</span>
                  </div>
                  {report.target_data && (
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                       <p className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Reported Content:</p>
                       <p className="text-white text-sm font-medium">
                          {report.target_model === 'Post' ? getPlainText(report.target_data.content_html) : report.target_data.content}
                       </p>
                    </div>
                  )}
                  <div className="flex gap-2 items-start">
                    <p className="text-slate-500 text-xs whitespace-nowrap mt-0.5">Reason:</p>
                    <p className="text-slate-300 text-sm italic">"{report.reason}"</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <button 
                    onClick={() => handleResolve(report._id, 'HIDE')} 
                    disabled={actionLoading === report._id} 
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40 whitespace-nowrap" 
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    Remove Content
                  </button>
                  <button 
                    onClick={() => handleResolve(report._id, 'MARK_SENSITIVE')} 
                    disabled={actionLoading === report._id} 
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40 whitespace-nowrap" 
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}
                  >
                    Mark Sensitive
                  </button>
                  <button 
                    onClick={() => handleResolve(report._id, 'DISMISS')} 
                    disabled={actionLoading === report._id} 
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40 whitespace-nowrap" 
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

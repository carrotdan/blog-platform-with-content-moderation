"use client";

import { useState, useEffect } from 'react';
import { Bell, ShieldAlert, CheckCircle, XCircle, Heart, MessageCircle, UserPlus, Repeat2 } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import AppealModal from './AppealModal';

export default function NotificationBell() {
  const { unreadCount, setUnreadCount, notifications, setNotifications } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appealTarget, setAppealTarget] = useState(null); // { entity_id, entity_model, ai_label, scores }

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  // Click ngoài để đóng
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#notif-bell-wrapper')) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data.data);
      const unread = res.data.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) await handleMarkAsRead(notif._id);
    // Nếu là AI_MODERATION → mở modal kháng cáo
    if (notif.type === 'AI_MODERATION') {
      setAppealTarget({
        entity_id: notif.entity_id,
        entity_model: notif.entity_model,
        ai_label: notif.metadata?.ai_label,
        spam_score: notif.metadata?.spam_score,
        toxicity_score: notif.metadata?.toxicity_score,
        content_preview: notif.metadata?.content_preview || ''  // nội dung user đã viết
      });
      setIsOpen(false);
    }
  };

  const getNotifConfig = (notif) => {
    const type = notif.type;
    const sender = notif.sender?.username || 'Ai đó';
    const meta = notif.metadata || {};

    switch (type) {
      case 'LIKE':
        return {
          icon: <Heart className="w-4 h-4 text-red-500" />,
          bg: 'bg-red-50',
          text: `${sender} đã thích bài viết của bạn`,
          isSystem: false
        };
      case 'COMMENT':
        return {
          icon: <MessageCircle className="w-4 h-4 text-blue-500" />,
          bg: 'bg-blue-50',
          text: `${sender} đã bình luận bài viết của bạn`,
          isSystem: false
        };
      case 'REPLY':
        return {
          icon: <MessageCircle className="w-4 h-4 text-indigo-500" />,
          bg: 'bg-indigo-50',
          text: `${sender} đã trả lời bình luận của bạn`,
          isSystem: false
        };
      case 'FOLLOW':
        return {
          icon: <UserPlus className="w-4 h-4 text-green-500" />,
          bg: 'bg-green-50',
          text: `${sender} đã bắt đầu theo dõi bạn`,
          isSystem: false
        };
      case 'REPOST':
        return {
          icon: <Repeat2 className="w-4 h-4 text-purple-500" />,
          bg: 'bg-purple-50',
          text: `${sender} đã chia sẻ bài viết của bạn`,
          isSystem: false
        };
      case 'AI_MODERATION': {
        const targetType = meta.target_model === 'Post' ? 'bài viết' : 'bình luận';
        const label = meta.ai_label || 'vi phạm';
        return {
          icon: <ShieldAlert className="w-4 h-4 text-orange-500" />,
          bg: 'bg-orange-50',
          text: `⚠️ ${targetType.charAt(0).toUpperCase() + targetType.slice(1)} của bạn bị hệ thống phát hiện là ${label}. Nhấn để xem và kháng cáo.`,
          isSystem: true,
          actionLabel: '→ Kháng cáo',
          actionColor: 'text-orange-600 font-semibold'
        };
      }
      case 'APPEAL_RESOLVED': {
        const approved = meta.result === 'APPROVED';
        return {
          icon: approved
            ? <CheckCircle className="w-4 h-4 text-green-500" />
            : <XCircle className="w-4 h-4 text-red-500" />,
          bg: approved ? 'bg-green-50' : 'bg-red-50',
          text: approved
            ? `✅ Kháng cáo của bạn được CHẤP NHẬN. Nội dung đã được khôi phục!`
            : `❌ Kháng cáo của bạn bị TỪ CHỐI. ${meta.admin_note || ''}`,
          isSystem: true
        };
      }
      default:
        return {
          icon: <Bell className="w-4 h-4 text-gray-400" />,
          bg: 'bg-gray-50',
          text: 'Bạn có thông báo mới',
          isSystem: false
        };
    }
  };

  return (
    <>
      <div id="notif-bell-wrapper" className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative text-gray-500 hover:text-gray-900 focus:outline-none p-1"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/60">
              <h3 className="font-semibold text-gray-800 text-sm">Thông báo</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                >
                  Đọc tất cả
                </button>
              )}
            </div>

            <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="p-6 text-center text-sm text-gray-400">Đang tải...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Không có thông báo nào</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const cfg = getNotifConfig(notif);
                  return (
                    <div
                      key={notif._id}
                      onClick={() => handleNotifClick(notif)}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors ${!notif.is_read ? 'bg-violet-50/40' : ''}`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                        {notif.sender?.avatar && !cfg.isSystem ? (
                          <img src={notif.sender.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          cfg.icon
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${cfg.isSystem ? 'text-gray-700' : 'text-gray-800'} line-clamp-3`}>
                          {cfg.text}
                        </p>
                        {cfg.actionLabel && (
                          <p className={`text-xs mt-1 ${cfg.actionColor}`}>{cfg.actionLabel}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: vi })}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Appeal Modal */}
      {appealTarget && (
        <AppealModal
          target={appealTarget}
          onClose={() => setAppealTarget(null)}
          onSuccess={() => {
            setAppealTarget(null);
            fetchNotifications();
          }}
        />
      )}
    </>
  );
}

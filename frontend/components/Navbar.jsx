"use client";

import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { User, LogOut, PenSquare, Mail, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getUnreadCount } from '../services/message.service';
import { io } from 'socket.io-client';

import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchUnread = async () => {
        try {
          const { data } = await getUnreadCount();
          setUnreadMessages(data.data.count || 0);
        } catch (error) {
          console.error("Failed to fetch unread messages count");
        }
      };
      fetchUnread();

      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
      socket.emit('join_user_room', user.id);

      socket.on('new_message', () => {
        setUnreadMessages(prev => prev + 1);
      });

      const handleMessagesRead = () => fetchUnread();
      window.addEventListener('messages_read', handleMessagesRead);

      return () => {
        socket.disconnect();
        window.removeEventListener('messages_read', handleMessagesRead);
      };
    }
  }, [isAuthenticated, user]);

  return (
    <nav className="glass sticky top-0 z-50 border-b border-gray-100/50 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <a href="/" className="text-2xl font-black tracking-tighter gradient-text">
              Blog
            </a>
          </div>
          <div className="flex items-center space-x-5">
            {isAuthenticated ? (
              <>
                {user?.role === 'ADMIN' && (
                  <Link href="/admin" className="text-violet-600 hover:text-violet-800 font-semibold text-xs px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 transition-colors">
                    Admin
                  </Link>
                )}
                <Link href="/create" className="text-gray-500 hover:text-gray-900 flex items-center space-x-1.5 transition-colors">
                  <PenSquare className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium text-sm">Write</span>
                </Link>
                <NotificationBell />
                <Link href="/messages" className="text-gray-500 hover:text-gray-900 transition-colors relative">
                  <Mail className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>
                {/* Link kháng cáo */}
                <Link href="/appeals" title="Kháng cáo của tôi" className="text-gray-400 hover:text-orange-500 transition-colors p-1">
                  <ShieldAlert className="w-5 h-5" />
                </Link>
                <Link href="/profile" className="text-gray-500 hover:text-gray-900 focus:outline-none flex items-center">
                  {user?.avatar || user?.avatar_url ? (
                    <img 
                      src={user.avatar || user.avatar_url} 
                      alt="Profile" 
                      className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm transition-colors" 
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200 shadow-sm transition-colors">
                      {user?.username ? user.username.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                  )}
                </Link>
                <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (

              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors">
                  Sign In
                </Link>
                <Link href="/register" className="btn-premium btn-primary px-5 py-2 rounded-full text-sm font-semibold">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

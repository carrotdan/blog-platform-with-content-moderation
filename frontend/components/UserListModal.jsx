"use client";

import { X } from 'lucide-react';
import Link from 'next/link';

export default function UserListModal({ isOpen, onClose, title, users, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-bold text-neutral-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-1">
              {users.map(item => {
                const user = item.follower_id || item.following_id;
                return (
                  <Link 
                    key={user._id} 
                    href={`/u/${user.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-400">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors">{user.username}</p>
                      {user.bio && <p className="text-xs text-neutral-400 truncate">{user.bio}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-neutral-400 text-sm">No users found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

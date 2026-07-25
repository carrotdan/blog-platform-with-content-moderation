"use client";

import { MessageSquare } from 'lucide-react';

export default function MessagesPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center h-full">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white">
        <MessageSquare className="w-10 h-10 text-blue-500" />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Your Messages</h2>
      <p className="text-gray-500 max-w-sm mx-auto leading-relaxed text-sm">
        Select a conversation from the list to start chatting, or find a new friend to connect with.
      </p>
    </div>
  );

}

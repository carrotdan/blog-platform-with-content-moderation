"use client";

import { useState, useEffect } from 'react';
import { getConversations } from '../../services/message.service';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesLayout({ children }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const params = useParams();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await getConversations();
        setConversations(data.data || []);
      } catch (err) {
        console.error('Failed to load conversations', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [params.id]); // Refresh list when switching conversations

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-80px)] py-4 flex">
      <div className="flex w-full h-full glass rounded-3xl overflow-hidden border border-white shadow-xl shadow-gray-200/50">
        {/* Sidebar: Conversations List */}
        <aside className={`w-full md:w-[340px] flex-shrink-0 flex flex-col bg-white/50 backdrop-blur-sm border-r border-gray-100 ${params.id ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-6 py-5 border-b border-gray-100/50 backdrop-blur-md">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Messages</h1>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {loading ? (
              <div className="p-5 text-center text-gray-400 text-sm animate-pulse">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">👋</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">No messages yet.</p>
                <Link href="/" className="text-xs font-bold text-blue-500 hover:text-blue-600 mt-2 px-4 py-2 bg-blue-50 rounded-full transition-colors">Find someone to chat</Link>
              </div>
            ) : (
              conversations.map(conv => {
                const otherUser = conv.participants.find(p => p._id !== user?.id);
                if (!otherUser) return null;
                const isActive = params.id === conv._id;

                return (
                  <Link 
                    key={conv._id} 
                    href={`/messages/${conv._id}`}
                    className={`flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-blue-50/80 shadow-sm border border-blue-100/50 scale-[0.98]' 
                        : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-tr from-gray-100 to-gray-200 flex-shrink-0 shadow-sm border border-white">
                      {otherUser.avatar ? (
                        <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500">
                          {otherUser.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-base font-bold text-gray-900 truncate tracking-tight">{otherUser.username}</p>
                        {conv.last_message && (
                          <span className={`text-[10px] font-semibold whitespace-nowrap ml-2 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate leading-tight ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                        {conv.last_message?.content || 'Started a conversation'}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Content: Chat Window */}
        <main className={`flex-1 flex flex-col bg-white/40 ${!params.id ? 'hidden md:flex' : 'flex'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

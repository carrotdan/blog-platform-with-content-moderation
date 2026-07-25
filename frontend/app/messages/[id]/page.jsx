"use client";

import { useState, useEffect, useRef, use } from 'react';
import { getMessages, sendMessage, deleteConversation, reactToMessage } from '../../../services/message.service';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Send, ArrowLeft, MoreVertical, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { io } from 'socket.io-client';

export default function ChatWindow({ params }) {
  const { id: conversationId } = use(params);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState(null);
  const { user } = useAuth();
  const router = useRouter();
  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  const [mediaFiles, setMediaFiles] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);

  const emojis = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '❤️', '🔥', '✨'];

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await getMessages(conversationId);
        setMessages(data.data.reverse() || []);
        
        // Find recipient from conversation participants
        const api = require('../../../services/api').default;
        const convRes = await api.get(`/messages/conversations`);
        const conv = convRes.data.data.find(c => c._id === conversationId);
        if (conv) {
          setRecipient(conv.participants.find(p => p._id !== user?.id));
        }
        
        // Notify navbar to update unread count
        window.dispatchEvent(new Event('messages_read'));
      } catch (err) {
        console.error('Failed to load messages', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchMessages();
  }, [conversationId, user]);


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const [showMenu, setShowMenu] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    socketRef.current.emit('join_user_room', user?.id);

    socketRef.current.on('new_message', (data) => {
      if (data.conversation_id === conversationId) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    socketRef.current.on('message_reaction', (data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => prev.map(m => {
          if (m._id === data.messageId) {
            const newReactions = [...(m.reactions || [])];
            const existingIdx = newReactions.findIndex(r => r.user_id === data.userId);
            if (existingIdx > -1) {
              if (newReactions[existingIdx].emoji === data.emoji) {
                newReactions.splice(existingIdx, 1);
              } else {
                newReactions[existingIdx].emoji = data.emoji;
              }
            } else {
              newReactions.push({ user_id: data.userId, emoji: data.emoji });
            }
            return { ...m, reactions: newReactions };
          }
          return m;
        }));
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [conversationId, user]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!content.trim() && mediaFiles.length === 0) || !recipient) return;

    const messageContent = content;
    const filesToSend = [...mediaFiles];
    
    setContent('');
    setMediaFiles([]);
    setShowEmojiPicker(false);

    // Optimistic UI for text
    const tempId = Date.now().toString();
    if (messageContent && filesToSend.length === 0) {
      setMessages(prev => [...prev, {
        _id: tempId,
        sender_id: user.id,
        content: messageContent,
        createdAt: new Date().toISOString(),
        media: [],
        reactions: []
      }]);
    }

    try {
      const { data } = await sendMessage(recipient._id, messageContent, filesToSend);
      if (messageContent && filesToSend.length === 0) {
        setMessages(prev => prev.map(m => m._id === tempId ? data.data : m));
      } else {
        setMessages(prev => [...prev, data.data]);
      }
    } catch (err) {
      console.error('Failed to send message', err);
      if (messageContent && filesToSend.length === 0) {
        setMessages(prev => prev.filter(m => m._id !== tempId));
      }
    }
  };

  const handleDeleteConversation = async () => {
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        await deleteConversation(conversationId);
        router.push('/messages');
      } catch (err) {
        console.error('Failed to delete conversation', err);
      }
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      // Optimistic update
      setMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          const newReactions = [...(m.reactions || [])];
          const existingIdx = newReactions.findIndex(r => r.user_id === user?.id || r.user_id?._id === user?.id);
          if (existingIdx > -1) {
            if (newReactions[existingIdx].emoji === emoji) {
              newReactions.splice(existingIdx, 1);
            } else {
              newReactions[existingIdx].emoji = emoji;
            }
          } else {
            newReactions.push({ user_id: user?.id, emoji });
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      }));
      await reactToMessage(messageId, emoji);
    } catch (err) {
      console.error('Failed to react', err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setMediaFiles(Array.from(e.target.files));

    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400 font-medium animate-pulse">Loading chat...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 relative">
      {/* Header */}
      <header className="h-16 px-4 md:px-6 border-b border-gray-100/50 flex items-center justify-between glass z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/messages')} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {recipient && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-gray-100 to-gray-200 border border-white shadow-sm ring-2 ring-transparent hover:ring-blue-100 transition-all">
                {recipient.avatar ? (
                  <img src={recipient.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                    {recipient.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 leading-tight tracking-tight">{recipient.username}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-soft"></span>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Online</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <button 
                onClick={handleDeleteConversation}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors"
              >
                Delete Conversation
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 scroll-smooth"
      >
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
          const showTime = i === 0 || new Date(msg.createdAt) - new Date(messages[i-1].createdAt) > 1000 * 60 * 5;

          return (
            <div 
              key={msg._id} 
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              onMouseEnter={() => setHoveredMessageId(msg._id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {showTime && (
                <p className="w-full text-center text-[10px] text-gray-400 my-5 font-bold uppercase tracking-widest">
                  {format(new Date(msg.createdAt), 'HH:mm, MMM d')}
                </p>
              )}
              
              <div className={`relative flex items-center gap-2 max-w-full ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Message Bubble */}
                <div className={`relative max-w-[85%] md:max-w-md px-5 py-3 text-sm leading-relaxed shadow-sm ${
                  isMine 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-3xl rounded-br-sm border border-blue-400/20' 
                    : 'bg-white text-gray-800 rounded-3xl rounded-bl-sm border border-gray-100 shadow-gray-200/50'
                }`}>
                  {msg.media && msg.media.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 -mx-1 -mt-1">
                      {msg.media.map((media, idx) => (
                        media.type === 'VIDEO' ? (
                          <video key={idx} src={media.url} controls className="max-w-full md:max-w-[240px] max-h-[240px] rounded-2xl object-cover shadow-sm" />
                        ) : (
                          <img key={idx} src={media.url} alt="attachment" className="max-w-full md:max-w-[240px] max-h-[240px] rounded-2xl object-cover shadow-sm" />
                        )
                      ))}
                    </div>
                  )}
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                  
                  {/* Reactions Display */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`absolute -bottom-3 ${isMine ? 'right-2' : 'left-2'} bg-white border border-gray-100 rounded-full px-2 py-0.5 text-[10px] shadow-sm flex items-center gap-1`}>
                      {msg.reactions.slice(0, 3).map((r, idx) => (
                        <span key={idx}>{r.emoji}</span>
                      ))}
                      {msg.reactions.length > 3 && <span className="text-gray-500 font-bold">+{msg.reactions.length - 3}</span>}
                    </div>
                  )}
                </div>

                {/* Hover React Button */}
                {hoveredMessageId === msg._id && (
                  <div className="relative z-20 flex gap-1 bg-white border border-gray-100 rounded-full shadow-sm p-1">
                    {['👍', '❤️', '😂', '😮'].map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => handleReact(msg._id, emoji)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* File Preview */}
      {mediaFiles.length > 0 && (
        <div className="px-6 py-3 bg-white/90 backdrop-blur-md border-t border-gray-100 flex gap-3 overflow-x-auto shadow-sm z-10">
          {mediaFiles.map((file, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md flex-shrink-0">
              {file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center">VIDEO</div>
              )}
              <button 
                type="button"
                onClick={() => setMediaFiles(prev => prev.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-black transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-[84px] left-4 glass rounded-2xl p-3 flex gap-2 z-50 shadow-2xl border border-white">
          {emojis.map(emoji => (
            <button 
              type="button"
              key={emoji} 
              onClick={() => setContent(prev => prev + emoji)}
              className="text-2xl hover:bg-gray-100 p-2 rounded-xl transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <footer className="p-4 md:px-6 md:py-5 glass border-t border-gray-100/50 z-10">
        <form 
          onSubmit={handleSend}
          className="flex items-center gap-2 md:gap-3 bg-white border border-gray-200 shadow-sm rounded-full p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300 transition-colors relative"
        >
          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
          >
            <span className="text-xl leading-none">😀</span>
          </button>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            multiple 
            accept="image/*,video/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <input 
            type="text"
            placeholder="Type a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-2 text-gray-900 placeholder-gray-400 font-medium"
          />
          <button 
            type="submit"
            disabled={!content.trim() && mediaFiles.length === 0}
            className="p-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}


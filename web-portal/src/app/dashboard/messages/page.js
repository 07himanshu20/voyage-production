'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  MessageSquare, Send, User, MapPin, Car, Clock, CheckCircle2,
  AlertCircle, Navigation, ChevronRight, Search
} from 'lucide-react';

export default function CustomerMessagesPage() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatDetail, setChatDetail] = useState(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const scrollRef = useRef(null);

  const loadChats = useCallback(async () => {
    try {
      const data = await api.getCompanyChats();
      setChats(data.chats || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Real-time updates
  useEffect(() => {
    const socket = getSocket();
    socket.emit('admin_connect');

    const handler = (data) => {
      // New message from customer
      loadChats();
      if (selectedChat && data.chatId === selectedChat) {
        loadChatDetail(data.chatId);
      }
    };
    socket.on('company_chat_message', handler);
    return () => socket.off('company_chat_message', handler);
  }, [selectedChat, loadChats]);

  const loadChatDetail = async (chatId) => {
    try {
      const data = await api.getCompanyChat(chatId);
      setChatDetail(data);
      setSelectedChat(chatId);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatDetail]);

  const sendReply = async () => {
    const text = input.trim();
    if (!text || !chatDetail) return;
    setInput('');

    const adminUser = JSON.parse(localStorage.getItem('bestclass_admin_user') || '{}');
    await api.sendCompanyReply(
      chatDetail.chat.customerId,
      chatDetail.chat.customerName,
      chatDetail.chat.bookingId,
      adminUser.name || 'Support Agent',
      text
    );
    loadChatDetail(selectedChat);
    loadChats();
  };

  const resolveChat = async (chatId) => {
    await api.resolveChat(chatId);
    loadChats();
    if (selectedChat === chatId) loadChatDetail(chatId);
  };

  const filtered = chats.filter(c =>
    !search || c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    c.bookingId?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = {
    pending: 'text-yellow-400', assigned: 'text-blue-400', confirmed: 'text-green-400',
    in_progress: 'text-purple-400', completed: 'text-emerald-400', cancelled: 'text-red-400',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Customer Messages</h1>
        <p className="text-white/40 mt-1">View and respond to customer conversations</p>
      </div>

      <div className="flex gap-6" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Chat list */}
        <div className="w-96 flex flex-col bg-navy-600/30 rounded-2xl border border-white/5 overflow-hidden flex-shrink-0">
          {/* Search */}
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold-500/30"
              />
            </div>
          </div>

          {/* Chat items */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare className="w-12 h-12 text-white/10 mb-3" />
                <p className="text-white/30 text-sm">No messages yet</p>
                <p className="text-white/15 text-xs mt-1">Customer messages will appear here</p>
              </div>
            ) : (
              filtered.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => loadChatDetail(chat.id)}
                  className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/3 transition-colors ${
                    selectedChat === chat.id ? 'bg-gold-500/5 border-l-2 border-l-gold-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gold-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-white truncate">{chat.customerName}</p>
                        <div className={`flex items-center gap-1 ${chat.status === 'open' ? 'text-green-400' : 'text-white/20'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${chat.status === 'open' ? 'bg-green-400' : 'bg-white/20'}`} />
                          <span className="text-[9px] font-bold uppercase">{chat.status}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gold-500/60 font-mono">{chat.bookingId}</p>
                      {chat.messages && chat.messages.length > 0 && (
                        <p className="text-xs text-white/40 truncate mt-1">
                          {chat.messages[chat.messages.length - 1].message}
                        </p>
                      )}
                      <p className="text-[10px] text-white/20 mt-1">
                        {new Date(chat.lastMessageAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat detail + booking info */}
        {chatDetail ? (
          <div className="flex-1 flex gap-6 min-w-0">
            {/* Messages panel */}
            <div className="flex-1 flex flex-col bg-navy-600/30 rounded-2xl border border-white/5 overflow-hidden min-w-0">
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-gold-400" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{chatDetail.chat.customerName}</p>
                    <p className="text-xs text-white/30 font-mono">{chatDetail.chat.bookingId}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {chatDetail.chat.status === 'open' && (
                    <button
                      onClick={() => resolveChat(chatDetail.chat.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
                {chatDetail.chat.messages.map(msg => {
                  const isAdmin = msg.from === 'admin';
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-4`}>
                      <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                        isAdmin
                          ? 'bg-gold-500/15 border border-gold-500/20 rounded-br-md'
                          : 'bg-white/5 border border-white/5 rounded-bl-md'
                      }`}>
                        <p className={`text-[10px] font-bold mb-1 ${isAdmin ? 'text-gold-400' : 'text-blue-400'}`}>
                          {msg.fromName}
                        </p>
                        <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        <p className="text-[10px] text-white/20 mt-1.5 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply input */}
              {chatDetail.chat.status === 'open' && (
                <div className="px-6 py-4 border-t border-white/5">
                  <div className="flex gap-3">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                      placeholder="Type your reply..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold-500/30"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!input.trim()}
                      className="px-5 rounded-xl gold-gradient flex items-center justify-center gap-2 text-navy-900 font-semibold text-sm disabled:opacity-40 transition-opacity"
                    >
                      <Send className="w-4 h-4" /> Send
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Booking & Trip info sidebar */}
            <div className="w-80 flex flex-col gap-4 flex-shrink-0">
              {/* Booking info */}
              {chatDetail.booking && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-navy-600/30 rounded-2xl border border-white/5 p-5"
                >
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Car className="w-4 h-4 text-gold-400" /> Trip Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Booking ID</p>
                      <p className="text-sm text-gold-400 font-mono">{chatDetail.booking.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Status</p>
                      <p className={`text-sm font-semibold ${statusColor[chatDetail.booking.status] || 'text-white'}`}>
                        {chatDetail.booking.status.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-white/30">Pickup</p>
                        <p className="text-xs text-white/70">{chatDetail.booking.pickup.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-2 h-2 text-red-400 mt-1.5 flex-shrink-0" style={{ width: 8, height: 8 }} />
                      <div>
                        <p className="text-[10px] text-white/30">Dropoff</p>
                        <p className="text-xs text-white/70">{chatDetail.booking.dropoff.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] text-white/30">Date</p>
                        <p className="text-xs text-white/70">{chatDetail.booking.date}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30">Time</p>
                        <p className="text-xs text-white/70">{chatDetail.booking.time}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30">Vehicle</p>
                      <p className="text-xs text-white/70">{chatDetail.booking.vehicleName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30">Fare</p>
                      <p className="text-sm font-bold text-gold-400">£{chatDetail.booking.fare.total.toFixed(2)}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Driver info */}
              {chatDetail.driver && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-navy-600/30 rounded-2xl border border-white/5 p-5"
                >
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-purple-400" /> Chauffeur Assigned
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center text-sm font-bold text-navy-900">
                        {chatDetail.driver.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{chatDetail.driver.name}</p>
                        <p className="text-xs text-white/40">{chatDetail.driver.phone}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30">Vehicle</p>
                      <p className="text-xs text-white/70">{chatDetail.driver.vehicle.make} {chatDetail.driver.vehicle.model}</p>
                      <p className="text-[10px] text-white/40">{chatDetail.driver.vehicle.plate} • {chatDetail.driver.vehicle.color}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30">Rating</p>
                      <p className="text-xs text-gold-400">{chatDetail.driver.rating}/5 ({chatDetail.driver.totalTrips} trips)</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Customer info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-navy-600/30 rounded-2xl border border-white/5 p-5"
              >
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" /> Customer
                </h3>
                <p className="text-sm text-white">{chatDetail.chat.customerName}</p>
                <p className="text-xs text-white/30 mt-1">ID: {chatDetail.chat.customerId}</p>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-navy-600/30 rounded-2xl border border-white/5">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-white/5 mx-auto mb-4" />
              <p className="text-white/30 text-lg font-medium">Select a conversation</p>
              <p className="text-white/15 text-sm mt-1">Choose a message from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

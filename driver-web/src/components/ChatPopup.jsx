import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle } from 'lucide-react';
import { api } from '../api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

export default function ChatPopup({ booking, driver, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!booking) return;
    api.getDriverChat(booking.id).then(data => setMessages(data.messages || [])).catch(() => {});
  }, [booking]);

  // Track latest booking id in a ref so the socket handler always has the current value
  const bookingIdRef = useRef(booking?.id);
  useEffect(() => { bookingIdRef.current = booking?.id; }, [booking?.id]);

  useEffect(() => {
    if (!booking || !driver) return;
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('driver_connect', driver.id);
      socket.emit('join_chat', booking.id);
    });
    socket.on('chat_message', (msg) => {
      if (msg.bookingId === bookingIdRef.current && msg.from === 'customer') {
        // Deduplicate — avoid adding the same message twice (from user room + chat room)
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
    return () => { socket.disconnect(); };
  }, [booking?.id, driver]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const msg = {
      id: Date.now().toString(),
      from: 'driver',
      fromId: driver.id,
      fromName: driver.name,
      message: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    await api.sendDriverMessage(booking.id, 'driver', driver.id, driver.name, text).catch(() => {});
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-20 right-4 w-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 z-50"
      style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#0F1A2E' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5" style={{ background: 'rgba(200,169,81,0.08)' }}>
        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
          <MessageCircle size={14} className="text-green-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{booking?.customerName || 'Customer'}</p>
          <p className="text-[10px] text-white/40">{booking?.id}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10">
          <X size={14} className="text-white/60" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="h-72 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-white/30 text-center mt-8">No messages yet</p>
        )}
        {messages.map(msg => {
          const isSelf = msg.from === 'driver';
          return (
            <div key={msg.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-xl text-[13px] ${
                isSelf
                  ? 'rounded-br-sm'
                  : 'bg-white/5 border border-white/5 text-white rounded-bl-sm'
              }`} style={isSelf ? { background: 'linear-gradient(135deg, #C8A951, #E8D48B)', color: '#0A1628' } : {}}>
                <p className="whitespace-pre-wrap">{msg.message}</p>
                <p className={`text-[9px] mt-1 text-right ${isSelf ? 'text-black/40' : 'text-white/30'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-white/5">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Reply to customer..."
            className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/30"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center disabled:opacity-30"
          >
            <Send size={14} className="text-black" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { ArrowLeft, Send, Bot, MessageCircle, Building2, User, Sparkles } from 'lucide-react';

// WhatsApp-style message bubble
function MessageBubble({ msg, isSelf }) {
  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
        isSelf
          ? 'bg-gold/90 text-bg rounded-br-md'
          : msg.from === 'ai'
            ? 'bg-purple-500/15 border border-purple-500/20 text-white rounded-bl-md'
            : 'bg-card border border-card-border text-white rounded-bl-md'
      }`}>
        {!isSelf && msg.fromName && (
          <p className={`text-[10px] font-bold mb-1 ${msg.from === 'ai' ? 'text-purple-400' : 'text-gold'}`}>
            {msg.fromName}
          </p>
        )}
        <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${isSelf ? 'text-bg' : ''}`}>{msg.message}</p>
        <p className={`text-[9px] mt-1 text-right ${isSelf ? 'text-bg/50' : 'text-text-muted'}`}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// Chat list (showing 3 chat options)
function ChatList({ booking, onSelect, onGoBack }) {
  const chats = [
    {
      id: 'driver',
      title: 'Chat with Chauffeur',
      subtitle: booking?.driverName ? `${booking.driverName}` : 'No chauffeur assigned yet',
      icon: User,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      disabled: !booking?.driverId,
    },
    {
      id: 'company',
      title: 'Chat with Best Class',
      subtitle: 'Contact our support team',
      icon: Building2,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      disabled: false,
    },
    {
      id: 'ai',
      title: 'AI Assistant',
      subtitle: 'Weather, traffic, help & more',
      icon: Sparkles,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      disabled: false,
    },
  ];

  return (
    <div className="px-5 pt-4">
      <div className="flex items-center gap-3 mb-4">
        {onGoBack && (
          <button onClick={onGoBack} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
        )}
        <h2 className="text-lg font-bold text-white">Messages</h2>
      </div>
      <div className="space-y-3">
        {chats.map(c => (
          <button
            key={c.id}
            onClick={() => !c.disabled && onSelect(c.id)}
            disabled={c.disabled}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
              c.disabled
                ? 'opacity-40 cursor-not-allowed bg-card/50 border-card-border'
                : `${c.bg} ${c.border} hover:brightness-110 cursor-pointer`
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${c.bg}`}>
              <c.icon size={22} className={c.color} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-semibold text-white">{c.title}</p>
              <p className="text-[12px] text-text-secondary mt-0.5">{c.subtitle}</p>
            </div>
            <MessageCircle size={18} className={c.disabled ? 'text-text-muted' : c.color} />
          </button>
        ))}
      </div>
      {!booking && (
        <p className="text-xs text-text-muted text-center mt-6">
          Select an active booking to chat with your chauffeur
        </p>
      )}
    </div>
  );
}

// Individual chat view (WhatsApp-style)
function ChatView({ chatType, booking, user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState([]);
  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  const titles = {
    driver: booking?.driverName || 'Chauffeur',
    company: 'Best Class Support',
    ai: 'AI Assistant',
  };
  const colors = { driver: 'text-green-400', company: 'text-blue-400', ai: 'text-purple-400' };

  // Load existing messages
  useEffect(() => {
    if (chatType === 'driver' && booking) {
      api.getDriverChat(booking.id).then(data => setMessages(data.messages || [])).catch(() => {});
    } else if (chatType === 'company' && booking) {
      api.getCompanyChats(user.id).then(data => {
        const chat = (data.chats || []).find(c => c.bookingId === booking.id);
        if (chat) setMessages(chat.messages || []);
      }).catch(() => {});
    } else if (chatType === 'ai') {
      // AI starts fresh with a welcome
      setMessages([{
        id: 'welcome',
        from: 'ai',
        fromName: 'Best Class AI',
        message: `Hello ${user.name}! I'm your Best Class AI Assistant. I can help you with:\n\n• Trip details & booking info\n• Weather & traffic updates\n• Driver information\n• Raising complaints\n• Rating your ride\n• Emergency helpline\n\nHow can I assist you?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [chatType, booking, user]);

  // Socket.IO for real-time messages
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('customer_connect', user.id);
      if (booking) socket.emit('join_chat', booking.id);
    });

    socket.on('chat_message', (msg) => {
      if (chatType === 'driver' && msg.bookingId === booking?.id && msg.from === 'driver') {
        // Deduplicate — message may arrive from both user room and chat room
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    socket.on('company_chat_message', (data) => {
      if (chatType === 'company' && data.message.from === 'admin') {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    return () => { socket.disconnect(); };
  }, [chatType, booking, user.id]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    if (chatType === 'driver') {
      const msg = {
        id: Date.now().toString(),
        from: 'customer',
        fromId: user.id,
        fromName: user.name,
        message: text,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, msg]);
      await api.sendDriverMessage(booking.id, 'customer', user.id, user.name, text).catch(() => {});
    } else if (chatType === 'company') {
      const msg = {
        id: Date.now().toString(),
        from: 'customer',
        fromName: user.name,
        message: text,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, msg]);
      await api.sendCompanyMessage(user.id, user.name, booking?.id || 'general', 'customer', user.name, text).catch(() => {});
    } else if (chatType === 'ai') {
      const userMsg = {
        id: Date.now().toString(),
        from: 'customer',
        fromName: user.name,
        message: text,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      setLoading(true);

      const newHistory = [...aiHistory, { role: 'user', message: text }];
      try {
        const data = await api.sendAIMessage(text, booking?.id, user.id, aiHistory);
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          from: 'ai',
          fromName: 'Best Class AI',
          message: data.reply,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMsg]);
        setAiHistory([...newHistory, { role: 'model', message: data.reply }]);
      } catch (e) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          from: 'ai',
          fromName: 'Best Class AI',
          message: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        }]);
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-card-border bg-card/50">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          chatType === 'driver' ? 'bg-green-500/15' : chatType === 'company' ? 'bg-blue-500/15' : 'bg-purple-500/15'
        }`}>
          {chatType === 'driver' ? <User size={18} className="text-green-400" /> :
           chatType === 'company' ? <Building2 size={18} className="text-blue-400" /> :
           <Sparkles size={18} className="text-purple-400" />}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${colors[chatType]}`}>{titles[chatType]}</p>
          {booking && <p className="text-[10px] text-text-muted">{booking.id} • {booking.pickup.address.split(',')[0]} → {booking.dropoff.address.split(',')[0]}</p>}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isSelf={msg.from === 'customer'} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-purple-500/15 border border-purple-500/20 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-card-border bg-card/50">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Message ${titles[chatType]}...`}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-muted outline-none focus:border-gold/40"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-gold flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            <Send size={16} className="text-bg" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Main ChatScreen component
export default function ChatScreen({ navigation, route }) {
  const { user } = useAuth();
  const [chatType, setChatType] = useState(null); // null = list, 'driver' | 'company' | 'ai'
  const [activeBooking, setActiveBooking] = useState(null);
  const booking = route?.params?.booking || activeBooking;

  // Auto-fetch active booking if none passed via route params
  useEffect(() => {
    if (route?.params?.booking) {
      setActiveBooking(route.params.booking);
      return;
    }
    api.getBookings(user.id).then(data => {
      const bookings = data.bookings || [];
      const active = bookings.find(b => ['assigned', 'confirmed', 'in_progress'].includes(b.status));
      if (active) setActiveBooking(active);
    }).catch(() => {});
  }, [user.id, route?.params?.booking]);

  const goHome = () => navigation.navigate('Home');

  if (chatType) {
    return (
      <ChatView
        chatType={chatType}
        booking={booking}
        user={user}
        onBack={() => setChatType(null)}
      />
    );
  }

  return <ChatList booking={booking} onSelect={setChatType} onGoBack={goHome} />;
}

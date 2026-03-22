const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

// Get chat messages for a booking (driver <-> customer)
router.get('/driver/:bookingId', (req, res) => {
  const messages = db.chatMessages.filter(
    m => m.bookingId === req.params.bookingId && m.chatType === 'driver'
  );
  res.json({ messages });
});

// Send message to driver (from customer) or to customer (from driver)
router.post('/driver/:bookingId', (req, res) => {
  const { from, fromId, fromName, message } = req.body;
  const booking = db.bookings.find(b => b.id === req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const msg = {
    id: uuidv4(),
    bookingId: req.params.bookingId,
    chatType: 'driver',
    from, // 'customer' or 'driver'
    fromId,
    fromName,
    message,
    timestamp: new Date().toISOString(),
  };
  db.chatMessages.push(msg);

  // Emit to the other party via Socket.IO + broadcast to booking chat room
  if (from === 'customer' && booking.driverId) {
    global.io.to(`driver_${booking.driverId}`).emit('chat_message', msg);
    global.io.to(`chat_${req.params.bookingId}`).emit('chat_message', msg);
  } else if (from === 'driver' && booking.customerId) {
    global.io.to(`customer_${booking.customerId}`).emit('chat_message', msg);
    global.io.to(`chat_${req.params.bookingId}`).emit('chat_message', msg);
  }

  res.json({ message: msg });
});

// Get company chat conversations (for web portal)
router.get('/company', (req, res) => {
  // Return all company chats with latest info
  const chats = db.companyChats.map(chat => {
    const booking = db.bookings.find(b => b.id === chat.bookingId);
    return {
      ...chat,
      booking: booking || null,
    };
  });
  res.json({ chats });
});

// Get company chat messages for a specific conversation
router.get('/company/:chatId', (req, res) => {
  const chat = db.companyChats.find(c => c.id === req.params.chatId);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const booking = db.bookings.find(b => b.id === chat.bookingId);
  const driver = booking && booking.driverId ? db.drivers.find(d => d.id === booking.driverId) : null;

  res.json({ chat, booking, driver });
});

// Get company chats for a customer
router.get('/company/customer/:customerId', (req, res) => {
  const chats = db.companyChats.filter(c => c.customerId === req.params.customerId);
  res.json({ chats });
});

// Send message to company (from customer) or reply (from admin)
router.post('/company', (req, res) => {
  const { customerId, customerName, bookingId, from, fromName, message } = req.body;

  // Find or create conversation
  let chat = db.companyChats.find(c => c.bookingId === bookingId && c.customerId === customerId);
  if (!chat) {
    chat = {
      id: uuidv4(),
      customerId,
      customerName,
      bookingId,
      messages: [],
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      status: 'open',
    };
    db.companyChats.push(chat);
  }

  const msg = {
    id: uuidv4(),
    from, // 'customer' or 'admin'
    fromName,
    message,
    timestamp: new Date().toISOString(),
  };
  chat.messages.push(msg);
  chat.lastMessageAt = msg.timestamp;

  // Emit via Socket.IO
  if (from === 'customer') {
    global.io.to('admin').emit('company_chat_message', { chatId: chat.id, message: msg, chat });
  } else if (from === 'admin') {
    global.io.to(`customer_${customerId}`).emit('company_chat_message', { chatId: chat.id, message: msg });
  }

  res.json({ chat, message: msg });
});

// Resolve a company chat
router.put('/company/:chatId/resolve', (req, res) => {
  const chat = db.companyChats.find(c => c.id === req.params.chatId);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  chat.status = 'resolved';
  res.json({ chat });
});

module.exports = router;

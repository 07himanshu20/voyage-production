'use client';
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socket.on('connect', () => {
      console.log('[WebPortal] Socket connected:', socket.id);
      socket.emit('admin_connect');
    });
    socket.on('disconnect', (reason) => {
      console.log('[WebPortal] Socket disconnected:', reason);
    });
    socket.on('connect_error', (err) => {
      console.error('[WebPortal] Socket connect error:', err.message);
    });
  }
  return socket;
}

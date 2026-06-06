import { io } from 'socket.io-client';

const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(socketURL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 10,
});

socket.on('connect', () => {
  // Authenticate using cookie (backend reads access_token cookie automatically)
  socket.emit('authenticate', {});
});

socket.on('authenticated', ({ userId, username }) => {
  console.log(`[Socket] Authenticated: ${username} (${userId})`);
});

socket.on('authentication_error', ({ error }) => {
  console.warn('[Socket] Auth error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.warn('[Socket] Connect error:', err.message);
});

export const connectSocket = () => {
  if (!socket.connected) socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected) socket.disconnect();
};

export default socket;

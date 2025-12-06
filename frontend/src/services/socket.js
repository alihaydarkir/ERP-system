import { io } from 'socket.io-client';

const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(socketURL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

export default socket;


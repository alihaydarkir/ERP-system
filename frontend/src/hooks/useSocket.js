import { useEffect } from 'react';
import { socket } from '../services/socket';

export const useSocket = (eventName, callback) => {
  useEffect(() => {
    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [eventName, callback]);

  return socket;
};

export default useSocket;


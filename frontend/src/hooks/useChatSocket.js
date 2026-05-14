import { useEffect, useRef } from 'react';
import { socket } from '../services/socket';

export default function useChatSocket({ onApprovalUpdate }) {
  const lastEventRef = useRef('');

  useEffect(() => {
    const handleApprovalEvent = (payload) => {
      if (!payload || payload.type !== 'ai_approval_status_update') return;

      const dedupeKey = `${payload.approval_id}:${payload.status}:${payload.timestamp || ''}`;
      if (lastEventRef.current === dedupeKey) return;
      lastEventRef.current = dedupeKey;

      onApprovalUpdate?.(payload);
    };

    const handleNotification = (payload) => {
      handleApprovalEvent(payload);
    };

    socket.on('ai:approval_updated', handleApprovalEvent);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('ai:approval_updated', handleApprovalEvent);
      socket.off('notification', handleNotification);
    };
  }, [onApprovalUpdate]);
}

/**
 * Custom WebSocket hook for BingeBuddy.
 * Manages connection lifecycle, reconnection logic, and message handling.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '../utils/constants';

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket(path, onMessage, enabled = true) {
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const isExpectedClose = useRef(false);

  const connect = useCallback(() => {
    const tokens = JSON.parse(sessionStorage.getItem('tokens') || '{}');
    const url = `${WS_BASE_URL}${path}?token=${tokens.access || ''}`;

    // Reset expected close flag for new connection
    isExpectedClose.current = false;

    // Clean up any existing connection before creating a new one
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      // Only reconnect if it wasn't an expected close (cleanup)
      if (!isExpectedClose.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [path, onMessage]);

  useEffect(() => {
    if (!enabled) {
      // If disabled, clean up any existing connection
      if (wsRef.current) {
        isExpectedClose.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }
    connect();
    return () => {
      isExpectedClose.current = true; // Mark as intentional close
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, enabled]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { sendMessage, isConnected };
}

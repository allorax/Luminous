import { useState, useEffect } from 'react';

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/ws`;

let socket: WebSocket | null = null;
const listeners = new Map<string, Set<(data: any) => void>>();

function getSocket() {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'T') {
        const symbolListeners = listeners.get(data.sym);
        if (symbolListeners) {
          symbolListeners.forEach(listener => listener(data));
        }
      }
    };
    socket.onopen = () => {
      // Re-subscribe to all active symbols on reconnect
      const allSymbols = Array.from(listeners.keys());
      if (allSymbols.length > 0) {
        socket?.send(JSON.stringify({ type: 'SUBSCRIBE', symbols: allSymbols }));
      }
    };
  }
  return socket;
}

export function useTicker(symbol: string) {
  const [ticker, setTicker] = useState<{ price: number; change: number; changePercent: number } | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const ws = getSocket();

    const handleMessage = (data: any) => {
      setTicker({
        price: data.p,
        change: data.change,
        changePercent: data.changePercent
      });
    };

    if (!listeners.has(symbol)) {
      listeners.set(symbol, new Set());
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', symbols: [symbol] }));
      }
    }
    
    listeners.get(symbol)?.add(handleMessage);

    return () => {
      const symbolListeners = listeners.get(symbol);
      if (symbolListeners) {
        symbolListeners.delete(handleMessage);
        if (symbolListeners.size === 0) {
          listeners.delete(symbol);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'UNSUBSCRIBE', symbols: [symbol] }));
          }
        }
      }
    };
  }, [symbol]);

  return ticker;
}

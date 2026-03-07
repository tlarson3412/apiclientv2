import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { Typography } from '@/components/ui/typography';
import { useStore } from '@/store/useStore';
import { Plug, Unplug, Send, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WsMessage {
  id: string;
  direction: 'sent' | 'received';
  data: string;
  timestamp: number;
}

export function WebSocketPanel() {
  const [wsUrl, setWsUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [error, setError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const interpolateVariables = useStore(s => s.interpolateVariables);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleConnect = useCallback(() => {
    if (!wsUrl.trim()) return;

    setConnecting(true);
    setError('');

    const url = interpolateVariables(wsUrl);
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          direction: 'received',
          data: '[Connected]',
          timestamp: Date.now(),
        }]);
      };

      ws.onmessage = (event) => {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          direction: 'received',
          data: typeof event.data === 'string' ? event.data : '[Binary Data]',
          timestamp: Date.now(),
        }]);
      };

      ws.onclose = (event) => {
        setConnected(false);
        setConnecting(false);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          direction: 'received',
          data: `[Disconnected: ${event.code} ${event.reason || ''}]`,
          timestamp: Date.now(),
        }]);
      };

      ws.onerror = () => {
        setError('Connection failed');
        setConnecting(false);
      };
    } catch (err: any) {
      setError(err.message || 'Invalid WebSocket URL');
      setConnecting(false);
    }
  }, [wsUrl, interpolateVariables]);

  const handleDisconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
  };

  const handleSend = () => {
    if (!messageInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const data = interpolateVariables(messageInput);
    wsRef.current.send(data);
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      direction: 'sent',
      data,
      timestamp: Date.now(),
    }]);
    setMessageInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatData = (data: string) => {
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      return data;
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <input
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            placeholder="wss://echo.websocket.org or ws://localhost:8080"
            disabled={connected}
            className="w-full h-10 px-3 rounded-md border border-utility-mid bg-surface text-[14px] text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-2 focus:ring-standard-subdued font-mono disabled:opacity-50"
          />
        </div>
        {!connected ? (
          <Button
            variant="primary"
            size="medium"
            onClick={handleConnect}
            disabled={connecting || !wsUrl.trim()}
            className="h-10 min-w-[110px]"
          >
            {connecting ? (
              <div className="w-4 h-4 border-2 border-label-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plug className="w-4 h-4" />
                Connect
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="medium"
            onClick={handleDisconnect}
            className="h-10 min-w-[110px]"
          >
            <Unplug className="w-4 h-4" />
            Disconnect
          </Button>
        )}
      </div>

      {error && (
        <Typography variant="caption" className="text-status-danger-mid">{error}</Typography>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-status-success-mid' : 'bg-label-muted'
          )} />
          <Typography variant="caption" className={connected ? 'text-status-success-mid' : 'text-label-muted'}>
            {connected ? 'Connected' : 'Disconnected'}
          </Typography>
        </div>
        {messages.length > 0 && (
          <Button variant="text" size="small" onClick={() => setMessages([])}>
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-[200px] max-h-[400px] overflow-auto border border-utility-subdued rounded-md bg-surface">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full py-8">
            <Typography variant="body-small" className="text-label-muted">
              {connected ? 'No messages yet. Send a message below.' : 'Connect to a WebSocket server to start.'}
            </Typography>
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2 px-2 py-1.5 rounded text-[13px] font-mono',
                  msg.direction === 'sent'
                    ? 'bg-standard-subdued/10'
                    : msg.data.startsWith('[')
                      ? 'bg-utility-muted'
                      : 'bg-status-success-muted/30'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {msg.direction === 'sent' ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-standard-subdued" />
                  ) : (
                    <ArrowDownLeft className="w-3.5 h-3.5 text-status-success-mid" />
                  )}
                </div>
                <pre className="flex-1 whitespace-pre-wrap break-all text-label-vivid text-[12px]">
                  {formatData(msg.data)}
                </pre>
                <span className="flex-shrink-0 text-[11px] text-label-muted">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {connected && (
        <div className="flex items-start gap-2">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={2}
            className="flex-1 px-3 py-2 rounded-md border border-utility-mid bg-surface text-[13px] text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-2 focus:ring-standard-subdued font-mono resize-none"
          />
          <Button
            variant="primary"
            size="medium"
            onClick={handleSend}
            disabled={!messageInput.trim()}
            className="h-10"
          >
            <Send className="w-4 h-4" />
            Send
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getTokens } from "@/app/lib/api";
import type { WsEvent } from "@/app/lib/types";

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "authenticating"
  | "connected"
  | "error";

interface WsEventEntry {
  id: number;
  timestamp: number;
  type: string;
  payload: unknown;
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  disconnected: "bg-muted text-muted-foreground",
  connecting: "bg-yellow-600/20 text-yellow-400",
  authenticating: "bg-yellow-600/20 text-yellow-400",
  connected: "bg-green-600 text-white",
  error: "bg-destructive/20 text-destructive",
};

const WS_URL = "ws://localhost:3001/api/events";

export function WebSocketPanel() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [events, setEvents] = useState<WsEventEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const eventIdRef = useRef(0);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const addEvent = useCallback((type: string, payload: unknown) => {
    const entry: WsEventEntry = {
      id: ++eventIdRef.current,
      timestamp: Date.now(),
      type,
      payload,
    };
    setEvents((prev) => [...prev, entry]);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus("connecting");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("authenticating");
      addEvent("system", "Connection opened, sending auth...");

      const { accessToken } = getTokens();
      if (accessToken) {
        ws.send(JSON.stringify({ type: "auth", token: accessToken }));
      } else {
        addEvent("system.error", "No access token available");
        setStatus("error");
        ws.close();
      }
    };

    ws.onmessage = (event) => {
      try {
        const parsed: WsEvent = JSON.parse(event.data);
        addEvent(parsed.type, parsed.data ?? parsed);

        if (parsed.type === "auth.ok") {
          setStatus("connected");
        } else if (parsed.type === "auth.error") {
          setStatus("error");
        }
      } catch {
        addEvent("raw", event.data);
      }
    };

    ws.onerror = () => {
      addEvent("system.error", "WebSocket error occurred");
      setStatus("error");
    };

    ws.onclose = (event) => {
      addEvent("system", `Connection closed (code: ${event.code})`);
      setStatus("disconnected");
      wsRef.current = null;
    };
  }, [addEvent]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const isActive = status !== "disconnected" && status !== "error";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          WebSocket Events
          <Badge className={STATUS_COLORS[status]}>{status}</Badge>
          <Badge variant="outline" className="ml-auto font-mono text-xs">
            {events.length} events
          </Badge>
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearEvents}
            disabled={events.length === 0}
          >
            Clear Events
          </Button>
          <Button
            variant={isActive ? "destructive" : "default"}
            size="sm"
            onClick={isActive ? disconnect : connect}
          >
            {isActive ? "Disconnect" : "Connect"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="text-xs text-muted-foreground mb-2 font-mono">
          {WS_URL}
        </div>

        <Separator className="mb-3" />

        <ScrollArea className="h-[400px] rounded-md border">
          <div className="p-3 space-y-2">
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No events yet. Click &ldquo;Connect&rdquo; to start listening.
              </p>
            )}

            {events.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 text-xs font-mono"
              >
                <span className="shrink-0 text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <Badge
                  variant={
                    entry.type.startsWith("system.error") || entry.type === "auth.error"
                      ? "destructive"
                      : entry.type.startsWith("system")
                        ? "secondary"
                        : entry.type === "auth.ok"
                          ? "default"
                          : "outline"
                  }
                  className="shrink-0"
                >
                  {entry.type}
                </Badge>
                <pre className="flex-1 overflow-hidden text-ellipsis whitespace-pre-wrap text-muted-foreground break-all">
                  {typeof entry.payload === "string"
                    ? entry.payload
                    : JSON.stringify(entry.payload, null, 2)}
                </pre>
              </div>
            ))}

            <div ref={scrollEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

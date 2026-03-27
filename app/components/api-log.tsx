"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { subscribeToLog, getApiLog, clearApiLog } from "@/app/lib/api";
import type { ApiLogEntry } from "@/app/lib/types";

function relativeTime(timestamp: number): string {
  const diff = Math.round((Date.now() - timestamp) / 1000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function statusColor(status?: number): string {
  if (!status) return "bg-muted text-muted-foreground";
  if (status >= 200 && status < 300) return "bg-green-600 text-white";
  if (status >= 300 && status < 400) return "bg-yellow-600/20 text-yellow-400";
  if (status >= 400) return "bg-destructive/20 text-destructive";
  return "bg-muted text-muted-foreground";
}

function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return "bg-blue-600/20 text-blue-400";
    case "POST":
      return "bg-green-600/20 text-green-400";
    case "PUT":
    case "PATCH":
      return "bg-yellow-600/20 text-yellow-400";
    case "DELETE":
      return "bg-destructive/20 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function truncateUrl(url: string, maxLen = 60): string {
  // Strip origin for readability
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.length > maxLen ? path.slice(0, maxLen) + "..." : path;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + "..." : url;
  }
}

function LogEntryRow({ entry }: { entry: ApiLogEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow
        className={`cursor-pointer ${open ? "bg-muted/30" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <TableCell className="font-mono text-xs text-muted-foreground">
          {relativeTime(entry.timestamp)}
        </TableCell>
        <TableCell>
          <Badge className={methodColor(entry.method)}>{entry.method}</Badge>
        </TableCell>
        <TableCell className="font-mono text-xs max-w-[300px] truncate">
          {truncateUrl(entry.url)}
        </TableCell>
        <TableCell>
          {entry.error ? (
            <Badge className="bg-destructive/20 text-destructive">ERR</Badge>
          ) : (
            <Badge className={statusColor(entry.status)}>
              {entry.status ?? "---"}
            </Badge>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs text-right">
          {entry.durationMs != null ? `${entry.durationMs}ms` : "---"}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow>
          <TableCell colSpan={5} className="p-0">
            <div className="bg-muted/20 border-t border-b p-4 space-y-3">
              {entry.requestBody !== undefined && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Request Body
                  </p>
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-48">
                    {JSON.stringify(entry.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {entry.responseBody !== undefined && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Response Body
                  </p>
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-48">
                    {typeof entry.responseBody === "string"
                      ? entry.responseBody
                      : JSON.stringify(entry.responseBody, null, 2)}
                  </pre>
                </div>
              )}

              {entry.error && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">
                    Error
                  </p>
                  <pre className="rounded-md bg-destructive/10 p-3 text-xs text-destructive overflow-auto max-h-48">
                    {entry.error}
                  </pre>
                </div>
              )}

              {entry.requestBody === undefined &&
                entry.responseBody === undefined &&
                !entry.error && (
                  <p className="text-xs text-muted-foreground">
                    No request/response body recorded.
                  </p>
                )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function ApiLog() {
  const [entries, setEntries] = useState<ApiLogEntry[]>(() => getApiLog());
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const unsub = subscribeToLog((newEntries) => {
      setEntries(newEntries);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries;
    const q = filter.toLowerCase();
    return entries.filter(
      (e) =>
        e.url.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        (e.status != null && String(e.status).includes(q))
    );
  }, [entries, filter]);

  const stats = useMemo(() => {
    if (entries.length === 0)
      return { count: 0, avgDuration: 0, errorRate: 0 };

    const withDuration = entries.filter((e) => e.durationMs != null);
    const avgDuration =
      withDuration.length > 0
        ? Math.round(
            withDuration.reduce((s, e) => s + (e.durationMs ?? 0), 0) /
              withDuration.length
          )
        : 0;

    const errors = entries.filter(
      (e) => e.error || (e.status != null && e.status >= 400)
    );
    const errorRate =
      entries.length > 0 ? Math.round((errors.length / entries.length) * 100) : 0;

    return { count: entries.length, avgDuration, errorRate };
  }, [entries]);

  const handleClear = useCallback(() => {
    clearApiLog();
    setFilter("");
  }, []);

  return (
    <Sheet>
      {/* Sticky trigger bar at the bottom of the page */}
      <SheetTrigger
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t bg-background/95 backdrop-blur px-4 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">
            API Log ({stats.count} requests)
          </span>
          {stats.count > 0 && (
            <>
              <Badge variant="outline" className="font-mono text-xs">
                avg {stats.avgDuration}ms
              </Badge>
              <Badge
                className={
                  stats.errorRate > 0
                    ? "bg-destructive/20 text-destructive"
                    : "bg-green-600/20 text-green-400"
                }
              >
                {stats.errorRate}% errors
              </Badge>
            </>
          )}
        </div>
        <span className="text-muted-foreground text-xs">Click to expand</span>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[60vh] flex flex-col p-0">
        <SheetHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SheetTitle>API Log</SheetTitle>
              <SheetDescription>
                {stats.count} requests | avg {stats.avgDuration}ms |{" "}
                {stats.errorRate}% errors
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter by URL, method, or status..."
                value={filter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilter(e.target.value)
                }
                className="w-64 h-8 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={entries.length === 0}
              >
                Clear Log
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              {entries.length === 0
                ? "No API calls recorded yet."
                : "No matching entries."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Time</TableHead>
                  <TableHead className="w-[70px]">Method</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-[70px]">Status</TableHead>
                  <TableHead className="w-[70px] text-right">
                    Duration
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <LogEntryRow key={entry.id} entry={entry} />
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import * as api from "@/app/lib/api";
import type { HealthResponse } from "@/app/lib/types";

export function HealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.healthCheck();
      setHealth(res.data);
      setDurationMs(res.durationMs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHealth(null);
      setDurationMs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Check</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Health"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {health && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Status:
              </span>
              <Badge
                variant={health.status === "ok" ? "default" : "destructive"}
                className={
                  health.status === "ok"
                    ? "bg-green-600 text-white"
                    : undefined
                }
              >
                {health.status}
              </Badge>

              {durationMs !== null && (
                <Badge variant="outline">{durationMs}ms</Badge>
              )}
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timestamp</span>
                <span className="font-mono text-xs">
                  {new Date(health.timestamp).toLocaleString()}
                </span>
              </div>

              {health.accounts && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Active Accounts
                    </span>
                    <Badge variant="secondary">{health.accounts.active}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Error Accounts
                    </span>
                    <Badge
                      variant={
                        health.accounts.error > 0 ? "destructive" : "secondary"
                      }
                    >
                      {health.accounts.error}
                    </Badge>
                  </div>
                </>
              )}

              {health.idleConnections !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Idle Connections
                  </span>
                  <Badge variant="secondary">{health.idleConnections}</Badge>
                </div>
              )}
            </div>

            <Collapsible open={showRaw} onOpenChange={setShowRaw}>
              <CollapsibleTrigger
                className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer"
              >
                {showRaw ? "Hide" : "Show"} raw JSON
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(health, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {!health && !error && !loading && (
          <p className="text-sm text-muted-foreground">
            No health data yet. Click &ldquo;Check Health&rdquo; to start.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

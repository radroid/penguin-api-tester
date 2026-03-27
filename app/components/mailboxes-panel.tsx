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
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import * as api from "@/app/lib/api";
import type { Mailbox, MailboxDetail } from "@/app/lib/types";
import { cn } from "@/lib/utils";

interface MailboxesPanelProps {
  accountId: string;
  onSelectMailbox?: (id: string, name: string) => void;
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  inbox: "default",
  sent: "secondary",
  drafts: "secondary",
  trash: "outline",
  spam: "outline",
  archive: "secondary",
  all: "outline",
};

export function MailboxesPanel({
  accountId,
  onSelectMailbox,
}: MailboxesPanelProps) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<
    Record<string, MailboxDetail>
  >({});
  const [detailLoading, setDetailLoading] = useState<
    Record<string, boolean>
  >({});

  const fetchMailboxes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listMailboxes(accountId);
      setMailboxes(res.data);
      setDurationMs(res.durationMs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMailboxes([]);
      setDurationMs(null);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    setExpandedDetails({});
    fetchMailboxes();
  }, [fetchMailboxes]);

  const handleGetDetails = async (id: string) => {
    if (expandedDetails[id]) {
      setExpandedDetails((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    setDetailLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.getMailbox(id);
      setExpandedDetails((prev) => ({ ...prev, [id]: res.data }));
    } catch {
      setError("Failed to load mailbox details");
    } finally {
      setDetailLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mailboxes</CardTitle>
        <CardAction className="flex items-center gap-2">
          {durationMs !== null && (
            <Badge variant="outline">{durationMs}ms</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMailboxes}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {mailboxes.length === 0 && !loading && !error && (
          <p className="text-sm text-muted-foreground">
            No mailboxes found for this account.
          </p>
        )}

        {mailboxes.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Unseen</TableHead>
                <TableHead>Selectable</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mailboxes.map((mailbox) => {
                const isExpanded = !!expandedDetails[mailbox.id];
                const isSelectable = mailbox.selectable;
                const roleVariant = mailbox.role
                  ? ROLE_VARIANT[mailbox.role] ?? "outline"
                  : "outline";

                return (
                  <MailboxRow
                    key={mailbox.id}
                    mailbox={mailbox}
                    roleVariant={roleVariant}
                    isSelectable={isSelectable}
                    isExpanded={isExpanded}
                    detailLoading={!!detailLoading[mailbox.id]}
                    detail={expandedDetails[mailbox.id] ?? null}
                    onSelect={() => {
                      if (isSelectable && onSelectMailbox) {
                        onSelectMailbox(mailbox.id, mailbox.name);
                      }
                    }}
                    onToggleDetails={() => handleGetDetails(mailbox.id)}
                  />
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MailboxRow({
  mailbox,
  roleVariant,
  isSelectable,
  isExpanded,
  detailLoading,
  detail,
  onSelect,
  onToggleDetails,
}: {
  mailbox: Mailbox;
  roleVariant: "default" | "secondary" | "outline";
  isSelectable: boolean;
  isExpanded: boolean;
  detailLoading: boolean;
  detail: MailboxDetail | null;
  onSelect: () => void;
  onToggleDetails: () => void;
}) {
  return (
    <>
      <TableRow
        className={cn(
          isSelectable ? "cursor-pointer" : "opacity-50 cursor-default"
        )}
        onClick={onSelect}
      >
        <TableCell
          className={cn(
            "font-medium",
            !isSelectable && "text-muted-foreground"
          )}
        >
          {mailbox.name}
        </TableCell>
        <TableCell className="font-mono text-xs">{mailbox.path}</TableCell>
        <TableCell>
          {mailbox.role ? (
            <Badge variant={roleVariant}>{mailbox.role}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">--</span>
          )}
        </TableCell>
        <TableCell className="text-right font-mono">
          {mailbox.totalMessages}
        </TableCell>
        <TableCell className="text-right font-mono">
          {mailbox.unseenMessages > 0 ? (
            <Badge variant="secondary">{mailbox.unseenMessages}</Badge>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </TableCell>
        <TableCell>
          {isSelectable ? (
            <span className="text-green-600">Yes</span>
          ) : (
            <span className="text-muted-foreground">No</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="xs"
              onClick={onToggleDetails}
              disabled={detailLoading}
            >
              {detailLoading ? "..." : isExpanded ? "Hide" : "Details"}
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && detail && (
        <TableRow>
          <TableCell colSpan={7} className="p-0">
            <div className="m-2 space-y-2">
              {detail.syncCheckpoint && (
                <div className="rounded-md border p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Sync Checkpoint
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">UID Validity</span>
                    <span className="font-mono">
                      {detail.syncCheckpoint.uidValidity}
                    </span>
                    <span className="text-muted-foreground">Highest UID</span>
                    <span className="font-mono">
                      {detail.syncCheckpoint.highestUid}
                    </span>
                    <span className="text-muted-foreground">
                      Highest Modseq
                    </span>
                    <span className="font-mono">
                      {detail.syncCheckpoint.highestModseq}
                    </span>
                    <span className="text-muted-foreground">Synced At</span>
                    <span className="font-mono">
                      {new Date(
                        detail.syncCheckpoint.syncedAt
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(detail, null, 2)}
              </pre>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

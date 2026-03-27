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
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import * as api from "@/app/lib/api";
import type { Account } from "@/app/lib/types";
import { cn } from "@/lib/utils";

interface AccountsPanelProps {
  onSelectAccount: (id: string, email: string) => void;
  selectedAccountId: string | null;
}

const SYNC_STATUS_VARIANT: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  active: { variant: "default", className: "bg-green-600 text-white" },
  pending: { variant: "secondary" },
  paused: { variant: "outline" },
  error: { variant: "destructive" },
};

export function AccountsPanel({
  onSelectAccount,
  selectedAccountId,
}: AccountsPanelProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<
    Record<string, unknown>
  >({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [syncLoading, setSyncLoading] = useState<Record<string, boolean>>({});

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAccounts();
      setAccounts(res.data);
      setDurationMs(res.durationMs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setAccounts([]);
      setDurationMs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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
      const res = await api.getAccount(id);
      setExpandedDetails((prev) => ({ ...prev, [id]: res.data }));
    } catch (err) {
      toast.error(
        `Failed to get account details: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setDetailLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleSync = async (id: string) => {
    setSyncLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.triggerSync(id);
      toast.success(res.data.message || "Sync triggered");
    } catch (err) {
      toast.error(
        `Sync failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setSyncLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAccount(id);
      toast.success("Account deleted");
      fetchAccounts();
    } catch (err) {
      toast.error(
        `Delete failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleString();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Accounts</CardTitle>
        <CardAction className="flex items-center gap-2">
          {durationMs !== null && (
            <Badge variant="outline">{durationMs}ms</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccounts}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh Accounts"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {accounts.length === 0 && !loading && !error && (
          <p className="text-sm text-muted-foreground">
            No accounts found. Connect an account via OAuth on the backend.
          </p>
        )}

        {accounts.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Last Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const statusStyle = SYNC_STATUS_VARIANT[account.syncStatus] ?? {
                  variant: "outline" as const,
                };
                const isSelected = account.id === selectedAccountId;
                const isExpanded = !!expandedDetails[account.id];

                return (
                  <AccountRow
                    key={account.id}
                    account={account}
                    statusStyle={statusStyle}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    detailLoading={!!detailLoading[account.id]}
                    syncLoading={!!syncLoading[account.id]}
                    onSelect={() =>
                      onSelectAccount(account.id, account.email)
                    }
                    onToggleDetails={() => handleGetDetails(account.id)}
                    onSync={() => handleSync(account.id)}
                    onDelete={() => handleDelete(account.id)}
                    expandedData={expandedDetails[account.id]}
                    formatDate={formatDate}
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

function AccountRow({
  account,
  statusStyle,
  isSelected,
  isExpanded,
  detailLoading,
  syncLoading,
  onSelect,
  onToggleDetails,
  onSync,
  onDelete,
  expandedData,
  formatDate,
}: {
  account: Account;
  statusStyle: { variant: "default" | "secondary" | "destructive" | "outline"; className?: string };
  isSelected: boolean;
  isExpanded: boolean;
  detailLoading: boolean;
  syncLoading: boolean;
  onSelect: () => void;
  onToggleDetails: () => void;
  onSync: () => void;
  onDelete: () => void;
  expandedData: unknown;
  formatDate: (d: string | null) => string;
}) {
  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer",
          isSelected && "bg-primary/5 ring-1 ring-primary/20"
        )}
        onClick={onSelect}
      >
        <TableCell className="font-medium">{account.email}</TableCell>
        <TableCell>{account.provider}</TableCell>
        <TableCell>
          <Badge
            variant={statusStyle.variant}
            className={statusStyle.className}
          >
            {account.syncStatus}
          </Badge>
        </TableCell>
        <TableCell className="text-xs">
          {formatDate(account.lastSyncAt)}
        </TableCell>
        <TableCell
          className="max-w-[200px] truncate text-xs text-destructive"
          title={account.lastError ?? undefined}
        >
          {account.lastError ?? "--"}
        </TableCell>
        <TableCell className="text-right">
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="xs"
              onClick={onToggleDetails}
              disabled={detailLoading}
            >
              {detailLoading ? "..." : isExpanded ? "Hide" : "Details"}
            </Button>

            <Button
              variant="ghost"
              size="xs"
              onClick={onSync}
              disabled={syncLoading}
            >
              {syncLoading ? "..." : "Sync"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" size="xs">
                    Delete
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete{" "}
                    <strong>{account.email}</strong>? This action cannot be
                    undone. All synced data for this account will be removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={onDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && expandedData && (
        <TableRow>
          <TableCell colSpan={6} className="p-0">
            <pre className="m-2 max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(expandedData, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  listMessages,
  getMessage,
  updateMessageFlags,
  batchMessages,
  deleteMessage,
  getAttachmentUrl,
} from '@/app/lib/api'
import type {
  MessageSummary,
  MessageDetail,
  BatchAction,
} from '@/app/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface MessagesPanelProps {
  accountId: string
  mailboxId?: string | null
}

export function MessagesPanel({ accountId, mailboxId }: MessagesPanelProps) {
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [mailboxOverride, setMailboxOverride] = useState(mailboxId ?? '')
  const [limit, setLimit] = useState('50')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastStatus, setLastStatus] = useState<number | null>(null)
  const [lastDuration, setLastDuration] = useState<number | null>(null)

  // Expanded message detail
  const [expandedMessage, setExpandedMessage] = useState<MessageDetail | null>(null)
  const [expandLoading, setExpandLoading] = useState(false)

  // Batch operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchAction, setBatchAction] = useState<BatchAction>('markRead')
  const [batchResult, setBatchResult] = useState<string | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)

  // Flag states tracking (local optimistic)
  const [flagStates, setFlagStates] = useState<
    Record<string, { isSeen?: boolean; isFlagged?: boolean }>
  >({})

  const fetchMessages = useCallback(
    async (useCursor?: string | null) => {
      if (!accountId) return
      setLoading(true)
      setError(null)
      try {
        const res = await listMessages(accountId, {
          mailboxId: mailboxOverride || undefined,
          cursor: useCursor || undefined,
          limit: Number(limit) || 50,
        })
        if (useCursor) {
          setMessages((prev) => [...prev, ...res.data.data])
        } else {
          setMessages(res.data.data)
        }
        setCursor(res.data.nextCursor)
        setHasMore(res.data.hasMore)
        setLastStatus(res.status)
        setLastDuration(res.durationMs)
      } catch (err) {
        const e = err as Error & { status?: number }
        setError(e.message)
        setLastStatus(e.status ?? null)
      } finally {
        setLoading(false)
      }
    },
    [accountId, mailboxOverride, limit],
  )

  // Auto-fetch when accountId or mailboxId prop changes
  useEffect(() => {
    setMailboxOverride(mailboxId ?? '')
    setMessages([])
    setCursor(null)
    setHasMore(false)
    setExpandedMessage(null)
    setSelectedIds(new Set())
    setFlagStates({})
  }, [accountId, mailboxId])

  useEffect(() => {
    if (accountId) {
      fetchMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, mailboxId])

  const handleViewMessage = async (id: string) => {
    if (expandedMessage?.id === id) {
      setExpandedMessage(null)
      return
    }
    setExpandLoading(true)
    try {
      const res = await getMessage(id)
      setExpandedMessage(res.data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setExpandLoading(false)
    }
  }

  const handleUpdateFlag = async (
    id: string,
    flags: { isSeen?: boolean; isFlagged?: boolean },
  ) => {
    try {
      const res = await updateMessageFlags(id, flags)
      setFlagStates((prev) => ({
        ...prev,
        [id]: { isSeen: res.data.isSeen, isFlagged: res.data.isFlagged },
      }))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMessage(id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
      if (expandedMessage?.id === id) setExpandedMessage(null)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(messages.map((m) => m.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleBatchExecute = async () => {
    if (selectedIds.size === 0) return
    setBatchLoading(true)
    setBatchResult(null)
    try {
      const res = await batchMessages({
        action: batchAction,
        messageIds: Array.from(selectedIds),
      })
      setBatchResult(
        `Action: ${res.data.action} | Accepted: ${res.data.accepted} | IDs: ${res.data.messageIds.length} | ${res.durationMs}ms`,
      )
    } catch (err) {
      setBatchResult(`Error: ${(err as Error).message}`)
    } finally {
      setBatchLoading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const truncate = (str: string, len: number) =>
    str.length > len ? str.slice(0, len) + '...' : str

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="msg-mailbox">Mailbox ID</Label>
            <Input
              id="msg-mailbox"
              placeholder="Optional mailbox ID"
              value={mailboxOverride}
              onChange={(e) => setMailboxOverride(e.target.value)}
              className="w-56"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="msg-limit">Limit</Label>
            <Input
              id="msg-limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-20"
            />
          </div>
          <Button onClick={() => fetchMessages()} disabled={loading || !accountId}>
            {loading ? 'Fetching...' : 'Fetch Messages'}
          </Button>
        </div>

        {/* Status info */}
        {(lastStatus !== null || lastDuration !== null) && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {lastStatus !== null && <span>Status: {lastStatus}</span>}
            {lastDuration !== null && <span>Duration: {lastDuration}ms</span>}
            <span>Count: {messages.length}</span>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Messages Table */}
        {messages.length > 0 && (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={selectedIds.size === messages.length && messages.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked)}
                    />
                  </TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Attach</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => {
                  const flags = flagStates[msg.id]
                  return (
                    <TableRow
                      key={msg.id}
                      className={cn(
                        expandedMessage?.id === msg.id && 'bg-muted/50',
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(msg.id)}
                          onCheckedChange={(checked) =>
                            handleToggleSelect(msg.id, checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="max-w-[200px]" title={msg.subject}>
                        {truncate(msg.subject, 40)}
                      </TableCell>
                      <TableCell className="max-w-[150px]" title={msg.fromAddress.address}>
                        {msg.fromAddress.name || msg.fromAddress.address}
                      </TableCell>
                      <TableCell>
                        {new Date(msg.sentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {msg.hasAttachments && (
                          <Badge variant="secondary">Attach</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatSize(msg.size)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleViewMessage(msg.id)}
                            disabled={expandLoading}
                          >
                            {expandedMessage?.id === msg.id ? 'Close' : 'View'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              handleUpdateFlag(msg.id, {
                                isSeen: !(flags?.isSeen ?? true),
                              })
                            }
                          >
                            {flags?.isSeen === false ? 'Mark Read' : 'Mark Unread'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              handleUpdateFlag(msg.id, {
                                isFlagged: !(flags?.isFlagged ?? false),
                              })
                            }
                          >
                            {flags?.isFlagged ? 'Unstar' : 'Star'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => handleDelete(msg.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Expanded message detail */}
        {expandedMessage && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Subject:</span> {expandedMessage.subject}
              </div>
              <div>
                <span className="font-medium">From:</span>{' '}
                {expandedMessage.fromAddress.name
                  ? `${expandedMessage.fromAddress.name} <${expandedMessage.fromAddress.address}>`
                  : expandedMessage.fromAddress.address}
              </div>
              <div>
                <span className="font-medium">To:</span>{' '}
                {expandedMessage.toAddresses
                  .map((a) => (a.name ? `${a.name} <${a.address}>` : a.address))
                  .join(', ')}
              </div>
              {expandedMessage.ccAddresses.length > 0 && (
                <div>
                  <span className="font-medium">CC:</span>{' '}
                  {expandedMessage.ccAddresses
                    .map((a) => (a.name ? `${a.name} <${a.address}>` : a.address))
                    .join(', ')}
                </div>
              )}
              {expandedMessage.bccAddresses.length > 0 && (
                <div>
                  <span className="font-medium">BCC:</span>{' '}
                  {expandedMessage.bccAddresses
                    .map((a) => (a.name ? `${a.name} <${a.address}>` : a.address))
                    .join(', ')}
                </div>
              )}
              <div>
                <span className="font-medium">Date:</span>{' '}
                {new Date(expandedMessage.sentDate).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Message-ID:</span>{' '}
                {expandedMessage.messageId}
              </div>
            </div>

            <Separator />

            {/* Body */}
            {expandedMessage.bodyHtml ? (
              <iframe
                srcDoc={expandedMessage.bodyHtml}
                sandbox="allow-same-origin"
                title="Email body"
                className="h-[300px] w-full rounded border bg-white"
              />
            ) : expandedMessage.bodyText ? (
              <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-sm">
                {expandedMessage.bodyText}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">No body content</p>
            )}

            {/* Attachments */}
            {expandedMessage.attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Attachments ({expandedMessage.attachments.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {expandedMessage.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={getAttachmentUrl(expandedMessage.id, att.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
                    >
                      <span className="font-medium">{att.filename}</span>
                      <span className="text-muted-foreground">
                        ({formatSize(att.size)})
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <Button
            variant="outline"
            onClick={() => fetchMessages(cursor)}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        )}

        {/* Batch Operations */}
        {messages.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">
                Batch Operations ({selectedIds.size} selected)
              </h4>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Action</Label>
                  <Select
                    value={batchAction}
                    onValueChange={(val) => setBatchAction(val as BatchAction)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markRead">Mark Read</SelectItem>
                      <SelectItem value="markUnread">Mark Unread</SelectItem>
                      <SelectItem value="flag">Flag</SelectItem>
                      <SelectItem value="unflag">Unflag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleBatchExecute}
                  disabled={batchLoading || selectedIds.size === 0}
                >
                  {batchLoading ? 'Executing...' : 'Execute Batch'}
                </Button>
              </div>
              {batchResult && (
                <div className="rounded-md bg-muted p-2 text-xs font-mono">
                  {batchResult}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

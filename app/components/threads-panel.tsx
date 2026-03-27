'use client'

import { useState, useCallback } from 'react'
import { listThreads, getThread, getAttachmentUrl } from '@/app/lib/api'
import type { ThreadSummary, ThreadDetail } from '@/app/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

interface ThreadsPanelProps {
  accountId: string
}

export function ThreadsPanel({ accountId }: ThreadsPanelProps) {
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [limit, setLimit] = useState('25')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastStatus, setLastStatus] = useState<number | null>(null)
  const [lastDuration, setLastDuration] = useState<number | null>(null)

  // Expanded thread
  const [expandedThread, setExpandedThread] = useState<ThreadDetail | null>(null)
  const [expandLoading, setExpandLoading] = useState(false)

  const fetchThreads = useCallback(
    async (useCursor?: string | null) => {
      if (!accountId) return
      setLoading(true)
      setError(null)
      try {
        const res = await listThreads(accountId, {
          cursor: useCursor || undefined,
          limit: Number(limit) || 25,
        })
        if (useCursor) {
          setThreads((prev) => [...prev, ...res.data.data])
        } else {
          setThreads(res.data.data)
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
    [accountId, limit],
  )

  const handleViewThread = async (threadId: string) => {
    if (expandedThread?.threadId === threadId) {
      setExpandedThread(null)
      return
    }
    setExpandLoading(true)
    try {
      const res = await getThread(threadId)
      setExpandedThread(res.data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setExpandLoading(false)
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
        <CardTitle>Threads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="thread-limit">Limit</Label>
            <Input
              id="thread-limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-20"
            />
          </div>
          <Button onClick={() => fetchThreads()} disabled={loading || !accountId}>
            {loading ? 'Fetching...' : 'Fetch Threads'}
          </Button>
        </div>

        {/* Status info */}
        {(lastStatus !== null || lastDuration !== null) && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {lastStatus !== null && <span>Status: {lastStatus}</span>}
            {lastDuration !== null && <span>Duration: {lastDuration}ms</span>}
            <span>Count: {threads.length}</span>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Threads Table */}
        {threads.length > 0 && (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Latest Date</TableHead>
                  <TableHead>Snippet</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {threads.map((thread) => (
                  <TableRow
                    key={thread.threadId}
                    className={
                      expandedThread?.threadId === thread.threadId
                        ? 'bg-muted/50'
                        : undefined
                    }
                  >
                    <TableCell className="max-w-[200px]" title={thread.subject}>
                      {truncate(thread.subject, 40)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{thread.messageCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(thread.latestDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[200px]" title={thread.snippet}>
                      {truncate(thread.snippet, 50)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleViewThread(thread.threadId)}
                        disabled={expandLoading}
                      >
                        {expandedThread?.threadId === thread.threadId
                          ? 'Close'
                          : 'View Thread'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Expanded thread detail */}
        {expandedThread && (
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="text-sm font-medium">
              Thread: {expandedThread.threadId} ({expandedThread.messages.length}{' '}
              messages)
            </h4>
            <Accordion multiple>
              {expandedThread.messages.map((msg, idx) => (
                <AccordionItem key={msg.id} value={msg.id}>
                  <AccordionTrigger>
                    <div className="flex flex-1 items-center gap-2 text-sm">
                      <span className="font-medium">
                        {msg.fromAddress.name || msg.fromAddress.address}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(msg.sentDate).toLocaleString()}
                      </span>
                      {msg.hasAttachments && (
                        <Badge variant="secondary">Attach</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        #{idx + 1}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pl-1">
                      {/* Headers */}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>
                          To:{' '}
                          {msg.toAddresses
                            .map((a) =>
                              a.name ? `${a.name} <${a.address}>` : a.address,
                            )
                            .join(', ')}
                        </div>
                        {msg.ccAddresses.length > 0 && (
                          <div>
                            CC:{' '}
                            {msg.ccAddresses
                              .map((a) =>
                                a.name ? `${a.name} <${a.address}>` : a.address,
                              )
                              .join(', ')}
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Body */}
                      {msg.bodyHtml ? (
                        <iframe
                          srcDoc={msg.bodyHtml}
                          sandbox="allow-same-origin"
                          title={`Message ${idx + 1} body`}
                          className="h-[250px] w-full rounded border bg-white"
                        />
                      ) : msg.bodyText ? (
                        <pre className="max-h-[250px] overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-sm">
                          {msg.bodyText}
                        </pre>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No body content
                        </p>
                      )}

                      {/* Attachments */}
                      {msg.attachments.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium">
                            Attachments ({msg.attachments.length})
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={getAttachmentUrl(msg.id, att.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted"
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
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <Button
            variant="outline"
            onClick={() => fetchThreads(cursor)}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

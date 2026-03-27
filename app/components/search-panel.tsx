'use client'

import { useState } from 'react'
import { searchMessages } from '@/app/lib/api'
import type { SearchResult } from '@/app/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

interface SearchPanelProps {
  accountId: string
}

export function SearchPanel({ accountId }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [mailboxId, setMailboxId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [after, setAfter] = useState('')
  const [before, setBefore] = useState('')
  const [hasAttachments, setHasAttachments] = useState(false)
  const [isFlagged, setIsFlagged] = useState(false)
  const [limit, setLimit] = useState('25')

  const [results, setResults] = useState<SearchResult[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastStatus, setLastStatus] = useState<number | null>(null)
  const [lastDuration, setLastDuration] = useState<number | null>(null)

  const handleSearch = async () => {
    if (!accountId || !query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await searchMessages(accountId, {
        query: query.trim(),
        mailboxId: mailboxId || undefined,
        from: from || undefined,
        to: to || undefined,
        after: after || undefined,
        before: before || undefined,
        hasAttachments: hasAttachments || undefined,
        isFlagged: isFlagged || undefined,
        limit: Number(limit) || 25,
      })
      setResults(res.data.data)
      setCount(res.data.count)
      setLastStatus(res.status)
      setLastDuration(res.durationMs)
    } catch (err) {
      const e = err as Error & { status?: number }
      setError(e.message)
      setLastStatus(e.status ?? null)
    } finally {
      setLoading(false)
    }
  }

  const truncate = (str: string, len: number) =>
    str.length > len ? str.slice(0, len) + '...' : str

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search form */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="search-query">Query (required)</Label>
            <Input
              id="search-query"
              placeholder="Search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="search-mailbox">Mailbox ID</Label>
            <Input
              id="search-mailbox"
              placeholder="Optional"
              value={mailboxId}
              onChange={(e) => setMailboxId(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="search-from">From</Label>
            <Input
              id="search-from"
              placeholder="Optional"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="search-to">To</Label>
            <Input
              id="search-to"
              placeholder="Optional"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="search-after">After</Label>
            <Input
              id="search-after"
              type="date"
              value={after}
              onChange={(e) => setAfter(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="search-before">Before</Label>
            <Input
              id="search-before"
              type="date"
              value={before}
              onChange={(e) => setBefore(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="search-limit">Limit</Label>
            <Input
              id="search-limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-20"
            />
          </div>
          <div className="flex items-center gap-6 pt-5">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={hasAttachments}
                onCheckedChange={(checked) => setHasAttachments(checked)}
              />
              Has Attachments
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isFlagged}
                onCheckedChange={(checked) => setIsFlagged(checked)}
              />
              Flagged
            </label>
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={loading || !accountId || !query.trim()}
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>

        {/* Status info */}
        {(lastStatus !== null || lastDuration !== null || count !== null) && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {lastStatus !== null && <span>Status: {lastStatus}</span>}
            {lastDuration !== null && <span>Duration: {lastDuration}ms</span>}
            {count !== null && <span>Results: {count}</span>}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Attach</TableHead>
                  <TableHead>Relevance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="max-w-[200px]" title={result.subject}>
                      {truncate(result.subject, 40)}
                    </TableCell>
                    <TableCell
                      className="max-w-[150px]"
                      title={result.fromAddress.address}
                    >
                      {result.fromAddress.name || result.fromAddress.address}
                    </TableCell>
                    <TableCell>
                      {new Date(result.sentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {result.hasAttachments && (
                        <Badge variant="secondary">Attach</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {result.relevanceScore.toFixed(2)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {results.length === 0 && count === 0 && (
          <p className="text-sm text-muted-foreground">No results found.</p>
        )}
      </CardContent>
    </Card>
  )
}

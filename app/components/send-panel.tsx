'use client'

import { useState } from 'react'
import { sendEmail, saveDraft } from '@/app/lib/api'
import type { EmailAddress } from '@/app/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface SendPanelProps {
  accountId: string
}

function parseAddresses(input: string): EmailAddress[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const match = s.match(/^(.+?)\s*<(.+?)>$/)
      if (match) return { name: match[1].trim(), address: match[2].trim() }
      return { address: s }
    })
}

export function SendPanel({ accountId }: SendPanelProps) {
  // Send Email state
  const [sendTo, setSendTo] = useState('')
  const [sendCc, setSendCc] = useState('')
  const [sendBcc, setSendBcc] = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendBodyText, setSendBodyText] = useState('')
  const [sendBodyHtml, setSendBodyHtml] = useState('')
  const [sendInReplyTo, setSendInReplyTo] = useState('')
  const [sendReferences, setSendReferences] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  // Save Draft state
  const [draftTo, setDraftTo] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBodyText, setDraftBodyText] = useState('')
  const [draftBodyHtml, setDraftBodyHtml] = useState('')
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftResult, setDraftResult] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!accountId || !sendTo.trim() || !sendSubject.trim()) return
    setSendLoading(true)
    setSendError(null)
    setSendResult(null)
    try {
      const toAddresses = parseAddresses(sendTo)
      const ccAddresses = sendCc ? parseAddresses(sendCc) : undefined
      const bccAddresses = sendBcc ? parseAddresses(sendBcc) : undefined
      const references = sendReferences
        ? sendReferences
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined

      const res = await sendEmail(accountId, {
        to: toAddresses,
        cc: ccAddresses,
        bcc: bccAddresses,
        subject: sendSubject,
        bodyText: sendBodyText || undefined,
        bodyHtml: sendBodyHtml || undefined,
        inReplyTo: sendInReplyTo || undefined,
        references,
      })
      setSendResult(
        `Queued! outboxId: ${res.data.outboxId} | status: ${res.data.status} | ${res.durationMs}ms`,
      )
    } catch (err) {
      setSendError((err as Error).message)
    } finally {
      setSendLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!accountId || !draftSubject.trim()) return
    setDraftLoading(true)
    setDraftError(null)
    setDraftResult(null)
    try {
      const toAddresses = draftTo ? parseAddresses(draftTo) : undefined

      const res = await saveDraft(accountId, {
        to: toAddresses,
        subject: draftSubject,
        bodyText: draftBodyText || undefined,
        bodyHtml: draftBodyHtml || undefined,
      })
      setDraftResult(`${res.data.message} | ${res.durationMs}ms`)
    } catch (err) {
      setDraftError((err as Error).message)
    } finally {
      setDraftLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send & Drafts</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="send">
          <TabsList>
            <TabsTrigger value="send">Send Email</TabsTrigger>
            <TabsTrigger value="draft">Save Draft</TabsTrigger>
          </TabsList>

          {/* Send Email Tab */}
          <TabsContent value="send">
            <div className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label htmlFor="send-to">
                  To (comma-separated, e.g. &quot;Name &lt;email&gt;, email2&quot;)
                </Label>
                <Input
                  id="send-to"
                  placeholder="user@example.com, Name <other@example.com>"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="send-cc">CC (optional)</Label>
                  <Input
                    id="send-cc"
                    placeholder="Optional"
                    value={sendCc}
                    onChange={(e) => setSendCc(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="send-bcc">BCC (optional)</Label>
                  <Input
                    id="send-bcc"
                    placeholder="Optional"
                    value={sendBcc}
                    onChange={(e) => setSendBcc(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="send-subject">Subject</Label>
                <Input
                  id="send-subject"
                  placeholder="Email subject"
                  value={sendSubject}
                  onChange={(e) => setSendSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="send-body-text">Body (Text)</Label>
                <Textarea
                  id="send-body-text"
                  placeholder="Plain text body"
                  value={sendBodyText}
                  onChange={(e) => setSendBodyText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="send-body-html">Body (HTML, optional)</Label>
                <Textarea
                  id="send-body-html"
                  placeholder="<html>...</html>"
                  value={sendBodyHtml}
                  onChange={(e) => setSendBodyHtml(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="send-in-reply-to">In-Reply-To (optional)</Label>
                  <Input
                    id="send-in-reply-to"
                    placeholder="Message-ID"
                    value={sendInReplyTo}
                    onChange={(e) => setSendInReplyTo(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="send-references">References (optional, comma-separated)</Label>
                  <Input
                    id="send-references"
                    placeholder="msg-id-1, msg-id-2"
                    value={sendReferences}
                    onChange={(e) => setSendReferences(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleSend}
                disabled={sendLoading || !accountId || !sendTo.trim() || !sendSubject.trim()}
              >
                {sendLoading ? 'Sending...' : 'Send'}
              </Button>

              {sendResult && (
                <div className="rounded-md bg-muted p-2 text-xs font-mono">
                  {sendResult}
                </div>
              )}
              {sendError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {sendError}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Save Draft Tab */}
          <TabsContent value="draft">
            <div className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label htmlFor="draft-to">To (optional)</Label>
                <Input
                  id="draft-to"
                  placeholder="Optional recipients"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="draft-subject">Subject</Label>
                <Input
                  id="draft-subject"
                  placeholder="Draft subject"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="draft-body-text">Body (Text)</Label>
                <Textarea
                  id="draft-body-text"
                  placeholder="Plain text body"
                  value={draftBodyText}
                  onChange={(e) => setDraftBodyText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="draft-body-html">Body (HTML, optional)</Label>
                <Textarea
                  id="draft-body-html"
                  placeholder="<html>...</html>"
                  value={draftBodyHtml}
                  onChange={(e) => setDraftBodyHtml(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSaveDraft}
                disabled={draftLoading || !accountId || !draftSubject.trim()}
              >
                {draftLoading ? 'Saving...' : 'Save Draft'}
              </Button>

              {draftResult && (
                <div className="rounded-md bg-muted p-2 text-xs font-mono">
                  {draftResult}
                </div>
              )}
              {draftError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {draftError}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

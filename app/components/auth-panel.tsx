'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/app/lib/auth-context'
import * as api from '@/app/lib/api'
import type { ApiResponse } from '@/app/lib/api'
import type { UserProfile } from '@/app/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'

// ── Response display helper ──────────────────────────────

interface ApiResult {
  status: number
  durationMs: number
  body: unknown
}

function StatusBadge({ status }: { status: number }) {
  const isOk = status >= 200 && status < 300
  return (
    <Badge
      variant="default"
      className={
        isOk
          ? 'bg-green-600/20 text-green-400 border-green-600/30'
          : 'bg-red-600/20 text-red-400 border-red-600/30'
      }
    >
      {status}
    </Badge>
  )
}

function ResponseBlock({ result }: { result: ApiResult | null }) {
  const [open, setOpen] = useState(false)

  if (!result) return null

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <StatusBadge status={result.status} />
        <span className="text-muted-foreground">{result.durationMs}ms</span>
      </div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          size="xs"
          className="text-xs text-muted-foreground"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? 'Hide' : 'Show'} response JSON
        </Button>
        <CollapsibleContent>
          <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
            {JSON.stringify(result.body, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────

function apiResultFrom<T>(res: ApiResponse<T>): ApiResult {
  return { status: res.status, durationMs: res.durationMs, body: res.data }
}

function errorResult(err: unknown): ApiResult {
  const e = err as { status?: number; body?: unknown; message?: string }
  return {
    status: e.status ?? 0,
    durationMs: 0,
    body: e.body ?? { error: e.message ?? String(err) },
  }
}

// ── Auth Panel ───────────────────────────────────────────

export default function AuthPanel() {
  const { user, isAuthenticated, logout, refreshTokenPair } = useAuth()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue={0}>
          <TabsList>
            <TabsTrigger value={0}>Login</TabsTrigger>
            <TabsTrigger value={1}>Register</TabsTrigger>
            <TabsTrigger value={2}>Social</TabsTrigger>
          </TabsList>

          <TabsContent value={0}>
            <LoginForm />
          </TabsContent>
          <TabsContent value={1}>
            <RegisterForm />
          </TabsContent>
          <TabsContent value={2}>
            <SocialForm />
          </TabsContent>
        </Tabs>

        {isAuthenticated && (
          <>
            <Separator />
            <UserProfileSection />
            <Separator />
            <TokenInfoSection />
            <Separator />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Signed in as <span className="text-foreground font-medium">{user?.email}</span>
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await logout()
                }}
              >
                Logout
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await refreshTokenPair()
                  } catch {
                    // handled below in token section
                  }
                }}
              >
                Refresh Tokens
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Login Form ───────────────────────────────────────────

function LoginForm() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      await login(email, password)
      // The auth context calls api.login internally. We call it directly too
      // so we can capture the response for display. The context already sets tokens.
      // Since login succeeded through context, show a synthetic success result.
      setResult({ status: 200, durationMs: 0, body: { message: 'Login successful, tokens set.' } })
    } catch (err) {
      setResult(errorResult(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading} size="sm">
        {loading ? 'Logging in...' : 'Login'}
      </Button>
      <ResponseBlock result={result} />
    </form>
  )
}

// ── Register Form ────────────────────────────────────────

function RegisterForm() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      await register(email, password, displayName || undefined)
      setResult({
        status: 201,
        durationMs: 0,
        body: { message: 'Registration successful, tokens set.' },
      })
    } catch (err) {
      setResult(errorResult(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3">
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <Input
          id="reg-password"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-display-name">Display Name (optional)</Label>
        <Input
          id="reg-display-name"
          type="text"
          placeholder="Jane Doe"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading} size="sm">
        {loading ? 'Registering...' : 'Register'}
      </Button>
      <ResponseBlock result={result} />
    </form>
  )
}

// ── Social Login ─────────────────────────────────────────

function SocialForm() {
  return (
    <div className="flex gap-3 pt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          window.location.href = api.getGoogleAuthUrl()
        }}
      >
        Login with Google
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          window.location.href = api.getMicrosoftAuthUrl()
        }}
      >
        Login with Microsoft
      </Button>
    </div>
  )
}

// ── User Profile Section ─────────────────────────────────

function UserProfileSection() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResult | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const fetchMe = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await api.getMe()
      setResult(apiResultFrom(res))
      setProfile(res.data)
    } catch (err) {
      setResult(errorResult(err))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">User Profile</span>
        <Button variant="outline" size="xs" disabled={loading} onClick={fetchMe}>
          {loading ? 'Fetching...' : 'Fetch /me'}
        </Button>
      </div>
      {profile && (
        <Card size="sm" className="bg-muted/30">
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
              <dt className="text-muted-foreground">id</dt>
              <dd>{profile.id}</dd>
              <dt className="text-muted-foreground">email</dt>
              <dd>{profile.email}</dd>
              <dt className="text-muted-foreground">displayName</dt>
              <dd>{profile.displayName ?? '(null)'}</dd>
              <dt className="text-muted-foreground">provider</dt>
              <dd>{profile.authProvider}</dd>
              <dt className="text-muted-foreground">created</dt>
              <dd>{profile.createdAt}</dd>
            </dl>
          </CardContent>
        </Card>
      )}
      <ResponseBlock result={result} />
    </div>
  )
}

// ── Token Info Section ───────────────────────────────────

function TokenInfoSection() {
  const { refreshTokenPair } = useAuth()
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)
  const [refreshResult, setRefreshResult] = useState<ApiResult | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const computeExpiry = useCallback(() => {
    const tokens = api.getTokens()
    if (!tokens.accessToken) {
      setSecondsRemaining(null)
      return
    }
    const decoded = api.decodeJwtPayload(tokens.accessToken)
    if (!decoded?.exp) {
      setSecondsRemaining(null)
      return
    }
    const remaining = decoded.exp - Math.floor(Date.now() / 1000)
    setSecondsRemaining(remaining)
  }, [])

  useEffect(() => {
    computeExpiry()
    intervalRef.current = setInterval(computeExpiry, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [computeExpiry])

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshResult(null)
    try {
      await refreshTokenPair()
      setRefreshResult({
        status: 200,
        durationMs: 0,
        body: { message: 'Tokens refreshed successfully.' },
      })
      computeExpiry()
    } catch (err) {
      setRefreshResult(errorResult(err))
    } finally {
      setRefreshing(false)
    }
  }

  const tokens = api.getTokens()

  return (
    <div className="space-y-3">
      <span className="text-sm font-medium">Token Info</span>
      <div className="space-y-2 font-mono text-xs">
        <div>
          <span className="text-muted-foreground">access: </span>
          <span>{tokens.accessToken ? tokens.accessToken.slice(0, 20) + '...' : '(none)'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">refresh: </span>
          <span>
            {tokens.refreshToken ? tokens.refreshToken.slice(0, 20) + '...' : '(none)'}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">expires in: </span>
          <span
            className={
              secondsRemaining !== null && secondsRemaining <= 60
                ? 'text-red-400'
                : secondsRemaining !== null && secondsRemaining <= 300
                  ? 'text-yellow-400'
                  : ''
            }
          >
            {secondsRemaining !== null ? `${secondsRemaining}s` : 'n/a'}
          </span>
        </div>
      </div>
      <Button variant="outline" size="xs" disabled={refreshing} onClick={handleRefresh}>
        {refreshing ? 'Refreshing...' : 'Refresh Tokens'}
      </Button>
      <ResponseBlock result={refreshResult} />
    </div>
  )
}

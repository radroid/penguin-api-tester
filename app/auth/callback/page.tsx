'use client'

import { use, useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/auth-context'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function CallbackHandler({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = use(searchParams)
  const code = typeof params.code === 'string' ? params.code : null
  const router = useRouter()
  const { handleOAuthCode } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!code) {
      setError('No authorization code found in URL.')
      return
    }

    let cancelled = false

    async function exchange() {
      setProcessing(true)
      try {
        await handleOAuthCode(code!)
        if (!cancelled) {
          router.replace('/')
        }
      } catch (err) {
        if (!cancelled) {
          const e = err as { message?: string }
          setError(e.message ?? 'Failed to exchange authorization code.')
        }
      } finally {
        if (!cancelled) {
          setProcessing(false)
        }
      }
    }

    exchange()

    return () => {
      cancelled = true
    }
  }, [code, handleOAuthCode, router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>OAuth Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-400 font-mono">{error}</p>
            <a href="/">
              <Button variant="outline" size="sm">
                Back to Dashboard
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>OAuth Callback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {processing
              ? 'Exchanging authorization code...'
              : 'Preparing...'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>OAuth Callback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <CallbackHandler searchParams={searchParams} />
    </Suspense>
  )
}

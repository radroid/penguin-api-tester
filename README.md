# Penguin Mail API Testing Dashboard

A developer tool for testing and debugging the [Penguin Mail](https://github.com/anthropics/penguin-mail) NestJS backend. Built with Next.js 16, React 19, Tailwind CSS 4, and shadcn/ui.

## What it does

This dashboard lets you interact with every Penguin Mail API endpoint from a single page. It covers:

- **Authentication** -- Register, login, Google/Microsoft OAuth, token refresh, logout
- **Email Accounts** -- List connected accounts, view details, trigger sync, disconnect
- **Mailboxes** -- Browse IMAP folders, view sync checkpoints
- **Messages** -- Paginated message list, full message view with HTML body, flag/unflag, batch operations, delete
- **Threads** -- Conversation threading with expandable message accordion
- **Search** -- Full-text search with filters (from, date range, attachments, flagged)
- **Send & Drafts** -- Compose and send emails, save drafts
- **WebSocket** -- Connect to the real-time event stream, view live sync/message events
- **API Log** -- Network-tab-style request log with timing, status codes, and expandable request/response bodies

## What it measures

- Response times for every API call (displayed as badges)
- Error rates and status codes (color-coded: green 2xx, yellow 3xx, red 4xx/5xx)
- JWT token expiry countdown
- WebSocket connection state and event throughput
- CORS and credential handling

## Getting started

```bash
# Install dependencies
bun install

# Start the dev server (runs on port 3000)
bun dev
```

Make sure the Penguin Mail backend is running on `http://localhost:3001`.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.1 (App Router) |
| UI | React 19, shadcn/ui, Tailwind CSS 4 |
| Language | TypeScript 5 |
| Package manager | Bun |

## Project structure

```
app/
  layout.tsx                 # Root layout (AuthProvider, dark mode)
  page.tsx                   # Dashboard — orchestrates all panels
  auth/callback/page.tsx     # OAuth callback handler
  lib/
    types.ts                 # TypeScript types matching backend DTOs
    api.ts                   # API client with timing, logging, auto-refresh
    auth-context.tsx         # React context for auth state
  components/
    auth-panel.tsx           # Login / Register / OAuth / Token info
    health-panel.tsx         # GET /health display
    accounts-panel.tsx       # Email account management
    mailboxes-panel.tsx      # IMAP folder browser
    messages-panel.tsx       # Message list + viewer + batch ops
    threads-panel.tsx        # Conversation threads
    search-panel.tsx         # Full-text search
    send-panel.tsx           # Email composer
    websocket-panel.tsx      # WebSocket event monitor
    api-log.tsx              # Request log (slide-up sheet)
components/ui/               # shadcn/ui primitives
```

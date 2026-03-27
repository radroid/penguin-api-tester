import type {
  TokenPair,
  RegisterRequest,
  LoginRequest,
  SocialExchangeRequest,
  RefreshRequest,
  UserProfile,
  Account,
  Mailbox,
  MailboxDetail,
  MessageSummary,
  MessageDetail,
  UpdateFlagsRequest,
  UpdateFlagsResponse,
  BatchRequest,
  BatchResponse,
  PaginatedResponse,
  ThreadSummary,
  ThreadDetail,
  SendEmailRequest,
  SendResponse,
  DraftRequest,
  SearchRequest,
  SearchResponse,
  HealthResponse,
  ApiLogEntry,
} from "./types";

// ── Configuration ────────────────────────────────────────

const API_BASE = "http://localhost:3001";

// ── Token Storage ────────────────────────────────────────

let accessToken: string | null = null;
let refreshToken: string | null = null;

function persist() {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem("penguin_access_token", accessToken);
  else localStorage.removeItem("penguin_access_token");
  if (refreshToken) localStorage.setItem("penguin_refresh_token", refreshToken);
  else localStorage.removeItem("penguin_refresh_token");
}

function restore() {
  if (typeof window === "undefined") return;
  accessToken = localStorage.getItem("penguin_access_token");
  refreshToken = localStorage.getItem("penguin_refresh_token");
}

// Restore on load
restore();

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  persist();
}

export function getTokens(): { accessToken: string | null; refreshToken: string | null } {
  return { accessToken, refreshToken };
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  persist();
}

// ── API Log ──────────────────────────────────────────────

let logEntries: ApiLogEntry[] = [];
let logIdCounter = 0;
const logSubscribers = new Set<(entries: ApiLogEntry[]) => void>();

function addLogEntry(entry: ApiLogEntry) {
  logEntries = [entry, ...logEntries].slice(0, 500);
  logSubscribers.forEach((cb) => cb(logEntries));
}

export function getApiLog(): ApiLogEntry[] {
  return logEntries;
}

export function clearApiLog() {
  logEntries = [];
  logSubscribers.forEach((cb) => cb(logEntries));
}

export function subscribeToLog(cb: (entries: ApiLogEntry[]) => void): () => void {
  logSubscribers.add(cb);
  return () => logSubscribers.delete(cb);
}

// ── Token Refresh (with deduplication) ───────────────────

let refreshPromise: Promise<TokenPair> | null = null;

async function refreshAccessToken(): Promise<TokenPair> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    if (!refreshToken) throw new Error("No refresh token available");

    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken } satisfies RefreshRequest),
    });

    if (!res.ok) {
      clearTokens();
      throw new Error(`Token refresh failed: ${res.status}`);
    }

    const tokens: TokenPair = await res.json();
    setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// ── Core Fetch ───────────────────────────────────────────

const NO_AUTH_PATHS = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/social/exchange",
  "/health",
];

interface FetchOptions {
  body?: unknown;
  auth?: boolean;
  params?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  durationMs: number;
}

async function apiFetch<T>(
  method: string,
  path: string,
  options?: FetchOptions,
): Promise<ApiResponse<T>> {
  const needsAuth = options?.auth ?? !NO_AUTH_PATHS.some((p) => path.startsWith(p));
  let url = `${API_BASE}${path}`;

  if (options?.params) {
    const qs = new URLSearchParams(options.params).toString();
    url += `?${qs}`;
  }

  const logId = String(++logIdCounter);
  const entry: ApiLogEntry = {
    id: logId,
    timestamp: Date.now(),
    method,
    url,
    requestBody: options?.body,
  };

  const headers: Record<string, string> = {};
  if (options?.body !== undefined) headers["Content-Type"] = "application/json";
  if (needsAuth && accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const start = performance.now();

  try {
    let res = await fetch(url, {
      method,
      headers,
      credentials: "include",
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    // Auto-refresh on 401
    if (res.status === 401 && needsAuth && refreshToken) {
      try {
        const newTokens = await refreshAccessToken();
        headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
        res = await fetch(url, {
          method,
          headers,
          credentials: "include",
          body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
        });
      } catch {
        // refresh failed, fall through with original 401
      }
    }

    const durationMs = Math.round(performance.now() - start);

    let responseBody: T | undefined;
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      responseBody = await res.json();
    } else if (res.status !== 204) {
      const text = await res.text();
      responseBody = (text || undefined) as T | undefined;
    }

    entry.status = res.status;
    entry.durationMs = durationMs;
    entry.responseBody = responseBody;
    addLogEntry(entry);

    if (!res.ok) {
      const err = new Error(`${method} ${path} failed: ${res.status}`) as Error & {
        status: number;
        body: unknown;
      };
      err.status = res.status;
      err.body = responseBody;
      throw err;
    }

    return { data: responseBody as T, status: res.status, durationMs };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    if (!entry.status) {
      entry.durationMs = durationMs;
      entry.error = err instanceof Error ? err.message : String(err);
      addLogEntry(entry);
    }
    throw err;
  }
}

// ── Auth Endpoints ───────────────────────────────────────

export async function register(req: RegisterRequest) {
  return apiFetch<TokenPair>("POST", "/api/auth/register", { body: req });
}

export async function login(req: LoginRequest) {
  return apiFetch<TokenPair>("POST", "/api/auth/login", { body: req });
}

export async function exchangeSocialCode(code: string) {
  return apiFetch<TokenPair>("POST", "/api/auth/social/exchange", {
    body: { code } satisfies SocialExchangeRequest,
  });
}

export async function refreshTokens(token: string) {
  return apiFetch<TokenPair>("POST", "/api/auth/refresh", {
    body: { refreshToken: token } satisfies RefreshRequest,
  });
}

export async function logout() {
  return apiFetch<void>("POST", "/api/auth/logout");
}

export async function getMe() {
  return apiFetch<UserProfile>("GET", "/api/auth/me");
}

export function getGoogleAuthUrl(): string {
  return `${API_BASE}/api/auth/google`;
}

export function getMicrosoftAuthUrl(): string {
  return `${API_BASE}/api/auth/microsoft`;
}

// ── Accounts ─────────────────────────────────────────────

export async function listAccounts() {
  return apiFetch<Account[]>("GET", "/api/accounts");
}

export async function getAccount(id: string) {
  return apiFetch<Account>("GET", `/api/accounts/${id}`);
}

export async function deleteAccount(id: string) {
  return apiFetch<void>("DELETE", `/api/accounts/${id}`);
}

export async function triggerSync(id: string) {
  return apiFetch<{ message: string }>("POST", `/api/accounts/${id}/sync`);
}

// ── Mailboxes ────────────────────────────────────────────

export async function listMailboxes(accountId: string) {
  return apiFetch<Mailbox[]>("GET", `/api/accounts/${accountId}/mailboxes`);
}

export async function getMailbox(id: string) {
  return apiFetch<MailboxDetail>("GET", `/api/mailboxes/${id}`);
}

// ── Messages ─────────────────────────────────────────────

export async function listMessages(
  accountId: string,
  params?: { mailboxId?: string; cursor?: string; limit?: number },
) {
  const p: Record<string, string> = {};
  if (params?.mailboxId) p.mailboxId = params.mailboxId;
  if (params?.cursor) p.cursor = params.cursor;
  if (params?.limit) p.limit = String(params.limit);
  return apiFetch<PaginatedResponse<MessageSummary>>("GET", `/api/accounts/${accountId}/messages`, {
    params: p,
  });
}

export async function getMessage(id: string) {
  return apiFetch<MessageDetail>("GET", `/api/messages/${id}`);
}

export async function updateMessageFlags(id: string, flags: UpdateFlagsRequest) {
  return apiFetch<UpdateFlagsResponse>("PATCH", `/api/messages/${id}`, { body: flags });
}

export async function batchMessages(body: BatchRequest) {
  return apiFetch<BatchResponse>("POST", "/api/messages/batch", { body });
}

export async function deleteMessage(id: string) {
  return apiFetch<{ message: string }>("DELETE", `/api/messages/${id}`);
}

// ── Threads ──────────────────────────────────────────────

export async function listThreads(
  accountId: string,
  params?: { cursor?: string; limit?: number },
) {
  const p: Record<string, string> = {};
  if (params?.cursor) p.cursor = params.cursor;
  if (params?.limit) p.limit = String(params.limit);
  return apiFetch<PaginatedResponse<ThreadSummary>>("GET", `/api/accounts/${accountId}/threads`, {
    params: p,
  });
}

export async function getThread(id: string) {
  return apiFetch<ThreadDetail>("GET", `/api/threads/${id}`);
}

// ── Send & Drafts ────────────────────────────────────────

export async function sendEmail(accountId: string, body: SendEmailRequest) {
  return apiFetch<SendResponse>("POST", `/api/accounts/${accountId}/send`, { body });
}

export async function saveDraft(accountId: string, body: DraftRequest) {
  return apiFetch<{ message: string }>("POST", `/api/accounts/${accountId}/drafts`, { body });
}

// ── Search ───────────────────────────────────────────────

export async function searchMessages(accountId: string, body: SearchRequest) {
  return apiFetch<SearchResponse>("POST", `/api/accounts/${accountId}/search`, { body });
}

// ── Attachments ──────────────────────────────────────────

export function getAttachmentUrl(messageId: string, attachmentId: string): string {
  return `${API_BASE}/api/messages/${messageId}/attachments/${attachmentId}`;
}

// ── Health ───────────────────────────────────────────────

export async function healthCheck() {
  return apiFetch<HealthResponse>("GET", "/health");
}

// ── JWT Decode (for display only) ────────────────────────

export function decodeJwtPayload(token: string): { sub: string; exp: number; iat: number } | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

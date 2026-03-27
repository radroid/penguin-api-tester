// ── Auth ──────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SocialExchangeRequest {
  code: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  authProvider: "email" | "google" | "microsoft";
  createdAt: string;
  updatedAt: string;
}

// ── Accounts ─────────────────────────────────────────────

export type SyncStatus = "pending" | "active" | "error" | "paused";

export interface Account {
  id: string;
  email: string;
  displayName: string | null;
  provider: "gmail" | "outlook" | string;
  authType: "oauth2" | "password";
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Mailboxes ────────────────────────────────────────────

export type MailboxRole =
  | "inbox"
  | "sent"
  | "drafts"
  | "trash"
  | "spam"
  | "archive"
  | "all"
  | null;

export interface Mailbox {
  id: string;
  accountId: string;
  name: string;
  path: string;
  role: MailboxRole;
  delimiter: string;
  totalMessages: number;
  unseenMessages: number;
  subscribed: boolean;
  selectable: boolean;
}

export interface SyncCheckpoint {
  uidValidity: string;
  highestUid: string;
  highestModseq: string;
  syncedAt: string;
}

export interface MailboxDetail extends Mailbox {
  syncCheckpoint: SyncCheckpoint | null;
}

// ── Messages ─────────────────────────────────────────────

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface MessageSummary {
  id: string;
  accountId: string;
  threadId: string;
  subject: string;
  fromAddress: EmailAddress;
  toAddresses: EmailAddress[];
  ccAddresses: EmailAddress[];
  sentDate: string;
  snippet: string;
  hasAttachments: boolean;
  size: number;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  isInline: boolean;
  contentId: string | null;
}

export interface MessageDetail extends MessageSummary {
  messageId: string;
  bccAddresses: EmailAddress[];
  replyTo: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  inReplyTo: string | null;
  referencesHeader: string[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFlagsRequest {
  isSeen?: boolean;
  isFlagged?: boolean;
}

export interface UpdateFlagsResponse {
  id: string;
  isSeen: boolean;
  isFlagged: boolean;
  pendingCommand: boolean;
}

export type BatchAction = "markRead" | "markUnread" | "flag" | "unflag";

export interface BatchRequest {
  action: BatchAction;
  messageIds: string[];
}

export interface BatchResponse {
  action: BatchAction;
  accepted: number;
  messageIds: string[];
}

// ── Pagination ───────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ── Threads ──────────────────────────────────────────────

export interface ThreadSummary {
  threadId: string;
  subject: string;
  messageCount: number;
  latestDate: string;
  snippet: string;
}

export interface ThreadDetail {
  threadId: string;
  messages: MessageDetail[];
}

// ── Send & Drafts ────────────────────────────────────────

export interface SendEmailRequest {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface SendResponse {
  outboxId: string;
  status: "queued";
}

export interface DraftRequest {
  to?: EmailAddress[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
}

// ── Search ───────────────────────────────────────────────

export interface SearchRequest {
  query: string;
  mailboxId?: string | null;
  from?: string;
  to?: string;
  after?: string;
  before?: string;
  hasAttachments?: boolean;
  isFlagged?: boolean;
  limit?: number;
}

export interface SearchResult {
  id: string;
  threadId: string;
  subject: string;
  fromAddress: EmailAddress;
  sentDate: string;
  snippet: string;
  hasAttachments: boolean;
  relevanceScore: number;
}

export interface SearchResponse {
  data: SearchResult[];
  count: number;
}

// ── Health ───────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  timestamp: string;
  accounts?: { active: number; error: number };
  idleConnections?: number;
}

// ── WebSocket Events ─────────────────────────────────────

export interface WsAuthMessage {
  type: "auth";
  token: string;
}

export interface WsEvent {
  type: string;
  data?: unknown;
}

// ── API Log ──────────────────────────────────────────────

export interface ApiLogEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  requestBody?: unknown;
  status?: number;
  responseBody?: unknown;
  durationMs?: number;
  error?: string;
}

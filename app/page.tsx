"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/app/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HealthPanel } from "@/app/components/health-panel";
import AuthPanel from "@/app/components/auth-panel";
import { AccountsPanel } from "@/app/components/accounts-panel";
import { MailboxesPanel } from "@/app/components/mailboxes-panel";
import { MessagesPanel } from "@/app/components/messages-panel";
import { ThreadsPanel } from "@/app/components/threads-panel";
import { SearchPanel } from "@/app/components/search-panel";
import { SendPanel } from "@/app/components/send-panel";
import { WebSocketPanel } from "@/app/components/websocket-panel";
import { ApiLog } from "@/app/components/api-log";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<
    string | null
  >(null);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(
    null
  );
  const [selectedMailboxName, setSelectedMailboxName] = useState<string | null>(
    null
  );

  const handleSelectAccount = useCallback(
    (accountId: string, accountEmail?: string) => {
      setSelectedAccountId(accountId);
      setSelectedAccountEmail(accountEmail ?? null);
      // Reset mailbox selection when account changes
      setSelectedMailboxId(null);
      setSelectedMailboxName(null);
    },
    []
  );

  const handleSelectMailbox = useCallback(
    (mailboxId: string, mailboxName?: string) => {
      setSelectedMailboxId(mailboxId);
      setSelectedMailboxName(mailboxName ?? null);
    },
    []
  );

  const noAccountMessage = (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <p>Select an account first from the Accounts tab.</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen pb-12">
      {/* Fixed header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-tight">
              Penguin Mail API Tester
            </h1>

            {isLoading ? (
              <Badge variant="outline">Loading...</Badge>
            ) : isAuthenticated ? (
              <Badge className="bg-green-600 text-white">Authenticated</Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground">
                Not Authenticated
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="text-muted-foreground">{user.email}</span>
            )}

            {selectedAccountEmail && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-muted-foreground">
                  Account:{" "}
                  <span className="text-foreground font-medium">
                    {selectedAccountEmail}
                  </span>
                </span>
              </>
            )}

            {selectedMailboxName && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-muted-foreground">
                  Mailbox:{" "}
                  <span className="text-foreground font-medium">
                    {selectedMailboxName}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-6 space-y-6">
        {/* Always-visible: Health + Auth side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HealthPanel />
          <AuthPanel />
        </div>

        <Separator />

        {/* Authenticated-only tabs */}
        {isAuthenticated ? (
          <Tabs defaultValue="accounts">
            <TabsList className="flex-wrap">
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="mailboxes">Mailboxes</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="threads">Threads</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="send">Send</TabsTrigger>
              <TabsTrigger value="websocket">WebSocket</TabsTrigger>
            </TabsList>

            <TabsContent value="accounts">
              <AccountsPanel
                onSelectAccount={handleSelectAccount}
                selectedAccountId={selectedAccountId}
              />
            </TabsContent>

            <TabsContent value="mailboxes">
              {selectedAccountId ? (
                <MailboxesPanel
                  accountId={selectedAccountId}
                  onSelectMailbox={handleSelectMailbox}
                />
              ) : (
                noAccountMessage
              )}
            </TabsContent>

            <TabsContent value="messages">
              {selectedAccountId ? (
                <MessagesPanel
                  accountId={selectedAccountId}
                  mailboxId={selectedMailboxId ?? undefined}
                />
              ) : (
                noAccountMessage
              )}
            </TabsContent>

            <TabsContent value="threads">
              {selectedAccountId ? (
                <ThreadsPanel accountId={selectedAccountId} />
              ) : (
                noAccountMessage
              )}
            </TabsContent>

            <TabsContent value="search">
              {selectedAccountId ? (
                <SearchPanel accountId={selectedAccountId} />
              ) : (
                noAccountMessage
              )}
            </TabsContent>

            <TabsContent value="send">
              {selectedAccountId ? (
                <SendPanel accountId={selectedAccountId} />
              ) : (
                noAccountMessage
              )}
            </TabsContent>

            <TabsContent value="websocket">
              <WebSocketPanel />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p>
              {isLoading
                ? "Loading authentication status..."
                : "Log in or register using the Auth panel above to access API testing tools."}
            </p>
          </div>
        )}
      </main>

      {/* API Log (sticky at bottom) */}
      <ApiLog />
    </div>
  );
}

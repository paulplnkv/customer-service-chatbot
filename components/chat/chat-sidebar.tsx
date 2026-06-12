"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand";
import { authClient } from "@/lib/auth-client";
import { AuthDialog, type AuthMode } from "@/components/auth-dialog";

type Conversation = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function ChatSidebar({
  conversations: initialConversations,
}: {
  conversations: Conversation[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      setConversations((prev) => {
        if (prev.some((c) => c.id === id)) return prev;
        const now = new Date();
        return [{ id, title: null, createdAt: now, updatedAt: now }, ...prev];
      });
    };
    window.addEventListener("conversation-created", handler);
    return () => window.removeEventListener("conversation-created", handler);
  }, []);

  const handleNewChat = () => {
    if (pathname.startsWith("/c/")) {
      router.push("/");
    } else {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new CustomEvent("new-chat"));
    }
  };

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();

    setDeletingId(conversationId);

    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (pathname === `/c/${conversationId}`) {
        router.push("/");
      }
    }

    setDeletingId(null);
  };

  return (
    <Sidebar
      collapsible="none"
      className="w-[260px] border-r border-rule bg-secondary/30"
    >
      <SidebarHeader className="border-b border-rule px-4 py-4">
        <BrandMark size={24} />
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2">
        <div className="px-1 pt-3">
          <button
            onClick={handleNewChat}
            className="inline-flex w-full items-center gap-2 rounded-md border border-rule bg-paper px-3 py-2 text-[13px] transition-colors hover:bg-secondary"
          >
            <Plus size={14} /> New chat
          </button>
        </div>
        <div className="label-eyebrow px-3 pt-4 text-muted-foreground">
          History
        </div>
        <div className="flex flex-col px-0 pt-1">
          {conversations.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-muted-foreground">
              No conversations yet.
            </div>
          )}
          {conversations.map((conversation) => {
            const isActive = pathname === `/c/${conversation.id}`;
            const isDeleting = deletingId === conversation.id;
            return (
              <Link
                key={conversation.id}
                href={`/c/${conversation.id}`}
                className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${
                  isActive
                    ? "bg-secondary text-ink"
                    : "text-ink/80 hover:bg-secondary/70"
                }`}
              >
                <MessageSquare
                  size={13}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="flex-1 truncate">
                  {conversation.title || "New conversation"}
                </span>
                <button
                  onClick={(e) => handleDelete(e, conversation.id)}
                  disabled={isDeleting}
                  className="text-muted-foreground opacity-0 hover:text-ink group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </Link>
            );
          })}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-rule p-3">
        <AuthFooter />
      </SidebarFooter>
    </Sidebar>
  );
}

function AuthFooter() {
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = () => setAuthMode("in");
    window.addEventListener("open-auth", handler);
    return () => window.removeEventListener("open-auth", handler);
  }, []);

  if (!mounted || isPending) {
    return <div className="h-9" />;
  }

  if (session) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-medium text-paper">
            {session.user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px]">{session.user.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {session.user.email}
            </div>
          </div>
        </div>
        <button
          onClick={async () => {
            await authClient.signOut();
            window.location.href = "/sign-in";
          }}
          className="text-[11.5px] text-muted-foreground hover:text-ink hover:underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <Button
          onClick={() => setAuthMode("in")}
          className="h-9 w-full text-[13px]"
        >
          Sign In
        </Button>
        <Button
          variant="outline"
          onClick={() => setAuthMode("up")}
          className="h-9 w-full border-rule text-[13px]"
        >
          Sign Up
        </Button>
      </div>
      <AuthDialog
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onSwitch={(m) => setAuthMode(m)}
      />
    </>
  );
}

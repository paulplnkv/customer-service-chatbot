"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

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
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                if (pathname.startsWith("/c/")) {
                  router.push("/");
                } else {
                  window.history.replaceState(null, "", "/");
                  window.dispatchEvent(new CustomEvent("new-chat"));
                }
              }}
            >
              <MessageSquarePlus className="size-4" />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {conversations.map((conversation) => {
                const isActive = pathname === `/c/${conversation.id}`;
                const isDeleting = deletingId === conversation.id;
                return (
                  <SidebarMenuItem key={conversation.id}>
                    <SidebarMenuButton
                      render={<Link href={`/c/${conversation.id}`} />}
                      isActive={isActive}
                      className="h-auto py-2"
                    >
                      <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                        <span className="truncate text-sm">
                          {conversation.title || "New conversation"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(conversation.updatedAt))}
                        </span>
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={(e) => handleDelete(e, conversation.id)}
                      disabled={isDeleting}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

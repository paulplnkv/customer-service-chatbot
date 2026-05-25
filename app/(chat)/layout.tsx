import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { resolveSessionFromHeaders } from "@/lib/session";
import { getConversations } from "@/lib/db/conversations";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthNav } from "@/components/auth-nav";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await resolveSessionFromHeaders();
  const conversations = await getConversations(identity);

  return (
    <div className="flex h-dvh flex-col">
      <TooltipProvider>
        <SidebarProvider>
          <ChatSidebar conversations={conversations} />
          <SidebarInset className="flex flex-col overflow-hidden">
            <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <AuthNav />
            </header>
            <main className="flex flex-1 flex-col overflow-hidden">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  );
}

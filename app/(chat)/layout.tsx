import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { resolveSessionFromHeaders } from "@/lib/session";
import { getConversations } from "@/lib/db/conversations";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

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
            <header className="flex h-14 shrink-0 items-center gap-2.5 border-b px-6">
              <Sparkles size={16} className="text-ink" />
              <div>
                <div className="text-[13.5px] font-medium leading-tight">
                  STARR Aviation Assistant
                </div>
                <div className="text-[11.5px] text-muted-foreground leading-tight">
                  AI assistant · always-on
                </div>
              </div>
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

import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { resolveSessionFromHeaders } from "@/lib/session";
import { getConversationWithMessages } from "@/lib/db/conversations";
import { dbMessagesToUIMessages } from "@/lib/db/messages";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const identity = await resolveSessionFromHeaders();
  const result = await getConversationWithMessages(conversationId, identity);

  if (!result) {
    redirect("/");
  }

  const initialMessages = dbMessagesToUIMessages(result.messages);

  return (
    <ChatInterface
      conversationId={conversationId}
      initialMessages={initialMessages}
    />
  );
}

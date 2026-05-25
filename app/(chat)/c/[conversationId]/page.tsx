import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { resolveSessionFromHeaders } from "@/lib/session";
import { getConversationWithMessages } from "@/lib/db/conversations";
import { dbMessagesToUIMessages } from "@/lib/db/messages";
import { getEscalationByConversationId } from "@/lib/db/escalations";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const identity = await resolveSessionFromHeaders();
  const [result, escalation] = await Promise.all([
    getConversationWithMessages(conversationId, identity),
    getEscalationByConversationId(conversationId),
  ]);

  if (!result) {
    redirect("/");
  }

  const initialMessages = dbMessagesToUIMessages(result.messages);

  return (
    <ChatInterface
      conversationId={conversationId}
      initialMessages={initialMessages}
      escalation={escalation ? { reason: escalation.reason ?? "", status: escalation.status } : undefined}
    />
  );
}

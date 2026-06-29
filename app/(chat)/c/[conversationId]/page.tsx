export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { resolveSessionFromHeaders } from "@/lib/session";
import { getConversationWithMessages } from "@/lib/db/conversations";
import { dbMessagesToUIMessages } from "@/lib/db/messages";
import { getFullCustomerData } from "@/lib/db/pas";
import { CustomerApp } from "@/components/app/customer-app";

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
  const isAuthenticated = !!identity.userId;
  const data = isAuthenticated
    ? await getFullCustomerData(identity.userId!)
    : null;
  const firstName = data?.customer.firstName ?? null;

  return (
    <CustomerApp
      data={data}
      firstName={firstName}
      isAuthenticated={isAuthenticated}
      conversationId={conversationId}
      initialMessages={initialMessages}
      startWithAssistantOpen
    />
  );
}

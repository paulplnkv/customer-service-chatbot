"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "@ai-sdk/react";
import { authClient } from "@/lib/auth-client";
import { MobileHome } from "@/components/app/mobile-home";
import { AssistantSheet } from "@/components/app/assistant-sheet";
import { MobileAuthSheet } from "@/components/app/mobile-auth-sheet";
import type { AppCustomerData } from "@/components/app/types";

const DEMO_EMAIL = "alex.morgan@example.com";
const DEMO_PASSWORD = "password123";

export function CustomerApp({
  data,
  firstName,
  isAuthenticated,
  conversationId,
  initialMessages,
  startWithAssistantOpen = false,
}: {
  data: AppCustomerData | null;
  firstName: string | null;
  isAuthenticated: boolean;
  conversationId?: string;
  initialMessages?: UIMessage[];
  startWithAssistantOpen?: boolean;
}) {
  const [open, setOpen] = useState(startWithAssistantOpen);
  const [authOpen, setAuthOpen] = useState(false);
  const [signInPending, setSignInPending] = useState(false);
  const router = useRouter();

  async function signInDemo() {
    setSignInPending(true);
    try {
      await authClient.signIn.email({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      // Re-render the server page so the home screen loads the customer's data.
      router.refresh();
    } catch (err) {
      console.error("Demo sign-in failed:", err);
    } finally {
      setSignInPending(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    // Stay inside the phone frame and re-render as the signed-out home.
    router.refresh();
  }

  return (
    <>
      <MobileHome
        data={data}
        firstName={firstName}
        isAuthenticated={isAuthenticated}
        signInPending={signInPending}
        onOpenAssistant={() => setOpen(true)}
        onOpenSignIn={() => setAuthOpen(true)}
        onSignInDemo={signInDemo}
        onSignOut={signOut}
      />
      <AssistantSheet
        open={open}
        onClose={() => setOpen(false)}
        conversationId={conversationId}
        initialMessages={initialMessages}
      />
      <MobileAuthSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          setAuthOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

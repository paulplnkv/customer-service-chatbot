"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";

export function AuthNav() {
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return <div className="h-9 w-20" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{session.user.name}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await authClient.signOut();
            window.location.href = "/sign-in";
          }}
        >
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-2">
      <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Sign In
      </Link>
      <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
        Sign Up
      </Link>
    </nav>
  );
}

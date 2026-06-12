"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { BrandLink } from "@/components/brand";

export function Header() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <BrandLink />

      <nav className="flex items-center gap-2">
        {isPending ? (
          <div className="h-9 w-20" />
        ) : session ? (
          <Button
            variant="ghost"
            onClick={async () => {
              await authClient.signOut();
              window.location.href = "/sign-in";
            }}
          >
            Sign Out
          </Button>
        ) : (
          <>
            <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
              Sign In
            </Link>
            <Link href="/sign-up" className={buttonVariants()}>
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

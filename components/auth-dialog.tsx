"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type AuthMode = "in" | "up" | null;

export function AuthDialog({
  mode,
  onClose,
  onSwitch,
}: {
  mode: AuthMode;
  onClose: () => void;
  onSwitch: (m: "in" | "up") => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (mode === null) return null;
  const isSignup = mode === "up";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = isSignup
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });

    if (authError) {
      setError(
        authError.message ??
          (isSignup ? "Something went wrong" : "Invalid credentials")
      );
      setLoading(false);
      return;
    }

    onClose();
    router.push("/");
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden border-rule p-0 sm:max-w-md"
      >
        <form onSubmit={submit}>
          <div className="px-6 pb-5 pt-6">
            <DialogTitle className="text-[18px] font-semibold text-ink">
              {isSignup ? "Create an account" : "Welcome back"}
            </DialogTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {isSignup
                ? "Sign up to access your policy information"
                : "Sign in to access your policy information"}
            </p>

            {error && (
              <p className="mt-4 text-[13px] text-destructive">{error}</p>
            )}

            <div className="mt-5 space-y-4">
              {isSignup && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-ink">
                    Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    className="h-10 border-rule"
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="h-10 border-rule bg-secondary/60"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  minLength={isSignup ? 8 : undefined}
                  className="h-10 border-rule bg-secondary/60"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-rule bg-secondary/40 px-6 py-5">
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full text-[14px] font-medium"
            >
              {loading
                ? isSignup
                  ? "Creating account…"
                  : "Signing in…"
                : isSignup
                  ? "Sign Up"
                  : "Sign In"}
            </Button>
            <p className="mt-4 text-center text-[13px] text-muted-foreground">
              {isSignup
                ? "Already have an account? "
                : "Don't have an account? "}
              <button
                type="button"
                onClick={() => {
                  setError("");
                  onSwitch(isSignup ? "in" : "up");
                }}
                className="text-ink underline underline-offset-2"
              >
                {isSignup ? "Sign in" : "Sign up"}
              </button>
            </p>
            <p className="mt-2 text-center text-[13px] text-muted-foreground">
              Or{" "}
              <button
                type="button"
                onClick={onClose}
                className="text-ink underline underline-offset-2"
              >
                continue as guest
              </button>
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

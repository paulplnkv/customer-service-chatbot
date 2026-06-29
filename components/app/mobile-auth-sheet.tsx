"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Email/password sign-in, presented as a sheet that slides up inside the phone
 * frame (mirrors AssistantSheet). Reuses the Better Auth client; on success it
 * calls onSuccess so the parent can refresh the server page within the frame.
 */
export function MobileAuthSheet({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });

    if (authError) {
      setError(authError.message ?? "Invalid email or password");
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col bg-paper transition-transform duration-300 ease-out ${
        open ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!open}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-4">
        <div className="leading-tight">
          <div className="text-[13.5px] font-medium text-ink">Sign in</div>
          <div className="text-[11px] text-muted-foreground">
            Sterling Auto Insurance
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-ink"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="text-[13px] text-destructive">{error}</p>}

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
              className="h-10 border-rule bg-secondary/60"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full text-[14px] font-medium"
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

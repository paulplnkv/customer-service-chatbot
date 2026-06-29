"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  Users,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand";

const NAV = [
  { to: "/assistant", label: "AI copilot", icon: Sparkles },
  { to: "/escalations", label: "Escalations", icon: AlertCircle },
  { to: "/kb", label: "Knowledge base", icon: BookOpen },
  { to: "/pas", label: "Customers", icon: Users },
] as const;

export function InternalSidebar({ pending }: { pending: number }) {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col border-r border-rule bg-card"
      style={{ width: 240 }}
    >
      <div className="flex items-center justify-between border-b border-rule px-5 py-4">
        <Link href="/escalations">
          <BrandMark />
        </Link>
      </div>

      <div className="label-eyebrow px-5 pt-3">Support console</div>

      <nav className="flex-1 p-2">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = pathname.startsWith(n.to);
          const showBadge = n.to === "/escalations" && pending > 0;
          return (
            <Link
              key={n.to}
              href={n.to}
              className={`mb-0.5 flex items-center justify-between rounded-md px-3 py-2 text-[13px] ${
                active ? "bg-ink text-paper" : "hover:bg-secondary"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={14} />
                <span>{n.label}</span>
              </span>
              {showBadge && (
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-paper/20 text-paper" : "bg-ink text-paper"
                  }`}
                >
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

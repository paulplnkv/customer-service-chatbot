import { Signal, Wifi, BatteryFull } from "lucide-react";

/**
 * A mobile device frame. Renders its children inside a phone-shaped bezel on a
 * branded backdrop. On small viewports the frame fills the screen (no bezel).
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[100dvh] w-full items-center justify-center bg-ink p-0 sm:p-6">
      {/* Branded backdrop (visible around the phone on larger screens) */}
      <div className="pointer-events-none absolute inset-0 hidden flex-col items-center justify-center gap-2 text-paper/90 sm:flex">
        <div className="absolute left-10 top-10">
          <div className="font-display text-2xl text-paper">Sterling</div>
          <div className="label-eyebrow mt-0.5 text-paper/60">Auto Insurance</div>
        </div>
      </div>

      {/* The phone */}
      <div className="relative z-10 flex h-full max-h-[880px] w-full max-w-[412px] flex-col overflow-hidden bg-paper shadow-2xl sm:rounded-[2.75rem] sm:border-[11px] sm:border-black">
        {/* Status bar */}
        <div className="relative flex h-11 shrink-0 items-center justify-between bg-paper px-6 pt-1 text-[12px] font-medium text-ink">
          <span className="tabular-nums">9:41</span>
          {/* Notch */}
          <div className="absolute left-1/2 top-0 hidden h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-black sm:block" />
          <span className="flex items-center gap-1.5">
            <Signal size={14} />
            <Wifi size={14} />
            <BatteryFull size={16} />
          </span>
        </div>

        {/* Screen content */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

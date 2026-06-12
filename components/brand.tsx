import Link from "next/link";

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" className="text-ink">
        <rect x="2" y="2" width="36" height="36" rx="2" fill="currentColor" />
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="24"
          fontWeight="600"
          fill="var(--paper)"
        >
          S
        </text>
      </svg>
      <div className="leading-none">
        <div className="font-display text-[19px]">STARR</div>
        <div className="label-eyebrow mt-0.5">Aviation Insurance</div>
      </div>
    </div>
  );
}

export function BrandLink() {
  return (
    <Link href="/" aria-label="STARR Aviation Insurance — home">
      <BrandMark />
    </Link>
  );
}

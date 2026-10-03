import Link from "next/link";

export function Logo({ size = 28, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="9" stroke="#232936" />
        <path d="M9 22V10" stroke="#4F7CFF" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M15.5 22V10l7 12V10" stroke="#F7F8FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="6.6" r="1.6" fill="#8B5CF6" />
      </svg>
      {withWordmark ? (
        <span className="text-[15px] font-semibold tracking-[0.14em] text-white">INFORA</span>
      ) : null}
    </span>
  );
}

export function BrandLink({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center">
      <Logo />
    </Link>
  );
}

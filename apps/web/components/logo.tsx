/** Fieldcut mark: a rising sun cut by the horizon, with one leaf. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 38 A22 22 0 0 1 54 38 Z" fill="#F29E4C" />
      <rect x="4" y="40.5" width="24" height="4.2" rx="2.1" fill="currentColor" />
      <rect x="33" y="40.5" width="27" height="4.2" rx="2.1" fill="currentColor" />
      <rect x="12" y="49" width="40" height="3.6" rx="1.8" fill="currentColor" opacity=".55" />
      <path d="M31 38 C31 27 38 21 47 20 C46 30 40 36 31 38 Z" fill="#9BC25B" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-loam">
      <LogoMark />
      <span className="font-display text-2xl font-semibold tracking-tight">
        fieldcut<span className="text-dawn">.</span>
      </span>
    </span>
  );
}

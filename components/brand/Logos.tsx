type IconProps = { size?: number; className?: string };

export function IconLeapArrow({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 16 14 L 28 14 L 28 40 L 44 40 L 44 34 L 56 45 L 44 56 L 44 50 L 16 50 Z"
        fill="white"
      />
    </svg>
  );
}

export function IconStairs({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <rect x="10" y="42" width="12" height="10" rx="2" fill="white" />
      <rect x="26" y="30" width="12" height="22" rx="2" fill="white" />
      <rect x="42" y="14" width="12" height="38" rx="2" fill="white" />
    </svg>
  );
}

export function IconBracketL({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 18 14 L 28 14 L 28 40 L 50 40 L 50 50 L 18 50 Z"
        fill="white"
      />
      <circle cx="44" cy="20" r="3.5" fill="white" />
    </svg>
  );
}

export function IconChevron({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 14 18 L 28 32 L 14 46"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 30 18 L 44 32 L 30 46"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

type LogoProps = { size?: number; className?: string };

export function LogoArrow({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconLeapArrow size={size} />
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

export function LogoStairs({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconStairs size={size} />
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

export function LogoBracket({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconBracketL size={size} />
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

export function LogoChevron({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconChevron size={size * 0.65} />
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

export function WordmarkOnly({ size = 32, className = "" }: LogoProps) {
  return (
    <span
      className={`font-sans font-black uppercase tracking-tight ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      LE<span style={{ color: "#FF4D2E" }}>A</span>P
    </span>
  );
}

// ─── Concept 5: Live dot ─────────────────────────────────────────────

export function IconLive({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 14 14 L 26 14 L 26 42 L 50 42 L 50 50 L 14 50 Z"
        fill="white"
      />
      <circle cx="50" cy="18" r="6" fill="white" />
      <circle cx="50" cy="18" r="2.5" fill="#FF4D2E" />
    </svg>
  );
}

export function LogoLive({ size = 32, className = "" }: LogoProps) {
  const dot = size * 0.32;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className="relative inline-flex"
        style={{ width: dot, height: dot }}
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
        <span className="relative inline-flex h-full w-full rounded-full bg-brand" />
      </span>
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

// ─── Concept 6: Underline arrow ──────────────────────────────────────

export function IconUnderline({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path d="M 18 14 L 28 14 L 28 38 L 18 38 Z" fill="white" />
      <path
        d="M 14 46 L 44 46 L 44 42 L 54 49 L 44 56 L 44 52 L 14 52 Z"
        fill="white"
      />
    </svg>
  );
}

export function LogoUnderline({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size, lineHeight: 1 }}
      >
        LEAP
      </span>
      <svg
        width={size * 2.4}
        height={size * 0.25}
        viewBox="0 0 100 10"
        className="mt-1"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 5 L 84 5"
          stroke="#FF4D2E"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 80 1 L 92 5 L 80 9 Z"
          fill="#FF4D2E"
          stroke="#FF4D2E"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── Concept 7: Brackets [LEAP] ──────────────────────────────────────

export function IconBrackets({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 16 16 L 26 16 L 26 22 L 22 22 L 22 42 L 26 42 L 26 48 L 16 48 Z"
        fill="white"
      />
      <path
        d="M 48 16 L 38 16 L 38 22 L 42 22 L 42 42 L 38 42 L 38 48 L 48 48 Z"
        fill="white"
      />
    </svg>
  );
}

export function LogoBrackets({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-baseline gap-1 ${className}`}>
      <span
        className="font-sans font-black"
        style={{ fontSize: size * 1.05, color: "#FF4D2E", lineHeight: 1 }}
      >
        [
      </span>
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
      <span
        className="font-sans font-black"
        style={{ fontSize: size * 1.05, color: "#FF4D2E", lineHeight: 1 }}
      >
        ]
      </span>
    </div>
  );
}

// ─── Concept 8: LEAP. period ─────────────────────────────────────────

export function IconPeriod({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 14 14 L 26 14 L 26 42 L 42 42 L 42 50 L 14 50 Z"
        fill="white"
      />
      <rect x="46" y="42" width="8" height="8" rx="1" fill="white" />
    </svg>
  );
}

export function LogoPeriod({ size = 32, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size, lineHeight: 1 }}
      >
        LEAP
      </span>
      <span
        style={{
          fontSize: size * 1.4,
          color: "#FF4D2E",
          lineHeight: 0.8,
          marginLeft: "0.04em",
          fontWeight: 900,
        }}
      >
        .
      </span>
    </span>
  );
}

// ─── Concept 9: Leap trajectory (arc) ────────────────────────────────

export function IconArc({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 12 50 Q 32 12 52 50"
        stroke="white"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="0 0"
      />
      <circle cx="12" cy="50" r="4.5" fill="white" />
      <path
        d="M 48 46 L 54 50 L 48 54"
        stroke="white"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoArc({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconArc size={size} />
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

// ─── Concept 10: Tilted chevron (leap angle) ─────────────────────────

export function IconChevronTilt({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <g transform="rotate(-45 32 32)">
        <path
          d="M 8 22 L 18 32 L 8 42"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 22 22 L 32 32 L 22 42"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 36 22 L 46 32 L 36 42"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

export function LogoChevronTilt({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconChevronTilt size={size * 0.65} />
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

// ─── Concept 11: Ascending chevrons (stair-step) ─────────────────────

export function IconChevronAscend({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 8 46 L 16 38 L 8 30"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        transform="rotate(180 12 38)"
      />
      <path
        d="M 24 40 L 32 32 L 24 24"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 40 34 L 48 26 L 40 18"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoChevronAscend({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconChevronAscend size={size * 0.65} />
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

// ─── Concept 12: Square chevron (L-corner) ───────────────────────────

export function IconChevronSquare({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 12 18 L 30 18 L 30 30"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      <path
        d="M 12 46 L 30 46 L 30 34"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      <path
        d="M 36 18 L 52 18 L 52 30"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      <path
        d="M 36 46 L 52 46 L 52 34"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}

export function LogoChevronSquare({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconChevronSquare size={size * 0.65} />
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

// ─── Concept 13: Chevron with leap dot ───────────────────────────────

export function IconChevronJump({ size = 40, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LEAP"
    >
      <rect width="64" height="64" rx="14" fill="#FF4D2E" />
      <path
        d="M 12 30 Q 26 14 40 30"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="3 4"
      />
      <circle cx="12" cy="30" r="3.5" fill="white" />
      <path
        d="M 32 22 L 48 36 L 32 50"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoChevronJump({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconChevronJump size={size * 0.65} />
      <span
        className="font-sans font-black uppercase tracking-tight"
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        LEAP
      </span>
    </div>
  );
}

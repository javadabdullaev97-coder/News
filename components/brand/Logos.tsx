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
      <IconChevron size={size} />
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

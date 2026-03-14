interface QorperaLogoProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

export function QorperaLogo({
  width = 80,
  height,
  className,
}: QorperaLogoProps) {
  // Original image is 400x300 (4:3) — maintain aspect ratio
  const h = height ?? Math.round(width * (300 / 400));

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mark-black.png"
      alt="Qorpera"
      width={width}
      height={h}
      style={{ filter: "brightness(0)" }}
      className={className}
    />
  );
}

"use client";

type Category =
  | "ring"
  | "necklace"
  | "earring"
  | "bracelet"
  | "cuff"
  | "default";

interface JewelryPlaceholderCSSProps {
  category?: Category;
  size?: number;
  className?: string;
}

function getBorderColor(category: Category): string {
  switch (category) {
    case "ring":
    case "bracelet":
    case "cuff":
      return "rgba(200, 244, 0, 0.3)";
    case "necklace":
      return "rgba(0, 212, 255, 0.3)";
    case "earring":
      return "rgba(177, 74, 237, 0.3)";
    default:
      return "rgba(200, 244, 0, 0.3)";
  }
}

function getHoverGlow(category: Category): string {
  switch (category) {
    case "ring":
    case "bracelet":
    case "cuff":
      return "0 0 20px rgba(200, 244, 0, 0.4)";
    case "necklace":
      return "0 0 20px rgba(0, 212, 255, 0.4)";
    case "earring":
      return "0 0 20px rgba(177, 74, 237, 0.4)";
    default:
      return "0 0 20px rgba(200, 244, 0, 0.4)";
  }
}

export default function JewelryPlaceholderCSS({
  category = "default",
  size = 80,
  className = "",
}: JewelryPlaceholderCSSProps) {
  const borderColor = getBorderColor(category);
  const hoverGlow = getHoverGlow(category);
  const half = size / 2;

  const faceStyle: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    background: "rgba(20, 20, 20, 0.8)",
    border: `1px solid ${borderColor}`,
    boxSizing: "border-box",
  };

  return (
    <div
      className={`group flex items-center justify-center ${className}`}
      style={{ perspective: size * 3 }}
    >
      <div
        className="psy-rotate-cube"
        style={{
          width: size,
          height: size,
          position: "relative",
          transformStyle: "preserve-3d",
          // CSS custom property for hover glow
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--psy-glow" as string]: hoverGlow,
        }}
      >
        {/* Front */}
        <div
          style={{
            ...faceStyle,
            transform: `translateZ(${half}px)`,
          }}
        />
        {/* Back */}
        <div
          style={{
            ...faceStyle,
            transform: `rotateY(180deg) translateZ(${half}px)`,
          }}
        />
        {/* Left */}
        <div
          style={{
            ...faceStyle,
            transform: `rotateY(-90deg) translateZ(${half}px)`,
          }}
        />
        {/* Right */}
        <div
          style={{
            ...faceStyle,
            transform: `rotateY(90deg) translateZ(${half}px)`,
          }}
        />
        {/* Top */}
        <div
          style={{
            ...faceStyle,
            transform: `rotateX(90deg) translateZ(${half}px)`,
          }}
        />
        {/* Bottom */}
        <div
          style={{
            ...faceStyle,
            transform: `rotateX(-90deg) translateZ(${half}px)`,
          }}
        />
      </div>
    </div>
  );
}

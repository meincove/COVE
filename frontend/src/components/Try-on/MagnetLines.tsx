// components/TryOns/MagnetLines.tsx
import React, { useRef, useEffect, CSSProperties } from "react";

interface MagnetLinesProps {
  rows?: number;
  columns?: number;
  containerSize?: string;
  lineColor?: string;
  lineWidth?: string;
  lineHeight?: string;
  baseAngle?: number;
  visibilityRadius?: number; // new
  className?: string;
  style?: CSSProperties;
}

const MagnetLines: React.FC<MagnetLinesProps> = ({
  rows = 15,
  columns = 15,
  containerSize = "80vmin",
  lineColor = "#000000",
  lineWidth = "0.5vmin",
  lineHeight = "3vmin",
  baseAngle = -10,
  visibilityRadius = 120, // new
  className = "",
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLSpanElement>("span");

    const updateLines = (pointer: { x: number; y: number }) => {
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = pointer.x - centerX;
        const dy = pointer.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Show only if within visibility radius
        if (distance < visibilityRadius) {
          const angle =
            ((Math.acos(dx / (distance || 1)) * 180) / Math.PI) *
            (pointer.y > centerY ? 1 : -1);

          item.style.opacity = "1";
          item.style.setProperty("--rotate", `${angle}deg`);
        } else {
          item.style.opacity = "0";
          item.style.setProperty("--rotate", `${baseAngle}deg`);
        }
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateLines({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("pointermove", handlePointerMove);

    // initial trigger
    if (items.length > 0) {
      const mid = Math.floor(items.length / 2);
      const rect = items[mid].getBoundingClientRect();
      updateLines({ x: rect.left, y: rect.top });
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [baseAngle, visibilityRadius]);

  const total = rows * columns;
  const spans = Array.from({ length: total }, (_, i) => (
    <span
      key={i}
      className="block origin-center transition-transform duration-200 ease-out"
      style={{
        backgroundColor: lineColor,
        width: lineWidth,
        height: lineHeight,
        opacity: 0,
        transform: "rotate(var(--rotate))",
        //@ts-ignore
        "--rotate": `${baseAngle}deg`,
        willChange: "transform, opacity",
      }}
    />
  ));

  return (
    <div
      ref={containerRef}
      className={`grid place-items-center ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: containerSize,
        height: containerSize,
        ...style,
      }}
    >
      {spans}
    </div>
  );
};

export default MagnetLines;

"use client"

import React, { useEffect, useRef } from 'react';

type GlowTubeCardProps = {
  width: number;
  height: number;
  borderRadius?: number;
  children: React.ReactNode;
};

const glowColors = ['#FFA500', '#00BFFF']; // dark orange + deep blue
const trailLength = 50;

const GlowTubeCard: React.FC<GlowTubeCardProps> = ({
  width,
  height,
  borderRadius = 24,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width + 20;
    canvas.height = height + 20;

    const offset = 10; // So glow lies outside actual card
    const w = canvas.width - offset * 2;
    const h = canvas.height - offset * 2;
    const r = borderRadius;

    const path: { x: number; y: number }[] = [];

    const buildPath = () => {
      path.length = 0;
      const steps = 100;
      for (let i = 0; i < steps; i++) {
        const t = (i / steps) * 1;
        const angle = t * 2 * Math.PI;
        const x = offset + r + (w - 2 * r) * 0.5 + (w - 2 * r) * 0.5 * Math.cos(angle);
        const y = offset + r + (h - 2 * r) * 0.5 + (h - 2 * r) * 0.5 * Math.sin(angle);
        path.push({ x, y });
      }
    };

    buildPath();

    let t1 = 0;
    let t2 = path.length / 2;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < glowColors.length; i++) {
        const baseT = i === 0 ? t1 : t2;
        for (let j = 0; j < trailLength; j++) {
          const idx = Math.floor((baseT - j + path.length) % path.length);
          const p = path[idx];
          const alpha = (1 - j / trailLength) ** 2;

          const gradient = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            20
          );
          gradient.addColorStop(0, `${glowColors[i]}AA`);
          gradient.addColorStop(0.5, `${glowColors[i]}66`);
          gradient.addColorStop(1, `${glowColors[i]}00`);

          ctx.beginPath();
          ctx.fillStyle = gradient;
          ctx.arc(p.x, p.y, 6 + (1 - j / trailLength) * 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      t1 = (t1 + 1) % path.length;
      t2 = (t2 - 1 + path.length) % path.length;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationRef.current);
  }, [width, height, borderRadius]);

  return (
    <div className="relative w-fit h-fit p-20">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0"
        style={{ pointerEvents: 'none', zIndex: 0 }}
      />
      <div
        className="relative z-10 rounded-xl p-6 bg-[#111827] text-white"
        style={{
          width,
          height,
          borderRadius,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default GlowTubeCard;

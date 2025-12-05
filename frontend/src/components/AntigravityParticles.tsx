'use client';

import { useEffect, useRef } from 'react';

export default function AntigravityParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    // Particle system
    interface Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      phase: number;
    }

    const particles: Particle[] = [];
    const particleCount = 1000;

    // Initialize particles after canvas is sized
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: Math.random() * 2 + 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      resize();
      // Reinitialize particles on resize
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          size: Math.random() * 2 + 1.5,
          phase: Math.random() * Math.PI * 2
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    let animationId: number;
    let time = 0;

    function animate() {
      if (!ctx || !canvas) return;

      time += 0.016;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        const dx = mouse.x - p.baseX;
        const dy = mouse.y - p.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Breathing animation
        const breathe = Math.sin(time * 1.5 + p.phase) * 0.5 + 0.5;

        // Zone-based behavior
        let offsetX = 0;
        let offsetY = 0;
        let size = p.size;
        let opacity = 0.3 + breathe * 0.5;

        // Drift
        offsetX += Math.sin(time * 0.3 + p.phase) * 1.5;
        offsetY += Math.cos(time * 0.2 + p.phase * 1.3) * 1.5;

        if (dist < 100) {
          // Inner zone
          size = 1.5 + breathe * 1.5;
          opacity *= 0.6;
        } else if (dist < 200) {
          // Mid zone 1 - wave motion
          const angle = Math.atan2(dy, dx);
          const waveIntensity = Math.sin(time * 1.0 + p.phase) * (1 - (dist - 100) / 100);
          offsetX += Math.cos(angle) * waveIntensity * 90;
          offsetY += Math.sin(angle) * waveIntensity * 90;
          size = 5 + breathe * 2.5;
          opacity *= 1.15;
        } else if (dist < 500) {
          // Mid zone 2 - stronger wave
          const angle = Math.atan2(dy, dx);
          const waveIntensity = Math.sin(time * 0.8 + p.phase) * (1 - ((dist - 200) / 300) * 0.5);
          offsetX += Math.cos(angle) * waveIntensity * 135;
          offsetY += Math.sin(angle) * waveIntensity * 135;
          size = 7.5 + breathe * 2.5;
          opacity *= 1.15;
        } else if (dist < 1000) {
          // Outer zone
          size = 1.5 + breathe * 1.5;
          opacity *= 0.7;
        } else {
          // Beyond
          size = 1 + breathe * 1;
          opacity *= 0.7;
          offsetX *= 0.5;
          offsetY *= 0.5;
        }

        p.x = p.baseX + offsetX;
        p.y = p.baseY + offsetY;

        // Draw pill shape
        ctx.save();
        ctx.translate(p.x, p.y);
        const angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);
        ctx.rotate(angle);

        ctx.fillStyle = `rgba(66, 133, 244, ${opacity})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.5, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ width: '100%', height: '100%', background: 'white' }}
    />
  );
}

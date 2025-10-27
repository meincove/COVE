'use client';

import React, { useRef } from 'react';

export default function AnimatedButton() {
  const maskContainerRef = useRef<HTMLDivElement>(null);
  const baseTextRef = useRef<HTMLSpanElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    const size = 120;

    if (maskContainerRef.current) {
      const style = maskContainerRef.current.style;
      style.maskPosition = `${x}px ${y}px`;
      style.webkitMaskPosition = `${x}px ${y}px`;
      style.maskSize = `${size}px ${size}px`;
      style.webkitMaskSize = `${size}px ${size}px`;
      style.maskOrigin = 'border-box';
      style.webkitMaskOrigin = 'border-box';
    }

    if (baseTextRef.current) {
      baseTextRef.current.style.opacity = '0';
    }
  };

  const handleMouseLeave = () => {
    if (maskContainerRef.current) {
      const style = maskContainerRef.current.style;
      style.maskSize = '0px 0px';
      style.webkitMaskSize = '0px 0px';
    }

    if (baseTextRef.current) {
      baseTextRef.current.style.opacity = '1';
    }
  };

  return (
    <button
      className="relative w-64 h-14 rounded-full bg-white overflow-hidden shadow-md group transition-all duration-300"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Default Text */}
      <span
        ref={baseTextRef}
        className="relative z-10 text-black font-semibold pointer-events-none transition-opacity duration-200"
      >
        Try it Free →
      </span>

      {/* Masked red + welcome text layer */}
      <div
        ref={maskContainerRef}
        className="absolute inset-0 z-20 pointer-events-none transition-all duration-300"
        style={{
          backgroundColor: '#fca5a5',
          maskImage: 'url("/mask/mask.svg")',
          WebkitMaskImage: 'url("/mask/mask.svg")',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskOrigin: 'border-box',
          WebkitMaskOrigin: 'border-box',
          maskSize: '0px 0px',
          WebkitMaskSize: '0px 0px',
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-black font-semibold">Welcome →</span>
        </div>
      </div>
    </button>
  );
}

'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    angle: number; // For orbital motion
    orbitSpeed: number; // Speed of orbit around cursor
}

interface FluidParticleBackgroundProps {
    particleCount?: number;
    mouseRadius?: number;
    attractionRadius?: number;
}

export default function FluidParticleBackground({
    particleCount = 1200,
    mouseRadius = 180,
    attractionRadius = 300
}: FluidParticleBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
        prevX: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
        prevY: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
        isMoving: false,
        lastMoveTime: Date.now()
    });
    const animationFrameRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Resize canvas
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();

        // Initialize particles
        const initParticles = () => {
            particlesRef.current = [];
            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 1.5 + 2, // Bigger particles (2-3.5px)
                    angle: Math.random() * Math.PI * 2,
                    orbitSpeed: (Math.random() - 0.5) * 0.02
                });
            }
        };
        initParticles();

        // Mouse move handler
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current.prevX = mouseRef.current.x;
            mouseRef.current.prevY = mouseRef.current.y;
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
            mouseRef.current.isMoving = true;
            mouseRef.current.lastMoveTime = Date.now();
        };

        // Touch move handler
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                mouseRef.current.prevX = mouseRef.current.x;
                mouseRef.current.prevY = mouseRef.current.y;
                mouseRef.current.x = e.touches[0].clientX;
                mouseRef.current.y = e.touches[0].clientY;
                mouseRef.current.isMoving = true;
                mouseRef.current.lastMoveTime = Date.now();
            }
        };

        // Update particles
        const update = () => {
            // Check if mouse is still moving
            const timeSinceMove = Date.now() - mouseRef.current.lastMoveTime;
            const isStatic = timeSinceMove > 100; // Consider static after 100ms

            particlesRef.current.forEach(particle => {
                const dx = mouseRef.current.x - particle.x;
                const dy = mouseRef.current.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                if (distance < attractionRadius) {
                    // ATTRACTION FORCE - particles want to get close to cursor
                    const attractionForce = (1 - distance / attractionRadius) * 0.15;
                    particle.vx += Math.cos(angle) * attractionForce;
                    particle.vy += Math.sin(angle) * attractionForce;

                    // REPULSION FORCE - but can't get too close
                    if (distance < mouseRadius) {
                        const repulsionForce = (mouseRadius - distance) / mouseRadius * 3;
                        particle.vx -= Math.cos(angle) * repulsionForce;
                        particle.vy -= Math.sin(angle) * repulsionForce;

                        // ORBITAL MOTION when cursor is static
                        if (isStatic && distance > mouseRadius * 0.3) {
                            // Add tangential force for circular motion
                            particle.angle += particle.orbitSpeed;
                            const tangentAngle = angle + Math.PI / 2;
                            const orbitalForce = 0.5;
                            particle.vx += Math.cos(tangentAngle) * orbitalForce;
                            particle.vy += Math.sin(tangentAngle) * orbitalForce;
                        }
                    }
                }

                // Apply friction for smooth motion
                particle.vx *= 0.92;
                particle.vy *= 0.92;

                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Boundary conditions - wrap around
                if (particle.x < 0) particle.x = canvas.width;
                if (particle.x > canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = canvas.height;
                if (particle.y > canvas.height) particle.y = 0;
            });

            mouseRef.current.isMoving = false;
        };

        // Draw particles
        const draw = () => {
            // Clear canvas completely (no trail effect for better performance)
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw particles - ONLY BLUE, NO CONNECTIONS
            particlesRef.current.forEach(particle => {
                const dx = mouseRef.current.x - particle.x;
                const dy = mouseRef.current.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Base blue color
                let opacity = 0.7;
                let radius = particle.radius;

                // Enhance particles near cursor
                if (distance < mouseRadius) {
                    const proximity = 1 - distance / mouseRadius;
                    opacity = 0.7 + proximity * 0.3; // Brighter near cursor
                    radius = particle.radius * (1 + proximity * 0.3); // Slightly bigger
                }

                // Draw particle with blue color
                ctx.fillStyle = `rgba(66, 133, 244, ${opacity})`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
                ctx.fill();

                // Add subtle glow for particles very close to cursor
                if (distance < mouseRadius * 0.7) {
                    const glowIntensity = (1 - distance / (mouseRadius * 0.7)) * 0.3;
                    ctx.fillStyle = `rgba(66, 133, 244, ${glowIntensity})`;
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, radius * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        };

        // Animation loop - optimized for 60+ FPS
        const animate = () => {
            update();
            draw();
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();

        // Event listeners
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);

        // Cleanup
        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [particleCount, mouseRadius, attractionRadius]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full -z-10"
            style={{ background: '#f8f9fa' }}
        />
    );
}

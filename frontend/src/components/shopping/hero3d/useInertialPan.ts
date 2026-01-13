// src/components/shopping/hero3d/useInertialPan.ts
"use client";

import * as React from "react";
import { clamp } from "./curvature";

export type PanBounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

type Params = {
    bounds: PanBounds;

    // feel
    friction?: number; // 0.90–0.97 (higher = longer glide)
    spring?: number; // 0.02–0.06 (lower = less snap-back)
    rubberBand?: number; // 0.45–0.75 (higher = softer outside-bounds)

    // pixel-delta -> world-delta
    pxToWorldDX: (px: number) => number;
    pxToWorldDY: (px: number) => number;
};

export function useInertialPan({
    bounds,
    friction = 0.945,
    spring = 0.035,
    rubberBand = 0.62,
    pxToWorldDX,
    pxToWorldDY,
}: Params) {
    const draggingRef = React.useRef(false);
    const pointerIdRef = React.useRef<number | null>(null);

    const startPointerRef = React.useRef({ x: 0, y: 0 });
    const startPosRef = React.useRef({ x: 0, y: 0 });

    const lastRef = React.useRef({ x: 0, y: 0, t: 0 });

    // world-space position + velocity
    const posRef = React.useRef({ x: 0, y: 0 });
    const velRef = React.useRef({ x: 0, y: 0 });

    const [isDragging, setIsDragging] = React.useState(false);

    const onPointerDown = React.useCallback((e: React.PointerEvent) => {
        if (pointerIdRef.current !== null) return;

        pointerIdRef.current = e.pointerId;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        draggingRef.current = true;
        setIsDragging(true);

        startPointerRef.current = { x: e.clientX, y: e.clientY };
        startPosRef.current = { ...posRef.current };

        lastRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
        velRef.current = { x: 0, y: 0 };
    }, []);

    const onPointerMove = React.useCallback(
        (e: React.PointerEvent) => {
            if (!draggingRef.current) return;
            if (pointerIdRef.current !== e.pointerId) return;

            const now = performance.now();
            const dt = Math.max(now - lastRef.current.t, 1);

            const dxPx = e.clientX - startPointerRef.current.x;
            const dyPx = e.clientY - startPointerRef.current.y;

            let nextX = startPosRef.current.x + pxToWorldDX(dxPx);
            let nextY = startPosRef.current.y + pxToWorldDY(dyPx);

            // rubber-band outside bounds (in WORLD space)
            if (nextX < bounds.minX) nextX = bounds.minX + (nextX - bounds.minX) * rubberBand;
            if (nextX > bounds.maxX) nextX = bounds.maxX + (nextX - bounds.maxX) * rubberBand;
            if (nextY < bounds.minY) nextY = bounds.minY + (nextY - bounds.minY) * rubberBand;
            if (nextY > bounds.maxY) nextY = bounds.maxY + (nextY - bounds.maxY) * rubberBand;

            // velocity in WORLD units (scaled to ~16ms frame)
            const vx = (pxToWorldDX(e.clientX - lastRef.current.x) / dt) * 16;
            const vy = (pxToWorldDY(e.clientY - lastRef.current.y) / dt) * 16;

            velRef.current = { x: vx, y: vy };
            posRef.current = { x: nextX, y: nextY };

            lastRef.current = { x: e.clientX, y: e.clientY, t: now };
        },
        [bounds, pxToWorldDX, pxToWorldDY, rubberBand]
    );

    const onPointerUp = React.useCallback((e: React.PointerEvent) => {
        if (pointerIdRef.current !== e.pointerId) return;

        draggingRef.current = false;
        setIsDragging(false);

        pointerIdRef.current = null;
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch { }
    }, []);

    // call inside R3F useFrame
    const step = React.useCallback(() => {
        if (draggingRef.current) return;

        // inertia
        posRef.current.x += velRef.current.x;
        posRef.current.y += velRef.current.y;

        velRef.current.x *= friction;
        velRef.current.y *= friction;

        // spring ONLY when outside bounds (soft, no snapping within bounds)
        const cx = clamp(posRef.current.x, bounds.minX, bounds.maxX);
        const cy = clamp(posRef.current.y, bounds.minY, bounds.maxY);

        if (posRef.current.x !== cx) {
            const diff = cx - posRef.current.x;
            posRef.current.x += diff * spring;
            velRef.current.x += diff * spring * 0.35;
        }

        if (posRef.current.y !== cy) {
            const diff = cy - posRef.current.y;
            posRef.current.y += diff * spring;
            velRef.current.y += diff * spring * 0.35;
        }
    }, [bounds, friction, spring]);

    const getWorld = React.useCallback(() => {
        return { x: posRef.current.x, y: posRef.current.y, isDragging };
    }, [isDragging]);

    return {
        bind: { onPointerDown, onPointerMove, onPointerUp },
        step,
        getWorld,
        isDragging,
    };
}

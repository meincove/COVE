// src/components/shopping/hero3d/TileField.tsx
"use client";

import * as React from "react";
import * as THREE from "three";
import { CurvatureParams, curvedZFromX, clamp } from "./curvature";

type Tile = {
    key: string;
    url: string;
    baseX: number;
    baseY: number;
    w: number;
    h: number;
    tilt: number;
    depthJitter: number;
};

type Props = {
    imageUrls: string[];
    params: CurvatureParams;
    offsetX: number;
    offsetY: number;
    wallWidth: number;
    wallHeight: number;
    tileCount: number;
    isMobile: boolean;
};

function mulberry32(seed: number) {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Loads all urls into a URL -> Texture map.
 * Always returns a fallback texture immediately so you never render grey cards.
 */
function useTextureMap(urls: string[], fallbackUrl: string) {
    const [map, setMap] = React.useState<Map<string, THREE.Texture>>(new Map());
    const fallbackTexRef = React.useRef<THREE.Texture | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = "anonymous";

        const load = (url: string) =>
            new Promise<THREE.Texture>((resolve) => {
                loader.load(
                    url,
                    (tex) => resolve(tex),
                    undefined,
                    () => {
                        // if url fails, load fallback
                        loader.load(fallbackUrl, (tex) => resolve(tex));
                    }
                );
            });

        (async () => {
            // ensure fallback texture exists first
            if (!fallbackTexRef.current) {
                const ft = await load(fallbackUrl);
                ft.colorSpace = THREE.SRGBColorSpace;
                ft.anisotropy = 2;
                ft.minFilter = THREE.LinearMipMapLinearFilter;
                ft.magFilter = THREE.LinearFilter;
                ft.needsUpdate = true;
                fallbackTexRef.current = ft;
            }

            const entries = await Promise.all(
                urls.map(async (u) => {
                    const tex = await load(u);
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.anisotropy = 2;
                    tex.minFilter = THREE.LinearMipMapLinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.needsUpdate = true;
                    return [u, tex] as const;
                })
            );

            if (cancelled) return;

            const next = new Map<string, THREE.Texture>();
            for (const [u, tex] of entries) next.set(u, tex);
            setMap(next);
        })();

        return () => {
            cancelled = true;
        };
    }, [urls, fallbackUrl]);

    const get = React.useCallback(
        (url: string) => map.get(url) ?? fallbackTexRef.current ?? undefined,
        [map]
    );

    return { get };
}

export function TileField({
    imageUrls,
    params,
    offsetX,
    offsetY,
    wallWidth,
    wallHeight,
    tileCount,
    isMobile,
}: Props) {
    const FALLBACK_URL = "/clothing-images/fallback.jpg";

    // Ensure we always have enough urls (repeat) and no empty strings
    const urls = React.useMemo(() => {
        const cleaned = (imageUrls ?? [])
            .map((u) => (typeof u === "string" ? u.trim() : ""))
            .filter(Boolean);

        const base = cleaned.length ? cleaned : [FALLBACK_URL];

        const out: string[] = [];
        while (out.length < tileCount) out.push(...base);
        return out.slice(0, tileCount);
    }, [imageUrls, tileCount]);

    const texMap = useTextureMap(urls, FALLBACK_URL);

    const tiles = React.useMemo<Tile[]>(() => {
        const rand = mulberry32(1337);

        /**
         * GAP SYSTEM (min/max) to avoid overlap on all screens:
         * - compute a base gap from wall size
         * - clamp it between min/max
         */
        const desiredGapX = isMobile ? wallWidth / 7.4 : wallWidth / 9.6;
        const desiredGapY = isMobile ? wallHeight / 3.8 : wallHeight / 4.6;

        const gapMinX = isMobile ? 0.55 : 0.70;
        const gapMaxX = isMobile ? 1.10 : 1.35;

        const gapMinY = isMobile ? 0.60 : 0.78;
        const gapMaxY = isMobile ? 1.18 : 1.42;

        const gapX = clamp(desiredGapX, gapMinX, gapMaxX);
        const gapY = clamp(desiredGapY, gapMinY, gapMaxY);

        // derive cols/rows from gap
        const cols = Math.max(6, Math.min(isMobile ? 8 : 12, Math.floor(wallWidth / gapX)));
        const rows = Math.max(4, Math.min(isMobile ? 6 : 7, Math.ceil(tileCount / cols)));

        // Tile sizes MUST be <= gap to avoid overlap (with a safety factor)
        const safeX = gapX * 0.82;
        const safeY = gapY * 0.82;

        // portrait/landscape ratios (kept sane)
        const portraitH = safeY;
        const portraitW = Math.min(safeX, portraitH * 0.72);

        const landscapeW = safeX;
        const landscapeH = Math.min(safeY, landscapeW * 0.62);

        const out: Tile[] = [];
        let idx = 0;

        // jitter capped so it cannot cause overlap
        const jxMax = gapX * 0.11;
        const jyMax = gapY * 0.11;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (idx >= tileCount) break;

                const isPortrait = (r + c) % 2 === 0;
                const w = isPortrait ? portraitW : landscapeW;
                const h = isPortrait ? portraitH : landscapeH;

                const centerX = (c + 0.5) * gapX - (cols * gapX) / 2;
                const centerY = (rows * gapY) / 2 - (r + 0.5) * gapY;

                const jx = (rand() - 0.5) * 2 * jxMax;
                const jy = (rand() - 0.5) * 2 * jyMax;

                const tilt = (rand() - 0.5) * 0.03;
                const depthJitter = (rand() - 0.5) * 0.06;

                out.push({
                    key: `tile-${r}-${c}-${idx}`,
                    url: urls[idx] ?? FALLBACK_URL,
                    baseX: centerX + jx,
                    baseY: centerY + jy,
                    w,
                    h,
                    tilt,
                    depthJitter,
                });

                idx++;
            }
        }

        return out;
    }, [tileCount, wallWidth, wallHeight, urls, isMobile]);

    return (
        <group>
            {tiles.map((t) => {
                const x = t.baseX + offsetX;
                const y = t.baseY + offsetY;

                const xClamped = clamp(x, -wallWidth * 0.95, wallWidth * 0.95);
                const z = curvedZFromX(xClamped, params) + 0.14 + t.depthJitter;

                // keep yaw small to avoid distortion
                const yaw = clamp(-xClamped * 0.020, -0.16, 0.16);

                // center focus (but do NOT scale so much that it overlaps)
                const edge = Math.min(1, Math.abs(xClamped) / (wallWidth * 0.78));
                const focus = 1 - edge;

                const opacity = 0.62 + focus * 0.34;
                const emissiveStrength = 0.04 + focus * 0.12;

                // tiny scale range (safe)
                const scale = 0.96 + focus * 0.08;

                const tex = texMap.get(t.url);

                return (
                    <mesh key={t.key} position={[x, y, z]} rotation={[0, yaw, t.tilt]} scale={[scale, scale, 1]}>
                        <planeGeometry args={[t.w, t.h, 1, 1]} />
                        <meshStandardMaterial
                            map={tex}
                            transparent
                            opacity={opacity}
                            roughness={0.55}
                            metalness={0.04}
                            emissive={new THREE.Color("#9bb3ff")}
                            emissiveIntensity={emissiveStrength}
                        />
                    </mesh>
                );
            })}
        </group>
    );
}

// src/components/shopping/hero3d/HeroScanner3D.tsx
"use client";

import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CurvedWall } from "./CurvedWall";
import { TileField } from "./TileField";
import { CurvatureParams } from "./curvature";
import { useInertialPan } from "./useInertialPan";

type Props = {
    imageUrls: string[];
    heightVh: number;
    minHeight: number;
};

function Scene({ imageUrls }: { imageUrls: string[] }) {
    const { size, viewport } = useThree();

    // Responsive wall
    const wallWidth = viewport.width * 1.32;
    const wallHeight = viewport.height * 0.98;

    // MORE inward at center (stronger concave), edges less bendy
    const params: CurvatureParams = React.useMemo(
        () => ({
            curvature: 0.30, // stronger than before
            maxBendWorldX: wallWidth * 0.30, // saturate earlier -> edges stay flatter
        }),
        [wallWidth]
    );

    const isMobile = React.useMemo(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(max-width: 768px)").matches;
    }, []);

    // More tiles overall but still stable (TileField will layout safely)
    const tileCount = isMobile ? 36 : 64;

    const pxToWorldDX = React.useCallback(
        (px: number) => (px / size.width) * viewport.width,
        [size.width, viewport.width]
    );
    const pxToWorldDY = React.useCallback(
        (px: number) => (-px / size.height) * viewport.height,
        [size.height, viewport.height]
    );

    // Reduce snapback (more reach + weaker spring)
    const pan = useInertialPan({
        bounds: {
            minX: -wallWidth * 1.25,
            maxX: wallWidth * 1.25,
            minY: -wallHeight * 0.95,
            maxY: wallHeight * 0.95,
        },
        friction: 0.962,
        spring: 0.020,
        rubberBand: 0.70,
        pxToWorldDX,
        pxToWorldDY,
    });

    const idlePhase = React.useRef(0);
    const idleOffset = React.useRef({ x: 0, y: 0 });
    const [offset, setOffset] = React.useState({ x: 0, y: 0, dragging: false });

    useFrame((_, dt) => {
        pan.step();

        const v = pan.getWorld();
        if (!v.isDragging) {
            idlePhase.current += dt;
            idleOffset.current.x = Math.sin(idlePhase.current * 0.10) * (wallWidth * 0.010);
            idleOffset.current.y = Math.cos(idlePhase.current * 0.09) * (wallHeight * 0.006);
        } else {
            idleOffset.current.x = 0;
            idleOffset.current.y = 0;
        }

        setOffset({
            x: v.x + idleOffset.current.x,
            y: v.y + idleOffset.current.y,
            dragging: v.isDragging,
        });
    });

    return (
        <group {...pan.bind}>
            <ambientLight intensity={0.65} />
            <directionalLight position={[3.2, 2.3, 4.4]} intensity={0.75} />
            <directionalLight position={[-3.0, -0.8, 3.0]} intensity={0.30} />

            <fog attach="fog" args={["#05060a", 5.8, 16.0]} />

            <CurvedWall
                width={wallWidth}
                height={wallHeight}
                segmentsX={160}
                segmentsY={72}
                params={params}
            />

            <TileField
                imageUrls={imageUrls}
                params={params}
                offsetX={offset.x}
                offsetY={offset.y}
                wallWidth={wallWidth}
                wallHeight={wallHeight}
                tileCount={tileCount}
                isMobile={isMobile}
            />
        </group>
    );
}

export function HeroScanner3D({ imageUrls, heightVh, minHeight }: Props) {
    const style = React.useMemo(
        () => ({ height: `${heightVh}vh`, minHeight: `${minHeight}px` }),
        [heightVh, minHeight]
    );

    return (
        <div className="relative w-full overflow-hidden" style={style}>
            <Canvas
                dpr={[1, 1.5]}
                gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
                camera={{ fov: 38, position: [0, 0, 7.6], near: 0.1, far: 80 }}
            >
                <Scene imageUrls={imageUrls} />
            </Canvas>
        </div>
    );
}

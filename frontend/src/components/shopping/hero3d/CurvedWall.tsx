// src/components/shopping/hero3d/CurvedWall.tsx
"use client";

import * as React from "react";
import * as THREE from "three";
import { CurvatureParams, curvedZFromX } from "./curvature";

type Props = {
    width: number;
    height: number;
    segmentsX?: number;
    segmentsY?: number;
    params: CurvatureParams;
};

export function CurvedWall({ width, height, segmentsX = 140, segmentsY = 64, params }: Props) {
    const geo = React.useMemo(() => {
        const g = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
        const pos = g.attributes.position as THREE.BufferAttribute;

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = curvedZFromX(x, params);
            pos.setZ(i, z);
        }

        pos.needsUpdate = true;
        g.computeVertexNormals();
        return g;
    }, [width, height, segmentsX, segmentsY, params.curvature, params.maxBendWorldX]);

    return (
        <mesh geometry={geo} rotation={[0, 0, 0]} position={[0, 0, -0.52]}>
            {/* dark “stage” behind screens */}
            <meshStandardMaterial color={"#07080d"} roughness={0.9} metalness={0.08} />
        </mesh>
    );
}

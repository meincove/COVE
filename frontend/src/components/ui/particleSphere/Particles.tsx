'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import vertexShader from './vertexShader';
import fragmentShader from './fragmentShader';
import { SimulationHandle } from './SimulationMaterial';

interface Props {
  size: number;
  simRef: React.RefObject<SimulationHandle>;
}

export default function Particles({ size, simRef }: Props) {
  const count = size * size;

  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const references = useMemo(() => {
    const arr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      arr[i * 2 + 0] = (i % size) / size; // u
      arr[i * 2 + 1] = Math.floor(i / size) / size; // v
    }
    return arr;
  }, [count, size]);

  useFrame(({ clock }) => {
    if (materialRef.current && simRef.current) {
      materialRef.current.uniforms.uPositions.value = simRef.current.getCurrentTexture();
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes.ref"
          args={[references, 2]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uPositions: { value: null },
          uTime: { value: 0 },
        }}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

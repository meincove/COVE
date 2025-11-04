// src/components/LightRunway.tsx
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { EffectComposer, Bloom, GodRays, Vignette } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";

type ThemeMode = "light" | "dark";

function LightBar({ color = "#7dfc65" }: { color?: string }) {
  const bar = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.getElapsedTime() * 0.7) * 0.02; // gentle breathing
    if (bar.current) bar.current.scale.y = s;
  });
  return (
    <mesh ref={bar} position={[0, 3.5, -2]}>
      <boxGeometry args={[2.8, 0.08, 0.08]} />
      <meshStandardMaterial
        color="black"
        emissive={new THREE.Color(color)}
        emissiveIntensity={10} /* brighter */
      />
    </mesh>
  );
}

function VolumetricSpot({
  x = -1.2,
  z = -1.2,
  color = "#7dfc65",
}: {
  x?: number;
  z?: number;
  color?: string;
}) {
  const coneMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28, // more visible volume
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color]
  );

  return (
    <group position={[x, 3.25, z]} rotation={[Math.PI * -0.35, 0, 0]}>
      <spotLight
        color={color}
        angle={0.5}
        penumbra={0.8}
        intensity={6.5}   // brighter throw
        distance={10}
        castShadow
      />
      {/* simple volumetric cone to sell beams */}
      <mesh>
        <coneGeometry args={[1.25, 3.2, 64, 1, true]} />
        <primitive attach="material" object={coneMat} />
      </mesh>
    </group>
  );
}

function Stage({ theme = "dark" as ThemeMode }) {
  // Put this file at /public/textures/gobo_grid_soft.png
  const grid = useTexture("/textures/gobo_grid_soft.png");
  grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
  grid.repeat.set(1.5, 1.5);

  const tint = theme === "light" ? "#7dfc65" : "#9b5cff";

  return (
    <group>
      {/* Plinth / stage block */}
      <mesh position={[0, 0.48, 0]} receiveShadow>
        <boxGeometry args={[4.6, 0.96, 2.2]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.2} roughness={0.55} />
      </mesh>

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#020202" roughness={0.9} />
      </mesh>

      {/* Gobo overlay (tinted additive) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.501, 0]}>
        <planeGeometry args={[5.2, 2.8]} />
        <meshBasicMaterial
          map={grid}
          transparent
          opacity={0.45} // stronger pattern
          blending={THREE.AdditiveBlending}
          color={tint}
        />
      </mesh>

      {/* Truss light + two side spots */}
      <LightBar color={tint} />
      <VolumetricSpot x={-1.2} z={-0.9} color={tint} />
      <VolumetricSpot x={1.2} z={-0.9} color={tint} />
    </group>
  );
}

export default function LightRunwayScene({ theme = "dark" as ThemeMode }: { theme?: ThemeMode }) {
  const sunRef = useRef<THREE.Mesh>(null!);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position: [0, 2.2, 6.0], fov: 40 }}
        onCreated={({ gl, scene }) => {
          // brighter renderer + thin greenish haze
          gl.toneMappingExposure = 1.2;
          scene.fog = new THREE.FogExp2(0x031106, 0.12);
        }}
      >
        <ambientLight intensity={0.28} />
        <directionalLight position={[3, 5, 3]} intensity={0.55} />

        {/* Hidden "sun" drives GodRays (keep near the light bar) */}
        <mesh ref={sunRef} position={[0, 3.5, -2]} visible={false}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial />
        </mesh>

        <Stage theme={theme} />

        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.45}
          scale={10}
          blur={2.6}
          far={3}
          resolution={1024}
        />
        <Environment preset="warehouse" />

        {/* Post-processing that exists in your installed version */}
        <EffectComposer>
          <GodRays
            sun={sunRef}
            decay={0.95}
            exposure={0.55}    // stronger beams
            weight={0.9}
            density={0.92}
            samples={80}
          />
          <Bloom
            mipmapBlur
            intensity={0.9}    // more glow
            luminanceThreshold={0.35}
            luminanceSmoothing={0.25}
          />
          <Vignette eskil={false} offset={0.22} darkness={0.7} />
        </EffectComposer>

        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          maxPolarAngle={Math.PI / 2.1}
          // lock zoom if you want a fixed hero
          // enableZoom={false}
        />
      </Canvas>
    </div>
  );
}

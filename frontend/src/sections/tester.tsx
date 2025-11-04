'use client';

import * as React from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, GodRays, Vignette } from '@react-three/postprocessing';

/** ---------- CONFIG ---------- **/
const CAMERA_POS: [number, number, number] = [0, 1.8, 5.0];
const STAGE_SIZE = { x: 4.6, y: 0.96, z: 2.2 };
const STAGE_POS: [number, number, number] = [0, 0.48, 0]; // sits on floor
const LIGHT_TINT = '#a78bfa'; // soft purple
const FLOOR_COLOR = '#0e0f10';

function LightBar({ color = LIGHT_TINT }: { color?: string }) {
  const bar = React.useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.getElapsedTime() * 0.7) * 0.02;
    if (bar.current) bar.current.scale.y = s;
  });

  return (
    <mesh ref={bar} position={[0, 3.4, -2]}>
      <boxGeometry args={[2.8, 0.08, 0.08]} />
      <meshStandardMaterial
        color="black"
        emissive={new THREE.Color(color)}
        emissiveIntensity={10}
      />
    </mesh>
  );
}

function OverheadSpots({ color = LIGHT_TINT }: { color?: string }) {
  // two soft spots aiming toward stage center; no visible cones
  return (
    <group>
      <spotLight
        color={color}
        position={[-1.4, 3.1, -1.1]}
        angle={0.6}
        penumbra={0.9}
        intensity={5.8}
        distance={12}
        castShadow
      />
      <spotLight
        color={color}
        position={[1.4, 3.1, -1.1]}
        angle={0.6}
        penumbra={0.9}
        intensity={5.8}
        distance={12}
        castShadow
      />
    </group>
  );
}

function Stage() {
  const stageMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b2c31', metalness: 0.2, roughness: 0.55 }),
    []
  );
  return (
    <group>
      {/* plinth / platform */}
      <mesh position={STAGE_POS} castShadow receiveShadow>
        <boxGeometry args={[STAGE_SIZE.x, STAGE_SIZE.y, STAGE_SIZE.z]} />
        <primitive object={stageMat} attach="material" />
      </mesh>
    </group>
  );
}

/** A simple “garment” proxy that rotates around and POPs when inside the lit area */
function TestItem() {
  const ref = React.useRef<THREE.Mesh>(null!);
  const baseMat = React.useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cfd2d9',
        metalness: 0.12,
        roughness: 0.65,
        emissive: new THREE.Color(LIGHT_TINT),
        emissiveIntensity: 0.0,
      }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // move along a circle above the stage
    const r = 1.6;
    const x = Math.cos(t * 0.45) * r;
    const z = Math.sin(t * 0.45) * r - 0.2;
    ref.current.position.set(x, 1.05, z);
    ref.current.rotation.y = -t * 0.45 + Math.PI / 2;

    // “presentation window”: inside the top face of the platform with small margins
    const halfX = STAGE_SIZE.x * 0.45;
    const halfZ = STAGE_SIZE.z * 0.45;
    const inside =
      Math.abs(ref.current.position.x - STAGE_POS[0]) < halfX &&
      Math.abs(ref.current.position.z - STAGE_POS[2]) < halfZ;

    // pop: a touch of emissive + slightly glossier + 5% scale bump
    const targetEmissive = inside ? 1.2 : 0.0;
    baseMat.emissiveIntensity = THREE.MathUtils.lerp(
      baseMat.emissiveIntensity,
      targetEmissive,
      0.12
    );
    const s = inside ? 1.05 : 1.0;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
  });

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={[0.55, 0.75, 0.08]} />
      <primitive attach="material" object={baseMat} />
    </mesh>
  );
}

export default function Tester() {
  const sunRef = React.useRef<THREE.Mesh>(null!);

  return (
    <section className="relative w-screen min-h-[100svh] bg-black">
      <div className="absolute inset-0">
        <Canvas
          shadows
          dpr={[1, 1.75]} // keep bloom/GodRays crisp without overdoing DPR
          camera={{ position: CAMERA_POS, fov: 40 }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor('#000000', 1);
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.2;
            // thin colored haze to hide edges but keep depth
            scene.fog = new THREE.FogExp2(0x090b09, 0.10);
          }}
        >
          {/* ambient/fill */}
          <ambientLight intensity={0.25} />
          <directionalLight position={[3, 6, 3]} intensity={0.55} />

          {/* Hidden “sun” sphere for GodRays near the tube */}
          <mesh ref={sunRef} position={[0, 3.4, -2]} visible={false}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial />
          </mesh>

          {/* Ground plane (large) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9} />
          </mesh>

          {/* Far dark backdrop to avoid "void" */}
          <mesh position={[0, 4, -20]} receiveShadow>
            <planeGeometry args={[60, 30]} />
            <meshStandardMaterial color="#050506" roughness={1} />
          </mesh>

          {/* Stage & lights */}
          <Stage />
          <LightBar />
          <OverheadSpots />

          {/* Moving test item that "pops" under light */}
          <TestItem />

          {/* Contact shadow under stage */}
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.45}
            scale={12}
            blur={2.6}
            far={3.2}
            resolution={1024}
          />

          <Environment preset="warehouse" />

          {/* Post FX available in your versions */}
          <EffectComposer /* enableNormalPass={false} (default) */>
            <GodRays
              sun={sunRef}
              decay={0.95}
              exposure={0.55}
              weight={0.9}
              density={0.92}
              samples={80}
            />
            <Bloom
              mipmapBlur
              intensity={0.9}
              luminanceThreshold={0.35}
              luminanceSmoothing={0.25}
            />
            <Vignette eskil={false} offset={0.22} darkness={0.7} />
          </EffectComposer>

          {/* NOTE: no OrbitControls → camera is locked, feels "fixed to ground" */}
        </Canvas>
      </div>
    </section>
  );
}

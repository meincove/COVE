'use client';

import * as React from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

// -------- helpers
THREE.ColorManagement.enabled = true;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

// Measure how far the section has scrolled through the viewport (0..1)
function useSectionProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const h = window.innerHeight || 1;
      // 0 when section top is below viewport, 1 when bottom has passed top
      const start = h; // when top reaches bottom of viewport
      const end = -rect.height * 0.2; // a bit past the top for a nicer range
      const t = (rect.top - end) / (start - end);
      setProgress(clamp01(1 - t));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref]);
  return progress;
}

// =================== TUBE LIGHT ===================
function TubeLightModel({
  position = [0, 2.1, -0.2] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
}) {
  const { scene } = useGLTF('/models/tubelight.glb') as unknown as { scene: THREE.Group };

  React.useEffect(() => {
    scene.traverse((o: any) => {
      if (o.isMesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        if (m) {
          if (m.emissive !== undefined) {
            m.emissive = new THREE.Color('#ffffff');
            m.emissiveIntensity = 0.0; // animated externally
          }
          m.roughness = Math.min(0.35, m.roughness ?? 0.35);
          m.metalness = Math.max(0.05, m.metalness ?? 0.05);
        }
      }
    });
  }, [scene]);

  (TubeLightModel as any).setEmissive = (value: number) => {
    scene.traverse((o: any) => {
      if (o.isMesh && o.material && (o.material as any).emissive) {
        (o.material as THREE.MeshStandardMaterial).emissiveIntensity = value;
      }
    });
  };

  return <primitive object={scene} position={position} rotation={rotation} />;
}

function TubeEmitters({
  position = [0, 2.05, -0.2] as [number, number, number],
  length = 2.4,
  bulbs = 5,
}) {
  const group = React.useRef<THREE.Group>(null!);
  const offsets = React.useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < bulbs; i++) {
      const u = i / (bulbs - 1 || 1);
      out.push((u - 0.5) * length);
    }
    return out;
  }, [bulbs, length]);

  const intensityRef = React.useRef(0);
  (TubeEmitters as any).setIntensity = (v: number) => (intensityRef.current = v);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const flicker = 1 + Math.sin(t * 62) * 0.012 + Math.sin(t * 17.3) * 0.016;
    group.current?.children.forEach((c) => {
      const l = c as THREE.PointLight;
      l.intensity = intensityRef.current * flicker;
    });
  });

  return (
    <group ref={group} position={position}>
      {offsets.map((x, i) => (
        <pointLight
          key={i}
          position={[x, 0, 0]}
          color={'#fff7e6'}
          distance={6}
          decay={2}
          intensity={0}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />
      ))}
      <hemisphereLight intensity={0.15} groundColor={'#0a0a0a'} color={'#ffffff'} />
    </group>
  );
}

// =================== WARDROBE SHELL (procedural, no OBJ) ===================
function WardrobeShell() {
  const wood = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b2623', roughness: 0.75, metalness: 0.06 }),
    []
  );
  const floor = React.useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#1a1b1e',
        roughness: 0.4,
        metalness: 0.1,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
      }),
    []
  );
  const wall = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#101114', roughness: 0.9, metalness: 0.02 }),
    []
  );
  const ledStrip = React.useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fff2d8',
        emissive: new THREE.Color('#fff2d8'),
        emissiveIntensity: 0.0,
        roughness: 0.7,
      }),
    []
  );
  (WardrobeShell as any).setLED = (v: number) => { ledStrip.emissiveIntensity = v; };

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 1.5, -2.2]} receiveShadow>
        <planeGeometry args={[10, 3]} />
        <primitive object={wall} attach="material" />
      </mesh>

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <primitive object={floor} attach="material" />
      </mesh>

      {/* Three bays */}
      {[-2.2, 0, 2.2].map((x, i) => (
        <group key={i} position={[x, 1.15, -1.2]}>
          {/* Shelves */}
          {[0.85, 0.05, -0.75].map((y, j) => (
            <mesh key={j} castShadow receiveShadow position={[0, y, 0]}>
              <boxGeometry args={[2.2, 0.12, 0.9]} />
              <primitive object={wood} attach="material" />
            </mesh>
          ))}
          {/* LED strip under top shelf */}
          <mesh position={[0, 0.78, 0.43]}>
            <boxGeometry args={[2.0, 0.02, 0.06]} />
            <primitive object={ledStrip} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// =================== CIRCULAR RAIL + HANGING CARDS ===================
function CircularRail({
  radius = 1.7,
  count = 10,
  progress = 0,
}: {
  radius?: number;
  count?: number;
  progress: number;
}) {
  const railMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#8f9399', roughness: 0.35, metalness: 0.85 }),
    []
  );
  const cardMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ced3d9', roughness: 0.7, metalness: 0.08 }),
    []
  );
  const group = React.useRef<THREE.Group>(null);

  useFrame((state) => {
    // slight idle rotation; plus a bit more as progress increases
    const t = state.clock.getElapsedTime();
    if (group.current) group.current.rotation.y = t * 0.12 + progress * 0.6;
  });

  const appear = easeInOut(clamp01((progress - 0.35) / 0.25)); // start appearing later

  return (
    <group position={[0, 1.05, -1.15]} scale={0.9 + 0.1 * appear} visible={appear > 0.01}>
      {/* ring/rail */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[radius, 0.03, 16, 64]} />
        <primitive object={railMat} attach="material" />
      </mesh>

      {/* hanging cards (placeholders for clothes) */}
      <group ref={group} position={[0, 0, 0]}>
        {Array.from({ length: count }).map((_, i) => {
          const theta = (i / count) * Math.PI * 2;
          const x = Math.cos(theta) * radius;
          const z = Math.sin(theta) * radius;
          const y = -0.4;
          return (
            <group key={i} position={[x, 0, z]} rotation={[0, -theta + Math.PI / 2, 0]}>
              {/* string */}
              <mesh position={[0, -0.2 * appear, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.4 * appear, 8]} />
                <meshStandardMaterial color="#666" roughness={0.8} />
              </mesh>
              {/* card */}
              <mesh position={[0, y * appear, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.7, 0.06]} />
                <primitive object={cardMat} attach="material" />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

// =================== ORCHESTRATOR (driven by page scroll) ===================
function Orchestrator({ progress }: { progress: number }) {
  const shellRef = React.useRef<THREE.Group>(null);

  // timings
  const assemble = easeInOut(clamp01((progress - 0.02) / 0.25)); // shelves/walls
  const lightOn = clamp01((progress - 0.18) / 0.18);              // tubelight power
  const ledsOn = clamp01((progress - 0.26) / 0.18);               // LED strips

  useFrame(() => {
    if (shellRef.current) {
      shellRef.current.scale.setScalar(0.94 + 0.06 * assemble);
      shellRef.current.position.y = (1 - assemble) * 0.15;
      shellRef.current.traverse((o: any) => {
        if (o.material && 'opacity' in o.material) {
          o.material.transparent = true;
          o.material.opacity = 0.55 + 0.45 * assemble;
        }
      });
    }

    // light ramp + startup flicker
    const kick = lightOn > 0 && lightOn < 0.2 ? Math.random() * 0.6 : 0;
    (TubeEmitters as any).setIntensity(lightOn * 1.6 + kick);
    (TubeLightModel as any).setEmissive(lightOn * 1.4 + kick * 0.6);
    (WardrobeShell as any).setLED(ledsOn * 1.2);
  });

  return (
    <group>
      <group ref={shellRef}>
        <WardrobeShell />
      </group>
      <TubeLightModel />
      <TubeEmitters />
      <CircularRail progress={progress} />
    </group>
  );
}

// =================== SCENE WRAPPER ===================
export default function TubeLightScene() {
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const progress = useSectionProgress(sectionRef); // <-- page scroll progress

  return (
    <section ref={sectionRef} className="w-full bg-black text-white">
      <div className="relative w-full h-[75vh] min-h-[520px]">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 1.6, 3.2], fov: 40 }}
          onCreated={({ gl }) => {
            gl.setClearColor('#000000', 1);
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
          }}
        >
          <Orchestrator progress={progress} />

          <Environment preset="city" />
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={10} blur={2.2} far={3.2} />

          <EffectComposer>
            <Bloom intensity={0.8} luminanceThreshold={0.72} luminanceSmoothing={0.25} />
            <Vignette eskil={false} offset={0.22} darkness={0.85} />
          </EffectComposer>
        </Canvas>

        <div className="absolute inset-x-0 bottom-4 text-center text-sm text-white/60">
          Scroll to build the wardrobe
        </div>
      </div>
    </section>
  );
}

// Preload the lamp model
useGLTF.preload('/models/tubelight.glb');

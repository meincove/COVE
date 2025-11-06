'use client';

import * as React from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

/* ───────────────── CONFIG ───────────────── */

const CAMERA_POS: [number, number, number] = [0, 2.8, 8.2]; // farther & higher => tubes visible on load

const STAGE = {
  size: new THREE.Vector3(10.0, 1.0, 7.5),  // width, height, depth
  pos:  new THREE.Vector3(0, 0.5, 0.9),
};

const LIGHT_TINT = '#ffffff';     // pure white
const FLOOR_COLOR = '#0e0f10';

/** Bars on three edges: back (along X), left & right (along Z) */
const TUBE = {
  y: STAGE.pos.y + STAGE.size.y / 2 + 1.6, // just above platform
  back: {
    axis: 'x' as const,
    x: 0,
    z: STAGE.pos.z - STAGE.size.z / 2 + 0.15,
    length: STAGE.size.x * 0.78,
  },
  left: {
    axis: 'z' as const,
    x: -STAGE.size.x / 2 + 0.15,
    z: STAGE.pos.z,
    length: STAGE.size.z * 0.78,
  },
  right: {
    axis: 'z' as const,
    x:  STAGE.size.x / 2 - 0.15,
    z: STAGE.pos.z,
    length: STAGE.size.z * 0.78,
  },
};

const BELT = {
  a: STAGE.size.x * 0.33,                            // ellipse X radius
  b: STAGE.size.z * 0.36,                            // ellipse Z radius
  zOffset: STAGE.pos.z - STAGE.size.z * 0.12,        // front pass over front half
  y: STAGE.pos.y + STAGE.size.y / 2 + 0.58,          // between tubes & platform
  count: 8,
  baseSpeed: 0.45,
  lingerStrength: 0.65,
};

/* ───────────────── HELPERS ───────────────── */

function stageWeightAt(p: THREE.Vector3) {
  // bias hot-zone to front half
  const cx = STAGE.pos.x;
  const cz = STAGE.pos.z - STAGE.size.z * 0.25;
  const dx = (p.x - cx) / (STAGE.size.x * 0.45);
  const dz = (p.z - cz) / (STAGE.size.z * 0.28);
  const d2 = dx * dx + dz * dz;
  return Math.exp(-d2 * 3.2);
}

/* ───────────────── LIGHT BAR ───────────────── */

type Axis = 'x' | 'z';
function TubeLightBar({
  axis = 'x',
  x = 0,
  y,
  z = 0,
  length,
  color = LIGHT_TINT,
  power = 1,
  emitters = 7,
}: {
  axis?: Axis;
  x?: number; y: number; z?: number; length: number; color?: string; power?: number; emitters?: number;
}) {
  const groupRef = React.useRef<THREE.Group>(null!);

  const mat = React.useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#111111',
        emissive: new THREE.Color(color),
        emissiveIntensity: 12 * power,
        roughness: 0.35,
        metalness: 0.15,
      }),
    [color, power]
  );

  // pointlights spaced along the bar
  const offsets = React.useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < emitters; i++) {
      const u = emitters === 1 ? 0 : i / (emitters - 1);
      arr.push((u - 0.5) * length);
    }
    return arr;
  }, [emitters, length]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker = 1 + Math.sin(t * 63.0) * 0.012 + Math.sin(t * 17.3) * 0.018;
    (mat.emissiveIntensity as number) = THREE.MathUtils.lerp(mat.emissiveIntensity, 12 * power * flicker, 0.2);

    groupRef.current?.children.forEach((c) => {
      const pl = c as THREE.PointLight;
      pl.intensity = 2.2 * power * flicker; // throw light, no shadows
    });
  });

  // cylinder default axis = Y; rotate so it lies along X or Z
  const rot: [number, number, number] =
    axis === 'x'
      ? [0, 0, Math.PI / 2] // along X
      : [Math.PI / 2, 0, 0]; // along Z

  return (
    <group position={[x, y, z]} rotation={rot}>
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, length, 32]} />
        <primitive attach="material" object={mat} />
      </mesh>

      <group ref={groupRef}>
        {offsets.map((off, i) => (
          <pointLight
            key={i}
            position={[0, off, 0]}  // local Y is along the bar
            color={color}
            intensity={0}
            distance={7}
            decay={2}
            // no castShadow (prevents MAX_TEXTURE_IMAGE_UNITS overflow)
          />
        ))}
      </group>
    </group>
  );
}

/* ───────────────── STAGE ───────────────── */

function Stage() {
  const stageMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b2c31', metalness: 0.2, roughness: 0.55 }),
    []
  );
  return (
    <mesh position={STAGE.pos.toArray()} castShadow receiveShadow>
      <boxGeometry args={STAGE.size.toArray()} />
      <primitive attach="material" object={stageMat} />
    </mesh>
  );
}

/* ───────────────── BOARD / BELT ───────────────── */

type BoardProps = { index: number; count: number };

function Board({ index, count }: BoardProps) {
  const ref = React.useRef<THREE.Mesh>(null!);
  const { camera, clock } = useThree();

  const phaseRef = React.useRef((index / count) * Math.PI * 2);

  const mat = React.useMemo<THREE.MeshPhysicalMaterial>(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d3d6dd',
        metalness: 0.12,
        roughness: 0.66,
        envMapIntensity: 0.5,
        emissive: new THREE.Color(LIGHT_TINT),
        emissiveIntensity: 0,
        clearcoat: 0.4,
        clearcoatRoughness: 0.3,
      }),
    []
  );

  useFrame(() => {
    const phi = phaseRef.current;

    // linger near front
    const frontBlend = Math.exp(-Math.pow((phi - Math.PI / 2) / 0.6, 2));
    const speed = BELT.baseSpeed * (1 - BELT.lingerStrength * frontBlend);
    phaseRef.current = (phaseRef.current + speed * (1 / 60)) % (Math.PI * 2);

    const x = Math.cos(phi) * BELT.a + STAGE.pos.x;
    const z = Math.sin(phi) * BELT.b + BELT.zOffset;
    const y = BELT.y;

    ref.current.position.set(x, y, z);
    ref.current.lookAt(STAGE.pos.x, y, STAGE.pos.z);

    const wStage = stageWeightAt(ref.current.position);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(ref.current.quaternion);
    const toCam = new THREE.Vector3().subVectors(camera.position, ref.current.position).normalize();
    const facing = THREE.MathUtils.clamp(forward.dot(toCam), 0, 1);
    const w = THREE.MathUtils.clamp(0.6 * wStage + 0.4 * facing * wStage, 0, 1);

    const targetEmissive = 0.9 * w;
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.15);
    mat.envMapIntensity = THREE.MathUtils.lerp(mat.envMapIntensity, 0.5 + 0.8 * w, 0.15);
    mat.roughness = THREE.MathUtils.lerp(mat.roughness, 0.56 - 0.25 * w, 0.15);

    const s = 1.0 + 0.05 * w;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
    ref.current.position.y = y + 0.02 * w;
  });

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={[0.55, 0.75, 0.08]} />
      <primitive attach="material" object={mat} />
    </mesh>
  );
}

function Belt() {
  return (
    <group>
      {Array.from({ length: BELT.count }).map((_, i) => (
        <Board key={i} index={i} count={BELT.count} />
      ))}
    </group>
  );
}

/* ───────────────── SCENE ───────────────── */

export default function Tester() {
  const controlsRef = React.useRef<any>(null);

  return (
    <section className="relative h-[100svh] w-screen overflow-hidden bg-black">
      <div className="absolute inset-0">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: CAMERA_POS, fov: 40 }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor('#000000', 1);
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.18;
            scene.fog = new THREE.FogExp2(0x0a0a0a, 0.10);
          }}
        >
          {/* target the stage center so framing is consistent */}
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.12}
            target={[STAGE.pos.x, STAGE.pos.y + STAGE.size.y / 2, STAGE.pos.z]}
          />

          <ambientLight intensity={0.25} />
          <directionalLight position={[3, 6, 3]} intensity={0.55} />

          {/* Floor & backdrop */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, STAGE.pos.z]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9} />
          </mesh>
          <mesh position={[0, 5, -22]} receiveShadow>
            <planeGeometry args={[80, 36]} />
            <meshStandardMaterial color="#050506" roughness={1} />
          </mesh>

          {/* Platform */}
          <Stage />

          {/* Three edge tubelights */}
          <TubeLightBar axis="x" x={TUBE.back.x}  y={TUBE.y} z={TUBE.back.z}  length={TUBE.back.length} />
          <TubeLightBar axis="z" x={TUBE.left.x}  y={TUBE.y} z={TUBE.left.z}  length={TUBE.left.length} />
          <TubeLightBar axis="z" x={TUBE.right.x} y={TUBE.y} z={TUBE.right.z} length={TUBE.right.length} />

          {/* Single shadow-casting key for grounding */}
          <spotLight
            color={LIGHT_TINT}
            position={[0, TUBE.y + 0.8, TUBE.back.z + 0.6]} // above & a touch toward camera
            angle={0.95}
            penumbra={0.95}
            intensity={4.2}
            distance={20}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0003}
          />

          {/* Carousel */}
          <Belt />

          <ContactShadows
            position={[0, 0, STAGE.pos.z]}
            opacity={0.45}
            scale={22}
            blur={2.6}
            far={3.2}
            resolution={1024}
          />
          <Environment preset="warehouse" />

          <EffectComposer>
            <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.34} luminanceSmoothing={0.25} />
            <Vignette eskil={false} offset={0.22} darkness={0.7} />
          </EffectComposer>
        </Canvas>
      </div>
    </section>
  );
}



// 'use client';

// import * as React from 'react';
// import * as THREE from 'three';
// import { Canvas, useFrame, useThree } from '@react-three/fiber';
// import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
// import { EffectComposer, Bloom, Vignette, GodRays } from '@react-three/postprocessing';

// /* ------------------------- TUNING / KNOBS ------------------------- */
// const CAMERA_POS: [number, number, number] = [0, 1.8, 5.0];

// const STAGE = {
//   size: new THREE.Vector3(4.6, 0.96, 2.2),
//   pos: new THREE.Vector3(0, 0.48, 0),
// };

// const LIGHT_TINT = '#c3a4ff';      // tubelight color
// const FLOOR_COLOR = '#0e0f10';

// const BELT = {
//   a: 1.85,          // ellipse X radius
//   b: 2.2,           // ellipse Z radius (deeper ellipse = more “from back”)
//   zOffset: -0.2,    // shift ellipse toward/away camera
//   count: 8,
//   baseSpeed: 0.45,  // rad/s
//   lingerStrength: 0.65, // how much they slow at the front window
// };

// const MODAL = {
//   showThreshold: 0.72,  // weight above which we show modal
//   cooldown: 2.8 * 1000, // ms between modal shows
//   autoClose: 2.2 * 1000 // ms to auto-close if idle
// };

// /* ---------------------- UTIL: STAGE WEIGHT ------------------------ */
// /** elliptical falloff (0..1) over the platform top */
// function stageWeightAt(p: THREE.Vector3) {
//   const dx = (p.x - STAGE.pos.x) / (STAGE.size.x * 0.45);
//   const dz = (p.z - STAGE.pos.z) / (STAGE.size.z * 0.35);
//   const d2 = dx * dx + dz * dz;           // elliptical distance
//   const w = Math.exp(-d2 * 3.2);          // tighter center
//   return THREE.MathUtils.clamp(w, 0, 1);
// }

// /* --------------------------- LIGHT BAR ---------------------------- */
// function TubeLightBar({
//   x = 0,
//   y = 3.25,
//   z = -0.2,           // keep near platform so it’s visible in frame
//   length = 2.6,
//   color = LIGHT_TINT,
//   power = 1.0,
//   emitters = 9,
// }: {
//   x?: number; y?: number; z?: number; length?: number; color?: string; power?: number; emitters?: number;
// }) {
//   const tubeRef = React.useRef<THREE.Mesh>(null!);
//   const groupRef = React.useRef<THREE.Group>(null!);

//   const mat = React.useMemo(
//     () =>
//       new THREE.MeshStandardMaterial({
//         color: new THREE.Color('#111'),
//         emissive: new THREE.Color(color),
//         emissiveIntensity: 12 * power, // visible bar glow
//         roughness: 0.35,
//         metalness: 0.15,
//       }),
//     [color, power]
//   );

//   const offsets = React.useMemo(() => {
//     const arr: number[] = [];
//     for (let i = 0; i < emitters; i++) {
//       const u = emitters === 1 ? 0 : i / (emitters - 1);
//       arr.push((u - 0.5) * length);
//     }
//     return arr;
//   }, [emitters, length]);

//   useFrame(({ clock }) => {
//     const t = clock.getElapsedTime();
//     const flicker = 1 + Math.sin(t * 63.0) * 0.012 + Math.sin(t * 17.3) * 0.018;
//     (mat.emissiveIntensity as number) = THREE.MathUtils.lerp(mat.emissiveIntensity, 12 * power * flicker, 0.2);
//     if (groupRef.current) {
//       groupRef.current.children.forEach((c) => {
//         const pl = c as THREE.PointLight;
//         pl.intensity = 2.2 * power * flicker;
//       });
//     }
//   });

//   return (
//     <group position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
//       {/* Emissive cylinder (rotated to lie horizontally along X) */}
//       <mesh ref={tubeRef}>
//         <cylinderGeometry args={[0.03, 0.03, length, 32]} />
//         <primitive attach="material" object={mat} />
//       </mesh>

//       {/* Emitters line along cylinder height (local Y) */}
//       <group ref={groupRef}>
//         {offsets.map((off, i) => (
//           <pointLight
//             key={i}
//             position={[0, off, 0]}
//             color={color}
//             intensity={0}
//             distance={6.5}
//             decay={2}
//             // castShadow
//           />
//         ))}
//       </group>
//     </group>
//   );
// }

// /* ----------------------------- STAGE ------------------------------ */
// function Stage() {
//   const stageMat = React.useMemo(
//     () => new THREE.MeshStandardMaterial({ color: '#2b2c31', metalness: 0.2, roughness: 0.55 }),
//     []
//   );
//   return (
//     <group>
//       {/* platform block */}
//       <mesh position={STAGE.pos.toArray()} castShadow receiveShadow>
//         <boxGeometry args={STAGE.size.toArray()} />
//         <primitive attach="material" object={stageMat} />
//       </mesh>
//     </group>
//   );
// }

// /* ------------------------- BOARD (CLOTH CARD) --------------------- */
// type BoardProps = { index: number; count: number; onFrontHot?: (i: number) => void };

// function Board({ index, count, onFrontHot }: BoardProps) {
//   const ref = React.useRef<THREE.Mesh>(null!);
//   const { camera, clock } = useThree();

//   // keep each board’s own phase so linger feels local
//   const phaseRef = React.useRef((index / count) * Math.PI * 2);

//   const mat = React.useMemo(
//     () =>
//       new THREE.MeshPhysicalMaterial({
//         color: '#d3d6dd',
//         metalness: 0.12,
//         roughness: 0.66,
//         envMapIntensity: 0.5,
//         emissive: new THREE.Color(LIGHT_TINT),
//         emissiveIntensity: 0.0,
//         clearcoat: 0.4,
//         clearcoatRoughness: 0.3,
//       }),
//     []
//   );

//   // cooldown so we don’t spam modal
//   const lastFireRef = React.useRef(0);

//   useFrame(() => {
//     const t = clock.getElapsedTime();
//     // ellipse param
//     const phi = phaseRef.current;

//     // front window is approximately phi ≈ +π/2 (z maximum)
//     const frontBlend = Math.exp(-Math.pow((phi - Math.PI / 2) / 0.6, 2)); // 0..1 bell near front

//     // slow down when near front → linger
//     const speed = BELT.baseSpeed * (1 - BELT.lingerStrength * frontBlend);
//     phaseRef.current = (phaseRef.current + speed * (1 / 60)) % (Math.PI * 2);

//     // ellipse position (centered around stage)
//     const x = Math.cos(phi) * BELT.a;
//     const z = Math.sin(phi) * BELT.b + BELT.zOffset;
//     const y = 1.05;

//     ref.current.position.set(x, y, z);
//     ref.current.lookAt(STAGE.pos.x, y, STAGE.pos.z);

//     // stage weight + facing weight
//     const wStage = stageWeightAt(ref.current.position);
//     const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(ref.current.quaternion);
//     const toCam = new THREE.Vector3().subVectors(camera.position, ref.current.position).normalize();
//     const facing = THREE.MathUtils.clamp(forward.dot(toCam), 0, 1);
//     const w = THREE.MathUtils.clamp(0.6 * wStage + 0.4 * facing * wStage, 0, 1);

//     // visual priority (no neon)
//     const targetEmissive = 0.9 * w; // feeds bloom
//     mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.15);
    
//     mat.envMapIntensity = THREE.MathUtils.lerp(mat.envMapIntensity ?? 0.5, 0.5 + 0.8 * w, 0.15);
//     mat.roughness = THREE.MathUtils.lerp(mat.roughness, 0.56 - 0.25 * w, 0.15);

//     const s = 1.0 + 0.05 * w;
//     ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
//     ref.current.position.y = y + 0.02 * w;

//     // modal trigger
//     if (w > MODAL.showThreshold) {
//       const now = performance.now();
//       if (now - lastFireRef.current > MODAL.cooldown) {
//         lastFireRef.current = now;
//         onFrontHot?.(index);
//       }
//     }
//   });

//   return (
//     <mesh ref={ref} castShadow receiveShadow>
//       <boxGeometry args={[0.55, 0.75, 0.08]} />
//       <primitive attach="material" object={mat} />
//     </mesh>
//   );
// }

// function Belt({
//   onFrontHot,
// }: {
//   onFrontHot: (i: number) => void;
// }) {
//   return (
//     <group>
//       {Array.from({ length: BELT.count }).map((_, i) => (
//         <Board key={i} index={i} count={BELT.count} onFrontHot={onFrontHot} />
//       ))}
//     </group>
//   );
// }

// /* ----------------------------- MODAL UI --------------------------- */
// function FloatingModal({
//   index,
//   onClose,
// }: {
//   index: number;
//   onClose: () => void;
// }) {
//   React.useEffect(() => {
//     const t = setTimeout(onClose, MODAL.autoClose);
//     return () => clearTimeout(t);
//   }, [onClose]);

//   return (
//     <div
//       className="pointer-events-auto absolute left-1/2 top-[18%] -translate-x-1/2 rounded-2xl bg-black/70 text-white border border-white/15 shadow-xl px-4 py-3"
//       style={{ backdropFilter: 'blur(8px)' }}
//     >
//       <div className="text-xs opacity-70">Look #{index + 1}</div>
//       <div className="text-sm font-semibold">Cove Essentials Tee</div>
//       <div className="text-xs opacity-80">Size: S–XL • Colors: Ash, Black, Moss</div>
//       <div className="mt-2 flex gap-2">
//         <button
//           className="rounded-full bg-white text-black text-xs px-3 py-1"
//           onClick={onClose}
//         >
//           View
//         </button>
//         <button
//           className="rounded-full bg-white/10 text-white text-xs px-3 py-1 border border-white/20"
//           onClick={onClose}
//         >
//           Dismiss
//         </button>
//       </div>
//     </div>
//   );
// }

// /* ------------------------------- SCENE ---------------------------- */
// export default function Tester() {
//   const sunRef = React.useRef<THREE.Mesh>(null!);
//   const [modalIndex, setModalIndex] = React.useState<number | null>(null);

//   return (
//     <section className="relative h-[100svh] w-screen overflow-hidden bg-black">
//       {/* floating UI (modal) */}
//       {modalIndex !== null && (
//         <FloatingModal index={modalIndex} onClose={() => setModalIndex(null)} />
//       )}

//       <div className="absolute inset-0">
//         <Canvas
//           shadows
//           dpr={[1, 1.75]}
//           camera={{ position: CAMERA_POS, fov: 40 }}
//           onCreated={({ gl, scene }) => {
//             gl.setClearColor('#000000', 1);
//             gl.outputColorSpace = THREE.SRGBColorSpace;
//             gl.toneMapping = THREE.ACESFilmicToneMapping;
//             gl.toneMappingExposure = 1.25;
//             scene.fog = new THREE.FogExp2(0x090b09, 0.10);
//           }}
//         >
//           {/* base lighting */}
//           <ambientLight intensity={0.25} />
//           <directionalLight position={[3, 6, 3]} intensity={0.55} />

//           {/* GodRays sun near center tube */}
//           <mesh ref={sunRef} position={[0, 3.25, -0.2]} visible={false}>
//             <sphereGeometry args={[0.25, 16, 16]} />
//             <meshBasicMaterial />
//           </mesh>

//           {/* Ground & far backdrop */}
//           <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
//             <planeGeometry args={[40, 40]} />
//             <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9} />
//           </mesh>
//           <mesh position={[0, 4, -20]} receiveShadow>
//             <planeGeometry args={[60, 30]} />
//             <meshStandardMaterial color="#050506" roughness={1} />
//           </mesh>

//           {/* Platform */}
//           <Stage />

//           {/* THREE visible tubelights above the platform */}
//           <TubeLightBar x={-1.6} />
//           <TubeLightBar x={0} />
//           <TubeLightBar x={1.6} />

//           {/* Single shadow-casting key light */}
// <spotLight
//   color={LIGHT_TINT}
//   position={[0, 4.0, 0.4]}
//   angle={0.8}
//   penumbra={0.95}
//   intensity={4.2}
//   distance={14}
//   castShadow
//   shadow-mapSize-width={1024}
//   shadow-mapSize-height={1024}
//   shadow-bias={-0.0003}
// />

//           {/* Belt of boards with front hot-zone callback */}
//           <Belt onFrontHot={(i) => setModalIndex(i)} />

//           {/* Grounding */}
//           <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={12} blur={2.6} far={3.2} resolution={1024} />
//           <Environment preset="warehouse" />

//           {/* Post FX */}
//           <EffectComposer>
//             <GodRays sun={sunRef} decay={0.95} exposure={0.7} weight={0.9} density={0.92} samples={80} />
//             <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.34} luminanceSmoothing={0.25} />
//             <Vignette eskil={false} offset={0.22} darkness={0.7} />
//           </EffectComposer>

//           {/* DEBUG: free camera to inspect */}
//           <OrbitControls enableDamping dampingFactor={0.12} />
//         </Canvas>
//       </div>
//     </section>
//   );
// }

// 'use client';

// import { useMemo, useRef, useEffect } from 'react';
// import * as THREE from 'three';
// import { Canvas, useFrame } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
// import vertexShader from './basicVertex';
// import fragmentShader from './basicFragment';

// const FBOParticles = () => {
//   const size = 64;
//   const pointsRef = useRef<THREE.Points>(null);

//   const positions = useMemo(() => {
//     const data = new Float32Array(size * size * 3);
//     for (let i = 0; i < size * size; i++) {
//       const i3 = i * 3;
//       const r = Math.cbrt(Math.random());
//       const theta = Math.random() * 2 * Math.PI;
//       const phi = Math.acos(2 * Math.random() - 1);

//       data[i3 + 0] = r * Math.sin(phi) * Math.cos(theta);
//       data[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
//       data[i3 + 2] = r * Math.cos(phi);
//     }
//     return data;
//   }, [size]);

//   return (
//     <points ref={pointsRef}>
//       <bufferGeometry>
//         <bufferAttribute
//           attach="attributes-position"
//           args={[positions, 3]}
//           count={size * size}
//         />
//       </bufferGeometry>
//       <shaderMaterial
//         vertexShader={vertexShader}
//         fragmentShader={fragmentShader}
//         blending={THREE.AdditiveBlending}
//         depthWrite={false}
//         transparent
//       />
//     </points>
//   );
// };

// export default function CoveParticleSphere() {
//   return (
//     <div className="w-[80vw] h-[80vh] bg-gray-400 rounded-xl overflow-hidden">
//       {/* <Canvas camera={{ position: [0, 0, 2], fov: 75 }}>
//         <FBOParticles />
//         <OrbitControls />
//       </Canvas> */}
//       <Canvas camera={{ position: [0, 0, 2], fov: 75 }}>
//   <mesh>
//     <boxGeometry />
//     <meshBasicMaterial color="hotpink" />
//   </mesh>
// </Canvas>

//     </div>
//   );
// }


'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import vertexShader from './basicVertex';
import fragmentShader from './basicFragment';
import SimulationMaterial, { SimulationHandle } from './SimulationMaterial';


const ParticleSphere = () => {
  const size = 64;
  const count = size * size;

  const pointsRef = useRef<THREE.Points>(null);
  const simulationRef = useRef<SimulationHandle>(null);

  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      data[i3 + 0] = 0;
      data[i3 + 1] = 0;
      data[i3 + 2] = 0;
    }
    return data;
  }, [count]);

  const uvs = useMemo(() => {
    const data = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      data[i * 2 + 0] = (i % size) / size;
      data[i * 2 + 1] = Math.floor(i / size) / size;
    }
    return data;
  }, [count, size]);

  useFrame(() => {
    const mat = pointsRef.current?.material as THREE.ShaderMaterial;
    if (simulationRef.current) {
      const tex = simulationRef.current.getCurrentTexture();
      if (mat?.uniforms?.uPositions) {
        mat.uniforms.uPositions.value = tex;
      }
    }
  });

  return (
    <>
      <SimulationMaterial ref={simulationRef} size={size} />

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-uv"
            args={[uvs, 2]}
            count={count}
          />
        </bufferGeometry>
        <shaderMaterial
          uniforms={{
            uPositions: { value: null },
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
};


export default function CoveParticleSphere() {
  return (
    <div className="w-[80vw] h-[80vh] bg-black rounded-xl overflow-hidden">
      <Canvas 
      camera={{ position: [0, 0, 2], fov: 75 }}>
        <ParticleSphere />
        <OrbitControls />
      </Canvas>
    </div>
  );
}




// 'use client'

// import { useRef, useEffect, useMemo } from 'react'
// import { Canvas, useFrame } from '@react-three/fiber'
// import { OrbitControls } from '@react-three/drei'
// import * as THREE from 'three'
// import SimulationMaterial from './SimulationMaterial'

// function DebugCube() {
//   const ref = useRef<THREE.Mesh>(null)

//   useFrame(() => {
//     if (ref.current) {
//       ref.current.rotation.y += 0.01
//       console.log('🌀 Cube frame running')
//     }
//   })

//   return (
//     <mesh ref={ref}>
//       <boxGeometry args={[1, 1, 1]} />
//       <meshNormalMaterial />
//     </mesh>
//   )
// }

// function DebugSimulation() {
//   useFrame(() => {
//     console.log('🧠 Simulation frame running')
//   })

//   return null
// }

// export default function CoveParticleSphere() {
//   return (
//     <div className="w-[80vw] h-[80vh] bg-gray-400 rounded-xl overflow-hidden">
//       <Canvas camera={{ position: [0, 0, 2], fov: 75 }}>
//         {/* 🔁 Inject the SimulationMaterial directly for debugging */}
//         <SimulationMaterial size={64} />

//         {/* 💡 Keep this here for orientation */}
//         <OrbitControls />
//       </Canvas>
//     </div>
//   );
// }


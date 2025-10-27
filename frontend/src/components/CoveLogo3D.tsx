

'use client'

import { Canvas } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'

function LogoModel() {
  const { scene } = useGLTF('/models/cove-logo.glb')

  // Material for realistic glowing store signboard
  const logoMaterial = new THREE.MeshStandardMaterial({
    color: '#aad0e8', 
    emissive: new THREE.Color('#aad0e8'), 
    emissiveIntensity: 2.5, // Strong visible glow
    metalness: 0.3,
    roughness: 0.4,
  })

  // Apply to all meshes
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      mesh.material = logoMaterial
      mesh.castShadow = true
      mesh.receiveShadow = false
    }
  })

  return (
    <primitive
      object={scene}
      position={[0, 1.12, 0.3]}  // slightly up and forward
      rotation={[0.14, 0.13, 0]}   // small Z-axis tilt
      scale={0.7}
    />
  )
}

export default function CoveLogo3D() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 4], fov: 45 }}
      style={{
        background: 'transparent',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -10,
        width: '100%',
        height: '100%',
      }}
    >
      {/* Glow and soft shadows */}
      <ambientLight intensity={0.5} />

      {/* Simulated backlight halo */}
      <pointLight
        position={[0, 0, 0]} // behind the logo
        intensity={6}
        distance={6}
        decay={2}
        color={'#ffffff'}
      />

      {/* Drop shadow-like light */}
      <spotLight
        position={[0, 5, 5]}
        angle={0.25}
        penumbra={0.8}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Suspense fallback={null}>
        <LogoModel />
      </Suspense>
    </Canvas>
  )
}

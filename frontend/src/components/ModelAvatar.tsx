

'use client'

import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

// ✅ Component that loads and controls the model
function FemaleModel() {
  const modelRef = useRef<THREE.Group>(null)

  const gltf = useLoader(
    GLTFLoader,
    '/models/female-3d-model.glb',
    (loader) => {
      loader.manager.onError = (url) => {
        console.error(`🚨 Failed to load model at ${url}`)
      }
    }
  )

  useFrame(() => {
    if (modelRef.current) {
      // modelRef.current.rotation.y += 0.002
    }
  })

  return (
    <primitive
  ref={modelRef}
  object={gltf.scene}
  scale={[0.023, 0.023, 0.023]}       // Make model larger
  position={[0, -1.84, 0]}          // Raise model vertically
  rotation={[0.05, 0, 0]}       // Face forward
/>


  )
}

// ✅ Outer wrapper for canvas + lighting
export default function ModelAvatar() {
  return (
    <Canvas camera={{ position: [0, 1.5, 4], fov: 50 }}>
  <ambientLight intensity={0.8} />
  <directionalLight position={[2, 2, 2]} intensity={1.2} />
  <Suspense fallback={null}>
    <FemaleModel />
  </Suspense>
  <OrbitControls
  enableZoom={false}
  enablePan={false}
  autoRotate={false}             // ❌ disables auto-rotation
  rotateSpeed={1}                // ✅ feels natural on drag
  minPolarAngle={Math.PI / 2}    // lock vertical rotation
  maxPolarAngle={Math.PI / 2}
/>

</Canvas>

  )
}

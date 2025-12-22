"use client"

import * as THREE from "three"
import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { EffectComposer, Bloom } from "@react-three/postprocessing"

// Working wave particle system
function WaveParticles() {
    const pointsRef = useRef<THREE.Points>(null)
    const count = 128 * 128 // 16,384 particles in a grid

    const [geometry, initialPositions] = useMemo(() => {
        const geo = new THREE.BufferGeometry()
        const positions = new Float32Array(count * 3)
        const initialPos = new Float32Array(count * 3)

        let i = 0
        for (let y = 0; y < 128; y++) {
            for (let x = 0; x < 128; x++) {
                const px = (x / 127 - 0.5) * 8
                const py = (y / 127 - 0.5) * 8
                const pz = Math.sin(px * 0.5) * 0.3 + Math.sin(py * 0.5) * 0.3

                positions[i] = px
                positions[i + 1] = py
                positions[i + 2] = pz

                initialPos[i] = px
                initialPos[i + 1] = py
                initialPos[i + 2] = pz

                i += 3
            }
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        return [geo, initialPos]
    }, [])

    useFrame(({ clock }) => {
        if (!pointsRef.current) return

        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
        const time = clock.elapsedTime

        let i = 0
        for (let y = 0; y < 128; y++) {
            for (let x = 0; x < 128; x++) {
                const px = initialPositions[i]
                const py = initialPositions[i + 1]

                // Create flowing wave pattern
                const wave1 = Math.sin(px * 0.5 + time * 0.5) * 0.4
                const wave2 = Math.sin(py * 0.5 + time * 0.3) * 0.3
                const wave3 = Math.sin((px + py) * 0.3 + time * 0.4) * 0.2

                positions[i + 2] = wave1 + wave2 + wave3

                i += 3
            }
        }

        pointsRef.current.geometry.attributes.position.needsUpdate = true

        // Gentle rotation
        pointsRef.current.rotation.y = time * 0.05
        pointsRef.current.rotation.x = Math.sin(time * 0.1) * 0.1
    })

    return (
        <points ref={pointsRef} geometry={geometry}>
            <pointsMaterial
                size={0.04}
                color="#ffffff"
                sizeAttenuation
                transparent
                opacity={0.9}
                blending={THREE.AdditiveBlending}
            />
        </points>
    )
}

export default function WorkingWaveBackground() {
    useEffect(() => {
        console.log('🌊 Working Wave Background mounted')
    }, [])

    return (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {/* Dark gradient background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, #0a1628, #050a14, #020408)'
            }} />

            <Canvas
                style={{ width: '100%', height: '100%' }}
                gl={{ antialias: true, alpha: false }}
                camera={{ position: [0, 0, 6], fov: 60 }}
                onCreated={({ gl }) => {
                    console.log('✅ Canvas created successfully!')
                    console.log('WebGL version:', gl.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1')
                }}
            >
                <color attach="background" args={["#000000"]} />
                <ambientLight intensity={0.4} />
                <WaveParticles />
                <EffectComposer>
                    <Bloom luminanceThreshold={0.1} intensity={1.3} mipmapBlur />
                </EffectComposer>
            </Canvas>
        </div>
    )
}

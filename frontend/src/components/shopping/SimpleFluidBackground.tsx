"use client"

import * as THREE from "three"
import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { EffectComposer, Bloom } from "@react-three/postprocessing"

// Simpler flowing particles without complex GPU simulation
function FlowingParticles() {
    const count = 50000
    const pointsRef = useRef<THREE.Points>(null)

    const [positions, velocities] = useMemo(() => {
        const pos = new Float32Array(count * 3)
        const vel = new Float32Array(count * 3)

        for (let i = 0; i < count; i++) {
            // Start in a sheet-like formation
            pos[i * 3] = (Math.random() - 0.5) * 10
            pos[i * 3 + 1] = (Math.random() - 0.5) * 10
            pos[i * 3 + 2] = (Math.random() - 0.5) * 2

            // Random velocities for flow
            vel[i * 3] = (Math.random() - 0.5) * 0.02
            vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02
            vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01
        }

        return [pos, vel]
    }, [])

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        return geo
    }, [positions])

    // Animate particles
    useFrame(() => {
        if (!pointsRef.current) return

        const posAttr = pointsRef.current.geometry.attributes.position
        const array = posAttr.array as Float32Array

        for (let i = 0; i < count; i++) {
            // Update positions
            array[i * 3] += velocities[i * 3]
            array[i * 3 + 1] += velocities[i * 3 + 1]
            array[i * 3 + 2] += velocities[i * 3 + 2]

            // Wrap around bounds
            if (array[i * 3] > 5) array[i * 3] = -5
            if (array[i * 3] < -5) array[i * 3] = 5
            if (array[i * 3 + 1] > 5) array[i * 3 + 1] = -5
            if (array[i * 3 + 1] < -5) array[i * 3 + 1] = 5
            if (array[i * 3 + 2] > 1) array[i * 3 + 2] = -1
            if (array[i * 3 + 2] < -1) array[i * 3 + 2] = 1
        }

        posAttr.needsUpdate = true

        // Slow rotation
        pointsRef.current.rotation.y += 0.0002
    })

    return (
        <points ref={pointsRef} geometry={geometry}>
            <pointsMaterial
                size={0.03}
                color="#ffffff"
                sizeAttenuation
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
            />
        </points>
    )
}

export default function SimpleFluidBackground() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        console.log('🌊 Simple Fluid Background mounted')
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div style={{
                position: 'absolute',
                inset: 0,
                background: '#000000',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
            }}>
                Loading Animation...
            </div>
        )
    }

    return (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {/* Dark gradient background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, #05070d, #040814, #02040a)'
            }} />

            <Canvas
                style={{ width: '100%', height: '100%' }}
                gl={{ antialias: false, alpha: false }}
                camera={{ position: [0, 0, 5], fov: 75 }}
                onCreated={() => console.log('✅ Canvas created!')}
            >
                <color attach="background" args={["#000000"]} />
                <ambientLight intensity={0.3} />
                <FlowingParticles />
                <EffectComposer>
                    <Bloom luminanceThreshold={0.1} intensity={1.2} mipmapBlur />
                </EffectComposer>
            </Canvas>
        </div>
    )
}

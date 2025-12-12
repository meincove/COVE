"use client"

import * as THREE from "three"
import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useFBO } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"

// Simple test: just show some particles without complex simulation
function SimpleParticles() {
    const count = 10000

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry()
        const positions = new Float32Array(count * 3)

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 10
            positions[i * 3 + 1] = (Math.random() - 0.5) * 10
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        return geo
    }, [])

    return (
        <points geometry={geometry}>
            <pointsMaterial size={0.05} color="#ffffff" sizeAttenuation />
        </points>
    )
}

export default function SimpleParticleTest() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        console.log('✅ Simple particle test mounted')
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
                justifyContent: 'center'
            }}>
                Loading Canvas...
            </div>
        )
    }

    console.log('🎨 Rendering Canvas...')

    return (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000000' }}>
            <Canvas
                style={{ width: '100%', height: '100%' }}
                gl={{ antialias: true, alpha: false }}
                camera={{ position: [0, 0, 5], fov: 75 }}
                onCreated={() => console.log('🎯 Canvas created successfully!')}
            >
                <color attach="background" args={["#0a0a0a"]} />
                <ambientLight intensity={0.5} />
                <SimpleParticles />
                <EffectComposer>
                    <Bloom luminanceThreshold={0.1} intensity={1.5} mipmapBlur />
                </EffectComposer>
            </Canvas>

            <div style={{
                position: 'absolute',
                top: 20,
                left: 20,
                color: 'white',
                background: 'rgba(0,0,0,0.7)',
                padding: '10px',
                borderRadius: '5px',
                fontFamily: 'monospace'
            }}>
                Simple Particle Test<br />
                10,000 white particles<br />
                If you see stars, Canvas works!
            </div>
        </div>
    )
}

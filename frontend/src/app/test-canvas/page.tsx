"use client"

import { Canvas } from "@react-three/fiber"
import { useEffect } from "react"

export default function TestPage() {
    useEffect(() => {
        console.log('✅ Test page mounted')
    }, [])

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000000' }}>
            <Canvas
                style={{ width: '100%', height: '100%' }}
                gl={{ antialias: false, alpha: false }}
                camera={{ position: [0, 0, 5], fov: 45 }}
            >
                <color attach="background" args={["#1a1a2e"]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <mesh>
                    <boxGeometry args={[2, 2, 2]} />
                    <meshStandardMaterial color="hotpink" />
                </mesh>
            </Canvas>
            <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontSize: '24px' }}>
                Test: If you see a pink cube, Three.js is working!
            </div>
        </div>
    )
}

'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import {
  forwardRef,
  useRef,
  useImperativeHandle,
  useMemo,
  useEffect,
} from 'react'
import simulationVertexShader from './simulationVertexShader'
import simulationFragmentShader from './simulationFragmentShader'

type Props = {
  size: number
}

export type SimulationHandle = {
  getCurrentTexture: () => THREE.Texture
}

const SimulationMaterial = forwardRef<SimulationHandle, Props>(
  ({ size }, ref) => {
    const scene = useRef(new THREE.Scene())
    const camera = useRef(new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1))
    const meshRef = useRef<THREE.Mesh>(null)

    const simMatRef = useRef<THREE.ShaderMaterial>(null)

    const initialTexture = useMemo(() => {
      const data = new Float32Array(size * size * 4)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.random() * 2 - 1
        data[i + 1] = Math.random() * 2 - 1
        data[i + 2] = Math.random() * 2 - 1
        data[i + 3] = 1.0
      }
      const tex = new THREE.DataTexture(
        data,
        size,
        size,
        THREE.RGBAFormat,
        THREE.FloatType
      )
      tex.needsUpdate = true
      return tex
    }, [size])

    const fbo1 = useFBO(size, size, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    })

    const fbo2 = useFBO(size, size, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    })

    const read = useRef(fbo1)
    const write = useRef(fbo2)

    useImperativeHandle(ref, () => ({
      getCurrentTexture: () => read.current.texture,
    }))

    useFrame((state) => {
      console.log('✅ Simulation useFrame running');

      if (!meshRef.current || !simMatRef.current) return

      simMatRef.current.uniforms.uPositions.value = read.current.texture
      simMatRef.current.uniforms.uTime.value = state.clock.getElapsedTime()

      state.gl.setRenderTarget(write.current)
      state.gl.render(scene.current, camera.current)
      state.gl.setRenderTarget(null)

      const temp = read.current
      read.current = write.current
      write.current = temp

      console.log('✅ Simulation useFrame running')
    })

    useEffect(() => {
      if (!meshRef.current) return
      const mat = new THREE.MeshBasicMaterial({ map: initialTexture })
      meshRef.current.material = mat
    }, [initialTexture])

    return (
      <primitive object={scene.current}>
        <mesh ref={meshRef}>
          <planeGeometry args={[2, 2]} />
          <shaderMaterial
            ref={simMatRef}
            vertexShader={simulationVertexShader}
            fragmentShader={simulationFragmentShader}
            uniforms={{
              uPositions: { value: null },
              uTime: { value: 0 },
            }}
          />
        </mesh>
      </primitive>
    )
  }
)

export default SimulationMaterial

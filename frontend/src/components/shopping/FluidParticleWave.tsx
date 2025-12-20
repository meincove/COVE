"use client"

import * as THREE from "three"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useFBO } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"

type SimUniforms = {
    uPositions: { value: THREE.Texture | null }
    uTime: { value: number }
    uDelta: { value: number }
    uBounds: { value: number }
    uFlowScale: { value: number }
    uFlowStrength: { value: number }
    uWaveStrength: { value: number }
}

type RenderUniforms = {
    uPositions: { value: THREE.Texture | null }
    uPointSize: { value: number } // base size factor
    uTime: { value: number }
    uBounds: { value: number }
}

const SIM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const SIM_FRAG = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uPositions;
  uniform float uTime;
  uniform float uDelta;

  uniform float uBounds;
  uniform float uFlowScale;
  uniform float uFlowStrength;
  uniform float uWaveStrength;

  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;

    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  vec3 curlNoise(vec3 p) {
    float e = 0.15;
    float nx1 = snoise(vec3(p.x, p.y + e, p.z));
    float nx2 = snoise(vec3(p.x, p.y - e, p.z));
    float ny1 = snoise(vec3(p.x, p.y, p.z + e));
    float ny2 = snoise(vec3(p.x, p.y, p.z - e));
    float nz1 = snoise(vec3(p.x + e, p.y, p.z));
    float nz2 = snoise(vec3(p.x - e, p.y, p.z));

    float x = ny1 - ny2 - (nx1 - nx2);
    float y = nz1 - nz2 - (ny1 - ny2);
    float z = nx1 - nx2 - (nz1 - nz2);

    return normalize(vec3(x, y, z));
  }

  float waveZ(vec2 xy, float t) {
    float a = sin(xy.x * 0.85 + t * 0.55) * 0.38;
    float b = sin(xy.y * 0.75 + t * 0.42) * 0.28;
    float c = sin((xy.x + xy.y) * 0.35 + t * 0.35) * 0.18;
    return a + b + c;
  }

  void main() {
    vec4 prev = texture2D(uPositions, vUv);
    vec3 pos = prev.xyz;
    float seed = prev.w;

    vec3 p = pos * uFlowScale + vec3(0.0, 0.0, uTime * 0.25);
    vec3 flow = curlNoise(p);

    float jitter = 0.85 + 0.3 * sin(seed * 6.283 + uTime * 0.9);
    pos += flow * (uFlowStrength * jitter) * uDelta;

    float tz = waveZ(pos.xy, uTime) * uWaveStrength;
    pos.z = mix(pos.z, tz, 0.025);

    pos *= 0.9992;

    float b = uBounds;
    if (pos.x >  b) pos.x = -b;
    if (pos.x < -b) pos.x =  b;
    if (pos.y >  b) pos.y = -b;
    if (pos.y < -b) pos.y =  b;

    pos.z = clamp(pos.z, -b*0.75, b*0.75);

    gl_FragColor = vec4(pos, seed);
  }
`

const POINTS_VERT = /* glsl */ `
  precision highp float;

  uniform sampler2D uPositions;
  uniform float uPointSize;
  uniform float uTime;
  uniform float uBounds;

  varying float vFade;
  varying float vDepth;

  void main() {
    vec4 data = texture2D(uPositions, uv);
    vec3 pos = data.xyz;

    mat3 rot = mat3(
      0.98, 0.00, 0.20,
      0.04, 0.99,-0.10,
     -0.20, 0.10, 0.97
    );
    pos = rot * pos;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;

    // ✅ FIX: visible point sizing
    // "240.0 / depth" is a typical points scaling trick
    float depth = max(0.8, -mv.z);
    gl_PointSize = uPointSize * (240.0 / depth);

    vDepth = depth;

    float edge = smoothstep(uBounds, uBounds * 0.55, length(pos.xy));
    vFade = edge;

    gl_Position = clip;
  }
`

const POINTS_FRAG = /* glsl */ `
  precision highp float;

  varying float vFade;
  varying float vDepth;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);

    float core = smoothstep(0.5, 0.0, d);
    float halo = smoothstep(0.75, 0.18, d) * 0.55;

    float a = (core + halo) * vFade;

    vec3 col = vec3(0.94, 0.98, 1.0);
    col += vec3(0.10, 0.18, 0.35) * halo;

    float dim = smoothstep(10.0, 2.0, vDepth);
    col *= dim;

    if (a < 0.02) discard;
    gl_FragColor = vec4(col, a);
  }
`

function createInitialPositionsTexture(size: number, bounds: number) {
    const length = size * size * 4
    const data = new Float32Array(length)

    let ptr = 0
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / (size - 1)
            const v = y / (size - 1)

            const px = (u - 0.5) * 2.0 * bounds
            const py = (v - 0.5) * 2.0 * bounds

            const z =
                Math.sin(px * 0.85) * 0.22 +
                Math.sin(py * 0.75) * 0.16 +
                Math.sin((px + py) * 0.35) * 0.10 +
                (Math.random() - 0.5) * 0.08

            data[ptr++] = px
            data[ptr++] = py
            data[ptr++] = z
            data[ptr++] = Math.random()
        }
    }

    const tex = new THREE.DataTexture(
        data,
        size,
        size,
        THREE.RGBAFormat,
        THREE.FloatType
    )
    tex.needsUpdate = true
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
}

function GPUParticles({ resolution = 256 }: { resolution?: number }) {
    const { gl } = useThree()

    // more compatible default:
    const type = THREE.FloatType

    const bounds = 2.6

    const rtA = useFBO(resolution, resolution, {
        type,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
    })
    const rtB = useFBO(resolution, resolution, {
        type,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
    })

    const simScene = useMemo(() => new THREE.Scene(), [])
    const simCam = useMemo(
        () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
        []
    )

    const simMatRef = useRef<THREE.ShaderMaterial | null>(null)
    const pointsMatRef = useRef<THREE.ShaderMaterial | null>(null)

    const initTex = useMemo(
        () => createInitialPositionsTexture(resolution, bounds),
        [resolution]
    )

    const simMesh = useMemo(() => {
        const geom = new THREE.PlaneGeometry(2, 2)
        const uniforms: SimUniforms = {
            uPositions: { value: initTex },
            uTime: { value: 0 },
            uDelta: { value: 0.016 },
            uBounds: { value: bounds },
            uFlowScale: { value: 0.55 },
            uFlowStrength: { value: 1.15 },
            uWaveStrength: { value: 1.0 },
        }

        const mat = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: SIM_VERT,
            fragmentShader: SIM_FRAG,
        })
        simMatRef.current = mat
        return new THREE.Mesh(geom, mat)
    }, [initTex, bounds])

    useEffect(() => {
        simScene.add(simMesh)
        return () => {
            simScene.remove(simMesh)
            simMesh.geometry.dispose()
                ; (simMesh.material as THREE.Material).dispose()
        }
    }, [simScene, simMesh])

    const pointsGeom = useMemo(() => {
        const geom = new THREE.BufferGeometry()
        const count = resolution * resolution
        const positions = new Float32Array(count * 3)
        const uvs = new Float32Array(count * 2)

        let p = 0
        let t = 0
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                positions[p++] = 0
                positions[p++] = 0
                positions[p++] = 0
                uvs[t++] = x / (resolution - 1)
                uvs[t++] = y / (resolution - 1)
            }
        }

        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2))
        return geom
    }, [resolution])

    const pointsMat = useMemo(() => {
        const uniforms: RenderUniforms = {
            uPositions: { value: rtA.texture },
            // ✅ base size factor (actual pixel size is set in shader via 240/depth)
            uPointSize: { value: 1.35 * (typeof window !== 'undefined' ? window.devicePixelRatio : 1) },
            uTime: { value: 0 },
            uBounds: { value: bounds },
        }

        const mat = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: POINTS_VERT,
            fragmentShader: POINTS_FRAG,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })
        pointsMatRef.current = mat
        return mat
    }, [rtA.texture, bounds])

    useEffect(() => {
        if (!simMatRef.current) return

        simMatRef.current.uniforms.uPositions.value = initTex
        gl.setRenderTarget(rtA)
        gl.render(simScene, simCam)
        gl.setRenderTarget(rtB)
        gl.render(simScene, simCam)
        gl.setRenderTarget(null)

        if (pointsMatRef.current) {
            pointsMatRef.current.uniforms.uPositions.value = rtA.texture
        }
    }, [gl, initTex, rtA, rtB, simScene, simCam])

    const pingpong = useRef({ read: rtA, write: rtB })

    useFrame((state, delta) => {
        const d = Math.min(0.033, Math.max(0.008, delta))
        const t = state.clock.elapsedTime
        const { read, write } = pingpong.current

        const simMat = simMatRef.current
        if (!simMat) return

        simMat.uniforms.uPositions.value = read.texture
        simMat.uniforms.uTime.value = t
        simMat.uniforms.uDelta.value = d

        gl.setRenderTarget(write)
        gl.render(simScene, simCam)
        gl.setRenderTarget(null)

        const pm = pointsMatRef.current
        if (pm) {
            pm.uniforms.uPositions.value = write.texture
            pm.uniforms.uTime.value = t
        }

        pingpong.current.read = write
        pingpong.current.write = read
    })

    return (
        <points geometry={pointsGeom} material={pointsMat} frustumCulled={false} />
    )
}


export default function FluidParticleWaveBackground() {
    useEffect(() => {
        console.log('🎨 FluidParticleWave component mounted')
    }, [])

    return (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #05070d, #040814, #02040a)' }} />

            <Canvas
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 3.2], fov: 45 }}
                onCreated={({ gl }) => {
                    console.log('✅ Canvas created, WebGL version:', gl.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1')
                }}
            >
                <color attach="background" args={["#000000"]} />
                <ambientLight intensity={0.35} />
                <GPUParticles resolution={128} />
                <EffectComposer>
                    <Bloom luminanceThreshold={0.08} intensity={1.1} mipmapBlur />
                </EffectComposer>
            </Canvas>
        </div>
    )
}

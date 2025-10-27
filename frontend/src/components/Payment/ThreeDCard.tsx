'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import { animated, useSpring } from '@react-spring/three'

type Props = {
  cardNumber: string
  expiry: string
  cvc: string
  cardName: string
  focusedField: 'number' | 'expiry' | 'cvc' | null
  tier?: 'casual' | 'originals' | 'designer'
}

function getColor(tier: Props['tier']) {
  switch (tier) {
    case 'originals':
      return '#1e1e1e'
    case 'designer':
      return '#3f3f9f'
    case 'casual':
      return '#842029'
    default:
      return '#1e1e1e'
  }
}

// Mask helpers
function maskCardNumber(input: string) {
  if (input.includes('•')) return input
  const digits = input.replace(/\D/g, '').padEnd(16, 'X').slice(0, 16)
  return digits.match(/.{1,4}/g)?.join(' ') || ''
}

function maskExpiry(input: string) {
  if (input.includes('/')) return input
  const digits = input.replace(/\D/g, '').padEnd(4, 'X').slice(0, 4)
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`
}

function maskCVC(input: string) {
  if (input.includes('•')) return input
  return input.replace(/\D/g, '').padEnd(3, 'X').slice(0, 3)
}


export default function ThreeDCard({
  cardNumber,
  expiry,
  cvc,
  cardName,
  focusedField,
  tier = 'originals',
}: Props) {
  const { rotationY } = useSpring({
    rotationY: focusedField === 'cvc' ? Math.PI : 0,
    config: { mass: 1, tension: 170, friction: 20 },
  })

    console.log('🟢 3D Card Updated', { cardNumber, expiry, cvc, cardName })

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="h-full w-full">
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <Suspense fallback={null}>
          <animated.group rotation-y={rotationY} position={[0, 0, 0]}>
            <RoundedBox args={[3.2, 2, 0.06]} radius={0.04} smoothness={4}>
              <meshStandardMaterial
                color={getColor(tier)}
                metalness={0.6}
                roughness={0.25}
              />
            </RoundedBox>

            {/* Shine */}
            <mesh position={[0, 0, 0.033]}>
              <planeGeometry args={[3.1, 1.9]} />
              <meshStandardMaterial
                color="white"
                transparent
                opacity={0.06}
                roughness={0}
                metalness={1}
              />
            </mesh>

            {/* Card Number */}
            <Text position={[-1.1, 0.3, 0.032]} fontSize={0.12} color="white">
              {maskCardNumber(cardNumber)}
            </Text>

            {/* Expiry */}
            <Text position={[0.8, -0.2, 0.032]} fontSize={0.08} color="white">
              {maskExpiry(expiry)}
            </Text>

            {/* Cardholder Name */}
            <Text
              position={[-1.0, -0.85, 0.032]}
              fontSize={0.06}
              color="white"
              anchorX="left"
              anchorY="middle"
            >
              {cardName || 'YOUR NAME'}
            </Text>

            {/* CVC on Back */}
            <Text
              position={[1.0, 0.0, -0.035]}
              fontSize={0.1}
              color="white"
              rotation={[0, Math.PI, 0]}
            >
              {maskCVC(cvc)}
            </Text>
            
          </animated.group>
        </Suspense>
      </Canvas>

    </div>
  )
}

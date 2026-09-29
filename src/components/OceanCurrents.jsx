// src/components/OceanCurrents.jsx
// Animated particle flow representing ocean currents
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useOceanStore from '../store/oceanStore'

const PARTICLE_COUNT = 3000

function createParticlePositions() {
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const velocities = new Float32Array(PARTICLE_COUNT * 3)
  const ages = new Float32Array(PARTICLE_COUNT)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Spawn on globe surface - Indian Ocean region
    const lat = (Math.random() - 0.5) * 60   // -30 to 30
    const lon = Math.random() * 120 + 30      // 30 to 150
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    const r = 1.515

    positions[i * 3]     = -r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] =  r * Math.cos(phi)
    positions[i * 3 + 2] =  r * Math.sin(phi) * Math.sin(theta)

    // Tangential velocity (simplified Indian Ocean gyre)
    velocities[i * 3]     = (Math.random() - 0.5) * 0.004
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.001
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004

    ages[i] = Math.random() * 200
  }
  return { positions, velocities, ages }
}

export default function OceanCurrents() {
  const pointsRef = useRef()
  const showCurrents = useOceanStore(s => s.showCurrents)
  const currentSpeed = useOceanStore(s => s.currentSpeed)
  const morphProgress = useOceanStore(s => s.morphProgress)

  const { positions, velocities, ages } = useMemo(() => createParticlePositions(), [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    return geo
  }, [])

  useFrame((state, delta) => {
    if (!pointsRef.current) return

    // Animate even if hidden so it's ready when shown
    const posAttr = pointsRef.current.geometry.attributes.position
    const R = 1.515

    if (showCurrents) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        ages[i] += delta * 60
        const maxAge = 150 + Math.random() * 100

        if (ages[i] > maxAge) {
          // Reset particle
          const lat = (Math.random() - 0.5) * 60
          const lon = Math.random() * 120 + 30
          const phi = (90 - lat) * (Math.PI / 180)
          const theta = (lon + 180) * (Math.PI / 180)
          posAttr.array[i * 3]     = -R * Math.sin(phi) * Math.cos(theta)
          posAttr.array[i * 3 + 1] =  R * Math.cos(phi)
          posAttr.array[i * 3 + 2] =  R * Math.sin(phi) * Math.sin(theta)
          ages[i] = 0
          continue
        }

        // Move particle
        const speed = currentSpeed * delta
        posAttr.array[i * 3]     += velocities[i * 3]     * speed * 8
        posAttr.array[i * 3 + 1] += velocities[i * 3 + 1] * speed * 4
        posAttr.array[i * 3 + 2] += velocities[i * 3 + 2] * speed * 8

        // Re-project to sphere surface
        const x = posAttr.array[i * 3]
        const y = posAttr.array[i * 3 + 1]
        const z = posAttr.array[i * 3 + 2]
        const len = Math.sqrt(x*x + y*y + z*z)
        if (len > 0) {
          posAttr.array[i * 3]     = (x / len) * R
          posAttr.array[i * 3 + 1] = (y / len) * R
          posAttr.array[i * 3 + 2] = (z / len) * R
        }
      }
      posAttr.needsUpdate = true
    }

    // Fade with morph (hide in flat mode)
    pointsRef.current.material.opacity = THREE.MathUtils.lerp(
      pointsRef.current.material.opacity,
      showCurrents ? (1 - morphProgress) * 0.7 : 0,
      0.05
    )
    pointsRef.current.visible = pointsRef.current.material.opacity > 0.001
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.008}
        color="#48cae4"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// src/components/OceanCurrentParticles.jsx
// Real-Earth Ocean Current Particle Simulation — Ocean-Only, Direction-Accurate
// Particles strictly confined to ocean water. Follows real gyre, jet, and band currents.
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useOceanStore from '../store/oceanStore'
import { sampleFlow, isOcean } from '../data/oceanCurrents'

const PARTICLE_COUNT = 18000
const SPHERE_RADIUS  = 1.524

// ── Ultra-bright glowing circular sprite texture ─────────────────────────────
function createParticleTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  grad.addColorStop(0.00, 'rgba(255,255,255,1.0)')  // pure white core
  grad.addColorStop(0.20, 'rgba(255,255,255,1.0)')  // solid white middle
  grad.addColorStop(0.45, 'rgba(200,255,255,0.90)') // cyan glow
  grad.addColorStop(0.70, 'rgba(100,200,255,0.55)') // blue halo
  grad.addColorStop(1.00, 'rgba(0,80,200,0.0)')     // transparent edge
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// ── Ocean-only spawn regions (avoids land from the start) ────────────────────
// Weighted basins matching real current activity
const SPAWN_BASINS = [
  // Antarctic Circumpolar Current — strongest, densest coverage
  { latMin: -65, latMax: -42, lonMin: -180, lonMax: 180,  weight: 2.8 },
  // North Atlantic Gyre + Gulf Stream corridor
  { latMin:  10, latMax:  60, lonMin:  -80, lonMax: -10,  weight: 2.0 },
  // North Pacific Gyre + Kuroshio
  { latMin:  10, latMax:  58, lonMin:  125, lonMax: 220,  weight: 2.0 },
  // South Atlantic Gyre + Brazil + Benguela
  { latMin: -45, latMax:   5, lonMin:  -55, lonMax:  20,  weight: 1.4 },
  // South Pacific Gyre + Humboldt + E. Australian
  { latMin: -45, latMax:   5, lonMin:  140, lonMax: 280,  weight: 1.4 },
  // Indian Ocean Gyre + Agulhas + Somali + Monsoon
  { latMin: -45, latMax:  25, lonMin:   35, lonMax: 110,  weight: 1.8 },
  // Equatorial Countercurrents (Pacific + Atlantic)
  { latMin: -12, latMax:  12, lonMin: -180, lonMax: 180,  weight: 1.2 },
]

const TOTAL_WEIGHT = SPAWN_BASINS.reduce((s, b) => s + b.weight, 0)

function spawnOceanParticle() {
  // Pick a basin weighted by current activity
  let r = Math.random() * TOTAL_WEIGHT
  let chosen = SPAWN_BASINS[0]
  for (const b of SPAWN_BASINS) {
    if (r <= b.weight) { chosen = b; break }
    r -= b.weight
  }

  // Try up to 12 times to land in ocean
  for (let attempt = 0; attempt < 12; attempt++) {
    let lat = chosen.latMin + Math.random() * (chosen.latMax - chosen.latMin)
    let lon = chosen.lonMin + Math.random() * (chosen.lonMax - chosen.lonMin)
    // Normalize lon to [-180, 180]
    while (lon > 180) lon -= 360
    while (lon < -180) lon += 360
    if (isOcean(lat, lon)) return { lat, lon }
  }

  // Fallback: guaranteed ocean point (mid-Pacific)
  return { lat: (Math.random() - 0.5) * 40, lon: -140 + (Math.random() - 0.5) * 60 }
}

// ── Lat/Lon → 3D sphere + flat map position ───────────────────────────────────
function latLonToSphere(lat, lon, r) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y:  r * Math.cos(phi),
    z:  r * Math.sin(phi) * Math.sin(theta),
  }
}

// ── Flow-speed to color: Cyan(slow) → Lime(medium) → Gold/Orange → Fire-Red(fast) ─
function speedToColor(normSpeed) {
  let r, g, b
  if (normSpeed < 0.30) {
    // Cold slow water — Cyan (#00e5ff)
    const t = normSpeed / 0.30
    r = 0.0;  g = 0.88 + t * 0.10; b = 1.0
  } else if (normSpeed < 0.60) {
    // Medium — Electric Lime (#00f7a0 → #aaff00)
    const t = (normSpeed - 0.30) / 0.30
    r = t * 0.60; g = 0.98; b = 1.0 - t * 0.85
  } else if (normSpeed < 0.85) {
    // Fast — Gold/Orange (Gulf Stream arm)
    const t = (normSpeed - 0.60) / 0.25
    r = 0.60 + t * 0.40; g = 0.98 - t * 0.45; b = 0.15 * (1.0 - t)
  } else {
    // Jet core — Fire orange-red (Kuroshio/Gulf Stream core)
    const t = (normSpeed - 0.85) / 0.15
    r = 1.0; g = 0.53 - t * 0.45; b = 0.0
  }
  return { r, g, b }
}

export default function OceanCurrentParticles() {
  const pointsRef      = useRef()
  const showWaterDirection = useOceanStore(s => s.showWaterDirection)
  const showCurrents       = useOceanStore(s => s.showCurrents)
  const morphProgress      = useOceanStore(s => s.morphProgress)
  const currentSpeed       = useOceanStore(s => s.currentSpeed)
  const playbackDirection  = useOceanStore(s => s.playbackDirection ?? 1)
  const timeScale          = useOceanStore(s => s.timeScale ?? 1.0)

  const isEnabled = showWaterDirection || showCurrents

  const dotTexture = useMemo(() => createParticleTexture(), [])

  // Particle state — spawn only in ocean
  const particleState = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => {
      const coord = spawnOceanParticle()
      return {
        lat:    coord.lat,
        lon:    coord.lon,
        age:    Math.random() * 100,
        maxAge: 80 + Math.random() * 130,
        speed:  0.0,
      }
    })
  }, [])

  // GPU Buffer Geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const col = new Float32Array(PARTICLE_COUNT * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage))
    return geo
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    const mat = pointsRef.current.material
    const targetOpacity = isEnabled ? 1.0 : 0.0
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.25)
    pointsRef.current.visible = mat.opacity > 0.004

    if (!pointsRef.current.visible) return

    const posAttr = pointsRef.current.geometry.attributes.position
    const colAttr = pointsRef.current.geometry.attributes.color

    // speed factor: currentSpeed from UI (0-1), scaled to realistic deg/s movement
    const speedScale = (currentSpeed ?? 0.5) * 10.0 * playbackDirection * timeScale * delta
    const morph = morphProgress ?? 0.0

    // Flat map projection constants (matching OceanGlobe.jsx shader)
    const flatXScale = Math.PI * 1.6
    const flatYScale = Math.PI * 0.8
    const flatZ = 0.048

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particleState[i]
      p.age += delta * 60

      // ── Age reset: respawn in ocean ───────────────────────────────────────
      if (p.age >= p.maxAge) {
        const reset = spawnOceanParticle()
        p.lat = reset.lat
        p.lon = reset.lon
        p.age = 0
        p.maxAge = 80 + Math.random() * 130
      }

      // ── Sample real Earth flow field at this lat/lon ──────────────────────
      const flow = sampleFlow(p.lat, p.lon)
      const u = flow.u  // eastward component (normalized 0..1)
      const v = flow.v  // northward component (normalized 0..1)
      const speed = Math.sqrt(u * u + v * v)
      p.speed = speed

      // ── Advect particle along flow vector ─────────────────────────────────
      // Correct for longitude compression near poles
      const cosLat = Math.max(0.10, Math.cos((p.lat * Math.PI) / 180))
      const dLat = v * speedScale
      const dLon = (u / cosLat) * speedScale

      const nextLat = p.lat + dLat
      const nextLon = p.lon + dLon

      // ── Ocean check: if advected position is land, reset ──────────────────
      let normLon = nextLon
      while (normLon > 180) normLon -= 360
      while (normLon < -180) normLon += 360

      if (!isOcean(nextLat, normLon)) {
        // Particle has hit land — respawn it elsewhere
        const reset = spawnOceanParticle()
        p.lat = reset.lat
        p.lon = reset.lon
        p.age = 0
        // Update positions below (don't use nextLat/nextLon)
      } else {
        p.lat = nextLat
        p.lon = normLon
        // Wrap longitude
        if (p.lon > 180) p.lon -= 360
        if (p.lon < -180) p.lon += 360
        // Reset if drifted past extreme latitude
        if (p.lat > 82 || p.lat < -80) {
          const reset = spawnOceanParticle()
          p.lat = reset.lat
          p.lon = reset.lon
          p.age = 0
        }
      }

      // ── Compute 3D position: sphere (globe) or flat (map) ─────────────────
      const sphere = latLonToSphere(p.lat, p.lon, SPHERE_RADIUS)
      const fx = (p.lon / 180) * flatXScale
      const fy = (p.lat / 90)  * flatYScale

      posAttr.array[i * 3]     = sphere.x * (1.0 - morph) + fx * morph
      posAttr.array[i * 3 + 1] = sphere.y * (1.0 - morph) + fy * morph
      posAttr.array[i * 3 + 2] = sphere.z * (1.0 - morph) + flatZ * morph

      // ── Age-based fade in / fade out ──────────────────────────────────────
      const fadeIn  = Math.min(1.0, p.age / 12.0)
      const fadeOut = Math.min(1.0, (p.maxAge - p.age) / 16.0)
      const alphaFactor = Math.max(0.65, fadeIn * fadeOut)

      // ── Speed-based color ─────────────────────────────────────────────────
      const normSpeed = Math.min(1.0, speed * 2.4)
      const { r, g, b } = speedToColor(normSpeed)

      // With AdditiveBlending, brightness = perceived opacity — use alphaFactor to fade
      const bright = alphaFactor

      colAttr.array[i * 3]     = r * bright
      colAttr.array[i * 3 + 1] = g * bright
      colAttr.array[i * 3 + 2] = b * bright
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry} renderOrder={30}>
      <pointsMaterial
        size={0.040}
        map={dotTexture}
        vertexColors={true}
        transparent={true}
        opacity={0.0}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  )
}

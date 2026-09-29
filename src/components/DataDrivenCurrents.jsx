// src/components/DataDrivenCurrents.jsx
// Flowing Streak Ocean Current System (earth.nullschool.net style)
// - Each particle maintains a trail of historical positions
// - Rendered as LineSegments: bright glowing head fading to black tail
// - Black + AdditiveBlending = fully transparent tail (no bleed)
// - Ocean-only (uses waterMask from uploaded dataset)
// - Only renders when dataset uploaded + Current Velocity toggle ON
// - Respects playbackDirection: forward (1) or backward (-1)

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useOceanStore from '../store/oceanStore'
import { GRID_COLS, GRID_ROWS } from '../data/oceanCurrents'

// ── Constants ─────────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 5000
const TRAIL_LENGTH   = 10      // number of historical points per particle
const GLOBE_RADIUS   = 1.522   // just above water surface

// Each particle creates (TRAIL_LENGTH - 1) line segments.
// LineSegments uses pairs: [A0,B0, A1,B1, ...] → 2 verts per segment
const SEGMENTS_PER_PARTICLE = TRAIL_LENGTH - 1
const VERTS_PER_PARTICLE    = SEGMENTS_PER_PARTICLE * 2
const TOTAL_VERTICES        = PARTICLE_COUNT * VERTS_PER_PARTICLE

// ── Coordinate Helpers ────────────────────────────────────────────────────────
function latLonToSphere(lat, lon, r = GLOBE_RADIUS) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y:  r * Math.cos(phi),
    z:  r * Math.sin(phi) * Math.sin(theta),
  }
}

// Flat map — matches GLSL morphShaderChunk exactly
function latLonToFlat(lat, lon) {
  return {
    x: (lon / 180) * Math.PI * 1.6,
    y: (lat / 90)  * Math.PI * 0.8,
    z: 0.026,
  }
}

// ── Bilinear Velocity Sample ───────────────────────────────────────────────────
function sampleVelocity(lat, lon, uData, vData, maxSpeed) {
  const rowF = 90 - lat
  const colF = lon + 180

  const r0 = Math.max(0, Math.min(GRID_ROWS - 2, Math.floor(rowF)))
  const c0 = Math.max(0, Math.min(GRID_COLS - 2, Math.floor(colF)))
  const r1 = r0 + 1, c1 = c0 + 1
  const fr = rowF - r0, fc = colF - c0

  const get = (arr, r, c) => arr[r * GRID_COLS + c]
  const u00 = get(uData, r0, c0); const u01 = get(uData, r0, c1)
  const u10 = get(uData, r1, c0); const u11 = get(uData, r1, c1)
  const v00 = get(vData, r0, c0); const v01 = get(vData, r0, c1)
  const v10 = get(vData, r1, c0); const v11 = get(vData, r1, c1)

  if ([u00,u01,u10,u11,v00,v01,v10,v11].some(isNaN)) return null

  const u = u00*(1-fr)*(1-fc) + u01*(1-fr)*fc + u10*fr*(1-fc) + u11*fr*fc
  const v = v00*(1-fr)*(1-fc) + v01*(1-fr)*fc + v10*fr*(1-fc) + v11*fr*fc
  const speed = Math.sqrt(u*u + v*v)
  return { u, v, speed, normSpeed: Math.min(speed / (maxSpeed * 0.7 + 1e-9), 1.0) }
}

// ── Water Mask ────────────────────────────────────────────────────────────────
function isOcean(lat, lon, waterMask) {
  if (!waterMask) return false
  const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(90 - lat)))
  const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(lon + 180)))
  return waterMask[row * GRID_COLS + col] === 1
}

function randomOceanSpawn(waterMask, uData, vData, maxSpeed) {
  for (let t = 0; t < 400; t++) {
    const lat = (Math.random() - 0.5) * 160
    const lon = (Math.random() - 0.5) * 360
    if (isOcean(lat, lon, waterMask)) {
      const vel = sampleVelocity(lat, lon, uData, vData, maxSpeed)
      if (vel && vel.speed > 0.0005) return { lat, lon }
    }
  }
  return { lat: 0, lon: (Math.random() - 0.5) * 360 }
}

// ── Speed → Color ─────────────────────────────────────────────────────────────
// Cyan(slow) → Lime(medium) → Gold → Red(fast)  (same palette as OceanCurrentParticles)
function normSpeedToRGB(t) {
  if (t < 0.30) {
    const s = t / 0.30
    return { r: 0.0, g: 0.88 + s * 0.10, b: 1.0 }
  } else if (t < 0.60) {
    const s = (t - 0.30) / 0.30
    return { r: s * 0.60, g: 0.98, b: 1.0 - s * 0.85 }
  } else if (t < 0.85) {
    const s = (t - 0.60) / 0.25
    return { r: 0.60 + s * 0.40, g: 0.98 - s * 0.45, b: 0.15 * (1.0 - s) }
  } else {
    const s = (t - 0.85) / 0.15
    return { r: 1.0, g: 0.53 - s * 0.45, b: 0.0 }
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DataDrivenCurrents() {
  const linesRef = useRef()

  const showCurrents      = useOceanStore(s => s.showCurrents)
  const currentSpeed      = useOceanStore(s => s.currentSpeed)
  const morphProgress     = useOceanStore(s => s.morphProgress)
  const playbackDirection = useOceanStore(s => s.playbackDirection)
  const timeScale         = useOceanStore(s => s.timeScale)
  const flowData          = useOceanStore(s => s.flowData)

  // Only render if dataset with U/V was uploaded
  const hasData = !!(flowData?.uData && flowData?.vData && flowData?.waterMask)

  const { uData, vData, waterMask, maxSpeed } = useMemo(() =>
    hasData ? flowData : { uData: null, vData: null, waterMask: null, maxSpeed: 1 }
  , [flowData, hasData])

  // ── Particle State ─────────────────────────────────────────────────────────
  // Each particle stores TRAIL_LENGTH (lat, lon) positions as its history.
  // history[0] = oldest (tail), history[TRAIL_LENGTH-1] = newest (head)
  const particles = useMemo(() => {
    if (!hasData) return []
    return Array.from({ length: PARTICLE_COUNT }, () => {
      const sp = randomOceanSpawn(waterMask, uData, vData, maxSpeed)
      const history = Array.from({ length: TRAIL_LENGTH }, () => ({ lat: sp.lat, lon: sp.lon }))
      return {
        lat: sp.lat, lon: sp.lon,
        age: Math.random() * 80,
        maxAge: 60 + Math.random() * 100,
        history,
        historyAge: 0,          // frames since last history push
        historyInterval: 2,     // push a new history point every N frames
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData, flowData])

  // ── LineSegments Geometry ──────────────────────────────────────────────────
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(TOTAL_VERTICES * 3)
    const col = new Float32Array(TOTAL_VERTICES * 3)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('color',    new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage))
    return g
  }, [])

  // ── Animation ─────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!linesRef.current) return

    const mat = linesRef.current.material
    const shouldShow = showCurrents && hasData
    const targetOp = shouldShow ? 1.0 : 0.0
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOp, 0.1)
    linesRef.current.visible = mat.opacity > 0.01
    if (!shouldShow || !uData || !vData || !waterMask) return

    const isFlat = morphProgress > 0.5
    const dt = delta * currentSpeed * timeScale * playbackDirection * 35.0

    const posArr = geo.attributes.position.array
    const colArr = geo.attributes.color.array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      p.age += delta * 35

      const vel = sampleVelocity(p.lat, p.lon, uData, vData, maxSpeed)
      const onLand = !isOcean(p.lat, p.lon, waterMask)

      if (p.age > p.maxAge || onLand || !vel || vel.speed < 0.0005) {
        // Respawn — reset all history to new point
        const sp = randomOceanSpawn(waterMask, uData, vData, maxSpeed)
        p.lat = sp.lat; p.lon = sp.lon; p.age = 0
        p.maxAge = 60 + Math.random() * 100
        for (let h = 0; h < TRAIL_LENGTH; h++) {
          p.history[h].lat = sp.lat
          p.history[h].lon = sp.lon
        }
        p.historyAge = 0
        continue
      }

      // Advect particle along flow vector
      const cosLat = Math.max(0.05, Math.cos(p.lat * Math.PI / 180))
      p.lat += vel.v * dt / maxSpeed
      p.lon += (vel.u * dt / maxSpeed) / cosLat

      // Boundary wrapping
      if (p.lat >  80) p.lat =  80
      if (p.lat < -80) p.lat = -80
      if (p.lon >  180) p.lon -= 360
      if (p.lon < -180) p.lon += 360

      if (!isOcean(p.lat, p.lon, waterMask)) { p.age = p.maxAge; continue }

      // Push new history point periodically (shift left, add new head)
      p.historyAge++
      if (p.historyAge >= p.historyInterval) {
        p.historyAge = 0
        for (let h = 0; h < TRAIL_LENGTH - 1; h++) {
          p.history[h].lat = p.history[h + 1].lat
          p.history[h].lon = p.history[h + 1].lon
        }
      }
      // Always update the head with current position
      p.history[TRAIL_LENGTH - 1].lat = p.lat
      p.history[TRAIL_LENGTH - 1].lon = p.lon

      // Head color (based on velocity)
      const { r, g, b } = normSpeedToRGB(vel.normSpeed)

      // Life fade: fade in at birth, fade out at death
      const lifeRatio = p.age / p.maxAge
      const lifeAlpha = Math.min(1.0, Math.sin(lifeRatio * Math.PI) * 2.0)

      // Write line segment pairs into buffer
      // Segment s connects history[s] (older) → history[s+1] (newer)
      // Brightness fades quadratically: 0 at tail, 1 at head
      const pBase = i * VERTS_PER_PARTICLE

      for (let s = 0; s < SEGMENTS_PER_PARTICLE; s++) {
        // Normalized position along trail: 0=tail, 1=head
        const tA = s       / SEGMENTS_PER_PARTICLE
        const tB = (s + 1) / SEGMENTS_PER_PARTICLE

        const hA = p.history[s]
        const hB = p.history[s + 1]

        let posA, posB
        if (isFlat) {
          posA = latLonToFlat(hA.lat, hA.lon)
          posB = latLonToFlat(hB.lat, hB.lon)
        } else {
          posA = latLonToSphere(hA.lat, hA.lon)
          posB = latLonToSphere(hB.lat, hB.lon)
        }

        const vBase = (pBase + s * 2) * 3

        // Vertex A (older end of segment)
        posArr[vBase]     = posA.x
        posArr[vBase + 1] = posA.y
        posArr[vBase + 2] = posA.z
        // With AdditiveBlending: black = fully transparent. Quadratic fade.
        const brightA = tA * tA * lifeAlpha
        colArr[vBase]     = r * brightA
        colArr[vBase + 1] = g * brightA
        colArr[vBase + 2] = b * brightA

        // Vertex B (newer end of segment)
        const vBaseB = vBase + 3
        posArr[vBaseB]     = posB.x
        posArr[vBaseB + 1] = posB.y
        posArr[vBaseB + 2] = posB.z
        const brightB = tB * tB * lifeAlpha
        colArr[vBaseB]     = r * brightB
        colArr[vBaseB + 1] = g * brightB
        colArr[vBaseB + 2] = b * brightB
      }
    }

    geo.attributes.position.needsUpdate = true
    geo.attributes.color.needsUpdate    = true
    geo.computeBoundingSphere()
  })

  if (!hasData) return null

  return (
    <lineSegments ref={linesRef} geometry={geo} frustumCulled={false} renderOrder={30}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        linewidth={1}
      />
    </lineSegments>
  )
}

// src/components/OceanDepthSlicer.jsx
// Realistic 3D Interactive Ocean Depth Slicer
// Features: 3D Coastal Landmass, Depth-Slice Views (Horizontal & Vertical), 
// 3D Isosurfaces (15°C Isotherm, 20°C, 4°C, 35 PSU), and Time-Step Timeline Animation
import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// ─── Accurate Oceanographic Reference Data ───────────────────────────────────
const OCEAN_PROFILE = [
  { depth: 0,     temp: 28.4, salinity: 34.2, oxygen: 215, currentSpeed: 1.420, pressure: 1,    zone: 'Epipelagic',    label: 'Sea Surface',       bioLum: 0.0 },
  { depth: 100,   temp: 24.1, salinity: 35.0, oxygen: 195, currentSpeed: 0.920, pressure: 11,   zone: 'Epipelagic',    label: 'Mixed Layer Base',  bioLum: 0.0 },
  { depth: 200,   temp: 15.2, salinity: 35.6, oxygen: 88,  currentSpeed: 0.550, pressure: 21,   zone: 'Mesopelagic',   label: 'Thermocline Top (15°C)', bioLum: 0.05 },
  { depth: 400,   temp: 11.4, salinity: 35.8, oxygen: 52,  currentSpeed: 0.320, pressure: 41,   zone: 'Mesopelagic',   label: 'Thermocline Core',  bioLum: 0.1 },
  { depth: 600,   temp: 8.2,  salinity: 35.6, oxygen: 36,  currentSpeed: 0.180, pressure: 61,   zone: 'Mesopelagic',   label: 'OMZ Upper',         bioLum: 0.15 },
  { depth: 800,   temp: 6.1,  salinity: 35.2, oxygen: 28,  currentSpeed: 0.120, pressure: 81,   zone: 'Mesopelagic',   label: 'Oxygen Min Zone',   bioLum: 0.12 },
  { depth: 1000,  temp: 4.6,  salinity: 34.9, oxygen: 48,  currentSpeed: 0.120, pressure: 101,  zone: 'Bathypelagic',  label: 'Argo Parking (4°C)',bioLum: 0.2 },
  { depth: 1500,  temp: 3.5,  salinity: 34.8, oxygen: 118, currentSpeed: 0.060, pressure: 152,  zone: 'Bathypelagic',  label: 'Deep Salinity Boundary', bioLum: 0.3 },
  { depth: 2000,  temp: 2.9,  salinity: 34.7, oxygen: 162, currentSpeed: 0.040, pressure: 203,  zone: 'Bathypelagic',  label: 'Bathyal Plain',     bioLum: 0.35 },
  { depth: 3000,  temp: 2.3,  salinity: 34.65,oxygen: 174, currentSpeed: 0.018, pressure: 304,  zone: 'Abyssopelagic', label: 'Abyssal Approach',  bioLum: 0.4 },
  { depth: 4000,  temp: 1.8,  salinity: 34.62,oxygen: 178, currentSpeed: 0.008, pressure: 405,  zone: 'Abyssopelagic', label: 'Abyssal Plain',     bioLum: 0.45 },
  { depth: 6000,  temp: 1.3,  salinity: 34.60,oxygen: 162, currentSpeed: 0.003, pressure: 610,  zone: 'Hadalpelagic',  label: 'Hadal Zone Entry',  bioLum: 0.55 },
  { depth: 8000,  temp: 1.2,  salinity: 34.62,oxygen: 154, currentSpeed: 0.001, pressure: 812,  zone: 'Hadalpelagic',  label: 'Deep Trench',       bioLum: 0.6 },
  { depth: 11034, temp: 1.1,  salinity: 34.68,oxygen: 145, currentSpeed: 0.0005,pressure: 1086, zone: 'Hadalpelagic',  label: 'Challenger Deep',   bioLum: 0.7 },
]

// ─── Seasonal Timeline Cycles ────────────────────────────────────────────────
const SEASONAL_DATA = [
  { month: 'JAN', name: 'January',   season: 'Winter Convection',   tempOffset: -2.1, flowMult: 0.85, upwelling: 0.1, desc: 'NE Monsoon · Deep vertical convective mixing' },
  { month: 'FEB', name: 'February',  season: 'Late Winter Cool',    tempOffset: -1.6, flowMult: 0.80, upwelling: 0.1, desc: 'Cool surface layer · Low coastal agitation' },
  { month: 'MAR', name: 'March',     season: 'Spring Transition',  tempOffset: +0.4, flowMult: 0.90, upwelling: 0.2, desc: 'Solar warming begins · Thermal stratification' },
  { month: 'APR', name: 'April',     season: 'Pre-Monsoon Peak',   tempOffset: +2.2, flowMult: 1.05, upwelling: 0.3, desc: 'Maximum SST heating · Calm glassy swell' },
  { month: 'MAY', name: 'May',       season: 'Monsoon Onset',      tempOffset: +1.8, flowMult: 1.25, upwelling: 0.5, desc: 'Wind stress ramps up · Boundary currents spin up' },
  { month: 'JUN', name: 'June',      season: 'SW Monsoon Upwelling',tempOffset: +0.2, flowMult: 1.45, upwelling: 0.85,desc: 'Strong coastal jet · Active coastal upwelling' },
  { month: 'JUL', name: 'July',      season: 'Peak SW Monsoon',    tempOffset: -0.5, flowMult: 1.65, upwelling: 1.0, desc: 'Intense upwelling · Somali Jet 2.1 m/s' },
  { month: 'AUG', name: 'August',    season: 'Mid-Summer Gyre',    tempOffset: +0.1, flowMult: 1.50, upwelling: 0.9, desc: 'Great Whirl eddy active · Deep nutrient flux' },
  { month: 'SEP', name: 'September', season: 'Monsoon Withdrawal', tempOffset: +0.8, flowMult: 1.20, upwelling: 0.6, desc: 'Winds slacken · Thermal re-equilibration' },
  { month: 'OCT', name: 'October',   season: 'Autumn Transition',  tempOffset: +1.2, flowMult: 0.95, upwelling: 0.3, desc: 'Post-monsoon calm · Secondary bloom' },
  { month: 'NOV', name: 'November',  season: 'NE Monsoon Influx',  tempOffset: -0.4, flowMult: 0.90, upwelling: 0.2, desc: 'Freshwater plume spreading · Salinity drop' },
  { month: 'DEC', name: 'December',  season: 'Early Winter',       tempOffset: -1.5, flowMult: 0.88, upwelling: 0.15,desc: 'Winter cooling begins · Thermocline deepens' },
]

const MAX_DEPTH = 11034
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t))

function interpolateProfile(depthM) {
  const p = OCEAN_PROFILE
  if (depthM <= 0) return { ...p[0] }
  if (depthM >= MAX_DEPTH) return { ...p[p.length - 1] }
  for (let i = 0; i < p.length - 1; i++) {
    if (depthM >= p[i].depth && depthM <= p[i + 1].depth) {
      const t = (depthM - p[i].depth) / (p[i + 1].depth - p[i].depth)
      const easeT = t * t * (3 - 2 * t)
      return {
        temp:         lerp(p[i].temp, p[i+1].temp, easeT),
        salinity:     lerp(p[i].salinity, p[i+1].salinity, easeT),
        oxygen:       lerp(p[i].oxygen, p[i+1].oxygen, easeT),
        currentSpeed: lerp(p[i].currentSpeed, p[i+1].currentSpeed, easeT),
        pressure:     lerp(p[i].pressure, p[i+1].pressure, easeT),
        bioLum:       lerp(p[i].bioLum, p[i+1].bioLum, easeT),
        zone:         easeT < 0.5 ? p[i].zone : p[i+1].zone,
        label:        easeT < 0.5 ? p[i].label : p[i+1].label,
      }
    }
  }
  return { ...p[p.length - 1] }
}

function getEffectiveProfile(depthM, monthIndex) {
  const base = interpolateProfile(depthM)
  const season = SEASONAL_DATA[monthIndex % 12]
  // Surface layers attenuate seasonal temperature variation down to ~500m
  const atten = Math.exp(-depthM / 450)
  const effTemp = Math.max(1.1, base.temp + season.tempOffset * atten)
  const effFlow = Math.max(0.0005, base.currentSpeed * (1 + (season.flowMult - 1) * atten))
  const effSalin = depthM < 150 ? base.salinity - season.upwelling * 0.35 : base.salinity
  return {
    ...base,
    temp: effTemp,
    currentSpeed: effFlow,
    salinity: effSalin,
    seasonInfo: season,
  }
}

// ─── GLSL Shaders for Water Rendering ─────────────────────────────────────────
const waterVertexShader = `
  varying float vDepthFactor;
  varying vec2  vUv;
  varying vec3  vWorldPos;
  uniform float uTime;
  uniform float uWaveAmp;

  void main() {
    vUv = uv;
    // Normalize Y: +2.1 = surface (0), -2.1 = deep (1)
    vDepthFactor = clamp((-position.y + 2.1) / 4.2, 0.0, 1.0);
    vWorldPos = position;

    // Fluid wave agitation near surface
    vec3 pos = position;
    float surfaceMask = max(0.0, 1.0 - vDepthFactor * 10.0);
    pos.x += sin(position.z * 4.5 + uTime * 2.2) * (0.015 * uWaveAmp) * surfaceMask;
    pos.z += cos(position.x * 4.0 + uTime * 1.8) * (0.015 * uWaveAmp) * surfaceMask;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const waterFragmentShader = `
  varying float vDepthFactor;
  varying vec2  vUv;
  varying vec3  vWorldPos;

  uniform float uTime;
  uniform float uSelectedDepth; // 0=surface 1=Challenger Deep
  uniform float uBioLum;
  uniform float uSliceMode;     // 0 = horizontal, 1 = vertical
  uniform float uSlicePos;      // 0 to 1

  // Physically inspired ocean color gradient:
  // Surface cyan -> epipelagic blue -> thermocline indigo -> bathyal purple -> hadal crimson
  vec3 tempColor(float depth) {
    vec3 surface   = vec3(0.0,  0.92, 1.0);
    vec3 epipelagic= vec3(0.0,  0.65, 0.95);
    vec3 thermo    = vec3(0.04, 0.28, 0.82);
    vec3 bathyal   = vec3(0.22, 0.08, 0.62);
    vec3 abyssal   = vec3(0.38, 0.04, 0.45);
    vec3 hadal     = vec3(0.55, 0.02, 0.12);

    if (depth < 0.08) return mix(surface, epipelagic, depth / 0.08);
    if (depth < 0.22) return mix(epipelagic, thermo,   (depth - 0.08) / 0.14);
    if (depth < 0.45) return mix(thermo, bathyal,      (depth - 0.22) / 0.23);
    if (depth < 0.72) return mix(bathyal, abyssal,     (depth - 0.45) / 0.27);
    return mix(abyssal, hadal,                         (depth - 0.72) / 0.28);
  }

  void main() {
    // Vertical transect slicing check
    if (uSliceMode > 0.5) {
      // Slicing across Z axis
      float normZ = (vWorldPos.z + 1.65) / 3.3;
      if (normZ > uSlicePos) discard;
    }

    vec3 baseCol = tempColor(vDepthFactor);

    // Density stratification striations (halocline lines)
    float stria = sin(vDepthFactor * 130.0) * 0.025;
    baseCol += vec3(stria * 0.3, stria * 0.5, stria * 0.8);

    // Dynamic surface light caustics
    if (vDepthFactor < 0.045) {
      float c1 = sin(vWorldPos.x * 9.0 + uTime * 2.5) * cos(vWorldPos.z * 7.0 + uTime * 1.8);
      float c2 = sin(vWorldPos.x * 6.5 - uTime * 1.7) * cos(vWorldPos.z * 8.5 - uTime * 2.2);
      float caustic = (c1 * 0.5 + c2 * 0.5) * 0.5 + 0.5;
      caustic *= (0.045 - vDepthFactor) / 0.045;
      baseCol += vec3(caustic * 0.5, caustic * 0.75, caustic * 0.65);
    }

    // Bioluminescent glow in midnight/hadal zones
    if (vDepthFactor > 0.28 && uBioLum > 0.0) {
      float bio = sin(vWorldPos.x * 5.0 + uTime * 0.9 + vDepthFactor * 14.0) *
                  cos(vWorldPos.z * 4.0 + uTime * 0.7) * 0.5 + 0.5;
      bio *= uBioLum * (vDepthFactor - 0.28) / 0.72;
      baseCol += vec3(bio * 0.1, bio * 0.45, bio * 0.18);
    }

    // Selected depth probe plane glow
    float probeHighlight = smoothstep(0.02, 0.0, abs(vDepthFactor - uSelectedDepth));
    baseCol = mix(baseCol, vec3(1.0, 1.0, 0.85), probeHighlight * 0.8);

    // Edge vignette
    float edgeR = length(vec2(vWorldPos.x, vWorldPos.z)) / 1.65;
    float vignette = 1.0 - edgeR * 0.28;

    float opacity = mix(0.55, 0.82, vDepthFactor) * vignette + probeHighlight * 0.2;
    opacity = clamp(opacity, 0.0, 0.94);

    gl_FragColor = vec4(baseCol * vignette, opacity);
  }
`

// ─── 3D Continental Shelf & Coastal Landmass Component ────────────────────────
function ContinentalLandmass() {
  // Procedural continental shelf bathymetry geometry:
  // - Coastline / island mountain emerging above sea level (Y = 2.1 to 2.5)
  // - Shallow continental shelf (Y = 2.1 to 1.85, 0-200m depth)
  // - Steep continental slope dropping into abyssal floor (Y = 1.85 to -2.1)
  const landGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const width = 1.15
    const height = 4.45 // spans Y from -2.1 to +2.35
    const depth = 2.4
    const segX = 16
    const segY = 32

    const pos = []
    const uvs = []
    const indices = []

    for (let j = 0; j <= segY; j++) {
      const v = j / segY
      // Y goes from +2.35 (above sea level) down to -2.1 (deep trench)
      const y = 2.35 - v * 4.45

      for (let i = 0; i <= segX; i++) {
        const u = i / segX
        // Profile shape: continental shelf extends outward near surface, then drops steeply
        let shelfProfile = 0
        if (y > 2.1) {
          // Coastline / cliffs above sea level: rocky relief
          shelfProfile = 0.42 + Math.sin(u * Math.PI) * 0.12
        } else if (y > 1.85) {
          // Continental Shelf (0-200m): wide shallow terrace
          const t = (2.1 - y) / 0.25
          shelfProfile = 0.42 + t * 0.28
        } else if (y > 0.5) {
          // Continental Slope (200m-2000m): steep plunge
          const t = (1.85 - y) / 1.35
          shelfProfile = 0.70 - t * 0.45
        } else {
          // Abyssal plain / trench edge
          shelfProfile = 0.25 - ((0.5 - y) / 2.6) * 0.15
        }

        const x = -1.65 + u * width * (shelfProfile * 1.5)
        const z = (u - 0.5) * depth * 0.95

        pos.push(x, y, z)
        uvs.push(u, v)
      }
    }

    for (let j = 0; j < segY; j++) {
      for (let i = 0; i < segX; i++) {
        const a = j * (segX + 1) + i
        const b = a + 1
        const c = a + (segX + 1)
        const d = c + 1
        indices.push(a, b, c)
        indices.push(b, d, c)
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <group position={[0, 0, 0]}>
      {/* Landmass Terrain Surface */}
      <mesh geometry={landGeo}>
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.88}
          metalness={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Coastal Terrain Top Glint (above sea level) */}
      <mesh position={[-1.25, 2.25, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.7, 0.28, 1.8]} />
        <meshStandardMaterial color="#2d5032" roughness={0.9} />
      </mesh>

      {/* Bathymetric Depth Contour Wireframes (200m shelf break, 1000m slope, 4000m abyss) */}
      <group>
        {/* 200m Continental Shelf Break Contour */}
        <mesh position={[-1.0, 1.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.58, 32, 1, 0, Math.PI]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        {/* 1,000m Slope Contour */}
        <mesh position={[-1.2, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.45, 32, 1, 0, Math.PI]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        {/* 4,000m Abyssal Plain Contour */}
        <mesh position={[-1.4, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.33, 32, 1, 0, Math.PI]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

// ─── 3D Isosurface Shell Component ───────────────────────────────────────────
function IsosurfaceShell({ type, upwellingFactor }) {
  const meshRef = useRef()

  // Base Y height for the selected isosurface:
  // 15°C Thermocline: ~200m-400m depth -> Y in [1.65, 1.9]
  // 20°C Warm Shell: ~100m depth -> Y around 2.0
  // 4°C Abyssal Boundary: ~1000m depth -> Y around 1.3
  // 35 PSU Isohaline: ~300m depth -> Y around 1.75
  const baseConfig = useMemo(() => {
    switch (type) {
      case '15C':
        return { baseY: 1.80, color: '#f59e0b', label: '15.0°C THERMOCLINE ISOTHERM' }
      case '20C':
        return { baseY: 2.02, color: '#f97316', label: '20.0°C WARM LAYER ISOTHERM' }
      case '4C':
        return { baseY: 1.32, color: '#6366f1', label: '4.0°C DEEP WATER ISOTHERM' }
      case '35PSU':
        return { baseY: 1.72, color: '#14b8a6', label: '35.0 PSU ISOHALINE SHELL' }
      default:
        return null
    }
  }, [type])

  const isoGeo = useMemo(() => {
    if (!baseConfig) return null
    const geo = new THREE.PlaneGeometry(3.1, 1.8, 36, 24)
    return geo
  }, [baseConfig])

  useFrame((state) => {
    if (!meshRef.current || !baseConfig) return
    const t = state.clock.elapsedTime
    const pos = meshRef.current.geometry.attributes.position
    const p = pos.array

    // Dynamic wave undulation across the 3D isosurface shell:
    // Shoals upward near coastal land (X < 0) during active upwelling
    for (let i = 0; i < pos.count; i++) {
      const x = p[i * 3]
      const yOrig = p[i * 3 + 1]

      // Undulation + coastal upwelling slope
      const wave = Math.sin(x * 3.2 + t * 1.2) * 0.045 + Math.cos(yOrig * 4.0 + t * 0.9) * 0.03
      const coastalShoal = (x < 0 ? (-x / 1.5) * (0.12 * upwellingFactor) : 0)

      p[i * 3 + 2] = wave + coastalShoal
    }
    pos.needsUpdate = true
  })

  if (!baseConfig || !isoGeo) return null

  return (
    <group position={[0, baseConfig.baseY, 0.4]} rotation={[-Math.PI / 2.3, 0, 0]}>
      {/* Translucent Contoured Shell */}
      <mesh ref={meshRef} geometry={isoGeo}>
        <meshStandardMaterial
          color={baseConfig.color}
          transparent
          opacity={0.38}
          roughness={0.2}
          metalness={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe Contour Grid */}
      <mesh geometry={isoGeo} position={[0, 0, 0.002]}>
        <meshBasicMaterial
          color={baseConfig.color}
          wireframe
          transparent
          opacity={0.32}
        />
      </mesh>

      {/* Isosurface Luminous Rim */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[1.35, 1.42, 32, 1, 0, Math.PI]} />
        <meshBasicMaterial color={baseConfig.color} transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─── 3D Water Column Scene ────────────────────────────────────────────────────
function WaterColumnScene({
  depthM,
  bioLum,
  currentSpeed,
  sliceMode,
  slicePos,
  activeIsosurface,
  upwellingFactor,
  waveAmp,
}) {
  const shaderRef     = useRef()
  const probeRingRef  = useRef()
  const particlesRef  = useRef()
  const groupRef      = useRef()

  const TOTAL_H = 4.2
  const RADIUS  = 1.65

  const selectedDepthFactor = depthM / MAX_DEPTH

  // Generate particle pool with boundary layer deceleration near continental shelf
  const particleData = useMemo(() => {
    const COUNT = 1600
    const positions = new Float32Array(COUNT * 3)
    const meta = []

    for (let i = 0; i < COUNT; i++) {
      const angle  = Math.random() * Math.PI
      const r      = 0.08 + Math.random() * (RADIUS * 0.88)
      const depthF = Math.pow(Math.random(), 0.65)
      const baseY  = TOTAL_H / 2 - depthF * TOTAL_H

      const x = Math.cos(angle) * r
      const z = Math.abs(Math.sin(angle) * r)

      positions[i * 3]     = x
      positions[i * 3 + 1] = baseY
      positions[i * 3 + 2] = z

      // Base speed tied to depth + boundary friction near continental shelf (x < -0.4)
      const nearShelf = x < -0.4 ? 0.45 : 1.0
      const speed = (1.42 * Math.exp(-depthF * 4.0) + 0.0005) * (0.7 + Math.random() * 0.6) * nearShelf

      meta.push({ angle, r, baseY, depthF, speed, phase: Math.random() * Math.PI * 2 })
    }
    return { positions, meta, COUNT }
  }, [])

  const shaderUniforms = useMemo(() => ({
    uTime:          { value: 0 },
    uSelectedDepth: { value: 0 },
    uBioLum:        { value: 0 },
    uSliceMode:     { value: sliceMode === 'vertical' ? 1.0 : 0.0 },
    uSlicePos:      { value: slicePos },
    uWaveAmp:       { value: 1.0 },
  }), [])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = t
      shaderRef.current.uniforms.uSelectedDepth.value +=
        (selectedDepthFactor - shaderRef.current.uniforms.uSelectedDepth.value) * delta * 4
      shaderRef.current.uniforms.uBioLum.value +=
        (bioLum - shaderRef.current.uniforms.uBioLum.value) * delta * 3
      shaderRef.current.uniforms.uSliceMode.value = sliceMode === 'vertical' ? 1.0 : 0.0
      shaderRef.current.uniforms.uSlicePos.value = slicePos
      shaderRef.current.uniforms.uWaveAmp.value = waveAmp
    }

    // Animate probe depth ring
    if (probeRingRef.current) {
      const targetY = TOTAL_H / 2 - selectedDepthFactor * TOTAL_H
      probeRingRef.current.position.y += (targetY - probeRingRef.current.position.y) * delta * 6
      const pulse = 1 + Math.sin(t * 4) * 0.05
      probeRingRef.current.scale.set(pulse, 1, pulse)
    }

    // Animate current flow particles around continental shelf
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position
      const p   = pos.array
      const { meta } = particleData

      for (let i = 0; i < particleData.COUNT; i++) {
        const m = meta[i]
        // Flow deflection: particles accelerate during high flow and curve along shelf
        m.angle += delta * m.speed * (0.8 + waveAmp * 0.3)
        if (m.angle > Math.PI) m.angle -= Math.PI

        const wobble = Math.sin(t * 1.4 + m.phase) * 0.04
        const curR = m.r + wobble
        const x = Math.cos(m.angle) * curR
        const z = Math.abs(Math.sin(m.angle) * curR)

        // Coastal upwelling vertical lift for particles near shelf
        const upwellLift = x < -0.3 ? (Math.sin(t * 0.8 + m.phase) * 0.06 * upwellingFactor) : 0

        p[i * 3]     = x
        p[i * 3 + 1] = m.baseY + upwellLift
        p[i * 3 + 2] = z
      }
      pos.needsUpdate = true
    }

    // Gentle auto-tilt
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.06) * 0.12
    }
  })

  // Particle color based on depth (cyan -> violet -> red)
  const particleColors = useMemo(() => {
    const { COUNT, meta } = particleData
    const colors = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const d = meta[i].depthF
      let r, g, b
      if (d < 0.15)      { r=0.0; g=0.92; b=1.0 }
      else if (d < 0.35) { r=0.04; g=0.48; b=0.95 }
      else if (d < 0.55) { r=0.2;  g=0.12; b=0.80 }
      else if (d < 0.78) { r=0.42; g=0.04; b=0.55 }
      else               { r=0.65; g=0.02; b=0.12 }
      colors[i*3]   = r
      colors[i*3+1] = g
      colors[i*3+2] = b
    }
    return colors
  }, [particleData])

  return (
    <group ref={groupRef}>
      {/* 3D Continental Shelf & Landmass */}
      <ContinentalLandmass />

      {/* Main water column — half-cylinder with realistic shader */}
      <mesh>
        <cylinderGeometry args={[RADIUS, RADIUS, TOTAL_H, 64, 64, false, 0, Math.PI]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          uniforms={shaderUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Front cross-section face */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0.0, RADIUS, 64, 1, 0, Math.PI]} />
        <meshBasicMaterial color="#001830" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* 3D Isosurface Shell (e.g. 15°C Thermocline Isotherm) */}
      {activeIsosurface !== 'none' && (
        <IsosurfaceShell type={activeIsosurface} upwellingFactor={upwellingFactor} />
      )}

      {/* Depth Probe Ring with Planar Horizontal Slice Disc */}
      <group ref={probeRingRef} position={[0, TOTAL_H / 2, 0]}>
        {/* Outer glowing beacon ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[RADIUS - 0.05, RADIUS + 0.08, 64, 1, 0, Math.PI]} />
          <meshBasicMaterial color="#fffde7" transparent opacity={0.92} side={THREE.DoubleSide} />
        </mesh>

        {/* Planar Inspection Disc for Horizontal Slice View */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0, RADIUS - 0.02, 32, 1, 0, Math.PI]} />
          <meshBasicMaterial
            color={selectedDepthFactor > 0.5 ? '#a855f7' : selectedDepthFactor > 0.18 ? '#3b82f6' : '#00e5ff'}
            transparent
            opacity={sliceMode === 'horizontal' ? 0.35 : 0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Animated Current Flow Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleData.COUNT} array={particleData.positions.slice()} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={particleData.COUNT} array={particleColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Surface Sea Glint Cap */}
      <mesh position={[0, TOTAL_H / 2 - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, RADIUS, 64, 1, 0, Math.PI]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>

      {/* Hadal Floor Glow */}
      <mesh position={[0, -TOTAL_H / 2 + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, RADIUS * 0.7, 32, 1, 0, Math.PI]} />
        <meshBasicMaterial color="#b91c1c" transparent opacity={0.35} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Central Bathymetric Metric Axis */}
      <mesh>
        <cylinderGeometry args={[0.025, 0.025, TOTAL_H, 8]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

// ─── Gauge Bar Component ──────────────────────────────────────────────────────
function GaugeBar({ label, value, unit, pct, colorClass, icon, minLabel, maxLabel }) {
  return (
    <div className="ds2-gauge">
      <div className="ds2-gauge-header">
        <span className="ds2-gauge-icon">{icon}</span>
        <span className="ds2-gauge-label">{label}</span>
        <span className={`ds2-gauge-value ${colorClass}`}>
          {typeof value === 'number' ? value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0) : value}{' '}
          <span className="ds2-gauge-unit">{unit}</span>
        </span>
      </div>
      <div className="ds2-gauge-track">
        <div className={`ds2-gauge-fill ds2-fill-${colorClass}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <div className="ds2-gauge-scale">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

// ─── Main Exported Component ──────────────────────────────────────────────────
export default function OceanDepthSlicer({ heroMode = false }) {
  const [depthM, setDepthM]                   = useState(0)
  const [sliceMode, setSliceMode]             = useState('horizontal') // 'horizontal' | 'vertical'
  const [verticalSlicePos, setVerticalSlicePos]= useState(0.85) // 0 to 1 along Z
  const [activeIsosurface, setActiveIsosurface]= useState('15C')       // 'none' | '15C' | '20C' | '4C' | '35PSU'
  
  // Timeline player state
  const [isPlaying, setIsPlaying]             = useState(false)
  const [timelineMonth, setTimelineMonth]     = useState(6)            // Default: July (Summer Upwelling)
  const [playSpeed, setPlaySpeed]             = useState(1)            // 1x, 2x

  // Auto-play timeline loop
  useEffect(() => {
    if (!isPlaying) return
    const intervalTime = 2200 / playSpeed
    const timer = setInterval(() => {
      setTimelineMonth(prev => (prev + 1) % 12)
    }, intervalTime)
    return () => clearInterval(timer)
  }, [isPlaying, playSpeed])

  // Get effective data interpolated across depth and seasonal cycle
  const data = useMemo(() => {
    return getEffectiveProfile(depthM, timelineMonth)
  }, [depthM, timelineMonth])

  const depthFactor = depthM / MAX_DEPTH

  // Calculate gauge fill percentages
  const tempPct  = Math.max(0, Math.min(100, ((data.temp - 1.1) / (28.4 - 1.1)) * 100))
  const flowPct  = Math.max(0, Math.min(100, ((data.currentSpeed - 0.0005) / (2.2 - 0.0005)) * 100))
  const salinPct = Math.max(0, Math.min(100, ((data.salinity - 34.0) / (36.0 - 34.0)) * 100))
  const oxyPct   = Math.max(0, Math.min(100, ((data.oxygen - 20) / (220 - 20)) * 100))
  const pressPct = Math.max(0, Math.min(100, (data.pressure / 1086) * 100))

  const handleSlider = useCallback((e) => {
    setDepthM(Number(e.target.value))
  }, [])

  const PRESETS = [0, 100, 200, 500, 1000, 2000, 4000, 11034]

  return (
    <div className={`ds2-root ${heroMode ? 'ds2-hero-mode' : ''}`}>
      {/* ── Slicer Header ── */}
      <div className="ds2-header">
        <div className="ds2-header-left">
          <span className="ds2-live-dot" />
          <div>
            <div className="ds2-title">3D OCEAN DEPTH SLICER & TRANSECT</div>
            <div className="ds2-subtitle">
              Interactive 3D continental margin · Depth-slice views · 3D Isosurfaces · Seasonal timeline
            </div>
          </div>
        </div>
        <div className="ds2-zone-chip" style={{ '--zc': depthFactor > 0.5 ? '#a855f7' : depthFactor > 0.18 ? '#3b82f6' : '#00e5ff' }}>
          <span className="ds2-zone-depth">{depthM >= 1000 ? `${(depthM/1000).toFixed(2)}km` : `${depthM}m`}</span>
          <span className="ds2-zone-name">{data.zone}</span>
        </div>
      </div>

      {/* ── Multi-Feature Controls Bar: Slice Mode + Isosurfaces ── */}
      <div className="ds2-toolbar">
        {/* Feature 1: Depth-Slice View Mode Toggle */}
        <div className="ds2-control-group">
          <span className="ds2-group-title">SLICE VIEW</span>
          <div className="ds2-pill-toggle">
            <button
              className={`ds2-pill-btn ${sliceMode === 'horizontal' ? 'active' : ''}`}
              onClick={() => setSliceMode('horizontal')}
              title="Cut horizontally across depth layers"
            >
              HORIZONTAL SLICE
            </button>
            <button
              className={`ds2-pill-btn ${sliceMode === 'vertical' ? 'active' : ''}`}
              onClick={() => setSliceMode('vertical')}
              title="Vertical cross-section from coast to trench"
            >
              VERTICAL TRANSECT
            </button>
          </div>
        </div>

        {/* Feature 2: 3D Isosurface Shell Selector */}
        <div className="ds2-control-group">
          <span className="ds2-group-title">3D ISOSURFACES</span>
          <div className="ds2-iso-pills">
            <button
              className={`ds2-iso-btn ${activeIsosurface === 'none' ? 'active' : ''}`}
              onClick={() => setActiveIsosurface('none')}
            >
              OFF
            </button>
            <button
              className={`ds2-iso-btn ${activeIsosurface === '15C' ? 'active' : ''}`}
              onClick={() => setActiveIsosurface('15C')}
              title="15°C Thermocline Boundary Shell"
            >
              15°C ISOTHERM
            </button>
            <button
              className={`ds2-iso-btn ${activeIsosurface === '20C' ? 'active' : ''}`}
              onClick={() => setActiveIsosurface('20C')}
              title="20°C Warm Surface Layer"
            >
              20°C WARM
            </button>
            <button
              className={`ds2-iso-btn ${activeIsosurface === '4C' ? 'active' : ''}`}
              onClick={() => setActiveIsosurface('4C')}
              title="4°C Deep Abyssal Boundary"
            >
              4°C DEEP
            </button>
            <button
              className={`ds2-iso-btn ${activeIsosurface === '35PSU' ? 'active' : ''}`}
              onClick={() => setActiveIsosurface('35PSU')}
              title="35.0 PSU Salinity Shell"
            >
              35 PSU
            </button>
          </div>
        </div>
      </div>

      {/* ── Feature 3: Time-Step Animation Timeline Bar ── */}
      <div className="ds2-timeline-bar">
        <div className="ds2-timeline-left">
          <button
            className={`ds2-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause timeline animation' : 'Play seasonal timeline animation'}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>
          <div className="ds2-speed-toggles">
            <button className={`ds2-speed-btn ${playSpeed === 1 ? 'active' : ''}`} onClick={() => setPlaySpeed(1)}>1x</button>
            <button className={`ds2-speed-btn ${playSpeed === 2 ? 'active' : ''}`} onClick={() => setPlaySpeed(2)}>2x</button>
          </div>
        </div>

        {/* Month Scrubbing Ticker */}
        <div className="ds2-months-track">
          {SEASONAL_DATA.map((s, idx) => (
            <button
              key={s.month}
              className={`ds2-month-pill ${timelineMonth === idx ? 'active' : ''}`}
              onClick={() => { setTimelineMonth(idx); setIsPlaying(false) }}
            >
              {s.month}
            </button>
          ))}
        </div>

        {/* Active Seasonal Phase Description */}
        <div className="ds2-season-badge">
          <span className="ds2-season-dot" />
          <span className="ds2-season-text">{data.seasonInfo.name}: {data.seasonInfo.season}</span>
        </div>
      </div>

      {/* ── Slicer Body: Split 3D Canvas & Data Column ── */}
      <div className="ds2-body">
        {/* Left: 3D WebGL Water Column & Continental Margin */}
        <div className="ds2-canvas-col">
          <div className="ds2-canvas-wrap">
            <Canvas
              camera={{ position: [2.5, 0.7, 4.1], fov: 40 }}
              gl={{ antialias: true, alpha: true }}
              style={{ width: '100%', height: '100%' }}
            >
              <ambientLight intensity={0.8} />
              <directionalLight position={[4, 9, 5]}   intensity={2.2} color="#b3f0ff" />
              <directionalLight position={[-4, -3, -2]} intensity={0.9} color="#7c3aed" />
              <pointLight position={[0, -3.5, 1]} intensity={1.8} color="#dc2626" distance={6} decay={2} />
              <pointLight position={[0, 3.5, 1]}  intensity={1.2} color="#00e5ff" distance={6} decay={2} />

              <WaterColumnScene
                depthM={depthM}
                bioLum={data.bioLum}
                currentSpeed={data.currentSpeed}
                sliceMode={sliceMode}
                slicePos={verticalSlicePos}
                activeIsosurface={activeIsosurface}
                upwellingFactor={data.seasonInfo.upwelling}
                waveAmp={data.seasonInfo.flowMult}
              />
              <OrbitControls enableZoom minDistance={3} maxDistance={9} enablePan={false} dampingFactor={0.08} enableDamping />
            </Canvas>

            {/* In-Canvas HUD Overlays */}
            <div className="ds2-canvas-label ds2-label-top">COASTAL SHELF · 0m</div>
            <div className="ds2-canvas-label ds2-label-bottom">CHALLENGER TRENCH · 11,034m</div>
            <div className="ds2-probe-label" style={{ top: `${8 + depthFactor * 78}%` }}>
              <span className="ds2-probe-arrow">▶</span>
              <span>{depthM >= 1000 ? `${(depthM/1000).toFixed(2)} km` : `${depthM} m`}</span>
            </div>
            {activeIsosurface !== 'none' && (
              <div className="ds2-iso-active-tag">
                <span>⚡ {activeIsosurface === '15C' ? '15°C THERMOCLINE' : activeIsosurface === '20C' ? '20°C WARM SHELL' : activeIsosurface === '4C' ? '4°C ABYSSAL' : '35 PSU ISOHALINE'} ACTIVE</span>
              </div>
            )}
          </div>

          {/* Depth / Transect Slider */}
          <div className="ds2-slider-panel">
            <div className="ds2-slider-labels">
              <span>{sliceMode === 'horizontal' ? '0m (Surface Shelf)' : 'Coast (W)'}</span>
              <span style={{ color: '#00e5ff' }}>
                {sliceMode === 'horizontal' ? '↓ Drag to slice depth layer' : '⇄ Drag to slice vertical transect'}
              </span>
              <span>{sliceMode === 'horizontal' ? '11,034m (Hadal Trench)' : 'Abyss (E)'}</span>
            </div>
            
            {sliceMode === 'horizontal' ? (
              <input
                type="range"
                min={0}
                max={MAX_DEPTH}
                step={10}
                value={depthM}
                onChange={handleSlider}
                className="ds2-depth-slider"
              />
            ) : (
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.01}
                value={verticalSlicePos}
                onChange={(e) => setVerticalSlicePos(Number(e.target.value))}
                className="ds2-depth-slider"
              />
            )}

            {sliceMode === 'horizontal' && (
              <div className="ds2-preset-buttons">
                {PRESETS.map(d => (
                  <button
                    key={d}
                    className={`ds2-preset-btn ${depthM === d ? 'active' : ''}`}
                    onClick={() => setDepthM(d)}
                  >
                    {d >= 1000 ? `${d/1000}km` : `${d}m`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Data Gauges & Seasonal Ocean Physics */}
        <div className="ds2-data-col">
          {/* Zone Overview Card */}
          <div className="ds2-zone-card" style={{ '--zc': depthFactor > 0.5 ? '#7c3aed' : depthFactor > 0.18 ? '#2563eb' : '#0ea5e9' }}>
            <div className="ds2-zone-card-depth">{depthM.toLocaleString()} m</div>
            <div className="ds2-zone-card-label">{data.label}</div>
            <div className="ds2-zone-card-zone">{data.zone} · {data.seasonInfo.name}</div>
            <div className="ds2-zone-card-pressure">
              <span className="ds2-pres-num">{data.pressure.toFixed(0)}</span>
              <span className="ds2-pres-unit">ATM HYDROSTATIC</span>
            </div>
          </div>

          {/* Live Data Gauges */}
          <div className="ds2-gauges">
            <GaugeBar
              label="WATER TEMPERATURE"
              value={data.temp} unit="°C"
              pct={tempPct}
              colorClass="temp"
              icon="🌡️"
              minLabel="1.1°C (Abyss)"
              maxLabel="28.4°C (Surface)"
            />
            <GaugeBar
              label="CURRENT FLOW SPEED"
              value={data.currentSpeed} unit="m/s"
              pct={flowPct}
              colorClass="flow"
              icon="🌀"
              minLabel="0.001 m/s (Hadal)"
              maxLabel="2.20 m/s (Monsoon Jet)"
            />
            <GaugeBar
              label="SALINITY"
              value={data.salinity} unit="PSU"
              pct={salinPct}
              colorClass="salin"
              icon="🧂"
              minLabel="34.0 PSU"
              maxLabel="36.0 PSU"
            />
            <GaugeBar
              label="DISSOLVED OXYGEN"
              value={data.oxygen} unit="µmol/kg"
              pct={oxyPct}
              colorClass="oxy"
              icon="💧"
              minLabel="20 µmol (OMZ)"
              maxLabel="215 µmol (Surface)"
            />
            <GaugeBar
              label="HYDROSTATIC PRESSURE"
              value={data.pressure} unit="ATM"
              pct={pressPct}
              colorClass="pres"
              icon="⚡"
              minLabel="1.0 atm"
              maxLabel="1,086 atm"
            />
          </div>

          {/* Bioluminescence & Upwelling Status Bar */}
          <div className="ds2-biolum-bar">
            <div className="ds2-status-pair">
              <span className="ds2-biolum-label">🌟 BIOLUMINESCENCE</span>
              <span className="ds2-biolum-val">{(data.bioLum * 100).toFixed(0)}%</span>
            </div>
            <div className="ds2-status-pair">
              <span className="ds2-biolum-label">🌊 UPWELLING INDEX</span>
              <span className="ds2-biolum-val" style={{ color: '#38bdf8' }}>{(data.seasonInfo.upwelling * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

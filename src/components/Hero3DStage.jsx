// src/components/Hero3DStage.jsx
// Interactive 3D WebGL Digital Twin Hero Canvas
import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float } from '@react-three/drei'
import * as THREE from 'three'

// Mode 1: 3D Holographic Earth with Bathymetric Ring Grids & Orbiting Instruments
function HolographicGlobe({ isHovered }) {
  const globeGroupRef = useRef()
  const atmosphereRef = useRef()
  const ringGroupRef = useRef()
  const particlesRef = useRef()

  // Generate glowing continental dots on sphere surface
  const dotsData = useMemo(() => {
    const count = 750
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const colorA = new THREE.Color('#00e5ff')
    const colorB = new THREE.Color('#38bdf8')
    const colorC = new THREE.Color('#00ffaa')

    for (let i = 0; i < count; i++) {
      // Golden spiral distribution on sphere
      const phi = Math.acos(1 - 2 * (i + 0.5) / count)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i

      const r = 1.6
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.cos(phi)
      const z = r * Math.sin(phi) * Math.sin(theta)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const col = i % 3 === 0 ? colorA : (i % 3 === 1 ? colorB : colorC)
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    return { positions, colors }
  }, [])

  // Orbiting instrument beacons (Argo & Gliders)
  const orbitingInstruments = useMemo(() => [
    { radius: 1.95, speed: 0.8, tilt: 0.35, color: '#00e5ff', label: 'Argo IN-2401' },
    { radius: 2.15, speed: -0.6, tilt: -0.45, color: '#00ffaa', label: 'Seaglider SGA-21' },
    { radius: 1.85, speed: 1.1, tilt: 0.75, color: '#ec4899', label: 'BGC Float BF-12' },
  ], [])

  useFrame((state, delta) => {
    if (globeGroupRef.current) {
      // Continuous smooth planetary rotation, speeding slightly on hover
      const rotSpeed = isHovered ? 0.35 : 0.2
      globeGroupRef.current.rotation.y += delta * rotSpeed
      globeGroupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.08
    }
    if (ringGroupRef.current) {
      ringGroupRef.current.rotation.z += delta * 0.15
    }
    if (atmosphereRef.current) {
      const scale = 1.68 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02
      atmosphereRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <group ref={globeGroupRef}>
      {/* Deep Ocean Core Sphere */}
      <mesh>
        <sphereGeometry args={[1.56, 48, 48]} />
        <meshStandardMaterial
          color="#02162e"
          roughness={0.65}
          metalness={0.2}
          wireframe={false}
        />
      </mesh>

      {/* Bathymetric Wireframe Grid Shell */}
      <mesh>
        <sphereGeometry args={[1.58, 32, 24]} />
        <meshBasicMaterial
          color="#0066aa"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Surface Bathymetry / Continental Particle Matrix */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={dotsData.positions.length / 3}
            array={dotsData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={dotsData.colors.length / 3}
            array={dotsData.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.042}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
        />
      </points>

      {/* Glowing Equatorial Current Ring */}
      <group ref={ringGroupRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.72, 1.76, 64]} />
          <meshBasicMaterial
            color="#00e5ff"
            side={THREE.DoubleSide}
            transparent
            opacity={0.55}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.3, 0.4, 0]}>
          <ringGeometry args={[1.88, 1.90, 64]} />
          <meshBasicMaterial
            color="#00ffaa"
            side={THREE.DoubleSide}
            transparent
            opacity={0.35}
          />
        </mesh>
      </group>

      {/* Orbiting Autonomous Instrument Beacons */}
      {orbitingInstruments.map((inst, idx) => (
        <OrbitingBeacon key={idx} {...inst} />
      ))}

      {/* Bioluminescent Outer Atmospheric Halo */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#00aaff"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// Single Orbiting Beacon with Telemetry Pulse
function OrbitingBeacon({ radius, speed, tilt, color }) {
  const beaconRef = useRef()
  const pulseRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed
    const x = Math.cos(t) * radius
    const z = Math.sin(t) * radius
    const y = Math.sin(t + tilt) * 0.4

    if (beaconRef.current) {
      beaconRef.current.position.set(x, y, z)
    }
    if (pulseRef.current) {
      const pScale = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.4
      pulseRef.current.scale.set(pScale, pScale, pScale)
    }
  })

  return (
    <group ref={beaconRef}>
      {/* Core instrument dot */}
      <mesh>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Pulsing signal halo */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} wireframe />
      </mesh>
    </group>
  )
}

// Mode 2: 3D Bathymetry Trench Laser Scanner (Mariana & Java Trench Relief)
function BathymetricTrenchScanner({ isHovered }) {
  const meshRef = useRef()
  const laserRef = useRef()

  // Generate an undulating 3D ocean floor mesh with trench canyon
  const { geometry } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(3.6, 3.6, 48, 48)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      // Deep trench fissure down the center
      const distToFissure = Math.abs(x - 0.2 * Math.sin(y * 2.5))
      let depth = -Math.exp(-distToFissure * 2.8) * 1.1
      // Add sea-mount topography & undulating hills
      depth += Math.sin(x * 3 + y * 2) * 0.12 + Math.cos(x * 5 - y * 3) * 0.07
      pos.setZ(i, depth)
    }
    geo.computeVertexNormals()
    return { geometry: geo }
  }, [])

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.05
    }
    if (laserRef.current) {
      // Laser scan sweep moving back and forth across trench
      const scanY = Math.sin(state.clock.elapsedTime * 1.4) * 1.6
      laserRef.current.position.y = scanY
    }
  })

  return (
    <group rotation={[-Math.PI / 3, 0, 0]} position={[0, -0.2, 0]}>
      {/* Bathymetric Trench Surface */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color="#062947"
          wireframe
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Solid Shaded Depth Layer under wireframe */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#010e1f"
          roughness={0.8}
          metalness={0.1}
          polygonOffset
          polygonOffsetFactor={1}
        />
      </mesh>

      {/* Dynamic Laser Sonar Beam Scanner Plane */}
      <group ref={laserRef}>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[3.8, 0.08]} />
          <meshBasicMaterial color="#00ffaa" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[3.8, 0.35]} />
          <meshBasicMaterial color="#00ffaa" transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

// Mode 3: 3D Ocean Current Vortex & Hydrodynamic Streamlines
function CurrentVortex({ isHovered }) {
  const particlesRef = useRef()

  const { positions, velocities, originalData } = useMemo(() => {
    const count = 1200
    const pos = new Float32Array(count * 3)
    const vel = []
    const orig = []

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.3 + Math.random() * 1.6
      const height = (Math.random() - 0.5) * 0.8

      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = height
      pos[i * 3 + 2] = Math.sin(angle) * radius

      orig.push({ angle, radius, height, speed: (2.2 / (radius + 0.3)) * (0.8 + Math.random() * 0.4) })
    }
    return { positions: pos, velocities: vel, originalData: orig }
  }, [])

  useFrame((state, delta) => {
    if (!particlesRef.current) return
    const posAttr = particlesRef.current.geometry.attributes.position
    const p = posAttr.array
    const time = state.clock.elapsedTime

    for (let i = 0; i < originalData.length; i++) {
      const item = originalData[i]
      item.angle += delta * item.speed * 0.6
      const wobble = Math.sin(time * 2 + item.radius * 3) * 0.05

      p[i * 3] = Math.cos(item.angle) * (item.radius + wobble)
      p[i * 3 + 1] = item.height + Math.sin(item.angle * 2) * 0.08
      p[i * 3 + 2] = Math.sin(item.angle) * (item.radius + wobble)
    }
    posAttr.needsUpdate = true
    particlesRef.current.rotation.y += delta * 0.1
  })

  return (
    <group rotation={[0.4, 0, 0]}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.038}
          color="#00e5ff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Center vortex core glow */}
      <mesh>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial color="#00ffaa" transparent opacity={0.4} wireframe />
      </mesh>
    </group>
  )
}

export default function Hero3DStage({ onLaunchGlobe }) {
  const [activeMode, setActiveMode] = useState('globe') // 'globe' | 'trench' | 'vortex'
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="hero-3d-stage-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Interactive Mode Tabs */}
      <div className="stage-mode-toolbar">
        <button
          className={`stage-mode-tab ${activeMode === 'globe' ? 'active' : ''}`}
          onClick={() => setActiveMode('globe')}
        >
          <span className="mode-tab-dot" />
          <span>HOLO-GLOBE</span>
        </button>
        <button
          className={`stage-mode-tab ${activeMode === 'trench' ? 'active' : ''}`}
          onClick={() => setActiveMode('trench')}
        >
          <span className="mode-tab-dot" />
          <span>BATHYMETRY TRENCH</span>
        </button>
        <button
          className={`stage-mode-tab ${activeMode === 'vortex' ? 'active' : ''}`}
          onClick={() => setActiveMode('vortex')}
        >
          <span className="mode-tab-dot" />
          <span>CURRENT VORTEX</span>
        </button>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="stage-canvas-wrapper">
        <Canvas
          camera={{ position: [0, 0.4, 4.2], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 8, 5]} intensity={2.2} color="#99e5ff" />
          <directionalLight position={[-5, -4, -3]} intensity={1.0} color="#00ffaa" />

          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
            {activeMode === 'globe' && <HolographicGlobe isHovered={isHovered} />}
            {activeMode === 'trench' && <BathymetricTrenchScanner isHovered={isHovered} />}
            {activeMode === 'vortex' && <CurrentVortex isHovered={isHovered} />}
          </Float>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            rotateSpeed={0.65}
            dampingFactor={0.06}
            autoRotate={false}
          />
        </Canvas>
      </div>

      {/* Stage Bottom Interactive HUD Bar */}
      <div className="stage-hud-overlay">
        <div className="stage-hud-meta">
          <span className="hud-badge">LIVE 3D DIGITAL TWIN</span>
          <span className="hud-info">
            {activeMode === 'globe' && '360° Geostrophic Circulation & Beacons · Drag to Rotate'}
            {activeMode === 'trench' && 'Challenger Deep · Subsea Topography Scanner'}
            {activeMode === 'vortex' && 'Stommel Geostrophic Boundary Swirl Simulation'}
          </span>
        </div>
        <button className="stage-launch-full-btn" onClick={onLaunchGlobe}>
          <span>Enter Full 3D Globe</span>
          <span className="arrow-sym">➔</span>
        </button>
      </div>
    </div>
  )
}

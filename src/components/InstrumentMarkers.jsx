// src/components/InstrumentMarkers.jsx
// Glowing 3D instrument pins on the globe – click to see full instrument details
import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import useOceanStore from '../store/oceanStore'
import { ALL_INSTRUMENTS, INSTRUMENT_TYPE_META, INSTRUMENT_LEGEND } from '../data/instrumentDatabase'

// lat/lon → 3D sphere point
function latLonToSphere(lat, lon, radius = 1.525) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  )
}

// lat/lon → flat map XY position (equirectangular)
function latLonToFlat(lat, lon) {
  const x = (lon / 180) * Math.PI * 1.6
  const y = (lat / 90)  * Math.PI * 0.8
  return new THREE.Vector3(x, y, 0.05)
}

const markerVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const markerFragmentShader = `
  uniform vec3 u_color;
  uniform float u_time;
  uniform float u_selected;
  uniform float u_hovered;
  varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center) * 2.0;

    // Solid core with bright center highlight in instrument category color
    vec3 coreColor = mix(u_color, vec3(1.0, 1.0, 1.0), 0.55);
    float core = 1.0 - smoothstep(0.12, 0.22, dist);

    // Inner pulsing beacon ring in category color
    float pulse = sin(u_time * 3.5) * 0.5 + 0.5;
    float ring1 = smoothstep(0.26, 0.32, dist) - smoothstep(0.38, 0.44, dist);
    vec3 ring1Color = mix(u_color, vec3(1.0, 1.0, 1.0), 0.35);

    // Compact expanding radar sweep in category color (dissipates gracefully before quad edge)
    float phase = fract(u_time * 0.65);
    float expandRadius = mix(0.38, 0.72, phase);
    float ring2Width = 0.045 * (1.0 - phase);
    float ring2 = smoothstep(expandRadius - ring2Width, expandRadius, dist) -
                  smoothstep(expandRadius, expandRadius + ring2Width, dist);
    vec3 ring2Color = mix(u_color, vec3(1.0, 1.0, 1.0), 0.25);

    // Soft ambient glow halo
    float halo = (1.0 - smoothstep(0.0, 0.78, dist)) * 0.35;

    vec3 finalColor = (core * coreColor * 1.6 + ring1 * (pulse * 0.8 + 0.4) * ring1Color * 1.4 + ring2 * (1.0 - phase * 0.8) * ring2Color * 1.5 + halo * u_color * 0.8) * 1.35;
    float alpha = core * 1.2 + ring1 * (pulse * 0.8 + 0.4) + ring2 * (1.0 - phase * 0.8) + halo * 0.45;

    if (u_selected > 0.5) {
      finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), 0.35) * 2.5;
      alpha += smoothstep(0.75, 0.0, dist) * 0.6;
    } else if (u_hovered > 0.5) {
      finalColor *= 1.8;
      alpha += 0.35;
    }

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(finalColor, min(alpha, 1.0));
  }
`

// ── Rich Info Popup (rendered as bottom-right corner fixed overlay) ─────────
function InfoPopup({ instrument, onClose }) {
  const meta = INSTRUMENT_TYPE_META[instrument.type] || {}
  const col = instrument.color
  const userDataset = useOceanStore(s => s.userDataset)
  const bottomOffset = userDataset ? '144px' : '80px'

  const statusColor = instrument.status === 'active' ? '#00f5a0' : '#ffd700'

  // Build type-specific fields
  const fields = []

  // Common fields
  fields.push({ label: 'Coordinates', value: `${instrument.lat.toFixed(2)}°N, ${instrument.lon.toFixed(2)}°E` })
  fields.push({ label: 'Status', value: instrument.status?.toUpperCase(), valueColor: statusColor })
  fields.push({ label: 'Last Ping', value: instrument.lastPing })
  fields.push({ label: 'Deployed By', value: instrument.deployedBy })
  fields.push({ label: 'Deploy Date', value: instrument.deployDate })
  fields.push({ label: 'Mission', value: instrument.mission })
  fields.push({ label: 'Manufacturer', value: instrument.manufacturer })
  fields.push({ label: 'Model', value: instrument.model })
  fields.push({ label: 'Max Depth', value: `${instrument.maxDepth} m` })
  fields.push({ label: 'Sensors', value: instrument.sensors?.join(', ') })

  // Argo / BGC float fields
  if (instrument.cycleNumber !== undefined) {
    fields.push({ label: 'Cycle #', value: instrument.cycleNumber })
    fields.push({ label: 'Park Depth', value: `${instrument.parkDepth} m` })
    fields.push({ label: 'Profile Interval', value: instrument.profileInterval })
    fields.push({ label: 'Battery Life', value: instrument.batteryLife, valueColor: instrument.batteryLife && parseInt(instrument.batteryLife) < 20 ? '#ff4444' : '#00f5a0' })
    fields.push({ label: 'Data Transmitted', value: instrument.dataTransmitted })
  }

  // BGC extra
  if (instrument.surfaceNitrate !== undefined) {
    fields.push({ label: 'Surface Nitrate', value: `${instrument.surfaceNitrate} µmol/L` })
    fields.push({ label: 'Surface Chl-a', value: `${instrument.surfaceChlorophyll} mg/m³` })
    fields.push({ label: 'Surface pH', value: instrument.surfacePH })
  }

  // Glider fields
  if (instrument.speed !== undefined) {
    fields.push({ label: 'Speed', value: instrument.speed })
    fields.push({ label: 'Endurance', value: instrument.endurance })
    fields.push({ label: 'Heading', value: instrument.heading })
    fields.push({ label: 'Dives', value: instrument.dives })
    fields.push({ label: 'Distance', value: instrument.distanceTravelled })
    fields.push({ label: 'Battery Life', value: instrument.batteryLife, valueColor: instrument.batteryLife && parseInt(instrument.batteryLife) < 20 ? '#ff4444' : '#00f5a0' })
  }

  // CTD fields
  if (instrument.ship !== undefined) {
    fields.push({ label: 'Ship', value: instrument.ship })
    fields.push({ label: 'Cruise', value: instrument.cruise })
    fields.push({ label: 'Current Station', value: instrument.currentStation })
    fields.push({ label: 'Cast Depth', value: `${instrument.castDepth} m` })
    fields.push({ label: 'Stations Done', value: instrument.stationsCompleted })
    fields.push({ label: 'Bottles Fired', value: instrument.bottlesFired })
    fields.push({ label: 'Sampling Rate', value: instrument.samplingRate })
    fields.push({ label: 'Accuracy', value: instrument.accuracy })
  }

  // Surface measurements (always)
  fields.push({ label: 'Surface Temp', value: `${instrument.surfaceTemp} °C`, valueColor: '#ff6b35' })
  fields.push({ label: 'Surface Salinity', value: `${instrument.surfaceSalinity} PSU`, valueColor: '#00d4ff' })
  fields.push({ label: 'Surface O₂', value: `${instrument.surfaceOxygen} µmol/L`, valueColor: '#00f5a0' })
  fields.push({ label: 'Current Depth', value: `${instrument.currentDepth} m` })

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        right: '24px',
        width: '330px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, rgba(3,12,28,0.98) 0%, rgba(5,20,45,0.98) 100%)',
        backdropFilter: 'blur(20px)',
        border: `1.5px solid ${col}55`,
        borderRadius: '14px',
        boxShadow: `0 0 30px ${col}33, 0 8px 40px rgba(0,0,0,0.8)`,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        overflow: 'hidden',
        zIndex: 1000,
        pointerEvents: 'all',
        animation: 'infoBarSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes infoBarSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ifield:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${col}22, ${col}08)`,
        borderBottom: `1px solid ${col}33`,
        padding: '12px 14px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '22px' }}>{meta.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: col, fontWeight: 700, fontSize: '13px', letterSpacing: '0.3px' }}>
            {instrument.name}
          </div>
          <div style={{ color: 'rgba(160,210,240,0.65)', fontSize: '10px', marginTop: '1px' }}>
            {meta.label} · {meta.description}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${col}33`,
            borderRadius: '50%',
            width: '24px', height: '24px',
            color: 'rgba(200,230,255,0.7)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(200,230,255,0.7)' }}
        >✕</button>
      </div>

      {/* Fields */}
      <div style={{
        flex: 1,
        maxHeight: '340px',
        overflowY: 'auto',
        padding: '6px 0',
        scrollbarWidth: 'thin',
        scrollbarColor: `${col}44 transparent`,
      }}>
        {fields.map(({ label, value, valueColor }) => value !== undefined && (
          <div key={label} className="ifield" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '4px 14px',
            gap: '8px',
            borderRadius: '4px',
            margin: '1px 4px',
            transition: 'background 0.15s',
          }}>
            <span style={{ color: 'rgba(130,175,210,0.65)', fontSize: '10.5px', flexShrink: 0 }}>{label}</span>
            <span style={{
              color: valueColor || 'rgba(220,240,255,0.9)',
              fontSize: '10.5px',
              fontWeight: 500,
              textAlign: 'right',
              wordBreak: 'break-word',
              maxWidth: '180px',
            }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${col}22`,
        padding: '7px 14px',
        fontSize: '9.5px',
        color: 'rgba(100,160,200,0.45)',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        INCOIS · NetCDF CF Convention · Real-time telemetry
      </div>
    </div>
  )
}

// ── Exported 2D overlay component for the bottom-right corner ───────────────
export function InstrumentInfoBar() {
  const selectedInstrument = useOceanStore(s => s.selectedInstrument)
  const selectInstrument = useOceanStore(s => s.selectInstrument)
  const showInstruments = useOceanStore(s => s.showInstruments)

  if (!showInstruments || !selectedInstrument) return null

  return (
    <InfoPopup
      instrument={selectedInstrument}
      onClose={() => selectInstrument(null)}
    />
  )
}

// ── Floating Category Legend Bar (bottom-left of globe) ─────────────────────
export function InstrumentLegendBar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const showInstruments = useOceanStore(s => s.showInstruments)
  const isSidebarCollapsed = useOceanStore(s => s.isSidebarCollapsed)
  const showArgo = useOceanStore(s => s.showArgo ?? true)
  const showGliders = useOceanStore(s => s.showGliders ?? true)
  const showCTD = useOceanStore(s => s.showCTD ?? true)
  const showBGC = useOceanStore(s => s.showBGC ?? true)
  const setShowArgo = useOceanStore(s => s.setShowArgo)
  const setShowGliders = useOceanStore(s => s.setShowGliders)
  const setShowCTD = useOceanStore(s => s.setShowCTD)
  const setShowBGC = useOceanStore(s => s.setShowBGC)

  const userDataset = useOceanStore(s => s.userDataset)
  const bottomOffset = userDataset ? '84px' : '8px'
  const leftPos = 'auto'

  if (!showInstruments) return null

  const toggleType = (type) => {
    if (type === 'argo') setShowArgo(!showArgo)
    else if (type === 'glider') setShowGliders(!showGliders)
    else if (type === 'ctd') setShowCTD(!showCTD)
    else if (type === 'bgc') setShowBGC(!showBGC)
  }

  const getTypeActive = (type) => {
    if (type === 'argo') return showArgo
    if (type === 'glider') return showGliders
    if (type === 'ctd') return showCTD
    if (type === 'bgc') return showBGC
    return true
  }

  const activeCount = [showArgo, showGliders, showCTD, showBGC].filter(Boolean).length

  // Collapsed compact pill
  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        title="Click to extend observation network layers"
        style={{
          position: 'static',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(4, 15, 32, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 212, 255, 0.28)',
          borderRadius: '30px',
          padding: '6px 14px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65), 0 0 15px rgba(0, 212, 255, 0.1)',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          userSelect: 'none',
          transition: 'transform 0.15s, background 0.2s',
          pointerEvents: 'auto',
          animation: 'infoBarSlideIn 0.3s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6, 22, 45, 0.95)'; e.currentTarget.style.borderColor = '#00d4ff' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(4, 15, 32, 0.88)'; e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.28)' }}
      >
        <span style={{ fontSize: '13px' }}>📡</span>
        <span style={{ fontSize: '11px', color: '#e0f4ff', fontWeight: 600, letterSpacing: '0.2px' }}>
          Network Layers
        </span>
        <span style={{
          fontSize: '9.5px',
          background: 'rgba(0, 212, 255, 0.2)',
          color: '#00e5ff',
          padding: '2px 7px',
          borderRadius: '10px',
          fontWeight: 700,
          border: '1px solid rgba(0, 212, 255, 0.4)'
        }}>
          {activeCount}/4 Active
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(0, 212, 255, 0.7)' }}>▸</span>
      </div>
    )
  }

  // Extended row of filters
  return (
    <div style={{
      position: 'static',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(4, 15, 32, 0.92)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0, 212, 255, 0.35)',
      borderRadius: '30px',
      padding: '5px 12px 5px 14px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 212, 255, 0.12)',
      maxWidth: 'calc(50vw - 80px)',
      overflowX: 'auto',
      pointerEvents: 'auto',
      fontFamily: "'Inter', sans-serif",
      userSelect: 'none',
      transition: 'all 0.25s ease',
      animation: 'infoBarSlideIn 0.25s ease',
    }}>
      <div
        onClick={() => setIsExpanded(false)}
        title="Click to minimize"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '10.5px',
          color: '#00d2ff',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          cursor: 'pointer',
          marginRight: '2px',
          flexShrink: 0,
        }}
      >
        <span>📡</span>
        <span>Layers</span>
        <span style={{ fontSize: '9px', opacity: 0.8 }}>◂</span>
      </div>
      {INSTRUMENT_LEGEND.map(item => {
        const isVisible = getTypeActive(item.type)
        return (
          <div
            key={item.type}
            onClick={() => toggleType(item.type)}
            title={`Click to ${isVisible ? 'hide' : 'show'} ${item.label}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 9px',
              borderRadius: '20px',
              background: isVisible ? `${item.color}22` : 'rgba(255,255,255,0.04)',
              border: isVisible ? `1px solid ${item.color}66` : '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              opacity: isVisible ? 1 : 0.4,
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: item.color,
              boxShadow: isVisible ? `0 0 8px ${item.color}, 0 0 12px ${item.color}88` : 'none',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '10.5px',
              color: isVisible ? '#ffffff' : '#88a0b5',
              fontWeight: isVisible ? 600 : 400,
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Glider Directional Navigation Arrow (indicates glider heading & flight direction) ──
function GliderDirectionIndicator({ heading, color, isSelected }) {
  const headingDeg = parseFloat(heading) || 0
  // Heading in degrees (0° = North, 90° = East, 180° = South, 270° = West)
  // On billboard plane, +Y is North, +X is East (clockwise). Three.js Z-rotation is CCW, so -headingDeg
  const rotZ = -(headingDeg * Math.PI) / 180

  return (
    <group rotation={[0, 0, rotZ]}>
      {/* Forward flight heading pointer (static, exact compass orientation) */}
      <group position={[0, 0.088, 0]}>
        <mesh>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={3}
              array={new Float32Array([
                0,      0.030, 0.002,  // Arrow tip
               -0.014, -0.014, 0.002,  // Left wing
                0.014, -0.014, 0.002,  // Right wing
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <meshBasicMaterial color={color} depthTest={false} transparent opacity={isSelected ? 1.0 : 0.9} />
        </mesh>
      </group>

      {/* Trailing fuselage centerline */}
      <mesh position={[0, 0.032, 0.001]}>
        <planeGeometry args={[0.004, 0.065]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthTest={false} />
      </mesh>
    </group>
  )
}

// ── Individual Marker Pin ───────────────────────────────────────────────────
function MarkerPin({ instrument, morphProgress }) {
  const pinRef = useRef()
  const matRef = useRef()
  const [hovered, setHovered] = useState(false)
  const selectInstrument = useOceanStore(s => s.selectInstrument)
  const selectedInstrument = useOceanStore(s => s.selectedInstrument)
  const isSelected = selectedInstrument?.id === instrument.id
  const isGlider = instrument.type === 'glider'

  const uniforms = useMemo(() => ({
    u_color:    { value: new THREE.Color(instrument.color) },
    u_time:     { value: Math.random() * 10 },
    u_selected: { value: 0 },
    u_hovered:  { value: 0 },
  }), [instrument.color])

  useFrame((state) => {
    if (!pinRef.current || !matRef.current) return
    const time = state.clock.getElapsedTime()

    // Fixed exact coordinates on globe surface (1.505 radius sits flush on 1.50 globe)
    // No artificial drifting, bobbing, or cruising - dots stay exactly at their true location
    const curSpherePos = latLonToSphere(instrument.lat, instrument.lon, 1.505)
    const curFlatPos   = latLonToFlat(instrument.lat, instrument.lon)

    pinRef.current.position.lerpVectors(curSpherePos, curFlatPos, morphProgress)

    // Zoom-adaptive scale: dots remain visible without clustering or blowing up when zoomed in
    const camDist = state.camera.position.distanceTo(pinRef.current.position)
    const zoomScale = THREE.MathUtils.clamp(camDist * 0.18 + 0.30, 0.45, 1.05)
    const hoverScale = isSelected ? 1.4 : hovered ? 1.2 : 1.0
    const finalScale = zoomScale * hoverScale
    pinRef.current.scale.set(finalScale, finalScale, finalScale)

    matRef.current.uniforms.u_time.value = time
    matRef.current.uniforms.u_selected.value = isSelected ? 1.0 : 0.0
    matRef.current.uniforms.u_hovered.value  = hovered ? 1.0 : 0.0
  })

  // Clicking dot toggles it: if already selected, close it; otherwise open it (and auto-hides previous)
  const handleClick = (e) => {
    e.stopPropagation()
    if (isSelected) {
      selectInstrument(null)
    } else {
      selectInstrument(instrument)
    }
  }

  return (
    <group
      ref={pinRef}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
    >
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {/* Compact beacon geometry */}
        <mesh>
          <planeGeometry args={[0.20, 0.20]} />
          <shaderMaterial
            ref={matRef}
            vertexShader={markerVertexShader}
            fragmentShader={markerFragmentShader}
            uniforms={uniforms}
            transparent={true}
            depthTest={false}
          />
        </mesh>

        {/* Glider heading direction indicator */}
        {isGlider && (
          <GliderDirectionIndicator
            heading={instrument.heading}
            color={instrument.color}
            isSelected={isSelected}
          />
        )}
      </Billboard>

      {/* Hover name tag */}
      {hovered && !isSelected && (
        <Html distanceFactor={6} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 18, 35, 0.94)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${instrument.color}66`,
            borderRadius: '8px',
            padding: '6px 12px',
            whiteSpace: 'nowrap',
            color: '#e0f4ff',
            fontSize: '11px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: `0 0 16px ${instrument.color}44, 0 4px 20px rgba(0,0,0,0.7)`,
            transform: 'translate(-50%, -155%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: instrument.color, boxShadow: `0 0 6px ${instrument.color}`,
              }} />
              <span style={{ color: instrument.color, fontWeight: 700, fontSize: '12px' }}>
                {instrument.name}
              </span>
            </div>
            <div style={{ color: 'rgba(160,200,230,0.75)', fontSize: '10px', marginTop: '3px' }}>
              {instrument.lat.toFixed(2)}° N, {instrument.lon.toFixed(2)}° E
              {isGlider ? ` · 🧭 Heading ${instrument.heading} (${instrument.speed})` : ` · ${instrument.type.toUpperCase()} Instrument`}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Root export for 3D markers ──────────────────────────────────────────────
export default function InstrumentMarkers() {
  const morphProgress = useOceanStore(s => s.morphProgress)
  const showInstruments = useOceanStore(s => s.showInstruments)
  const showArgo = useOceanStore(s => s.showArgo ?? true)
  const showGliders = useOceanStore(s => s.showGliders ?? true)
  const showCTD = useOceanStore(s => s.showCTD ?? true)
  const showBGC = useOceanStore(s => s.showBGC ?? true)

  const visibleInstruments = useMemo(() => {
    if (!showInstruments) return []
    return ALL_INSTRUMENTS.filter(inst => {
      if (inst.type === 'argo' && !showArgo) return false
      if (inst.type === 'glider' && !showGliders) return false
      if (inst.type === 'ctd' && !showCTD) return false
      if (inst.type === 'bgc' && !showBGC) return false
      return true
    })
  }, [showInstruments, showArgo, showGliders, showCTD, showBGC])

  if (!showInstruments || visibleInstruments.length === 0) return null

  return (
    <group>
      {visibleInstruments.map(inst => (
        <MarkerPin key={inst.id} instrument={inst} morphProgress={morphProgress} />
      ))}
    </group>
  )
}

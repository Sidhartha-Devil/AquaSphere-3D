// src/components/SonarRadarView.jsx
// Realistic Interactive Oceanographic Sonar PPI Sweeper & Hydrophone Acoustic Pulse
import { useState, useEffect, useRef, useCallback } from 'react'
import { ALL_INSTRUMENTS } from '../data/instrumentDatabase'

export default function SonarRadarView({ onSelectInstrument }) {
  const [rotation, setRotation] = useState(0)
  const [activeBlip, setActiveBlip] = useState(null)
  const [pingPulsing, setPingPulsing] = useState(false)
  const animFrameRef = useRef()

  // Map 6 instruments into polar radar coordinates
  const radarTargets = useRef([
    { id: 'IN-2401', name: 'Argo IN-2401', angle: 42, distPct: 58, type: 'Argo Float', depth: '1,000m', temp: '28.4°C', color: '#00e5ff' },
    { id: 'SGA-21', name: 'Seaglider SGA-21', angle: 118, distPct: 76, type: 'Seaglider', depth: '450m', temp: '18.1°C', color: '#00ffaa' },
    { id: 'CTD-03', name: 'CTD Rosette 03', angle: 195, distPct: 38, type: 'CTD Rosette', depth: '3,200m', temp: '4.2°C', color: '#38bdf8' },
    { id: 'BF-12', name: 'BGC Float BF-12', angle: 264, distPct: 82, type: 'BGC Float', depth: '850m', temp: '16.7°C', color: '#ec4899' },
    { id: 'SGA-23', name: 'Deep Glider DG-09', angle: 312, distPct: 65, type: 'Deep Glider', depth: '1,800m', temp: '7.8°C', color: '#a855f7' },
    { id: 'IN-2405', name: 'Apex Float 05', angle: 350, distPct: 44, type: 'Argo Float', depth: '1,000m', temp: '27.9°C', color: '#00e5ff' },
  ]).current

  // Realistic Web Audio API Acoustic Hydrophone Ping
  const playSonarAcoustic = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()

      // Primary ping oscillator (high chirp decaying down)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1240, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.45)

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)

      // Sub-bass hull reverberation
      const subOsc = ctx.createOscillator()
      const subGain = ctx.createGain()
      subOsc.type = 'triangle'
      subOsc.frequency.setValueAtTime(110, ctx.currentTime)
      subOsc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.6)

      subGain.gain.setValueAtTime(0.18, ctx.currentTime)
      subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)

      osc.connect(gain)
      gain.connect(ctx.destination)

      subOsc.connect(subGain)
      subGain.connect(ctx.destination)

      osc.start()
      subOsc.start()
      osc.stop(ctx.currentTime + 0.85)
      subOsc.stop(ctx.currentTime + 0.75)
    } catch (err) {
      // Audio autoplay policy
    }
  }, [])

  const triggerPing = () => {
    setPingPulsing(true)
    playSonarAcoustic()
    setTimeout(() => setPingPulsing(false), 1200)
  }

  // Smooth radar rotation loop (30 RPM = 1 rev per 2 sec)
  useEffect(() => {
    let lastTime = performance.now()
    const loop = (currentTime) => {
      const delta = (currentTime - lastTime) / 1000
      lastTime = currentTime
      setRotation(r => (r + delta * 115) % 360)
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  return (
    <div className="sonar-radar-card">
      <div className="sonar-card-header">
        <div className="sonar-title-wrap">
          <span className="sonar-live-beacon" />
          <span className="sonar-card-title">ACOUSTIC SONAR PPI</span>
          <span className="sonar-card-sub">SWEEP 32 RPM · 200 NM RANGE</span>
        </div>
        <button className="sonar-ping-trigger-btn" onClick={triggerPing} title="Transmit hydrophone acoustic ping">
          <span className="ping-btn-icon">🔊</span>
          <span>PING RADAR</span>
        </button>
      </div>

      <div className="sonar-display-viewport">
        {/* Sonar Canvas / SVG Radar Screen */}
        <div className={`radar-screen ${pingPulsing ? 'radar-pinging' : ''}`} onClick={triggerPing}>
          
          {/* Compass Azimuth Marks */}
          <div className="radar-azimuth-marks">
            <span className="azimuth-label mark-n">000° N</span>
            <span className="azimuth-label mark-e">090° E</span>
            <span className="azimuth-label mark-s">180° S</span>
            <span className="azimuth-label mark-w">270° W</span>
          </div>

          {/* Concentric Range Rings */}
          <div className="radar-range-ring ring-25nm" data-range="50nm" />
          <div className="radar-range-ring ring-50nm" data-range="100nm" />
          <div className="radar-range-ring ring-75nm" data-range="150nm" />
          <div className="radar-range-ring ring-100nm" data-range="200nm" />

          {/* Crosshair Graticule Lines */}
          <div className="radar-crosshair ch-h" />
          <div className="radar-crosshair ch-v" />
          <div className="radar-crosshair ch-diag-1" />
          <div className="radar-crosshair ch-diag-2" />

          {/* Rotating Phosphor Sweep Beam */}
          <div 
            className="radar-sweep-beam" 
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="sweep-gradient-fan" />
            <div className="sweep-leading-edge" />
          </div>

          {/* Active Sonar Blip Targets */}
          {radarTargets.map((target) => {
            const rad = (target.angle - 90) * (Math.PI / 180)
            const rPx = (target.distPct / 100) * 125 // radius from center
            const x = 140 + Math.cos(rad) * rPx
            const y = 140 + Math.sin(rad) * rPx

            // Calculate angular distance to sweep beam for phosphor bloom
            const diff = (rotation - target.angle + 360) % 360
            const isHit = diff < 30
            const phosphorGlow = isHit ? Math.max(0.2, 1 - diff / 30) : 0.25

            return (
              <div
                key={target.id}
                className={`radar-blip ${isHit ? 'blip-illuminated' : ''} ${activeBlip?.id === target.id ? 'blip-selected' : ''}`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  '--blip-color': target.color,
                  opacity: phosphorGlow,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveBlip(target)
                  triggerPing()
                  if (onSelectInstrument) onSelectInstrument(target)
                }}
                title={`${target.name} (${target.type})`}
              >
                <div className="blip-core" />
                <div className="blip-ripple" />
                <span className="blip-callsign">{target.name.split(' ')[1] || target.name}</span>
              </div>
            )
          })}

          {/* Center Transceiver Hub */}
          <div className="radar-center-hub">
            <span className="hub-dot" />
            {pingPulsing && (
              <div className="hub-acoustic-wave">
                <span /><span /><span />
              </div>
            )}
          </div>
        </div>

        {/* Real-time Target Telemetry Inspection Card */}
        <div className="sonar-telemetry-panel">
          {activeBlip ? (
            <div className="target-card active">
              <div className="target-badge-row">
                <span className="target-type-badge">{activeBlip.type}</span>
                <span className="target-status-live">● TELEMETRY LOCKED</span>
              </div>
              <h4 className="target-name">{activeBlip.name}</h4>
              <div className="target-stats-grid">
                <div className="target-stat">
                  <span className="stat-name">PARKING DEPTH</span>
                  <span className="stat-val stat-cyan">{activeBlip.depth}</span>
                </div>
                <div className="target-stat">
                  <span className="stat-name">WATER TEMP</span>
                  <span className="stat-val stat-emerald">{activeBlip.temp}</span>
                </div>
                <div className="target-stat">
                  <span className="stat-name">BEARING / RANGE</span>
                  <span className="stat-val">{activeBlip.angle.toString().padStart(3, '0')}° / {(activeBlip.distPct * 2).toFixed(0)} NM</span>
                </div>
                <div className="target-stat">
                  <span className="stat-name">BATTERY / STATUS</span>
                  <span className="stat-val stat-green">94% · NOMINAL</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="target-card-idle">
              <div className="radar-wave-icon">📡</div>
              <h4>Acoustic Network Scanning</h4>
              <p>Click any blip on the radar screen to lock telemetry and inspect subsea depth data.</p>
              <div className="radar-legend-chips">
                <span><i style={{ background: '#00e5ff' }} /> Argo Float</span>
                <span><i style={{ background: '#00ffaa' }} /> Seaglider</span>
                <span><i style={{ background: '#ec4899' }} /> BGC Sensor</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// src/components/OceanDepthColumn.jsx
// Interactive Volumetric Depth Explorer (0m to 11,034m Mariana Trench)
import { useState, useMemo } from 'react'

const DEPTH_ZONES = [
  {
    id: 'sunlight',
    depthRange: '0 - 200 m',
    name: 'Epipelagic (Sunlit Zone)',
    temp: '28.4 °C',
    pressure: '1.0 - 21 atm',
    oxygen: '215 µmol/kg',
    light: '100% - 1% PAR',
    color: '#00e5ff',
    bgGrad: 'linear-gradient(180deg, rgba(0, 180, 255, 0.25) 0%, rgba(0, 100, 200, 0.2) 100%)',
    desc: 'Primary photosynthetic layer. Home to 90% of all marine life, phytoplankton blooms, coral reefs, and surface tuna.',
    fauna: ['Phytoplankton', 'Coral Reefs', 'Yellowfin Tuna', 'Flying Fish'],
    instruments: ['Surface Drifters', 'Satellite Altimeters', 'Glider Surfacing'],
  },
  {
    id: 'twilight',
    depthRange: '200 - 1,000 m',
    name: 'Mesopelagic (Twilight Zone)',
    temp: '11.8 °C',
    pressure: '21 - 101 atm',
    oxygen: '88 µmol/kg (OMZ)',
    light: '< 1% Faint Blue',
    color: '#38bdf8',
    bgGrad: 'linear-gradient(180deg, rgba(0, 90, 180, 0.25) 0%, rgba(0, 45, 120, 0.25) 100%)',
    desc: 'Rapid thermal transition (Thermocline). Characterized by the Oxygen Minimum Zone (OMZ) and massive diel vertical migrations.',
    fauna: ['Lanternfish', 'Giant Squid', 'Vampire Squid', 'Siphonophores'],
    instruments: ['Seaglider Dives', 'Deep CTD Casts', 'ADCP Acoustic Doppler'],
  },
  {
    id: 'midnight',
    depthRange: '1,000 - 4,000 m',
    name: 'Bathypelagic (Midnight Zone)',
    temp: '4.1 °C',
    pressure: '101 - 405 atm',
    oxygen: '142 µmol/kg',
    light: '0% Total Darkness',
    color: '#818cf8',
    bgGrad: 'linear-gradient(180deg, rgba(0, 35, 90, 0.3) 0%, rgba(2, 18, 50, 0.35) 100%)',
    desc: 'Complete absence of sunlight. Autonomous Argo profiling floats park at 1,000m drift depth for 10-day global oceanographic cycles.',
    fauna: ['Anglerfish', 'Gulper Eel', 'Dumbo Octopus', 'Bristlemouth'],
    instruments: ['Argo Float Parking (1000m)', 'BGC-Argo Oxygen Sensors', 'Deep Moorings'],
  },
  {
    id: 'abyss',
    depthRange: '4,000 - 6,000 m',
    name: 'Abyssopelagic (Abyssal Plain)',
    temp: '2.2 °C',
    pressure: '405 - 608 atm',
    oxygen: '168 µmol/kg',
    light: '0% High Pressure',
    color: '#a855f7',
    bgGrad: 'linear-gradient(180deg, rgba(2, 15, 40, 0.4) 0%, rgba(1, 8, 25, 0.45) 100%)',
    desc: 'Vast ocean floor plains covered in pelagic biogenic ooze, polymetallic manganese nodules, and scalding hydrothermal black smokers.',
    fauna: ['Tripod Fish', 'Faceless Cusk', 'Xenophyophores', 'Giant Isopods'],
    instruments: ['Deep Ocean Bottom Moorings', 'Benthic Landers', 'Seafloor Hydrophones'],
  },
  {
    id: 'hadal',
    depthRange: '6,000 - 11,034 m',
    name: 'Hadalpelagic (Trench Abyss)',
    temp: '1.1 °C',
    pressure: '1,086 atm',
    oxygen: '154 µmol/kg',
    light: '0% Subduction Abyss',
    color: '#ec4899',
    bgGrad: 'linear-gradient(180deg, rgba(1, 8, 25, 0.5) 0%, rgba(0, 3, 12, 0.7) 100%)',
    desc: 'Tectonic subduction trenches including Challenger Deep in Mariana Trench and the Java Trench. Highest hydrostatic pressure on Earth.',
    fauna: ['Mariana Snailfish', 'Hirondellea Gigas', 'Piezo-adapted Microbes'],
    instruments: ['Deep Sea Challenger Landers', 'Sub-bottom Acoustic Profilers'],
  },
]

export default function OceanDepthColumn() {
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0)
  const zone = DEPTH_ZONES[selectedZoneIndex]

  return (
    <div className="depth-explorer-card">
      <div className="depth-card-header">
        <div className="depth-title-group">
          <span className="depth-beacon-icon" />
          <span className="depth-card-title">VOLUMETRIC DEPTH COLUMN</span>
          <span className="depth-card-sub">EPIPELAGIC TO CHALLENGER DEEP (-11,034m)</span>
        </div>
        <div className="depth-quick-pills">
          {DEPTH_ZONES.map((z, idx) => (
            <button
              key={z.id}
              className={`depth-zone-pill ${idx === selectedZoneIndex ? 'active' : ''}`}
              onClick={() => setSelectedZoneIndex(idx)}
              style={{ '--zone-color': z.color }}
            >
              {z.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="depth-column-layout">
        {/* Vertical Depth Column Visualization */}
        <div className="depth-water-column">
          {DEPTH_ZONES.map((z, idx) => {
            const isSelected = idx === selectedZoneIndex
            return (
              <div
                key={z.id}
                className={`water-strata-layer ${isSelected ? 'selected' : ''}`}
                style={{
                  background: z.bgGrad,
                  borderColor: isSelected ? z.color : 'rgba(255,255,255,0.06)',
                }}
                onClick={() => setSelectedZoneIndex(idx)}
              >
                <div className="strata-header">
                  <span className="strata-depth" style={{ color: z.color }}>{z.depthRange}</span>
                  <span className="strata-name">{z.name.split(' ')[0]}</span>
                </div>
                {isSelected && (
                  <div className="strata-active-probe">
                    <span className="probe-dot" style={{ background: z.color }} />
                    <span className="probe-beam" style={{ background: z.color }} />
                    <span className="probe-tag">ACTIVE PROBE</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Real-time Environmental Gauge Telemetry */}
        <div className="depth-telemetry-panel">
          <div className="zone-meta-banner">
            <div className="zone-badge" style={{ color: zone.color, borderColor: zone.color }}>
              DEPTH: {zone.depthRange}
            </div>
            <h3 className="zone-heading">{zone.name}</h3>
            <p className="zone-narrative">{zone.desc}</p>
          </div>

          {/* 4 Precision Environmental Readouts */}
          <div className="depth-gauges-grid">
            <div className="gauge-box">
              <span className="gauge-label">HYDROSTATIC PRESSURE</span>
              <span className="gauge-value" style={{ color: zone.color }}>{zone.pressure}</span>
              <div className="gauge-bar-track">
                <div 
                  className="gauge-bar-fill" 
                  style={{ 
                    width: `${((selectedZoneIndex + 1) / DEPTH_ZONES.length) * 100}%`,
                    background: zone.color,
                  }} 
                />
              </div>
            </div>

            <div className="gauge-box">
              <span className="gauge-label">WATER TEMPERATURE</span>
              <span className="gauge-value stat-emerald">{zone.temp}</span>
              <div className="gauge-bar-track">
                <div 
                  className="gauge-bar-fill" 
                  style={{ 
                    width: `${(1 - selectedZoneIndex / DEPTH_ZONES.length) * 100}%`,
                    background: '#00ffaa',
                  }} 
                />
              </div>
            </div>

            <div className="gauge-box">
              <span className="gauge-label">DISSOLVED OXYGEN</span>
              <span className="gauge-value stat-cyan">{zone.oxygen}</span>
              <div className="gauge-bar-track">
                <div 
                  className="gauge-bar-fill" 
                  style={{ 
                    width: selectedZoneIndex === 1 ? '38%' : '75%',
                    background: '#38bdf8',
                  }} 
                />
              </div>
            </div>

            <div className="gauge-box">
              <span className="gauge-label">SUNLIGHT PENETRATION</span>
              <span className="gauge-value">{zone.light}</span>
              <div className="gauge-bar-track">
                <div 
                  className="gauge-bar-fill" 
                  style={{ 
                    width: selectedZoneIndex === 0 ? '100%' : selectedZoneIndex === 1 ? '15%' : '2%',
                    background: '#e0f2fe',
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Biological & Instrumentation Tags */}
          <div className="depth-tags-row">
            <div className="tag-group">
              <span className="group-label">KEY ECOSYSTEMS:</span>
              <div className="tags-flex">
                {zone.fauna.map((f, i) => (
                  <span key={i} className="bio-tag">🐟 {f}</span>
                ))}
              </div>
            </div>
            <div className="tag-group">
              <span className="group-label">DEPLOYED SENSORS:</span>
              <div className="tags-flex">
                {zone.instruments.map((inst, i) => (
                  <span key={i} className="inst-tag">📡 {inst}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

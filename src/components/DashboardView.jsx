// src/components/DashboardView.jsx
// Ultra-Realistic, Highly Animated & Interactive Oceanographic Command Deck
import { useState, useEffect } from 'react'
import useOceanStore from '../store/oceanStore'
import { ALL_INSTRUMENTS, OCEAN_GLIDERS, ARGO_FLOATS, CTD_INSTRUMENTS, BGC_FLOATS } from '../data/instrumentDatabase'
import OceanWaveCanvas from './OceanWaveCanvas'
import AnimatedScrambleTitle from './AnimatedScrambleTitle'
import OceanDepthSlicer from './OceanDepthSlicer'
import TiltCard from './TiltCard'
import {
  Globe, Map, Wind, FolderOpen, Radio, Satellite,
  Circle, Layers, Activity, Cpu, AlertTriangle,
  ArrowRight, ChevronRight
} from 'lucide-react'
import './DashboardView.css'

export default function DashboardView() {
  const setCurrentView       = useOceanStore(s => s.setCurrentView)
  const setViewMode          = useOceanStore(s => s.setViewMode)
  const setMorphProgress     = useOceanStore(s => s.setMorphProgress)
  const setShowWaterDirection = useOceanStore(s => s.setShowWaterDirection)
  const setShowCurrents       = useOceanStore(s => s.setShowCurrents)
  const setIsUploaderOpen    = useOceanStore(s => s.setIsUploaderOpen)

  // Real-time sensor ticker
  const [tickerIndex, setTickerIndex] = useState(0)
  const telemetryMessages = [
    { icon: <Satellite size={14} />, text: 'Argo Float IN-2401 · Depth 1,000m · 28.4°C · Bay of Bengal Boundary Active' },
    { icon: <Activity size={14} />,  text: 'Seaglider SGA-21 · Heading 270° West · Dive #501 completed · Salinity 36.2 PSU' },
    { icon: <Circle size={14} />,    text: 'CTD Rosette CTD-03 · ORV Sindhu Sadhana · 24 Bottles Fired · 3,200m Cast' },
    { icon: <Layers size={14} />,    text: 'BGC Float BF-12 · Oxygen 214 µmol/L · Nitrate 0.8 µmol/L · pH 8.07 Nominal' },
    { icon: <Wind size={14} />,      text: 'Somali Current & Indian Ocean Monsoon Gyre · Fluid Speed 1.4 m/s Detected' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % telemetryMessages.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [telemetryMessages.length])

  // Navigation handlers
  const launchGlobe = () => {
    setViewMode('globe')
    setMorphProgress(0.0)
    setCurrentView('globe')
  }

  const launchFlatMap = () => {
    setViewMode('flat')
    setMorphProgress(1.0)
    setCurrentView('globe')
  }

  const launchCurrents = () => {
    setShowWaterDirection(true)
    setShowCurrents(true)
    launchGlobe()
  }

  return (
    <div className="dash-ocean-command-deck">
      {/* ── Background canvas removed ── */}

      {/* ── Atmospheric Depth Backdrop ── */}

      <div className="dash-main-scrollable">

        {/* ── Top Tactical Telemetry Bar ── */}
        <div className="dash-tactical-header">
          <div className="tactical-status-pill">
            <span className="tactical-live-dot" />
            <span className="tactical-title">REALTIME OCEAN TELEMETRY</span>
            <span className="tactical-count-badge">{ALL_INSTRUMENTS.length} SENSORS ONLINE</span>
          </div>

          <div className="dash-ticker-display">
            <span className="ticker-badge">LIVE STREAM</span>
            <span className="ticker-animated-text" key={tickerIndex}>
              <span className="ticker-icon">{telemetryMessages[tickerIndex].icon}</span>
              {telemetryMessages[tickerIndex].text}
            </span>
          </div>
        </div>

        {/* ── Hero Command Section ── */}
        <div className="dash-hero-grid">
          
          {/* Left Column: Command & Action Deck */}
          <div className="dash-hero-left">
            <div className="hero-system-badge">
              <span className="badge-glow-dot" />
              <span>3D VOLUMETRIC OCEANOGRAPHIC DIGITAL TWIN</span>
            </div>

            <h1 className="hero-prime-title">
              <AnimatedScrambleTitle />
            </h1>

            <p className="hero-prime-desc">
              High-precision planetary ocean intelligence. Dive into GPU-rendered bathymetric relief,
              track autonomous Argo floats and Seagliders across subsea trenches, and simulate
              global geostrophic current vectors in real-time.
            </p>

            {/* Quick Action Buttons */}
            <div className="hero-primary-actions">
              <button className="prime-launch-btn globe-btn" onClick={launchGlobe}>
                <span className="btn-icon"><Globe size={22} strokeWidth={1.5} /></span>
                <div className="btn-text-block">
                  <span className="btn-main-text">Launch 3D Globe</span>
                  <span className="btn-sub-text">Full Planetary Sphere View</span>
                </div>
                <span className="btn-chevron"><ChevronRight size={16} /></span>
              </button>

              <button className="prime-launch-btn flat-btn" onClick={launchFlatMap}>
                <span className="btn-icon"><Map size={22} strokeWidth={1.5} /></span>
                <div className="btn-text-block">
                  <span className="btn-main-text">Flat Map &amp; Slices</span>
                  <span className="btn-sub-text">Bathymetric Relief</span>
                </div>
              </button>

              <button className="prime-launch-btn currents-btn" onClick={launchCurrents}>
                <span className="btn-icon"><Wind size={22} strokeWidth={1.5} /></span>
                <div className="btn-text-block">
                  <span className="btn-main-text">Simulate Currents</span>
                  <span className="btn-sub-text">Fluid Velocity Vectors</span>
                </div>
              </button>

              <button className="prime-launch-btn upload-btn" onClick={() => setIsUploaderOpen(true)}>
                <span className="btn-icon"><FolderOpen size={22} strokeWidth={1.5} /></span>
                <div className="btn-text-block">
                  <span className="btn-main-text">Import NetCDF</span>
                  <span className="btn-sub-text">Satellite &amp; In-situ Data</span>
                </div>
              </button>
            </div>

            {/* Acoustic Audio Spectrogram Stream Bar */}
            <div className="hero-spectrogram-bar">
              <div className="spec-info">
                <span className="spec-dot" />
                <span className="spec-label">HYDROPHONE ACOUSTIC SPECTRUM</span>
                <span className="spec-val">12.4 kHz · AMBIENT SENSING</span>
              </div>
              <div className="spec-bars">
                {Array.from({ length: 28 }).map((_, i) => (
                  <span 
                    key={i} 
                    className="spec-bar" 
                    style={{ 
                      animationDelay: `${(i * 0.07).toFixed(2)}s`,
                      height: `${Math.sin(i * 0.4) * 12 + 16}px`
                    }} 
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Key Metrics Bar (Interactive 3D Tilt Cards) ── */}
        <div className="dash-metrics-deck">
          <TiltCard className="metric-tilt-card" onClick={launchGlobe}>
            <div className="metric-card-top">
              <span className="metric-tag-label">DEPLOYED FLEET</span>
              <span className="metric-status-glow" />
            </div>
            <div className="metric-main-figure">
              <span className="figure-val">{ALL_INSTRUMENTS.length}</span>
              <span className="figure-unit">UNITS</span>
            </div>
            <div className="metric-label-text">Active Ocean Instruments</div>
            <div className="metric-pills-row">
              <span className="pill-item pill-argo"><Circle size={8} style={{display:'inline',verticalAlign:'middle',marginRight:3,color:'#4488ff'}} fill="#4488ff" /> {ARGO_FLOATS.length} Argo</span>
              <span className="pill-item pill-glider"><Activity size={8} style={{display:'inline',verticalAlign:'middle',marginRight:3,color:'#ffd700'}} /> {OCEAN_GLIDERS.length} Gliders</span>
              <span className="pill-item pill-ctd"><Radio size={8} style={{display:'inline',verticalAlign:'middle',marginRight:3,color:'#00ff99'}} /> {CTD_INSTRUMENTS.length} CTD</span>
              <span className="pill-item pill-bgc"><Layers size={8} style={{display:'inline',verticalAlign:'middle',marginRight:3,color:'#cc88ff'}} /> {BGC_FLOATS.length} BGC</span>
            </div>
          </TiltCard>

          <TiltCard className="metric-tilt-card" onClick={launchFlatMap}>
            <div className="metric-card-top">
              <span className="metric-tag-label">BATHYMETRIC RELIEF</span>
              <span className="metric-badge-blue">TRENCH</span>
            </div>
            <div className="metric-main-figure">
              <span className="figure-val">11,034</span>
              <span className="figure-unit">M</span>
            </div>
            <div className="metric-label-text">Challenger Deep Max Depth</div>
            <div className="metric-sub-detail">
              <span>Mariana Subduction Trench</span>
              <span>Java Trench: 7,450m</span>
            </div>
          </TiltCard>

          <TiltCard className="metric-tilt-card" onClick={launchCurrents}>
            <div className="metric-card-top">
              <span className="metric-tag-label">GEOSTROPHIC FLOW</span>
              <span className="metric-badge-cyan">AVISO MODEL</span>
            </div>
            <div className="metric-main-figure">
              <span className="figure-val">360°</span>
              <span className="figure-unit">CIRCULATION</span>
            </div>
            <div className="metric-label-text">Global Ocean Gyre Dynamics</div>
            <div className="metric-sub-detail">
              <span>Gulf Stream · Kuroshio · Agulhas</span>
            </div>
          </TiltCard>

          <TiltCard className="metric-tilt-card" onClick={() => setCurrentView('alerts')}>
            <div className="metric-card-top">
              <span className="metric-tag-label">NEURAL PREDICTION</span>
              <span className="metric-badge-emerald">AI ACTIVE</span>
            </div>
            <div className="metric-main-figure">
              <span className="figure-val">99.4%</span>
              <span className="figure-unit">CONFIDENCE</span>
            </div>
            <div className="metric-label-text">Marine Anomaly Detection</div>
            <div className="metric-sub-detail">
              <span>Hypoxia OMZ · Marine Heatwaves</span>
            </div>
          </TiltCard>
        </div>

        {/* ── Subsea Operations: 3D Depth Slicer ── */}
        <div className="dash-subsea-ops-grid depth-slicer-primary">
          <OceanDepthSlicer />
        </div>

        {/* ── Operational Capabilities & Tools (6 Interactive 3D Launchpad Tiles) ── */}
        <div className="dash-capabilities-section">
          <div className="capabilities-header">
            <div className="cap-title-block">
              <span className="cap-indicator-dot" />
              <h2 className="cap-heading">Operational Capabilities &amp; Tools</h2>
            </div>
            <span className="cap-subheading">Select any module to enter deep visualization</span>
          </div>

          <div className="capabilities-tiles-grid">
            <TiltCard className="cap-tile-card cap-tile-globe" onClick={launchGlobe}>
              <div className="tile-ambient-glow" />
              <div className="tile-top-row">
                <span className="tile-icon"><Globe size={28} strokeWidth={1.5} /></span>
                <span className="tile-badge">PLANETARY 3D</span>
              </div>
              <h3 className="tile-name">Spherical 3D Globe</h3>
              <p className="tile-description">
                Real-time GPU-rendered ocean sphere with seamless orbital navigation, bathymetric wireframe,
                and sunlight illumination.
              </p>
              <div className="tile-action-link">
                <span>Enter Spherical View</span>
                <span className="link-arrow"><ArrowRight size={14} /></span>
              </div>
            </TiltCard>

            <TiltCard className="cap-tile-card cap-tile-flat" onClick={launchFlatMap}>
              <div className="tile-ambient-glow" />
              <div className="tile-top-row">
                <span className="tile-icon"><Map size={28} strokeWidth={1.5} /></span>
                <span className="tile-badge">TOPOGRAPHY</span>
              </div>
              <h3 className="tile-name">Bathymetric Flat Map</h3>
              <p className="tile-description">
                2D Equirectangular projection with high-resolution depth contours, seabed trenches,
                and interactive coordinate sonar probes.
              </p>
              <div className="tile-action-link">
                <span>Open Bathymetry Map</span>
                <span className="link-arrow"><ArrowRight size={14} /></span>
              </div>
            </TiltCard>

            <TiltCard className="cap-tile-card cap-tile-fleet" onClick={launchGlobe}>
              <div className="tile-ambient-glow" />
              <div className="tile-top-row">
                <span className="tile-icon"><Satellite size={28} strokeWidth={1.5} /></span>
                <span className="tile-badge">AUTONOMOUS</span>
              </div>
              <h3 className="tile-name">Argo &amp; Glider Fleet</h3>
              <p className="tile-description">
                Live autonomous instrumentation network. Track glider compass heading chevrons,
                dive profiles, battery health, and salinity.
              </p>
              <div className="tile-action-link">
                <span>Monitor Fleet Network</span>
                <span className="link-arrow"><ArrowRight size={14} /></span>
              </div>
            </TiltCard>

            <TiltCard className="cap-tile-card cap-tile-currents" onClick={launchCurrents}>
              <div className="tile-ambient-glow" />
              <div className="tile-top-row">
                <span className="tile-icon"><Wind size={28} strokeWidth={1.5} /></span>
                <span className="tile-badge">HYDRODYNAMICS</span>
              </div>
              <h3 className="tile-name">Ocean Currents &amp; Vectors</h3>
              <p className="tile-description">
                Advecting glowing velocity particles simulated along planetary Stommel gyres
                and western boundary currents.
              </p>
              <div className="tile-action-link">
                <span>Simulate Fluid Flow</span>
                <span className="link-arrow"><ArrowRight size={14} /></span>
              </div>
            </TiltCard>

            <TiltCard className="cap-tile-card cap-tile-analytics" onClick={() => setCurrentView('analytics')}>
              <div className="tile-ambient-glow" />
              <div className="tile-top-row">
                <span className="tile-icon"><Activity size={28} strokeWidth={1.5} /></span>
                <span className="tile-badge">VOLUMETRIC</span>
              </div>
              <h3 className="tile-name">Depth Analytics &amp; CTD</h3>
              <p className="tile-description">
                Interactive 3D volume slicing with clipping planes, TS diagrams, salinity-temperature curves,
                and thermocline depth profilers.
              </p>
              <div className="tile-action-link">
                <span>Open Slicer Analytics</span>
                <span className="link-arrow"><ArrowRight size={14} /></span>
              </div>
            </TiltCard>

            <TiltCard className="cap-tile-card cap-tile-alerts" onClick={() => setCurrentView('alerts')}>
              <div className="tile-ambient-glow" />
              <div className="tile-top-row">
                <span className="tile-icon"><AlertTriangle size={28} strokeWidth={1.5} /></span>
                <span className="tile-badge">AI PREDICTION</span>
              </div>
              <h3 className="tile-name">Marine Alerts &amp; AI</h3>
              <p className="tile-description">
                Automated neural anomaly engine monitoring marine heatwaves, coastal hypoxia,
                salinity intrusions, and cyclone thermal drops.
              </p>
              <div className="tile-action-link">
                <span>Inspect Alert Logs</span>
                <span className="link-arrow"><ArrowRight size={14} /></span>
              </div>
            </TiltCard>
          </div>
        </div>

        {/* ── System Credentials Footer ── */}
        <div className="dash-system-footer">
          <div className="footer-left">
            <span className="agency-title">INCOIS · Indian National Centre for Ocean Information Services</span>
            <span className="agency-sub">NetCDF CF-1.8 Convention · WebGL 2.0 GPU Shader Engine · Realtime Hydrophones</span>
          </div>
          <div className="footer-right">
            <span className="system-status-indicator" />
            <span className="system-status-text">All Satellite &amp; Telemetry Systems Operational</span>
          </div>
        </div>

      </div>
    </div>
  )
}

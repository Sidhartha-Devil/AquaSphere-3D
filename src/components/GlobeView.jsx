// src/components/GlobeView.jsx
// Premium Ocean Intelligence HUD — fully animated, non-overlapping, mission-grade
import { useState, useEffect } from 'react'
import OceanScene from './OceanScene'
import ViewToggle from './ViewToggle'
import DataPanel from './DataPanel'
import DepthProbe from './DepthProbe'
import TopRightMenu from './TopRightMenu'
import DataUploader from './DataUploader'
import OceanTimeline from './OceanTimeline'
import { InstrumentInfoBar, InstrumentLegendBar } from './InstrumentMarkers'
import GeoLabelsOverlay, { GeoLabelsFlatOverlay } from './GeoLabelsOverlay'
import useOceanStore from '../store/oceanStore'
import './GlobeView.css'

// ── Live clock + telemetry top bar ──────────────────────────────────────────
function GlobeHudTopBar() {
  const viewMode      = useOceanStore(s => s.viewMode)
  const morphProgress = useOceanStore(s => s.morphProgress)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toISOString().slice(11, 19) + ' UTC'
  const dateStr = time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="globe-hud-topbar">
      {/* Left — brand + mode */}
      <div className="hud-top-left">
        <div className="hud-logo-mark">
          <img src="/logo.png" className="hud-logo-wave" alt="Logo" style={{width: '32px', height: '32px', objectFit: 'contain'}} />
          <div className="hud-logo-text">
            <span className="hud-logo-name">AQUA SPHERE</span>
            <span className="hud-logo-sub">Ocean Intelligence Platform</span>
          </div>
        </div>
        <div className="hud-mode-badge">
          <span className="hud-mode-dot" />
          <span>{viewMode === 'globe' ? '3D SPHERE' : 'FLAT MAP'}</span>
          {morphProgress > 0.02 && morphProgress < 0.98 && (
            <span className="hud-morphing-label">MORPHING…</span>
          )}
        </div>
      </div>

      {/* Centre — live telemetry readouts */}
      <div className="hud-top-centre">
        <div className="hud-stat">
          <span className="hud-stat-val">28.4°C</span>
          <span className="hud-stat-label">SST</span>
        </div>
        <div className="hud-stat-divider" />
        <div className="hud-stat">
          <span className="hud-stat-val">36.2‰</span>
          <span className="hud-stat-label">SALINITY</span>
        </div>
        <div className="hud-stat-divider" />
        <div className="hud-stat">
          <span className="hud-stat-val">1.4 m/s</span>
          <span className="hud-stat-label">CURRENT</span>
        </div>
        <div className="hud-stat-divider" />
        <div className="hud-stat">
          <span className="hud-stat-val">214 µ</span>
          <span className="hud-stat-label">O₂</span>
        </div>
      </div>

      {/* Right — clock + live indicator */}
      <div className="hud-top-right">
        <div className="hud-live-pill">
          <span className="hud-live-dot" />
          <span>LIVE</span>
        </div>
        <div className="hud-time-block">
          <span className="hud-time">{timeStr}</span>
          <span className="hud-date">{dateStr}</span>
        </div>
      </div>
    </div>
  )
}

// ── Unified bottom dock: nav buttons + ViewToggle + coords ───────────────────
function GlobeHudBottomDock() {
  const setCurrentView = useOceanStore(s => s.setCurrentView)
  return (
    <div className="globe-hud-bottom-dock">
      {/* Left nav */}
      <div className="dock-nav-group">
        <button className="dock-nav-btn" onClick={() => setCurrentView('dashboard')} title="Back to Dashboard">
          <span className="dock-btn-icon">🏠</span>
          <span className="dock-btn-label">Dashboard</span>
        </button>
        <button className="dock-nav-btn" onClick={() => setCurrentView('analytics')} title="Analytics">
          <span className="dock-btn-icon">📊</span>
          <span className="dock-btn-label">Analytics</span>
        </button>
        <button className="dock-nav-btn" onClick={() => setCurrentView('alerts')} title="Alerts">
          <span className="dock-btn-icon">🚨</span>
          <span className="dock-btn-label">Alerts</span>
        </button>
      </div>

      {/* Centre — ViewToggle pill */}
      <div className="dock-centre">
        <ViewToggle />
      </div>

      {/* Right — coordinates */}
      <div className="dock-right-group">
        <div className="dock-coord-chip">
          <span className="dock-coord-icon">📍</span>
          <span className="dock-coord-val">INCOIS · Indian Ocean</span>
        </div>
      </div>
    </div>
  )
}

// ── Main GlobeView ───────────────────────────────────────────────────────────
export default function GlobeView() {
  return (
    <div className="globe-view-shell">
      {/* Full-screen 3D canvas — behind everything */}
      <OceanScene />

      {/* Geographic labels overlay (sits directly over the canvas) */}
      {/* Globe labels are rendered via R3F Html in OceanScene */}
      {/* Flat map labels are rendered as a positioned overlay */}
      <GeoLabelsFlatOverlay />

      {/* ── HUD overlay — pointer-events: none on the shell, restored per element ── */}
      <div className="globe-hud-layer">

        {/* ① TOP bar — system brand + live telemetry + clock */}
        <GlobeHudTopBar />

        {/* ② RIGHT column — Ocean Overlays panel (below top bar, above bottom dock) */}
        <div className="globe-hud-right">
          <TopRightMenu />
        </div>

        {/* ③ BOTTOM unified dock — nav + globe/flat toggle + coords + timeline */}
        <div className="globe-hud-bottom-wrapper">
          {/* Timeline sits just above the dock and only appears when data is loaded */}
          <OceanTimeline />
          <GlobeHudBottomDock />
        </div>

        {/* ④ BOTTOM-LEFT floating pill — instrument network legend */}
        <div className="globe-hud-legend-slot">
          <InstrumentLegendBar />
        </div>

        {/* ⑤ BOTTOM-RIGHT floating card — instrument detail popup */}
        <InstrumentInfoBar />

        {/* ⑥ Floating modals — DataPanel (left slide-in) & cursor DepthProbe */}
        <DataPanel />
        <DepthProbe />

        {/* ⑦ Dataset uploader modal */}
        <DataUploader />
      </div>
    </div>
  )
}

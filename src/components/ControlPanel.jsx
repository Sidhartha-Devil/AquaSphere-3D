// src/components/ControlPanel.jsx
import { useState, useEffect, useRef } from 'react'
import useOceanStore from '../store/oceanStore'
import { COLOR_PALETTES, TIME_STEPS } from '../data/mockOceanData'
import './ControlPanel.css'

const VARIABLES = [
  { key: 'temperature', label: 'Temp', icon: '🌡️' },
  { key: 'salinity',    label: 'Salt', icon: '🧂' },
  { key: 'current',     label: 'Flow', icon: '🌊' },
]

const PALETTES = [
  { key: 'thermal',   colors: ['#0000ff','#00ffcc','#ffff00','#ff0000'] },
  { key: 'ocean',     colors: ['#03045e','#0096c7','#90e0ef','#e0f7ff'] },
  { key: 'viridis',   colors: ['#440154','#3f4a8a','#6cce5a','#fee825'] },
  { key: 'rainbow',   colors: ['#7400b8','#4ea8de','#72efdd','#80ffdb'] },
  { key: 'grayscale', colors: ['#111','#555','#aaa','#eee'] },
]

export default function ControlPanel() {
  const [collapsed, setCollapsed] = useState(false)

  const selectedVariable      = useOceanStore(s => s.selectedVariable)
  const opacity               = useOceanStore(s => s.opacity)
  const verticalExaggeration  = useOceanStore(s => s.verticalExaggeration)
  const colorPalette          = useOceanStore(s => s.colorPalette)
  const showCurrents          = useOceanStore(s => s.showCurrents)
  const currentSpeed          = useOceanStore(s => s.currentSpeed)
  const isPlaying             = useOceanStore(s => s.isPlaying)
  const currentTimeStep       = useOceanStore(s => s.currentTimeStep)
  const totalTimeSteps        = useOceanStore(s => s.totalTimeSteps)
  const showBathymetry        = useOceanStore(s => s.showBathymetry)
  const showWaterSurface        = useOceanStore(s => s.showWaterSurface)
  const showWaterDirection      = useOceanStore(s => s.showWaterDirection)
  const showTemperature         = useOceanStore(s => s.showTemperature)

  const setSelectedVariable     = useOceanStore(s => s.setSelectedVariable)
  const setOpacity              = useOceanStore(s => s.setOpacity)
  const setVerticalExaggeration = useOceanStore(s => s.setVerticalExaggeration)
  const setColorPalette         = useOceanStore(s => s.setColorPalette)
  const setShowCurrents         = useOceanStore(s => s.setShowCurrents)
  const setCurrentSpeed         = useOceanStore(s => s.setCurrentSpeed)
  const setIsPlaying            = useOceanStore(s => s.setIsPlaying)
  const setCurrentTimeStep      = useOceanStore(s => s.setCurrentTimeStep)
  const setShowBathymetry       = useOceanStore(s => s.setShowBathymetry)
  const setShowWaterSurface     = useOceanStore(s => s.setShowWaterSurface)
  const setShowWaterDirection   = useOceanStore(s => s.setShowWaterDirection)
  const setShowTemperature      = useOceanStore(s => s.setShowTemperature)
  
  const isSlicingMode           = useOceanStore(s => s.isSlicingMode)
  const setIsSlicingMode        = useOceanStore(s => s.setIsSlicingMode)
  const sliceBounds             = useOceanStore(s => s.sliceBounds)
  const setSliceBounds          = useOceanStore(s => s.setSliceBounds)

  // Auto-advance timeline
  const playIntervalRef = useRef(null)
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTimeStep((currentTimeStep + 1) % totalTimeSteps)
      }, 1500)
    } else {
      clearInterval(playIntervalRef.current)
    }
    return () => clearInterval(playIntervalRef.current)
  }, [isPlaying, currentTimeStep, totalTimeSteps])

  return (
    <div className="control-panel">
      {/* Header */}
      <div className="cp-header" onClick={() => setCollapsed(c => !c)} id="control-panel-header">
        <div className="cp-header-left">
          <div className="cp-icon">🌊</div>
          <div>
            <div className="cp-title">Ocean Controls</div>
            <div className="cp-subtitle">Visualization Settings</div>
          </div>
        </div>
        <span className={`cp-chevron${collapsed ? '' : ' open'}`}>▼</span>
      </div>

      {/* Body */}
      <div className={`cp-body ${collapsed ? 'collapsed' : 'expanded'}`}>

        {/* Variable selector */}
        <div className="cp-section">
          <div className="cp-label">Variable</div>
          <div className="variable-pills">
            {VARIABLES.map(v => (
              <button
                key={v.key}
                id={`var-pill-${v.key}`}
                className={`var-pill${selectedVariable === v.key ? ' active' : ''}`}
                onClick={() => setSelectedVariable(v.key)}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cp-divider" />

        {/* Opacity */}
        <div className="cp-section">
          <div className="cp-label">
            <span>Layer Opacity</span>
            <span className="cp-value">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            id="opacity-slider"
            type="range" min="0" max="1" step="0.01"
            value={opacity}
            onChange={e => setOpacity(parseFloat(e.target.value))}
            style={{ '--pct': `${opacity * 100}%` }}
          />
        </div>

        {/* Vertical Exaggeration */}
        <div className="cp-section">
          <div className="cp-label">
            <span>Vertical Exaggeration</span>
            <span className="cp-value">{verticalExaggeration}×</span>
          </div>
          <input
            id="vert-exag-slider"
            type="range" min="1" max="10" step="0.5"
            value={verticalExaggeration}
            onChange={e => setVerticalExaggeration(parseFloat(e.target.value))}
            style={{ '--pct': `${((verticalExaggeration - 1) / 9) * 100}%` }}
          />
        </div>

        <div className="cp-divider" />

        {/* Color Palette */}
        <div className="cp-section">
          <div className="cp-label">Color Palette</div>
          <div className="palette-swatches">
            {PALETTES.map(p => (
              <button
                key={p.key}
                id={`palette-${p.key}`}
                className={`palette-swatch${colorPalette === p.key ? ' active' : ''}`}
                title={p.key}
                onClick={() => setColorPalette(p.key)}
                style={{
                  background: `linear-gradient(to right, ${p.colors.join(', ')})`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="cp-divider" />

        {/* Ocean Currents toggle */}
        <div className="cp-section">
          <div className="toggle-row">
            <span className="toggle-label">🌀 Particle Ocean Currents</span>
            <label className="toggle-switch">
              <input
                id="currents-toggle"
                type="checkbox"
                checked={showCurrents}
                onChange={e => setShowCurrents(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          {showCurrents && (
            <div className="cp-section" style={{ marginTop: 8 }}>
              <div className="cp-label">
                <span>Flow Speed</span>
                <span className="cp-value">{currentSpeed.toFixed(1)}×</span>
              </div>
              <input
                id="current-speed-slider"
                type="range" min="0.1" max="5" step="0.1"
                value={currentSpeed}
                onChange={e => setCurrentSpeed(parseFloat(e.target.value))}
                style={{ '--pct': `${((currentSpeed - 0.1) / 4.9) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="cp-divider" />

        {/* 3D Bathymetry toggle */}
        <div className="cp-section">
          <div className="toggle-row">
            <span className="toggle-label">🏔️ True 3D Bathymetry</span>
            <label className="toggle-switch">
              <input
                id="bathymetry-toggle"
                type="checkbox"
                checked={showBathymetry}
                onChange={e => setShowBathymetry(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
          
        <div className="cp-divider" />


        {/* Timeline */}

        <div className="cp-section">
          <div className="cp-label">
            <span>📅 Timeline</span>
            <span className="cp-value timeline-date">{TIME_STEPS[currentTimeStep]}</span>
          </div>
          <div className="timeline-row">
            <button
              id="play-pause-btn"
              className="play-btn"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <input
              id="timeline-slider"
              type="range" min="0" max={totalTimeSteps - 1} step="1"
              value={currentTimeStep}
              onChange={e => { setCurrentTimeStep(parseInt(e.target.value)); setIsPlaying(false) }}
              style={{ '--pct': `${(currentTimeStep / (totalTimeSteps - 1)) * 100}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}

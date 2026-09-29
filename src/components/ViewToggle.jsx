// src/components/ViewToggle.jsx
// The hero toggle button: Globe ↔ Flat Map
import { useEffect, useRef } from 'react'
import useOceanStore from '../store/oceanStore'
import './ViewToggle.css'

export default function ViewToggle() {
  const viewMode      = useOceanStore(s => s.viewMode)
  const morphProgress = useOceanStore(s => s.morphProgress)
  const setViewMode   = useOceanStore(s => s.setViewMode)
  const setMorphProgress = useOceanStore(s => s.setMorphProgress)

  const animRef = useRef(null)
  const progressRef = useRef(morphProgress)
  progressRef.current = morphProgress

  const animateMorph = (targetVal) => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const startVal = progressRef.current
    const startTime = performance.now()
    const duration = 900

    const easeInOutCubic = t =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const step = (now) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = easeInOutCubic(t)
      const val = startVal + (targetVal - startVal) * eased
      setMorphProgress(val)
      if (t < 1) {
        animRef.current = requestAnimationFrame(step)
      }
    }
    animRef.current = requestAnimationFrame(step)
  }

  const handleGlobe = () => {
    if (viewMode === 'globe') return
    setViewMode('globe')
    animateMorph(0.0)
  }

  const handleFlat = () => {
    if (viewMode === 'flat') return
    setViewMode('flat')
    animateMorph(1.0)
  }

  const isGlobe = viewMode === 'globe'
  const isMorphing = morphProgress > 0.02 && morphProgress < 0.98
  const userDataset = useOceanStore(s => s.userDataset)

  return (
    <div className={`view-toggle-wrapper ${userDataset ? 'with-dataset' : ''}`}>
      {isMorphing && (
        <div className="morph-indicator">
          <span>{isGlobe ? '🌍→🗺️' : '🗺️→🌍'}</span>
          <div className="morph-bar-track">
            <div
              className="morph-bar-fill"
              style={{ width: `${morphProgress * 100}%` }}
            />
          </div>
          <span>morphing…</span>
        </div>
      )}

      <div className="view-toggle-pill">
        <button
          id="toggle-globe-btn"
          className={`toggle-btn${isGlobe ? ' active' : ''}`}
          onClick={handleGlobe}
          title="Switch to 3D Spherical Globe view"
        >
          <span className="btn-icon">🌍</span>
          Globe
        </button>

        <div className="toggle-divider" />

        <button
          id="toggle-flat-btn"
          className={`toggle-btn${!isGlobe ? ' active' : ''}`}
          onClick={handleFlat}
          title="Switch to 2D Bathymetric Flat Map"
        >
          <span className="btn-icon">🗺️</span>
          Flat Map
        </button>
      </div>
    </div>
  )
}

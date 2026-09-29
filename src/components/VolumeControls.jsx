// src/components/VolumeControls.jsx
import { useState } from 'react'
import useOceanStore from '../store/oceanStore'
import './ControlPanel.css'

export default function VolumeControls() {
  const isExpanded = true
  
  // Slicing State
  const clippingEnabled = useOceanStore(s => s.clippingEnabled)
  const clippingAxis = useOceanStore(s => s.clippingAxis)
  const clippingOffset = useOceanStore(s => s.clippingOffset)
  const clippingDirection = useOceanStore(s => s.clippingDirection)
  
  const setClippingEnabled = useOceanStore(s => s.setClippingEnabled)
  const setClippingAxis = useOceanStore(s => s.setClippingAxis)
  const setClippingOffset = useOceanStore(s => s.setClippingOffset)
  const setClippingDirection = useOceanStore(s => s.setClippingDirection)

  // Isosurface State
  const isosurfaceEnabled = useOceanStore(s => s.isosurfaceEnabled)
  const isosurfaceValue = useOceanStore(s => s.isosurfaceValue)
  const isosurfaceTolerance = useOceanStore(s => s.isosurfaceTolerance)
  
  const setIsosurfaceEnabled = useOceanStore(s => s.setIsosurfaceEnabled)
  const setIsosurfaceValue = useOceanStore(s => s.setIsosurfaceValue)
  const setIsosurfaceTolerance = useOceanStore(s => s.setIsosurfaceTolerance)

  const selectedVariable = useOceanStore(s => s.selectedVariable)

  if (!isExpanded) return null

  // Setup variable min/max for isosurface slider
  let minVal = 0, maxVal = 35, unit = '°C'
  if (selectedVariable === 'salinity') { minVal = 30; maxVal = 40; unit = 'PSU' }
  if (selectedVariable === 'current') { minVal = 0; maxVal = 2; unit = 'm/s' }

  return (
    <div className="control-panel volume-controls" style={{ right: '280px', top: '24px', bottom: 'auto' }}>
      <div className="cp-header">
        <span className="cp-icon">🧊</span>
        <h3>Volume Rendering</h3>
      </div>

      <div className="cp-content">
        {/* ── 3D Slicing ── */}
        <div className="cp-section">
          <div className="cp-row">
            <span className="cp-label">Depth Slicer (3D Clip)</span>
            <label className="cp-switch">
              <input type="checkbox" checked={clippingEnabled} onChange={e => setClippingEnabled(e.target.checked)} />
              <span className="cp-slider-round"></span>
            </label>
          </div>
          
          {clippingEnabled && (
            <>
              <div className="cp-row" style={{ marginTop: '12px' }}>
                <span className="cp-label">Plane</span>
                <div className="cp-segmented">
                  <button className={clippingAxis === 'Y' ? 'active' : ''} onClick={() => setClippingAxis('Y')}>Horizontal</button>
                  <button className={clippingAxis === 'X' ? 'active' : ''} onClick={() => setClippingAxis('X')}>Vertical (X)</button>
                  <button className={clippingAxis === 'Z' ? 'active' : ''} onClick={() => setClippingAxis('Z')}>Vertical (Z)</button>
                </div>
              </div>
              <div className="cp-row" style={{ marginTop: '8px' }}>
                <span className="cp-label">Offset</span>
                <input 
                  type="range" 
                  min="-2" 
                  max="2" 
                  step="0.01" 
                  value={clippingOffset} 
                  onChange={e => setClippingOffset(parseFloat(e.target.value))} 
                  className="range-slider"
                />
              </div>
              <div className="cp-row">
                <button className="cp-btn" onClick={() => setClippingDirection(clippingDirection * -1)}>
                  Flip Direction
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Isosurfaces ── */}
        <div className="cp-section">
          <div className="cp-row">
            <span className="cp-label">Isosurfaces (Shells)</span>
            <label className="cp-switch">
              <input type="checkbox" checked={isosurfaceEnabled} onChange={e => setIsosurfaceEnabled(e.target.checked)} />
              <span className="cp-slider-round"></span>
            </label>
          </div>
          
          {isosurfaceEnabled && (
            <>
              <div className="cp-row" style={{ marginTop: '12px' }}>
                <span className="cp-label">Target {selectedVariable}</span>
                <span className="cp-value">{isosurfaceValue.toFixed(1)} {unit}</span>
              </div>
              <div className="cp-row">
                <input 
                  type="range" 
                  min={minVal} 
                  max={maxVal} 
                  step={(maxVal-minVal)/100} 
                  value={isosurfaceValue} 
                  onChange={e => setIsosurfaceValue(parseFloat(e.target.value))} 
                  className="range-slider"
                />
              </div>
              
              <div className="cp-row" style={{ marginTop: '8px' }}>
                <span className="cp-label">Thickness / Tolerance</span>
                <span className="cp-value">±{isosurfaceTolerance.toFixed(1)}</span>
              </div>
              <div className="cp-row">
                <input 
                  type="range" 
                  min="0.1" 
                  max={(maxVal-minVal)/5} 
                  step="0.1" 
                  value={isosurfaceTolerance} 
                  onChange={e => setIsosurfaceTolerance(parseFloat(e.target.value))} 
                  className="range-slider"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

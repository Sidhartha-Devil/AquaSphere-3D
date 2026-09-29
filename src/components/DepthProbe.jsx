// src/components/DepthProbe.jsx
import { useState, useEffect } from 'react'
import useOceanStore from '../store/oceanStore'
import './DepthProbe.css'

export default function DepthProbe() {
  const hoveredDepthInfo = useOceanStore((s) => s.hoveredDepthInfo)
  const morphProgress    = useOceanStore((s) => s.morphProgress)
  const isDataPanelOpen  = useOceanStore((s) => s.isDataPanelOpen)

  // Track cursor position
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  if (!hoveredDepthInfo || morphProgress < 0.9 || isDataPanelOpen) return null

  const { lat, lon, depth, region, zone } = hoveredDepthInfo

  // Tooltip offset from cursor (px)
  const OFFSET_X = 18
  const OFFSET_Y = 18
  const TOOLTIP_W = 260
  const TOOLTIP_H = 140

  // Flip sides if near right/bottom edge
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = mousePos.x + OFFSET_X + TOOLTIP_W > vw
    ? mousePos.x - TOOLTIP_W - OFFSET_X
    : mousePos.x + OFFSET_X
  const top = mousePos.y + OFFSET_Y + TOOLTIP_H > vh
    ? mousePos.y - TOOLTIP_H - OFFSET_Y
    : mousePos.y + OFFSET_Y

  // Zone colour
  let zoneColor = '#00d4ff'
  if (depth < -6000)       zoneColor = '#ff0055'
  else if (depth < -4000)  zoneColor = '#a855f7'
  else if (depth < -1000)  zoneColor = '#6366f1'
  else if (depth < -200)   zoneColor = '#0088ff'

  return (
    <div
      className="depth-probe-container"
      style={{ left, top }}
    >
      <div className="depth-probe-card">
        {/* Header */}
        <div className="dp-header-row">
          <span className="dp-sonar-icon">🛰️</span>
          <span className="dp-region">{region}</span>
        </div>

        {/* Depth */}
        <div className="dp-depth-row">
          <span className="dp-depth-label">Seabed Depth</span>
          <div>
            <span className="dp-depth-value">{Math.abs(Math.round(depth)).toLocaleString()}</span>
            <span className="dp-depth-unit">m</span>
          </div>
        </div>

        {/* Zone badge */}
        <div className="dp-zone" style={{ color: zoneColor }}>
          {zone} Zone
        </div>

        {/* Time */}
        <div className="dp-info-row">
          <span className="dp-info-icon">🕐</span>
          <span className="dp-info-text">Simulation Time: Present Day</span>
        </div>

        {/* Lat / Lon */}
        <div className="dp-info-row">
          <span className="dp-info-icon">📍</span>
          <span className="dp-info-text">
            {Math.abs(lat).toFixed(4)}° {lat >= 0 ? 'N' : 'S'},&nbsp;
            {Math.abs(lon).toFixed(4)}° {lon >= 0 ? 'E' : 'W'}
          </span>
        </div>
      </div>
    </div>
  )
}

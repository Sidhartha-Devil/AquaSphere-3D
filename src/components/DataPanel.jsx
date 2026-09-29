// src/components/DataPanel.jsx
import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import useOceanStore from '../store/oceanStore'
import './DataPanel.css'

const TYPE_ICONS = {
  argo: '🔵',
  glider: '🟠',
  ctd: '🟢',
  bgc: '🟣',
}

const TYPE_NAMES = {
  argo: 'Argo Float',
  glider: 'Underwater Glider',
  ctd: 'CTD Rosette System',
  bgc: 'Biogeochemical Sensor',
}

export default function DataPanel() {
  const isDataPanelOpen = useOceanStore((s) => s.isDataPanelOpen)
  const selectedInstrument = useOceanStore((s) => s.selectedInstrument)
  const closeDataPanel = useOceanStore((s) => s.closeDataPanel)

  const [activeChart, setActiveChart] = useState('temperature') // 'temperature' | 'salinity'

  if (!isDataPanelOpen || !selectedInstrument) return null

  const chartData = selectedInstrument.depthProfile.map((p) => ({
    depth: p.depth,
    temperature: p.temperature,
    salinity: p.salinity,
  }))

  const isTemp = activeChart === 'temperature'
  const lineColor = isTemp ? '#ff6b35' : '#00d4ff'
  const unit = isTemp ? '°C' : 'PSU'

  return (
    <div className="data-panel-backdrop">
      <div className="data-panel" id="instrument-data-panel">
        {/* Header */}
        <div className="dp-header">
          <div className="dp-header-info">
            <div
              className="dp-type-badge"
              style={{
                background: `${selectedInstrument.color}22`,
                border: `1px solid ${selectedInstrument.color}66`,
              }}
            >
              {TYPE_ICONS[selectedInstrument.type] || '📡'}
            </div>
            <div>
              <div className="dp-title">{selectedInstrument.name}</div>
              <div className="dp-meta">
                {TYPE_NAMES[selectedInstrument.type] || 'Sensor Platform'}
              </div>
            </div>
          </div>
          <button
            className="dp-close-btn"
            onClick={closeDataPanel}
            title="Close Panel"
            id="close-data-panel-btn"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="dp-content">
          {/* Quick Stats */}
          <div className="dp-grid-stats">
            <div className="dp-stat-card">
              <div className="dp-stat-label">Coordinates</div>
              <div className="dp-stat-val">
                {selectedInstrument.lat.toFixed(2)}°N, {selectedInstrument.lon.toFixed(2)}°E
              </div>
            </div>
            <div className="dp-stat-card">
              <div className="dp-stat-label">Status</div>
              <div
                className="dp-stat-val"
                style={{
                  color:
                    selectedInstrument.status === 'active' ? '#00f5a0' : '#ffd700',
                  textTransform: 'capitalize',
                }}
              >
                ● {selectedInstrument.status}
              </div>
            </div>
            <div className="dp-stat-card">
              <div className="dp-stat-label">Max Depth</div>
              <div className="dp-stat-val">5,000 m</div>
            </div>
            <div className="dp-stat-card">
              <div className="dp-stat-label">Last Transmission</div>
              <div className="dp-stat-val" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                {selectedInstrument.lastPing}
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="dp-chart-section">
            <div className="dp-chart-header">
              <div className="dp-chart-title">
                <span>{isTemp ? '🌡️ Temp Profile' : '🧂 Salinity Profile'}</span>
              </div>
              <div className="dp-chart-toggle">
                <button
                  className={`dp-tab-btn ${isTemp ? 'active' : ''}`}
                  onClick={() => setActiveChart('temperature')}
                >
                  Temp (°C)
                </button>
                <button
                  className={`dp-tab-btn ${!isTemp ? 'active' : ''}`}
                  onClick={() => setActiveChart('salinity')}
                >
                  Salinity
                </button>
              </div>
            </div>

            <div className="dp-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: -10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0, 212, 255, 0.1)"
                  />
                  <XAxis
                    type="number"
                    domain={isTemp ? [0, 32] : [34, 37]}
                    stroke="rgba(160, 200, 230, 0.5)"
                    tick={{ fontSize: 10, fill: 'rgba(160, 200, 230, 0.6)' }}
                    unit={unit}
                  />
                  <YAxis
                    dataKey="depth"
                    type="number"
                    reversed
                    stroke="rgba(160, 200, 230, 0.5)"
                    tick={{ fontSize: 10, fill: 'rgba(160, 200, 230, 0.6)' }}
                    unit="m"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(5, 18, 35, 0.95)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#e0f4ff',
                    }}
                    formatter={(val) => [`${val} ${unit}`, isTemp ? 'Temperature' : 'Salinity']}
                    labelFormatter={(label) => `Depth: ${label} meters`}
                  />
                  <Line
                    type="monotone"
                    dataKey={isTemp ? 'temperature' : 'salinity'}
                    stroke={lineColor}
                    strokeWidth={2.5}
                    dot={{ fill: lineColor, r: 3 }}
                    activeDot={{ r: 5, fill: '#fff', stroke: lineColor }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer info */}
          <div className="dp-footer-notes">
            Compliant with INCOIS / NetCDF CF conventions. Standard CTD calibration cycle verified.
          </div>
        </div>
      </div>
    </div>
  )
}

// src/components/Legend.jsx
import useOceanStore from '../store/oceanStore'
import { COLOR_PALETTES, VARIABLE_RANGES, DEPTH_LEVELS } from '../data/mockOceanData'
import './Legend.css'

export default function Legend() {
  const selectedVariable = useOceanStore((s) => s.selectedVariable)
  const colorPalette = useOceanStore((s) => s.colorPalette)
  const morphProgress = useOceanStore((s) => s.morphProgress)
  const activeDepthIndex = useOceanStore((s) => s.activeDepthIndex)
  const setActiveDepthIndex = useOceanStore((s) => s.setActiveDepthIndex)

  const meta = VARIABLE_RANGES[selectedVariable] || VARIABLE_RANGES.temperature
  const palette = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.thermal
  const gradient = `linear-gradient(to right, ${palette.join(', ')})`

  const showDepthSlices = morphProgress > 0.4

  return (
    <div className="ocean-legend">
      {/* Variable Color Legend */}
      <div className="legend-card">
        <div className="legend-header">
          <span className="legend-title">{meta.label}</span>
          <span className="legend-unit">{meta.unit}</span>
        </div>
        <div className="color-bar" style={{ background: gradient }} />
        <div className="legend-labels">
          <span>{meta.min} {meta.unit}</span>
          <span>{((meta.min + meta.max) / 2).toFixed(1)}</span>
          <span>{meta.max} {meta.unit}</span>
        </div>
      </div>

      {/* Depth Selector Pills in Flat Map View */}
      {showDepthSlices && (
        <div className="depth-legend-card">
          <div className="depth-legend-title">Depth Slices (Layers)</div>
          <div className="depth-pills">
            {DEPTH_LEVELS.map((depth, idx) => (
              <button
                key={depth}
                className={`depth-pill ${activeDepthIndex === idx ? 'active' : ''}`}
                onClick={() =>
                  setActiveDepthIndex(activeDepthIndex === idx ? null : idx)
                }
              >
                {depth}m
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

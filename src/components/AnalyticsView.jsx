import { useState, useRef, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts'
import useOceanStore from '../store/oceanStore'
import { uploadDataFile, runPrediction, downloadPredictionCSV } from '../services/predictionApi'
import Papa from 'papaparse'
import { TrendingUp, FolderOpen, Sparkles, Zap, Globe, Download, Waves, CheckCircle, Calendar, Hash, Clock, AlertTriangle, Info, BarChart2 } from 'lucide-react'
import './AnalyticsView.css'

const VARIABLES = [
  { key: 'temperature', label: 'Temperature',   unit: '°C',    color: '#ff6b35' },
  { key: 'salinity',    label: 'Salinity',       unit: 'PSU',   color: '#00d4ff' },
  { key: 'u_current',  label: 'U Current',       unit: 'cm/s',  color: '#a855f7' },
  { key: 'v_current',  label: 'V Current',       unit: 'cm/s',  color: '#22c55e' },
  { key: 'chlorophyll',label: 'Chlorophyll',     unit: 'mg/m³', color: '#84cc16' },
]

// ── Custom Tooltip for charts ────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }} className="chart-tooltip-row">
          <span>{p.name}:</span>
          <strong>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value} {unit}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Single variable chart ─────────────────────────────────────────────────
function VarChart({ variable, chartData }) {
  const histData = chartData.filter(d => d.type === 'historical')
  const predData = chartData.filter(d => d.type === 'predicted')
  const splitTime = histData.length ? histData[histData.length - 1]?.time : null

  return (
    <div className="var-chart-card">
      <div className="var-chart-header">
        <span className="var-dot" style={{ background: variable.color }} />
        <span className="var-name">{variable.label}</span>
        <span className="var-unit">{variable.unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
          <Tooltip content={<CustomTooltip unit={variable.unit} />} />
          {splitTime && <ReferenceLine x={splitTime} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 2" label={{ value: 'Now', fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />}
          <Line
            type="monotone"
            dataKey={variable.key}
            stroke={variable.color}
            dot={false}
            strokeWidth={1.8}
            name={variable.label}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main Analytics View ───────────────────────────────────────────────────
export default function AnalyticsView() {
  const setPredictionResult = useOceanStore(s => s.setPredictionResult)
  const setIsPredicting     = useOceanStore(s => s.setIsPredicting)
  const isPredicting        = useOceanStore(s => s.isPredicting)
  const predictionResult    = useOceanStore(s => s.predictionResult)
  const setCurrentView      = useOceanStore(s => s.setCurrentView)
  const setUserDataset      = useOceanStore(s => s.setUserDataset)
  const setShowWaterSurface = useOceanStore(s => s.setShowWaterSurface)
  const setShowWaterDirection = useOceanStore(s => s.setShowWaterDirection)
  const setShowCurrents     = useOceanStore(s => s.setShowCurrents)
  const setTotalTimeSteps   = useOceanStore(s => s.setTotalTimeSteps)
  const setIsPlaying        = useOceanStore(s => s.setIsPlaying)
  const setCurrentTimeStep  = useOceanStore(s => s.setCurrentTimeStep)

  const [uploadedFile, setUploadedFile]     = useState(null)
  const [uploadedRows, setUploadedRows]     = useState(null)
  const [numWeeks, setNumWeeks]             = useState(3)
  const [sessionId, setSessionId]           = useState(null)
  const [isDragging, setIsDragging]         = useState(false)
  const [status, setStatus]                 = useState(null) // { type: 'info'|'error'|'success', msg }
  const [activeVarIdx, setActiveVarIdx]     = useState(0)
  const [downloadUrl, setDownloadUrl]       = useState(null)
  const fileInputRef = useRef()

  // Parse uploaded CSV to get rows for mock predictor
  const parseFile = useCallback((file) => {
    setUploadedFile(file)
    setStatus({ type: 'info', msg: `Parsing ${file.name}…` })
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const rows = result.data
        setUploadedRows(rows)
        setStatus({ type: 'success', msg: `✓ Loaded ${rows.length.toLocaleString()} rows from ${file.name}` })
        // Upload to API (or get mock session)
        const res = await uploadDataFile(file)
        setSessionId(res.sessionId)
      },
      error: (err) => setStatus({ type: 'error', msg: `Parse error: ${err.message}` }),
    })
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) parseFile(file)
  }

  const handlePredict = async () => {
    if (!uploadedRows) return
    setIsPredicting(true)
    setStatus({ type: 'info', msg: `Running ${numWeeks}-week prediction…` })
    try {
      const res = await runPrediction(sessionId, numWeeks, uploadedRows)
      const result = res.data
      setPredictionResult(result)
      setDownloadUrl(null)
      setStatus({
        type: 'success',
        msg: `✓ Predicted ${result.rows.length.toLocaleString()} future time steps (${numWeeks} weeks)`,
      })
    } catch (err) {
      setStatus({ type: 'error', msg: `Prediction failed: ${err.message}` })
    } finally {
      setIsPredicting(false)
    }
  }

  const handleViewInGlobe = () => {
    if (!predictionResult) return
    // Convert predicted rows into an OceanDataset and push to globe
    const rows = predictionResult.rows
    const timestamps = [...new Set(rows.map(r => r.timestamp))].sort()
    const dataset = {
      filename: `Predicted ${numWeeks}-week forecast`,
      rows,
      timestamps,
      meta: {
        latRange: [
          Math.min(...rows.map(r => r.latitude)),
          Math.max(...rows.map(r => r.latitude)),
        ],
        lonRange: [
          Math.min(...rows.map(r => r.longitude)),
          Math.max(...rows.map(r => r.longitude)),
        ],
        depthRange: [0, 5000],
        variables: ['temperature', 'salinity', 'u_current', 'v_current', 'chlorophyll'],
        timeSteps: timestamps.length,
        rowCount: rows.length,
      },
      isPredicted: true,
    }
    setUserDataset(dataset)
    // Auto-enable relevant overlays and kick off animation
    setShowWaterSurface(true)
    setShowWaterDirection(true)
    setShowCurrents(true)
    setTotalTimeSteps(timestamps.length)
    setCurrentTimeStep(0)
    setIsPlaying(true)
    setCurrentView('globe')
  }

  const handleDownload = async () => {
    if (!predictionResult) return
    const url = await downloadPredictionCSV(sessionId, predictionResult.rows)
    setDownloadUrl(url)
    const a = document.createElement('a')
    a.href = url
    a.download = `ocean_prediction_${numWeeks}w.csv`
    a.click()
  }

  const r = predictionResult

  return (
    <div className="analytics-view">
      {/* ── Header ── */}
      <div className="av-header">
        <div className="av-title-row">
          <span className="av-icon"><TrendingUp size={28} strokeWidth={1.5} /></span>
          <div>
            <h1 className="av-title">Ocean Prediction Engine</h1>
            <p className="av-subtitle">LSTM Multi-Week Forecasting · Based on MlModel.md</p>
          </div>
        </div>
      </div>

      <div className="av-body">
        {/* ── Left Panel: Controls ── */}
        <div className="av-sidebar">

          {/* Upload */}
          <div className="av-card">
            <div className="av-card-title"><FolderOpen size={16} strokeWidth={1.5} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> Data Upload</div>
            <div
              className={`av-dropzone ${isDragging ? 'dragging' : ''} ${uploadedFile ? 'has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.nc" style={{ display: 'none' }} onChange={handleFileInput} />
              {uploadedFile ? (
                <>
                  <div className="av-dz-icon"><CheckCircle size={36} strokeWidth={1.2} style={{color:'#00ff99'}} /></div>
                  <div className="av-dz-name">{uploadedFile.name}</div>
                  <div className="av-dz-sub">{uploadedRows?.length?.toLocaleString()} rows loaded</div>
                </>
              ) : (
                <>
                  <div className="av-dz-icon"><FolderOpen size={36} strokeWidth={1.2} style={{color:'#ffd700'}} /></div>
                  <div className="av-dz-label">Drop CSV / NetCDF here</div>
                  <div className="av-dz-sub">or click to browse</div>
                </>
              )}
            </div>

            {status && (
              <div className={`av-status av-status-${status.type}`}>{status.msg}</div>
            )}
          </div>

          {/* Prediction Controls */}
          <div className="av-card">
            <div className="av-card-title"><Sparkles size={16} strokeWidth={1.5} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> Forecast Settings</div>

            <div className="av-form-row">
              <label className="av-label">Weeks to Predict</label>
              <div className="av-slider-row">
                <input
                  type="range" min={1} max={6} step={1}
                  value={numWeeks}
                  onChange={e => setNumWeeks(+e.target.value)}
                  className="av-slider"
                />
                <span className="av-slider-val">{numWeeks}w</span>
              </div>
            </div>

            <div className="av-form-row">
              <label className="av-label">Model Architecture</label>
              <div className="av-badge-row">
                <span className="av-badge active">LSTM + Attention</span>
                <span className="av-badge">TFT (soon)</span>
              </div>
            </div>

            <button
              className={`av-predict-btn ${isPredicting ? 'loading' : ''}`}
              onClick={handlePredict}
              disabled={!uploadedRows || isPredicting}
            >
              {isPredicting ? (
                <><span className="av-spinner" /> Predicting…</>
              ) : (
                <><Zap size={14} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> Run Prediction</>
              )}
            </button>
          </div>

          {/* Actions (only after prediction) */}
          {r && (
            <div className="av-card">
              <div className="av-card-title"><Zap size={16} strokeWidth={1.5} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> Actions</div>
              <button className="av-action-btn primary" onClick={handleViewInGlobe}>
                🌍 View in 3D Globe
              </button>
              <button className="av-action-btn" onClick={handleDownload}>
                ⬇️ Download CSV
              </button>
            </div>
          )}
        </div>

        {/* ── Right Panel: Results ── */}
        <div className="av-main">
          {!r ? (
            <div className="av-empty">
              <div className="av-empty-icon"><Waves size={56} strokeWidth={1} style={{color:'#ffd700', opacity:0.7}} /></div>
              <h2>Upload data &amp; run prediction</h2>
              <p>The LSTM engine will forecast ocean variables for your chosen number of weeks.<br/>Results will appear here as interactive charts.</p>
              <div className="av-steps">
                <div className="av-step"><span>1</span> Upload CSV / NetCDF file</div>
                <div className="av-step"><span>2</span> Set number of weeks</div>
                <div className="av-step"><span>3</span> Click Run Prediction</div>
                <div className="av-step"><span>4</span> View in 3D Globe</div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Meta row ── */}
              <div className="av-result-meta">
                <div className="av-meta-chip"><Calendar size={12} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> {r.meta?.numWeeks} weeks forecast</div>
                <div className="av-meta-chip"><Hash size={12} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> {r.rows.length.toLocaleString()} predictions</div>
                <div className="av-meta-chip"><Clock size={12} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> {r.meta?.startTs ? new Date(r.meta.startTs).toLocaleDateString() : '—'} → {r.meta?.endTs ? new Date(r.meta.endTs).toLocaleDateString() : '—'}</div>
                <div className="av-meta-chip av-meta-mock"><Zap size={12} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> Mock predictor</div>
              </div>

              {/* ── Variable tabs ── */}
              <div className="av-var-tabs">
                {VARIABLES.map((v, i) => (
                  <button
                    key={v.key}
                    className={`av-var-tab ${i === activeVarIdx ? 'active' : ''}`}
                    style={{ '--tab-color': v.color }}
                    onClick={() => setActiveVarIdx(i)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* ── Focused chart ── */}
              <div className="av-focused-chart">
                <VarChart variable={VARIABLES[activeVarIdx]} chartData={r.chartData} />
              </div>

              {/* ── Summary table ── */}
              <div className="av-section-title"><BarChart2 size={14} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> Prediction Statistics</div>
              <div className="av-stats-table">
                <table>
                  <thead>
                    <tr>
                      <th>Variable</th><th>Min</th><th>Mean</th><th>Max</th><th>Std Dev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VARIABLES.map(v => {
                      const s = r.summary?.[v.key] || {}
                      return (
                        <tr key={v.key}>
                          <td><span className="av-dot" style={{ background: v.color }} />{v.label} ({v.unit})</td>
                          <td>{s.min ?? '—'}</td>
                          <td><strong>{s.mean ?? '—'}</strong></td>
                          <td>{s.max ?? '—'}</td>
                          <td>{s.std ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Anomaly Alerts ── */}
              {r.anomalies?.length > 0 && (
                <>
                  <div className="av-section-title"><AlertTriangle size={14} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> Detected Anomalies</div>
                  <div className="av-anomalies">
                    {r.anomalies.map((a, i) => (
                      <div className="av-anomaly-row" key={i}>
                        <span className="av-anomaly-ts">{new Date(a.ts).toLocaleString()}</span>
                        <span className="av-anomaly-msg">{a.msg}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Confidence banner ── */}
              <div className="av-confidence-note">
                <Info size={14} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> Predictions use recursive LSTM-style forecasting with physical bounds clamping. Connect the Python FastAPI backend (port 8000) for true ML predictions.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

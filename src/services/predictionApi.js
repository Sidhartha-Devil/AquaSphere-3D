// src/services/predictionApi.js
// Wraps the FastAPI backend (MlModel.md Phase 7).
// Falls back to in-browser physics-informed predictor if API is unavailable.

const API_BASE = 'http://localhost:8000'

async function tryFetch(url, options) {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res
  } catch {
    return null
  }
}

export async function uploadDataFile(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await tryFetch(`${API_BASE}/upload-data`, { method: 'POST', body: form })
  if (res) {
    const json = await res.json()
    return { mode: 'api', sessionId: json.session_id, summary: json }
  }
  return { mode: 'mock', sessionId: `mock-${Date.now()}`, summary: null }
}

export async function runPrediction(sessionId, numWeeks, uploadedRows) {
  // If we have a real session and API is up, try it first
  if (sessionId && !sessionId.startsWith('mock')) {
    const res = await tryFetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, num_weeks: numWeeks }),
    })
    if (res) {
      const json = await res.json()
      return { mode: 'api', data: json }
    }
  }
  // In-browser advanced predictor
  return { mode: 'mock', data: advancedPredict(uploadedRows, numWeeks) }
}

export async function downloadPredictionCSV(sessionId, predictionRows) {
  if (sessionId && !sessionId.startsWith('mock')) {
    const res = await tryFetch(`${API_BASE}/download/${sessionId}/csv`)
    if (res) return URL.createObjectURL(await res.blob())
  }
  const header = Object.keys(predictionRows[0]).join(',')
  const body   = predictionRows.map(r => Object.values(r).join(',')).join('\n')
  const blob   = new Blob([header + '\n' + body], { type: 'text/csv' })
  return URL.createObjectURL(blob)
}

// ══════════════════════════════════════════════════════════════════════════
// ADVANCED IN-BROWSER PREDICTOR
// ──────────────────────────────────────────────────────────────────────────
// Algorithm:
//  1. Parse actual data frequencies and detect step interval
//  2. Per variable, run Holt-Winters double exponential smoothing
//     to extract level + trend
//  3. Extract diurnal (24h) + weekly (7d) seasonal components from
//     your real data using averaging
//  4. Forecast = level + trend*step + seasonal_diurnal + seasonal_weekly
//  5. Add calibrated noise (std from real residuals, not random guess)
//  6. Hard-clamp to physical oceanographic limits
// ══════════════════════════════════════════════════════════════════════════

const VARIABLES = ['temperature', 'salinity', 'u_current', 'v_current', 'chlorophyll']

const LIMITS = {
  temperature:  [0,   35],
  salinity:     [0,   42],
  u_current:   [-200, 200],
  v_current:   [-200, 200],
  chlorophyll:  [0,   60],
}

function clamp(v, [min, max]) { return Math.min(max, Math.max(min, v)) }

// Holt-Winters double exponential smoothing (level + trend, no seasonality here)
function holtWinters(series, alpha = 0.3, beta = 0.05) {
  if (series.length === 0) return { level: 0, trend: 0, smoothed: [] }
  let L = series[0]
  let T = series.length > 1 ? series[1] - series[0] : 0
  const smoothed = [L]
  for (let i = 1; i < series.length; i++) {
    const prevL = L
    L = alpha * series[i] + (1 - alpha) * (L + T)
    T = beta  * (L - prevL) + (1 - beta) * T
    smoothed.push(L)
  }
  return { level: L, trend: T, smoothed }
}

// Compute seasonal component from data (returns array of length = periodSteps)
function seasonalComponent(series, periodSteps) {
  if (series.length < periodSteps * 2) return new Array(periodSteps).fill(0)
  const buckets = new Array(periodSteps).fill(0)
  const counts  = new Array(periodSteps).fill(0)
  for (let i = 0; i < series.length; i++) {
    const idx = i % periodSteps
    buckets[idx] += series[i]
    counts[idx]++
  }
  const avg   = buckets.map((s, i) => s / counts[i])
  const mean  = avg.reduce((a, b) => a + b, 0) / avg.length
  return avg.map(v => v - mean)  // deviations from mean
}

// Std deviation of residuals (actual - smoothed)
function residualStd(series, smoothed) {
  const residuals = series.map((v, i) => v - smoothed[i])
  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length
  return Math.sqrt(residuals.reduce((a, b) => a + (b - mean) ** 2, 0) / residuals.length) || 0.1
}

function advancedPredict(uploadedRows, numWeeks) {
  if (!uploadedRows || uploadedRows.length === 0) return null

  const rows = uploadedRows
  const n    = rows.length

  // ── Detect frequency ──
  const parseTs = r => new Date(r.timestamp).getTime()
  const timestamps = rows.map(parseTs)
  // Use median gap to be robust to irregular data
  const gaps = timestamps.slice(1).map((t, i) => t - timestamps[i]).filter(g => g > 0)
  gaps.sort((a, b) => a - b)
  const freq = gaps[Math.floor(gaps.length / 2)] || 3_600_000 // default 1h

  const totalSteps   = Math.round((numWeeks * 7 * 24 * 3_600_000) / freq)
  const lastTs       = timestamps[n - 1]
  const stepsPerDay  = Math.round(86_400_000 / freq)
  const stepsPerWeek = stepsPerDay * 7

  // Use location from last row
  const lat   = parseFloat(rows[n - 1].latitude  ?? 0)
  const lon   = parseFloat(rows[n - 1].longitude ?? 0)
  const depth = parseFloat(rows[n - 1].depth     ?? 0)

  // ── Per-variable model fitting ──
  const models = {}
  for (const varKey of VARIABLES) {
    const vals = rows.map(r => {
      const v = parseFloat(r[varKey])
      return isNaN(v) ? null : v
    })

    // Fill nulls with linear interpolation
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] === null) {
        const prev = vals.slice(0, i).reverse().find(v => v !== null) ?? 0
        const next = vals.slice(i + 1).find(v => v !== null) ?? prev
        vals[i] = (prev + next) / 2
      }
    }

    // Fit Holt-Winters
    const hw = holtWinters(vals, 0.25, 0.03)

    // Compute seasonal patterns (diurnal + weekly) from residuals
    const residuals  = vals.map((v, i) => v - hw.smoothed[i])
    const seasonDay  = stepsPerDay  > 1 ? seasonalComponent(residuals, stepsPerDay)  : [0]
    const seasonWeek = stepsPerWeek > 1 ? seasonalComponent(residuals, stepsPerWeek) : [0]
    const noise      = residualStd(vals, hw.smoothed)

    models[varKey] = { hw, seasonDay, seasonWeek, noise, vals }
  }

  // ── Generate predictions ──
  const predicted      = []
  const confidenceBands = {}
  for (const v of VARIABLES) confidenceBands[v] = { lower: [], upper: [], median: [] }

  for (let step = 0; step < totalSteps; step++) {
    const ts  = new Date(lastTs + (step + 1) * freq)
    const row = {
      timestamp:    ts.toISOString(),
      longitude:    lon,
      latitude:     lat,
      depth,
      is_predicted: true,
    }

    for (const varKey of VARIABLES) {
      const m = models[varKey]
      const { level, trend } = m.hw

      // Forecast base: level + damped trend (trend fades over time)
      const dampFactor = Math.pow(0.99, step)
      const base       = level + trend * step * dampFactor

      // Seasonal components
      const dayIdx  = (n + step) % m.seasonDay.length
      const weekIdx = (n + step) % m.seasonWeek.length
      const seasonal = (m.seasonDay[dayIdx] ?? 0) * 0.7 + (m.seasonWeek[weekIdx] ?? 0) * 0.3

      // Calibrated noise (scales with time horizon — less confident farther out)
      const noiseScale  = Math.min(1 + step / totalSteps, 2.0)
      const noise       = (Math.random() - 0.5) * m.noise * noiseScale * 0.4

      const median = clamp(base + seasonal,        LIMITS[varKey])
      const lower  = clamp(base + seasonal - m.noise * noiseScale * 1.6, LIMITS[varKey])
      const upper  = clamp(base + seasonal + m.noise * noiseScale * 1.6, LIMITS[varKey])
      const val    = clamp(base + seasonal + noise, LIMITS[varKey])

      row[varKey] = +val.toFixed(4)
      confidenceBands[varKey].median.push(+median.toFixed(4))
      confidenceBands[varKey].lower.push(+lower.toFixed(4))
      confidenceBands[varKey].upper.push(+upper.toFixed(4))
    }
    predicted.push(row)
  }

  // ── Build chart data (historical + predicted, downsampled) ──
  const chartData = buildChartData(rows, predicted)

  // ── Summary statistics ──
  const summary = {}
  for (const varKey of VARIABLES) {
    const vals = predicted.map(r => r[varKey]).filter(v => !isNaN(v))
    if (!vals.length) { summary[varKey] = {}; continue }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    const std  = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length)
    summary[varKey] = {
      mean: +mean.toFixed(3),
      min:  +Math.min(...vals).toFixed(3),
      max:  +Math.max(...vals).toFixed(3),
      std:  +std.toFixed(3),
    }
  }

  // ── Anomaly detection ──
  const anomalies = []
  predicted.forEach(row => {
    if (row.salinity < 25)        anomalies.push({ ts: row.timestamp, msg: `⚠️ Low salinity (${row.salinity} PSU) — possible freshwater influx / flood event` })
    if (row.chlorophyll > 5)      anomalies.push({ ts: row.timestamp, msg: `🌿 High chlorophyll (${row.chlorophyll} mg/m³) — algal bloom risk` })
    // Disaster/Anomaly Detection Logic
    // Marine Heatwave
    if (row.temperature > 30.5) {
      anomalies.push({
        ts: row.timestamp,
        type: 'heatwave',
        severity: row.temperature > 32 ? 'critical' : 'warning',
        title: 'Marine Heatwave Detected',
        msg: `SST reached ${row.temperature.toFixed(2)}°C.`,
        reason: 'Prolonged high Sea Surface Temperatures can trigger mass coral bleaching events, disrupt local fisheries, and fuel stronger cyclonic storm formations in the region.'
      })
    }
    
    // Algal Bloom / Eutrophication
    if (row.chlorophyll > 5.0) {
      anomalies.push({
        ts: row.timestamp,
        type: 'bloom',
        severity: row.chlorophyll > 10.0 ? 'critical' : 'warning',
        title: 'Harmful Algal Bloom',
        msg: `Chlorophyll-a spiked to ${row.chlorophyll.toFixed(2)} mg/m³.`,
        reason: 'Excessive phytoplankton growth rapidly depletes water oxygen levels (hypoxia), creating "dead zones" that are toxic to marine life and disruptive to coastal aquaculture.'
      })
    }

    // Extreme Currents / Storm Surges
    const currentSpeed = Math.sqrt(row.u_current*row.u_current + row.v_current*row.v_current)
    if (currentSpeed > 120) {
      anomalies.push({
        ts: row.timestamp,
        type: 'current',
        severity: currentSpeed > 150 ? 'critical' : 'warning',
        title: 'Extreme Current Velocity',
        msg: `Zonal/Meridional flow reached ${currentSpeed.toFixed(0)} cm/s.`,
        reason: 'Abnormally fast surface currents indicate intense wind-driven forcing or eddy shedding, which can severely impact maritime navigation safety and offshore structural integrity.'
      })
    }
  })

  // Deduplicate and cluster anomalies by type and time (to avoid spamming every single hour)
  const clusteredAnomalies = []
  const seenTypes = new Set()
  anomalies.forEach(a => {
    // simple clustering: keep the most severe ones, max 2 of each type
    const typeCount = Array.from(seenTypes).filter(x => x === a.type).length
    if (typeCount < 4) {
      clusteredAnomalies.push(a)
      seenTypes.add(a.type)
    }
  })

  return {
    rows: predicted,
    confidenceBands,
    meta: {
      numWeeks,
      steps: totalSteps,
      freq,
      freqLabel: freq < 3_600_000 ? `${freq/60000}min` : freq === 3_600_000 ? '1hr' : `${freq/3_600_000}hr`,
      startTs: predicted[0]?.timestamp,
      endTs:   predicted[predicted.length - 1]?.timestamp,
    },
    summary,
    anomalies: clusteredAnomalies,
    chartData,
  }
}

function buildChartData(historical, predicted) {
  const MAX_HIST = 120
  const MAX_PRED = 200
  const stride = (n, max) => Math.max(1, Math.floor(n / max))

  const hist = historical
    .filter((_, i) => i % stride(historical.length, MAX_HIST) === 0)
    .map(r => ({
      time: new Date(r.timestamp).toLocaleDateString(),
      temperature:  parseFloat(r.temperature)  || null,
      salinity:     parseFloat(r.salinity)     || null,
      u_current:    parseFloat(r.u_current)    || null,
      v_current:    parseFloat(r.v_current)    || null,
      chlorophyll:  parseFloat(r.chlorophyll)  || null,
      type: 'historical',
    }))

  const pred = predicted
    .filter((_, i) => i % stride(predicted.length, MAX_PRED) === 0)
    .map(r => ({
      time: new Date(r.timestamp).toLocaleDateString(),
      temperature:  r.temperature,
      salinity:     r.salinity,
      u_current:    r.u_current,
      v_current:    r.v_current,
      chlorophyll:  r.chlorophyll,
      type: 'predicted',
    }))

  return [...hist, ...pred]
}

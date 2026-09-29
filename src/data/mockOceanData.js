// src/data/mockOceanData.js
// Realistic mock ocean data for the Indian Ocean / Bay of Bengal region

// ── Depth levels (meters) ──
export const DEPTH_LEVELS = [0, 50, 100, 200, 500, 1000, 2000, 3000, 5000]

// ── Color palettes ──
export const COLOR_PALETTES = {
  thermal: [
    '#0000ff', '#0044ff', '#0088ff', '#00ccff',
    '#00ffcc', '#00ff88', '#ffff00', '#ffaa00', '#ff4400', '#ff0000'
  ],
  ocean: [
    '#03045e', '#023e8a', '#0077b6', '#0096c7',
    '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8', '#e0f7ff'
  ],
  viridis: [
    '#440154', '#482777', '#3f4a8a', '#31678e',
    '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825', '#fde725'
  ],
  rainbow: [
    '#7400b8', '#6930c3', '#5e60ce', '#5390d9',
    '#4ea8de', '#48bfe3', '#56cfe1', '#64dfdf', '#72efdd', '#80ffdb'
  ],
  grayscale: [
    '#050505', '#1a1a1a', '#2e2e2e', '#444444',
    '#5c5c5c', '#777777', '#929292', '#aeaeae', '#cacaca', '#e8e8e8'
  ],
}

// ── Variable ranges ──
export const VARIABLE_RANGES = {
  temperature: { min: 2, max: 32, unit: '°C', label: 'Temperature' },
  salinity:    { min: 32, max: 38, unit: 'PSU', label: 'Salinity' },
  current:     { min: 0, max: 1.5, unit: 'm/s', label: 'Current Speed' },
}

// ── Mock 3D temperature grid (simplified: 6 lon × 5 lat × 9 depth) ──
// Values represent temperature °C at each grid point
export function generateOceanGrid() {
  const lons = [60, 70, 80, 90, 95, 100]  // Indian Ocean longitudes
  const lats = [-10, 0, 10, 20, 25]       // Indian Ocean latitudes
  const grid = []

  for (let li = 0; li < lons.length; li++) {
    for (let la = 0; la < lats.length; la++) {
      for (let di = 0; di < DEPTH_LEVELS.length; di++) {
        const depth = DEPTH_LEVELS[di]
        const lat = lats[la]
        const lon = lons[li]

        // Temperature decreases with depth, warmer near equator
        const surfaceTemp = 28 - Math.abs(lat) * 0.3 + (Math.random() - 0.5) * 2
        const depthFactor = Math.exp(-depth / 800)
        const temp = 2 + (surfaceTemp - 2) * depthFactor + (Math.random() - 0.5) * 0.5

        // Salinity — slightly higher at surface, varies by region
        const salinity = 35.2 + Math.sin(lat * 0.1) * 0.8 + depth * 0.0003 + (Math.random() - 0.5) * 0.3

        // Current speed — faster near surface
        const current = Math.max(0, 0.8 * Math.exp(-depth / 300) + (Math.random() - 0.5) * 0.2)

        grid.push({ lon, lat, depth, temp: +temp.toFixed(2), salinity: +salinity.toFixed(2), current: +current.toFixed(3) })
      }
    }
  }
  return grid
}

// ── Instrument data ──
export const INSTRUMENTS = [
  {
    id: 'argo-001',
    type: 'argo',
    name: 'Argo Float IN-2401',
    lat: 12.4,
    lon: 78.2,
    lastPing: '2024-08-28 06:14 UTC',
    status: 'active',
    color: '#00d4ff',
    depthProfile: DEPTH_LEVELS.map((d, i) => ({
      depth: d,
      temperature: +(28 - i * 2.6 + (Math.random() - 0.5) * 0.8).toFixed(2),
      salinity:    +(35.5 - i * 0.15 + (Math.random() - 0.5) * 0.1).toFixed(2),
    })),
  },
  {
    id: 'glider-007',
    type: 'glider',
    name: 'Slocum Glider SG-07',
    lat: 6.8,
    lon: 85.1,
    lastPing: '2024-08-28 07:02 UTC',
    status: 'active',
    color: '#ff6b35',
    depthProfile: DEPTH_LEVELS.map((d, i) => ({
      depth: d,
      temperature: +(27.2 - i * 2.4 + (Math.random() - 0.5) * 1.0).toFixed(2),
      salinity:    +(35.8 - i * 0.18 + (Math.random() - 0.5) * 0.12).toFixed(2),
    })),
  },
  {
    id: 'ctd-003',
    type: 'ctd',
    name: 'CTD Rosette CTD-03',
    lat: 18.3,
    lon: 72.6,
    lastPing: '2024-08-27 14:33 UTC',
    status: 'idle',
    color: '#00f5a0',
    depthProfile: DEPTH_LEVELS.map((d, i) => ({
      depth: d,
      temperature: +(24.1 - i * 2.1 + (Math.random() - 0.5) * 0.6).toFixed(2),
      salinity:    +(36.1 - i * 0.12 + (Math.random() - 0.5) * 0.08).toFixed(2),
    })),
  },
  {
    id: 'bgc-012',
    type: 'bgc',
    name: 'BGC Float BF-12',
    lat: -4.5,
    lon: 68.0,
    lastPing: '2024-08-28 05:55 UTC',
    status: 'active',
    color: '#bf5af2',
    depthProfile: DEPTH_LEVELS.map((d, i) => ({
      depth: d,
      temperature: +(29.5 - i * 2.8 + (Math.random() - 0.5) * 0.7).toFixed(2),
      salinity:    +(34.9 - i * 0.10 + (Math.random() - 0.5) * 0.09).toFixed(2),
    })),
  },
  {
    id: 'argo-055',
    type: 'argo',
    name: 'Argo Float IN-5502',
    lat: 22.1,
    lon: 91.4,
    lastPing: '2024-08-28 03:20 UTC',
    status: 'active',
    color: '#00d4ff',
    depthProfile: DEPTH_LEVELS.map((d, i) => ({
      depth: d,
      temperature: +(26.8 - i * 2.3 + (Math.random() - 0.5) * 0.9).toFixed(2),
      salinity:    +(35.3 - i * 0.14 + (Math.random() - 0.5) * 0.11).toFixed(2),
    })),
  },
  {
    id: 'ctd-009',
    type: 'ctd',
    name: 'CTD Rosette CTD-09',
    lat: 0.5,
    lon: 73.5,
    lastPing: '2024-08-27 20:10 UTC',
    status: 'idle',
    color: '#00f5a0',
    depthProfile: DEPTH_LEVELS.map((d, i) => ({
      depth: d,
      temperature: +(29.8 - i * 2.7 + (Math.random() - 0.5) * 0.5).toFixed(2),
      salinity:    +(34.7 - i * 0.11 + (Math.random() - 0.5) * 0.07).toFixed(2),
    })),
  },
]

// ── Helper: get depth layer color from value ──
export function getColorForValue(value, variable, palette = 'thermal') {
  const range = VARIABLE_RANGES[variable]
  const colors = COLOR_PALETTES[palette]
  const t = Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)))
  const idx = Math.floor(t * (colors.length - 1))
  return colors[Math.min(idx, colors.length - 1)]
}

// ── Time steps (simulate different days) ──
export const TIME_STEPS = [
  '2024-08-24',
  '2024-08-25',
  '2024-08-26',
  '2024-08-27',
  '2024-08-28',
]

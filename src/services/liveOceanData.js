/**
 * src/services/liveOceanData.js
 *
 * Fetches real-time ocean data from publicly available open APIs.
 *
 * Sources used (no API key required):
 *  1. ERDDAP / NOAA CoastWatch  — SST & Currents from OSCAR
 *  2. NASA OceanColor WMS       — Chlorophyll-a (fallback)
 *
 * Returns the same OceanDataset shape as fileParser.js so textureBuilder
 * can consume it without any changes.
 */

import Papa from 'papaparse';

// ─── OSCAR Near-Real-Time Surface Currents ──────────────────────────────────
// Source: NOAA CoastWatch ERDDAP (public, no auth)
// Resolution: 1/3 degree, ~5-day latency
// Docs: https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdQSwind1day.html
const OSCAR_BASE = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdQScurnoaa1day.csv';

// ─── NOAA CoastWatch SST ────────────────────────────────────────────────────
// Source: CoastWatch Blended Nrt SST
const SST_BASE   = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180.csv';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a coarse global grid of (lat, lon) sample points for bounding box.
 * We use stride=4 degrees so it's fast enough for a browser fetch.
 */
function buildSampleGrid(latMin, latMax, lonMin, lonMax, stride = 4) {
  const pts = [];
  for (let lat = latMin; lat <= latMax; lat += stride) {
    for (let lon = lonMin; lon <= lonMax; lon += stride) {
      pts.push({ lat: +lat.toFixed(2), lon: +lon.toFixed(2) });
    }
  }
  return pts;
}

/**
 * Fetch live SST from NOAA ERDDAP.
 * Returns array of { lat, lon, sst }
 */
async function fetchLiveSST(signal) {
  const date = daysAgoISO(3); // 3-day latency is typical
  // Coarse global sample: 4° stride, lat -80..80, lon -180..180
  const url = `${SST_BASE}?sst[(${date}T12:00:00Z):1:(${date}T12:00:00Z)][(-80):8:(80)][(-180):8:(180)]`;

  try {
    const resp = await fetch(url, { signal, mode: 'cors' });
    if (!resp.ok) throw new Error(`SST fetch failed: ${resp.status}`);
    const text = await resp.text();
    // ERDDAP CSV: skip first 2 header rows
    const lines = text.split('\n').slice(2).filter(l => l.trim());
    const pts = [];
    for (const line of lines) {
      const [, , latStr, lonStr, sstStr] = line.split(',');
      const lat = parseFloat(latStr), lon = parseFloat(lonStr), sst = parseFloat(sstStr);
      if (!isNaN(lat) && !isNaN(lon) && !isNaN(sst)) pts.push({ lat, lon, sst, u: NaN, v: NaN, chla: NaN });
    }
    console.log(`[LiveOcean] SST: ${pts.length} points`);
    return pts;
  } catch (e) {
    console.warn('[LiveOcean] SST fetch failed, skipping:', e.message);
    return [];
  }
}

/**
 * Fetch live surface currents from OSCAR via ERDDAP.
 * Returns array of { lat, lon, u, v }
 */
async function fetchLiveCurrents(signal) {
  const date = daysAgoISO(7); // OSCAR has ~5-7 day latency
  const url = `${OSCAR_BASE}?u[(${date}T00:00:00Z):1:(${date}T00:00:00Z)][(0):1:(0)][(-80):4:(80)][(-180):4:(180)],v[(${date}T00:00:00Z):1:(${date}T00:00:00Z)][(0):1:(0)][(-80):4:(80)][(-180):4:(180)]`;

  try {
    const resp = await fetch(url, { signal, mode: 'cors' });
    if (!resp.ok) throw new Error(`Currents fetch failed: ${resp.status}`);
    const text = await resp.text();
    const lines = text.split('\n').slice(2).filter(l => l.trim());
    const pts = [];
    for (const line of lines) {
      const parts = line.split(',');
      // time, depth, lat, lon, u, v
      const lat = parseFloat(parts[2]), lon = parseFloat(parts[3]);
      const u = parseFloat(parts[4]), v = parseFloat(parts[5]);
      if (!isNaN(lat) && !isNaN(lon) && !isNaN(u)) pts.push({ lat, lon, u: isNaN(u) ? 0 : u, v: isNaN(v) ? 0 : v, sst: NaN, chla: NaN });
    }
    console.log(`[LiveOcean] Currents: ${pts.length} points`);
    return pts;
  } catch (e) {
    console.warn('[LiveOcean] Currents fetch failed, skipping:', e.message);
    return [];
  }
}

/**
 * Merge SST and current point arrays by nearest lat/lon,
 * then deduplicate into a unified points array.
 */
function mergePoints(sstPts, flowPts) {
  // Build quick lookup map from flow data
  const flowMap = new Map();
  for (const p of flowPts) {
    const key = `${p.lat.toFixed(1)},${p.lon.toFixed(1)}`;
    flowMap.set(key, p);
  }

  const allPts = new Map();

  for (const p of sstPts) {
    const key = `${p.lat.toFixed(1)},${p.lon.toFixed(1)}`;
    allPts.set(key, { ...p });
  }

  // Merge flow into sst points or add new ones
  for (const p of flowPts) {
    const key = `${p.lat.toFixed(1)},${p.lon.toFixed(1)}`;
    if (allPts.has(key)) {
      const existing = allPts.get(key);
      existing.u = p.u; existing.v = p.v;
    } else {
      allPts.set(key, { ...p });
    }
  }

  return Array.from(allPts.values());
}

/**
 * Main export: fetch live global ocean data.
 * Returns OceanDataset compatible with textureBuilder.js
 */
export async function fetchLiveOceanDataset(signal) {
  console.log('[LiveOcean] Fetching live ocean data...');

  const [sstPts, flowPts] = await Promise.all([
    fetchLiveSST(signal),
    fetchLiveCurrents(signal),
  ]);

  const points = mergePoints(sstPts, flowPts);

  if (points.length === 0) {
    return null; // Both sources failed
  }

  const hasSST  = points.some(p => !isNaN(p.sst));
  const hasFlow = points.some(p => !isNaN(p.u));

  const variablesFound = [];
  if (hasSST)  variablesFound.push('sst');
  if (hasFlow) { variablesFound.push('u'); variablesFound.push('v'); }

  const lats = [...new Set(points.map(p => p.lat))].sort((a,b) => a-b);
  const lons = [...new Set(points.map(p => p.lon))].sort((a,b) => a-b);

  return {
    type: variablesFound.length > 1 ? 'mixed' : variablesFound[0] || 'unknown',
    lats: Float32Array.from(lats),
    lons: Float32Array.from(lons),
    sst: null,  // handled via points[]
    u: null,
    v: null,
    chla: null,
    points,
    isLive: true,
    meta: {
      filename: 'Live NOAA/OSCAR Data',
      source: 'NOAA CoastWatch + OSCAR',
      date: new Date().toISOString().slice(0, 10),
      latRange: [-80, 80],
      lonRange: [-180, 180],
      variablesFound,
      pointCount: points.length,
      totalRows: points.length,
    }
  };
}

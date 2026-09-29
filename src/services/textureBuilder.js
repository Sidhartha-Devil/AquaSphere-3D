/**
 * src/services/textureBuilder.js
 *
 * Converts a parsed OceanDataset (from fileParser.js) into Three.js
 * DataTextures that plug directly into the existing GLSL shader uniforms:
 *   u_sstMap   → RGBAFormat DataTexture  (colour-mapped temperature)
 *   u_flowMap  → RGFormat / FloatType DataTexture (raw U,V)
 *   u_chlMap   → RGBAFormat DataTexture  (colour-mapped chlorophyll)
 *
 * Grid is always re-sampled to GRID_COLS × GRID_ROWS (360 × 180) so the
 * shaders require zero changes.
 */

import * as THREE from 'three';
import { GRID_COLS, GRID_ROWS } from '../data/oceanCurrents';

// ── SST Colour Ramp (matches oceanCurrents.js sstColor) ──────────────────────
const SST_STOPS = [
  [0,    [10,  20, 120]],
  [0.2,  [20, 100, 200]],
  [0.4,  [30, 180, 200]],
  [0.6,  [80, 200, 80 ]],
  [0.75, [220,220, 50 ]],
  [0.9,  [240,120, 20 ]],
  [1.0,  [220, 30, 10 ]],
];

function sstColor(t) {
  t = Math.max(0, Math.min(1, t));
  let lo = SST_STOPS[0], hi = SST_STOPS[SST_STOPS.length - 1];
  for (let i = 0; i < SST_STOPS.length - 1; i++) {
    if (t >= SST_STOPS[i][0] && t <= SST_STOPS[i+1][0]) { lo = SST_STOPS[i]; hi = SST_STOPS[i+1]; break; }
  }
  const ft = (t - lo[0]) / (hi[0] - lo[0] + 1e-6);
  return lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * ft));
}

// ── Chlorophyll Colour Ramp ───────────────────────────────────────────────────
const CHL_STOPS = [
  [0,    [10,  20,  80]],
  [0.3,  [30, 100, 150]],
  [0.6,  [50, 180, 100]],
  [0.85, [180,220,  50]],
  [1.0,  [255,200,  30]],
];

function chlColor(t) {
  t = Math.max(0, Math.min(1, t));
  let lo = CHL_STOPS[0], hi = CHL_STOPS[CHL_STOPS.length - 1];
  for (let i = 0; i < CHL_STOPS.length - 1; i++) {
    if (t >= CHL_STOPS[i][0] && t <= CHL_STOPS[i+1][0]) { lo = CHL_STOPS[i]; hi = CHL_STOPS[i+1]; break; }
  }
  const ft = (t - lo[0]) / (hi[0] - lo[0] + 1e-6);
  return lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * ft));
}

// ── Bilinear interpolation helper ─────────────────────────────────────────────
function bilinearSample(grid, srcLats, srcLons, targetLat, targetLon) {
  const nLat = srcLats.length;
  const nLon = srcLons.length;

  // Find surrounding lat indices
  let r0 = 0;
  const latAscending = srcLats[0] < srcLats[nLat - 1];
  for (let i = 0; i < nLat - 1; i++) {
    if (latAscending) {
      if (srcLats[i] <= targetLat && srcLats[i+1] >= targetLat) { r0 = i; break; }
    } else {
      if (srcLats[i] >= targetLat && srcLats[i+1] <= targetLat) { r0 = i; break; }
    }
    if (i === nLat - 2) r0 = nLat - 2;
  }
  const r1 = Math.min(r0 + 1, nLat - 1);

  let c0 = 0;
  const lonAscending = srcLons[0] < srcLons[nLon - 1];
  for (let i = 0; i < nLon - 1; i++) {
    if (lonAscending) {
      if (srcLons[i] <= targetLon && srcLons[i+1] >= targetLon) { c0 = i; break; }
    } else {
      if (srcLons[i] >= targetLon && srcLons[i+1] <= targetLon) { c0 = i; break; }
    }
    if (i === nLon - 2) c0 = nLon - 2;
  }
  const c1 = Math.min(c0 + 1, nLon - 1);

  const latRange = srcLats[r1] - srcLats[r0] || 1;
  const lonRange = srcLons[c1] - srcLons[c0] || 1;
  const fr = (targetLat - srcLats[r0]) / latRange;
  const fc = (targetLon - srcLons[c0]) / lonRange;

  const v00 = grid[r0 * nLon + c0];
  const v01 = grid[r0 * nLon + c1];
  const v10 = grid[r1 * nLon + c0];
  const v11 = grid[r1 * nLon + c1];

  // Bilinear — skip NaN corners gracefully
  const vals = [v00, v01, v10, v11].filter(v => !isNaN(v));
  if (vals.length === 0) return NaN;
  if (vals.length < 4) return vals.reduce((a, b) => a + b, 0) / vals.length;

  return v00*(1-fr)*(1-fc) + v01*(1-fr)*fc + v10*fr*(1-fc) + v11*fr*fc;
}

// ── Resample a dataset grid to the standard 360×180 GPU grid ─────────────────
function resampleToStandardGrid(grid, srcLats, srcLons) {
  const out = new Float32Array(GRID_COLS * GRID_ROWS);
  const latMin = Math.min(srcLats[0], srcLats[srcLats.length - 1]);
  const latMax = Math.max(srcLats[0], srcLats[srcLats.length - 1]);
  const lonMin = Math.min(srcLons[0], srcLons[srcLons.length - 1]);
  const lonMax = Math.max(srcLons[0], srcLons[srcLons.length - 1]);

  for (let row = 0; row < GRID_ROWS; row++) {
    const lat = (row + 0.5) / GRID_ROWS * 180 - 90;
    for (let col = 0; col < GRID_COLS; col++) {
      const lon = (col + 0.5) / GRID_COLS * 360 - 180;

      if (lat < latMin || lat > latMax || lon < lonMin || lon > lonMax) {
        out[row * GRID_COLS + col] = NaN;
        continue;
      }
      out[row * GRID_COLS + col] = bilinearSample(grid, srcLats, srcLons, lat, lon);
    }
  }
  return out;
}

// ── Universal Field Resampler (Supports 2D Structured Grids + Station/Buoy/Point Data) ──
function sampleFieldForGrid(dataset, varKey) {
  const out = new Float32Array(GRID_COLS * GRID_ROWS).fill(NaN);
  
  const points = dataset.points || [];
  const validPoints = points.filter(p => p && !isNaN(p[varKey]));

  // Check if dataset is a 2D structured grid (e.g. NetCDF or regular grid CSV)
  const isStructured = dataset.lats.length >= 3 && 
                       dataset.lons.length >= 3 && 
                       dataset[varKey] &&
                       validPoints.length >= dataset.lats.length * dataset.lons.length * 0.5;

  if (isStructured && dataset[varKey]) {
    return resampleToStandardGrid(dataset[varKey], dataset.lats, dataset.lons);
  }

  if (validPoints.length === 0 && dataset[varKey]) {
    return resampleToStandardGrid(dataset[varKey], dataset.lats, dataset.lons);
  }

  if (validPoints.length === 0) return out;

  // ── IDW / Gaussian Radius Spreading for Point, Station, Buoy & Time-Series Datasets ──
  const numPts = validPoints.length;
  let radius = 15.0; // degrees
  if (numPts === 1) radius = 22.0; // Single station spreads over ~22 degree region on map
  else if (numPts < 10) radius = 14.0;
  else if (numPts < 50) radius = 9.0;
  else radius = 6.0;

  const sigma = radius / 2.2;
  const maxDistSq = radius * radius;

  for (let row = 0; row < GRID_ROWS; row++) {
    const lat = (row + 0.5) / GRID_ROWS * 180 - 90;
    for (let col = 0; col < GRID_COLS; col++) {
      const lon = (col + 0.5) / GRID_COLS * 360 - 180;

      let weightSum = 0;
      let valSum = 0;

      for (let i = 0; i < validPoints.length; i++) {
        const pt = validPoints[i];
        let dLon = Math.abs(lon - pt.lon);
        if (dLon > 180) dLon = 360 - dLon;
        const dLat = lat - pt.lat;
        const distSq = dLat * dLat + dLon * dLon;

        if (distSq <= maxDistSq) {
          const w = Math.exp(-0.5 * distSq / (sigma * sigma));
          weightSum += w;
          valSum += pt[varKey] * w;
        }
      }

      if (weightSum > 0.0001) {
        out[row * GRID_COLS + col] = valSum / weightSum;
      }
    }
  }

  return out;
}

// ── Build SST Texture from OceanDataset ───────────────────────────────────────
export function buildSSTTextureFromDataset(dataset, fallbackSST) {
  if (!dataset.sst && (!dataset.points || !dataset.points.some(p => !isNaN(p.sst)))) return null;

  const resampled = sampleFieldForGrid(dataset, 'sst');

  // Compute actual min/max (ignore NaN)
  let tMin = Infinity, tMax = -Infinity;
  for (const v of resampled) {
    if (!isNaN(v)) { tMin = Math.min(tMin, v); tMax = Math.max(tMax, v); }
  }
  if (!isFinite(tMin) || !isFinite(tMax)) return null;
  const tRange = tMax - tMin || 1;

  const rgba = new Uint8Array(GRID_COLS * GRID_ROWS * 4);
  for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
    const val = resampled[i];
    const idx = i * 4;
    if (isNaN(val)) {
      // Fallback: use built-in model value for this cell
      if (fallbackSST) {
        rgba[idx]   = fallbackSST[idx];
        rgba[idx+1] = fallbackSST[idx+1];
        rgba[idx+2] = fallbackSST[idx+2];
        rgba[idx+3] = 200;
      } else {
        rgba[idx] = rgba[idx+1] = rgba[idx+2] = 0; rgba[idx+3] = 0;
      }
      continue;
    }
    const t = (val - tMin) / tRange;
    const [r, g, b] = sstColor(t);
    rgba[idx] = r; rgba[idx+1] = g; rgba[idx+2] = b; rgba[idx+3] = 200;
  }

  const tex = new THREE.DataTexture(rgba, GRID_COLS, GRID_ROWS, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { texture: tex, min: tMin, max: tMax };
}

// ── Build Flow Texture from OceanDataset ──────────────────────────────────────
export function buildFlowTextureFromDataset(dataset, fallbackFlow) {
  const hasFlow = dataset.u || dataset.v || (dataset.points && dataset.points.some(p => !isNaN(p.u) || !isNaN(p.v)));
  if (!hasFlow) return null;

  const uResampled = sampleFieldForGrid(dataset, 'u');
  const vResampled = sampleFieldForGrid(dataset, 'v');

  // Build a water mask: 1 = cell has valid dataset data (ocean), 0 = land/missing
  const waterMask = new Uint8Array(GRID_COLS * GRID_ROWS);
  for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
    const uv = uResampled[i], vv = vResampled[i];
    waterMask[i] = (!isNaN(uv) && !isNaN(vv)) ? 1 : 0;
  }

  // Compute max speed for normalisation
  let maxSpeed = 0;
  for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
    const u = uResampled[i];
    const v = vResampled[i];
    if (!isNaN(u) && !isNaN(v)) {
      const s = Math.sqrt(u*u + v*v);
      if (s > maxSpeed) maxSpeed = s;
    }
  }
  if (maxSpeed === 0) maxSpeed = 1;

  const rg = new Float32Array(GRID_COLS * GRID_ROWS * 2);
  for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
    const u = uResampled[i];
    const v = vResampled[i];
    const idx = i * 2;
    if (isNaN(u) || isNaN(v)) {
      // Use fallback built-in flow field texture only (not for particle engine)
      if (fallbackFlow) {
        rg[idx]   = fallbackFlow[idx];
        rg[idx+1] = fallbackFlow[idx+1];
      }
      continue;
    }
    rg[idx]   = u / maxSpeed;
    rg[idx+1] = v / maxSpeed;
  }

  const tex = new THREE.DataTexture(rg, GRID_COLS, GRID_ROWS, THREE.RGFormat, THREE.FloatType);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  
  return { 
    texture: tex, 
    maxSpeed, 
    uData: uResampled,   // Raw unnormalized U velocities
    vData: vResampled,   // Raw unnormalized V velocities
    waterMask            // 1=ocean cell with valid data, 0=land/no data
  };
}

// ── Build Chlorophyll Texture from OceanDataset ───────────────────────────────
export function buildChlTextureFromDataset(dataset, fallbackChl) {
  if (!dataset.chla && (!dataset.points || !dataset.points.some(p => !isNaN(p.chla)))) return null;

  const resampled = sampleFieldForGrid(dataset, 'chla');

  const rgba = new Uint8Array(GRID_COLS * GRID_ROWS * 4);
  for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
    const val = resampled[i];
    const idx = i * 4;
    if (isNaN(val)) {
      if (fallbackChl) {
        rgba[idx]   = fallbackChl[idx];
        rgba[idx+1] = fallbackChl[idx+1];
        rgba[idx+2] = fallbackChl[idx+2];
        rgba[idx+3] = 200;
      } else {
        rgba[idx] = rgba[idx+1] = rgba[idx+2] = 0; rgba[idx+3] = 0;
      }
      continue;
    }
    const logChl = Math.log10(Math.max(0.01, val));
    const t = (logChl + 2) / 3.0;
    const [r, g, b] = chlColor(Math.max(0, Math.min(1, t)));
    rgba[idx] = r; rgba[idx+1] = g; rgba[idx+2] = b; rgba[idx+3] = 200;
  }

  const tex = new THREE.DataTexture(rgba, GRID_COLS, GRID_ROWS, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { texture: tex };
}

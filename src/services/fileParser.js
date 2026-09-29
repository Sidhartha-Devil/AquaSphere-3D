/**
 * src/services/fileParser.js
 *
 * Parses NetCDF (.nc / .cdf / .nc4) and ASCII/CSV/TSV/TXT ocean data files
 * entirely in the browser — no server required.
 *
 * Returns a unified OceanDataset:
 * {
 *   type: 'sst' | 'currents' | 'chlorophyll' | 'mixed',
 *   lats: Float32Array,        // 1-D sorted array of unique latitudes
 *   lons: Float32Array,        // 1-D sorted array of unique longitudes
 *   sst:  Float32Array | null, // row-major [lat × lon], °C, NaN = nodata
 *   u:    Float32Array | null, // east velocity, m/s
 *   v:    Float32Array | null, // north velocity, m/s
 *   chla: Float32Array | null, // chlorophyll, mg/m³
 *   meta: { filename, source, date, latRange, lonRange, variablesFound }
 * }
 */

import { NetCDFReader } from 'netcdfjs';
import Papa from 'papaparse';

// ── Known variable name aliases ───────────────────────────────────────────────
const SST_NAMES   = ['sst','sea_surface_temperature','temp','temperature','analysed_sst','thetao','tos','sst_mean','sst_avg','sst_day'];
const U_NAMES     = ['u','uo','u10','uwnd','u_velocity','u_current','eastward_sea_water_velocity','eastward_wind'];
const V_NAMES     = ['v','vo','v10','vwnd','v_velocity','v_current','northward_sea_water_velocity','northward_wind'];
const CHLA_NAMES  = ['chla','chlor_a','chlorophyll','chl','chl_a','chlorophyll_a','chlor','phyc'];
const LAT_NAMES   = ['lat','latitude','lats','nav_lat','y','ylat'];
const LON_NAMES   = ['lon','longitude','lons','nav_lon','x','xlon'];

function matchAlias(name, aliases) {
  const n = name.toLowerCase().trim();
  return aliases.some(a => n === a || n.startsWith(a));
}

// ── NetCDF Parser ────────────────────────────────────────────────────────────
export async function parseNetCDF(file) {
  const buffer = await file.arrayBuffer();
  const reader = new NetCDFReader(buffer);

  const variables = reader.variables.map(v => v.name.toLowerCase());

  // Helper: read variable data as plain JS Array
  const readVar = (aliases) => {
    const found = reader.variables.find(v => matchAlias(v.name, aliases));
    if (!found) return null;
    return { name: found.name, data: reader.getDataVariable(found.name), dimensions: found.dimensions };
  };

  const latVar  = readVar(LAT_NAMES);
  const lonVar  = readVar(LON_NAMES);

  if (!latVar || !lonVar) {
    throw new Error('Cannot find latitude or longitude variables in this NetCDF file.\n' +
      'Expected names like: lat, latitude, nav_lat, y\nFound: ' + reader.variables.map(v=>v.name).join(', '));
  }

  const lats = Float32Array.from(latVar.data);
  const lons = Float32Array.from(lonVar.data);

  // Ensure both are sorted ascending
  const latsSorted = Float32Array.from([...lats].sort((a,b)=>a-b));
  const lonsSorted = Float32Array.from([...lons].sort((a,b)=>a-b));

  const nLat = latsSorted.length;
  const nLon = lonsSorted.length;

  const readGrid = (aliases, fillValFallback = -9999) => {
    const v = readVar(aliases);
    if (!v) return null;
    const raw = v.data;
    // Find fill_value attribute
    const varMeta = reader.variables.find(vv => matchAlias(vv.name, aliases));
    const fillAtt = varMeta?.attributes?.find(a => ['_fillvalue','missing_value','fill_value'].includes(a.name.toLowerCase()));
    const fill = fillAtt ? fillAtt.value : fillValFallback;

    const out = new Float32Array(nLat * nLon);
    for (let i = 0; i < out.length; i++) {
      const val = raw[i];
      out[i] = (val === fill || Math.abs(val - fill) < 0.001 || val > 1e30 || val < -1e30) ? NaN : val;
    }
    return out;
  };

  const sst  = readGrid(SST_NAMES);
  const u    = readGrid(U_NAMES);
  const v    = readGrid(V_NAMES);
  const chla = readGrid(CHLA_NAMES);

  const variablesFound = [];
  if (sst)  variablesFound.push('sst');
  if (u)    variablesFound.push('u');
  if (v)    variablesFound.push('v');
  if (chla) variablesFound.push('chla');

  if (variablesFound.length === 0) {
    throw new Error(
      'No recognisable ocean variables found in NetCDF.\n' +
      'Expected: sst/temperature, u/v currents, chla/chlorophyll.\n' +
      'Found variables: ' + reader.variables.map(vv=>vv.name).join(', ')
    );
  }

  // Auto-detect date from global attributes
  const dateAtt = reader.globalAttributes?.find(a =>
    ['time_coverage_start','date','date_created','history'].includes(a.name.toLowerCase())
  );

  return {
    type: inferType(sst, u, v, chla),
    lats: latsSorted,
    lons: lonsSorted,
    sst, u, v, chla,
    meta: {
      filename: file.name,
      source: 'NetCDF',
      date: dateAtt?.value ?? 'Unknown',
      latRange: [latsSorted[0], latsSorted[nLat-1]],
      lonRange: [lonsSorted[0], lonsSorted[nLon-1]],
      variablesFound,
    }
  };
}

// ── ASCII / CSV / TSV / TXT Parser ───────────────────────────────────────────
export async function parseTextFile(file) {
  const text = await file.text();
  const ext  = file.name.split('.').pop().toLowerCase();

  // Detect delimiter
  const delimiter = ext === 'tsv' ? '\t'
                  : text.includes('\t') ? '\t'
                  : text.includes(';')  ? ';'
                  : ',';

  // Strip comment lines (lines starting with # or !)
  const lines = text.split('\n').filter(l => !l.trim().startsWith('#') && !l.trim().startsWith('!') && l.trim().length > 0);
  const cleaned = lines.join('\n');

  const parsed = Papa.parse(cleaned, {
    delimiter,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error('Could not parse text file: ' + parsed.errors[0].message);
  }

  const headers = Object.keys(parsed.data[0] || {});

  // Find columns
  const latCol  = headers.find(h => matchAlias(h, LAT_NAMES));
  const lonCol  = headers.find(h => matchAlias(h, LON_NAMES));
  if (!latCol || !lonCol) {
    throw new Error(
      'Cannot find lat/lon columns.\nExpected: lat, latitude, lon, longitude\nFound: ' + headers.join(', ')
    );
  }

  const sstCol  = headers.find(h => matchAlias(h, SST_NAMES));
  const uCol    = headers.find(h => matchAlias(h, U_NAMES));
  const vCol    = headers.find(h => matchAlias(h, V_NAMES));
  const chlaCol = headers.find(h => matchAlias(h, CHLA_NAMES));

  const variablesFound = [];
  if (sstCol)  variablesFound.push('sst');
  if (uCol)    variablesFound.push('u');
  if (vCol)    variablesFound.push('v');
  if (chlaCol) variablesFound.push('chla');

  if (variablesFound.length === 0) {
    throw new Error(
      'No ocean variable columns found.\nExpected: sst/temperature, u/v, chla/chlorophyll\nFound: ' + headers.join(', ')
    );
  }

  // Extract rows with valid lat/lon
  const rows = parsed.data.filter(r => r[latCol] != null && r[lonCol] != null && !isNaN(+r[latCol]) && !isNaN(+r[lonCol]));

  // Group rows by lat,lon location to aggregate time series or duplicate station entries
  const pointMap = new Map();
  for (const r of rows) {
    const lat = +r[latCol];
    const lon = +r[lonCol];
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (!pointMap.has(key)) {
      pointMap.set(key, { lat, lon, sst: [], u: [], v: [], chla: [] });
    }
    const pt = pointMap.get(key);
    if (sstCol && r[sstCol] != null && !isNaN(+r[sstCol])) pt.sst.push(+r[sstCol]);
    if (uCol && r[uCol] != null && !isNaN(+r[uCol])) pt.u.push(+r[uCol]);
    if (vCol && r[vCol] != null && !isNaN(+r[vCol])) pt.v.push(+r[vCol]);
    if (chlaCol && r[chlaCol] != null && !isNaN(+r[chlaCol])) pt.chla.push(+r[chlaCol]);
  }

  const points = Array.from(pointMap.values()).map(pt => ({
    lat: pt.lat,
    lon: pt.lon,
    sst: pt.sst.length ? pt.sst.reduce((a,b)=>a+b,0)/pt.sst.length : NaN,
    u: pt.u.length ? pt.u.reduce((a,b)=>a+b,0)/pt.u.length : NaN,
    v: pt.v.length ? pt.v.reduce((a,b)=>a+b,0)/pt.v.length : NaN,
    chla: pt.chla.length ? pt.chla.reduce((a,b)=>a+b,0)/pt.chla.length : NaN,
  }));

  const uniqueLats = [...new Set(points.map(p => p.lat))].sort((a,b)=>a-b);
  const uniqueLons = [...new Set(points.map(p => p.lon))].sort((a,b)=>a-b);

  const nLat = uniqueLats.length;
  const nLon = uniqueLons.length;

  const latsSorted = Float32Array.from(uniqueLats);
  const lonsSorted = Float32Array.from(uniqueLons);

  // Build 2D grid matrix if structured
  const latIdx = new Map(uniqueLats.map((v,i) => [v,i]));
  const lonIdx = new Map(uniqueLons.map((v,i) => [v,i]));

  const makeGrid = (key) => {
    if (!variablesFound.includes(key)) return null;
    const g = new Float32Array(nLat * nLon).fill(NaN);
    for (const p of points) {
      const li = latIdx.get(p.lat);
      const lo = lonIdx.get(p.lon);
      if (li == null || lo == null) continue;
      g[li * nLon + lo] = p[key];
    }
    return g;
  };

  const sst  = makeGrid('sst');
  const u    = makeGrid('u');
  const v    = makeGrid('v');
  const chla = makeGrid('chla');

  return {
    type: inferType(sst, u, v, chla),
    lats: latsSorted,
    lons: lonsSorted,
    sst, u, v, chla,
    points,
    meta: {
      filename: file.name,
      source: 'ASCII/Text',
      date: 'Unknown',
      latRange: [latsSorted[0], latsSorted[nLat-1]],
      lonRange: [lonsSorted[0], lonsSorted[nLon-1]],
      variablesFound,
      pointCount: points.length,
      totalRows: rows.length,
    }
  };
}

// ── Main entry point ─────────────────────────────────────────────────────────
export async function parseOceanFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (['nc','nc4','cdf','nc3'].includes(ext)) {
    return parseNetCDF(file);
  } else if (['csv','tsv','txt','dat','asc','ascii'].includes(ext)) {
    return parseTextFile(file);
  } else {
    // Try NetCDF first (binary sniff), fall back to text
    try {
      return await parseNetCDF(file);
    } catch {
      return await parseTextFile(file);
    }
  }
}

function inferType(sst, u, v, chla) {
  const has = { sst: !!sst, flow: !!(u||v), chla: !!chla };
  const count = Object.values(has).filter(Boolean).length;
  if (count > 1) return 'mixed';
  if (has.sst)  return 'sst';
  if (has.flow) return 'currents';
  if (has.chla) return 'chlorophyll';
  return 'unknown';
}

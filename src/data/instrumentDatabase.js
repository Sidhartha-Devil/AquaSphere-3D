// src/data/instrumentDatabase.js
// Comprehensive database of all ocean observation instruments
// Types: Argo Floats, Underwater Ocean Gliders, CTD Instruments, BGC Floats

const DEPTH_LEVELS = [0, 50, 100, 200, 500, 1000, 2000];

function r(n) { return +(n + (Math.random() - 0.5) * 0.4).toFixed(2); }

function makeDepthProfile(surfaceTemp, salBase) {
  return DEPTH_LEVELS.map((d, i) => ({
    depth: d,
    temperature: r(surfaceTemp - i * 2.5),
    salinity: r(salBase - i * 0.12),
    oxygen: +(220 - i * 18 + (Math.random() - 0.5) * 6).toFixed(1),
  }));
}

// ── ARGO FLOATS (cyan-blue #00d4ff) ───────────────
export const ARGO_FLOATS = [
  {
    id: 'argo-001', type: 'argo', name: 'Argo Float IN-2401',
    lat: 12.4, lon: 83.5, color: '#00d4ff', status: 'active',
    lastPing: '2026-09-21 06:14 UTC', cycleNumber: 142, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '10 days', manufacturer: 'NKE Instrumentation', model: 'PROVOR CTS5',
    deployedBy: 'INCOIS / IMD', deployDate: '2024-01-15', mission: 'Indian Ocean Dipole Study',
    sensors: ['CTD', 'Oxygen', 'pH'], surfaceTemp: 28.4, surfaceSalinity: 35.1,
    surfaceOxygen: 215, currentDepth: 1000, batteryLife: '68%', dataTransmitted: '142 profiles',
    depthProfile: makeDepthProfile(28.4, 35.1),
  },
  {
    id: 'argo-055', type: 'argo', name: 'Argo Float IN-5502',
    lat: 18.2, lon: 88.5, color: '#00d4ff', status: 'active',
    lastPing: '2026-09-21 03:20 UTC', cycleNumber: 87, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '10 days', manufacturer: 'APEX / Teledyne', model: 'APEX Float',
    deployedBy: 'NIO, Goa', deployDate: '2024-03-10', mission: 'Bay of Bengal Monsoon Monitor',
    sensors: ['CTD', 'Dissolved Oxygen'], surfaceTemp: 26.8, surfaceSalinity: 35.3,
    surfaceOxygen: 208, currentDepth: 1000, batteryLife: '82%', dataTransmitted: '87 profiles',
    depthProfile: makeDepthProfile(26.8, 35.3),
  },
  {
    id: 'argo-118', type: 'argo', name: 'Argo Float IO-1183',
    lat: -8.5, lon: 74.3, color: '#00d4ff', status: 'active',
    lastPing: '2026-09-20 18:45 UTC', cycleNumber: 210, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '10 days', manufacturer: 'NKE Instrumentation', model: 'PROVOR CTS4',
    deployedBy: 'IFREMER / INCOIS', deployDate: '2023-06-22', mission: 'S. Indian Ocean Heat Content',
    sensors: ['CTD', 'Oxygen', 'Backscatter'], surfaceTemp: 27.9, surfaceSalinity: 34.8,
    surfaceOxygen: 219, currentDepth: 2000, batteryLife: '41%', dataTransmitted: '210 profiles',
    depthProfile: makeDepthProfile(27.9, 34.8),
  },
  {
    id: 'argo-209', type: 'argo', name: 'Argo Float AR-2091',
    lat: 16.2, lon: 62.7, color: '#00d4ff', status: 'active',
    lastPing: '2026-09-21 01:10 UTC', cycleNumber: 55, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '10 days', manufacturer: 'MetOcean / Teledyne', model: 'SOLO-II Float',
    deployedBy: 'CSIR-NIO', deployDate: '2025-01-08', mission: 'Arabian Sea Circulation Study',
    sensors: ['CTD'], surfaceTemp: 29.1, surfaceSalinity: 36.4,
    surfaceOxygen: 198, currentDepth: 1000, batteryLife: '91%', dataTransmitted: '55 profiles',
    depthProfile: makeDepthProfile(29.1, 36.4),
  },
  {
    id: 'argo-334', type: 'argo', name: 'Argo Float IN-3341',
    lat: 4.8, lon: 80.5, color: '#00d4ff', status: 'idle',
    lastPing: '2026-09-19 11:30 UTC', cycleNumber: 318, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '10 days', manufacturer: 'APEX / Teledyne', model: 'APEX Float',
    deployedBy: 'INCOIS', deployDate: '2021-11-03', mission: 'Long-term Indian Ocean Monitoring',
    sensors: ['CTD', 'Dissolved Oxygen', 'pH'], surfaceTemp: 28.7, surfaceSalinity: 35.0,
    surfaceOxygen: 211, currentDepth: 1000, batteryLife: '12%', dataTransmitted: '318 profiles',
    depthProfile: makeDepthProfile(28.7, 35.0),
  },
  {
    id: 'argo-445', type: 'argo', name: 'Argo Float PN-4455',
    lat: 10.0, lon: 55.0, color: '#00d4ff', status: 'active',
    lastPing: '2026-09-21 08:00 UTC', cycleNumber: 22, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '10 days', manufacturer: 'NKE Instrumentation', model: 'ARVOR',
    deployedBy: 'INCOIS / US-ARGO', deployDate: '2026-03-15', mission: 'W. Indian Ocean Upwelling',
    sensors: ['CTD', 'Oxygen'], surfaceTemp: 27.2, surfaceSalinity: 35.6,
    surfaceOxygen: 205, currentDepth: 500, batteryLife: '97%', dataTransmitted: '22 profiles',
    depthProfile: makeDepthProfile(27.2, 35.6),
  },
];

// ── UNDERWATER OCEAN GLIDERS (orange #ff6b22) ──────
export const OCEAN_GLIDERS = [
  {
    id: 'glider-007', type: 'glider', name: 'Slocum Glider SG-07',
    lat: 14.2, lon: 83.8, color: '#ff6b22', status: 'active',
    lastPing: '2026-09-21 07:02 UTC', maxDepth: 1000, speed: '0.25 m/s',
    endurance: '30 days remaining', manufacturer: 'Teledyne Webb Research', model: 'Slocum G3 Electric',
    deployedBy: 'IIT Madras / INCOIS', deployDate: '2026-09-01', mission: 'Bay of Bengal Western Boundary Current (EICC)',
    sensors: ['CTD', 'ADCP', 'Fluorometer', 'Turbulence'], waypoints: 8,
    distanceTravelled: '412 km', dives: 284, surfaceTemp: 27.2, surfaceSalinity: 35.8,
    surfaceOxygen: 210, currentDepth: 500, batteryLife: '67%', heading: '195°',
    depthProfile: makeDepthProfile(27.2, 35.8),
  },
  {
    id: 'glider-021', type: 'glider', name: 'Seaglider SGA-21',
    lat: 15.2, lon: 71.2, color: '#ff6b22', status: 'active',
    lastPing: '2026-09-21 05:48 UTC', maxDepth: 1000, speed: '0.30 m/s',
    endurance: '18 days remaining', manufacturer: 'Kongsberg / iRobot', model: 'Seaglider 1000',
    deployedBy: 'SAC / ISRO / NIO', deployDate: '2026-08-14', mission: 'Arabian Sea OMZ & Upwelling Corridor',
    sensors: ['CTD', 'Oxygen', 'Nitrate', 'Fluorometer'], waypoints: 5,
    distanceTravelled: '728 km', dives: 501, surfaceTemp: 28.9, surfaceSalinity: 36.2,
    surfaceOxygen: 188, currentDepth: 750, batteryLife: '38%', heading: '245°',
    depthProfile: makeDepthProfile(28.9, 36.2),
  },
  {
    id: 'glider-035', type: 'glider', name: 'Wave Glider WG-35',
    lat: 1.5, lon: 80.5, color: '#ff6b22', status: 'active',
    lastPing: '2026-09-21 04:15 UTC', maxDepth: 200, speed: '0.5 m/s (wave-powered)',
    endurance: 'Unlimited (solar+wave)', manufacturer: 'Liquid Robotics / Boeing', model: 'Wave Glider SV3',
    deployedBy: 'NIOT Chennai', deployDate: '2026-07-01', mission: 'Equatorial Indian Ocean Jet & RAMA Flux Study',
    sensors: ['Met Suite', 'CTD', 'ADCP', 'Camera'], waypoints: 12,
    distanceTravelled: '2,340 km', dives: 0, surfaceTemp: 27.8, surfaceSalinity: 34.9,
    surfaceOxygen: 216, currentDepth: 0, batteryLife: '100% (solar)', heading: '090°',
    depthProfile: makeDepthProfile(27.8, 34.9),
  },
  {
    id: 'glider-049', type: 'glider', name: 'Spray Glider SP-49',
    lat: 8.5, lon: 84.5, color: '#ff6b22', status: 'idle',
    lastPing: '2026-09-20 22:00 UTC', maxDepth: 1500, speed: '0.20 m/s',
    endurance: '3 days remaining', manufacturer: 'SIO / MBARI', model: 'Spray Glider Mk IV',
    deployedBy: 'Scripps IO / INCOIS', deployDate: '2026-06-30', mission: 'Sri Lanka Dome & Salinity Intrusion',
    sensors: ['CTD', 'ADCP', 'Chlorophyll', 'CDOM'], waypoints: 3,
    distanceTravelled: '1,905 km', dives: 1204, surfaceTemp: 26.3, surfaceSalinity: 32.1,
    surfaceOxygen: 223, currentDepth: 200, batteryLife: '9%', heading: '045°',
    depthProfile: makeDepthProfile(26.3, 32.1),
  },
];

// ── CTD INSTRUMENTS (green #00f5a0) ───────────────
export const CTD_INSTRUMENTS = [
  {
    id: 'ctd-003', type: 'ctd', name: 'CTD Rosette CTD-03',
    lat: 17.5, lon: 70.8, color: '#00f5a0', status: 'idle',
    lastPing: '2026-09-20 14:33 UTC', maxDepth: 5000, manufacturer: 'Sea-Bird Scientific',
    model: 'SBE 9plus', deployedBy: 'INCOIS', ship: 'ORV Sindhu Sadhana', cruise: 'SSD-078',
    deployDate: '2026-09-15', mission: 'Arabian Sea Deep Water Formation',
    sensors: ['Temperature', 'Conductivity', 'Depth', 'Oxygen', 'Fluorescence', 'Turbidity', 'PAR'],
    bottlesFired: 24, stationsCompleted: 42, currentStation: 'SSD-078-S43',
    surfaceTemp: 27.4, surfaceSalinity: 36.1, surfaceOxygen: 204,
    castDepth: 3200, samplingRate: '24 Hz', accuracy: '±0.001°C, ±0.0003 S/m',
    depthProfile: makeDepthProfile(27.4, 36.1),
  },
  {
    id: 'ctd-009', type: 'ctd', name: 'CTD Rosette CTD-09',
    lat: 0.5, lon: 73.5, color: '#00f5a0', status: 'active',
    lastPing: '2026-09-21 09:10 UTC', maxDepth: 5000, manufacturer: 'Sea-Bird Scientific',
    model: 'SBE 911plus', deployedBy: 'NCAOR', ship: 'RV Sagar Nidhi', cruise: 'SN-112',
    deployDate: '2026-09-18', mission: 'Equatorial Indian Ocean Monsoon Study',
    sensors: ['Temperature', 'Conductivity', 'Depth', 'Oxygen', 'Nitrate', 'Fluorescence'],
    bottlesFired: 12, stationsCompleted: 18, currentStation: 'SN-112-S19',
    surfaceTemp: 29.8, surfaceSalinity: 34.7, surfaceOxygen: 218,
    castDepth: 4800, samplingRate: '24 Hz', accuracy: '±0.001°C, ±0.0003 S/m',
    depthProfile: makeDepthProfile(29.8, 34.7),
  },
  {
    id: 'ctd-017', type: 'ctd', name: 'CTD Mooring CM-17',
    lat: 8.0, lon: 93.0, color: '#00f5a0', status: 'active',
    lastPing: '2026-09-21 09:00 UTC', maxDepth: 1500, manufacturer: 'RBR Ltd.',
    model: 'RBRconcerto³', deployedBy: 'NIOT / INCOIS', ship: 'Moored (Stationary)', cruise: 'ANDAMAN-2026',
    deployDate: '2026-01-20', mission: 'Andaman Sea Long-term CTD Mooring',
    sensors: ['Temperature', 'Conductivity', 'Pressure', 'Turbidity'],
    bottlesFired: 0, stationsCompleted: 1, currentStation: 'MOORING-AM17',
    surfaceTemp: 28.1, surfaceSalinity: 33.5, surfaceOxygen: 220,
    castDepth: 1500, samplingRate: '6 Hz (continuous)', accuracy: '±0.002°C, ±0.0005 S/m',
    depthProfile: makeDepthProfile(28.1, 33.5),
  },
  {
    id: 'ctd-028', type: 'ctd', name: 'CTD Rosette CTD-28',
    lat: -14.5, lon: 55.0, color: '#00f5a0', status: 'active',
    lastPing: '2026-09-21 02:40 UTC', maxDepth: 5000, manufacturer: 'Sea-Bird Scientific',
    model: 'SBE 9plus', deployedBy: 'IFREMER / MNHN', ship: 'RV Atalante', cruise: 'SWIO-2026',
    deployDate: '2026-09-10', mission: 'S-W Indian Ocean Deep Circulation',
    sensors: ['Temperature', 'Conductivity', 'Depth', 'Oxygen', 'Fluorescence'],
    bottlesFired: 36, stationsCompleted: 61, currentStation: 'SWIO-S62',
    surfaceTemp: 25.6, surfaceSalinity: 35.4, surfaceOxygen: 211,
    castDepth: 4500, samplingRate: '24 Hz', accuracy: '±0.001°C, ±0.0003 S/m',
    depthProfile: makeDepthProfile(25.6, 35.4),
  },
];

// ── BGC FLOATS (purple #bf5af2) ───────────────────
export const BGC_FLOATS = [
  {
    id: 'bgc-012', type: 'bgc', name: 'BGC Float BF-12',
    lat: -4.5, lon: 68.0, color: '#bf5af2', status: 'active',
    lastPing: '2026-09-21 05:55 UTC', cycleNumber: 98, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '5 days', manufacturer: 'NKE Instrumentation', model: 'PROVOR BGC',
    deployedBy: 'LOPS / IFREMER', deployDate: '2024-07-10', mission: 'Indian Ocean Biogeochemical Cycles',
    sensors: ['CTD', 'Oxygen', 'Nitrate', 'Fluorometer', 'Backscatter', 'pH', 'Irradiance'],
    surfaceTemp: 29.5, surfaceSalinity: 34.9, surfaceOxygen: 214,
    surfaceNitrate: 0.8, surfaceChlorophyll: 0.12, surfacePH: 8.07,
    currentDepth: 1000, batteryLife: '59%', dataTransmitted: '98 profiles',
    depthProfile: makeDepthProfile(29.5, 34.9),
  },
  {
    id: 'bgc-034', type: 'bgc', name: 'BGC Float AS-3401',
    lat: 15.0, lon: 60.5, color: '#bf5af2', status: 'active',
    lastPing: '2026-09-21 00:30 UTC', cycleNumber: 134, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '5 days', manufacturer: 'APEX / Teledyne', model: 'APEX BGC',
    deployedBy: 'MBARI / INCOIS', deployDate: '2024-01-25', mission: 'Arabian Sea OMZ Carbon',
    sensors: ['CTD', 'Oxygen', 'Nitrate', 'pH', 'Chlorophyll'],
    surfaceTemp: 27.8, surfaceSalinity: 36.0, surfaceOxygen: 201,
    surfaceNitrate: 1.2, surfaceChlorophyll: 0.09, surfacePH: 8.04,
    currentDepth: 1000, batteryLife: '43%', dataTransmitted: '134 profiles',
    depthProfile: makeDepthProfile(27.8, 36.0),
  },
  {
    id: 'bgc-056', type: 'bgc', name: 'BGC Float BoB-5601',
    lat: 17.8, lon: 86.3, color: '#bf5af2', status: 'active',
    lastPing: '2026-09-21 07:45 UTC', cycleNumber: 47, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '5 days', manufacturer: 'NKE Instrumentation', model: 'PROVOR BGC',
    deployedBy: 'NCPOR / INCOIS', deployDate: '2025-08-05', mission: 'Bay of Bengal Carbon Export',
    sensors: ['CTD', 'Oxygen', 'Fluorometer', 'Backscatter', 'pH', 'Radiometer'],
    surfaceTemp: 28.3, surfaceSalinity: 32.8, surfaceOxygen: 222,
    surfaceNitrate: 0.4, surfaceChlorophyll: 0.22, surfacePH: 8.09,
    currentDepth: 500, batteryLife: '76%', dataTransmitted: '47 profiles',
    depthProfile: makeDepthProfile(28.3, 32.8),
  },
  {
    id: 'bgc-079', type: 'bgc', name: 'BGC Float SIO-7901',
    lat: -18.0, lon: 80.0, color: '#bf5af2', status: 'idle',
    lastPing: '2026-09-19 14:20 UTC', cycleNumber: 256, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '5 days', manufacturer: 'APEX / Teledyne', model: 'APEX BGC',
    deployedBy: 'Scripps IO / CSIRO', deployDate: '2022-12-01', mission: 'Southern IO Carbon Sink',
    sensors: ['CTD', 'Oxygen', 'Nitrate', 'pH', 'Chlorophyll', 'Backscatter'],
    surfaceTemp: 23.1, surfaceSalinity: 35.7, surfaceOxygen: 231,
    surfaceNitrate: 3.8, surfaceChlorophyll: 0.18, surfacePH: 8.02,
    currentDepth: 2000, batteryLife: '18%', dataTransmitted: '256 profiles',
    depthProfile: makeDepthProfile(23.1, 35.7),
  },
  {
    id: 'bgc-101', type: 'bgc', name: 'BGC Float EIO-1010',
    lat: -1.0, lon: 90.0, color: '#bf5af2', status: 'active',
    lastPing: '2026-09-21 08:55 UTC', cycleNumber: 11, maxDepth: 2000, parkDepth: 1000,
    profileInterval: '5 days', manufacturer: 'NKE Instrumentation', model: 'PROVOR BGC-II',
    deployedBy: 'IOCAS / INCOIS', deployDate: '2026-07-20', mission: 'Equatorial IO BGC Pilot',
    sensors: ['CTD', 'Oxygen', 'Nitrate', 'Fluorometer', 'pH', 'Irradiance', 'Backscatter'],
    surfaceTemp: 28.9, surfaceSalinity: 34.6, surfaceOxygen: 216,
    surfaceNitrate: 0.6, surfaceChlorophyll: 0.14, surfacePH: 8.06,
    currentDepth: 1000, batteryLife: '94%', dataTransmitted: '11 profiles',
    depthProfile: makeDepthProfile(28.9, 34.6),
  },
];

// ── Combined export ───────────────────────────────
export const ALL_INSTRUMENTS = [
  ...ARGO_FLOATS,
  ...OCEAN_GLIDERS,
  ...CTD_INSTRUMENTS,
  ...BGC_FLOATS,
];

export const INSTRUMENT_TYPE_META = {
  argo:   { label: 'Argo Float',          icon: '🔵', color: '#00d4ff', description: 'Autonomous profiling floats drifting with ocean currents' },
  glider: { label: 'Underwater Glider',   icon: '🟠', color: '#ff6b22', description: 'Autonomous gliders navigating through the water column' },
  ctd:    { label: 'CTD Instrument',      icon: '🟢', color: '#00f5a0', description: 'Ship-based conductivity, temperature & depth profilers' },
  bgc:    { label: 'BGC Float',           icon: '🟣', color: '#bf5af2', description: 'Biogeochemical floats measuring oxygen, nitrate, chlorophyll & pH' },
};

export const INSTRUMENT_LEGEND = [
  { type: 'argo',   label: 'Argo Floats',        color: '#00d4ff', icon: '🔵' },
  { type: 'glider', label: 'Underwater Gliders', color: '#ff6b22', icon: '🟠' },
  { type: 'ctd',    label: 'CTD Instruments',    color: '#00f5a0', icon: '🟢' },
  { type: 'bgc',    label: 'BGC Floats',         color: '#bf5af2', icon: '🟣' },
];

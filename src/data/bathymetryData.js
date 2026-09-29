// src/data/bathymetryData.js
// Procedurally generating realistic bathymetry approximation
// In a production app, this would load a high-res ETOPO or GEBCO GeoTIFF/PNG heightmap.

const RESOLUTION_W = 512;
const RESOLUTION_H = 256;

// Major ocean landmarks with their approximate centers and depths
export const OCEAN_LANDMARKS = [
  { name: 'Mariana Trench (Challenger Deep)', lat: 11.35, lon: 142.2, depth: -10994, radius: 5, type: 'trench' },
  { name: 'Puerto Rico Trench', lat: 19.5, lon: -66.0, depth: -8376, radius: 4, type: 'trench' },
  { name: 'Java Trench (Sunda)', lat: -10.0, lon: 110.0, depth: -7450, radius: 6, type: 'trench' },
  { name: 'Kuril-Kamchatka Trench', lat: 47.0, lon: 155.0, depth: -10542, radius: 5, type: 'trench' },
  { name: 'Mid-Atlantic Ridge', lat: 0, lon: -30.0, depth: -2000, radius: 15, type: 'ridge', elongation: [1, 5], angle: 0.2 },
  { name: 'Southwest Indian Ridge', lat: -40, lon: 40, depth: -2500, radius: 12, type: 'ridge', elongation: [2, 1], angle: 0.5 },
  { name: 'East Pacific Rise', lat: -20, lon: -110, depth: -2200, radius: 15, type: 'ridge', elongation: [1, 4], angle: -0.2 },
  { name: 'Arabian Sea Basin', lat: 15, lon: 65, depth: -4000, radius: 8, type: 'basin' },
  { name: 'Bay of Bengal', lat: 15, lon: 90, depth: -3500, radius: 7, type: 'basin' },
  { name: 'Persian Gulf', lat: 26, lon: 51, depth: -50, radius: 2, type: 'shelf' },
  { name: 'North Sea', lat: 56, lon: 3, depth: -90, radius: 3, type: 'shelf' },
  { name: 'Sunda Shelf', lat: -3, lon: 108, depth: -50, radius: 5, type: 'shelf' }
];

// Helper to determine bathymetric zone based on depth
export function getBathymetricZone(depth) {
  if (depth > 0) return 'Landmass'; // Should technically be elevation, but we focus on ocean
  if (depth >= -200) return 'Epipelagic (Shelf)';
  if (depth >= -1000) return 'Mesopelagic (Twilight)';
  if (depth >= -4000) return 'Bathypelagic (Midnight)';
  if (depth >= -6000) return 'Abyssopelagic (Lower)';
  return 'Hadalpelagic (Trench)';
}

// Pseudo-random noise for terrain generation
function noise(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = x * x * (3 - 2 * x);
  const v = y * y * (3 - 2 * y);
  
  // Very basic hash
  const hash = (i, j) => {
    let n = i + j * 57;
    n = (n << 13) ^ n;
    return (1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
  };
  
  return u * v * hash(X+1, Y+1) + (1-u)*v*hash(X, Y+1) + u*(1-v)*hash(X+1, Y) + (1-u)*(1-v)*hash(X,Y);
}

function fbm(x, y) {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for(let i=0; i<4; i++) {
    val += amp * noise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.0;
  }
  return val;
}

// Check if a lat/lon is roughly on a continent (very simplified approximations)
function isLand(lat, lon) {
  // Rough bounding boxes for continents
  if (lon > -130 && lon < -60 && lat > 15 && lat < 70) return true; // North America
  if (lon > -80 && lon < -35 && lat > -55 && lat < 10) return true; // South America
  if (lon > -15 && lon < 50 && lat > -35 && lat < 35) return true; // Africa
  if (lon > 10 && lon < 140 && lat > 35 && lat < 70) return true; // Eurasia
  if (lon > 110 && lon < 155 && lat > -40 && lat < -10) return true; // Australia
  if (lat < -65) return true; // Antarctica
  return false;
}

// Generate an approximate depth (in meters) for a given lat/lon
export function calculateApproximateDepth(lat, lon) {
  if (isLand(lat, lon)) {
    // Generate some positive elevation for land
    return 100 + Math.abs(fbm(lon * 0.1, lat * 0.1)) * 2000;
  }

  // Base abyssal plain depth
  let depth = -4000 + fbm(lon * 0.05, lat * 0.05) * 1500;

  // Continental shelf blending near "coasts" (rough heuristic)
  // We check slightly offset points to see if we are near land
  let distToLand = 1.0;
  for(let dLat=-5; dLat<=5; dLat+=5) {
    for(let dLon=-5; dLon<=5; dLon+=5) {
       if(dLat!==0 && dLon!==0 && isLand(lat+dLat, lon+dLon)) {
          distToLand = Math.min(distToLand, Math.sqrt(dLat*dLat + dLon*dLon)/7.07);
       }
    }
  }
  
  if (distToLand < 1.0) {
      // Transition from shelf (-100m) to deep ocean
      const t = distToLand;
      depth = -100 * (1-t) + depth * t;
  }

  // Apply specific landmarks
  for (const lm of OCEAN_LANDMARKS) {
    const dLat = lat - lm.lat;
    let dLon = lon - lm.lon;
    // Wrap longitude
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;

    let dist;
    if (lm.elongation) {
      // Elliptical distance for ridges
      const c = Math.cos(lm.angle);
      const s = Math.sin(lm.angle);
      const x = dLon * c - dLat * s;
      const y = dLon * s + dLat * c;
      dist = Math.sqrt(Math.pow(x / lm.elongation[0], 2) + Math.pow(y / lm.elongation[1], 2));
    } else {
      dist = Math.sqrt(dLat * dLat + dLon * dLon);
    }

    if (dist < lm.radius) {
      // Gaussian influence
      const influence = Math.exp(-Math.pow(dist / (lm.radius * 0.5), 2));
      depth = depth * (1 - influence) + lm.depth * influence;
    }
  }

  return depth;
}

// Generate the high-res texture and heightmap
export function generateBathymetryTextures() {
  const canvasMap = document.createElement('canvas');
  canvasMap.width = RESOLUTION_W;
  canvasMap.height = RESOLUTION_H;
  const ctxMap = canvasMap.getContext('2d');

  const canvasHeight = document.createElement('canvas');
  canvasHeight.width = RESOLUTION_W;
  canvasHeight.height = RESOLUTION_H;
  const ctxHeight = canvasHeight.getContext('2d');

  const imgDataMap = ctxMap.createImageData(RESOLUTION_W, RESOLUTION_H);
  const imgDataHeight = ctxHeight.createImageData(RESOLUTION_W, RESOLUTION_H);

  for (let y = 0; y < RESOLUTION_H; y++) {
    for (let x = 0; x < RESOLUTION_W; x++) {
      const lon = (x / RESOLUTION_W) * 360 - 180;
      const lat = 90 - (y / RESOLUTION_H) * 180;
      
      const depth = calculateApproximateDepth(lat, lon);
      const idx = (y * RESOLUTION_W + x) * 4;

      // Color Map
      let r, g, b;
      if (depth > 0) {
        // Land
        const elev = Math.min(depth / 3000, 1);
        r = 30 + elev * 100;
        g = 100 + elev * 50;
        b = 40 + elev * 20;
      } else {
        // Ocean (Blue palette, darker = deeper)
        const d = Math.max(Math.min(depth / -11000, 1), 0); // 0 (surface) to 1 (trench)
        if (d < 0.02) { // Shelf
            r = 0; g = 180; b = 255;
        } else if (d < 0.1) { // slope
            r = 0; g = 120; b = 200;
        } else if (d < 0.4) { // Abyssal
            r = 5; g = 30; b = 100;
        } else { // Hadal/Trench
            r = 2; g = 10; b = 40;
        }
        
        // Blend slightly for smoother look
        r = r * (1-d) + 5 * d;
        g = g * (1-d) + 15 * d;
        b = b * (1-d) + 40 * d;
      }

      imgDataMap.data[idx] = r;
      imgDataMap.data[idx+1] = g;
      imgDataMap.data[idx+2] = b;
      imgDataMap.data[idx+3] = 255;

      // Heightmap (encoded in R channel for displacement, normalized 0-1)
      // Map -11000m to +3000m into 0-255 range
      let normHeight = (depth - (-11000)) / (3000 - (-11000));
      normHeight = Math.max(0, Math.min(1, normHeight));
      const val = Math.floor(normHeight * 255);
      
      imgDataHeight.data[idx] = val;
      imgDataHeight.data[idx+1] = val;
      imgDataHeight.data[idx+2] = val;
      imgDataHeight.data[idx+3] = 255;
    }
  }

  ctxMap.putImageData(imgDataMap, 0, 0);
  ctxHeight.putImageData(imgDataHeight, 0, 0);

  return {
    mapCanvas: canvasMap,
    heightCanvas: canvasHeight
  };
}

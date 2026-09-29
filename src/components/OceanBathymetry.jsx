import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import useOceanStore from '../store/oceanStore'
import { calculateApproximateDepth, OCEAN_LANDMARKS, getBathymetricZone } from '../data/bathymetryData'
import { buildSSTTexture, buildFlowField, buildChlorophyllTexture, GRID_COLS, GRID_ROWS } from '../data/oceanCurrents'
import { buildSSTTextureFromDataset, buildFlowTextureFromDataset, buildChlTextureFromDataset } from '../services/textureBuilder'

// ── Raycaster (singleton) ──────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();

// ══════════════════════════════════════════════════════════════════════════════
// SEABED TERRAIN SHADERS
// ══════════════════════════════════════════════════════════════════════════════
const seabedVertexShader = `
  uniform float u_morphProgress;
  uniform float u_verticalExaggeration;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_waterMap;

  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vWorldPos;
  varying float vIsWater;

  void main() {
    vUv = uv;

    float isWater = texture2D(u_waterMap, vUv).r;
    vIsWater = isWater;

    float rawDepth = 0.0;
    if (isWater > 0.5) {
      // Topology map: 0.376 ≈ sea level.  Values below this are underwater.
      float nd = clamp(texture2D(u_heightMap, vUv).r / 0.376, 0.0, 1.0);
      rawDepth = (nd - 1.0) * 11000.0;          // 0 → surface, -11000 → deepest
    }
    vDepth = rawDepth;

    float flatX = (uv.x - 0.5) * 6.28318 * 1.6;
    float flatY = (uv.y - 0.5) * 3.14159 * 1.6;

    // Only push ocean pixels downward — land stays perfectly flat
    float extrusion = min(0.0, rawDepth) * 0.00003 * u_verticalExaggeration;

    // Feather the very edges to avoid seam tearing
    float edgeFade = smoothstep(0.0, 0.015, vUv.x)  * smoothstep(1.0, 0.985, vUv.x)
                   * smoothstep(0.0, 0.015, vUv.y)  * smoothstep(1.0, 0.985, vUv.y);
    extrusion *= edgeFade;

    vec3 flatPos = vec3(flatX, flatY, extrusion);
    vec4 worldPosition = modelMatrix * vec4(flatPos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const seabedFragmentShader = `
  uniform float u_morphProgress;
  uniform float u_opacity;
  uniform sampler2D u_colorMap;
  uniform vec2 u_sliceMin;
  uniform vec2 u_sliceMax;

  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vWorldPos;
  varying float vIsWater;

  void main() {
    if (u_morphProgress < 0.8) discard;

    // Area slicer
    if (u_sliceMin.x < u_sliceMax.x) {
      if (vUv.x < u_sliceMin.x || vUv.x > u_sliceMax.x ||
          vUv.y < u_sliceMin.y || vUv.y > u_sliceMax.y) discard;
    }

    vec3 baseColor = texture2D(u_colorMap, vUv).rgb;
    float alpha    = smoothstep(0.8, 1.0, u_morphProgress) * u_opacity;

    if (vIsWater > 0.5) {
      // Screen-space normals for cheap lighting
      vec3 dX = dFdx(vWorldPos);
      vec3 dY = dFdy(vWorldPos);
      vec3 n  = normalize(cross(dX, dY));
      float diff = max(dot(n, normalize(vec3(1.0, 1.0, 2.0))), 0.08);

      vec3 col = baseColor * diff * 1.3;

      // Trench highlight (below -6000 m)
      if (vDepth < -6000.0) {
        float t = clamp((vDepth + 11000.0) / 5000.0, 0.0, 1.0);
        col = mix(vec3(0.0, 0.75, 1.0), col, t);
      }

      // 500-m isobath contour lines
      float contour = fract(vDepth / 500.0);
      if (contour < 0.04 && vDepth < -50.0)
        col += vec3(0.08, 0.25, 0.55);

      gl_FragColor = vec4(col, alpha);
    } else {
      // Pure satellite colour on land — no ocean effects
      gl_FragColor = vec4(baseColor, alpha);
    }
  }
`;

// ══════════════════════════════════════════════════════════════════════════════
// GERSTNER WATER SURFACE SHADERS
// ══════════════════════════════════════════════════════════════════════════════
const waterVertexShader = `
  uniform float u_time;
  uniform float u_morphProgress;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_waterMap;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying float vWaveHeight;
  varying float vDepth;

  // ── Gerstner wave ─────────────────────────────────────────────────────────
  vec3 gerstner(vec2 pos, vec2 dir, float amplitude, float wavelength,
                float speed, float steepness, float t) {
    float k     = 6.28318 / wavelength;
    float phase = k * dot(dir, pos) - speed * t;
    float Q     = steepness / (k * amplitude + 0.0001);
    return vec3(
      Q * amplitude * dir.x * cos(phase),
      Q * amplitude * dir.y * cos(phase),
      amplitude * sin(phase)
    );
  }

  void main() {
    vUv = uv;

    float isWater = texture2D(u_waterMap, vUv).r;
    if (isWater < 0.5) {
      // Keep land vertices exactly at their flat position (they'll be discarded in frag)
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      return;
    }

    // ── Bathymetric depth at this UV ─────────────────────────────────────
    float nd     = clamp(texture2D(u_heightMap, vUv).r / 0.376, 0.0, 1.0);
    float depth  = (nd - 1.0) * 11000.0;   // metres, negative
    vDepth = depth;

    // Map UV to flat-map world position
    float wx = (uv.x - 0.5) * 6.28318 * 1.6;
    float wy = (uv.y - 0.5) * 3.14159 * 1.6;

    // ── Latitude-driven wave amplitude ───────────────────────────────────
    // Equator → calm; Roaring Forties (lat ≈ ±40°) → stormy
    float lat      = (0.5 - uv.y) * 180.0;
    float stormFac = smoothstep(25.0, 55.0, abs(lat));          // 0 tropical, 1 stormy
    float baseAmp  = 0.003 + stormFac * 0.022;

    // ── Four overlapping Gerstner waves ──────────────────────────────────
    vec3 disp  = gerstner(vec2(wx, wy), normalize(vec2(1.0,  0.3)), baseAmp,        1.0, 0.9, 0.6, u_time);
    disp      += gerstner(vec2(wx, wy), normalize(vec2(0.6, -0.8)), baseAmp * 0.6,  0.65, 1.2, 0.5, u_time * 1.1);
    disp      += gerstner(vec2(wx, wy), normalize(vec2(-0.4, 0.9)), baseAmp * 0.4,  0.4,  1.6, 0.4, u_time * 0.8);
    disp      += gerstner(vec2(wx, wy), normalize(vec2(0.9, -0.2)), baseAmp * 0.25, 0.3,  2.0, 0.3, u_time * 1.3);

    vWaveHeight = disp.z;

    // Approximate normal from wave partials (good enough for our scale)
    float dx = 0.02;
    float dy = 0.02;
    vec3 dX = vec3(dx, 0.0, gerstner(vec2(wx + dx, wy), normalize(vec2(1.0,0.3)), baseAmp, 1.0, 0.9, 0.6, u_time).z - disp.z);
    vec3 dY = vec3(0.0, dy, gerstner(vec2(wx, wy + dy), normalize(vec2(1.0,0.3)), baseAmp, 1.0, 0.9, 0.6, u_time).z - disp.z);
    vNormal = normalize(cross(dX, dY));

    vec3 newPos = vec3(wx + disp.x * 0.05, wy + disp.y * 0.05, disp.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const waterFragmentShader = `
  // ── Standard uniforms ──────────────────────────────────────────────────
  uniform float u_morphProgress;
  uniform float u_time;
  uniform sampler2D u_waterMap;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_sstMap;
  uniform sampler2D u_flowMap;
  uniform sampler2D u_chlMap;
  uniform float u_showTemperature;
  uniform float u_showDirection;
  uniform float u_showChlorophyll;
  uniform vec2  u_sliceMin;
  uniform vec2  u_sliceMax;

  // ── Dataset masking uniforms ───────────────────────────────────────────
  // u_hasDataset = 1.0 when user has uploaded/live data, 0.0 = built-in model
  uniform float u_hasDataset;
  // UV-space bounding box of the dataset [uvXmin, uvXmax, uvYmin, uvYmax]
  uniform vec4  u_datasetBounds;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying float vWaveHeight;
  varying float vDepth;

  // ── Compass heading from oceanographic U/V ─────────────────────────────
  // Spec: theta = atan2(V,U)*180/PI;  compass = (90 - theta) mod 360
  // We keep this in radians for the GPU direction vector.
  vec2 compassDir(vec2 flow) {
    // Standard oceanographic convention: U=East, V=North
    // atan2(flow.y, flow.x) gives math angle (East=0, CCW positive)
    // Convert to compass (North=0, CW positive) → rotate 90° CW
    float theta = atan(flow.y, flow.x);      // math angle
    float compass = 1.5707963 - theta;       // 90° - theta = compass radians
    return vec2(cos(compass), sin(compass)); // unit direction vector
  }

  void main() {
    if (u_morphProgress < 0.8) discard;
    if (u_sliceMin.x < u_sliceMax.x) {
      if (vUv.x < u_sliceMin.x || vUv.x > u_sliceMax.x ||
          vUv.y < u_sliceMin.y || vUv.y > u_sliceMax.y) discard;
    }

    float isWater = texture2D(u_waterMap, vUv).r;
    if (isWater < 0.5) discard;

    // ── Dataset spatial masking ────────────────────────────────────────────
    // When a dataset is loaded, everything OUTSIDE its lat/lon box is
    // rendered as a dim, neutral dark ocean — only the data region is vivid.
    bool inDataRegion = true;
    float dataFade    = 1.0;   // 1 = full colour, 0 = faded

    if (u_hasDataset > 0.5) {
      float uvXmin = u_datasetBounds.x;
      float uvXmax = u_datasetBounds.y;
      float uvYmin = u_datasetBounds.z;
      float uvYmax = u_datasetBounds.w;

      // Soft border (feather 2% in UV space so no harsh edge)
      float border = 0.02;
      float insideX = smoothstep(uvXmin - border, uvXmin + border, vUv.x) *
                      smoothstep(uvXmax + border, uvXmax - border, vUv.x);
      float insideY = smoothstep(uvYmin - border, uvYmin + border, vUv.y) *
                      smoothstep(uvYmax + border, uvYmax - border, vUv.y);
      dataFade    = insideX * insideY;
      inDataRegion = dataFade > 0.01;
    }

    // ── Flow data from GPU texture ─────────────────────────────────────────
    vec2 flowRaw = texture2D(u_flowMap, vUv).xy;  // normalised U in r, V in g

    // ── Compass-corrected current direction (from gemini-code spec) ────────
    vec2 flowDir = vec2(0.0);
    float speed  = length(flowRaw);
    if (speed > 0.005) {
      flowDir = compassDir(flowRaw);  // true compass-heading unit vector
    }

    // ── Ripple / caustic animation driven by compass-heading flow ──────────
    vec2  st   = vUv * 200.0;
    vec2  adv  = flowDir * speed * u_time;      // advect along true bearing
    vec2  st1  = st + adv * 0.9;
    vec2  st2  = st - adv * 0.6 + vec2(u_time * 0.3, u_time * 0.12);
    float w1   = sin(st1.x + sin(st1.y * 0.8)) * sin(st1.y + u_time * 0.7);
    float w2   = sin(st2.x * 0.7 - u_time * 0.5) * sin(st2.y * 1.2 + u_time);
    float ripple = clamp((w1 + w2) * 0.5 + 0.5, 0.0, 1.0);

    // ── Precise streamline particles using compass bearing ─────────────────
    float flowVis = 0.0;
    if (u_showDirection > 0.5 && speed > 0.005) {
        vec2  dir     = flowDir;                         // compass-corrected unit
        vec2  gridUV  = vUv * 600.0;
        float accum   = 0.0;

        for (int i = 0; i < 20; i++) {
            float fi = float(i) / 20.0;
            // Step back along true compass bearing
            vec2 samplePos = gridUV - dir * fi * 28.0;
            // Animate forward along bearing at speed-dependent rate
            samplePos -= dir * (u_time * 14.0 * speed);

            vec2 id       = floor(samplePos);
            vec2 gridDist = fract(samplePos);

            // Pseudo-random per-cell seed
            float rand = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);

            if (rand > 0.965) {  // ~3.5% cell density
                float dist   = length(gridDist - 0.5);
                float dotVal = smoothstep(0.38, 0.08, dist);   // sharp dot
                float tail   = 1.0 - fi;                        // bright head, fade tail
                // Speed-based brightness: faster = brighter white line
                accum += dotVal * tail * (0.5 + speed * 2.0);
            }
        }
        flowVis = min(accum * 3.5, 1.0);
    }

    // ── Depth colour ───────────────────────────────────────────────────────
    float nd = clamp(texture2D(u_heightMap, vUv).r / 0.376, 0.0, 1.0);
    vec3 baseColor;

    if (u_showChlorophyll > 0.5) {
        baseColor = texture2D(u_chlMap, vUv).rgb;
    } else if (u_showTemperature > 0.5) {
        baseColor = texture2D(u_sstMap, vUv).rgb;
    } else {
        vec3 shallowCol = vec3(0.0, 0.85, 0.82);
        vec3 midCol     = vec3(0.0, 0.35, 0.70);
        vec3 deepCol    = vec3(0.01, 0.04, 0.22);
        if (nd > 0.75) {
          baseColor = mix(midCol, shallowCol, smoothstep(0.75, 1.0, nd));
        } else {
          baseColor = mix(deepCol, midCol, smoothstep(0.0, 0.75, nd));
        }
    }

    // ── Apply dataset mask: fade areas outside dataset to dim navy ─────────
    if (u_hasDataset > 0.5) {
      vec3 outsideCol = vec3(0.01, 0.04, 0.15);   // very dark navy for masked areas
      baseColor = mix(outsideCol, baseColor, dataFade);
    }

    // ── Specular ───────────────────────────────────────────────────────────
    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.5));
    float spec    = pow(max(dot(normalize(vNormal), lightDir), 0.0), 48.0);
    vec3 specCol  = vec3(0.8, 0.95, 1.0) * spec * 0.6;

    // ── Compose final colour ───────────────────────────────────────────────
    vec3 col = baseColor;
    col += vec3(0.0, 0.4, 0.5) * ripple * 0.5 * dataFade;  // ripples only in data zone

    if (u_showDirection > 0.5) {
        col = mix(col, vec3(0.0, 0.08, 0.25), 0.3 * dataFade);  // darken in data zone only
        col += vec3(0.9, 0.97, 1.0) * flowVis * dataFade;        // white streamlines
    }

    col += specCol;
    col  = mix(col, vec3(0.5, 0.9, 1.0), smoothstep(0.002, 0.015, vWaveHeight) * 0.4);

    // Outside dataset = more transparent so the dim masked world is subtle
    float baseAlpha = mix(0.45, 0.82, 1.0 - nd);
    if (u_hasDataset > 0.5 && !inDataRegion) baseAlpha *= 0.35;  // very transparent outside
    if (u_showTemperature > 0.5 || u_showDirection > 0.5) baseAlpha = max(baseAlpha, 0.80);
    float alpha = smoothstep(0.8, 1.0, u_morphProgress) * baseAlpha;

    gl_FragColor = vec4(col, alpha);
  }
`;

// ── Helper ─────────────────────────────────────────────────────────────────
function findNearestLandmark(lat, lon) {
  let nearest = null, minDist = Infinity;
  for (const lm of OCEAN_LANDMARKS) {
    let dLon = lon - lm.lon;
    if (dLon > 180)  dLon -= 360;
    if (dLon < -180) dLon += 360;
    const dLat = lat - lm.lat;
    let dist;
    if (lm.elongation) {
      const c = Math.cos(lm.angle), s = Math.sin(lm.angle);
      dist = Math.sqrt(Math.pow((dLon * c - dLat * s) / lm.elongation[0], 2) +
                       Math.pow((dLon * s + dLat * c) / lm.elongation[1], 2));
    } else {
      dist = Math.sqrt(dLat * dLat + dLon * dLon);
    }
    if (dist < minDist && dist < lm.radius * 1.5) { minDist = dist; nearest = lm.name; }
  }
  return nearest || 'Open Ocean / Abyssal Plain';
}

// ══════════════════════════════════════════════════════════════════════════════
// SIDE WALL SHADERS (DIORAMA EFFECT)
// ══════════════════════════════════════════════════════════════════════════════
const wallVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const wallFragmentShader = `
  uniform float u_morphProgress;
  varying vec2 vUv;
  void main() {
    if (u_morphProgress < 0.8) discard;
    float alpha = smoothstep(0.8, 1.0, u_morphProgress) * 0.75;
    
    // Depth gradient: vUv.y=1 is top, vUv.y=0 is bottom
    vec3 shallow = vec3(0.0, 0.4, 0.7);
    vec3 deep = vec3(0.0, 0.05, 0.2);
    vec3 col = mix(deep, shallow, vUv.y); 
    
    gl_FragColor = vec4(col, alpha);
  }
`;

// ══════════════════════════════════════════════════════════════════════════════
export default function OceanBathymetry() {
  const seabedRef   = useRef();
  const seabedMatRef = useRef();
  const waterRef    = useRef();
  const waterMatRef = useRef();
  const wallMatRef  = useRef();

  const verticalExaggeration = useOceanStore(s => s.verticalExaggeration);
  const showBathymetry       = useOceanStore(s => s.showBathymetry);
  const showWaterSurface     = useOceanStore(s => s.showWaterSurface);
  const morphProgress        = useOceanStore(s => s.morphProgress);
  const sliceBounds          = useOceanStore(s => s.sliceBounds);
  const setHoveredDepthInfo  = useOceanStore(s => s.setHoveredDepthInfo);
  const userDataset          = useOceanStore(s => s.userDataset);
  
  const showWaterDirection   = useOceanStore(s => s.showWaterDirection);
  const showTemperature      = useOceanStore(s => s.showTemperature);
  const showChlorophyll      = useOceanStore(s => s.showChlorophyll);

  // Load real Earth textures
  const [colorMap, heightMap, waterMap] = useLoader(THREE.TextureLoader, [
    '/earth_blue_marble.jpg',
    '/earth_topology.png',
    '/earth_water.png',
  ]);

  // Generate default (built-in model) data textures — used as fallback
  const [sstTexture, flowTexture, chlTexture, builtinSSTData, builtinFlowData, builtinChlData] = useMemo(() => {
    // SST Texture
    const sst = buildSSTTexture(GRID_COLS, GRID_ROWS);
    const texSST = new THREE.DataTexture(sst.data, sst.width, sst.height, THREE.RGBAFormat);
    texSST.needsUpdate = true;
    
    // Chlorophyll Texture
    const chl = buildChlorophyllTexture(GRID_COLS, GRID_ROWS);
    const texChl = new THREE.DataTexture(chl.data, chl.width, chl.height, THREE.RGBAFormat);
    texChl.needsUpdate = true;
    
    // Flow Field Texture
    const flow = buildFlowField();
    const texFlow = new THREE.DataTexture(flow, GRID_COLS, GRID_ROWS, THREE.RGFormat, THREE.FloatType);
    texFlow.needsUpdate = true;
    texFlow.minFilter = THREE.LinearFilter;
    texFlow.magFilter = THREE.LinearFilter;

    return [texSST, texFlow, texChl, sst.data, flow, chl.data];
  }, []);

  // ── React to user-uploaded or live dataset: rebuild GPU textures ──────────
  useEffect(() => {
    if (!waterMatRef.current) return;

    if (!userDataset) {
      // No dataset — revert to built-in model, no masking
      waterMatRef.current.uniforms.u_sstMap.value      = sstTexture;
      waterMatRef.current.uniforms.u_flowMap.value     = flowTexture;
      waterMatRef.current.uniforms.u_chlMap.value      = chlTexture;
      waterMatRef.current.uniforms.u_hasDataset.value  = 0.0;
      waterMatRef.current.uniforms.u_datasetBounds.value = new THREE.Vector4(0, 1, 0, 1);
      return;
    }

    // Build GPU textures from dataset
    const sstResult  = buildSSTTextureFromDataset(userDataset, builtinSSTData);
    const flowResult = buildFlowTextureFromDataset(userDataset, builtinFlowData);
    const chlResult  = buildChlTextureFromDataset(userDataset, builtinChlData);

    if (sstResult)  waterMatRef.current.uniforms.u_sstMap.value  = sstResult.texture;
    if (flowResult) waterMatRef.current.uniforms.u_flowMap.value = flowResult.texture;
    if (chlResult)  waterMatRef.current.uniforms.u_chlMap.value  = chlResult.texture;

    // ── Compute UV bounding box for the dataset region ──────────────────
    // lat → UV.y:  y = (90 - lat) / 180  (0=north, 1=south)
    // lon → UV.x:  x = (lon + 180) / 360 (0=west, 1=east)
    const [latMin, latMax] = userDataset.meta.latRange;
    const [lonMin, lonMax] = userDataset.meta.lonRange;

    const isGlobal = userDataset.isLive ||
                     (Math.abs(latMin - (-90)) < 5 && Math.abs(latMax - 90) < 5 &&
                      Math.abs(lonMin - (-180)) < 5 && Math.abs(lonMax - 180) < 5);

    if (isGlobal) {
      // Live/global data: no masking, full globe vivid
      waterMatRef.current.uniforms.u_hasDataset.value      = 0.0;
      waterMatRef.current.uniforms.u_datasetBounds.value   = new THREE.Vector4(0, 1, 0, 1);
    } else {
      // Regional data: mask everything outside this lat/lon box
      const uvXmin = (lonMin + 180) / 360;
      const uvXmax = (lonMax + 180) / 360;
      const uvYmin = (90 - latMax) / 180;   // note: latMax → smaller Y
      const uvYmax = (90 - latMin) / 180;

      waterMatRef.current.uniforms.u_hasDataset.value      = 1.0;
      waterMatRef.current.uniforms.u_datasetBounds.value   = new THREE.Vector4(uvXmin, uvXmax, uvYmin, uvYmax);
    }

    console.log('[OceanViz] GPU textures rebuilt. Variables:', userDataset.meta.variablesFound,
      '| isLive:', !!userDataset.isLive, '| latRange:', userDataset.meta.latRange);
  }, [userDataset, sstTexture, flowTexture, chlTexture, builtinSSTData, builtinFlowData, builtinChlData]);

  // Slice helper
  const sliceMin = useMemo(() =>
    sliceBounds ? new THREE.Vector2(sliceBounds.minX, sliceBounds.minY) : new THREE.Vector2(1, 1),
    [sliceBounds]);
  const sliceMax = useMemo(() =>
    sliceBounds ? new THREE.Vector2(sliceBounds.maxX, sliceBounds.maxY) : new THREE.Vector2(0, 0),
    [sliceBounds]);

  // ── Seabed uniforms ──────────────────────────────────────────────────────
  const seabedUniforms = useMemo(() => ({
    u_morphProgress:        { value: 0.0 },
    u_verticalExaggeration: { value: verticalExaggeration },
    u_colorMap:             { value: colorMap },
    u_heightMap:            { value: heightMap },
    u_waterMap:             { value: waterMap },
    u_opacity:              { value: 1.0 },
    u_sliceMin:             { value: sliceMin },
    u_sliceMax:             { value: sliceMax },
  }), [colorMap, heightMap, waterMap, verticalExaggeration, sliceMin, sliceMax]);

  // ── Water surface uniforms ───────────────────────────────────────────────
  const waterUniforms = useMemo(() => ({
    u_morphProgress:  { value: 0.0 },
    u_time:           { value: 0.0 },
    u_heightMap:      { value: heightMap },
    u_waterMap:       { value: waterMap },
    u_sstMap:         { value: sstTexture },
    u_flowMap:        { value: flowTexture },
    u_chlMap:         { value: chlTexture },
    u_showTemperature:{ value: showTemperature ? 1.0 : 0.0 },
    u_showDirection:  { value: showWaterDirection ? 1.0 : 0.0 },
    u_showChlorophyll:{ value: showChlorophyll ? 1.0 : 0.0 },
    u_sliceMin:       { value: sliceMin },
    u_sliceMax:       { value: sliceMax },
    u_hasDataset:     { value: 0.0 },
    u_datasetBounds:  { value: new THREE.Vector4(0, 1, 0, 1) },
  }), [heightMap, waterMap, sstTexture, flowTexture, chlTexture, showTemperature, showWaterDirection, showChlorophyll, sliceMin, sliceMax]);

  // ── Wall uniforms ────────────────────────────────────────────────────────
  const wallUniforms = useMemo(() => ({
    u_morphProgress: { value: 0.0 }
  }), []);

  // ── Per-frame updates ────────────────────────────────────────────────────
  useFrame(({ camera, pointer, clock }) => {
    const mp = morphProgress;

    if (seabedMatRef.current) {
      seabedMatRef.current.uniforms.u_morphProgress.value        = mp;
      seabedMatRef.current.uniforms.u_verticalExaggeration.value = verticalExaggeration;
    }
    if (waterMatRef.current) {
      waterMatRef.current.uniforms.u_morphProgress.value    = mp;
      waterMatRef.current.uniforms.u_time.value             = clock.elapsedTime;
      waterMatRef.current.uniforms.u_showTemperature.value  = showTemperature ? 1.0 : 0.0;
      waterMatRef.current.uniforms.u_showDirection.value    = showWaterDirection ? 1.0 : 0.0;
      waterMatRef.current.uniforms.u_showChlorophyll.value  = showChlorophyll ? 1.0 : 0.0;
    }
    if (wallMatRef.current) {
      wallMatRef.current.uniforms.u_morphProgress.value = mp;
    }

    // ── Depth hover raycast ──────────────────────────────────────────────
    if (showBathymetry && mp > 0.9 && seabedRef.current) {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(seabedRef.current);
      if (hits.length > 0) {
        const uv = hits[0].uv;
        if (sliceBounds && (uv.x < sliceBounds.minX || uv.x > sliceBounds.maxX ||
                            uv.y < sliceBounds.minY || uv.y > sliceBounds.maxY)) {
          document.body.style.cursor = 'default';
          setHoveredDepthInfo(null);
          return;
        }
        const lon   = uv.x * 360 - 180;
        const lat   = 90 - uv.y * 180;
        const depth = calculateApproximateDepth(lat, lon);
        if (depth < 0) {
          document.body.style.cursor = 'crosshair';
          setHoveredDepthInfo({ lat, lon, depth, region: findNearestLandmark(lat, lon), zone: getBathymetricZone(depth) });
        } else {
          document.body.style.cursor = 'default';
          setHoveredDepthInfo(null);
        }
      } else {
        document.body.style.cursor = 'default';
        setHoveredDepthInfo(null);
      }
    } else {
      if (document.body.style.cursor === 'crosshair') document.body.style.cursor = 'default';
      setHoveredDepthInfo(null);
    }
  });

  if (!showBathymetry) return null;

  return (
    <group>
      {/* ── Sculpted Ocean Floor Terrain ──────────────────────────────── */}
      <mesh ref={seabedRef}>
        <planeGeometry args={[10.053, 5.026, 512, 256]} />
        <shaderMaterial
          ref={seabedMatRef}
          vertexShader={seabedVertexShader}
          fragmentShader={seabedFragmentShader}
          uniforms={seabedUniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Gerstner Wave Water Surface ────────────────────────────────── */}
      {showWaterSurface && (
        <mesh ref={waterRef} position={[0, 0, 0.004]}>
          <planeGeometry args={[10.053, 5.026, 512, 256]} />
          <shaderMaterial
            ref={waterMatRef}
            vertexShader={waterVertexShader}
            fragmentShader={waterFragmentShader}
            uniforms={waterUniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ── Volume Side Walls (Diorama Skirts) ─────────────────────────── */}
      {showWaterSurface && (
        <group>
          {/* North Wall */}
          <mesh position={[0, 2.513, -0.6]} rotation={[Math.PI/2, 0, 0]}>
            <planeGeometry args={[10.053, 1.2]} />
            <shaderMaterial ref={wallMatRef} vertexShader={wallVertexShader} fragmentShader={wallFragmentShader} uniforms={wallUniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          {/* South Wall */}
          <mesh position={[0, -2.513, -0.6]} rotation={[Math.PI/2, 0, 0]}>
            <planeGeometry args={[10.053, 1.2]} />
            <shaderMaterial vertexShader={wallVertexShader} fragmentShader={wallFragmentShader} uniforms={wallUniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          {/* West Wall */}
          <mesh position={[-5.0265, 0, -0.6]} rotation={[Math.PI/2, Math.PI/2, 0]}>
            <planeGeometry args={[5.026, 1.2]} />
            <shaderMaterial vertexShader={wallVertexShader} fragmentShader={wallFragmentShader} uniforms={wallUniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          {/* East Wall */}
          <mesh position={[5.0265, 0, -0.6]} rotation={[Math.PI/2, Math.PI/2, 0]}>
            <planeGeometry args={[5.026, 1.2]} />
            <shaderMaterial vertexShader={wallVertexShader} fragmentShader={wallFragmentShader} uniforms={wallUniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

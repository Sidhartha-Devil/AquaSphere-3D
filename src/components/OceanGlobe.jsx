import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import useOceanStore from '../store/oceanStore'
import { buildSSTTexture, buildFlowField, buildChlorophyllTexture, GRID_COLS, GRID_ROWS } from '../data/oceanCurrents'
import { generateBathymetryTextures } from '../data/bathymetryData'
import { buildSSTTextureFromDataset, buildFlowTextureFromDataset, buildChlTextureFromDataset } from '../services/textureBuilder'

// ── Shared Morph Logic ──────────────────────────────────────────────────
const morphShaderChunk = `
  vec3 getMorphPosition(vec3 originalPos, vec2 uv, float morph, float depthExtrusion, out vec3 outNormal) {
    // 1. Sphere Position
    vec3 sphereNormal = normalize(originalPos);
    vec3 spherePos = originalPos + sphereNormal * depthExtrusion;

    // 2. Flat Position
    float flatX = (uv.x - 0.5) * 6.28318;   
    float flatY = (uv.y - 0.5) * 3.14159;    
    vec3 flatPos = vec3(flatX * 1.6, flatY * 1.6, depthExtrusion);
    vec3 flatNormal = vec3(0.0, 0.0, 1.0);

    // 3. Morph
    outNormal = normalize(mix(sphereNormal, flatNormal, morph));
    return mix(spherePos, flatPos, morph);
  }
`;

const clippingShaderChunk = `
  uniform float u_clippingEnabled;
  uniform float u_clippingAxis;
  uniform float u_clippingOffset;
  uniform float u_clippingDirection;
  
  void applyClipping(vec3 worldPos) {
    if (u_clippingEnabled > 0.5) {
      float val = worldPos.y;
      if (u_clippingAxis < 0.5) val = worldPos.x;
      else if (u_clippingAxis > 1.5) val = worldPos.z;
      
      if ((val - u_clippingOffset) * u_clippingDirection > 0.0) discard;
    }
  }
`;

// ── Terrain Shaders (Solid Land + Ocean Floor) ──────────────────────────
const terrainVertexShader = `
  uniform float u_morph;
  uniform float u_verticalExaggeration;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_waterMap;
  uniform sampler2D u_earthTexture;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vIsWater;
  varying float vNormalizedDepth;

  ${morphShaderChunk}

  void main() {
    vUv = uv;
    
    float isWater = texture2D(u_waterMap, uv).r;
    vIsWater = isWater;
    
    // 1. Calculate Land Elevation (Push UP)
    float topo = texture2D(u_heightMap, uv).r;
    float seaLevel = 0.376;
    float normalizedHeight = max(0.0, topo - seaLevel) / (1.0 - seaLevel);
    float landExtrusion = normalizedHeight * 8800.0 * 0.000003 * u_verticalExaggeration; 

    // 2. Calculate Ocean Depth from Satellite Texture Luminance (Pull DOWN below depth strata)
    vec4 texColor = texture2D(u_earthTexture, uv);
    float brightness = length(texColor.rgb); 
    float normalizedDepth = smoothstep(0.7, 0.1, brightness);
    vNormalizedDepth = normalizedDepth;

    // In globe mode, seabed sits below stratum 3 (-0.075):
    float globeSeabed = (-0.082 - normalizedDepth * 0.05) * u_verticalExaggeration;
    // In flat mode, seabed sits below stratum 3 (-0.34):
    float flatSeabed  = (-0.350 - normalizedDepth * 0.04) * u_verticalExaggeration;
    float oceanExtrusion = mix(globeSeabed, flatSeabed, u_morph);
    
    // 3. Blend at coastlines
    float waterMask = smoothstep(0.25, 0.65, isWater);
    float depthExtrusion = mix(landExtrusion, oceanExtrusion, waterMask);

    vec3 blendedNormal;
    vec3 pos = getMorphPosition(position, uv, u_morph, depthExtrusion, blendedNormal);
    
    vNormal = blendedNormal;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const terrainFragmentShader = `
  uniform float u_morph;
  uniform float u_opacity;
  uniform sampler2D u_earthTexture;
  uniform sampler2D u_waterMap;
  uniform vec2 u_sliceMin;
  uniform vec2 u_sliceMax;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vIsWater;
  varying float vNormalizedDepth;
  
  ${clippingShaderChunk}

  // Seabed depth color: match stratum colors so they look consistent
  vec3 getSeabedColor(float d) {
    // Map seabed depth to the same thermal-inspired palette as the strata
    vec3 shelf    = vec3(0.02, 0.09, 0.22);   // continental shelf: dark cobalt
    vec3 slope    = vec3(0.04, 0.05, 0.18);   // continental slope: indigo
    vec3 abyssal  = vec3(0.02, 0.02, 0.08);   // abyssal plain: near-black purple
    vec3 trench   = vec3(0.025, 0.005, 0.04); // trench floor: very dark

    if (d < 0.25) return mix(shelf,  slope,   d / 0.25);
    if (d < 0.60) return mix(slope,  abyssal, (d - 0.25) / 0.35);
    return mix(abyssal, trench, (d - 0.60) / 0.40);
  }

  void main() {
    applyClipping(vWorldPos);

    if (u_sliceMin.x < u_sliceMax.x) { 
        if (vUv.x < u_sliceMin.x || vUv.x > u_sliceMax.x || vUv.y < u_sliceMin.y || vUv.y > u_sliceMax.y) discard;
    }

    vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
    float diff = max(dot(normalize(vNormal), lightDir), 0.0);
    float ambient = 0.30;

    vec3 col;
    if (vIsWater > 0.45) {
      vec3 seabed = getSeabedColor(vNormalizedDepth);

      // Vivid bathymetric contour lines (isobaths) - 200m, 500m, 2000m, 4000m
      float c1 = smoothstep(0.007, 0.0, abs(vNormalizedDepth - 0.12)); // ~200m
      float c2 = smoothstep(0.007, 0.0, abs(vNormalizedDepth - 0.28)); // ~800m
      float c3 = smoothstep(0.007, 0.0, abs(vNormalizedDepth - 0.55)); // ~2500m
      float c4 = smoothstep(0.007, 0.0, abs(vNormalizedDepth - 0.78)); // ~4500m
      float contours = max(max(c1, c2), max(c3, c4));
      seabed = mix(seabed, vec3(0.04, 0.20, 0.45), contours * 0.65);

      col = seabed * (diff * 0.70 + ambient);
    } else {
      // Continents: crisp full-color satellite topography
      vec4 earthCol = texture2D(u_earthTexture, vUv);
      col = earthCol.rgb * (diff * 0.85 + ambient);
    }

    gl_FragColor = vec4(col, u_opacity);
  }
`;


// ── Water Shaders (Transparent Sea Level Surface with Top-Down Transmission) ─
const waterVertexShader = `
  uniform float u_morph;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  ${morphShaderChunk}

  void main() {
    vUv = uv;
    vec3 blendedNormal;
    vec3 pos = getMorphPosition(position, uv, u_morph, 0.0, blendedNormal);
    
    vNormal = blendedNormal;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const waterFragmentShader = `
  uniform float u_morph;
  uniform float u_time;
  uniform float u_opacity;
  uniform float u_waterClarity; // 0.2 to 1.0: controls top-down optical transmission
  uniform sampler2D u_waterMap;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_sstMap;
  uniform sampler2D u_flowMap;
  uniform sampler2D u_chlMap;
  
  uniform float u_showTemperature;
  uniform float u_showDirection;
  uniform float u_showChlorophyll;
  uniform float u_focusedLayer;
  uniform float u_isWaterTransparent;
  
  uniform vec2 u_sliceMin;
  uniform vec2 u_sliceMax;

  uniform float u_hasData;
  uniform vec4 u_dataBoundsUV;
  uniform float u_currentTimeStep;
  uniform float u_totalTimeSteps;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  
  ${clippingShaderChunk}

  float rand(vec2 n) { 
      return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }
  float noise(vec2 p){
      vec2 ip = floor(p);
      vec2 u = fract(p);
      u = u*u*(3.0-2.0*u);
      return mix(
          mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
          mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
  }

  float getParticles(vec2 uv) {
      vec2 st = vec2(uv.x * 2.0, uv.y) * 450.0; 
      vec2 cell = floor(st);
      vec2 local = fract(st) - 0.5;
      
      vec2 offset = vec2(rand(cell), rand(cell + vec2(12.34, 56.78))) - 0.5;
      local -= offset * 0.6;
      
      float dist = length(local);
      float core = smoothstep(0.20, 0.02, dist);
      float halo = smoothstep(0.40, 0.05, dist) * 0.5;
      
      float spawn = rand(cell + vec2(45.67, 89.01));
      float mask = step(0.5, spawn);
      
      return (core + halo) * mask;
  }

  vec3 getSpeedColor(float s) {
      float t = clamp(s / 0.8, 0.0, 1.0);
      if (t < 0.5) {
          return vec3(t * 2.0, 1.0, 0.0);
      } else {
          return vec3(1.0, 1.0 - (t - 0.5) * 2.0, 0.0);
      }
  }

  void main() {
    applyClipping(vWorldPos);

    float isWater = texture2D(u_waterMap, vUv).r;
    if (isWater < 0.5) discard;

    if (u_sliceMin.x < u_sliceMax.x) { 
        if (vUv.x < u_sliceMin.x || vUv.x > u_sliceMax.x || vUv.y < u_sliceMin.y || vUv.y > u_sliceMax.y) discard;
    }

    bool insideDataBounds = true;
    if (u_hasData > 0.5) {
        float uMin = u_dataBoundsUV.x;
        float vMin = u_dataBoundsUV.y;
        float uMax = u_dataBoundsUV.z;
        float vMax = u_dataBoundsUV.w;
        insideDataBounds = !(vUv.x < uMin || vUv.x > uMax || vUv.y < vMin || vUv.y > vMax);
    }

    vec3 normal = normalize(vNormal);
    float nd = clamp(texture2D(u_heightMap, vUv).r / 0.376, 0.0, 1.0);

    vec3 baseWaterColor;
    if (u_showChlorophyll > 0.5) {
        baseWaterColor = texture2D(u_chlMap, vUv).rgb;
    } else if (u_showTemperature > 0.5) {
        baseWaterColor = texture2D(u_sstMap, vUv).rgb;
    } else {
        vec3 shallowCol = vec3(0.0, 0.72, 0.85);   
        vec3 deepCol    = vec3(0.01, 0.12, 0.32);   
        baseWaterColor = mix(deepCol, shallowCol, smoothstep(0.5, 1.0, nd));
    }

    vec2 flowRaw = texture2D(u_flowMap, vUv).xy;
    float latRad = (vUv.y - 0.5) * 3.14159265;
    float cosLat = max(0.08, cos(latRad)); 
    vec2 geoFlow = vec2(flowRaw.x / cosLat, flowRaw.y);

    float t = u_time * 0.4;
    vec2 ambientFlow = vec2(0.01 / cosLat, 0.005);
    vec2 waveDir = length(geoFlow) > 0.005 ? normalize(geoFlow) : normalize(ambientFlow);
    float speedMultiplier = length(geoFlow) > 0.005 ? length(geoFlow) * 6.0 : 0.5;
    
    vec2 flowOffset = waveDir * t * speedMultiplier;
    vec2 st = vUv * 300.0;
    
    vec2 st1 = st + flowOffset * 0.9;
    vec2 st2 = st - flowOffset * 0.6 + vec2(t * 0.8, t * 0.4);
    
    float n1 = noise(st1 * 0.15);
    float n2 = noise(st2 * 0.2 + vec2(t * 1.5, t * 1.0));
    float waveDisplacement = clamp((n1 + n2) * 0.5, 0.0, 1.0);

    vec3 perturbedNormal = normalize(normal + vec3((n1 - 0.5) * 0.15, (n2 - 0.5) * 0.15, 0.0));

    vec3 streakColor = vec3(0.0);
    float streakAlpha = 0.0;
    
    if (insideDataBounds) {
        float speed = length(flowRaw);
        if (speed > 0.005) { 
            float animSpeed = u_time * 0.35;
            float phase0 = fract(animSpeed);
            float phase1 = fract(animSpeed + 0.5);

            vec2 advect = normalize(geoFlow) * speed * 0.4;
            vec2 uv0 = vUv - advect * phase0;
            vec2 uv1 = vUv - advect * phase1;

            float p0 = getParticles(uv0);
            float p1 = getParticles(uv1);

            float weight0 = 1.0 - abs(phase0 * 2.0 - 1.0);
            float weight1 = 1.0 - abs(phase1 * 2.0 - 1.0);

            float particleIntensity = (p0 * weight0 + p1 * weight1);
            float flowMask = smoothstep(0.005, 0.04, speed);
            
            streakAlpha = particleIntensity * flowMask * 0.9;
            
            if (u_showDirection > 0.5) {
                streakColor = getSpeedColor(speed);
            } else {
                streakAlpha = 0.0;
            }
        }
    }

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
    
    // Physical optical transmission: fresnel is low when looking from above, high at grazing angles
    float cosTheta = max(dot(perturbedNormal, viewDir), 0.0);
    float fresnel = pow(1.0 - cosTheta, 4.0);
    vec3 skyColor = vec3(0.5, 0.75, 1.0);
    
    vec3 halfVector = normalize(lightDir + viewDir);
    float spec = pow(max(dot(perturbedNormal, halfVector), 0.0), 64.0);
    vec3 specCol = vec3(1.0, 0.95, 0.8) * spec * 0.85; 

    vec3 col;
    if (u_showTemperature > 0.5) {
        // TEMPERATURE mode: comfortably dimmed for pleasant viewing without glare
        col = baseWaterColor * 0.54;
        col = clamp(col, 0.0, 1.0);
    } else if (u_showChlorophyll > 0.5) {
        col = baseWaterColor;
        col *= (0.92 + waveDisplacement * 0.16);
        col += specCol * 0.25;
    } else {
        col = baseWaterColor;
        col += vec3(0.0, 0.4, 0.5) * clamp(waveDisplacement * 0.5 + 0.5, 0.0, 1.0) * 0.25;
        col = mix(col, skyColor, fresnel * 0.6);
        col += specCol;
    }
    
    // Current direction streaks / glider flow points — ultra-bright neon pop
    if (streakAlpha > 0.0 && u_showDirection > 0.5) {
        col = mix(col, streakColor * 1.5, streakAlpha * 0.95);
        col += streakColor * streakAlpha * 4.0;
    }

    // ── Alpha computation ─────────────────────────────────────────────────
    float alpha;
    if (u_isWaterTransparent < 0.5) {
        // Water Transparent is OFF → fully opaque, no see-through
        alpha = 1.0;
    } else if (u_showTemperature > 0.5) {
        // Temperature overlay: mostly opaque so colors are vivid
        alpha = 0.95 * u_opacity;
    } else if (u_showChlorophyll > 0.5) {
        alpha = 0.88 * u_opacity;
    } else if (u_focusedLayer >= 0.0) {
        float topDownAlpha = mix(0.06, 0.28, 1.0 - u_waterClarity);
        alpha = mix(0.04, 0.35, fresnel) * u_opacity;
    } else if (u_showDirection > 0.5) {
        float topDownAlpha = mix(0.06, 0.28, 1.0 - u_waterClarity);
        float baseAlpha = mix(topDownAlpha, 0.88, fresnel);
        alpha = mix(baseAlpha, 0.76, 0.60) * u_opacity;
    } else {
        float topDownAlpha = mix(0.06, 0.28, 1.0 - u_waterClarity);
        float baseAlpha = mix(topDownAlpha, 0.88, fresnel);
        alpha = baseAlpha * u_opacity;
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

// ── Opaque Solid Water Shader — rendered when "Water Transparent" is OFF ───────
// Fully photorealistic animated ocean top-surface with normal map waves, caustics,
// specular highlights, and foam crests.
const opaqueWaterVertexShader = `
  uniform float u_morph;
  uniform float u_time;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  ${morphShaderChunk}

  // Smooth hash for wave patterns
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float smoothNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }

  void main() {
    vUv = uv;
    
    // Animated wave displacement on sphere surface
    float waveScale = 80.0;
    float t = u_time;
    float w1 = smoothNoise(uv * waveScale + vec2(t * 0.15, t * 0.08)) * 2.0 - 1.0;
    float w2 = smoothNoise(uv * waveScale * 1.6 - vec2(t * 0.09, t * 0.17)) * 2.0 - 1.0;
    float displacement = (w1 * 0.55 + w2 * 0.35) * 0.0006;
    
    vec3 blendedNormal;
    vec3 pos = getMorphPosition(position, uv, u_morph, displacement, blendedNormal);

    vNormal = blendedNormal;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    vViewDir = normalize(cameraPosition - vWorldPos);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const opaqueWaterFragmentShader = `
  uniform float u_time;
  uniform float u_morph;
  uniform sampler2D u_waterMap;
  uniform sampler2D u_sstMap;
  uniform sampler2D u_flowMap;
  uniform sampler2D u_chlMap;
  uniform float u_showTemperature;
  uniform float u_showDirection;
  uniform float u_showChlorophyll;
  uniform float u_hasData;
  uniform vec4  u_dataBoundsUV;
  uniform vec2 u_sliceMin;
  uniform vec2 u_sliceMax;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  ${clippingShaderChunk}

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float smoothNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * smoothNoise(p); p *= 2.1; a *= 0.48;
    }
    return v;
  }
  vec3 waveNormal(vec2 uv, float t) {
    float eps = 0.002;
    float s1 = fbm(uv * 80.0 + vec2(t * 0.12, t * 0.08));
    float s2 = fbm((uv + vec2(eps, 0.0)) * 80.0 + vec2(t * 0.12, t * 0.08));
    float s3 = fbm((uv + vec2(0.0, eps)) * 80.0 + vec2(t * 0.12, t * 0.08));
    return normalize(vec3(s1 - s2, s1 - s3, 0.01));
  }

  // Velocity particle dots
  float rand2(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
  float getParticles(vec2 uv) {
    vec2 st = vec2(uv.x * 2.0, uv.y) * 450.0;
    vec2 cell = floor(st);
    vec2 local = fract(st) - 0.5;
    vec2 offset = vec2(rand2(cell), rand2(cell + vec2(12.34, 56.78))) - 0.5;
    local -= offset * 0.6;
    float dist = length(local);
    float core = smoothstep(0.18, 0.01, dist);
    float halo = smoothstep(0.38, 0.04, dist) * 0.5;
    float spawn = rand2(cell + vec2(45.67, 89.01));
    float mask = step(0.5, spawn);
    return (core + halo) * mask;
  }
  vec3 getSpeedColor(float s) {
    float t2 = clamp(s / 0.8, 0.0, 1.0);
    if (t2 < 0.25) return mix(vec3(0.0,0.2,1.0), vec3(0.0,1.0,0.8), t2*4.0);
    if (t2 < 0.5)  return mix(vec3(0.0,1.0,0.8), vec3(0.2,1.0,0.0), (t2-0.25)*4.0);
    if (t2 < 0.75) return mix(vec3(0.2,1.0,0.0), vec3(1.0,0.8,0.0), (t2-0.5)*4.0);
    return mix(vec3(1.0,0.8,0.0), vec3(1.0,0.0,0.0), (t2-0.75)*4.0);
  }

  // Temperature colormap (vivid)
  vec3 getThermalColor(float v) {
    if (v < 0.25) return mix(vec3(0.0,0.0,0.5), vec3(0.0,0.5,1.0), v*4.0);
    if (v < 0.5)  return mix(vec3(0.0,0.5,1.0), vec3(0.0,1.0,0.5), (v-0.25)*4.0);
    if (v < 0.75) return mix(vec3(0.0,1.0,0.5), vec3(1.0,0.8,0.0), (v-0.5)*4.0);
    return mix(vec3(1.0,0.8,0.0), vec3(1.0,0.0,0.0), (v-0.75)*4.0);
  }

  void main() {
    applyClipping(vWorldPos);
    float isWater = texture2D(u_waterMap, vUv).r;
    if (isWater < 0.5) discard;
    if (u_sliceMin.x < u_sliceMax.x) {
      if (vUv.x < u_sliceMin.x || vUv.x > u_sliceMax.x || vUv.y < u_sliceMin.y || vUv.y > u_sliceMax.y) discard;
    }

    float t = u_time;

    // ── Wave normals for specular
    vec3 wn1 = waveNormal(vUv, t);
    vec3 wn2 = waveNormal(vUv * 1.7 + vec2(0.3, 0.15), t * 0.65);
    vec3 perturbedN = normalize(vNormal + (wn1 * 0.35 + wn2 * 0.20));

    // ── Realistic ocean base color
    float lat = abs(vUv.y - 0.5) * 2.0;
    vec3 deepColor    = mix(vec3(0.01, 0.06, 0.22), vec3(0.02, 0.18, 0.28), lat * 0.6);
    vec3 surfaceColor = mix(vec3(0.0, 0.35, 0.65), vec3(0.0, 0.55, 0.55), lat * 0.5);
    float depth = fbm(vUv * 6.0 + vec2(t * 0.004, 0.0));
    vec3 baseColor = mix(deepColor, surfaceColor, depth * 0.55 + 0.1);
    float ripple1 = smoothNoise(vUv * 280.0 + vec2(t * 0.22, t * -0.14));
    float ripple2 = smoothNoise(vUv * 450.0 - vec2(t * 0.18, t * 0.26));
    float ripple3 = smoothNoise(vUv * 600.0 + vec2(t * 0.30, t * 0.19));
    float ripplePattern = (ripple1 * 0.5 + ripple2 * 0.3 + ripple3 * 0.2);
    vec3 rippleColor = mix(baseColor, vec3(0.0, 0.70, 0.85), ripplePattern * 0.18);

    // ── Lighting
    vec3 lightDir = normalize(vec3(0.8, 1.2, 1.5));
    float diff = max(dot(perturbedN, lightDir), 0.0);
    vec3 halfVec = normalize(lightDir + vViewDir);
    float spec = pow(max(dot(perturbedN, halfVec), 0.0), 128.0);
    float spec2 = pow(max(dot(perturbedN, normalize(vec3(-0.5, 0.8, 1.0))), 0.0), 64.0);
    float fresnel = pow(1.0 - max(dot(perturbedN, vViewDir), 0.0), 3.5);
    vec3 skyReflect = mix(vec3(0.3, 0.65, 1.0), vec3(0.05, 0.15, 0.45), fresnel * 0.7);
    vec3 col = rippleColor;
    col = mix(col, skyReflect, fresnel * 0.45);
    col += vec3(1.0, 0.97, 0.9) * spec * 1.6;
    col += vec3(0.7, 0.9, 1.0) * spec2 * 0.5;
    col *= (0.78 + diff * 0.30);
    float foam = pow(max(0.0, ripplePattern - 0.72) * 4.0, 2.0);
    col = mix(col, vec3(0.9, 0.96, 1.0), foam * 0.55);
    float cx = sin(vUv.x * 320.0 + t * 1.8) * sin(vUv.y * 260.0 + t * 1.3);
    float caustic = pow(max(0.0, cx), 4.0) * 0.12;
    col += vec3(0.0, 0.6, 1.0) * caustic * (1.0 - fresnel);

    // ── Temperature overlay (comfortably dimmed for pleasant viewing)
    if (u_showTemperature > 0.5) {
      vec3 thermalCol = texture2D(u_sstMap, vUv).rgb;
      col = mix(col, thermalCol * 0.54, 0.55);
    }

    // ── Chlorophyll overlay
    if (u_showChlorophyll > 0.5) {
      vec3 chlCol = texture2D(u_chlMap, vUv).rgb;
      col = mix(col, chlCol, 0.75);
    }

    // ── Velocity particle overlay (ultra-bright, popping on opaque water)
    if (u_showDirection > 0.5) {
      vec2 flowRaw = texture2D(u_flowMap, vUv).xy;
      float latRad = (vUv.y - 0.5) * 3.14159265;
      float cosLat = max(0.08, cos(latRad));
      vec2 geoFlow = vec2(flowRaw.x / cosLat, flowRaw.y);
      float speed = length(flowRaw);
      if (speed > 0.003) {
        float animSpeed = t * 0.35;
        float phase0 = fract(animSpeed);
        float phase1 = fract(animSpeed + 0.5);
        vec2 advect = normalize(geoFlow) * speed * 0.4;
        vec2 uv0 = vUv - advect * phase0;
        vec2 uv1 = vUv - advect * phase1;
        float p0 = getParticles(uv0);
        float p1 = getParticles(uv1);
        float weight0 = 1.0 - abs(phase0 * 2.0 - 1.0);
        float weight1 = 1.0 - abs(phase1 * 2.0 - 1.0);
        float particleIntensity = (p0 * weight0 + p1 * weight1);
        float flowMask = smoothstep(0.003, 0.035, speed);
        float streakAlpha = particleIntensity * flowMask;
        vec3 streakColor = getSpeedColor(speed);
        // Ultra-bright on opaque surface — glider flow dots vividly pop
        col = mix(col, streakColor * 1.5, streakAlpha * 0.95);
        col += streakColor * streakAlpha * 4.2;
      }
    }

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Multi-Layer Depth Strata Shaders (Data-Driven Temperature & Depth) ───────
const depthLayerVertexShader = `
  uniform float u_morph;
  uniform float u_verticalExaggeration;
  uniform float u_layerFraction; // 0.0 = surface, 1.0 = ocean bed
  uniform sampler2D u_waterMap;
  uniform sampler2D u_earthTexture;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vIsWater;
  varying float vSeabedDepth;

  ${morphShaderChunk}

  void main() {
    vUv = uv;
    float isWater = texture2D(u_waterMap, uv).r;
    vIsWater = isWater;

    // Calculate ocean depth from texture luminance for discarding land
    vec4 texColor = texture2D(u_earthTexture, uv);
    float brightness = length(texColor.rgb);
    float normalizedDepth = smoothstep(0.7, 0.1, brightness);
    vSeabedDepth = normalizedDepth;

    // Layer positioned as concentric shells: 
    // layerFraction ranges from 0.18 (surface) to 0.90 (deep abyss)
    // In globe mode: spans from -0.012 to -0.068
    // In flat mode:  spans from -0.060 to -0.320
    float sphereExtrusion = -u_layerFraction * 0.075 * u_verticalExaggeration;
    float flatExtrusion   = -u_layerFraction * 0.350 * u_verticalExaggeration;
    float shellOffset     = mix(sphereExtrusion, flatExtrusion, u_morph);

    vec3 blendedNormal;
    vec3 pos = getMorphPosition(position, uv, u_morph, shellOffset, blendedNormal);

    vNormal = blendedNormal;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;


const depthLayerFragmentShader = `
  uniform float u_morph;
  uniform float u_opacity;
  uniform vec3  u_baseLayerColor;
  uniform float u_layerIndex;
  uniform float u_layerFraction;
  uniform float u_focusedLayer;
  uniform sampler2D u_sstMap;
  uniform vec2  u_sliceMin;
  uniform vec2  u_sliceMax;
  uniform float u_time;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vIsWater;
  varying float vSeabedDepth;

  ${clippingShaderChunk}

  // Realistic ocean temperature color scale (warm tropical SST to frigid hadal trench)
  vec3 getThermalColor(float tempC) {
    vec3 colHadal   = vec3(0.65, 0.04, 0.15); // Hadal Trench (1°C - 2°C)
    vec3 colBathyal = vec3(0.38, 0.08, 0.68); // Bathypelagic (3°C - 6°C)
    vec3 colThermo  = vec3(0.08, 0.32, 0.88); // Thermocline (8°C - 16°C)
    vec3 colSubtrop = vec3(0.00, 0.78, 0.95); // Subtropical (18°C - 24°C)
    vec3 colTropical= vec3(0.98, 0.46, 0.14); // Warm Tropical SST (26°C - 30°C)

    if (tempC < 3.5)  return mix(colHadal, colBathyal, clamp((tempC - 1.0) / 2.5, 0.0, 1.0));
    if (tempC < 10.0) return mix(colBathyal, colThermo, clamp((tempC - 3.5) / 6.5, 0.0, 1.0));
    if (tempC < 20.0) return mix(colThermo, colSubtrop, clamp((tempC - 10.0) / 10.0, 0.0, 1.0));
    return mix(colSubtrop, colTropical, clamp((tempC - 20.0) / 10.0, 0.0, 1.0));
  }

  void main() {
    applyClipping(vWorldPos);

    if (vIsWater < 0.35) discard;

    if (u_sliceMin.x < u_sliceMax.x) { 
      if (vUv.x < u_sliceMin.x || vUv.x > u_sliceMax.x || vUv.y < u_sliceMin.y || vUv.y > u_sliceMax.y) discard;
    }

    // 1. Calculate local temperature from SST and physical depth decay
    float sstRaw = texture2D(u_sstMap, vUv).r;
    float sstTemp = sstRaw * 30.0; // 0°C to 30°C
    
    // Exponential thermocline decay with depth
    float depthDecay = exp(-u_layerFraction * 3.4);
    float localTemp = sstTemp * depthDecay + 1.1;

    // 2. Compute temperature-accurate color gradient
    vec3 thermalCol = getThermalColor(localTemp);

    // Blend with base stratum identity color for crisp visual separation
    vec3 col = mix(thermalCol, u_baseLayerColor, 0.40);

    // Halocline wave ripples - animated microstructure visible from top
    float stria = sin(vUv.y * 320.0 + u_time * 0.4) * 0.05 + cos(vUv.x * 300.0 + u_time * 0.2) * 0.04;
    col += thermalCol * stria * 0.6;

    // Depth contour lines (isobaths) - bands visible from top-down
    float isobath = smoothstep(0.012, 0.0, abs(fract(vUv.y * 40.0 + u_layerFraction * 8.0) - 0.5) - 0.48);
    col = mix(col, vec3(1.0), isobath * 0.35);

    // Fresnel rim glow
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float cosTheta = max(dot(normalize(vNormal), viewDir), 0.0);
    float rim = pow(1.0 - cosTheta, 2.5);
    col += u_baseLayerColor * rim * 0.8;

    // 3. Layer Focus / Isolation logic
    float layerAlpha;
    if (u_focusedLayer >= 0.0) {
      if (abs(u_focusedLayer - u_layerIndex) < 0.5) {
        // Focused active layer: vivid, highly visible, and glowing
        layerAlpha = 0.96;
        col = col * 1.35 + u_baseLayerColor * 0.25;
      } else {
        // Dimmed non-focused layers
        layerAlpha = 0.04;
      }
    } else {
      // All layers together: each layer semi-transparent and luminous so all 4 layers form a visible stack
      layerAlpha = mix(0.42, 0.75, u_layerFraction);
    }

    float finalAlpha = layerAlpha * u_opacity;
    gl_FragColor = vec4(col, finalAlpha);
  }
`;

// ── Volumetric Perimeter Skirt Shaders (Fills the side void in Flat View) ─────
const skirtVertexShader = `
  uniform float u_morph;
  uniform float u_verticalExaggeration;
  
  attribute float a_edgeId;   // 0=West, 1=East, 2=South, 3=North
  attribute float a_tLength;  // 0 to 1 along the perimeter edge
  attribute float a_tDepth;   // 0 = surface (Z=0), 1 = max ocean depth

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vDepthRatio;

  void main() {
    vDepthRatio = a_tDepth;
    
    float halfW = 5.02655;
    float halfH = 2.51327;
    float baseDepth = 0.38 * u_verticalExaggeration;

    vec3 flatPos;
    if (a_edgeId < 0.5) {
      flatPos = vec3(-halfW, (a_tLength - 0.5) * (halfH * 2.0), -a_tDepth * baseDepth);
      vUv = vec2(0.0, a_tLength);
    } else if (a_edgeId < 1.5) {
      flatPos = vec3(halfW, (a_tLength - 0.5) * (halfH * 2.0), -a_tDepth * baseDepth);
      vUv = vec2(1.0, a_tLength);
    } else if (a_edgeId < 2.5) {
      flatPos = vec3((a_tLength - 0.5) * (halfW * 2.0), -halfH, -a_tDepth * baseDepth);
      vUv = vec2(a_tLength, 0.0);
    } else {
      flatPos = vec3((a_tLength - 0.5) * (halfW * 2.0), halfH, -a_tDepth * baseDepth);
      vUv = vec2(a_tLength, 1.0);
    }

    vec3 pos = flatPos * u_morph;
    
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const skirtFragmentShader = `
  uniform float u_morph;
  uniform float u_opacity;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vDepthRatio;

  ${clippingShaderChunk}

  // Exact vertical ocean depth color gradient matching Image 1:
  vec3 getDepthGradient(float d) {
    vec3 surface   = vec3(0.0,  0.90, 1.0);   // Surface Cyan
    vec3 epipelagic= vec3(0.01, 0.52, 0.85);  // Epipelagic Azure
    vec3 mesopelag = vec3(0.08, 0.22, 0.75);  // Thermocline Blue
    vec3 bathypelag= vec3(0.35, 0.08, 0.65);  // Bathypelagic Purple
    vec3 hadal     = vec3(0.65, 0.04, 0.15);  // Hadal Crimson

    if (d < 0.15) return mix(surface, epipelagic, d / 0.15);
    if (d < 0.40) return mix(epipelagic, mesopelag, (d - 0.15) / 0.25);
    if (d < 0.70) return mix(mesopelag, bathypelag, (d - 0.40) / 0.30);
    return mix(bathypelag, hadal, (d - 0.70) / 0.30);
  }

  void main() {
    applyClipping(vWorldPos);

    float morphAlpha = pow(clamp(u_morph, 0.0, 1.0), 2.5);
    if (morphAlpha < 0.02) discard;

    vec3 col = getDepthGradient(vDepthRatio);

    // Horizontal depth contour tick lines
    float tick200m  = smoothstep(0.008, 0.0, abs(vDepthRatio - 0.15));
    float tick1000m = smoothstep(0.008, 0.0, abs(vDepthRatio - 0.40));
    float tick4000m = smoothstep(0.008, 0.0, abs(vDepthRatio - 0.70));
    float ticks = max(max(tick200m, tick1000m), tick4000m);
    
    col = mix(col, vec3(1.0, 1.0, 1.0), ticks * 0.45);

    float strata = sin(vDepthRatio * 180.0) * 0.03;
    col += vec3(strata);

    gl_FragColor = vec4(col, 0.95 * morphAlpha * u_opacity);
  }
`;

// ── Solid Crust Substratum Base Shaders ───────────────────────────────────────
const crustVertexShader = `
  uniform float u_morph;
  uniform float u_verticalExaggeration;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    float halfW = 5.02655;
    float halfH = 2.51327;
    float baseDepth = -0.38 * u_verticalExaggeration;

    vec3 flatPos = vec3((uv.x - 0.5) * (halfW * 2.0), (uv.y - 0.5) * (halfH * 2.0), baseDepth);
    vec3 pos = flatPos * u_morph;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const crustFragmentShader = `
  uniform float u_morph;
  uniform float u_opacity;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  ${clippingShaderChunk}

  void main() {
    applyClipping(vWorldPos);
    float morphAlpha = pow(clamp(u_morph, 0.0, 1.0), 2.5);
    if (morphAlpha < 0.02) discard;

    vec3 col = vec3(0.04, 0.07, 0.12);
    gl_FragColor = vec4(col, 0.98 * morphAlpha * u_opacity);
  }
`;

// ── Component Definition ─────────────────────────────────────────────────────
export default function OceanGlobe() {
  const terrainRef = useRef()
  const waterRef = useRef()
  const opaqueWaterRef = useRef()
  const skirtRef = useRef()
  const crustRef = useRef()
  const depthStrataRefs = useRef([])
  const { camera } = useThree()

  const morphProgress = useOceanStore(s => s.morphProgress)
  const opacity = useOceanStore(s => s.opacity)
  const verticalExaggeration = useOceanStore(s => s.verticalExaggeration)
  const showBathymetry = useOceanStore(s => s.showBathymetry)
  const sliceBounds = useOceanStore(s => s.sliceBounds)
  
  const showWaterSurface = useOceanStore(s => s.showWaterSurface)
  const isWaterTransparent = useOceanStore(s => s.isWaterTransparent ?? true)
  const showTemperature = useOceanStore(s => s.showTemperature)
  const showWaterDirection = useOceanStore(s => s.showWaterDirection)
  const showChlorophyll = useOceanStore(s => s.showChlorophyll)
  const userDataset = useOceanStore(s => s.userDataset)

  const focusedDepthLayer = useOceanStore(s => s.focusedDepthLayer ?? -1)
  const waterClarity = useOceanStore(s => s.waterClarity ?? 0.65)

  const [earthTexture, waterMap, heightMap] = useLoader(THREE.TextureLoader, [
    '/earth_blue_marble.jpg',
    '/earth_water.png',
    '/earth_topology.png'
  ])

  const [sstTexture, flowTexture, chlTexture, bathyTexture, builtinSSTData, builtinFlowData, builtinChlData] = useMemo(() => {
    // Build SST at high resolution (720×360) for vivid, sharp temperature overlay
    const sst = buildSSTTexture(); // uses internal defaults: 720×360
    const texSST = new THREE.DataTexture(sst.data, sst.width, sst.height, THREE.RGBAFormat);
    texSST.minFilter = THREE.LinearFilter;
    texSST.magFilter = THREE.LinearFilter;
    texSST.wrapS = THREE.RepeatWrapping;
    texSST.wrapT = THREE.ClampToEdgeWrapping;
    texSST.needsUpdate = true;
    
    const chl = buildChlorophyllTexture(GRID_COLS, GRID_ROWS);
    const texChl = new THREE.DataTexture(chl.data, chl.width, chl.height, THREE.RGBAFormat);
    texChl.minFilter = THREE.LinearFilter;
    texChl.magFilter = THREE.LinearFilter;
    texChl.needsUpdate = true;
    
    const flow = buildFlowField();
    const texFlow = new THREE.DataTexture(flow, GRID_COLS, GRID_ROWS, THREE.RGFormat, THREE.FloatType);
    texFlow.needsUpdate = true;
    
    const bathy = generateBathymetryTextures();
    const texBathy = new THREE.DataTexture(bathy.bathyData, 256, 128, THREE.RGBAFormat);
    texBathy.needsUpdate = true;
    
    return [texSST, texFlow, texChl, texBathy, sst.data, flow, chl.data];
  }, []);

  const dataBoundsUV = useOceanStore(s => s.dataBoundsUV)
  const setFlowData = useOceanStore(s => s.setFlowData)
  const currentTimeStep = useOceanStore(s => s.currentTimeStep)
  const totalTimeSteps = useOceanStore(s => s.totalTimeSteps)

  // 4 Oceanic Depth Strata with physical temperature metadata
  const DEPTH_STRATA = useMemo(() => [
    { id: 'epipelagic',  index: 0.0, fraction: 0.18, color: new THREE.Color('#00d4ff'), tempRange: '24-28°C', name: 'Surface / Epipelagic (0-200m)' },
    { id: 'mesopelagic', index: 1.0, fraction: 0.42, color: new THREE.Color('#1d4ed8'), tempRange: '10-18°C', name: 'Upper Thermocline (200-1000m)' },
    { id: 'bathypelagic',index: 2.0, fraction: 0.68, color: new THREE.Color('#6d28d9'), tempRange: '4-8°C',   name: 'Bathypelagic / Midnight (1000-4000m)' },
    { id: 'abyssal',     index: 3.0, fraction: 0.90, color: new THREE.Color('#9f1239'), tempRange: '1.1-2°C', name: 'Abyssopelagic & Hadal (4000m+)' },
  ], [])

  // Procedural Perimeter Side Skirt Geometry
  const skirtGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const edges = 4
    const segsAlong = 96
    const segsDepth = 16
    
    const positions = []
    const edgeIds = []
    const tLengths = []
    const tDepths = []
    const indices = []
    
    let vertOffset = 0
    for (let e = 0; e < edges; e++) {
      for (let d = 0; d <= segsDepth; d++) {
        const tD = d / segsDepth
        for (let l = 0; l <= segsAlong; l++) {
          const tL = l / segsAlong
          positions.push(0, 0, 0)
          edgeIds.push(e)
          tLengths.push(tL)
          tDepths.push(tD)
        }
      }
      for (let d = 0; d < segsDepth; d++) {
        for (let l = 0; l < segsAlong; l++) {
          const row = segsAlong + 1
          const a = vertOffset + d * row + l
          const b = a + 1
          const c = vertOffset + (d + 1) * row + l
          const dIdx = c + 1
          indices.push(a, b, c)
          indices.push(b, dIdx, c)
        }
      }
      vertOffset += (segsDepth + 1) * (segsAlong + 1)
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('a_edgeId', new THREE.Float32BufferAttribute(edgeIds, 1))
    geo.setAttribute('a_tLength', new THREE.Float32BufferAttribute(tLengths, 1))
    geo.setAttribute('a_tDepth', new THREE.Float32BufferAttribute(tDepths, 1))
    geo.setIndex(indices)
    return geo
  }, [])

  // Procedural Crust Base Geometry
  const crustGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(10.0531, 5.0265, 32, 16)
  }, [])

  // Update textures from dataset
  useEffect(() => {
    if (!waterRef.current) return;

    waterRef.current.uniforms.u_hasData.value = userDataset ? 1.0 : 0.0;
    waterRef.current.uniforms.u_dataBoundsUV.value = dataBoundsUV;

    if (!userDataset) {
      waterRef.current.uniforms.u_sstMap.value = sstTexture;
      waterRef.current.uniforms.u_flowMap.value = flowTexture;
      waterRef.current.uniforms.u_chlMap.value = chlTexture;
      return;
    }

    let currentSlice = userDataset;
    if (userDataset.timestamps && userDataset.timestamps.length > 1 && userDataset.rows) {
      const ts = userDataset.timestamps[currentTimeStep] || userDataset.timestamps[0];
      const sliceRows = userDataset.rows.filter(r => r.timestamp === ts);
      currentSlice = { ...userDataset, points: sliceRows };
    } else if (userDataset.rows && !userDataset.points) {
      currentSlice = { ...userDataset, points: userDataset.rows };
    }

    const sstRes = buildSSTTextureFromDataset(currentSlice, builtinSSTData);
    const flowRes = buildFlowTextureFromDataset(currentSlice, builtinFlowData);
    const chlRes = buildChlTextureFromDataset(currentSlice, builtinChlData);

    if (sstRes) waterRef.current.uniforms.u_sstMap.value = sstRes.texture;
    if (flowRes) {
      waterRef.current.uniforms.u_flowMap.value = flowRes.texture;
      setFlowData({ uData: flowRes.uData, vData: flowRes.vData, maxSpeed: flowRes.maxSpeed, waterMask: flowRes.waterMask });
    }
    if (chlRes) waterRef.current.uniforms.u_chlMap.value = chlRes.texture;
  }, [userDataset, dataBoundsUV, sstTexture, flowTexture, chlTexture, builtinSSTData, builtinFlowData, builtinChlData, setFlowData, currentTimeStep]);

  // ── Uniform Objects ────────────────────────────────────────────────────────
  const terrainUniforms = useMemo(() => ({
    u_morph:                { value: 0.0 },
    u_verticalExaggeration: { value: verticalExaggeration },
    u_waterMap:             { value: waterMap },
    u_heightMap:            { value: heightMap },
    u_sliceMin:             { value: new THREE.Vector2(1, 1) },
    u_sliceMax:             { value: new THREE.Vector2(0, 0) },
    u_opacity:              { value: 1.0 },
    u_earthTexture:         { value: earthTexture },
    u_clippingEnabled:      { value: 0.0 },
    u_clippingAxis:         { value: 1.0 },
    u_clippingOffset:       { value: 0.0 },
    u_clippingDirection:    { value: 1.0 },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const waterUniforms = useMemo(() => ({
    u_morph:            { value: 0.0 },
    u_verticalExaggeration: { value: verticalExaggeration },
    u_waterMap:         { value: waterMap },
    u_heightMap:        { value: heightMap },
    u_bathyMap:         { value: bathyTexture },
    u_sliceMin:         { value: new THREE.Vector2(1, 1) },
    u_sliceMax:         { value: new THREE.Vector2(0, 0) },
    u_time:             { value: 0.0 },
    u_opacity:          { value: opacity },
    u_waterClarity:     { value: waterClarity },
    u_sstMap:           { value: sstTexture },
    u_flowMap:          { value: flowTexture },
    u_chlMap:           { value: chlTexture },
    u_showTemperature:  { value: showTemperature ? 1.0 : 0.0 },
    u_showDirection:    { value: showWaterDirection ? 1.0 : 0.0 },
    u_showChlorophyll:  { value: showChlorophyll ? 1.0 : 0.0 },
    u_hasData:          { value: 0.0 },
    u_dataBoundsUV:     { value: new THREE.Vector4(0, 0, 1, 1) },
    u_currentTimeStep:  { value: 0.0 },
    u_totalTimeSteps:   { value: 1.0 },
    u_clippingEnabled:  { value: 0.0 },
    u_clippingAxis:     { value: 1.0 },
    u_clippingOffset:   { value: 0.0 },
    u_clippingDirection:{ value: 1.0 },
    u_focusedLayer:     { value: focusedDepthLayer },
    u_isWaterTransparent: { value: isWaterTransparent ? 1.0 : 0.0 },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  // Uniforms for the OPAQUE water surface (same data overlays)
  const opaqueWaterUniforms = useMemo(() => ({
    u_morph:           { value: 0.0 },
    u_time:            { value: 0.0 },
    u_waterMap:        { value: waterMap },
    u_sstMap:          { value: sstTexture },
    u_flowMap:         { value: flowTexture },
    u_chlMap:          { value: chlTexture },
    u_showTemperature: { value: showTemperature ? 1.0 : 0.0 },
    u_showDirection:   { value: showWaterDirection ? 1.0 : 0.0 },
    u_showChlorophyll: { value: showChlorophyll ? 1.0 : 0.0 },
    u_hasData:         { value: 0.0 },
    u_dataBoundsUV:    { value: new THREE.Vector4(0, 0, 1, 1) },
    u_sliceMin:        { value: new THREE.Vector2(1, 1) },
    u_sliceMax:        { value: new THREE.Vector2(0, 0) },
    u_clippingEnabled: { value: 0.0 },
    u_clippingAxis:    { value: 1.0 },
    u_clippingOffset:  { value: 0.0 },
    u_clippingDirection: { value: 1.0 },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  // Uniforms for the 4 depth strata layers with temperature data
  const depthStrataUniformsList = useMemo(() => {
    return DEPTH_STRATA.map(s => ({
      u_morph:                { value: 0.0 },
      u_verticalExaggeration: { value: verticalExaggeration },
      u_waterMap:             { value: waterMap },
      u_earthTexture:         { value: earthTexture },
      u_sstMap:               { value: sstTexture },
      u_layerIndex:           { value: s.index },
      u_layerFraction:        { value: s.fraction },
      u_baseLayerColor:       { value: s.color },
      u_focusedLayer:         { value: focusedDepthLayer },
      u_opacity:              { value: opacity },
      u_time:                 { value: 0.0 },
      u_sliceMin:             { value: new THREE.Vector2(1, 1) },
      u_sliceMax:             { value: new THREE.Vector2(0, 0) },
      u_clippingEnabled:      { value: 0.0 },
      u_clippingAxis:         { value: 1.0 },
      u_clippingOffset:       { value: 0.0 },
      u_clippingDirection:    { value: 1.0 },
    }))
  }, [DEPTH_STRATA, waterMap, earthTexture, sstTexture]) // eslint-disable-line react-hooks/exhaustive-deps

  const skirtUniforms = useMemo(() => ({
    u_morph:                { value: 0.0 },
    u_verticalExaggeration: { value: verticalExaggeration },
    u_opacity:              { value: opacity },
    u_clippingEnabled:      { value: 0.0 },
    u_clippingAxis:         { value: 1.0 },
    u_clippingOffset:       { value: 0.0 },
    u_clippingDirection:    { value: 1.0 },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const crustUniforms = useMemo(() => ({
    u_morph:                { value: 0.0 },
    u_verticalExaggeration: { value: verticalExaggeration },
    u_opacity:              { value: opacity },
    u_clippingEnabled:      { value: 0.0 },
    u_clippingAxis:         { value: 1.0 },
    u_clippingOffset:       { value: 0.0 },
    u_clippingDirection:    { value: 1.0 },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  // Imperatively sync toggles & controls
  useEffect(() => {
    if (waterRef.current) {
      waterRef.current.uniforms.u_showTemperature.value = showTemperature ? 1.0 : 0.0;
      waterRef.current.uniforms.u_showDirection.value   = showWaterDirection ? 1.0 : 0.0;
      waterRef.current.uniforms.u_showChlorophyll.value = showChlorophyll ? 1.0 : 0.0;
      waterRef.current.uniforms.u_waterClarity.value    = waterClarity;
      if (waterRef.current.uniforms.u_isWaterTransparent) {
        waterRef.current.uniforms.u_isWaterTransparent.value = isWaterTransparent ? 1.0 : 0.0;
      }
    }
    if (opaqueWaterRef.current) {
      opaqueWaterRef.current.uniforms.u_showTemperature.value = showTemperature ? 1.0 : 0.0;
      opaqueWaterRef.current.uniforms.u_showDirection.value   = showWaterDirection ? 1.0 : 0.0;
      opaqueWaterRef.current.uniforms.u_showChlorophyll.value = showChlorophyll ? 1.0 : 0.0;
    }
  }, [showTemperature, showWaterDirection, showChlorophyll, waterClarity, isWaterTransparent])

  useEffect(() => {
    if (waterRef.current) {
      waterRef.current.uniforms.u_focusedLayer.value = focusedDepthLayer;
    }
    depthStrataRefs.current.forEach(ref => {
      if (ref) ref.uniforms.u_focusedLayer.value = focusedDepthLayer;
    });
  }, [focusedDepthLayer])

  useEffect(() => {
    if (waterRef.current)   waterRef.current.uniforms.u_opacity.value = opacity;
    if (terrainRef.current) terrainRef.current.uniforms.u_opacity.value = opacity;
    if (skirtRef.current)   skirtRef.current.uniforms.u_opacity.value = opacity;
    if (crustRef.current)   crustRef.current.uniforms.u_opacity.value = opacity;
    depthStrataRefs.current.forEach(ref => {
      if (ref) ref.uniforms.u_opacity.value = opacity;
    });
  }, [opacity])

  useEffect(() => {
    const slMin = sliceBounds ? new THREE.Vector2(sliceBounds.minX, sliceBounds.minY) : new THREE.Vector2(1, 1);
    const slMax = sliceBounds ? new THREE.Vector2(sliceBounds.maxX, sliceBounds.maxY) : new THREE.Vector2(0, 0);
    if (waterRef.current) {
      waterRef.current.uniforms.u_sliceMin.value = slMin;
      waterRef.current.uniforms.u_sliceMax.value = slMax;
    }
    if (terrainRef.current) {
      terrainRef.current.uniforms.u_sliceMin.value = slMin;
      terrainRef.current.uniforms.u_sliceMax.value = slMax;
    }
    if (opaqueWaterRef.current) {
      opaqueWaterRef.current.uniforms.u_sliceMin.value = slMin;
      opaqueWaterRef.current.uniforms.u_sliceMax.value = slMax;
    }
    depthStrataRefs.current.forEach(ref => {
      if (ref) {
        ref.uniforms.u_sliceMin.value = slMin;
        ref.uniforms.u_sliceMax.value = slMax;
      }
    });
  }, [sliceBounds])

  const clippingEnabled = useOceanStore(s => s.clippingEnabled)
  const clippingAxis = useOceanStore(s => s.clippingAxis)
  const clippingOffset = useOceanStore(s => s.clippingOffset)
  const clippingDirection = useOceanStore(s => s.clippingDirection)

  useEffect(() => {
    const clipAxisVal = clippingAxis === 'X' ? 0.0 : (clippingAxis === 'Y' ? 1.0 : 2.0);
    const applyClip = (u) => {
      if (!u) return;
      u.u_clippingEnabled.value = clippingEnabled ? 1.0 : 0.0;
      u.u_clippingAxis.value = clipAxisVal;
      u.u_clippingOffset.value = clippingOffset;
      u.u_clippingDirection.value = clippingDirection;
    };
    if (terrainRef.current) applyClip(terrainRef.current.uniforms);
    if (waterRef.current) applyClip(waterRef.current.uniforms);
    if (opaqueWaterRef.current) applyClip(opaqueWaterRef.current.uniforms);
    if (skirtRef.current) applyClip(skirtRef.current.uniforms);
    if (crustRef.current) applyClip(crustRef.current.uniforms);
    depthStrataRefs.current.forEach(ref => {
      if (ref) applyClip(ref.uniforms);
    });
  }, [clippingEnabled, clippingAxis, clippingOffset, clippingDirection]);

  useEffect(() => {
    if (waterRef.current) {
      waterRef.current.uniforms.u_currentTimeStep.value = currentTimeStep;
    }
  }, [currentTimeStep])

  const isPlaying = useOceanStore(s => s.isPlaying)
  const currentSpeed = useOceanStore(s => s.currentSpeed)
  const playbackDirection = useOceanStore(s => s.playbackDirection)
  const timeRef = useRef(0)

  useFrame((state, delta) => {
    if (!terrainRef.current || !waterRef.current) return

    const current = terrainRef.current.uniforms.u_morph.value
    const speed = 2.0 
    const newVal = THREE.MathUtils.lerp(current, morphProgress, delta * speed)
    
    terrainRef.current.uniforms.u_morph.value = newVal
    terrainRef.current.uniforms.u_verticalExaggeration.value = verticalExaggeration
    
    waterRef.current.uniforms.u_morph.value = newVal
    
    if (isPlaying || !userDataset) {
        timeRef.current += delta * Math.max(currentSpeed, 0.25) * playbackDirection * 0.15;
    }
    waterRef.current.uniforms.u_time.value = timeRef.current
    waterRef.current.uniforms.u_totalTimeSteps.value = totalTimeSteps

    // Sync opaque water time & morph
    if (opaqueWaterRef.current) {
      opaqueWaterRef.current.uniforms.u_morph.value = newVal
      opaqueWaterRef.current.uniforms.u_time.value = timeRef.current
    }

    // Sync morph, exaggeration, & time to Depth Strata, Skirt & Crust
    depthStrataRefs.current.forEach(ref => {
      if (ref) {
        ref.uniforms.u_morph.value = newVal
        ref.uniforms.u_verticalExaggeration.value = verticalExaggeration
        ref.uniforms.u_time.value = timeRef.current
      }
    })

    if (skirtRef.current) {
      skirtRef.current.uniforms.u_morph.value = newVal
      skirtRef.current.uniforms.u_verticalExaggeration.value = verticalExaggeration
    }

    if (crustRef.current) {
      crustRef.current.uniforms.u_morph.value = newVal
      crustRef.current.uniforms.u_verticalExaggeration.value = verticalExaggeration
    }
  })

  useEffect(() => {
    const flatTarget = showBathymetry ? new THREE.Vector3(0, -4, 6) : new THREE.Vector3(0, 0, 7);
    const targetPos = morphProgress > 0.5 ? flatTarget : new THREE.Vector3(0, 1.5, 4)  
    const dur = 800
    const start = Date.now()
    const startPos = camera.position.clone()

    const animate = () => {
      const t = Math.min((Date.now() - start) / dur, 1)
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t 
      camera.position.lerpVectors(startPos, targetPos, ease)
      camera.lookAt(0, 0, 0)
      if (t < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [morphProgress, showBathymetry, camera])

  const groupRef = useRef();
  
  return (
    <group ref={groupRef}>
      {/* 1. High-Resolution Terrain Mesh (Solid Land + Dark Oceanic Basalt Bed) */}
      <mesh scale={[1, 1, 1]} renderOrder={0}>
        <sphereGeometry args={[1.5, 1024, 512]} />
        <shaderMaterial
          ref={terrainRef}
          vertexShader={terrainVertexShader}
          fragmentShader={terrainFragmentShader}
          uniforms={terrainUniforms}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Multi-Layer Temperature-Accurate Depth Strata (Rendered back-to-front inside water) */}
      {showWaterSurface && DEPTH_STRATA.map((stratum, idx) => (
        <mesh scale={[1, 1, 1]} key={stratum.id} renderOrder={5 + (3 - idx)}>
          <sphereGeometry args={[1.5, 256, 128]} />
          <shaderMaterial
            ref={el => (depthStrataRefs.current[idx] = el)}
            vertexShader={depthLayerVertexShader}
            fragmentShader={depthLayerFragmentShader}
            uniforms={depthStrataUniformsList[idx]}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* 3. Transparent Water Surface Mesh (Rendered on top of depth strata) */}
      {showWaterSurface && (
        <mesh scale={[1, 1, 1]} renderOrder={10} visible={isWaterTransparent}>
          <sphereGeometry args={[1.5, 256, 128]} />
          <shaderMaterial
            ref={waterRef}
            vertexShader={waterVertexShader}
            fragmentShader={waterFragmentShader}
            uniforms={waterUniforms}
            transparent={true}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 3b. OPAQUE Realistic Water Surface — shown when Water Transparent is OFF */}
      {showWaterSurface && !isWaterTransparent && (
        <mesh scale={[1, 1, 1]} renderOrder={11}>
          <sphereGeometry args={[1.5, 256, 128]} />
          <shaderMaterial
            ref={opaqueWaterRef}
            vertexShader={opaqueWaterVertexShader}
            fragmentShader={opaqueWaterFragmentShader}
            uniforms={opaqueWaterUniforms}
            transparent={false}
            depthWrite={true}
            side={THREE.FrontSide}
          />
        </mesh>
      )}

      {/* 4. Volumetric Perimeter Side Skirt (Fills the side void in Flat View) */}
      <mesh geometry={skirtGeometry}>
        <shaderMaterial
          ref={skirtRef}
          vertexShader={skirtVertexShader}
          fragmentShader={skirtFragmentShader}
          uniforms={skirtUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 5. Solid Continental Crust Base Plate (Gives 3D Tectonic Thickness) */}
      <mesh geometry={crustGeometry} rotation={[0, 0, 0]}>
        <shaderMaterial
          ref={crustRef}
          vertexShader={crustVertexShader}
          fragmentShader={crustFragmentShader}
          uniforms={crustUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

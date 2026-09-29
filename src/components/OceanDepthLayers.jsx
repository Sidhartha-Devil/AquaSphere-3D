import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useOceanStore from '../store/oceanStore'
import { DEPTH_LEVELS, COLOR_PALETTES, VARIABLE_RANGES } from '../data/mockOceanData'

// Temperature profile decreasing with depth
function getValueAtDepth(depthIndex, variable) {
  const vals = {
    temperature: [29, 27, 24, 19, 13, 8, 4, 3, 2],
    salinity:    [35.1, 35.4, 35.6, 35.8, 35.5, 35.2, 34.9, 34.8, 34.7],
    current:     [0.9, 0.7, 0.5, 0.35, 0.2, 0.1, 0.05, 0.02, 0.01],
  }
  return vals[variable]?.[depthIndex] ?? 0
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

function valueToColor(value, variable, palette) {
  const range = VARIABLE_RANGES[variable]
  const colors = COLOR_PALETTES[palette]
  const t = Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)))
  const idx = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 2)
  const frac = t * (colors.length - 1) - idx
  const c1 = hexToRgb(colors[idx])
  const c2 = hexToRgb(colors[idx + 1])
  return [
    c1[0] + (c2[0] - c1[0]) * frac,
    c1[1] + (c2[1] - c1[1]) * frac,
    c1[2] + (c2[2] - c1[2]) * frac,
  ]
}

const slabVertexShader = `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vNormal = normalMatrix * normal;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const slabFragmentShader = `
  uniform vec3 u_color;
  uniform float u_opacity;
  uniform float u_emissiveInt;
  
  // Clipping
  uniform float u_clippingEnabled;
  uniform float u_clippingAxis;
  uniform float u_clippingOffset;
  uniform float u_clippingDirection;
  
  // Isosurface
  uniform float u_isosurfaceEnabled;
  uniform float u_isosurfaceValue;
  uniform float u_isosurfaceTolerance;
  uniform float u_dataValue;

  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    // 1. Clipping plane logic
    if (u_clippingEnabled > 0.5) {
      float val = vWorldPos.y;
      if (u_clippingAxis < 0.5) val = vWorldPos.x;
      else if (u_clippingAxis > 1.5) val = vWorldPos.z;
      
      if ((val - u_clippingOffset) * u_clippingDirection > 0.0) discard;
    }
    
    // 2. Isosurface logic
    if (u_isosurfaceEnabled > 0.5) {
      if (abs(u_dataValue - u_isosurfaceValue) > u_isosurfaceTolerance) discard;
    }

    // Basic lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
    float diff = max(dot(normalize(vNormal), lightDir), 0.0);
    float ambient = 0.4;
    
    vec3 baseCol = u_color * (diff * 0.6 + ambient);
    vec3 emissive = u_color * u_emissiveInt * 0.5;
    
    gl_FragColor = vec4(baseCol + emissive, u_opacity);
  }
`;

export default function OceanDepthLayers() {
  const groupRef = useRef()
  const morphProgress = useOceanStore(s => s.morphProgress)
  const selectedVariable = useOceanStore(s => s.selectedVariable)
  const opacity = useOceanStore(s => s.opacity)
  const verticalExaggeration = useOceanStore(s => s.verticalExaggeration)
  const colorPalette = useOceanStore(s => s.colorPalette)
  const activeDepthIndex = useOceanStore(s => s.activeDepthIndex)
  const setActiveDepthIndex = useOceanStore(s => s.setActiveDepthIndex)
  
  const clippingEnabled = useOceanStore(s => s.clippingEnabled)
  const clippingAxis = useOceanStore(s => s.clippingAxis)
  const clippingOffset = useOceanStore(s => s.clippingOffset)
  const clippingDirection = useOceanStore(s => s.clippingDirection)
  const isosurfaceEnabled = useOceanStore(s => s.isosurfaceEnabled)
  const isosurfaceValue = useOceanStore(s => s.isosurfaceValue)
  const isosurfaceTolerance = useOceanStore(s => s.isosurfaceTolerance)

  const MAX_DEPTH = 5000
  const SLAB_THICKNESS = 0.04

  // Update uniforms smoothly or per-frame
  useFrame(() => {
    if (groupRef.current) {
      const targetOpacity = morphProgress * opacity * 0.85
      const clipAxisVal = clippingAxis === 'X' ? 0.0 : (clippingAxis === 'Y' ? 1.0 : 2.0)
      
      groupRef.current.children.forEach(child => {
        const mat = child.material
        mat.uniforms.u_opacity.value = THREE.MathUtils.lerp(mat.uniforms.u_opacity.value, targetOpacity, 0.1)
        
        // Sync volume uniforms
        mat.uniforms.u_clippingEnabled.value = clippingEnabled ? 1.0 : 0.0
        mat.uniforms.u_clippingAxis.value = clipAxisVal
        mat.uniforms.u_clippingOffset.value = clippingOffset
        mat.uniforms.u_clippingDirection.value = clippingDirection
        
        mat.uniforms.u_isosurfaceEnabled.value = isosurfaceEnabled ? 1.0 : 0.0
        mat.uniforms.u_isosurfaceValue.value = isosurfaceValue
        mat.uniforms.u_isosurfaceTolerance.value = isosurfaceTolerance
      })
    }
  })

  const slabs = useMemo(() => {
    return DEPTH_LEVELS.map((depth, i) => {
      const value = getValueAtDepth(i, selectedVariable)
      const [r, g, b] = valueToColor(value, selectedVariable, colorPalette)
      const yOffset = -(depth / MAX_DEPTH) * verticalExaggeration * 2.0
      return { depth, i, value, r, g, b, yOffset }
    })
  }, [selectedVariable, colorPalette, verticalExaggeration])

  return (
    <group ref={groupRef} position={[0, 0.05, 0.01]}>
      {slabs.map(({ depth, i, value, r, g, b, yOffset }) => {
        const isActive = activeDepthIndex === i
        return (
          <mesh
            key={depth}
            position={[0, yOffset, 0]}
            onClick={() => setActiveDepthIndex(isActive ? null : i)}
          >
            <boxGeometry args={[10.05, SLAB_THICKNESS, 0.01]} />
            <shaderMaterial
              vertexShader={slabVertexShader}
              fragmentShader={slabFragmentShader}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              uniforms={{
                u_color: { value: new THREE.Color(r, g, b) },
                u_opacity: { value: 0 },
                u_emissiveInt: { value: isActive ? 2 : 0.5 },
                u_dataValue: { value },
                
                u_clippingEnabled: { value: 0 },
                u_clippingAxis: { value: 1.0 },
                u_clippingOffset: { value: 0.0 },
                u_clippingDirection: { value: 1.0 },
                u_isosurfaceEnabled: { value: 0 },
                u_isosurfaceValue: { value: 15.0 },
                u_isosurfaceTolerance: { value: 1.5 },
              }}
            />
          </mesh>
        )
      })}
    </group>
  )
}

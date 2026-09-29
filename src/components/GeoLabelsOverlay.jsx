// src/components/GeoLabelsOverlay.jsx
// Globe-projected geographic labels using @react-three/drei Html component.
// Labels are rendered as HTML but positioned in 3D world space on the globe surface.
// They naturally rotate with the globe, appear only when facing the camera (occluded
// behind the sphere), and are zoom-level aware.
import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useOceanStore from '../store/oceanStore'
import './GeoLabelsOverlay.css'

// ── Geographic Data — exact real-world coordinates ────────────────────────────
// tier: 1=always visible, 2=medium zoom, 3=close, 4=very close
const GEO_LOCATIONS = [
  // MAJOR OCEANS
  { id: 'pacific',      name: 'Pacific Ocean',    lat:   0.0, lon: -160.0, tier: 1, type: 'ocean'    },
  { id: 'atlantic',     name: 'Atlantic Ocean',   lat:   5.0, lon:  -30.0, tier: 1, type: 'ocean'    },
  { id: 'indian',       name: 'Indian Ocean',     lat: -20.0, lon:   80.0, tier: 1, type: 'ocean'    },
  { id: 'southern',     name: 'Southern Ocean',   lat: -60.0, lon:    0.0, tier: 1, type: 'ocean'    },
  { id: 'arctic',       name: 'Arctic Ocean',     lat:  82.0, lon:    0.0, tier: 1, type: 'ocean'    },

  // CONTINENTS
  { id: 'africa',       name: 'Africa',           lat:   5.0, lon:   20.0, tier: 1, type: 'continent'},
  { id: 'europe',       name: 'Europe',           lat:  50.0, lon:   15.0, tier: 1, type: 'continent'},
  { id: 'asia',         name: 'Asia',             lat:  45.0, lon:   90.0, tier: 1, type: 'continent'},
  { id: 'namerica',     name: 'North America',    lat:  45.0, lon:  -95.0, tier: 1, type: 'continent'},
  { id: 'samerica',     name: 'South America',    lat: -15.0, lon:  -58.0, tier: 1, type: 'continent'},
  { id: 'australia',    name: 'Australia',        lat: -25.0, lon:  134.0, tier: 1, type: 'continent'},
  { id: 'antarctica',   name: 'Antarctica',       lat: -78.0, lon:    0.0, tier: 1, type: 'continent'},

  // MAJOR SEAS & GULFS
  { id: 'mediterranean',name: 'Mediterranean Sea',lat:  35.0, lon:   18.0, tier: 2, type: 'sea'     },
  { id: 'caribbean',    name: 'Caribbean Sea',    lat:  15.0, lon:  -75.0, tier: 2, type: 'sea'     },
  { id: 'south_china',  name: 'South China Sea',  lat:  12.0, lon:  115.0, tier: 2, type: 'sea'     },
  { id: 'bering',       name: 'Bering Sea',       lat:  58.0, lon: -175.0, tier: 2, type: 'sea'     },
  { id: 'red_sea',      name: 'Red Sea',          lat:  20.0, lon:   38.0, tier: 2, type: 'sea'     },
  { id: 'arabian',      name: 'Arabian Sea',      lat:  15.0, lon:   65.0, tier: 2, type: 'sea'     },
  { id: 'bay_bengal',   name: 'Bay of Bengal',    lat:  15.0, lon:   88.0, tier: 2, type: 'sea'     },
  { id: 'north_sea',    name: 'North Sea',        lat:  56.0, lon:    3.0, tier: 2, type: 'sea'     },
  { id: 'black_sea',    name: 'Black Sea',        lat:  43.0, lon:   35.0, tier: 2, type: 'sea'     },
  { id: 'gulf_mexico',  name: 'Gulf of Mexico',   lat:  25.0, lon:  -90.0, tier: 2, type: 'sea'     },
  { id: 'persian_gulf', name: 'Persian Gulf',     lat:  27.0, lon:   51.0, tier: 2, type: 'sea'     },
  { id: 'japan_sea',    name: 'Sea of Japan',     lat:  40.0, lon:  135.0, tier: 2, type: 'sea'     },
  { id: 'okhotsk',      name: 'Sea of Okhotsk',   lat:  55.0, lon:  148.0, tier: 2, type: 'sea'     },
  { id: 'coral_sea',    name: 'Coral Sea',        lat: -18.0, lon:  154.0, tier: 2, type: 'sea'     },
  { id: 'tasman',       name: 'Tasman Sea',       lat: -38.0, lon:  160.0, tier: 2, type: 'sea'     },
  { id: 'ross_sea',     name: 'Ross Sea',         lat: -74.0, lon: -175.0, tier: 2, type: 'sea'     },
  { id: 'weddell',      name: 'Weddell Sea',      lat: -72.0, lon:  -45.0, tier: 2, type: 'sea'     },
  { id: 'sargasso',     name: 'Sargasso Sea',     lat:  27.0, lon:  -65.0, tier: 2, type: 'sea'     },
  { id: 'andaman',      name: 'Andaman Sea',      lat:  11.0, lon:   96.0, tier: 2, type: 'sea'     },
  { id: 'hudson_bay',   name: 'Hudson Bay',       lat:  60.0, lon:  -85.0, tier: 2, type: 'sea'     },
  { id: 'java_sea',     name: 'Java Sea',         lat:  -5.0, lon:  111.0, tier: 2, type: 'sea'     },
  { id: 'timor_sea',    name: 'Timor Sea',        lat: -11.0, lon:  127.0, tier: 2, type: 'sea'     },
  { id: 'north_pole',   name: 'North Pole',       lat:  90.0, lon:    0.0, tier: 2, type: 'pole',    icon: '✦' },
  { id: 'south_pole',   name: 'South Pole',       lat: -90.0, lon:    0.0, tier: 2, type: 'pole',    icon: '✦' },

  // TRENCHES — with depth info
  { id: 'mariana',      name: 'Mariana Trench',   lat:  11.35,lon:  142.2, tier: 3, type: 'trench',  icon: '▼', sub: '11,034m · Deepest on Earth' },
  { id: 'tonga',        name: 'Tonga Trench',     lat: -23.0, lon: -174.0, tier: 3, type: 'trench',  icon: '▼', sub: '10,882m' },
  { id: 'philippine',   name: 'Philippine Trench',lat:   9.5, lon:  126.6, tier: 3, type: 'trench',  icon: '▼', sub: '10,540m' },
  { id: 'kermadec',     name: 'Kermadec Trench',  lat: -32.0, lon: -177.0, tier: 3, type: 'trench',  icon: '▼', sub: '10,047m' },
  { id: 'puerto_rico',  name: 'Puerto Rico Trench',lat: 19.75,lon:  -66.5, tier: 3, type: 'trench',  icon: '▼', sub: '8,376m · Deepest Atlantic' },
  { id: 'java_trench',  name: 'Java Trench',      lat: -10.0, lon:  113.0, tier: 3, type: 'trench',  icon: '▼', sub: '7,290m' },
  { id: 'south_sandwich',name:'S. Sandwich Trench',lat:-55.5, lon:  -27.0, tier: 3, type: 'trench',  icon: '▼', sub: '8,428m' },
  { id: 'peru_chile',   name: 'Peru-Chile Trench',lat: -23.0, lon:  -71.0, tier: 3, type: 'trench',  icon: '▼', sub: '8,065m' },
  { id: 'aleutian',     name: 'Aleutian Trench',  lat:  51.0, lon: -175.0, tier: 3, type: 'trench',  icon: '▼', sub: '7,679m' },
  { id: 'japan_trench', name: 'Japan Trench',     lat:  37.0, lon:  143.5, tier: 3, type: 'trench',  icon: '▼', sub: '9,000m' },
  { id: 'kuril',        name: 'Kuril-Kamchatka',  lat:  45.0, lon:  153.0, tier: 3, type: 'trench',  icon: '▼', sub: '10,500m' },
  { id: 'izu_bonin',    name: 'Izu-Bonin Trench', lat:  28.0, lon:  142.5, tier: 3, type: 'trench',  icon: '▼', sub: '9,810m' },

  // MID-OCEAN RIDGES
  { id: 'mid_atlantic', name: 'Mid-Atlantic Ridge',lat:   0.0, lon: -25.0, tier: 3, type: 'ridge',   icon: '△' },
  { id: 'east_pac_rise',name: 'East Pacific Rise', lat: -20.0, lon:-110.0, tier: 3, type: 'ridge',   icon: '△' },
  { id: 'ind_ridge',    name: 'Central Indian Ridge',lat:-25.0,lon:  70.0, tier: 3, type: 'ridge',   icon: '△' },
  { id: 'se_ind_ridge', name: 'SE Indian Ridge',   lat: -47.0, lon:  88.0, tier: 3, type: 'ridge',   icon: '△' },
  { id: 'sw_ind_ridge', name: 'SW Indian Ridge',   lat: -45.0, lon:  20.0, tier: 3, type: 'ridge',   icon: '△' },

  // OCEAN CURRENTS
  { id: 'gulf_stream',  name: 'Gulf Stream',       lat:  35.0, lon:  -70.0, tier: 3, type: 'current', icon: '≋' },
  { id: 'kuroshio',     name: 'Kuroshio Current',  lat:  30.0, lon:  145.0, tier: 3, type: 'current', icon: '≋' },
  { id: 'circumpolar',  name: 'Antarctic Circumpolar Current', lat:-55.0,lon:0.0, tier:3, type:'current', icon:'≋' },
  { id: 'benguela',     name: 'Benguela Current',  lat: -25.0, lon:   14.0, tier: 3, type: 'current', icon: '≋' },
  { id: 'humboldt',     name: 'Humboldt Current',  lat: -20.0, lon:  -78.0, tier: 3, type: 'current', icon: '≋' },
  { id: 'agulhas',      name: 'Agulhas Current',   lat: -35.0, lon:   28.0, tier: 3, type: 'current', icon: '≋' },

  // NOTABLE ISLANDS & ARCHIPELAGOS
  { id: 'hawaii',       name: 'Hawaiian Islands',  lat:  20.5, lon: -157.0, tier: 3, type: 'island',  icon: '◉' },
  { id: 'galapagos',    name: 'Galápagos Islands', lat:  -0.9, lon:  -91.0, tier: 3, type: 'island',  icon: '◉' },
  { id: 'maldives',     name: 'Maldives',          lat:   3.2, lon:   73.2, tier: 3, type: 'island',  icon: '◉' },
  { id: 'bermuda',      name: 'Bermuda',           lat:  32.3, lon:  -64.8, tier: 3, type: 'island',  icon: '◉' },
  { id: 'easter_island',name: 'Easter Island',     lat: -27.1, lon: -109.4, tier: 3, type: 'island',  icon: '◉' },
  { id: 'greenland',    name: 'Greenland',         lat:  72.0, lon:  -42.0, tier: 3, type: 'island',  icon: '◉' },
  { id: 'iceland',      name: 'Iceland',           lat:  65.0, lon:  -19.0, tier: 3, type: 'island',  icon: '◉' },
  { id: 'madagascar',   name: 'Madagascar',        lat: -20.0, lon:   47.0, tier: 3, type: 'island',  icon: '◉' },
  { id: 'azores',       name: 'Azores',            lat:  38.7, lon:  -27.2, tier: 3, type: 'island',  icon: '◉' },
  { id: 'canary',       name: 'Canary Islands',    lat:  28.1, lon:  -15.6, tier: 3, type: 'island',  icon: '◉' },

  // SPECIAL LOCATIONS
  { id: 'point_nemo',   name: 'Point Nemo',        lat: -48.9, lon: -123.4, tier: 4, type: 'special', icon: '✦', sub: 'Oceanic Pole of Inaccessibility' },
  { id: 'bermuda_tri',  name: 'Bermuda Triangle',  lat:  27.0, lon:  -70.0, tier: 4, type: 'special', icon: '△', sub: 'Mystery Zone' },
  { id: 'great_barrier',name: 'Great Barrier Reef',lat: -18.0, lon:  147.0, tier: 4, type: 'special', icon: '🪸', sub: 'Largest Coral Reef' },
  { id: 'challenger',   name: 'Challenger Deep',   lat:  11.37,lon:  142.6, tier: 4, type: 'trench',  icon: '▼', sub: '10,935m surveyed' },

  // STRAITS
  { id: 'drake',        name: 'Drake Passage',     lat: -57.0, lon:  -68.0, tier: 4, type: 'strait',  icon: '⌇' },
  { id: 'malacca',      name: 'Strait of Malacca', lat:   3.0, lon:  100.0, tier: 4, type: 'strait',  icon: '⌇' },
  { id: 'hormuz',       name: 'Strait of Hormuz',  lat:  26.6, lon:   56.5, tier: 4, type: 'strait',  icon: '⌇' },
  { id: 'gibraltar',    name: 'Strait of Gibraltar',lat: 35.9, lon:   -5.7, tier: 4, type: 'strait',  icon: '⌇' },
]

// Color per type
const TYPE_STYLE = {
  ocean:     { color: '#78dcff', glow: 'rgba(0,160,255,0.55)',   size: 'large'  },
  continent: { color: '#ffd980', glow: 'rgba(200,150,40,0.55)',  size: 'large'  },
  sea:       { color: '#64c8f0', glow: 'rgba(0,120,200,0.45)',   size: 'medium' },
  trench:    { color: '#c88cff', glow: 'rgba(140,60,240,0.60)',  size: 'medium' },
  ridge:     { color: '#ffb450', glow: 'rgba(200,120,0,0.50)',   size: 'small'  },
  current:   { color: '#50ffc8', glow: 'rgba(0,180,120,0.45)',   size: 'small'  },
  island:    { color: '#ffd264', glow: 'rgba(200,140,0,0.40)',   size: 'small'  },
  basin:     { color: '#50b4e6', glow: 'rgba(0,100,180,0.35)',   size: 'small'  },
  strait:    { color: '#ff8c3c', glow: 'rgba(200,80,0,0.45)',    size: 'small'  },
  pole:      { color: '#c8f0ff', glow: 'rgba(100,180,255,0.55)', size: 'small'  },
  special:   { color: '#ff64b4', glow: 'rgba(200,50,130,0.55)',  size: 'small'  },
}

// Convert lat/lon to 3D world position on unit sphere
function latLonToVec3(lat, lon, r = 1.02) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  )
}

// Camera distance threshold per tier — higher number = shows at larger distances
function tierDistLimit(tier) {
  switch (tier) {
    case 1: return 40  // always visible
    case 2: return 8
    case 3: return 4.5
    case 4: return 2.8
    default: return 40
  }
}

// Single label rendered at a 3D world position
function GeoLabel({ loc }) {
  const { camera } = useThree()
  const pos = useMemo(() => latLonToVec3(loc.lat, loc.lon), [loc])
  const style = TYPE_STYLE[loc.type] || TYPE_STYLE.ocean

  // In flat map mode, don't use 3D Html (it won't map correctly onto flat plane)
  const morphProgress = useOceanStore(s => s.morphProgress)
  if (morphProgress > 0.5) return null

  const distLimit = tierDistLimit(loc.tier)

  return (
    <Html
      position={pos}
      center
      // occlude — hide when behind other 3D objects (the globe)
      occlude={false}
      distanceFactor={distLimit * 0.4}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      zIndexRange={[1, 10]}
    >
      <div
        className={`geo-label geo-label--${loc.type} geo-label--${style.size} geo-label--tier${loc.tier}`}
        style={{ color: style.color, '--glow-color': style.glow }}
      >
        <span className="geo-label__name">
          {loc.icon && <span className="geo-label__icon">{loc.icon}</span>}
          {loc.name}
        </span>
        {loc.sub && <span className="geo-label__sub">{loc.sub}</span>}
      </div>
    </Html>
  )
}

// ── R3F Bridge — renders all labels inside the Canvas ────────────────────────
export function GeoLabelsR3FBridge() {
  const showLocations = useOceanStore(s => s.showLocations ?? false)
  const morphProgress = useOceanStore(s => s.morphProgress)
  const { camera }    = useThree()

  if (!showLocations) return null

  // In flat mode, don't render (the Html projection doesn't work on the flat plane)
  if (morphProgress > 0.5) return null

  return (
    <>
      {GEO_LOCATIONS.map(loc => (
        <GeoLabelOccluded key={loc.id} loc={loc} camera={camera} />
      ))}
    </>
  )
}

// Wrapper that handles occlusion check per-frame using camera dot product
function GeoLabelOccluded({ loc, camera }) {
  const pos = useMemo(() => latLonToVec3(loc.lat, loc.lon), [loc])
  const style = TYPE_STYLE[loc.type] || TYPE_STYLE.ocean

  return (
    <Html
      position={pos}
      center
      distanceFactor={8}
      style={{ pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}
      zIndexRange={[1, 10]}
      // Use occlude prop so drei hides labels behind the sphere mesh
      occlude="raycast"
    >
      <GeoLabelElement loc={loc} style={style} camera={camera} pos={pos} />
    </Html>
  )
}

function GeoLabelElement({ loc, style, camera, pos }) {
  const { camera: liveCamera } = useThree()

  // Compute visibility based on camera-dot-normal (front face test)
  const camNorm = liveCamera.position.clone().normalize()
  const dot = pos.clone().normalize().dot(camNorm)

  // Hide if on the back side of the globe (dot < threshold)
  // Tier 1 labels visible at wider angle (dot > 0.05), others tighter
  const minDot = loc.tier === 1 ? 0.05 : 0.15
  if (dot < minDot) return null

  // Zoom-distance culling
  const camDist = liveCamera.position.length()
  if (camDist > tierDistLimit(loc.tier)) return null

  return (
    <div
      className={`geo-label geo-label--${loc.type} geo-label--${style.size} geo-label--tier${loc.tier}`}
      style={{ color: style.color, '--glow-color': style.glow }}
    >
      <span className="geo-label__name">
        {loc.icon && <span className="geo-label__icon">{loc.icon}</span>}
        {loc.name}
      </span>
      {loc.sub && <span className="geo-label__sub">{loc.sub}</span>}
    </div>
  )
}

// ── Flat map overlay — only shown when flat mode is active ────────────────────
export function GeoLabelsFlatOverlay() {
  const showLocations = useOceanStore(s => s.showLocations ?? false)
  const morphProgress = useOceanStore(s => s.morphProgress)

  if (!showLocations || morphProgress < 0.5) return null

  return (
    <div className="geo-labels-flat-container" aria-hidden="true">
      {GEO_LOCATIONS.map(loc => {
        const style = TYPE_STYLE[loc.type] || TYPE_STYLE.ocean
        const u = ((loc.lon + 180) / 360) * 100
        const v = ((90 - loc.lat) / 180) * 100
        if (u < 0 || u > 100 || v < 0 || v > 100) return null
        return (
          <div
            key={loc.id}
            className={`geo-label geo-label--${loc.type} geo-label--${style.size} geo-label--tier${loc.tier}`}
            style={{
              position: 'absolute',
              left: `${u}%`,
              top: `${v}%`,
              transform: 'translate(-50%, -50%)',
              color: style.color,
              '--glow-color': style.glow,
              pointerEvents: 'none',
            }}
          >
            <span className="geo-label__name">
              {loc.icon && <span className="geo-label__icon">{loc.icon}</span>}
              {loc.name}
            </span>
            {loc.sub && <span className="geo-label__sub">{loc.sub}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── Default export — placeholder (not used directly, labels go via R3F) ──────
export default function GeoLabelsOverlay() {
  return null
}

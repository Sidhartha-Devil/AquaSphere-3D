import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import OceanGlobe from './OceanGlobe'
import OceanBathymetry from './OceanBathymetry'
import OceanCurrentParticles from './OceanCurrentParticles'
import InstrumentMarkers from './InstrumentMarkers'
import DataDrivenCurrents from './DataDrivenCurrents'
import { GeoLabelsR3FBridge } from './GeoLabelsOverlay'

import useOceanStore from '../store/oceanStore'

function AtmosphericGlow() {
  const morphProgress = useOceanStore((s) => s.morphProgress)
  const glowRef = useRef()

  return (
    <mesh ref={glowRef} scale={[1.56, 1.56, 1.56]}>
      <sphereGeometry args={[1, 64, 32]} />
      <meshBasicMaterial
        color="#00aaff"
        transparent
        opacity={(1 - morphProgress) * 0.12}
        side={2}
        depthWrite={false}
      />
    </mesh>
  )
}

function DynamicCamera() {
  const { camera } = useThree();
  const viewMode = useOceanStore((s) => s.viewMode);
  
  useEffect(() => {
    // In flat mode we want an isometric angle to see the 3D bathymetry better
    // instead of straight top-down
    if (viewMode === 'flat') {
      // It's smoothly lerped in OceanGlobe.jsx, but let's just make sure it sets the target
      // The morphing animation handles the transition
    }
  }, [viewMode, camera]);

  return null;
}

function CameraController() {
  const { camera, controls } = useThree()
  const cameraTarget = useOceanStore(s => s.cameraTarget)
  const setCameraTarget = useOceanStore(s => s.setCameraTarget)
  
  useFrame((state, delta) => {
    if (cameraTarget && controls) {
      // Convert lat/lon to 3D Cartesian coordinates
      const lat = cameraTarget.lat
      const lon = cameraTarget.lon
      
      const phi = (90 - lat) * (Math.PI / 180)
      const theta = (lon + 180) * (Math.PI / 180)
      
      // Target position on the surface of the globe
      const surfacePos = new THREE.Vector3(
        -Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      )
      
      // Move camera to look at the point from a slight distance
      const camPos = surfacePos.clone().multiplyScalar(2.0)
      
      camera.position.lerp(camPos, delta * 3.0)
      controls.target.lerp(surfacePos, delta * 3.0)
      
      // Stop flying once we get close enough
      if (camera.position.distanceTo(camPos) < 0.05) {
        setCameraTarget(null)
      }
    }
  })
  return null
}

export default function OceanScene() {
  const showBathymetry = useOceanStore(s => s.showBathymetry);

  return (
    <div className="canvas-wrapper">
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ position: [0, 0.6, 3.9], fov: 45, near: 0.05, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <CameraController />
        <DynamicCamera />
        <color attach="background" args={['#020a14']} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={1.5} />
        <hemisphereLight skyColor="#ffffff" groundColor="#004466" intensity={1.0} />
        <directionalLight position={[5, 10, 5]} intensity={2.0} color="#ffffff" castShadow />
        <directionalLight position={[-5, 2, -3]} intensity={1.5} color="#e0f7ff" />
        <directionalLight position={[0, 0, -10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[0, 5, 2]} intensity={1.0} color="#00d4ff" />

        <Suspense fallback={null}>
          {/* Main Morphing Globe/Map */}
          <OceanGlobe />
          {/* Real Earth Ocean Current Particles (built-in) */}
          <OceanCurrentParticles />
          {/* Dataset-driven flowing streak currents */}
          <DataDrivenCurrents />
          {/* Instrument markers (Argo, Gliders, CTD, BGC) */}
          <InstrumentMarkers />
          {/* Geo location labels projected from 3D → 2D */}
          <GeoLabelsR3FBridge />
        </Suspense>

        {/* Camera Orbit Controls - Free, completely unrestricted smooth movement */}
        <OrbitControls
          makeDefault
          enableDamping={true}
          dampingFactor={0.06}
          rotateSpeed={0.85}
          zoomSpeed={1.25}
          minDistance={1.62}
          maxDistance={40}
          enablePan={true}
          panSpeed={1.0}
          screenSpacePanning={true}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
        />
      </Canvas>
    </div>
  )
}


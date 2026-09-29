import { useState, useRef, useEffect } from 'react'
import useOceanStore from '../store/oceanStore'

export default function SlicerOverlay() {
  const isSlicingMode = useOceanStore(s => s.isSlicingMode)
  const setSliceBounds = useOceanStore(s => s.setSliceBounds)
  const setIsSlicingMode = useOceanStore(s => s.setIsSlicingMode)
  
  const [startPoint, setStartPoint] = useState(null)
  const [currentPoint, setCurrentPoint] = useState(null)
  
  const containerRef = useRef(null)

  // Escape to cancel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSlicingMode) {
        setIsSlicingMode(false)
        setStartPoint(null)
        setCurrentPoint(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSlicingMode, setIsSlicingMode])

  if (!isSlicingMode) return null

  const handlePointerDown = (e) => {
    setStartPoint({ x: e.clientX, y: e.clientY })
    setCurrentPoint({ x: e.clientX, y: e.clientY })
  }

  const handlePointerMove = (e) => {
    if (startPoint) {
      setCurrentPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handlePointerUp = () => {
    if (startPoint && currentPoint) {
      // Convert screen coordinates to UV coordinates (assuming the flat map fits the screen roughly, this is an approximation)
      // For a robust implementation, we should use raycasting to find the exact UV on the mesh, but for a 2D overlay on a centered flat map, 
      // we approximate screen percentages.
      
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Calculate min/max screen coords
      const minX_screen = Math.min(startPoint.x, currentPoint.x)
      const maxX_screen = Math.max(startPoint.x, currentPoint.x)
      const minY_screen = Math.min(startPoint.y, currentPoint.y)
      const maxY_screen = Math.max(startPoint.y, currentPoint.y)
      
      // Basic Screen to UV mapping (Assuming flat map is centered and spans approx 80% of width)
      // The flat map spans X: [-1.6*PI, 1.6*PI] roughly. 
      // Actually, since the 3D scene handles the camera, screen coords won't perfectly map to UV without raycasting.
      // For this overlay, we'll map screen % directly to UV [0,1] as a rough intuitive slicer.
      // Left = 0, Right = 1. Top = 1, Bottom = 0.
      
      const uMin = minX_screen / width;
      const uMax = maxX_screen / width;
      const vMin = 1.0 - (maxY_screen / height);
      const vMax = 1.0 - (minY_screen / height);
      
      // Ensure we actually drew a box and not just a click
      if (Math.abs(uMax - uMin) > 0.02 && Math.abs(vMax - vMin) > 0.02) {
          setSliceBounds({ minX: uMin, maxX: uMax, minY: vMin, maxY: vMax });
      } else {
          setIsSlicingMode(false); // Just cancel if it was a tiny click
      }
    }
    
    setStartPoint(null)
    setCurrentPoint(null)
  }

  // Calculate box styles
  let boxStyle = {}
  if (startPoint && currentPoint) {
    const minX = Math.min(startPoint.x, currentPoint.x)
    const maxX = Math.max(startPoint.x, currentPoint.x)
    const minY = Math.min(startPoint.y, currentPoint.y)
    const maxY = Math.max(startPoint.y, currentPoint.y)
    
    boxStyle = {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        cursor: 'crosshair',
        backgroundColor: 'rgba(0, 20, 40, 0.3)'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', padding: '10px 20px', borderRadius: '8px', color: '#fff',
          border: '1px solid #00d4ff', pointerEvents: 'none'
      }}>
          Click and drag to slice a region. Press ESC to cancel.
      </div>
      
      {startPoint && currentPoint && (
        <div style={{
          position: 'absolute',
          border: '2px dashed #00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          ...boxStyle
        }} />
      )}
    </div>
  )
}

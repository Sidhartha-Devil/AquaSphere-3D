// src/components/OceanTimeline.jsx
// Video-like timeline player for ocean data
// - Play / Pause
// - Step forward / Step backward
// - Fast-forward / Rewind (hold)
// - Scrubber drag
// - Speed control
// When playing forward → particles move forward through data
// When playing backward → particles move backward through data

import { useEffect, useRef, useCallback } from 'react'
import useOceanStore from '../store/oceanStore'
import './OceanTimeline.css'

const STEP_INTERVAL_MS = 1200  // ms per auto time-step when playing

export default function OceanTimeline() {
  const isPlaying         = useOceanStore(s => s.isPlaying)
  const currentTimeStep   = useOceanStore(s => s.currentTimeStep)
  const totalTimeSteps    = useOceanStore(s => s.totalTimeSteps)
  const playbackDirection = useOceanStore(s => s.playbackDirection)
  const timeScale         = useOceanStore(s => s.timeScale)
  const flowData          = useOceanStore(s => s.flowData)

  const setIsPlaying         = useOceanStore(s => s.setIsPlaying)
  const setCurrentTimeStep   = useOceanStore(s => s.setCurrentTimeStep)
  const setPlaybackDirection = useOceanStore(s => s.setPlaybackDirection)
  const setTimeScale         = useOceanStore(s => s.setTimeScale)

  const timerRef = useRef(null)
  const hasData  = !!(flowData?.uData)

  // Auto-advance time step when playing
  const tick = useCallback(() => {
    setCurrentTimeStep(prev => {
      const next = prev + playbackDirection
      if (next >= totalTimeSteps) {
        setIsPlaying(false)
        return totalTimeSteps - 1
      }
      if (next < 0) {
        setIsPlaying(false)
        return 0
      }
      return next
    })
  }, [playbackDirection, totalTimeSteps, setCurrentTimeStep, setIsPlaying])

  useEffect(() => {
    clearInterval(timerRef.current)
    if (isPlaying) {
      timerRef.current = setInterval(tick, STEP_INTERVAL_MS / timeScale)
    }
    return () => clearInterval(timerRef.current)
  }, [isPlaying, tick, timeScale])

  const handlePlayPause = () => {
    // If at the end in the current direction, restart
    if (!isPlaying) {
      if (playbackDirection > 0 && currentTimeStep >= totalTimeSteps - 1) {
        setCurrentTimeStep(0)
      }
      if (playbackDirection < 0 && currentTimeStep <= 0) {
        setCurrentTimeStep(totalTimeSteps - 1)
      }
    }
    setIsPlaying(!isPlaying)
  }

  const handleRewind = () => {
    setIsPlaying(false)
    setPlaybackDirection(-1)
    setCurrentTimeStep(Math.max(0, currentTimeStep - 1))
  }

  const handleFastRewind = () => {
    setIsPlaying(false)
    setPlaybackDirection(-1)
    setIsPlaying(true)
  }

  const handleFastForward = () => {
    setIsPlaying(false)
    setPlaybackDirection(1)
    setIsPlaying(true)
  }

  const handleStepForward = () => {
    setIsPlaying(false)
    setPlaybackDirection(1)
    setCurrentTimeStep(Math.min(totalTimeSteps - 1, currentTimeStep + 1))
  }

  const handleScrub = (e) => {
    const val = parseInt(e.target.value, 10)
    setIsPlaying(false)
    setCurrentTimeStep(val)
  }

  const progressPct = totalTimeSteps > 1
    ? (currentTimeStep / (totalTimeSteps - 1)) * 100
    : 0

  // Build time labels — use timestamps if available, otherwise "Step N"
  const timeLabel = hasData && flowData.timestamps
    ? (flowData.timestamps[currentTimeStep] || `T${currentTimeStep}`)
    : `Step ${currentTimeStep + 1} / ${totalTimeSteps}`
  const userDataset = useOceanStore(s => s.userDataset)

  // Hide timeline completely if no data is loaded
  if (!userDataset) return null

  return (
    <div className="timeline-bar">

      {/* Left controls: rewind, step-back, play, step-forward, fast-forward */}
      <div className="tl-controls">
        {/* Fast Rewind */}
        <button
          className={`tl-btn ${isPlaying && playbackDirection < 0 ? 'active' : ''}`}
          onClick={handleFastRewind}
          title="Play Backward"
        >⏮</button>

        {/* Step Back */}
        <button
          className="tl-btn"
          onClick={handleRewind}
          title="Step Back"
          disabled={currentTimeStep <= 0}
        >⏪</button>

        {/* Play / Pause */}
        <button
          className={`tl-btn play ${isPlaying ? 'active' : ''}`}
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : (playbackDirection > 0 ? '▶' : '◀')}
        </button>

        {/* Step Forward */}
        <button
          className="tl-btn"
          onClick={handleStepForward}
          title="Step Forward"
          disabled={currentTimeStep >= totalTimeSteps - 1}
        >⏩</button>

        {/* Fast Forward */}
        <button
          className={`tl-btn ${isPlaying && playbackDirection > 0 ? 'active' : ''}`}
          onClick={handleFastForward}
          title="Play Forward"
        >⏭</button>
      </div>

      {/* Scrubber */}
      <div className="tl-scrubber-wrap">
        <div className="tl-track">
          <div className="tl-progress" style={{ width: `${progressPct}%` }} />
          <div className="tl-thumb" style={{ left: `${progressPct}%` }} />
          <input
            className="tl-input"
            type="range"
            min={0}
            max={totalTimeSteps - 1}
            step={1}
            value={currentTimeStep}
            onChange={handleScrub}
          />
        </div>
        <div className="tl-labels">
          <span>Start</span>
          {totalTimeSteps > 1 &&
            Array.from({ length: Math.min(totalTimeSteps, 7) }, (_, i) => (
              <span key={i}>|</span>
            ))
          }
          <span>End</span>
        </div>
      </div>

      {/* Current time label */}
      <div className="tl-time-label">
        {isPlaying && playbackDirection < 0 && '◀ '}
        {timeLabel}
        {isPlaying && playbackDirection > 0 && ' ▶'}
      </div>

      {/* Speed */}
      <div className="tl-speed-wrap">
        <span className="tl-speed-label">Speed</span>
        <input
          className="tl-speed-input"
          type="range"
          min={0.25}
          max={4}
          step={0.25}
          value={timeScale}
          onChange={e => setTimeScale(parseFloat(e.target.value))}
        />
        <span className="tl-speed-val">{timeScale}×</span>
      </div>
    </div>
  )
}

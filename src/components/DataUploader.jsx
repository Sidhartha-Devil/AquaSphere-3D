// src/components/DataUploader.jsx
// Drag-and-drop / file-picker panel that accepts NetCDF and ASCII/text files,
// parses them in the browser, and pushes resulting textures into the ocean store.

import { useRef, useState, useCallback, useEffect } from 'react'
import useOceanStore from '../store/oceanStore'
import { parseOceanFile } from '../services/fileParser'
import { fetchLiveOceanDataset } from '../services/liveOceanData'
import './DataUploader.css'

const ACCEPTED = '.nc,.nc4,.cdf,.nc3,.csv,.tsv,.txt,.dat,.asc,.ascii'

export default function DataUploader() {
  const isUploaderOpen        = useOceanStore(s => s.isUploaderOpen)
  const setIsUploaderOpen     = useOceanStore(s => s.setIsUploaderOpen)
  const [dragging, setDragging]   = useState(false)
  const [status, setStatus]       = useState(null)
  const [isLive, setIsLive]       = useState(false)
  const fileInputRef              = useRef()
  const abortRef                  = useRef(null)

  const setUserDataset         = useOceanStore(s => s.setUserDataset)
  const clearUserDataset       = useOceanStore(s => s.clearUserDataset)
  const userDataset            = useOceanStore(s => s.userDataset)
  const setShowTemperature     = useOceanStore(s => s.setShowTemperature)
  const setShowWaterDirection   = useOceanStore(s => s.setShowWaterDirection)
  const setShowCurrents        = useOceanStore(s => s.setShowCurrents)
  const setShowChlorophyll     = useOceanStore(s => s.setShowChlorophyll)

  // ── Live data auto-fetch when no dataset is loaded ─────────────────────
  const loadLiveData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setStatus({ state: 'loading', message: 'Connecting to NOAA live data…' })
    try {
      const dataset = await fetchLiveOceanDataset(abortRef.current.signal)
      if (dataset) {
        setUserDataset(dataset)
        setIsLive(true)
        const vars = dataset.meta.variablesFound || []
        if (vars.includes('sst'))                              setShowTemperature(true)
        if (vars.includes('u') || vars.includes('v'))         { setShowWaterDirection(true); setShowCurrents(true) }
        setStatus({ state: 'live', message: '🛰 Live NOAA / OSCAR data active', meta: dataset.meta })
      } else {
        setStatus({ state: 'error', message: 'Live data unavailable — NOAA API unreachable.\nUpload a CSV or NetCDF file manually.' })
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setStatus({ state: 'error', message: 'Live fetch failed: ' + e.message })
      }
    }
  }, [setUserDataset, setShowTemperature, setShowWaterDirection, setShowCurrents])

  // ── File processing ─────────────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    setStatus({ state: 'loading', message: `Reading ${file.name}…` })
    try {
      const dataset = await parseOceanFile(file)
      setUserDataset(dataset)

      // Auto-enable corresponding visualization layer so user sees simulation instantly
      const vars = dataset.meta.variablesFound || []
      if (vars.includes('sst')) setShowTemperature(true)
      if (vars.includes('u') || vars.includes('v')) {
        setShowWaterDirection(true)
        setShowCurrents(true)
      }
      if (vars.includes('chla')) setShowChlorophyll(true)

      setStatus({
        state: 'success',
        message: `✓ ${file.name} loaded & simulating`,
        meta: dataset.meta,
      })
    } catch (err) {
      setStatus({ state: 'error', message: err.message })
    }
  }, [setUserDataset, setShowTemperature, setShowWaterDirection, setShowCurrents, setShowChlorophyll])

  // ── Drop handlers ────────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleClear = () => {
    clearUserDataset()
    setStatus(null)
    setIsLive(false)
    // Re-fetch live data after clearing
    setTimeout(() => loadLiveData(), 100)
  }

  // If closed, do not render floating rogue button in 3D viewport
  if (!isUploaderOpen) return null

  // ── Modal panel with blurred backdrop ────────────────────────────────────
  return (
    <div className="du-backdrop" onClick={() => setIsUploaderOpen(false)}>
      <div className="du-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="du-panel-header">
          <div className="du-panel-title">
            <span>🌐</span> Load Ocean Dataset
          </div>
          <button className="du-panel-close" onClick={() => setIsUploaderOpen(false)}>✕</button>
        </div>

        {/* Drop zone */}
        <div
          className={`du-dropzone${dragging ? ' dragging' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          id="du-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            className="du-file-input"
            onChange={onFileChange}
          />
          <div className="du-dropzone-icon">⬆️</div>
          <div className="du-dropzone-title">Drop your file here or click to browse</div>
          <div className="du-dropzone-sub">
            <code>.nc</code> <code>.nc4</code> NetCDF &nbsp;·&nbsp;
            <code>.csv</code> <code>.tsv</code> <code>.txt</code> <code>.dat</code> ASCII/Text
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className={`du-status ${status.state}`}>
            {status.state === 'loading' && (
              <>
                <div className="du-spinner" />
                <span>{status.message}</span>
              </>
            )}
            {status.state === 'error' && (
              <>
                <div className="du-status-title">⚠ Parse Error</div>
                {status.message}
              </>
            )}
            {status.state === 'success' && status.meta && (
              <>
                <div className="du-status-title">{status.message}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 6, lineHeight: 1.5 }}>
                  Source: {status.meta.source} &nbsp;·&nbsp;
                  {status.meta.pointCount != null ? (
                    status.meta.pointCount === 1 ? (
                      <span>1 Station ({status.meta.totalRows} time-series records) @ {status.meta.latRange[0].toFixed(1)}°N, {status.meta.lonRange[0].toFixed(1)}°E</span>
                    ) : (
                      <span>{status.meta.pointCount} Stations ({status.meta.totalRows} records)</span>
                    )
                  ) : (
                    <span>Lat: {status.meta.latRange[0].toFixed(1)}° → {status.meta.latRange[1].toFixed(1)}° · Lon: {status.meta.lonRange[0].toFixed(1)}° → {status.meta.lonRange[1].toFixed(1)}°</span>
                  )}
                  {status.meta.date !== 'Unknown' && ` · ${status.meta.date}`}
                </div>
                <div className="du-tags">
                  {status.meta.variablesFound.map((v, idx) => (
                    <span key={`${v}-${idx}`} className="du-tag green">
                      {v === 'sst' ? '🌡 SST' : v === 'u' || v === 'v' ? '🌊 Currents' : v === 'chla' ? '🌿 Chlorophyll' : v}
                    </span>
                  ))}
                  <span className="du-tag">{status.meta.source}</span>
                </div>
              </>
            )}
            {status.state === 'live' && status.meta && (
              <>
                <div className="du-status-title" style={{ color: '#00ffaa' }}>{status.message}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                  {status.meta.pointCount} measurement points · Updated {status.meta.date}
                </div>
                <div className="du-tags">
                  {(status.meta.variablesFound || []).map((v, idx) => (
                    <span key={`${v}-${idx}`} className="du-tag green">
                      {v === 'sst' ? '🌡 SST' : v === 'u' || v === 'v' ? '🌊 Currents' : v === 'chla' ? '🌿 Chlorophyll' : v}
                    </span>
                  ))}
                  <span className="du-tag" style={{ borderColor: 'rgba(0,255,170,0.3)', color: '#00ffaa' }}>🛰 Live</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Clear button */}
        {userDataset && (
          <button className="du-clear-btn" onClick={handleClear}>
            {isLive ? '🛰 Switch to manual file upload' : '✕ Remove dataset — reload live data'}
          </button>
        )}

        {/* Format guide */}
        <div className="du-format-guide">
          <div className="du-format-title">Expected Column / Variable Names</div>
          <div className="du-format-row">
            <span className="du-format-label">Latitude</span>
            <span>lat, latitude, nav_lat, y</span>
          </div>
          <div className="du-format-row">
            <span className="du-format-label">Longitude</span>
            <span>lon, longitude, nav_lon, x</span>
          </div>
          <div className="du-format-row">
            <span className="du-format-label">Temperature</span>
            <span>sst, temp, temperature, analysed_sst, thetao</span>
          </div>
          <div className="du-format-row">
            <span className="du-format-label">Currents</span>
            <span>u / v, uo / vo, uwnd / vwnd, u_current / v_current</span>
          </div>
          <div className="du-format-row">
            <span className="du-format-label">Chlorophyll</span>
            <span>chla, chlor_a, chlorophyll, chl_a</span>
          </div>
        </div>

      </div>
    </div>
  )
}

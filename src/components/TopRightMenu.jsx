import React, { useState } from 'react';
import { Globe, Sun, Waves, Disc, Circle, Droplet, Thermometer, Compass, Leaf, Map, Radio, Navigation, Shield, Layers, FolderOpen, Satellite, Target } from 'lucide-react';
import useOceanStore from '../store/oceanStore';
import './TopRightMenu.css';

const DEPTH_LAYERS = [
  { id: -1, label: 'ALL',         sublabel: 'Full 3D Stack',   color: '#00d4ff', icon: <Globe size={16} /> },
  { id:  0, label: 'SURFACE',     sublabel: '0-200m | 24-28C', color: '#ff7f3f', icon: <Sun size={16} /> },
  { id:  1, label: 'THERMOCLINE', sublabel: '200-1000m | 10C', color: '#00b8e0', icon: <Waves size={16} /> },
  { id:  2, label: 'BATHYAL',     sublabel: '1-4km | 4C',      color: '#6d28d9', icon: <Disc size={16} /> },
  { id:  3, label: 'ABYSS',       sublabel: '4km+ | 1C',       color: '#9f1239', icon: <Circle size={16} /> },
];

export default function TopRightMenu() {
    const [isMinimized, setIsMinimized] = useState(false);
    const [strataExpanded, setStrataExpanded] = useState(true);

    const showWaterSurface = useOceanStore(s => s.showWaterSurface);
    const setShowWaterSurface = useOceanStore(s => s.setShowWaterSurface);
    const isWaterTransparent = useOceanStore(s => s.isWaterTransparent ?? true);
    const toggleWaterTransparent = useOceanStore(s => s.toggleWaterTransparent);
    const showTemperature = useOceanStore(s => s.showTemperature);
    const setShowTemperature = useOceanStore(s => s.setShowTemperature);
    const showWaterDirection = useOceanStore(s => s.showWaterDirection);
    const setShowWaterDirection = useOceanStore(s => s.setShowWaterDirection);
    const showCurrents = useOceanStore(s => s.showCurrents);
    const setShowCurrents = useOceanStore(s => s.setShowCurrents);
    const showChlorophyll = useOceanStore(s => s.showChlorophyll);
    const setShowChlorophyll = useOceanStore(s => s.setShowChlorophyll);
    const showLocations = useOceanStore(s => s.showLocations ?? false);
    const setShowLocations = useOceanStore(s => s.setShowLocations);
    const showInstruments = useOceanStore(s => s.showInstruments);
    const setShowInstruments = useOceanStore(s => s.setShowInstruments);
    const showArgo = useOceanStore(s => s.showArgo ?? true);
    const setShowArgo = useOceanStore(s => s.setShowArgo);
    const showGliders = useOceanStore(s => s.showGliders ?? true);
    const setShowGliders = useOceanStore(s => s.setShowGliders);
    const showCTD = useOceanStore(s => s.showCTD ?? true);
    const setShowCTD = useOceanStore(s => s.setShowCTD);
    const showBGC = useOceanStore(s => s.showBGC ?? true);
    const setShowBGC = useOceanStore(s => s.setShowBGC);
    const setIsUploaderOpen = useOceanStore(s => s.setIsUploaderOpen);
    const userDataset = useOceanStore(s => s.userDataset);
    const focusedDepthLayer = useOceanStore(s => s.focusedDepthLayer ?? -1);
    const setFocusedDepthLayer = useOceanStore(s => s.setFocusedDepthLayer);
    const waterClarity = useOceanStore(s => s.waterClarity ?? 0.65);
    const setWaterClarity = useOceanStore(s => s.setWaterClarity);

    const isVelocityActive = showWaterDirection || showCurrents;
    const disableWaterMods = false; // Strata and clarity controls are always available

    const toggleWaterSurface = () => {
        setShowWaterSurface(!showWaterSurface);
    };

    const toggleTemperature = () => {
        const next = !showTemperature;
        setShowTemperature(next);
        if (next) setShowWaterSurface(true);
    };

    const toggleVelocity = () => {
        const next = !isVelocityActive;
        setShowWaterDirection(next);
        setShowCurrents(next);
        if (next) setShowWaterSurface(true);
    };

    const toggleChlorophyll = () => {
        const next = !showChlorophyll;
        setShowChlorophyll(next);
        if (next) setShowWaterSurface(true);
    };

    return (
        <div className={`top-right-menu ${isMinimized ? 'trm-minimized' : ''}`}>
            <div className="trm-header-row" onClick={() => setIsMinimized(!isMinimized)}>
                <div className="trm-header-title">
                    <span className="trm-live-pulse" />
                    <span className="trm-header-icon"><Layers size={18} /></span>
                    <span>Ocean Overlays</span>
                </div>
                <button
                    className="trm-collapse-btn"
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                    title={isMinimized ? 'Expand Overlays (Ctrl+O)' : 'Minimize Overlays'}
                >
                    {isMinimized ? '▾' : '▴'}
                </button>
            </div>

            {!isMinimized && (
                <div className="trm-body">
                    <div className="trm-group-title">Environmental Layers</div>
                    <div className="trm-section">
                        <div className={`trm-toggle-row ${showWaterSurface ? 'active' : ''}`} onClick={toggleWaterSurface} title="Toggle Ocean Surface Water layer">
                            <span className="trm-label"><Waves size={16} style={{marginRight: '6px'}}/> Water Surface</span>
                            <label className="trm-switch" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={showWaterSurface} onChange={toggleWaterSurface} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                        <div className={`trm-toggle-row ${isWaterTransparent ? 'active' : ''}`} onClick={toggleWaterTransparent} title="Toggle Water Transparency (when disabled, top ocean layer becomes non-transparent)">
                            <span className="trm-label" style={{ paddingLeft: '8px' }}><Droplet size={16} style={{marginRight: '6px'}}/> Water Transparent</span>
                            <label className="trm-switch" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={isWaterTransparent} onChange={toggleWaterTransparent} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                        <div className={`trm-toggle-row ${showTemperature ? 'active' : ''}`} onClick={toggleTemperature} title="Toggle Sea Surface Temperature thermal distribution">
                            <span className="trm-label"><Thermometer size={16} style={{marginRight: '6px'}}/> Temperature (SST)</span>
                            <label className="trm-switch" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={showTemperature} onChange={toggleTemperature} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                        <div className={`trm-toggle-row ${isVelocityActive ? 'active' : ''}`} onClick={toggleVelocity} title="Toggle Real-Earth Ocean Current Velocity & particle flows">
                            <span className="trm-label"><Compass size={16} style={{marginRight: '6px'}}/> Current Velocity</span>
                            <label className="trm-switch" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={isVelocityActive} onChange={toggleVelocity} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                        <div className={`trm-toggle-row ${showChlorophyll ? 'active' : ''}`} onClick={toggleChlorophyll} title="Toggle Real-Earth Chlorophyll-a Phytoplankton Bloom distribution">
                            <span className="trm-label"><Leaf size={16} style={{marginRight: '6px'}}/> Chlorophyll Bloom</span>
                            <label className="trm-switch" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={showChlorophyll} onChange={toggleChlorophyll} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                        <div className={`trm-toggle-row ${showLocations ? 'active' : ''}`} onClick={() => setShowLocations(!showLocations)} title="Show geographic location labels (oceans, continents, landmarks)">
                            <span className="trm-label"><Map size={16} style={{marginRight: '6px'}}/> Show Locations</span>
                            <label className="trm-switch" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={showLocations} onChange={() => setShowLocations(!showLocations)} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                    </div>

                    <div className="trm-divider" />

                    {/* Depth Strata Inspector */}
                    <div
                        className="trm-group-title trm-network-header"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setStrataExpanded(v => !v)}
                    >
                        <span><Target size={16} style={{marginRight: '6px', verticalAlign:'middle'}}/> Depth Strata &amp; Temp Layers</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>{strataExpanded ? '▴' : '▾'}</span>
                    </div>

                    {strataExpanded && (
                        <div className="trm-section trm-strata-section">
                            <div className="trm-strata-pills">
                                {DEPTH_LAYERS.map(layer => (
                                    <button
                                        key={layer.id}
                                        className={`trm-strata-pill ${focusedDepthLayer === layer.id ? 'active' : ''}`}
                                        style={{
                                            '--pill-color': layer.color,
                                            borderColor: focusedDepthLayer === layer.id ? layer.color : 'rgba(255,255,255,0.12)',
                                            boxShadow: focusedDepthLayer === layer.id ? `0 0 14px ${layer.color}99` : 'none',
                                        }}
                                        onClick={() => setFocusedDepthLayer(layer.id)}
                                        disabled={disableWaterMods}
                                    >
                                        <span className="trm-pill-icon" style={{ color: layer.color }}>{layer.icon}</span>
                                        <div className="trm-pill-info">
                                            <span className="trm-pill-name">{layer.label}</span>
                                            <span className="trm-pill-sub">{layer.sublabel}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="trm-clarity-row">
                                <span className="trm-label">💧 Water Clarity</span>
                                <div className="trm-clarity-values">
                                    <span className="trm-clarity-badge" style={{ opacity: 0.5 }}>Dense</span>
                                    <span className="trm-clarity-pct">{Math.round(waterClarity * 100)}%</span>
                                    <span className="trm-clarity-badge" style={{ opacity: 0.5 }}>Crystal</span>
                                </div>
                            </div>
                            <div className="trm-slider-track">
                                <input
                                    type="range"
                                    min="0.15"
                                    max="1.0"
                                    step="0.01"
                                    value={waterClarity}
                                    onChange={e => setWaterClarity(parseFloat(e.target.value))}
                                    disabled={disableWaterMods}
                                    className="trm-range-input"
                                    style={{ '--range-val': `${((waterClarity - 0.15) / 0.85) * 100}%` }}
                                />
                            </div>

                            <div className="trm-depth-legend">
                                {DEPTH_LAYERS.filter(l => l.id >= 0).map(layer => (
                                    <div key={layer.id} className="trm-legend-row">
                                        <span
                                            className="trm-legend-swatch"
                                            style={{ background: layer.color, boxShadow: `0 0 5px ${layer.color}88` }}
                                        />
                                        <span className="trm-legend-text">{layer.sublabel}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="trm-divider" />

                    <div className="trm-group-title trm-network-header">
                        <span>Observation Network</span>
                        <label className="trm-switch trm-switch-sm">
                            <input type="checkbox" checked={showInstruments} onChange={e => setShowInstruments(e.target.checked)} />
                            <span className="trm-slider" />
                        </label>
                    </div>

                    <div className="trm-section">
                        <div className="trm-toggle-row">
                            <span className="trm-label">
                                <span className="trm-color-dot" style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
                                <Circle size={16} style={{marginRight:'6px'}}/> Argo Floats
                            </span>
                            <label className="trm-switch">
                                <input type="checkbox" checked={showArgo && showInstruments} onChange={e => setShowArgo(e.target.checked)} disabled={!showInstruments} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                        <div className="trm-toggle-row">
                            <span className="trm-label">
                                <span className="trm-color-dot" style={{ background: '#ff6b22', boxShadow: '0 0 8px #ff6b22' }} />
                                <Navigation size={16} style={{marginRight:'6px'}}/> Ocean Gliders
                            </span>
                            <label className="trm-switch">
                                <input type="checkbox" checked={showGliders && showInstruments} onChange={e => setShowGliders(e.target.checked)} disabled={!showInstruments} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                        <div className="trm-toggle-row">
                            <span className="trm-label">
                                <span className="trm-color-dot" style={{ background: '#00f5a0', boxShadow: '0 0 8px #00f5a0' }} />
                                <Radio size={16} style={{marginRight:'6px'}}/> CTD Instruments
                            </span>
                            <label className="trm-switch">
                                <input type="checkbox" checked={showCTD && showInstruments} onChange={e => setShowCTD(e.target.checked)} disabled={!showInstruments} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                        <div className="trm-toggle-row">
                            <span className="trm-label">
                                <span className="trm-color-dot" style={{ background: '#bf5af2', boxShadow: '0 0 8px #bf5af2' }} />
                                <Satellite size={16} style={{marginRight:'6px'}}/> BGC Floats
                            </span>
                            <label className="trm-switch">
                                <input type="checkbox" checked={showBGC && showInstruments} onChange={e => setShowBGC(e.target.checked)} disabled={!showInstruments} />
                                <span className="trm-slider" />
                            </label>
                        </div>
                    </div>

                    <div className="trm-divider" />

                    <button
                        className={`trm-dataset-action ${userDataset ? 'active' : ''}`}
                        onClick={() => setIsUploaderOpen(true)}
                        title="Load or inspect ocean dataset"
                    >
                        <span className="trm-dataset-action-icon">{userDataset ? <Satellite size={18}/> : <FolderOpen size={18}/>}</span>
                        <div className="trm-dataset-action-info">
                            <span className="trm-dataset-action-title">
                                {userDataset ? 'Dataset Active' : 'Load Dataset'}
                            </span>
                            <span className="trm-dataset-action-sub">
                                {userDataset ? (userDataset.meta?.filename || 'Live Feed') : 'NetCDF · CSV · ASCII'}
                            </span>
                        </div>
                        <span className="trm-dataset-action-arrow">›</span>
                    </button>
                </div>
            )}
        </div>
    );
}

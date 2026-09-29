// src/store/oceanStore.js
import { create } from 'zustand'

const useOceanStore = create((set) => ({
  // ── Application View ──
  currentView: 'dashboard', // 'dashboard' | 'globe' | 'analytics' | 'alerts' | 'settings' | 'help'

  // ── User-uploaded dataset ──
  userDataset: null,       // OceanDataset object from fileParser.js, or null
  // ── View mode ──
  viewMode: 'globe',          // 'globe' | 'flat'
  morphProgress: 0.0,         // 0.0 = globe, 1.0 = flat

  // ── Data controls ──
  selectedVariable: 'temperature',  // 'temperature' | 'salinity' | 'current'
  opacity: 0.75,
  verticalExaggeration: 3,
  colorPalette: 'thermal',   // 'thermal' | 'ocean' | 'viridis' | 'rainbow' | 'grayscale'
  scaleType: 'linear',       // 'linear' | 'log'

  // ── Instrument ──
  selectedInstrument: null,
  isDataPanelOpen: false,

  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  // ── Playback ──
  isPlaying: false,
  currentTimeStep: 0,
  totalTimeSteps: 5,
  playbackDirection: 1,          // 1 = forward, -1 = backward
  timeScale: 1.0,                // playback speed multiplier
  flowDataTimesteps: null,       // Array of flowData per time step (if multi-step dataset)

  // ── Ocean currents ──
  showCurrents: false,
  currentSpeed: 0.5,

  // ── Depth slices & Bathymetry ──
  activeDepthIndex: null,
  focusedDepthLayer: -1, // -1 = all layers, 0 = Epipelagic, 1 = Mesopelagic, 2 = Bathypelagic, 3 = Hadal
  waterClarity: 0.65,    // 0.2 (dense) to 1.0 (crystal clear)
  showBathymetry: true,
  showWaterSurface: true,
  isWaterTransparent: true,
  showWaterDirection: false,
  showTemperature: false,
  showChlorophyll: false,
  showDepthOverlay: true,
  showTimeOverlay: true,
  showLocations: false,
  showLatLonOverlay: true,
  showInstruments: true,
  hoveredDepthInfo: null,

  // ── Per-type instrument visibility ──
  showArgo: true,
  showGliders: true,
  showCTD: true,
  showBGC: true,

  // ── Layout & Modals ──
  isSidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setIsSidebarCollapsed: (b) => set({ isSidebarCollapsed: b }),
  isUploaderOpen: false,
  setIsUploaderOpen: (b) => set({ isUploaderOpen: b }),

  // ── Area Slicer ──
  isSlicingMode: false,
  sliceBounds: null, // { minX, maxX, minY, maxY } in UV space (0 to 1)

  // ── 3D Volume Slicing (Clipping) ──
  clippingEnabled: false,
  clippingAxis: 'Y',      // 'X', 'Y', 'Z'
  clippingOffset: 0.0,
  clippingDirection: 1,   // 1 or -1

  // ── Isosurfaces ──
  isosurfaceEnabled: false,
  isosurfaceValue: 15,
  isosurfaceTolerance: 1.5,

  // ── Actions ──
  setCurrentView: (view) => set({ currentView: view }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setMorphProgress: (p) => set({ morphProgress: p }),
  setSelectedVariable: (v) => set({ selectedVariable: v }),
  setOpacity: (o) => set({ opacity: o }),
  setVerticalExaggeration: (v) => set({ verticalExaggeration: v }),
  setColorPalette: (p) => set({ colorPalette: p }),
  setScaleType: (s) => set({ scaleType: s }),

  selectInstrument: (instrument) => set({
    selectedInstrument: instrument,
    isDataPanelOpen: false,
  }),
  closeDataPanel: () => set({ selectedInstrument: null, isDataPanelOpen: false }),

  setIsPlaying: (b) => set({ isPlaying: b }),
  setCurrentTimeStep: (valOrFn) => set((state) => ({
    currentTimeStep: typeof valOrFn === 'function' ? valOrFn(state.currentTimeStep) : valOrFn
  })),
  setTotalTimeSteps: (n) => set({ totalTimeSteps: n }),
  setPlaybackDirection: (d) => set({ playbackDirection: d }),
  setTimeScale: (s) => set({ timeScale: s }),
  setFlowDataTimesteps: (arr) => set({ flowDataTimesteps: arr }),
  setShowCurrents: (b) => set({ showCurrents: b }),
  setCurrentSpeed: (s) => set({ currentSpeed: s }),
  setActiveDepthIndex: (i) => set({ activeDepthIndex: i }),
  setFocusedDepthLayer: (i) => set({ focusedDepthLayer: i }),
  setWaterClarity: (c) => set({ waterClarity: c }),
  setShowBathymetry: (b) => set({ showBathymetry: b }),
  setShowWaterSurface: (b) => set({ showWaterSurface: b }),
  setIsWaterTransparent: (b) => set({ isWaterTransparent: b }),
  toggleWaterTransparent: () => set((s) => ({ isWaterTransparent: !s.isWaterTransparent })),
  setShowWaterDirection: (b) => set({ showWaterDirection: b }),
  setShowTemperature: (b) => set({ showTemperature: b }),
  setShowChlorophyll: (b) => set({ showChlorophyll: b }),
  setShowDepthOverlay: (b) => set({ showDepthOverlay: b }),
  setShowTimeOverlay: (b) => set({ showTimeOverlay: b }),
  setShowLatLonOverlay: (b) => set({ showLatLonOverlay: b }),
  setShowLocations: (b) => set({ showLocations: b }),
  setShowInstruments: (b) => set({ showInstruments: b }),
  setHoveredDepthInfo: (info) => set({ hoveredDepthInfo: info }),
  setShowArgo: (b) => set({ showArgo: b }),
  setShowGliders: (b) => set({ showGliders: b }),
  setShowCTD: (b) => set({ showCTD: b }),
  setShowBGC: (b) => set({ showBGC: b }),
  
  setIsSlicingMode: (b) => set({ isSlicingMode: b }),
  setSliceBounds: (bounds) => set({ sliceBounds: bounds, isSlicingMode: false }), // Auto-close slicing mode when bounds are set

  setClippingEnabled: (b) => set({ clippingEnabled: b }),
  setClippingAxis: (a) => set({ clippingAxis: a }),
  setClippingOffset: (o) => set({ clippingOffset: o }),
  setClippingDirection: (d) => set({ clippingDirection: d }),
  setIsosurfaceEnabled: (b) => set({ isosurfaceEnabled: b }),
  setIsosurfaceValue: (v) => set({ isosurfaceValue: v }),
  setIsosurfaceTolerance: (t) => set({ isosurfaceTolerance: t }),

  setUserDataset: (dataset) => set({ userDataset: dataset }),
  clearUserDataset: () => set({ userDataset: null, flowData: null }),

  // ── Raw Data for CPU Engine ──
  flowData: null,
  setFlowData: (data) => set({ flowData: data }),

  // ── ML Prediction Engine ──
  predictionResult: null,   // { rows, meta, summary, anomalies, chartData }
  isPredicting: false,
  predictionSessionId: null,
  setPredictionResult: (result) => set({ predictionResult: result }),
  setIsPredicting: (b) => set({ isPredicting: b }),
  setPredictionSessionId: (id) => set({ predictionSessionId: id }),
  clearPrediction: () => set({ predictionResult: null, predictionSessionId: null }),

}))

export default useOceanStore

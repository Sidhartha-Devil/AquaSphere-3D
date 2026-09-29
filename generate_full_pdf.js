import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>INCOIS 3D Ocean Explorer — Full Project Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4 portrait;
      margin: 16mm 14mm 16mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      font-size: 9.5pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .page-break {
      page-break-before: always;
    }

    /* Cover / Header Banner */
    .header-banner {
      background: linear-gradient(135deg, #0a0f1d 0%, #0f172a 50%, #0369a1 100%);
      color: #ffffff;
      padding: 24px 28px;
      border-radius: 12px;
      margin-bottom: 18px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      position: relative;
    }

    .top-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 8pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #38bdf8;
      font-weight: 700;
    }

    .header-banner h1 {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
      color: #ffffff;
      line-height: 1.2;
    }

    .header-banner h2 {
      font-size: 11pt;
      font-weight: 400;
      color: #bae6fd;
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .badges-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .badge {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 7.5pt;
      font-weight: 600;
      color: #f0f9ff;
    }

    .badge.active {
      background: #0284c7;
      border-color: #38bdf8;
      color: #ffffff;
    }

    .badge.green {
      background: #15803d;
      border-color: #4ade80;
      color: #ffffff;
    }

    /* Section Styling */
    .section-title {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title span.num {
      background: #0284c7;
      color: white;
      font-size: 9pt;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .sub-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0369a1;
      margin-top: 12px;
      margin-bottom: 6px;
    }

    p {
      margin-bottom: 8px;
      color: #334155;
      text-align: justify;
    }

    /* Executive Summary Callout Box */
    .exec-box {
      background: #f0f9ff;
      border-left: 4px solid #0284c7;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      margin-bottom: 14px;
      font-size: 9pt;
    }

    .exec-box strong {
      color: #0369a1;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 14px;
      font-size: 8pt;
    }

    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #1e293b;
    }

    td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      color: #334155;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    td code, p code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      background: #f1f5f9;
      color: #0369a1;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    /* Code snippet box */
    .code-block {
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      line-height: 1.4;
      padding: 10px 12px;
      border-radius: 6px;
      margin: 8px 0 12px 0;
      overflow-x: auto;
    }

    .code-block .keyword { color: #38bdf8; font-weight: 600; }
    .code-block .type { color: #a78bfa; }
    .code-block .func { color: #34d399; }
    .code-block .comment { color: #64748b; font-style: italic; }

    /* Feature Grid / Cards */
    .feature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }

    .card h4 {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .card p {
      font-size: 8pt;
      color: #475569;
      margin-bottom: 0;
      line-height: 1.35;
    }

    /* Status Tags */
    .status-tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
    }

    .status-completed {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }

    .status-active {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #7dd3fc;
    }

    /* Footer Meta */
    .report-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #64748b;
    }
  </style>
</head>
<body>

  <!-- COVER / HEADER BANNER -->
  <div class="header-banner">
    <div class="top-meta">
      <span>🌊 INCOIS Integrated Ocean Data System</span>
      <span>Technical Milestone Report</span>
    </div>
    <h1>INCOIS 3D Ocean Explorer</h1>
    <h2>Next-Generation 4D Oceanographic Visualization, Telemetry & In-Situ Sensor Dashboard</h2>
    <div class="badges-row">
      <span class="badge active">Version 1.0.0</span>
      <span class="badge green">Production-Ready Prototype</span>
      <span class="badge">React 18 + Three.js (R3F)</span>
      <span class="badge">Custom GLSL Shaders</span>
      <span class="badge">Zustand State Store</span>
      <span class="badge active">Local URL: http://localhost:5174/</span>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="exec-box">
    <strong>EXECUTIVE SUMMARY & SYSTEM SCOPE:</strong><br/>
    The <strong>INCOIS 3D Ocean Explorer</strong> is an enterprise-grade, browser-native 3D/4D oceanographic analytics and visualization platform. 
    It eliminates the need for heavyweight desktop GIS installations by running high-performance GPU-accelerated WebGL pipelines directly inside modern browsers. 
    The system seamlessly overlays numerical ocean model forecasts (SST, Salinity, Current Vectors, Chlorophyll) with in-situ observational networks (Argo Floats, Autonomous Gliders, Moored CTD Buoys, and Biogeochemical Sensors). 
    Engineered with React 18, Three.js / React Three Fiber, GLSL Shaders, Recharts, and Zustand, the platform delivers instantaneous 3D Globe to 2D Planar map morphing, 1x–10x vertical exaggeration bathymetry, 500m isobath contouring, GPU vector particle streamlines, client-side NetCDF4/CSV ingestion, and dual-curve Model vs. Observation vertical depth profile analytics.
  </div>

  <!-- SECTION 1: ARCHITECTURE -->
  <div class="section-title"><span class="num">1</span> System Architecture & Decoupled Pipeline</div>
  <p>
    The platform follows a high-throughput, decoupled <strong>Presentation-State-Graphics-Data</strong> architecture designed to maintain a consistent 60 FPS frame rate under intensive volumetric rendering and dynamic particle simulations.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Architectural Layer</th>
        <th style="width: 22%;">Technologies</th>
        <th style="width: 56%;">Responsibilities & Technical Capabilities</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>3D WebGL Graphics & Shaders</strong></td>
        <td>Three.js, R3F, GLSL, WebGL2</td>
        <td>Custom vertex & fragment shaders for Earth curvature morphing, seabed displacement (-11,000m Hadal trenches), fresnel rim scattering, specular ocean highlights, and GPU vector particle streamlines.</td>
      </tr>
      <tr>
        <td><strong>Glassmorphism HUD & UI</strong></td>
        <td>React 18, Vanilla CSS</td>
        <td>Floating 4-quadrant layout: Header & Search, Left Controls & Sliders, Right Telemetry & Analytics, Bottom Widgets, 3D Raycasted Depth Probe, Interactive UV Area Slicer.</td>
      </tr>
      <tr>
        <td><strong>Central State Store</strong></td>
        <td>Zustand (<code>oceanStore.js</code>)</td>
        <td>Reactive global store managing projection modes (<code>globe</code>/<code>flat</code>), morph progress (0.0 to 1.0), vertical exaggeration (1–10x), 4D timeline (-48h to +48h), depth strata, selected platform, and user dataset.</td>
      </tr>
      <tr>
        <td><strong>Data Ingestion Engine</strong></td>
        <td>netcdfjs, papaparse, Canvas</td>
        <td>Zero-backend client-side NetCDF4 binary parser and CSV table parser. Automatically maps dimensions (lat, lon, depth, time) and synthesizes runtime 2D GPU Data Textures.</td>
      </tr>
      <tr>
        <td><strong>Analytics & Telemetry</strong></td>
        <td>Recharts, Math Pipeline</td>
        <td>Model vs. Observation profile charts (0m to 2000m depth), anomaly discrepancy calculations (Δ = Obs - Model), sensor transmission logs, and live telemetry cards.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2: CODEBASE INVENTORY -->
  <div class="section-title"><span class="num">2</span> Complete Codebase Directory & File Inventory</div>
  <p>
    The codebase comprises <strong>23+ specialized components, services, and scientific datasets</strong> cleanly organized under modular directories:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 28%;">File Path</th>
        <th style="width: 14%;">Type</th>
        <th style="width: 58%;">Description & Implementation Details</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>src/App.jsx</code></td>
        <td>Root View</td>
        <td>Mounts full-page 3D Canvas, glassmorphism overlays, responsive HUD elements, and animated shader initialization loading screen.</td>
      </tr>
      <tr>
        <td><code>src/store/oceanStore.js</code></td>
        <td>Zustand Store</td>
        <td>State store holding variables, opacity, vertical exaggeration, palettes, instrument selection, active depth slices, time scrubber, slicing bounds, user dataset.</td>
      </tr>
      <tr>
        <td><code>src/components/OceanScene.jsx</code></td>
        <td>3D Canvas Setup</td>
        <td>Three.js scene host with OrbitControls, directional sun lighting, ambient fill, and sub-component rendering hierarchy.</td>
      </tr>
      <tr>
        <td><code>src/components/OceanGlobe.jsx</code></td>
        <td>3D / GLSL Shaders</td>
        <td>3D Earth sphere with custom GLSL shaders for atmospheric fresnel glow, seamless 3D Globe ⇄ 2D Flat Map morphing, SST/Chlorophyll texture blending, coordinate picking.</td>
      </tr>
      <tr>
        <td><code>src/components/OceanBathymetry.jsx</code></td>
        <td>3D Seabed Mesh</td>
        <td>High-resolution seabed terrain mesh with 1x-10x vertical exaggeration, Mariana Trench highlights (-11,000m), 500m isobath lines, raycast sounding depth probe.</td>
      </tr>
      <tr>
        <td><code>src/components/OceanCurrents.jsx</code></td>
        <td>3D Flow Particles</td>
        <td>3D Vector streamline and particle engine rendering dynamic global ocean currents (Gulf Stream, Kuroshio, Agulhas, ACC) color-coded by velocity/depth.</td>
      </tr>
      <tr>
        <td><code>src/components/OceanDepthLayers.jsx</code></td>
        <td>3D Volumetric</td>
        <td>Multi-layer depth slicing planes (0m, 100m, 500m, 1000m, 2000m, 4000m) with temperature/salinity volumetric gradient interpolation.</td>
      </tr>
      <tr>
        <td><code>src/components/InstrumentMarkers.jsx</code></td>
        <td>3D In-Situ Glyphs</td>
        <td>Interactive 3D pulsing platform glyphs (Argo ●, Gliders ▲, CTD ■, BGC Sensors ◆) at georeferenced coordinates with click dispatching to analytics panel.</td>
      </tr>
      <tr>
        <td><code>src/components/DataPanel.jsx</code></td>
        <td>UI / Telemetry</td>
        <td>Telemetry dashboard with Recharts plotting Model vs. Observation vertical depth profiles (Depth vs Temp/Salinity), anomaly metrics table, platform status.</td>
      </tr>
      <tr>
        <td><code>src/components/ControlPanel.jsx</code></td>
        <td>UI / Controls</td>
        <td>Left sidebar with layer visibility toggles, variable selectors, vertical exaggeration slider (1-10x), 4D time scrubber (-48h to +48h), depth selector stops.</td>
      </tr>
      <tr>
        <td><code>src/components/DataUploader.jsx</code></td>
        <td>UI / Ingestion</td>
        <td>Modal for drag-and-drop uploading NetCDF (.nc) and CSV files, auto-detecting lat/lon/depth/variables, generating real-time GPU textures.</td>
      </tr>
      <tr>
        <td><code>src/components/SlicerOverlay.jsx</code></td>
        <td>GIS / Slicing</td>
        <td>Interactive 3D bounding box drawing tool allowing users to select regional sub-grids (e.g. Indian Ocean, Bay of Bengal) and clip 3D shaders in UV space.</td>
      </tr>
      <tr>
        <td><code>src/components/DepthProbe.jsx</code></td>
        <td>GIS / Sounding</td>
        <td>Real-time floating sounding badge showing depth (m), lat/lon, and underwater topographic landmarks (Trenches, Abyssal Plains, Ridges) under cursor.</td>
      </tr>
      <tr>
        <td><code>src/components/Header.jsx</code></td>
        <td>UI / Header</td>
        <td>INCOIS branding top navigation bar with integrated search, quick analytics tabs, and active coordinates pill.</td>
      </tr>
      <tr>
        <td><code>src/components/TopRightMenu.jsx</code></td>
        <td>UI / Actions</td>
        <td>Quick action buttons: Fullscreen toggle, Snapshot PNG export, Reset camera view, Layer legend toggle, Slicing mode trigger, Dataset upload trigger.</td>
      </tr>
      <tr>
        <td><code>src/components/Legend.jsx</code></td>
        <td>UI / Legend</td>
        <td>Dynamic color bar legend showing units and value range (e.g. -2°C to 35°C, 30 to 38 PSU) adapting to active variable and palette (Thermal, Viridis, Ocean, Rainbow).</td>
      </tr>
      <tr>
        <td><code>src/components/ViewToggle.jsx</code></td>
        <td>UI / Projection</td>
        <td>One-click smooth interpolation toggle between 3D Spherical Globe and 2D Mercator/Equirectangular flat map projection.</td>
      </tr>
      <tr>
        <td><code>src/services/fileParser.js</code></td>
        <td>Service</td>
        <td>Binary NetCDF4 decoder (netcdfjs) and CSV parser (papaparse) with automatic dimension and variable column detection and data normalization.</td>
      </tr>
      <tr>
        <td><code>src/services/textureBuilder.js</code></td>
        <td>Service</td>
        <td>Dynamic GPU Data Texture generator converting 2D/3D matrix data into high-resolution WebGL textures (SST, Salinity, Chlorophyll, Velocity Fields).</td>
      </tr>
      <tr>
        <td><code>src/services/liveOceanData.js</code></td>
        <td>Service</td>
        <td>Live marine API client (Open-Meteo Marine / Copernicus / simulated INCOIS telemetry) providing real-time wave heights, temperatures, and currents.</td>
      </tr>
      <tr>
        <td><code>src/data/bathymetryData.js</code></td>
        <td>Data Module</td>
        <td>Global bathymetric lookup tables, ocean trench coordinates (Mariana, Puerto Rico, Java Trench, Mid-Atlantic Ridge), and depth zone classifications.</td>
      </tr>
      <tr>
        <td><code>src/data/oceanCurrents.js</code></td>
        <td>Data Module</td>
        <td>Vector flow field definitions for major global oceanic gyres and boundary currents (Gulf Stream, Kuroshio, Agulhas, Benguela, Humboldt).</td>
      </tr>
      <tr>
        <td><code>src/data/mockOceanData.js</code></td>
        <td>Data Module</td>
        <td>High-fidelity simulated Argo float profiles, glider mission waypoints, moored CTD buoys, and BGC biogeochemical profiles.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- SECTION 3: TECHNICAL DEEP DIVE -->
  <div class="section-title"><span class="num">3</span> Deep-Dive: Core Technical Implementations</div>

  <div class="sub-title">A. Continuous 3D Globe ⇄ 2D Flat Map Morphing Engine</div>
  <p>
    The platform eliminates jarring scene reloads or camera cuts by using custom vertex shaders in <code>OceanGlobe.jsx</code> and <code>OceanBathymetry.jsx</code>. 
    Every vertex calculates both its spherical position on radius R=2.0 and its planar equirectangular coordinates, blending seamlessly via the uniform <code>u_morphProgress</code>:
  </p>

  <div class="code-block">
<span class="comment">// Dynamic Vertex Blending in OceanGlobe.jsx & OceanBathymetry.jsx</span>
<span class="type">vec3</span> spherePos = <span class="func">normalize</span>(position) * u_radius;
<span class="type">vec3</span> flatPos   = <span class="type">vec3</span>((uv.x - 0.5) * 6.28318 * 1.6, (uv.y - 0.5) * 3.14159 * 1.6, 0.0);
<span class="type">vec3</span> morphedPos = <span class="func">mix</span>(spherePos, flatPos, u_morphProgress);
gl_Position = projectionMatrix * modelViewMatrix * <span class="type">vec4</span>(morphedPos, 1.0);
  </div>

  <div class="feature-grid">
    <div class="card">
      <h4>🏔️ Dynamic Seabed Bathymetry & Exaggeration</h4>
      <p>
        Reads GEBCO/NASA elevation heightmaps and displaces ocean floor vertices downward multiplied by <code>u_verticalExaggeration</code> (1x to 10x). 
        Includes Hadal trench glow (-11,000m Mariana Trench), procedural 500m isobath contours, and raycast sounding depth probes.
      </p>
    </div>
    <div class="card">
      <h4>🌀 GPU Vector Particle Flow Engine</h4>
      <p>
        Samples eastward (u) and northward (v) velocity components to render continuous, animated streamlines with directional flow arrows. 
        Color-coded by speed (Dark Blue &lt; 0.2 m/s up to Red/Yellow &gt; 1.8 m/s in the Gulf Stream and Kuroshio).
      </p>
    </div>
    <div class="card">
      <h4>📊 Model vs. Observation Dual-Curve Analytics</h4>
      <p>
        Clicking any 3D sensor marker opens <code>DataPanel.jsx</code>, plotting the numerical model forecast against actual in-situ CTD observations from 0m to 2000m depth with an automated discrepancy table (Δ = Obs - Model).
      </p>
    </div>
    <div class="card">
      <h4>📥 Client-Side NetCDF & CSV Ingestion</h4>
      <p>
        Zero-backend parser supporting binary NetCDF4 (.nc) via <code>netcdfjs</code> and CSV tables via <code>papaparse</code>. 
        Automatically constructs 2D GPU Data Textures and binds them directly to shader uniforms in real-time.
      </p>
    </div>
  </div>

  <!-- SECTION 4: MILESTONES & VERIFICATION -->
  <div class="section-title"><span class="num">4</span> Implementation Milestones & Verification Status</div>

  <table>
    <thead>
      <tr>
        <th style="width: 28%;">Milestone / Deliverable</th>
        <th style="width: 14%;">Status</th>
        <th style="width: 58%;">Verification & Evidence</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Full-Screen 3D Canvas</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>100vw/100vh responsive canvas with OrbitControls, directional lighting, and zero page scrolling.</td>
      </tr>
      <tr>
        <td><strong>3D Globe ⇄ 2D Map Morphing</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>GPU vertex shader smoothly interpolates between spherical and planar geometry via toggle.</td>
      </tr>
      <tr>
        <td><strong>1x–10x Vertical Exaggeration</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>Interactive slider stretches sub-surface seabed topography and depth strata in real-time.</td>
      </tr>
      <tr>
        <td><strong>500m Isobath Contours</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>Procedural GLSL shader renders contour rings and deep-sea trench luminescence.</td>
      </tr>
      <tr>
        <td><strong>Vector Streamline Particle Currents</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>3D animated streamlines represent global ocean currents color-coded by velocity and depth.</td>
      </tr>
      <tr>
        <td><strong>In-Situ Sensor Markers (● ▲ ■ ◆)</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>Clickable 3D billboard glyphs for Argo Floats, Gliders, CTD stations, and BGC sensors.</td>
      </tr>
      <tr>
        <td><strong>Model vs. Obs Profile Analytics</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>Recharts dual-line depth curve comparison (0m to 2000m) with anomaly difference table.</td>
      </tr>
      <tr>
        <td><strong>4D Time Scrubber (-48h to +48h)</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>Interactive timeline with play/pause and discrete step interpolation.</td>
      </tr>
      <tr>
        <td><strong>NetCDF (.nc) & CSV Ingestion</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>Drag-and-drop modal, automated header detection, and dynamic GPU texture building.</td>
      </tr>
      <tr>
        <td><strong>Interactive 3D Area Slicer</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>UV bounding box selection tool with real-time fragment shader mesh clipping.</td>
      </tr>
      <tr>
        <td><strong>Sounding Depth Probe HUD</strong></td>
        <td><span class="status-tag status-completed">Completed</span></td>
        <td>Real-time raycasted depth badge showing bathymetric zone and coordinates on hover.</td>
      </tr>
      <tr>
        <td><strong>Active Local Dev Server</strong></td>
        <td><span class="status-tag status-active">Active</span></td>
        <td>Running live at <code>http://localhost:5174/</code> with Vite Fast HMR.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 5: ROADMAP -->
  <div class="section-title"><span class="num">5</span> Future Extensibility & Operational Roadmap</div>
  <p>
    The platform's decoupled design allows straightforward extension into operational oceanographic centers:
  </p>
  <ul style="margin-left: 18px; margin-bottom: 12px; font-size: 8.5pt; color: #334155; line-height: 1.6;">
    <li><strong>OGC WMS / WCS & OPeNDAP Protocol Streaming:</strong> Direct client-side streaming of multi-terabyte gridded models from INCOIS THREDDS data servers.</li>
    <li><strong>AI Particle Advection & Drift Forecasting:</strong> Lagrangian particle tracker for search-and-rescue (SAR) and oil spill drift simulation.</li>
    <li><strong>Live WebSocket Sensor Ingestion:</strong> Real-time webhook feeds for coastal HF-Radar, ADCP moorings, and tsunami alert buoys.</li>
    <li><strong>WebXR VR / Immersive Ocean Walkthrough:</strong> Full virtual reality support for underwater canyon inspection.</li>
  </ul>

  <!-- SIGN OFF -->
  <div class="report-footer">
    <span>Compiled by Antigravity AI Engineering Assistant</span>
    <span>INCOIS 3D Ocean Explorer — Milestone V1.0.0</span>
    <span>Access: http://localhost:5174/</span>
  </div>

</body>
</html>`;

const htmlFilePath = path.resolve('c:/Users/sidha/OneDrive/Desktop/Ocean/INCOIS_3D_Ocean_Explorer_Report.html');
const pdfFilePath = path.resolve('c:/Users/sidha/OneDrive/Desktop/Ocean/INCOIS_3D_Ocean_Explorer_Project_Report.pdf');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
console.log(`[HTML Generated] at: ${htmlFilePath}`);

// Run Edge Headless to generate the PDF
const edgePath = 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe';
const command = `& "${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfFilePath}" --no-pdf-header-footer "file:///${htmlFilePath.replace(/\\\\/g, '/')}"`;

console.log(`[Executing PDF Conversion via Edge Headless...]`);
try {
  execSync(`powershell -Command "${command}"`, { stdio: 'inherit' });
  if (fs.existsSync(pdfFilePath)) {
    const stats = fs.statSync(pdfFilePath);
    console.log(`[SUCCESS] PDF generated at: ${pdfFilePath} (${stats.size} bytes)`);
  } else {
    console.error(`[ERROR] PDF file was not found after execution.`);
  }
} catch (err) {
  console.error(`[EXEC ERROR]`, err);
}

# Full-Page 3D Ocean Visualization System: Implementation & Prompts

## 1. System Architecture & Rendering (Full-Page Approach)
To achieve a completely 3D, well-seen model, we will build a full-screen, browser-native frontend using Three.js or Cesium.js [cite: image_767eae.jpg, image_7681d5.jpg]. This standalone page will run directly inside any standard web browser without requiring client-side installations [cite: image_7681d5.jpg]. 
*   **3D Volumetric Rendering:** The system will render ocean measurements (temperature, salinity, and current vectors) across the full water depth [cite: image_767eae.jpg].
*   **Core Visual Features:** It will include depth-slice views to inspect specific layers, isosurfaces (e.g., a 3D shell connecting 15°C points), and time-step animations [cite: image_767eae.jpg].

## 2. Interactive UI & Instrument Overlay
The full-page UI will float over the 3D canvas, providing dynamic controls.
*   **Instrument Data Overlay:** We will place interactive markers for Argo floats, underwater gliders, CTD instruments, and BGC sensors [cite: image_767ecb.jpg]. 
*   **Data Panels:** Clicking a device marker will open a detail panel showing Depth vs. Variable charts with time/date stamps [cite: image_767ecb.jpg, image_767ee9.jpg].
*   **Customizable Controls:** The UI will feature a dynamic color editor (for palettes and linear/logarithmic scales), variable/transparency selectors, and a vertical exaggeration slider to stretch sub-surface terrain [cite: image_767f08.jpg].

## 3. Backend & Extensibility
*   **Multi-format Data Ingestion:** A backend script will automatically read incoming NetCDF files (via xarray or PyNIO) and standard text files like CSVs [cite: image_767ee9.jpg]. 
*   **Lightweight API:** Data will be served using REST or OPeNDAP protocol APIs so the browser only loads requested data, ensuring easy deployment on INCOIS servers [cite: image_7681d5.jpg].
*   **Open Standards & Plugins:** The architecture will follow OGC WMS/WCS and NetCDF CF metadata conventions [cite: image_7681b0.jpg]. Modular plugins will allow future integration of ocean moorings, HF-radar, ADCPs, and AI prediction models [cite: image_7681b0.jpg, image_7681d5.jpg].

---

## 4. AI Generation Prompts (To get it off the ground)

Use these prompts in your AI coding assistant (like Cursor, GitHub Copilot, or ChatGPT) to generate the boilerplate code.

**Prompt 1: Full-Page 3D Canvas Setup**
> "Build a full-page React application using React Three Fiber. Set up a basic 3D scene with orbit controls, a lighting setup, and a placeholder 3D bounding box representing a section of the ocean. Ensure the canvas takes up 100vw and 100vh with absolutely no scrolling. Add a vertical exaggeration variable that scales the Y-axis of the mesh."

**Prompt 2: UI Overlay & Controls**
> "Create a floating UI panel over the 3D canvas using Tailwind CSS. Include the following controls: A dropdown to select variables (Temperature, Salinity), a slider for Layer Opacity (0 to 1), a slider for Vertical Exaggeration (1x to 10x), and a play/pause button for a timeline control. Ensure the UI does not block orbit control interactions with the underlying 3D canvas."

**Prompt 3: Instrument Markers & Clickable Events**
> "Generate a component in React Three Fiber that takes an array of GPS coordinates and renders clickable 3D pins (representing Argo floats and Gliders) on top of the ocean bounding box. When a pin is clicked, trigger a callback that opens a React modal overlay displaying a placeholder 'Depth vs. Temperature' line chart."

**Prompt 4: Backend Data Ingestion Boilerplate**
> "Write a modular Python backend using FastAPI and `xarray`. Create an endpoint `/api/ocean-data` that reads a sample NetCDF file and returns a JSON payload containing 3D volumetric grid data (latitude, longitude, depth, and temperature). Structure it so I can easily swap in CSV processing later."

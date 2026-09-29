// src/App.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import useOceanStore from './store/oceanStore'
import NavigationSidebar from './components/NavigationSidebar'
import GlobeView from './components/GlobeView'
import DashboardView from './components/DashboardView'
import AnalyticsView from './components/AnalyticsView'
import AlertsView from './components/AlertsView'
import CursorWaveOverlay from './components/CursorWaveOverlay'
import './App.css'

export default function App() {
  const currentView        = useOceanStore(s => s.currentView)
  const isSidebarCollapsed = useOceanStore(s => s.isSidebarCollapsed)
  const prevView           = useRef(currentView)
  const contentRef         = useRef(null)

  // Animate content on view change
  useEffect(() => {
    if (prevView.current !== currentView && contentRef.current) {
      contentRef.current.classList.remove('view-enter')
      void contentRef.current.offsetWidth   // force reflow
      contentRef.current.classList.add('view-enter')
    }
    prevView.current = currentView
  }, [currentView])

  const renderView = () => {
    switch (currentView) {
      case 'globe':     return <GlobeView />
      case 'dashboard': return <DashboardView />
      case 'analytics': return <AnalyticsView />
      case 'alerts':    return <AlertsView />
      case 'settings':  return <PlaceholderView title="Settings"       icon="⚙️" desc="Configure visualization preferences & data sources." />
      case 'help':      return <PlaceholderView title="Help & Support"  icon="❓" desc="Documentation, tutorials & support resources." />
      default:          return <DashboardView />
    }
  }

  return (
    <div className="app-shell">
      <CursorWaveOverlay />
      <NavigationSidebar />
      <div
        ref={contentRef}
        className="app-content"
        style={{
          marginLeft: isSidebarCollapsed ? '70px' : '220px',
          transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {renderView()}
      </div>
    </div>
  )
}

function PlaceholderView({ title, icon, desc }) {
  return (
    <div className="placeholder-view">
      <div className="placeholder-card">
        <span className="placeholder-icon">{icon}</span>
        <h1 className="placeholder-title">{title}</h1>
        <p className="placeholder-desc">{desc}</p>
        <div className="placeholder-badge">Coming Soon</div>
      </div>
    </div>
  )
}

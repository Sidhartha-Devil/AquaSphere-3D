// src/components/NavigationSidebar.jsx
import useOceanStore from '../store/oceanStore'
import { LayoutDashboard, Globe, BarChart2, Bell, FolderOpen, HelpCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import './NavigationSidebar.css'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',     icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
  { id: 'globe',     label: '3D Globe View', icon: <Globe size={18} strokeWidth={1.8} /> },
  { id: 'analytics', label: 'Analytics',     icon: <BarChart2 size={18} strokeWidth={1.8} /> },
  { id: 'alerts',    label: 'Alerts',        icon: <Bell size={18} strokeWidth={1.8} /> },
]

export default function NavigationSidebar() {
  const currentView        = useOceanStore(s => s.currentView)
  const setCurrentView     = useOceanStore(s => s.setCurrentView)
  const isSidebarCollapsed = useOceanStore(s => s.isSidebarCollapsed)
  const toggleSidebar      = useOceanStore(s => s.toggleSidebar)
  const setIsUploaderOpen  = useOceanStore(s => s.setIsUploaderOpen)
  const userDataset        = useOceanStore(s => s.userDataset)

  return (
    <nav className={`navigation-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>

      {/* Brand Header with collapse button */}
      <div className="nav-header">
        <img src="/logo.png" className="nav-brand-icon" onClick={toggleSidebar} title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} alt="Logo" style={{width: '28px', height: '28px', objectFit: 'contain'}} />
        {!isSidebarCollapsed && (
          <div className="nav-brand-text">
            <span className="nav-brand-title">Aqua Sphere</span>
            <span className="nav-brand-sub">3D Analytics</span>
          </div>
        )}
        <button 
          className="nav-collapse-btn" 
          onClick={toggleSidebar} 
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Main navigation menu */}
      <div className="nav-menu">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setCurrentView(item.id)}
            title={isSidebarCollapsed ? item.label : undefined}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {!isSidebarCollapsed && <span className="nav-item-label">{item.label}</span>}
          </button>
        ))}

        <div className="nav-divider" />

        {/* Dataset import action button */}
        <button
          className={`nav-item nav-import-btn ${userDataset ? 'has-data' : ''}`}
          onClick={() => setIsUploaderOpen(true)}
          title={isSidebarCollapsed ? (userDataset ? `Active: ${userDataset.meta?.filename || 'Dataset'}` : 'Load Ocean Dataset') : undefined}
        >
          <span className="nav-item-icon">{userDataset ? <Globe size={18} strokeWidth={1.8} /> : <FolderOpen size={18} strokeWidth={1.8} />}</span>
          {!isSidebarCollapsed && (
            <div className="nav-import-text">
              <span className="nav-item-label">Dataset</span>
              <span className="nav-import-badge">
                {userDataset ? 'Active' : 'Import'}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Footer — Help */}
      <div className="nav-footer">
        <button
          className={`nav-item ${currentView === 'help' ? 'active' : ''}`}
          onClick={() => setCurrentView('help')}
          title={isSidebarCollapsed ? 'Help & Support' : undefined}
        >
          <span className="nav-item-icon"><HelpCircle size={18} strokeWidth={1.8} /></span>
          {!isSidebarCollapsed && <span className="nav-item-label">Help &amp; Support</span>}
        </button>
      </div>
    </nav>
  )
}

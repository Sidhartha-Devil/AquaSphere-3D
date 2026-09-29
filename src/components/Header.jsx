// src/components/Header.jsx
import useOceanStore from '../store/oceanStore'
import './Header.css'

export default function Header() {
  const isDataPanelOpen = useOceanStore((s) => s.isDataPanelOpen)

  // Hide header brand if data panel is open on the left so they don't overlap
  if (isDataPanelOpen) return null

  return (
    <header className="ocean-header">
      <div className="brand-badge">
        <div className="brand-logo-icon"><img src="/logo.png" alt="Logo" style={{width: '24px', height: '24px', objectFit: 'contain'}} /></div>
        <div className="brand-info">
          <span className="brand-title">Aqua Sphere</span>
          <span className="brand-tagline">INCOIS Volumetric Ocean System</span>
        </div>
      </div>

    </header>
  )
}

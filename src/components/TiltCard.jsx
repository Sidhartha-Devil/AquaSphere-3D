// src/components/TiltCard.jsx
// Disabled 3D tilt — clean static card, no cursor animation

export default function TiltCard({ children, className = '', onClick, style = {} }) {
  return (
    <div
      className={`tilt-card-root ${className}`}
      onClick={onClick}
      style={style}
    >
      <div className="tilt-card-content" style={{ position: 'relative', zIndex: 3 }}>
        {children}
      </div>
    </div>
  )
}

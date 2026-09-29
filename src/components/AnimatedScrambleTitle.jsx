// src/components/AnimatedScrambleTitle.jsx
// Static clean title — no scramble, no animation

export default function AnimatedScrambleTitle() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.35em',
        userSelect: 'none',
      }}
    >
      <span style={{ color: '#ffffff', fontWeight: 800 }}>Aqua</span>
      <span style={{
        background: 'linear-gradient(135deg, #ffd700 0%, #ffe066 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 800,
      }}>Sphere</span>
    </span>
  )
}

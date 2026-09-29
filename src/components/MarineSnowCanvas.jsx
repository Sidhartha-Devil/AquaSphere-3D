// src/components/MarineSnowCanvas.jsx
// Realistic Bioluminescent Marine Snow & Hydrodynamic Cursor Wake Canvas
import { useEffect, useRef } from 'react'

export default function MarineSnowCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Mouse tracking for fluid disturbance
    const mouse = { x: -1000, y: -1000, vx: 0, vy: 0, prevX: -1000, prevY: -1000, active: false }

    const handleMouseMove = (e) => {
      mouse.vx = (e.clientX - mouse.prevX) * 0.4
      mouse.vy = (e.clientY - mouse.prevY) * 0.4
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.prevX = e.clientX
      mouse.prevY = e.clientY
      mouse.active = true
    }

    const handleMouseLeave = () => {
      mouse.active = false
      mouse.x = -1000
      mouse.y = -1000
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    // Particle pool: Marine snow & bioluminescent dinoflagellates
    const PARTICLE_COUNT = 110
    const particles = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseRadius: Math.random() * 2.2 + 0.8,
        radius: 2,
        baseAlpha: Math.random() * 0.45 + 0.15,
        alpha: 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.45 + 0.15), // Slow upward buoyancy
        wobbleSpeed: Math.random() * 0.03 + 0.01,
        wobbleOffset: Math.random() * Math.PI * 2,
        biolum: 0, // Glow boost when disturbed by cursor
        colorType: Math.random() > 0.4 ? 'cyan' : 'emerald',
      })
    }

    let time = 0

    const render = () => {
      time += 0.02
      ctx.clearRect(0, 0, width, height)

      // Slight mouse velocity decay
      mouse.vx *= 0.92
      mouse.vy *= 0.92

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i]

        // Hydrodynamic interaction with cursor
        if (mouse.active) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 130

          if (dist < maxDist && dist > 1) {
            const force = (1 - dist / maxDist) * 3.5
            const angle = Math.atan2(dy, dx)
            p.vx += Math.cos(angle) * force + mouse.vx * 0.08
            p.vy += Math.sin(angle) * force + mouse.vy * 0.08
            // Ignite bioluminescence
            p.biolum = Math.min(1.0, p.biolum + force * 0.6)
          }
        }

        // Natural buoyancy & horizontal gentle drift
        p.biolum *= 0.95 // decay glow
        p.x += p.vx + Math.sin(time * p.wobbleSpeed + p.wobbleOffset) * 0.35
        p.y += p.vy

        // Damp velocity back to natural buoyancy
        p.vx *= 0.96
        p.vy = p.vy * 0.96 - (0.04 * (p.baseRadius * 0.18))

        // Screen wrap
        if (p.y < -10) {
          p.y = height + 10
          p.x = Math.random() * width
        } else if (p.y > height + 10) {
          p.y = -10
        }
        if (p.x < -10) p.x = width + 10
        else if (p.x > width + 10) p.x = -10

        // Render particle with bioluminescent halo
        const currentAlpha = Math.min(1.0, p.baseAlpha + p.biolum * 0.7)
        const currentRadius = p.baseRadius + p.biolum * 2.5

        const grad = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, currentRadius * 3.2
        )

        if (p.colorType === 'cyan') {
          grad.addColorStop(0, `rgba(0, 240, 255, ${currentAlpha})`)
          grad.addColorStop(0.4, `rgba(0, 180, 255, ${currentAlpha * 0.5})`)
          grad.addColorStop(1, 'rgba(0, 100, 200, 0)')
        } else {
          grad.addColorStop(0, `rgba(0, 255, 170, ${currentAlpha})`)
          grad.addColorStop(0.4, `rgba(0, 200, 140, ${currentAlpha * 0.5})`)
          grad.addColorStop(1, 'rgba(0, 150, 100, 0)')
        }

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, currentRadius * 3.2, 0, Math.PI * 2)
        ctx.fill()
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="marine-snow-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}

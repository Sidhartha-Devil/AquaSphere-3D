// src/components/CursorWaveOverlay.jsx
// Clean pointer tracking & subtle bioluminescent ambient glow
// All intrusive wave lines and circle lines have been removed per user preference.
import { useEffect, useRef } from 'react'

export default function CursorWaveOverlay() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let animId
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = (canvas.width = window.innerWidth * dpr)
    let H = (canvas.height = window.innerHeight * dpr)
    let cssW = window.innerWidth
    let cssH = window.innerHeight

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cssW = window.innerWidth
      cssH = window.innerHeight
      W = canvas.width = cssW * dpr
      H = canvas.height = cssH * dpr
    }
    window.addEventListener('resize', handleResize)

    // Pointer coordinates & speed
    const pointer = {
      x: cssW * 0.5,
      y: cssH * 0.45,
      targetX: cssW * 0.5,
      targetY: cssH * 0.45,
      smoothX: cssW * 0.5,
      smoothY: cssH * 0.45,
      vx: 0,
      vy: 0,
      speed: 0,
      smoothSpeed: 0,
      active: false,
      lastMoveTime: 0,
    }

    // Soft aquatic micro-droplets on fast movement
    const particles = []
    const spawnSpray = (x, y, vx, vy, count = 2) => {
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 1.8
        const spd = (Math.random() * 2.5 + 1.0) * dpr
        const ang = Math.atan2(vy, vx) + Math.PI + spread
        particles.push({
          x: x * dpr + (Math.random() - 0.5) * 8 * dpr,
          y: y * dpr + (Math.random() - 0.5) * 8 * dpr,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.4 * dpr,
          r: (Math.random() * 2.0 + 0.8) * dpr,
          alpha: 0.75,
          life: 1.0,
          decay: 0.024 + Math.random() * 0.016,
          hue: 175 + Math.random() * 35,
        })
      }
      if (particles.length > 50) {
        particles.splice(0, particles.length - 50)
      }
    }

    const onPointerMove = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      const now = performance.now()

      pointer.lastMoveTime = now
      pointer.active = true

      const dx = cx - pointer.targetX
      const dy = cy - pointer.targetY
      const dist = Math.sqrt(dx * dx + dy * dy)

      pointer.targetX = cx
      pointer.targetY = cy

      // Update global CSS custom properties for reactive UI elements and letter animations
      document.documentElement.style.setProperty('--pointer-x', `${cx}px`)
      document.documentElement.style.setProperty('--pointer-y', `${cy}px`)
      document.documentElement.style.setProperty('--wave-intensity', `${Math.min(1.0, dist / 18)}`)

      // Very subtle spray only on fast sweeps
      if (dist > 22) {
        spawnSpray(cx, cy, dx, dy, Math.min(3, Math.floor(dist * 0.12)))
      }
    }

    const onClick = (e) => {
      const cx = e.clientX
      const cy = e.clientY
      pointer.targetX = cx
      pointer.targetY = cy
      pointer.lastMoveTime = performance.now()
      pointer.active = true

      // Gentle spark droplets on click
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.2
        const spd = (Math.random() * 3.5 + 1.2) * dpr
        particles.push({
          x: cx * dpr,
          y: cy * dpr,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.5 * dpr,
          r: (Math.random() * 2.2 + 0.8) * dpr,
          alpha: 0.85,
          life: 1.0,
          decay: 0.020 + Math.random() * 0.012,
          hue: 180 + Math.random() * 30,
        })
      }
    }

    const onPointerLeave = () => {
      pointer.active = false
    }

    window.addEventListener('mousemove', onPointerMove, { passive: true })
    window.addEventListener('touchmove', onPointerMove, { passive: true })
    window.addEventListener('click', onClick, { passive: true })
    window.addEventListener('mouseleave', onPointerLeave)

    let t = 0

    const render = () => {
      t += 0.016
      ctx.clearRect(0, 0, W, H)

      const now = performance.now()
      const timeSinceMove = now - pointer.lastMoveTime
      const isMoving = timeSinceMove < 1800

      // Smooth pointer physics
      const lerp = 0.20
      const prevX = pointer.smoothX
      const prevY = pointer.smoothY
      pointer.smoothX += (pointer.targetX - pointer.smoothX) * lerp
      pointer.smoothY += (pointer.targetY - pointer.smoothY) * lerp

      pointer.vx = (pointer.smoothX - prevX) * 0.6 + pointer.vx * 0.4
      pointer.vy = (pointer.smoothY - prevY) * 0.6 + pointer.vy * 0.4
      const instSpeed = Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy)
      pointer.smoothSpeed += (instSpeed - pointer.smoothSpeed) * 0.15

      const pointerActivity = isMoving
        ? Math.max(0, 1 - timeSinceMove / 1800) * (0.35 + Math.min(1.5, pointer.smoothSpeed * 0.1))
        : 0.08

      const pxDpr = pointer.smoothX * dpr
      const pyDpr = pointer.smoothY * dpr

      // ── Soft Ambient Cursor Water Light (NO lines, NO circle rings) ──
      if (pointerActivity > 0.05) {
        const auraFade = Math.min(1.0, pointerActivity)
        const auraRadius = (22 + Math.min(28, pointer.smoothSpeed * 5)) * dpr * auraFade

        const auraGrad = ctx.createRadialGradient(pxDpr, pyDpr, 0, pxDpr, pyDpr, auraRadius)
        auraGrad.addColorStop(0, `rgba(0, 240, 255, ${0.22 * auraFade})`)
        auraGrad.addColorStop(0.45, `rgba(0, 180, 255, ${0.08 * auraFade})`)
        auraGrad.addColorStop(1, 'transparent')

        ctx.fillStyle = auraGrad
        ctx.beginPath()
        ctx.arc(pxDpr, pyDpr, auraRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Gentle Spark Droplets (Rendered as soft glowing points) ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.94
        p.vy += 0.03 * dpr
        p.life -= p.decay

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        const alpha = p.life * p.alpha
        const rad = Math.max(0.5 * dpr, p.r * p.life)
        const dg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 3)
        dg.addColorStop(0, `hsla(${p.hue}, 100%, 92%, ${alpha})`)
        dg.addColorStop(0.5, `hsla(${p.hue}, 95%, 72%, ${alpha * 0.5})`)
        dg.addColorStop(1, 'transparent')
        ctx.fillStyle = dg
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('click', onClick)
      window.removeEventListener('mouseleave', onPointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="cursor-wave-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}

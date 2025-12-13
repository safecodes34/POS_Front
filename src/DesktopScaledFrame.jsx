import React, { useEffect, useMemo, useState } from 'react'

/**
 * DesktopScaledFrame Component
 * 
 * Wraps the app in an iframe with a fixed desktop viewport width (1920px).
 * This ensures all CSS media queries and Tailwind breakpoints evaluate against
 * the fixed desktop width, not the actual device viewport.
 * 
 * The iframe viewport height matches the screen height (scaled), so the footer
 * can be fixed at the bottom and always visible. Scrolling happens inside the iframe.
 */
export default function DesktopScaledFrame() {
  const DESIGN_W = 1920
  
  // Allow upscaling so wide monitors don't get side gutters
  // 4K (3840/1920 = 2) fits fine, so MAX_SCALE = 3 is safe
  const MAX_SCALE = 3

  const [scale, setScale] = useState(1)
  const [frameH, setFrameH] = useState(900)

  // Redirect parent window to /Menu if on root or /menu, and /transactions to /Transactions
  useEffect(() => {
    const pathname = window.location.pathname
    if (pathname === '/' || pathname === '' || pathname === '/menu') {
      const newUrl = new URL(window.location.href)
      newUrl.pathname = '/Menu'
      window.history.replaceState({}, '', newUrl.toString())
    } else if (pathname === '/transactions') {
      const newUrl = new URL(window.location.href)
      newUrl.pathname = '/Transactions'
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [])

  // Create iframe src with embed=1 parameter
  const src = useMemo(() => {
    const u = new URL(window.location.href)
    // Ensure pathname is /Menu if it was / or /menu, and /Transactions if it was /transactions
    if (u.pathname === '/' || u.pathname === '' || u.pathname === '/menu') {
      u.pathname = '/Menu'
    } else if (u.pathname === '/transactions') {
      u.pathname = '/Transactions'
    }
    u.searchParams.set('embed', '1')
    return u.toString()
  }, [])

  // Calculate scale and iframe viewport height
  useEffect(() => {
    const compute = () => {
      const vw = document.documentElement.clientWidth
      const vh = window.visualViewport?.height ?? window.innerHeight

      // Scale to fit width exactly (no side gutters)
      const s = Math.min(vw / DESIGN_W, MAX_SCALE)
      setScale(s)

      // Floor so scaled height never exceeds viewport (prevents footer overflow)
      // Subtract 1px for additional safety margin on some devices
      setFrameH(Math.max(600, Math.floor(vh / s) - 1))
    }
    
    compute()
    
    window.addEventListener('resize', compute)
    const vv = window.visualViewport
    vv?.addEventListener('resize', compute)
    
    return () => {
      window.removeEventListener('resize', compute)
      vv?.removeEventListener('resize', compute)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',     // No parent scroll - scrolling happens inside iframe
        background: '#e8e8e8',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ width: DESIGN_W * scale, height: frameH * scale, position: 'relative' }}>
        <iframe
          title="desktop-ui"
          src={src}
          style={{
            width: DESIGN_W,
            height: frameH,
            border: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            background: 'white',
          }}
        />
      </div>
    </div>
  )
}


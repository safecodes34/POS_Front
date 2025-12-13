import React, { useLayoutEffect, useRef, useState, useMemo } from 'react'
import './ScaleToFit.css'

/**
 * ScaleToFit Component
 * 
 * Wraps the entire app in a fixed design canvas and scales it proportionally
 * to fit any viewport size while maintaining the exact same layout.
 * 
 * Auto-measures the actual content height to prevent bottom clipping.
 * Uses a two-layer approach:
 * - Stage: Has real (scaled) dimensions so centering works correctly
 * - Canvas: Stays at design size, scaled visually via transform
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The content to scale
 * @param {number} props.designWidth - Reference design width (default: 1920)
 * @param {number} props.maxScale - Maximum scale factor (default: 1, prevents upscaling)
 * @param {string} props.background - Background color (default: '#e8e8e8')
 */
const ScaleToFit = ({
  children,
  designWidth = 1920,
  maxScale = 1,
  background = '#e8e8e8',
}) => {
  const canvasRef = useRef(null)
  const [designHeight, setDesignHeight] = useState(1080)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const measureAndScale = () => {
      const vw = window.visualViewport?.width ?? window.innerWidth
      const vh = window.visualViewport?.height ?? window.innerHeight

      // Measure actual content height (scrollHeight gives us the real content size)
      let measuredH = designHeight
      if (canvasRef.current) {
        // scrollHeight gives the full content height, unaffected by transform scale
        const contentHeight = canvasRef.current.scrollHeight || 0
        measuredH = Math.max(contentHeight, designHeight)
        
        // Update designHeight if content is taller
        if (measuredH > designHeight) {
          setDesignHeight(measuredH)
        }
      }

      // Calculate scale using measured height
      const s = Math.min(vw / designWidth, vh / measuredH, maxScale)
      setScale(s)
    }

    // Initial measurement
    measureAndScale()
    
    // Use ResizeObserver to detect content height changes
    const resizeObserver = new ResizeObserver(() => {
      measureAndScale()
    })
    
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current)
    }

    window.addEventListener('resize', measureAndScale)
    const vv = window.visualViewport
    vv?.addEventListener('resize', measureAndScale)
    vv?.addEventListener('scroll', measureAndScale)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', measureAndScale)
      vv?.removeEventListener('resize', measureAndScale)
      vv?.removeEventListener('scroll', measureAndScale)
    }
  }, [designWidth, designHeight, maxScale])

  const stage = useMemo(
    () => ({
      width: designWidth * scale,
      height: designHeight * scale,
    }),
    [designWidth, designHeight, scale]
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background,
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {/* Stage: real (scaled) size so centering is correct */}
      <div style={{ position: 'relative', width: stage.width, height: stage.height }}>
        {/* Canvas: fixed design size, scaled visually */}
        <div
          ref={canvasRef}
          style={{
            width: designWidth,
            minHeight: designHeight,
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export default ScaleToFit


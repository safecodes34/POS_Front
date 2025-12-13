import { useLayoutEffect } from 'react'

/**
 * Hook to dynamically measure footer height and set CSS variable
 * This ensures the scroll container ends exactly where the footer begins,
 * regardless of padding, borders, or font scaling.
 * 
 * Uses a default height in CSS (100px) to prevent layout shift on initial render,
 * then measures and updates to the exact height once the footer is rendered.
 */
export function useFooterHeightVar() {
  useLayoutEffect(() => {
    const findFooter = () => {
      return document.querySelector('.bottom-nav') || document.querySelector('.navigation-footer')
    }

    const setVar = (footer) => {
      if (!footer) return false
      const h = footer.getBoundingClientRect().height
      if (h > 0) {
        const currentValue = document.documentElement.style.getPropertyValue('--footer-h')
        const newValue = `${h}px`
        // Only update if the value actually changed to avoid unnecessary reflows
        if (currentValue !== newValue) {
          document.documentElement.style.setProperty('--footer-h', newValue)
          // Force a layout recalculation to ensure dependent styles update
          void footer.offsetHeight
        }
        return true
      }
      return false
    }

    // Retry function with exponential backoff
    const retryMeasurement = (footer, attempt = 0, maxAttempts = 10) => {
      if (attempt >= maxAttempts) {
        console.warn('useFooterHeightVar: Max retry attempts reached, footer height may be incorrect')
        return
      }

      // Try to measure
      const success = setVar(footer)
      
      if (!success) {
        // If measurement failed, retry after a delay
        // Use increasing delays: 0ms, 16ms, 32ms, 64ms, etc.
        const delay = Math.min(16 * Math.pow(2, attempt), 250)
        setTimeout(() => {
          retryMeasurement(footer, attempt + 1, maxAttempts)
        }, delay)
      }
    }

    // Find footer - useLayoutEffect runs after DOM mutations, so footer should exist
    let footer = findFooter()
    
    if (!footer) {
      // If footer not found immediately, try multiple times
      let retryCount = 0
      let resizeObserver = null
      let handleResize = null
      
      const findFooterRetry = () => {
        footer = findFooter()
        if (footer) {
          retryMeasurement(footer)
          // Set up observers
          resizeObserver = new ResizeObserver(() => setVar(footer))
          resizeObserver.observe(footer)
          handleResize = () => setVar(footer)
          window.addEventListener('resize', handleResize)
        } else if (retryCount < 20) {
          retryCount++
          requestAnimationFrame(findFooterRetry)
        }
      }
      requestAnimationFrame(findFooterRetry)
      return () => {
        if (resizeObserver) {
          resizeObserver.disconnect()
        }
        if (handleResize) {
          window.removeEventListener('resize', handleResize)
        }
      }
    }

    // Footer found - measure immediately, with retries if needed
    retryMeasurement(footer)
    
    // Update on resize/change
    const ro = new ResizeObserver(() => setVar(footer))
    ro.observe(footer)

    const handleResize = () => setVar(footer)
    window.addEventListener('resize', handleResize)
    
    // Also listen for window load to catch any late-rendering elements
    const handleLoad = () => {
      setTimeout(() => setVar(footer), 0)
    }
    if (document.readyState === 'complete') {
      // Already loaded, measure immediately
      setTimeout(() => setVar(footer), 0)
    } else {
      window.addEventListener('load', handleLoad, { once: true })
    }
    
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('load', handleLoad)
    }
  }, [])
}


import { useEffect } from 'react'

/**
 * Hook to post the current document height to parent window
 * Used when app is embedded in an iframe to communicate height for scaling
 * 
 * @param {boolean} enabled - Whether to enable height posting
 */
export function usePostEmbedHeight(enabled) {
  useEffect(() => {
    if (!enabled) return

    const send = () => {
      const h =
        document.documentElement.scrollHeight ||
        document.body.scrollHeight ||
        1080
      window.parent.postMessage({ type: 'EMBED_HEIGHT', height: h }, '*')
    }

    send()

    const ro = new ResizeObserver(() => send())
    ro.observe(document.documentElement)
    ro.observe(document.body)

    window.addEventListener('load', send)
    window.addEventListener('resize', send)

    return () => {
      ro.disconnect()
      window.removeEventListener('load', send)
      window.removeEventListener('resize', send)
    }
  }, [enabled])
}





import { useEffect, useRef } from 'react'

export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.requestFullscreen?.().catch(() => {
      // Fullscreen can be denied (e.g. no user gesture yet, or unsupported
      // browser) — the game still works windowed if so.
    })

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
  }, [])

  return ref
}

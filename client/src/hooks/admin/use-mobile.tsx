import * as React from "react"

const MOBILE_BREAKPOINT = 960
const TABLET_BREAKPOINT = 1280

export type Viewport = 'mobile' | 'tablet' | 'desktop'

export interface ViewportInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  viewport: Viewport
  width: number
  height: number
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useMobileViewport(): ViewportInfo {
  const [viewportInfo, setViewportInfo] = React.useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        viewport: 'desktop',
        width: 1024,
        height: 768
      }
    }
    
    const width = window.innerWidth
    const height = window.innerHeight
    const isMobile = width < MOBILE_BREAKPOINT
    const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
    const isDesktop = width >= TABLET_BREAKPOINT
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      viewport: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      width,
      height
    }
  })

  React.useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isMobile = width < MOBILE_BREAKPOINT
      const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
      const isDesktop = width >= TABLET_BREAKPOINT
      
      setViewportInfo({
        isMobile,
        isTablet,
        isDesktop,
        viewport: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        width,
        height
      })
    }

    window.addEventListener('resize', updateViewport)
    updateViewport() // Set initial value
    
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  return viewportInfo
}

export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export function useSafeArea(): SafeAreaInsets {
  const [safeArea, setSafeArea] = React.useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  React.useEffect(() => {
    const updateSafeArea = () => {
      // Try to get CSS env() values for safe area insets
      const computedStyle = getComputedStyle(document.documentElement)
      
      const top = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10)
      const right = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10)
      const bottom = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10)
      const left = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10)
      
      setSafeArea({ top, right, bottom, left })
    }

    // Check for CSS env() support
    if (CSS.supports('padding: env(safe-area-inset-top)')) {
      updateSafeArea()
      window.addEventListener('resize', updateSafeArea)
      window.addEventListener('orientationchange', updateSafeArea)
      
      return () => {
        window.removeEventListener('resize', updateSafeArea)
        window.removeEventListener('orientationchange', updateSafeArea)
      }
    }
  }, [])

  return safeArea
}

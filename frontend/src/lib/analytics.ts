declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
    clarity?: ClarityFn
  }
}

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] }

const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim()

let analyticsInitialized = false

const appendScript = (id: string, src: string, async = true) => {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.src = src
  script.async = async
  document.head.appendChild(script)
}

export const initializeAnalytics = () => {
  if (analyticsInitialized || typeof window === 'undefined' || typeof document === 'undefined') return

  if (gaMeasurementId) {
    appendScript('ga-script', `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`)
    window.dataLayer = window.dataLayer || []
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args)
    }
    window.gtag('js', new Date())
    window.gtag('config', gaMeasurementId, { send_page_view: false })
  }

  if (clarityProjectId) {
    const clarityQueue: ClarityFn = (...args: unknown[]) => {
      clarityQueue.q = clarityQueue.q || []
      clarityQueue.q.push(args)
    }
    window.clarity = window.clarity ?? clarityQueue
    appendScript('clarity-script', `https://www.clarity.ms/tag/${clarityProjectId}`)
  }

  analyticsInitialized = true
}

export const trackPageView = (path: string) => {
  initializeAnalytics()

  if (gaMeasurementId && window.gtag) {
    window.gtag('config', gaMeasurementId, { page_path: path })
  }

  if (clarityProjectId && window.clarity) {
    window.clarity('set', 'page', path)
  }
}

export const trackEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  initializeAnalytics()

  if (gaMeasurementId && window.gtag) {
    window.gtag('event', eventName, parameters ?? {})
  }

  if (clarityProjectId && window.clarity) {
    window.clarity('event', eventName)
    if (parameters) {
      Object.entries(parameters).forEach(([key, value]) => {
        window.clarity?.('set', key, String(value))
      })
    }
  }
}

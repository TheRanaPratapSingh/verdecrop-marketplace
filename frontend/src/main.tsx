import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'
import { initializeAnalytics } from './lib/analytics'

// Only initialise analytics in the real browser (not during prerender)
if (typeof window !== 'undefined' && !navigator.userAgent.includes('jsdom')) {
  initializeAnalytics()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
)

// Signal vite-plugin-prerender that the app has fully mounted.
// The prerenderer listens for this event before snapshotting the DOM.
if (typeof document !== 'undefined') {
  document.dispatchEvent(new Event('render-event'))
}

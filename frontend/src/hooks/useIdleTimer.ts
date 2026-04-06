import { useEffect, useRef, useCallback } from 'react'

const IDLE_TIMEOUT_MS  = 10 * 60 * 1000  // 10 minutes → auto-logout
const WARN_TIMEOUT_MS  =  9 * 60 * 1000  //  9 minutes → show warning

// Activity events that reset the idle timer
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
  'click',
  'focus',
]

interface UseIdleTimerOptions {
  enabled: boolean
  onWarn: () => void       // called at 9 min mark
  onLogout: () => void     // called at 10 min mark
  onActivity: () => void   // called whenever activity resets the timer
}

export function useIdleTimer({ enabled, onWarn, onLogout, onActivity }: UseIdleTimerOptions) {
  const warnTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep stable refs to callbacks so event listeners don't need re-registration
  const onWarnRef    = useRef(onWarn)
  const onLogoutRef  = useRef(onLogout)
  const onActivityRef = useRef(onActivity)

  useEffect(() => { onWarnRef.current    = onWarn    }, [onWarn])
  useEffect(() => { onLogoutRef.current  = onLogout  }, [onLogout])
  useEffect(() => { onActivityRef.current = onActivity }, [onActivity])

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current)   { clearTimeout(warnTimerRef.current);   warnTimerRef.current   = null }
    if (logoutTimerRef.current) { clearTimeout(logoutTimerRef.current); logoutTimerRef.current = null }
  }, [])

  const resetTimers = useCallback(() => {
    clearTimers()
    warnTimerRef.current   = setTimeout(() => onWarnRef.current(),   WARN_TIMEOUT_MS)
    logoutTimerRef.current = setTimeout(() => onLogoutRef.current(), IDLE_TIMEOUT_MS)
  }, [clearTimers])

  const handleActivity = useCallback(() => {
    onActivityRef.current()
    resetTimers()
  }, [resetTimers])

  useEffect(() => {
    if (!enabled) { clearTimers(); return }

    // Start timers immediately on mount / when auth flips on
    resetTimers()

    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, handleActivity, { passive: true })
    )

    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, handleActivity)
      )
    }
  }, [enabled, resetTimers, handleActivity, clearTimers])
}

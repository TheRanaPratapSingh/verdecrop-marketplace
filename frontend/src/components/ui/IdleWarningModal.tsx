import React, { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from './index'

interface IdleWarningModalProps {
  isOpen: boolean
  onStayLoggedIn: () => void
  onLogoutNow: () => void
}

export const IdleWarningModal: React.FC<IdleWarningModalProps> = ({
  isOpen,
  onStayLoggedIn,
  onLogoutNow,
}) => {
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (!isOpen) { setCountdown(60); return }

    setCountdown(60)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm animate-scale-in p-6 flex flex-col items-center text-center gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <Clock className="w-7 h-7 text-amber-600" strokeWidth={1.75} />
        </div>

        {/* Heading */}
        <div>
          <h2 className="font-display font-semibold text-xl text-stone-900 mb-1">
            Still there?
          </h2>
          <p className="text-sm font-body text-stone-600 leading-relaxed">
            You will be logged out in{' '}
            <span className="font-bold text-amber-600">{countdown}s</span>{' '}
            due to inactivity.
          </p>
        </div>

        {/* Countdown ring */}
        <div className="relative w-16 h-16">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeDasharray={`${(countdown / 60) * 100} 100`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s linear' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-stone-900 text-lg">
            {countdown}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 w-full">
          <Button className="w-full" size="md" onClick={onStayLoggedIn}>
            I'm still here
          </Button>
          <Button className="w-full" size="md" variant="ghost" onClick={onLogoutNow}>
            Log out now
          </Button>
        </div>
      </div>
    </div>
  )
}

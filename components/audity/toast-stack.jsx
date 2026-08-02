'use client'

import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { cn } from '@/lib/utils'

const TONES = {
  success: { cls: 'border-success/50 bg-success/10 text-success', Icon: Check },
  warning: { cls: 'border-warning/50 bg-warning/10 text-warning', Icon: AlertTriangle },
  error: { cls: 'border-destructive/50 bg-destructive/10 text-destructive', Icon: AlertTriangle },
  info: { cls: 'border-border-strong bg-surface text-foreground', Icon: Info },
}

export function ToastStack() {
  const { toasts, dismissToast } = useAudity()
  if (!toasts.length) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-200 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((t) => {
        const { cls, Icon } = TONES[t.tone] || TONES.info
        return (
          <div key={t.id} className={cn('flex items-start gap-2.5 border bg-surface px-3 py-2.5', cls)}>
            <Icon className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            <p className="flex-1 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em]">
              {t.message}
            </p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="cursor-pointer text-current/70 transition-opacity hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

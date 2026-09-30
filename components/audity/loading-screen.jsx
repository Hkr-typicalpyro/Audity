'use client'

import { useState, useEffect } from 'react'
import { Button, MicroLabel } from '@/components/audity/ui-kit'
import { Loader2 } from 'lucide-react'

export function LoadingScreen({ error = false, onRetry }) {
  const [slowInit, setSlowInit] = useState(false)

  useEffect(() => {
    if (error) return
    const timer = setTimeout(() => setSlowInit(true), 3000)
    return () => clearTimeout(timer)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 text-center px-4">
      <div className="space-y-2">
        <h1 className="font-mono text-3xl font-bold uppercase tracking-widest text-foreground">
          Audity
        </h1>
        <MicroLabel className="block">
          {error 
            ? 'Connection Error' 
            : slowInit 
              ? 'Waking up services…' 
              : 'Initialising Audity…'}
        </MicroLabel>
      </div>

      {error ? (
        <div className="space-y-6">
          <p className="text-sm font-mono text-muted-foreground">
            Unable to connect to Audity services.
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Retry Connection
            </Button>
          )}
        </div>
      ) : (
        <Loader2 className="h-6 w-6 animate-spin text-primary opacity-80" />
      )}
    </div>
  )
}

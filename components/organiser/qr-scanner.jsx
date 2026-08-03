'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CameraOff, CheckCircle2, Loader2, ScanLine, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { Button, Field, Input, MicroLabel, Modal, PixelDivider } from '@/components/audity/ui-kit'
import { cn } from '@/lib/utils'

function extractTicketReference(rawText) {
  if (!rawText) return ''
  const cleaned = String(rawText).trim()
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const obj = JSON.parse(cleaned)
      if (obj.t) return String(obj.t).trim()
    } catch (e) {
      // Ignore JSON parse error, treat as simple string
    }
  }
  return cleaned
}

function formatCameraError(err) {
  const msg = typeof err === 'string' ? err : err?.name || err?.message || ''
  if (msg.includes('NotAllowedError') || msg.includes('Permission') || msg.includes('permission')) {
    return 'Camera permission is required to scan tickets. Please allow camera access in your browser or device settings.'
  }
  if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError') || msg.includes('no camera') || msg.includes('Requested device not found')) {
    return 'No supported camera detected on this device. You can proceed using manual ticket entry below.'
  }
  if (msg.includes('NotReadableError') || msg.includes('in use') || msg.includes('TrackStartError')) {
    return 'Camera hardware is currently in use by another application or background browser tab.'
  }
  if (msg.includes('InsecureContextError') || msg.includes('insecure') || (typeof window !== 'undefined' && window.location && !window.location.protocol.startsWith('https') && window.location.hostname !== 'localhost')) {
    return 'Real camera access requires a secure HTTPS browser connection.'
  }
  return 'Unable to initialize device camera. Please check device permissions or use manual code fallback below.'
}

export function QrScannerModal({ open, onClose }) {
  const { checkInTicket, getEvent } = useAudity()
  const [ticketId, setTicketId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  
  // Camera lifecycle state: IDLE, STARTING, RUNNING, ERROR
  const [cameraState, setCameraState] = useState('IDLE')
  const [cameraError, setCameraError] = useState('')

  const scannerRef = useRef(null)
  const isProcessingRef = useRef(false)

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch (err) {
        // Suppress benign cleanup exceptions
      }
    }
    setCameraState((prev) => (prev === 'RUNNING' || prev === 'STARTING' ? 'IDLE' : prev))
  }, [])

  const onScanSuccess = useCallback(async (decodedText) => {
    if (isProcessingRef.current || busy) return
    isProcessingRef.current = true
    setBusy(true)
    setResult(null)

    // Stop and freeze scanner viewfinder upon detection to avoid repetitive API requests
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        console.error('Failed to pause camera after detection:', err)
      }
    }
    setCameraState('IDLE')

    const refId = extractTicketReference(decodedText)
    if (!refId) {
      setResult({ ok: false, message: 'UNREADABLE TICKET PAYLOAD', code: 'INVALID' })
      setBusy(false)
      isProcessingRef.current = false
      return
    }

    try {
      const res = await checkInTicket(refId)
      setResult(res)
      if (res?.ok) setTicketId('')
    } catch (err) {
      setResult({ ok: false, message: err.message || 'CHECK-IN VALIDATION FAILED', code: 'ERROR' })
    } finally {
      setBusy(false)
      isProcessingRef.current = false
    }
  }, [busy, checkInTicket])

  const startCamera = useCallback(async () => {
    if (isProcessingRef.current) return
    setCameraState('STARTING')
    setCameraError('')
    setResult(null)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) await scannerRef.current.stop()
          scannerRef.current.clear()
        } catch (e) {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode('audity-qr-reader', { verbose: false })
      scannerRef.current = html5QrCode

      const scanConfig = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.333334,
      }

      const onScanIgnore = () => {} // No-op on inter-frame misses

      try {
        // First try rear/environment camera (optimal for mobile scanning)
        await html5QrCode.start({ facingMode: 'environment' }, scanConfig, onScanSuccess, onScanIgnore)
        setCameraState('RUNNING')
        setCameraError('')
      } catch (err1) {
        try {
          // Graceful fallback to user/webcam if environment sensor unavailable (e.g. desktops)
          await html5QrCode.start({ facingMode: 'user' }, scanConfig, onScanSuccess, onScanIgnore)
          setCameraState('RUNNING')
          setCameraError('')
        } catch (err2) {
          try {
            // Final fallback to generic video device without facing constraint
            await html5QrCode.start(true, scanConfig, onScanSuccess, onScanIgnore)
            setCameraState('RUNNING')
            setCameraError('')
          } catch (err3) {
            setCameraState('ERROR')
            setCameraError(formatCameraError(err3 || err2 || err1))
          }
        }
      }
    } catch (err) {
      setCameraState('ERROR')
      setCameraError(formatCameraError(err))
    }
  }, [onScanSuccess])

  // Cleanup on modal close or unmount
  useEffect(() => {
    if (!open) {
      stopCamera()
      setResult(null)
      setTicketId('')
      setCameraError('')
      isProcessingRef.current = false
    }
  }, [open, stopCamera])

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {}).finally(() => scannerRef.current?.clear())
          } else {
            scannerRef.current.clear()
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [])

  // Guarantee camera releases if tab backgrounded or window unloaded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (cameraState === 'RUNNING' || cameraState === 'STARTING')) {
        stopCamera()
      }
    }
    const handleBeforeUnload = () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [cameraState, stopCamera])

  function verifyManual() {
    const raw = ticketId.trim()
    if (!raw) {
      setResult({ ok: false, message: 'ENTER A TICKET ID', code: 'INVALID' })
      return
    }
    if (cameraState === 'RUNNING' || cameraState === 'STARTING') {
      stopCamera()
    }
    setBusy(true)
    setResult(null)
    const refId = extractTicketReference(raw)

    setTimeout(async () => {
      const res = await checkInTicket(refId)
      setResult(res)
      setBusy(false)
      if (res?.ok) setTicketId('')
    }, 400)
  }

  function handleScanNext() {
    setResult(null)
    setTicketId('')
    isProcessingRef.current = false
    startCamera()
  }

  return (
    <Modal open={open} onClose={onClose} title="Gate QR check-in" width="max-w-md">
      <div className="space-y-4">
        {/* Section 1: Real Camera Scanner Viewport */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <MicroLabel className="text-primary">01 / CAMERA SCAN</MicroLabel>
            {(cameraState === 'RUNNING' || cameraState === 'STARTING') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={stopCamera}
                className="h-6 px-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
              >
                Stop camera
              </Button>
            )}
          </div>

          <div className="relative aspect-4/3 w-full overflow-hidden border border-border-strong bg-background pixel-grid">
            {/* Dedicated DOM host container for HTML5 QR reader video feed */}
            <div
              id="audity-qr-reader"
              className={cn(
                'h-full w-full overflow-hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover',
                cameraState !== 'RUNNING' ? 'invisible' : 'visible',
              )}
            />

            {/* Audity visual scanning frame & HUD overlay when active */}
            {cameraState === 'RUNNING' && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 scanline opacity-60" />
                <div className="absolute inset-8 sm:inset-12 border border-primary/40">
                  <span className="absolute -left-px -top-px h-5 w-5 border-l-2 border-t-2 border-primary" />
                  <span className="absolute -right-px -top-px h-5 w-5 border-r-2 border-t-2 border-primary" />
                  <span className="absolute -bottom-px -left-px h-5 w-5 border-b-2 border-l-2 border-primary" />
                  <span className="absolute -bottom-px -right-px h-5 w-5 border-b-2 border-r-2 border-primary" />
                  <div
                    className="absolute left-0 top-0 h-[2px] w-full bg-primary/80 animate-scan"
                    style={{ animationDuration: '2.2s' }}
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-border bg-background/85 px-3 py-1.5">
                  <MicroLabel className="text-foreground">Live optic sensor · GATE 1</MicroLabel>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
                    <span className="h-1.5 w-1.5 animate-blink bg-primary" />
                    Scanning
                  </span>
                </div>
              </div>
            )}

            {/* IDLE state standby prompt */}
            {cameraState === 'IDLE' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/95 p-4 text-center">
                <div className="grid h-12 w-12 place-items-center border border-primary/40 bg-primary/10 text-primary">
                  <Camera className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <MicroLabel className="block text-foreground">Optic Scanner Offline</MicroLabel>
                  <p className="mt-1 max-w-[250px] text-xs leading-relaxed text-muted-foreground">
                    Activate device camera to scan attendee QR passes in real time at entry gates.
                  </p>
                </div>
                <Button size="sm" onClick={startCamera} disabled={busy}>
                  <Camera className="mr-1.5 h-3.5 w-3.5" />
                  Start camera
                </Button>
              </div>
            )}

            {/* STARTING state feedback */}
            {cameraState === 'STARTING' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-background/95 p-4 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <MicroLabel className="text-foreground">Initialising optic sensor…</MicroLabel>
                <p className="max-w-[220px] text-xs text-muted-foreground">
                  Please grant browser camera permission when prompted.
                </p>
              </div>
            )}

            {/* ERROR state feedback & controlled fallback */}
            {cameraState === 'ERROR' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-destructive/10 border-destructive/30 p-4 text-center">
                <AlertCircle className="h-7 w-7 text-destructive" />
                <div>
                  <MicroLabel className="text-destructive">Camera Unavailable</MicroLabel>
                  <p className="mt-1 max-w-[270px] text-xs leading-relaxed text-muted-foreground">
                    {cameraError}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={startCamera} disabled={busy}>
                    <RefreshCw className="mr-1.5 h-3 w-3" />
                    Retry camera
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCameraState('IDLE')}>
                    Close viewer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <PixelDivider />

        {/* Section 2: Manual Code Fallback Entry */}
        <div>
          <MicroLabel className="mb-2 block text-muted-foreground">02 / MANUAL CODE FALLBACK</MicroLabel>
          <Field label="Manual ticket ID" hint="Type or paste reference code if QR pass cannot be optically read">
            <Input
              placeholder="AUD-XXXX-XXXX"
              value={ticketId}
              disabled={busy}
              onChange={(e) => setTicketId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) verifyManual()
              }}
            />
          </Field>
          <Button className="mt-2 w-full" variant="outline" disabled={busy || !ticketId.trim()} onClick={verifyManual}>
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Verifying backend…
              </>
            ) : (
              <>
                <ScanLine className="mr-1.5 h-3.5 w-3.5" />
                Submit manual check-in
              </>
            )}
          </Button>
        </div>

        {/* Section 3: Authoritative Backend Check-in Result Banner */}
        {result && (
          <div className="space-y-3 pt-1">
            <div
              className={cn(
                'flex items-start gap-2.5 border px-3 py-3',
                result.ok
                  ? 'border-success/50 bg-success/10'
                  : result.code === 'DUPLICATE'
                    ? 'border-warning/50 bg-warning/10'
                    : 'border-destructive/50 bg-destructive/10',
              )}
            >
              {result.ok ? (
                <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-success" />
              ) : (
                <XCircle
                  className={cn(
                    'mt-px h-4 w-4 shrink-0',
                    result.code === 'DUPLICATE' ? 'text-warning' : 'text-destructive',
                  )}
                />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-mono text-[11px] uppercase font-bold tracking-[0.16em]',
                    result.ok
                      ? 'text-success'
                      : result.code === 'DUPLICATE'
                        ? 'text-warning'
                        : 'text-destructive',
                  )}
                >
                  {result.message || (result.ok ? 'CHECK-IN SUCCESSFUL' : 'CHECK-IN REJECTED')}
                </p>
                {result.ticket && (
                  <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground break-words">
                    <span className="font-semibold text-foreground">{result.ticket.attendeeName}</span> · {result.ticket.quantity} seat(s) ·{' '}
                    {getEvent(result.ticket.eventId)?.title || `Event Ref: ${result.ticket.eventId?.slice(-6) || ''}`}
                    <div className="font-mono text-[10px] text-primary/80 mt-0.5">
                      REF: {result.ticket.id || result.ticket.customId}
                    </div>
                  </div>
                )}
                {!result.ok && result.code === 'INVALID' && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    No matching registration found in complex MongoDB ledger.
                  </p>
                )}
                {!result.ok && result.code === 'CANCELLED' && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    This ticket registration was cancelled prior to event start.
                  </p>
                )}
                {!result.ok && result.code === 'DUPLICATE' && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Pass already validated at gate scanner. Duplicate entry refused.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="w-full font-bold uppercase tracking-wider text-xs py-2.5" onClick={handleScanNext}>
                <ScanLine className="mr-1.5 h-4 w-4" />
                Scan next ticket
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

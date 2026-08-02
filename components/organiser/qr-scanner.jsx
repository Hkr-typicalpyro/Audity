'use client'

import { useState } from 'react'
import { CameraOff, CheckCircle2, Loader2, ScanLine, XCircle } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { Button, Field, Input, MicroLabel, Modal, PixelDivider } from '@/components/audity/ui-kit'
import { cn } from '@/lib/utils'

export function QrScannerModal({ open, onClose }) {
  const { checkInTicket, getEvent } = useAudity()
  const [ticketId, setTicketId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  function verify() {
    if (!ticketId.trim()) {
      setResult({ ok: false, message: 'ENTER A TICKET ID', code: 'INVALID' })
      return
    }
    setBusy(true)
    setResult(null)
    setTimeout(() => {
      const res = checkInTicket(ticketId)
      setResult(res)
      setBusy(false)
      if (res.ok) setTicketId('')
    }, 850)
  }

  return (
    <Modal open={open} onClose={onClose} title="Gate QR check-in" width="max-w-md">
      <div className="space-y-4">
        {/* mock camera viewport */}
        <div className="relative aspect-4/3 w-full overflow-hidden border border-border-strong bg-background pixel-grid">
          <div className="absolute inset-0 scanline opacity-70" />
          <div className="absolute inset-8 border border-primary/40">
            <span className="absolute -left-px -top-px h-5 w-5 border-l-2 border-t-2 border-primary" />
            <span className="absolute -right-px -top-px h-5 w-5 border-r-2 border-t-2 border-primary" />
            <span className="absolute -bottom-px -left-px h-5 w-5 border-b-2 border-l-2 border-primary" />
            <span className="absolute -bottom-px -right-px h-5 w-5 border-b-2 border-r-2 border-primary" />
            <div className="absolute left-0 top-0 h-[2px] w-full bg-primary/80 animate-scan" style={{ animationDuration: '2.4s' }} />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-border bg-background/80 px-3 py-2">
            <div className="flex items-center gap-2">
              <CameraOff className="h-3 w-3 text-muted-foreground" />
              <MicroLabel>Simulated gate camera · GATE 1</MicroLabel>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
              <span className="h-1.5 w-1.5 animate-blink bg-primary" />
              Scanning
            </span>
          </div>
        </div>

        <PixelDivider />

        <Field label="Manual ticket ID" hint="Paste or type a generated Audity ticket reference">
          <Input
            placeholder="AUD-1001-4821"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) verify()
            }}
          />
        </Field>

        <Button className="w-full" disabled={busy} onClick={verify}>
          {busy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verifying
            </>
          ) : (
            <>
              <ScanLine className="h-3.5 w-3.5" />
              Verify & check in
            </>
          )}
        </Button>

        {result && (
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
            <div>
              <p
                className={cn(
                  'font-mono text-[11px] uppercase tracking-[0.16em]',
                  result.ok
                    ? 'text-success'
                    : result.code === 'DUPLICATE'
                      ? 'text-warning'
                      : 'text-destructive',
                )}
              >
                {result.message}
              </p>
              {result.ticket && (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {result.ticket.attendeeName} · {result.ticket.quantity} seat(s) ·{' '}
                  {getEvent(result.ticket.eventId)?.title}
                </p>
              )}
              {!result.ok && result.code === 'INVALID' && (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  No matching registration exists in the complex ledger.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

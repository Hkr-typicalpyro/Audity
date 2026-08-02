'use client'

import { AlertTriangle, Lock, Unlock } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { MicroLabel } from './ui-kit'
import { cn } from '@/lib/utils'

function StatusChip({ label, open }) {
  const Icon = open ? Unlock : Lock
  return (
    <div
      className={cn(
        'flex items-center gap-2 border px-3 py-2',
        open ? 'border-success/40 bg-success/5' : 'border-destructive/50 bg-destructive/10',
      )}
    >
      <Icon
        className={cn('h-3.5 w-3.5', open ? 'text-success' : 'text-destructive')}
        strokeWidth={2}
      />
      <div className="leading-none">
        <MicroLabel className="block text-muted-foreground">{label}</MicroLabel>
        <span
          className={cn(
            'mt-1 block font-mono text-[10px] uppercase tracking-[0.18em]',
            open ? 'text-success' : 'animate-blink text-destructive',
          )}
        >
          {open ? 'Open' : 'Locked'}
        </span>
      </div>
    </div>
  )
}

export function PortalStatus() {
  const { ticketSalesEnabled, hallRentalEnabled } = useAudity()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MicroLabel className="hidden text-muted-foreground/70 sm:block">System Portals</MicroLabel>
      <StatusChip label="Ticket Sales" open={ticketSalesEnabled} />
      <StatusChip label="Hall Rental" open={hallRentalEnabled} />
    </div>
  )
}

export function PortalWarning({ kind }) {
  const { ticketSalesEnabled, hallRentalEnabled } = useAudity()
  const locked = kind === 'tickets' ? !ticketSalesEnabled : !hallRentalEnabled
  if (!locked) return null

  return (
    <div className="mb-6 flex items-start gap-3 border border-destructive/50 bg-destructive/10 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
      <div>
        <MicroLabel className="text-destructive">
          {kind === 'tickets' ? 'Visitor ticket sales locked' : 'Organiser hall rental locked'}
        </MicroLabel>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {kind === 'tickets'
            ? 'The complex owner has suspended ticket sales building-wide. Existing tickets remain valid and viewable, but new seat bookings are disabled.'
            : 'The complex owner has suspended hall rental. Existing events remain manageable, but new hall reservations cannot be confirmed.'}
        </p>
      </div>
    </div>
  )
}

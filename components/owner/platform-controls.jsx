'use client'

import { Power, ReceiptText, Ticket } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import {
  MicroLabel,
  Panel,
  Pill,
  formatDateTime,
  formatINR,
} from '@/components/audity/ui-kit'
import { cn } from '@/lib/utils'

function KillSwitch({ label, description, icon: Icon, enabled, onToggle }) {
  return (
    <div className="flex items-start gap-3 border border-border bg-surface-2 p-4">
      <div
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center border',
          enabled ? 'border-success/50 bg-success/10 text-success' : 'border-destructive/50 bg-destructive/10 text-destructive',
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <MicroLabel className="text-foreground">{label}</MicroLabel>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`${label} ${enabled ? 'enabled' : 'disabled'}`}
            onClick={onToggle}
            className={cn(
              'relative h-6 w-12 shrink-0 cursor-pointer border transition-colors',
              enabled ? 'border-success/60 bg-success/20' : 'border-destructive/60 bg-destructive/20',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 transition-all duration-150',
                enabled ? 'left-[26px] bg-success' : 'left-0.5 bg-destructive',
              )}
            />
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <Pill tone={enabled ? 'success' : 'danger'} dot className="mt-3">
          {enabled ? 'Portal open' : 'Portal locked'}
        </Pill>
      </div>
    </div>
  )
}

export function PlatformControls() {
  const {
    ticketSalesEnabled,
    setTicketSalesEnabled,
    hallRentalEnabled,
    setHallRentalEnabled,
    payments,
    pushToast,
  } = useAudity()

  const recent = payments.slice(0, 7)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel label="Master platform controls" right={<Power className="h-4 w-4 text-primary" strokeWidth={2} />}>
        <div className="space-y-3">
          <KillSwitch
            label="Visitor ticket sales"
            description="Master switch for all seat bookings across every hall. When locked, attendees can still view events and existing tickets but cannot purchase."
            icon={Ticket}
            enabled={ticketSalesEnabled}
            onToggle={() => {
              const next = !ticketSalesEnabled
              setTicketSalesEnabled(next)
              pushToast(
                next ? 'TICKET SALES RE-OPENED COMPLEX-WIDE' : 'TICKET SALES LOCKED COMPLEX-WIDE',
                next ? 'success' : 'error',
              )
            }}
          />
          <KillSwitch
            label="Organiser hall rental"
            description="Master switch for new hall reservations. Locking this halts all incoming rentals while leaving confirmed events untouched."
            icon={ReceiptText}
            enabled={hallRentalEnabled}
            onToggle={() => {
              const next = !hallRentalEnabled
              setHallRentalEnabled(next)
              pushToast(
                next ? 'HALL RENTAL RE-OPENED FOR ORGANISERS' : 'HALL RENTAL LOCKED FOR ORGANISERS',
                next ? 'success' : 'error',
              )
            }}
          />
        </div>
      </Panel>

      <Panel label="Payment ledger · latest" dense>
        <ul>
          {recent.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-[132px]">
                <MicroLabel className="text-foreground">
                  {p.type === 'TICKET' ? 'Ticket' : 'Hall rental'}
                </MicroLabel>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {p.refId}
                </p>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {p.method}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {formatDateTime(p.createdAt)}
              </span>
              <span className="ml-auto font-mono text-xs tabular-nums text-foreground">
                {formatINR(p.amount)}
              </span>
              <Pill tone={p.status === 'PAID' ? 'success' : 'warning'}>{p.status}</Pill>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

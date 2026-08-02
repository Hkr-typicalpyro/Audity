'use client'

import { ArrowUpRight, Ban, Clock, MapPin, Users } from 'lucide-react'
import { Button, CapacityBar, MicroLabel, PixelDivider, Pill, formatDate, formatINR, seatStatus } from '@/components/audity/ui-kit'
import { cn } from '@/lib/utils'

const CATEGORY_TONE = {
  TECH: 'primary',
  CULTURAL: 'secondary',
  CORPORATE: 'neutral',
  WORKSHOP: 'warning',
}

export function EventCard({ event, onBook, salesLocked }) {
  const { remaining, pct, tone, label } = seatStatus(event)
  const cancelled = event.status === 'CANCELLED'
  const soldOut = remaining === 0
  const disabled = cancelled || soldOut || salesLocked

  return (
    <article
      className={cn(
        'group relative flex flex-col border border-border bg-surface transition-colors hover:border-border-strong',
        cancelled && 'opacity-70',
      )}
    >
      <span className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l-2 border-t-2 border-primary opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="pointer-events-none absolute -right-px -bottom-px h-2 w-2 border-b-2 border-r-2 border-primary opacity-0 transition-opacity group-hover:opacity-100" />

      {/* header strip */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
        <Pill tone={CATEGORY_TONE[event.category] || 'neutral'}>{event.category}</Pill>
        <MicroLabel>{formatDate(event.date)}</MicroLabel>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold uppercase leading-snug tracking-tight text-foreground text-pretty">
          {event.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {event.description}
        </p>

        {cancelled && (
          <div className="mt-3 flex items-start gap-2 border border-destructive/50 bg-destructive/10 px-2.5 py-2">
            <Ban className="mt-px h-3 w-3 shrink-0 text-destructive" />
            <div>
              <MicroLabel className="text-destructive">Event cancelled</MicroLabel>
              {event.cancellationReason && (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {event.cancellationReason}
                </p>
              )}
            </div>
          </div>
        )}

        <PixelDivider className="my-4" />

        {/* location block */}
        <div className="grid grid-cols-1 gap-2 border border-border bg-background px-3 py-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 shrink-0 text-primary" strokeWidth={2} />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
              {event.hallCode} — {event.hallName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-5">
            <MicroLabel>{event.floor.toUpperCase()}</MicroLabel>
            <MicroLabel>{event.entranceGate.toUpperCase()}</MicroLabel>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Meta icon={Clock} label="Time" value={`${event.startTime} – ${event.endTime}`} />
          <Meta icon={Users} label="Capacity" value={`${event.maxCapacity}`} />
        </div>

        {/* availability */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <MicroLabel>Seat availability</MicroLabel>
            <Pill tone={tone} dot>
              {label}
            </Pill>
          </div>
          <CapacityBar percent={pct} tone={tone === 'danger' ? 'danger' : tone} />
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="text-muted-foreground">
              {event.registeredCount} / {event.maxCapacity} registered
            </span>
            <span className={cn(tone === 'danger' ? 'text-destructive' : 'text-foreground')}>
              {remaining} left
            </span>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2 px-4 py-3">
        <div>
          <MicroLabel>Ticket</MicroLabel>
          <p className="mt-1 font-mono text-sm text-foreground">
            {event.ticketPrice === 0 ? 'FREE ENTRY' : formatINR(event.ticketPrice)}
          </p>
        </div>
        <Button
          size="sm"
          variant={disabled ? 'outline' : 'primary'}
          disabled={disabled}
          onClick={() => onBook(event)}
        >
          {cancelled
            ? 'Cancelled'
            : salesLocked
              ? 'Sales locked'
              : soldOut
                ? 'Sold out'
                : 'Book seat'}
          {!disabled && <ArrowUpRight className="h-3 w-3" />}
        </Button>
      </div>
    </article>
  )
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
        <MicroLabel>{label}</MicroLabel>
      </div>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-foreground">{value}</p>
    </div>
  )
}

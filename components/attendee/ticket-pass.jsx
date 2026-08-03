'use client'

import { Printer } from 'lucide-react'
import { QrCode } from '@/components/audity/qr-code'
import { Button, MicroLabel, PixelDivider, Pill, formatDate, formatINR } from '@/components/audity/ui-kit'

export function TicketPass({ ticket, event }) {
  if (!ticket || !event) return null

  // Opaque ticket identifier expected by the authoritative backend check-in API
  // Contains zero sensitive data (no JWT, emails, payments, or MongoDB specifics)
  const payload = ticket.customId || ticket.id

  const statusTone =
    ticket.status === 'CANCELLED' ? 'danger' : ticket.checkedIn ? 'primary' : 'success'

  return (
    <div className="print-pass border border-border-strong bg-surface">
      {/* pass header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-foreground">Audity</p>
          <MicroLabel className="mt-1 block">Digital entry pass</MicroLabel>
        </div>
        <Pill tone={statusTone} dot>
          {ticket.status === 'CANCELLED' ? 'Cancelled' : ticket.checkedIn ? 'Checked in' : 'Confirmed'}
        </Pill>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold uppercase leading-tight tracking-tight text-foreground text-pretty">
          {event.title}
        </h3>
        <MicroLabel className="mt-2 block text-primary">{event.category}</MicroLabel>

        <PixelDivider className="my-4" accent />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="mx-auto shrink-0 border border-border bg-white p-2 sm:mx-0">
            <QrCode value={payload} size={148} />
            <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]">
              Scan at gate
            </p>
          </div>

          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
            <Row label="Ticket ID" value={ticket.id} mono />
            <Row label="Quantity" value={`${ticket.quantity} seat(s)`} />
            <Row label="Hall" value={`${event.hallCode} — ${event.hallName}`} />
            <Row label="Building floor" value={event.floor} />
            <Row label="Entrance gate" value={event.entranceGate} />
            <Row label="Date" value={formatDate(event.date)} />
            <Row label="Time" value={`${event.startTime} – ${event.endTime}`} />
            <Row label="Amount paid" value={ticket.amount === 0 ? 'FREE' : formatINR(ticket.amount)} />
            <Row label="Attendee" value={ticket.attendeeName} />
            <Row label="Booking status" value={ticket.status} />
          </dl>
        </div>

        <PixelDivider className="my-4" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xs font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
            Present this pass at {event.entranceGate}. Gates open 30 minutes prior. Non-transferable.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-3 w-3" />
            Print pass
          </Button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div>
      <dt>
        <MicroLabel>{label}</MicroLabel>
      </dt>
      <dd
        className={
          mono
            ? 'mt-1 font-mono text-xs tracking-[0.08em] text-primary'
            : 'mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground'
        }
      >
        {value}
      </dd>
    </div>
  )
}

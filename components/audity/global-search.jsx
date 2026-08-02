'use client'

import { CalendarDays, DoorOpen, TicketCheck } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { MicroLabel, formatDate } from './ui-kit'

export function GlobalSearchResults() {
  const { globalQuery, events, halls, tickets } = useAudity()
  const q = globalQuery.trim().toLowerCase()

  const eventHits = events
    .filter((e) => `${e.title} ${e.category} ${e.organiser}`.toLowerCase().includes(q))
    .slice(0, 4)
  const hallHits = halls
    .filter((h) => `${h.code} ${h.name} ${h.floor}`.toLowerCase().includes(q))
    .slice(0, 3)
  const ticketHits = tickets
    .filter((t) => `${t.id} ${t.attendeeName}`.toLowerCase().includes(q))
    .slice(0, 4)

  const empty = !eventHits.length && !hallHits.length && !ticketHits.length

  return (
    <div className="absolute left-0 top-12 z-50 max-h-[60vh] w-full overflow-y-auto border border-border-strong bg-surface">
      {empty && (
        <p className="px-3 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          No complex records matched “{globalQuery}”
        </p>
      )}

      {eventHits.length > 0 && (
        <Group label="Events" icon={CalendarDays}>
          {eventHits.map((e) => (
            <Row
              key={e.id}
              primary={e.title}
              secondary={`${e.hallCode} · ${formatDate(e.date)} · ${e.startTime}`}
              tag={e.status === 'CANCELLED' ? 'CANCELLED' : e.category}
            />
          ))}
        </Group>
      )}

      {hallHits.length > 0 && (
        <Group label="Halls" icon={DoorOpen}>
          {hallHits.map((h) => (
            <Row
              key={h.id}
              primary={`${h.code} — ${h.name}`}
              secondary={`${h.floor} · ${h.entranceGate}`}
              tag={`${h.capacity} SEATS`}
            />
          ))}
        </Group>
      )}

      {ticketHits.length > 0 && (
        <Group label="Tickets" icon={TicketCheck}>
          {ticketHits.map((t) => (
            <Row key={t.id} primary={t.id} secondary={t.attendeeName} tag={t.status} />
          ))}
        </Group>
      )}
    </div>
  )
}

function Group({ label, icon: Icon, children }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 bg-surface-2 px-3 py-2">
        <Icon className="h-3 w-3 text-primary" strokeWidth={2} />
        <MicroLabel className="text-foreground">{label}</MicroLabel>
      </div>
      <ul>{children}</ul>
    </div>
  )
}

function Row({ primary, secondary, tag }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 first:border-t-0 hover:bg-surface-2">
      <span className="min-w-0">
        <span className="block truncate text-xs text-foreground">{primary}</span>
        <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {secondary}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
        {tag}
      </span>
    </li>
  )
}

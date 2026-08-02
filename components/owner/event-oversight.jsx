'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Ban, CalendarX, Search } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import {
  Button,
  EmptyState,
  Field,
  Input,
  MicroLabel,
  Modal,
  Panel,
  Pill,
  Select,
  Textarea,
  formatDate,
  formatINR,
} from '@/components/audity/ui-kit'

export function EventOversight() {
  const { events, tickets, halls, forceCancelEvent } = useAudity()
  const [query, setQuery] = useState('')
  const [hallFilter, setHallFilter] = useState('ALL')
  const [target, setTarget] = useState(null)
  const [reason, setReason] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events
      .filter((e) => (hallFilter === 'ALL' ? true : e.hallId === hallFilter))
      .filter((e) =>
        q ? e.title.toLowerCase().includes(q) || e.organiser.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [events, query, hallFilter])

  const impacted = target
    ? tickets.filter((t) => t.eventId === target.id && t.status === 'CONFIRMED')
    : []
  const refundValue = impacted.reduce((s, t) => s + t.amount, 0)

  const confirm = () => {
    forceCancelEvent(target.id, reason.trim() || 'Cancelled by complex owner')
    setTarget(null)
    setReason('')
  }

  return (
    <>
      <Panel
        label="Event oversight"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="EVENT OR ORGANISER"
                aria-label="Filter events"
                className="w-52 pl-8 uppercase tracking-[0.12em]"
              />
            </div>
            <Select
              value={hallFilter}
              onChange={(e) => setHallFilter(e.target.value)}
              aria-label="Filter by hall"
              className="w-40"
            >
              <option value="ALL">ALL HALLS</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code}
                </option>
              ))}
            </Select>
          </div>
        }
        dense
      >
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={CalendarX}
              title="No events match"
              description="Adjust the hall filter or clear the search to see the full complex schedule."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {['Event', 'Organiser', 'Hall / slot', 'Date', 'Seats', 'Gross', 'Status', ''].map(
                    (h) => (
                      <th key={h} className="px-4 py-2.5 text-left">
                        <MicroLabel>{h}</MicroLabel>
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const cancelled = e.status === 'CANCELLED'
                  return (
                    <tr key={e.id} className="border-b border-border last:border-b-0">
                      <td className="max-w-[240px] px-4 py-3">
                        <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                        <MicroLabel className="mt-1 block">{e.category}</MicroLabel>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {e.organiser}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground">
                        {e.hallCode}
                        <span className="block text-muted-foreground">
                          {e.startTime}–{e.endTime}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
                        {formatDate(e.date)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-foreground">
                        {e.registeredCount}/{e.maxCapacity}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-foreground">
                        {formatINR(e.registeredCount * e.ticketPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={cancelled ? 'danger' : 'success'} dot>
                          {e.status}
                        </Pill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={cancelled}
                          onClick={() => setTarget(e)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {cancelled ? 'Cancelled' : 'Force cancel'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title="Force cancel event"
        tone="danger"
        footer={
          <div className="flex items-center justify-between gap-3">
            <MicroLabel className="text-destructive">Irreversible in this prototype</MicroLabel>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>
                Keep event
              </Button>
              <Button variant="danger" size="sm" onClick={confirm}>
                Cancel & refund
              </Button>
            </div>
          </div>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 border border-destructive/50 bg-destructive/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Cancelling <span className="text-foreground">{target.title}</span> will void{' '}
                <span className="text-foreground">{impacted.length}</span> confirmed ticket(s), release{' '}
                {target.hallCode} for the slot and mark {formatINR(refundValue)} as refunded in the
                ledger.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 border border-border bg-surface-2 p-3">
              <Detail label="Hall" value={`${target.hallCode} · ${target.floor}`} />
              <Detail label="Date" value={`${formatDate(target.date)} · ${target.startTime}`} />
              <Detail label="Organiser" value={target.organiser} />
              <Detail label="Seats sold" value={`${target.registeredCount}/${target.maxCapacity}`} />
            </dl>

            <Field label="Cancellation reason" hint="Shown to attendees on their ticket record.">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Emergency structural inspection of Level 2 truss"
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <MicroLabel>{label}</MicroLabel>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground">
        {value}
      </p>
    </div>
  )
}

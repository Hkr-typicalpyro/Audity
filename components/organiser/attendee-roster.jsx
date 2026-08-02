'use client'

import { useMemo, useState } from 'react'
import { Download, ScanLine, Search, UserX } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import {
  Button,
  EmptyState,
  Input,
  MicroLabel,
  Panel,
  Pill,
  Select,
  formatDateTime,
} from '@/components/audity/ui-kit'

export function AttendeeRoster({ onOpenScanner }) {
  const { tickets, events, organiserEventIds, getEvent, checkInTicket, pushToast } = useAudity()
  const [query, setQuery] = useState('')
  const [eventFilter, setEventFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const organiserEvents = events.filter((e) => organiserEventIds.includes(e.id))

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tickets
      .filter((t) => organiserEventIds.includes(t.eventId))
      .filter((t) => (eventFilter === 'ALL' ? true : t.eventId === eventFilter))
      .filter((t) => {
        if (statusFilter === 'ALL') return true
        if (statusFilter === 'CHECKED IN') return t.status === 'CONFIRMED' && t.checkedIn
        if (statusFilter === 'NOT CHECKED IN') return t.status === 'CONFIRMED' && !t.checkedIn
        return t.status === 'CANCELLED'
      })
      .filter((t) =>
        q ? `${t.id} ${t.attendeeName} ${getEvent(t.eventId)?.title || ''}`.toLowerCase().includes(q) : true,
      )
  }, [tickets, organiserEventIds, eventFilter, statusFilter, query, getEvent])

  function exportCsv() {
    const header = ['TICKET ID', 'ATTENDEE', 'EMAIL', 'EVENT', 'REGISTRATION DATE', 'QUANTITY', 'CHECK-IN STATUS']
    const lines = rows.map((t) => {
      const ev = getEvent(t.eventId)
      const status = t.status === 'CANCELLED' ? 'CANCELLED' : t.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'
      return [t.id, t.attendeeName, t.attendeeEmail, ev?.title || '', t.bookedAt, t.quantity, status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    })
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audity-roster-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    pushToast(`CSV EXPORTED — ${rows.length} ROW(S)`)
  }

  return (
    <Panel
      label="Attendance & roster"
      dense
      right={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onOpenScanner}>
            <ScanLine className="h-3 w-3" />
            Open QR scanner
          </Button>
          <Button size="sm" variant="outline" disabled={!rows.length} onClick={exportCsv}>
            <Download className="h-3 w-3" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 border-b border-border p-4 md:grid-cols-3">
        <label className="relative block">
          <MicroLabel className="mb-2 block">Search roster</MicroLabel>
          <Search className="pointer-events-none absolute bottom-3 left-3 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="TICKET ID · ATTENDEE"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="block">
          <MicroLabel className="mb-2 block">Event</MicroLabel>
          <Select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
            <option value="ALL">ALL MY EVENTS</option>
            {organiserEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <MicroLabel className="mb-2 block">Check-in status</MicroLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {['ALL', 'CHECKED IN', 'NOT CHECKED IN', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={UserX}
            title="No roster records"
            description="Registrations for your events will appear here the moment an attendee completes checkout."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="bg-surface-2">
                {['Ticket ID', 'Attendee', 'Event', 'Registration date', 'Qty', 'Check-in status', 'Action'].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-border px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const ev = getEvent(t.eventId)
                const cancelled = t.status === 'CANCELLED'
                return (
                  <tr key={t.id} className="border-b border-border transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3 font-mono text-[11px] tracking-[0.08em] text-primary">{t.id}</td>
                    <td className="px-4 py-3">
                      <span className="block text-xs text-foreground">{t.attendeeName}</span>
                      <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                        {t.attendeeEmail}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <span className="block truncate text-xs text-foreground">{ev?.title}</span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {ev?.hallCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {formatDateTime(t.bookedAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-foreground">{t.quantity}</td>
                    <td className="px-4 py-3">
                      <Pill tone={cancelled ? 'danger' : t.checkedIn ? 'success' : 'warning'} dot>
                        {cancelled ? 'Cancelled' : t.checkedIn ? 'Checked in' : 'Not checked in'}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant={t.checkedIn || cancelled ? 'ghost' : 'outline'}
                        disabled={t.checkedIn || cancelled}
                        onClick={() => checkInTicket(t.id)}
                      >
                        {cancelled ? 'Void' : t.checkedIn ? 'Verified' : 'Check in'}
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
  )
}

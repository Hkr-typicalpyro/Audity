'use client'

import { useMemo, useState } from 'react'
import { CalendarSearch, RotateCcw, Search, SearchX } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { CATEGORIES } from '@/data/mock-data'
import {
  Button,
  EmptyState,
  Input,
  MicroLabel,
  Panel,
  SectionHeading,
  Select,
  StatBlock,
  formatINR,
} from '@/components/audity/ui-kit'
import { PortalWarning } from '@/components/audity/portal-status'
import { EventCard } from './event-card'
import { BookingDrawer } from './booking-drawer'
import { MyTickets } from './my-tickets'
import { cn } from '@/lib/utils'

export function AttendeeDashboard() {
  const { events, halls, ticketSalesEnabled, myTickets, globalQuery, applyForOrganiser, authUser } = useAudity()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [hall, setHall] = useState('ALL')
  const [date, setDate] = useState('')
  const [bookingEvent, setBookingEvent] = useState(null)
  const [applyingOrganiser, setApplyingOrganiser] = useState(false)
  const [organiserError, setOrganiserError] = useState('')
  const effectiveQuery = (query || globalQuery).trim().toLowerCase()

  const filtered = useMemo(() => {
    return events
      .filter((e) => (category === 'ALL' ? true : e.category === category))
      .filter((e) => (hall === 'ALL' ? true : e.hallId === hall))
      .filter((e) => (date ? e.date === date : true))
      .filter((e) =>
        effectiveQuery
          ? `${e.title} ${e.description} ${e.organiser} ${e.hallName}`.toLowerCase().includes(effectiveQuery)
          : true,
      )
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  }, [events, category, hall, date, effectiveQuery])

  const activeTickets = myTickets.filter((t) => t.status === 'CONFIRMED')
  const spend = activeTickets.reduce((s, t) => s + t.amount, 0)
  const seats = activeTickets.reduce((s, t) => s + t.quantity, 0)

  const filtersDirty = query || category !== 'ALL' || hall !== 'ALL' || date
  const handleOrganiserApplication = async () => {
    setOrganiserError('')
    setApplyingOrganiser(true)

    try {
      await applyForOrganiser()
    } catch (err) {
      setOrganiserError(err.message || 'Unable to submit organiser application')
    } finally {
      setApplyingOrganiser(false)
    }
}
  return (
    <div className="space-y-12">
      <section>
        <SectionHeading
          index="01 /"
          title="Discover events"
          description="Live inventory across the Audity complex. Seat counts update the moment a booking, cancellation or owner action lands anywhere in the building."
        />

        <PortalWarning kind="tickets" />

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatBlock label="Events live" value={events.filter((e) => e.status === 'PUBLISHED').length} tone="primary" sub="Across 3 halls" />
          <StatBlock label="My active seats" value={seats} tone="success" sub={`${activeTickets.length} booking(s)`} />
          <StatBlock label="My spend" value={formatINR(spend)} sub="Simulated payments" />
          <StatBlock
            label="Ticket portal"
            value={ticketSalesEnabled ? 'OPEN' : 'LOCKED'}
            tone={ticketSalesEnabled ? 'success' : 'danger'}
            sub="Owner controlled"
          />
        </div>

        {/* toolbar */}
        <Panel label="Discovery filters" className="mb-6" dense>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative block">
              <MicroLabel className="mb-2 block">Search</MicroLabel>
              <Search className="pointer-events-none absolute bottom-3 left-3 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="EVENT · ORGANISER · HALL"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="block">
              <MicroLabel className="mb-2 block">Hall</MicroLabel>
              <Select value={hall} onChange={(e) => setHall(e.target.value)}>
                <option value="ALL">ALL HALLS</option>
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.code} — {h.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <MicroLabel className="mb-2 block">Date</MicroLabel>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                disabled={!filtersDirty}
                onClick={() => {
                  setQuery('')
                  setCategory('ALL')
                  setHall('ALL')
                  setDate('')
                }}
              >
                <RotateCcw className="h-3 w-3" />
                Reset filters
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2 px-4 py-3">
            <MicroLabel className="mr-1">Category</MicroLabel>
            {['ALL', ...CATEGORIES].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  'cursor-pointer border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors',
                  category === c
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {c}
              </button>
            ))}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </span>
          </div>
        </Panel>

        {filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No events match these filters"
            description="Try widening the category, clearing the date or selecting all halls."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setCategory('ALL')
                  setHall('ALL')
                  setDate('')
                }}
              >
                <CalendarSearch className="h-3 w-3" />
                Show all events
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                salesLocked={!ticketSalesEnabled}
                onBook={(evt) => setBookingEvent(evt)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          index="02 /"
          title="My tickets"
          description="Digital passes issued to your profile. Each pass carries a scannable gate code verified by the organiser check-in desk."
        />
        <MyTickets />
      </section>
      <section>
  <SectionHeading
    index="03 /"
    title="Organise with Audity"
    description="Apply for organiser access to publish events, reserve halls and manage attendees through the Audity complex."
  />

  <Panel label="Organiser access">
    <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <MicroLabel className="mb-2 block">
          Application status
        </MicroLabel>

        {authUser?.organiserStatus === 'pending' ? (
          <>
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-amber-400">
              Pending review
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Your organiser application has been submitted and is waiting
              for approval from an Audity owner.
            </p>
          </>
        ) : authUser?.organiserStatus === 'rejected' ? (
          <>
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-destructive">
              Application rejected
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Your previous application was not approved. You can submit
              another application for review.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
              Attendee access
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Become an organiser to create events, reserve halls and manage
              event attendees.
            </p>
          </>
        )}

        {organiserError && (
          <p className="mt-3 text-sm text-destructive">
            {organiserError}
          </p>
        )}
      </div>

      <div className="shrink-0">
        {authUser?.organiserStatus === 'pending' ? (
          <Button variant="outline" disabled>
            Application pending
          </Button>
        ) : (
          <Button
            onClick={handleOrganiserApplication}
            disabled={applyingOrganiser}
          >
            {applyingOrganiser
              ? 'Submitting...'
              : authUser?.organiserStatus === 'rejected'
                ? 'Apply again'
                : 'Apply to organise'}
          </Button>
        )}
      </div>
    </div>
  </Panel>
</section>
      <BookingDrawer
        event={bookingEvent}
        open={Boolean(bookingEvent)}
        onClose={() => setBookingEvent(null)}
      />
    </div>
  )
}

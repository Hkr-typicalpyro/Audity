'use client'

import { useState } from 'react'
import { Ban, QrCode as QrIcon, TicketX, Wallet } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import {
  Button,
  EmptyState,
  MicroLabel,
  Modal,
  PixelDivider,
  Pill,
  formatDate,
  formatDateTime,
  formatINR,
} from '@/components/audity/ui-kit'
import { TicketPass } from './ticket-pass'

export function MyTickets() {
  const { myTickets, getEvent, cancelTicket } = useAudity()
  const [passTicket, setPassTicket] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

  if (!myTickets.length) {
    return (
      <EmptyState
        icon={TicketX}
        title="No registrations yet"
        description="Book a seat from the discovery feed and your digital Audity pass will be issued here instantly."
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {myTickets.map((t) => {
          const event = getEvent(t.eventId)
          const cancelled = t.status === 'CANCELLED'
          return (
            <article
              key={t.id}
              className="relative border border-border bg-surface transition-colors hover:border-border-strong"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
                <MicroLabel className="text-primary">{t.id}</MicroLabel>
                <Pill tone={cancelled ? 'danger' : t.checkedIn ? 'primary' : 'success'} dot>
                  {cancelled ? 'Cancelled' : t.checkedIn ? 'Checked in' : 'Confirmed'}
                </Pill>
              </div>

              <div className="p-4">
                <h3 className="text-sm font-bold uppercase leading-snug tracking-tight text-foreground">
                  {event?.title || 'EVENT REMOVED'}
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <Cell label="Date" value={formatDate(event?.date)} />
                  <Cell label="Hall" value={event ? `${event.hallCode} · ${event.floor}` : '—'} />
                  <Cell label="Quantity" value={`${t.quantity} seat(s)`} />
                  <Cell label="Booked" value={formatDateTime(t.bookedAt)} />
                </div>

                {event?.status === 'CANCELLED' && (
                  <div className="mt-3 flex items-start gap-2 border border-destructive/50 bg-destructive/10 px-2.5 py-2">
                    <Ban className="mt-px h-3 w-3 shrink-0 text-destructive" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Cancelled by complex owner
                      {event.cancellationReason ? ` — ${event.cancellationReason}` : ''}. Refund of{' '}
                      {formatINR(t.amount)} simulated to source.
                    </p>
                  </div>
                )}

                <PixelDivider className="my-4" />

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPassTicket(t)}>
                    <QrIcon className="h-3 w-3" />
                    View pass
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={cancelled}
                    onClick={() => setCancelTarget(t)}
                  >
                    Cancel registration
                  </Button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <Modal
        open={Boolean(passTicket)}
        onClose={() => setPassTicket(null)}
        title="Digital entry pass"
        width="max-w-2xl"
      >
        <TicketPass ticket={passTicket} event={passTicket ? getEvent(passTicket.eventId) : null} />
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel registration"
        tone="danger"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              Keep booking
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                cancelTicket(cancelTarget.id)
                setCancelTarget(null)
              }}
            >
              Confirm cancellation
            </Button>
          </div>
        }
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              You are cancelling{' '}
              <span className="font-mono text-primary">{cancelTarget.id}</span> for{' '}
              <span className="text-foreground">{getEvent(cancelTarget.eventId)?.title}</span>. The
              released seats return to the public inventory immediately.
            </p>
            <div className="border border-border bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                <MicroLabel className="text-foreground">Simulated refund</MicroLabel>
              </div>
              <Row label="Amount paid" value={formatINR(cancelTarget.amount)} />
              <Row label="Processing fee" value={formatINR(0)} />
              <Row label="Refund amount" value={formatINR(cancelTarget.amount)} strong />
              <Row label="Refund window" value="3–5 BUSINESS DAYS" />
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function Cell({ label, value }) {
  return (
    <div>
      <MicroLabel>{label}</MicroLabel>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground">{value}</p>
    </div>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between border-t border-border py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] first:border-t-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'text-primary' : 'text-foreground'}>{value}</span>
    </div>
  )
}

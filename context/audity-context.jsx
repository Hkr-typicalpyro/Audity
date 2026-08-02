'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  CURRENT_ORGANISER,
  CURRENT_USER,
  HALLS,
  SEED_BLACKOUTS,
  SEED_EVENTS,
  SEED_PAYMENTS,
  SEED_RESERVATIONS,
  SEED_TICKETS,
  TIME_SLOTS,
} from '@/data/mock-data'

const AudityContext = createContext(null)

let idCounter = 0
function nextId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36).slice(-5)}${idCounter}`.toUpperCase()
}

export function AudityProvider({ children }) {
  const [role, setRole] = useState('attendee')
  const [events, setEvents] = useState(SEED_EVENTS)
  const [tickets, setTickets] = useState(SEED_TICKETS)
  const [reservations, setReservations] = useState(SEED_RESERVATIONS)
  const [blackouts, setBlackouts] = useState(SEED_BLACKOUTS)
  const [payments, setPayments] = useState(SEED_PAYMENTS)
  const [ticketSalesEnabled, setTicketSalesEnabled] = useState(true)
  const [hallRentalEnabled, setHallRentalEnabled] = useState(true)
  const [globalQuery, setGlobalQuery] = useState('')
  const [toasts, setToasts] = useState([])

  const pushToast = useCallback((message, tone = 'success') => {
    const id = nextId('toast')
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /* ---------------- ATTENDEE: booking ---------------- */

  const bookTickets = useCallback(
    ({ eventId, quantity, method }) => {
      const event = events.find((e) => e.id === eventId)
      if (!event) return null
      const ticketId = `AUD-${event.id.slice(-4)}-${Math.floor(1000 + Math.random() * 8999)}`
      const amount = quantity * event.ticketPrice
      const ticket = {
        id: ticketId,
        eventId,
        attendeeName: CURRENT_USER.name,
        attendeeEmail: CURRENT_USER.email,
        quantity,
        amount,
        bookedAt: new Date().toISOString(),
        status: 'CONFIRMED',
        checkedIn: false,
        ownedByUser: true,
      }
      setTickets((prev) => [ticket, ...prev])
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, registeredCount: Math.min(e.maxCapacity, e.registeredCount + quantity) }
            : e,
        ),
      )
      setPayments((prev) => [
        {
          id: nextId('pay'),
          type: 'TICKET',
          refId: ticketId,
          amount,
          method,
          status: 'PAID',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
      pushToast(`PAYMENT CONFIRMED — TICKET ${ticketId} ISSUED`)
      return ticket
    },
    [events, pushToast],
  )

  const cancelTicket = useCallback(
    (ticketId) => {
      const ticket = tickets.find((t) => t.id === ticketId)
      if (!ticket || ticket.status !== 'CONFIRMED') return
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, status: 'CANCELLED', checkedIn: false } : t,
        ),
      )
      setEvents((prev) =>
        prev.map((e) =>
          e.id === ticket.eventId
            ? { ...e, registeredCount: Math.max(0, e.registeredCount - ticket.quantity) }
            : e,
        ),
      )
      setPayments((prev) =>
        prev.map((p) => (p.refId === ticketId ? { ...p, status: 'REFUNDED' } : p)),
      )
      pushToast(`REGISTRATION ${ticketId} CANCELLED — REFUND SIMULATED`, 'warning')
    },
    [tickets, pushToast],
  )

  /* ---------------- ORGANISER: hall booking ---------------- */

  const inspectSlot = useCallback(
    ({ hallId, date, slotId }) => {
      if (!hallId || !date || !slotId) {
        return { state: 'IDLE', reason: null, detail: null }
      }
      const blackout = blackouts.find(
        (b) => b.hallId === hallId && b.date === date && b.slotId === slotId,
      )
      if (blackout) {
        return {
          state: 'OCCUPIED',
          reason: blackout.reason === 'MAINTENANCE' ? 'MAINTENANCE' : `OWNER BLACKOUT`,
          detail: `${blackout.reason}${blackout.note ? ` — ${blackout.note}` : ''}`,
        }
      }
      const reservation = reservations.find(
        (r) =>
          r.hallId === hallId &&
          r.date === date &&
          r.slotId === slotId &&
          r.status === 'CONFIRMED',
      )
      if (reservation) {
        const evt = events.find((e) => e.id === reservation.eventId)
        if (!evt || evt.status !== 'CANCELLED') {
          return {
            state: 'OCCUPIED',
            reason: 'BOOKED EVENT',
            detail: evt
              ? `${evt.title} — ${evt.organiser}`
              : `Reserved by ${reservation.organiser}`,
          }
        }
      }
      return { state: 'AVAILABLE', reason: null, detail: null }
    },
    [blackouts, reservations, events],
  )

  const rentHallAndPublish = useCallback(
    ({ hallId, date, slotId, title, description, category, ticketPrice, capacity, method, total }) => {
      const hall = HALLS.find((h) => h.id === hallId)
      const slot = TIME_SLOTS.find((s) => s.id === slotId)
      if (!hall || !slot) return null

      const eventId = nextId('evt').toLowerCase()
      const reservationId = nextId('res').toLowerCase()

      const event = {
        id: eventId,
        title,
        description,
        category,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotId,
        hallId: hall.id,
        hallCode: hall.code,
        hallName: hall.name,
        floor: hall.floor,
        entranceGate: hall.entranceGate,
        maxCapacity: Math.min(capacity, hall.capacity),
        registeredCount: 0,
        ticketPrice,
        organiser: CURRENT_ORGANISER,
        status: 'PUBLISHED',
        cancellationReason: null,
      }

      setEvents((prev) => [event, ...prev])
      setReservations((prev) => [
        {
          id: reservationId,
          hallId: hall.id,
          hallName: hall.name,
          date,
          slotId,
          eventId,
          organiser: CURRENT_ORGANISER,
          amount: hall.rentalFee,
          status: 'CONFIRMED',
        },
        ...prev,
      ])
      setPayments((prev) => [
        {
          id: nextId('pay'),
          type: 'HALL_RENTAL',
          refId: reservationId,
          amount: total,
          method,
          status: 'PAID',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
      pushToast(`HALL RENTED — "${title}" PUBLISHED TO ATTENDEE FEED`)
      return event
    },
    [pushToast],
  )

  const checkInTicket = useCallback(
    (rawId) => {
      const id = rawId.trim().toUpperCase()
      const ticket = tickets.find((t) => t.id.toUpperCase() === id)
      if (!ticket) return { ok: false, code: 'INVALID', message: 'INVALID TICKET' }
      if (ticket.status === 'CANCELLED')
        return { ok: false, code: 'CANCELLED', message: 'TICKET CANCELLED' }
      if (ticket.checkedIn)
        return { ok: false, code: 'DUPLICATE', message: 'ALREADY CHECKED IN', ticket }
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, checkedIn: true } : t)))
      pushToast(`CHECK-IN COMPLETE — ${ticket.id}`)
      return { ok: true, code: 'OK', message: 'CHECKED IN', ticket }
    },
    [tickets, pushToast],
  )

  /* ---------------- OWNER ---------------- */

  const addBlackout = useCallback(
    ({ hallId, date, slotId, reason, note }) => {
      const id = nextId('blk').toLowerCase()
      setBlackouts((prev) => [{ id, hallId, date, slotId, reason, note: note || '' }, ...prev])
      pushToast('HALL SLOT BLOCKED — ORGANISER INSPECTOR UPDATED', 'warning')
      return id
    },
    [pushToast],
  )

  const removeBlackout = useCallback(
    (id) => {
      setBlackouts((prev) => prev.filter((b) => b.id !== id))
      pushToast('BLACKOUT RELEASED — SLOT AVAILABLE AGAIN')
    },
    [pushToast],
  )

  const forceCancelEvent = useCallback(
    (eventId, reason) => {
      const affected = tickets.filter((t) => t.eventId === eventId && t.status === 'CONFIRMED')
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, status: 'CANCELLED', cancellationReason: reason } : e,
        ),
      )
      setTickets((prev) =>
        prev.map((t) =>
          t.eventId === eventId && t.status === 'CONFIRMED'
            ? { ...t, status: 'CANCELLED', checkedIn: false }
            : t,
        ),
      )
      const affectedIds = affected.map((t) => t.id)
      setPayments((prev) =>
        prev.map((p) =>
          p.type === 'TICKET' && affectedIds.includes(p.refId) ? { ...p, status: 'REFUNDED' } : p,
        ),
      )
      setReservations((prev) =>
        prev.map((r) => (r.eventId === eventId ? { ...r, status: 'RELEASED' } : r)),
      )
      pushToast(`EVENT FORCE CANCELLED — ${affectedIds.length} TICKET(S) REFUNDED`, 'error')
    },
    [tickets, pushToast],
  )

  /* ---------------- DERIVED ---------------- */

  const derived = useMemo(() => {
    const activeEvents = events.filter((e) => e.status === 'PUBLISHED')
    const confirmedTickets = tickets.filter((t) => t.status === 'CONFIRMED')

    const ticketRevenue = payments
      .filter((p) => p.type === 'TICKET' && p.status === 'PAID')
      .reduce((s, p) => s + p.amount, 0)
    const rentalRevenue = payments
      .filter((p) => p.type === 'HALL_RENTAL' && p.status === 'PAID')
      .reduce((s, p) => s + p.amount, 0)

    const organiserEvents = events.filter((e) => e.organiser === CURRENT_ORGANISER)
    const organiserEventIds = organiserEvents.map((e) => e.id)
    const organiserSeatsSold = organiserEvents.reduce((s, e) => s + e.registeredCount, 0)
    const organiserRevenue = organiserEvents.reduce(
      (s, e) => s + e.registeredCount * e.ticketPrice,
      0,
    )
    const organiserRentalCost = reservations
      .filter((r) => r.organiser === CURRENT_ORGANISER && r.status === 'CONFIRMED')
      .reduce((s, r) => s + r.amount, 0)

    const totalVisitors = activeEvents.reduce((s, e) => s + e.registeredCount, 0)
    const totalCapacity = activeEvents.reduce((s, e) => s + e.maxCapacity, 0)
    const occupancyRate = totalCapacity ? Math.round((totalVisitors / totalCapacity) * 100) : 0

    const myTickets = tickets.filter((t) => t.ownedByUser)

    return {
      activeEvents,
      confirmedTickets,
      ticketRevenue,
      rentalRevenue,
      organiserEvents,
      organiserEventIds,
      organiserSeatsSold,
      organiserRevenue,
      organiserRentalCost,
      totalVisitors,
      totalCapacity,
      occupancyRate,
      myTickets,
    }
  }, [events, tickets, payments, reservations])

  const getEvent = useCallback((id) => events.find((e) => e.id === id) || null, [events])

  const hallStatus = useCallback(
    (hallId) => {
      const today = new Date().toISOString().slice(0, 10)
      const upcoming = events
        .filter((e) => e.hallId === hallId && e.status === 'PUBLISHED' && e.date >= today)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
      const nextEvent = upcoming[0] || null
      const futureBlackout = blackouts
        .filter((b) => b.hallId === hallId && b.date >= today)
        .sort((a, b) => (a.date < b.date ? -1 : 1))[0]

      let status = 'AVAILABLE'
      if (nextEvent && futureBlackout) {
        status = futureBlackout.date <= nextEvent.date ? 'BLACKED OUT' : 'OCCUPIED'
      } else if (nextEvent) {
        status = 'OCCUPIED'
      } else if (futureBlackout) {
        status = 'BLACKED OUT'
      }

      const hallEvents = events.filter((e) => e.hallId === hallId && e.status === 'PUBLISHED')
      const seats = hallEvents.reduce((s, e) => s + e.registeredCount, 0)
      const cap = hallEvents.reduce((s, e) => s + e.maxCapacity, 0)

      return {
        status,
        nextEvent,
        blackout: futureBlackout || null,
        occupancy: cap ? Math.round((seats / cap) * 100) : 0,
        scheduled: hallEvents.length,
      }
    },
    [events, blackouts],
  )

  const value = {
    role,
    setRole,
    events,
    tickets,
    reservations,
    blackouts,
    payments,
    ticketSalesEnabled,
    setTicketSalesEnabled,
    hallRentalEnabled,
    setHallRentalEnabled,
    globalQuery,
    setGlobalQuery,
    halls: HALLS,
    slots: TIME_SLOTS,
    user: CURRENT_USER,
    organiserName: CURRENT_ORGANISER,
    toasts,
    pushToast,
    dismissToast,
    bookTickets,
    cancelTicket,
    inspectSlot,
    rentHallAndPublish,
    checkInTicket,
    addBlackout,
    removeBlackout,
    forceCancelEvent,
    getEvent,
    hallStatus,
    ...derived,
  }

  return <AudityContext.Provider value={value}>{children}</AudityContext.Provider>
}

export function useAudity() {
  const ctx = useContext(AudityContext)
  if (!ctx) throw new Error('useAudity must be used within AudityProvider')
  return ctx
}

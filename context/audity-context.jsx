'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  TIME_SLOTS,
} from '@/data/mock-data'
import {
  login as apiLogin,
  getMe,
  register as apiRegister,
  applyForOrganiser as apiApplyForOrganiser,
  getHalls as apiGetHalls,
  createHall as apiCreateHall,
  updateHall as apiUpdateHall,
  setHallStatus as apiSetHallStatus,
  getEvents as apiGetEvents,
  createEvent as apiCreateEvent,
  cancelEventApi,
  getMyTickets as apiGetMyTickets,
  getTickets as apiGetTickets,
  bookTicketsApi as apiBookTickets,
  cancelTicketApi as apiCancelTicket,
  checkInTicketApi as apiCheckInTicket,
  getReservations as apiGetReservations,
  getBlackouts as apiGetBlackouts,
  createBlackout as apiCreateBlackout,
  deleteBlackout as apiDeleteBlackout,
  getPayments as apiGetPayments,
  getPlatformSettings as apiGetPlatformSettings,
  updatePlatformSettings as apiUpdatePlatformSettings,
} from '@/lib/api'

const AudityContext = createContext(null)

const TOKEN_KEY = 'audity_token'

let idCounter = 0
function nextId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36).slice(-5)}${idCounter}`.toUpperCase()
}

export function AudityProvider({ children }) {
  // ─── Auth state ─────────────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState(null)
  const [token, setToken] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Role is DERIVED — never settable by the client
  const role = authUser?.role ?? null

  // User identity for context consumers
  const user = authUser
    ? { id: authUser.id, name: authUser.name, email: authUser.email, phone: authUser.phone }
    : null

  // Organiser display name
  const organiserName = authUser?.name ?? null

  // ─── Auth actions ───────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password)
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setAuthUser(data.user)
    return data
  }, [])

  const register = useCallback(async (name, email, password, phone = '') => {
    return apiRegister(name, email, password, phone)
  }, [])

  const applyForOrganiser = useCallback(async () => {
    if (!token) throw new Error('You must be logged in')
    const data = await apiApplyForOrganiser(token)
    const refreshed = await getMe(token)
    setAuthUser(refreshed.user)
    return data
  }, [token])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setAuthUser(null)
    setEvents([])
    setHalls([])
    setTickets([])
    setReservations([])
    setPayments([])
    setBlackouts([])
  }, [])

  // ─── Restore session on mount ───────────────────────────────────────────────

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (!storedToken) {
      setAuthLoading(false)
      return
    }

    getMe(storedToken)
      .then((data) => {
        setToken(storedToken)
        setAuthUser(data.user)
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
      })
      .finally(() => {
        setAuthLoading(false)
      })
  }, [])

  // ─── Halls: loaded exclusively from MongoDB after authentication ────────────

  const [halls, setHalls] = useState([])

  const reloadHalls = useCallback(async (tok) => {
    if (!tok) { setHalls([]); return }
    try {
      const data = await apiGetHalls(tok)
      if (data.halls?.length > 0) {
        const mongoHalls = data.halls.map((h) => ({
          ...h,
          id: h._id.toString(),
        }))
        setHalls(mongoHalls)
      } else {
        setHalls([])
      }
    } catch (err) {
      console.error('[Audity] GET /api/halls failed:', err.message)
      setHalls([])
    }
  }, [])

  useEffect(() => {
    reloadHalls(token)
  }, [token, reloadHalls])

  // ─── Hall CRUD actions (owner only) ─────────────────────────────────────────

  const createHall = useCallback(async (hallData) => {
    const data = await apiCreateHall(token, hallData)
    await reloadHalls(token)
    return data.hall
  }, [token, reloadHalls])

  const updateHall = useCallback(async (hallMongoId, hallData) => {
    const data = await apiUpdateHall(token, hallMongoId, hallData)
    await reloadHalls(token)
    return data.hall
  }, [token, reloadHalls])

  const setHallActive = useCallback(async (hallMongoId, isActive) => {
    const data = await apiSetHallStatus(token, hallMongoId, isActive)
    await reloadHalls(token)
    return data.hall
  }, [token, reloadHalls])

  // ─── Events: load from MongoDB after auth ─────────────────────────────────

  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  const reloadEvents = useCallback(async (tok) => {
    if (!tok) { setEvents([]); return }
    setEventsLoading(true)
    try {
      const data = await apiGetEvents(tok)
      setEvents(data.events || [])
    } catch (err) {
      console.error('[Audity] GET /api/events failed:', err.message)
    } finally {
      setEventsLoading(false)
    }
  }, [])

  useEffect(() => {
    reloadEvents(token)
  }, [token, reloadEvents])

  // ─── Migrated Transactional State (tickets, reservations, payments, blackouts) ───

  const [tickets, setTickets] = useState([])
  const [reservations, setReservations] = useState([])
  const [blackouts, setBlackouts] = useState([])
  const [payments, setPayments] = useState([])
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

  // Reload helpers for migrated business models
  const reloadTickets = useCallback(async (tok, currentRole) => {
    if (!tok || !currentRole) { setTickets([]); return }
    try {
      const data = currentRole === 'attendee' ? await apiGetMyTickets(tok) : await apiGetTickets(tok)
      setTickets(data.tickets || [])
    } catch (err) {
      console.error('[Audity] GET /api/tickets failed:', err.message)
    }
  }, [])

  const reloadReservations = useCallback(async (tok, currentRole) => {
    if (!tok || currentRole === 'attendee') { setReservations([]); return }
    try {
      const data = await apiGetReservations(tok)
      setReservations(data.reservations || [])
    } catch (err) {
      console.error('[Audity] GET /api/reservations failed:', err.message)
    }
  }, [])

  const reloadBlackouts = useCallback(async (tok) => {
    if (!tok) { setBlackouts([]); return }
    try {
      const data = await apiGetBlackouts(tok)
      setBlackouts(data.blackouts || [])
    } catch (err) {
      console.error('[Audity] GET /api/blackouts failed:', err.message)
    }
  }, [])

  const reloadPayments = useCallback(async (tok) => {
    if (!tok) { setPayments([]); return }
    try {
      const data = await apiGetPayments(tok)
      setPayments(data.payments || [])
    } catch (err) {
      console.error('[Audity] GET /api/payments failed:', err.message)
    }
  }, [])

  const reloadSettings = useCallback(async (tok) => {
    if (!tok) return
    try {
      const data = await apiGetPlatformSettings(tok)
      if (data.settings) {
        setTicketSalesEnabled(Boolean(data.settings.ticketSalesEnabled))
        setHallRentalEnabled(Boolean(data.settings.hallRentalEnabled))
      }
    } catch (err) {
      console.error('[Audity] GET /api/settings failed:', err.message)
    }
  }, [])

  useEffect(() => {
    reloadTickets(token, role)
    reloadReservations(token, role)
    reloadBlackouts(token)
    reloadPayments(token)
    reloadSettings(token)
  }, [token, role, reloadTickets, reloadReservations, reloadBlackouts, reloadPayments, reloadSettings])

  const updateTicketSalesEnabled = useCallback(
    async (val) => {
      setTicketSalesEnabled(val)
      if (token && role === 'owner') {
        try {
          const res = await apiUpdatePlatformSettings(token, { ticketSalesEnabled: val })
          if (res.settings && res.settings.ticketSalesEnabled !== undefined) {
            setTicketSalesEnabled(res.settings.ticketSalesEnabled)
          }
        } catch (err) {
          setTicketSalesEnabled(!val)
          pushToast(`FAILED TO PERSIST SETTING TO MONGODB: ${err.message}`, 'error')
        }
      }
    },
    [token, role, pushToast],
  )

  const updateHallRentalEnabled = useCallback(
    async (val) => {
      setHallRentalEnabled(val)
      if (token && role === 'owner') {
        try {
          const res = await apiUpdatePlatformSettings(token, { hallRentalEnabled: val })
          if (res.settings && res.settings.hallRentalEnabled !== undefined) {
            setHallRentalEnabled(res.settings.hallRentalEnabled)
          }
        } catch (err) {
          setHallRentalEnabled(!val)
          pushToast(`FAILED TO PERSIST SETTING TO MONGODB: ${err.message}`, 'error')
        }
      }
    },
    [token, role, pushToast],
  )

  /* ─── ATTENDEE: Atomic Booking & Cancellation ────────────────────────────── */

  const bookTickets = useCallback(
    async ({ eventId, quantity, method }) => {
      if (!token) {
        pushToast('YOU MUST BE LOGGED IN TO BOOK TICKETS', 'error')
        return null
      }
      try {
        const data = await apiBookTickets(token, eventId, quantity, method)
        if (data.ticket) {
          setTickets((prev) => [data.ticket, ...prev])
          await reloadEvents(token)
          await reloadPayments(token)
          pushToast(`PAYMENT CONFIRMED — TICKET ${data.ticket.id} ISSUED`)
          return data.ticket
        }
      } catch (err) {
        pushToast(`BOOKING FAILED: ${err.message}`, 'error')
        return null
      }
    },
    [token, reloadEvents, reloadPayments, pushToast],
  )

  const cancelTicket = useCallback(
    async (ticketId) => {
      if (!token) return
      try {
        const data = await apiCancelTicket(token, ticketId)
        if (data.ticket) {
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId || t._id === ticketId ? data.ticket : t)),
          )
          await reloadEvents(token)
          await reloadPayments(token)
          pushToast(`REGISTRATION ${ticketId} CANCELLED — REFUND SIMULATED`, 'warning')
        }
      } catch (err) {
        pushToast(`CANCELLATION FAILED: ${err.message}`, 'error')
      }
    },
    [token, reloadEvents, reloadPayments, pushToast],
  )

  /* ─── ORGANISER: Hall Booking & Check-in ──────────────────────────────────── */

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
      const bookedEvt = events.find(
        (e) => e.hallId === hallId && e.date === date && e.slotId === slotId && e.status === 'PUBLISHED',
      )
      if (bookedEvt || reservation) {
        const evt = bookedEvt || events.find((e) => e.id === reservation.eventId)
        if (!evt || evt.status !== 'CANCELLED') {
          return {
            state: 'OCCUPIED',
            reason: 'BOOKED EVENT',
            detail: evt
              ? `${evt.title} — ${evt.organiser}`
              : `Reserved by ${reservation?.organiser || 'Organiser'}`,
          }
        }
      }
      return { state: 'AVAILABLE', reason: null, detail: null }
    },
    [blackouts, reservations, events],
  )

  /**
   * rentHallAndPublish — atomitcally persists Event, Reservation, and Hall Rental Payment to MongoDB.
   */
  const rentHallAndPublish = useCallback(
    async ({ hallId, date, slotId, title, description, category, ticketPrice, capacity, method, total }) => {
      const hall = halls.find((h) => h.id === hallId || h._id === hallId)
      const slot = TIME_SLOTS.find((s) => s.id === slotId)
      if (!hall || !slot) return null

      try {
        const data = await apiCreateEvent(token, {
          title: title.trim(),
          description: description.trim(),
          category,
          hallId: hall._id || hall.id,
          date,
          slotId,
          ticketPrice: Number(ticketPrice) || 0,
          maxCapacity: capacity,
          method,
        })

        const newEvent = data.event
        setEvents((prev) => [newEvent, ...prev])
        if (data.reservation) {
          setReservations((prev) => [data.reservation, ...prev])
        } else {
          await reloadReservations(token, role)
        }
        if (data.payment) {
          setPayments((prev) => [data.payment, ...prev])
        } else {
          await reloadPayments(token)
        }

        pushToast(`HALL RENTED — "${title}" PUBLISHED TO ATTENDEE FEED`)
        return newEvent
      } catch (err) {
        pushToast(`FAILED TO CREATE EVENT: ${err.message}`, 'error')
        return null
      }
    },
    [halls, token, role, reloadReservations, reloadPayments, pushToast],
  )

  const checkInTicket = useCallback(
    async (rawId) => {
      if (!token) return { ok: false, code: 'UNAUTHORIZED', message: 'LOGIN REQUIRED' }
      try {
        const res = await apiCheckInTicket(token, rawId)
        if (res.ok && res.ticket) {
          setTickets((prev) =>
            prev.map((t) => (t.id === res.ticket.id || t._id === res.ticket._id ? res.ticket : t)),
          )
          pushToast(`CHECK-IN COMPLETE — ${res.ticket.id}`)
        }
        return res
      } catch (err) {
        return { ok: false, code: 'ERROR', message: err.message || 'CHECK-IN FAILED' }
      }
    },
    [token, pushToast],
  )

  /* ─── OWNER ──────────────────────────────────────────────────────────────── */

  const addBlackout = useCallback(
    async ({ hallId, date, slotId, reason, note }) => {
      const hall = halls.find((h) => h.id === hallId || h._id === hallId)
      if (!hall || !token) return null
      try {
        const data = await apiCreateBlackout(token, {
          hallId: hall._id || hall.id,
          date,
          slotId,
          reason,
          note,
        })
        if (data.blackout) {
          setBlackouts((prev) => [data.blackout, ...prev])
          pushToast('HALL SLOT BLOCKED — ORGANISER INSPECTOR UPDATED', 'warning')
          return data.blackout.id
        }
      } catch (err) {
        pushToast(`FAILED TO CREATE BLACKOUT: ${err.message}`, 'error')
        return null
      }
    },
    [halls, token, pushToast],
  )

  const removeBlackout = useCallback(
    async (id) => {
      if (!token) return
      try {
        await apiDeleteBlackout(token, id)
        setBlackouts((prev) => prev.filter((b) => b.id !== id && b._id !== id))
        pushToast('BLACKOUT RELEASED — SLOT AVAILABLE AGAIN')
      } catch (err) {
        pushToast(`FAILED TO REMOVE BLACKOUT: ${err.message}`, 'error')
      }
    },
    [token, pushToast],
  )

  const forceCancelEvent = useCallback(
    async (eventId, reason) => {
      try {
        const data = await cancelEventApi(token, eventId, reason || 'Cancelled by complex owner')
        const cancelledEvent = data.event

        setEvents((prev) =>
          prev.map((e) => (e.id === eventId || e._id === eventId ? { ...cancelledEvent } : e)),
        )
        await reloadTickets(token, role)
        await reloadReservations(token, role)
        await reloadPayments(token)

        pushToast(`EVENT FORCE CANCELLED — REFUNDS SIMULATED ON LEDGER`, 'error')
      } catch (err) {
        pushToast(`FORCE CANCELLATION FAILED: ${err.message}`, 'error')
      }
    },
    [token, role, reloadTickets, reloadReservations, reloadPayments, pushToast],
  )

  /* ─── DERIVED ─────────────────────────────────────────────────────────────── */

  const derived = useMemo(() => {
    const activeEvents = events.filter((e) => e.status === 'PUBLISHED')
    const confirmedTickets = tickets.filter((t) => t.status === 'CONFIRMED')

    const ticketRevenue = payments
      .filter((p) => p.type === 'TICKET' && p.status === 'PAID')
      .reduce((s, p) => s + p.amount, 0)
    const rentalRevenue = payments
      .filter((p) => p.type === 'HALL_RENTAL' && p.status === 'PAID')
      .reduce((s, p) => s + p.amount, 0)

    const organiserEvents = events.filter((e) => e.organiserName === organiserName)
    const organiserEventIds = organiserEvents.map((e) => e.id)
    const organiserSeatsSold = organiserEvents.reduce((s, e) => s + e.registeredCount, 0)
    const organiserRevenue = organiserEvents.reduce(
      (s, e) => s + e.registeredCount * e.ticketPrice,
      0,
    )
    const organiserRentalCost = reservations
      .filter((r) => r.organiser === organiserName && r.status === 'CONFIRMED')
      .reduce((s, r) => s + r.amount, 0)

    const totalVisitors = activeEvents.reduce((s, e) => s + e.registeredCount, 0)
    const totalCapacity = activeEvents.reduce((s, e) => s + e.maxCapacity, 0)
    const occupancyRate = totalCapacity ? Math.round((totalVisitors / totalCapacity) * 100) : 0

    const myTickets = tickets.filter((t) => t.ownedByUser || role === 'attendee')

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
  }, [events, tickets, payments, reservations, organiserName, role])

  const getEvent = useCallback((id) => events.find((e) => e.id === id || e._id === id) || null, [events])

  const hallStatus = useCallback(
    (hallId) => {
      const today = new Date().toISOString().slice(0, 10)
      const upcoming = events
        .filter((e) => (e.hallId === hallId || e.hall === hallId) && e.status === 'PUBLISHED' && e.date >= today)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
      const nextEvent = upcoming[0] || null
      const futureBlackout = blackouts
        .filter((b) => (b.hallId === hallId || b.hall === hallId) && b.date >= today)
        .sort((a, b) => (a.date < b.date ? -1 : 1))[0]

      let status = 'AVAILABLE'
      if (nextEvent && futureBlackout) {
        status = futureBlackout.date <= nextEvent.date ? 'BLACKED OUT' : 'OCCUPIED'
      } else if (nextEvent) {
        status = 'OCCUPIED'
      } else if (futureBlackout) {
        status = 'BLACKED OUT'
      }

      const hallEvents = events.filter((e) => (e.hallId === hallId || e.hall === hallId) && e.status === 'PUBLISHED')
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
    // Auth
    authUser,
    authLoading,
    token,
    login,
    register,
    logout,
    applyForOrganiser,
    // Identity
    role,
    user,
    organiserName,
    // Halls (MongoDB)
    halls,
    createHall,
    updateHall,
    setHallActive,
    reloadHalls,
    // Events (MongoDB)
    events,
    eventsLoading,
    reloadEvents,
    // Tickets (MongoDB)
    tickets,
    // Reservations (MongoDB)
    reservations,
    // Blackouts (MongoDB)
    blackouts,
    // Payments (MongoDB)
    payments,
    // Platform controls (MongoDB persisted)
    ticketSalesEnabled,
    setTicketSalesEnabled: updateTicketSalesEnabled,
    hallRentalEnabled,
    setHallRentalEnabled: updateHallRentalEnabled,
    globalQuery,
    setGlobalQuery,
    slots: TIME_SLOTS,
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

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Radar,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { CATEGORIES } from '@/data/mock-data'
import {
  Button,
  Field,
  Input,
  MicroLabel,
  Modal,
  Panel,
  PixelDivider,
  Pill,
  Select,
  TabBar,
  Textarea,
  formatDate,
  formatINR,
} from '@/components/audity/ui-kit'
import { cn } from '@/lib/utils'
import {
  getLocalTodayString,
  getTomorrowString,
  countDays,
  isValidDateString,
  HALL_OPERATIONAL_HOURS,
} from '@/lib/date-utils'

const PAYMENT_TABS = [
  { id: 'netbanking', label: 'Netbanking' },
  { id: 'card', label: 'Corporate card' },
  { id: 'upi', label: 'UPI' },
]

export function HallBooking() {
  const { halls, slots, inspectSlot, rentHallAndPublish, hallRentalEnabled } = useAudity()

  const todayStr = useMemo(() => getLocalTodayString(), [])
  const tomorrowStr = useMemo(() => getTomorrowString(), [])

  // Booking mode: 'timed' | 'full-day'
  const [bookingType, setBookingType] = useState('timed')

  // Date range state
  const [fromDate, setFromDate] = useState(tomorrowStr)
  const [toDate, setToDate] = useState(tomorrowStr)

  // Time state (for timed booking)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')
  const [slotId, setSlotId] = useState('morning')

  const [hallId, setHallId] = useState(() => halls[0]?.id || '')
  const [scanning, setScanning] = useState(false)

  // Sync hallId when MongoDB halls load asynchronously
  useEffect(() => {
    if (!halls.some((h) => h.id === hallId) && halls.length > 0) {
      setHallId(halls[0].id)
    }
  }, [halls, hallId])

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'TECH',
    ticketPrice: '999',
    capacity: '',
  })

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [method, setMethod] = useState('netbanking')
  const [phase, setPhase] = useState('idle') // idle | processing | done
  const [errors, setErrors] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hall = halls.find((h) => h.id === hallId)

  // Calculate day count
  const daysCount = useMemo(() => {
    if (!fromDate || !toDate) return 1
    const count = countDays(fromDate, toDate)
    return Math.max(1, count)
  }, [fromDate, toDate])

  // Real-time conflict inspection
  const inspection = useMemo(() => {
    return inspectSlot({
      hallId,
      fromDate,
      toDate,
      date: fromDate,
      bookingType,
      startTime: bookingType === 'full-day' ? HALL_OPERATIONAL_HOURS.startTime : startTime,
      endTime: bookingType === 'full-day' ? HALL_OPERATIONAL_HOURS.endTime : endTime,
      slotId,
    })
  }, [inspectSlot, hallId, fromDate, toDate, bookingType, startTime, endTime, slotId])

  // Brief scanning pulse whenever any parameter changes
  useEffect(() => {
    setScanning(true)
    const t = setTimeout(() => setScanning(false), 350)
    return () => clearTimeout(t)
  }, [hallId, fromDate, toDate, bookingType, startTime, endTime])

  // Pricing calculations
  const singleDayRentalFee = hall?.rentalFee || 0
  const rentalFee = singleDayRentalFee * daysCount
  const serviceCharge = Math.round(rentalFee * 0.05)
  const gst = Math.round((rentalFee + serviceCharge) * 0.18)
  const total = rentalFee + serviceCharge + gst

  const available =
    Boolean(hall) &&
    inspection.state === 'AVAILABLE' &&
    hallRentalEnabled

  const capacityValue = useMemo(
    () => Number(form.capacity || hall?.capacity || 0),
    [form.capacity, hall],
  )

  // Handle From Date changes & enforce To Date constraint
  function handleFromDateChange(newFrom) {
    setFromDate(newFrom)
    setFieldErrors((prev) => ({ ...prev, fromDate: null }))
    if (!toDate || toDate < newFrom) {
      setToDate(newFrom)
      setFieldErrors((prev) => ({ ...prev, toDate: null }))
    }
  }

  // Handle To Date changes
  function handleToDateChange(newTo) {
    setToDate(newTo)
    if (newTo < fromDate) {
      setFieldErrors((prev) => ({
        ...prev,
        toDate: 'To Date cannot be earlier than From Date',
      }))
    } else {
      setFieldErrors((prev) => ({ ...prev, toDate: null }))
    }
  }

  // Handle Preset Slot selection
  function handleApplySlotPreset(preset) {
    setSlotId(preset.id)
    setStartTime(preset.startTime)
    setEndTime(preset.endTime)
    setFieldErrors((prev) => ({ ...prev, fromTime: null, toTime: null }))
  }

  // Open Checkout with strict validation
  function openCheckout() {
    const errs = {}
    if (!hall) return setErrors('SELECT A VALID HALL TO PROCEED')

    // 1. Date range validation
    if (!fromDate) {
      errs.fromDate = 'From Date is required'
    } else if (fromDate < todayStr) {
      errs.fromDate = 'From Date cannot be earlier than today'
      return setErrors('BOOKING CANNOT START IN THE PAST')
    }

    if (!toDate) {
      errs.toDate = 'To Date is required'
    } else if (toDate < fromDate) {
      errs.toDate = 'To Date cannot be earlier than From Date'
      return setErrors('TO DATE CANNOT BE EARLIER THAN FROM DATE')
    }

    // 2. Time validation (if timed)
    if (bookingType === 'timed') {
      if (!startTime) errs.fromTime = 'Start time is required'
      if (!endTime) errs.toTime = 'End time is required'
      if (startTime && endTime && startTime >= endTime) {
        errs.toTime = 'End time must be later than start time'
        return setErrors('END TIME MUST BE LATER THAN START TIME')
      }
    }

    // 3. Form validation
    if (!form.title.trim()) return setErrors('EVENT NAME IS REQUIRED')
    if (!form.description.trim()) return setErrors('DESCRIPTION IS REQUIRED')
    if (capacityValue <= 0) return setErrors('EXPECTED CAPACITY MUST BE ABOVE ZERO')
    if (capacityValue > hall.capacity)
      return setErrors(`CAPACITY EXCEEDS ${hall.code || 'HALL'} LIMIT (${hall.capacity})`)

    // 4. Availability validation
    if (inspection.state !== 'AVAILABLE') {
      return setErrors(inspection.detail || inspection.reason || 'HALL IS NOT AVAILABLE FOR SELECTED SCHEDULE')
    }

    setErrors('')
    setFieldErrors({})
    setPhase('idle')
    setCheckoutOpen(true)
  }

  // Confirm Rental execution
  function confirmRental() {
    if (!hall || isSubmitting || phase === 'processing') return

    setIsSubmitting(true)
    setPhase('processing')

    const payload = {
      hallId,
      fromDate,
      toDate,
      date: fromDate,
      bookingType,
      startTime: bookingType === 'full-day' ? HALL_OPERATIONAL_HOURS.startTime : startTime,
      endTime: bookingType === 'full-day' ? HALL_OPERATIONAL_HOURS.endTime : endTime,
      slotId: bookingType === 'full-day' ? 'full-day' : (slotId || 'custom'),
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      ticketPrice: Number(form.ticketPrice || 0),
      capacity: capacityValue,
      method: method.toUpperCase(),
      total,
    }

    rentHallAndPublish(payload)
      .then((result) => {
        if (result) {
          setPhase('done')
          setTimeout(() => {
            setCheckoutOpen(false)
            setForm({ title: '', description: '', category: 'TECH', ticketPrice: '999', capacity: '' })
            setPhase('idle')
            setIsSubmitting(false)
          }, 950)
        } else {
          setPhase('idle')
          setIsSubmitting(false)
        }
      })
      .catch(() => {
        setPhase('idle')
        setIsSubmitting(false)
      })
  }

  return (
    <>
      <Panel
        label="Automated hall booking engine"
        accent
        right={
          <Pill tone={hallRentalEnabled ? 'success' : 'danger'} dot>
            {hallRentalEnabled ? 'Rental portal open' : 'Rental portal locked'}
          </Pill>
        }
        dense
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
          {/* Main Booking Controls */}
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            {/* Booking Type Selector */}
            <div className="mb-4">
              <MicroLabel className="mb-2 block text-foreground">Booking specification</MicroLabel>
              <div className="grid grid-cols-2 gap-2 rounded border border-border bg-background p-1">
                <button
                  type="button"
                  disabled={!hallRentalEnabled}
                  onClick={() => setBookingType('timed')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded py-2 px-3 font-mono text-xs uppercase tracking-wider transition-colors',
                    bookingType === 'timed'
                      ? 'bg-primary font-bold text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Timed booking
                </button>
                <button
                  type="button"
                  disabled={!hallRentalEnabled}
                  onClick={() => setBookingType('full-day')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded py-2 px-3 font-mono text-xs uppercase tracking-wider transition-colors',
                    bookingType === 'full-day'
                      ? 'bg-primary font-bold text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Full-day booking
                </button>
              </div>
            </div>

            {/* Hall & Date Range Controls */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Hall">
                <Select
                  value={hallId}
                  disabled={!hallRentalEnabled}
                  onChange={(e) => setHallId(e.target.value)}
                >
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.code} — {h.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="From date" hint={fromDate === todayStr ? 'Today' : ''}>
                <Input
                  type="date"
                  min={todayStr}
                  value={fromDate}
                  disabled={!hallRentalEnabled}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className={cn(fieldErrors.fromDate && 'border-destructive text-destructive')}
                />
                {fieldErrors.fromDate && (
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-destructive">
                    {fieldErrors.fromDate}
                  </p>
                )}
              </Field>

              <Field label="To date" hint={daysCount > 1 ? `${daysCount} days total` : 'Single day'}>
                <Input
                  type="date"
                  min={fromDate || todayStr}
                  value={toDate}
                  disabled={!hallRentalEnabled}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  className={cn(fieldErrors.toDate && 'border-destructive text-destructive')}
                />
                {fieldErrors.toDate && (
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-destructive">
                    {fieldErrors.toDate}
                  </p>
                )}
              </Field>
            </div>

            {/* Conditional Time Selection (hidden for Full-Day) */}
            {bookingType === 'timed' ? (
              <div className="mt-3 space-y-2 rounded border border-border/80 bg-surface-2 p-3">
                <div className="flex items-center justify-between">
                  <MicroLabel className="text-foreground">Daily usage time slot</MicroLabel>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    Applies to each selected calendar day
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="From time">
                    <Input
                      type="time"
                      value={startTime}
                      disabled={!hallRentalEnabled}
                      onChange={(e) => {
                        setStartTime(e.target.value)
                        setSlotId('custom')
                      }}
                    />
                  </Field>
                  <Field label="To time">
                    <Input
                      type="time"
                      value={endTime}
                      disabled={!hallRentalEnabled}
                      onChange={(e) => {
                        setEndTime(e.target.value)
                        setSlotId('custom')
                      }}
                    />
                    {startTime >= endTime && (
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-destructive">
                        End time must be later than start time
                      </p>
                    )}
                  </Field>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <MicroLabel className="mr-1">Presets:</MicroLabel>
                  {slots.map((s) => {
                    const isSelected = startTime === s.startTime && endTime === s.endTime
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!hallRentalEnabled}
                        onClick={() => handleApplySlotPreset(s)}
                        className={cn(
                          'rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/20 font-bold text-primary'
                            : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground',
                        )}
                      >
                        {s.label} ({s.startTime}–{s.endTime})
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  <Pill tone="primary" dot>
                    Full day
                  </Pill>
                  <span className="font-mono text-xs uppercase tracking-wider text-foreground">
                    Hall operational day reserved (08:00 – 22:00)
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  The hall is exclusively locked for the entire day across all {daysCount} selected date(s).
                  No other timed or full-day reservations can overlap this schedule.
                </p>
              </div>
            )}

            <PixelDivider className="my-4" />

            {/* Event Definition Form */}
            <div className="mb-3 flex items-center gap-2">
              <MicroLabel className="text-foreground">Event definition</MicroLabel>
              {!available && (
                <MicroLabel className="text-muted-foreground/70">
                  · locked until schedule clears
                </MicroLabel>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Field label="Event name">
                <Input
                  placeholder="E.G. EDGE COMPUTE CONFERENCE"
                  value={form.title}
                  disabled={!available}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  placeholder="Describe sessions, format and audience"
                  value={form.description}
                  disabled={!available}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Category">
                  <Select
                    value={form.category}
                    disabled={!available}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Ticket price (₹)">
                  <Input
                    type="number"
                    min="0"
                    value={form.ticketPrice}
                    disabled={!available}
                    onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
                  />
                </Field>
                <Field label="Expected capacity" hint={`MAX ${hall?.capacity || 0}`}>
                  <Input
                    type="number"
                    min="1"
                    max={hall?.capacity}
                    placeholder={String(hall?.capacity || '')}
                    value={form.capacity}
                    disabled={!available}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            {errors && (
              <p className="mt-3 border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-destructive">
                {errors}
              </p>
            )}

            <Button
              size="lg"
              className="mt-4 w-full sm:w-auto"
              disabled={!available || isSubmitting}
              onClick={openCheckout}
            >
              Rent hall
            </Button>
          </div>

          {/* Real-time Conflict Inspector Sidebar */}
          <aside className="bg-surface-2 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Radar
                className={cn('h-3.5 w-3.5 text-primary', scanning && 'animate-spin')}
                strokeWidth={2}
              />
              <MicroLabel className="text-foreground">Real-time conflict inspector</MicroLabel>
            </div>

            <div
              className={cn(
                'border p-4 transition-colors',
                inspection.state === 'AVAILABLE'
                  ? 'border-success/50 bg-success/5'
                  : 'border-destructive/50 bg-destructive/10',
              )}
            >
              {scanning ? (
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Inspecting building schedule…
                </div>
              ) : inspection.state === 'AVAILABLE' ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2} />
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-success">
                      Hall available
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-success/80">
                    Auto-approval eligible ({daysCount} day{daysCount > 1 ? 's' : ''})
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" strokeWidth={2} />
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-destructive">
                      Hall occupied / unavailable
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-destructive/90">
                    {inspection.reason}
                  </p>
                  {inspection.detail && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {inspection.detail}
                    </p>
                  )}
                </>
              )}
            </div>

            <PixelDivider className="my-4" />

            {/* Schedule & Hall Summary */}
            <dl className="space-y-2.5">
              <Line label="Hall" value={`${hall?.code} — ${hall?.name}`} />
              <Line label="Level" value={hall?.floor} />
              <Line label="Gate" value={hall?.entranceGate} />
              <Line label="Seats" value={`${hall?.capacity}`} />
              <Line
                label="Type"
                value={bookingType === 'full-day' ? 'Full day' : 'Timed'}
              />
              <Line
                label="Dates"
                value={
                  fromDate === toDate
                    ? `${formatDate(fromDate)} (Single day)`
                    : `${formatDate(fromDate)} – ${formatDate(toDate)} (${daysCount} days)`
                }
              />
              <Line
                label="Window"
                value={bookingType === 'full-day' ? 'Full day (08:00–22:00)' : `${startTime} – ${endTime} daily`}
              />
            </dl>

            <PixelDivider className="my-4" />

            {/* Financial Ledger Summary */}
            <dl className="space-y-2.5">
              <Line
                label={daysCount > 1 ? `Base rental (${daysCount}d)` : 'Base rental'}
                value={formatINR(rentalFee)}
              />
              <Line label="Service charge" value={formatINR(serviceCharge)} />
              <Line label="GST 18%" value={formatINR(gst)} />
              <Line label="Total" value={formatINR(total)} strong />
            </dl>
          </aside>
        </div>
      </Panel>

      {/* Checkout Modal */}
      <Modal
        open={checkoutOpen}
        onClose={() => phase !== 'processing' && setCheckoutOpen(false)}
        title="Hall rental checkout"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Simulated settlement · authoritative ledger lock
            </span>
            <Button
              disabled={phase !== 'idle' || isSubmitting}
              onClick={confirmRental}
            >
              {phase === 'processing' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Settling rental…
                </>
              ) : phase === 'done' ? (
                'Confirmed'
              ) : (
                'Pay rental & confirm'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="border border-border bg-background p-3">
            <MicroLabel className="text-primary">{form.title || 'UNTITLED EVENT'}</MicroLabel>
            <PixelDivider className="my-3" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <Line label="Hall" value={`${hall?.code} — ${hall?.name}`} />
              <Line
                label="Booking type"
                value={bookingType === 'full-day' ? 'Full day' : 'Timed'}
              />
              <Line
                label="Period"
                value={
                  fromDate === toDate
                    ? `${formatDate(fromDate)}`
                    : `${formatDate(fromDate)} – ${formatDate(toDate)} (${daysCount}d)`
                }
              />
              <Line
                label="Hours"
                value={bookingType === 'full-day' ? 'Full operational day' : `${startTime} – ${endTime} daily`}
              />
              <Line label="Capacity" value={`${capacityValue} seats`} />
            </dl>
          </div>

          <div>
            <MicroLabel className="mb-2 block">Payment method</MicroLabel>
            <TabBar tabs={PAYMENT_TABS} active={method} onChange={setMethod} />
            <div className="mt-3 space-y-3 border border-border bg-background p-3">
              {method === 'netbanking' && (
                <Field label="Corporate account">
                  <Select defaultValue="HDFC BANK — CURRENT A/C ••4412">
                    <option>HDFC BANK — CURRENT A/C ••4412</option>
                    <option>ICICI BANK — CURRENT A/C ••8890</option>
                  </Select>
                </Field>
              )}
              {method === 'card' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Card number" className="col-span-2">
                    <Input placeholder="5241 •••• •••• 3310" defaultValue="5241 8890 2214 3310" />
                  </Field>
                  <Field label="Expiry">
                    <Input defaultValue="11/29" />
                  </Field>
                  <Field label="CVV">
                    <Input type="password" defaultValue="123" maxLength={4} />
                  </Field>
                </div>
              )}
              {method === 'upi' && (
                <Field label="Business UPI ID">
                  <Input defaultValue="northwind@okaxis" />
                </Field>
              )}
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <ShieldCheck className="h-3 w-3 text-success" />
                <MicroLabel>Slot is held during settlement</MicroLabel>
              </div>
            </div>
          </div>

          <div className="border border-border bg-surface-2 p-3">
            <Line
              label={daysCount > 1 ? `Rental fee (${daysCount} days)` : 'Rental fee'}
              value={formatINR(rentalFee)}
            />
            <Line label="Service charge" value={formatINR(serviceCharge)} />
            <Line label="Taxes (GST 18%)" value={formatINR(gst)} />
            <PixelDivider className="my-2.5" />
            <Line label="Total" value={formatINR(total)} strong />
          </div>

          {phase === 'done' && (
            <p className="flex items-center gap-2 border border-success/50 bg-success/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Hall locked · event published to attendee feed
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}

function Line({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em]">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'text-sm text-primary' : 'text-foreground'}>{value}</span>
    </div>
  )
}

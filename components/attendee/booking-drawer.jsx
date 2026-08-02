'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Minus, Plus, ShieldCheck, Timer } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import {
  Button,
  Drawer,
  Field,
  Input,
  MicroLabel,
  PixelDivider,
  Pill,
  Select,
  TabBar,
  formatDate,
  formatINR,
  seatStatus,
} from '@/components/audity/ui-kit'
import { TicketPass } from './ticket-pass'

const PAYMENT_TABS = [
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Credit / Debit' },
  { id: 'netbanking', label: 'Netbanking' },
]

const METHOD_LABEL = { upi: 'UPI', card: 'CARD', netbanking: 'NETBANKING' }

export function BookingDrawer({ event, open, onClose }) {
  const { bookTickets, getEvent, ticketSalesEnabled } = useAudity()
  const live = event ? getEvent(event.id) : null

  const [quantity, setQuantity] = useState(1)
  const [method, setMethod] = useState('upi')
  const [secondsLeft, setSecondsLeft] = useState(300)
  const [phase, setPhase] = useState('form') // form | processing | done | expired
  const [issued, setIssued] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ upi: '', card: '', expiry: '', cvv: '', name: '', bank: 'HDFC BANK' })

  useEffect(() => {
    if (!open) return
    setQuantity(1)
    setMethod('upi')
    setSecondsLeft(300)
    setPhase('form')
    setIssued(null)
    setError('')
  }, [open, event?.id])

  useEffect(() => {
    if (!open || phase !== 'form') return
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t)
          setPhase('expired')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [open, phase])

  const status = useMemo(() => (live ? seatStatus(live) : null), [live])
  const maxQty = status ? Math.min(10, status.remaining) : 1
  const total = live ? live.ticketPrice * quantity : 0

  if (!live) return null

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  function validate() {
    if (method === 'upi' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(form.upi.trim()))
      return 'ENTER A VALID UPI ID (E.G. NAME@BANK)'
    if (method === 'card') {
      if (form.card.replace(/\s/g, '').length < 12) return 'ENTER A VALID CARD NUMBER'
      if (!/^\d{2}\/\d{2}$/.test(form.expiry)) return 'EXPIRY MUST BE MM/YY'
      if (form.cvv.length < 3) return 'ENTER A VALID CVV'
      if (!form.name.trim()) return 'ENTER CARDHOLDER NAME'
    }
    return ''
  }

  function handlePay() {
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setError('')
    setPhase('processing')
    setTimeout(() => {
      const ticket = bookTickets({ eventId: live.id, quantity, method: METHOD_LABEL[method] })
      setIssued(ticket)
      setPhase('done')
    }, 1500)
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={phase === 'done' ? 'Booking confirmed' : 'Seat booking'}
      footer={
        phase === 'done' ? (
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close & return to discovery
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em]">
              <span className="text-muted-foreground">Total payable</span>
              <span className="text-lg text-primary">{total === 0 ? 'FREE' : formatINR(total)}</span>
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={phase !== 'form' || !ticketSalesEnabled || status.remaining === 0}
              onClick={handlePay}
            >
              {phase === 'processing' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing payment
                </>
              ) : phase === 'expired' ? (
                'Session expired'
              ) : (
                'Pay & confirm'
              )}
            </Button>
          </div>
        )
      }
    >
      <div className="p-4">
        {phase === 'done' && issued ? (
          <TicketPass ticket={issued} event={live} />
        ) : (
          <>
            {/* event summary */}
            <div className="border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold uppercase leading-snug tracking-tight text-foreground">
                  {live.title}
                </h3>
                <Pill tone="primary">{live.category}</Pill>
              </div>
              <PixelDivider className="my-3" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <Sum label="Hall" value={`${live.hallCode} — ${live.hallName}`} />
                <Sum label="Floor" value={live.floor} />
                <Sum label="Gate" value={live.entranceGate} />
                <Sum label="Date" value={formatDate(live.date)} />
                <Sum label="Time" value={`${live.startTime} – ${live.endTime}`} />
                <Sum
                  label="Ticket price"
                  value={live.ticketPrice === 0 ? 'FREE' : formatINR(live.ticketPrice)}
                />
              </dl>
            </div>

            {/* timer */}
            <div
              className={`mt-4 flex items-center justify-between border px-3 py-2.5 ${
                phase === 'expired'
                  ? 'border-destructive/50 bg-destructive/10'
                  : secondsLeft < 60
                    ? 'border-warning/50 bg-warning/10'
                    : 'border-border bg-surface-2'
              }`}
            >
              <div className="flex items-center gap-2">
                <Timer
                  className={`h-3.5 w-3.5 ${phase === 'expired' ? 'text-destructive' : 'text-primary'}`}
                  strokeWidth={2}
                />
                <MicroLabel className="text-foreground">Checkout window</MicroLabel>
              </div>
              <span
                className={`font-mono text-lg tabular-nums tracking-[0.14em] ${
                  phase === 'expired' ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {mm}:{ss}
              </span>
            </div>

            {phase === 'expired' && (
              <div className="mt-3 flex items-start gap-2 border border-destructive/50 bg-destructive/10 px-3 py-2.5">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-destructive" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your seat hold expired. Close this panel and re-open the booking to restart the
                  checkout window.
                </p>
              </div>
            )}

            {/* quantity */}
            <div className="mt-4">
              <MicroLabel className="mb-2 block">Ticket quantity</MicroLabel>
              <div className="flex items-center justify-between border border-border bg-input px-2 py-2">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="cursor-pointer border border-border-strong p-1.5 text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="font-mono text-xl tabular-nums text-foreground">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= maxQty}
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="cursor-pointer border border-border-strong p-1.5 text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {status.remaining} seats remaining · max {maxQty} per booking
              </p>
            </div>

            {/* payment */}
            <div className="mt-5">
              <MicroLabel className="mb-2 block">Payment method</MicroLabel>
              <TabBar tabs={PAYMENT_TABS} active={method} onChange={setMethod} />

              <div className="mt-3 space-y-3 border border-border bg-background p-3">
                {method === 'upi' && (
                  <>
                    <Field label="UPI ID">
                      <Input
                        placeholder="ananya@okhdfc"
                        value={form.upi}
                        onChange={(e) => setForm({ ...form, upi: e.target.value })}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      {['GPAY', 'PHONEPE', 'PAYTM'].map((app) => (
                        <span
                          key={app}
                          className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {method === 'card' && (
                  <>
                    <Field label="Card number">
                      <Input
                        inputMode="numeric"
                        placeholder="4111 1111 1111 1111"
                        value={form.card}
                        onChange={(e) => setForm({ ...form, card: e.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Expiry">
                        <Input
                          placeholder="09/28"
                          value={form.expiry}
                          onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                        />
                      </Field>
                      <Field label="CVV">
                        <Input
                          type="password"
                          maxLength={4}
                          placeholder="•••"
                          value={form.cvv}
                          onChange={(e) => setForm({ ...form, cvv: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="Cardholder name">
                      <Input
                        placeholder="ANANYA RAO"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </Field>
                  </>
                )}

                {method === 'netbanking' && (
                  <Field label="Select bank" hint="You will be redirected in a simulated flow">
                    <Select value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })}>
                      {['HDFC BANK', 'ICICI BANK', 'STATE BANK OF INDIA', 'AXIS BANK', 'KOTAK MAHINDRA'].map(
                        (b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ),
                      )}
                    </Select>
                  </Field>
                )}

                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <ShieldCheck className="h-3 w-3 text-success" />
                  <MicroLabel>Simulated gateway · no real payment is processed</MicroLabel>
                </div>
              </div>
            </div>

            {/* totals */}
            <div className="mt-4 border border-border bg-surface-2 p-3">
              <Line label="Ticket price" value={live.ticketPrice === 0 ? 'FREE' : formatINR(live.ticketPrice)} />
              <Line label="Quantity" value={`× ${quantity}`} />
              <PixelDivider className="my-2.5" />
              <Line label="Total" value={total === 0 ? 'FREE' : formatINR(total)} strong />
            </div>

            {error && (
              <p className="mt-3 border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-destructive">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </Drawer>
  )
}

function Sum({ label, value }) {
  return (
    <div>
      <dt>
        <MicroLabel>{label}</MicroLabel>
      </dt>
      <dd className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground">{value}</dd>
    </div>
  )
}

function Line({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em]">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'text-base text-primary' : 'text-foreground'}>{value}</span>
    </div>
  )
}

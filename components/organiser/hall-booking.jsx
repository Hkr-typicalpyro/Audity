'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Radar, ShieldCheck, XCircle } from 'lucide-react'
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

const PAYMENT_TABS = [
  { id: 'netbanking', label: 'Netbanking' },
  { id: 'card', label: 'Corporate card' },
  { id: 'upi', label: 'UPI' },
]

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function HallBooking() {
  const { halls, slots, inspectSlot, rentHallAndPublish, hallRentalEnabled } = useAudity()

  const [date, setDate] = useState(tomorrowISO())
  const [hallId, setHallId] = useState(() => halls[0]?.id || '')
  const [slotId, setSlotId] = useState('morning')
  const [scanning, setScanning] = useState(false)

  // Sync hallId when MongoDB halls load asynchronously and replace initial mock IDs
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

  const hall = halls.find((h) => h.id === hallId)
  const slot = slots.find((s) => s.id === slotId)
  const inspection = inspectSlot({ hallId, date, slotId })

  // brief "inspecting" pulse whenever the trio changes
  useEffect(() => {
    setScanning(true)
    const t = setTimeout(() => setScanning(false), 450)
    return () => clearTimeout(t)
  }, [hallId, date, slotId])

  const rentalFee = hall?.rentalFee || 0
  const serviceCharge = Math.round(rentalFee * 0.05)
  const gst = Math.round((rentalFee + serviceCharge) * 0.18)
  const total = rentalFee + serviceCharge + gst

  const available = Boolean(hall) && Boolean(slot) && inspection.state === 'AVAILABLE' && hallRentalEnabled
  const capacityValue = useMemo(
    () => Number(form.capacity || hall?.capacity || 0),
    [form.capacity, hall],
  )

  function openCheckout() {
    if (!hall) return setErrors('SELECT A VALID HALL TO PROCEED')
    if (!slot) return setErrors('SELECT A VALID TIME SLOT TO PROCEED')
    if (!form.title.trim()) return setErrors('EVENT NAME IS REQUIRED')
    if (!form.description.trim()) return setErrors('DESCRIPTION IS REQUIRED')
    if (capacityValue <= 0) return setErrors('EXPECTED CAPACITY MUST BE ABOVE ZERO')
    if (capacityValue > hall.capacity) return setErrors(`CAPACITY EXCEEDS ${hall.code || 'HALL'} LIMIT (${hall.capacity})`)
    setErrors('')
    setPhase('idle')
    setCheckoutOpen(true)
  }

  function confirmRental() {
    if (!hall || !slot) return
    setPhase('processing')
    const payload = {
      hallId,
      date,
      slotId,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      ticketPrice: Number(form.ticketPrice || 0),
      capacity: capacityValue,
      method: method.toUpperCase(),
      total,
    }
    rentHallAndPublish(payload).then((result) => {
      if (result) {
        setPhase('done')
        setTimeout(() => {
          setCheckoutOpen(false)
          setForm({ title: '', description: '', category: 'TECH', ticketPrice: '999', capacity: '' })
        }, 900)
      } else {
        setPhase('idle')
      }
    }).catch(() => {
      setPhase('idle')
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
          {/* inputs */}
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Date">
                <Input
                  type="date"
                  value={date}
                  disabled={!hallRentalEnabled}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
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
              <Field label="Time slot">
                <Select
                  value={slotId}
                  disabled={!hallRentalEnabled}
                  onChange={(e) => setSlotId(e.target.value)}
                >
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} · {s.startTime}–{s.endTime}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <PixelDivider className="my-4" />

            <div className="mb-3 flex items-center gap-2">
              <MicroLabel className="text-foreground">Event definition</MicroLabel>
              {!available && (
                <MicroLabel className="text-muted-foreground/70">
                  · locked until slot clears
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

            <Button size="lg" className="mt-4 w-full sm:w-auto" disabled={!available} onClick={openCheckout}>
              Rent hall
            </Button>
          </div>

          {/* conflict inspector */}
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
                'border p-4',
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
                    Auto-approval eligible
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" strokeWidth={2} />
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-destructive">
                      Hall occupied
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

            <dl className="space-y-2.5">
              <Line label="Hall" value={`${hall?.code} — ${hall?.name}`} />
              <Line label="Level" value={hall?.floor} />
              <Line label="Gate" value={hall?.entranceGate} />
              <Line label="Seats" value={`${hall?.capacity}`} />
              <Line label="Date" value={formatDate(date)} />
              <Line label="Window" value={`${slot?.startTime} – ${slot?.endTime}`} />
            </dl>

            <PixelDivider className="my-4" />

            <dl className="space-y-2.5">
              <Line label="Base rental" value={formatINR(rentalFee)} />
              <Line label="Service charge" value={formatINR(serviceCharge)} />
              <Line label="GST 18%" value={formatINR(gst)} />
              <Line label="Total" value={formatINR(total)} strong />
            </dl>
          </aside>
        </div>
      </Panel>

      {/* checkout */}
      <Modal
        open={checkoutOpen}
        onClose={() => phase !== 'processing' && setCheckoutOpen(false)}
        title="Hall rental checkout"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Simulated settlement · no real charge
            </span>
            <Button disabled={phase !== 'idle'} onClick={confirmRental}>
              {phase === 'processing' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Settling rental
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
              <Line label="Date" value={formatDate(date)} />
              <Line label="Time" value={`${slot?.startTime} – ${slot?.endTime}`} />
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
            <Line label="Rental fee" value={formatINR(rentalFee)} />
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

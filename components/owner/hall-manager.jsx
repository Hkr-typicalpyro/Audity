'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarOff,
  DoorOpen,
  Edit3,
  Layers,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { BLACKOUT_REASONS } from '@/data/mock-data'
import {
  Button,
  CapacityBar,
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

const statusTone = {
  AVAILABLE: 'success',
  OCCUPIED: 'primary',
  'BLACKED OUT': 'danger',
}

// ─── Empty hall form ──────────────────────────────────────────────────────────

const EMPTY_HALL_FORM = {
  code: '',
  name: '',
  floor: '',
  entranceGate: '',
  capacity: '',
  rentalFee: '',
}

export function HallManager() {
  const {
    halls,
    slots,
    blackouts,
    addBlackout,
    removeBlackout,
    hallStatus,
    pushToast,
    createHall,
    updateHall,
    setHallActive,
  } = useAudity()

  // ─── Blackout form ──────────────────────────────────────────────────────────
  const [blackoutOpen, setBlackoutOpen] = useState(false)
  const [blackoutForm, setBlackoutForm] = useState({
    hallId: halls[0]?.id || '',
    date: '',
    slotId: slots[0]?.id || 'morning',
    reason: BLACKOUT_REASONS[0],
    note: '',
  })

  useEffect(() => {
    if (!halls.some((h) => h.id === blackoutForm.hallId) && halls.length > 0) {
      setBlackoutForm((f) => ({ ...f, hallId: halls[0].id }))
    }
  }, [halls, blackoutForm.hallId])

  const today = new Date().toISOString().slice(0, 10)
  const setB = (k) => (e) => setBlackoutForm((f) => ({ ...f, [k]: e.target.value }))

  const duplicate = useMemo(
    () =>
      blackouts.some(
        (b) =>
          b.hallId === blackoutForm.hallId &&
          b.date === blackoutForm.date &&
          b.slotId === blackoutForm.slotId,
      ),
    [blackouts, blackoutForm],
  )

  const submitBlackout = async () => {
    if (!blackoutForm.date) {
      pushToast('SELECT A DATE TO BLOCK', 'error')
      return
    }
    if (duplicate) {
      pushToast('SLOT ALREADY BLOCKED', 'error')
      return
    }
    await addBlackout(blackoutForm)
    setBlackoutForm((f) => ({ ...f, date: '', note: '' }))
    setBlackoutOpen(false)
  }

  // ─── Create Hall modal ──────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_HALL_FORM)
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const setC = (k) => (e) => setCreateForm((f) => ({ ...f, [k]: e.target.value }))

  const submitCreate = async () => {
    setCreateError('')
    if (!createForm.code.trim()) return setCreateError('Hall code is required')
    if (!createForm.name.trim()) return setCreateError('Hall name is required')
    if (!createForm.floor.trim()) return setCreateError('Floor is required')
    if (!createForm.entranceGate.trim()) return setCreateError('Entrance gate is required')
    const cap = Number(createForm.capacity)
    if (!cap || cap < 1) return setCreateError('Capacity must be at least 1')
    const fee = Number(createForm.rentalFee)
    if (isNaN(fee) || fee < 0) return setCreateError('Rental fee must be 0 or more')

    setCreateLoading(true)
    try {
      await createHall({
        code: createForm.code.trim().toUpperCase(),
        name: createForm.name.trim(),
        floor: createForm.floor.trim(),
        entranceGate: createForm.entranceGate.trim(),
        capacity: cap,
        rentalFee: fee,
      })
      pushToast(`HALL ${createForm.code.toUpperCase()} CREATED`)
      setCreateForm(EMPTY_HALL_FORM)
      setCreateOpen(false)
    } catch (err) {
      setCreateError(err.message || 'Failed to create hall')
    } finally {
      setCreateLoading(false)
    }
  }

  // ─── Edit Hall modal ────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_HALL_FORM)
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const openEdit = (hall) => {
    setEditTarget(hall)
    setEditForm({
      code: hall.code,
      name: hall.hallName || hall.name,
      floor: hall.floor,
      entranceGate: hall.entranceGate,
      capacity: String(hall.capacity),
      rentalFee: String(hall.rentalFee),
    })
    setEditError('')
  }

  const setE = (k) => (e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))

  const submitEdit = async () => {
    setEditError('')
    if (!editForm.code.trim()) return setEditError('Hall code is required')
    if (!editForm.name.trim()) return setEditError('Hall name is required')
    if (!editForm.floor.trim()) return setEditError('Floor is required')
    if (!editForm.entranceGate.trim()) return setEditError('Entrance gate is required')
    const cap = Number(editForm.capacity)
    if (!cap || cap < 1) return setEditError('Capacity must be at least 1')
    const fee = Number(editForm.rentalFee)
    if (isNaN(fee) || fee < 0) return setEditError('Rental fee must be 0 or more')

    setEditLoading(true)
    try {
      // Use _id for the API call — never hall.id which may differ
      const mongoId = editTarget._id || editTarget.id
      await updateHall(mongoId, {
        code: editForm.code.trim().toUpperCase(),
        name: editForm.name.trim(),
        floor: editForm.floor.trim(),
        entranceGate: editForm.entranceGate.trim(),
        capacity: cap,
        rentalFee: fee,
      })
      pushToast(`HALL ${editForm.code.toUpperCase()} UPDATED`)
      setEditTarget(null)
    } catch (err) {
      setEditError(err.message || 'Failed to update hall')
    } finally {
      setEditLoading(false)
    }
  }

  // ─── Toggle active status ────────────────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState(null)

  const toggleStatus = async (hall) => {
    const mongoId = hall._id || hall.id
    setStatusLoading(mongoId)
    try {
      await setHallActive(mongoId, !hall.isActive)
      pushToast(
        hall.isActive
          ? `HALL ${hall.code} DISABLED`
          : `HALL ${hall.code} RE-ENABLED`,
        hall.isActive ? 'warning' : 'success',
      )
    } catch (err) {
      pushToast(err.message || 'Failed to update hall status', 'error')
    } finally {
      setStatusLoading(null)
    }
  }

  const sortedBlackouts = [...blackouts].sort((a, b) => (a.date < b.date ? -1 : 1))

  return (
    <div className="space-y-4">
      {/* ─── Hall cards ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <MicroLabel>All halls</MicroLabel>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New hall
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {halls.map((h) => {
          const s = hallStatus(h.id)
          const hallName = h.hallName || h.name
          const disabled = h.isActive === false
          return (
            <Panel
              key={h.id}
              label={h.code}
              right={
                <div className="flex items-center gap-2">
                  {disabled && <Pill tone="danger">Disabled</Pill>}
                  <Pill tone={disabled ? 'neutral' : statusTone[s.status]} dot>
                    {disabled ? 'INACTIVE' : s.status}
                  </Pill>
                </div>
              }
            >
              <h3 className="text-lg font-bold uppercase tracking-tight text-foreground">
                {hallName}
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                <Meta icon={Layers} label="Floor" value={h.floor} />
                <Meta icon={DoorOpen} label="Gate" value={h.entranceGate.replace('Entrance ', '')} />
                <Meta label="Seats" value={`${h.capacity}`} />
                <Meta label="Rental" value={formatINR(h.rentalFee)} />
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <MicroLabel>Seat load</MicroLabel>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                    {s.occupancy}% · {s.scheduled} EVENT(S)
                  </span>
                </div>
                <CapacityBar
                  percent={s.occupancy}
                  tone={s.occupancy >= 85 ? 'danger' : s.occupancy >= 60 ? 'warning' : 'success'}
                />
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <MicroLabel>Next in hall</MicroLabel>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                  {s.nextEvent
                    ? `${s.nextEvent.title} — ${formatDate(s.nextEvent.date)} · ${s.nextEvent.startTime}`
                    : s.blackout
                      ? `Blocked ${formatDate(s.blackout.date)} — ${s.blackout.reason}`
                      : 'No scheduled activity. Hall open for rental.'}
                </p>
              </div>

              {/* ─ Actions ─ */}
              <div className="mt-4 flex gap-2 border-t border-border pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(h)}
                  className="flex-1"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant={disabled ? 'outline' : 'ghost'}
                  disabled={statusLoading === (h._id || h.id)}
                  onClick={() => toggleStatus(h)}
                >
                  {disabled ? (
                    <><Power className="h-3.5 w-3.5" /> Enable</>
                  ) : (
                    <><PowerOff className="h-3.5 w-3.5" /> Disable</>
                  )}
                </Button>
              </div>
            </Panel>
          )
        })}
      </div>

      {/* ─── Blackout register ───────────────────────────────────────────── */}
      <Panel
        label="Blackout register"
        right={
          <Button size="sm" onClick={() => {
            setBlackoutForm((f) => ({ ...f, hallId: halls[0]?.id || '' }))
            setBlackoutOpen(true)
          }}>
            <CalendarOff className="h-3.5 w-3.5" /> Block a slot
          </Button>
        }
        dense
      >
        {sortedBlackouts.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Wrench}
              title="No blackouts scheduled"
              description="Block a hall slot to reserve it for maintenance or private use. Organisers will immediately see it as occupied in their conflict inspector."
            />
          </div>
        ) : (
          <ul>
            {sortedBlackouts.map((b) => {
              const hall = halls.find((h) => h.id === b.hallId)
              const slot = slots.find((s) => s.id === b.slotId)
              const past = b.date < today
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-[150px]">
                    <MicroLabel className="text-foreground">{hall?.code}</MicroLabel>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {formatDate(b.date)} · {slot?.label}
                    </p>
                  </div>
                  <Pill tone={past ? 'neutral' : 'danger'}>{b.reason}</Pill>
                  {b.note && (
                    <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{b.note}</p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => removeBlackout(b.id)}
                    aria-label={`Release blackout on ${hall?.code} ${formatDate(b.date)}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Release
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {/* ─── Block slot modal ────────────────────────────────────────────── */}
      <Modal
        open={blackoutOpen}
        onClose={() => setBlackoutOpen(false)}
        title="Block hall slot"
        footer={
          <div className="flex items-center justify-between gap-3">
            <MicroLabel className={duplicate ? 'text-destructive' : ''}>
              {duplicate ? 'Slot already blocked' : 'Applies instantly to organiser inspector'}
            </MicroLabel>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setBlackoutOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitBlackout} disabled={duplicate}>
                Confirm block
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hall">
              <Select value={blackoutForm.hallId} onChange={setB('hallId')}>
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.code} — {h.hallName || h.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" min={today} value={blackoutForm.date} onChange={setB('date')} />
            </Field>
            <Field label="Slot">
              <Select value={blackoutForm.slotId} onChange={setB('slotId')}>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} · {s.startTime}–{s.endTime}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reason">
              <Select value={blackoutForm.reason} onChange={setB('reason')}>
                {BLACKOUT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Internal note" hint="Visible to organisers as blackout detail.">
            <Textarea
              value={blackoutForm.note}
              onChange={setB('note')}
              placeholder="e.g. Rigging inspection and truss load test"
            />
          </Field>
        </div>
      </Modal>

      {/* ─── Create Hall modal ────────────────────────────────────────────── */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError('') }}
        title="Create new hall"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setCreateOpen(false); setCreateError('') }}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitCreate} disabled={createLoading}>
              {createLoading ? 'Creating…' : 'Create hall'}
            </Button>
          </div>
        }
      >
        <HallForm
          form={createForm}
          set={setC}
          error={createError}
        />
      </Modal>

      {/* ─── Edit Hall modal ──────────────────────────────────────────────── */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => { setEditTarget(null); setEditError('') }}
        title={`Edit ${editTarget?.code || 'hall'}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setEditTarget(null); setEditError('') }}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitEdit} disabled={editLoading}>
              {editLoading ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      >
        <HallForm
          form={editForm}
          set={setE}
          error={editError}
        />
      </Modal>
    </div>
  )
}

/* ─── Shared hall form ──────────────────────────────────────────────────────── */

function HallForm({ form, set, error }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Hall code" hint="e.g. HALL D">
          <Input
            value={form.code}
            onChange={set('code')}
            placeholder="HALL D"
          />
        </Field>
        <Field label="Hall name">
          <Input
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. North Wing Theatre"
          />
        </Field>
        <Field label="Floor">
          <Input
            value={form.floor}
            onChange={set('floor')}
            placeholder="e.g. Level 4"
          />
        </Field>
        <Field label="Entrance gate">
          <Input
            value={form.entranceGate}
            onChange={set('entranceGate')}
            placeholder="e.g. Entrance Gate 4"
          />
        </Field>
        <Field label="Seating capacity">
          <Input
            type="number"
            min="1"
            value={form.capacity}
            onChange={set('capacity')}
            placeholder="e.g. 300"
          />
        </Field>
        <Field label="Rental fee (₹)">
          <Input
            type="number"
            min="0"
            value={form.rentalFee}
            onChange={set('rentalFee')}
            placeholder="e.g. 75000"
          />
        </Field>
      </div>
      {error && (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/* ─── Meta cell ─────────────────────────────────────────────────────────────── */

function Meta({ icon: Icon, label, value }) {
  return (
    <div>
      <MicroLabel className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" strokeWidth={1.75} />}
        {label}
      </MicroLabel>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground">
        {value}
      </p>
    </div>
  )
}

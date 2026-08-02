'use client'

import { useMemo, useState } from 'react'
import { CalendarOff, DoorOpen, Layers, Trash2, Wrench } from 'lucide-react'
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

export function HallManager() {
  const { halls, slots, blackouts, addBlackout, removeBlackout, hallStatus, pushToast } = useAudity()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    hallId: halls[0].id,
    date: '',
    slotId: slots[0].id,
    reason: BLACKOUT_REASONS[0],
    note: '',
  })

  const today = new Date().toISOString().slice(0, 10)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const duplicate = useMemo(
    () =>
      blackouts.some(
        (b) => b.hallId === form.hallId && b.date === form.date && b.slotId === form.slotId,
      ),
    [blackouts, form],
  )

  const submit = () => {
    if (!form.date) {
      pushToast('SELECT A DATE TO BLOCK', 'error')
      return
    }
    if (duplicate) {
      pushToast('SLOT ALREADY BLOCKED', 'error')
      return
    }
    addBlackout(form)
    setForm((f) => ({ ...f, date: '', note: '' }))
    setOpen(false)
  }

  const sortedBlackouts = [...blackouts].sort((a, b) => (a.date < b.date ? -1 : 1))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {halls.map((h) => {
          const s = hallStatus(h.id)
          return (
            <Panel key={h.id} label={h.code} right={<Pill tone={statusTone[s.status]} dot>{s.status}</Pill>}>
              <h3 className="text-lg font-bold uppercase tracking-tight text-foreground">{h.name}</h3>
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
            </Panel>
          )
        })}
      </div>

      <Panel
        label="Blackout register"
        right={
          <Button size="sm" onClick={() => setOpen(true)}>
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Block hall slot"
        footer={
          <div className="flex items-center justify-between gap-3">
            <MicroLabel className={duplicate ? 'text-destructive' : ''}>
              {duplicate ? 'Slot already blocked' : 'Applies instantly to organiser inspector'}
            </MicroLabel>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={duplicate}>
                Confirm block
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hall">
              <Select value={form.hallId} onChange={set('hallId')}>
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.code} — {h.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" min={today} value={form.date} onChange={set('date')} />
            </Field>
            <Field label="Slot">
              <Select value={form.slotId} onChange={set('slotId')}>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} · {s.startTime}–{s.endTime}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reason">
              <Select value={form.reason} onChange={set('reason')}>
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
              value={form.note}
              onChange={set('note')}
              placeholder="e.g. Rigging inspection and truss load test"
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

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

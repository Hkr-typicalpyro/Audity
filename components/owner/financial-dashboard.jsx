'use client'

import { Activity, Building, IndianRupee, Users } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { CapacityBar, MicroLabel, Panel, StatBlock, formatINR } from '@/components/audity/ui-kit'

export function FinancialDashboard() {
  const { rentalRevenue, totalVisitors, occupancyRate, activeEvents, payments, ticketRevenue, halls } =
    useAudity()

  const refunded = payments.filter((p) => p.status === 'REFUNDED')
  const refundedTotal = refunded.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          label="Total hall rental revenue"
          value={formatINR(rentalRevenue)}
          sub={`${payments.filter((p) => p.type === 'HALL_RENTAL' && p.status === 'PAID').length} settlements`}
          tone="primary"
          icon={IndianRupee}
        />
        <StatBlock
          label="Total complex visitors"
          value={totalVisitors.toLocaleString('en-IN')}
          sub="Confirmed seat holders"
          tone="success"
          icon={Users}
        />
        <StatBlock
          label="Building occupancy rate"
          value={`${occupancyRate}%`}
          sub="Seats sold vs published capacity"
          tone="secondary"
          icon={Activity}
        />
        <StatBlock
          label="Active events"
          value={activeEvents.length}
          sub={`${halls.length} halls in service`}
          icon={Building}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel label="Revenue ledger">
          <dl className="space-y-3">
            <Row label="Hall rental (paid)" value={formatINR(rentalRevenue)} />
            <Row label="Ticket gateway volume" value={formatINR(ticketRevenue)} />
            <Row label="Refunded / reversed" value={`− ${formatINR(refundedTotal)}`} danger />
            <div className="border-t border-border pt-3">
              <Row label="Net complex position" value={formatINR(rentalRevenue - refundedTotal)} strong />
            </div>
          </dl>
        </Panel>

        <Panel label="Occupancy load by hall">
          <ul className="space-y-4">
            {halls.map((h) => {
              const hallEvents = activeEvents.filter((e) => e.hallId === h.id)
              const seats = hallEvents.reduce((s, e) => s + e.registeredCount, 0)
              const cap = hallEvents.reduce((s, e) => s + e.maxCapacity, 0)
              const pct = cap ? Math.round((seats / cap) * 100) : 0
              return (
                <li key={h.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <MicroLabel className="text-foreground">
                      {h.code} · {h.name}
                    </MicroLabel>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {seats}/{cap || 0} · {pct}%
                    </span>
                  </div>
                  <CapacityBar percent={pct} tone={pct >= 85 ? 'danger' : pct >= 60 ? 'warning' : 'success'} />
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Row({ label, value, strong, danger }) {
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          strong ? 'text-base text-primary' : danger ? 'text-destructive' : 'text-foreground'
        }
      >
        {value}
      </span>
    </div>
  )
}

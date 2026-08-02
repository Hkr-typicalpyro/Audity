'use client'

import { CalendarCheck, Coins, Landmark, Users } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { CapacityBar, MicroLabel, Panel, StatBlock, formatDate, formatINR } from '@/components/audity/ui-kit'

export function OrganiserAnalytics() {
  const {
    organiserEvents,
    organiserSeatsSold,
    organiserRevenue,
    organiserRentalCost,
    organiserName,
  } = useAudity()

  const net = organiserRevenue - organiserRentalCost

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          label="Total events hosted"
          value={organiserEvents.length}
          sub={`${organiserEvents.filter((e) => e.status === 'PUBLISHED').length} published`}
          tone="primary"
          icon={CalendarCheck}
        />
        <StatBlock
          label="Total seats sold"
          value={organiserSeatsSold}
          sub="Across all owned events"
          tone="success"
          icon={Users}
        />
        <StatBlock
          label="Revenue collected"
          value={formatINR(organiserRevenue)}
          sub="Gross ticket value"
          tone="secondary"
          icon={Coins}
        />
        <StatBlock
          label="Hall rental cost"
          value={formatINR(organiserRentalCost)}
          sub={net >= 0 ? `NET ${formatINR(net)}` : `DEFICIT ${formatINR(Math.abs(net))}`}
          tone={net >= 0 ? 'default' : 'danger'}
          icon={Landmark}
        />
      </div>

      <Panel label={`Portfolio · ${organiserName}`} dense>
        {organiserEvents.length === 0 ? (
          <p className="p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            No events under this organiser yet
          </p>
        ) : (
          <ul>
            {organiserEvents.map((e) => {
              const pct = e.maxCapacity ? Math.round((e.registeredCount / e.maxCapacity) * 100) : 0
              return (
                <li
                  key={e.id}
                  className="grid grid-cols-1 gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[1.6fr_1fr_1fr] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase tracking-tight text-foreground">
                      {e.title}
                    </p>
                    <MicroLabel className="mt-1 block">
                      {e.hallCode} · {formatDate(e.date)} · {e.startTime}
                      {e.status === 'CANCELLED' ? ' · CANCELLED' : ''}
                    </MicroLabel>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
                      <span className="text-muted-foreground">Fill rate</span>
                      <span className="text-foreground">{pct}%</span>
                    </div>
                    <CapacityBar percent={pct} tone={pct >= 85 ? 'danger' : pct >= 60 ? 'warning' : 'success'} />
                  </div>
                  <div className="flex items-center justify-between md:justify-end md:gap-6">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {e.registeredCount}/{e.maxCapacity} seats
                    </span>
                    <span className="font-mono text-xs text-primary">
                      {formatINR(e.registeredCount * e.ticketPrice)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}

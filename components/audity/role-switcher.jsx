'use client'

import { Ticket, ClipboardList, Zap } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { cn } from '@/lib/utils'

const ROLES = [
  { id: 'attendee', label: 'Attendee', icon: Ticket, sub: 'Visitor / Ticket Buyer' },
  { id: 'organiser', label: 'Organiser', icon: ClipboardList, sub: 'Event Organiser' },
  { id: 'owner', label: 'Complex Owner', icon: Zap, sub: 'Building Admin' },
]

export function RoleSwitcher() {
  const { role, setRole } = useAudity()

  return (
    <div
      role="tablist"
      aria-label="Switch role view"
      className="flex w-full border border-border bg-surface xl:w-auto"
    >
      {ROLES.map((r) => {
        const isActive = role === r.id
        const Icon = r.icon
        return (
          <button
            key={r.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => setRole(r.id)}
            className={cn(
              'group flex flex-1 cursor-pointer items-center gap-2.5 border-r border-border px-3 py-2.5 text-left transition-colors last:border-r-0 xl:flex-none xl:px-5',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="min-w-0">
              <span className="block font-mono text-[10px] uppercase leading-none tracking-[0.16em]">
                {r.label}
              </span>
              <span
                className={cn(
                  'mt-1 hidden truncate font-mono text-[9px] uppercase tracking-[0.14em] lg:block',
                  isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/70',
                )}
              >
                {r.sub}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

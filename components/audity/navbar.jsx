'use client'

import { useState } from 'react'
import { Bell, Building2, Search, User } from 'lucide-react'
import { useAudity } from '@/context/audity-context'
import { MicroLabel, Pill } from './ui-kit'
import { RoleSwitcher } from './role-switcher'
import { PortalStatus } from './portal-status'
import { GlobalSearchResults } from './global-search'

export function Navbar() {
  const { globalQuery, setGlobalQuery, activeEvents, myTickets } = useAudity()
  const [searchFocused, setSearchFocused] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const notifications = [
    { id: 'n1', label: 'HALL RENTAL', text: `${activeEvents.length} events currently published across the complex.` },
    { id: 'n2', label: 'TICKETING', text: `${myTickets.length} registration(s) linked to your profile.` },
    { id: 'n3', label: 'BUILDING OPS', text: 'Level 2 rigging inspection scheduled this week.' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          {/* wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" strokeWidth={2.25} />
            </div>
            <div className="leading-none">
              <p className="text-base font-bold uppercase tracking-[0.22em] text-foreground">Audity</p>
              <MicroLabel className="mt-1 hidden sm:block">Complex OS · V2.4</MicroLabel>
            </div>
          </div>

          {/* search */}
          <div className="relative ml-auto w-full max-w-md lg:ml-6 lg:mr-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="SEARCH EVENTS · HALLS · TICKETS"
              aria-label="Search the complex"
              className="w-full border border-border bg-input py-2.5 pl-9 pr-3 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
            />
            {searchFocused && globalQuery.trim().length > 0 && <GlobalSearchResults />}
          </div>

          {/* actions */}
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="relative cursor-pointer border border-border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Bell className="h-4 w-4" strokeWidth={1.75} />
              <span className="absolute -right-1 -top-1 h-2 w-2 bg-secondary" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-72 border border-border-strong bg-surface">
                <div className="border-b border-border px-3 py-2">
                  <MicroLabel className="text-foreground">Notifications</MicroLabel>
                </div>
                <ul>
                  {notifications.map((n) => (
                    <li key={n.id} className="border-b border-border px-3 py-2.5 last:border-b-0">
                      <MicroLabel className="text-primary">{n.label}</MicroLabel>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="hidden items-center gap-2 border border-border px-3 py-2 sm:flex">
              <User className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <MicroLabel className="text-foreground">A. RAO</MicroLabel>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <RoleSwitcher />
          <PortalStatus />
        </div>
      </div>
    </header>
  )
}

export function ComplexBanner() {
  const { halls } = useAudity()
  return (
    <div className="border-b border-border bg-surface pixel-grid">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 lg:px-6">
        <MicroLabel className="text-primary">Audity Complex · Sector 14</MicroLabel>
        <span className="hidden h-3 w-px bg-border-strong sm:block" />
        {halls.map((h) => (
          <MicroLabel key={h.id}>
            {h.code} · {h.floor} · {h.capacity} SEATS
          </MicroLabel>
        ))}
        <Pill tone="success" dot className="ml-auto">
          Systems Nominal
        </Pill>
      </div>
    </div>
  )
}

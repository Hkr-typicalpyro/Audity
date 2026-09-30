'use client'

import Link from 'next/link'
import { Button, Panel, MicroLabel, PixelDivider } from '@/components/audity/ui-kit'
import { Ticket, Building2, CalendarRange, QrCode } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center space-y-16 py-12 lg:py-24 animate-in fade-in duration-700">
      <div className="text-center space-y-6 max-w-3xl px-4">
        <MicroLabel className="text-primary">Welcome to the Complex</MicroLabel>
        <h1 className="font-mono text-4xl font-bold uppercase tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Audity Platform
        </h1>
        <PixelDivider className="w-24 mx-auto" accent />
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-mono">
          The central operating system for auditorium hall management, event publishing, and digital ticketing. Designed for owners, organisers, and attendees.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link href="/register" className="w-full sm:w-auto block">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Get Started
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto block">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Login
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl px-4">
        <Panel dense className="p-6 text-left flex flex-col gap-4">
          <Building2 className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <div>
            <h3 className="font-mono font-bold uppercase tracking-tight mb-2">Venues & Halls</h3>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Real-time occupancy tracking, capacity management, and blackout scheduling for all complex facilities.
            </p>
          </div>
        </Panel>

        <Panel dense className="p-6 text-left flex flex-col gap-4">
          <CalendarRange className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <div>
            <h3 className="font-mono font-bold uppercase tracking-tight mb-2">Event Publishing</h3>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Organisers can rent available slots and instantly publish events to the attendee feed.
            </p>
          </div>
        </Panel>

        <Panel dense className="p-6 text-left flex flex-col gap-4">
          <Ticket className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <div>
            <h3 className="font-mono font-bold uppercase tracking-tight mb-2">Digital Ticketing</h3>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Secure ticket issuance, atomic reservations, and real-time sales revenue tracking.
            </p>
          </div>
        </Panel>

        <Panel dense className="p-6 text-left flex flex-col gap-4">
          <QrCode className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <div>
            <h3 className="font-mono font-bold uppercase tracking-tight mb-2">Access Control</h3>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Cryptographic QR codes and scanner interface for seamless, secure attendee check-in.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  )
}

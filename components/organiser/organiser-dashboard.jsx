'use client'

import { useState } from 'react'
import { SectionHeading } from '@/components/audity/ui-kit'
import { PortalWarning } from '@/components/audity/portal-status'
import { OrganiserAnalytics } from './analytics'
import { HallBooking } from './hall-booking'
import { AttendeeRoster } from './attendee-roster'
import { QrScannerModal } from './qr-scanner'

export function OrganiserDashboard() {
  const [scannerOpen, setScannerOpen] = useState(false)

  return (
    <div className="space-y-12">
      <section>
        <SectionHeading
          index="01 /"
          title="Operational analytics"
          description="Live performance for your hosted events, computed from the same complex ledger the owner and attendees read from."
        />
        <OrganiserAnalytics />
      </section>

      <section>
        <SectionHeading
          index="02 /"
          title="Hall rental"
          description="Select a date, hall and slot. The conflict inspector cross-checks booked events, active reservations and owner blackouts before auto-approval."
        />
        <PortalWarning kind="rental" />
        <HallBooking />
      </section>

      <section>
        <SectionHeading
          index="03 /"
          title="Attendance & check-in"
          description="Search the roster, export the manifest and verify gate entries through the QR desk."
        />
        <AttendeeRoster onOpenScanner={() => setScannerOpen(true)} />
      </section>

      <QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} />
    </div>
  )
}

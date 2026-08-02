'use client'

import { AudityProvider, useAudity } from '@/context/audity-context'
import { Navbar, ComplexBanner } from '@/components/audity/navbar'
import { ToastStack } from '@/components/audity/toast-stack'
import { AttendeeDashboard } from '@/components/attendee/attendee-dashboard'
import { OrganiserDashboard } from '@/components/organiser/organiser-dashboard'
import { EventOversight } from '@/components/owner/event-oversight'
import { FinancialDashboard } from '@/components/owner/financial-dashboard'
import { HallManager } from '@/components/owner/hall-manager'
import { PlatformControls } from '@/components/owner/platform-controls'
import { SectionHeading } from '@/components/audity/ui-kit'

function OwnerDashboard() {
  return (
    <div className="space-y-12">
      <section>
        <SectionHeading
          index="01 /"
          title="Financial overview"
          description="Revenue streams from ticket sales and hall rentals across the entire complex."
        />
        <FinancialDashboard />
      </section>

      <section>
        <SectionHeading
          index="02 /"
          title="Hall management"
          description="Monitor and manage all auditorium halls — set blackouts, view occupancy and upcoming schedules."
        />
        <HallManager />
      </section>

      <section>
        <SectionHeading
          index="03 /"
          title="Event oversight"
          description="Review all published events across the complex. Force-cancel when necessary — affected tickets are auto-refunded."
        />
        <EventOversight />
      </section>

      <section>
        <SectionHeading
          index="04 /"
          title="Platform controls"
          description="Toggle ticket sales and hall rental portals across the entire building."
        />
        <PlatformControls />
      </section>
    </div>
  )
}

function DashboardRouter() {
  const { role } = useAudity()

  return (
    <>
      {role === 'attendee' && <AttendeeDashboard />}
      {role === 'organiser' && <OrganiserDashboard />}
      {role === 'owner' && <OwnerDashboard />}
    </>
  )
}

export default function Home() {
  return (
    <AudityProvider>
      <Navbar />
      <ComplexBanner />
      <main className="mx-auto max-w-[1600px] px-4 py-8 lg:px-6 lg:py-12">
        <DashboardRouter />
      </main>
      <ToastStack />
    </AudityProvider>
  )
}

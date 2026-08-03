'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAudity } from '@/context/audity-context'
import { Navbar, ComplexBanner } from '@/components/audity/navbar'
import { ToastStack } from '@/components/audity/toast-stack'
import { AttendeeDashboard } from '@/components/attendee/attendee-dashboard'
import { OrganiserDashboard } from '@/components/organiser/organiser-dashboard'
import { EventOversight } from '@/components/owner/event-oversight'
import { FinancialDashboard } from '@/components/owner/financial-dashboard'
import { HallManager } from '@/components/owner/hall-manager'
import { PlatformControls } from '@/components/owner/platform-controls'
import { SectionHeading } from '@/components/audity/ui-kit'
import { OrganiserApplications } from '@/components/owner/organiser-applications'

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
          title="Organiser applications"
          description="Review attendee requests for organiser access. Approved accounts gain permission to publish events, reserve halls and manage attendees."
        />
        <OrganiserApplications />
      </section>
      <section>
        <SectionHeading
          index="05 /"
          title="Platform controls"
          description="Toggle ticket sales and hall rental portals across the entire building."
        />
        <PlatformControls />
      </section>
    </div>
  )
}

function DashboardRouter() {
  const { authUser, authLoading, role } = useAudity()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace('/login')
    }
  }, [authLoading, authUser, router])

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Initialising Audity…
        </p>
      </div>
    )
  }

  if (!authUser) return null

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
    <>
      <Navbar />
      <ComplexBanner />
      <main className="mx-auto max-w-[1600px] px-4 py-8 lg:px-6 lg:py-12">
        <DashboardRouter />
      </main>
      <ToastStack />
    </>
  )
}
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, RefreshCw, UserCheck, UserX } from 'lucide-react'

import { useAudity } from '@/context/audity-context'

import {
  approveOrganiserApplication,
  getOrganiserApplications,
  rejectOrganiserApplication,
} from '@/lib/api'

import {
  Button,
  EmptyState,
  MicroLabel,
  Panel,
  Pill,
} from '@/components/audity/ui-kit'

export function OrganiserApplications() {
  const { token } = useAudity()

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const loadApplications = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await getOrganiserApplications(token)

      const list = Array.isArray(data)
        ? data
        : data.applications || data.users || []

      setApplications(list)
    } catch (err) {
      setError(err.message || 'Unable to load organiser applications')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  async function handleApprove(userId) {
    setProcessingId(userId)
    setError('')

    try {
      await approveOrganiserApplication(token, userId)
      await loadApplications()
    } catch (err) {
      setError(err.message || 'Unable to approve organiser')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(userId) {
    setProcessingId(userId)
    setError('')

    try {
      await rejectOrganiserApplication(token, userId)
      await loadApplications()
    } catch (err) {
      setError(err.message || 'Unable to reject organiser')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <Panel
      label="Pending organiser applications"
      right={
        <div className="flex items-center gap-2">
          <Pill
            tone={applications.length > 0 ? 'warning' : 'success'}
            dot
          >
            {applications.length} pending
          </Pill>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadApplications}
            disabled={loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      }
      dense
    >
      {loading ? (
        <div className="p-6">
          <MicroLabel>Loading applications...</MicroLabel>
        </div>
      ) : error ? (
        <div className="p-4">
          <div className="border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {error}
            </p>

            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadApplications}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : applications.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={UserCheck}
            title="No pending applications"
            description="Attendees requesting organiser access will appear here for owner review."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                {[
                  'Applicant',
                  'Email',
                  'Phone',
                  'Status',
                  'Actions',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-2.5 text-left"
                  >
                    <MicroLabel>{heading}</MicroLabel>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {applications.map((applicant) => {
                const id = applicant._id || applicant.id
                const processing = processingId === id

                return (
                  <tr
                    key={id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-foreground">
                        {applicant.name}
                      </p>

                      <MicroLabel className="mt-1 block">
                        {applicant.role || 'attendee'}
                      </MicroLabel>
                    </td>

                    <td className="px-4 py-4 font-mono text-[11px] text-muted-foreground">
                      {applicant.email}
                    </td>

                    <td className="px-4 py-4 font-mono text-[11px] text-muted-foreground">
                      {applicant.phone || '—'}
                    </td>

                    <td className="px-4 py-4">
                      <Pill tone="warning" dot>
                        Pending
                      </Pill>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processing}
                          onClick={() => handleReject(id)}
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          disabled={processing}
                          onClick={() => handleApprove(id)}
                        >
                          <Check className="h-3.5 w-3.5" />

                          {processing ? 'Processing...' : 'Approve'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
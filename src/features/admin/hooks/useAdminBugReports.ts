import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type BugStatus = 'new' | 'in_progress' | 'resolved'

export interface AdminBugReport {
  id: string
  pageUrl: string
  description: string
  expectedBehavior: string | null
  status: BugStatus
  createdAt: string
  reporterName: string
}

interface RawBugReport {
  id: string
  page_url: string
  description: string
  expected_behavior: string | null
  status: string
  created_at: string
  reporter: { display_name: string } | null
}

export function useAdminBugReports(): {
  reports: AdminBugReport[]
  loading: boolean
  error: string | null
  updateStatus: (reportId: string, status: BugStatus) => Promise<void>
} {
  const [reports, setReports] = useState<AdminBugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from('bug_reports')
          .select('id, page_url, description, expected_behavior, status, created_at, reporter:users!reported_by(display_name)')
          .order('created_at', { ascending: false })

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        const rows = (data ?? []) as unknown as RawBugReport[]
        setReports(
          rows.map(r => ({
            id: r.id,
            pageUrl: r.page_url,
            description: r.description,
            expectedBehavior: r.expected_behavior,
            status: r.status as BugStatus,
            createdAt: r.created_at,
            reporterName: r.reporter?.display_name ?? 'Unknown',
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateStatus = useCallback(async (reportId: string, status: BugStatus) => {
    const { error: updateError } = await supabase
      .from('bug_reports')
      .update({ status })
      .eq('id', reportId)
    if (!updateError) {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r))
    }
  }, [])

  return { reports, loading, error, updateStatus }
}

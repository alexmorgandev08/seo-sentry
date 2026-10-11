import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import call from './client'
import type {
  AlertMeta,
  AlertRule,
  AutoMonitorOptions,
  AutoMonitorPreview,
  ExpectationTest,
  ExpectedRule,
  LikelyCause,
  PageHistory,
  PageGroup,
  BaselineState,
  CheckRun,
  DashboardSummary,
  Finding,
  FindingFilters,
  FindingStats,
  FindingStatsFilters,
  FindingsPage,
  PostSearchResult,
  Settings,
  SuppressionRule,
  Target,
  SiteStatusSummary
} from './types'

export const keys = {
  targets: ['targets'] as const,
  findings: (filters: FindingFilters) => ['findings', filters] as const,
  findingStats: (filters: FindingStatsFilters) => ['findings', 'stats', filters] as const,
  runStatus: ['run-status'] as const,
  dashboard: ['dashboard-summary'] as const,
  settings: ['settings'] as const,
  suppressions: ['suppressions'] as const,
  alertMeta: ['alert-meta'] as const,
  pageGroups: ['page-groups'] as const,
  alertRules: ['alert-rules'] as const,
  autoMonitorOptions: (postTypes: string[]) => ['auto-monitor-options', postTypes] as const,
  autoMonitorPreview: ['auto-monitor-preview'] as const,
  pageHistory: (targetId: number) => ['page-history', targetId] as const,
  findingCauses: (findingId: number) => ['finding-causes', findingId] as const,
  expectations: ['expectations'] as const,
  postSearch: (term: string) => ['post-search', term] as const
}

/** Every mutation that can change findings should refresh these together. */
const useInvalidateAll = () => {
  const client = useQueryClient()

  return () => {
    client.invalidateQueries({ queryKey: ['findings'] })
    client.invalidateQueries({ queryKey: keys.targets })
    client.invalidateQueries({ queryKey: keys.runStatus })
    client.invalidateQueries({ queryKey: keys.dashboard })
    client.invalidateQueries({ queryKey: ['site-status'] })
  }
}

export const useTargets = () =>
  useQuery({ queryKey: keys.targets, queryFn: () => call<Target[]>('targets/get') })

export const useBulkCreateTargets = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (payload: { post_ids?: number[]; urls?: string[] }) =>
      call<{ created: Target[]; skipped: number; invalid: number }>('targets/bulk-create', payload),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.targets })
  })
}

export const useUpdateTarget = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (payload: { id: number; label?: string; is_active?: boolean }) =>
      call<Target>('targets/update', payload),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.targets })
  })
}

export const useDeleteTarget = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => call<{ deleted: number }>('targets/delete', { id }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.targets })
  })
}

export const useBulkUpdateTargets = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (payload: { ids: number[]; is_active: boolean }) =>
      call<{ updated: number[] }>('targets/bulk-update', payload),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.targets })
  })
}

export const useBulkDeleteTargets = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => call<{ deleted: number[] }>('targets/bulk-delete', { ids }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.targets })
  })
}

export const usePostSearch = (term: string) =>
  useQuery({
    queryKey: keys.postSearch(term),
    queryFn: () => call<PostSearchResult[]>('targets/post-search', { term }),
    enabled: term.length > 1
  })

export const useFindings = (filters: FindingFilters) =>
  useQuery({
    queryKey: keys.findings(filters),
    queryFn: () => call<FindingsPage>('findings/get', filters)
  })

export const useFindingStats = (filters: FindingStatsFilters) =>
  useQuery({
    queryKey: keys.findingStats(filters),
    queryFn: () => call<FindingStats>('findings/stats', filters)
  })

export const useRunStatus = () =>
  useQuery({
    queryKey: keys.runStatus,
    queryFn: () => call<CheckRun | null>('check/status'),
    refetchInterval: query => (query.state.data?.status === 'running' ? 3000 : false)
  })

export const useCheckNow = () => {
  const invalidateAll = useInvalidateAll()

  return useMutation({
    mutationFn: () => call<CheckRun>('check/now'),
    onSuccess: invalidateAll
  })
}

export const useResolveFinding = () => {
  const invalidateAll = useInvalidateAll()

  return useMutation({
    mutationFn: (payload: { id: number; note: string; action: 'mute' | 'resolve' }) =>
      call<Finding>(`findings/${payload.action}`, { id: payload.id, note: payload.note }),
    onSuccess: invalidateAll
  })
}

export const useReopenFinding = () => {
  const invalidateAll = useInvalidateAll()

  return useMutation({
    mutationFn: (id: number) => call<Finding>('findings/reopen', { id }),
    onSuccess: invalidateAll
  })
}

export const useSiteStatus = () =>
  useQuery({
    queryKey: ['site-status'],
    queryFn: () => call<SiteStatusSummary>('status/site')
  })

export const useDashboardSummary = () =>
  useQuery({
    queryKey: keys.dashboard,
    queryFn: () => call<DashboardSummary>('dashboard/summary')
  })

export const useArmBaseline = () => {
  const invalidateAll = useInvalidateAll()

  return useMutation({
    mutationFn: () => call<{ targets: number; baseline: BaselineState }>('baseline/arm'),
    onSuccess: invalidateAll
  })
}

export const useDisarmBaseline = () => {
  const invalidateAll = useInvalidateAll()

  return useMutation({
    mutationFn: () => call<{ baseline: null }>('baseline/disarm'),
    onSuccess: invalidateAll
  })
}

export const useSendReport = () =>
  useMutation({ mutationFn: () => call<{ sent: boolean }>('report/send') })

export const usePreviewReport = () =>
  useMutation({
    mutationFn: () => call<{ html: string; recipients: string[] }>('report/preview')
  })

// Pro only: the endpoints behind these exist only while the add-on is active.
export const useSuppressions = (enabled: boolean) =>
  useQuery({
    queryKey: keys.suppressions,
    queryFn: () => call<SuppressionRule[]>('suppressions/list'),
    enabled
  })

export const useAddSuppression = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (payload: { finding_id: number; days: null | number; note: string }) =>
      call<SuppressionRule>('suppressions/add', payload),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.suppressions })
  })
}

export const useRemoveSuppression = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => call<{ removed: boolean }>('suppressions/remove', { id }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.suppressions })
  })
}

export const useAlertMeta = () =>
  useQuery({ queryKey: keys.alertMeta, queryFn: () => call<AlertMeta>('alerts/meta') })

export const usePageGroups = () =>
  useQuery({ queryKey: keys.pageGroups, queryFn: () => call<PageGroup[]>('alerts/groups') })

export const useAlertRules = () =>
  useQuery({ queryKey: keys.alertRules, queryFn: () => call<AlertRule[]>('alerts/rules') })

/** One factory for the four save/delete mutations: each refreshes its own list. */
const useAlertMutation = <TPayload, TResult>(action: string, queryKey: readonly string[]) => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (payload: TPayload) => call<TResult>(action, payload),
    onSuccess: () => client.invalidateQueries({ queryKey })
  })
}

export const useSavePageGroup = () =>
  useAlertMutation<Partial<PageGroup>, PageGroup>('alerts/groups/save', keys.pageGroups)

export const useDeletePageGroup = () =>
  useAlertMutation<{ id: string }, { deleted: boolean }>('alerts/groups/delete', keys.pageGroups)

export const useSaveAlertRule = () =>
  useAlertMutation<Partial<AlertRule>, AlertRule>('alerts/rules/save', keys.alertRules)

export const useDeleteAlertRule = () =>
  useAlertMutation<{ id: string }, { deleted: boolean }>('alerts/rules/delete', keys.alertRules)

export const useExpectations = () =>
  useQuery({ queryKey: keys.expectations, queryFn: () => call<ExpectedRule[]>('expectations/list') })

export const useSaveExpectation = () =>
  useAlertMutation<Partial<ExpectedRule>, ExpectedRule>('expectations/save', keys.expectations)

export const useDeleteExpectation = () =>
  useAlertMutation<{ id: string }, { deleted: boolean }>('expectations/delete', keys.expectations)

/** Read-only: judges an unsaved rule against current pages. */
export const useTestExpectation = () =>
  useMutation({
    mutationFn: (rule: Partial<ExpectedRule>) => call<ExpectationTest>('expectations/test', rule)
  })

/** Pro: scored likely causes for one finding. Pass enabled=false without the add-on. */
export const useFindingCauses = (findingId: number, enabled: boolean) =>
  useQuery({
    queryKey: keys.findingCauses(findingId),
    queryFn: () => call<LikelyCause[]>('findings/causes', { id: findingId }),
    enabled
  })

/** Pro: loads only while the history drawer is open for a page. */
export const usePageHistory = (targetId: null | number) =>
  useQuery({
    queryKey: keys.pageHistory(targetId ?? 0),
    queryFn: () => call<PageHistory>('history/timeline', { target_id: targetId }),
    enabled: targetId !== null
  })

/** Terms depend on which post types are chosen, so they are keyed by that list. */
export const useAutoMonitorOptions = (postTypes: string[]) =>
  useQuery({
    queryKey: keys.autoMonitorOptions(postTypes),
    queryFn: () => call<AutoMonitorOptions>('auto-monitor/options', { post_types: postTypes })
  })

export const useAutoMonitorPreview = (enabled: boolean) =>
  useQuery({
    queryKey: keys.autoMonitorPreview,
    queryFn: () => call<AutoMonitorPreview>('auto-monitor/preview'),
    enabled
  })

export const useSyncAutoMonitor = () => {
  const invalidateAll = useInvalidateAll()
  const client = useQueryClient()

  return useMutation({
    mutationFn: () => call<AutoMonitorPreview & { added: number }>('auto-monitor/sync'),
    onSuccess: () => {
      invalidateAll()
      client.invalidateQueries({ queryKey: keys.autoMonitorPreview })
    }
  })
}

export const useTestWebhook = () =>
  useMutation({
    mutationFn: (url: string) => call<{ delivered: boolean }>('settings/test-webhook', { url })
  })

export const useSettings = () =>
  useQuery({ queryKey: keys.settings, queryFn: () => call<Settings>('settings/get') })

export const useUpdateSettings = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<Settings>) => call<Settings>('settings/update', payload),
    onSuccess: data => {
      client.setQueryData(keys.settings, data)
      // The server counts the auto-monitor preview from saved rules, so it
      // can only be right once a save lands. A no-op when it is not loaded.
      client.invalidateQueries({ queryKey: keys.autoMonitorPreview })
    }
  })
}

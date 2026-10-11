export type Severity = 'critical' | 'info' | 'warning'

export type FindingStatus = 'auto_resolved' | 'muted' | 'open' | 'resolved'

export type TargetType = 'page' | 'robots' | 'site_settings' | 'sitemap'

export interface Target {
  id: number
  type: TargetType
  post_id: null | number
  url: string
  label: string
  is_active: number
  last_checked_at: null | string
  last_result: null | string
  created_at: null | string
}

export interface Explanation {
  what: string
  why: string
  check: string
}

export interface AttributedEvent {
  event_id?: number
  type: string
  subject: string
  at: string
}

export interface Finding {
  id: number
  target_id: null | number
  target_label: null | string
  target_url: null | string
  target_type: null | TargetType
  change_type: string
  severity: Severity
  status: FindingStatus
  before: unknown
  after: unknown
  context: Record<string, unknown>
  attributed_events: AttributedEvent[]
  is_expected: boolean
  note: null | string
  resolved_at: null | string
  created_at: null | string
  explanation: Explanation
}

/** A pro rule that silences one change type on one page; `until: null` is permanent. */
export interface SuppressionRule {
  id: string
  target_id: number
  target_label: null | string
  target_url: null | string
  change_type: string
  until: null | string
  note: string
  created_at: string
}

/** Pro: a rule-based set of pages, e.g. post type "product" or URL "/shop/*". */
export interface PageGroup {
  id: string
  name: string
  post_types: string[]
  url_patterns: string[]
  /** 'inherit' follows the site-wide check frequency. */
  frequency: GroupFrequency
}

export type GroupFrequency = 'inherit' | 'hourly' | 'twicedaily' | 'daily' | 'weekly'

export type AlertScope = 'any' | 'site' | 'group'

export type AlertMode = 'immediate' | 'daily'

/** Pro: who hears about which findings, and when. */
export interface AlertRule {
  id: string
  name: string
  enabled: boolean
  min_severity: Severity
  change_types: string[]
  scope: AlertScope
  group_id: null | string
  emails: string[]
  webhook: boolean
  mode: AlertMode
}

export interface AlertMeta {
  post_types: { value: string; label: string }[]
  change_types: string[]
}

export interface ExpectedChecks {
  index: null | 'index' | 'noindex'
  follow: null | 'follow' | 'nofollow'
  status_200: boolean
  self_canonical: boolean
  schema_types: string[]
}

/** Pro: how a page (or group, or every page) must look, checked on every run. */
export interface ExpectedRule {
  id: string
  name: string
  enabled: boolean
  scope: 'page' | 'group' | 'all'
  target_id: null | number
  group_id: null | string
  checks: ExpectedChecks
  severity: 'critical' | 'warning'
}

/** A rule run against each covered page's latest check, before saving. */
export interface ExpectationTest {
  covered: number
  failing: { label: string; url: string; failures: string[] }[]
}

/** Pro: a scored suspect for a finding. Correlation, so "likely" at most - never "the cause". */
export interface LikelyCause {
  type: string
  subject: string
  at: null | string
  score: number
  label: 'likely' | 'possible'
  reason: string
}

/** Pro: one distinct state of a page, collapsed from every check that saw it unchanged. */
export interface PageVersion {
  id: number
  first_seen: string
  last_seen: string
  checks: number
  is_baseline: boolean
  /** Field keys that differ from the version before; empty for the oldest. */
  changed: string[]
  fields: Record<string, unknown>
}

export interface PageHistory {
  target: { id: number; label: string; url: string }
  versions: PageVersion[]
  snapshots: number
  failed_checks: number
}

export interface AutoMonitorOptions {
  post_types: { value: string; label: string }[]
  terms: { value: number; label: string }[]
}

/** What a sync would do; `over_cap` pages match but would exceed the page limit. */
export interface AutoMonitorPreview {
  matching: number
  to_add: number
  over_cap: number
  monitored: number
  cap: number
}

export interface FindingsPage {
  items: Finding[]
  total: number
  page: number
  per_page: number
}

export interface CheckRun {
  id: number
  trigger_type: string
  status: 'complete' | 'failed' | 'impaired' | 'running'
  targets_total: number
  targets_done: number
  critical_count: number
  warning_count: number
  info_count: number
  started_at: null | string
  finished_at: null | string
}

export interface Settings {
  frequency: 'daily' | 'hourly' | 'off' | 'twicedaily'
  email_enabled: boolean
  email_threshold: Severity
  email_recipient: string
  retention_days: number
  bot_tracking: boolean
  webhook_enabled: boolean
  webhook_urls: string[]
  webhook_threshold: Severity
  webhook_secret: string
  report_enabled: boolean
  report_frequency: 'weekly' | 'monthly'
  report_recipients: string
  report_brand_name: string
  report_brand_color: string
  report_logo_url: string
  report_footer: string
  auto_monitor_enabled: boolean
  auto_monitor_post_types: string[]
  auto_monitor_include_terms: number[]
  auto_monitor_exclude_terms: number[]
  auto_monitor_exclude_patterns: string[]
  auto_monitor_max_pages: number
}

export interface SiteEventSummary {
  id: number
  type: string
  subject: string
  at: string
}

export interface BaselineState {
  armed_at: number
  targets: number
}

export interface DashboardSummary {
  open_counts: { critical: number; warning: number; info: number }
  active_targets: number
  last_run: CheckRun | null
  next_run_at: null | string
  frequency: string
  impaired: null | { since: string; reason: string }
  baseline: BaselineState | null
  recent_events: SiteEventSummary[]
}

export interface PostSearchResult {
  post_id: number
  title: string
  url: string
  type: string
  post_type_label: string
}

export interface FindingFilters {
  severity?: Severity[]
  status?: FindingStatus[]
  target_id?: number
  change_type?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface FindingStatsFilters {
  date_from: string
  group: 'day' | 'month'
}

/** Server-side counts since date_from; periods are 'YYYY-MM-DD' or 'YYYY-MM'. */
export interface FindingStats {
  periods: { period: string; severity: Severity; count: number }[]
  types: { change_type: string; count: number }[]
}

export interface SiteBot {
  slug: string
  label: string
  user_agent: string
  last_seen: null | string
  hits: number
}

export interface SiteStatusSummary {
  bots: SiteBot[]
  bot_tracking: boolean
}

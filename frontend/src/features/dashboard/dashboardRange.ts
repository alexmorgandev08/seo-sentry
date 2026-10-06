import { useMemo } from 'react'
import { __ } from '@common/helpers/i18nWrap'
import { useFindingStats } from '@/api/queries'
import type { FindingStatsFilters } from '@/api/types'

export type DashboardRange = '7d' | '30d' | '12m'

interface RangeConfig {
  label: string
  group: FindingStatsFilters['group']
  /** Days or months covered, ending with the current one. */
  length: number
  /** Label every Nth bar, counted back from the newest. */
  labelEvery: number
  changesTitle: string
  typesTitle: string
  empty: string
}

/** Whole sentences per range, so each one translates as a unit. */
export const RANGES: Record<DashboardRange, RangeConfig> = {
  '7d': {
    label: __('7 days'),
    group: 'day',
    length: 7,
    labelEvery: 1,
    changesTitle: __('Changes over the last 7 days'),
    typesTitle: __('Change types · last 7 days'),
    empty: __('No changes recorded in the last 7 days.')
  },
  '30d': {
    label: __('30 days'),
    group: 'day',
    length: 30,
    labelEvery: 5,
    changesTitle: __('Changes over the last 30 days'),
    typesTitle: __('Change types · last 30 days'),
    empty: __('No changes recorded in the last 30 days.')
  },
  '12m': {
    label: __('12 months'),
    group: 'month',
    length: 12,
    labelEvery: 1,
    changesTitle: __('Changes over the last 12 months'),
    typesTitle: __('Change types · last 12 months'),
    empty: __('No changes recorded in the last 12 months.')
  }
}

/** The range's UTC periods, oldest first: 'YYYY-MM-DD' days or 'YYYY-MM' months, matching created_at. */
function rangePeriods(range: DashboardRange): string[] {
  const { group, length } = RANGES[range]
  const now = new Date()

  return Array.from({ length }, (_, i) => {
    const back = length - 1 - i

    return group === 'day'
      ? new Date(now.getTime() - back * 86_400_000).toISOString().slice(0, 10)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1)).toISOString().slice(0, 7)
  })
}

/** Short axis label, or the long form for a tooltip heading. */
export const periodLabel = (period: string, long = false) =>
  period.length === 7
    ? new Date(`${period}-01T00:00:00Z`).toLocaleDateString(undefined, {
        month: long ? 'long' : 'short',
        year: long ? 'numeric' : undefined,
        timeZone: 'UTC'
      })
    : new Date(`${period}T00:00:00Z`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
      })

/** Server-side counts for the range; both dashboard charts share this query. */
export function useRangeStats(range: DashboardRange) {
  const { group } = RANGES[range]
  const periods = useMemo(() => rangePeriods(range), [range])
  const query = useFindingStats({
    date_from: group === 'month' ? `${periods[0]}-01` : periods[0],
    group
  })

  return { periods, ...query }
}

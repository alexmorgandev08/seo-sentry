import { useMemo } from 'react'
import { barY, defineChart, stack } from '@tanstack/charts'
import { crosshair } from '@tanstack/charts/crosshair'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { __ } from '@common/helpers/i18nWrap'
import { palette } from '@config/theme'
import { type DashboardRange, RANGES, periodLabel, useRangeStats } from './dashboardRange'
import type { FindingStats, Severity } from '@/api/types'

const HEIGHT = 200
const MAX_COLUMN = 24

/*
 * Stack order is deliberate: blue between amber and red. As adjacent marks the
 * status red and amber fail colorblind separation (deutan dE 2.1), so they must
 * never touch; with info between them every adjacent pair validates.
 */
const STACK: Severity[] = ['warning', 'info', 'critical']

/** Display order for the legend, tooltip and aria text; STACK orders the marks. */
export const CHART_SEVERITIES: { key: Severity; label: string; tone: string }[] = [
  { key: 'critical', label: __('Critical'), tone: 'var(--scm-viz-critical)' },
  { key: 'warning', label: __('Warning'), tone: 'var(--scm-viz-warning)' },
  { key: 'info', label: __('Info'), tone: 'var(--scm-viz-info)' }
]

const BY_KEY = new Map(CHART_SEVERITIES.map(s => [s.key, s]))

/** Up to 1, 2, 3, 4, 5, 6 or 8 × 10^n, so the midline tick stays a round number. */
const roundUpNice = (value: number) => {
  const magnitude = 10 ** Math.floor(Math.log10(value))

  return [1, 2, 3, 4, 5, 6, 8, 10].find(step => step * magnitude >= value)! * magnitude
}

/** One row per period and severity, zeros included, so every period can take focus. */
interface PeriodCount {
  period: string
  severity: Severity
  count: number
}

function countByPeriod(stats: FindingStats['periods'], periods: string[]): PeriodCount[] {
  const counts = new Map(periods.map(period => [period, { critical: 0, warning: 0, info: 0 }]))

  for (const { period, severity, count } of stats) {
    const bucket = counts.get(period)
    if (bucket && severity in bucket) bucket[severity] += count
  }

  return periods.flatMap(period =>
    STACK.map(severity => ({ period, severity, count: counts.get(period)![severity] }))
  )
}

export default function ChangesChart({ range }: { range: DashboardRange }) {
  const { periods, data } = useRangeStats(range)
  const { labelEvery, empty, changesTitle } = RANGES[range]

  const rows = useMemo(() => countByPeriod(data?.periods ?? [], periods), [data, periods])
  const grandTotal = rows.reduce((sum, row) => sum + row.count, 0)

  const definition = useMemo(() => {
    const totals = periods.map(period =>
      rows.filter(row => row.period === period).reduce((sum, row) => sum + row.count, 0)
    )
    const yMax = 2 * roundUpNice(Math.max(...totals, 4) / 2)
    // Anchor labels to the newest period and step back evenly, so the right
    // edge never carries two labels side by side.
    const labelled = periods.filter((_, i) => (periods.length - 1 - i) % labelEvery === 0)

    return defineChart({
      marks: [
        // Before the bars, so the hover band sits underneath them.
        crosshair({
          x: { band: { fill: 'var(--scm-line-soft)', fillOpacity: 0.6 } },
          y: false
        }),
        barY(rows, {
          x: 'period',
          y: 'count',
          z: 'severity',
          color: 'severity',
          layout: stack({ order: STACK }),
          maxThickness: MAX_COLUMN,
          radius: { end: 4 },
          // A surface-coloured edge opens the 2px gap between stacked segments.
          stroke: row => (row.count > 0 ? 'var(--scm-surface)' : 'none'),
          strokeWidth: 2
        })
      ],
      scales: {
        // Configured instances, not factories: a factory's domain is re-inferred
        // from the data, which collapses the axis when every count is zero.
        x: {
          scale: scaleBand<string>().domain(periods).padding(0.45),
          axis: {
            line: false,
            ticks: { values: labelled, size: 0, format: period => periodLabel(period) },
            tickLabels: { fontSize: 11 }
          }
        },
        y: {
          scale: scaleLinear().domain([0, yMax]),
          grid: { stroke: 'var(--scm-line-soft)', strokeOpacity: 1 },
          axis: {
            line: false,
            ticks: { values: [0, yMax / 2, yMax], size: 0, format: String },
            tickLabels: { fontSize: 11 }
          }
        }
      },
      color: {
        domain: STACK,
        range: STACK.map(severity => BY_KEY.get(severity)!.tone)
      },
      theme: {
        foreground: 'var(--scm-ink)',
        muted: 'var(--scm-ink-muted)'
      },

      // The whole day is the hover target, not just the painted column.
      focus: 'group-x',
      maxFocusDistance: Number.POSITIVE_INFINITY,
      focusRing: false,
      tooltip: {
        use: tooltip,
        className: 'scm-chart-tooltip',
        anchor: { x: 'value', y: 'plot-top' },
        placement: 'bottom',
        content: points => {
          const period = points[0]?.datum.period ?? ''
          const counts = new Map(points.map(point => [point.datum.severity, point.datum.count]))

          return {
            title: periodLabel(period, true),
            rows: CHART_SEVERITIES.map(({ key, label, tone }) => ({
              label,
              value: String(counts.get(key) ?? 0),
              color: tone
            }))
          }
        }
      }
    })
  }, [rows, periods, labelEvery])

  return (
    <div className="relative">
      {grandTotal === 0 && data && (
        <p
          className="absolute inset-0 z-10 m-0 flex items-center justify-center pb-4 text-xs"
          style={{ color: palette.inkMuted }}
        >
          {empty}
        </p>
      )}

      <Chart
        ariaLabel={changesTitle}
        definition={definition}
        height={HEIGHT}
      />
    </div>
  )
}

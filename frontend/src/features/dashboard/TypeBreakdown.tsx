import { useMemo, useState } from 'react'
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { Chart } from '@tanstack/charts/react'
import { tooltip } from '@tanstack/charts/tooltip'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { changeLabel } from '@components/changeLabels'
import { palette } from '@config/theme'
import { type DashboardRange, RANGES, useRangeStats } from './dashboardRange'

const SIZE = 168
const OUTER = 80
const INNER = 58

/*
 * The reference categorical order (blue, orange, aqua, yellow), validated
 * against both app surfaces. Everything past the fourth type folds into a
 * gray "Other" slot rather than a generated fifth hue, and that gray also
 * sits between yellow and blue where the ring wraps, so the one hue pair the
 * validator never checked (the wrap) never touches.
 */
const SLOTS = ['var(--scm-cat-1)', 'var(--scm-cat-2)', 'var(--scm-cat-3)', 'var(--scm-cat-4)']

interface Slice {
  label: string
  count: number
  tone: string
}

/** A slice drawn at 45% strength against the card, while another one is pointed out. */
const faded = (tone: string) => `color-mix(in srgb, ${tone} 45%, var(--scm-surface))`

export default function TypeBreakdown({ range }: { range: DashboardRange }) {
  // Two sources of emphasis: hovering a legend row restyles the ring, while
  // focus inside the chart only marks the legend row. Restyling the ring on
  // its own focus would rebuild the chart under the pointer and drop that focus.
  const [legendHover, setLegendHover] = useState<number | null>(null)
  const [chartFocus, setChartFocus] = useState<number | null>(null)
  const { data } = useRangeStats(range)

  const slices = useMemo(() => {
    // The server returns these already sorted, largest first.
    const ranked = data?.types ?? []
    const top: Slice[] = ranked.slice(0, SLOTS.length).map(({ change_type, count }, i) => ({
      label: changeLabel(change_type),
      count,
      tone: SLOTS[i]
    }))
    const rest = ranked.slice(SLOTS.length).reduce((sum, type) => sum + type.count, 0)

    return rest > 0 ? [...top, { label: __('Other'), count: rest, tone: palette.inkFaint }] : top
  }, [data])

  const total = slices.reduce((sum, s) => sum + s.count, 0)

  const definition = useMemo(() => {
    // No data: one neutral slice keeps the ring as a track around the zero.
    const isEmpty = total === 0
    const source = isEmpty ? [{ label: '', count: 1, tone: palette.lineSoft }] : slices

    return defineChart({
      marks: [
        polar({
          inset: SIZE / 2 - OUTER,
          radiusRatio: 1,
          marks: [
            radialArc(pie(source, { value: 'count' }), {
              innerRadius: ({ radius }) => (radius * INNER) / OUTER,
              key: 'label',
              fill: slice =>
                legendHover === null || slice.label === slices[legendHover]?.label
                  ? slice.tone
                  : faded(slice.tone),
              // The 2px surface stroke is the gap between touching slices.
              stroke: 'var(--scm-surface)',
              strokeWidth: 2
            })
          ],
          scales: { angle: null, radius: null }
        })
      ],
      scales: { x: null, y: null },

      keyboard: !isEmpty,
      pointer: !isEmpty,
      focusRing: false,
      tooltip: {
        use: tooltip,
        className: 'scm-chart-tooltip',
        content: points => {
          const slice = points[0]?.datum

          return {
            rows: slice
              ? [
                  {
                    label: slice.label,
                    value: sprintf(__('%d (%d%%)'), slice.count, Math.round(slice.fraction * 100)),
                    color: slice.tone
                  }
                ]
              : []
          }
        }
      }
    })
  }, [slices, total, legendHover])

  const highlighted = chartFocus ?? legendHover

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <Chart
          ariaLabel={RANGES[range].typesTitle}
          definition={definition}
          height={SIZE}
          width={SIZE}
          onFocusChange={point =>
            setChartFocus(point ? slices.findIndex(s => s.label === point.datum.label) : null)
          }
        />
        {/* Centre total, laid over the hole; it never takes the pointer. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-semibold leading-none" style={{ color: palette.ink }}>
            {total}
          </span>
          <span className="mt-1 text-[11px]" style={{ color: palette.inkMuted }}>
            {total === 1 ? __('change') : __('changes')}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <p
          className="m-0 min-w-0 flex-1 text-xs leading-relaxed"
          style={{ color: palette.inkMuted }}
        >
          {RANGES[range].empty}{' '}
          {__('When something on your pages changes, the breakdown by type appears here.')}
        </p>
      ) : (
        /* Values live here permanently, so nothing depends on hovering a slice. */
        <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-1.5 p-0">
          {slices.map((slice, i) => (
            <li
              key={slice.label}
              className="flex items-center gap-2.5 rounded-md px-1.5 py-1"
              style={{ background: highlighted === i ? palette.lineSoft : 'transparent' }}
              onMouseEnter={() => setLegendHover(i)}
              onMouseLeave={() => setLegendHover(null)}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: slice.tone }}
              />
              <span className="min-w-0 flex-1 truncate text-xs" style={{ color: palette.ink }}>
                {slice.label}
              </span>
              <span
                className="shrink-0 text-xs font-medium tabular-nums"
                style={{ color: palette.ink }}
              >
                {slice.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

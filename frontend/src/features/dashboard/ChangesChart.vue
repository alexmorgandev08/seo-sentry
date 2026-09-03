<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { __ } from '@common/helpers/i18nWrap'
import { useFindings } from '@/api/queries'
import { palette } from '@config/theme'
import { WINDOW_DAYS as DAYS, recentDays } from './recentWindow'
import { CHART_SEVERITIES, SEVERITY_BY_KEY, STACK_ORDER as STACK } from './severities'
import type { Finding, Severity } from '@/api/types'

const HEIGHT = 200
const MARGIN = { top: 8, right: 8, bottom: 22, left: 30 }
const MAX_COLUMN = 24
const SEGMENT_GAP = 2

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  })

type DayBucket = { day: string } & Record<Severity, number>

function bucketByDay(items: Finding[], days: string[]): DayBucket[] {
  const buckets = new Map<string, DayBucket>(
    days.map(day => [day, { day, critical: 0, warning: 0, info: 0 }])
  )

  for (const finding of items) {
    const bucket = buckets.get((finding.created_at ?? '').slice(0, 10))
    if (bucket) bucket[finding.severity] += 1
  }

  return days.map(day => buckets.get(day)!)
}

/** Top segment gets the 4px rounded data-end; the baseline stays square. */
const roundedTopRect = (x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, h, w / 2)

  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`
}

const days = recentDays()
const { data } = useFindings({ date_from: days[0], per_page: 100 })

const wrap = ref<HTMLElement | null>(null)
const width = ref(0)
const hovered = ref<number | null>(null)

let observer: ResizeObserver | null = null

watch(
  wrap,
  el => {
    observer?.disconnect()
    if (!el) return

    observer = new ResizeObserver(entries => {
      width.value = entries[0].contentRect.width
    })
    observer.observe(el)
  },
  { flush: 'post', immediate: true }
)

onUnmounted(() => observer?.disconnect())

const buckets = computed(() => bucketByDay(data.value?.items ?? [], days))
const totals = computed(() => buckets.value.map(b => b.critical + b.warning + b.info))
const grandTotal = computed(() => totals.value.reduce((sum, n) => sum + n, 0))
const yMax = computed(() => Math.ceil(Math.max(...totals.value, 4) / 2) * 2)
const ticks = computed(() => [0, yMax.value / 2, yMax.value])

const innerW = computed(() => Math.max(width.value - MARGIN.left - MARGIN.right, 0))
const innerH = HEIGHT - MARGIN.top - MARGIN.bottom
const band = computed(() => innerW.value / DAYS)
const column = computed(() => Math.min(MAX_COLUMN, band.value * 0.55))

const yOf = (value: number) => MARGIN.top + innerH - (value / yMax.value) * innerH

/** Segment geometry per day, so the template never mutates state while rendering. */
const columns = computed(() =>
  buckets.value.map((bucket, i) => {
    const xBand = MARGIN.left + i * band.value
    const x = xBand + (band.value - column.value) / 2
    // Non-zero counts keep a 2px floor so a single change stays visible.
    const heights = STACK.map(s =>
      bucket[s] === 0 ? 0 : Math.max((bucket[s] / yMax.value) * innerH, 2)
    )

    let y = yOf(0)
    const segments = STACK.flatMap((severity, s) => {
      const h = heights[s]
      if (h === 0) return []

      y -= h
      const top = y
      const isTopmost = heights.slice(s + 1).every(rest => rest === 0)
      y -= SEGMENT_GAP

      return [
        {
          height: h,
          isTopmost,
          path: isTopmost ? roundedTopRect(x, top, column.value, h, 4) : '',
          severity,
          tone: SEVERITY_BY_KEY.get(severity)!.tone,
          y: top
        }
      ]
    })

    return {
      aria: `${dayLabel(bucket.day)}: ${CHART_SEVERITIES.map(
        ({ key, label }) => `${bucket[key]} ${label}`
      ).join(', ')}`,
      bucket,
      // Anchor labels to the newest day and step back evenly, so the right
      // edge never carries two labels side by side.
      showLabel: (DAYS - 1 - i) % 3 === 0,
      label: dayLabel(bucket.day),
      segments,
      x,
      xBand
    }
  })
)

const hoveredColumn = computed(() =>
  hovered.value === null ? null : (columns.value[hovered.value] ?? null)
)

const tooltipLeft = computed(() => {
  if (hovered.value === null) return 0

  return Math.min(
    Math.max(MARGIN.left + (hovered.value + 0.5) * band.value - 60, 0),
    Math.max(width.value - 130, 0)
  )
})
</script>

<template>
  <div ref="wrap" class="relative">
    <p
      v-if="grandTotal === 0 && data"
      class="absolute inset-0 z-10 m-0 flex items-center justify-center pb-4 text-xs"
      :style="{ color: palette.inkMuted }"
    >
      {{ __('No changes recorded in the last 14 days.') }}
    </p>

    <svg
      v-if="width > 0"
      :aria-label="__('Changes per day by severity, last 14 days')"
      :height="HEIGHT"
      role="img"
      :width="width"
      @mouseleave="hovered = null"
    >
      <g v-for="tick in ticks" :key="tick">
        <line
          stroke="var(--scm-line-soft)"
          :stroke-width="1"
          :x1="MARGIN.left"
          :x2="width - MARGIN.right"
          :y1="yOf(tick)"
          :y2="yOf(tick)"
        />
        <text
          class="tabular-nums"
          fill="var(--scm-ink-muted)"
          :font-size="11"
          text-anchor="end"
          :x="MARGIN.left - 8"
          :y="yOf(tick) + 4"
        >
          {{ tick }}
        </text>
      </g>

      <g v-for="(col, i) in columns" :key="col.bucket.day">
        <rect
          v-if="hovered === i"
          fill="var(--scm-line-soft)"
          :height="innerH"
          :opacity="0.6"
          :width="band"
          :x="col.xBand"
          :y="MARGIN.top"
        />

        <template v-for="segment in col.segments" :key="segment.severity">
          <path v-if="segment.isTopmost" :d="segment.path" :fill="segment.tone" />
          <rect
            v-else
            :fill="segment.tone"
            :height="segment.height"
            :width="column"
            :x="col.x"
            :y="segment.y"
          />
        </template>

        <text
          v-if="col.showLabel"
          fill="var(--scm-ink-muted)"
          :font-size="11"
          text-anchor="middle"
          :x="col.xBand + band / 2"
          :y="HEIGHT - 6"
        >
          {{ col.label }}
        </text>

        <!-- Hit target: the whole day band, not just the painted column. -->
        <rect
          :aria-label="col.aria"
          fill="transparent"
          :height="innerH"
          :tabindex="0"
          :width="band"
          :x="col.xBand"
          :y="MARGIN.top"
          @blur="hovered = null"
          @focus="hovered = i"
          @mouseenter="hovered = i"
        />
      </g>
    </svg>

    <div
      v-if="hoveredColumn"
      class="pointer-events-none absolute z-20 rounded-md border border-solid px-3 py-2 shadow-sm"
      :style="{
        background: palette.surface,
        borderColor: palette.line,
        left: `${tooltipLeft}px`,
        top: 0
      }"
    >
      <p class="m-0 mb-1 text-xs font-medium" :style="{ color: palette.ink }">
        {{ hoveredColumn.label }}
      </p>
      <p
        v-for="severity in CHART_SEVERITIES"
        :key="severity.key"
        class="m-0 flex items-center gap-2 text-xs"
      >
        <span class="h-2.5 w-1 rounded-sm" :style="{ background: severity.tone }" />
        <span class="font-semibold tabular-nums" :style="{ color: palette.ink }">
          {{ hoveredColumn.bucket[severity.key] }}
        </span>
        <span :style="{ color: palette.inkMuted }">{{ severity.label }}</span>
      </p>
    </div>
  </div>
</template>

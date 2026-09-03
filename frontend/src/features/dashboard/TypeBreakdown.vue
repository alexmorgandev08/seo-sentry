<script setup lang="ts">
import { computed, ref } from 'vue'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { useFindings } from '@/api/queries'
import { changeLabel } from '@components/changeLabels'
import { palette } from '@config/theme'
import { recentDays } from './recentWindow'

const SIZE = 168
const CENTRE = SIZE / 2
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

const polar = (r: number, angle: number) => ({
  x: CENTRE + r * Math.cos(angle),
  y: CENTRE + r * Math.sin(angle)
})

/** Annular sector from startAngle to endAngle (radians, clockwise from 12 o'clock). */
const slicePath = (start: number, end: number) => {
  const large = end - start > Math.PI ? 1 : 0
  const o1 = polar(OUTER, start)
  const o2 = polar(OUTER, end)
  const i1 = polar(INNER, end)
  const i2 = polar(INNER, start)

  return [
    `M${o1.x},${o1.y}`,
    `A${OUTER},${OUTER} 0 ${large} 1 ${o2.x},${o2.y}`,
    `L${i1.x},${i1.y}`,
    `A${INNER},${INNER} 0 ${large} 0 ${i2.x},${i2.y}`,
    'Z'
  ].join(' ')
}

const days = recentDays()
const hovered = ref<number | null>(null)
const { data } = useFindings({ date_from: days[0], per_page: 100 })

const slices = computed(() => {
  const countByType = new Map<string, number>()
  for (const finding of data.value?.items ?? []) {
    countByType.set(finding.change_type, (countByType.get(finding.change_type) ?? 0) + 1)
  }

  const ranked = [...countByType.entries()].sort((a, b) => b[1] - a[1])
  const rest = ranked.slice(SLOTS.length).reduce((sum, [, n]) => sum + n, 0)

  const top = ranked.slice(0, SLOTS.length).map(([type, count], i) => ({
    count,
    label: changeLabel(type),
    tone: SLOTS[i]
  }))

  return rest > 0 ? [...top, { count: rest, label: __('Other'), tone: palette.inkFaint }] : top
})

const total = computed(() => slices.value.reduce((sum, s) => sum + s.count, 0))

/** Arc geometry ahead of the template, so rendering never mutates state. */
const arcs = computed(() => {
  let acc = -Math.PI / 2

  return slices.value.map(slice => {
    const start = acc
    acc += (slice.count / total.value) * Math.PI * 2

    return { ...slice, path: slicePath(start, acc) }
  })
})

const ringMid = (OUTER + INNER) / 2
const ringWidth = OUTER - INNER
</script>

<template>
  <div class="flex flex-wrap items-center gap-5">
    <svg
      :aria-label="__('Changes by type, last 14 days')"
      :height="SIZE"
      role="img"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      :width="SIZE"
      @mouseleave="hovered = null"
    >
      <!-- No data: the ring stays as a neutral track around the zero. -->
      <circle
        v-if="slices.length === 0"
        :cx="CENTRE"
        :cy="CENTRE"
        fill="none"
        :r="ringMid"
        :stroke="palette.lineSoft"
        :stroke-width="ringWidth"
      />
      <circle
        v-else-if="slices.length === 1"
        :cx="CENTRE"
        :cy="CENTRE"
        fill="none"
        :r="ringMid"
        :stroke="slices[0].tone"
        :stroke-width="ringWidth"
      />
      <path
        v-for="(slice, i) in arcs"
        v-else
        :key="slice.label"
        :aria-label="sprintf(__('%s: %d of %d'), slice.label, slice.count, total)"
        :d="slice.path"
        :fill="slice.tone"
        :opacity="hovered === null || hovered === i ? 1 : 0.45"
        :stroke="palette.surface"
        :stroke-width="2"
        :tabindex="0"
        @blur="hovered = null"
        @focus="hovered = i"
        @mouseenter="hovered = i"
      />

      <text
        fill="var(--scm-ink)"
        :font-size="26"
        :font-weight="600"
        text-anchor="middle"
        :x="CENTRE"
        :y="CENTRE + 2"
      >
        {{ total }}
      </text>
      <text
        fill="var(--scm-ink-muted)"
        :font-size="11"
        text-anchor="middle"
        :x="CENTRE"
        :y="CENTRE + 18"
      >
        {{ total === 1 ? __('change') : __('changes') }}
      </text>
    </svg>

    <p
      v-if="total === 0"
      class="m-0 min-w-0 flex-1 text-xs leading-relaxed"
      :style="{ color: palette.inkMuted }"
    >
      {{ __('No changes recorded in the last 14 days.') }}
      {{ __('When something on your pages changes, the breakdown by type appears here.') }}
    </p>

    <!-- Values live here permanently, so nothing depends on hovering a slice. -->
    <ul v-else class="m-0 flex min-w-0 flex-1 list-none flex-col gap-1.5 p-0">
      <li
        v-for="(slice, i) in slices"
        :key="slice.label"
        class="flex items-center gap-2.5 rounded-md px-1.5 py-1"
        :style="{ background: hovered === i ? palette.lineSoft : 'transparent' }"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
      >
        <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ background: slice.tone }" />
        <span class="min-w-0 flex-1 truncate text-xs" :style="{ color: palette.ink }">
          {{ slice.label }}
        </span>
        <span class="shrink-0 text-xs font-medium tabular-nums" :style="{ color: palette.ink }">
          {{ slice.count }}
        </span>
      </li>
    </ul>
  </div>
</template>

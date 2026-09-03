import { __ } from '@common/helpers/i18nWrap'
import type { Severity } from '@/api/types'

/**
 * Display order for the chart legend, tooltip and aria text.
 *
 * Lives outside the chart component because `<script setup>` cannot export
 * bindings, and the dashboard's card header renders the same legend.
 */
export const CHART_SEVERITIES: { key: Severity; label: string; tone: string }[] = [
  { key: 'critical', label: __('Critical'), tone: 'var(--scm-viz-critical)' },
  { key: 'warning', label: __('Warning'), tone: 'var(--scm-viz-warning)' },
  { key: 'info', label: __('Info'), tone: 'var(--scm-viz-info)' }
]

/*
 * Stack order for the marks, deliberately different from the display order:
 * blue sits between amber and red. As adjacent marks the status red and amber
 * fail colorblind separation (deutan dE 2.1), so they must never touch.
 */
export const STACK_ORDER: Severity[] = ['warning', 'info', 'critical']

export const SEVERITY_BY_KEY = new Map(CHART_SEVERITIES.map(s => [s.key, s]))

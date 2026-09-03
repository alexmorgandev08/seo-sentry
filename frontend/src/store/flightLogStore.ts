import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { FindingFilters, FindingStatus, Severity } from '@/api/types'

const initial = {
  severity: [] as Severity[],
  status: ['open'] as FindingStatus[],
  targetId: undefined as number | undefined,
  dateFrom: undefined as string | undefined,
  dateTo: undefined as string | undefined,
  page: 1
}

export const useFlightLogStore = defineStore('flightLog', () => {
  const severity = ref<Severity[]>([...initial.severity])
  const status = ref<FindingStatus[]>([...initial.status])
  const targetId = ref<number | undefined>(initial.targetId)
  const dateFrom = ref<string | undefined>(initial.dateFrom)
  const dateTo = ref<string | undefined>(initial.dateTo)
  const page = ref(initial.page)

  const setSeverity = (next: Severity[]) => {
    severity.value = next
    page.value = 1
  }

  const setStatus = (next: FindingStatus[]) => {
    status.value = next
    page.value = 1
  }

  const setTargetId = (next?: number) => {
    targetId.value = next
    page.value = 1
  }

  const setDateRange = (from?: string, to?: string) => {
    dateFrom.value = from
    dateTo.value = to
    page.value = 1
  }

  const setPage = (next: number) => {
    page.value = next
  }

  const reset = () => {
    severity.value = [...initial.severity]
    status.value = [...initial.status]
    targetId.value = initial.targetId
    dateFrom.value = initial.dateFrom
    dateTo.value = initial.dateTo
    page.value = initial.page
  }

  /** Used by the dashboard to deep-link into a filtered log view. */
  const showOnly = (next: Severity[]) => {
    reset()
    severity.value = next
  }

  /**
   * The query key and payload for the findings request. A computed ref rather
   * than a plain function so vue-query re-fetches when a filter changes.
   */
  const filters = computed<FindingFilters>(() => ({
    severity: severity.value.length > 0 ? severity.value : undefined,
    status: status.value.length > 0 ? status.value : undefined,
    target_id: targetId.value,
    date_from: dateFrom.value,
    date_to: dateTo.value,
    page: page.value,
    per_page: 20
  }))

  const hasFilters = computed(
    () => severity.value.length > 0 || targetId.value !== undefined || status.value.length !== 1
  )

  return {
    dateFrom,
    dateTo,
    filters,
    hasFilters,
    page,
    reset,
    setDateRange,
    setPage,
    setSeverity,
    setStatus,
    setTargetId,
    severity,
    showOnly,
    status,
    targetId
  }
})

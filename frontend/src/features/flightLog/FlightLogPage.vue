<script setup lang="ts">
import { Button, Card, Select, Table, Tag } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { useFindings, useTargets } from '@/api/queries'
import { changeLabel } from '@components/changeLabels'
import PageHeader from '@components/PageHeader.vue'
import SeverityTag from '@components/SeverityTag.vue'
import When from '@components/When.vue'
import { palette } from '@config/theme'
import { useFlightLogStore } from '@/store/flightLogStore'
import FindingDrawer from './FindingDrawer.vue'
import type { Finding, FindingStatus } from '@/api/types'

const STATUS_LABELS: Record<FindingStatus, string> = {
  open: __('Open'),
  resolved: __('Resolved'),
  auto_resolved: __('Auto-resolved'),
  muted: __('Muted')
}

const store = useFlightLogStore()
const selected = ref<Finding | null>(null)

// The store's `filters` is a computed, so vue-query refetches on every change.
const { data, isLoading } = useFindings(store.filters)
const { data: targets } = useTargets()

const total = computed(() => data.value?.total ?? 0)
const rows = computed(() => data.value?.items ?? [])

const severityOptions = [
  { label: __('Critical'), value: 'critical' },
  { label: __('Warning'), value: 'warning' },
  { label: __('Info'), value: 'info' }
]

const statusOptions = (Object.keys(STATUS_LABELS) as FindingStatus[]).map(status => ({
  label: STATUS_LABELS[status],
  value: status
}))

const targetOptions = computed(() =>
  (targets.value ?? []).map(target => ({ label: target.label, value: target.id }))
)

const columns = [
  { key: 'severity', title: __('Severity'), width: 120 },
  { key: 'change_type', title: __('What changed') },
  { key: 'target_label', title: __('Page'), width: 180 },
  { key: 'status', title: __('Status'), width: 140 },
  { key: 'created_at', title: __('Detected'), width: 140 }
]

const pagination = computed(() => ({
  current: data.value?.page ?? 1,
  pageSize: data.value?.per_page ?? 20,
  total: total.value,
  showSizeChanger: false,
  // Kept on a single page too: it gives the table a footer and says how much
  // is on screen, which the bare table did not.
  hideOnSinglePage: false,
  showTotal: (count: number, range: [number, number]) =>
    sprintf(__('%d-%d of %d'), range[0], range[1], count)
}))

const countLabel = computed(() =>
  total.value === 1 ? __('1 change') : sprintf(__('%d changes'), total.value)
)
</script>

<template>
  <PageHeader :title="__('Flight Log')" />

  <!--
    Filters live inside the results card rather than floating above it: they
    act on the table below, so they read as one surface with it and share its
    left edge.
  -->
  <Card :body-style="{ padding: 0 }">
    <div
      class="flex flex-wrap items-center gap-2 border-0 border-b border-solid px-4 py-3"
      :style="{ borderColor: palette.lineSoft }"
    >
      <Select
        allow-clear
        class="w-full sm:w-52"
        max-tag-count="responsive"
        mode="multiple"
        :options="severityOptions"
        :placeholder="__('All severities')"
        :value="store.severity"
        @change="value => store.setSeverity(value as never)"
      />
      <Select
        allow-clear
        class="w-full sm:w-52"
        max-tag-count="responsive"
        mode="multiple"
        :options="statusOptions"
        :placeholder="__('Any status')"
        :value="store.status"
        @change="value => store.setStatus(value as never)"
      />
      <Select
        allow-clear
        class="w-full sm:w-52"
        :options="targetOptions"
        :placeholder="__('All pages')"
        :value="store.targetId"
        @change="value => store.setTargetId(value as number | undefined)"
      />

      <!--
        Default size, not small: it sits in a row with the Selects and has to
        share their control height.
      -->
      <Button v-if="store.hasFilters" @click="store.reset()">{{ __('Clear filters') }}</Button>

      <span class="ml-auto pr-1 text-xs tabular-nums" :style="{ color: palette.inkMuted }">
        {{ countLabel }}
      </span>
    </div>

    <Table
      :columns="columns"
      :custom-row="record => ({ onClick: () => (selected = record as Finding) })"
      :data-source="rows"
      :loading="isLoading"
      row-class-name="cursor-pointer"
      row-key="id"
      :pagination="pagination"
      @change="info => store.setPage(info.current ?? 1)"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'severity'">
          <SeverityTag :severity="(record as Finding).severity" />
        </template>

        <template v-else-if="column.key === 'change_type'">
          <div class="flex min-w-0 flex-col">
            <span class="font-medium">{{ changeLabel((record as Finding).change_type) }}</span>
            <span class="truncate text-xs" :style="{ color: palette.inkMuted }">
              {{ (record as Finding).explanation.what }}
            </span>
          </div>
        </template>

        <template v-else-if="column.key === 'target_label'">
          {{ (record as Finding).target_label ?? __('Site-wide') }}
        </template>

        <template v-else-if="column.key === 'status'">
          <Tag
            :bordered="false"
            :color="(record as Finding).status === 'open' ? 'default' : 'success'"
          >
            {{ STATUS_LABELS[(record as Finding).status] }}
          </Tag>
        </template>

        <template v-else-if="column.key === 'created_at'">
          <When :value="(record as Finding).created_at" />
        </template>
      </template>

      <template #emptyText>
        <div class="py-10 text-center">
          <p class="m-0 text-sm font-medium" :style="{ color: palette.ink }">
            {{ __('No changes recorded yet.') }}
          </p>
          <p class="m-0 text-xs" :style="{ color: palette.inkMuted }">
            {{ __('Anything that changes on your monitored pages will appear here.') }}
          </p>
        </div>
      </template>
    </Table>
  </Card>

  <FindingDrawer :finding="selected" @close="selected = null" />
</template>

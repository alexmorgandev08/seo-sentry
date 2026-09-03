<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue'
import { Button, Card, Popconfirm, Switch, Table, Tag, message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { useDeleteTarget, useTargets, useUpdateTarget } from '@/api/queries'
import { resultLabel } from '@components/changeLabels'
import PageHeader from '@components/PageHeader.vue'
import When from '@components/When.vue'
import { palette } from '@config/theme'
import AddTargetModal from './AddTargetModal.vue'
import type { Target } from '@/api/types'

const RESULT_TONE: Record<string, string> = {
  ok: 'success',
  changed: 'warning',
  error: 'error',
  impaired: 'default'
}

const isAdding = ref(false)
const { data: targets, isLoading } = useTargets()
const updateTarget = useUpdateTarget()
const deleteTarget = useDeleteTarget()

const rows = computed(() => targets.value ?? [])

const columns = [
  { key: 'label', title: __('Page') },
  { key: 'last_checked_at', title: __('Last checked'), width: 150 },
  { key: 'last_result', title: __('Result'), width: 120 },
  { key: 'is_active', title: __('Monitoring'), width: 120 },
  { key: 'actions', title: '', width: 100, align: 'right' as const }
]

const pagination = computed(() => ({
  pageSize: 20,
  hideOnSinglePage: false,
  showTotal: (count: number, range: [number, number]) =>
    sprintf(__('%d-%d of %d'), range[0], range[1], count)
}))

const toggle = (target: Target, isActive: boolean) =>
  updateTarget.mutate(
    { id: target.id, is_active: isActive },
    { onError: error => message.error(error.message) }
  )

const remove = (target: Target) =>
  deleteTarget.mutate(target.id, {
    onSuccess: () => message.success(__('Page removed from monitoring.')),
    onError: error => message.error(error.message)
  })
</script>

<template>
  <PageHeader :title="__('Monitored Pages')">
    <template #actions>
      <Button type="primary" @click="isAdding = true">
        <template #icon><PlusOutlined /></template>
        {{ __('Add page') }}
      </Button>
    </template>
  </PageHeader>

  <Card :body-style="{ padding: 0 }">
    <Table
      :columns="columns"
      :data-source="rows"
      :loading="isLoading"
      :pagination="pagination"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'label'">
          <div class="flex min-w-0 flex-col">
            <span class="truncate font-medium">{{ (record as Target).label }}</span>
            <a
              class="truncate text-xs"
              :href="(record as Target).url"
              rel="noreferrer"
              :style="{ color: palette.inkFaint }"
              target="_blank"
            >
              {{ (record as Target).url }}
            </a>
          </div>
        </template>

        <template v-else-if="column.key === 'last_checked_at'">
          <When :fallback="__('Not yet')" :value="(record as Target).last_checked_at" />
        </template>

        <template v-else-if="column.key === 'last_result'">
          <Tag
            v-if="(record as Target).last_result"
            :bordered="false"
            :color="RESULT_TONE[(record as Target).last_result as string] ?? 'default'"
          >
            {{ resultLabel((record as Target).last_result as string) }}
          </Tag>
        </template>

        <template v-else-if="column.key === 'is_active'">
          <Switch
            :checked="Boolean((record as Target).is_active)"
            size="small"
            @change="checked => toggle(record as Target, Boolean(checked))"
          />
        </template>

        <template v-else-if="column.key === 'actions'">
          <Popconfirm
            :cancel-text="__('Cancel')"
            :description="__('Its history stays in the flight log.')"
            :ok-text="__('Remove')"
            :title="__('Stop monitoring this page?')"
            @confirm="remove(record as Target)"
          >
            <Button class="scm-row-remove" size="small" type="text">{{ __('Remove') }}</Button>
          </Popconfirm>
        </template>
      </template>

      <template #emptyText>
        <div class="py-10 text-center">
          <p class="m-0 text-sm font-medium" :style="{ color: palette.ink }">
            {{ __('No pages are being monitored yet.') }}
          </p>
          <p class="m-0 text-xs" :style="{ color: palette.inkMuted }">
            {{ __('Add a page to start watching it on every run.') }}
          </p>
        </div>
      </template>
    </Table>
  </Card>

  <AddTargetModal :open="isAdding" @close="isAdding = false" />
</template>

<script setup lang="ts">
import {
  CheckCircleFilled,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons-vue'
import { Alert, Button, Card, Popconfirm, message } from 'ant-design-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { __, sprintf } from '@common/helpers/i18nWrap'
import {
  useArmBaseline,
  useCheckNow,
  useDashboardSummary,
  useDisarmBaseline,
  useFindings,
  useRunStatus
} from '@/api/queries'
import { changeLabel, eventLabel } from '@components/changeLabels'
import PageHeader from '@components/PageHeader.vue'
import SeverityStrip from '@components/SeverityStrip.vue'
import When from '@components/When.vue'
import { palette } from '@config/theme'
import { useFlightLogStore } from '@/store/flightLogStore'
import ChangesChart from './ChangesChart.vue'
import CrawlerActivity from './CrawlerActivity.vue'
import StatusRow from './StatusRow.vue'
import TypeBreakdown from './TypeBreakdown.vue'
import { CHART_SEVERITIES } from './severities'
import type { Severity } from '@/api/types'

const SEVERITY_TONE: Record<Severity, string> = {
  critical: palette.critical,
  info: palette.info,
  warning: palette.warning
}

const router = useRouter()
const flightLog = useFlightLogStore()

const { data: summary } = useDashboardSummary()
const { data: run } = useRunStatus()
// Only the short "needs attention" list; the strip uses server-side counts so
// it stays correct past one page of findings.
const { data: recent } = useFindings({ status: ['open'], per_page: 6 })

const checkNow = useCheckNow()
const armBaseline = useArmBaseline()
const disarmBaseline = useDisarmBaseline()

const counts = computed(() => summary.value?.open_counts ?? { critical: 0, warning: 0, info: 0 })
const items = computed(() => recent.value?.items ?? [])
const events = computed(() => (summary.value?.recent_events ?? []).slice(0, 5))
const isRunning = computed(() => run.value?.status === 'running' || checkNow.isPending.value)
const isImpaired = computed(
  () => Boolean(summary.value?.impaired) || run.value?.status === 'impaired'
)

const openSeverity = (severity: Severity) => {
  flightLog.showOnly([severity])
  router.push('/log')
}

const runCheck = () =>
  checkNow.mutate(undefined, {
    onSuccess: () => message.success(__('Check complete.')),
    onError: error => message.error(error.message)
  })

const arm = () =>
  armBaseline.mutate(undefined, {
    onSuccess: data =>
      message.success(
        sprintf(
          __('Baseline saved for %d pages. Run your updates, then check again.'),
          data.targets
        )
      ),
    onError: error => message.error(error.message)
  })
</script>

<template>
  <PageHeader :title="__('Dashboard')">
    <template #actions>
      <Popconfirm
        v-if="summary?.baseline"
        :cancel-text="__('Keep it')"
        :ok-text="__('Discard')"
        :title="__('Discard the saved baseline?')"
        @confirm="disarmBaseline.mutate()"
      >
        <Button :loading="disarmBaseline.isPending.value">{{ __('Discard baseline') }}</Button>
      </Popconfirm>
      <Button v-else :loading="armBaseline.isPending.value" @click="arm">
        <template #icon><SafetyCertificateOutlined /></template>
        {{ __('Arm baseline') }}
      </Button>

      <Button :loading="isRunning" type="primary" @click="runCheck">
        <template #icon><ReloadOutlined /></template>
        {{ __('Check now') }}
      </Button>
    </template>
  </PageHeader>

  <!--
    Spacing lives on this column: margin utilities on antd roots lose to its
    cssinjs reset at high hash priority.
  -->
  <div class="flex flex-col gap-4">
    <Alert
      v-if="isImpaired"
      show-icon
      :description="
        summary?.impaired?.reason ??
        __('This plugin could not fetch your pages on the last run, so no all-clear can be given.')
      "
      :message="__('Monitoring impaired')"
      type="warning"
    />

    <Alert
      v-if="summary?.baseline"
      show-icon
      :description="
        __(
          'The next check compares against this snapshot instead of the last run, so anything your updates break shows up clearly. It expires on its own after 24 hours.'
        )
      "
      :message="__('Baseline saved. Go ahead and run your updates')"
      type="info"
    />

    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-5">
      <div class="flex flex-col gap-4 lg:col-span-3">
        <SeverityStrip :counts="counts" @select="openSeverity" />

        <Card :title="__('Changes over the last 14 days')">
          <template #extra>
            <div class="flex items-center gap-4">
              <span
                v-for="severity in CHART_SEVERITIES"
                :key="severity.key"
                class="flex items-center gap-1.5 text-xs"
                :style="{ color: palette.inkMuted }"
              >
                <span class="h-2.5 w-2.5 rounded-sm" :style="{ background: severity.tone }" />
                {{ severity.label }}
              </span>
            </div>
          </template>
          <ChangesChart />
        </Card>

        <Card :title="__('Needs your attention')">
          <template v-if="items.length > 0" #extra>
            <Button size="small" type="link" @click="router.push('/log')">
              {{ __('View all') }}
            </Button>
          </template>

          <div
            v-if="items.length === 0"
            class="flex flex-col items-center gap-1 px-4 py-10 text-center"
          >
            <CheckCircleFilled :style="{ color: palette.success, fontSize: '22px' }" />
            <p class="m-0 mt-2 text-sm font-medium" :style="{ color: palette.ink }">
              {{ __('Nothing unexpected has changed.') }}
            </p>
            <p class="m-0 max-w-xs text-xs" :style="{ color: palette.inkMuted }">
              {{ __('We will tell you the moment something does.') }}
            </p>
          </div>

          <!--
            Rows are full-bleed against the card padding so the hover band and
            the dividers reach its edges the way a table's would.
          -->
          <ul v-else class="-mx-4 -my-2 flex list-none flex-col p-0">
            <li v-for="(finding, i) in items" :key="finding.id">
              <button
                :class="[
                  'scm-hover group flex w-full cursor-pointer items-center gap-3 border-0 border-solid bg-transparent px-4 py-2.5 text-left transition-colors',
                  { 'border-t': i > 0 }
                ]"
                :style="{ borderColor: palette.lineSoft }"
                type="button"
                @click="router.push('/log')"
              >
                <span
                  class="h-1.5 w-1.5 shrink-0 rounded-full"
                  :style="{ background: SEVERITY_TONE[finding.severity] }"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium" :style="{ color: palette.ink }">
                    {{ changeLabel(finding.change_type) }}
                  </span>
                  <span class="block truncate text-xs" :style="{ color: palette.inkMuted }">
                    {{ finding.target_label ?? finding.target_url ?? __('Site-wide') }}
                  </span>
                </span>
                <When class-name="hidden shrink-0 sm:block" :value="finding.created_at" />
                <RightOutlined
                  class="shrink-0 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                  :style="{ color: palette.inkFaint }"
                />
              </button>
            </li>
          </ul>
        </Card>
      </div>

      <div class="flex flex-col gap-4 lg:col-span-2">
        <Card :title="__('Monitoring status')">
          <dl class="m-0 flex flex-col gap-2.5 text-sm">
            <StatusRow :label="__('Pages monitored')">
              {{ summary?.active_targets ?? 0 }}
            </StatusRow>
            <StatusRow :label="__('Last check')">
              <When :fallback="__('never')" :value="summary?.last_run?.finished_at" />
            </StatusRow>
            <StatusRow :label="__('Next check')">
              <span v-if="summary?.frequency === 'off'">{{ __('scheduling is off') }}</span>
              <When v-else :fallback="__('not scheduled')" :value="summary?.next_run_at" />
            </StatusRow>
            <StatusRow :label="__('Last run')" :tone="isImpaired ? palette.warning : undefined">
              {{ summary?.last_run?.status ?? __('never run') }}
            </StatusRow>
          </dl>
        </Card>

        <Card :title="__('Change types · last 14 days')">
          <TypeBreakdown />
        </Card>

        <Card :title="__('AI crawler visits')">
          <CrawlerActivity />
        </Card>

        <Card :title="__('Recent site activity')">
          <p
            v-if="events.length === 0"
            class="m-0 py-2 text-xs"
            :style="{ color: palette.inkMuted }"
          >
            {{ __('Nothing has changed on this site lately.') }}
          </p>
          <ul v-else class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li v-for="event in events" :key="event.id" class="flex items-baseline gap-2.5 text-sm">
              <span
                class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                :style="{ background: palette.inkFaint }"
              />
              <span class="min-w-0 flex-1">
                <span class="font-medium" :style="{ color: palette.ink }">
                  {{ eventLabel(event.type) }}
                </span>
                <!-- Explicit space: a Vue template collapses the newline between
                     these spans, unlike the JSX {' '} it replaced. -->
                {{ ' ' }}
                <span class="break-words text-xs" :style="{ color: palette.inkMuted }">
                  {{ event.subject }}
                </span>
              </span>
              <When class-name="shrink-0" :value="event.at" />
            </li>
          </ul>
        </Card>
      </div>
    </div>
  </div>
</template>

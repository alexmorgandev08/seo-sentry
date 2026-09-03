<script setup lang="ts">
import {
  ApiOutlined,
  DashboardOutlined,
  EyeOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  LoadingOutlined,
  SettingOutlined,
  UnorderedListOutlined
} from '@ant-design/icons-vue'
import { Tooltip } from 'ant-design-vue'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { absoluteTime, relativeTime } from '@common/helpers/datetime'
import ThemeSwitch from '@components/ThemeSwitch.vue'
import { useDashboardSummary, useRunStatus } from '@/api/queries'
import { palette } from '@config/theme'
import type { Component } from 'vue'

const route = useRoute()

const NAV: { icon: Component; key: string; label: string }[] = [
  { icon: DashboardOutlined, key: '/', label: __('Dashboard') },
  { icon: UnorderedListOutlined, key: '/pages', label: __('Monitored Pages') },
  { icon: FileSearchOutlined, key: '/log', label: __('Flight Log') },
  { icon: GlobalOutlined, key: '/site', label: __('Site-wide') },
  { icon: ApiOutlined, key: '/integrations', label: __('Integrations') },
  { icon: SettingOutlined, key: '/settings', label: __('Settings') }
]

const { data: summary } = useDashboardSummary()
const { data: run } = useRunStatus()

/**
 * The health chip is the one piece of state worth carrying on every screen: it
 * answers "is the site fine right now" without a trip back to the dashboard.
 */
const health = computed(() => {
  const pages = summary.value?.active_targets ?? 0
  const critical = summary.value?.open_counts.critical ?? 0
  const detail = pages === 1 ? __('1 page') : sprintf(__('%d pages'), pages)

  if (run.value?.status === 'running') {
    return { detail, label: __('Checking now'), spinning: true, tone: palette.info }
  }

  if (summary.value?.impaired || run.value?.status === 'impaired') {
    return { detail, label: __('Monitoring impaired'), spinning: false, tone: palette.warning }
  }

  if (critical > 0) {
    return {
      detail,
      label: critical === 1 ? __('1 critical issue') : sprintf(__('%d critical issues'), critical),
      spinning: false,
      tone: palette.critical
    }
  }

  return { detail, label: __('All clear'), spinning: false, tone: palette.success }
})

const lastCheckedAt = computed(() => summary.value?.last_run?.finished_at)
const checkedTitle = computed(() => {
  const checked = relativeTime(lastCheckedAt.value)

  return checked
    ? sprintf(__('Last checked %s'), absoluteTime(lastCheckedAt.value) ?? checked)
    : __('No check has run yet')
})

const strip = ref<HTMLElement | null>(null)

/*
 * Once the strip is narrow enough to scroll, the current tab can sit outside
 * it, and the screen then shows no active tab at all. Only the strip's own
 * scrollLeft is touched, so this can never scroll the page itself the way
 * scrollIntoView would.
 */
const align = () => {
  const el = strip.value
  const current = el?.querySelector('.scm-tab.is-current')
  if (!el || !current) return

  const stripBox = el.getBoundingClientRect()
  const tabBox = current.getBoundingClientRect()
  const margin = 12

  if (tabBox.left < stripBox.left) {
    el.scrollLeft -= stripBox.left - tabBox.left + margin
  } else if (tabBox.right > stripBox.right) {
    el.scrollLeft += tabBox.right - stripBox.right + margin
  }
}

let observer: ResizeObserver | null = null

// The strip is still resizing after the first paint: the health chip beside it
// grows once its query resolves, and the window can be resized later. An
// observer catches both, and fires once on observe for the initial run.
watch(
  [strip, () => route.path],
  async () => {
    observer?.disconnect()
    if (!strip.value) return

    observer = new ResizeObserver(align)
    observer.observe(strip.value)
  },
  { flush: 'post', immediate: true }
)

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <header
    class="shrink-0"
    :style="{ background: palette.surface, borderBottom: `1px solid ${palette.line}` }"
  >
    <!--
      Full-bleed row: logo against the left edge, status chip and theme switch
      against the right. Both side groups are flex-1 so they take an equal
      share of the leftover space, which puts the menu on the true centre of
      the header. The menu is the only part that shrinks and scrolls.
    -->
    <div class="flex w-full items-center gap-4 px-6 py-3 lg:px-8">
      <div class="flex flex-1 shrink-0 items-center gap-2.5">
        <span
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm text-white"
          :style="{ background: palette.primary }"
        >
          <EyeOutlined />
        </span>
        <!--
          The full name costs ~130px that the menu needs on a narrower screen,
          so below 2xl the mark carries the identity on its own.
        -->
        <span
          class="hidden whitespace-nowrap text-sm font-semibold tracking-tight 2xl:block"
          :style="{ color: palette.ink }"
        >
          {{ __('SEO Change Monitor') }}
        </span>
      </div>

      <nav ref="strip" class="scm-tabs-scroll min-w-0 shrink overflow-x-auto">
        <ul class="scm-tabs m-0 inline-flex list-none gap-1">
          <li v-for="item in NAV" :key="item.key">
            <RouterLink
              :aria-current="route.path === item.key ? 'page' : undefined"
              :class="[
                'scm-tab link-reset flex items-center gap-2 whitespace-nowrap px-3 py-1.5 text-[15px] no-underline transition-colors',
                { 'is-current': route.path === item.key }
              ]"
              :to="item.key"
            >
              <component :is="item.icon" />
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <div class="flex flex-1 shrink-0 items-center justify-end gap-3">
        <Tooltip placement="bottom" :title="checkedTitle">
          <span
            class="hidden items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-3 pr-3.5 text-[13px] font-medium sm:inline-flex"
            :style="{ background: palette.lineSoft, color: palette.ink }"
          >
            <span class="flex items-center" :style="{ color: health.tone }">
              <LoadingOutlined v-if="health.spinning" spin />
              <span v-else class="block h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            {{ health.label }}
            <span class="hidden 2xl:inline" :style="{ color: palette.inkFaint }">·</span>
            <span class="hidden 2xl:inline" :style="{ color: palette.inkMuted }">
              {{ health.detail }}
            </span>
          </span>
        </Tooltip>

        <ThemeSwitch />
      </div>
    </div>
  </header>
</template>

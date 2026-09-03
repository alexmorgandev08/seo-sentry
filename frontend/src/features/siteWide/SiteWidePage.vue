<script setup lang="ts">
import { Alert, Card, Table, Tag } from 'ant-design-vue'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { __ } from '@common/helpers/i18nWrap'
import { parseUtc } from '@common/helpers/datetime'
import call from '@/api/client'
import PageHeader from '@components/PageHeader.vue'
import When from '@components/When.vue'
import { palette } from '@config/theme'

interface BotRow {
  slug: string
  label: string
  user_agent: string
  last_seen: null | string
  hits: number
}

interface SitePanel {
  checked_at: null | string
  fields: Record<string, unknown>
  error: null | string
}

interface SiteStatus {
  robots: null | SitePanel
  sitemap: null | SitePanel
  settings: null | SitePanel
  bots: BotRow[]
  bot_tracking: boolean
  impaired: null | { since: string; reason: string }
}

const { data, isLoading } = useQuery({
  queryKey: ['site-status'],
  queryFn: () => call<SiteStatus>('status/site')
})

const robots = computed(() => data.value?.robots?.fields ?? {})
const sitemap = computed(() => data.value?.sitemap?.fields ?? {})
const settings = computed(() => data.value?.settings?.fields ?? {})
const aiBots = computed(() => (robots.value.ai_bots ?? {}) as Record<string, string>)
const isPublic = computed(() => settings.value.blog_public !== false)

const robotsRaw = computed(() => String(robots.value.raw ?? '').trim() || __('(empty file)'))
const sitemapUrl = computed(() => String(sitemap.value.url ?? ''))

// Borderless everywhere, to match the severity and status tags on the other
// screens; a bordered tag here read as a different control entirely.
const verdict = (slug: string) => {
  const value = aiBots.value[slug]

  if (value === 'blocked') return { color: 'error', label: __('Blocked') }
  if (value === 'allowed') return { color: 'success', label: __('Allowed') }

  return { color: undefined, label: __('Not specified') }
}

const staleness = (lastSeen: string) => {
  const seenAt = parseUtc(lastSeen)
  const daysAgo = seenAt ? (Date.now() - seenAt.getTime()) / 86_400_000 : 0

  return daysAgo > 30 ? palette.warning : palette.success
}

const columns = [
  { key: 'label', title: __('Crawler') },
  { key: 'slug', title: __('robots.txt says'), width: 170 },
  { key: 'last_seen', title: __('Last seen here'), width: 220 }
]
</script>

<template>
  <PageHeader :title="__('Site-wide')" />

  <!--
    Spacing lives on this column: margin utilities on antd roots lose to its
    cssinjs reset at high hash priority.
  -->
  <div class="flex flex-col gap-4">
    <Alert
      v-if="!isPublic"
      show-icon
      :description="
        __(
          'WordPress is asking search engines to stay away. Until this is turned off in Settings → Reading, your pages will not appear in search results.'
        )
      "
      :message="__('Search engines are being discouraged from indexing this site')"
      type="error"
    />

    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <Card :loading="isLoading" :title="__('robots.txt')">
        <p
          v-if="robots.reachable === false"
          class="m-0 py-6 text-center text-sm"
          :style="{ color: palette.inkMuted }"
        >
          {{ __('Not reachable.') }}
        </p>
        <div v-else class="flex flex-col gap-3">
          <Alert
            v-if="Boolean(robots.blocks_all)"
            show-icon
            :message="__('This file blocks all crawlers from the whole site.')"
            type="error"
          />
          <pre class="scm-code max-h-56">{{ robotsRaw }}</pre>
        </div>
      </Card>

      <Card :loading="isLoading" :title="__('XML sitemap')">
        <div v-if="sitemap.reachable" class="flex flex-col gap-2">
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-semibold leading-none">
              {{ Number(sitemap.url_count ?? 0) }}
            </span>
            <span class="text-sm" :style="{ color: palette.inkMuted }">
              {{ __('URLs listed') }}
            </span>
          </div>
          <a class="break-all text-xs" :href="sitemapUrl" rel="noreferrer" target="_blank">
            {{ sitemapUrl }}
          </a>
          <Alert
            v-if="sitemap.valid === false"
            show-icon
            :message="__('Sitemap is not valid XML.')"
            type="error"
          />
        </div>
        <p v-else class="m-0 py-6 text-center text-sm" :style="{ color: palette.inkMuted }">
          {{
            isPublic
              ? __('No sitemap found at the usual locations.')
              : __('WordPress disables the sitemap while search engines are discouraged.')
          }}
        </p>
      </Card>
    </div>

    <Card :body-style="{ padding: 0 }" :loading="isLoading" :title="__('AI crawlers')">
      <template #extra>
        <span class="text-xs" :style="{ color: palette.inkMuted }">
          {{ __('Last-seen counts only requests that reach WordPress. Caching can hide visits.') }}
        </span>
      </template>

      <Table :columns="columns" :data-source="data?.bots ?? []" :pagination="false" row-key="slug">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'label'">
            <div class="flex flex-col">
              <span class="font-medium">{{ (record as BotRow).label }}</span>
              <span class="text-xs" :style="{ color: palette.inkFaint }">
                {{ (record as BotRow).user_agent }}
              </span>
            </div>
          </template>

          <template v-else-if="column.key === 'slug'">
            <Tag :bordered="false" :color="verdict((record as BotRow).slug).color">
              {{ verdict((record as BotRow).slug).label }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'last_seen'">
            <span v-if="!data?.bot_tracking" class="text-xs" :style="{ color: palette.inkFaint }">
              {{ __('tracking off') }}
            </span>
            <span
              v-else-if="!(record as BotRow).last_seen"
              class="text-xs"
              :style="{ color: palette.inkFaint }"
            >
              {{ __('Never seen') }}
            </span>
            <span v-else class="flex items-center gap-2 text-sm">
              <span
                class="h-1.5 w-1.5 shrink-0 rounded-full"
                :style="{ background: staleness((record as BotRow).last_seen as string) }"
              />
              <When :value="(record as BotRow).last_seen" />
              <span class="text-xs" :style="{ color: palette.inkFaint }">
                {{ (record as BotRow).hits }}
              </span>
            </span>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>

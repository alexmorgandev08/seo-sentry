<script setup lang="ts">
import { Tooltip } from 'ant-design-vue'
import { computed } from 'vue'
import { __ } from '@common/helpers/i18nWrap'
import { relativeTime } from '@common/helpers/datetime'
import { useSiteStatus } from '@/api/queries'
import { palette } from '@config/theme'

const TOP = 6

const { data } = useSiteStatus()

const bots = computed(() =>
  (data.value?.bots ?? [])
    .filter(bot => bot.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, TOP)
)

const max = computed(() => Math.max(...bots.value.map(bot => bot.hits), 1))

const seenLabel = (lastSeen: null | string) => {
  const seen = relativeTime(lastSeen)

  return seen ? `${__('last seen')} ${seen}` : ''
}
</script>

<template>
  <!--
    Horizontal bar list of AI crawler visits. One series, so one hue — the bar
    length carries the magnitude and the value sits at the tip in ink.
  -->
  <p
    v-if="data && !data.bot_tracking"
    class="m-0 py-2 text-xs"
    :style="{ color: palette.inkMuted }"
  >
    {{ __('Bot tracking is switched off in Settings.') }}
  </p>

  <p
    v-else-if="data && bots.length === 0"
    class="m-0 py-2 text-xs"
    :style="{ color: palette.inkMuted }"
  >
    {{ __('No crawler visits recorded yet.') }}
  </p>

  <ul v-else class="m-0 flex list-none flex-col gap-2.5 p-0">
    <li v-for="bot in bots" :key="bot.slug">
      <Tooltip
        placement="left"
        :title="seenLabel(bot.last_seen) ? `${bot.label} — ${seenLabel(bot.last_seen)}` : bot.label"
      >
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 truncate text-xs" :style="{ color: palette.ink }">
            {{ bot.label }}
          </span>
          <span class="min-w-0 flex-1">
            <span
              class="block h-2 min-w-[3px]"
              :style="{
                // 4px rounded data-end; square at the baseline edge.
                background: 'var(--scm-viz-info)',
                borderRadius: '0 4px 4px 0',
                width: `${(bot.hits / max) * 100}%`
              }"
            />
          </span>
          <span class="text-xs font-medium tabular-nums" :style="{ color: palette.ink }">
            {{ bot.hits }}
          </span>
        </div>
      </Tooltip>
    </li>
  </ul>
</template>

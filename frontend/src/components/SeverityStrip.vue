<script setup lang="ts">
import { ExclamationCircleOutlined, EyeOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { __ } from '@common/helpers/i18nWrap'
import { palette } from '@config/theme'
import type { Severity } from '@/api/types'
import type { Component } from 'vue'

defineProps<{ counts: Record<Severity, number> }>()
const emit = defineEmits<{ select: [severity: Severity] }>()

const CARDS: {
  caption: string
  icon: Component
  key: Severity
  label: string
  soft: string
  tone: string
}[] = [
  {
    caption: __('Affects whether pages can be found'),
    icon: ExclamationCircleOutlined,
    key: 'critical',
    label: __('Critical'),
    soft: palette.criticalSoft,
    tone: palette.critical
  },
  {
    caption: __('Worth a look when you have a moment'),
    icon: WarningOutlined,
    key: 'warning',
    label: __('Warning'),
    soft: palette.warningSoft,
    tone: palette.warning
  },
  {
    caption: __('Recorded for the history, no action needed'),
    icon: EyeOutlined,
    key: 'info',
    label: __('Info'),
    soft: palette.infoSoft,
    tone: palette.info
  }
]
</script>

<template>
  <!--
    Three severity stat cards: icon chip and label on top, the count as the
    hero of the card, the caption as the footer. Each card filters the flight
    log on click.
  -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <button
      v-for="card in CARDS"
      :key="card.key"
      class="flex cursor-pointer flex-col items-start gap-3 rounded-lg border border-solid p-5 text-left transition hover:-translate-y-px hover:shadow-sm"
      type="button"
      :style="{ background: palette.surface, borderColor: palette.line }"
      @click="emit('select', card.key)"
    >
      <span class="flex items-center gap-2.5">
        <span
          class="flex h-7 w-7 items-center justify-center rounded-md text-sm"
          :style="{ background: card.soft, color: card.tone }"
        >
          <component :is="card.icon" />
        </span>
        <span class="text-[13px] font-semibold" :style="{ color: palette.ink }">
          {{ card.label }}
        </span>
      </span>

      <span
        class="text-[32px] font-semibold leading-none"
        :style="{ color: (counts[card.key] ?? 0) > 0 ? card.tone : palette.inkFaint }"
      >
        {{ counts[card.key] ?? 0 }}
      </span>

      <span class="text-xs" :style="{ color: palette.inkMuted }">{{ card.caption }}</span>
    </button>
  </div>
</template>

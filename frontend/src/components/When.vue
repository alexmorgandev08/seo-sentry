<script setup lang="ts">
import { Tooltip } from 'ant-design-vue'
import { computed } from 'vue'
import { absoluteTime, relativeTime } from '@common/helpers/datetime'
import { palette } from '@config/theme'

const props = defineProps<{
  value: null | string | undefined
  /** Shown when the value is missing or unparseable. */
  fallback?: string
  className?: string
}>()

const relative = computed(() => relativeTime(props.value))
const absolute = computed(() => absoluteTime(props.value))
</script>

<template>
  <!--
    Every timestamp off the API is UTC, so it gets shown as a relative label in
    the reader's own zone with the exact local time behind a tooltip.
  -->
  <span v-if="!relative" :class="className" :style="{ color: palette.inkMuted }">
    {{ fallback ?? '—' }}
  </span>
  <Tooltip v-else :title="absolute">
    <span :class="['text-xs', className]" :style="{ color: palette.inkMuted }">
      {{ relative }}
    </span>
  </Tooltip>
</template>

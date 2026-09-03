<script setup lang="ts">
import { palette } from '@config/theme'

const props = defineProps<{ label: string; tone?: string }>()
</script>

<template>
  <!-- One label/value line of the monitoring status list. -->
  <div class="flex items-baseline justify-between gap-4">
    <dt class="m-0 shrink-0" :style="{ color: palette.inkMuted }">{{ label }}</dt>
    <dd class="m-0 truncate font-medium" :style="{ color: props.tone ?? palette.ink }">
      <slot />
    </dd>
  </div>
</template>

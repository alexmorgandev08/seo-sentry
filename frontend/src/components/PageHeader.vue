<script setup lang="ts">
import { palette } from '@config/theme'

defineProps<{ title: string }>()
</script>

<template>
  <!-- Consistent title block across every screen. -->
  <div class="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
    <h1
      class="m-0 min-w-0 text-xl font-semibold leading-tight tracking-tight"
      :style="{ color: palette.ink }"
    >
      {{ title }}
    </h1>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

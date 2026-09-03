<script setup lang="ts">
import { Tag } from 'ant-design-vue'
import { computed } from 'vue'
import { __ } from '@common/helpers/i18nWrap'
import type { Severity } from '@/api/types'

const props = defineProps<{ severity: Severity }>()

const MAP: Record<Severity, { color: string; label: string }> = {
  critical: { color: 'error', label: __('Critical') },
  warning: { color: 'warning', label: __('Warning') },
  info: { color: 'processing', label: __('Info') }
}

const config = computed(() => MAP[props.severity] ?? MAP.info)
</script>

<template>
  <Tag :bordered="false" :color="config.color">{{ config.label }}</Tag>
</template>

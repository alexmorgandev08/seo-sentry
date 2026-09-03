<script setup lang="ts">
import { ConfigProvider, message } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, watchEffect } from 'vue'
import useAdminBarOffset from '@common/helpers/useAdminBarOffset'
import useWpMenuHighlight from '@common/helpers/useWpMenuHighlight'
import TopBar from '@components/TopBar.vue'
import { buildTheme, palette } from '@config/theme'
import { useThemeStore } from '@/store/themeStore'

const themeStore = useThemeStore()
const toastTop = useAdminBarOffset()

useWpMenuHighlight()

const themeConfig = computed(() => buildTheme(themeStore.resolved === 'dark', themeStore.compact))

// Toasts sit below wp-admin's toolbar; antd positions them from a global
// config rather than a prop, so the measured offset is pushed in.
watchEffect(() => message.config({ top: `${toastTop.value}px` }))

let query: MediaQueryList | null = null
const onChange = () => themeStore.syncSystem()

// Follow the OS preference live while the mode is set to "system".
onMounted(() => {
  if (typeof window.matchMedia !== 'function') return

  query = window.matchMedia('(prefers-color-scheme: dark)')
  query.addEventListener('change', onChange)
})

onUnmounted(() => query?.removeEventListener('change', onChange))
</script>

<template>
  <ConfigProvider :theme="themeConfig">
    <div class="h-full-wp flex flex-col" :style="{ background: palette.canvas }">
      <TopBar />

      <main class="scroller thin flex-1 overflow-auto">
        <!--
          Full width like the header, with a generous ceiling so cards do not
          stretch absurdly on a 4K display. Reading-weight pages (Settings,
          Integrations) cap their own column narrower.
        -->
        <div class="mx-auto w-full max-w-[1800px] px-6 py-6 lg:px-8">
          <RouterView />
        </div>
      </main>
    </div>
  </ConfigProvider>
</template>

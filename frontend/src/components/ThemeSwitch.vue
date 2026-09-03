<script setup lang="ts">
import { ColumnHeightOutlined, DesktopOutlined, DownOutlined } from '@ant-design/icons-vue'
import MoonIcon from '@components/icons/MoonIcon.vue'
import SunIcon from '@components/icons/SunIcon.vue'
import { Button, Dropdown, Menu, MenuDivider, MenuItem, Tooltip, theme } from 'ant-design-vue'
import { computed } from 'vue'
import { __ } from '@common/helpers/i18nWrap'
import { useThemeStore } from '@/store/themeStore'
import type { ThemeMode } from '@/store/themeStore'
import type { Component } from 'vue'

const themeStore = useThemeStore()
const { token } = theme.useToken()

const MODE_ICON: Record<ThemeMode, Component> = {
  dark: MoonIcon,
  light: SunIcon,
  system: DesktopOutlined
}

const MODES: { icon: Component; key: ThemeMode; label: string }[] = [
  { icon: DesktopOutlined, key: 'system', label: __('Follow system') },
  { icon: SunIcon, key: 'light', label: __('Light theme') },
  { icon: MoonIcon, key: 'dark', label: __('Dark theme') }
]

const triggerIcon = computed(() => MODE_ICON[themeStore.mode])

/*
 * The dot colour comes from the antd token rather than the CSS-variable map:
 * the menu is portalled to <body>, outside #seo-change-monitor-root, where
 * every --scm-* variable is undefined and the dot would render transparent.
 */
const dot = computed(() => token.value.colorPrimary)

const onClick = ({ key }: { key: string | number }) => {
  if (key === 'compact') {
    themeStore.setCompact(!themeStore.compact)

    return
  }

  themeStore.setMode(key as ThemeMode)
}
</script>

<template>
  <Dropdown placement="bottomRight" :trigger="['click']">
    <Tooltip placement="bottom" :title="__('Theme')">
      <Button :aria-label="__('Theme')" class="scm-theme-trigger" type="text">
        <span class="flex items-center gap-1.5">
          <component :is="triggerIcon" />
          <DownOutlined class="scm-theme-caret" />
        </span>
      </Button>
    </Tooltip>

    <template #overlay>
      <Menu @click="onClick">
        <MenuItem v-for="mode in MODES" :key="mode.key">
          <span class="flex min-w-[150px] items-center justify-between gap-6">
            <span class="flex items-center gap-2">
              <component :is="mode.icon" />
              {{ mode.label }}
            </span>
            <span
              aria-hidden="true"
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              :style="{ background: themeStore.mode === mode.key ? dot : 'transparent' }"
            />
          </span>
        </MenuItem>

        <MenuDivider />

        <!--
          Density is independent of light and dark, so it toggles rather than
          joining the three above as a fourth choice.
        -->
        <MenuItem key="compact">
          <span class="flex min-w-[150px] items-center justify-between gap-6">
            <span class="flex items-center gap-2">
              <ColumnHeightOutlined />
              {{ __('Compact theme') }}
            </span>
            <span
              aria-hidden="true"
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              :style="{ background: themeStore.compact ? dot : 'transparent' }"
            />
          </span>
        </MenuItem>
      </Menu>
    </template>
  </Dropdown>
</template>

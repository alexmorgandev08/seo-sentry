import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'seo-change-monitor:theme'
const DENSITY_KEY = 'seo-change-monitor:compact'
const ROOT_ID = 'seo-change-monitor-root'

const isMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system'

/** Reading storage can throw in private windows; never let that break the app. */
export const readStoredMode = (): ThemeMode => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    return isMode(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export const readStoredCompact = (): boolean => {
  try {
    return window.localStorage.getItem(DENSITY_KEY) === '1'
  } catch {
    return false
  }
}

const prefersDark = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches

export const resolveMode = (mode: ThemeMode) =>
  mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode

/**
 * Applies the resolved theme to the app root. Exported so main.ts can call it
 * before the first render and avoid a flash of the wrong theme.
 */
export const applyTheme = (resolved: 'dark' | 'light', compact: boolean) => {
  const root = document.getElementById(ROOT_ID)
  if (!root) return

  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('compact', compact)
  root.style.colorScheme = resolved

  // Mirrored onto <html> so the palette variables, which are also declared at
  // :root, switch for the portalled surfaces (drawers, modals, dropdowns,
  // tooltips) — those render outside the app root and cannot see its classes.
  document.documentElement.classList.toggle('scm-dark', resolved === 'dark')
  document.documentElement.classList.toggle('scm-compact', compact)
}

const store = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // A viewer with storage blocked still gets the choice for this session.
  }
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredMode())
  const resolved = ref<'dark' | 'light'>(resolveMode(mode.value))
  const compact = ref(readStoredCompact())

  const setMode = (next: ThemeMode) => {
    mode.value = next
    resolved.value = resolveMode(next)
    store(STORAGE_KEY, next)
    applyTheme(resolved.value, compact.value)
  }

  const setCompact = (next: boolean) => {
    compact.value = next
    store(DENSITY_KEY, next ? '1' : '0')
    applyTheme(resolved.value, next)
  }

  /** Re-evaluates 'system' when the OS preference changes. */
  const syncSystem = () => {
    if (mode.value !== 'system') return

    resolved.value = resolveMode('system')
    applyTheme(resolved.value, compact.value)
  }

  return { compact, mode, resolved, setCompact, setMode, syncSystem }
})

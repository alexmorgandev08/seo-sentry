import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { applyTheme, readStoredCompact, readStoredMode, resolveMode } from './store/themeStore'
import './resource/styles/variables.css'
import './resource/styles/global.css'

const element = document.querySelector('#seo-change-monitor-root')

if (element) {
  // Before the first paint, so the saved theme never flashes the wrong way.
  applyTheme(resolveMode(readStoredMode()), readStoredCompact())

  createApp(App)
    .use(createPinia())
    .use(router)
    .use(VueQueryPlugin, {
      queryClientConfig: {
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 15_000 }
        }
      }
    })
    .mount(element)
}

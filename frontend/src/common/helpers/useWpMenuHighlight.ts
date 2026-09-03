import { watch } from 'vue'
import { useRoute } from 'vue-router'
import config from '@config/config'

/**
 * Keeps the WordPress submenu highlight in step with the in-app route.
 *
 * Every submenu entry points at the same admin page with a different hash, so
 * WordPress always marks the first one current; it cannot see the hash.
 */
export default function useWpMenuHighlight() {
  const route = useRoute()

  watch(
    () => route.path,
    path => {
      const items = document.querySelectorAll<HTMLAnchorElement>(
        `#adminmenu a[href*="page=${config.PLUGIN_SLUG}"]`
      )

      if (items.length === 0) return

      const current = path === '/' ? '' : `#${path}`

      items.forEach(anchor => {
        const parent = anchor.parentElement
        if (!parent || parent.tagName !== 'LI') return

        const href = anchor.getAttribute('href') ?? ''
        const hashIndex = href.indexOf('#')
        const anchorRoute = hashIndex === -1 ? '' : href.slice(hashIndex)
        const isCurrent = anchorRoute === current

        parent.classList.toggle('current', isCurrent)
        anchor.classList.toggle('current', isCurrent)

        if (isCurrent) {
          anchor.setAttribute('aria-current', 'page')
        } else {
          anchor.removeAttribute('aria-current')
        }
      })
    },
    { immediate: true }
  )
}

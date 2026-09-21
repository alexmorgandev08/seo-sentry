import { useEffect, useState } from 'react'

/** antd's own gap between the viewport edge and a toast. */
const GAP = 8

/**
 * How far down toasts must start to clear wp-admin's toolbar and the plugin's
 * own menu bar, both of which stay put while the page scrolls.
 *
 * antd writes the toast container's `top` as an inline style, so CSS cannot
 * move it. Measuring the real elements also beats hardcoding 32/46px: admin
 * colour schemes, future WordPress versions and a wrapped menu all change it.
 */
function measure() {
  let top = GAP

  const bar = document.getElementById('wpadminbar')
  // Below 600px wp-admin lets the toolbar scroll away, so nothing overlaps.
  if (bar && window.getComputedStyle(bar).position === 'fixed') {
    top += Math.round(bar.getBoundingClientRect().height)
  }

  const menu = document.querySelector('.scm-topbar')
  if (menu) top += Math.round(menu.getBoundingClientRect().height)

  return top
}

export default function useAdminBarOffset() {
  const [offset, setOffset] = useState(measure)

  useEffect(() => {
    // Measured again after the first paint: the plugin's own menu is not in
    // the DOM yet when this hook runs for the first time.
    setOffset(measure())

    const onResize = () => setOffset(measure())

    window.addEventListener('resize', onResize)

    return () => window.removeEventListener('resize', onResize)
  }, [])

  return offset
}

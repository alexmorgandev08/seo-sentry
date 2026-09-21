import { useCallback, useEffect, useRef } from 'react'

/**
 * Debounces a callback while keeping a stable identity, so the pending timer
 * is not thrown away on every render when the callback closes over changing
 * state. Anything still pending is dropped on unmount.
 */
export default function useDebounce<T extends unknown[]>(
  callback: (...args: T) => void,
  delay = 400
) {
  const latest = useRef(callback)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    latest.current = callback
  }, [callback])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  return useCallback(
    (...args: T) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => latest.current(...args), delay)
    },
    [delay]
  )
}

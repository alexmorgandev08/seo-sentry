import { useSettings } from '@/api/queries'

/** What pro uses until a send time is chosen. */
const DEFAULT_EMAIL_TIME = '08:00'

/**
 * The saved send time for scheduled emails. Read from the settings query, so
 * every screen shows a change made on the Alert rules tab at once.
 */
export const useEmailTime = () => useSettings().data?.email_time || DEFAULT_EMAIL_TIME

/** Every half hour of the day, "00:00" to "23:30", as the server stores them. */
export const EMAIL_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0')
  const time = `${hours}:${index % 2 === 0 ? '00' : '30'}`

  return { label: time, value: time }
})

import { palette } from '@config/theme'
import type { ReactNode } from 'react'

/** Each row brings its own vertical padding; the card must not add a second helping. */
export const CARD_STYLES = { body: { paddingBlock: 4 } }

interface RowProps {
  children: ReactNode
  description?: string
  icon?: ReactNode
  title: string
}

/**
 * One setting per row: what it is on the left, the control on the right. Reads
 * as a list of decisions rather than a form to fill in, which suits a screen
 * that saves on its own.
 *
 * The divider is dropped on the last row by `last:`, so adding a row never
 * means remembering to move a flag along with it.
 */
export default function SettingRow({ children, description, icon, title }: RowProps) {
  return (
    <div
      className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-0 border-b border-solid py-4 last:border-b-0"
      style={{ borderColor: palette.lineSoft }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0 text-base" style={{ color: palette.inkFaint }}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium" style={{ color: palette.ink }}>
            {title}
          </div>
          {description ? (
            <p className="m-0 mt-1 text-xs leading-relaxed" style={{ color: palette.inkMuted }}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="w-full shrink-0 sm:w-64">{children}</div>
    </div>
  )
}

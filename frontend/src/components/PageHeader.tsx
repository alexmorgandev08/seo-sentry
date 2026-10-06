import { palette } from '@config/theme'
import type { ReactNode } from 'react'

interface Props {
  title: string
  /** Sits beside the title, e.g. a range switch for the whole screen. */
  filters?: ReactNode
  actions?: ReactNode
}

/** Consistent title block across every screen. */
export default function PageHeader({ title, filters, actions }: Props) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
        <h1
          className="m-0 min-w-0 text-xl font-semibold leading-tight tracking-tight"
          style={{ color: palette.ink }}
        >
          {title}
        </h1>
        {filters}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

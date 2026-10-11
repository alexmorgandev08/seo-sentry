import { ArrowRightOutlined, CheckOutlined, CrownFilled } from '@ant-design/icons'
import { Button } from 'antd'
import classNames from '@common/helpers/classNames'
import { __ } from '@common/helpers/i18nWrap'
import config from '@config/config'
import { palette } from '@config/theme'
import { PRO_FEATURES } from './proFeatures'
import type { ProFeatureKey } from './proFeatures'

// Where someone who already bought Pro goes to switch it on.
const PLUGINS_URL = config.AJAX_URL.replace(/admin-ajax\.php$/, 'plugins.php')

/** Small crown-and-"Pro" marker for locked controls. */
export function ProBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: palette.warningSoft, color: palette.warning }}
    >
      <CrownFilled />
      {__('Pro')}
    </span>
  )
}

interface Props {
  feature: ProFeatureKey
  /** Given by the modal: shows a "Not now" button and drops the page framing. */
  onClose?: () => void
}

/**
 * Shown in place of a pro feature while the pro plugin is missing: what the
 * feature does and how to get it. On a page it is a card of its own; in the
 * upgrade modal it is the whole body.
 *
 * Spacing sits on divs and flex gaps, and the title is a div: the modal is
 * portalled outside the app root, so wp-admin's own heading margins apply
 * there, while inside the root a reset zeroes them.
 */
export default function ProUpsell({ feature, onClose }: Props) {
  const { icon, title, description, benefits } = PRO_FEATURES[feature]
  const isModal = onClose !== undefined

  return (
    <div
      className={isModal ? '' : 'overflow-hidden rounded-lg border border-solid'}
      style={isModal ? undefined : { background: palette.surface, borderColor: palette.line }}
    >
      {/* Header band: a soft wash of the brand colour fading into the card. */}
      <div
        className="flex items-start gap-4 px-7 pb-5 pt-7"
        style={{
          background: `linear-gradient(180deg, ${palette.primarySoft} 0%, transparent 100%)`
        }}
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl"
          // Surface, not white: dark mode's primary is a light tint.
          style={{ background: palette.primary, color: palette.surface }}
        >
          {icon}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: palette.warning }}
          >
            <CrownFilled />
            {__('SEO Sentry Pro')}
          </div>
          <div
            className="text-lg font-semibold leading-snug"
            role="heading"
            aria-level={2}
            style={{ color: palette.ink }}
          >
            {title}
          </div>
          <div className="text-sm leading-relaxed" style={{ color: palette.inkMuted }}>
            {description}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-7 pb-7">
        {/* Two columns on a page; the modal is too narrow for them to breathe. */}
        <ul
          className={classNames(
            'm-0 grid list-none gap-x-6 gap-y-3 p-0',
            !isModal && 'sm:grid-cols-2'
          )}
        >
          {benefits.map(benefit => (
            <li
              key={benefit}
              className="mb-0 flex items-start gap-2.5 text-[13px] leading-snug"
              style={{ color: palette.ink }}
            >
              <span
                className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]"
                style={{ background: palette.successSoft, color: palette.success }}
              >
                <CheckOutlined />
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-3 border-0 border-t border-solid pt-5"
          style={{ borderColor: palette.lineSoft }}
        >
          <a className="text-xs" href={PLUGINS_URL} style={{ color: palette.inkMuted }}>
            {__('Already have Pro? Activate it on the Plugins page')}
          </a>
          <div className="ml-auto flex items-center gap-2">
            {isModal && <Button onClick={onClose}>{__('Not now')}</Button>}
            <Button href={config.PRO_URL} target="_blank" type="primary">
              {__('Upgrade to Pro')}
              <ArrowRightOutlined />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

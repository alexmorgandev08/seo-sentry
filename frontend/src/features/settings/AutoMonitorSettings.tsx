import {
  AppstoreOutlined,
  FilterOutlined,
  LinkOutlined,
  StopOutlined,
  SyncOutlined,
  TagsOutlined
} from '@ant-design/icons'
import { Alert, App, Button, Card, InputNumber, Select, Switch } from 'antd'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { useAutoMonitorOptions, useAutoMonitorPreview, useSyncAutoMonitor } from '@/api/queries'
import type { Settings } from '@/api/types'
import SettingRow, { CARD_STYLES } from './SettingRow'

type Save = <K extends keyof Settings>(key: K, value: Settings[K]) => void

interface Props {
  draft: Settings | undefined
  isLoading: boolean
  /** The Settings page's own autosave helpers, so this tab saves like the others. */
  save: Save
  saveTyped: Save
}

/**
 * Pro: monitor content by rule instead of by hand. New matching posts are
 * added as they are published; existing ones only when "Add now" is pressed,
 * after the count is on screen.
 */
export default function AutoMonitorSettings({ draft, isLoading, save, saveTyped }: Props) {
  const { message } = App.useApp()
  const enabled = Boolean(draft?.auto_monitor_enabled)
  const postTypes = draft?.auto_monitor_post_types ?? []
  const { data: options } = useAutoMonitorOptions(postTypes)
  const { data: preview } = useAutoMonitorPreview(enabled && postTypes.length > 0)
  const sync = useSyncAutoMonitor()

  const rulesDisabled = isLoading || !enabled

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: result =>
        message.success(
          result.added === 0
            ? __('Every matching page is already monitored.')
            : sprintf(__('SEO Sentry now monitors %d more pages.'), result.added)
        ),
      onError: error => message.error(error.message)
    })

  return (
    <div className="flex flex-col gap-4">
      <Card styles={CARD_STYLES}>
        <SettingRow
          description={__(
            'When you publish a post that matches the rules below, SEO Sentry starts to monitor it. You do not have to add these posts yourself.'
          )}
          icon={<SyncOutlined />}
          title={__('Monitor new content automatically')}
        >
          <Switch
            checked={enabled}
            disabled={isLoading}
            onChange={value => save('auto_monitor_enabled', value)}
          />
        </SettingRow>

        <SettingRow icon={<AppstoreOutlined />} title={__('Content types')}>
          <Select
            className="w-full"
            disabled={rulesDisabled}
            mode="multiple"
            optionFilterProp="label"
            options={options?.post_types ?? []}
            placeholder={__('For example: Posts, Products')}
            value={postTypes}
            onChange={value => save('auto_monitor_post_types', value)}
          />
        </SettingRow>

        <SettingRow
          description={__('Leave this field empty to include all content of the selected types.')}
          icon={<TagsOutlined />}
          title={__('Only with these categories or tags')}
        >
          <Select
            allowClear
            className="w-full"
            disabled={rulesDisabled || postTypes.length === 0}
            mode="multiple"
            optionFilterProp="label"
            options={options?.terms ?? []}
            placeholder={__('Any')}
            value={draft?.auto_monitor_include_terms ?? []}
            onChange={value => save('auto_monitor_include_terms', value)}
          />
        </SettingRow>

        <SettingRow icon={<FilterOutlined />} title={__('Skip these categories or tags')}>
          <Select
            allowClear
            className="w-full"
            disabled={rulesDisabled || postTypes.length === 0}
            mode="multiple"
            optionFilterProp="label"
            options={options?.terms ?? []}
            placeholder={__('None')}
            value={draft?.auto_monitor_exclude_terms ?? []}
            onChange={value => save('auto_monitor_exclude_terms', value)}
          />
        </SettingRow>

        <SettingRow
          description={__(
            'Use * as a wildcard. Start with / to match the path, for example: /archive/*'
          )}
          icon={<LinkOutlined />}
          title={__('Skip URLs that match')}
        >
          <Select
            className="w-full"
            disabled={rulesDisabled}
            mode="tags"
            open={false}
            placeholder="/archive/*"
            tokenSeparators={[',', ' ']}
            value={draft?.auto_monitor_exclude_patterns ?? []}
            onChange={value => save('auto_monitor_exclude_patterns', value)}
          />
        </SettingRow>

        <SettingRow
          description={__(
            'SEO Sentry checks all monitored pages each time. This limit protects your server. When you reach this limit, auto-monitoring does not add more pages.'
          )}
          icon={<StopOutlined />}
          title={__('Page limit')}
        >
          <InputNumber
            addonAfter={__('pages')}
            className="w-full"
            disabled={rulesDisabled}
            max={2000}
            min={1}
            value={draft?.auto_monitor_max_pages}
            onChange={value => {
              if (value) saveTyped('auto_monitor_max_pages', value)
            }}
          />
        </SettingRow>
      </Card>

      {enabled && postTypes.length > 0 && preview && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              {sprintf(
                __(
                  '%1$d published pages match these rules. You use %2$d of your limit of %3$d pages.'
                ),
                preview.matching,
                preview.monitored,
                preview.cap
              )}
            </div>
            <Button
              disabled={preview.to_add === 0}
              loading={sync.isPending}
              type="primary"
              onClick={runSync}
            >
              {preview.to_add === 0
                ? __('All matching pages are monitored')
                : sprintf(__('Add %d existing pages now'), preview.to_add)}
            </Button>
          </div>
          {preview.over_cap > 0 && (
            <Alert
              showIcon
              className="mt-4"
              message={sprintf(
                __(
                  '%d more pages match, but they are more than your page limit. Increase the limit to include these pages.'
                ),
                preview.over_cap
              )}
              type="warning"
            />
          )}
        </Card>
      )}
    </div>
  )
}

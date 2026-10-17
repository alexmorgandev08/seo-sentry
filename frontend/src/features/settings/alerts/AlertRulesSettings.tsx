import { App, Alert, Button, Card, Empty, List, Popconfirm, Select, Switch, Tag } from 'antd'
import { useState } from 'react'
import { __, sprintf } from '@common/helpers/i18nWrap'
import {
  useAlertMeta,
  useAlertRules,
  useDeleteAlertRule,
  useDeletePageGroup,
  usePageGroups,
  useSaveAlertRule,
  useSettings,
  useUpdateSettings
} from '@/api/queries'
import { changeLabel } from '@components/changeLabels'
import type { AlertRule, PageGroup } from '@/api/types'
import { EMAIL_TIME_OPTIONS, useEmailTime } from '../emailTime'
import SettingRow, { CARD_STYLES } from '../SettingRow'
import GroupModal, { FREQUENCY_OPTIONS } from './GroupModal'
import RuleModal, { SEVERITY_OPTIONS } from './RuleModal'

/** One readable line per rule: "Warning and Critical · Important pages · Email (2), Webhooks · Once a day". */
const describeRule = (rule: AlertRule, groups: PageGroup[]) => {
  const parts = [SEVERITY_OPTIONS.find(option => option.value === rule.min_severity)?.label ?? '']

  if (rule.change_types.length === 1) parts.push(changeLabel(rule.change_types[0]))
  if (rule.change_types.length > 1)
    parts.push(sprintf(__('%d types of change'), rule.change_types.length))

  if (rule.scope === 'site') parts.push(__('Site-wide checks'))
  if (rule.scope === 'group') {
    parts.push(
      groups.find(group => group.id === rule.group_id)?.name ?? __('(page group not found)')
    )
  }

  const channels = [
    ...(rule.emails.length > 0 ? [sprintf(__('Email (%d)'), rule.emails.length)] : []),
    ...(rule.webhook ? [__('Webhooks')] : [])
  ]
  parts.push(channels.join(', '))
  parts.push(rule.mode === 'daily' ? __('Once a day') : __('After each check'))

  return parts.join(' · ')
}

const describeGroup = (group: PageGroup, postTypeLabel: (name: string) => string) => {
  const pages = [...group.post_types.map(postTypeLabel), ...group.url_patterns].join(', ')
  const frequency =
    group.frequency && group.frequency !== 'inherit'
      ? FREQUENCY_OPTIONS.find(option => option.value === group.frequency)?.label
      : null

  return frequency ? `${pages} · ${sprintf(__('checked: %s'), frequency.toLowerCase())}` : pages
}

export default function AlertRulesSettings() {
  const { message } = App.useApp()
  const { data: meta } = useAlertMeta()
  const { data: groups = [], isLoading: groupsLoading } = usePageGroups()
  const { data: rules = [], isLoading: rulesLoading } = useAlertRules()
  const saveRule = useSaveAlertRule()
  const deleteRule = useDeleteAlertRule()
  const deleteGroup = useDeletePageGroup()
  const { data: settings } = useSettings()
  const emailTime = useEmailTime()
  const updateSettings = useUpdateSettings()
  const [editingRule, setEditingRule] = useState<null | Partial<AlertRule>>(null)
  const [editingGroup, setEditingGroup] = useState<null | Partial<PageGroup>>(null)

  const postTypeLabel = (name: string) =>
    meta?.post_types.find(type => type.value === name)?.label ?? name

  const onError = (error: Error) => message.error(error.message)

  const saveEmailTime = (email_time: string) =>
    updateSettings.mutate(
      { email_time },
      {
        onSuccess: () => message.success({ content: __('Settings saved.'), key: 'settings-saved' }),
        onError
      }
    )

  return (
    <div className="flex flex-col gap-4">
      <Alert
        showIcon
        message={__(
          'Alert rules send more alerts in addition to the main email alert. To use only alert rules, turn off "Turn on email alerts" on the Email alerts tab.'
        )}
        type="info"
      />

      <Card styles={CARD_STYLES}>
        <SettingRow
          description={__(
            'SEO Sentry sends the daily alert emails and the client report at this time. It uses the time zone in Settings → General.'
          )}
          title={__('Send time for scheduled emails')}
        >
          <Select
            className="w-full"
            disabled={!settings}
            options={EMAIL_TIME_OPTIONS}
            value={emailTime}
            onChange={saveEmailTime}
          />
        </SettingRow>
      </Card>

      <Card
        extra={
          <Button type="primary" onClick={() => setEditingRule({})}>
            {__('Add rule')}
          </Button>
        }
        title={__('Alert rules')}
      >
        <List
          dataSource={rules}
          loading={rulesLoading}
          locale={{
            emptyText: (
              <Empty
                description={__(
                  'There are no alert rules. For example, you can send an email to the client only when an important page changes to noindex.'
                )}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
          renderItem={rule => (
            <List.Item
              actions={[
                <Switch
                  key="enabled"
                  checked={rule.enabled}
                  size="small"
                  onChange={enabled => saveRule.mutate({ ...rule, enabled }, { onError })}
                />,
                <Button key="edit" size="small" onClick={() => setEditingRule(rule)}>
                  {__('Edit')}
                </Button>,
                <Popconfirm
                  key="delete"
                  title={__('Delete this alert rule?')}
                  onConfirm={() => deleteRule.mutate({ id: rule.id }, { onError })}
                >
                  <Button danger size="small">
                    {__('Delete')}
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                description={describeRule(rule, groups)}
                title={
                  <span className="flex items-center gap-2">
                    {rule.name}
                    {!rule.enabled && <Tag>{__('Off')}</Tag>}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Card
        extra={<Button onClick={() => setEditingGroup({})}>{__('Add page group')}</Button>}
        title={__('Page groups')}
      >
        <List
          dataSource={groups}
          loading={groupsLoading}
          locale={{
            emptyText: (
              <Empty
                description={__(
                  'There are no page groups. Add a page group to use it in an alert rule, for example: all products, or all pages under /blog/.'
                )}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
          renderItem={group => (
            <List.Item
              actions={[
                <Button key="edit" size="small" onClick={() => setEditingGroup(group)}>
                  {__('Edit')}
                </Button>,
                <Popconfirm
                  key="delete"
                  title={__('Delete this page group?')}
                  onConfirm={() => deleteGroup.mutate({ id: group.id }, { onError })}
                >
                  <Button danger size="small">
                    {__('Delete')}
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                description={describeGroup(group, postTypeLabel)}
                title={group.name}
              />
            </List.Item>
          )}
        />
      </Card>

      <RuleModal
        groups={groups}
        meta={meta}
        rule={editingRule}
        onClose={() => setEditingRule(null)}
      />
      <GroupModal group={editingGroup} meta={meta} onClose={() => setEditingGroup(null)} />
    </div>
  )
}

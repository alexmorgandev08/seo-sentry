import { App, Alert, Button, Card, Empty, List, Popconfirm, Switch, Tag } from 'antd'
import { useState } from 'react'
import { __, sprintf } from '@common/helpers/i18nWrap'
import {
  useAlertMeta,
  useAlertRules,
  useDeleteAlertRule,
  useDeletePageGroup,
  usePageGroups,
  useSaveAlertRule
} from '@/api/queries'
import { changeLabel } from '@components/changeLabels'
import type { AlertRule, PageGroup } from '@/api/types'
import GroupModal, { FREQUENCY_OPTIONS } from './GroupModal'
import RuleModal, { SEVERITY_OPTIONS } from './RuleModal'

/** One readable line per rule: "Warning and above · Money pages · 2 email, Webhooks · Daily". */
const describeRule = (rule: AlertRule, groups: PageGroup[]) => {
  const parts = [SEVERITY_OPTIONS.find(option => option.value === rule.min_severity)?.label ?? '']

  if (rule.change_types.length === 1) parts.push(changeLabel(rule.change_types[0]))
  if (rule.change_types.length > 1)
    parts.push(sprintf(__('%d kinds of change'), rule.change_types.length))

  if (rule.scope === 'site') parts.push(__('Site-wide checks'))
  if (rule.scope === 'group') {
    parts.push(groups.find(group => group.id === rule.group_id)?.name ?? __('(missing group)'))
  }

  const channels = [
    ...(rule.emails.length > 0 ? [sprintf(__('%d email'), rule.emails.length)] : []),
    ...(rule.webhook ? [__('Webhooks')] : [])
  ]
  parts.push(channels.join(', '))
  parts.push(rule.mode === 'daily' ? __('Daily digest') : __('Right away'))

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
  const [editingRule, setEditingRule] = useState<null | Partial<AlertRule>>(null)
  const [editingGroup, setEditingGroup] = useState<null | Partial<PageGroup>>(null)

  const postTypeLabel = (name: string) =>
    meta?.post_types.find(type => type.value === name)?.label ?? name

  const onError = (error: Error) => message.error(error.message)

  return (
    <div className="flex flex-col gap-4">
      <Alert
        showIcon
        message={__(
          'Rules send extra alerts on top of the main email alert. To make rules your only alerts, switch off "Turn on email alerts" on the Email alerts tab.'
        )}
        type="info"
      />

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
                  'No rules yet. Example: email the client only when a money page goes noindex.'
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
                  title={__('Delete this rule?')}
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
        extra={<Button onClick={() => setEditingGroup({})}>{__('Add group')}</Button>}
        title={__('Page groups')}
      >
        <List
          dataSource={groups}
          loading={groupsLoading}
          locale={{
            emptyText: (
              <Empty
                description={__(
                  'Group pages so a rule can target them, e.g. all products, or everything under /blog/.'
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
                  title={__('Delete this group?')}
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

import { App, Input, Modal, Select, Tabs } from 'antd'
import { useMemo, useState } from 'react'
import { __, sprintf } from '@common/helpers/i18nWrap'
import { useBulkCreateTargets, usePostSearch } from '@/api/queries'
import { palette } from '@config/theme'
import type { PostSearchResult } from '@/api/types'

interface Props {
  open: boolean
  onClose: () => void
}

/** Buckets search results under their post type, in the order each type first
 *  appears, so e.g. a custom "Movies" type doesn't get lost among pages and
 *  posts when a search term matches several kinds of content at once. */
function groupByPostType(results: PostSearchResult[]) {
  const order: string[] = []
  const byType = new Map<string, PostSearchResult[]>()

  for (const result of results) {
    if (!byType.has(result.type)) {
      order.push(result.type)
      byType.set(result.type, [])
    }
    byType.get(result.type)?.push(result)
  }

  return order.map(type => {
    const items = byType.get(type) ?? []

    return {
      label: items[0]?.post_type_label ?? type,
      options: items.map(item => ({ label: item.title, value: item.post_id }))
    }
  })
}

/** One URL per line, trimmed, blank lines dropped, duplicates collapsed - the
 *  same shape a person gets from pasting a list out of a spreadsheet. */
function parseUrlLines(text: string) {
  return Array.from(new Set(text.split('\n').map(line => line.trim()).filter(Boolean)))
}

export default function AddTargetModal({ open, onClose }: Props) {
  const { message } = App.useApp()
  const [mode, setMode] = useState('post')
  const [term, setTerm] = useState('')
  const [postIds, setPostIds] = useState<number[]>([])
  const [urlsText, setUrlsText] = useState('')

  const { data: results, isFetching } = usePostSearch(term)
  const bulkCreate = useBulkCreateTargets()

  const options = useMemo(() => groupByPostType(results ?? []), [results])
  const urls = useMemo(() => parseUrlLines(urlsText), [urlsText])
  const pendingCount = mode === 'post' ? postIds.length : urls.length

  const reset = () => {
    setTerm('')
    setPostIds([])
    setUrlsText('')
  }

  const submit = () => {
    if (pendingCount === 0) {
      message.warning(mode === 'post' ? __('Pick at least one page to monitor.') : __('Enter at least one URL.'))

      return
    }

    bulkCreate.mutate(mode === 'post' ? { post_ids: postIds } : { urls }, {
      // The backend errors out instead of succeeding when every pick was
      // filtered out, so a successful response always has something to
      // report here.
      onSuccess: response => {
        const parts = [sprintf(__('%d pages added.'), response.created.length)]

        if (response.skipped > 0) {
          parts.push(sprintf(__('%d were already being monitored.'), response.skipped))
        }
        if (response.invalid > 0) {
          parts.push(sprintf(__('%d were not a valid URL on this site.'), response.invalid))
        }

        message.success(parts.join(' '))
        reset()
        onClose()
      },
      onError: error => message.error(error.message)
    })
  }

  return (
    <Modal
      destroyOnClose
      confirmLoading={bulkCreate.isPending}
      okText={pendingCount > 1 ? sprintf(__('Add %d pages'), pendingCount) : __('Add page')}
      open={open}
      title={__('Add a page to monitor')}
      onCancel={onClose}
      onOk={submit}
    >
      <Tabs
        activeKey={mode}
        onChange={setMode}
        items={[
          {
            key: 'post',
            label: __('Pick a page'),
            children: (
              <Select<number[]>
                showSearch
                className="w-full"
                filterOption={false}
                loading={isFetching}
                maxTagCount="responsive"
                mode="multiple"
                notFoundContent={term.length > 1 ? __('No matches') : __('Type to search')}
                placeholder={__('Search your pages, posts and other content')}
                value={postIds}
                onChange={setPostIds}
                onSearch={setTerm}
                options={options}
              />
            )
          },
          {
            key: 'url',
            label: __('Enter a URL'),
            children: (
              <>
                <Input.TextArea
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  placeholder={__('https://example.com/some-page/\nhttps://example.com/another-page/')}
                  value={urlsText}
                  onChange={event => setUrlsText(event.target.value)}
                />
                <p className="mb-0 mt-2 text-xs" style={{ color: palette.inkMuted }}>
                  {__('One URL per line, on this site.')}
                </p>
              </>
            )
          }
        ]}
      />
    </Modal>
  )
}

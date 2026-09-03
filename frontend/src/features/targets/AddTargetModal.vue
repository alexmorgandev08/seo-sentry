<script setup lang="ts">
import { Input, Modal, Select, Tabs, TabPane, message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { __ } from '@common/helpers/i18nWrap'
import { useCreateTarget, usePostSearch } from '@/api/queries'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const mode = ref('post')
const term = ref('')
const postId = ref<number | undefined>()
const url = ref('')

const { data: results, isFetching } = usePostSearch(term)
const createTarget = useCreateTarget()

const options = computed(() =>
  (results.value ?? []).map(result => ({ label: result.title, value: result.post_id }))
)

const notFound = computed(() => (term.value.length > 1 ? __('No matches') : __('Type to search')))

const reset = () => {
  term.value = ''
  postId.value = undefined
  url.value = ''
}

const submit = () => {
  if (mode.value === 'post' && !postId.value) {
    message.warning(__('Pick a page to monitor.'))

    return
  }

  if (mode.value === 'url' && url.value.trim() === '') {
    message.warning(__('Enter a URL on this site.'))

    return
  }

  const payload = mode.value === 'post' ? { post_id: postId.value } : { url: url.value }

  createTarget.mutate(payload, {
    onSuccess: () => {
      message.success(__('Page added. It will be checked on the next run.'))
      reset()
      emit('close')
    },
    onError: error => message.error(error.message)
  })
}
</script>

<template>
  <Modal
    :confirm-loading="createTarget.isPending.value"
    destroy-on-close
    :ok-text="__('Add page')"
    :open="props.open"
    :title="__('Add a page to monitor')"
    @cancel="emit('close')"
    @ok="submit"
  >
    <Tabs v-model:active-key="mode">
      <TabPane key="post" :tab="__('Pick a page')">
        <Select
          v-model:value="postId"
          class="w-full"
          :filter-option="false"
          :loading="isFetching"
          :not-found-content="notFound"
          :options="options"
          :placeholder="__('Search your pages and posts')"
          show-search
          @search="value => (term = value)"
        />
      </TabPane>

      <TabPane key="url" :tab="__('Enter a URL')">
        <Input v-model:value="url" :placeholder="__('https://example.com/some-page/')" />
      </TabPane>
    </Tabs>
  </Modal>
</template>

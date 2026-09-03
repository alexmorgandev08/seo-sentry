<script setup lang="ts">
import {
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Modal,
  Space,
  Tag,
  Timeline,
  TimelineItem,
  TypographyText,
  message
} from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { __ } from '@common/helpers/i18nWrap'
import { useExplainWithAi, useReopenFinding, useResolveFinding, useSettings } from '@/api/queries'
import { changeLabel, eventLabel } from '@components/changeLabels'
import SeverityTag from '@components/SeverityTag.vue'
import When from '@components/When.vue'
import { palette } from '@config/theme'
import type { AiExplanation, Finding } from '@/api/types'

const props = defineProps<{ finding: Finding | null }>()
const emit = defineEmits<{ close: [] }>()

const note = ref('')
const pendingAction = ref<'mute' | 'resolve' | null>(null)
const aiText = ref<AiExplanation | null>(null)

const resolveFinding = useResolveFinding()
const reopenFinding = useReopenFinding()
const explainWithAi = useExplainWithAi()
const { data: settings } = useSettings()

const aiAvailable = computed(() =>
  Boolean(settings.value?.ai_enabled && settings.value?.ai_api_key_set)
)
const isClosed = computed(() => props.finding !== null && props.finding.status !== 'open')

// Each finding carries its own interpretation; clear it when the drawer moves.
watch(
  () => props.finding?.id,
  () => (aiText.value = null)
)

/** null / undefined / '' read as "(empty)"; objects as pretty JSON. */
const isEmptyValue = (value: unknown) => value === null || value === undefined || value === ''

const runExplain = (refresh: boolean) => {
  if (!props.finding) return

  explainWithAi.mutate(
    { id: props.finding.id, refresh },
    {
      onSuccess: result => (aiText.value = result),
      // A failure leaves the written explanation above untouched.
      onError: error => message.error(error.message)
    }
  )
}

const reopen = () => {
  if (!props.finding) return

  reopenFinding.mutate(props.finding.id, {
    onSuccess: () => message.success(__('Reopened.'))
  })
}

const confirm = () => {
  if (!props.finding || !pendingAction.value) return

  if (note.value.trim() === '') {
    message.warning(__('Please add a short note explaining why.'))

    return
  }

  const action = pendingAction.value

  resolveFinding.mutate(
    { id: props.finding.id, note: note.value, action },
    {
      onSuccess: () => {
        message.success(action === 'mute' ? __('Muted.') : __('Marked resolved.'))
        note.value = ''
        pendingAction.value = null
        emit('close')
      },
      onError: error => message.error(error.message)
    }
  )
}
</script>

<template>
  <template v-if="finding">
    <Drawer open :root-class-name="'scm-drawer'" :width="620" @close="emit('close')">
      <!--
        The drawer portals to <body> at z-index 1000, under wp-admin's own
        toolbar; scm-drawer offsets it so the header stays clickable.
      -->
      <template #title>
        <span class="flex items-center gap-2">
          <SeverityTag :severity="finding.severity" />
          {{ changeLabel(finding.change_type) }}
        </span>
      </template>

      <template #extra>
        <Button v-if="isClosed" size="small" @click="reopen">{{ __('Reopen') }}</Button>
        <Space v-else>
          <Button size="small" @click="pendingAction = 'mute'">{{ __('Mute') }}</Button>
          <Button size="small" type="primary" @click="pendingAction = 'resolve'">
            {{ __('Resolve') }}
          </Button>
        </Space>
      </template>

      <div class="flex flex-col gap-4">
        <div class="text-sm" :style="{ color: palette.inkMuted }">
          <a v-if="finding.target_url" :href="finding.target_url" rel="noreferrer" target="_blank">
            {{ finding.target_label ?? finding.target_url }}
          </a>
          <span v-else>{{ __('Site-wide') }}</span>
          <span class="mx-2">·</span>
          <When :value="finding.created_at" />
          <Tag v-if="finding.is_expected" :bordered="false" class="ml-2" color="default">
            {{ __('you edited this page') }}
          </Tag>
        </div>

        <Card size="small" :title="__('What changed')">
          <div class="mb-4">
            <div
              class="mb-1.5 text-xs font-semibold uppercase tracking-wide"
              :style="{ color: palette.inkFaint }"
            >
              {{ __('Before') }}
            </div>
            <span
              v-if="isEmptyValue(finding.before)"
              class="italic"
              :style="{ color: palette.inkFaint }"
            >
              {{ __('(empty)') }}
            </span>
            <pre v-else-if="typeof finding.before === 'object'" class="scm-code max-h-48">{{
              JSON.stringify(finding.before, null, 2)
            }}</pre>
            <span v-else class="break-all text-sm">{{ String(finding.before) }}</span>
          </div>
          <div>
            <div
              class="mb-1.5 text-xs font-semibold uppercase tracking-wide"
              :style="{ color: palette.inkFaint }"
            >
              {{ __('After') }}
            </div>
            <span
              v-if="isEmptyValue(finding.after)"
              class="italic"
              :style="{ color: palette.inkFaint }"
            >
              {{ __('(empty)') }}
            </span>
            <pre v-else-if="typeof finding.after === 'object'" class="scm-code max-h-48">{{
              JSON.stringify(finding.after, null, 2)
            }}</pre>
            <span v-else class="break-all text-sm">{{ String(finding.after) }}</span>
          </div>
        </Card>

        <Card size="small" :title="__('What this means')">
          <div class="flex flex-col gap-3 text-sm">
            <div>
              <TypographyText strong>{{ __('What happened') }}</TypographyText>
              <p class="mb-0 mt-1">{{ finding.explanation.what }}</p>
            </div>
            <div>
              <TypographyText strong>{{ __('Why it matters') }}</TypographyText>
              <p class="mb-0 mt-1">{{ finding.explanation.why }}</p>
            </div>
            <div>
              <TypographyText strong>{{ __('What to check') }}</TypographyText>
              <p class="mb-0 mt-1">{{ finding.explanation.check }}</p>
            </div>
          </div>
        </Card>

        <Card v-if="aiAvailable" size="small" :title="__('AI interpretation')">
          <template #extra>
            <Button
              :loading="explainWithAi.isPending.value"
              size="small"
              @click="runExplain(Boolean(aiText))"
            >
              {{ aiText ? __('Regenerate') : __('Explain this') }}
            </Button>
          </template>

          <template v-if="aiText">
            <p class="m-0 text-sm">{{ aiText.text }}</p>
            <p class="mb-0 mt-2 text-xs" :style="{ color: palette.inkFaint }">
              {{ __('Written by') }} {{ aiText.model }}
              {{ aiText.cached ? ` · ${__('cached, no new API call')}` : '' }} ·
              {{ __('an interpretation of the values above, not a measurement') }}
            </p>
          </template>
          <p v-else class="m-0 text-sm" :style="{ color: palette.inkMuted }">
            {{
              __(
                'Ask your AI provider to interpret this specific change. Only the values above and the site events are sent, never your page content.'
              )
            }}
          </p>
        </Card>

        <Card size="small" :title="__('Site events just before this change')">
          <Empty
            v-if="finding.attributed_events.length === 0"
            :description="__('Nothing happened on the site in the window before this change.')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
          <template v-else>
            <TypographyText class="mb-3 block text-xs" type="secondary">
              {{
                __('These happened shortly before. They may be related, but we cannot be certain.')
              }}
            </TypographyText>
            <Timeline>
              <TimelineItem v-for="(event, i) in finding.attributed_events" :key="i">
                <span class="text-sm">
                  <strong>{{ eventLabel(event.type) }}</strong> {{ event.subject }}
                  <When class-name="ml-2" :value="event.at" />
                </span>
              </TimelineItem>
            </Timeline>
          </template>
        </Card>

        <Card v-if="finding.note" size="small" :title="__('Note')">
          <p class="mb-0 text-sm">{{ finding.note }}</p>
        </Card>
      </div>
    </Drawer>

    <Modal
      :confirm-loading="resolveFinding.isPending.value"
      :ok-text="pendingAction === 'mute' ? __('Mute') : __('Resolve')"
      :open="pendingAction !== null"
      :title="pendingAction === 'mute' ? __('Mute this finding') : __('Mark as resolved')"
      @cancel="pendingAction = null"
      @ok="confirm"
    >
      <Input.TextArea
        v-model:value="note"
        :placeholder="__('Why is this expected? e.g. we changed the canonical on purpose.')"
        :rows="3"
      />
    </Modal>
  </template>
</template>

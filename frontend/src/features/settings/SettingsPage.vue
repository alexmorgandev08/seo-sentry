<script setup lang="ts">
import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  message
} from 'ant-design-vue'
import { reactive, watch } from 'vue'
import { __ } from '@common/helpers/i18nWrap'
import { usePreviewReport, useSendReport, useSettings, useUpdateSettings } from '@/api/queries'
import PageHeader from '@components/PageHeader.vue'
import { palette } from '@config/theme'
import type { Settings } from '@/api/types'

const { data: settings, isLoading } = useSettings()
const updateSettings = useUpdateSettings()
const sendReport = useSendReport()
const previewReport = usePreviewReport()

/*
 * A reactive draft rather than antd's Form.useForm(): ant-design-vue drives
 * fields with v-model, so the form state is plain reactive data that the
 * loaded settings are copied into once they arrive.
 */
const draft = reactive<Partial<Settings>>({})

watch(settings, loaded => loaded && Object.assign(draft, loaded), { immediate: true })

const FREQUENCY = [
  { label: __('Every hour'), value: 'hourly' },
  { label: __('Twice a day'), value: 'twicedaily' },
  { label: __('Once a day'), value: 'daily' },
  { label: __('Off (only when I click Check now)'), value: 'off' }
]

const THRESHOLD = [
  { label: __('Critical changes only'), value: 'critical' },
  { label: __('Critical and warnings'), value: 'warning' },
  { label: __('Everything, including info'), value: 'info' }
]

const submit = () =>
  updateSettings.mutate(
    { ...draft },
    {
      onSuccess: () => message.success(__('Settings saved.')),
      onError: error => message.error(error.message)
    }
  )

const sendNow = () =>
  sendReport.mutate(undefined, {
    onSuccess: () => message.success(__('Report sent.')),
    onError: error => message.error(error.message)
  })

/** Opens the rendered report in a new tab so the branding can be checked. */
const preview = () =>
  previewReport.mutate(undefined, {
    onSuccess: data => {
      const tab = window.open('', '_blank')
      if (!tab) {
        message.warning(__('Allow pop-ups to see the preview.'))

        return
      }

      tab.document.write(data.html)
      tab.document.close()
    },
    onError: error => message.error(error.message)
  })
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <PageHeader :title="__('Settings')" />

    <!--
      Spacing lives on this container, not on the cards: antd's cssinjs runs at
      high hash priority, so a margin utility on .ant-card loses to its reset.
    -->
    <Form class="flex flex-col gap-4" :disabled="isLoading" layout="vertical">
      <Card :title="__('Checking')">
        <FormItem
          class="mb-5"
          :extra="
            __(
              'Checks also run automatically about 90 seconds after any plugin, theme or core update.'
            )
          "
          :label="__('How often to check')"
        >
          <Select v-model:value="draft.frequency" :options="FREQUENCY" />
        </FormItem>

        <FormItem
          class="mb-0"
          :extra="__('0 keeps everything forever. Unresolved critical findings are never deleted.')"
          :label="__('Keep history for (days)')"
        >
          <InputNumber v-model:value="draft.retention_days" class="w-40" :max="3650" :min="0" />
        </FormItem>
      </Card>

      <Card :title="__('Email alerts')">
        <FormItem class="mb-5" :label="__('Email me about changes')">
          <Switch v-model:checked="draft.email_enabled" />
        </FormItem>

        <FormItem class="mb-5" :label="__('Only email me about')">
          <Select v-model:value="draft.email_threshold" :options="THRESHOLD" />
        </FormItem>

        <FormItem
          class="mb-0"
          :extra="__('Leave empty to use the site admin email.')"
          :label="__('Send to')"
        >
          <Input
            v-model:value="draft.email_recipient"
            :placeholder="__('you@example.com')"
            type="email"
          />
        </FormItem>
      </Card>

      <Card :title="__('Weekly client report')">
        <template #extra>
          <Space>
            <Button
              :disabled="isLoading"
              :loading="previewReport.isPending.value"
              size="small"
              @click="preview"
            >
              {{ __('Preview') }}
            </Button>
            <Button
              :disabled="isLoading"
              :loading="sendReport.isPending.value"
              size="small"
              @click="sendNow"
            >
              {{ __('Send now') }}
            </Button>
          </Space>
        </template>

        <FormItem
          class="mb-5"
          :extra="__('Sent every Monday morning. Your branding, not ours.')"
          :label="__('Email a weekly summary')"
        >
          <Switch v-model:checked="draft.report_enabled" />
        </FormItem>

        <FormItem
          class="mb-5"
          :extra="__('Comma-separated. These addresses receive the report.')"
          :label="__('Send to')"
        >
          <Input
            v-model:value="draft.report_recipients"
            :placeholder="__('client@example.com, you@agency.com')"
          />
        </FormItem>

        <div class="flex gap-3">
          <FormItem class="mb-5 flex-1" :label="__('Your business name')">
            <Input
              v-model:value="draft.report_brand_name"
              :placeholder="__('Shown in place of the plugin name')"
            />
          </FormItem>
          <FormItem class="mb-5 w-32" :label="__('Accent colour')">
            <Input v-model:value="draft.report_brand_color" placeholder="#1d4ed8" />
          </FormItem>
        </div>

        <FormItem class="mb-5" :label="__('Logo URL')">
          <Input v-model:value="draft.report_logo_url" placeholder="https://example.com/logo.png" />
        </FormItem>

        <FormItem
          class="mb-0"
          :extra="__('Replaces the default line at the bottom of the report.')"
          :label="__('Footer text')"
        >
          <Input v-model:value="draft.report_footer" :placeholder="__('Prepared by Your Agency')" />
        </FormItem>
      </Card>

      <Card :title="__('AI crawlers')">
        <FormItem
          class="mb-0"
          :extra="
            __(
              'Notes the date each known AI crawler last visited. Full-page caching can hide some visits.'
            )
          "
          :label="__('Record when AI crawlers visit')"
        >
          <Switch v-model:checked="draft.bot_tracking" />
        </FormItem>
      </Card>

      <div
        class="flex items-center gap-3 rounded-lg border border-solid px-5 py-4"
        :style="{ background: palette.surface, borderColor: palette.line }"
      >
        <Button :loading="updateSettings.isPending.value" type="primary" @click="submit">
          {{ __('Save settings') }}
        </Button>
        <span class="text-xs" :style="{ color: palette.inkMuted }">
          {{ __('Changes take effect on the next check.') }}
        </span>
      </div>
    </Form>
  </div>
</template>

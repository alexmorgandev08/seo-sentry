<script setup lang="ts">
import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  Switch,
  message
} from 'ant-design-vue'
import { computed, reactive, watch } from 'vue'
import { __ } from '@common/helpers/i18nWrap'
import {
  useAiUsage,
  useSettings,
  useTestSlack,
  useTestWebhook,
  useUpdateSettings
} from '@/api/queries'
import PageHeader from '@components/PageHeader.vue'
import { palette } from '@config/theme'
import type { Settings } from '@/api/types'

const { data: settings, isLoading } = useSettings()
const updateSettings = useUpdateSettings()
const testWebhook = useTestWebhook()
const testSlack = useTestSlack()

const draft = reactive<Partial<Settings>>({})

/*
 * The API stores endpoints as an array but the field is a textarea, so the
 * draft keeps the raw text and only splits it on save.
 */
const webhookText = reactive({ value: '' })

watch(
  settings,
  loaded => {
    if (!loaded) return

    Object.assign(draft, loaded)
    webhookText.value = Array.isArray(loaded.webhook_urls)
      ? loaded.webhook_urls.join('\n')
      : String(loaded.webhook_urls ?? '')
  },
  { immediate: true }
)

const aiEnabled = computed(() => Boolean(draft.ai_enabled))
const { data: aiUsage } = useAiUsage(aiEnabled)

const THRESHOLD = [
  { label: __('Critical changes only'), value: 'critical' },
  { label: __('Critical and warnings'), value: 'warning' },
  { label: __('Everything, including info'), value: 'info' }
]

const PROVIDERS = [
  { label: 'Anthropic (Claude)', value: 'anthropic' },
  { label: 'OpenAI', value: 'openai' }
]

const modelPlaceholder = computed(() =>
  draft.ai_provider === 'openai' ? 'gpt-4o-mini' : 'claude-haiku-4-5'
)

const webhookUrls = () =>
  webhookText.value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

const submit = () =>
  updateSettings.mutate(
    { ...draft, webhook_urls: webhookUrls() },
    {
      onSuccess: () => message.success(__('Integrations saved.')),
      onError: error => message.error(error.message)
    }
  )

/** Tests the first endpoint currently in the field, saved or not. */
const sendWebhookTest = () => {
  const first = webhookUrls()[0] ?? ''

  if (first === '') {
    message.warning(__('Add an endpoint URL first.'))

    return
  }

  testWebhook.mutate(first, {
    onSuccess: () => message.success(__('Your endpoint accepted the test delivery.')),
    onError: error => message.error(error.message)
  })
}

const sendSlackTest = () => {
  const url = String(draft.slack_webhook_url ?? '').trim()

  if (url === '') {
    message.warning(__('Add your Slack webhook URL first.'))

    return
  }

  testSlack.mutate(url, {
    onSuccess: () => message.success(__('Posted to Slack.')),
    onError: error => message.error(error.message)
  })
}
</script>

<template>
  <!--
    Everything that connects to a service outside this site. Each card needs a
    URL or key the user brings from elsewhere, which is what separates these
    from the built-in email alerts on the Settings page.
  -->
  <div class="mx-auto max-w-2xl">
    <PageHeader :title="__('Integrations')" />

    <Form class="flex flex-col gap-4" :disabled="isLoading" layout="vertical">
      <Card :title="__('Webhooks')">
        <template #extra>
          <Button
            :disabled="isLoading"
            :loading="testWebhook.isPending.value"
            size="small"
            @click="sendWebhookTest"
          >
            {{ __('Send test') }}
          </Button>
        </template>

        <FormItem
          class="mb-5"
          :extra="
            __(
              'Posts each check result as JSON to your own endpoints, so you can pipe findings anywhere.'
            )
          "
          :label="__('Send results to a webhook')"
        >
          <Switch v-model:checked="draft.webhook_enabled" />
        </FormItem>

        <FormItem
          class="mb-5"
          :extra="__('One URL per line, up to 10.')"
          :label="__('Endpoint URLs')"
        >
          <Input.TextArea
            v-model:value="webhookText.value"
            placeholder="https://example.com/hooks/seo"
            :rows="3"
          />
        </FormItem>

        <FormItem class="mb-5" :label="__('Only send')">
          <Select v-model:value="draft.webhook_threshold" :options="THRESHOLD" />
        </FormItem>

        <FormItem
          class="mb-0"
          :extra="
            __(
              'Optional. When set, each request carries an X-SEO-Monitor-Signature header so your endpoint can verify it came from this site.'
            )
          "
          :label="__('Signing secret')"
        >
          <Input.Password
            v-model:value="draft.webhook_secret"
            autocomplete="off"
            :placeholder="__('Leave empty for no signature')"
          />
        </FormItem>
      </Card>

      <Card :title="__('Slack')">
        <template #extra>
          <Button
            :disabled="isLoading"
            :loading="testSlack.isPending.value"
            size="small"
            @click="sendSlackTest"
          >
            {{ __('Send test') }}
          </Button>
        </template>

        <FormItem class="mb-5" :label="__('Post results to Slack')">
          <Switch v-model:checked="draft.slack_enabled" />
        </FormItem>

        <FormItem
          class="mb-5"
          :extra="__('Create an incoming webhook in Slack and paste its URL here.')"
          :label="__('Incoming webhook URL')"
        >
          <Input
            v-model:value="draft.slack_webhook_url"
            placeholder="https://hooks.slack.com/services/…"
          />
        </FormItem>

        <FormItem class="mb-0" :label="__('Only post')">
          <Select v-model:value="draft.slack_threshold" :options="THRESHOLD" />
        </FormItem>
      </Card>

      <Card :title="__('AI explanations')">
        <template v-if="aiUsage?.usage" #extra>
          <span class="text-xs" :style="{ color: palette.inkMuted }">
            {{ aiUsage.usage.calls }} {{ __('this month') }} · ~${{ aiUsage.usage.cost.toFixed(2) }}
          </span>
        </template>

        <p class="mb-4 text-sm" :style="{ color: palette.inkMuted }">
          {{
            __(
              'Uses your own API key to interpret a specific change on demand. Nothing is sent unless you click "Explain this" on a finding, and only the change values travel, never your page content.'
            )
          }}
        </p>

        <FormItem class="mb-5" :label="__('Enable AI explanations')">
          <Switch v-model:checked="draft.ai_enabled" />
        </FormItem>

        <FormItem class="mb-5" :label="__('Provider')">
          <Select v-model:value="draft.ai_provider" :options="PROVIDERS" />
        </FormItem>

        <FormItem
          class="mb-5"
          :extra="
            settings?.ai_api_key_set
              ? __('A key is saved. Leave blank to keep it, or paste a new one to replace it.')
              : __('Your key is stored in your own database and never sent to us.')
          "
          :label="__('API key')"
        >
          <Input.Password
            v-model:value="draft.ai_api_key"
            autocomplete="off"
            :placeholder="settings?.ai_api_key_set ? '••••••••' : 'sk-…'"
          />
        </FormItem>

        <FormItem
          class="mb-5"
          :extra="__('Leave blank to use the cheapest model for the chosen provider.')"
          :label="__('Model')"
        >
          <Input v-model:value="draft.ai_model" :placeholder="modelPlaceholder" />
        </FormItem>

        <FormItem
          class="mb-0"
          :extra="
            __(
              `Explanations stop once this month's estimated spend reaches the cap. 0 means no cap.`
            )
          "
          :label="__('Monthly spending cap (USD)')"
        >
          <InputNumber
            v-model:value="draft.ai_monthly_cap"
            class="w-40"
            :max="1000"
            :min="0"
            :step="1"
          />
        </FormItem>
      </Card>

      <div
        class="flex items-center gap-3 rounded-lg border border-solid px-5 py-4"
        :style="{ background: palette.surface, borderColor: palette.line }"
      >
        <Button :loading="updateSettings.isPending.value" type="primary" @click="submit">
          {{ __('Save integrations') }}
        </Button>
        <span class="text-xs" :style="{ color: palette.inkMuted }">
          {{ __('Each service is off until you switch it on.') }}
        </span>
      </div>
    </Form>
  </div>
</template>

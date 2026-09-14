type GetServerVariableType = <K extends keyof typeof SERVER_VARIABLES>(
  key: K,
  fallback?: (typeof SERVER_VARIABLES)[K]
) => (typeof SERVER_VARIABLES)[K]

const getServerVariable: GetServerVariableType = (key, fallback) => {
  if (!key && fallback) return fallback
  if (!(key in SERVER_VARIABLES) || !SERVER_VARIABLES?.[key]) {
    if (import.meta.env.MODE !== 'test') {
      console.error('🚥 Missing server variable:', key)
    }

    if (fallback) return fallback
  }

  return SERVER_VARIABLES[key]
}

interface ConfigType {
  AJAX_URL: string
  API_URL: { base: string; separator: string }
  DATE_FORMAT: string
  FREE_VERSION: string
  IS_DEV: boolean
  IS_PRO: boolean
  IS_PRO_EXIST: boolean
  NONCE: string
  PLUGIN_ADMIN_URL: string
  PLUGIN_SLUG: string
  PRO_SLUG?: string
  PRO_VERSION?: string
  PRODUCT_NAME: string
  REDIRECT_URI: string
  REST_NONCE: string
  ROOT_URL: string
  ROUTE_PREFIX: string
  SITE_BASE_URL: string
  SITE_URL: string
  TIME_FORMAT: string
}

const config = {
  /*
   * Deliberately no fallback: a guessed path is wrong on a relocated wp-admin,
   * and with plain permalinks the REST root is a query argument. PHP resolves
   * both and passes them through wp_localize_script, which always runs here.
   */
  AJAX_URL: getServerVariable('ajaxURL'),
  API_URL: getServerVariable('apiURL'),
  DATE_FORMAT: getServerVariable('dateFormat', 'F j, Y'),
  FREE_VERSION: getServerVariable('version'),
  IS_DEV: import.meta.env.DEV,
  IS_PRO: SERVER_VARIABLES?.isSeoChangeMonitorPro === '1',
  IS_PRO_EXIST: getServerVariable('isSeoChangeMonitorProExist', '0') === '1',
  NONCE: getServerVariable('nonce', ''),
  PLUGIN_ADMIN_URL: getServerVariable('pluginAdminURL'),
  PLUGIN_SLUG: getServerVariable('pluginSlug', 'seo-sentry'),
  PRO_SLUG: getServerVariable('proSlug'),
  PRO_VERSION: getServerVariable('proPluginVersion'),
  PRODUCT_NAME: 'seo-sentry',
  REDIRECT_URI: getServerVariable('redirectUri'),
  REST_NONCE: getServerVariable('restNonce', ''),
  ROOT_URL: getServerVariable('rootURL', '/'),
  ROUTE_PREFIX: getServerVariable('routePrefix', 'SEO_CHANGE_MONITOR_'),
  SITE_BASE_URL: getServerVariable('siteBaseURL'),
  SITE_URL: getServerVariable('siteURL'),
  TIME_FORMAT: getServerVariable('timeFormat', 'g:i a')
} as const satisfies ConfigType

export default config

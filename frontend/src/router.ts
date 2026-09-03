import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardPage from '@features/dashboard/DashboardPage.vue'
import FlightLogPage from '@features/flightLog/FlightLogPage.vue'
import IntegrationsPage from '@features/integrations/IntegrationsPage.vue'
import SettingsPage from '@features/settings/SettingsPage.vue'
import SiteWidePage from '@features/siteWide/SiteWidePage.vue'
import TargetsPage from '@features/targets/TargetsPage.vue'

/*
 * Hash history: the plugin lives on one wp-admin page, so every route has to
 * stay in the fragment or WordPress would try to resolve it server-side.
 *
 * Static imports, not lazy ones: the plugin enqueues a single main-*.js and
 * the production base is relative, so dynamically imported chunks would be
 * requested against /wp-admin/ and 404.
 */
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: DashboardPage },
    { path: '/pages', component: TargetsPage },
    { path: '/log', component: FlightLogPage },
    { path: '/site', component: SiteWidePage },
    { path: '/integrations', component: IntegrationsPage },
    { path: '/settings', component: SettingsPage }
  ]
})

import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import Terminal from '../components/Terminal.vue'
import SiteManager from '../components/SiteManager.vue'
import '../style.less'

// Import PrimeVue icons and PrimeFlex
// Import PrimeIcons directly - Vite will handle the font paths
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

// Add dark mode class BEFORE PrimeVue initialization
// PrimeVue needs to see this class when generating CSS variables
document.documentElement.classList.add('p-dark')

// Create app for Terminal (PrimeVue needed for Settings Drawer)
const terminalApp = createApp(Terminal)
terminalApp.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.p-dark',
      cssLayer: false
    }
  }
})
terminalApp.directive('tooltip', Tooltip)
terminalApp.mount('#app')

// Create app for SiteManager with PrimeVue
const siteManagerApp = createApp(SiteManager)

// Configure PrimeVue with Aura theme (dark mode)
// According to PrimeVue docs: https://primevue.org/theming/styled/
// Use class selector for toggleable dark mode instead of 'system'
siteManagerApp.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.p-dark',
      cssLayer: false
    }
  }
})

// Register Tooltip directive globally
import Tooltip from 'primevue/tooltip'
siteManagerApp.directive('tooltip', Tooltip)

// Mount SiteManager
siteManagerApp.mount('#appRoot')

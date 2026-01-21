import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import SiteManager from '../components/SiteManager.vue'

// Import PrimeVue icons and PrimeFlex
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

// Create and configure Vue app with PrimeVue
const app = createApp(SiteManager)

// Configure PrimeVue with Aura theme (dark mode)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark-mode, [data-theme="dark"]',
      cssLayer: false
    }
  }
})

// Add dark mode class to body/html
document.documentElement.classList.add('dark-mode')

// Mount the site manager component
app.mount('#appRoot')

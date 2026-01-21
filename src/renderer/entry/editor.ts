import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import Editor from '../components/Editor.vue'
import '../style.less'

// Mount the editor component
// PrimeVue icons + PrimeFlex utilities
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

// Enable PrimeVue dark mode for this window
document.documentElement.classList.add('p-dark')

const app = createApp(Editor)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.p-dark',
      cssLayer: false
    }
  }
})

app.mount('#editor')

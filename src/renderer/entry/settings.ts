import { createApp } from 'vue'
import Settings from '../components/Settings.vue'
import '../style.less'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Mount the settings component
createApp(Settings).mount('#settings')

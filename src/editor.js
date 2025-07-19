import { createApp } from 'vue';
import Editor from './components/Editor.vue';
import './style.css';

const app = createApp(Editor);
app.mount('#editor');

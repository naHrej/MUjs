import { createApp } from 'vue';
import SiteManager from './components/SiteManager.vue';
import Terminal from './components/Terminal.vue';
import './style.css';

console.log('Main.js loading...');
console.log('Window.store available:', !!window.store);
console.log('Window.api available:', !!window.api);

// Determine which component to mount based on the page
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

console.log('Current page:', currentPage);

let AppComponent;
let mountTarget;

switch (currentPage) {
  case 'index.html':
  default:
    // Main page with site manager and terminal
    AppComponent = {
      components: {
        SiteManager,
        Terminal,
      },
      template: `
        <div>
          <SiteManager />
          <Terminal />
        </div>
      `,
    };
    mountTarget = '#appRoot';
    break;
}

const app = createApp(AppComponent);
console.log('Mounting Vue app to:', mountTarget);

const appRoot = document.getElementById('appRoot');
console.log('AppRoot element found:', !!appRoot);

if (appRoot) {
  try {
    app.mount(mountTarget);
    console.log('Vue app mounted successfully');
  } catch (error) {
    console.error('Vue mount error:', error);
  }
} else {
  console.error('AppRoot element not found!');
}

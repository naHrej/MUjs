<template>
  <div class="container">
    <h1>Settings</h1>
    
    <div class="row">
      <div class="col-12">
        <h3>Font Settings</h3>
        <div class="mb-3">
          <label for="fontFamily" class="form-label">Font Family</label>
          <select 
            id="fontFamily" 
            class="form-select" 
            v-model="fontFamily"
            @change="saveSettings"
          >
            <option v-for="font in fonts" :key="font" :value="font">
              {{ font }}
            </option>
          </select>
        </div>
        
        <div class="mb-3">
          <label for="fontSize" class="form-label">Font Size</label>
          <input 
            type="number" 
            id="fontSize" 
            class="form-control" 
            v-model.number="fontSize"
            @change="saveSettings"
          />
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <h3>Connection Settings</h3>
        <div class="form-check">
          <input 
            class="form-check-input" 
            type="checkbox" 
            id="ansiEnabled" 
            v-model="ansiEnabled"
            @change="saveSettings"
          />
          <label class="form-check-label" for="ansiEnabled">
            ANSI Enabled
          </label>
        </div>
        
        <div class="form-check">
          <input 
            class="form-check-input" 
            type="checkbox" 
            id="htmlEnabled" 
            v-model="htmlEnabled"
            @change="saveSettings"
          />
          <label class="form-check-label" for="htmlEnabled">
            HTML Enabled
          </label>
        </div>
        
        <div class="form-check">
          <input 
            class="form-check-input" 
            type="checkbox" 
            id="connectOnStartup" 
            v-model="connectOnStartup"
            @change="saveSettings"
          />
          <label class="form-check-label" for="connectOnStartup">
            Connect on Startup
          </label>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <h3>File Watcher</h3>
        <form @submit.prevent="updateWatchPath">
          <div class="mb-3">
            <label for="watchPath" class="form-label">
              Watch Path: {{ watchPath }}
            </label>
            &nbsp;
            <button type="button" class="btn btn-primary" @click="updateWatchPath">
              Folder Select
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <h3>Timers</h3>
        <button @click="addTimer" class="btn btn-success mb-3">
          <i class="fas fa-plus"></i>&nbsp;Add Timer
        </button>
        
        <div v-for="(timer, index) in timers" :key="index" class="card mb-2">
          <div class="card-body">
            <div class="row">
              <div class="col-md-3">
                <label :for="`timer-name-${index}`" class="form-label">Name</label>
                <input 
                  :id="`timer-name-${index}`"
                  type="text" 
                  class="form-control" 
                  v-model="timer.name"
                  @change="saveTimer(index)"
                />
              </div>
              <div class="col-md-3">
                <label :for="`timer-interval-${index}`" class="form-label">
                  Interval (ms)
                </label>
                <input 
                  :id="`timer-interval-${index}`"
                  type="number" 
                  class="form-control" 
                  v-model.number="timer.interval"
                  @change="saveTimer(index)"
                />
              </div>
              <div class="col-md-3">
                <label :for="`timer-send-${index}`" class="form-label">Send</label>
                <input 
                  :id="`timer-send-${index}`"
                  type="text" 
                  class="form-control" 
                  v-model="timer.send"
                  @change="saveTimer(index)"
                />
              </div>
              <div class="col-md-2">
                <div class="form-check mt-4">
                  <input 
                    :id="`timer-enabled-${index}`"
                    class="form-check-input" 
                    type="checkbox" 
                    v-model="timer.enabled"
                    @change="saveTimer(index)"
                  />
                  <label :for="`timer-enabled-${index}`" class="form-check-label">
                    Enabled
                  </label>
                </div>
              </div>
              <div class="col-md-1">
                <button 
                  @click="deleteTimer(index)" 
                  class="btn btn-danger mt-4"
                  title="Delete Timer"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <h3>Authentication</h3>
        <div class="mb-3">
          <label for="authString" class="form-label">Auth String</label>
          <input 
            type="text" 
            id="authString" 
            class="form-control" 
            v-model="authString"
            @change="saveSettings"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import 'bootstrap/dist/css/bootstrap.min.css';

export default {
  name: 'Settings',
  setup() {
    const fontFamily = ref('');
    const fontSize = ref(14);
    const fonts = ref([]);
    const timers = ref([]);
    const watchPath = ref('');
    const authString = ref('');
    const connectOnStartup = ref(false);
    const ansiEnabled = ref(false);
    const htmlEnabled = ref(false);

    const loadSettings = async () => {
      watchPath.value = await window.store.get('watchPath') || '';
      ansiEnabled.value = await window.store.get('settings.ansiEnabled') || false;
      htmlEnabled.value = await window.store.get('settings.htmlEnabled') || false;
      fontFamily.value = await window.store.get('settings.fontFamily') || '';
      fontSize.value = await window.store.get('settings.fontSize') || 14;
      authString.value = await window.store.get('settings.authString') || '';
      connectOnStartup.value = await window.store.get('settings.connectOnStartup') || false;
      
      const storedTimers = await window.store.get('timers') || {};
      timers.value = Object.values(storedTimers);
      
      // Load fonts
      try {
        fonts.value = await window.api.getFonts();
      } catch (error) {
        console.error('Failed to load fonts:', error);
        fonts.value = ['Arial', 'Consolas', 'Courier New', 'monospace'];
      }
    };

    const saveSettings = async () => {
      await window.store.set('settings.fontFamily', fontFamily.value);
      await window.store.set('settings.fontSize', fontSize.value);
      await window.store.set('settings.ansiEnabled', ansiEnabled.value);
      await window.store.set('settings.htmlEnabled', htmlEnabled.value);
      await window.store.set('settings.authString', authString.value);
      await window.store.set('settings.connectOnStartup', connectOnStartup.value);
      
      // Notify other windows of settings update
      window.api.send('settings-updated');
    };

    const saveTimer = async (index) => {
      const timer = timers.value[index];
      if (timer) {
        await window.store.set(`timers.timer${index + 1}`, timer);
      }
    };

    const addTimer = () => {
      timers.value.push({
        name: `Timer ${timers.value.length + 1}`,
        interval: 60000,
        enabled: false,
        send: 'idle',
      });
      saveTimer(timers.value.length - 1);
    };

    const deleteTimer = async (index) => {
      if (confirm('Are you sure you want to delete this timer?')) {
        timers.value.splice(index, 1);
        
        // Rebuild timers object and save
        const timersObj = {};
        timers.value.forEach((timer, i) => {
          timersObj[`timer${i + 1}`] = timer;
        });
        await window.store.set('timers', timersObj);
      }
    };

    const updateWatchPath = async () => {
      try {
        const selectedPath = await window.api.invoke('dialog:openDirectory');
        if (selectedPath) {
          watchPath.value = selectedPath;
          await window.store.set('watchPath', selectedPath);
        }
      } catch (error) {
        console.error('Failed to select directory:', error);
      }
    };

    onMounted(() => {
      loadSettings();
    });

    return {
      fontFamily,
      fontSize,
      fonts,
      timers,
      watchPath,
      authString,
      connectOnStartup,
      ansiEnabled,
      htmlEnabled,
      saveSettings,
      saveTimer,
      addTimer,
      deleteTimer,
      updateWatchPath,
    };
  },
};
</script>

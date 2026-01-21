<template>
  <div class="mujs-settings">
    <div class="mujs-settings-header">
      <span class="mujs-settings-title">Settings</span>
      <Button icon="pi pi-times" text rounded aria-label="Close" @click="$emit('close')" />
    </div>

    <Accordion :multiple="true" :activeIndex="[0]" class="mujs-settings-accordion">
      <AccordionTab header="World Options">
        <div class="mujs-form">
          <div class="mujs-row">
            <label class="mujs-label">ANSI Support</label>
            <ToggleSwitch v-model="ansiEnabled" />
          </div>
          <div class="mujs-row">
            <label class="mujs-label">HTML Support</label>
            <ToggleSwitch v-model="htmlEnabled" />
          </div>
          <div class="mujs-row">
            <label class="mujs-label">Connect On Startup</label>
            <ToggleSwitch v-model="connectOnStartup" />
          </div>
          <div class="mujs-row">
            <label class="mujs-label">Auth String</label>
            <InputText v-model="authString" class="w-full" placeholder="Optional auth/login string" />
          </div>
          <div class="mujs-actions">
            <Button icon="pi pi-save" severity="primary" rounded v-tooltip.bottom="'Save'" aria-label="Save" @click="saveSettings" />
          </div>
        </div>
      </AccordionTab>

      <AccordionTab header="Timers">
        <div class="mujs-timers">
          <Card
            v-for="(timer, key) in timers"
            :key="key"
            class="mujs-timer"
          >
            <template #content>
              <div class="mujs-timer-grid">
                <div class="mujs-field">
                  <label class="mujs-label">Name</label>
                  <InputText v-model="timer.name" />
                </div>
                <div class="mujs-field">
                  <label class="mujs-label">Interval (ms)</label>
                  <InputNumber v-model="timer.interval" :min="1000" :step="1000" />
                </div>
                <div class="mujs-field">
                  <label class="mujs-label">Send</label>
                  <InputText v-model="timer.send" class="w-full" />
                </div>
                <div class="mujs-field mujs-toggle">
                  <label class="mujs-label">Enabled</label>
                  <ToggleSwitch v-model="timer.enabled" />
                </div>
              </div>
              <div class="mujs-timer-actions">
                <Button icon="pi pi-check" severity="secondary" text rounded v-tooltip.bottom="'Save timer'" aria-label="Save timer" @click="saveTimer(key)" />
                <Button icon="pi pi-trash" severity="danger" text rounded v-tooltip.bottom="'Delete timer'" aria-label="Delete timer" @click="deleteTimer(key)" />
              </div>
            </template>
          </Card>

          <div class="mujs-actions">
            <Button icon="pi pi-plus" severity="secondary" rounded v-tooltip.bottom="'Add timer'" aria-label="Add timer" @click="addTimer" />
          </div>
        </div>
      </AccordionTab>

      <AccordionTab header="Misc">
        <div class="mujs-form">
          <div class="mujs-row">
            <label class="mujs-label">Watch Path</label>
            <div class="mujs-inline">
              <InputText :modelValue="watchPath" readonly class="w-full" />
              <Button icon="pi pi-folder-open" severity="secondary" outlined v-tooltip.left="'Select Folder'" @click="updateWatchPath" />
            </div>
          </div>
        </div>
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Card from 'primevue/card'
import type { Timer } from '../../shared/types/store'
import { waitForApi } from '../../shared/utils/waitForApi'
import { logger } from '../../shared/utils/logger'

defineEmits<{ (e: 'close'): void }>()

const ansiEnabled = ref(false)
const htmlEnabled = ref(false)
const timers = ref<Timer[]>([])
const watchPath = ref('')
const authString = ref('')
const connectOnStartup = ref(false)

onMounted(async () => {
  await loadSettings()
})

async function loadSettings() {
  try {
    await waitForApi()

    const settings = (await window.store.get('settings')) || {}
    ansiEnabled.value = settings.ansiEnabled ?? false
    htmlEnabled.value = settings.htmlEnabled ?? false
    authString.value = settings.authString ?? ''
    connectOnStartup.value = settings.connectOnStartup ?? false

    watchPath.value = (await window.store.get('watchPath')) || ''

    const storedTimers = await window.store.get('timers')
    if (storedTimers) {
      timers.value = Object.values(storedTimers)
    }
  } catch (e) {
    logger.error('Settings: failed to load settings', e)
  }
}

async function saveSettings() {
  await window.store.set('settings.ansiEnabled', ansiEnabled.value)
  await window.store.set('settings.htmlEnabled', htmlEnabled.value)
  await window.store.set('settings.authString', authString.value)
  await window.store.set('settings.connectOnStartup', connectOnStartup.value)
  window.api.send('settings-updated')
}

async function saveTimer(key: number) {
  const plainTimers = timers.value.map((timer) => ({ ...timer }))
  await window.store.set('timers', plainTimers)
}

async function updateWatchPath() {
  const newPath = await window.api.invoke('dialog:openDirectory')
  if (newPath) {
    watchPath.value = newPath
    await window.store.set('watchPath', watchPath.value)
    window.api.send('watchPath-changed')
  }
}

async function deleteTimer(key: number) {
  timers.value.splice(key, 1)
  await saveTimer(0) // Save all timers
}

function addTimer() {
  timers.value.push({
    name: `Timer ${timers.value.length + 1}`,
    interval: 60000,
    enabled: false,
    send: 'idle'
  })
  saveTimer(0)
}
</script>

<style lang="less" scoped>
.mujs-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 2px;
}

.mujs-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mujs-settings-title {
  font-weight: 700;
  color: var(--p-text-color, #fff);
}

.mujs-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mujs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mujs-label {
  color: var(--p-text-color, #fff);
  opacity: 0.9;
  font-size: 0.9rem;
}

.mujs-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.mujs-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.mujs-timers {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mujs-timer {
  :deep(.p-card-body) {
    padding: 10px;
  }
  :deep(.p-card-content) {
    padding: 0;
  }
}

.mujs-timer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}

.mujs-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mujs-toggle {
  align-items: flex-start;
}

.mujs-timer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}
</style>

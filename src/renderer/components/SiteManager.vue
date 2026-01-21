<template>
  <div id="appRoot" v-show="showMgr" class="surface-ground p-4">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-5">
        <h1 class="text-4xl font-bold text-primary m-0">Connection Manager</h1>
        <p class="text-color-secondary mt-2">Manage your MUD server connections</p>
      </div>

      <!-- Error Message -->
      <Message 
        v-if="connectionError" 
        severity="error" 
        :closable="true" 
        @close="clearError"
        class="mb-4"
      >
        <div class="flex align-items-center gap-2">
          <i class="pi pi-exclamation-triangle text-xl"></i>
          <div>
            <strong>Connection Error</strong>
            <p class="m-0 mt-1">{{ connectionError }}</p>
          </div>
        </div>
      </Message>

      <!-- Add Site Button -->
      <div class="flex justify-content-end mb-4">
        <Button 
          icon="pi pi-plus" 
          @click="addSite"
          severity="secondary"
          rounded
          aria-label="Add Site"
          v-tooltip.top="'Add Site'"
        />
      </div>

      <!-- Site Cards Grid -->
      <div class="grid">
        <div 
          v-for="(site, key) in sites" 
          :key="key" 
          class="col-12 md:col-6 lg:col-4"
        >
          <Card class="h-full hover:shadow-5 transition-all transition-duration-300">
            <template #header>
              <div class="p-3 border-round-top surface-section">
                <h3 class="m-0 text-xl font-semibold text-color">{{ site.name }}</h3>
              </div>
            </template>
            <template #content>
              <div class="flex flex-column gap-3">
                <div class="flex align-items-center gap-2">
                  <i class="pi pi-server text-color-secondary"></i>
                  <span class="text-color">{{ site.host }}:{{ site.port }}</span>
                </div>
                
                <div class="flex gap-2 mt-3">
                  <Button 
                    label="Connect" 
                    icon="pi pi-play" 
                    @click="selectSite(key)"
                    severity="primary"
                    class="flex-1"
                  />
                  <Button 
                    icon="pi pi-cog" 
                    @click="editSite(key)"
                    severity="secondary"
                    outlined
                    rounded
                    aria-label="Edit Settings"
                    v-tooltip.top="'Edit Settings'"
                  />
                  <Button 
                    icon="pi pi-trash" 
                    @click="deleteSite(key)"
                    severity="danger"
                    outlined
                    rounded
                    aria-label="Delete Site"
                    v-tooltip.top="'Delete Site'"
                  />
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="sites.length === 0" class="text-center py-8">
        <i class="pi pi-inbox text-6xl text-color-secondary mb-3"></i>
        <p class="text-xl text-color-secondary">No sites configured</p>
        <p class="text-color-secondary">Click "Add Site" to create your first connection</p>
      </div>
    </div>

    <!-- Edit Site Dialog -->
    <Dialog 
      v-model:visible="editingSite" 
      modal 
      header="Edit Site Configuration"
      :style="{ width: '500px' }"
      :closable="true"
    >
      <div class="flex flex-column gap-4">
        <div class="field">
          <label for="site-name" class="block mb-2 font-semibold">Name</label>
          <InputText 
            id="site-name"
            v-model="currentSite.name" 
            placeholder="Site Name"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="site-host" class="block mb-2 font-semibold">Host</label>
          <InputText 
            id="site-host"
            v-model="currentSite.host" 
            placeholder="hostname or IP address"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="site-port" class="block mb-2 font-semibold">Port</label>
          <InputNumber 
            id="site-port"
            v-model="currentSite.port" 
            :min="1"
            :max="65535"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="site-connection-string" class="block mb-2 font-semibold">Connection Text</label>
          <InputText 
            id="site-connection-string"
            v-model="currentSite.connectionString" 
            placeholder="Optional connection commands"
            class="w-full"
          />
        </div>

        <div class="flex flex-column gap-3">
          <div class="flex align-items-center">
            <Checkbox 
              id="ac-enabled"
              v-model="currentSite.acEnabled" 
              binary
            />
            <label for="ac-enabled" class="ml-2 cursor-pointer">Send On Connect</label>
          </div>

          <div class="flex align-items-center">
            <Checkbox 
              id="ansi-enabled"
              v-model="currentSite.ansiEnabled" 
              binary
            />
            <label for="ansi-enabled" class="ml-2 cursor-pointer">Enable ANSI</label>
          </div>

          <div class="flex align-items-center">
            <Checkbox 
              id="html-enabled"
              v-model="currentSite.htmlEnabled" 
              binary
            />
            <label for="html-enabled" class="ml-2 cursor-pointer">Enable HTML</label>
          </div>

          <div class="flex align-items-center">
            <Checkbox 
              id="websocket-enabled"
              v-model="currentSite.websocketEnabled" 
              binary
            />
            <label for="websocket-enabled" class="ml-2 cursor-pointer">Use WebSocket</label>
          </div>
        </div>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="editingSite = false"
          severity="secondary"
          outlined
        />
        <Button 
          label="Save" 
          icon="pi pi-check" 
          @click="saveSite"
          severity="success"
          autofocus
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import type { Site } from '../../shared/types/store'
import { logger } from '../../shared/utils/logger'
import { waitForApi } from '../../shared/utils/waitForApi'
import type { IpcRendererEvent } from 'electron'

const sites = ref<Site[]>([])
const showMgr = ref(true)
const editingSiteKey = ref<number | null>(null)
const editingSite = ref(false)
const connectionError = ref<string | null>(null)

const currentSite = computed({
  get() {
    if (editingSiteKey.value !== null) {
      return sites.value[editingSiteKey.value] || {
        name: '',
        host: '',
        port: 80,
        htmlEnabled: false,
        ansiEnabled: false,
        websocketEnabled: false,
        connectionString: '',
        acEnabled: false
      }
    }
    return {
      name: '',
      host: '',
      port: 80,
      htmlEnabled: false,
      ansiEnabled: false,
      websocketEnabled: false,
      connectionString: '',
      acEnabled: false
    }
  },
  set(value: Site) {
    if (editingSiteKey.value !== null) {
      sites.value[editingSiteKey.value] = value
    }
  }
})

onMounted(async () => {
  // Wait for window.store and window.api to be available
  try {
    await waitForApi()
  } catch (error) {
    logger.error('Failed to wait for APIs:', error)
    return
  }

  // Load sites from store
  try {
    const storedSites = await window.store.get("sites")
    if (storedSites) {
      sites.value = Object.values(storedSites)
    }
  } catch (error) {
    logger.error('Error loading sites:', error)
  }

  // Listen for disconnect to show manager
  window.api.on("disconnected", () => {
    showMgr.value = true
  })

  // Listen for connection errors
  window.api.on("connection-error", (_event: IpcRendererEvent, error: string) => {
    connectionError.value = error
    showMgr.value = true
  })
})

function clearError() {
  connectionError.value = null
}

async function saveSite() {
  if (!window.store) {
    logger.warn('window.store is not available, cannot save sites')
    return
  }
  const plainSites = sites.value.map((site) => ({ ...site }))
  try {
    await window.store.set("sites", plainSites)
    editingSite.value = false
  } catch (error) {
    logger.error('Error saving sites:', error)
  }
}

function editSite(key: number) {
  editingSite.value = true
  editingSiteKey.value = key
}

async function deleteSite(key: number) {
  sites.value.splice(key, 1)
  await saveSite()
}

function addSite() {
  sites.value.push({
    name: `Site ${sites.value.length + 1}`,
    host: "",
    port: 80,
    connectionString: "",
    acEnabled: false,
    ansiEnabled: true,
    htmlEnabled: false,
    websocketEnabled: false,
  })
  editSite(sites.value.length - 1)
}

function selectSite(key: number) {
  // Clear any previous errors when attempting a new connection
  clearError()
  
  const site = sites.value[key]
  window.api.send(
    "site-selected",
    site.name,
    site.host,
    site.port,
    site.connectionString || "",
    site.acEnabled || false,
    site.ansiEnabled,
    site.htmlEnabled,
    site.websocketEnabled
  )
  showMgr.value = false
}
</script>

<style lang="less" scoped>
// Minimal custom styles - PrimeVue handles most styling
#appRoot {
  // Overlay: do not take layout space above the terminal
  position: fixed;
  inset: 0;
  z-index: 1000;

  background: var(--p-surface-ground, #1e1e1e);
  color: var(--p-text-color, #ffffff);

  // Allow scrolling within the connection manager without affecting the terminal layout
  overflow: auto;
}

// Ensure cards have consistent height in grid
:deep(.p-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .p-card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .p-card-content {
    flex: 1;
  }
}

// Smooth hover effect for cards
:deep(.p-card:hover) {
  transform: translateY(-4px);
  transition: transform 0.3s ease;
}
</style>

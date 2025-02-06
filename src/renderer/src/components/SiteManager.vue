<template>
  <v-app>
    <v-container v-if="!showTerminal">
      <v-app-bar app color="appBar" dark>
        <v-toolbar-title>MOO Site Manager</v-toolbar-title>
      </v-app-bar>

      <v-main>
        <v-container fluid class="content-container">
          <v-row>
            <v-col cols="12" md="4" v-for="(site, index) in sites" :key="index">
              <v-card class="site-card" color="surface">
                <v-card-title>{{ site.name }}</v-card-title>
                <v-card-text>
                  <div>{{ site.hostname }}:{{ site.port }}</div>
                </v-card-text>
                <v-card-actions>
                  <v-btn color="primary" @click="connectToSite(site)">Connect</v-btn>
                  <v-btn color="warning" @click="editSite(index)">Edit</v-btn>
                  <v-btn color="error" @click="deleteSite(index)">Delete</v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>

      <v-btn class="add-site-btn" color="primary" text @click="showAddSiteDialog = true">
        Add New
      </v-btn>

      <v-dialog v-model="showAddSiteDialog" max-width="500px">
        <v-card>
          <v-card-title>Add New Site</v-card-title>
          <v-card-text>
            <v-text-field v-model="newSite.name" label="Name" placeholder="Site Name"></v-text-field>
            <v-text-field v-model="newSite.hostname" label="Hostname" placeholder="hostname or IP"></v-text-field>
            <v-text-field v-model="newSite.port" label="Port" type="number" placeholder="7777"></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="addSite">Save</v-btn>
            <v-btn @click="showAddSiteDialog = false">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showEditSiteDialog" max-width="500px">
        <v-card>
          <v-card-title>Edit Site</v-card-title>
          <v-card-text>
            <v-text-field v-model="editedSite.name" label="Name" placeholder="Site Name"></v-text-field>
            <v-text-field v-model="editedSite.hostname" label="Hostname" placeholder="hostname or IP"></v-text-field>
            <v-text-field v-model="editedSite.port" label="Port" type="number" placeholder="7777"></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="saveEditedSite">Save</v-btn>
            <v-btn color="secondary" @click="revertEditedSite">Revert</v-btn>
            <v-btn @click="showEditSiteDialog = false">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>

    <Terminal v-if="showTerminal" :hostname="currentSite?.hostname" :port="currentSite?.port"
      @disconnect="handleDisconnect" />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Terminal from './Terminal.vue'
import {
  VApp,
  VAppBar,
  VBtn,
  VCard,
  VCardActions,
  VCardText,
  VCardTitle,
  VContainer,
  VTextField,
  VRow,
  VCol,
  VDialog
} from 'vuetify/components'

interface Site {
  name: string
  hostname: string
  port: number
}

const sites = ref<Site[]>([])
const newSite = ref<Site>({
  name: '',
  hostname: '',
  port: 7777
})

const editedSite = ref<Site | null>(null)
const editedSiteIndex = ref<number | null>(null)
const originalSite = ref<Site | null>(null)

const showAddSiteDialog = ref(false)
const showEditSiteDialog = ref(false)

const saveSites = () => {
  localStorage.setItem('sites', JSON.stringify(sites.value))
}

const loadSites = () => {
  const savedSites = localStorage.getItem('sites')
  if (savedSites) {
    sites.value = JSON.parse(savedSites)
  }
}

const addSite = () => {
  sites.value.push({...newSite.value})
  newSite.value = {
    name: '',
    hostname: '',
    port: 7777
  }
  saveSites()
  showAddSiteDialog.value = false
}

const editSite = (index: number) => {
  editedSite.value = {...sites.value[index]}
  originalSite.value = {...sites.value[index]}
  editedSiteIndex.value = index
  showEditSiteDialog.value = true
}

const saveEditedSite = () => {
  if (editedSiteIndex.value !== null && editedSite.value) {
    sites.value[editedSiteIndex.value] = {...editedSite.value}
    saveSites()
    showEditSiteDialog.value = false
  }
}

const revertEditedSite = () => {
  if (originalSite.value) {
    editedSite.value = {...originalSite.value}
  }
}

const deleteSite = (index: number) => {
  sites.value.splice(index, 1)
  saveSites()
}

const showTerminal = ref(false)
const currentSite = ref<Site | null>(null)

const connectToSite = (site: Site) => {
  currentSite.value = site
  showTerminal.value = true
}

const handleDisconnect = () => {
  showTerminal.value = false
  currentSite.value = null
}

onMounted(() => {
  loadSites()
})
</script>

<style scoped>
.v-application {
  height: 100%;
  width: 100%;
}

.content-container {
  padding-top: 20px;
  overflow-y: auto;
  height: calc(100vh - 64px); /* Adjust height to account for the app bar */
}

.site-card {
  margin-bottom: 20px;
}

.add-site-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
}

.no-sites {
  color: #666;
  font-style: italic;
}
</style>

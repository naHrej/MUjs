<template>
  <canvas
    id="canvas"
    style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -99;
    "
  ></canvas>
  
  <div id="conmgr" v-show="showMgr">
    <h4 class="connection-manager-title">Connection Manager</h4>

    <div class="addSite-button">
      <button @click="addSite" class="btn btn-success">
        <i class="fas fa-plus"></i>&nbsp;Add
      </button>
    </div>

    <br />
    <div class="cards-container">
      <SiteCard
        v-for="(site, key) in sites"
        :key="key"
        :site="site"
        @select-site="selectSite(key)"
        @edit-site="editSite(key)"
        @delete-site="deleteSite(key)"
      />
    </div>
  </div>

  <SiteForm
    :visible="isEditing || (!isEditing && Object.keys(siteForm).some(key => siteForm[key] !== '' && siteForm[key] !== false))"
    :form="siteForm"
    :is-editing="isEditing"
    @submit="saveSite"
    @cancel="cancelEdit"
  />
</template>

<script>
import { onMounted } from 'vue';
import SiteCard from './sitemanager/SiteCard.vue';
import SiteForm from './sitemanager/SiteForm.vue';
import { useSiteManager } from '../composables/useSiteManager.js';
import WarpSpeed from '../utils/warpspeed.js';

export default {
  name: 'SiteManager',
  components: {
    SiteCard,
    SiteForm,
  },
  setup() {
    const {
      sites,
      showMgr,
      siteForm,
      isEditing,
      addSite,
      editSite,
      saveSite,
      deleteSite,
      selectSite,
      cancelEdit,
    } = useSiteManager();

    onMounted(() => {
      // Start warpspeed animation
      const canvas = document.getElementById('canvas');
      if (canvas) {
        new WarpSpeed(canvas);
      }
    });

    return {
      sites,
      showMgr,
      siteForm,
      isEditing,
      addSite,
      editSite,
      saveSite,
      deleteSite,
      selectSite,
      cancelEdit,
    };
  },
};
</script>

<style scoped>
.connection-manager-title {
  text-align: center;
  color: #007acc;
  margin-bottom: 20px;
}

.addSite-button {
  text-align: center;
  margin-bottom: 20px;
}

.btn {
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.cards-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 0 20px;
  max-width: 800px;
  margin: 0 auto;
}

#conmgr {
  padding: 30px;
  background: rgba(45, 45, 48, 0.95);
  min-height: 100vh;
  color: #cccccc;
}
</style>

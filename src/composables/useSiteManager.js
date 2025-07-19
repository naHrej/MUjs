/**
 * Composable for site management operations
 * Handles site storage, CRUD operations, and site selection
 */
import { ref, reactive, onMounted } from 'vue';

export function useSiteManager() {
  const sites = ref({});
  const showMgr = ref(true);
  const siteForm = reactive({
    name: '',
    host: '',
    port: '',
    connectionString: '',
    acEnabled: false,
    ansiEnabled: false,
    htmlEnabled: false,
    websocketEnabled: false,
  });
  const isEditing = ref(false);
  const editingSiteKey = ref(null);

  const loadSites = async () => {
    try {
      const savedSites = await window.store.get('sites');
      if (savedSites) {
        sites.value = savedSites;
      }
    } catch (error) {
      console.warn('Failed to load sites:', error);
    }
  };

  const saveSites = async () => {
    try {
      await window.store.set('sites', sites.value);
    } catch (error) {
      console.warn('Failed to save sites:', error);
    }
  };

  const resetForm = () => {
    siteForm.name = '';
    siteForm.host = '';
    siteForm.port = '';
    siteForm.connectionString = '';
    siteForm.acEnabled = false;
    siteForm.ansiEnabled = false;
    siteForm.htmlEnabled = false;
    siteForm.websocketEnabled = false;
  };

  const addSite = () => {
    resetForm();
    isEditing.value = false;
    editingSiteKey.value = null;
  };

  const editSite = (key) => {
    const site = sites.value[key];
    if (site) {
      Object.assign(siteForm, site);
      isEditing.value = true;
      editingSiteKey.value = key;
    }
  };

  const saveSite = async () => {
    if (!siteForm.name || !siteForm.host || !siteForm.port) {
      alert('Please fill in all required fields');
      return;
    }

    const siteData = { ...siteForm };
    
    if (isEditing.value && editingSiteKey.value) {
      sites.value[editingSiteKey.value] = siteData;
    } else {
      const key = Date.now().toString();
      sites.value[key] = siteData;
    }

    await saveSites();
    resetForm();
    isEditing.value = false;
    editingSiteKey.value = null;
  };

  const deleteSite = async (key) => {
    if (confirm('Are you sure you want to delete this site?')) {
      delete sites.value[key];
      await saveSites();
    }
  };

  const selectSite = (key) => {
    const site = sites.value[key];
    if (site) {
      window.api.siteSelected(
        site.name,
        site.host,
        parseInt(site.port),
        site.connectionString || '',
        site.acEnabled || false,
        site.ansiEnabled || false,
        site.htmlEnabled || false,
        site.websocketEnabled || false
      );
      
      // Hide the site manager when a site is selected
      showMgr.value = false;
    }
  };

  const showSiteManager = () => {
    showMgr.value = true;
  };

  const hideSiteManager = () => {
    showMgr.value = false;
  };

  const setupEventListeners = () => {
    // Hide site manager when connected
    window.api.onConnect(() => {
      showMgr.value = false;
    });

    // Show site manager when disconnected
    window.api.onDisconnected(() => {
      showMgr.value = true;
    });
  };

  const cancelEdit = () => {
    resetForm();
    isEditing.value = false;
    editingSiteKey.value = null;
  };

  onMounted(() => {
    loadSites();
    setupEventListeners();
  });

  return {
    sites,
    showMgr,
    siteForm,
    isEditing,
    editingSiteKey,
    addSite,
    editSite,
    saveSite,
    deleteSite,
    selectSite,
    cancelEdit,
    loadSites,
    showSiteManager,
    hideSiteManager,
  };
}

import WarpSpeed from "./warpspeed.js";

const conmgr = Vue.createApp({
  computed: {
    currentSite: {
      get() {
        // Return the current site object or an empty object if not found
        return this.sites[this.editingSiteKey] || {};
      },
      set(value) {
        // Update the current site object with the new value
        this.$set(this.sites, this.editingSiteKey, value);
      },
    },
  },
  data() {
    return {
      sites: [],
      showMgr: true,
      editingSiteKey: null,
      editingSite: false,
      modal: null,
    };
  },
  async mounted() {
    new WarpSpeed(
      "canvas",
      '{"speed":5,"speedAdjFactor":0.03,"density":0.7,"shape":"square","warpEffect":true,"warpEffectLength":7,"depthFade":false,"starSize":2,"backgroundColor":"hsl(263,45%,7%)","starColor":"#FFFFFF"}'
    );
    this.sites = Object.values((await window.store.get("sites")) || {});
    window.api.on("disconnected", () => {
      this.showMgr = true;
    });

    var closeButton = document.getElementsByClassName("close")[0];


    closeButton.onclick = () => {
      var modal = document.getElementById("edit-modal");
      if (modal) {
        this.editingSite = false;
      }
    };
  },
  methods: {
    async saveSite() {
      // Convert the sites array to plain objects
      const plainSites = this.sites.map((site) => Object.assign({}, site));

      // Save the sites
      await window.store.set("sites", plainSites);
      this.editingSite = false;
    },
    editSite: function (key) {
      this.editingSite = true;
      this.editingSiteKey = key;
      // ... other code
    },
    async deleteSite(key) {
      this.sites.splice(key, 1);
      await this.saveSite();
    },
    addSite() {
      this.sites.push({
        name: `Site ${this.sites.length + 1}`,
        host: "",
        port: 80,
        connectionString: "",
        acEnabled: false,
        ansiEnabled: true,
        htmlEnabled: false,
        websocketEnabled: false,
      });
      this.saveSite(this.sites.length - 1);
    },
    selectSite(key) {
      window.api.send(
        "site-selected",
        this.sites[key].name,
        this.sites[key].host,
        this.sites[key].port,
        this.sites[key].connectionString,
        this.sites[key].acEnabled,
        this.sites[key].ansiEnabled,
        this.sites[key].htmlEnabled,
        this.sites[key].websocketEnabled
      );
      console.log("htmlEnabled: " + this.sites[key].htmlEnabled);
      console.log("websocketEnabled: " + this.sites[key].websocketEnabled);

      this.showMgr = false;
    },

    // event for disconnected
  },
}).mount("#appRoot");

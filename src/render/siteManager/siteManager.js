import WarpSpeed from './warpspeed.js';

const conmgr = Vue.createApp({
    data() {
        return {
            sites: [],
            showMgr: true,
            editingSiteKey: null,
            
        }
    },
    async mounted() {
        new WarpSpeed('canvas', '{"speed":5,"speedAdjFactor":0.03,"density":0.7,"shape":"square","warpEffect":true,"warpEffectLength":7,"depthFade":false,"starSize":2,"backgroundColor":"hsl(263,45%,7%)","starColor":"#FFFFFF"}');
        this.sites = Object.values(await window.store.get('sites') || {});
        window.api.on('disconnected', () => {
            this.showMgr = true;
        });
       
    },
    methods: {
        async saveSite(key) {
            // Convert the sites array to plain objects
            const plainSites = this.sites.map(site => Object.assign({}, site));

            // Save the sites
            await window.store.set('sites', plainSites);
            this.editingSiteKey = null;

        },
        editSite: function(key) {
            this.editingSiteKey = key; // Set editingSiteKey to the key of the site being edited
            // ... other code
        },
        async deleteSite(key) {
            this.sites.splice(key, 1);
            await this.saveSite();
        },
        addSite() {
            this.sites.push({
                name: `Site ${this.sites.length + 1}`,
                host: '',
                port: 80,
                connectionString: '',
                acEnabled: false,
                ansiEnabled: true,
                htmlEnabled: false
            });
            this.saveSite(this.sites.length - 1);
        },
        selectSite(key) {
            window.api.send('site-selected', this.sites[key].name, 
                this.sites[key].host, this.sites[key].port,
                 this.sites[key].connectionString, this.sites[key].acEnabled);
            this.showMgr = false;
        }

        // event for disconnected



        
    }
}).mount('#appRoot');
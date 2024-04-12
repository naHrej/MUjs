const conmgr = Vue.createApp({
    data() {
        return {
            sites: [],
            showMgr: true
            
        }
    },
    async mounted() {
        this.sites = Object.values(await window.store.get('sites') || {});
       
    },
    methods: {
        async saveSite(key) {
            // Convert the sites array to plain objects
            const plainSites = this.sites.map(site => Object.assign({}, site));

            // Save the sites
            await window.store.set('sites', plainSites);
        },
        async deleteSite(key) {
            this.sites.splice(key, 1);
            await this.saveSite();
        },
        addSite() {
            this.sites.push({
                name: `Site ${this.sites.length + 1}`,
                host: '',
                port: 80
            });
            this.saveSite(this.sites.length - 1);
        },
        selectSite(key) {
            let host = this.sites[key].host;
            let port = this.sites[key].port;
            window.api.send('site-selected', this.sites[key].host, this.sites[key].port);
            this.showMgr = false;
        }
        
    }
}).mount('#appRoot');
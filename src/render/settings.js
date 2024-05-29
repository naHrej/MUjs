const settings = Vue.createApp({
    data() {
        return {
            fontFamily: '',
            fontSize: '',
            fonts: [],
            timers: [],
            watchPath: '',
            authString: '',
            connectOnStartup: false
        }
    },
    methods: {
        async saveSettings() {
            await window.store.set('settings.fontFamily', this.fontFamily);
            await window.store.set('settings.fontSize', this.fontSize);
            await window.store.set('settings.authString', this.authString);
            await window.store.set('settings.connectOnStartup', this.connectOnStartup);
            window.api.send('settings-updated');
        },
        async saveTimer(key) {
            // Convert the timers array to plain objects
            const plainTimers = this.timers.map(timer => Object.assign({}, timer));

            // Save the timers
            await window.store.set('timers', plainTimers);
        },
        async updateWatchPath(event) {
            this.watchPath = await window.api.invoke('dialog:openDirectory');
            await window.store.set('watchPath', this.watchPath);
            window.api.send('watchPath-changed');
          },
        async deleteTimer(key) {
            this.timers.splice(key, 1);
            await this.saveTimer();
        },
        addTimer() {
            this.timers.push({
                name: `Timer ${this.timers.length + 1}`,
                interval: 60000,
                enabled: false
            });
            this.saveTimer(this.timers.length - 1);
        }
    },
    async mounted() {
        this.watchPath = await window.store.get('watchPath');
        this.fonts = await window.api.getFonts();
        this.fontFamily = await window.store.get('settings.fontFamily');
        this.fontSize = await window.store.get('settings.fontSize');
        this.authString = await window.store.get('settings.authString');
        this.connectOnStartup = await window.store.get('settings.connectOnStartup');
        this.timers = Object.values(await window.store.get('timers') || {});
    }
}).mount('#settings');
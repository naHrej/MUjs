const settings = Vue.createApp({
    data() {
        return {
            fontFamily: '',
            fontSize: '',
            fonts: [],
            timers: [],
            watchPath: '',
            authString: '',
            connectOnStartup: false,
            ansiEnabled: false
        }
    },
    methods: {
        async renderSettings() {
            // Get the whole store object
            const store = await window.store;


            // Generate elements from the store array, separate each setting into it's parent section
            const settings = Object.entries(store).map(([key, value]) => {
                return {
                    key,
                    value,
                    section: key.split('.')[0]
                };
            });

            // Group the settings by section
            const groupedSettings = settings.reduce((acc, setting) => {
                if (!acc[setting.section]) {
                    acc[setting.section] = [];
                }
                acc[setting.section].push(setting);
                return acc;
            }

            , {});

            // Render the settings
            return Object.entries(groupedSettings).map(([section, settings]) => {
                return h('div', [
                    h('h2', section),
                    h('div', settings.map(setting => {
                        return h('div', [
                            h('label', setting.key),
                            h('input', {
                                value: setting.value,
                                onInput: event => {
                                    store.set(setting.key, event.target.value);
                                }
                            })
                        ]);
                    }))
                ]);
            });
        },

        async saveSettings() {
            await window.store.set('settings.ansiEnabled', this.ansiEnabled);
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
        this.ansiEnabled = await window.store.get('settings.ansiEnabled');
        this.fontFamily = await window.store.get('settings.fontFamily');
        this.fontSize = await window.store.get('settings.fontSize');
        this.authString = await window.store.get('settings.authString');
        this.connectOnStartup = await window.store.get('settings.connectOnStartup');
        this.timers = Object.values(await window.store.get('timers') || {});
    }
}).mount('#settings');
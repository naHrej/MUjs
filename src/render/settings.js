const settings = Vue.createApp({
    data() {
        return {
            fontFamily: '',
            fontSize: '',
            fonts: [],
            timers: [],
        }
    },
    methods: {
        async saveSettings() {
            await window.store.set('settings.fontFamily', this.fontFamily);
            await window.store.set('settings.fontSize', this.fontSize);
            window.api.send('settings-updated');
        },
        async saveTimer(key) {
                // Convert the timers array to plain objects
    const plainTimers = this.timers.map(timer => Object.assign({}, timer));

    // Save the timers
    await window.store.set('timers', plainTimers);
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
        this.fonts = await window.api.getFonts();
        this.fontFamily = await window.store.get('settings.fontFamily');
        this.fontSize = await window.store.get('settings.fontSize');
        this.timers = Object.values(await window.store.get('timers') || {});
    }
}).mount('#settings');
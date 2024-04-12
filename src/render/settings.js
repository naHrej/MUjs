const settings = Vue.createApp({
    data() {
        return {
            fontFamily: '',
            fontSize: '',
            fonts: []
        }
    },
    methods: {
        async saveSettings() {
            await window.store.set('settings.fontFamily', this.fontFamily);
            await window.store.set('settings.fontSize', this.fontSize);
            window.api.send('settings-updated');
        }
    },
    async mounted() {
        this.fonts = await window.api.getFonts();
        this.fontFamily = await window.store.get('settings.fontFamily');
        this.fontSize = await window.store.get('settings.fontSize');
    }
}).mount('#settings');
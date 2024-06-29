import { editorMixin } from './editorMixin.js'


const editor = Vue.createApp({
    data() {
        return {
        }
    },
    mixins: [editorMixin],
    mounted() {
        
    },
    methods: {
        submitEditorValue() {
            windows.api.write(editor.GetValue());
        },
        loadFromFile() {
            editor.SetValue(windows.api.loadFile());
        },
        saveToFile() {
            windows.api.saveFile(editor.GetValue());
        },
        toggleEditor() {
            this.showEditor = !this.showEditor;
            this.showEditorButton = !this.showEditorButton;
        }
    }
}).mount('#editor');
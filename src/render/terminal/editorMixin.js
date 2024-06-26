import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/+esm'
    

export const editorMixin = {
    data() {
        return {
            editor: null,
            inputHistory: [],
            currentInputIndex: -1,
        };
    },
    mounted() {

        // Get the editor history from the store
        this.inputHistory = window.store.get('inputHistory') || [];

        monaco.languages.register({ id: 'moocode' });

        monaco.languages.setMonarchTokensProvider('moocode', {
            tokenizer: {
                root: [
                    // Keywords
                    // comment starts with //
                    [/\/\/.*$/, "comment"],
                    [/\b(if|while|for|return|endif|endwhile|endfor|else|elseif|in|this|try|except|finally|endtry)\b/, "keyword.control"],
                    [/\b(typeof|toint|tofloat|toobj|tostr|raise)\b/, "keyword.other"],
                    [/\b(INT|NUM|FLOAT|LIST|MAP|STR|ANON|OBJ|ERR)\b/, "constant.numeric"],
                    [/@(program|args|verb)\b/, "markup.heading"],
                    // Special handling for object:verb
                    // Capture object and verb separately
                    [/(\w+)([:])(\w+)\b/, ["object", "delimiter", "verb"]],
                    // Special handling for object.property
                    // Capture object and property separately
                    [/(\w+)([.]\w+)\b/, ["object", "property"]],
                    // special handling for object_ref:verb
                    // Capture object_ref and verb separately
                    [/$(\w+)([:])(\w+)\b/, ["object_ref", "delimiter", "verb"]],
                    // special handling for object_ref.property
                    // Capture object_ref and property separately
                    [/$(\w+)([.]\w+)\b/, ["object_ref", "property"]],
                    // Special handling for object_ref
                    [/$(\w+)\b/, "object_ref"],
                    // Special handling for object
                    [/\b(\w+)\b/, "object"],
    
                    [/\b(?:\d+(?:\.\d*)?|\.\d+)\b/, "constant.numeric.moo"],
                    // Strings
                    [/"/, { token: "string.quoted.double.moo", next: "@string" }],
                ],
                string: [
                    [/[^\\"]+/, "string"],
                    [/\\./, "constant.character.escape.moo"],
                    [/"/, { token: "string.quoted.double.moo", next: "@pop" }],
                ]
            }
        });

    

        monaco.editor.defineTheme("moocode", {
            base: 'vs-dark',
            inherit: true,
            rules: [

                { token: 'property', foreground: '2596be' },
                { token: 'object', foreground: '76b5c5' },
                // green for verbs
                { token: 'verb', foreground: 'a6e22e' },
                // yellow for perenthesis
                { token: 'delimiter', foreground: 'f8f8f2' },
                // light purple for object_ref
                { token: 'object_ref', foreground: 'bd93f9' },

            ],
        });
        var terminal  = document.getElementById('SdWiqHtqa');
        const editor = monaco.editor.create(terminal, {
            value: '',
            language: 'moocode',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            lineNumbers: 'on',

        });

        editor.addCommand(monaco.KeyCode.Enter, async () => {
                let text = editor.getValue();
                this.inputHistory.push(text);
                this.currentInputIndex = -1;
                editor.setValue('');
                window.store.set('inputHistory', Object.values(this.inputHistory || {}));
                try {
                    await window.api.write(text);
                } catch (error) {
                    console.error('Error writing text:', error);
                    // handle error appropriately
                } finally {

                }      
        });

        editor.addCommand(monaco.KeyCode.UpArrow, () => {
            if (this.currentInputIndex < this.inputHistory.length - 1) {
                this.currentInputIndex++;
                editor.setValue(this.inputHistory[this.currentInputIndex]);
            }
        });

        editor.addCommand(monaco.KeyCode.DownArrow, () => {
            if (this.currentInputIndex > 0) {
                this.currentInputIndex--;
                editor.setValue(this.inputHistory[this.currentInputIndex]);
            }
        });

        editor.focus();

    },
    methods: {
        async handleKeydown(event) {
            

        }
    }
}
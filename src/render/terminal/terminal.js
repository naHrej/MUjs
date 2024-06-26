import { eventMixin } from "./eventMixin.js";
import { connectionEventMixin } from "./connectionEventMixin.js";
import { editorMixin } from "./editorMixin.js";



const app = Vue.createApp({
    el: '#app',
    mixins: [eventMixin, connectionEventMixin, editorMixin],
    data() {
        return {
            host: "code.deanpool.net",
            name: "klinMoo",
            port: 1701,
            inputHistory: [],
            currentInputIndex: -1,
            inputField: null,
            terminal: null,
            showApp: false,
            styleURL: null,
            sessionKey: null,
            resizeHanfdle: null,
            textarea: null,
            startY: null,
            startHeight: null,
            loading: true, // Add this line
            editor: null
        };
    },
    async mounted() {
        this.loading = false;

    },
    methods: {
  
        


        handleOnClickDoBuffer(element) {
            let command = element.getAttribute('onclickdobuffer');
            editor.value += command;
            // set focus to the input field
            this.inputField.setFocus();

        },

        handleCommandElement(element) {
            let command = element.getAttribute('onCommand');
            editor.value = command;
            this.inputHistory.push(command);
            this.currentInputIndex = -1;
            window.api.write(command);
            this.inputField = '';
        },
        loadStyleFromURL(url) {

            url = url.split('.less')[0];

            // Append a unique query string to the URL
            url += '.less?' + new Date().getTime();

            // Load and compile the LESS file
            less.render('@import "' + url + '";', function (error, output) {
                if (error) {
                    console.error(error);
                } else {
                    // Create a new style tag
                    let style = document.createElement('style');

                    // Set the id of the style tag
                    style.id = 'dynamic-style';

                    // Set the content of the style tag to the compiled CSS
                    style.textContent = output.css;

                    // Remove the old style tag if it exists
                    let oldStyle = document.getElementById('dynamic-style');
                    if (oldStyle) {
                        oldStyle.remove();
                    }

                    // Append the style tag to the head of the document
                    document.body.appendChild(style);
                }
            });
        },


        async ApplySettings() {
            let font = await window.store.get('settings.fontFamily');
            let size = await window.store.get('settings.fontSize');

            this.terminal.style.setProperty('font-family', font, 'important');
            this.terminal.style.setProperty('font-size', size + 'px', 'important');
        }
    }
});




app.mount('#app');
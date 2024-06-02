const app = Vue.createApp({
    el: '#app',
    data() {
        return {
            host: "code.deanpool.net",
            port: 1701,
            inputHistory: [],
            currentInputIndex: -1,
            inputField: null,
            terminal: null,
            showApp: false,
            styleURL: null,
            sessionKey: null
        };
    },
    mounted() {
        // get the terminal element
        this.terminal = document.querySelector('.console');
        this.ApplySettings();

        // Get the input history from the store
        window.store.get('inputHistory').then((inputHistory) => {
            this.inputHistory = Object.values(inputHistory || {});
        });

        window.api.on('site-selected', (event, host, port) => {

            this.host = host;
            this.port = port;
            window.api.connect(this.port, this.host);

        });

        window.api.on('reload-styles', () => {
            this.loadStyleFromURL(this.styleURL);
            console.log('Reloading styles');
        });

        window.api.on('connect', () => {
            this.showApp = true;
            console.log('Connected to the server');
            // Check if we have a setting called 'connect-on-startup'
            window.store.get('settings.connectOnStartup').then((value) => {
                // Check if the value is true
                if (value) {
                    // get the authentication string from the store
                    window.store.get('settings.authString').then((auth) => {
                        // Send the authentication string to the server
                        window.api.write(auth);
                    });

                }
                // Generate a session key
                this.sessionKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            });
            setInterval(() => {
                window.api.write('idle');
            }, 60000);
        });


        window.addEventListener('resize', () => {
            // Calculate how many characters can fit on a line
            let columns = window.api.calculateCharCount() - 2;
            let byte1 = Math.floor(columns / 256);
            let byte2 = columns % 256;
            // Send the window size to the server
            window.api.send_naws(byte1, byte2);
            // set scrollbar to bottom
            this.terminal.scrollTop = this.terminal.scrollHeight;
        });

        window.api.on('reconnect', () => {
            console.log('Reconnecting');
            window.api.connect(this.port, this.host);
        });

        window.api.on('settings-updated', (event) => {
            console.log('Applying settings');
            // Apply the settings
            this.ApplySettings();
        });
        window.api.on('close', () => {
            console.log('Connection closed');
        });
        window.addEventListener('beforeunload', (event) => {
            window.api.end();
        });

        window.api.on('received-data', (event, data) => {


            if (data.startsWith('!@style:url:')) {
                // Extract the URL from the data
                let url = data.slice('!@style:url:'.length);
                url = url.split('.less')[0];

                // Append a unique query string to the URL
                url += '.less?' + new Date().getTime();

                this.styleURL = url;

                this.loadStyleFromURL(url);

            } else {
                let newElement = document.createElement('div');

                newElement.title = new Date().toLocaleString();

                // if data starts with: ANSI Version 2.6 is currently active
                // send the clientkey to the server
                if (data.startsWith('ANSI Version 2.6 is currently active')) {
                    window.api.write(`@clientkey ${this.sessionKey}`);
                    return;
                }

                // if the data contains a <script> tag and it does not have a key attribute matching the session key,
                // parse it out and do not add it to the terminal
                if (data.includes('<script') && !data.includes('key="' + this.sessionKey + '"')) {
                    return;
                }

                newElement.innerHTML = window.api.ansi_to_html(data);
                // iterate newElement children and add click event if onCommand attribute is present
                newElement.querySelectorAll('[onCommand]').forEach(node => {
                    node.addEventListener('click', () => {
                        this.handleCommandElement(node);
                    });
                });
                this.terminal.appendChild(newElement);
                this.terminal.scrollTop = this.terminal.scrollHeight;
            }
        });

    },
    methods: {
        handleCommandElement(element) {
            let command = element.getAttribute('onCommand');
            this.inputField = command;
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

        handleKeydown(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                let text = this.inputField;
                this.inputHistory.push(text);
                this.currentInputIndex = -1;
                this.inputField = '';

                // save input history
                window.store.set('inputHistory', Object.values(this.inputHistory || {}));
                window.api.write(text);
            } else if (event.key === 'ArrowUp') {
                if (this.currentInputIndex < this.inputHistory.length - 1) {
                    this.currentInputIndex++;
                    this.inputField = this.inputHistory[this.inputHistory.length - 1 - this.currentInputIndex];
                }
            } else if (event.key === 'ArrowDown') {
                if (this.currentInputIndex > -1) {
                    this.currentInputIndex--;
                    if (this.currentInputIndex === -1) {
                        this.inputField = '';
                    } else {
                        this.inputField = this.inputHistory[this.inputHistory.length - 1 - this.currentInputIndex];
                    }
                }
            }

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
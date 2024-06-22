const app = Vue.createApp({
    el: '#app',
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
            startHeight: null
        };
    },
    mounted() {
        let resizeHandle = document.getElementById('resizeHandle');
        const textarea = document.getElementById('SdWiqHtqa');
        // get the terminal element
        this.terminal = document.querySelector('#AZUHz3kQsgMj');
        this.ApplySettings();


        resizeHandle.addEventListener('mousedown', function (e) {

            this.startY = e.clientY;
            this.startHeight = parseInt(document.defaultView.getComputedStyle(textarea).height, 10);
            document.addEventListener('mousemove', doDrag, false);
            document.addEventListener('mouseup', stopDrag, false);
        });

        // Get the input history from the store
        window.store.get('inputHistory').then((inputHistory) => {
            this.inputHistory = Object.values(inputHistory || {});
        });

        window.api.on('site-selected', async (event, name, host, port) => {
            this.name = name;
            this.host = host;
            this.port = port;

            // set the window title to the host
            // get the current version of the app

            let versionNumber = await window.api.version();
            document.title = this.name + " - MUjs v" + versionNumber;
            window.api.connect(this.port, this.host);

        });
        window.api.on('disconnected', () => {
            // add bold white text to the terminal as an element
            let newElement = document.createElement('div');
            newElement.style.color = 'white';
            newElement.style.fontWeight = 'bold';
            newElement.textContent = '*** Disconnected from the server ***';
            this.terminal.appendChild(newElement);
            this.terminal.scrollTop = this.terminal.scrollHeight;
        });

        window.api.on('reload-styles', () => {
            this.loadStyleFromURL(this.styleURL);
            //  Call the LESS reload function as well
            less.refresh(true);
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
            // setInterval(() => {
            //     //window.api.write('');
            // }, 60000);
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
            let omit = false;
            
            if (data.startsWith('FugueEdit')) {
                data = data.replace("FugueEdit >", 'FugueEdit &gt;');
                // Strip the TinyFugue prompt
                data = data.slice('FugueEdit &gt; '.length);
                //data = data.slice('FugueEdit &gt; '.length);
                // Add a line break
                data = data + '\n';



                // Append the data to the inputField
                editor.setValue(editor.getValue() + data);
                omit = true;

                // get the input textarea element
                let inputElement = document.getElementById('SdWiqHtqa');
                // set focus to the input field
                inputElement.focus();
                // scroll to bottom of inputElement
                inputElement.scrollTop = inputElement.scrollHeight;

                // set the cursor to the end of the input field
                inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);

            }

            if (data.startsWith('!@style:url:')) {
                // Extract the URL from the data
                let url = data.slice('!@style:url:'.length);
                url = url.split('.less')[0];

                // Append a unique query string to the URL
                url += '.less?' + new Date().getTime();

                this.styleURL = url;

                this.loadStyleFromURL(url);
                omit = true;

            } else {
                let newElement = document.createElement('div');

                newElement.title = new Date().toLocaleString();

                // if data starts with: ANSI Version 2.6 is currently active
                // send the clientkey to the server
                if (data.startsWith('ANSI Version 2.6 is currently active')) {
                    window.api.write(`@clientkey ${this.sessionKey}`);

                    return;
                }
                data = window.api.ansi_to_html(data);
                let parser = new DOMParser();
                let doc = parser.parseFromString(data, 'text/html');

                // Find all <script tags>
                let scripts = doc.querySelectorAll('script');
                scripts.forEach(script => {
                    // We want to make sure that the script meets the following conditions:
                    // 1. The script tag has a src attribute and the domain matches host
                    // 2. The script tag has a key attribute and the value matches the session key
                    if (script.src && script.src.includes(this.host) && script.getAttribute('key') === this.sessionKey) {
                        // Create a new script element
                        let newScript = document.createElement('script');
                        // Set the src attribute to the value of the src attribute of the original script tag
                        newScript.src = script.src;
                        // Append the new script tag to the head of the document
                        document.head.appendChild(newScript);
                        omit = true;
                    }
                });

                // link tags are not allowed in the terminal
                // They must also only point to the same domain as the host
                let links = doc.querySelectorAll('link');
                links.forEach(link => {
                    if (link.href && link.href.includes(this.host)) {
                        let newLink = document.createElement('link');
                        newLink.href = link.href;
                        newLink.rel = link.rel;
                        newLink.type = link.type;
                        document.head.appendChild(newLink);
                    }
                });

                let children = Array.from(doc.body.childNodes).filter(node => node.nodeName !== 'SCRIPT' && node.nodeName !== 'LINK');
                // Add them all as children to newElement
                children.forEach(child => {
                    newElement.appendChild(child);
                });


                // Iterate newElement children and add click event if onCommand or onclickdobuffer attribute is present
                newElement.querySelectorAll('[onCommand], [onclickdobuffer]').forEach(node => {
                    node.addEventListener('click', () => {
                        // Check which attribute is present and handle accordingly
                        if (node.hasAttribute('onCommand')) {
                            this.handleCommandElement(node);
                        } else if (node.hasAttribute('onclickdobuffer')) {
                            // Handle onclickdobuffer attribute
                            // Assuming a similar handling function exists or needs to be implemented
                            this.handleOnClickDoBuffer(node);
                        }
                    });
                });
                if (!omit) {
                    this.terminal.appendChild(newElement);
                }
                this.terminal.scrollTop = this.terminal.scrollHeight;
            }
        });

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

        handleKeydown(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                let text = editor.getValue();
                this.inputHistory.push(editor.getValue());
                this.currentInputIndex = -1;
                editor.setValue('');

                // save input history
                window.store.set('inputHistory', Object.values(this.inputHistory || {}));
                window.api.write(text);
            } else if (event.key === 'ArrowUp') {
                if (this.currentInputIndex < this.inputHistory.length - 1) {
                    this.currentInputIndex++;
                    editor.setValue(this.inputHistory[this.inputHistory.length - 1 - this.currentInputIndex]);
                    // cancel the input
                    event.preventDefault();
                    // place cursor at the end of the input field
                    let inputElement = document.getElementById('SdWiqHtqa');
                    // scroll to bottom of inputElement
                    
                    inputElement.focus();
                    inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
                    inputElement.scrollTop = inputElement.scrollHeight;
                }
            } else if (event.key === 'ArrowDown') {
                if (this.currentInputIndex > -1) {
                    this.currentInputIndex--;
                    if (this.currentInputIndex === -1) {
                        editor.setValue('');
                    } else {
                        editor.setValue(this.inputHistory[this.inputHistory.length - 1 - this.currentInputIndex]);
                        //editor.value = this.inputHistory[this.inputHistory.length - 1 - this.currentInputIndex];
                        // place cursor at the end of the input field
                        let inputElement = document.getElementById('SdWiqHtqa');
                        inputElement.focus();
                        inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
                        inputElement.scrollTop = inputElement.scrollHeight;
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



function doDrag(e) {
    console.log('dragging');
    const containerHeight = document.querySelector('.flex-container').clientHeight;
    const newHeight = (e.clientY / containerHeight) * 100;
    const textarea = document.getElementById('SdWiqHtqa');
    const terminal = document.getElementById('AZUHz3kQsgMj');
    // if the height is less than 10% or greater than 90% return
    if (newHeight < 10 || newHeight > 90) {
        return;
    }

    terminal.style.height = `${newHeight}%`;
    textarea.style.height = `${100 - newHeight}%`;
    terminal.scrollTop = terminal.scrollHeight;

    
    editor.layout();

    // stop click through
    e.stopPropagation();



    // console.log('dragging');
    // // Corrected initialization
    // const textarea = document.getElementById('SdWiqHtqa');
    // //let startY = e.clientY;
    // let computedStyle = window.getComputedStyle(textarea);
    // let startHeight = parseInt(computedStyle.height, 10);
    // // Assuming startY is correctly set somewhere, e.g., in a mousedown event handler
    // let newHeight = startHeight + e.clientY - startY;
    // textarea.style.height = newHeight + 'px';

};
function stopDrag() {
    // Scroll terminal to bottom

    document.removeEventListener('mousemove', doDrag, false);
    document.removeEventListener('mouseup', stopDrag, false);
};
let editor;
app.mount('#app');
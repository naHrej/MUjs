export const connectionEventMixin = {
    mounted() {
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
        });
        window.api.on('reconnect', () => {
            console.log('Reconnecting');
            window.api.connect(this.port, this.host);
        });
        window.api.on('disconnect', () => {
            window.api.end();
        });
        window.api.on('close', () => {
            console.log('Connection closed');
        });
        window.api.on('error', (error) => {
            console.error('Error:', error);
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



                // send an update-editor back to electron via IPC
                window.api.send('update-editor', data);
                omit = true;

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


    }
}
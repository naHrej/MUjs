export const eventMixin = {
    mounted() {
      // get the terminal element
      this.terminal = document.querySelector('#AZUHz3kQsgMj');
      this.ApplySettings();
  
      const resizeHandle = document.getElementById('resizeHandle');
      const textarea = document.getElementById('SdWiqHtqa');
  
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
  
        let versionNumber = await window.api.version();
        document.title = `${this.name} - MUjs v${versionNumber}`;
        window.api.connect(this.port, this.host);
      });
  
      window.api.on('disconnected', () => {
        this.showApp = false;
      });

      window.api.on('reload-styles', () => {
        this.loadStyleFromURL(this.styleURL);
        //  Call the LESS reload function as well
        less.refresh(true);
        console.log('Reloading styles');
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





    window.api.on('settings-updated', (event) => {
        console.log('Applying settings');
        // Apply the settings
        this.ApplySettings();
    });

    window.addEventListener('beforeunload', (event) => {
        window.api.end();
    });

    },
    
  };
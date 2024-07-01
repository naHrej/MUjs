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
  
      window.api.on('site-selected', async (event, name, host, port, connstr, acEnabled) => {
        this.name = name;
        this.host = host;
        this.port = port;
        this.connStr = connstr;
        this.acEnabled = acEnabled;
        console.log(connstr);
  
        let versionNumber = await window.api.version();
        document.title = `${this.name} - MUjs v${versionNumber}`;
        window.api.connect(this.port, this.host);
      });
  
      window.api.on('disconnected', () => {
        this.showApp = false;
      });

      // handle submit event from editor
      window.api.on('submit', (event, data) => {
        // dont worry about the input buffer, just send the data
        window.api.write(data);
      });

      window.api.on('reload-styles', () => {
        this.loadStyleFromURL(this.styleURL);
        //  Call the LESS reload function as well
        less.refresh(true);
        console.log('Reloading styles');
    });



    
    window.addEventListener('resize', () => {
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


  function doDrag(e) {
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


    //editor.layout();

    // stop click through
    e.stopPropagation();

};
function stopDrag() {
    // Scroll terminal to bottom

    document.removeEventListener('mousemove', doDrag, false);
    document.removeEventListener('mouseup', stopDrag, false);
};
export const connectionEventMixin = {
  mounted() {
    window.api.on("connect", () => {
      this.showApp = true;
      console.log("Connected to the server");

      if (this.acEnabled) {
        window.api.write(this.connStr);
      }

      this.sessionKey =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    });

    window.api.on("reconnect", () => {
      console.log("Reconnecting");
      if (this.websocketEnabled) {
        window.api.connectWebSocket(this.host, this.port);
      } else {
        window.api.connect(this.port, this.host);
      }
    });

    window.api.on("disconnect", () => {
      window.api.end();
    });

    window.api.on("close", () => {
      console.log("Connection closed");
    });

    window.api.on("error", (error) => {
      console.error("Error:", error);
    });

    window.api.on("received-data", (event, data) => {
      let omit = false;

      // New code editing protocol
      if (!this.codeEditSession) {
        this.codeEditSession = {
          active: false,
          saveCommand: '',
          headerData: [],
          codeLines: [],
          endMarker: '',
        };
      }

      // Handle code editing prompts
      if (data.startsWith("ProgStart > ")) {
        this.codeEditSession.active = true;
        this.codeEditSession.saveCommand = data.replace("ProgStart > ", "").trim();
        this.codeEditSession.headerData = [];
        this.codeEditSession.codeLines = [];
        this.codeEditSession.endMarker = '';
        omit = true;
        return;
      }
      if (this.codeEditSession.active && data.startsWith("ProgData > ")) {
        this.codeEditSession.headerData.push(data.replace("ProgData > ", "").trim());
        omit = true;
        return;
      }
      if (this.codeEditSession.active && data.startsWith("ProgEdit > ")) {
        this.codeEditSession.codeLines.push(data.replace("ProgEdit > ", ""));
        omit = true;
        return;
      }
      if (this.codeEditSession.active && data.startsWith("ProgEnd > ")) {
        this.codeEditSession.endMarker = data.replace("ProgEnd > ", "").trim();
        // Send all collected info to the editor popup
        window.api.send("open-code-editor", {
          saveCommand: this.codeEditSession.saveCommand,
          headerData: this.codeEditSession.headerData,
          codeLines: this.codeEditSession.codeLines,
          endMarker: this.codeEditSession.endMarker
        });
        this.codeEditSession.active = false;
        omit = true;
        return;
      }

      // ...existing code...
      console.log("ANSI Enabled: " + this.ansiEnabled);
      if (this.ansiEnabled) {
        data = window.api.ansi_to_html(data, this.htmlEnabled);
      }

      // Only remove problematic control characters, preserve Unicode and printable chars
      data = data.replace(/[\x00\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      //data = data.trim();

      const regex = /!@style:url:(.+?)(?=.less)/;
      const match = data.match(regex);
      if (match) {
        console.log("matched style url.");
        // Extract the URL from the data
        let url = match[1];
        // Append a unique query string to the URL
        url += ".less?" + new Date().getTime();

        // replace http with https
        url = url.replace("http://", "https://");
        // trim the url
        url = url.trim();

        this.styleURL = url;

        this.loadStyleFromURL(url);
        omit = true;
      }

      let newElement = document.createElement("span");

      newElement.title = new Date().toLocaleString();

      // if data starts with: ANSI Version 2.6 is currently active
      // send the clientkey to the server
      if (data.startsWith("ANSI Version 2.6 is currently active")) {
        window.api.write(`@clientkey ${this.sessionKey}`);

        return;
      }
      //data = window.api.ansi_to_html(data);
      let parser = new DOMParser();

      // please do not let the parser trim all the spaces out of the string
      if (data.charAt(0) ===' ') {
        data = "&nbsp;" + data.slice(1);
      }

      let doc = parser.parseFromString(data, "text/html");
      let styles = doc.querySelectorAll("style");

      if (styles.length > 0) {
        styles.forEach((style) => {
          let newStyle = document.createElement("style");
          newStyle.textContent = style.textContent;
          document.head.appendChild(newStyle);
        });
        omit = true;
      }

      // Find all <script tags>
      let scripts = doc.querySelectorAll("script");
      scripts.forEach((script) => {
        // We want to make sure that the script meets the following conditions:
        // 1. The script tag has a src attribute and the domain matches host
        // 2. The script tag has a key attribute and the value matches the session key
        if (
          script.src &&
          script.src.includes(this.host) &&
          script.getAttribute("key") === this.sessionKey
        ) {
          // Create a new script element
          let newScript = document.createElement("script");
          // Set the src attribute to the value of the src attribute of the original script tag
          newScript.src = script.src;
          // Append the new script tag to the head of the document
          document.head.appendChild(newScript);
          omit = true;
        }
      });

      // link tags are not allowed in the terminal
      // They must also only point to the same domain as the host
      let links = doc.querySelectorAll("link");
      links.forEach((link) => {
        if (link.href && link.href.includes(this.host)) {
          let newLink = document.createElement("link");
          newLink.href = link.href;
          newLink.rel = link.rel;
          newLink.type = link.type;
          document.head.appendChild(newLink);
        }
      });

      let children = Array.from(doc.body.childNodes).filter(
        (node) => node.nodeName !== "SCRIPT" && node.nodeName !== "LINK"
      );
      // Add them all as children to newElement
      children.forEach((child) => {
        newElement.appendChild(child);
      });

      // Iterate newElement children and add click event if onCommand or onclickdobuffer attribute is present
      newElement
        .querySelectorAll("[onCommand], [onclickdobuffer]")
        .forEach((node) => {
          node.addEventListener("click", () => {
            // Check which attribute is present and handle accordingly
            if (node.hasAttribute("onCommand")) {
              this.handleCommandElement(node);
            } else if (node.hasAttribute("onclickdobuffer")) {
              // Handle onclickdobuffer attribute
              // Assuming a similar handling function exists or needs to be implemented
              this.handleOnClickDoBuffer(node);
            }
          });
        });
      if (!omit) {
        // if the window is not focused flash the icon in the toolbar
        if (!document.hasFocus()) {
          window.api.flashFrame(true);
        }
        this.terminal.appendChild(newElement);
      }
      this.terminal.scrollTop = this.terminal.scrollHeight;
    });
  },
};

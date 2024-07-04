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
      window.api.connect(this.port, this.host);
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

      console.log("ANSI Enabled: " + this.ansiEnabled);
      if (this.ansiEnabled) {
        data = window.api.ansi_to_html(data, this.htmlEnabled);
      }

      // trim any unprintable characters
      data = data.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
      //data = data.trim();

      if (data.startsWith("FugueEdit")) {
        data = data.replace("FugueEdit > ", "");

        data = data.replace("FugueEdit &gt; ", "");

        data = data + "\n";

        // send an update-editor back to electron via IPC
        window.api.send("update-editor", data);
        omit = true;
      }
      const regex = /!@style:url:(.+?)(?=.less)/;
      const match = data.match(regex);
      if (match) {
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

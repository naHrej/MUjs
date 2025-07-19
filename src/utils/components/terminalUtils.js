/**
 * Terminal-specific utility functions
 * Handles ANSI processing, HTML rendering, and protocol parsing
 */

export const terminalUtils = {
  /**
   * Process ANSI escape sequences in text
   */
  processAnsiText(text, ansiEnabled = false) {
    if (!ansiEnabled) {
      return this.stripAnsiCodes(text);
    }
    
    // Basic ANSI color code processing
    return text
      .replace(/\x1b\[(\d+)m/g, (match, code) => {
        const colorMap = {
          '30': 'color: black;',
          '31': 'color: red;',
          '32': 'color: green;',
          '33': 'color: yellow;',
          '34': 'color: blue;',
          '35': 'color: magenta;',
          '36': 'color: cyan;',
          '37': 'color: white;',
          '0': 'color: inherit;', // reset
        };
        
        return `<span style="${colorMap[code] || ''}">`;
      })
      .replace(/\x1b\[0m/g, '</span>');
  },

  /**
   * Strip ANSI escape sequences from text
   */
  stripAnsiCodes(text) {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  },

  /**
   * Parse protocol-specific data from server
   */
  parseProtocolData(data) {
    // Handle different protocol types
    if (data.startsWith('@edit')) {
      return this.parseEditProtocol(data);
    }
    
    if (data.startsWith('@html')) {
      return this.parseHtmlProtocol(data);
    }
    
    return { type: 'text', content: data };
  },

  /**
   * Parse edit protocol commands
   */
  parseEditProtocol(data) {
    const lines = data.split('\n');
    const headerLines = [];
    const codeLines = [];
    let saveCommand = '';
    let endMarker = '';
    let inCode = false;

    for (const line of lines) {
      if (line.startsWith('@edit')) {
        saveCommand = line.replace('@edit', '').trim();
      } else if (line.startsWith('@end')) {
        endMarker = line;
        break;
      } else if (line.startsWith('@code')) {
        inCode = true;
      } else if (inCode) {
        codeLines.push(line);
      } else {
        headerLines.push(line);
      }
    }

    return {
      type: 'edit',
      saveCommand,
      headerData: headerLines,
      codeLines,
      endMarker,
    };
  },

  /**
   * Parse HTML protocol commands
   */
  parseHtmlProtocol(data) {
    return {
      type: 'html',
      content: data.replace('@html', '').trim(),
    };
  },

  /**
   * Handle clickable command elements
   */
  handleCommandElement(element, callback) {
    const command = element.getAttribute('onCommand');
    if (command && typeof callback === 'function') {
      callback(command);
    }
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp(date = new Date()) {
    return date.toLocaleTimeString();
  },

  /**
   * Sanitize HTML content for safe display
   */
  sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },
};

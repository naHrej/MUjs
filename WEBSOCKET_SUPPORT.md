# WebSocket Support in MUjs Client

## Overview

The MUjs client now supports WebSocket connections alongside traditional telnet connections. This enables modern web-based communication with game servers that support WebSocket protocols.

## Features

### Dual Connection Support
- **Traditional Telnet**: TCP socket connections for classic MUD/MOO servers
- **WebSocket**: Modern WebSocket connections for web-enabled game servers
- **Automatic Mode Detection**: Client automatically uses the appropriate connection method based on site configuration

### WebSocket Channels
When connecting via WebSocket, the client establishes two separate connections:

1. **Game Channel** (`/game`): Primary game communication
   - Handles all game text, commands, and user input
   - Processes ANSI codes and HTML content
   - Maintains the same functionality as telnet connections

2. **API Channel** (`/api`): Server-to-client API communication
   - Handles structured data exchange
   - Supports JSON-based commands
   - Enables advanced features like editor updates and style changes

## Configuration

### Site Settings
In the Connection Manager, each site now has a "Use WebSocket?" checkbox:
- ✅ **Checked**: Connect using WebSocket protocol
- ⬜ **Unchecked**: Connect using traditional telnet

### Connection URLs
When WebSocket mode is enabled, the client connects to:
- Game WebSocket: `ws(s)://host:port/game`
- API WebSocket: `ws(s)://host:port/api`

**Protocol Selection:**
- Port 443: Uses `wss://` (secure WebSocket)
- Other ports: Uses `ws://` (standard WebSocket)

## API Channel Messages

The API WebSocket supports structured JSON messages for enhanced functionality:

### Supported Message Types

#### Editor Updates
```json
{
  "type": "editor-update",
  "data": "code content to add to editor"
}
```

#### Style Updates
```json
{
  "type": "style-update",
  "url": "https://server.com/style.less"
}
```

#### Notifications
```json
{
  "type": "notification",
  "message": "Server notification text"
}
```

#### Commands
```json
{
  "type": "command",
  "command": "command-name",
  "data": { "key": "value" }
}
```

### Sending API Commands
From the client side, you can send API commands using:
```javascript
window.api.sendApiCommand('command-name', { key: 'value' });
```

## Implementation Details

### Connection Flow
1. User selects a site with WebSocket enabled
2. Client creates WebSocket connections to `/game` and `/api` endpoints
3. Game communication flows through the main WebSocket
4. API communication flows through the dedicated API WebSocket
5. Both connections are managed independently

### Fallback Behavior
- If WebSocket connection fails, the client will display an error
- Users can disable WebSocket mode to fall back to telnet
- Connection state is properly managed for both modes

### Unicode Support
WebSocket connections maintain full Unicode support:
- UTF-8 encoding for all messages
- Proper handling of international characters
- Consistent with telnet Unicode improvements

## Server Requirements

To support MUjs WebSocket clients, servers should implement:

### Game WebSocket Endpoint (`/game`)
- Accept WebSocket connections on the game port
- Handle text-based communication (same as telnet)
- Process user commands and send game output
- Support ANSI codes and HTML content

### API WebSocket Endpoint (`/api`)
- Accept WebSocket connections for structured data
- Handle JSON-formatted messages
- Send editor updates, style changes, and notifications
- Process client-side API commands

### Example Server Setup (Node.js)
```javascript
const WebSocket = require('ws');

// Game WebSocket server
const gameWss = new WebSocket.Server({ 
  port: 8080, 
  path: '/game' 
});

gameWss.on('connection', (ws) => {
  console.log('Game client connected');
  
  ws.on('message', (message) => {
    // Process game commands
    handleGameCommand(message.toString());
  });
  
  // Send game output
  ws.send('Welcome to the game!');
});

// API WebSocket server
const apiWss = new WebSocket.Server({ 
  port: 8080, 
  path: '/api' 
});

apiWss.on('connection', (ws) => {
  console.log('API client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleApiCommand(data);
    } catch (e) {
      console.error('Invalid API message:', e);
    }
  });
});
```

## Benefits

### For Users
- **Modern Protocol**: WebSocket provides better connection handling
- **Enhanced Features**: API channel enables advanced functionality
- **Improved Performance**: More efficient than traditional telnet for web-based features
- **Backward Compatibility**: Telnet mode remains available

### For Server Developers
- **Structured Communication**: JSON-based API messages
- **Real-time Updates**: Push editor content and style changes
- **Modern Web Standards**: Standard WebSocket protocol
- **Dual Channel**: Separate game and API communication

## Migration Guide

### From Telnet to WebSocket
1. Enable WebSocket support on your server
2. Implement `/game` and `/api` WebSocket endpoints
3. In MUjs, edit your site configuration
4. Check "Use WebSocket?" option
5. Test connection and functionality

### Maintaining Compatibility
- Keep telnet support for legacy clients
- WebSocket and telnet can run simultaneously
- No changes needed for basic game communication
- API features are optional enhancements

## Troubleshooting

### Connection Issues
- Check server WebSocket endpoint availability
- Verify port and protocol settings
- Test with browser WebSocket tools first
- Check firewall and proxy settings

### API Channel Problems
- Ensure JSON message format is correct
- Check API WebSocket endpoint separately
- Verify message type handlers on server
- Monitor console for API errors

### Fallback to Telnet
- Uncheck "Use WebSocket?" in site settings
- Traditional telnet connection will be used
- All basic functionality remains available
- API features will not be available

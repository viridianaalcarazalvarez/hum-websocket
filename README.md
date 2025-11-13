# Node.js Server with WebSocket Support

A Node.js server built with Express and WebSocket support.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

## Endpoints

- `GET /` - Returns a welcome message
- `GET /health` - Health check endpoint

## WebSocket

The WebSocket server is available at `ws://localhost:3000`

### Features

- **Connection handling**: Automatically handles new connections and sends welcome messages
- **Message echo**: Echoes received messages back to the sender
- **Broadcasting**: Broadcasts messages to all connected clients (except the sender)
- **Error handling**: Handles invalid JSON and connection errors

### Example Client Usage

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'message',
    content: 'Hello from client!'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});
```

### Message Format

Messages should be JSON strings. The server will:
- Echo the message back to the sender
- Broadcast it to all other connected clients

Example message:
```json
{
  "type": "message",
  "content": "Hello, WebSocket!"
}
```


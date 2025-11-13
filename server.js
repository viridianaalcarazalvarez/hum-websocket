const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected users
const users = new Map(); // Map<WebSocket, {username: string, id: string}>

// Helper function to broadcast user list to all clients
function broadcastUserList() {
  const userList = Array.from(users.values()).map(u => u.username);
  const message = JSON.stringify({
    type: 'userList',
    users: userList,
    count: userList.length
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Routes
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    websocket: 'WebSocket server is available at ws://localhost:' + PORT
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`🔌 New WebSocket connection from ${clientIp}`);

  // Wait for username registration
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle username registration
      if (data.type === 'register' && data.username) {
        const username = data.username.trim();
        if (username && username.length > 0 && username.length <= 20) {
          // Check if username is already taken
          const isTaken = Array.from(users.values()).some(u => u.username.toLowerCase() === username.toLowerCase());
          
          if (isTaken) {
            ws.send(JSON.stringify({
              type: 'usernameError',
              message: 'Username already taken. Please choose another.'
            }));
            return;
          }

          // Register user
          const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          users.set(ws, { username: username, id: userId });
          
          console.log(`👤 User registered: ${username} (${userId})`);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'registered',
            username: username,
            message: 'Successfully registered!'
          }));

          // Send current user list
          broadcastUserList();

          // Notify other users
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'userJoined',
                username: username,
                timestamp: new Date().toISOString()
              }));
            }
          });

          return;
        } else {
          ws.send(JSON.stringify({
            type: 'usernameError',
            message: 'Username must be between 1 and 20 characters.'
          }));
          return;
        }
      }

      // Only process other messages if user is registered
      if (!users.has(ws)) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Please register a username first'
        }));
        return;
      }

      const user = users.get(ws);
      console.log(`📨 Received from ${user.username}:`, data);

      // Echo message back to client
      ws.send(JSON.stringify({
        type: 'echo',
        original: data,
        timestamp: new Date().toISOString()
      }));

      // Broadcast to all connected clients (include username)
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'broadcast',
            data: data,
            username: user.username,
            timestamp: new Date().toISOString()
          }));
        }
      });
    } catch (error) {
      // Handle non-JSON messages
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON format',
        received: message.toString()
      }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    if (users.has(ws)) {
      const user = users.get(ws);
      console.log(`❌ User ${user.username} disconnected`);
      
      // Notify other users
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'userLeft',
            username: user.username,
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      users.delete(ws);
      broadcastUserList();
    } else {
      console.log(`❌ WebSocket connection closed from ${clientIp}`);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (users.has(ws)) {
      users.delete(ws);
      broadcastUserList();
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 HTTP Server is running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server is running on ws://localhost:${PORT}`);
});


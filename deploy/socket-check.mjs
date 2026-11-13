// Ouvre une connexion Socket.IO WebSocket authentifiée à travers Caddy et nginx.
// Utilisé par stack-test.sh ; socket.io-client vient de frontend/node_modules.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { io } = require('socket.io-client');

const url = process.env.SOCKET_URL;
const socket = io(url, {
  transports: ['websocket'],
  extraHeaders: { Cookie: process.env.SOCKET_COOKIE ?? '', Origin: url },
  reconnection: false,
  timeout: 10000,
});

const timer = setTimeout(() => {
  console.error('Socket.IO : pas de connexion après 15 s');
  process.exit(1);
}, 15000);

socket.on('connect', () => {
  clearTimeout(timer);
  console.log(`Socket.IO connecté (transport ${socket.io.engine.transport.name})`);
  socket.close();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  clearTimeout(timer);
  console.error(`Socket.IO : ${err.message}`);
  process.exit(1);
});

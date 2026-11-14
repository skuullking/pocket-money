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
  // engine.io-client impose rejectUnauthorized: true, ce qui ignore
  // NODE_TLS_REJECT_UNAUTHORIZED : sur localhost, Caddy signe avec sa propre CA.
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
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
  // L'erreur de transport porte la vraie cause (code HTTP, TLS, connexion refusée).
  const cause = err.description?.error?.message || err.description?.message || '';
  console.error(`Socket.IO : ${err.message}${cause ? ` (${cause})` : ''}`);
  process.exit(1);
});

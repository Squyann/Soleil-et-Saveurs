// Attend que le port 3000 soit libre avant de démarrer Next.js
// Évite les conflits de port quand Hostinger lance 2 workers simultanément
const net = require('net');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT || '3000', 10);

function isPortFree() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(PORT);
  });
}

async function start() {
  let attempts = 0;
  while (attempts < 30) {
    const free = await isPortFree();
    if (free) {
      console.log(`[start] Port ${PORT} libre, démarrage de Next.js...`);
      const proc = spawn('node_modules/.bin/next', ['start'], { stdio: 'inherit' });
      proc.on('exit', (code) => process.exit(code || 0));
      return;
    }
    console.log(`[start] Port ${PORT} occupé, attente... (${attempts + 1}/30)`);
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }
  console.error(`[start] Port ${PORT} toujours occupé après 30s`);
  process.exit(1);
}

start();

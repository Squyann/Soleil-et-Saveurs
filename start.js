const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT || '3000', 10);
const nextBin = path.join(__dirname, 'node_modules/.bin/next');

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

function isPortInUse(port) {
  return new Promise((resolve) => {
    const client = net.createConnection({ port, host: '127.0.0.1' });
    client.on('connect', () => { client.destroy(); resolve(true); });
    client.on('error', () => { client.destroy(); resolve(false); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitUntilPortFree(port) {
  while (true) {
    const busy = await isPortInUse(port);
    if (!busy) return;
    console.log('[start] Port', port, 'occupé — nouvelle vérification dans 3s...');
    await sleep(3000);
  }
}

async function launchNext() {
  const portBusy = await isPortInUse(PORT);
  if (portBusy) {
    console.log('[start] Port', PORT, 'déjà utilisé — en attente de libération...');
    await waitUntilPortFree(PORT);
    console.log('[start] Port libéré — démarrage Next.js...');
  }

  console.log('[start] Démarrage Next.js sur le port', PORT);

  const proc = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: __dirname,
    env: process.env,
  });

  proc.stdout.on('data', (d) => process.stdout.write(d));
  proc.stderr.on('data', (d) => process.stderr.write(d));

  proc.on('error', (err) => {
    console.error('[start] Erreur spawn:', err.message);
    setTimeout(launchNext, 3000);
  });

  proc.on('exit', async (code, signal) => {
    console.log('[start] Next.js terminé — code:', code, '| signal:', signal);
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      process.exit(0);
    }
    console.log('[start] Relance dans 2s...');
    await sleep(2000);
    launchNext();
  });
}

launchNext();

const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const PORT = parseInt(process.env.PORT || '3000', 10);
const nextBin = path.join(__dirname, 'node_modules/.bin/next');
const nextDir = path.join(__dirname, '.next');

// Si .next n'existe pas ou est vide → build avant de démarrer
function ensureBuild() {
  if (!fs.existsSync(nextDir) || !fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
    console.log('[start] Dossier .next manquant ou incomplet — build en cours...');
    try {
      execSync(`${process.execPath} ${nextBin} build`, {
        cwd: __dirname,
        env: process.env,
        stdio: 'inherit',
      });
      console.log('[start] Build terminé.');
    } catch (err) {
      console.error('[start] Build échoué:', err.message);
      process.exit(1);
    }
  }
}

let currentProc = null;
let exiting = false;

function shutdown(signal) {
  if (exiting) return;
  exiting = true;
  console.log('[start] Signal', signal, '— arrêt en cours...');
  if (currentProc && !currentProc.killed) {
    currentProc.kill('SIGTERM');
    // Forcer la mort après 5s si Next.js ne répond pas
    setTimeout(() => {
      if (currentProc && !currentProc.killed) {
        currentProc.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
    currentProc.on('exit', () => process.exit(0));
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

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
  while (!exiting) {
    const busy = await isPortInUse(port);
    if (!busy) return;
    console.log('[start] Port', port, 'occupé — nouvelle vérification dans 3s...');
    await sleep(3000);
  }
}

async function launchNext() {
  if (exiting) return;

  const portBusy = await isPortInUse(PORT);
  if (portBusy) {
    console.log('[start] Port', PORT, 'déjà utilisé — en attente de libération...');
    await waitUntilPortFree(PORT);
    if (exiting) return;
    console.log('[start] Port libéré — démarrage Next.js...');
  }

  console.log('[start] Démarrage Next.js sur le port', PORT);

  const proc = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: __dirname,
    env: process.env,
  });

  currentProc = proc;

  proc.stdout.on('data', (d) => process.stdout.write(d));
  proc.stderr.on('data', (d) => process.stderr.write(d));

  proc.on('error', (err) => {
    console.error('[start] Erreur spawn:', err.message);
    currentProc = null;
    if (!exiting) setTimeout(launchNext, 3000);
  });

  proc.on('exit', async (code, signal) => {
    console.log('[start] Next.js terminé — code:', code, '| signal:', signal);
    currentProc = null;
    if (exiting) return;
    console.log('[start] Relance dans 2s...');
    await sleep(2000);
    launchNext();
  });
}

ensureBuild();
launchNext();

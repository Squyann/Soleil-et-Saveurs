const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT || '3000', 10);
const LOCK = path.join(__dirname, '.nextjs-' + PORT + '.lock');
const nextBin = path.join(__dirname, 'node_modules/.bin/next');

function acquireLock() {
  try {
    fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
    return true;
  } catch (e) {
    try {
      const pid = parseInt(fs.readFileSync(LOCK, 'utf8'), 10);
      process.kill(pid, 0);
      return false;
    } catch (_) {
      try { fs.unlinkSync(LOCK); } catch (_) {}
      return acquireLock();
    }
  }
}

function releaseLock() {
  try { fs.unlinkSync(LOCK); } catch (_) {}
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const client = net.createConnection({ port, host: '127.0.0.1' });
    client.on('connect', () => { client.destroy(); resolve(true); });
    client.on('error', () => { client.destroy(); resolve(false); });
  });
}

function launchNext() {
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
    releaseLock();
    process.exit(1);
  });

  proc.on('exit', async (code, signal) => {
    console.log('[start] Next.js terminé — code:', code, '| signal:', signal);

    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      releaseLock();
      process.exit(0);
    }

    if (code === 1) {
      // Peut être EADDRINUSE — vérifier si le port est déjà pris
      const portPris = await isPortInUse(PORT);
      if (portPris) {
        console.log('[start] Port', PORT, 'occupé par une autre instance — sortie propre');
        releaseLock();
        process.exit(0);
      }
    }

    // Crash réel (pas EADDRINUSE, pas SIGTERM) — relancer
    console.log('[start] Crash inattendu, relance dans 3s...');
    setTimeout(launchNext, 3000);
  });
}

function main() {
  if (acquireLock()) {
    console.log('[start] Verrou acquis (PID', process.pid + '), démarrage...');
    const cleanup = () => { releaseLock(); process.exit(0); };
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    launchNext();
  } else {
    console.log('[start] Autre instance active, sortie propre (PID', process.pid + ')');
    process.exit(0);
  }
}

main();

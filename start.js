const fs = require('fs');
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
      return false; // autre process vivant
    } catch (_) {
      try { fs.unlinkSync(LOCK); } catch (_) {}
      return acquireLock();
    }
  }
}

function releaseLock() {
  try { fs.unlinkSync(LOCK); } catch (_) {}
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

  proc.on('exit', (code, signal) => {
    console.log('[start] Next.js terminé — code:', code, '| signal:', signal);
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      // Arrêt volontaire (déploiement) — on libère et on sort proprement
      releaseLock();
      process.exit(0);
    }
    // Crash inattendu — on relance directement sans sortir
    console.log('[start] Crash inattendu, relance dans 2s...');
    setTimeout(launchNext, 2000);
  });
}

function main() {
  if (acquireLock()) {
    const cleanup = () => { releaseLock(); process.exit(0); };
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    launchNext();
  } else {
    // Une autre instance tourne déjà — sortie immédiate code 0
    // (évite que Hostinger health-checke ce worker et fasse un rolling restart)
    console.log('[start] Autre instance active, sortie propre');
    process.exit(0);
  }
}

main();

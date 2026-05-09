// Verrou fichier atomique pour éviter le crash loop quand Hostinger
// lance 2 workers simultanément qui se battent pour le port 3000
const fs = require('fs');
const { spawn } = require('child_process');

const path = require('path');
const PORT = parseInt(process.env.PORT || '3000', 10);
// /tmp est isolé par worker sur Hostinger — on utilise le répertoire du projet (partagé)
const LOCK = path.join(__dirname, '.nextjs-' + PORT + '.lock');

function acquireLock() {
  try {
    // O_EXCL = atomique : un seul process peut créer le fichier
    fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
    return true;
  } catch (e) {
    // Vérifier si le process propriétaire du verrou est encore vivant
    try {
      const pid = parseInt(fs.readFileSync(LOCK, 'utf8'), 10);
      process.kill(pid, 0); // lève une exception si le process n'existe plus
      return false; // Process vivant, verrou valide
    } catch (_) {
      // Process mort → verrou périmé, on le supprime et réessaie
      try { fs.unlinkSync(LOCK); } catch (_) {}
      return acquireLock();
    }
  }
}

function releaseLock() {
  try { fs.unlinkSync(LOCK); } catch (_) {}
}

async function start() {
  let attempts = 0;
  while (attempts < 60) {
    if (acquireLock()) {
      console.log('[start] Verrou acquis, démarrage de Next.js sur le port ' + PORT);

      const proc = spawn('node_modules/.bin/next', ['start'], { stdio: 'inherit' });

      const cleanup = () => { releaseLock(); proc.kill(); };
      process.on('SIGTERM', cleanup);
      process.on('SIGINT', cleanup);

      proc.on('exit', (code) => {
        releaseLock();
        process.exit(code || 0);
      });
      return;
    }

    console.log('[start] Autre instance en cours, attente... (' + (attempts + 1) + '/60)');
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }

  console.log('[start] Timeout 60s, sortie propre');
  process.exit(0);
}

start();

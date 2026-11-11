'use client';
import React, { useState } from 'react';

// Image qui change en fondu : la nouvelle photo se superpose à l'ancienne et
// apparaît en douceur une fois chargée (pas de flash blanc, pas de saut de mise
// en page). Le conteneur parent doit être `relative` avec une taille fixe.
export default function ImageFondu({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [affichee, setAffichee] = useState(src);
  const [suivante, setSuivante] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [vue, setVue] = useState(src);

  // Ajustement de l'état pendant le rendu quand `src` change (motif React
  // recommandé, sans effet) : on prépare la couche du dessus.
  if (src !== vue) {
    setVue(src);
    setSuivante(src === affichee ? null : src);
    setVisible(false);
  }

  const classes = `absolute inset-0 w-full h-full object-cover ${className}`;
  return (
    <>
      <img src={affichee} alt={alt} className={classes} draggable={false} />
      {suivante && (
        <img
          key={suivante}
          src={suivante}
          alt=""
          aria-hidden
          draggable={false}
          className={`${classes} transition-opacity duration-300 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => requestAnimationFrame(() => setVisible(true))}
          onError={() => { setAffichee(suivante); setSuivante(null); }}
          onTransitionEnd={() => { setAffichee(suivante); setSuivante(null); setVisible(false); }}
        />
      )}
    </>
  );
}

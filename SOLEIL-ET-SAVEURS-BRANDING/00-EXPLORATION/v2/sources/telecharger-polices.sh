#!/bin/bash
# Télécharge depuis Google Fonts les polices (woff2, latin) attendues par les scripts, dans ./fonts
set -e
cd "$(dirname "$0")"; mkdir -p fonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
for spec in \
  "CormorantGaramond|Cormorant+Garamond:ital,wght@0,400..700;1,400..700" \
  "Jost|Jost:wght@300..700" \
  "Fraunces|Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,100..900,0..100,0..1;1,9..144,100..900,0..100,0..1" \
  "DMSans|DM+Sans:opsz,wght@9..40,300..800" \
  "Bricolage|Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800"; do
  name="${spec%%|*}"; q="${spec#*|}"
  curl -sS -A "$UA" "https://fonts.googleapis.com/css2?family=${q}&display=swap" | awk '
    /\/\* latin \*\//{lat=1} /\/\* latin-ext|cyrillic|greek|vietnamese/{lat=0}
    /font-style/{st=$2; gsub(/;/,"",st)}
    lat && /src: url/{match($0,/https:[^)]+/); print st" "substr($0,RSTART,RLENGTH)}' |
  while read st url; do curl -sS -o "fonts/${name}-${st}.woff2" "$url"; echo "fonts/${name}-${st}.woff2"; done
done

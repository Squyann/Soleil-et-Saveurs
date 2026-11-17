#!/bin/bash
# Télécharge depuis Google Fonts (woff2, sous-ensemble latin) toutes les polices utilisées, dans ./fonts
set -e
cd "$(dirname "$0")"; mkdir -p fonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
for spec in \
  "CormorantGaramond|Cormorant+Garamond:ital,wght@0,400..700;1,400..700" "Jost|Jost:wght@300..700" \
  "Fraunces|Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,100..900,0..100,0..1;1,9..144,100..900,0..100,0..1" \
  "DMSans|DM+Sans:opsz,wght@9..40,300..800" "Bricolage|Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800" \
  "BodoniModa|Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900" "Playfair|Playfair+Display:ital,wght@0,400..900;1,400..900" \
  "Marcellus|Marcellus" "YoungSerif|Young+Serif" "Outfit|Outfit:wght@300..800" "DMSerif|DM+Serif+Display:ital@0;1" \
  "Manrope|Manrope:wght@300..800" "HeptaSlab|Hepta+Slab:wght@300..900" "Corinthia|Corinthia:wght@400;700" \
  "Syne|Syne:wght@400..800" "InstrumentSerif|Instrument+Serif:ital@0;1" "JosefinSans|Josefin+Sans:wght@100..700" \
  "BigShouldersStencil|Big+Shoulders+Stencil+Display:wght@100..900" "Limelight|Limelight" "Sora|Sora:wght@300..800"; do
  name="${spec%%|*}"; q="${spec#*|}"
  curl -sS -A "$UA" "https://fonts.googleapis.com/css2?family=${q}&display=swap" | awk -v n="$name" '
    /\/\*/{lat = ($0 ~ /\/\* latin \*\//)}
    /font-style/{st=$2; gsub(/;/,"",st)} /font-weight/{w=$2; gsub(/;/,"",w); w2=$3; gsub(/;/,"",w2)}
    lat && /src: url/{match($0,/https:[^)]+/); suf=(w2==""? "-" w : ""); print n"-"st suf"\t"substr($0,RSTART,RLENGTH)}' |
  while IFS=$'\t' read fn url; do
    # fichiers variables : pas de suffixe de graisse ; statiques mono-graisse : suffixe retiré sauf Corinthia
    case "$fn" in Corinthia-*) out="$fn";; *) out="${fn%-[0-9][0-9][0-9]}";; esac
    curl -sS -o "fonts/$out.woff2" "$url"; echo "fonts/$out.woff2"
  done
done

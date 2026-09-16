#!/bin/bash
# Генерация портретов заготовок «Вампиры: Маскарад» (раунд 5)
set -u
cd "$(dirname "$0")/../public/vtm/portraits"

STYLE="Dark gothic oil painting portrait, head and shoulders, deep crimson and black velvet palette, gold candlelight accents, chiaroscuro lighting, painterly texture, cinematic, high quality, detailed, no text, no watermark"

gen() {
  local file="$1"; local prompt="$2"
  if [ -s "$file" ]; then echo "SKIP $file (exists)"; return 0; fi
  for attempt in 1 2 3; do
    echo "GEN $file (attempt $attempt)"
    timeout 170 z-ai image -p "$prompt, $STYLE" -o "./$file" -s 864x1152 && [ -s "$file" ] && { echo "OK $file"; return 0; }
    rm -f "./$file.tmp" 2>/dev/null
    sleep 3
  done
  echo "FAIL $file"
  return 1
}

gen "toreador-artist.jpg" "Timeless Toreador vampire artist woman, melancholic ethereal beauty, silk blouse, paint-stained fingers, candlelit atelier with canvases behind"
gen "malkavian-prophet.jpg" "Wild-eyed Malkavian street prophet, disheveled man in mismatched thrift coat, newspaper scraps and chalk sigils, manic knowing grin, streetlight glow"
gen "nosferatu-broker.jpg" "Grotesque Nosferatu vampire information broker, pale bald warped features, rat-like eyes, tattered cloak, dim basement glowing with old monitors and hanging cables"
gen "gangrel-tracker.jpg" "Feral Gangrel vampire wilderness tracker, weathered woman with animal amber eyes, ragged travel cloak, claw scars, foggy overpass wasteland with drifting dogs behind"
gen "tremere-sorcerer.jpg" "Tremere blood sorcerer, gaunt focused man in high-collared dark coat, sigils drawn in the air, ring of candles and blood vials, occult library behind"

echo "ALL DONE"

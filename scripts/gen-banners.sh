#!/bin/bash
cd /home/z/my-project
set -e
echo "[$(date +%T)] Starting banner generation..."

gen() {
  local name="$1"
  local prompt="$2"
  local out="download/banners/${name}.png"
  if [ -f "$out" ] && [ -s "$out" ]; then
    echo "[$(date +%T)] SKIP $name (exists)"
    return
  fi
  echo "[$(date +%T)] GEN $name ..."
  if z-ai image -p "$prompt" -o "$out" -s 1344x768 >/dev/null 2>&1; then
    echo "[$(date +%T)] OK $name ($(stat -c%s "$out") bytes)"
  else
    echo "[$(date +%T)] FAIL $name"
  fi
}

gen eldrinion "Fantasy dark medieval city at dawn, white stone walls and golden temple spires, warm sunrise light breaking through mist, epic dramatic atmosphere, oil painting style, highly detailed, D&D concept art"
gen kragmarsk "Nordic fjord settlement at twilight, longhouses with smoking chimneys along frozen coast, viking longships in harbor, snow-capped mountains, cold blue and grey palette, dramatic clouds, oil painting, D&D concept art"
gen silmarieth "Ancient enchanted forest with silver birch and giant oaks, elven treehouses woven into canopies, ethereal mist, soft green and silver light, magical glowing particles, fantasy illustration, oil painting style"
gen udungol "Vast mongolian steppe under stormy sky, horsemen silhouettes on horizon, felt yurts, golden grass waves, dramatic clouds, epic scale, warm earth tones with stormy grey, oil painting, D&D concept art"
gen vesharan "Eastern fantasy river delta city at dusk, merchant trading quarters with lanterns, silk banners, spice market, warm golden and red palette, bustling harbor, intricate architecture, oil painting style"
gen dead-lands "Post-apocalyptic fantasy wasteland, black glassy cracked earth, ash falling like snow, dark red sky, dead trees, ominous fog, desolate and eerie, dark fantasy concept art, oil painting style"
echo "[$(date +%T)] All done."

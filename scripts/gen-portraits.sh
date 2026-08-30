#!/bin/bash
cd /home/z/my-project
set -e
echo "[$(date +%T)] Starting portrait generation..."

gen() {
  local name="$1"
  local prompt="$2"
  local out="download/portraits/${name}.png"
  if [ -f "$out" ] && [ -s "$out" ]; then
    echo "[$(date +%T)] SKIP $name (exists)"
    return
  fi
  echo "[$(date +%T)] GEN $name ..."
  if z-ai image -p "$prompt" -o "$out" -s 768x1344 >/dev/null 2>&1; then
    echo "[$(date +%T)] OK $name ($(stat -c%s "$out") bytes)"
  else
    echo "[$(date +%T)] FAIL $name"
  fi
}

gen serafina "Portrait of a 58-year-old wise female high priestess, white hair, pale golden translucent eyes, serene expression, white and gold robes, amulet of eternal flame at neck, dark fantasy D&D character art, oil painting style, dramatic chiaroscuro lighting, detailed, mysterious atmosphere"
gen batyr "Portrait of a 41-year-old mongol khan warrior, broad shoulders, scar across left eye, rust-colored braided hair, bone armor, fierce proud expression, weathered face, dark fantasy D&D character art, oil painting style, dramatic lighting, epic atmosphere"
gen silent-one "Portrait of a tall mysterious faceless figure in grey robes, face hidden by ash mask, eerie and otherworldly, dark misty aura, no features visible, dark fantasy D&D character art, oil painting style, ominous atmosphere, high detail"
echo "[$(date +%T)] All done."

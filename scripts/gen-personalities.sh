#!/bin/bash
cd /home/z/my-project
set -e
echo "[$(date +%T)] Starting personality portraits generation..."

gen() {
  local name="$1"
  local prompt="$2"
  local out="download/personalities/${name}.png"
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

gen isolda "Portrait of a 38-year-old fierce female nordic sea-captain, broad shoulders, weathered face, short chestnut braid, missing left ear, chainmail over fur, sea-green cape, holding a longsword, proud and stern expression, cold nordic fjord background, dark fantasy D&D character art, oil painting style, dramatic lighting"
gen therion "Portrait of a 127-year-old wise male archmage, thin and tall, long silver beard, pale almost-white blue eyes, dark blue robe with silver star embroidery, ash staff with crystal shard, ancient and weary expression, dark fantasy D&D character art, oil painting style, mystical atmosphere"
gen veel "Portrait of a mysterious 30-year-old male half-elf dream merchant, thin and pale, dark circles under eyes, mismatched eyes one gold one black, layers of grey silk with hood, unsettling faint smile, shadowy market background, dark fantasy D&D character art, oil painting style, eerie atmosphere"
gen sigurd "Portrait of a 45-year-old massive viking jarl, red beard, broken nose, huge scar across chest, wears white bear pelt and whalebone chainmail, holds a bloodied axe, fierce and ambitious expression, cold mead-hall background, dark fantasy D&D character art, oil painting style, epic atmosphere"
gen eldrin "Portrait of an 820-year-old male elf envoy, tall and slender, long silver hair, sharp ears, spring-green eyes, green and silver silk robes, cloak of leaves, holds a lute of black wood, serene and sorrowful expression, enchanted forest background, dark fantasy D&D character art, oil painting style, ethereal atmosphere"
echo "[$(date +%T)] All done."

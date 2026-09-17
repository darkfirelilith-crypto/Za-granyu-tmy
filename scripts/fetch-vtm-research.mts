import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

const pages: { file: string; url: string }[] = [
  { file: "animalism", url: "https://vtm.paradoxwikis.com/Animalism" },
  { file: "auspex", url: "https://vtm.paradoxwikis.com/Auspex" },
  { file: "celerity", url: "https://vtm.paradoxwikis.com/Celerity" },
  { file: "dominate", url: "https://vtm.paradoxwikis.com/Dominate" },
  { file: "fortitude", url: "https://vtm.paradoxwikis.com/Fortitude" },
  { file: "obfuscate", url: "https://vtm.paradoxwikis.com/Obfuscate" },
  { file: "potence", url: "https://vtm.paradoxwikis.com/Potence" },
  { file: "protean", url: "https://vtm.paradoxwikis.com/Protean" },
  { file: "blood-sorcery", url: "https://vtm.paradoxwikis.com/Blood_Sorcery" },
  { file: "oblivion", url: "https://vtm.paradoxwikis.com/Oblivion" },
  { file: "alchemy", url: "https://vtm.paradoxwikis.com/Thin-blood_Alchemy" },
  { file: "fandom-dominate", url: "https://whitewolf.fandom.com/wiki/Dominate_(VTM)" },
  { file: "fandom-celerity", url: "https://whitewolf.fandom.com/wiki/Celerity_(VTM)" },
  { file: "fandom-auspex", url: "https://whitewolf.fandom.com/wiki/Auspex_(VTM)" },
  { file: "fandom-obfuscate", url: "https://whitewolf.fandom.com/wiki/Obfuscate_(VTM)" },
  { file: "fandom-potence", url: "https://whitewolf.fandom.com/wiki/Potence_(VTM)" },
  { file: "fandom-presence", url: "https://whitewolf.fandom.com/wiki/Presence_(VTM)" },
  { file: "fandom-protean", url: "https://whitewolf.fandom.com/wiki/Protean_(VTM)" },
  { file: "fandom-glossary", url: "https://whitewolf.fandom.com/wiki/Glossary_(VTM)" },
  { file: "fandom-vitae", url: "https://whitewolf.fandom.com/wiki/Vitae_(VTM)" },
  { file: "fandom-kindred", url: "https://whitewolf.fandom.com/wiki/Kindred_(VTM)" },
  { file: "fandom-masquerade", url: "https://whitewolf.fandom.com/wiki/Masquerade_(VTM)" },
  { file: "fandom-embrace", url: "https://whitewolf.fandom.com/wiki/Embrace_(VTM)" },
  { file: "fandom-torpor", url: "https://whitewolf.fandom.com/wiki/Torpor_(VTM)" },
  { file: "fandom-frenzy", url: "https://whitewolf.fandom.com/wiki/Frenzy_(VTM)" },
];

const OUT = "/home/z/vtm-research/pages.json";

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

async function fetchOne(zai: any, url: string, tries = 4): Promise<string> {
  for (let a = 1; a <= tries; a++) {
    try {
      const res = await zai.functions.invoke("page_reader", { url });
      if (res?.data?.html) return res.data.html;
    } catch (e: any) {
      const msg = String(e?.message || e);
      console.log(`  try${a} fail: ${msg.slice(0, 80)}`);
      if (msg.includes("429")) await new Promise((r) => setTimeout(r, 20000 * a));
      else await new Promise((r) => setTimeout(r, 6000));
    }
  }
  return "";
}

async function main() {
  const zai = await ZAI.create();
  const results: Record<string, string> = existsSync(OUT)
    ? JSON.parse(readFileSync(OUT, "utf8"))
    : {};
  for (const p of pages) {
    if (results[p.file]) { console.log(`SKIP ${p.file}`); continue; }
    const html = await fetchOne(zai, p.url);
    if (html) {
      results[p.file] = stripHtml(html).slice(0, 90000);
      console.log(`OK ${p.file} (${results[p.file].length})`);
      writeFileSync(OUT, JSON.stringify(results));
    } else {
      console.log(`GIVEUP ${p.file}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log("DONE", Object.keys(results).length);
}
main().catch((e) => { console.error(e); process.exit(1); });

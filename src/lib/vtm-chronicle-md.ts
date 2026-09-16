// ============================================================
// «ХРОНИКА НОЧЕЙ» в Markdown-файл — полный журнал Сородича,
// одной рукописью для Obsidian-хроник, печати и архивов стола.
// Отличается от «Ⓜ МД»-сводки: здесь вся история целиком
// (сводка берёт только последние 5 записей), плюс приложения.
// Изолированный модуль VtM-вселенной.
// ============================================================

import { VtmSheetData, CLAN_BY_ID, SECT_BY_ID } from "./vtm-data";

/** Дата из записи уже отформатирована — эскейпим только трубы. */
const esc = (s: string): string => s.replace(/\|/g, "\\|");

/** Полная Markdown-хроника: все записи журнала + черновик-приложение. */
export function buildChronicleMarkdown(data: VtmSheetData): string {
  const info = data.info;
  const clan = info.clan === "thinblood" ? "Слабокровная" : CLAN_BY_ID.get(info.clan)?.name;
  const sect = SECT_BY_ID.get(info.sect)?.name;
  const name = info.name || "Безымянный Сородич";
  const entries = data.notes.entries;

  const out: string[] = [];
  const now = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // ── Титул ──
  out.push(`# 🌙 Хроника ночей — ${name}`);
  const identity = [
    clan ? `Клан: **${clan}**` : null,
    sect ? `Секта: **${sect}**` : null,
    info.generation ? `Поколение: **${info.generation}-е**` : null,
    info.chronicle ? `Хроника: *${esc(info.chronicle)}*` : null,
  ].filter(Boolean);
  if (identity.length) out.push(`> ${identity.join(" · ")}`);
  out.push("", `*Сверстано ${now} · записей: ${entries.length}*`, "");

  // ── Оглавление ночей (если записей много) ──
  if (entries.length > 6) {
    out.push("## Содержание", "");
    // Лента идёт от новых к старым; в оглавлении — хронологический порядок
    [...entries].reverse().forEach((n, i) => {
      const hunt = n.title === "Новая охота";
      out.push(`${i + 1}. ${hunt ? "🌙" : "🖋"} ${n.title || "Без заголовка"} — ${n.date}`);
    });
    out.push("");
  }

  // ── Полный журнал: от старых к новым (хроника читается вперёд) ──
  out.push("---", "");
  if (entries.length === 0) {
    out.push("> Журнал чист. Ночь первая — всё ещё впереди.", "");
  } else {
    const chron = [...entries].reverse();
    chron.forEach((n, i) => {
      const hunt = n.title === "Новая охота";
      const title = n.title || "Без заголовка";
      out.push(`## ${hunt ? "🌙" : "🖋"} ${title}`);
      out.push("", `*${n.date} · ночь ${i + 1} из ${chron.length}*`, "");
      out.push(n.content.trim(), "");
    });
  }

  // ── Приложение: черновик (наброски, не вошедшие в журнал) ──
  const draft = data.notes.draft.trim();
  if (draft) {
    out.push("---", "", "## 🖇 Приложение: черновик пера", "");
    out.push("> Наброски, не разнесённые по ночам", "");
    out.push(draft, "");
  }

  // ── Футер ──
  out.push("---", "", "*Кровь запомнила каждое слово. «Вампиры: Маскарад» · 5-я редакция*");

  return out.join("\n");
}

/** Имя файла хроники: транслит не нужен — имя берём как есть, опасные символы режем. */
export function chronicleFileName(name: string): string {
  const safe = (name || "Сородич").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60);
  const d = new Date();
  const stamp = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  return `Хроника-ночей-${safe || "Сородич"}-${stamp}.md`;
}

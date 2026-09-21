import { db } from "@/lib/db";

/**
 * Раунд 39 — оптимизация производительности основного мира.
 *
 * ПРОБЛЕМА: изображения (портреты, баннеры, гербы) хранятся в БД как
 * base64 data-URL прямо в текстовых колонках. Списки lore-эндпоинтов
 * отдают 1–4 МБ за запрос — на канале с RTT ~1 с к Neon это 15–60 с.
 *
 * РЕШЕНИЕ: списки отдают вместо data-URL короткий URL
 * `/api/lore/image/{model}/{id}`, который отдаёт бинарник с ETag
 * и кэшем. Форма данных для фронтенда не меняется:
 * `<img src={row.image}>` продолжает работать.
 *
 * Админке нужны «сырые» base64 (редактирование) — она запрашивает
 * те же эндпоинты с `?full=1`.
 */

type AnyRow = { id: string } & Record<string, unknown>;

/** Модель → колонка с изображением (whitelist — никаких инъекций в модель). */
export const LORE_IMAGE_COLS: Record<string, string> = {
  god: "image",
  personality: "portrait",
  importantBeing: "portrait",
  labEntry: "image",
  country: "banner",
  worldSystem: "image",
  legend: "image",
  siteContent: "image",
};

const DATA_URL_RE = /^data:([\w+.-]+\/[\w+.-]+);base64,/;

export function isDataImage(v: unknown): v is string {
  return typeof v === "string" && DATA_URL_RE.test(v);
}

/** Поставить URL картинки: data-URL → эндпоинт; отсутствующий ключ (omit) → тоже URL. */
function slimRow(model: string, col: string, row: AnyRow): AnyRow {
  const v = row[col];
  if (isDataImage(v) || v == null) {
    return { ...row, [col]: `/api/lore/image/${model}/${row.id}` };
  }
  return row;
}

/**
 * Слим списков: модели с колонкой изображения по умолчанию отдают URL вместо base64.
 * `full=true` (админ) — вернуть всё как есть.
 */
export function slimImages<T extends AnyRow>(model: string, rows: T[], full = false): T[] {
  const col = LORE_IMAGE_COLS[model];
  if (!col || full) return rows;
  return rows.map((r) => slimRow(model, col, r) as T);
}

/** Флаг «отдать полные данные» из запроса (?full=1). */
export function wantsFull(req: Request): boolean {
  try {
    const url = new URL(req.url);
    return url.searchParams.get("full") === "1";
  } catch {
    return false;
  }
}

/**
 * Отдача одной картинки по model+id: binary + ETag + кэш.
 * Повторные запросы с If-None-Match получают 304 без тела (экономия трафика).
 */
export async function serveLoreImage(req: Request, model: string, id: string): Promise<Response> {
  const col = LORE_IMAGE_COLS[model];
  if (!col) {
    return Response.json({ error: "Неизвестная модель изображения" }, { status: 404 });
  }
  const delegate = (db as unknown as Record<string, { findUnique: (a: object) => Promise<AnyRow | null> }>)[model];
  if (!delegate?.findUnique) {
    return Response.json({ error: "Неизвестная модель изображения" }, { status: 404 });
  }
  let row: AnyRow | null = null;
  try {
    row = await delegate.findUnique({ where: { id }, select: { id: true, [col]: true } });
  } catch {
    return Response.json({ error: "Ошибка чтения изображения" }, { status: 500 });
  }
  const v = row?.[col];
  if (!row || !isDataImage(v)) {
    return Response.json({ error: "Изображение не найдено" }, { status: 404 });
  }
  const m = DATA_URL_RE.exec(v);
  const mime = m?.[1] || "image/jpeg";
  const base64 = v.slice(m?.[0].length ?? 0);
  const buffer = Buffer.from(base64, "base64");
  // ETag по содержимому: правка картинки меняет хэш, кэш не залипает навсегда
  const etag = `"${model}-${id}-${buffer.length.toString(36)}-${hash32(base64).toString(36)}"`;
  const inm = req.headers.get("if-none-match");
  if (inm && inm === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  }
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      ETag: etag,
    },
  });
}

function hash32(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 512) {
    // семплируем каждые 512 символов — быстрый дифференцирующий хэш
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

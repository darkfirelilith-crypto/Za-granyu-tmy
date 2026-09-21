import { NextRequest } from "next/server";
import { serveLoreImage } from "@/lib/lore-images";

/**
 * GET /api/lore/image/{kind}/{id} — бинарная отдача изображения,
 * которое в БД хранится как base64 data-URL (god.image, personality.portrait,
 * country.banner и т.д. — см. LORE_IMAGE_COLS). С ETag + кэшем: списки
 * lore-эндпоинтов больше не таскают мегабайты base64.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  return serveLoreImage(req, kind, id);
}

-- ============================================================
-- Обновление БД «За гранью тьмы» до v2 (через Neon SQL Editor)
-- Запусти ВЕСЬ скрипт одним Run. Безопасно для существующих данных.
-- Использует IF NOT EXISTS, повторный запуск тоже безопасен (idempotent).
-- ============================================================

-- 1. Новые поля в Character (мировоззрение, черты, идеалы, мотивы)
ALTER TABLE "Character" ADD COLUMN IF NOT EXISTS "alignment" TEXT;
ALTER TABLE "Character" ADD COLUMN IF NOT EXISTS "traits" TEXT;
ALTER TABLE "Character" ADD COLUMN IF NOT EXISTS "ideals" TEXT;
ALTER TABLE "Character" ADD COLUMN IF NOT EXISTS "motives" TEXT;

-- 2. Новое поле в LabEntry (изображение)
ALTER TABLE "LabEntry" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- 3. Новое поле в GrimoireEntry (зашифрованное название главы)
ALTER TABLE "GrimoireEntry" ADD COLUMN IF NOT EXISTS "encodedTitle" TEXT;

-- 4. Новое поле в Achievement (условие авто-выдачи)
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "conditionType" TEXT;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "conditionValue" TEXT;

-- 5. Новое поле в GrimoireEntry (условие авто-разблокировки + флаг auto)
ALTER TABLE "GrimoireEntry" ADD COLUMN IF NOT EXISTS "autoUnlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GrimoireEntry" ADD COLUMN IF NOT EXISTS "conditionType" TEXT;
ALTER TABLE "GrimoireEntry" ADD COLUMN IF NOT EXISTS "conditionValue" TEXT;

-- 6. Новая таблица Note (журнал героя — личные заметки игроков)
CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- Внешний ключ Note -> Character (с каскадным удалением)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Note_characterId_fkey'
    ) THEN
        ALTER TABLE "Note" ADD CONSTRAINT "Note_characterId_fkey"
            FOREIGN KEY ("characterId") REFERENCES "Character"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 7. Уникальный индекс на Note.id (если вдруг ещё нет)
CREATE UNIQUE INDEX IF NOT EXISTS "Note_pkey" ON "Note"("id");

-- ============================================================
-- Готово. Можно проверить:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'Character' ORDER BY ordinal_position;
-- SELECT count(*) FROM "Note";  -- должно быть 0
-- ============================================================

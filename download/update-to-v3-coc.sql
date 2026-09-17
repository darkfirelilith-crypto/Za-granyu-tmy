-- ============================================================
-- Обновление БД до v3: «Зов Ктулху» — интерактивные листы сыщика
-- Скрипт ИДЕМПОТЕНТЕН (безопасно запускать повторно) и НЕ трогает
-- существующие таблицы и данные. Только добавляет новое.
--
-- Запуск: Neon Console → SQL Editor → вставить всё → Run
-- ============================================================

-- Таблица листов персонажей «Зова Ктулху» (до 5 на пользователя)
CREATE TABLE IF NOT EXISTS "CocSheet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Новый сыщик',
    "data" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CocSheet_pkey" PRIMARY KEY ("id")
);

-- Индекс по пользователю
CREATE INDEX IF NOT EXISTS "CocSheet_userId_idx" ON "CocSheet"("userId");

-- Внешний ключ на User (каскадное удаление листов вместе с пользователем)
DO $$ BEGIN
    ALTER TABLE "CocSheet"
        ADD CONSTRAINT "CocSheet_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL; -- связь уже существует
END $$;

-- Проверка (опционально):
-- SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='CocSheet';

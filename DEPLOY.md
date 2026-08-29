# Деплой «За гранью тьмы» на Vercel

Этот гайд проведёт тебя через публикацию сайта на Vercel с чистой базой данных
(только admin-Божество + ранги гильдии; весь лор ты наполнишь сам через админку).

> **Время:** ~15 минут
> **Стоимость:** бесплатно (Vercel Hobby + Neon free tier)

---

## Что нужно

- Аккаунт [GitHub](https://github.com)
- Аккаунт [Vercel](https://vercel.com) (логин через GitHub)
- Аккаунт [Neon](https://neon.tech) (бесплатный serverless Postgres)

---

## Шаг 1. Создать базу данных на Neon

1. Зайди на [neon.tech](https://neon.tech) и залогинься (через GitHub удобно)
2. **Create new project** → назови `za-granyu-tmy`, регион выбери ближайший (Frankfurt для Европы)
3. На вкладке **Dashboard** найди **Connection string** — он выглядит так:
   ```
   postgresql://neondb_owner:npXy...@ep-cool-name-12345.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Сохрани его** — это `DATABASE_URL`, он понадобится дважды

---

## Шаг 2. Залить код на GitHub

Если код ещё не на GitHub:

```bash
cd /home/z/my-project
git add -A
git commit -m "Подготовка к деплою: Postgres + чистый seed"
git remote add origin https://github.com/ТВОЙ_НИК/za-granyu-tmy.git
git push -u origin main
```

> Файл `.env` уже в `.gitignore` — секреты не попадут в репозиторий.

---

## Шаг 3. Импортировать проект в Vercel

1. На [vercel.com](https://vercel.com) → **Add New → Project**
2. Выбери свой репозиторий `za-granyu-tmy`
3. Vercel сам определит Next.js — **настройки Framework Preset не меняй**
4. Разверни **Environment Variables** и добавь три:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | твой Neon connection string (из Шага 1) |
   | `NEXTAUTH_SECRET` | новый случайный секрет (см. ниже) |
   | `NEXTAUTH_URL` | `https://za-granyu-tmy.vercel.app` (вставь свой будущий домен; после первого деплоя обновишь) |

   **Сгенерировать NEXTAUTH_SECRET** можно в терминале:
   ```bash
   openssl rand -base64 32
   ```
   (или используй любой генератор случайных строк длиной 32+ символа)

5. **Deploy** — первый билд займёт ~2 минуты

---

## Шаг 4. Создать таблицы и залить admin-Божество в прод-БД

Vercel не запускает миграции и seed автоматически — это нужно сделать один раз.

> **⚠️ Важно для тех, у кого VPN:** локальный `npx prisma db push` может падать с
> `P1017: Server has closed the connection` — VPN режет TCP-порт 5432. В этом
> случае **используй Neon SQL Editor в браузере** (он работает по HTTPS,
> VPN справляется). Инструкция ниже — оба варианта.

---

### Вариант А — через Neon SQL Editor (рекомендуется, если есть VPN)

1. Открой [Neon Console](https://console.neon.tech) → твой проект → **SQL Editor**
2. Открой файл `download/full-schema-from-scratch.sql` (из архива проекта)
3. Скопируй **всё** содержимое, вставь в SQL Editor
4. Нажми **Run** — создаст все 15 таблиц + индексы + внешние ключи
5. Проверь: выполни в SQL Editor
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
   ```
   Должен увидеть ~15 таблиц: User, Character, Note, Achievement, Country, ..., LabEntry.

### Залить admin-Божество (через SQL Editor)

1. В Git Bash на локальной машине посчитай хеш пароля (по умолчанию `divine123`):
   ```bash
   node -e "const {scryptSync,randomBytes}=require('crypto');const salt=randomBytes(16).toString('hex');const hash=scryptSync('divine123',salt,64).toString('hex');console.log(salt+':'+hash)"
   ```
   Скопируй вывод (длинная строка `salt:hash`).

2. В **Neon SQL Editor** вставь следующий SQL (замени `ВСТАВЬ_ХЕШ` на хеш):
   ```sql
   INSERT INTO "User" (id, email, name, password, role, "createdAt", "updatedAt")
   VALUES ('cmtddeity0000000000000000', 'deity@eldrin.world', 'Аэтериус', 'ВСТАВЬ_ХЕШ', 'ADMIN', NOW(), NOW());

   INSERT INTO "GuildRank" (id, name, level, description, icon, "minXp", "createdAt") VALUES
   ('cmtrank000000000000000001', 'Железный Искатель', 1, 'Новички гильдии, только вступившие на путь авантюр.', '⚔️', 0, NOW()),
   ('cmtrank000000000000000002', 'Бронзовый Следопыт', 2, 'Проверенные в первом испытании.', '🛡️', 200, NOW()),
   ('cmtrank000000000000000003', 'Серебряный Клинок', 3, 'Опытные искатели приключений.', '🗡️', 600, NOW()),
   ('cmtrank000000000000000004', 'Золотой Защитник', 4, 'Ветераны множества походов.', '🏆', 1500, NOW()),
   ('cmtrank000000000000000005', 'Мифический Чемпион', 5, 'Легенды гильдии, чьи имена знает весь мир.', '👑', 5000, NOW());
   ```
3. Нажми **Run**. Проверь: `SELECT email, role FROM "User";` — должен видеть админа.

> Свой пароль: замени `'divine123'` в node-команде выше на свой, скопируй новый хеш.

---

### Вариант Б — локально через Prisma (если VPN НЕ блокирует)

```bash
cd /home/z/my-project

# 1. В .env подставь Neon DIRECT url (без -pooler):
export DATABASE_URL="postgresql://neondb_owner:npXy...@ep-xxx.neon.tech/neondb?sslmode=require&connect_timeout=300"

# 2. Создать все таблицы в прод-БД:
npx prisma db push

# 3. Залить admin-Божество и 5 рангов гильдии:
npx tsx prisma/seed-admin.ts
```

Если `P1017` — возвращайся к Варианту А (Neon SQL Editor).

---

### ⬆️ ОБНОВЛЕНИЕ БД (когда выходят новые версии проекта)

Когда ты обновляешь код (новые поля в таблицах или новые таблицы),
обнови БД через **Neon SQL Editor** скриптом `download/update-to-v2.sql`
(или следующей версии). Этот скрипт использует `IF NOT EXISTS` — безопасен
для повторного запуска и не трогает существующие данные.

1. Открой `download/update-to-v2.sql` в VS Code
2. Скопируй всё, вставь в Neon SQL Editor
3. **Run** — добавятся новые колонки/таблицы без потери данных

---

## Шаг 5. Проверить и обновить NEXTAUTH_URL

1. Vercel даст URL вида `https://za-granyu-tmy-abc123.vercel.app`
2. Открой **Settings → Environment Variables** на Vercel
3. Обнови `NEXTAUTH_URL` на этот точный URL
4. **Redeploy** (кнопка на вкладке Deployments)

---

## Шаг 6. Готово! 🎉

Открой свой прод-URL и:

1. Нажми **«Войти в сагу»** (или Ctrl+K для поиска)
2. Войди как Божество:
   - Email: `deity@eldrin.world`
   - Пароль: `divine123` (или тот, что ты задал в Шаге 4)
3. **Сменить пароль** — сейчас дефолтный пароль небезопасен. (Пока это нужно сделать через пересид с новым `ADMIN_PASSWORD`, так как страницы смены пароля ещё нет в админке.)
4. Открой раздел **«Божество»** (Чертог Божества) и начинай наполнять мир:
   - Страны, личности, боги, легенды (База Знаний)
   - Задания и ранги (Гильдия)
   - Главы Гримуара с зашифрованными названиями
   - Кастомные расы/классы/заклинания/предметы (Лаборатория Алого)
   - Достижения и героев

---

## Шаг 7 (опционально). Пригласить игроков

Игроки регистрируются сами через **«Войти в сагу → Регистрация»**:
- Имя игрока (реальное)
- Имя персонажа (в мире)
- Email + пароль

После регистрации у них появится профиль героя, и они смогут принимать задания
из Гильдии, получать достижения и открывать главы Гримуара по мере прохождения
сюжета (по условиям, которые ты настраиваешь).

---

## Если что-то сломалось

### `P1017: Server has closed the connection` (локально через VPN)
Это самая частая проблема. VPN (особенно в Германию/Европу) режет TCP-порт 5432,
который использует Prisma. Решение — **делай все изменения БД через Neon SQL Editor**
(работает по HTTPS, VPN справляется):
1. [Neon Console](https://console.neon.tech) → SQL Editor
2. Для создания таблиц: вставь `download/full-schema-from-scratch.sql` → Run
3. Для обновления БД: вставь `download/update-to-v2.sql` → Run
4. Для залива админа: посчитай хеш пароля локально (`node -e ...`), вставь INSERT-запрос (см. Шаг 4, Вариант А)

### `PrismaClientInitializationError` на Vercel
- Проверь, что `DATABASE_URL` добавлен в **Environment Variables** на Vercel
- Проверь, что Neon connection string оканчивается на `?sslmode=require`
- Убедись, что в `package.json` есть `"postinstall": "prisma generate"` (он там есть)
- На Vercel используй **pooled** URL (с `-pooler`) — serverless-функции лучше работают через пул

### Ошибка `NEXTAUTH_SECRET` / «Server error» при логине
- Проверь, что `NEXTAUTH_SECRET` задан в env на Vercel
- Проверь, что `NEXTAUTH_URL` точно совпадает с доменом Vercel (с `https://`)

### 500 при создании контента в админке (на Vercel)
- Скорее всего таблицы/колонки не созданы. Открой Neon SQL Editor и прогони
  `download/update-to-v2.sql` (или `full-schema-from-scratch.sql`, если БД пустая)
- Проверь в SQL Editor: `SELECT tablename FROM pg_tables WHERE schemaname='public';`

### «Application error» / белый экран
- Открой DevTools консоль браузера → посмотри ошибку
- Если `Unknown relation notes` или `Unknown field X` — БД на проде не обновлена
  под новую схему. Прогони `update-to-v2.sql` в Neon SQL Editor → передеплой Vercel

### Локальная разработка сломалась
После переключения schema на `postgresql` локальный SQLite-файл `db/custom.db`
больше не подойдёт (Prisma client будет ожидать Postgres). Есть **простой способ**
продолжить локальную разработку на SQLite — в проекте есть резервная схема:

```bash
# Сгенерировать Prisma client под локальный SQLite
bun run db:generate:local

# Запустить локальный dev-сервер (использует SQLite из db/custom.db)
bun run dev:local

# Если нужно пересоздать локальную БД (с已有的 schema):
bun run db:push:local
# затем сид-данными (полный демо-лор):
bun run prisma/seed.ts
bun run scripts/seed-conditions.ts
bun run scripts/seed-lab.ts
```

> **Важно:** `bun run dev:local` — для локальной разработки (SQLite).
> `bun run dev` — для использования с Postgres (нужен `DATABASE_URL`).
> Vercel при деплое использует `postinstall: prisma generate` (основную Postgres-схему).

---

## Переменные окружения (шпаргалка)

| Variable | Где получить | Пример |
|----------|--------------|--------|
| `DATABASE_URL` | Neon dashboard | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | случайная строка 32+ символа |
| `NEXTAUTH_URL` | Vercel dashboard (после деплоя) | `https://za-granyu-tmy.vercel.app` |
| `ADMIN_EMAIL` | (опционально) для seed | `deity@eldrin.world` |
| `ADMIN_PASSWORD` | (опционально) для seed | `твой_надёжный_пароль` |
| `ADMIN_NAME` | (опционально) для seed | `Аэтериус` |

---

## Полезные команды

```bash
# Создать/обновить таблицы в прод-БД (после изменения schema.prisma)
DATABASE_URL="postgresql://..." bun run db:push

# Пересид admin-Божества (если забыл пароль)
DATABASE_URL="postgresql://..." ADMIN_PASSWORD="новый_пароль" bun run prisma/seed-admin.ts

# Локальная разработка
bun run dev          # http://localhost:3000

# Проверить код
bun run lint
```

---

Удачной кампании, Божество! ✦

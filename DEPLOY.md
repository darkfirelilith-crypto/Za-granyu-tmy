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

Vercel не запускает миграции и seed автоматически — это нужно сделать один раз
**локально, с прод-DATABASE_URL**. Это самый важный шаг.

В терминале на твоей машине:

```bash
cd /home/z/my-project

# 1. Временно подставь прод-DATABASE_URL (замени на свой Neon URL):
export DATABASE_URL="postgresql://neondb_owner:npXy...@ep-cool-name-12345.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# 2. Создать все таблицы в прод-БД:
bun run db:push

# 3. Залить admin-Божество и 5 рангов гильдии:
bun run prisma/seed-admin.ts
```

Если хочешь задать свой пароль для Божества (вместо дефолтного `divine123`):

```bash
ADMIN_EMAIL="твой@email" ADMIN_PASSWORD="надёжный_пароль" ADMIN_NAME="Имя Божества" \
  bun run prisma/seed-admin.ts
```

После выполнения ты увидишь:
```
✓ Deity created — email: deity@eldrin.world
✓ 5 guild ranks created
✨ Clean production seed complete.
```

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

### Ошибка `PrismaClientInitializationError` на Vercel
- Проверь, что `DATABASE_URL` добавлен в **Environment Variables** на Vercel
- Проверь, что Neon connection string оканчивается на `?sslmode=require`
- Убедись, что в `package.json` есть `"postinstall": "prisma generate"` (он там есть)

### Ошибка `NEXTAUTH_SECRET` / «Server error» при логине
- Проверь, что `NEXTAUTH_SECRET` задан в env на Vercel
- Проверь, что `NEXTAUTH_URL` точно совпадает с доменом Vercel (с `https://`)

### 500 при создании контента в админке
- Скорее всего таблицы не созданы. Вернись к Шагу 4 и прогони `bun run db:push`

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

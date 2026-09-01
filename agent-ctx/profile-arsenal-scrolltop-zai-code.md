# Task: profile-arsenal-scrolltop — Z.ai Code

## Summary

Implemented two independent features on the D&D site «За гранью тьмы»:

1. **Profile — "Арсенал" and "Свитки" sections**: replaced the old single "Магические предметы" `InventorySection` component in `src/components/sections/profile.tsx` with two separate type-filtered sections (`ArsenalSection` for `kind === "ITEM"` and `ScrollsSection` for `kind === "SPELL"`), each opening a fully detailed Dialog following the same pattern as `LabDetail` in `lab.tsx` (sr-only `DialogTitle` + visible content + meta grid + drop-cap description).
2. **Scroll-to-top floating button**: new `src/components/fantasy/scroll-to-top.tsx` (`ScrollToTop`) — fixed bottom-left (z-30, opposite the `DiceRoller` bottom-right), appears after scrolling >300 px, smoothly scrolls to top, styled `bg-parchment-dark/70 border-gold/30 text-gold backdrop-blur-sm`. Added `<ScrollToTop />` to `app-shell.tsx` between footer and `AuthDialog`/`Omnisearch`/`DiceRoller`.

## Files changed

### `src/app/api/characters/[id]/inventory/route.ts`
Extended the `labEntry` Prisma `select` in BOTH the `GET` and `POST` handlers to include every field the new detail dialogs render:
- `details`, `itemType`, `attunement` (for ITEM)
- `spellLevel`, `school`, `concentration`, `ritual`, `components`, `castingTime`, `spellRange`, `spellClasses` (for SPELL)

Previously the select returned only `id, name, icon, kind, rarity, subtitle, description, image`, which was insufficient for the new detail views. The HTTP contract is unchanged (still `CharacterItem[]` with `labEntry` included) — only more fields are exposed on each `labEntry`.

### `src/components/sections/profile.tsx`
- Added `Dialog, DialogContent, DialogTitle, DialogDescription` to the imports from `@/components/ui/dialog`.
- Replaced `<InventorySection characterId={char.id} />` (inside the `profile` TabsContent, after the quest journal) with two sibling sections:
  ```tsx
  <ArsenalSection characterId={char.id} />
  <ScrollsSection characterId={char.id} />
  ```
- Deleted the old `InventorySection` function and replaced it with four new functions:
  - `ArsenalSection` — fetches `/api/characters/${characterId}/inventory`, filters `labEntry.kind === "ITEM"`, renders a `sm:grid-cols-2` card grid (icon + name + `RarityBadge` + `itemType` + `description` line-clamp-2), empty state: «Арсенал пуст.» Clicking a card opens a `Dialog` with `ArsenalDetail`.
  - `ArsenalDetail` — sr-only `DialogTitle`/`DialogDescription`, header (RuneSeal + name + RarityBadge + itemType), optional image, meta grid (`Тип предмета` / `Настройка` / `Редкость`), drop-cap description, optional granted date + admin note.
  - `ScrollsSection` — same fetch, filters `labEntry.kind === "SPELL"`, grid cards (icon + name + `spellLevel` badge + `school` badge + description), empty state: «Свитков пока нет.»
  - `ScrollsDetail` — header with name + level/school badges, full 8-row meta grid (`Уровень`, `Школа`, `Концентрация`, `Ритуал`, `Компоненты`, `Время накладывания`, `Дистанция`, `Классы`), drop-cap description, optional granted date + admin note.
  - `MetaRow` — shared label/value row helper (returns `null` when value is falsy, mirroring the `LabDetail` pattern in `lab.tsx`).
- All sections use existing fantasy primitives (`ParchmentCard`, `RuneSeal`, `RarityBadge`, `OrnamentTitle`) and existing shadcn/ui (`Dialog`, `Badge`).
- Title flourishes: `⚔️` for «Арсенал», `📜` for «Свитки» — title text has no extra `✦` decoration (the OrnamentTitle flourish is the only ornament).

### `src/components/fantasy/scroll-to-top.tsx` (new)
- `'use client'` component.
- `useState` `visible` (boolean), defaults to `false`.
- `useEffect` registers a passive `scroll` listener; the handler computes `shouldShow = window.scrollY > 300` and only calls `setVisible` when it actually changes (simple-conditional guard pattern, no setState-in-effect lint error). The listener is removed on cleanup.
- Button is `position: fixed; bottom: 1.5rem; left: 1.5rem; z-index: 30` (Tailwind: `fixed bottom-6 left-6 z-30`).
- Style: `bg-parchment-dark/70 border border-gold/30 text-gold backdrop-blur-sm shadow-lg`, rounded-full `w-11 h-11`, hover scales 105 + brightens gold border.
- Hidden state: `opacity-0 pointer-events-none` when not visible; visible: `opacity-100`. Transition is `duration-300`.
- Click handler: `window.scrollTo({ top: 0, behavior: "smooth" })`.
- Icon: `ChevronUp` from `lucide-react`.
- Accessibility: `aria-label="Наверх"`, `title="Наверх"`, `focus-visible:ring-2 ring-gold/50`.

### `src/components/app-shell.tsx`
- Added `import { ScrollToTop } from "@/components/fantasy/scroll-to-top";` after the `DiceRoller` import.
- Rendered `<ScrollToTop />` inside the outer app div, immediately after the `</div>` that closes the `.vignette` wrapper (i.e. after the footer), BEFORE `<AuthDialog />`/`<Omnisearch />`/`<DiceRoller />` — exactly as specified.

## Constraints verified

- `bun run lint` → **0 errors** (exit 0).
- `bunx tsc --noEmit` → **0 errors in `src/`** (only pre-existing error in `skills/stock-analysis-skill/src/analyzer.ts`, unrelated).
- No data seeding performed.
- `'use client'` directive present on `scroll-to-top.tsx` and on `profile.tsx` (unchanged from before).
- Existing Profile tabs (`profile`, `characteristics`, `relations`) and all other sections continue to work — only the `InventorySection` was replaced.
- Dev server: `✓ Compiled in 170ms` / `200` / `227ms` etc. in `dev.log` after the edits. Home `GET /` → 200. Pre-existing `/api/lab` 500 (DATABASE_URL not configured with postgres protocol) is unrelated to this task.

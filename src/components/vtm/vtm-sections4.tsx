"use client";

// ============================================================
// Секции: УЗЫ — Кровные узы, Котерия, Долги престации,
// Убеждения и Якоря, Торпор. «Схема связей» ночного общества.
// Источники: V5 Corebook p.233–241, 314–315; Companion p.31–39;
// Gehenna War p.44; In Memoriam p.20–21; Player's Guide p.173, 179–189.
// ============================================================

import { useState } from "react";
import { toast } from "sonner";
import {
  VtmSheetData,
  VtmBondEntry,
  VtmCoterieMember,
  VtmBoonEntry,
  VtmConvictionEntry,
  VtmConditionEntry,
  CLANS,
  SECTS,
  ADVANTAGE_LIBRARY,
} from "@/lib/vtm-data";
import { DerivedStats } from "@/lib/vtm-calc";
import { vtmUid } from "@/lib/vtm-id";
import { CONDITIONS, CONDITION_BY_ID, CONDITION_CATEGORIES } from "@/lib/vtm-cheatsheet";

// ---------- Небольшие помощники интерфейса ----------

function PanelHead({ title, hint, count }: { title: string; hint?: string; count?: string | number }) {
  return (
    <div className="vtm-panel-head">
      <span className="vtm-label text-[0.81rem] text-[#d6a840]">{title}</span>
      {count !== undefined && (
        <span className="vtm-hint !text-[0.73rem] ml-auto">{count}</span>
      )}
      {hint && <span className="vtm-hint !text-[0.73rem] ml-auto sr-only">{hint}</span>}
    </div>
  );
}

const stageLabels = ["—", "Влюблённость", "Преданность", "Рабство"];

const bondKindLabels: Record<VtmBondEntry["kind"], string> = {
  vampire: "Сородич",
  ghoul: "Гуль",
  mortal: "Смертный",
};

const bondDirectionLabels: Record<VtmBondEntry["direction"], string> = {
  regard: "ты пил его кровь",
  regarded: "он пил твою",
};

// ============================================================
// 1. КРОВНЫЕ УЗЫ / ВИНКУЛУМ
// ============================================================

function BondCard({
  bond,
  onChange,
  onRemove,
}: {
  bond: VtmBondEntry;
  onChange: (patch: Partial<VtmBondEntry>) => void;
  onRemove: () => void;
}) {
  const isVinculum = bond.vinculum !== undefined;
  return (
    <div className={`vtm-bond-card ${isVinculum ? "is-vinculum" : ""} ${bond.stage === 3 ? "is-slave" : ""}`}>
      <div className="vtm-bond-head">
        <input
          className="vtm-input vtm-bond-name"
          value={bond.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="имя связанного"
          aria-label="Имя связанного"
        />
        <button
          onClick={onRemove}
          className="vtm-btn vtm-btn-ghost !py-1 !px-2 text-xs"
          title="Снять узы"
          aria-label="Удалить запись об узах"
        >
          ✕
        </button>
      </div>
      <div className="vtm-bond-grid">
        <label className="vtm-mini-field">
          <span className="vtm-mini-label">Тип</span>
          <select
            className="vtm-input"
            value={bond.kind}
            onChange={(e) => onChange({ kind: e.target.value as VtmBondEntry["kind"] })}
          >
            <option value="vampire">Сородич</option>
            <option value="ghoul">Гуль</option>
            <option value="mortal">Смертный</option>
          </select>
        </label>
        <label className="vtm-mini-field">
          <span className="vtm-mini-label">Направление</span>
          <select
            className="vtm-input"
            value={bond.direction}
            onChange={(e) => onChange({ direction: e.target.value as VtmBondEntry["direction"] })}
          >
            <option value="regard">ты пил его кровь</option>
            <option value="regarded">он пил твою</option>
          </select>
        </label>
        <label className="vtm-mini-field">
          <span className="vtm-mini-label">Стадия</span>
          <select
            className="vtm-input"
            value={isVinculum ? "99" : String(bond.stage)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "99") {
                onChange({ vinculum: bond.vinculum ?? 5, stage: 99 });
              } else {
                onChange({ stage: parseInt(v, 10), vinculum: undefined });
              }
            }}
          >
            <option value="0">— нет уз</option>
            <option value="1">Stage 1 · Влюблённость</option>
            <option value="2">Stage 2 · Преданность</option>
            <option value="3">Stage 3 · Рабство</option>
            <option value="99">Винкулум (Саббат)</option>
          </select>
        </label>
        {isVinculum && (
          <label className="vtm-mini-field">
            <span className="vtm-mini-label">Рейтинг 1–10</span>
            <input
              type="number"
              min={1}
              max={10}
              className="vtm-input"
              value={bond.vinculum}
              onChange={(e) => onChange({ vinculum: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)) })}
            />
          </label>
        )}
      </div>
      <input
        className="vtm-input vtm-bond-note"
        value={bond.note}
        onChange={(e) => onChange({ note: e.target.value })}
        placeholder="как сложились узы, когда последняя капля, чем грозит"
        aria-label="Заметка об узах"
      />
      <div className="vtm-bond-stagebar">
        {!isVinculum ? (
          [1, 2, 3].map((s) => (
            <span key={s} className={`vtm-bond-pip ${bond.stage >= s ? "filled" : ""}`} title={stageLabels[s]}>
              {s}
            </span>
          ))
        ) : (
          <span className="vtm-bond-vinculum-tag">
            Винкулум {bond.vinculum}/10 — {bond.vinculum! >= 8 ? "предан" : bond.vinculum! >= 5 ? "лоялен" : bond.vinculum! >= 2 ? "симпатия" : "безразличие"}
          </span>
        )}
      </div>
    </div>
  );
}

function BondsBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (d: VtmSheetData) => void) => void;
}) {
  const add = () => {
    const bond: VtmBondEntry = {
      id: vtmUid("bond"),
      name: "",
      kind: "vampire",
      direction: "regard",
      stage: 1,
      note: "",
    };
    mutate((d) => {
      if (!d.bonds) d.bonds = [];
      d.bonds.push(bond);
    });
  };
  const bonds = data.bonds ?? [];
  const thralls = bonds.filter((b) => b.direction === "regarded").length;
  const regnant = bonds.filter((b) => b.direction === "regard" && b.stage >= 2).length;
  return (
    <section className="vtm-panel vtm-uz-panel" aria-label="Кровные узы">
      <PanelHead title="🩸 Кровные узы / Винкулум" count={`${bonds.length} · подчинённых ${thralls} · зависим ${regnant}`} />
      <div className="p-3 md:p-4 space-y-3">
        <p className="vtm-hint !text-[0.75rem]">
          Три глотка витэ за три разные ночи — и Сородич связан. Stage 1 влюблённость, Stage 2 преданность (тратит Волю против), Stage 3 рабство (Доминирование без взгляда, иммунитет к чужим узам). Узы слабеют на стадию в месяц без новой порции. Винкулум — асимметричный рейтинг Саббата 1–10, не тает со временем.
        </p>
        {bonds.length === 0 ? (
          <p className="vtm-hint text-center py-4">
            Никто не пил твоей крови — и ты не пил чужой. Пока что.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto vtm-scroll pr-1">
            {bonds.map((b) => (
              <BondCard
                key={b.id}
                bond={b}
                onChange={(patch) =>
                  mutate((d) => {
                    const t = d.bonds?.find((x) => x.id === b.id);
                    if (t) Object.assign(t, patch);
                  })
                }
                onRemove={() =>
                  mutate((d) => {
                    d.bonds = (d.bonds ?? []).filter((x) => x.id !== b.id);
                  })
                }
              />
            ))}
          </div>
        )}
        <button onClick={add} className="vtm-btn vtm-btn-add w-full">
          + Добавить узы
        </button>
      </div>
    </section>
  );
}

// ============================================================
// 2. КОТЕРИЯ
// ============================================================

const coterieTypeLabels: { id: string; label: string }[] = [
  { id: "", label: "— без устава" },
  { id: "camarilla", label: "Камарилья" },
  { id: "anarch", label: "Анархи" },
  { id: "sabbat", label: "Саббат" },
  { id: "autarkis", label: "Автаркия" },
  { id: "cult", label: "Культ" },
];

const tieKindLabels: { id: string; label: string; hint: string }[] = [
  { id: "", label: "— без кровной связи", hint: "Связь держится на слове или общем деле." },
  { id: "sense", label: "Кровное чутьё", hint: "Чуешь свою родословную в чужой крови." },
  { id: "influence", label: "Кровное влияние", hint: "+1/+2 кости к ментальным Дисциплинам против Сородичей своего клана." },
  { id: "sins", label: "Грехи отца", hint: "Диаблери над родной кровью не оставляет след." },
];

// Клановые достоинства котерии (cc_*)
const CLAN_COTERIE_MERITS = ADVANTAGE_LIBRARY.filter((a) => a.group === "Клановые котерии");

function CoterieBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (d: VtmSheetData) => void) => void;
}) {
  const c = data.coterie ?? { name: "", type: "", tieKind: "", tieNote: "", clanMerit: "", members: [] };
  const members = c.members ?? [];
  const set = (patch: Partial<typeof c>) =>
    mutate((d) => {
      if (!d.coterie) d.coterie = { name: "", type: "", tieKind: "", tieNote: "", clanMerit: "", members: [] };
      Object.assign(d.coterie, patch);
    });

  const addMember = () => {
    const m: VtmCoterieMember = { id: vtmUid("cot"), name: "", clan: "", role: "" };
    set({ members: [...members, m] });
  };

  return (
    <section className="vtm-panel vtm-uz-panel" aria-label="Котерия">
      <PanelHead title="🌙 Котерия" count={`${members.length} в стае`} />
      <div className="p-3 md:p-4 space-y-3">
        <p className="vtm-hint !text-[0.75rem]">
          Стая-связка Сородичей: общее дело, общая опасность, общий враг. Кровная связь (Blood Tie) — общее достоинство по кровной линии; клановое достоинство котерии доступно раз за сессию любому, если в стае есть носитель клана.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="vtm-mini-field">
            <span className="vtm-mini-label">Имя котерии</span>
            <input
              className="vtm-input"
              value={c.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="«Алые Шипы», «Тайный Двор»…"
              aria-label="Имя котерии"
            />
          </label>
          <label className="vtm-mini-field">
            <span className="vtm-mini-label">Устав / тип</span>
            <select
              className="vtm-input"
              value={c.type}
              onChange={(e) => set({ type: e.target.value as typeof c.type })}
            >
              {coterieTypeLabels.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="vtm-mini-field">
            <span className="vtm-mini-label">Кровная связь</span>
            <select
              className="vtm-input"
              value={c.tieKind}
              onChange={(e) => set({ tieKind: e.target.value as typeof c.tieKind })}
            >
              {tieKindLabels.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="vtm-mini-field">
            <span className="vtm-mini-label">Клановое достоинство</span>
            <select
              className="vtm-input"
              value={c.clanMerit}
              onChange={(e) => set({ clanMerit: e.target.value })}
            >
              <option value="">— нет</option>
              {CLAN_COTERIE_MERITS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="vtm-mini-field block">
          <span className="vtm-mini-label">Что связывает стаю</span>
          <input
            className="vtm-input"
            value={c.tieNote}
            onChange={(e) => set({ tieNote: e.target.value })}
            placeholder="клятва у одного огня, общая охота, кровь одного сира…"
            aria-label="Что связывает котерию"
          />
        </label>

        {/* Состав котерии */}
        <div className="vtm-coterie-roster">
          <div className="flex items-center justify-between">
            <span className="vtm-label text-[0.78rem] text-[#c4ac9d]">Состав стаи</span>
            <button onClick={addMember} className="vtm-btn vtm-btn-ghost !py-1 !px-2 text-xs">
              + Сородич
            </button>
          </div>
          {members.length === 0 ? (
            <p className="vtm-hint text-center py-3">Стая пуста. Даже Сородичу тяжело в одиночку.</p>
          ) : (
            <div className="space-y-2 mt-2 max-h-80 overflow-y-auto vtm-scroll pr-1">
              {members.map((m) => (
                <div key={m.id} className="vtm-coterie-row">
                  <input
                    className="vtm-input vtm-coterie-name"
                    value={m.name}
                    placeholder="имя Сородича"
                    aria-label="Имя члена котерии"
                    onChange={(e) =>
                      set({ members: members.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) })
                    }
                  />
                  <select
                    className="vtm-input vtm-coterie-clan"
                    value={m.clan}
                    aria-label="Клан члена котерии"
                    onChange={(e) =>
                      set({ members: members.map((x) => (x.id === m.id ? { ...x, clan: e.target.value } : x)) })
                    }
                  >
                    <option value="">— клан</option>
                    {CLANS.map((cl) => (
                      <option key={cl.id} value={cl.id}>{cl.name}</option>
                    ))}
                  </select>
                  <input
                    className="vtm-input vtm-coterie-role"
                    value={m.role}
                    placeholder="роль"
                    aria-label="Роль в котерии"
                    onChange={(e) =>
                      set({ members: members.map((x) => (x.id === m.id ? { ...x, role: e.target.value } : x)) })
                    }
                  />
                  {c.type === "sabbat" && (
                    <input
                      type="number"
                      min={0}
                      max={10}
                      className="vtm-input vtm-coterie-vinculum"
                      value={m.vinculum ?? 0}
                      placeholder="вин."
                      title="Винкулум этого члена к персонажу (1–10)"
                      aria-label="Винкулум"
                      onChange={(e) =>
                        set({
                          members: members.map((x) =>
                            x.id === m.id
                              ? { ...x, vinculum: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) }
                              : x,
                          ),
                        })
                      }
                    />
                  )}
                  <button
                    onClick={() => set({ members: members.filter((x) => x.id !== m.id) })}
                    className="vtm-btn vtm-btn-ghost !py-1 !px-2 text-xs"
                    title="Убрать из котерии"
                    aria-label="Убрать члена котерии"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// 3. ДОЛГИ ПРЕСТАЦИИ
// ============================================================

const boonKindLabels: Record<VtmBoonEntry["kind"], string> = {
  trivial: "Тривиальный",
  minor: "Малый",
  major: "Большой",
  life: "Жизнь",
  blood: "Кровавый (V20)",
};

const boonStatusLabels: Record<VtmBoonEntry["status"], string> = {
  open: "открыт",
  paid: "выплачен",
  broken: "нарушен",
};

function BoonsBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (d: VtmSheetData) => void) => void;
}) {
  const [draft, setDraft] = useState<Partial<VtmBoonEntry>>({ kind: "minor", direction: "owing", party: "", status: "open", note: "" });

  const boons = data.boons ?? [];
  const owed = boons.filter((b) => b.direction === "owed" && b.status === "open").length;
  const owing = boons.filter((b) => b.direction === "owing" && b.status === "open").length;

  const add = () => {
    const party = (draft.party ?? "").trim();
    if (!party) {
      toast.error("Укажи, с кем долг");
      return;
    }
    const boon: VtmBoonEntry = {
      id: vtmUid("boon"),
      kind: (draft.kind as VtmBoonEntry["kind"]) || "minor",
      direction: (draft.direction as VtmBoonEntry["direction"]) || "owing",
      party,
      status: (draft.status as VtmBoonEntry["status"]) || "open",
      note: draft.note ?? "",
      date: new Date().toLocaleDateString("ru-RU"),
    };
    mutate((d) => {
      if (!d.boons) d.boons = [];
      d.boons.unshift(boon);
    });
    setDraft({ kind: "minor", direction: "owing", party: "", status: "open", note: "" });
  };

  return (
    <section className="vtm-panel vtm-uz-panel" aria-label="Долги престации">
      <PanelHead title="📜 Долги престации" count={`тебе должны ${owed} · ты должен ${owing}`} />
      <div className="p-3 md:p-4 space-y-3">
        <p className="vtm-hint !text-[0.75rem]">
          Одолжение между Сородичами — сверхъестественно обязывающее: Тривиальный / Малый / Большой / Жизнь (V20 помнит Кровавый долг — доля витэ). Долг переходит к сиру или старшему чаду после Конечной Смерти владельца; владелец держит +1 кость в социальном бою против должника даже после уплаты. Учитывают Гарпии.
        </p>

        {/* Форма добавления */}
        <div className="vtm-boon-form">
          <select
            className="vtm-input"
            value={draft.direction}
            onChange={(e) => setDraft({ ...draft, direction: e.target.value as VtmBoonEntry["direction"] })}
            aria-label="Направление долга"
          >
            <option value="owing">ты должен</option>
            <option value="owed">тебе должны</option>
          </select>
          <select
            className="vtm-input"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as VtmBoonEntry["kind"] })}
            aria-label="Тип долга"
          >
            {(Object.keys(boonKindLabels) as VtmBoonEntry["kind"][]).map((k) => (
              <option key={k} value={k}>{boonKindLabels[k]}</option>
            ))}
          </select>
          <input
            className="vtm-input vtm-boon-party"
            value={draft.party ?? ""}
            onChange={(e) => setDraft({ ...draft, party: e.target.value })}
            placeholder="имя Сородича"
            aria-label="Имя стороны долга"
          />
          <button onClick={add} className="vtm-btn vtm-btn-add">
            + Записать
          </button>
        </div>

        {/* Журнал */}
        {boons.length === 0 ? (
          <p className="vtm-hint text-center py-4">Журнал долгов пуст. Гарпии отдыхают.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto vtm-scroll pr-1">
            {boons.map((b) => (
              <div key={b.id} className={`vtm-boon-row ${b.direction} ${b.status}`}>
                <div className="vtm-boon-main">
                  <span className={`vtm-boon-kind ${b.kind}`}>{boonKindLabels[b.kind]}</span>
                  <span className="vtm-boon-arrow">
                    {b.direction === "owed" ? "⬅ тебе должен" : "ты должен ➡"}
                  </span>
                  <span className="vtm-boon-party">{b.party || "—"}</span>
                  <span className={`vtm-boon-status ${b.status}`}>{boonStatusLabels[b.status]}</span>
                </div>
                {b.note && <p className="vtm-hint !text-[0.72rem] mt-1">{b.note}</p>}
                <div className="vtm-boon-actions">
                  <span className="vtm-hint !text-[0.7rem]">{b.date}</span>
                  {b.status === "open" && (
                    <button
                      onClick={() =>
                        mutate((d) => {
                          const t = d.boons?.find((x) => x.id === b.id);
                          if (t) t.status = "paid";
                        })
                      }
                      className="vtm-btn vtm-btn-ghost !py-0.5 !px-2 text-[0.7rem]"
                    >
                      ✓ выплачен
                    </button>
                  )}
                  <button
                    onClick={() =>
                      mutate((d) => {
                        d.boons = (d.boons ?? []).filter((x) => x.id !== b.id);
                      })
                    }
                    className="vtm-btn vtm-btn-ghost !py-0.5 !px-2 text-[0.7rem]"
                    aria-label="Стерать долг"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// 4. УБЕЖДЕНИЯ И ЯКОРЯ
// ============================================================

function ConvictionsBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (d: VtmSheetData) => void) => void;
}) {
  const add = () => {
    const c: VtmConvictionEntry = {
      id: vtmUid("conv"),
      conviction: "",
      touchstone: "",
      broken: false,
      note: "",
    };
    mutate((d) => {
      if (!d.convictions) d.convictions = [];
      if (d.convictions.length >= 3) {
        toast.warning("Сородич держит 1–3 Убеждения. Лишнее — к Рассказчику.");
        return;
      }
      d.convictions.push(c);
    });
  };
  const list = data.convictions ?? [];
  const brokenCount = list.filter((c) => c.broken).length;

  return (
    <section className="vtm-panel vtm-uz-panel" aria-label="Убеждения и Якоря">
      <PanelHead title="🕯 Убеждения и Якоря" count={`${list.length} · утрачено ${brokenCount}`} />
      <div className="p-3 md:p-4 space-y-3">
        <p className="vtm-hint !text-[0.75rem]">
          Личный код Сородича (1–3 Убеждения), каждое привязано к живому Якорю-смертному. Убеждение снимает 1+ Пятно, когда Запрет хроники нарушен в согласии с ним. Гибель Якоря лишает Убеждения и насылает 2 Пятна; замена — лишь через целую историю горя.
        </p>
        {list.length === 0 ? (
          <p className="vtm-hint text-center py-4">
            Ни кода, ни якоря. Зверь уже точит зубы на твою Человечность.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((c) => (
              <div key={c.id} className={`vtm-conv-card ${c.broken ? "is-broken" : ""}`}>
                <div className="vtm-conv-head">
                  <input
                    className="vtm-input vtm-conv-conviction"
                    value={c.conviction}
                    onChange={(e) =>
                      mutate((d) => {
                        const t = d.convictions?.find((x) => x.id === c.id);
                        if (t) t.conviction = e.target.value;
                      })
                    }
                    placeholder="во что верит (например: «не лги», «защищай своих любой ценой»)"
                    aria-label="Убеждение"
                  />
                  <button
                    onClick={() =>
                      mutate((d) => {
                        d.convictions = (d.convictions ?? []).filter((x) => x.id !== c.id);
                      })
                    }
                    className="vtm-btn vtm-btn-ghost !py-1 !px-2 text-xs"
                    aria-label="Удалить убеждение"
                  >
                    ✕
                  </button>
                </div>
                <div className="vtm-conv-anchor">
                  <span className="vtm-mini-label">⚓ Якорь</span>
                  <input
                    className="vtm-input"
                    value={c.touchstone}
                    onChange={(e) =>
                      mutate((d) => {
                        const t = d.convictions?.find((x) => x.id === c.id);
                        if (t) t.touchstone = e.target.value;
                      })
                    }
                    placeholder="имя живого смертного (или место), что держит это Убеждение"
                    aria-label="Якорь убеждения"
                  />
                </div>
                <div className="vtm-conv-foot">
                  <label className="vtm-conv-toggle">
                    <input
                      type="checkbox"
                      checked={c.broken}
                      onChange={(e) =>
                        mutate((d) => {
                          const t = d.convictions?.find((x) => x.id === c.id);
                          if (t) t.broken = e.target.checked;
                        })
                      }
                    />
                    <span>Якорь утрачен (+2 Пятна, Убеждение снято)</span>
                  </label>
                </div>
                <input
                  className="vtm-input vtm-conv-note"
                  value={c.note}
                  onChange={(e) =>
                    mutate((d) => {
                      const t = d.convictions?.find((x) => x.id === c.id);
                      if (t) t.note = e.target.value;
                    })
                  }
                  placeholder="как был найден, чем дорог, что грозит"
                  aria-label="Заметка об убеждении"
                />
              </div>
            ))}
          </div>
        )}
        {list.length < 3 && (
          <button onClick={add} className="vtm-btn vtm-btn-add w-full">
            + Убеждение
          </button>
        )}
      </div>
    </section>
  );
}

// ============================================================
// 5. ТОРПОР
// ============================================================

// Длительность торпора по Человечности (V5 Corebook p.241)
const TORPOR_DURATION: Record<number, string> = {
  10: "не входит в торпор",
  9: "3 дня",
  8: "1 неделя",
  7: "2 недели",
  6: "1 месяц",
  5: "1 год",
  4: "1 десятилетие",
  3: "5 десятилетий",
  2: "1 век",
  1: "5 веков",
  0: "Вассал — Зверь окончательно победил",
};

function TorporBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (d: VtmSheetData) => void) => void;
}) {
  const tp = data.torpor ?? { inTorpor: false, since: "", humanity: data.trackers.humanity, note: "" };
  const duration = TORPOR_DURATION[tp.humanity] ?? "—";

  return (
    <section className="vtm-panel vtm-uz-panel" aria-label="Торпор">
      <PanelHead title="⚰ Торпор" />
      <div className="p-3 md:p-4 space-y-3">
        <p className="vtm-hint !text-[0.75rem]">
          «Мёртв для мира»: не Конечная Смерть, но и не жизнь — труп без реакции, ждущий срока по Человечности. Три пути в: провал Испытания Крови при Голоде 5; полное Тяжёлое Здоровье; добровольно. Будит: срок истёк + жертва рядом (довести Голод до 4); либо витэ от Сородича с большей Силой Крови. В торпоре Сила Крови падает на 1 за 50 лет.
        </p>
        <label className="vtm-torpor-toggle">
          <input
            type="checkbox"
            checked={tp.inTorpor}
            onChange={(e) =>
              mutate((d) => {
                if (!d.torpor) d.torpor = { inTorpor: false, since: "", humanity: d.trackers.humanity, note: "" };
                d.torpor.inTorpor = e.target.checked;
                if (e.target.checked && !d.torpor.since) {
                  d.torpor.since = new Date().toLocaleDateString("ru-RU");
                  d.torpor.humanity = d.trackers.humanity;
                }
              })
            }
          />
          <span className={tp.inTorpor ? "text-[#c22b30]" : ""}>
            {tp.inTorpor ? "В торпоре — Сородич спит мёртвым сном" : "Бодрствует — ночь зовёт"}
          </span>
        </label>
        {tp.inTorpor && (
          <div className="vtm-torpor-detail">
            <div className="grid grid-cols-2 gap-3">
              <label className="vtm-mini-field">
                <span className="vtm-mini-label">С какого числа</span>
                <input
                  className="vtm-input"
                  value={tp.since}
                  onChange={(e) =>
                    mutate((d) => {
                      if (!d.torpor) d.torpor = { inTorpor: true, since: "", humanity: d.trackers.humanity, note: "" };
                      d.torpor.since = e.target.value;
                    })
                  }
                  placeholder="дд.мм.гггг"
                />
              </label>
              <label className="vtm-mini-field">
                <span className="vtm-mini-label">Человечность при уходе</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="vtm-input"
                  value={tp.humanity}
                  onChange={(e) =>
                    mutate((d) => {
                      if (!d.torpor) d.torpor = { inTorpor: true, since: "", humanity: d.trackers.humanity, note: "" };
                      d.torpor.humanity = Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0));
                    })
                  }
                />
              </label>
            </div>
            <p className="vtm-torpor-duration">
              <span className="vtm-mini-label">Срок торпора:</span>{" "}
              <strong className="text-[#d6a840]">{duration}</strong>
            </p>
            <input
              className="vtm-input"
              value={tp.note}
              onChange={(e) =>
                mutate((d) => {
                  if (!d.torpor) d.torpor = { inTorpor: true, since: "", humanity: d.trackers.humanity, note: "" };
                  d.torpor.note = e.target.value;
                })
              }
              placeholder="где лежит тело, кто охраняет, кто ждёт пробуждения"
              aria-label="Заметка о торпоре"
            />
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// ОСНОВНАЯ СЕКЦИЯ «УЗЫ»
// ============================================================

// ============================================================
// ВИЗУАЛЬНАЯ СХЕМА СВЯЗЕЙ (Bonds Graph)
// Радиальный граф: персонаж в центре, его узы по кругу.
// Линии: regard (ты пил его кровь) — красные сплошные,
// regarded (он пил твою) — золотые пунктир, vinculum — фиолет пунктир.
// ============================================================

function BondsGraph({ data }: { data: VtmSheetData }) {
  const bonds = data.bonds ?? [];
  const coterie = data.coterie;
  const selfName = data.info.name?.trim() || "Ты";

  // Собираем узлы: персонаж в центре + участники котерии + узы
  type Node = { id: string; name: string; kind: "self" | "coterie" | "bond"; vinculum?: boolean };
  const nodes: Node[] = [{ id: "self", name: selfName, kind: "self" }];
  const edges: { from: string; to: string; type: "regard" | "regarded" | "vinculum"; label: string }[] = [];

  // Котерия — участники как узлы, связь vinculum к персонажу (для Саббата)
  if (coterie?.members?.length) {
    for (const m of coterie.members) {
      if (!m.name?.trim()) continue;
      const id = m.id;
      nodes.push({ id, name: m.name, kind: "coterie", vinculum: !!m.vinculum });
      if (m.vinculum && m.vinculum >= 1) {
        edges.push({ from: "self", to: id, type: "vinculum", label: `V${m.vinculum}` });
      } else {
        edges.push({ from: "self", to: id, type: "regarded", label: "стая" });
      }
    }
  }

  // Узы — отдельные узлы, рёбра regard/regarded
  for (const b of bonds) {
    if (!b.name?.trim()) continue;
    const id = b.id;
    nodes.push({ id, name: b.name, kind: "bond", vinculum: b.vinculum !== undefined });
    const stageLabel = b.vinculum ? `V${b.vinculum}` : b.stage > 0 ? `S${b.stage}` : "";
    edges.push({
      from: b.direction === "regard" ? "self" : id,
      to: b.direction === "regard" ? id : "self",
      type: b.vinculum ? "vinculum" : b.direction === "regard" ? "regard" : "regarded",
      label: stageLabel,
    });
  }

  // Только узы/котерия без персонажа — показываем заглушку
  const externalNodes = nodes.filter((n) => n.kind !== "self");
  if (externalNodes.length === 0) {
    return (
      <section className="vtm-panel vtm-uz-panel" aria-label="Схема связей">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">🕸 Схема связей</span>
        </div>
        <div className="p-3 md:p-4">
          <div className="vtm-bonds-empty">
            Пока ни уз, ни стаи. Добавь запись выше — и граф оживёт.
          </div>
        </div>
      </section>
    );
  }

  // Радиальное размещение узлов вокруг центра
  const cx = 50; // %
  const cy = 50;
  const radius = 38;
  const placed = externalNodes.map((n, i) => {
    const angle = (i / externalNodes.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...n,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });
  const allNodes = [{ id: "self", name: selfName, kind: "self" as const, x: cx, y: cy }, ...placed];

  // SVG-рёбра: кривые Безье с контрольной точкой, смещённой к центру
  type PlacedNode = (typeof allNodes)[number];
  type EdgePath = {
    from: PlacedNode;
    to: PlacedNode;
    bendX: number;
    bendY: number;
    key: string;
    type: "regard" | "regarded" | "vinculum";
    label: string;
  };
  const nodeById = new Map<string, PlacedNode>(allNodes.map((n) => [n.id, n]));
  const edgePaths: EdgePath[] = [];
  edges.forEach((e, i) => {
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    if (!from || !to) return;
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const bendX = mx + (cx - mx) * 0.25;
    const bendY = my + (cy - my) * 0.25;
    edgePaths.push({ from, to, bendX, bendY, key: `e${i}`, type: e.type, label: e.label });
  });

  return (
    <section className="vtm-panel vtm-uz-panel" aria-label="Схема связей">
      <div className="vtm-panel-head">
        <span className="vtm-label text-[0.81rem] text-[#d6a840]">🕸 Схема связей</span>
        <span className="vtm-hint !text-[0.72rem] ml-auto">{externalNodes.length} связей</span>
      </div>
      <div className="p-3 md:p-4">
        <p className="vtm-hint !text-[0.73rem] mb-3">
          Ты — в центре золотым узлом. <span className="text-[#c22b30]">Красные линии</span> — ты пил его кровь (тянет к нему). <span className="text-[#d6a840]">Золотые пунктиры</span> — он пил твою (твой подданный). <span className="text-[#a877c0]">Фиолетовые</span> — Винкулум.
        </p>
        <div className="vtm-bonds-graph" role="img" aria-label={`Схема связей: ${externalNodes.length} узлов вокруг персонажа`}>
          <svg className="vtm-bonds-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {edgePaths.map((e) => (
              <g key={e.key}>
                <path
                  className={`vtm-bonds-edge ${e.type}`}
                  d={`M ${e.from.x} ${e.from.y} Q ${e.bendX} ${e.bendY} ${e.to.x} ${e.to.y}`}
                />
                {e.label && (
                  <text
                    className="vtm-bonds-edge-label"
                    x={(e.from.x + e.to.x) / 2}
                    y={(e.from.y + e.to.y) / 2 - 0.5}
                  >
                    {e.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
          {allNodes.map((n) => (
            <div
              key={n.id}
              className="vtm-bonds-node"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              title={n.name}
            >
              <div
                className={`vtm-bonds-node-core ${n.kind === "self" ? "self" : n.vinculum ? "vinculum" : ""}`}
              >
                {n.kind === "self" ? "👤" : n.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="vtm-bonds-node-label">{n.name.slice(0, 14)}{n.name.length > 14 ? "…" : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// СТАТУС-ЭФФЕКТЫ (Conditions tracker) — активные состояния сцены.
// Быстрый трекер: выбираешь состояние из каталога → добавляешь →
// видно на листе. Можно деактивировать (active=false) или удалить.
// ============================================================

function ConditionsBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (d: VtmSheetData) => void) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const list = data.conditions ?? [];
  const activeCount = list.filter((c) => c.active).length;

  const addCondition = (condId: string) => {
    const def = CONDITION_BY_ID.get(condId);
    const entry: VtmConditionEntry = {
      id: vtmUid("cond"),
      condId,
      name: def?.name || "Состояние",
      note: def ? `${def.effect}` : "",
      active: true,
    };
    mutate((d) => {
      if (!d.conditions) d.conditions = [];
      if (d.conditions.length >= 15) {
        toast.warning("Не больше 15 активных состояний — очисти старые.");
        return;
      }
      d.conditions.push(entry);
    });
    setShowPicker(false);
  };

  const addCustom = () => {
    const entry: VtmConditionEntry = {
      id: vtmUid("cond"),
      condId: "",
      name: "Своё состояние",
      note: "",
      active: true,
    };
    mutate((d) => {
      if (!d.conditions) d.conditions = [];
      d.conditions.push(entry);
    });
    setShowPicker(false);
  };

  return (
    <section className="vtm-panel vtm-uz-panel" aria-label="Статус-эффекты">
      <div className="vtm-panel-head">
        <span className="vtm-label text-[0.81rem] text-[#d6a840]">⚡ Статус-эффекты</span>
        <span className="vtm-hint !text-[0.72rem] ml-auto">{activeCount} активных · {list.length} всего</span>
      </div>
      <div className="p-3 md:p-4 space-y-3">
        <p className="vtm-hint !text-[0.75rem]">
          Временные состояния сцены: ранен, оглушён, в Френзии, под Узами, опозорен. Добавляй из каталога или своё — и отслеживай, пока действует. Деактивируй, не удаляя, чтобы сохранить историю.
        </p>

        {/* Активные состояния */}
        {list.length === 0 ? (
          <p className="vtm-hint text-center py-4">
            Сородич в порядке. Ни ран, ни Уз, ни Френзии. Пока что.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto vtm-scroll pr-1">
            {list.map((c) => {
              const def = c.condId ? CONDITION_BY_ID.get(c.condId) : null;
              const icon = def?.icon || "•";
              return (
                <div key={c.id} className={`vtm-cond-row ${c.active ? "active" : "inactive"}`}>
                  <button
                    onClick={() =>
                      mutate((d) => {
                        const t = d.conditions?.find((x) => x.id === c.id);
                        if (t) t.active = !t.active;
                      })
                    }
                    className="vtm-cond-toggle"
                    title={c.active ? "Деактивировать" : "Активировать"}
                    aria-label={c.active ? "Деактивировать состояние" : "Активировать состояние"}
                  >
                    <span className="vtm-cond-icon">{icon}</span>
                  </button>
                  <div className="vtm-cond-body">
                    <input
                      className="vtm-input vtm-cond-name"
                      value={c.name}
                      onChange={(e) =>
                        mutate((d) => {
                          const t = d.conditions?.find((x) => x.id === c.id);
                          if (t) t.name = e.target.value;
                        })
                      }
                      placeholder="название состояния"
                      aria-label="Название состояния"
                    />
                    <input
                      className="vtm-input vtm-cond-note"
                      value={c.note}
                      onChange={(e) =>
                        mutate((d) => {
                          const t = d.conditions?.find((x) => x.id === c.id);
                          if (t) t.note = e.target.value;
                        })
                      }
                      placeholder="источник, длительность, детали"
                      aria-label="Заметка о состоянии"
                    />
                  </div>
                  <button
                    onClick={() =>
                      mutate((d) => {
                        d.conditions = (d.conditions ?? []).filter((x) => x.id !== c.id);
                      })
                    }
                    className="vtm-btn vtm-btn-ghost !py-1 !px-2 text-xs"
                    title="Удалить"
                    aria-label="Удалить состояние"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Кнопка добавления */}
        {!showPicker ? (
          <button onClick={() => setShowPicker(true)} className="vtm-btn vtm-btn-add w-full">
            + Добавить состояние
          </button>
        ) : (
          <div className="vtm-cond-picker space-y-3">
            <div className="flex items-center justify-between">
              <span className="vtm-label text-[0.78rem] text-[#c4ac9d]">Выбери из каталога</span>
              <button onClick={() => setShowPicker(false)} className="vtm-btn vtm-btn-ghost !py-1 !px-2 text-xs">
                ✕ закрыть
              </button>
            </div>
            {CONDITION_CATEGORIES.map((cat) => {
              const catConds = CONDITIONS.filter((c) => c.category === cat.id);
              return (
                <div key={cat.id}>
                  <p className="vtm-mini-label mb-1.5">{cat.icon} {cat.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {catConds.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => addCondition(c.id)}
                        className="vtm-btn vtm-btn-ghost !py-1 !px-2 !text-[0.72rem]"
                        title={c.effect}
                      >
                        {c.icon} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <button onClick={addCustom} className="vtm-btn vtm-btn-ghost w-full !text-[0.78rem]">
              + Своё состояние (вручную)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function BondsSection({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (d: VtmSheetData) => void) => void;
}) {
  return (
    <div className="space-y-4">
      <BondsGraph data={data} />
      <ConditionsBlock data={data} mutate={mutate} />
      <ConvictionsBlock data={data} mutate={mutate} />
      <BondsBlock data={data} mutate={mutate} />
      <CoterieBlock data={data} mutate={mutate} />
      <BoonsBlock data={data} mutate={mutate} />
      <TorporBlock data={data} mutate={mutate} />
    </div>
  );
}

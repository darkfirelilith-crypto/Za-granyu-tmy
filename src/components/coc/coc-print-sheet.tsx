"use client";

import { CocSheetData } from "@/lib/coc-data";
import { DerivedStats, skillTotal } from "@/lib/coc-calc";
import { CHARACTERISTICS, LUCK_META, OCCUPATIONS } from "@/lib/coc-data";

/**
 * Печатная версия досье сыщика — имитация машинописного бланка 1920-х.
 * Видна только при печати / сохранении в PDF (управляется @media print в coc.css).
 */
export function CocPrintSheet({ data, derived }: { data: CocSheetData; derived: DerivedStats }) {
  const c = data.characteristics;
  const occName = OCCUPATIONS.find((o) => o.id === data.info.occupation)?.name;
  const half = (n: number) => Math.floor(n / 2);
  const fifth = (n: number) => Math.floor(n / 5);

  const usedSkills = data.skills.filter((s) => skillTotal(s) > 0);
  const bioBlocks: Array<[string, string]> = [
    ["Описание", data.bio.description],
    ["Личностные черты", data.bio.traits],
    ["Идеи и убеждения", data.bio.ideals],
    ["Травмы и шрамы", data.bio.scars],
    ["Значимые люди", data.bio.significant],
    ["Фобии и мании", data.bio.phobias],
    ["Важные места", data.bio.places],
    ["Томы и артефакты", data.bio.tomes],
    ["Встречи с неведомым", data.bio.encounters],
  ].filter(([, v]) => v && v.trim()) as Array<[string, string]>;

  return (
    <div className="coc-print-doc">
      {/* Шапка */}
      <header className="coc-print-head">
        <div className="flex-1">
          <p className="coc-print-over">АРХИВ ХРАНИТЕЛЯ · ОТДЕЛ ОСОБЫХ ДЕЛ</p>
          <h1 className="coc-print-title">Досье сыщика</h1>
          <p className="coc-print-name">{data.info.name || "Безымянный сыщик"}</p>
          <p className="coc-print-line">
            {[occName, data.info.age ? `${data.info.age} лет` : "", data.info.sex, data.info.residence && `место жительства: ${data.info.residence}`, data.info.birthplace && `родом: ${data.info.birthplace}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {data.info.player && <p className="coc-print-line">Игрок: {data.info.player}</p>}
        </div>
        {data.info.portrait && (
          <img src={data.info.portrait} alt="" className="coc-print-portrait" />
        )}
      </header>

      {/* Характеристики */}
      <section className="coc-print-section">
        <h2 className="coc-print-h2">Характеристики</h2>
        <div className="coc-print-grid-9">
          {CHARACTERISTICS.map((m) => {
            const v = Math.max(0, Math.floor(Number(c[m.id]) || 0));
            return (
              <div key={m.id} className="coc-print-cell">
                <span className="coc-print-cell-label">{m.label}</span>
                <span className="coc-print-cell-value">{v}</span>
                <span className="coc-print-cell-sub">½ {half(v)} · ⅕ {fifth(v)}</span>
              </div>
            );
          })}
          <div className="coc-print-cell">
            <span className="coc-print-cell-label">{LUCK_META.label}</span>
            <span className="coc-print-cell-value">{Math.max(0, Math.floor(Number(c.luck) || 0))}</span>
            <span className="coc-print-cell-sub">тратится</span>
          </div>
        </div>
      </section>

      {/* Производные */}
      <section className="coc-print-section">
        <h2 className="coc-print-h2">Производные показатели</h2>
        <div className="coc-print-grid-der">
          <div className="coc-print-cell">
            <span className="coc-print-cell-label">Прочность здоровья</span>
            <span className="coc-print-cell-value">
              {data.trackers.hpCurrent ?? derived.hpMax}
              <small> / {derived.hpMax + (data.trackers.hpBonus || 0)}</small>
            </span>
          </div>
          <div className="coc-print-cell">
            <span className="coc-print-cell-label">Пункты магии</span>
            <span className="coc-print-cell-value">
              {data.trackers.mpCurrent ?? derived.mpMax}
              <small> / {derived.mpMax + (data.trackers.mpBonus || 0)}</small>
            </span>
          </div>
          <div className="coc-print-cell">
            <span className="coc-print-cell-label">Рассудок</span>
            <span className="coc-print-cell-value">
              {data.trackers.sanCurrent ?? derived.sanStart}
              <small> / {derived.sanStart}</small>
            </span>
          </div>
          <div className="coc-print-cell">
            <span className="coc-print-cell-label">Удача</span>
            <span className="coc-print-cell-value">{data.trackers.luckCurrent ?? Math.max(0, Math.floor(Number(c.luck) || 0))}</span>
          </div>
          <div className="coc-print-cell">
            <span className="coc-print-cell-label">Скорость</span>
            <span className="coc-print-cell-value">{derived.mov}</span>
          </div>
          <div className="coc-print-cell">
            <span className="coc-print-cell-label">Бонус к урону</span>
            <span className="coc-print-cell-value">{derived.db}</span>
          </div>
          <div className="coc-print-cell">
            <span className="coc-print-cell-label">Комплекция</span>
            <span className="coc-print-cell-value">{derived.build}</span>
          </div>
        </div>
      </section>

      {/* Навыки */}
      {usedSkills.length > 0 && (
        <section className="coc-print-section">
          <h2 className="coc-print-h2">Навыки</h2>
          <div className="coc-print-skills">
            {usedSkills.map((s) => {
              const v = skillTotal(s);
              return (
                <div key={s.key ?? s.name} className="coc-print-skill">
                  <span className="coc-print-skill-name">
                    {s.isOccupation ? "● " : ""}
                    {s.name}
                    {s.spec?.trim() ? ` (${s.spec.trim()})` : ""}
                  </span>
                  <span className="coc-print-skill-val">
                    {v} <small>(½ {half(v)} · ⅕ {fifth(v)})</small>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="coc-print-note">● — профессиональный навык</p>
        </section>
      )}

      {/* Бой */}
      {data.weapons.length > 0 && (
        <section className="coc-print-section">
          <h2 className="coc-print-h2">Оружие</h2>
          <table className="coc-print-table">
            <thead>
              <tr>
                <th>Оружие</th>
                <th>Навык</th>
                <th>Урон</th>
                <th>Дистанция</th>
                <th>Атаки</th>
                <th>Патроны</th>
                <th>Осечка</th>
              </tr>
            </thead>
            <tbody>
              {data.weapons.map((w) => {
                const state = w.skillKey ? data.skills.find((s) => s.key === w.skillKey) : null;
                const val = state
                  ? skillTotal(state)
                  : Math.max(0, Math.floor(Number(w.customRegular) || 0));
                return (
                  <tr key={w.id}>
                    <td>{w.name}</td>
                    <td>{val}</td>
                    <td>{w.damage}</td>
                    <td>{w.range}</td>
                    <td>{w.attacks}</td>
                    <td>{w.ammo}</td>
                    <td>{w.malfunction}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Имущество и финансы */}
      {(data.gear.length > 0 || data.finance.pocket || data.finance.cash || data.finance.assets) && (
        <section className="coc-print-section">
          <h2 className="coc-print-h2">Имущество и средства</h2>
          {(data.finance.pocket || data.finance.cash || data.finance.assets) && (
            <p className="coc-print-line">
              <b>Средства:</b>
              {data.finance.pocket && ` в кармане ${data.finance.pocket};`}
              {data.finance.cash && ` наличные ${data.finance.cash};`}
              {data.finance.assets && ` имущество ${data.finance.assets}.`}
            </p>
          )}
          {data.gear.length > 0 && (
            <p className="coc-print-line">
              <b>Рюкзак:</b>{" "}
              {data.gear
                .filter((g) => g.name?.trim())
                .map((g) => `${g.name}${g.qty && g.qty !== "1" ? ` ×${g.qty}` : ""}`)
                .join(" · ")}
            </p>
          )}
        </section>
      )}

      {/* Биография */}
      {bioBlocks.length > 0 && (
        <section className="coc-print-section">
          <h2 className="coc-print-h2">Биография</h2>
          {bioBlocks.map(([t, v]) => (
            <p key={t} className="coc-print-bio">
              <b>{t}:</b> {v}
            </p>
          ))}
        </section>
      )}

      {/* Заметки */}
      {data.notes.filter((n) => n.content?.trim() || n.title?.trim()).length > 0 && (
        <section className="coc-print-section">
          <h2 className="coc-print-h2">Заметки расследования</h2>
          {data.notes
            .filter((n) => n.content?.trim() || n.title?.trim())
            .map((n) => (
              <p key={n.id} className="coc-print-bio">
                <b>{n.title || "Без названия"}:</b> {n.content}
              </p>
            ))}
        </section>
      )}

      {/* Подпись Хранителя и круглая печать архива */}
      <div className="coc-print-approve">
        <div className="coc-print-sign">
          <span className="coc-print-sign-name">Подпись Хранителя</span>
          <span className="coc-print-sign-line" aria-hidden="true" />
          <span className="coc-print-sign-hint">Дело заведено и сверено с архивом.</span>
        </div>
        <span className="coc-print-mp">М.П.</span>
        <svg viewBox="0 0 120 120" className="coc-print-seal" aria-hidden="true">
          <circle cx="60" cy="60" r="57" fill="none" stroke="#2f5a3c" strokeWidth="2.4" />
          <circle cx="60" cy="60" r="47" fill="none" stroke="#2f5a3c" strokeWidth="1" />
          <circle cx="60" cy="60" r="27" fill="none" stroke="#2f5a3c" strokeWidth="1" />
          <defs>
            <path id="cocSealTop" d="M 7.5,60 A 52.5,52.5 0 0 1 112.5,60" fill="none" />
            <path id="cocSealBottom" d="M 7.5,60 A 52.5,52.5 0 0 0 112.5,60" fill="none" />
            <path id="cocSealInner" d="M 33,60 A 27,27 0 0 0 87,60" fill="none" />
          </defs>
          <text fill="#2f5a3c" fontSize="8.6" fontFamily="Georgia, serif" letterSpacing="1.6">
            <textPath href="#cocSealTop" startOffset="50%" textAnchor="middle">АРХИВ ХРАНИТЕЛЯ</textPath>
          </text>
          <text fill="#2f5a3c" fontSize="8" fontFamily="Georgia, serif" letterSpacing="1.6">
            <textPath href="#cocSealBottom" startOffset="50%" textAnchor="middle">ОТДЕЛ ОСОБЫХ ДЕЛ</textPath>
          </text>
          <text x="9" y="63.5" fill="#2f5a3c" fontSize="7" textAnchor="middle">★</text>
          <text x="111" y="63.5" fill="#2f5a3c" fontSize="7" textAnchor="middle">★</text>
          {/* Око в центре */}
          <path d="M 46,52 Q 60,38 74,52 Q 60,62 46,52 Z" fill="none" stroke="#2f5a3c" strokeWidth="1.4" />
          <circle cx="60" cy="49.5" r="4" fill="none" stroke="#2f5a3c" strokeWidth="1.1" />
          <circle cx="60" cy="49.5" r="1.6" fill="#2f5a3c" />
          <text fill="#2f5a3c" fontSize="7" fontFamily="Georgia, serif" letterSpacing="0.9">
            <textPath href="#cocSealInner" startOffset="50%" textAnchor="middle">УТВЕРЖДЕНО</textPath>
          </text>
        </svg>
      </div>

      <footer className="coc-print-foot">
        <span>Зов Ктулху · распечатано {new Date().toLocaleDateString("ru-RU")}</span>
        <span className="coc-print-stamp">Секретно</span>
      </footer>
    </div>
  );
}

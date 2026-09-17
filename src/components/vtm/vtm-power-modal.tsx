"use client";

// ============================================================
// Модальные окна Дисциплин:
//  • VtmPowerModal — подробности силы: описание, механика, цена,
//    длительность, пулы, требования, источник + «взять/снять».
//  • VtmDiscInfoModal — правила Дисциплины + полный перечень сил
//    по уровням (клик по силе открывает VtmPowerModal).
// Используется только вкладкой «Дисциплины» VtM-раздела.
// ============================================================

import { useEffect, useRef } from "react";
import type { DisciplineDef, DisciplinePower } from "@/lib/vtm-data";
import { POWER_SYSTEMS } from "@/lib/vtm-discipline-systems";

// ---------- Общая оболочка модального окна ----------

function VtmModalShell({
  title,
  kicker,
  onClose,
  children,
  wide,
}: {
  title: string;
  kicker: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="vtm-pm-overlay" onClick={onClose} role="presentation">
      <div
        className={`vtm-pm-card ${wide ? "vtm-pm-card-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vtm-pm-head">
          <div className="min-w-0">
            <span className="vtm-pm-kicker">{kicker}</span>
            <h3 className="vtm-pm-title">{title}</h3>
          </div>
          <button
            ref={closeRef}
            className="vtm-pm-close"
            onClick={onClose}
            aria-label="Закрыть окно"
            title="Закрыть (Esc)"
          >
            ✕
          </button>
        </div>
        <div className="vtm-pm-body vtm-scroll">{children}</div>
      </div>
    </div>
  );
}

// ---------- Полочка «label: value» ----------

function Shelf({ label, value }: { label: string; value: string }) {
  return (
    <div className="vtm-pm-shelf">
      <span className="vtm-pm-shelf-label">{label}</span>
      <span className="vtm-pm-shelf-value">{value}</span>
    </div>
  );
}

// ---------- Модалка силы ----------

export function VtmPowerModal({
  disc,
  level,
  power,
  chosen,
  canPick,
  xpCost,
  warning,
  onPick,
  onRemove,
  onClose,
}: {
  disc: DisciplineDef;
  level: number;
  power: DisciplinePower;
  chosen: boolean;
  canPick: boolean;
  xpCost: number;
  warning?: string;
  onPick: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  // Механика: из POWER_SYSTEMS (для сил из книги) или из самой записи (для новых)
  const system = POWER_SYSTEMS[`${disc.id}:${power.name}`] || power.system || null;
  const req = power.amalgam
    ? `амальгама: ${power.amalgam}`
    : power.prereq
      ? `требуется: ${power.prereq}`
      : null;

  return (
    <VtmModalShell kicker={`${disc.name} · сила ${level} уровня`} title={power.name} onClose={onClose}>
      <p className="vtm-pm-desc">{power.desc}</p>

      {system && (
        <div className="vtm-pm-system">
          <span className="vtm-pm-system-label">МЕХАНИКА</span>
          <p>{system}</p>
        </div>
      )}

      <div className="vtm-pm-shelves">
        {power.cost && <Shelf label="Цена активации" value={power.cost} />}
        {power.duration && <Shelf label="Длительность" value={power.duration} />}
        {power.dicepool && <Shelf label="Пул костей" value={power.dicepool} />}
        {power.resistance && <Shelf label="Сопротивление" value={power.resistance} />}
        {req && <Shelf label="Требование" value={req} />}
        <Shelf label="Цена опыта" value={`${xpCost} XP (сверься с Рассказчиком)`} />
      </div>

      {power.notes && (
        <p className="vtm-pm-notes">
          <span className="vtm-pm-notes-mark" aria-hidden>✦</span> {power.notes}
        </p>
      )}

      {warning && (
        <p className="vtm-pm-warning" role="note">
          ⚠ {warning}
        </p>
      )}

      {power.source && (
        <p className="vtm-pm-source">
          <span className="vtm-label">Источник:</span> {power.source}
        </p>
      )}

      {canPick && (
        <div className="vtm-pm-actions">
          {chosen ? (
            <button className="vtm-btn vtm-btn-danger" onClick={onRemove}>
              ✕ Снять силу с листа
            </button>
          ) : (
            <button className="vtm-btn vtm-btn-gold" onClick={onPick}>
              ◆ Взять эту силу
            </button>
          )}
          <span className="vtm-pm-actions-hint">
            {chosen
              ? "запись о цене уже в журнале опыта"
              : "запись о цене появится в журнале опыта"}
          </span>
        </div>
      )}
      {!canPick && (
        <p className="vtm-pm-locked" role="note">
          ⚠ Сила недоступна: уровень Дисциплины пока ниже {level}.
        </p>
      )}
    </VtmModalShell>
  );
}

// ---------- Модалка «как работает Дисциплина» ----------

export function VtmDiscInfoModal({
  disc,
  rules,
  onOpenPower,
  onClose,
}: {
  disc: DisciplineDef;
  rules?: string[];
  onOpenPower: (level: number, powerName: string) => void;
  onClose: () => void;
}) {
  const levels = [1, 2, 3, 4, 5].filter((n) => (disc.powers[n] || []).length > 0);
  return (
    <VtmModalShell wide kicker="Правила Дисциплины" title={disc.name} onClose={onClose}>
      <p className="vtm-pm-desc">{disc.description}</p>

      {rules && rules.length > 0 && (
        <div className="vtm-pm-system">
          <span className="vtm-pm-system-label">КАК ОНА РАБОТАЕТ</span>
          <ul className="vtm-pm-rules-list">
            {rules.map((rule, i) => (
              <li key={i}>
                <span aria-hidden>◈</span> {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {levels.map((lvl) => (
          <div key={lvl} className="vtm-pm-lvl-block">
            <span className="vtm-pm-lvl-head">
              <b>{lvl} уровень</b>
              <i aria-hidden>{"◆".repeat(lvl)}{"◇".repeat(5 - lvl)}</i>
            </span>
            <div className="vtm-pm-lvl-powers">
              {(disc.powers[lvl] || []).map((p) => {
                const isAmalgam = !!p.amalgam;
                const hasDetails = !!(POWER_SYSTEMS[`${disc.id}:${p.name}`] || p.system);
                return (
                  <button
                    key={p.name}
                    type="button"
                    className="vtm-pm-power-row"
                    onClick={() => onOpenPower(lvl, p.name)}
                    aria-label={`${p.name}, ${lvl} уровень — подробности`}
                    title={hasDetails ? "Открыть подробности и механику" : "Открыть подробности"}
                  >
                    <span className="vtm-pm-power-name">
                      {isAmalgam && <span className="vtm-pm-amalgam-mark" aria-hidden>⚭</span>}
                      {p.name}
                    </span>
                    <span className="vtm-pm-power-desc">{p.desc}</span>
                    {hasDetails && <span className="vtm-pm-power-go" aria-hidden>▸</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="vtm-pm-foot-hint">
        ⚭ — амальгама (нужен уровень другой Дисциплины). Клик по силе — подробности, механика и цена опыта.
      </p>
    </VtmModalShell>
  );
}

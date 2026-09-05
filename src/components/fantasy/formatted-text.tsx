"use client";

import React from "react";

/**
 * FormattedText — renders plain user text with markdown-style emphasis:
 *
 *   **жирный**  __жирный__   → <strong>
 *   *курсив*    _курсив_     → <em>
 *   ***и то и другое***      → <strong><em>
 *
 * Newlines are preserved (white-space: pre-line).
 *
 * The old implementation chained regular expressions, which broke on a number
 * of perfectly ordinary inputs: emphasis spanning a line break, several spans
 * on one line where the runs had different lengths (`*a **b** c*`), asterisks
 * used as decoration, and `слово_с_подчёркиваниями`, which was silently turned
 * into italics. This parser follows the CommonMark delimiter-run rules instead:
 * a run may open only when it is left-flanking and close only when it is
 * right-flanking, `_` additionally may not do either inside a word, and pairs
 * are matched innermost-first. Output is built as React elements, so user text
 * is never interpolated into HTML.
 */

type Item =
  | { kind: "text"; text: string }
  | { kind: "node"; tag: "strong" | "em"; children: Item[] }
  | { kind: "delim"; char: string; len: number; canOpen: boolean; canClose: boolean };

const PUNCT =
  /[!-\/:-@[-`{-~¡-¿‐-‧‰-⁞«»“”„‘’–—…]/;

const isSpace = (c: string) => c === "" || /\s/.test(c);
const isPunct = (c: string) => c !== "" && PUNCT.test(c);

/** Split the source into text chunks and `*` / `_` delimiter runs. */
function tokenize(src: string): Item[] {
  const items: Item[] = [];
  let buf = "";
  let i = 0;

  const flush = () => {
    if (buf) {
      items.push({ kind: "text", text: buf });
      buf = "";
    }
  };

  while (i < src.length) {
    const ch = src[i];
    if (ch !== "*" && ch !== "_") {
      buf += ch;
      i++;
      continue;
    }
    let len = 1;
    while (i + len < src.length && src[i + len] === ch) len++;

    const prev = i > 0 ? src[i - 1] : "";
    const next = i + len < src.length ? src[i + len] : "";

    // CommonMark flanking rules — what makes `a*b*c` emphasis but `2 * 3 * 4` not.
    const leftFlanking =
      !isSpace(next) && (!isPunct(next) || isSpace(prev) || isPunct(prev));
    const rightFlanking =
      !isSpace(prev) && (!isPunct(prev) || isSpace(next) || isPunct(next));

    const canOpen =
      ch === "*" ? leftFlanking : leftFlanking && (!rightFlanking || isPunct(prev));
    const canClose =
      ch === "*" ? rightFlanking : rightFlanking && (!leftFlanking || isPunct(next));

    flush();
    items.push({ kind: "delim", char: ch, len, canOpen, canClose });
    i += len;
  }
  flush();
  return items;
}

/** Match delimiter runs into strong/em nodes, innermost pair first. */
function pairEmphasis(items: Item[]): Item[] {
  let changed = true;
  while (changed) {
    changed = false;

    for (let ci = 0; ci < items.length && !changed; ci++) {
      const closer = items[ci];
      if (closer.kind !== "delim" || !closer.canClose) continue;

      for (let oi = ci - 1; oi >= 0; oi--) {
        const opener = items[oi];
        if (opener.kind !== "delim") continue;
        if (opener.char !== closer.char || !opener.canOpen) continue;

        // Two delimiters make <strong>, one makes <em>; a run of three
        // resolves to <strong><em> over two passes.
        const use = closer.len >= 2 && opener.len >= 2 ? 2 : 1;
        const node: Item = {
          kind: "node",
          tag: use === 2 ? "strong" : "em",
          children: items.slice(oi + 1, ci),
        };
        opener.len -= use;
        closer.len -= use;

        const replacement: Item[] = [];
        if (opener.len > 0) replacement.push(opener);
        replacement.push(node);
        if (closer.len > 0) replacement.push(closer);

        items.splice(oi, ci - oi + 1, ...replacement);
        changed = true;
        break;
      }
    }
  }

  // Anything still unmatched was never emphasis — put the characters back.
  return items.map((it) =>
    it.kind === "delim"
      ? ({ kind: "text", text: it.char.repeat(it.len) } as Item)
      : it.kind === "node"
        ? ({ ...it, children: pairEmphasis(it.children) } as Item)
        : it
  );
}

function render(items: Item[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  items.forEach((it, i) => {
    if (it.kind === "text") {
      // Merge neighbouring text so `pre-line` sees whole lines.
      const last = out[out.length - 1];
      if (typeof last === "string") out[out.length - 1] = last + it.text;
      else out.push(it.text);
      return;
    }
    if (it.kind === "node") {
      const Tag = it.tag;
      out.push(<Tag key={i}>{render(it.children)}</Tag>);
    }
  });
  return out;
}

/** Exported for tests — turns markdown-ish source into React children. */
export function formatInline(src: string): React.ReactNode[] {
  return render(pairEmphasis(tokenize(src)));
}

function flatten(items: Item[]): string {
  return items
    .map((it) => (it.kind === "text" ? it.text : it.kind === "node" ? flatten(it.children) : ""))
    .join("");
}

/**
 * The same text with the emphasis markers removed and nothing rendered.
 * Use it for truncated previews, `title` attributes and search — anywhere raw
 * `**звёздочки**` would leak into the UI.
 */
export function plainText(src: string | null | undefined): string {
  if (src === null || src === undefined) return "";
  return flatten(pairEmphasis(tokenize(String(src))));
}

export function FormattedText({
  children,
  className,
  as: Comp = "div",
}: {
  children: string | null | undefined;
  className?: string;
  /** element to render — use "span" when the text sits inside a paragraph */
  as?: React.ElementType;
}) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <Comp className={`formatted-text ${className ?? ""}`} style={{ whiteSpace: "pre-line" }}>
      {formatInline(String(children))}
    </Comp>
  );
}

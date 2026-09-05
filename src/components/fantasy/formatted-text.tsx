"use client";

import React from "react";

/**
 * FormattedText — renders text with basic markdown-like formatting:
 * - **bold** → <strong>
 * - *italic* → <em>
 * - __bold__ → <strong>
 * - _italic_ → <em>
 * - Newlines preserved (whitespace-pre-line)
 * - HTML escaped (XSS-safe) before formatting
 *
 * Uses a tokenizer approach (not regex lookbehind) for maximum browser compat.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Bold: **text** or __text__ — must come first (before italic)
  // Use [\s\S] to match across newlines, non-greedy
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([\s\S]+?)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_ — but NOT ** or __ (already handled above)
  // Match single * not followed by *, content, single * not preceded by *
  // Simpler: replace remaining single * pairs and _ pairs
  // Use a loop to handle multiple italic spans on the same line
  html = html.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_\n]+?)_/g, "<em>$1</em>");

  return html;
}

export function FormattedText({
  children,
  className,
}: {
  children: string | null | undefined;
  className?: string;
}) {
  if (!children) return null;
  const html = formatMarkdown(children);
  return (
    <div
      className={className}
      style={{ whiteSpace: "pre-line" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

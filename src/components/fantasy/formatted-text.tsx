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
 * Usage: <FormattedText>{entry.description}</FormattedText>
 * Or: <FormattedText className="text-sm">{text}</FormattedText>
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
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  // Italic: *text* or _text_ (but not inside bold or URLs)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");
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

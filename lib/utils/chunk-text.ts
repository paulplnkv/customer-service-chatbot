interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export function chunkText(
  text: string,
  options?: ChunkOptions
): string[] {
  const chunkSize = options?.chunkSize ?? 1500;
  const overlap = options?.overlap ?? 300;

  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();

  if (normalized.length === 0) return [];
  if (normalized.length <= chunkSize) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      end = findBreakPoint(normalized, start, end);
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) break;

    const chunkLen = end - start;
    const effectiveOverlap = Math.min(overlap, Math.floor(chunkLen / 2));
    start += Math.max(chunkLen - effectiveOverlap, 1);
  }

  return chunks;
}

// Matches: "# Heading", "## Heading", "ALL CAPS LINE", "Heading With Colon:"
// Character class also covers em dash (—, U+2014) and parentheses for headings like
// "EXCLUSIONS (KEY)" or "HANGARKEEPERS COVERAGE — AIRCRAFT SCHEDULE".
const SECTION_HEADING_RE = /^(?:#{1,3}\s+.+|[A-Z][A-Z\s/&()\u2014-]{4,}:?$|[A-Z][A-Za-z\s]+:$)/m;

// Extract the first line of a section if it looks like a heading; returns null otherwise.
function extractHeading(section: string): string | null {
  const firstLine = section.split("\n")[0].trim();
  if (SECTION_HEADING_RE.test(firstLine)) return firstLine;
  return null;
}

export function chunkBySection(
  text: string,
  options?: ChunkOptions
): string[] {
  const chunkSize = options?.chunkSize ?? 1500;
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();

  if (normalized.length === 0) return [];
  if (normalized.length <= chunkSize && !SECTION_HEADING_RE.test(normalized.slice(1))) {
    return [normalized];
  }

  const lines = normalized.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (SECTION_HEADING_RE.test(line) && current.length > 0) {
      const sectionText = current.join("\n").trim();
      if (sectionText.length > 0) sections.push(sectionText);
      current = [line];
    } else {
      current.push(line);
    }
  }

  const lastSection = current.join("\n").trim();
  if (lastSection.length > 0) sections.push(lastSection);

  // Sub-chunk any oversized sections, prepending the section heading to every
  // sub-chunk so each chunk is independently understandable during retrieval.
  const result: string[] = [];
  for (const section of sections) {
    if (section.length <= chunkSize) {
      result.push(section);
    } else {
      const heading = extractHeading(section);
      const subChunks = chunkText(section, options);
      if (heading) {
        result.push(
          ...subChunks.map((chunk, i) =>
            i === 0 ? chunk : `${heading}\n${chunk}`
          )
        );
      } else {
        result.push(...subChunks);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// HTML-based document chunker
// ---------------------------------------------------------------------------
// Splits an HTML string produced by mammoth.convertToHtml() at every
// <h1> / <h2> / <h3> tag boundary, then converts each section to clean
// plain text. This is structurally reliable — section identity comes from
// the document's own heading tags, not from pattern-matching plain text.

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…");
}

function htmlSectionToText(html: string): string {
  let text = html;

  // Tables → "cell1 | cell2 | cell3" per row
  text = text.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row) => {
    const cells: string[] = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let m: RegExpExecArray | null;
    while ((m = cellRe.exec(row)) !== null) {
      const cell = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (cell) cells.push(decodeEntities(cell));
    }
    return cells.length ? cells.join(" | ") + "\n" : "";
  });

  // List items → bullet points
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
    const inner = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return "• " + decodeEntities(inner) + "\n";
  });

  // Block-level elements add newlines
  text = text
    .replace(/<\/(p|div|h[1-6]|ul|ol|thead|tbody|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  // Strip remaining tags, decode entities, normalise whitespace
  return decodeEntities(text.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Chunk an HTML string (from mammoth.convertToHtml) by splitting at every
 * <h1> / <h2> / <h3> opening tag, then converting each section to plain text.
 * Oversized sections are further split with chunkText so no content is lost.
 */
export function chunkHtmlDocument(
  html: string,
  options?: ChunkOptions
): string[] {
  const chunkSize = options?.chunkSize ?? 1500;

  // Split at the start of every heading tag; keep the tag with its section.
  const parts = html.split(/(?=<h[1-3][\s>])/i).filter((s) => s.trim());

  // If there are no headings at all, treat the whole document as one section.
  const sections = parts.length > 0 ? parts : [html];

  const result: string[] = [];

  for (const section of sections) {
    const text = htmlSectionToText(section);
    if (!text) continue;

    if (text.length <= chunkSize) {
      result.push(text);
    } else {
      // Oversized section — sub-chunk with the heading prepended to each piece.
      const heading = text.split("\n")[0].trim();
      const subChunks = chunkText(text, options);
      result.push(
        ...subChunks.map((chunk, i) =>
          i === 0 ? chunk : `${heading}\n${chunk}`
        )
      );
    }
  }

  return result;
}

// ---------------------------------------------------------------------------

function findBreakPoint(text: string, start: number, end: number): number {
  const searchStart = Math.max(end - Math.floor((end - start) * 0.2), start);
  const window = text.slice(searchStart, end);

  // Prefer paragraph break
  const paraBreak = window.lastIndexOf("\n\n");
  if (paraBreak !== -1) return searchStart + paraBreak + 2;

  // Then sentence break
  const sentencePattern = /[.!?]\s/g;
  let lastSentence = -1;
  let match;
  while ((match = sentencePattern.exec(window)) !== null) {
    lastSentence = match.index;
  }
  if (lastSentence !== -1) return searchStart + lastSentence + 2;

  // Then newline
  const newline = window.lastIndexOf("\n");
  if (newline !== -1) return searchStart + newline + 1;

  // Then word boundary
  const space = window.lastIndexOf(" ");
  if (space !== -1) return searchStart + space + 1;

  return end;
}

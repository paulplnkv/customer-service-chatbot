interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export function chunkText(
  text: string,
  options?: ChunkOptions
): string[] {
  const chunkSize = options?.chunkSize ?? 800;
  const overlap = options?.overlap ?? 200;

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
const SECTION_HEADING_RE = /^(?:#{1,3}\s+.+|[A-Z][A-Z\s/&-]{4,}:?$|[A-Z][A-Za-z\s]+:$)/m;

export function chunkBySection(
  text: string,
  options?: ChunkOptions
): string[] {
  const chunkSize = options?.chunkSize ?? 800;
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

  // Sub-chunk any oversized sections with the standard chunker
  const result: string[] = [];
  for (const section of sections) {
    if (section.length <= chunkSize) {
      result.push(section);
    } else {
      result.push(...chunkText(section, options));
    }
  }

  return result;
}

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

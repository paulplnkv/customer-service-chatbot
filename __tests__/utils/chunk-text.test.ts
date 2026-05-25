import { describe, it, expect } from "vitest";
import { chunkText, chunkBySection } from "@/lib/utils/chunk-text";

describe("chunkText", () => {
  it("returns empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns single chunk for short text", () => {
    const text = "This is a short piece of text.";
    const chunks = chunkText(text, { chunkSize: 1000 });
    expect(chunks).toEqual([text]);
  });

  it("splits long text into multiple chunks", () => {
    const text = "Word ".repeat(500); // 2500 chars
    const chunks = chunkText(text, { chunkSize: 500, overlap: 100 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(500);
    }
  });

  it("applies overlap between chunks", () => {
    // Use uniform words so break points are predictable
    const text = "word ".repeat(400); // 2000 chars
    const chunks = chunkText(text, { chunkSize: 500, overlap: 100 });

    expect(chunks.length).toBeGreaterThan(1);

    // With overlap, total character count across chunks should exceed
    // the original text length (because content is repeated in overlap zones)
    const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
    expect(totalChars).toBeGreaterThan(text.trim().length);
  });

  it("prefers paragraph boundaries", () => {
    const text =
      "First paragraph with enough text to fill up space.\n\n" +
      "Second paragraph that continues with more content here.";
    const chunks = chunkText(text, { chunkSize: 60, overlap: 10 });
    // First chunk should end at or near the paragraph break
    expect(chunks[0]).toContain("First paragraph");
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("prefers sentence boundaries", () => {
    const text =
      "First sentence is here. Second sentence follows. Third sentence ends it all. Fourth and final.";
    const chunks = chunkText(text, { chunkSize: 50, overlap: 10 });
    // Chunks should try to end at sentence boundaries
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(50);
    }
  });

  it("handles text with no natural break points", () => {
    const text = "a".repeat(2000);
    const chunks = chunkText(text, { chunkSize: 500, overlap: 100 });
    expect(chunks.length).toBeGreaterThan(1);
    // All content should be covered
    expect(chunks.join("").length).toBeGreaterThanOrEqual(2000);
  });

  it("does not produce fragment chunks when break points create short segments", () => {
    // Sentences that end early relative to chunkSize, causing small chunks
    // that previously triggered overlap-induced fragments like "t governs.", "governs."
    const text =
      "This policy governs. " +
      "The coverage applies to all listed drivers. " +
      "Deductibles vary by plan. " +
      "Contact your agent for details. " +
      "Premium rates are set annually. " +
      "Claims must be filed within thirty days of the incident occurring.";
    const chunks = chunkText(text, { chunkSize: 80, overlap: 50 });

    // No chunk should be a substring tail of another (the fragment bug)
    for (let i = 0; i < chunks.length; i++) {
      for (let j = 0; j < chunks.length; j++) {
        if (i !== j) {
          expect(chunks[i].endsWith(chunks[j])).toBe(false);
        }
      }
    }
  });

  it("uses default options when none provided", () => {
    const text = "Hello world. ".repeat(200); // ~2600 chars
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    // Default chunk size is 800
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(800);
    }
  });
});

describe("chunkBySection", () => {
  it("splits text on heading patterns", () => {
    const text = [
      "# Coverage Types",
      "Liability covers damage to others.",
      "",
      "# Claims Process",
      "Step 1: File the claim.",
    ].join("\n");

    const chunks = chunkBySection(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain("Coverage Types");
    expect(chunks[1]).toContain("Claims Process");
  });

  it("splits on all-caps heading lines", () => {
    const text = [
      "COVERAGE TYPES",
      "Liability covers damage to others.",
      "",
      "CLAIMS PROCESS",
      "Step 1: File the claim.",
    ].join("\n");

    const chunks = chunkBySection(text);
    expect(chunks).toHaveLength(2);
  });

  it("splits on colon-terminated heading lines", () => {
    const text = [
      "Coverage Types:",
      "Liability covers damage to others.",
      "",
      "Claims Process:",
      "Step 1: File the claim.",
    ].join("\n");

    const chunks = chunkBySection(text);
    expect(chunks).toHaveLength(2);
  });

  it("falls back to chunkText for oversized sections", () => {
    const longSection = "# Big Section\n" + "Word ".repeat(500);
    const chunks = chunkBySection(longSection, { chunkSize: 200, overlap: 40 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(200);
    }
  });

  it("returns single chunk for short text with no headings", () => {
    const text = "Short text with no sections.";
    const chunks = chunkBySection(text);
    expect(chunks).toEqual([text]);
  });

  it("returns empty array for empty input", () => {
    expect(chunkBySection("")).toEqual([]);
    expect(chunkBySection("   ")).toEqual([]);
  });
});

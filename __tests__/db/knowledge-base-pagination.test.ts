import { describe, it, expect, vi } from "vitest";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    embed: vi.fn().mockResolvedValue({
      embedding: Array(1536).fill(0.1),
    }),
    embedMany: vi.fn().mockResolvedValue({
      embeddings: [],
    }),
  };
});

import { getPaginatedKnowledgeBaseEntries } from "@/lib/db/knowledge-base";

describe("getPaginatedKnowledgeBaseEntries", () => {
  it("returns entries array and totalCount", async () => {
    const result = await getPaginatedKnowledgeBaseEntries(1, 20);
    expect(result).toHaveProperty("entries");
    expect(result).toHaveProperty("totalCount");
    expect(Array.isArray(result.entries)).toBe(true);
    expect(typeof result.totalCount).toBe("number");
  });

  it("respects pageSize limit", async () => {
    const result = await getPaginatedKnowledgeBaseEntries(1, 2);
    expect(result.entries.length).toBeLessThanOrEqual(2);
  });

  it("entries have correct shape", async () => {
    const result = await getPaginatedKnowledgeBaseEntries(1, 20);
    if (result.entries.length > 0) {
      const entry = result.entries[0];
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("content");
      expect(entry).toHaveProperty("metadata");
      expect(entry).toHaveProperty("createdAt");
    }
  });
});

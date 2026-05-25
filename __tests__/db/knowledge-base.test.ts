import { describe, it, expect, vi } from "vitest";

// Mock the AI SDK's embed function to avoid real API calls
// This returns a deterministic 1536-dimension vector
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    embed: vi.fn().mockResolvedValue({
      embedding: Array(1536).fill(0.1),
    }),
  };
});

import { searchKnowledgeBase } from "@/lib/db/knowledge-base";

describe("RAG retrieval — searchKnowledgeBase", () => {
  it("returns an array (empty if KB not seeded)", async () => {
    const results = await searchKnowledgeBase("What is liability coverage?");
    expect(Array.isArray(results)).toBe(true);
  });

  it("results have correct shape when KB is seeded", async () => {
    const results = await searchKnowledgeBase("auto insurance coverage");

    if (results.length > 0) {
      expect(results[0]).toHaveProperty("content");
      expect(results[0]).toHaveProperty("similarity");
      expect(typeof results[0].content).toBe("string");
      expect(typeof results[0].similarity).toBe("number");
      expect(results[0].similarity).toBeGreaterThan(0);
      expect(results[0].similarity).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty array when similarity threshold is very high", async () => {
    const results = await searchKnowledgeBase(
      "anything",
      5,
      0.99 // nearly impossible threshold
    );
    expect(results).toEqual([]);
  });

  it("respects topK parameter", async () => {
    const results = await searchKnowledgeBase("insurance coverage", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("results are ordered by similarity descending", async () => {
    const results = await searchKnowledgeBase("claims process");

    if (results.length >= 2) {
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(
          results[i].similarity
        );
      }
    }
  });
});

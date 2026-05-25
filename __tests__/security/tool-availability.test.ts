import { describe, it, expect } from "vitest";
import { buildChatTools, customerPolicyTool } from "@/lib/ai/tools";

describe("tool availability", () => {
  it("provides 3 tools for authenticated users", () => {
    const tools = buildChatTools(true);
    const toolNames = Object.keys(tools);
    expect(toolNames).toHaveLength(3);
    expect(toolNames).toContain("searchKnowledgeBase");
    expect(toolNames).toContain("escalateToHuman");
    expect(toolNames).toContain("getCustomerPolicyData");
  });

  it("provides 2 tools for anonymous users", () => {
    const tools = buildChatTools(false);
    const toolNames = Object.keys(tools);
    expect(toolNames).toHaveLength(2);
    expect(toolNames).toContain("searchKnowledgeBase");
    expect(toolNames).toContain("escalateToHuman");
    expect(toolNames).not.toContain("getCustomerPolicyData");
  });

  it("customerPolicyTool rejects unauthenticated access at execution", async () => {
    const result = await customerPolicyTool.execute!(
      { reason: "test" },
      {
        toolCallId: "test",
        messages: [],
        experimental_context: {},
      }
    );
    expect(result).toEqual({
      found: false,
      message: "You must be signed in to access policy data.",
    });
  });
});

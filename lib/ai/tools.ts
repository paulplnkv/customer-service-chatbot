import { tool } from "ai";
import { z } from "zod";
import { searchKnowledgeBase } from "@/lib/db/knowledge-base";
import { getFullCustomerData } from "@/lib/db/pas";

export const knowledgeBaseTool = tool({
  description:
    "Search the Pinnacle Home & Auto Insurance knowledge base for relevant information. Use this tool to answer general questions about insurance topics like coverage types, claims processes, policy terms, and FAQs.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query to find relevant knowledge base entries"),
  }),
  execute: async ({ query }) => {
    const results = await searchKnowledgeBase(query, 7);

    if (results.length === 0) {
      return { found: false, message: "No relevant information found in the knowledge base." };
    }

    return {
      found: true,
      results: results.map((r) => ({
        content: r.content,
        relevance: Math.round(r.similarity * 100) / 100,
      })),
    };
  },
});

export const customerPolicyTool = tool({
  description:
    "Retrieve the authenticated customer's insurance policy data including policies, vehicles, claims, and coverages. Only use this tool when the user asks about their specific policy information, vehicles, claims, or coverage details.",
  inputSchema: z.object({
    reason: z
      .string()
      .describe("Brief description of what policy data the customer is asking about"),
  }),
  execute: async ({ reason }, options) => {
    const context = options.experimental_context as Record<string, unknown> | undefined;
    const userId = typeof context?.userId === "string" ? context.userId : undefined;

    if (!userId) {
      return {
        found: false,
        message: "You must be signed in to access policy data.",
      };
    }

    const data = await getFullCustomerData(userId);

    if (!data) {
      return {
        found: false,
        message: "No customer profile found linked to your account. Please contact support.",
      };
    }

    return {
      found: true,
      data,
    };
  },
});

export const escalateToHumanTool = tool({
  description:
    "Escalate the conversation to a human agent. Use this when the customer explicitly asks to speak with a human, or when the issue is too complex for you to resolve (e.g., policy disputes, billing errors, complex claims). This will show the customer a confirmation prompt.",
  inputSchema: z.object({
    reason: z
      .string()
      .describe(
        "Brief description of why escalation is needed, based on the conversation context"
      ),
  }),
  // No execute function — this is a client-side user-interaction tool.
  // The client will render a confirmation UI and call addToolOutput with the user's choice.
});

export function buildChatTools(isAuthenticated: boolean) {
  return {
    searchKnowledgeBase: knowledgeBaseTool,
    escalateToHuman: escalateToHumanTool,
    ...(isAuthenticated ? { getCustomerPolicyData: customerPolicyTool } : {}),
  };
}

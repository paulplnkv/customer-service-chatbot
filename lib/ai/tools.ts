import { tool } from "ai";
import { z } from "zod";
import { searchKnowledgeBase } from "@/lib/db/knowledge-base";
import { getFullCustomerData, getAllCustomersWithSummary, getPolicyNumbersByUserId } from "@/lib/db/pas";
import { getAllEscalations } from "@/lib/db/escalations";
import { toPolicyView } from "@/lib/pas/policy-view";

export const knowledgeBaseTool = tool({
  description:
    "Search the Sterling Auto Insurance knowledge base for relevant information. Use this tool to answer questions about auto insurance topics like coverage meanings (liability, collision, comprehensive, uninsured motorist, medical payments), deductibles, the claims process and payout timing, how to influence an in-review claim, billing, renewal and reinstatement, and denials and appeals — as well as questions about a specific customer's policy document details such as lienholders/additional interests, named insureds, exclusions, and specific coverage terms written into the policy. When the customer asks about details written into their own policy, ALWAYS call this tool with policyNumber set (obtained from getCustomerPolicyData first). When you already know the customer's policy number, pass it as 'policyNumber' to restrict the search to that specific policy document. Each result includes a 'source' field (e.g. 'STER-AUTO-2026-00100') — cite it when answering.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query to find relevant knowledge base entries"),
    policyNumber: z
      .string()
      .optional()
      .describe(
        "Optional policy number (e.g. 'STER-AUTO-2026-00100') to restrict the search to that specific policy document. Use when the customer asks about details of their own policy."
      ),
  }),
  execute: async ({ query, policyNumber }, options) => {
    const context = options?.experimental_context as Record<string, unknown> | undefined;
    const userId = typeof context?.userId === "string" ? context.userId : undefined;
    const isCustomerFacing = context?.isCustomerFacing === true;

    // Determine which policy numbers this caller is authorised to see.
    // Back-office tools do not set isCustomerFacing, so they get no restriction.
    let allowedPolicyNumbers: string[] | undefined;
    if (isCustomerFacing) {
      allowedPolicyNumbers = userId ? await getPolicyNumbersByUserId(userId) : [];
    }

    const results = await searchKnowledgeBase(query, 7, 0.5, policyNumber, allowedPolicyNumbers);

    if (results.length === 0) {
      return { found: false, message: "No relevant information found in the knowledge base." };
    }

    return {
      found: true,
      results: results.map((r) => ({
        content: r.content,
        relevance: Math.round(r.similarity * 100) / 100,
        source:
          (r.metadata as Record<string, unknown> | null)?.policyNumber ??
          (r.metadata as Record<string, unknown> | null)?.topic ??
          (r.metadata as Record<string, unknown> | null)?.filename ??
          "knowledge base",
      })),
    };
  },
});

export const customerPolicyTool = tool({
  description:
    "Retrieve the authenticated customer's auto insurance policy data including policies, vehicles, claims (with status, amount, payout date and status, and denial reasons), and coverages (structured data). Use this tool when the user asks about their policy number, premium, deductible, vehicles, claim status, when an approved payment will arrive, or coverage limits. This tool does NOT contain lienholders/additional interests or the full policy document text — for those details, call searchKnowledgeBase with the policy number after calling this tool.",
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
    "Escalate the conversation to a human claims/support agent. Use this when the customer explicitly asks to speak with a human, wants to dispute or appeal a denied claim, or when the issue is too complex for you to resolve (e.g., coverage disputes, billing errors, contested claims). This will show the customer a confirmation prompt.",
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

// ---------------------------------------------------------------------------
// Internal (back-office) tools — read real internal data for staff/underwriters.
// These are NOT exposed to the customer-facing assistant.
// ---------------------------------------------------------------------------

export const escalationQueueTool = tool({
  description:
    "Read the escalation queue — conversations the customer assistant routed to a human agent. Use this to answer questions about pending escalations, the queue, or who is waiting for a human.",
  inputSchema: z.object({
    status: z
      .enum(["pending", "all"])
      .optional()
      .describe("Filter by status; defaults to 'pending'."),
  }),
  execute: async ({ status = "pending" }) => {
    const all = await getAllEscalations();
    const filtered =
      status === "all" ? all : all.filter((e) => e.status === "pending");

    return {
      pendingCount: all.filter((e) => e.status === "pending").length,
      total: all.length,
      escalations: filtered.map((e) => ({
        customerName: e.customerName ?? "Anonymous",
        customerEmail: e.customerEmail ?? null,
        reason: e.reason,
        chatSummary: e.chatSummary ?? null,
        status: e.status,
        createdAt: e.createdAt,
      })),
    };
  },
});

export const portfolioTool = tool({
  description:
    "Read the Sterling Auto customer book — every policyholder with their policies, vehicles, claims, premium, and renewal dates. Use this for book snapshots, renewals, open claims across the book, or named-customer lookups.",
  inputSchema: z.object({
    focus: z
      .string()
      .optional()
      .describe(
        "Optional note on what the agent is asking about (e.g. 'renewals', 'open claims', a customer name). The full book is returned regardless."
      ),
  }),
  execute: async () => {
    const customers = await getAllCustomersWithSummary();
    const rows = customers.map(toPolicyView);

    const policyholders = rows.map((r) => ({
      name: r.name,
      kind: r.kind,
      policyNumber: r.policyNumber,
      policyType: r.policyType,
      status: r.activeCount > 0 ? "active" : "inactive",
      premium: r.premium,
      renewalDate: r.renewal,
      insuredObjects: r.insuredObjects,
      claims: r.claims,
      openClaims: r.openClaims,
      limit: r.limit,
    }));

    return {
      summary: {
        policyholders: rows.length,
        totalPremium: rows.reduce((s, r) => s + r.premium, 0),
        totalVehicles: rows.reduce((s, r) => s + r.insuredObjects.length, 0),
        openClaims: rows.reduce((s, r) => s + r.openClaims, 0),
      },
      policyholders,
    };
  },
});

export function buildInternalTools() {
  return {
    getEscalationQueue: escalationQueueTool,
    getPortfolio: portfolioTool,
    searchKnowledgeBase: knowledgeBaseTool,
  };
}

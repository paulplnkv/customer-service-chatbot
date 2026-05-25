import { describe, it, expect, afterEach } from "vitest";
import { createEscalation, getEscalationByConversationId } from "@/lib/db/escalations";
import { db } from "@/db";
import { escalations } from "@/db/schema/escalations";
import { conversations } from "@/db/schema/chat";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// Use a unique prefix so we can clean up reliably
const TEST_PREFIX = "test-esc-" + Date.now();

afterEach(async () => {
  // Clean up all test escalations and conversations created during this run
  await db.execute(
    sql`DELETE FROM ${escalations} WHERE reason LIKE ${TEST_PREFIX + "%"}`
  );
  await db.execute(
    sql`DELETE FROM ${conversations} WHERE title LIKE ${"[TEST] " + TEST_PREFIX + "%"}`
  );
});

async function createTestConversation(): Promise<string> {
  const id = randomUUID();
  await db.insert(conversations).values({
    id,
    anonymousSessionId: "test-session-" + randomUUID(),
    title: "[TEST] " + TEST_PREFIX + " Conversation",
  });
  return id;
}

describe("escalation logic", () => {
  describe("createEscalation", () => {
    it("creates an escalation record with correct fields", async () => {
      const conversationId = await createTestConversation();

      const escalation = await createEscalation({
        conversationId,
        userId: null,
        customerName: "Test User",
        customerEmail: "test@example.com",
        chatSummary: "Customer asked about billing.",
        reason: TEST_PREFIX + " Customer wants to dispute a charge",
      });

      expect(escalation.id).toBeTruthy();
      expect(escalation.conversationId).toBe(conversationId);
      expect(escalation.status).toBe("pending");
      expect(escalation.reason).toContain("Customer wants to dispute a charge");
      expect(escalation.createdAt).toBeDefined();
    });

    it("creates escalation with null optional fields", async () => {
      const conversationId = await createTestConversation();

      const escalation = await createEscalation({
        conversationId,
        userId: null,
        customerName: null,
        customerEmail: null,
        chatSummary: null,
        reason: TEST_PREFIX + " General help request",
      });

      expect(escalation.customerName).toBeNull();
      expect(escalation.customerEmail).toBeNull();
      expect(escalation.chatSummary).toBeNull();
    });
  });

  describe("getEscalationByConversationId", () => {
    it("returns null for conversation with no escalation", async () => {
      const result = await getEscalationByConversationId(randomUUID());
      expect(result).toBeNull();
    });

    it("retrieves created escalation by conversation ID", async () => {
      const conversationId = await createTestConversation();

      const created = await createEscalation({
        conversationId,
        userId: null,
        customerName: "Lookup Test",
        customerEmail: null,
        chatSummary: "Test summary",
        reason: TEST_PREFIX + " Test reason",
      });

      const retrieved = await getEscalationByConversationId(conversationId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.customerName).toBe("Lookup Test");
    });
  });
});

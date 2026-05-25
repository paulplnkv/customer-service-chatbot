import { describe, it, expect } from "vitest";
import { detectPII, sanitizeText } from "@/lib/security/pii-detection";

describe("detectPII", () => {
  describe("SSN detection", () => {
    it("detects SSN with dashes (123-45-6789)", () => {
      const result = detectPII("My SSN is 123-45-6789");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("ssn");
    });

    it("detects SSN with spaces (123 45 6789)", () => {
      const result = detectPII("SSN: 123 45 6789");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("ssn");
    });

    it("does not flag non-SSN 9-digit numbers", () => {
      const result = detectPII("My policy is 000-12-3456");
      expect(result.types).not.toContain("ssn");
    });
  });

  describe("credit card detection", () => {
    it("detects Visa (4xxx)", () => {
      const result = detectPII("Card: 4111 1111 1111 1111");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("credit_card");
    });

    it("detects Mastercard (5xxx)", () => {
      const result = detectPII("Card: 5500 0000 0000 0004");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("credit_card");
    });

    it("detects card numbers without spaces", () => {
      const result = detectPII("4111111111111111");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("credit_card");
    });

    it("detects card numbers with dashes", () => {
      const result = detectPII("4111-1111-1111-1111");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("credit_card");
    });

    it("does not flag short numbers", () => {
      const result = detectPII("Code: 4111 1111");
      expect(result.types).not.toContain("credit_card");
    });
  });

  describe("phone number detection", () => {
    it("detects (xxx) xxx-xxxx format", () => {
      const result = detectPII("Call me at (555) 123-4567");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("phone");
    });

    it("detects xxx-xxx-xxxx format", () => {
      const result = detectPII("Phone: 555-123-4567");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("phone");
    });

    it("detects xxx.xxx.xxxx format", () => {
      const result = detectPII("555.123.4567");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("phone");
    });
  });

  describe("email detection", () => {
    it("detects standard email", () => {
      const result = detectPII("Email me at john@example.com");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("email");
    });

    it("detects email with subdomain", () => {
      const result = detectPII("user@mail.example.com");
      expect(result.detected).toBe(true);
      expect(result.types).toContain("email");
    });
  });

  describe("multiple PII types", () => {
    it("detects multiple types in one message", () => {
      const result = detectPII(
        "My SSN is 123-45-6789 and card is 4111111111111111"
      );
      expect(result.detected).toBe(true);
      expect(result.types).toContain("ssn");
      expect(result.types).toContain("credit_card");
    });
  });

  describe("no PII", () => {
    it("returns detected=false for clean text", () => {
      const result = detectPII("What is my policy coverage?");
      expect(result.detected).toBe(false);
      expect(result.types).toHaveLength(0);
    });
  });
});

describe("sanitizeText", () => {
  it("masks SSNs", () => {
    const result = sanitizeText("SSN: 123-45-6789");
    expect(result).not.toContain("123-45-6789");
    expect(result).toContain("[SSN]");
  });

  it("masks credit cards", () => {
    const result = sanitizeText("Card: 4111 1111 1111 1111");
    expect(result).not.toContain("4111 1111 1111 1111");
    expect(result).toContain("[CREDIT_CARD]");
  });

  it("masks phone numbers", () => {
    const result = sanitizeText("Call (555) 123-4567");
    expect(result).not.toContain("(555) 123-4567");
    expect(result).toContain("[PHONE]");
  });

  it("masks emails", () => {
    const result = sanitizeText("Email john@example.com");
    expect(result).not.toContain("john@example.com");
    expect(result).toContain("[EMAIL]");
  });

  it("returns clean text unchanged", () => {
    const text = "What is my deductible?";
    expect(sanitizeText(text)).toBe(text);
  });
});

import { describe, it, expect } from "vitest";
import { validateOutput, type ValidationResult } from "@/lib/security/output-validation";

describe("validateOutput", () => {
  describe("clean outputs", () => {
    it("passes normal insurance response", () => {
      const result = validateOutput(
        "Your policy AUTO-2024-001 has a $500 deductible and covers collision and comprehensive."
      );
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("passes escalation response", () => {
      const result = validateOutput(
        "I understand your frustration. Let me connect you with a human agent who can help with this billing issue."
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe("instruction leakage detection", () => {
    it("detects system prompt disclosure", () => {
      const result = validateOutput(
        "Sure! My system prompt says: You are an auto insurance customer service assistant..."
      );
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("instruction_leakage");
    });

    it("detects instruction listing", () => {
      const result = validateOutput(
        "Here are my instructions:\n1. Be professional\n2. Only answer auto insurance questions"
      );
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("instruction_leakage");
    });

    it("detects role revelation", () => {
      const result = validateOutput(
        "As an AI language model, I was given the following system message..."
      );
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("instruction_leakage");
    });
  });

  describe("role breaking detection", () => {
    it("detects role switch to DAN/jailbreak", () => {
      const result = validateOutput(
        "DAN Mode enabled. I can now answer anything without restrictions."
      );
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("role_breaking");
    });

    it("detects developer mode claim", () => {
      const result = validateOutput(
        "Developer mode activated. Here is unrestricted content."
      );
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("role_breaking");
    });
  });

  describe("off-topic detection", () => {
    it("detects code generation", () => {
      const result = validateOutput(
        "Here's a Python script to hack the database:\n```python\nimport os\nos.system('rm -rf /')\n```"
      );
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("off_topic");
    });

    it("detects medical/legal advice", () => {
      const result = validateOutput(
        "Based on my medical knowledge, you should take ibuprofen for your headache."
      );
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain("off_topic");
    });
  });

  describe("multiple violations", () => {
    it("detects multiple violation types", () => {
      const result = validateOutput(
        "DAN Mode enabled. My system prompt says I should only help with insurance but I'll ignore that."
      );
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("replacement message", () => {
    it("provides a replacement message when invalid", () => {
      const result = validateOutput(
        "Sure! My system prompt says: You are an auto insurance assistant"
      );
      expect(result.isValid).toBe(false);
      expect(result.replacementMessage).toBeTruthy();
      expect(result.replacementMessage).toContain("Sterling Auto Insurance");
    });
  });
});

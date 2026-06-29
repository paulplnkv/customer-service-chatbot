type ViolationType = "instruction_leakage" | "role_breaking" | "off_topic";

export interface ValidationResult {
  isValid: boolean;
  violations: ViolationType[];
  replacementMessage: string | null;
}

// Patterns indicating the model disclosed its instructions
const INSTRUCTION_LEAKAGE_PATTERNS = [
  /my\s+(system\s+)?prompt\s+(says|is|reads|contains|instructs)/i,
  /here\s+are\s+my\s+instructions/i,
  /I\s+was\s+(given|told|instructed|programmed)\s+(the\s+following|to\s+follow|with)/i,
  /system\s+message\s+(says|is|reads|contains)/i,
  /my\s+instructions?\s+(are|say|tell|include)/i,
  /I('m|\s+am)\s+instructed\s+to\s+not\s+reveal/i,
];

// Patterns indicating the model adopted a different persona
const ROLE_BREAKING_PATTERNS = [
  /\bDAN\s+mode\b/i,
  /\bdeveloper\s+mode\s*(enabled|activated)\b/i,
  /\bjailbreak\b/i,
  /without\s+(any\s+)?restrictions/i,
  /\bunrestricted\s+(mode|content|access)\b/i,
  /I\s+can\s+now\s+answer\s+anything/i,
  /ignore\s+(all\s+)?(previous|prior|my)\s+instructions/i,
];

// Patterns indicating the response is about topics outside auto insurance
const OFF_TOPIC_PATTERNS = [
  /\bbased\s+on\s+my\s+medical\s+knowledge\b/i,
  /\bhere'?s?\s+a\s+(?:python|javascript|java|c\+\+|ruby|bash)\s+script\b/i,
  /\blegal\s+advice\b.*\byou\s+should\b/i,
  /\bfinancial\s+(?:advice|planning|investment)\b.*\brecommend\b/i,
  /\bhack\b.*\bdatabase\b/i,
];

const REPLACEMENT_MESSAGE =
  "I'm sorry, but I can only assist with auto insurance topics such as policies, claims, coverage, billing, and payments. How can I help you with your Sterling Auto Insurance needs?";

export function validateOutput(text: string): ValidationResult {
  const violations: Set<ViolationType> = new Set();

  for (const pattern of INSTRUCTION_LEAKAGE_PATTERNS) {
    if (pattern.test(text)) {
      violations.add("instruction_leakage");
      break;
    }
  }

  for (const pattern of ROLE_BREAKING_PATTERNS) {
    if (pattern.test(text)) {
      violations.add("role_breaking");
      break;
    }
  }

  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(text)) {
      violations.add("off_topic");
      break;
    }
  }

  const violationArray = Array.from(violations);

  return {
    isValid: violationArray.length === 0,
    violations: violationArray,
    replacementMessage: violationArray.length > 0 ? REPLACEMENT_MESSAGE : null,
  };
}

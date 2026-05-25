type PIIType = "ssn" | "credit_card" | "phone" | "email";

export interface PIIDetectionResult {
  detected: boolean;
  types: PIIType[];
  warningMessage: string | null;
}

// SSN: 3 digits (not 000/666/900-999), dash/space, 2 digits, dash/space, 4 digits
const SSN_PATTERN =
  /\b(?!000|666|9\d{2})\d{3}[-\s]\d{2}[-\s]\d{4}\b/g;

// Credit card: 13-19 digits, optionally separated by spaces or dashes
// Covers Visa, Mastercard, Amex, Discover
const CREDIT_CARD_PATTERN =
  /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,7}\b/g;

// Phone: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx
const PHONE_PATTERN =
  /(?:\(\d{3}\)\s?|\b\d{3}[-.])\d{3}[-.]?\d{4}\b/g;

// Email
const EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const PATTERNS: { type: PIIType; pattern: RegExp }[] = [
  { type: "ssn", pattern: SSN_PATTERN },
  { type: "credit_card", pattern: CREDIT_CARD_PATTERN },
  { type: "phone", pattern: PHONE_PATTERN },
  { type: "email", pattern: EMAIL_PATTERN },
];

const TYPE_LABELS: Record<PIIType, string> = {
  ssn: "Social Security Number",
  credit_card: "credit card number",
  phone: "phone number",
  email: "email address",
};

export function detectPII(text: string): PIIDetectionResult {
  const detectedTypes: Set<PIIType> = new Set();

  for (const { type, pattern } of PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      detectedTypes.add(type);
    }
  }

  const types = Array.from(detectedTypes);

  if (types.length === 0) {
    return { detected: false, types: [], warningMessage: null };
  }

  const labels = types.map((t) => TYPE_LABELS[t]);
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;

  return {
    detected: true,
    types,
    warningMessage: `**Warning:** It looks like your message contains a ${list}. Please avoid sharing sensitive personal information in chat. Your message has been processed, but please be careful with personal data.`,
  };
}

export function sanitizeText(text: string): string {
  let sanitized = text;
  // Order matters: SSN before phone (SSN is more specific)
  sanitized = sanitized.replace(SSN_PATTERN, "[SSN]");
  sanitized = sanitized.replace(CREDIT_CARD_PATTERN, "[CREDIT_CARD]");
  sanitized = sanitized.replace(PHONE_PATTERN, "[PHONE]");
  sanitized = sanitized.replace(EMAIL_PATTERN, "[EMAIL]");
  return sanitized;
}

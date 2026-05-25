import { generateText } from "ai";
import { chatModel } from "@/lib/ai/provider";

export type LlmJudgeArgs = {
  /**
   * Description of the criteria the response must satisfy. Will be embedded
   * verbatim into the judge prompt.
   */
  rubric: string;
  /**
   * Structured context the judge will be shown (user message, response, tool
   * calls, etc.). Serialized as JSON.
   */
  context: Record<string, unknown>;
};

export type LlmJudgeResult = {
  /** 1 if the response satisfies the rubric, 0 otherwise. */
  score: number;
  rationale: string;
};

const JUDGE_INSTRUCTIONS = `You are a strict evaluator scoring an AI assistant's response against a single criterion.

Read the criterion carefully. Read the context. Decide whether the response satisfies the criterion.

Respond with EXACTLY ONE JSON object on a single line, no markdown, no commentary:
{"pass": true | false, "rationale": "one or two sentence explanation"}`;

/**
 * Calls Claude with a rubric and context, parses a strict JSON pass/fail verdict,
 * and returns a 0/1 score plus the model's rationale.
 */
export async function llmJudge(args: LlmJudgeArgs): Promise<LlmJudgeResult> {
  const prompt = `${JUDGE_INSTRUCTIONS}

CRITERION:
${args.rubric}

CONTEXT:
${JSON.stringify(args.context, null, 2)}`;

  const result = await generateText({
    model: chatModel,
    prompt,
    temperature: 0,
  });

  const match = result.text.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      score: 0,
      rationale: `judge returned non-JSON output: ${result.text.slice(0, 200)}`,
    };
  }

  try {
    const parsed = JSON.parse(match[0]) as { pass?: boolean; rationale?: string };
    return {
      score: parsed.pass === true ? 1 : 0,
      rationale: parsed.rationale ?? "",
    };
  } catch (err) {
    return {
      score: 0,
      rationale: `judge JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

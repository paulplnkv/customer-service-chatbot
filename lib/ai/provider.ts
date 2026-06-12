import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const azure = createAzure({
  baseURL: "https://a-sve-mn63vpdh-eastus2.cognitiveservices.azure.com/openai",
  apiKey: process.env.AZURE_API_KEY,
});

export const chatModel = anthropic("claude-sonnet-4-6");
export const embeddingModel = azure.embedding("text-embedding-3-small");

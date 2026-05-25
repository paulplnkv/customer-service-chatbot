import { createAzure } from "@ai-sdk/azure";

const azure = createAzure({
  baseURL: "https://a-sve-mn63vpdh-eastus2.cognitiveservices.azure.com/openai",
  apiKey: process.env.AZURE_API_KEY,
});

export const chatModel = azure.chat("gpt-5.4-nano");
export const embeddingModel = azure.embedding("text-embedding-3-small");

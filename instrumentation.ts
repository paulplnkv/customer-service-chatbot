import { registerOTel } from "@vercel/otel";
import { LangfuseSpanProcessor } from "@langfuse/otel";

export function register() {
  registerOTel({
    serviceName: "customer-service-chatbot",
    spanProcessors: [new LangfuseSpanProcessor()],
  });
}

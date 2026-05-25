import { defineConfig } from "vitest/config";
import path from "path";
import { readFileSync } from "fs";

function loadEnvFile(filePath: string): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(filePath, "utf-8")
        .split("\n")
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const idx = line.indexOf("=");
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: loadEnvFile(path.resolve(__dirname, ".env.local")),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

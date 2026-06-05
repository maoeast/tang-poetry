import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Load `.env` and `.env.local` into `process.env`.
 * `.env.local` values take precedence; `.env` values are skipped if already set.
 */
export function loadEnvFiles(): void {
  const projectRoot = path.resolve(__dirname, "..", "..");
  for (const envName of [".env", ".env.local"] as const) {
    try {
      const envPath = path.join(projectRoot, envName);
      const envContent = readFileSync(envPath, "utf8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (envName === ".env.local" || !process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
      // file not found, skip
    }
  }
}

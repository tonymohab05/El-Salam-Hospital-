/**
 * Safe Environment Variable Access Utility
 * Reads environment variables from both Vite (import.meta.env) and Node (process.env)
 * with robust fallbacks and clear error reporting.
 */

export function getEnvVar(key: string, fallback: string = ""): string {
  // 1. Try Vite's import.meta.env (Client / Vite Dev / SSR)
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key] !== undefined) {
      const val = String(import.meta.env[key]).trim();
      if (val) return val;
    }
  } catch {
    // import.meta not accessible
  }

  // 2. Try Node's process.env (Express Server / Node runtime)
  try {
    if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) {
      const val = String(process.env[key]).trim();
      if (val) return val;
    }
  } catch {
    // process not accessible
  }

  return fallback;
}

/**
 * Gets Supabase Configuration safely from environment variables.
 */
export function getSupabaseConfig() {
  const url =
    getEnvVar("VITE_SUPABASE_URL") ||
    getEnvVar("SUPABASE_URL") ||
    "https://acmbkoboruoqnxnswbxl.supabase.co";

  const anonKey =
    getEnvVar("VITE_SUPABASE_ANON_KEY") ||
    getEnvVar("SUPABASE_ANON_KEY") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjbWJrb2JvcnVvcW54bnN3YnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NDA0ODgsImV4cCI6MjEwMDQxNjQ4OH0.fUSMGo_Z9F6ea_sL1i4dXgFOw4TcUhsAUi97POAfaKQ";

  const isConfigured = Boolean(
    url &&
      anonKey &&
      (url.startsWith("http://") || url.startsWith("https://")) &&
      !url.includes("YOUR_SUPABASE") &&
      !url.includes("your-supabase-project")
  );

  if (!isConfigured) {
    console.warn(
      "[Environment Warning] Supabase is not configured or using placeholder credentials. " +
        "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment."
    );
  }

  return { url, anonKey, isConfigured };
}

/**
 * Gets Gemini API Key safely from environment variables.
 */
export function getGeminiApiKey(): string {
  const apiKey =
    getEnvVar("GEMINI_API_KEY") ||
    getEnvVar("VITE_GEMINI_API_KEY");

  if (!apiKey) {
    console.warn(
      "[Environment Warning] Gemini API key is missing. " +
        "Set GEMINI_API_KEY or VITE_GEMINI_API_KEY in your environment to enable AI capabilities."
    );
  }

  return apiKey;
}

/**
 * Gets Application URL safely from environment variables.
 */
export function getAppUrl(): string {
  const appUrl =
    getEnvVar("VITE_APP_URL") ||
    getEnvVar("APP_URL");

  if (appUrl) return appUrl;

  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

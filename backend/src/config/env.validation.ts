const REQUIRED_KEYS = [
  "DATABASE_URL",
  "FRONTEND_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "ALLOWED_LOGIN_EMAIL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_KEYS.filter((key) => typeof config[key] !== "string" || !String(config[key]).trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const port = Number(config.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const sameSite = String(config.COOKIE_SAME_SITE ?? "lax").toLowerCase();
  if (!new Set(["lax", "none"]).has(sameSite)) {
    throw new Error("COOKIE_SAME_SITE must be either lax or none");
  }

  if (config.NODE_ENV === "production") {
    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
      if (String(config[key]).length < 32) {
        throw new Error(`${key} must contain at least 32 characters in production`);
      }
    }

    if (String(config.GOOGLE_CLIENT_ID).startsWith("replace-") || String(config.GOOGLE_CLIENT_SECRET).startsWith("replace-")) {
      throw new Error("Google OAuth credentials must be configured in production");
    }
  }

  return config;
}

export function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function appUrl() {
  return env("NEXT_PUBLIC_APP_URL") || env("APP_URL") || "http://localhost:3000";
}

export function hasSupabase() {
  return Boolean(
    env("NEXT_PUBLIC_SUPABASE_URL") &&
      (env("SUPABASE_SERVICE_ROLE_KEY") || env("NEXT_PUBLIC_SUPABASE_ANON_KEY"))
  );
}

export function hasPaddle() {
  return Boolean(env("PADDLE_API_KEY") && env("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"));
}

export function hasCryptomus() {
  return Boolean(env("CRYPTOMUS_MERCHANT_ID") && env("CRYPTOMUS_API_KEY"));
}

export function hasWhop() {
  return Boolean(env("WHOP_API_KEY") && env("WHOP_COMPANY_ID"));
}

export function hasResend() {
  return Boolean(env("RESEND_API_KEY"));
}

export function paddleSandbox() {
  return env("PADDLE_ENV") !== "production";
}

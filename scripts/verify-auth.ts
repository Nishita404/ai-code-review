import { count, eq } from "drizzle-orm";
import { getDb } from "../src/db/index";
import { user } from "../src/db/schema";

const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const requiredEnvVars = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"] as const;

type CheckResult = {
  name: string;
  passed: boolean;
  detail: string;
};

const results: CheckResult[] = [];

function record(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
  const status = passed ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}: ${detail}`);
}

function parseSetCookie(setCookie: string | null) {
  if (!setCookie) {
    return null;
  }

  const [cookiePair] = setCookie.split(";");
  return cookiePair ?? null;
}

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object") {
    if ("error" in payload && typeof payload.error === "string") {
      return payload.error;
    }

    if ("message" in payload && typeof payload.message === "string") {
      return payload.message;
    }
  }

  return "Unknown error";
}

async function main() {
  console.log("Better Auth end-to-end verification\n");

  for (const envVar of requiredEnvVars) {
    record(
      `Env ${envVar}`,
      Boolean(process.env[envVar]),
      process.env[envVar] ? "configured" : "missing from environment",
    );
  }

  if (requiredEnvVars.some((envVar) => !process.env[envVar])) {
    console.log("\nAdd the missing variables to .env.local, run `bun run db:push`, restart dev server, then rerun this script.");
    process.exit(1);
  }

  const testEmail = `verify-${Date.now()}@example.com`;
  const testPassword = "VerifyAuth123!";
  const testName = "Verify Auth";

  const missingConfigResponse = await fetch(`${baseUrl}/api/auth/get-session`);
  const missingConfigBody = await missingConfigResponse.json().catch(() => null);

  record(
    "Auth API returns JSON errors",
    missingConfigResponse.status === 200 || (missingConfigResponse.status >= 400 && Boolean(missingConfigBody)),
    missingConfigResponse.status === 500 && !missingConfigBody
      ? "received empty 500 response"
      : `status ${missingConfigResponse.status}`,
  );

  const signUpResponse = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
    }),
  });

  const signUpBody = await signUpResponse.json().catch(() => null);
  const signUpCookie = parseSetCookie(signUpResponse.headers.get("set-cookie"));

  record(
    "Sign up",
    signUpResponse.ok,
    signUpResponse.ok ? `created ${testEmail}` : getErrorMessage(signUpBody),
  );

  record(
    "Session cookie on sign up",
    Boolean(signUpCookie),
    signUpCookie ?? "no Set-Cookie header returned",
  );

  let userCount = 0;

  try {
    const db = getDb();
    const [result] = await db.select({ value: count() }).from(user).where(eq(user.email, testEmail));
    userCount = result?.value ?? 0;
  } catch (error) {
    record(
      "User saved in PostgreSQL",
      false,
      error instanceof Error ? error.message : "database query failed",
    );
  }

  if (userCount > 0) {
    record("User saved in PostgreSQL", true, `found ${userCount} row(s) for ${testEmail}`);
  } else if (results.every((result) => result.name !== "User saved in PostgreSQL")) {
    record("User saved in PostgreSQL", false, `no rows found for ${testEmail}`);
  }

  const signInResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  const signInBody = await signInResponse.json().catch(() => null);
  const signInCookie = parseSetCookie(signInResponse.headers.get("set-cookie"));

  record(
    "Sign in",
    signInResponse.ok,
    signInResponse.ok ? `authenticated ${testEmail}` : getErrorMessage(signInBody),
  );

  record(
    "Session cookie on sign in",
    Boolean(signInCookie),
    signInCookie ?? "no Set-Cookie header returned",
  );

  const sessionResponse = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: signInCookie ? { Cookie: signInCookie } : undefined,
  });

  const sessionBody = (await sessionResponse.json().catch(() => null)) as
    | { user?: { email?: string }; session?: { token?: string } }
    | null;

  record(
    "Session readable from API",
    sessionResponse.ok && sessionBody?.user?.email === testEmail,
    sessionBody?.user?.email ? `session user ${sessionBody.user.email}` : getErrorMessage(sessionBody),
  );

  const badSignInResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: testEmail,
      password: "wrong-password",
    }),
  });

  const badSignInBody = await badSignInResponse.json().catch(() => null);

  record(
    "Auth errors are JSON",
    badSignInResponse.status >= 400 && Boolean(getErrorMessage(badSignInBody) !== "Unknown error" || badSignInBody),
    `status ${badSignInResponse.status}, message: ${getErrorMessage(badSignInBody)}`,
  );

  const failed = results.filter((result) => !result.passed);

  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

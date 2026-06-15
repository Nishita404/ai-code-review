import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

function authErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Auth is not configured.";

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { GET: handler } = toNextJsHandler(getAuth());

    return handler(request);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { POST: handler } = toNextJsHandler(getAuth());

    return handler(request);
  } catch (error) {
    return authErrorResponse(error);
  }
}

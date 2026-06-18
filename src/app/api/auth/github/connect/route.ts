import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "GITHUB_CLIENT_ID environment variable is missing. Register a GitHub OAuth App and add it to .env.local." },
        { status: 500 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "connect"; // "connect" or "login"
    
    // Generate secure state to prevent CSRF
    const state = crypto.randomBytes(16).toString("hex") + `_${action}`;

    // Set state in HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("github_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    const redirectUri = new URL("/api/auth/github/callback", request.url).toString();
    
    const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
    githubAuthUrl.searchParams.set("client_id", clientId);
    githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
    githubAuthUrl.searchParams.set("scope", "read:user repo");
    githubAuthUrl.searchParams.set("state", state);

    return NextResponse.redirect(githubAuthUrl.toString());
  } catch (error) {
    console.error("Failed to initiate GitHub connect:", error);
    return NextResponse.json(
      { error: "Internal server error initiating GitHub connection." },
      { status: 500 }
    );
  }
}

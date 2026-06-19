import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { user, githubAccounts, githubRepositories, session as sessionTable } from "@/db/schema";
import { encrypt } from "@/lib/encryption";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    // ─── Validate CSRF State ──────────────────────────────────────────────────
    const cookieStore = await cookies();
    const stateCookie = cookieStore.get("github_oauth_state")?.value;
    
    // Clear the cookie immediately
    cookieStore.delete("github_oauth_state");

    if (!code || !state || !stateCookie || state !== stateCookie) {
      return NextResponse.json(
        { error: "Invalid OAuth state. Request expired or CSRF token mismatch." },
        { status: 400 }
      );
    }

    const action = state.split("_")[1] || "connect"; // "connect" or "login"

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "GitHub client configuration is missing." },
        { status: 500 }
      );
    }

    // ─── Exchange Code for Access Token ────────────────────────────────────────
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.json(
        { error: tokenData.error_description || "Failed to exchange GitHub authorization code." },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;

    // ─── Fetch GitHub User Profile ─────────────────────────────────────────────
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ai-code-review",
      },
    });

    const githubUser = await userResponse.json() as {
      id: number;
      login: string;
      avatar_url: string;
      name?: string;
      email?: string;
    };

    if (!githubUser.id || !githubUser.login) {
      return NextResponse.json(
        { error: "Failed to retrieve user profile from GitHub." },
        { status: 400 }
      );
    }

    // ─── Fetch User Email (Primary & Verified) ─────────────────────────────────
    let userEmail = githubUser.email;
    if (!userEmail) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "ai-code-review",
        },
      });
      if (emailsResponse.ok) {
        const emails = await emailsResponse.json() as {
          email: string;
          primary: boolean;
          verified: boolean;
        }[];
        const primaryEmail = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
        if (primaryEmail) {
          userEmail = primaryEmail.email;
        }
      }
    }
    
    // Fallback if no email is found
    if (!userEmail) {
      userEmail = `${githubUser.login}@github.com`;
    }

    const encryptedToken = encrypt(accessToken);

    // ─── Check Session Integration (Via Better Auth) ─────────────────────────
    const reqHeaders = new Headers();
    // Reconstruct headers for the Better Auth request context
    request.headers.forEach((value, key) => {
      reqHeaders.set(key, value);
    });

    const session = await getAuth()
      .api.getSession({ headers: reqHeaders })
      .catch(() => null);

    const db = getDb();
    let targetUserId: string;

    if (session?.user?.id) {
      // ─── CASE A: Connecting to an existing logged-in session ────────────────
      targetUserId = session.user.id;

      // Check if this GitHub ID is already connected to another user
      const existingConn = await db
        .select()
        .from(githubAccounts)
        .where(eq(githubAccounts.githubId, String(githubUser.id)))
        .limit(1);

      if (existingConn[0] && existingConn[0].userId !== targetUserId) {
        // Disconnect from the old user first (avoid unique constraint error)
        await db.delete(githubAccounts).where(eq(githubAccounts.id, existingConn[0].id));
      }

      // Upsert GitHub Account mapping
      const userAccounts = await db
        .select()
        .from(githubAccounts)
        .where(eq(githubAccounts.userId, targetUserId))
        .limit(1);

      let githubAccountId: string = crypto.randomUUID();

      if (userAccounts[0]) {
        githubAccountId = userAccounts[0].id;
        await db
          .update(githubAccounts)
          .set({
            githubId: String(githubUser.id),
            username: githubUser.login,
            avatar: githubUser.avatar_url,
            encryptedAccessToken: encryptedToken,
            updatedAt: new Date(),
          })
          .where(eq(githubAccounts.id, githubAccountId));
      } else {
        await db.insert(githubAccounts).values({
          id: githubAccountId,
          userId: targetUserId,
          githubId: String(githubUser.id),
          username: githubUser.login,
          avatar: githubUser.avatar_url,
          encryptedAccessToken: encryptedToken,
        });
      }

      // Synchronize repositories
      await syncRepositories(db, githubAccountId, accessToken);

      return NextResponse.redirect(new URL("/dashboard", request.url).toString());
    } else {
      // ─── CASE B: Authenticating / Logging in via GitHub ─────────────────────
      const existingAccount = await db
        .select()
        .from(githubAccounts)
        .where(eq(githubAccounts.githubId, String(githubUser.id)))
        .limit(1);

      if (existingAccount[0]) {
        targetUserId = existingAccount[0].userId;
        
        // Update connection profile and token
        await db
          .update(githubAccounts)
          .set({
            username: githubUser.login,
            avatar: githubUser.avatar_url,
            encryptedAccessToken: encryptedToken,
            updatedAt: new Date(),
          })
          .where(eq(githubAccounts.id, existingAccount[0].id));

        // Sync repos
        await syncRepositories(db, existingAccount[0].id, accessToken);
      } else {
        // User not linked. Check if user with same email exists in "user" table
        const existingUser = await db
          .select()
          .from(user)
          .where(eq(user.email, userEmail))
          .limit(1);

        if (existingUser[0]) {
          targetUserId = existingUser[0].id;
        } else {
          // Register new user
          targetUserId = crypto.randomUUID();
          await db.insert(user).values({
            id: targetUserId,
            name: githubUser.name || githubUser.login,
            email: userEmail,
            emailVerified: true,
            image: githubUser.avatar_url,
          });
        }

        // Create github_accounts record
        const githubAccountId = crypto.randomUUID();
        await db.insert(githubAccounts).values({
          id: githubAccountId,
          userId: targetUserId,
          githubId: String(githubUser.id),
          username: githubUser.login,
          avatar: githubUser.avatar_url,
          encryptedAccessToken: encryptedToken,
        });

        // Sync repos
        await syncRepositories(db, githubAccountId, accessToken);
      }

      // Create session in database directly
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.insert(sessionTable).values({
        id: sessionId,
        token: sessionToken,
        userId: targetUserId,
        expiresAt,
      });

      const response = NextResponse.redirect(new URL("/dashboard", request.url).toString());
      
      // Set the session cookie in response headers
      response.cookies.set("better-auth.session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
      });

      return response;
    }
  } catch (error) {
    console.error("GitHub OAuth Callback failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication Callback failed." },
      { status: 500 }
    );
  }
}

// ─── Repositories Sync Helper ────────────────────────────────────────────────

async function syncRepositories(db: any, githubAccountId: string, accessToken: string) {
  try {
    const reposResponse = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ai-code-review",
      },
    });

    if (!reposResponse.ok) {
      throw new Error(`GitHub repositories API returned status: ${reposResponse.status}`);
    }

    const reposData = await reposResponse.json() as {
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
      description?: string;
      language?: string;
      stargazers_count?: number;
    }[];

    // Delete existing repository sync logs
    await db.delete(githubRepositories).where(eq(githubRepositories.githubAccountId, githubAccountId));

    if (reposData.length > 0) {
      const records = reposData.map((repo) => ({
        id: crypto.randomUUID(),
        githubAccountId,
        repoId: String(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
        htmlUrl: repo.html_url,
        description: repo.description || null,
        language: repo.language || null,
        stars: repo.stargazers_count ?? 0,
      }));

      // Bulk insert
      await db.insert(githubRepositories).values(records);
    }
  } catch (err) {
    console.error("Repository sync warning (non-blocking):", err);
  }
}

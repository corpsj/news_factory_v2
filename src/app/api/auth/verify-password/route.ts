import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SITE_PASSWORD = process.env.SITE_PASSWORD?.trim();
const VALID_TOKEN = "nf2_site_access_granted";

export async function POST(request: Request) {
  try {
    if (!SITE_PASSWORD) {
      console.error("[Auth] SITE_PASSWORD environment variable is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { password } = await request.json();
    const trimmedPassword = password?.trim();

    console.log("[Auth] Password attempt received");
    console.log("[Auth] Password length:", trimmedPassword?.length);
    console.log("[Auth] Expected length:", SITE_PASSWORD.length);

    if (trimmedPassword !== SITE_PASSWORD) {
      console.log("[Auth] Password mismatch");
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    console.log("[Auth] Password verified successfully");

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

    console.log("[Auth] Setting cookie - production:", isProduction);

    cookieStore.set("site_access", VALID_TOKEN, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

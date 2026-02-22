import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SITE_PASSWORD = process.env.SITE_PASSWORD || "2ndlife!kjt";
const VALID_TOKEN = "nf2_site_access_granted";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password !== SITE_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("site_access", VALID_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

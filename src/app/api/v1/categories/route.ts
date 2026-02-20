import { NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/api/rate-limit";
import { withCors, corsPreflightResponse } from "@/lib/api/cors";
import { ARTICLE_CATEGORIES } from "@/types/article";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return withCors(auth);

  const rateLimitResponse = checkRateLimit(auth.client.id);
  if (rateLimitResponse) return withCors(rateLimitResponse);

  const CATEGORY_NAMES: Record<string, string> = {
    press_release: "보도자료",
    economy: "경제",
    politics: "정치",
    society: "사회",
    sports: "스포츠",
    culture: "문화",
    opinion: "오피니언",
    editorial: "사설",
  };

  const categories = ARTICLE_CATEGORIES.map((code) => ({
    code,
    name: CATEGORY_NAMES[code] ?? code,
  }));

  const response = NextResponse.json({ categories });

  for (const [key, value] of Object.entries(getRateLimitHeaders(auth.client.id))) {
    response.headers.set(key, value);
  }

  return withCors(response);
}

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

  const response = NextResponse.json({ categories: [...ARTICLE_CATEGORIES] });

  for (const [key, value] of Object.entries(getRateLimitHeaders(auth.client.id))) {
    response.headers.set(key, value);
  }

  return withCors(response);
}

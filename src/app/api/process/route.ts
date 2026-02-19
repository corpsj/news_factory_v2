import { NextResponse } from "next/server";
import { generateSingleArticle } from "@/lib/ai/batch-generate";

type ProcessRequestBody = {
  press_release_id?: unknown;
};

export async function POST(request: Request) {
  let body: ProcessRequestBody;

  try {
    body = (await request.json()) as ProcessRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pressReleaseId = body?.press_release_id;
  if (typeof pressReleaseId !== "string" || !pressReleaseId.trim()) {
    return NextResponse.json({ error: "press_release_id is required" }, { status: 400 });
  }

  if (!/^[0-9a-f-]{36}$/i.test(pressReleaseId)) {
    return NextResponse.json({ error: "Invalid press_release_id format" }, { status: 400 });
  }

  try {
    const result = await generateSingleArticle(pressReleaseId, undefined, { verbose: false });

    return NextResponse.json({
      success: true,
      press_release_id: result.pressRelease.id,
      title: result.pressRelease.title,
      body: result.pressRelease.content,
      category: "society",
      source: result.pressRelease.source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

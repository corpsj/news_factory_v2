import { NextResponse } from "next/server";
import { executePipeline, isPipelineRunning } from "@/lib/pipeline/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isPipelineRunning()) {
    return NextResponse.json(
      { error: "Pipeline is already running" },
      { status: 409 },
    );
  }

  try {
    const result = await executePipeline({ verbose: true });

    const status = result.success ? 200 : 207;
    return NextResponse.json(
      {
        success: result.success,
        totalDurationMs: result.totalDurationMs,
        stages: result.stages.map((s) => ({
          stage: s.stage,
          status: s.status,
          durationMs: s.durationMs,
          detail: s.detail,
          error: s.errorMessage ?? null,
        })),
      },
      { status },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown pipeline error";
    console.error("Pipeline execution failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

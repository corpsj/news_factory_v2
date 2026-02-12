import type { SupabaseClient } from "@supabase/supabase-js";
import type { PressReleaseForArticleGeneration, RagReference } from "@/types/article";
import { fetchRagContextForPressRelease, type RagContextResult } from "@/lib/ai/rag";

export type EnrichedRagContext = RagContextResult & {
  contextPromptFragment: string;
};

export async function buildRagContext(
  pressRelease: PressReleaseForArticleGeneration,
  client?: SupabaseClient,
): Promise<EnrichedRagContext> {
  const baseResult = await fetchRagContextForPressRelease(pressRelease, client);

  const contextPromptFragment = formatRagPromptFragment(baseResult.references);

  return {
    ...baseResult,
    contextPromptFragment,
  };
}

function formatRagPromptFragment(references: RagReference[]): string {
  if (references.length === 0) {
    return "";
  }

  const header = `관련 보도자료가 ${references.length}건 있으며, 이를 참고하여 종합적 기사를 작성하세요.`;

  const items = references.map(
    (ref, idx) =>
      `[${idx + 1}] "${ref.title}" (${ref.source}, ${ref.published_at})\n   ${ref.content_excerpt}`,
  );

  return `${header}\n\n${items.join("\n\n")}`;
}

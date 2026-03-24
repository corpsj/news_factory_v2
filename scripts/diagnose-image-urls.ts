import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const envPath = resolve(".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=");
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  } catch {}
}

loadEnvLocal();

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

interface Article {
  id: string;
  title: string;
  images: string[];
  created_at: string;
  source: string;
}

function categorizeUrl(url: string): { type: string; issue?: string } {
  if (url.includes('/storage/v1/object/public/press-images/')) {
    return { type: 'supabase_storage' };
  }
  
  if (url.match(/\.go\.kr|\.kr\//)) {
    return { 
      type: 'original_gov',
      issue: '원본 지자체 URL - processImages 실패'
    };
  }
  
  if (url.startsWith('data:')) {
    return { 
      type: 'data_uri',
      issue: 'Data URI 저장됨'
    };
  }
  
  if (!url || url === '' || url === 'null') {
    return { 
      type: 'empty',
      issue: '빈 URL'
    };
  }
  
  return { 
    type: 'other',
    issue: '알 수 없는 URL 패턴'
  };
}

async function main() {
  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  console.log("🔍 이미지 URL 패턴 분석\n");
  console.log("=" .repeat(80));

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, images, created_at, source")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("❌ 기사 조회 실패:", error.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log("📭 저장된 기사가 없습니다.");
    process.exit(0);
  }

  const stats = {
    totalArticles: articles.length,
    articlesWithImages: 0,
    articlesWithoutImages: 0,
    urlTypes: new Map<string, { count: number; examples: string[]; issues: string[] }>(),
    problematicArticles: [] as Array<{ id: string; title: string; source: string; issues: string[] }>
  };

  for (const article of articles as Article[]) {
    const images = article.images as string[];
    
    if (!Array.isArray(images) || images.length === 0) {
      stats.articlesWithoutImages++;
      continue;
    }
    
    stats.articlesWithImages++;
    const articleIssues: string[] = [];
    
    for (const url of images) {
      const { type, issue } = categorizeUrl(url);
      
      if (!stats.urlTypes.has(type)) {
        stats.urlTypes.set(type, { count: 0, examples: [], issues: [] });
      }
      
      const typeStats = stats.urlTypes.get(type)!;
      typeStats.count++;
      
      if (typeStats.examples.length < 3) {
        typeStats.examples.push(url.substring(0, 100) + (url.length > 100 ? '...' : ''));
      }
      
      if (issue && !typeStats.issues.includes(issue)) {
        typeStats.issues.push(issue);
      }
      
      if (issue) {
        articleIssues.push(`${type}: ${issue}`);
      }
    }
    
    if (articleIssues.length > 0) {
      stats.problematicArticles.push({
        id: article.id,
        title: article.title.substring(0, 50),
        source: article.source,
        issues: [...new Set(articleIssues)]
      });
    }
  }

  console.log(`\n📊 전체 통계`);
  console.log(`- 전체 기사: ${stats.totalArticles}개`);
  console.log(`- 이미지 있는 기사: ${stats.articlesWithImages}개`);
  console.log(`- 이미지 없는 기사: ${stats.articlesWithoutImages}개`);
  console.log(`- 문제 있는 기사: ${stats.problematicArticles.length}개`);
  
  console.log(`\n📁 URL 패턴 분류`);
  console.log("-".repeat(80));
  
  for (const [type, data] of stats.urlTypes.entries()) {
    console.log(`\n【${type}】 - ${data.count}개`);
    if (data.issues.length > 0) {
      console.log(`   ⚠️  이슈: ${data.issues.join(', ')}`);
    }
    console.log(`   예시:`);
    data.examples.forEach((ex, i) => {
      console.log(`     ${i + 1}. ${ex}`);
    });
  }
  
  if (stats.problematicArticles.length > 0) {
    console.log(`\n\n🚨 문제 기사 상세 (최대 10개)`);
    console.log("-".repeat(80));
    stats.problematicArticles.slice(0, 10).forEach((article, i) => {
      console.log(`\n${i + 1}. ${article.title}`);
      console.log(`   출처: ${article.source}`);
      console.log(`   ID: ${article.id}`);
      console.log(`   문제: ${article.issues.join(', ')}`);
    });
  }

  console.log(`\n\n📦 Supabase Storage 버킷 확인`);
  console.log("-".repeat(80));
  
  try {
    const { data: buckets, error: bucketError } = await supabase
      .from('buckets')
      .select('name, public, file_size_limit, allowed_mime_types')
      .eq('name', 'press-images');
    
    if (bucketError) {
      console.log(`   ❌ 버킷 조회 실패: ${bucketError.message}`);
    } else if (!buckets || buckets.length === 0) {
      console.log(`   ❌ 'press-images' 버킷이 존재하지 않습니다!`);
      console.log(`      → scripts/create-storage-bucket.ts 실행 필요`);
    } else {
      const bucket = buckets[0];
      console.log(`   ✅ 버킷명: ${bucket.name}`);
      console.log(`   ${bucket.public ? '✅' : '❌'} Public: ${bucket.public}`);
      console.log(`   📁 File Size Limit: ${bucket.file_size_limit} bytes`);
      console.log(`   📎 Allowed MIME Types: ${bucket.allowed_mime_types?.join(', ') || '제한 없음'}`);
      
      if (!bucket.public) {
        console.log(`\n   ⚠️  버킷이 public이 아닙니다! 이미지 접근 시 403 오류 발생`);
        console.log(`      → SQL Editor에서 실행: UPDATE storage.buckets SET public = true WHERE name = 'press-images';`);
      }
    }
    
    const { count: objectCount, error: countError } = await supabase
      .from('objects')
      .select('*', { count: 'exact', head: true })
      .eq('bucket_id', 'press-images');
    
    if (!countError && objectCount !== null) {
      console.log(`   📊 저장된 객체 수: ${objectCount}개`);
    }
    
  } catch (err) {
    console.log(`   ⚠️  버킷 확인 중 오류: ${err}`);
  }

  console.log(`\n\n⚙️  환경 변수 확인`);
  console.log("-".repeat(80));
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    console.log(`   ✅ SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
    
    const storageUrls = Array.from(stats.urlTypes.keys())
      .filter(type => type === 'supabase_storage');
    
    if (storageUrls.length > 0) {
      const sampleUrl = stats.urlTypes.get('supabase_storage')?.examples[0] || '';
      if (sampleUrl && !sampleUrl.includes(supabaseUrl)) {
        console.log(`   ⚠️  저장된 URL의 도메인이 현재 환경 변수와 다릅니다!`);
        console.log(`      환경 변수: ${supabaseUrl}`);
        console.log(`      저장된 URL: ${sampleUrl.substring(0, 50)}...`);
      }
    }
  } else {
    console.log(`   ❌ SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않음`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 다음 단계:");
  console.log("   1. 위 분석 결과에서 'original_gov' 또는 'other' 패턴이 있는지 확인");
  console.log("   2. 버킷이 public이 아니면 public으로 변경");
  console.log("   3. 문제 기사의 이미지를 재처리하려면: scripts/backfill-images.ts 실행");
  console.log("   4. 여전히 문제가 있으면 브라우저 개발자도구에서 Network 탭 확인");
}

main().catch((err) => {
  console.error("스크립트 실패:", err);
  process.exit(1);
});

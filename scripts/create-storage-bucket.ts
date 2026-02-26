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
  } catch (err) {
    // Silently ignore if .env.local doesn't exist
  }
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

async function main() {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceKey = requiredEnv("SUPABASE_SERVICE_KEY");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  console.log("Creating Supabase Storage bucket 'press-images'...");

  const { data, error } = await supabase.storage.createBucket("press-images", {
    public: true,
    fileSizeLimit: 20971520, // 20MB
    allowedMimeTypes: ["image/*"],
  });

  if (error) {
    // Check if it already exists
    if (
      error.message?.includes("already exist") ||
      (error as any).statusCode === "23505" ||
      (error as any).status === 409
    ) {
      console.log("Bucket 'press-images' already exists — skipping creation.");
    } else {
      console.error("Failed to create bucket:", error.message);
      process.exit(1);
    }
  } else {
    console.log("Bucket 'press-images' created successfully.");
    console.log("Public URL base:", `${supabaseUrl}/storage/v1/object/public/press-images/`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});

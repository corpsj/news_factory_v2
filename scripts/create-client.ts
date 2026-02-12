import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function parseArgs(): { name: string; webhookUrl?: string } {
  const args = process.argv.slice(2);
  let name = "";
  let webhookUrl: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === "--webhook-url" && args[i + 1]) {
      webhookUrl = args[++i];
    }
  }

  if (!name) {
    console.error("Usage: npx tsx scripts/create-client.ts --name \"Client Name\" [--webhook-url URL]");
    process.exit(1);
  }

  return { name, webhookUrl };
}

async function main() {
  const { name, webhookUrl } = parseArgs();

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  const apiKey = `nf_${randomBytes(32).toString("hex")}`;
  const BCRYPT_ROUNDS = 12;
  const apiKeyHash = await bcrypt.hash(apiKey, BCRYPT_ROUNDS);

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name,
      api_key_hash: apiKeyHash,
      webhook_url: webhookUrl || null,
      is_active: true,
    })
    .select("id, name, is_active, created_at")
    .single();

  if (error) {
    console.error("Failed to create client:", error.message);
    process.exit(1);
  }

  console.log("\nClient created successfully!");
  console.log("─".repeat(50));
  console.log(`  ID:         ${data.id}`);
  console.log(`  Name:       ${data.name}`);
  console.log(`  Active:     ${data.is_active}`);
  console.log(`  Created:    ${data.created_at}`);
  console.log("─".repeat(50));
  console.log(`  API Key:    ${apiKey}`);
  console.log("─".repeat(50));
  console.log("\nSave this API key securely. It cannot be retrieved later.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

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

function parseArgs(): { name: string; webhookUrl?: string; description?: string } {
  const args = process.argv.slice(2);
  let name = "";
  let webhookUrl: string | undefined;
  let description: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === "--webhook-url" && args[i + 1]) {
      webhookUrl = args[++i];
    } else if (args[i] === "--description" && args[i + 1]) {
      description = args[++i];
    }
  }

  if (!name) {
    console.error(
      "Usage: npx tsx scripts/create-client.ts --name \"Client Name\" [--webhook-url URL] [--description TEXT]",
    );
    process.exit(1);
  }

  return { name, webhookUrl, description };
}

async function main() {
  const { name, webhookUrl, description } = parseArgs();

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  const apiKey = `nf_live_${randomBytes(32).toString("hex")}`;
  const BCRYPT_ROUNDS = 12;
  const apiKeyHash = await bcrypt.hash(apiKey, BCRYPT_ROUNDS);

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name,
      description: description || null,
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKey.slice(0, 12),
      api_key_last4: apiKey.slice(-4),
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
  console.log(`  Key hint:   nf_live_...${apiKey.slice(-4)}`);
  console.log("─".repeat(50));
  console.log("\nSave this API key securely. It cannot be retrieved later.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

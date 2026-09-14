import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ROOT = process.cwd();

function listFiles(dir, prefix = "") {
  const result = [];

  for (const item of fs.readdirSync(dir)) {
    if (
      item === "node_modules" ||
      item === ".git" ||
      item === "dist" ||
      item === ".next"
    ) continue;

    const full = path.join(dir, item);
    const rel = path.join(prefix, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      result.push(...listFiles(full, rel));
    } else {
      result.push(rel);
    }
  }

  return result;
}

function readProject() {
  const files = listFiles(ROOT);
  let output = "";

  for (const file of files) {
    const full = path.join(ROOT, file);

    try {
      const content = fs.readFileSync(full, "utf8");

      if (content.length < 50000) {
        output += `\n\n===== ${file} =====\n${content}`;
      }
    } catch {}
  }

  return output;
}

async function main() {
  console.log("🤖 GPT-5.6 Makkah Jeddah Transfer Builder");
  console.log("📂 Loyihani o‘qiyapman...\n");

  const project = readProject();

  const prompt = `
You are the senior AI software engineer responsible for the Makkah Jeddah Transfer website.

Your task is to analyze the existing Vite/React project and improve it professionally.

IMPORTANT:
- Do NOT destroy existing functionality.
- Preserve the existing project architecture.
- Make the website production-ready.
- Mobile-first design.
- Clean modern UI suitable for Makkah/Madinah pilgrims.
- English is the default language.
- Support English, Russian, Uzbek and Arabic.
- The service is for airport/private transfer bookings.
- Focus on Makkah → Jeddah Airport and related transfer routes.
- Do not invent payment credentials, API keys or secret values.
- Do not expose OPENAI_API_KEY or any secret.
- Use existing components and dependencies whenever possible.

PROJECT FILES:
${project}

First analyze the project carefully.

Then provide:
1. Problems you found.
2. Exact files that should be changed.
3. Complete replacement code for every file that needs modification.
4. Any new files required.
5. Commands needed to test the project.

Do not give vague advice.
Give production-quality code.
`;

  const response = await client.responses.create({
    model: "gpt-5.6",
    input: prompt
  });

  console.log("\n===== GPT-5.6 ANALYSIS =====\n");
  console.log(response.output_text);
  console.log("\n============================\n");

  console.log("✅ Analysis completed.");
}

main().catch(err => {
  console.error("❌ ERROR:", err.message);
  process.exit(1);
});

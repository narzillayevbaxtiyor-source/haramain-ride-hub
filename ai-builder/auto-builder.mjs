import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ROOT = process.cwd();
const MODEL = "gpt-5.6";

const IGNORE = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".cache",
  ".vite",
  "coverage",
  "ai-builder"
]);

function safePath(p) {
  const resolved = path.resolve(ROOT, p);

  if (!resolved.startsWith(path.resolve(ROOT) + path.sep)) {
    throw new Error("Blocked path: " + p);
  }

  return resolved;
}

function listFiles(dir = ROOT, prefix = "") {
  const result = [];

  for (const name of fs.readdirSync(dir)) {
    if (IGNORE.has(name)) continue;

    const full = path.join(dir, name);
    const rel = path.join(prefix, name);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      result.push(...listFiles(full, rel));
    } else {
      result.push(rel);
    }
  }

  return result;
}

function isSecretFile(file) {
  const x = file.toLowerCase();

  return (
    x.includes(".env") ||
    x.includes("secret") ||
    x.includes("credential") ||
    x.includes("service-role") ||
    x.includes("private-key") ||
    x.includes("apikey") ||
    x.includes("api-key")
  );
}

function readProject() {
  const files = listFiles();
  const result = [];

  for (const file of files) {
    if (isSecretFile(file)) continue;

    const full = safePath(file);

    try {
      const stat = fs.statSync(full);

      if (stat.size > 120000) continue;

      const content = fs.readFileSync(full, "utf8");

      result.push({
        path: file,
        content
      });
    } catch {}
  }

  return result;
}

function projectText(files) {
  return files
    .map(
      f =>
        `\n===== FILE: ${f.path} =====\n${f.content}\n===== END FILE =====`
    )
    .join("\n");
}

function run(command) {
  console.log(`\n$ ${command}\n`);

  try {
    return execSync(command, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180000
    });
  } catch (error) {
    return (
      "COMMAND FAILED\n" +
      "exitCode=" +
      error.status +
      "\nSTDOUT:\n" +
      (error.stdout || "") +
      "\nSTDERR:\n" +
      (error.stderr || "")
    );
  }
}

async function askGPT(instruction, files, buildOutput = "") {
  const response = await client.responses.create({
    model: MODEL,
    reasoning: {
      effort: "high"
    },
    input: [
      {
        role: "system",
        content: `
You are the autonomous senior software engineer for the
"Makkah Jeddah Transfer" production website.

You have permission to modify the existing project.

Your job is to BUILD THE ACTUAL WEBSITE, not merely give advice.

CORE PRODUCT:
A professional airport/private transfer booking platform for pilgrims
traveling around Makkah, Madinah and Jeddah.

PRIMARY LANGUAGE:
English.

SUPPORTED LANGUAGES:
English, Russian, Uzbek, Arabic.

Arabic MUST use RTL correctly.

MAIN USER TYPES:
1. Passenger
2. Driver
3. Admin

PASSENGER:
- Airport/private transfer booking
- Makkah -> Jeddah Airport
- Jeddah Airport -> Makkah
- Makkah -> Madinah
- Madinah -> Makkah
- Other supported routes if already present
- Date/time scheduling
- Pickup address
- Drop-off address
- Location support if existing
- Passenger count
- Luggage count
- Vehicle selection
- Booking status
- Cancellation rules
- Mobile-first interface

DRIVER:
- Registration
- Pending approval
- Active/blocked/suspended states
- Driver dashboard
- Offers
- Booking assignment
- Booking status workflow
- Commission information
- Vehicle information

ADMIN:
- Admin dashboard
- Driver approval
- Booking management
- Driver management
- Commission management
- Activity log
- Secure access control

SECURITY:
- Never expose secrets.
- Never expose Supabase service-role key.
- Never expose private wallet address.
- Never expose OPENAI_API_KEY.
- Never put secrets in frontend code.
- Respect existing Supabase RLS.
- Passenger must not access another passenger's booking.
- Driver must only access assigned bookings.
- Non-admin must not access admin data.
- Suspended/blocked users cannot perform protected actions.
- Do not weaken existing security policies just to make the UI work.

UI:
- Premium modern Saudi travel design.
- Excellent mobile experience.
- Clean typography.
- Clear booking CTA.
- Professional cards/forms.
- Responsive desktop/tablet/mobile.
- No broken layouts.
- Good loading/error/empty states.
- Accessible buttons and inputs.
- Keep existing good design where appropriate.

IMPORTANT:
- Do not rewrite the entire application unnecessarily.
- Preserve working functionality.
- Fix existing bugs.
- Implement missing functionality.
- Use existing dependencies when possible.
- Do not invent fake backend functionality if Supabase functionality already exists.
- Do not use placeholder text for core functionality.
- Do not claim something is implemented unless the code actually implements it.

DEPLOYMENT:
The application must build successfully.
Docker compatibility must be preserved.
The application must be suitable for Cloud Run.
Do not run destructive production database commands.

You have the current source tree below.
`
      },
      {
        role: "user",
        content: `
CURRENT TASK:

${instruction}

CURRENT BUILD/TEST OUTPUT:
${buildOutput}

CURRENT PROJECT:
${projectText(files)}

Return ONLY JSON in this exact shape:

{
  "summary": "what you changed",
  "files": [
    {
      "path": "relative/path/to/file",
      "action": "write",
      "content": "COMPLETE FILE CONTENT"
    }
  ],
  "commands": [
    "safe command to run after changes"
  ]
}

Rules:
- "content" must contain the COMPLETE file, not a patch.
- Only include files that genuinely need changes.
- Never include secrets.
- Never include node_modules.
- Never include dist.
- Never include .env files.
- Never include service-role keys.
- Never include API keys.
- Never include private credentials.
`
      }
    ]
  });

  let text = response.output_text.trim();

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }

  return JSON.parse(text);
}

function applyChanges(result) {
  let count = 0;

  for (const file of result.files || []) {
    if (!file.path || file.action !== "write") continue;

    if (isSecretFile(file.path)) {
      console.log("⚠️ Skipping protected file:", file.path);
      continue;
    }

    const full = safePath(file.path);

    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, file.content, "utf8");

    console.log("✏️ Updated:", file.path);
    count++;
  }

  return count;
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════╗
║     GPT-5.6 AUTONOMOUS WEBSITE BUILDER      ║
║     Makkah Jeddah Transfer                   ║
╚══════════════════════════════════════════════╝
`);

  let lastOutput = "";

  for (let round = 1; round <= 8; round++) {
    console.log(`\n\n========== AI ROUND ${round}/8 ==========\n`);

    const files = readProject();

    const instruction = `
Round ${round}.

Analyze the current application.

Your goal is to make the Makkah Jeddah Transfer website fully production-ready.

Check:
- current UI
- routing
- passenger booking
- driver dashboard
- admin dashboard
- authentication
- multilingual support
- Arabic RTL
- Supabase integration
- security
- validation
- loading/error states
- responsive design
- SEO
- Docker/Cloud Run compatibility
- existing TypeScript errors
- existing runtime issues

Do not stop at analysis.

MAKE THE REQUIRED CODE CHANGES NOW.

If something is already correct, leave it unchanged.

Prioritize real implementation over explanations.
`;

    let result;

    try {
      result = await askGPT(instruction, files, lastOutput);
    } catch (error) {
      console.error("\n❌ GPT ERROR:", error.message);
      process.exit(1);
    }

    console.log("\n🧠", result.summary);

    const changed = applyChanges(result);

    console.log(`\n✅ Files changed: ${changed}`);

    console.log("\n🔎 Running build...\n");

    lastOutput = run(
      "npm run build"
    );

    console.log(lastOutput.slice(-12000));

    if (
      !lastOutput.includes("COMMAND FAILED") &&
      !lastOutput.toLowerCase().includes("error")
    ) {
      console.log("\n🎉 BUILD PASSED.");
      
      if (round >= 3) {
        console.log("\nRunning final verification...");
        const verify = run("npm run lint");
        console.log(verify.slice(-8000));

        if (
          !verify.includes("COMMAND FAILED") &&
          !verify.toLowerCase().includes("error")
        ) {
          console.log(`
╔══════════════════════════════════════════════╗
║             BUILD COMPLETE                  ║
║                                              ║
║ GPT-5.6 finished the implementation.        ║
║ Build: PASS                                  ║
║ Lint:  PASS                                  ║
╚══════════════════════════════════════════════╝
`);
          break;
        }
      }
    }

    console.log("\n⚠️ Build/lint needs another AI repair round.");
  }

  console.log("\n🏁 AI Builder finished.");
}

main().catch(error => {
  console.error("\n❌ FATAL:", error);
  process.exit(1);
});

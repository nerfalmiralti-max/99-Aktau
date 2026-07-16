import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const pass = [];
const warnings = [];
const failures = [];

const requiredFiles = [
  "README.md",
  "HANDOVER.md",
  "TRANSFER_CHECKLIST.md",
  ".env.example",
  ".gitignore",
  "package.json",
  "package-lock.json",
  "vercel.json",
  "supabase/schema.sql",
  "scripts/pre-handover-check.mjs",
];

const requiredEnvironmentNames = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
];

function addPass(message) {
  pass.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function addFailure(message) {
  failures.push(message);
}

function readText(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split("\n").length;
}

function isPlaceholder(value) {
  const normalized = value.trim().replace(/^["'`]|["'`]$/g, "").trim();
  return normalized === ""
    || /^<[^>]+>$/.test(normalized)
    || /^(?:your[_-]|replace[_-]?me|changeme|example|dummy|placeholder)/i.test(normalized)
    || /^\$\{[A-Z0-9_]+\}$/.test(normalized)
    || /^https?:\/\/(?:example\.com|example\.supabase\.co)(?:\/|$)/i.test(normalized);
}

for (const file of requiredFiles) {
  if (existsSync(resolve(root, file))) {
    addPass(`Required file exists: ${file}`);
  } else {
    addFailure(`Required file is missing: ${file}`);
  }
}

try {
  const packageJson = JSON.parse(readText("package.json"));
  const requiredScripts = ["build", "lint", "test", "handover:check"];
  const missingScripts = requiredScripts.filter((name) => !packageJson.scripts?.[name]);
  if (missingScripts.length === 0) {
    addPass("Required package scripts are configured");
  } else {
    addFailure(`Missing package scripts: ${missingScripts.join(", ")}`);
  }
} catch {
  addFailure("package.json is missing or invalid JSON");
}

try {
  const envLines = readText(".env.example").split(/\r?\n/);
  const entries = new Map();

  for (let index = 0; index < envLines.length; index += 1) {
    const line = envLines[index].trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) {
      addFailure(`Invalid .env.example syntax at line ${index + 1}`);
      continue;
    }

    const [, name, value] = match;
    if (entries.has(name)) {
      addFailure(`Duplicate variable in .env.example: ${name}`);
    }
    entries.set(name, value);

    if (!requiredEnvironmentNames.includes(name)) {
      addFailure(`Unexpected variable in .env.example: ${name}`);
    }
    if (!isPlaceholder(value)) {
      addFailure(`Non-empty value in .env.example at line ${index + 1} (${name})`);
    }
  }

  const missingNames = requiredEnvironmentNames.filter((name) => !entries.has(name));
  if (missingNames.length === 0) {
    addPass(".env.example contains every required variable name");
  } else {
    addFailure(`Missing variables in .env.example: ${missingNames.join(", ")}`);
  }
} catch {
  addFailure("Unable to validate .env.example");
}

try {
  const gitignore = readText(".gitignore")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const ignoresAllEnvironmentFiles = gitignore.includes(".env*");
  const ignoresRequiredVariants = [".env", ".env.local", ".env.production", ".env*.local"]
    .every((pattern) => gitignore.includes(pattern));
  if (ignoresAllEnvironmentFiles || ignoresRequiredVariants) {
    addPass(".gitignore excludes environment files");
  } else {
    addFailure(".gitignore does not exclude all required environment variants");
  }
  if (gitignore.includes("!.env.example")) {
    addPass(".gitignore explicitly allows .env.example");
  } else {
    addWarning(".gitignore does not explicitly allow .env.example");
  }
} catch {
  addFailure("Unable to validate .gitignore");
}

let trackedFiles = [];
try {
  trackedFiles = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).split("\0").filter(Boolean).map((file) => file.replaceAll("\\", "/"));

  const forbiddenTrackedEnvironmentFiles = trackedFiles.filter((file) => (
    /(^|\/)\.env(?:$|\.)/.test(file) && file !== ".env.example"
  ));
  if (forbiddenTrackedEnvironmentFiles.length === 0) {
    addPass("No forbidden .env files are tracked by Git");
  } else {
    for (const file of forbiddenTrackedEnvironmentFiles) {
      addFailure(`Forbidden environment file is tracked: ${file}`);
    }
  }

  for (const file of ["HANDOVER.md", "TRANSFER_CHECKLIST.md", "scripts/pre-handover-check.mjs"]) {
    if (!trackedFiles.includes(file)) {
      addWarning(`Required handover file is not tracked yet: ${file}`);
    }
  }
} catch {
  addFailure("Unable to list Git-tracked files");
}

const highConfidenceSecretPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g],
  ["JWT", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["Supabase key", /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{16,}\b/g],
  ["API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ["URL with embedded credentials", /https?:\/\/[^/\s:@]+:[^/\s@]+@/g],
];

const sensitiveAssignment = /^\s*(?:export\s+)?(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|ADMIN_PASSWORD|ADMIN_SESSION_SECRET|DATABASE_URL|ACCESS_TOKEN|API_KEY)\s*=\s*(.*?)\s*$/;
const scanFiles = [...new Set([...trackedFiles, ...requiredFiles])];
const reported = new Set();

for (const file of scanFiles) {
  if (!existsSync(resolve(root, file))) {
    continue;
  }
  if (/(^|\/)\.env(?:$|\.)/.test(file) && file !== ".env.example") {
    continue;
  }

  const fileStats = statSync(resolve(root, file));
  if (!fileStats.isFile() || fileStats.size > 2 * 1024 * 1024) {
    continue;
  }

  const buffer = readFileSync(resolve(root, file));
  if (buffer.includes(0)) {
    continue;
  }
  const content = buffer.toString("utf8");

  for (const [type, pattern] of highConfidenceSecretPatterns) {
    pattern.lastIndex = 0;
    for (let match = pattern.exec(content); match; match = pattern.exec(content)) {
      const location = `${file}:${lineNumberAt(content, match.index)}`;
      const key = `${location}:${type}`;
      if (!reported.has(key)) {
        reported.add(key);
        addFailure(`Potential ${type} at ${location} (value redacted)`);
      }
    }
  }

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = sensitiveAssignment.exec(lines[index]);
    if (match && !isPlaceholder(match[2])) {
      const location = `${file}:${index + 1}`;
      const key = `${location}:sensitive-assignment`;
      if (!reported.has(key)) {
        reported.add(key);
        addFailure(`Potential secret assignment at ${location} (${match[1]}, value redacted)`);
      }
    }
  }
}

if (!reported.size) {
  addPass("No high-confidence secret patterns found in tracked/required files");
}

for (const message of pass) {
  console.log(`PASS: ${message}`);
}
for (const message of warnings) {
  console.warn(`WARNING: ${message}`);
}
for (const message of failures) {
  console.error(`FAIL: ${message}`);
}

if (failures.length > 0) {
  console.error(`RESULT: FAIL (${failures.length} failure(s), ${warnings.length} warning(s))`);
  process.exitCode = 1;
} else if (warnings.length > 0) {
  console.warn(`RESULT: WARNING (${warnings.length} warning(s))`);
} else {
  console.log("RESULT: PASS");
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("====================================================");
console.log("🧪 Starting AGENTS.md Experimental Isolation & Undo Rule Verification");
console.log("====================================================");

const rootDir = process.cwd();
const agentsPath = path.join(rootDir, "AGENTS.md");

assert.ok(fs.existsSync(agentsPath), "AGENTS.md must exist in root");
const agentsContent = fs.readFileSync(agentsPath, "utf8");
const lower = agentsContent.toLowerCase();

assert.ok(
  lower.includes("experimental features isolation") ||
    (lower.includes("experimental feature") && lower.includes("undo/cancel")),
  "AGENTS.md must document the experimental features isolation & undo/cancel rule",
);
assert.ok(
  lower.includes("does not affect") || lower.includes("not affect any existing component"),
  "AGENTS.md must require experimental features not to affect existing components",
);
assert.ok(
  lower.includes("undo") && lower.includes("cancel"),
  "AGENTS.md must allow undoing/removing experimental features on an undo or cancel request",
);
assert.ok(
  agentsContent.includes("[Experimental]"),
  "AGENTS.md must require an [Experimental] label on experimental features",
);

console.log(
  "✅ PASS: AGENTS.md enforces experimental feature isolation, labelling, and undo/cancel reversibility.",
);
console.log("====================================================");

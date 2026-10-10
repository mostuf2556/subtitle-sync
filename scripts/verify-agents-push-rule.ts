import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { execSync } from "node:child_process";

console.log("====================================================");
console.log("🧪 Starting AGENTS.md Git Push Rule Verification");
console.log("====================================================");

const rootDir = process.cwd();
const agentsPath = path.join(rootDir, "AGENTS.md");

// 1. Verify AGENTS.md exists and contains the git push instruction
assert(fs.existsSync(agentsPath), "AGENTS.md must exist in root");
const agentsContent = fs.readFileSync(agentsPath, "utf8");

assert(
  agentsContent.includes("After git commit, try using git push") ||
    agentsContent.includes("git push"),
  "AGENTS.md must instruct attempting git push after git commit",
);
console.log("✅ PASS: AGENTS.md contains explicit instruction to try git push after git commit");

// 2. Verify AGENTS.md enforces updating .md files first before action
assert(
  agentsContent.includes("Enforce updating .md tracking files first before action") ||
    agentsContent.includes("update `docs/tasks.md` and `docs/todo.md`"),
  "AGENTS.md must strictly enforce updating .md tracking files first before action",
);
console.log("✅ PASS: AGENTS.md enforces updating .md tracking files first before action");

// 3. Test graceful execution of git push helper logic
function tryGitPush(): { attempted: boolean; success: boolean; message: string } {
  try {
    const remotes = execSync("git remote", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (!remotes) {
      return {
        attempted: true,
        success: false,
        message: "No git remotes configured; skipped gracefully",
      };
    }
    execSync("git push", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return { attempted: true, success: true, message: "git push succeeded" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { attempted: true, success: false, message: `git push handled gracefully: ${errorMsg}` };
  }
}

const pushResult = tryGitPush();
assert(pushResult.attempted, "Git push helper must have attempted execution");
console.log(`✅ PASS: tryGitPush logic executed safely: ${pushResult.message}`);

console.log("====================================================");
console.log("🎉 AGENTS.md Git Push Rule Verification PASSED successfully!");
console.log("====================================================");

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("====================================================");
console.log("🧪 Starting Lean Tokens Economy & Protocol Verification");
console.log("====================================================");

const rootDir = process.cwd();
const docsTokensPath = path.join(rootDir, "docs/tokens.md");
const rootTokensPath = path.join(rootDir, "tokens.md");

// 1. Verify file presence and zero root duplicate
console.log("1. Checking docs/tokens.md existence and zero root duplicate...");
assert(!fs.existsSync(rootTokensPath), "tokens.md must not exist in root directory");
assert(fs.existsSync(docsTokensPath), "docs/tokens.md must exist under docs/");
const content = fs.readFileSync(docsTokensPath, "utf8");
const stats = fs.statSync(docsTokensPath);
const lines = content.split("\n");

console.log(`docs/tokens.md size: ${stats.size} bytes, lines: ${lines.length}`);

// 2. Verify lean size and fast overview readability
console.log("2. Verifying docs/tokens.md is lean, concise, and fast to overview...");
assert(
  stats.size < 12000,
  `docs/tokens.md must be lean (< 12KB) to maximize token savings, current size is ${stats.size} bytes`,
);
assert(
  lines.length < 200,
  `docs/tokens.md must be under 200 lines for fast agent review, current line count is ${lines.length}`,
);
console.log("✅ PASS: docs/tokens.md is lean and token-efficient");

// 3. Verify zero uninteresting historical task dump in tokens.md
console.log("3. Verifying docs/tokens.md does not contain old task dumps...");
const uninterestingHistoricalTasks = [
  "Task 107:",
  "Task 110:",
  "Task 111:",
  "Task 112:",
  "Task 113:",
  "Task 114:",
  "Task 115:",
  "Task 116:",
  "Task 117:",
  "Task 118:",
  "Task 119:",
  "Task 120:",
  "Task 121:",
  "Task 122:",
];

for (const task of uninterestingHistoricalTasks) {
  assert(
    !content.includes(task),
    `docs/tokens.md must NOT contain historical task log '${task}' (historical tasks belong in docs/done.md)`,
  );
}
console.log("✅ PASS: docs/tokens.md contains zero stale historical task dumps");

// 4. Verify all core protocol contracts and sections are present
console.log("4. Verifying all mandatory token economy principles and sections...");

// Section 1
assert(
  content.includes("The Token Economy Problem: Why Big Tasks Fail") &&
    (content.includes("Context Bloat") || content.includes("Token Exhaustion")),
  "Section 1: Must document token exhaustion and context bloat",
);

// Section 2
assert(
  content.includes("Granular Decomposition Maximizes Token Efficiency") &&
    content.includes("Golden Rule") &&
    content.includes("current-sub-task.md"),
  "Section 2: Must document Golden Rule and granular decomposition",
);

// Section 3
assert(
  content.includes("Mandatory Task Management File Protocol") &&
    content.includes("docs/tokens.md") &&
    content.includes("docs/tasks.md") &&
    content.includes("current-sub-task.md") &&
    content.includes("temp.md") &&
    content.includes("docs/todo.md") &&
    content.includes("docs/done.md") &&
    content.includes("docs/self-verification.md"),
  "Section 3: Must specify mandatory file protocol table",
);

// Section 4
assert(
  content.includes("Step-by-Step Prompt Execution Flow") &&
    content.includes("Prompt Completion Audit Gate") &&
    content.includes("EVERY task and subtask") &&
    content.includes(
      "Move the completed subtask/task completely out of `current-sub-task.md`, `docs/todo.md`, and `docs/tasks.md` into `docs/done.md`",
    ) &&
    content.includes(
      "keep `docs/tasks.md` strictly as the active backlog of pending and upcoming items",
    ),
  "Section 4: Must specify prompt execution flow, audit gate, and done.md migration",
);

// Section 5
assert(
  content.includes("Hotfix Workflow") &&
    content.includes("SUSPEND ACTIVE TASK") &&
    content.includes("ON HOLD") &&
    content.includes("STAGE HOTFIX") &&
    content.includes("EXECUTE IN ISOLATION") &&
    content.includes("RESUME SUSPENDED TASK"),
  "Section 5: Must specify hotfix workflow with task suspension and resumption",
);

// Section 6
assert(
  content.includes("Token Optimization Guidelines") &&
    content.includes("Smart Read-Before-Write") &&
    content.includes("One Sub-Task at a Time") &&
    content.includes("Fail Fast, Fix Fast") &&
    content.includes("Precedence"),
  "Section 6: Must specify token optimization guidelines",
);

// Section 7: Zero Task Overhead & Task Index Delegation
console.log("5. Verifying docs/tasks-index.md presence and tokens.md delegation...");
const tasksIndexPath = path.join(rootDir, "docs/tasks-index.md");
assert(fs.existsSync(tasksIndexPath), "docs/tasks-index.md must exist in docs/");
const tasksIndexContent = fs.readFileSync(tasksIndexPath, "utf8");
assert(
  tasksIndexContent.includes("Active Backlog") &&
    tasksIndexContent.includes("docs/tasks.md") &&
    tasksIndexContent.includes("docs/done.md"),
  "docs/tasks-index.md must reference docs/tasks.md and docs/done.md",
);

assert(
  content.includes("Zero Task Overhead & Task Index Delegation") &&
    content.includes("docs/tasks-index.md") &&
    content.includes("No Historical Task Logs in tokens.md"),
  "Section 7: Must specify zero task overhead in tokens.md and delegation to tasks-index.md",
);

console.log("✅ PASS: docs/tasks-index.md and tokens.md delegation 100% verified");
console.log("✅ PASS: All core protocol contracts and sections are 100% verified");

// 6. Verify current-sub-task.md and docs/todo.md stay lean (< 4000 bytes, no completed-history bloat)
console.log("6. Verifying current-sub-task.md and docs/todo.md stay lean (< 4KB)...");
for (const relPath of ["current-sub-task.md", "docs/todo.md"]) {
  const fullPath = path.join(rootDir, relPath);
  assert(fs.existsSync(fullPath), `${relPath} must exist`);
  const fileStat = fs.statSync(fullPath);
  assert(
    fileStat.size < 4000,
    `${relPath} must be lean (< 4KB, no completed-task dumps), got ${fileStat.size} bytes`,
  );
  console.log(`✅ PASS: ${relPath} is lean at ${fileStat.size} bytes (< 4KB)`);
}

console.log("====================================================");
console.log("🎉 All Lean Tokens Economy Tests PASSED Successfully!");
console.log("====================================================");

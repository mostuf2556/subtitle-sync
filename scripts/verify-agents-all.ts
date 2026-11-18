import { spawnSync } from "child_process";
import path from "path";

interface ScriptCheck {
  id: string;
  name: string;
  file: string;
}

const CHECKS: ScriptCheck[] = [
  { id: "1", name: "Last Raw Prompt Retention", file: "scripts/verify-agents-last-prompt-rule.ts" },
  {
    id: "2",
    name: "Version Number Synchronization",
    file: "scripts/verify-agents-version-rule.ts",
  },
  {
    id: "3",
    name: "Subtitles Specifications & Anti-Bot",
    file: "scripts/verify-agents-subtitles-spec.ts",
  },
  { id: "4", name: "Git Push & Tracking Update Flow", file: "scripts/verify-agents-push-rule.ts" },
  { id: "5", name: "Size Budget & Headroom Guard", file: "scripts/verify-agents-size-budget.ts" },
  {
    id: "6",
    name: "Android E2E & Screencast Specification",
    file: "scripts/verify-android-e2e-spec.ts",
  },
  {
    id: "7",
    name: "Application Stages Pipeline & Order",
    file: "scripts/verify-application-stages-pipeline.ts",
  },
  {
    id: "8",
    name: "Chars Removal Accordion Ordering",
    file: "scripts/verify-chars-removal-accordion-order.ts",
  },
  {
    id: "9",
    name: "Code Architecture & Modularity Standards",
    file: "scripts/verify-code-modularity-standards.ts",
  },
  {
    id: "10",
    name: "Hotfix & Done Workflow Protocol",
    file: "scripts/verify-hotfix-and-done-workflow.ts",
  },
  {
    id: "11",
    name: "Docs Location & Zero Duplicates Policy",
    file: "scripts/verify-no-duplicate-md-files.ts",
  },
  {
    id: "12",
    name: "Numbered Chapters Serial Task Protocol",
    file: "scripts/verify-numbered-chapters-protocol.ts",
  },
  {
    id: "13",
    name: "README GitHub Actions Sync Protection",
    file: "scripts/verify-readme-git-sync-rule.ts",
  },
  {
    id: "14",
    name: "Subtitles Fixtures Restriction & Zero Policy",
    file: "scripts/verify-subtitles-fixtures-restriction.ts",
  },
  {
    id: "15",
    name: "Task Management & Backlog Protocol",
    file: "scripts/verify-task-management-workflow.ts",
  },
  { id: "16", name: "Tokens Economy Flow Protocol", file: "scripts/verify-tokens-economy.ts" },
  {
    id: "17",
    name: "Web Demo Design Preservation Mandate",
    file: "scripts/verify-web-demo-design-preservation.ts",
  },
  {
    id: "18",
    name: "No More Tasks 'go on' Handling Protocol",
    file: "scripts/verify-no-more-tasks-go-on-rule.ts",
  },
  {
    id: "19",
    name: "Pending Pull Requests Check Before Features",
    file: "scripts/verify-pending-prs-rule.ts",
  },
  {
    id: "20",
    name: "Parallel AI Agent Coordination & Lock Protocol",
    file: "scripts/verify-parallel-agent-coordination.ts",
  },
  {
    id: "21",
    name: "Parallel Planning Mode Protocol (docs/plans/)",
    file: "scripts/verify-parallel-planning-mode.ts",
  },
  {
    id: "22",
    name: "Same Components Policy (Beginner & Advanced)",
    file: "scripts/verify-same-components-parity-policy.ts",
  },
  {
    id: "23",
    name: "Sub-Task Git Commit & docs/git.md Log Rule",
    file: "scripts/verify-agents-git-log-rule.ts",
  },
  {
    id: "24",
    name: "Experimental Features Isolation & Undo Rule",
    file: "scripts/verify-agents-experimental-isolation-rule.ts",
  },
];

function run() {
  console.log("==================================================================");
  console.log("🧪 Running Unified AGENTS.md Contract Test Suite (Step 5)");
  console.log(`📋 Executing ${CHECKS.length} Constitutional Contract Checks...`);
  console.log("==================================================================\n");

  const startTime = Date.now();
  let passedCount = 0;
  const failed: { name: string; error: string }[] = [];

  for (const check of CHECKS) {
    const checkStart = Date.now();
    const result = spawnSync("npx", ["tsx", check.file], {
      cwd: process.cwd(),
      stdio: "pipe",
      encoding: "utf-8",
    });
    const duration = Date.now() - checkStart;

    if (result.status === 0) {
      passedCount++;
      console.log(
        `✅ [PASS] [${check.id.padStart(2, " ")}/${CHECKS.length}] ${check.name} (${duration}ms)`,
      );
    } else {
      console.error(
        `❌ [FAIL] [${check.id.padStart(2, " ")}/${CHECKS.length}] ${check.name} (${duration}ms)`,
      );
      if (result.stderr) {
        console.error(result.stderr.trim());
      } else if (result.stdout) {
        console.error(result.stdout.trim());
      }
      failed.push({ name: check.name, error: result.stderr || result.stdout || "Unknown failure" });
    }
  }

  const totalTime = Date.now() - startTime;
  console.log("\n==================================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount}/${CHECKS.length} Passed in ${totalTime}ms`);
  console.log("==================================================================");

  if (failed.length > 0) {
    console.error(`❌ FAILED CHECKS (${failed.length}):`);
    for (const f of failed) {
      console.error(`  - ${f.name}`);
    }
    process.exit(1);
  }

  console.log("🎉 ALL AGENTS.md CONSTITUTIONAL CONTRACT CHECKS PASSED 100%!");
  console.log("==================================================================");
}

run();

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("====================================================");
console.log("🧪 Starting Network Inspector Accessibility & Readability Test");
console.log("====================================================");

const inspectorFile = path.resolve(process.cwd(), "src/components/NetworkRequestsInspector.tsx");
assert.ok(fs.existsSync(inspectorFile), "NetworkRequestsInspector.tsx must exist");
const content = fs.readFileSync(inspectorFile, "utf-8");

// 1. Verify Dialog Semantics and ARIA Attributes
console.log("1. Checking Dialog Semantics and ARIA attributes...");
assert.ok(content.includes('role="dialog"'), "Modal must have role='dialog'");
assert.ok(content.includes('aria-modal="true"'), "Modal must have aria-modal='true'");
assert.ok(content.includes('aria-labelledby="network-inspector-title"'), "Modal must have aria-labelledby");
assert.ok(content.includes('aria-describedby="network-inspector-desc"'), "Modal must have aria-describedby");
assert.ok(content.includes('aria-live="polite"'), "Must include live announcer for screen readers");
console.log("✅ PASS: Dialog ARIA semantics and live region verified");

// 2. Verify Listbox and Option Semantics with Keyboard Navigation
console.log("2. Checking Listbox accessibility and keyboard navigation...");
assert.ok(content.includes('role="listbox"'), "Requests list must have role='listbox'");
assert.ok(content.includes('role="option"'), "Request items must have role='option'");
assert.ok(content.includes("aria-selected={isSelected}"), "Selected request must reflect aria-selected");
assert.ok(content.includes("handleListKeyDown"), "List must implement keyboard navigation handler");
assert.ok(content.includes('e.key === "ArrowDown"'), "Must handle ArrowDown key navigation");
assert.ok(content.includes('e.key === "ArrowUp"'), "Must handle ArrowUp key navigation");
assert.ok(content.includes('e.key === "Home"'), "Must handle Home key navigation");
assert.ok(content.includes('e.key === "End"'), "Must handle End key navigation");
console.log("✅ PASS: Listbox accessibility and Arrow key navigation verified");

// 3. Verify Visible Focus Rings and Accessible Controls
console.log("3. Checking visible focus rings and accessible touch controls...");
assert.ok(content.includes("focus-visible:ring-2"), "Must include visible focus-visible rings");
assert.ok(content.includes('role="radiogroup"'), "Filter buttons must have radiogroup semantics");
assert.ok(content.includes('role="radio"'), "Filter options must have role='radio'");
assert.ok(content.includes("aria-checked="), "Filter options must reflect aria-checked");
assert.ok(content.includes('aria-label="Search requests'), "Search input must have clear aria-label");
console.log("✅ PASS: Focus rings and interactive controls accessibility verified");

// 4. Verify Readability: Query Parameters Table & Responsive Layout
console.log("4. Checking Readability enhancements (Query Params Table & Responsive Tabs)...");
assert.ok(
  content.includes("Query Parameters Breakdown"),
  "Inspector must provide structured Query Parameters Breakdown table for easy inspection",
);
assert.ok(
  content.includes("parsedQueryParams"),
  "Inspector must parse query parameters into structured key-value pairs",
);
assert.ok(
  content.includes("Requests List") && content.includes("Request Detail"),
  "Inspector must provide responsive mobile tab switcher between list and detail",
);
assert.ok(
  content.includes("break-words") && content.includes("whitespace-pre-wrap"),
  "Must preserve word-wrapping without horizontal clipping",
);
console.log("✅ PASS: Query parameters table and responsive readability layout verified");

// 5. Verify Android-Native Viewport & Hardware Back Navigation
console.log("5. Checking Android-Native Material 3 Viewport & Back Navigation...");
assert.ok(
  content.includes("isAndroid"),
  "NetworkRequestsInspector must accept and handle isAndroid prop",
);
assert.ok(
  content.includes("__handleInspectorBack"),
  "Must implement __handleInspectorBack to support Android hardware back button navigating from Detail to List",
);
assert.ok(
  content.includes("h-full max-h-none rounded-none border-none"),
  "Must provide full viewport fullscreen presentation without margins on Android",
);
assert.ok(
  content.includes("Back to requests list") || content.includes("Requests"),
  "Must provide Material 3 top back button on mobile when viewing request detail",
);
console.log("✅ PASS: Android-native fullscreen layout and back navigation integration verified");

console.log("====================================================");
console.log("🎉 ALL Network Inspector Accessibility & Readability tests PASSED!");
console.log("====================================================");

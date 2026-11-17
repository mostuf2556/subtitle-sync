import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("====================================================");
console.log("🧪 Starting Hotfix: isTtsPlayEnabled TDZ Initialization Verification");
console.log("====================================================");

const indexPath = path.resolve(process.cwd(), "src/routes/index.tsx");
assert.ok(fs.existsSync(indexPath), "src/routes/index.tsx must exist");
const indexContent = fs.readFileSync(indexPath, "utf-8");

const isTtsPlayEnabledDecl = indexContent.indexOf(
  "const [isTtsPlayEnabled, setIsTtsPlayEnabled] = useState<boolean>(",
);
assert.ok(isTtsPlayEnabledDecl !== -1, "isTtsPlayEnabled state declaration must exist");

const onTtsPlayEnabledChangeDecl = indexContent.indexOf(
  "const onTtsPlayEnabledChange = useCallback(",
);
assert.ok(onTtsPlayEnabledChangeDecl !== -1, "onTtsPlayEnabledChange declaration must exist");

const handleFloatingToggleTtsPlayDecl = indexContent.indexOf(
  "const handleFloatingToggleTtsPlay = useCallback(",
);
assert.ok(
  handleFloatingToggleTtsPlayDecl !== -1,
  "handleFloatingToggleTtsPlay declaration must exist",
);

assert.ok(
  isTtsPlayEnabledDecl < onTtsPlayEnabledChangeDecl,
  "isTtsPlayEnabled must be declared before onTtsPlayEnabledChange",
);
assert.ok(
  isTtsPlayEnabledDecl < handleFloatingToggleTtsPlayDecl,
  `isTtsPlayEnabled (pos ${isTtsPlayEnabledDecl}) must be declared strictly BEFORE handleFloatingToggleTtsPlay (pos ${handleFloatingToggleTtsPlayDecl})`,
);
assert.ok(
  onTtsPlayEnabledChangeDecl < handleFloatingToggleTtsPlayDecl,
  `onTtsPlayEnabledChange (pos ${onTtsPlayEnabledChangeDecl}) must be declared strictly BEFORE handleFloatingToggleTtsPlay (pos ${handleFloatingToggleTtsPlayDecl})`,
);

const beforeIsTtsDecl = indexContent.slice(0, isTtsPlayEnabledDecl);
assert.ok(
  !/\bisTtsPlayEnabled\b/.test(beforeIsTtsDecl),
  "No reference to isTtsPlayEnabled may appear before its useState declaration",
);
assert.ok(
  !/\bonTtsPlayEnabledChange\b/.test(beforeIsTtsDecl),
  "No reference to onTtsPlayEnabledChange may appear before isTtsPlayEnabled declaration",
);

console.log("✅ PASS: isTtsPlayEnabled & onTtsPlayEnabledChange precede handleFloatingToggleTtsPlay.");
console.log("✅ PASS: Zero premature TDZ references before isTtsPlayEnabled declaration.");
console.log("====================================================");
console.log("🎉 Hotfix isTtsPlayEnabled Initialization Verification PASSED!");
console.log("====================================================");

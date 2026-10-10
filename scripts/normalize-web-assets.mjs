import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const outputDir = path.resolve(process.argv[2] ?? "dist");
const indexPath = path.join(outputDir, "index.html");

if (!fs.existsSync(indexPath)) {
  throw new Error(`Cannot normalize web asset paths: ${indexPath} does not exist.`);
}

let html = fs.readFileSync(indexPath, "utf8");
html = html
  .replaceAll('="/./assets/', '="./assets/')
  .replaceAll('="/assets/', '="./assets/')
  .replaceAll('"/./assets/', '"./assets/')
  .replaceAll('"/assets/', '"./assets/')
  .replaceAll("'/./assets/", "'./assets/")
  .replaceAll("'/assets/", "'./assets/")
  .replaceAll('="/favicon.ico"', '="./favicon.ico"')
  .replaceAll('"/favicon.ico"', '"./favicon.ico"');
fs.writeFileSync(indexPath, html);

console.log(`Normalized web asset paths in ${path.relative(process.cwd(), indexPath)}`);

// Stage web application into dist/demo/ so /demo serves the web app on GitHub Pages
const demoDir = path.join(outputDir, "demo");
fs.mkdirSync(demoDir, { recursive: true });

for (const entry of fs.readdirSync(outputDir)) {
  if (entry === "demo" || entry === "web" || entry === "android") continue;
  const src = path.join(outputDir, entry);
  const dest = path.join(demoDir, entry);
  fs.cpSync(src, dest, { recursive: true });
}
console.log(`Staged standalone web demo application in ${path.relative(process.cwd(), demoDir)}`);

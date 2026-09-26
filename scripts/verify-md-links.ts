import fs from 'node:fs';
import path from 'node:path';

interface BrokenLink {
  sourceFile: string;
  targetPath: string;
  resolvedPath: string;
  lineNumber: number;
}

const rootDir = process.cwd();
const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.next']);

function getAllMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...getAllMarkdownFiles(path.join(dir, entry.name)));
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

const mdFiles = getAllMarkdownFiles(rootDir);
const brokenLinks: BrokenLink[] = [];
let totalLinksChecked = 0;

// Regex to capture markdown links: [text](link)
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

for (const filePath of mdFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let inCodeBlock = false;

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) {
      return;
    }

    // Strip inline code spans to avoid regex character classes like `[,.](\d{3})` matching as links
    const strippedLine = line.replace(/`[^`]*`/g, '');

    let match: RegExpExecArray | null;
    linkRegex.lastIndex = 0;

    while ((match = linkRegex.exec(strippedLine)) !== null) {
      const target = match[2].trim();

      // Skip web links, anchors, and email links
      if (
        target.startsWith('http://') ||
        target.startsWith('https://') ||
        target.startsWith('mailto:') ||
        target.startsWith('#') ||
        target.includes('*') // Skip wildcard / example links
      ) {
        continue;
      }

      totalLinksChecked++;

      // Strip anchor fragment if present
      const cleanTarget = target.split('#')[0];
      if (!cleanTarget) {
        continue; // Pure anchor link within the same page
      }

      // Resolve path relative to source file directory
      const resolvedPath = path.resolve(path.dirname(filePath), cleanTarget);

      if (!fs.existsSync(resolvedPath)) {
        brokenLinks.push({
          sourceFile: path.relative(rootDir, filePath),
          targetPath: target,
          resolvedPath: path.relative(rootDir, resolvedPath),
          lineNumber: lineIndex + 1,
        });
      }
    }
  });
}

// Also verify mkdocs.yml navigation links if present
const mkdocsPath = path.join(rootDir, 'mkdocs.yml');
if (fs.existsSync(mkdocsPath)) {
  const mkdocsContent = fs.readFileSync(mkdocsPath, 'utf8');
  const navMdRegex = /:\s*([a-zA-Z0-9_\-./]+\.md)\b/g;
  let match: RegExpExecArray | null;
  while ((match = navMdRegex.exec(mkdocsContent)) !== null) {
    const navPath = match[1].trim();
    totalLinksChecked++;
    const resolvedPath = path.resolve(rootDir, 'docs', navPath);
    if (!fs.existsSync(resolvedPath)) {
      brokenLinks.push({
        sourceFile: 'mkdocs.yml',
        targetPath: navPath,
        resolvedPath: path.relative(rootDir, resolvedPath),
        lineNumber: 0,
      });
    }
  }
}

console.log(`\n--- Markdown Cross-Reference Validation ---`);
console.log(`Scanned ${mdFiles.length} markdown files.`);
console.log(`Checked ${totalLinksChecked} relative links.`);

if (brokenLinks.length > 0) {
  console.error(`\n❌ Found ${brokenLinks.length} broken relative links:`);
  for (const b of brokenLinks) {
    console.error(`  - ${b.sourceFile}:${b.lineNumber} -> "${b.targetPath}" (resolved to: ${b.resolvedPath})`);
  }
  process.exit(1);
} else {
  console.log(`✅ All markdown relative cross-references are valid!\n`);
  process.exit(0);
}

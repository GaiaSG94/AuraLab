// Syntax-check the inline script of every standalone bundle in dist/.
// A bundle can be broken even when every source file parses: the builder
// strips ESM imports, and a malformed strip only shows up in the output.
// Run: node scripts/check-dist.mjs
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const files = readdirSync(dist).filter((f) => f.endsWith(".html"));
if (files.length === 0) {
  console.error("::error::no standalone file found in dist/ — run scripts/build-standalone.mjs");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const html = readFileSync(join(dist, file), "utf8");
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  if (!m) {
    console.log(`::error file=dist/${file}::no inline script found`);
    failed += 1;
    continue;
  }
  const tmp = join(tmpdir(), `labkit-bundle-${file}.js`);
  writeFileSync(tmp, m[1]);
  try {
    execSync(`node --check "${tmp}"`, { stdio: "pipe" });
    console.log(`OK dist/${file}`);
  } catch (err) {
    const detail = String(err.stderr || err).split("\n").filter((l) => l.trim()).slice(0, 3).join(" | ");
    console.log(`::error file=dist/${file}::bundle does not parse: ${detail}`);
    failed += 1;
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* temp file cleanup is best effort */
    }
  }
}

console.log(`${files.length} bundle(s) checked: ${failed} error(s)`);
process.exit(failed === 0 ? 0 : 1);

/**
 * Fjerner blur/scale fra critical-bg-cover html::before i alle HTML-filer.
 * Brug ikke `\\s*` efter semikolon — det kan ælte næste linjes indrykning.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".git"]);

function stripBlurScale(t) {
  return (
    t
      // newline before filter/transform only; kun horisontalt whitespace efter ;
      .replace(/\r?\n[ \t]*filter:\s*blur\(2px\)\s*brightness\(1\.1\);[ \t]*/g, "\n")
      .replace(/\r?\n[ \t]*transform:\s*scale\(1\.05\);[ \t]*/g, "\n")
  );
}

function fixPointerIndent(t) {
  return t.replace(
    /(background-repeat: no-repeat;)\s*(\r?\n)pointer-events: none;/g,
    `$1$2        pointer-events: none;`,
  );
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.html$/i.test(e.name)) {
      let text = fs.readFileSync(p, "utf8");
      const next = fixPointerIndent(stripBlurScale(text));
      if (next !== text) fs.writeFileSync(p, next, "utf8");
    }
  }
}

walk(ROOT);

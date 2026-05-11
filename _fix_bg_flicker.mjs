/**
 * 1) Preload with real href (same as first var FILE) so fetch starts in <head>
 * 2) Inline critical first-paint CSS before external stylesheet (Gastronom pattern)
 * 3) decoding="sync" on img.bg-image to avoid async decode pop-in
 */
import fs from "fs";
import path from "path";

const root = path.dirname(new URL(import.meta.url).pathname);
// Windows: pathname may start with /C:/...
const rootDir = process.platform === "win32" && root.startsWith("/") ? root.slice(1) : root;

const SITE_CRITICAL = `    <style id="dsa-critical-first-paint">
html{margin:0;min-height:100%;overflow-y:scroll;scrollbar-gutter:stable;background:#cfd9e4}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;min-height:100vh;min-height:100svh;background:#cfd9e4;color:#fff;position:relative;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.bg-media{position:fixed;inset:0;z-index:0;overflow:hidden;background:#cfd9e4;backface-visibility:hidden;transform:translateZ(0)}
.bg-image{width:100%;height:100%;object-fit:cover;object-position:center center;display:block}
.bg-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.06) 0%,rgba(28,40,52,.12) 100%)}
.page-shell{position:relative;z-index:2;min-height:100vh;min-height:100svh;padding:2rem 1rem 3rem}
</style>
`;

const ARB_CRITICAL = `    <style id="dsa-critical-first-paint">
html{margin:0;min-height:100%;overflow-y:scroll;scrollbar-gutter:stable;background:#1a3a4a}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;min-height:100vh;min-height:100svh;background:#1a3a4a;color:#14212e;position:relative;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.bg-media{position:fixed;inset:0;z-index:0;overflow:hidden;background:#2a5f6f;backface-visibility:hidden;transform:translateZ(0)}
.bg-image{width:100%;height:100%;object-fit:cover;object-position:center 35%;display:block}
.bg-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;background:linear-gradient(165deg,rgba(255,248,240,.35) 0%,rgba(32,90,110,.45) 45%,rgba(18,48,62,.55) 100%)}
.page-shell{position:relative;z-index:2;min-height:100vh;min-height:100svh;padding:2rem 1rem 3rem}
</style>
`;

function walkHtml(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, out);
    else if (/\.html?$/i.test(ent.name)) out.push(p);
  }
  return out;
}

function firstFileVar(content) {
  const m = content.match(/var\s+FILE\s*=\s*["']([^"']+)["']/);
  return m ? m[1] : null;
}

function themeFor(content) {
  if (/href\s*=\s*["']css\/site\.css["']/.test(content)) return "site";
  if (/arbejdsteknik\.css/.test(content)) return "arb";
  if (/arbejdsmiljo\.css/.test(content)) return "arb";
  return null;
}

function patchPreloadHref(line, filePath) {
  return line.replace(
    /(<link\s+rel="preload"\s+id="dsa-page-bg-preload"\s+href=)""/,
    `$1"${filePath.replace(/&/g, "&amp;")}"`,
  );
}

function hasCritical(content) {
  return /id="dsa-critical-first-paint"/.test(content);
}

function injectCritical(content, critical, preloadLineNeedle) {
  const idx = content.indexOf(preloadLineNeedle);
  if (idx === -1) return content;
  const endLine = content.indexOf("\n", idx);
  const insertAt = endLine === -1 ? idx + preloadLineNeedle.length : endLine + 1;
  return content.slice(0, insertAt) + critical + content.slice(insertAt);
}

let updated = 0;
const files = walkHtml(rootDir);

for (const fp of files) {
  let text = fs.readFileSync(fp, "utf8");
  if (!text.includes('id="dsa-page-bg-preload"')) continue;

  const filePath = firstFileVar(text);
  if (!filePath) {
    console.warn("No FILE:", fp);
    continue;
  }

  let newText = text;

  // Preload href — only first occurrence
  newText = newText.replace(
    /(<link\s+rel="preload"\s+id="dsa-page-bg-preload"\s+href=)""/,
    `$1"${filePath.replace(/&/g, "&amp;")}"`,
  );

  // bg-image: async -> sync
  newText = newText.replace(
    /(<img\b[^>]*\bclass="bg-image"[^>]*\b)decoding="async"/g,
    `$1decoding="sync"`,
  );
  newText = newText.replace(
    /(<img\b[^>]*\b)decoding="async"([^>]*\bclass="bg-image")/g,
    `$1decoding="sync"$2`,
  );

  const theme = themeFor(newText);
  if (theme && !hasCritical(newText)) {
    const critical = theme === "site" ? SITE_CRITICAL : ARB_CRITICAL;
    const preloadMatch = newText.match(
      /<link\s+rel="preload"\s+id="dsa-page-bg-preload"\s+href="[^"]*"\s+as="image"[^/]*\/>/,
    );
    if (preloadMatch) {
      newText = injectCritical(newText, critical, preloadMatch[0]);
    }
  }

  if (newText !== text) {
    fs.writeFileSync(fp, newText, "utf8");
    updated++;
  }
}

console.log("Updated", updated, "files");

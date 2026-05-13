/**
 * Migrer kritisk blok fra .bg-media → html::before / html::after (som Læsevejlederen).
 * Fjerner <div class="bg-media"> og <div class="bg-scrim">.
 * Overskriver .page-* .bg-media position → html.page-*::before position.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const CRITICAL_RE = /<style id="critical-bg-cover">[\s\S]*?<\/style>/;
const DIV_MEDIA = /\s*<div class="bg-media"[^>]*>\s*<\/div>/gi;
const DIV_SCRIM = /\s*<div class="bg-scrim"[^>]*>\s*<\/div>/gi;

const OVERRIDE_RE =
  /\.([a-z0-9-]+)\s+\.bg-media\s*\{\s*background-position:\s*([^;]+);\s*\}/gi;

function walkHtml(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, out);
    else if (/\.html$/i.test(e.name)) out.push(p);
  }
  return out;
}

function escapePath(p) {
  return p.replace(/\\/g, "/").replace(/"/g, '\\"');
}

function buildCritical(bgColor, urlPath, position) {
  const safeUrl = escapePath(urlPath);
  return `    <style id="critical-bg-cover">
      html::before {
        content: "";
        position: fixed;
        inset: 0;
        z-index: 0;
        background-color: ${bgColor};
        background-image: url("${safeUrl}");
        background-size: cover;
        background-position: ${position};
        background-repeat: no-repeat;
        pointer-events: none;
      }
      html::after {
        content: "";
        position: fixed;
        inset: 0;
        z-index: 1;
        background: linear-gradient(
          rgba(30, 144, 255, 0.08),
          rgba(30, 144, 255, 0.08)
        );
        pointer-events: none;
      }
    </style>`;
}

function extractFromBgMedia(styleBlock) {
  const fbM = styleBlock.match(/background-color:\s*(#[0-9a-fA-F]{3,8})/i);
  const urlInnerM = styleBlock.match(/background-image:\s*url\s*\(\s*([^)]+)\s*\)/i);
  const inner = urlInnerM ? urlInnerM[1].trim() : "";
  const stripped = (/^["'](.*)["']$/s.exec(inner) || [null, inner])[1]?.trim();
  const urlPath =
    stripped !== undefined && stripped !== null ? stripped : inner;
  const posM = styleBlock.match(/background-position:\s*([^;]+);/i);
  return {
    bgColor: fbM ? fbM[1] : "#2a5f6f",
    urlPath,
    position: posM ? posM[1].trim() : "center 35%",
  };
}

function hasLaesePseudo(styleBlock) {
  return (
    styleBlock.includes("html::before") && styleBlock.includes("html::after")
  );
}

for (const file of walkHtml(ROOT)) {
  let text = fs.readFileSync(file, "utf8");
  const headMatch = text.match(CRITICAL_RE);
  if (!headMatch) continue;
  const oldCrit = headMatch[0];

  if (hasLaesePseudo(oldCrit)) {
    text = text.replace(DIV_MEDIA, "");
    text = text.replace(DIV_SCRIM, "");
    text = text.replace(
      OVERRIDE_RE,
      (m, pgClass, pos) =>
        `html.${pgClass}::before {\n        background-position: ${pos.trim()};\n      }`,
    );
    fs.writeFileSync(file, text, "utf8");
    console.log("clean_divs_override", path.relative(ROOT, file));
    continue;
  }

  if (!oldCrit.includes(".bg-media")) continue;

  const { bgColor, urlPath, position } = extractFromBgMedia(oldCrit);
  if (!urlPath) {
    console.error("NO_URL", path.relative(ROOT, file));
    continue;
  }

  const newCrit = buildCritical(bgColor, urlPath, position);
  text = text.replace(CRITICAL_RE, newCrit);
  text = text.replace(DIV_MEDIA, "");
  text = text.replace(DIV_SCRIM, "");
  text = text.replace(
    OVERRIDE_RE,
    (m, pgClass, pos) =>
      `html.${pgClass}::before {\n        background-position: ${pos.trim()};\n      }`,
  );
  fs.writeFileSync(file, text, "utf8");
  console.log("migrated", path.relative(ROOT, file));
}

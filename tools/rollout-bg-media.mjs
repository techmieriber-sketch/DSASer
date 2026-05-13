/**
 * (Ældre) Migrering til baggrund på .bg-media. Nye sider bruger html::before/::after +
 * :root { --dsa-bg-image } via layout-shell.css (jf. Læsevejlederen).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BLOCK_RE =
  /<div\b[^>]*\bclass="bg-media"[^>]*>\s*<img\b[^>]*(?:\/\s*|)>\s*<\/div>/gis;

function extractSrc(block) {
  const m = block.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i);
  return m ? m[2].trim() : "";
}

function firstImagePreloadHref(htmlChunk) {
  const re = /<link\b[^>]*>/gis;
  let m;
  while ((m = re.exec(htmlChunk))) {
    const tag = m[0];
    if (!/\brel\s*=\s*["']preload["']/i.test(tag)) continue;
    if (!/\bas\s*=\s*["']image["']/i.test(tag)) continue;
    const hm = tag.match(/\bhref\s*=\s*(["'])([^"']+)\1/i);
    if (hm) return hm[2].trim();
  }
  return null;
}

function parseDivStyle(divOpen) {
  const out = {};
  const sm = divOpen.match(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/i);
  if (!sm) return out;
  for (const part of sm[2].split(";")) {
    if (!part.includes(":")) continue;
    const [k, ...rest] = part.split(":");
    const key = k.trim().toLowerCase();
    const v = rest.join(":").trim();
    if (key === "background") out.background_shorthand = v;
    if (key === "background-color") out.background_color = v;
  }
  return out;
}

function imgStyle(imgTag) {
  const sm = imgTag.match(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/i);
  return sm ? sm[2].toLowerCase() : "";
}

function buildCritical(src, fallback, bgSize, bgPos) {
  return `    <style id="critical-bg-cover">
      /* Foto på .bg-media før linked CSS; undgår sync-dekodet hero-<img> på svage maskiner */
      .bg-media {
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        transform: translateZ(0);
        background-color: ${fallback};
        background-image: url("${src}");
        background-position: ${bgPos};
        background-size: ${bgSize};
        background-repeat: no-repeat;
      }
    </style>`;
}

function processFile(filePath) {
  let text = fs.readFileSync(filePath, "utf8");
  BLOCK_RE.lastIndex = 0;
  const matches = [...text.matchAll(BLOCK_RE)];
  if (!matches.length) return false;

  const block0 = matches[0][0];
  const divOpen = `${block0.split(">", 1)[0]}>`;
  const inner = block0.slice(divOpen.length);
  const imgTag = inner.match(/<img\b[^>]*(?:\/\s*|)>/is)?.[0] ?? "";

  let src = extractSrc(block0);
  if (!src) {
    src = firstImagePreloadHref(text.slice(0, matches[0].index)) ?? "";
  }

  const divSt = parseDivStyle(divOpen);
  const ist = imgStyle(imgTag);

  const isTestDig = path.basename(path.dirname(filePath)).toLowerCase() === "test-dig-selv";
  let fallback;
  let bgSize;
  let bgPos;

  if (isTestDig || ist.includes("object-fit: contain")) {
    fallback = divSt.background_color ?? "#d7e3ec";
    if (divSt.background_shorthand) {
      const tok = divSt.background_shorthand.replace(/,/g, " ").split(/\s+/).find((t) => t.startsWith("#"));
      if (tok) fallback = tok;
    }
    bgSize = "contain";
    bgPos = "center center";
  } else {
    fallback = divSt.background_color ?? "#2a5f6f";
    if (divSt.background_shorthand) {
      const tok = divSt.background_shorthand.replace(/,/g, " ").split(/\s+/).find((t) => t.startsWith("#"));
      if (tok) fallback = tok;
    }
    bgSize = "cover";
    bgPos = "center 35%";
  }

  if (!src) {
    console.error("SKIP (no src):", filePath);
    return false;
  }

  const newBlock = `    <div class="bg-media" aria-hidden="true"></div>`;
  BLOCK_RE.lastIndex = 0;
  const newTextAfterBlocks = text.replace(BLOCK_RE, newBlock);

  let newText = newTextAfterBlocks;
  if (!newText.includes('id="critical-bg-cover"')) {
    const titleEnd = newText.indexOf("</title>");
    if (titleEnd === -1) {
      console.error("SKIP (no title):", filePath);
      return false;
    }
    const nl = /\r\n/.test(newText) ? "\r\n" : "\n";
    const ins = nl + buildCritical(src, fallback, bgSize, bgPos);
    newText =
      newText.slice(0, titleEnd + "</title>".length) + ins + newText.slice(titleEnd + "</title>".length);
  }

  if (newText !== text) {
    fs.writeFileSync(filePath, newText, "utf8");
    console.log(`OK ${matches.length} block(s):`, filePath);
    return true;
  }
  return false;
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

let n = 0;
for (const p of walk(ROOT)) {
  const rel = path.relative(ROOT, p).split(path.sep).join("/");
  if (rel === "udtale/index.html") continue;
  if (processFile(p)) n++;
}
console.error(`Updated ${n} files`);

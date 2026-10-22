// Audit a live page against the parts of Apple's system that are measurable,
// and rank what to fix by how much it will actually show.
//
//   node tools/audit.mjs http://localhost:3000
//
// It reads computed styles out of a real browser, so it works on any stack —
// Tailwind, CSS modules, styled-components, plain CSS. It changes nothing.
//
// Why this exists: applying rhythm and tracking to a page that is already
// roughly spaced produces a result the owner cannot see. The things that read
// as "unconsidered" are nearly always countable — how many accent hues, how
// many ink steps, how many corner radii — and counting them first tells you
// where the work belongs.
import fs from "node:fs"; import os from "node:os"; import { spawn } from "node:child_process";

const URL_ = process.argv[2] || "http://localhost:3000";
const CHROME = process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const prof = fs.mkdtempSync(os.tmpdir() + "/audit-");
const port = 9200 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--hide-scrollbars",
  `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`,
  "--window-size=1440,900", "about:blank"], { stdio: "ignore" });

const sleep = (t) => new Promise((r) => setTimeout(r, t));
let targets;
for (let i = 0; i < 80; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; }
  catch { await sleep(250); }
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const call = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await call("Runtime.enable"); await call("Page.enable");
await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await call("Page.navigate", { url: URL_ });
await sleep(5000);
// let anything scroll-triggered reveal itself before measuring
await call("Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight); window.scrollTo(0, 0);" });
await sleep(1200);

const probe = `(() => {
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return cs;
  };
  // Computed colours come back in whatever space the stylesheet used —
  // rgb(), oklab(), color(display-p3 ...). A canvas context parses all of
  // them and hands back plain sRGB, which is the only way to compare them.
  // Computed colours come back in whatever space the stylesheet used —
  // rgb(), oklab(), color(display-p3 ...). Painting one pixel and reading it
  // back is the only parser that handles every one of them and returns sRGB.
  const cx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const rgba = (v) => {
    if (!v || v === "none" || v === "transparent") return null;
    if (cache.has(v)) return cache.get(v);
    let out = null;
    try {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "rgba(0, 0, 0, 0)";
      cx.fillStyle = v;
      cx.fillRect(0, 0, 1, 1);
      const p = cx.getImageData(0, 0, 1, 1).data;
      // getImageData is straight alpha, so the channels are already the
      // colour's own sRGB values and the hue survives a low opacity
      out = { r: p[0], g: p[1], b: p[2], a: p[3] / 255 };
    } catch {}
    cache.set(v, out);
    return out;
  };
  const key = (v) => { const c = rgba(v); if (!c) return v;
    return "rgb(" + Math.round(c.r) + ", " + Math.round(c.g) + ", " + Math.round(c.b) + ")" +
           (c.a < 1 ? " @" + c.a.toFixed(2) : ""); };
  const hsl = (c) => {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    const l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return { h, s, l };
  };

  const out = {
    chroma: {},      // hue bucket -> count, for anything saturated
    inks: {},        // text colour -> count
    radii: {},
    durations: {},
    tracking: {},    // font-size -> set of letter-spacing values
    sectionPad: {},
    stickyBlocked: [],
    stickyOk: 0,
    nodes: 0,
  };
  const bump = (o, k) => (o[k] = (o[k] || 0) + 1);

  for (const el of document.querySelectorAll("body *")) {
    const cs = vis(el);
    if (!cs) continue;
    out.nodes++;

    // --- ink steps: every distinct colour text is actually painted in
    const fg = rgba(cs.color);
    if (fg && fg.a > 0.05 && el.textContent && el.textContent.trim()) {
      const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (direct) bump(out.inks, key(cs.color));
    }

    // --- chromatic surfaces: saturated colour anywhere that paints
    for (const v of [cs.color, cs.backgroundColor, cs.borderTopColor, cs.borderBottomColor]) {
      const c = rgba(v);
      if (!c || c.a < 0.12) continue;
      const { h, s, l } = hsl(c);
      if (s < 0.3 || l < 0.08 || l > 0.96) continue;   // greys and near-black/white are not accents
      bump(out.chroma, String(Math.round(h / 30) * 30 % 360));
    }

    // --- radii (illustrations are shapes, not UI geometry)
    for (const v of (el.closest("[data-decorative]") ? [] : [cs.borderTopLeftRadius])) {
      const px = parseFloat(v);
      if (!(px > 0) || v.indexOf("%") !== -1) continue;
      bump(out.radii, px >= 500 ? "pill" : Math.round(px) + "px");
    }

    // --- transition / animation durations
    for (const v of (cs.transitionDuration || "").split(",")) {
      const ms = Math.round(parseFloat(v) * 1000);
      if (ms > 0) bump(out.durations, ms + "ms");
    }

    // --- tracking by size, for display sizes only
    const size = Math.round(parseFloat(cs.fontSize));
    if (size >= 20 && el.textContent && el.textContent.trim()) {
      const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (direct) {
        out.tracking[size] = out.tracking[size] || {};
        bump(out.tracking[size], cs.letterSpacing);
      }
    }

    // --- sticky that cannot work: an ancestor clips the scroll
    if (cs.position === "sticky") {
      let p = el.parentElement, blocker = null;
      while (p && p !== document.documentElement) {
        const pc = getComputedStyle(p);
        if (["hidden", "auto", "scroll", "clip"].includes(pc.overflowY) ||
            ["hidden", "clip"].includes(pc.overflowX)) {
          blocker = (p.tagName.toLowerCase() + (p.id ? "#" + p.id : "") +
                     (p.className && typeof p.className === "string"
                       ? "." + p.className.trim().split(/\\s+/).slice(0, 2).join(".") : ""));
          break;
        }
        p = p.parentElement;
      }
      const name = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
        (el.className && typeof el.className === "string"
          ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "");
      if (blocker) out.stickyBlocked.push(name + "  <-- clipped by  " + blocker);
      else out.stickyOk++;
    }
  }

  // --- section padding: top-level blocks that look like sections
  for (const el of document.querySelectorAll("section, main > div, main > section")) {
    const cs = vis(el);
    if (!cs) continue;
    const pt = Math.round(parseFloat(cs.paddingTop));
    if (pt > 0) bump(out.sectionPad, pt + "px");
  }
  return JSON.stringify(out);
})()`;

const res = await call("Runtime.evaluate", { expression: probe, returnByValue: true });
if (res.exceptionDetails) { console.error(res.exceptionDetails.text); process.exit(1); }
const d = JSON.parse(res.result.value);

ws.close(); chrome.kill(); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}

// ---------- report ----------
const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const findings = [];
const add = (weight, title, detail, fix) => findings.push({ weight, title, detail, fix });

const hues = Object.entries(d.chroma).filter(([, n]) => n >= 3);
const inks = Object.keys(d.inks).length;
const radii = Object.entries(d.radii).filter(([, n]) => n >= 3);
const pads = Object.keys(d.sectionPad).length;
const durs = Object.entries(d.durations).filter(([, n]) => n >= 3);

if (hues.length > 2)
  add(10, `${hues.length} accent hues in use`,
      hues.map(([h, n]) => `${h}° ×${n}`).join("  "),
      "Apple ships one. Pick the hue that already means 'action' on this page and map the rest to ink steps. This is almost always the single most visible change.");

// three ink steps, plus the inverse section's own two, plus an accent and a
// link, is six or seven before anything is wrong. Past that it is scatter.
if (inks > 7)
  add(9, `${inks} distinct text colours`,
      top(d.inks, 6).map(([c, n]) => `${c} ×${n}`).join("  "),
      "Three steps: primary, supporting, metadata. Every extra step is a decision the reader has to make and a hierarchy they cannot see.");

if (radii.length > 3)
  add(7, `${radii.length} corner radii`,
      radii.map(([r, n]) => `${r} ×${n}`).join("  "),
      "One pill for buttons and chips, one radius for cards, one for small tiles. Mixed radii read as unfinished more than any other geometry mistake.");

const strayNormal = Object.entries(d.tracking)
  .filter(([size, vals]) => vals.normal && +size !== 40)
  .map(([size, vals]) => `${size}px ×${vals.normal}`);
if (strayNormal.length)
  add(8, `${strayNormal.length} display sizes ship letter-spacing: normal`,
      strayNormal.join("  "),
      "Tracking is a function of size; only the 40px crossover is 0em. See references/typography.md for the table.");

const multiTrack = Object.entries(d.tracking).filter(([, v]) => Object.keys(v).length > 1);
if (multiTrack.length)
  add(4, `${multiTrack.length} sizes carry more than one tracking value`,
      multiTrack.map(([s, v]) => `${s}px: ${Object.keys(v).join(" / ")}`).join("   "),
      "One size, one tracking. Pick from the table and hold it.");

if (pads > 3)
  add(6, `${pads} different section paddings`,
      top(d.sectionPad, 8).map(([p, n]) => `${p} ×${n}`).join("  "),
      "Collapse onto one value from the ladder (80 or 100 desktop, ~60 phone). Varying it ad hoc is what makes a page feel loose.");

if (durs.length > 4)
  add(3, `${durs.length} transition durations`,
      durs.map(([t, n]) => `${t} ×${n}`).join("  "),
      "250ms default, 100ms hover, 400ms reveal. Hover must be the fastest thing on the page.");

if (d.stickyBlocked.length)
  add(9, `${d.stickyBlocked.length} sticky element(s) that cannot stick`,
      d.stickyBlocked.join("\n              "),
      "position: sticky does nothing inside an ancestor that clips scrolling. Move the overflow:hidden onto the decorative layer that needs it.");

findings.sort((a, b) => b.weight - a.weight);

console.log(`\n  apple-design audit — ${URL_}`);
console.log(`  ${d.nodes} painted elements, ${d.stickyOk} working sticky element(s)\n`);
if (!findings.length) {
  console.log("  Nothing countable is off. What is left is judgement: voice, art");
  console.log("  direction, and whether the page has one idea per section.\n");
} else {
  findings.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.title}`);
    console.log(`     ${f.detail}`);
    console.log(`     -> ${f.fix}\n`);
  });
  console.log("  Work top-down. The first two are what someone notices;");
  console.log("  rhythm and motion below them are what they feel.\n");
}

// Audit a live page against the parts of Apple's system that are measurable,
// and rank what to fix by how much it will actually show.
//
//   node tools/audit.mjs <url>
//   node tools/audit.mjs <url> --json before.json      write the raw measurements
//   node tools/audit.mjs <url> --baseline before.json  print what changed since
//
// It reads computed styles out of a real browser at three viewport widths, so
// it works on any stack — Tailwind, CSS modules, styled-components, plain CSS.
// It changes nothing.
//
// Why this exists: applying rhythm and tracking to a page that is already
// roughly spaced produces a result the owner cannot see. The things that read
// as "unconsidered" are nearly always countable — how many accent hues, how
// many ink steps, how many corner radii — and counting them first tells you
// where the work belongs. --baseline exists for the other half of that
// problem: showing someone what the work actually did.
import fs from "node:fs"; import os from "node:os"; import { spawn } from "node:child_process";

const isCli = import.meta.url === `file://${process.argv[1]}`;
const args = process.argv.slice(2);
const URL_ = args.find((a) => !a.startsWith("--")) || "http://localhost:3000";
const flag = (name) => { const i = args.indexOf("--" + name); return i === -1 ? null : args[i + 1]; };
const JSON_OUT = flag("json");
const BASELINE = flag("baseline");
const CHROME = process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Apple's three bands. A headline is supposed to be re-picked at each one, not
// scaled, and that is only visible by measuring more than one width.
const WIDTHS = [1440, 900, 500];

// ---------------------------------------------------------------- the probe
// Runs in the page. Never executed in Node — it is stringified and evaluated
// over CDP, which is why it uses no imports and no Node globals.
function probeFn() {
  // Computed colours come back in whatever space the stylesheet used — rgb(),
  // oklab(), color(display-p3 ...). Painting one pixel and reading it back is
  // the only parser that handles every one of them and returns sRGB.
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
      // getImageData is straight alpha, so the channels are the colour's own
      // sRGB values and the hue survives a low opacity
      out = { r: p[0], g: p[1], b: p[2], a: p[3] / 255 };
    } catch (e) { /* unparseable value */ }
    cache.set(v, out);
    return out;
  };
  const key = (v) => {
    const c = rgba(v);
    if (!c) return v;
    return "rgb(" + Math.round(c.r) + ", " + Math.round(c.g) + ", " + Math.round(c.b) + ")" +
      (c.a < 1 ? " @" + c.a.toFixed(2) : "");
  };
  const hueOf = (c) => {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    if (!d) return null;
    const s = d / (1 - Math.abs(2 * l - 1));
    if (s < 0.3 || l < 0.08 || l > 0.96) return null;   // greys are not accents
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return Math.round((((h * 60) + 360) % 360) / 30) * 30 % 360;
  };
  const lum = (c) => {
    const ch = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  };

  // a short, human-readable path — enough to find the element in a codebase
  const nameOf = (el) => {
    const cls = typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + cls;
  };
  const pathOf = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body && parts.length < 3; n = n.parentElement) parts.unshift(nameOf(n));
    return parts.join(" > ");
  };

  const out = {
    width: window.innerWidth,
    chroma: {}, chromaWhere: {},
    inks: {}, inksWhere: {},
    radii: {}, radiiWhere: {},
    durations: {},
    sectionPad: {},
    tracking: {},
    display: [],        // every element carrying display-size text
    headlines: [],      // h1..h3 text, for the voice check
    contrast: [],
    stickyBlocked: [], stickyOk: 0,
    pxRhythm: [],
    nodes: 0,
  };
  const bump = (o, k) => (o[k] = (o[k] || 0) + 1);
  const note = (o, k, v) => { (o[k] = o[k] || []); if (o[k].length < 4 && o[k].indexOf(v) === -1) o[k].push(v); };

  // Contrast has to be judged against what the text actually sits on — its own
  // background if it has one, otherwise the nearest ancestor that paints. The
  // page background is the wrong answer for a filled button, which is exactly
  // where it would report a false failure.
  const bgBehind = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const v = rgba(getComputedStyle(n).backgroundColor);
      if (v && v.a > 0.5) return v;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    out.nodes++;

    const ownsText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

    if (ownsText) {
      const c = rgba(cs.color);
      if (c && c.a > 0.05) {
        bump(out.inks, key(cs.color));
        note(out.inksWhere, key(cs.color), pathOf(el));
        const a = lum(c), b = lum(bgBehind(el));
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
        if (ratio < (large ? 3 : 4.5) && c.a > 0.3)
          out.contrast.push({ where: pathOf(el), colour: key(cs.color), ratio: +ratio.toFixed(2), size });
      }

      const size = Math.round(parseFloat(cs.fontSize));
      if (size >= 20) {
        out.tracking[size] = out.tracking[size] || {};
        bump(out.tracking[size], cs.letterSpacing);
        out.display.push({ path: pathOf(el), size, track: cs.letterSpacing, weight: cs.fontWeight });
      }
      if (/^H[1-3]$/.test(el.tagName)) {
        const t = el.textContent.trim().replace(/\s+/g, " ");
        if (t && t.length < 200) out.headlines.push(t);
      }
    }

    for (const v of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
      const c = rgba(v);
      if (!c || c.a < 0.12) continue;
      const h = hueOf(c);
      if (h === null) continue;
      bump(out.chroma, String(h));
      note(out.chromaWhere, String(h), pathOf(el));
    }

    // illustrations are shapes, not UI geometry
    if (!el.closest("[data-decorative]")) {
      const rad = parseFloat(cs.borderTopLeftRadius);
      if (rad > 0 && cs.borderTopLeftRadius.indexOf("%") === -1) {
        const k = rad >= 500 ? "pill" : Math.round(rad) + "px";
        bump(out.radii, k);
        note(out.radiiWhere, k, pathOf(el));
      }
    }

    for (const v of (cs.transitionDuration || "").split(",")) {
      const ms = Math.round(parseFloat(v) * 1000);
      if (ms > 0) bump(out.durations, ms + "ms");
    }

    // rhythm: a px margin between two stacked text elements is exactly what the
    // em ladder replaces
    if (ownsText && parseFloat(cs.fontSize) >= 14) {
      const mt = parseFloat(cs.marginTop);
      const prev = el.previousElementSibling;
      if (mt > 0 && prev && prev.textContent.trim()) {
        if (!/em$/.test(el.style.marginTop || "")) out.pxRhythm.push(Math.round(mt));
      }
    }

    if (cs.position === "sticky") {
      let p = el.parentElement, blocker = null;
      while (p && p !== document.documentElement) {
        const pc = getComputedStyle(p);
        if (["hidden", "auto", "scroll", "clip"].includes(pc.overflowY) ||
            ["hidden", "clip"].includes(pc.overflowX)) { blocker = nameOf(p); break; }
        p = p.parentElement;
      }
      if (blocker) out.stickyBlocked.push(nameOf(el) + "  <-- clipped by  " + blocker);
      else out.stickyOk++;
    }
  }

  for (const el of document.querySelectorAll("section, main > div, main > section")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none") continue;
    const pt = Math.round(parseFloat(cs.paddingTop));
    if (pt > 0) bump(out.sectionPad, pt + "px");
  }
  return JSON.stringify(out);
}

// ------------------------------------------------------------------ driver
export async function runAudit(url, widths = WIDTHS) {
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
if (!targets) { console.error("could not start Chrome — set CHROME to its path"); process.exit(1); }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const call = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await call("Runtime.enable"); await call("Page.enable");

const measure = async (width) => {
  await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url });
  await sleep(4500);
  // let anything scroll-triggered reveal itself before measuring
  await call("Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight); window.scrollTo(0, 0);" });
  await sleep(1000);
  const r = await call("Runtime.evaluate", { expression: `(${probeFn.toString()})()`, returnByValue: true });
  if (r.exceptionDetails) { console.error(r.exceptionDetails.text); process.exit(1); }
  return JSON.parse(r.result.value);
};

const byWidth = {};
for (const w of widths) byWidth[w] = await measure(w);
ws.close(); chrome.kill(); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}

const d = byWidth[widths[0]];

// ---------------------------------------------------------------- findings
const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const findings = [];
const add = (weight, title, detail, fix, where) => findings.push({ weight, title, detail, fix, where });

const hues = Object.entries(d.chroma).filter(([, n]) => n >= 3);
const inks = Object.keys(d.inks).length;
const radii = Object.entries(d.radii).filter(([, n]) => n >= 3);
const pads = Object.keys(d.sectionPad).length;
const durs = Object.entries(d.durations).filter(([, n]) => n >= 3);

if (hues.length > 2)
  add(10, `${hues.length} accent hues in use`,
      hues.map(([h, n]) => `${h}° ×${n}`).join("  "),
      "Apple ships one. Pick the hue that already means 'action' on this page and map the rest to ink steps. Almost always the single most visible change.",
      hues.flatMap(([h]) => (d.chromaWhere[h] || []).slice(0, 1).map((p) => `${h}°  ${p}`)));

if (inks > 7)
  add(9, `${inks} distinct text colours`,
      top(d.inks, 6).map(([c, n]) => `${c} ×${n}`).join("  "),
      "Three steps: primary, supporting, metadata — plus an inverse pair and a link. Every extra step is a hierarchy the reader cannot see.",
      top(d.inks, 4).flatMap(([c]) => (d.inksWhere[c] || []).slice(0, 1).map((p) => `${c}  ${p}`)));

if (radii.length > 3)
  add(7, `${radii.length} corner radii`,
      radii.map(([r, n]) => `${r} ×${n}`).join("  "),
      "One pill for buttons and chips, one radius for cards, one for small tiles. Mixed radii read as unfinished faster than any other geometry mistake.",
      radii.flatMap(([r]) => (d.radiiWhere[r] || []).slice(0, 1).map((p) => `${r}  ${p}`)));

const strayNormal = Object.entries(d.tracking).filter(([size, v]) => v.normal && +size !== 40);
if (strayNormal.length)
  add(8, `${strayNormal.length} display sizes ship letter-spacing: normal`,
      strayNormal.map(([s, v]) => `${s}px ×${v.normal}`).join("  "),
      "Tracking is a function of size; only the 40px crossover is 0em. See references/typography.md.",
      d.display.filter((e) => e.track === "normal" && e.size !== 40).slice(0, 4).map((e) => `${e.size}px  ${e.path}`));

const multiTrack = Object.entries(d.tracking).filter(([, v]) => Object.keys(v).length > 1);
if (multiTrack.length)
  add(4, `${multiTrack.length} sizes carry more than one tracking value`,
      multiTrack.map(([s, v]) => `${s}px: ${Object.keys(v).join(" / ")}`).join("   "),
      "One size, one tracking. Pick from the table and hold it.");

// responsive: a headline is supposed to be re-picked on phone, not scaled
const phone = byWidth[widths[widths.length - 1]];
const byPath = new Map(phone.display.map((e) => [e.path, e]));
const scaled = [], frozen = [];
for (const e of d.display) {
  const p = byPath.get(e.path);
  if (!p) continue;
  if (p.size !== e.size && p.track === e.track && e.track !== "normal")
    scaled.push(`${e.path}  ${e.size}px -> ${p.size}px, tracking stayed ${e.track}`);
  if (p.size === e.size && e.size >= 40) frozen.push(`${e.path}  ${e.size}px at every width`);
}
if (scaled.length)
  add(6, `${scaled.length} headline(s) scaled on phone instead of re-picked`,
      "the size changed but the tracking did not follow it",
      "Each size has its own tracking: 64px -> 40px means -0.009em -> 0em, not -0.009em at a smaller size.",
      scaled.slice(0, 4));
if (frozen.length)
  add(5, `${frozen.length} large headline(s) never step down on phone`,
      "",
      "66 of Apple's 106 type classes change at a breakpoint. A 48px headline on a 500px viewport is two words per line.",
      frozen.slice(0, 4));

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
      "an ancestor clips the scroll axis, which makes position: sticky inert",
      "Move the overflow:hidden onto the decorative layer that needs it, not the section.",
      d.stickyBlocked);

if (d.contrast.length)
  add(8, `${d.contrast.length} text element(s) below WCAG AA`,
      d.contrast.slice(0, 3).map((c) => `${c.ratio}:1 at ${Math.round(c.size)}px — ${c.colour}`).join("   "),
      "Supporting copy still has to be readable. If an ink step fails, it is decoration, not text.",
      d.contrast.slice(0, 4).map((c) => `${c.ratio}:1  ${c.where}`));

// voice
if (d.headlines.length >= 3) {
  const words = d.headlines.map((h) => h.split(/\s+/).length).sort((a, b) => a - b);
  const median = words[Math.floor(words.length / 2)];
  const stops = d.headlines.filter((h) => /[.!?]$/.test(h)).length / d.headlines.length;
  if (median > 5 || stops < 0.2)
    add(2, `headlines run ${median} words median, ${Math.round(stops * 100)}% end in a full stop`,
        "Apple's median is 3 words, and 42% end in a full stop",
        "Short declarative fragments. See references/voice.md before rewriting any of them.",
        d.headlines.slice(0, 4));
}

const pxGaps = new Set(d.pxRhythm);
if (pxGaps.size > 6)
  add(4, `${pxGaps.size} different px gaps between stacked text elements`,
      [...pxGaps].sort((a, b) => a - b).slice(0, 12).join(", ") + "px",
      "The em ladder (0.4 / 0.8 / 1.6) replaces these so spacing scales with the type it follows. Lowest-visibility fix on this list — do it after the ones above.");

findings.sort((a, b) => b.weight - a.weight);

// ------------------------------------------------------------------ output
const summary = {
  url, when: new Date().toISOString(),
  hues: hues.length, inks, radii: radii.length, pads, durs: durs.length,
  strayNormal: strayNormal.length, scaled: scaled.length, frozen: frozen.length,
  stickyBlocked: d.stickyBlocked.length, stickyOk: d.stickyOk,
  contrastFails: d.contrast.length, nodes: d.nodes,
};

  return { summary, findings, byWidth };
}

// --------------------------------------------------------------------- cli
function report(url, { summary, findings, byWidth }, widths = WIDTHS) {
  const d = byWidth[widths[0]];
  console.log(`\n  apple-design audit — ${url}`);
  console.log(`  measured at ${widths.join(" / ")}px · ${d.nodes} painted elements · ${d.stickyOk} working sticky element(s)\n`);
  if (!findings.length) {
    console.log("  Nothing countable is off. What is left is judgement: voice, art");
    console.log("  direction, and whether the page has one idea per section.\n");
    return;
  }
  findings.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.title}`);
    if (f.detail) console.log(`     ${f.detail}`);
    for (const w of (f.where || []).slice(0, 4)) console.log(`       · ${w}`);
    console.log(`     -> ${f.fix}\n`);
  });
  console.log("  Work top-down. The first two are what someone notices;");
  console.log("  rhythm and motion below them are what they feel.\n");
}

function reportDelta(was, now) {
  const labels = {
    hues: "accent hues", inks: "text colours", radii: "corner radii",
    pads: "section paddings", durs: "durations", strayNormal: "sizes tracked normal",
    scaled: "headlines scaled not re-picked", frozen: "headlines frozen on phone",
    stickyBlocked: "sticky blocked", contrastFails: "below AA",
  };
  console.log("  change since baseline\n");
  let moved = false;
  for (const k of Object.keys(labels)) {
    const a = was[k] ?? 0, b = now[k] ?? 0;
    if (a === b) continue;
    moved = true;
    console.log(`     ${labels[k].padEnd(34)} ${a} ${b < a ? "↓" : "↑"} ${b}`);
  }
  console.log(moved ? "" : "     nothing countable moved — if the page looks the same, it is the same\n");
}

if (isCli) {
  const result = await runAudit(URL_);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ summary: result.summary, byWidth: result.byWidth }, null, 2));
  report(URL_, result);
  if (BASELINE) reportDelta(JSON.parse(fs.readFileSync(BASELINE, "utf8")).summary, result.summary);
}

// Conformance: render a page built with this skill and assert its COMPUTED
// styles against the values apple.com actually ships (assets/type-scale.json,
// extracted from Apple's own stylesheets).
//
//   node test/conformance.mjs [url]
//
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { spawn } from "node:child_process";

const URL_ = process.argv[2] || process.env.TARGET_URL || "http://localhost:4100/example/index.html";
const SKILL = path.resolve(import.meta.dirname, "../skills/apple-design");
const SCALE = JSON.parse(fs.readFileSync(path.join(SKILL, "assets/type-scale.json"), "utf8"));
// headline steps that live in other product stylesheets, same source
SCALE["typography-headline-reduced"] ??= { base: { size: "40px", line: "1.1", weight: "600", tracking: "0em" } };
SCALE["typography-headline"] ??= { base: { size: "48px", line: "1.0834933333", weight: "600", tracking: "-0.003em" } };
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// which measured Apple class each utility claims to implement
const CLAIMS = {
  ".t-headline-elevated": "typography-headline-elevated",
  ".t-headline":          "typography-headline-reduced",
  ".t-eyebrow":           "typography-callout-elevated",
  ".t-eyebrow-super":     "typography-eyebrow-super",
  ".t-intro":             "typography-intro",
  ".t-label":             "typography-label",
  ".t-body":              "typography-body",
  ".t-body-reduced":      "typography-body-reduced",
  ".t-caption":           "typography-caption",
};

const prof = fs.mkdtempSync(os.tmpdir() + "/conf-");
const port = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--hide-scrollbars",
  `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`, "--window-size=1440,1000", "about:blank"], { stdio: "ignore" });
const sleep = (t) => new Promise((r) => setTimeout(r, t));
let tg; for (let i = 0; i < 80; i++) { try { tg = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tg.find((t) => t.type === "page").webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const call = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await call("Runtime.enable"); await call("Page.enable");
await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

const load = async (width = 1440) => {
  await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: URL_ }); await sleep(4000);
};
const evaluate = async (expr) => {
  const r = await call("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

const checks = [];
const ok = (name, cond, detail = "") => checks.push({ name, pass: !!cond, detail });
const eq = (name, got, exp) => ok(name, got === exp, `got ${got}, expected ${exp}`);
// em tracking -> px, the unit getComputedStyle reports
const emToPx = (em, size) => {
  const px = +(parseFloat(em) * parseFloat(size)).toFixed(4);
  return px === 0 ? "normal" : `${px}px`;   // 0em computes to "normal"
};

await load(1440);

// --- 1. type scale matches the measured Apple values ---
const present = await evaluate(`(() => {
  const out = {};
  for (const sel of ${JSON.stringify(Object.keys(CLAIMS))}) {
    const el = document.querySelector(sel);
    if (!el) { out[sel] = null; continue; }
    const cs = getComputedStyle(el);
    out[sel] = { size: cs.fontSize, line: cs.lineHeight, weight: cs.fontWeight, track: cs.letterSpacing };
  }
  return out;
})()`);

let used = 0;
for (const [sel, appleClass] of Object.entries(CLAIMS)) {
  const got = present[sel];
  if (!got) continue;                      // utility not used on this page
  used++;
  const want = SCALE[appleClass].base;
  eq(`${sel} font-size = ${appleClass}`, got.size, want.size);
  // the browser rounds computed line-height to 0.01px, so compare within that
  const gotRatio = parseFloat(got.line) / parseFloat(want.size);
  ok(`${sel} line-height = ${appleClass}`,
     Math.abs(gotRatio - parseFloat(want.line)) * parseFloat(want.size) < 0.02,
     `got ${gotRatio.toFixed(6)}, expected ${want.line}`);
  eq(`${sel} font-weight = ${appleClass}`, got.weight, want.weight);
  eq(`${sel} tracking = ${appleClass}`, got.track, emToPx(want.tracking, want.size));
}
ok("page uses at least 5 scale steps", used >= 5, `${used} in use`);

// --- 2. tracking tightens as type grows (never "normal") ---
const track = await evaluate(`[...document.querySelectorAll("h1,h2,h3,p,li,a,span")]
  .map(e => { const cs = getComputedStyle(e);
    return { px: parseFloat(cs.fontSize), t: cs.letterSpacing }; })
  .filter(r => r.px >= 20)`);
// tracking crosses zero at 40px, so that is the one size allowed to be "normal"
const strayNormal = track.filter((r) => r.t === "normal" && r.px !== 40);
ok("only the 40px step computes to letter-spacing: normal", strayNormal.length === 0,
   `${strayNormal.length} of ${track.length} at >=20px`);

// --- 3. buttons ---
const btn = await evaluate(`(() => { const b = document.querySelector(".button:not([class*=--compact])");
  if (!b) return null; const cs = getComputedStyle(b);
  return { pad: cs.padding, radius: cs.borderRadius, bg: cs.backgroundColor, size: cs.fontSize, minw: cs.minWidth }; })()`);
if (btn) {
  eq("button padding is 12px 22px", btn.pad, "12px 22px");
  eq("button radius is a 980px pill", btn.radius, "980px");
  eq("button background is the accent", btn.bg, "rgb(0, 113, 227)");
  eq("button font-size is 17px", btn.size, "17px");
  eq("button min-width is 70px", btn.minw, "70px");
} else ok("page has a .button", false);

// --- 4. palette ---
const pal = await evaluate(`(() => { const s = getComputedStyle(document.documentElement);
  const g = (k) => s.getPropertyValue(k).trim().toLowerCase();
  return { ink: g("--ink"), alt: g("--surface-alt"), accent: g("--accent"),
           sec: g("--ink-secondary"), muted: g("--ink-muted") }; })()`);
eq("--ink is #1d1d1f", pal.ink, "#1d1d1f");
eq("--surface-alt is #f5f5f7", pal.alt, "#f5f5f7");
eq("--accent is #0071e3", pal.accent, "#0071e3");
eq("--ink-secondary is #6e6e73", pal.sec, "#6e6e73");
eq("--ink-muted is #86868b", pal.muted, "#86868b");

// --- 5. rhythm is em-based on the 0.4/0.8/1.6 ladder ---
const rhythm = await evaluate(`(() => { const s = getComputedStyle(document.documentElement);
  return ["--stacked-margin","--headline-plus-headline","--headline-plus-first",
          "--paragraph-plus-element","--paragraph-plus-headline"].map(k => [k, s.getPropertyValue(k).trim()]); })()`);
for (const [k, v] of rhythm) ok(`${k} is em-based`, /em$/.test(v), v);
eq("rhythm follows the 0.4 / 0.8 / 1.6 ladder",
   rhythm.map(([, v]) => v.replace(/^\./, "0.")).join(" "),
   "0.4em 0.4em 0.8em 0.8em 1.6em");

// --- 6. content column + breakpoints ---
eq("content column is 1068px on desktop",
   await evaluate(`getComputedStyle(document.querySelector(".section-content")).maxWidth`), "1068px");
await load(900);
eq("content column is 734px on tablet",
   await evaluate(`getComputedStyle(document.querySelector(".section-content")).maxWidth`), "734px");

// --- 7. type is re-picked on phone, not scaled ---
await load(500);
const phone = await evaluate(`(() => { const el = document.querySelector(".t-headline-elevated");
  if (!el) return null; const cs = getComputedStyle(el);
  return { size: cs.fontSize, track: cs.letterSpacing }; })()`);
if (phone) {
  ok("headline steps down on phone", parseFloat(phone.size) < 64, phone.size);
  ok("headline tracking re-picked for the new size",
     phone.track !== emToPx("-0.009em", "64px"), phone.track);
} else ok("page has a .t-headline-elevated", false);

// --- 8. readable with no JS ---
await load(1440);
const withJsText = await evaluate(`((document.querySelector("main") || document.body).innerText || "").trim().length`);
await call("Emulation.setScriptExecutionDisabled", { value: true });
await load(1440);
const noJs = await evaluate(`(() => {
  const main = document.querySelector("main") || document.body;
  const els = [...main.querySelectorAll("h1,h2,h3,p,li,a")];
  const hidden = els.filter(e => { const cs = getComputedStyle(e);
    return cs.opacity === "0" || cs.visibility === "hidden" || cs.display === "none"; });
  return { total: els.length, hidden: hidden.length,
           body: getComputedStyle(document.body).opacity,
           text: (main.innerText || "").trim().length };
})()`);
await call("Emulation.setScriptExecutionDisabled", { value: false });
ok("no content is hidden with JS off", noJs.hidden === 0, `${noJs.hidden}/${noJs.total} hidden`);
eq("body is visible with JS off", noJs.body, "1");
// the real question is whether anything is LOST without JS, not an absolute size
ok("no text is lost with JS off", noJs.text >= withJsText * 0.95,
   `${noJs.text} chars without JS vs ${withJsText} with`);

// --- 9. reduced motion ---
await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await load(1440);
const rm = await evaluate(`(() => { const b = document.querySelector(".button");
  return b ? getComputedStyle(b).transitionDuration : null; })()`);
ok("transitions collapse under prefers-reduced-motion", rm !== null && parseFloat(rm) <= 0.001, String(rm));

ws.close(); chrome.kill(); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}

const structure = (await import("./structure.mjs")).default;
const all = [...structure, ...checks];
const passed = all.filter((c) => c.pass).length;
for (const c of all) if (!c.pass) console.log("FAIL:", c.name, "—", c.detail);
console.log(`\ntarget      ${URL_}`);
console.log(`structure   ${structure.filter((c) => c.pass).length}/${structure.length}`);
console.log(`conformance ${checks.filter((c) => c.pass).length}/${checks.length}`);
console.log(`TOTAL       ${passed}/${all.length}  (${Math.round((passed / all.length) * 100)}/100)`);
process.exit(passed === all.length ? 0 : 1);

// The component contract, checked against the showcase page.
//
//   node test/gallery.mjs
//
// references/micro.md is read out of apple.com's shipped --sk-dotnav-* and
// --sk-paddlenav-* token blocks. This asserts the page actually implements it:
// an 8px dot inside a 24px target, hover at 120ms against a change at 320ms,
// overflow that tapers to 0.75 then 0.5 then zero width instead of
// paginating, a current dot that cannot be clicked, and a paddle that is
// invisible on hover yet still reachable — and visible — from the keyboard.
// That last one is the bug most hand-built carousels ship, and it needs a real
// Tab keypress to test, because a programmatic focus() does not satisfy
// :focus-visible.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import http from "node:http"; import { spawn } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!path.resolve(file).startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PAGE = `http://127.0.0.1:${server.address().port}/example/index.html`;

const CHROME = process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const prof = fs.mkdtempSync(os.tmpdir() + "/gal-");
const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--hide-scrollbars",
  `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`, "--window-size=1440,900", "about:blank"], { stdio: "ignore" });
const sleep = (t) => new Promise(r => setTimeout(r, t));
let tg; for (let i = 0; i < 80; i++) { try { tg = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tg.find(t => t.type === "page").webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const call = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
await new Promise(r => (ws.onopen = r));
await call("Runtime.enable"); await call("Page.enable");
const ev = async (expr) => {
  const r = await call("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description || ""));
  return r.result.value;
};
const checks = [];
const ok = (n, c, d = "") => { checks.push(!!c); console.log(`${c ? "  ok  " : "FAIL  "}${n}${c || !d ? "" : " — " + d}`); };

try {
  await call("Page.navigate", { url: PAGE });
  await sleep(3500);

  const state = () => ev(`JSON.stringify((() => {
    const g = document.querySelector(".gallery");
    const dots = [...g.querySelectorAll(".dotnav-item")];
    return {
      current: dots.findIndex(d => d.classList.contains("current")),
      classes: dots.map(d => [...d.classList].filter(c => c.startsWith("dotnav-truncate")).join("") || "full"),
      scales: dots.map(d => getComputedStyle(d.querySelector(".dotnav-link"), "::before").scale),
      sizes: dots.map(d => Math.round(d.querySelector(".dotnav-link").getBoundingClientRect().width)),
      prevDisabled: g.querySelector(".paddlenav-prev").disabled,
      nextDisabled: g.querySelector(".paddlenav-next").disabled,
      name: (g.querySelector(".gallery-slide.is-current .slide-label .t-label") || {}).textContent,
      currentPointer: getComputedStyle(dots[dots.findIndex(d => d.classList.contains("current"))].querySelector(".dotnav-link")).pointerEvents,
      paddleOpacity: getComputedStyle(g.querySelector(".paddlenav-next")).opacity,
      hoverDur: getComputedStyle(g.querySelector(".paddlenav-next")).transitionDuration,
      dotDur: getComputedStyle(dots[0].querySelector(".dotnav-link"), "::before").transitionDuration,
    };
  })())`).then(JSON.parse);

  let s = await state();
  ok("starts on the first slide", s.current === 0, `index ${s.current}`);
  ok("the previous paddle starts disabled", s.prevDisabled === true);
  ok("the next paddle starts enabled", s.nextDisabled === false);
  ok("paddles are invisible until hover or focus", s.paddleOpacity === "0", s.paddleOpacity);
  ok("paddle feedback is 100ms", s.hoverDur.startsWith("0.1s"), s.hoverDur);
  // Apple ships 100ms on the paddlenav and 120ms on the dotnav. Both are
  // "hover is the fastest thing on the page"; a page picks one and holds it.
  ok("the dot hover step is at most 120ms and the change step is 320ms",
     /0\.1s|0\.12s/.test(s.dotDur) && /0\.32s/.test(s.dotDur), s.dotDur);
  ok("the current dot is inert", s.currentPointer === "none", s.currentPointer);
  ok("the dot target is 24px around an 8px dot", s.sizes[0] === 24, `${s.sizes[0]}px`);
  // The taper ladder is 1 -> 0.75 -> 0.5 -> gone by distance from the current
  // dot. How many rungs a page can show depends on how many slides it has, so
  // the assertions follow the dot count rather than assuming six.
  const n = s.classes.length;
  ok("far dots taper rather than vanish",
     s.classes[2] === "dotnav-truncate-2" && s.classes[3] === "dotnav-truncate-3",
     s.classes.join(" / "));
  ok("the taper is a scale, not a removal",
     s.scales[0] === "1" && s.scales[2] === "0.75" && s.scales[3] === "0.5", s.scales.join(" "));
  if (n >= 6) {
    ok("dots past the taper are hidden", s.classes[5] === "dotnav-truncate-hidden", s.classes.join(" / "));
    ok("the hidden dot keeps its place in the row", s.sizes[5] === 0, `${s.sizes[5]}px wide`);
  }

  await ev(`document.querySelector(".paddlenav-next").click()`); await sleep(900);
  s = await state();
  ok("next moves one slide", s.current === 1, `index ${s.current}`);
  // The expected name comes from the page, not from a literal: this test is
  // about the component tracking the slide, not about what the slides are.
  const names = await ev(`JSON.stringify([...document.querySelectorAll(".slide-label .t-label")].map(e => e.textContent.trim()))`).then(JSON.parse);
  ok("the name follows the slide", s.name === names[1], `${s.name} / expected ${names[1]}`);
  ok("previous becomes enabled", s.prevDisabled === false);

  const last = n - 1;
  await ev(`[...document.querySelectorAll(".dotnav-link")][${last}].click()`); await sleep(900);
  s = await state();
  ok("a dot click jumps to its slide", s.current === last, `index ${s.current}`);
  ok("next is disabled at the end", s.nextDisabled === true);
  ok("the taper mirrors on the other side",
     s.classes[last - 2] === "dotnav-truncate-2" && s.classes[last - 3] === "dotnav-truncate-3",
     s.classes.join(" / "));

  // Keyboard: the paddle is opacity 0 until hover OR :focus-visible. A
  // programmatic .focus() does not satisfy :focus-visible in Chrome, so this
  // has to be a real Tab — which is also the only way the claim means
  // anything, since the point is that a keyboard user can reach it.
  const tab = async () => {
    await call("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await sleep(60);
  };
  await ev(`document.body.focus()`);
  let reached = null;
  for (let i = 0; i < 40 && !reached; i++) {
    await tab();
    const on = await ev(`JSON.stringify((() => { const a = document.activeElement;
      return { cls: a ? a.className : "", op: a ? getComputedStyle(a).opacity : null,
               vis: a ? a.matches(":focus-visible") : false }; })())`).then(JSON.parse);
    if (!/paddlenav-arrow/.test(on.cls)) continue;
    // the opacity transition is 100ms, so read it after it has settled rather
    // than catching it mid-flight
    await sleep(250);
    reached = await ev(`JSON.stringify((() => { const a = document.activeElement;
      return { cls: a.className, op: getComputedStyle(a).opacity, vis: a.matches(":focus-visible") }; })())`).then(JSON.parse);
  }
  ok("a keyboard user can reach a paddle that is hidden on hover", !!reached,
     reached ? reached.cls : "never focused in 40 tabs");
  ok("and it becomes visible when they do", reached && reached.op === "1",
     reached ? `opacity ${reached.op}, :focus-visible ${reached.vis}` : "n/a");

  await call("Page.navigate", { url: "http://127.0.0.1:4567/example/index.html" });

} catch (e) { console.log("FAIL  threw:", e.message); checks.push(false); }
finally { server.close(); ws.close(); chrome.kill(); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} }
console.log(`\ngallery  ${checks.filter(Boolean).length}/${checks.length}`);
process.exit(checks.every(Boolean) ? 0 : 1);

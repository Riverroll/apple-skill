// The media contract from references/media.md, enforced on example/motion/.
//
//   node test/media.mjs
//
// Three things are checked, because a clip can be wrong in three ways. The
// files: six of them, three aspect ratios, no audio track, faststart, inside
// the byte budget. The markup: one accessible name on the stack, layers in one
// grid cell, lazy until the scroll window opens. The degradations: reduced
// motion and no-JS both have to land on a photograph, never an empty box.
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
import os from "node:os"; import { spawn } from "node:child_process";
import { runAudit } from "../tools/audit.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CHROME = process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGE = "/example/motion/index.html";
const CLIPS = path.join(ROOT, "example/media/summit");

const checks = [];
const ok = (name, cond, detail = "") => {
  checks.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "  ok  " : "FAIL  "}${name}${cond || !detail ? "" : " — " + detail}`);
};
const sleep = (t) => new Promise((r) => setTimeout(r, t));

// ----------------------------------------------------------------- the files
// Enough of an MP4 box walk to answer two questions without ffmpeg: is the
// moov atom in front of the mdat (faststart), and is there a sound track.
function mp4Facts(file) {
  const buf = fs.readFileSync(file);
  const top = [];
  for (let p = 0; p + 8 <= buf.length;) {
    let size = buf.readUInt32BE(p);
    const type = buf.toString("latin1", p + 4, p + 8);
    if (size === 1) size = Number(buf.readBigUInt64BE(p + 8));   // 64-bit size
    if (size === 0) { top.push(type); break; }                   // runs to EOF
    if (size < 8) break;
    top.push(type);
    p += size;
  }
  return {
    bytes: buf.length,
    faststart: top.indexOf("moov") >= 0 && top.indexOf("moov") < top.indexOf("mdat"),
    // 'soun' only appears as an hdlr handler type; a video-only file has none
    audio: buf.includes(Buffer.from("soun", "latin1")),
  };
}

const LADDER = [
  ["small",     420,  480, 400_000],
  ["small_2x",  840,  960, 1_000_000],
  ["medium",    934,  576, 400_000],
  ["medium_2x", 1868, 1152, 1_000_000],
  ["large",     1260, 612, 400_000],
  ["large_2x",  2520, 1224, 1_000_000],
];

ok("the ladder is six files", LADDER.every(([n]) => fs.existsSync(path.join(CLIPS, `${n}.mp4`))),
   LADDER.map(([n]) => n).join(" "));

for (const [name, , , budget] of LADDER) {
  const f = path.join(CLIPS, `${name}.mp4`);
  if (!fs.existsSync(f)) continue;
  const m = mp4Facts(f);
  ok(`${name}: moov before mdat`, m.faststart, "unseekable until fully downloaded");
  ok(`${name}: no audio track`, !m.audio, "measured files have no sound track at all");
  ok(`${name}: inside the byte budget`, m.bytes <= budget,
     `${(m.bytes / 1024).toFixed(0)}K of ${(budget / 1024).toFixed(0)}K`);
}

// the still that ships when the video does not
for (const n of ["small", "medium", "large"])
  ok(`${n}: has a start frame`, fs.existsSync(path.join(CLIPS, `start-${n}.webp`)));

// The rendered clips — scenes, not footage — ship the same ladder. They are
// checked as a set rather than file by file: what matters is that a clip built
// by tools/render-clip.mjs is indistinguishable, on disk, from one built from
// a master.
for (const dir of ["tilt", "network", "alert"]) {
  const d = path.join(ROOT, "example/media", dir);
  const files = LADDER.map(([n]) => path.join(d, `${n}.mp4`));
  const present = files.filter((f) => fs.existsSync(f));
  ok(`${dir}/: the ladder is six files`, present.length === LADDER.length,
     `${present.length} of ${LADDER.length}`);
  const facts = present.map(mp4Facts);
  ok(`${dir}/: no file carries a sound track`, facts.every((m) => !m.audio));
  ok(`${dir}/: every file has moov before mdat`, facts.every((m) => m.faststart));
  const over = present.filter((f, i) => facts[i].bytes > LADDER[i][3]);
  ok(`${dir}/: inside the byte budget`, over.length === 0,
     over.map((f) => path.basename(f)).join(" "));
  ok(`${dir}/: has all three start frames`,
     ["small", "medium", "large"].every((n) => fs.existsSync(path.join(d, `start-${n}.webp`))));
}

// art direction, not one render at three sizes
const aspect = (w, h) => w / h;
const ars = LADDER.filter(([n]) => !n.endsWith("_2x")).map(([n, w, h]) => [n, aspect(w, h)]);
ok("the three crops are three different aspect ratios",
   new Set(ars.map(([, a]) => a.toFixed(2))).size === 3,
   ars.map(([n, a]) => `${n} ${a.toFixed(2)}`).join("  "));
ok("the phone crop is portrait", ars.find(([n]) => n === "small")[1] < 1,
   "a 16:9 render letterboxed into a phone slot is the thing this avoids");
for (const [name, w, h] of LADDER.filter(([n]) => n.endsWith("_2x"))) {
  const base = LADDER.find(([n]) => n === name.replace("_2x", ""));
  ok(`${name}: exactly double its 1x`, w === base[1] * 2 && h === base[2] * 2);
}

// ----------------------------------------------------------------- a server
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".mp4": "video/mp4", ".webp": "image/webp" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("#")[0].split("?")[0]));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// ----------------------------------------------- the audit, on both versions
// flat.html is the same content with every media mistake in it. The point of
// the pair is that the audit catches them and says nothing about the page that
// follows the rules — a check that only ever passes is not a check.
const flat = await runAudit(`${base}/example/motion/flat.html`);
const good = await runAudit(`${base}${PAGE}`);
const MEDIA = /clip\(s\)|media file\(s\) are served|honours reduced motion|nothing on this page moves|text sitting on a photograph|paints first|fetchpriority|below the fold/;
const mediaFindings = (r) => r.findings.filter((f) => MEDIA.test(f.title));
const titles = (r) => mediaFindings(r).map((f) => f.title).join(" | ");

ok("the audit catches a page whose media is wrong", mediaFindings(flat).length >= 7,
   `${mediaFindings(flat).length} media findings`);
for (const [what, re] of [
  ["a bare clip with no still", /no still underneath/],
  ["a clip a phone will not play inline", /refuse to play inline/],
  ["eager preloading", /preload="auto"/],
  ["a clip with no accessible name", /no accessible name/],
  ["one render at every width", /served at 1440px and at 500px/],
  ["a clip sitting in bars", /letterboxed inside their slot/],
  ["an ink token used over a photograph", /mid-tone text sitting on a photograph/],
  ["motion with no reduced-motion rule", /honours reduced motion/],
]) ok(`the audit flags ${what}`, re.test(titles(flat)), titles(flat));

ok("and says nothing about the page that follows the rules",
   mediaFindings(good).length === 0, titles(good));
ok("the two pages carry the same copy",
   good.summary.mediaShare > 0.3 && flat.summary.mediaShare > 0.3,
   "the fix is the media contract, not more pictures");

// ----------------------------------------------------------------- a browser
const prof = fs.mkdtempSync(os.tmpdir() + "/media-");
const port = 9600 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required",
  `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`,
  "--window-size=1440,900", "about:blank"], { stdio: "ignore" });

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

const evaluate = async (expr) => {
  const r = await call("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description || ""));
  return r.result.value;
};
const open = async ({ width = 1440, dpr = 1, reduced = false, noJs = false } = {}) => {
  await call("Emulation.setScriptExecutionDisabled", { value: noJs });
  await call("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
  await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: dpr, mobile: false });
  await call("Page.navigate", { url: base + PAGE });
  await call("Page.bringToFront");
  await sleep(1200);
};
// The page drops a clip that has not produced metadata inside its own
// data-load-timeout — 3s on a hero, as apple.com sets it. A headless renderer
// needs longer than that to spin up its media pipeline even over localhost, so
// the timeout is rewritten at document start, before the page's own loader
// reads it. Nothing test-shaped goes into the page itself.
let bailScript = null;
const patchBail = async (ms) => {
  if (bailScript) await call("Page.removeScriptToEvaluateOnNewDocument", { identifier: bailScript });
  const { identifier } = await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    // observe the document, not documentElement: at document-start the tree
    // can still be empty and documentElement is null
    new MutationObserver((_, o) => {
      const v = document.querySelector("video[data-basepath]");
      if (!v) return;
      v.dataset.loadTimeout = "${ms}";
      o.disconnect();
    }).observe(document, { childList: true, subtree: true });` });
  bailScript = identifier;
};

// headless throttles media on a page it has navigated several times, so wait on
// the state rather than on a clock
const until = async (expr, ms = 8000) => {
  for (let waited = 0; waited < ms; waited += 250) {
    if (await evaluate(`!!(${expr})`)) return true;
    await sleep(250);
  }
  return false;
};
const walk = () => evaluate(`(async () => {
  const step = innerHeight * 0.7;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    scrollTo(0, y); await new Promise(r => setTimeout(r, 180));
  }
  await new Promise(r => setTimeout(r, 600));
})()`);

try {
  // -------------------------------------- it plays (first, while the renderer
  // is still giving this page full media priority)
  await patchBail(30000);
  await open();
  await until(`document.querySelector("video[data-basepath]")?.readyState >= 2`);
  const play = await evaluate(`(() => {
    const v = document.querySelector("video[data-basepath]");
    if (!v) return { removed: true };
    return { ready: v.readyState, paused: v.paused, t: v.currentTime, dims: [v.videoWidth, v.videoHeight] };
  })()`);
  ok("the clip arrived", !play.removed, "it was dropped before producing metadata");
  ok("the clip is decoding by the time it is in view", play.ready >= 2,
     `readyState ${play.ready}`);
  ok("and it is playing, not waiting for a gesture", !play.paused || play.t > 0,
     `paused=${play.paused} t=${play.t}`);
  ok("the file the page chose is the 2.06 crop",
     Math.abs(play.dims[0] / play.dims[1] - 1260 / 612) < 0.02, play.dims.join("×"));

  // --------------------------------------------------- the markup as parsed
  // with scripting off, so this reads what the HTML actually shipped rather
  // than what the loader has already done to it
  await open({ noJs: true });
  const parsed = await evaluate(`(() => {
    const v = document.querySelector("video[data-basepath]");
    const img = document.querySelector(".start-frame img");
    return { src: v.getAttribute("src") || "", preload: v.preload,
             poster: v.getAttribute("poster"),
             priority: img.getAttribute("fetchpriority"), lazy: img.loading,
             deferred: document.querySelectorAll('img[loading="lazy"]').length,
             stillPainted: img.naturalWidth > 0 && img.getBoundingClientRect().height > 0 };
  })()`);
  ok("nothing is fetched at parse time", parsed.src === "", `src="${parsed.src}"`);
  ok("preload is none", parsed.preload === "none", parsed.preload);
  ok("the still is a picture, not a poster", !parsed.poster && parsed.stillPainted,
     "poster takes one URL and cannot be art-directed");
  ok("the still carries the priority, since it is the LCP element",
     parsed.priority === "high" && parsed.lazy !== "lazy",
     `fetchpriority=${parsed.priority} loading=${parsed.lazy}`);
  ok("everything below the fold is deferred", parsed.deferred >= 6,
     `${parsed.deferred} image(s) with loading=lazy`);

  // ----------------------------------------------------- and once it runs
  await open();
  const m = await evaluate(`(() => {
    const v = document.querySelector("video[data-basepath]");
    const stack = v.closest(".video-element-stack");
    const pic = stack.querySelector("picture img");
    const cs = getComputedStyle(stack);
    return {
      muted: v.muted, inline: v.playsInline,
      grid: cs.display, fit: getComputedStyle(v).objectFit,
      sameCell: getComputedStyle(v).gridArea === getComputedStyle(stack.querySelector("picture")).gridArea,
      stackRole: stack.getAttribute("role"), stackName: stack.getAttribute("aria-label") || "",
      videoNamed: !!(v.getAttribute("aria-label") || v.getAttribute("title")),
      imgAlt: pic.getAttribute("alt"),
    };
  })()`);

  ok("the video is muted and inline", m.muted && m.inline, "iOS refuses to render it inline otherwise");
  ok("the stack is a grid", m.grid === "grid", m.grid);
  ok("the clip fills its slot", m.fit === "cover",
     `object-fit: ${m.fit} — a video is a layer itself, so the fill has to be on it`);
  ok("the layers share one cell", m.sameCell, "absolutely positioned layers leave the stack with no height");
  ok("one accessible name, on the stack", m.stackRole === "img" && m.stackName.length > 20,
     `role=${m.stackRole} name=${m.stackName.length} chars`);
  ok("the layers themselves are silent to AT", !m.videoNamed && m.imgAlt === "",
     "a clip is a picture that moves: one name for the whole thing");

  // ------------------------------------------- the ladder, as the page picks it
  const picked1x = await evaluate(`(() => {
    const v = document.querySelector("video[data-basepath]");
    return v?.getAttribute("src") || "";
  })()`);
  ok("it loads before it is on screen", /large\.mp4/.test(picked1x),
     picked1x.split("/").pop() || "nothing loaded");

  await open({ dpr: 2 });
  await sleep(600);
  const picked2x = await evaluate(`document.querySelector("video[data-basepath]")?.getAttribute("src") || ""`);
  ok("a 2x screen gets the 2x file", /large_2x\.mp4/.test(picked2x), picked2x.split("/").pop());

  await open({ width: 420 });
  await sleep(600);
  const pickedSmall = await evaluate(`document.querySelector("video[data-basepath]")?.getAttribute("src") || ""`);
  ok("a phone gets the portrait file", /small\.mp4/.test(pickedSmall), pickedSmall.split("/").pop());

  // ------------------------------------- and when the file never turns up
  await patchBail(600);
  await call("Fetch.enable", { patterns: [{ urlPattern: "*.mp4", requestStage: "Request" }] });
  const failing = (e) => {
    const m = JSON.parse(e.data);
    if (m.method === "Fetch.requestPaused")
      call("Fetch.failRequest", { requestId: m.params.requestId, errorReason: "ConnectionFailed" });
  };
  ws.addEventListener("message", failing);
  await open();
  await sleep(2000);
  const dropped = await evaluate(`(() => {
    const img = document.querySelector(".start-frame img");
    const v = document.querySelector("video[data-basepath]");

    return { video: !!v,
             dbg: v ? (v.dataset.loadTimeout + " src=" + (v.getAttribute("src")||"-") + " err=" + (v.error ? v.error.code : "-")) : "gone",
             stillPainted: img.naturalWidth > 0 && img.getBoundingClientRect().height > 0,
             heroHeight: document.querySelector(".hero").getBoundingClientRect().height };
  })()`);
  ok("a clip that never arrives is removed", !dropped.video,
     dropped.dbg);
  ok("and the photograph is still there", dropped.stillPainted && dropped.heroHeight > 400,
     `hero ${Math.round(dropped.heroHeight)}px`);
  ws.removeEventListener("message", failing);
  await call("Fetch.disable");
  await patchBail(30000);

  // --------------------------------------------------- the other techniques
  await walk();
  await sleep(1400);           // the reveal is 0.9s plus up to 0.3s of stagger
  const tech = await evaluate(`(() => {
    // the outgoing rule lives on a frame that is not current; the incoming
    // one on the frame that is
    const out = getComputedStyle(document.querySelector("[data-crossfade] .frame:not([data-current])"));
    const inn = getComputedStyle(document.querySelector("[data-crossfade] .frame[data-current]"));
    const ms = (v) => parseFloat(v) * 1000;
    const panel = document.querySelector("[data-open-panel]");
    const items = [...document.querySelectorAll("[data-staggered-item]")];
    const second = items[1];      // --i:0 is deliberately delay 0; step shows on the next one
    return {
      fadeOut: ms(out.transitionDuration), fadeIn: ms(inn.transitionDuration),
      fadeInDelay: ms(inn.transitionDelay),
      allowDiscrete: [out.transitionBehavior, inn.transitionBehavior].join(" "),
      open: parseFloat(getComputedStyle(panel).getPropertyValue("--open")),
      clip: getComputedStyle(panel).clipPath,
      revealed: items.every(el => parseFloat(getComputedStyle(el).opacity) > 0.95),
      stagger: getComputedStyle(second).transitionDelay,
      hidden: items.filter(el => el.getBoundingClientRect().height === 0).length,
    };
  })()`);

  ok("the crossfade is asymmetric", tech.fadeOut < tech.fadeIn && tech.fadeInDelay > 0,
     `out ${tech.fadeOut}ms, in ${tech.fadeIn}ms after ${tech.fadeInDelay}ms`);
  ok("the outgoing frame can leave the layout",
     tech.allowDiscrete.split(" ").every(v => v === "allow-discrete"), tech.allowDiscrete);
  ok("the panel opened on scroll", tech.open > 0.9, `--open ${tech.open}`);
  ok("one scalar drives inset and radius", /inset\(/.test(tech.clip), tech.clip.slice(0, 60));
  ok("the stagger is 150ms per item", /0\.15s/.test(tech.stagger), tech.stagger);
  ok("every revealed item ended up visible", tech.revealed && tech.hidden === 0,
     `${tech.hidden} with no height`);

  // ------------------------------------------------------- the degradations
  await open({ reduced: true });
  await sleep(1500);
  const rm = await evaluate(`(() => {
    const v = document.querySelector("video[data-basepath]");
    const img = document.querySelector(".start-frame img");
    const panel = document.querySelector("[data-open-panel]");
    return {
      videoPainted: !!v && v.getBoundingClientRect().height > 0,
      fetched: !!(v && (v.currentSrc || v.getAttribute("src"))),
      stillPainted: img.getBoundingClientRect().height > 0 && img.naturalWidth > 0,
      open: parseFloat(getComputedStyle(panel).getPropertyValue("--open")),
      heroHeight: document.querySelector(".hero").getBoundingClientRect().height,
    };
  })()`);
  ok("reduced motion: the clip is never fetched", !rm.fetched, "and not merely paused");
  ok("reduced motion: the moving layer is out of the layout", !rm.videoPainted);
  ok("reduced motion: a photograph is on screen instead", rm.stillPainted);
  ok("reduced motion: the panel is pinned open", rm.open === 1, `--open ${rm.open}`);
  ok("reduced motion: the hero is still a hero", rm.heroHeight > 400, `${rm.heroHeight}px`);

  await open({ noJs: true });
  const stillThere = await evaluate(`(() => {
    const img = document.querySelector(".start-frame img");
    const items = [...document.querySelectorAll("[data-staggered-item]")];
    return {
      stillPainted: img.naturalWidth > 0 && img.getBoundingClientRect().height > 0,
      itemsVisible: items.every(el => parseFloat(getComputedStyle(el).opacity) > 0.95),
      enhanced: document.documentElement.classList.contains("enhance-xp"),
    };
  })()`);
  ok("no JS: the photograph is there", stillThere.stillPainted);
  ok("no JS: the reveal never hid anything", stillThere.itemsVisible && !stillThere.enhanced,
     "the hiding rule is gated on the class JS adds");
} finally {
  ws.close(); chrome.kill(); server.close();
  try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
}

const passed = checks.filter((c) => c.pass).length;
console.log(`\nmedia  ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);

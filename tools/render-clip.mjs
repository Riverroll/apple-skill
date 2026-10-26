// Render a clip from a scene you wrote, rather than from footage you do not
// have. The scene is an HTML file that exposes one function:
//
//   window.setFrame(t)   // t runs 0 → 1; paint the scene at that instant
//
// Nothing animates by itself — no CSS animations, no requestAnimationFrame. The
// renderer sets the time, waits for the paint, captures, and moves on, so the
// result is deterministic and a slow machine produces the same file as a fast
// one.
//
//   node tools/render-clip.mjs scene.html out-dir [--frames 90] [--crf 25]
//
// It renders each of the three crops at 2x, encodes those, and downscales for
// 1x — six files and three start frames, the same ladder tools/make-clip.sh
// produces and the one references/media.md measured off apple.com. The scene
// is rendered at each crop's own aspect, so it can lay itself out for the slot
// it will sit in: a portrait phone crop is not a letterboxed desktop render.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import http from "node:http"; import { spawn, spawnSync } from "node:child_process";

const [scene, outDir, ...rest] = process.argv.slice(2);
if (!scene || !outDir) {
  console.error("usage: node tools/render-clip.mjs <scene.html> <out-dir> [--frames 90] [--crf 25]");
  process.exit(1);
}
const arg = (name, dflt) => {
  const i = rest.indexOf("--" + name);
  return i === -1 ? dflt : Number(rest[i + 1]);
};
const FRAMES = arg("frames", 90);          // 90 at 30fps = the measured 3.00s
const CRF = arg("crf", 25);
const CHROME = process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// the measured ladder: portrait on phones, 1.62 on tablets, 2.06 on desktop
const CROPS = [
  { name: "small", w: 420, h: 480 },
  { name: "medium", w: 934, h: 576 },
  { name: "large", w: 1260, h: 612 },
];

const sleep = (t) => new Promise((r) => setTimeout(r, t));
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || "").trim().split("\n").pop()}`);
};

// Serve the scene's PARENT directory, so a scene can reference the page's own
// pictures with `../media/...`. Serving the scene directory itself does not
// work: the browser normalises a leading `../` away at the server root, so the
// request arrives as `/media/...` and 404s.
const sceneDir = path.resolve(path.dirname(scene));
const root = path.dirname(sceneDir);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/` +
  `${path.basename(sceneDir)}/${path.basename(scene)}`;

const prof = fs.mkdtempSync(os.tmpdir() + "/render-");
const port = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--hide-scrollbars",
  "--force-device-scale-factor=2", "--font-render-hinting=none",
  `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });

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
await call("Page.enable"); await call("Runtime.enable");

fs.mkdirSync(outDir, { recursive: true });
const frames = fs.mkdtempSync(os.tmpdir() + "/frames-");

try {
  for (const crop of CROPS) {
    // render at 2x and downscale for 1x: one pass per crop, not two
    await call("Emulation.setDeviceMetricsOverride",
      { width: crop.w, height: crop.h, deviceScaleFactor: 2, mobile: false });
    await call("Page.navigate", { url: base });
    await call("Page.bringToFront");
    await sleep(900);

    const ok = await call("Runtime.evaluate", { expression: "typeof setFrame === 'function'", returnByValue: true });
    if (!ok.result.value) throw new Error(`${scene} does not define window.setFrame(t)`);
    // Webfonts and images must be decoded before the first capture, or frame 0
    // ships without the photograph the rest of the clip has.
    await call("Runtime.evaluate", { expression: "document.fonts ? document.fonts.ready : 1", awaitPromise: true });
    await call("Runtime.evaluate", {
      expression: `Promise.all([...document.images].map(i => i.decode().catch(() => {})))`,
      awaitPromise: true,
    });

    const dir = path.join(frames, crop.name);
    fs.mkdirSync(dir);
    for (let i = 0; i < FRAMES; i++) {
      await call("Runtime.evaluate", {
        expression: `setFrame(${(i / (FRAMES - 1)).toFixed(5)});
          new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`,
        awaitPromise: true,
      });
      const { data } = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      fs.writeFileSync(path.join(dir, String(i).padStart(4, "0") + ".png"), Buffer.from(data, "base64"));
    }

    const enc = (w, h, crf, file) => run("ffmpeg", ["-nostdin", "-loglevel", "error", "-y",
      "-framerate", "30", "-i", path.join(dir, "%04d.png"),
      "-an", "-vf", `scale=${w}:${h}:flags=lanczos,format=yuv420p`,
      "-c:v", "libx264", "-profile:v", "high", "-crf", String(crf), "-g", "300",
      "-movflags", "+faststart", path.join(outDir, file)]);

    enc(crop.w * 2, crop.h * 2, CRF - 2, `${crop.name}_2x.mp4`);
    enc(crop.w, crop.h, CRF, `${crop.name}.mp4`);

    // Two stills, which is the ladder apple.com ships. The START frame is what
    // sits under the clip: it has to be the frame the video begins on or the
    // handover snaps. The END frame is the fallback for reduced motion and no
    // JS, because on a clip whose point is the end state — the trace drawn,
    // the alert landed — frame 0 is a picture of nothing happening, under a
    // headline claiming it did.
    for (const [frame, prefix] of [["0", "start"], [String(FRAMES - 1), "end"]]) {
      run("ffmpeg", ["-nostdin", "-loglevel", "error", "-y",
        "-i", path.join(dir, String(frame).padStart(4, "0") + ".png"),
        "-vf", `scale=${crop.w}:${crop.h}:flags=lanczos`,
        "-frames:v", "1", "-f", "image2", "-c:v", "png", path.join(frames, "still.png")]);
      run("cwebp", ["-quiet", "-q", "82", path.join(frames, "still.png"),
        "-o", path.join(outDir, `${prefix}-${crop.name}.webp`)]);
    }

    const kb = (f) => Math.round(fs.statSync(path.join(outDir, f)).size / 1024);
    console.log(`${crop.name.padEnd(8)} ${String(crop.w).padStart(4)}x${String(crop.h).padEnd(5)} ` +
                `${String(kb(crop.name + ".mp4")).padStart(5)}K   2x ${String(kb(crop.name + "_2x.mp4")).padStart(5)}K`);
  }
  console.log("budget for three seconds: under 400K at 1x, under 1M at 2x.");
} finally {
  ws.close(); chrome.kill(); server.close();
  for (const d of [prof, frames]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
}

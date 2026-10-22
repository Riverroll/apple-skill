// The pair that is about having something to look at.
//
//   node test/composition.mjs
//
// Unlike test/restraint.mjs, the copy is NOT identical across this pair. A page
// whose headlines are made of "elevate" and "seamless" and whose only images
// are emoji has a content problem, and fixing composition means fixing that
// too. Restraint keeps the content and changes the vocabulary; composition
// changes what is on the page.
//
// The media in alive.html is drawn inline because this repo ships no binary
// assets. In a real page every one of those scenes is a photograph —
// references/imagery.md ranks illustration below the real thing.
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
import { runAudit } from "../tools/audit.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const checks = [];
const ok = (name, cond, detail = "") => {
  checks.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "  ok  " : "FAIL  "}${name}${cond || !detail ? "" : " — " + detail}`);
};

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const flop  = await runAudit(`${base}/example/soul/flop.html`,  [1440, 500]);
const alive = await runAudit(`${base}/example/soul/alive.html`, [1440, 900, 500]);
server.close();

const tells = (r) => (r.byWidth[1440].soul.tells || []).join(" | ");
const titles = (r) => r.findings.map((f) => f.title).join(" | ");

// --- the flop is caught, and caught specifically
ok("flop: the page has nothing to look at", /of what a visitor sees is a picture/.test(titles(flop)),
   `media ${flop.summary.mediaShare}`);
ok("flop: screens with no image at all are counted",
   /screenful\(s\) contain no image/.test(titles(flop)),
   `${flop.summary.deadScreens} of ${flop.summary.screens}`);
ok("flop: the flat type scale is caught", /largest type is only/.test(titles(flop)),
   `x${flop.summary.scaleContrast}`);
ok("flop: enough tells to read as generated", flop.summary.tells >= 6, `${flop.summary.tells} tells`);
for (const [what, rx] of [
  ["gradient type",        /gradient on the type/],
  ["glass cards",          /glass cards/],
  ["emoji as icons",       /emoji used as icons/],
  ["three equal cards",    /three equal cards/],
  ["everything centered",  /every section centered/],
  ["lorem ipsum",          /lorem ipsum/],
  ["the vocabulary",       /vocabulary in the headlines/],
  ["a placeholder service",/placeholder image service/],
  ["icon plates",          /icon plates/],
]) ok(`flop: names ${what}`, rx.test(tells(flop)), tells(flop).slice(0, 120));

// --- and the fixed page is clean on every count, not just the new ones
ok("alive: nothing countable is off at all", alive.findings.length === 0, titles(alive));
ok("alive: media is the majority of what is seen", alive.summary.mediaShare >= 0.25,
   `${Math.round(alive.summary.mediaShare * 100)}%`);
ok("alive: no screen is without an image", alive.summary.deadScreens === 0,
   `${alive.summary.deadScreens} of ${alive.summary.screens}`);
ok("alive: the type scale has a voice", alive.summary.scaleContrast >= 5,
   `x${alive.summary.scaleContrast}`);
ok("alive: text is a minority of the page, as on apple.com",
   alive.summary.textShare < 0.2, `${Math.round(alive.summary.textShare * 100)}%`);
ok("alive: no tells", alive.summary.tells === 0, tells(alive));
ok("alive: the headline is re-picked on phone, not scaled",
   alive.summary.scaled === 0 && alive.summary.frozen === 0);
ok("alive: nothing fails WCAG AA", alive.summary.contrastFails === 0,
   `${alive.summary.contrastFails}`);

// --- the pair is a composition lesson, not a restraint one
const RESTRAINT = /accent hues|text colours|corner radii|section paddings|letter-spacing: normal/;
ok("the flop's problem is not mainly restraint",
   flop.findings.filter((f) => /picture|screenful|tell\(s\)|largest type/.test(f.title)).length >= 4,
   "four of its findings are about having nothing to look at");
ok("and the fix did not come from restraint alone",
   !RESTRAINT.test(titles(alive)), titles(alive));

// --- the media is real markup, not a background trick
const aliveSrc = fs.readFileSync(path.join(ROOT, "example/soul/alive.html"), "utf8");
ok("alive: the media is in the markup", (aliveSrc.match(/<svg/g) || []).length >= 5,
   `${(aliveSrc.match(/<svg/g) || []).length} scenes`);
ok("alive: every scene is described for a screen reader",
   (aliveSrc.match(/aria-label="/g) || []).length >= 5);
ok("alive: no gradient is doing the work of a picture",
   !/background:\s*linear-gradient/.test(aliveSrc));

const passed = checks.filter((c) => c.pass).length;
console.log(`\ncomposition  ${passed}/${checks.length}`);
console.log(`  flop:  ${flop.findings.length} findings, ${flop.summary.tells} tells, ${Math.round(flop.summary.mediaShare * 100)}% picture`);
console.log(`  alive: ${alive.findings.length} findings, ${alive.summary.tells} tells, ${Math.round(alive.summary.mediaShare * 100)}% picture`);
process.exit(passed === checks.length ? 0 : 1);

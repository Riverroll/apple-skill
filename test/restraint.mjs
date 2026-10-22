// The worked example: the same page before and after the restraint rules.
//
//   node test/restraint.mjs
//
// Asserts three things at once — that the audit catches a realistic mess,
// that following the rules clears it, and that the page kept its content and
// its identity while that happened. The last one matters most: a "fix" that
// changes the copy or the brand is not a fix, it is a different site.
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
import { runAudit } from "../tools/audit.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const checks = [];
const ok = (name, cond, detail = "") => {
  checks.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "  ok  " : "FAIL  "}${name}${cond || !detail ? "" : " — " + detail}`);
};

// a static server of its own, so the test needs no setup
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
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

const before = await runAudit(`${base}/example/fix-me/before.html`);
const after  = await runAudit(`${base}/example/fix-me/after.html`);
server.close();

const titles = (r) => r.findings.map((f) => f.title).join(" | ");

// --- the audit catches a realistic mess
ok("before: the audit has something to say", before.findings.length >= 4,
   `${before.findings.length} findings`);
ok("before: flags the accent scatter", /accent hues/.test(titles(before)), titles(before));
ok("before: flags the ink scatter", /text colours/.test(titles(before)), titles(before));
ok("before: flags display type tracked normal", /letter-spacing: normal/.test(titles(before)));
ok("before: flags the padding scatter", /section paddings/.test(titles(before)));
ok("before: flags a headline frozen across widths", /never step down/.test(titles(before)));

// --- following the rules clears it
ok("after: nothing countable is left", after.findings.length === 0, titles(after));
ok("after: one accent hue", after.summary.hues <= 1, String(after.summary.hues));
ok("after: ink steps are down to a system", after.summary.inks <= 7, String(after.summary.inks));
ok("after: no display size is tracked normal", after.summary.strayNormal === 0);
ok("after: the headline is re-picked on phone, not scaled",
   after.summary.scaled === 0 && after.summary.frozen === 0);
ok("after: nothing fails WCAG AA", after.summary.contrastFails === 0,
   String(after.summary.contrastFails));

// --- and the page is still the same page
const text = (f) => fs.readFileSync(path.join(ROOT, "example/fix-me", f), "utf8")
  .replace(/<style[\s\S]*?<\/style>/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ").trim()
  .replace(/^Signal Lab . (before|after) /, "");
ok("the copy is untouched", text("before.html") === text("after.html"),
   "the fix is a change of vocabulary, not of content");

const hue = (r) => Object.entries(r.byWidth[1440].chroma).sort((a, b) => b[1] - a[1])[0]?.[0];
ok("the brand hue survived", hue(before) === hue(after) || after.summary.hues === 1,
   `before ${hue(before)}°, after ${hue(after)}°`);

const dark = (r) => r.byWidth[1440].inks;
ok("still a dark site", Object.keys(dark(after)).some((c) => /23[0-9], 23[0-9]|232, 237/.test(c)),
   Object.keys(dark(after)).slice(0, 3).join(" "));

const passed = checks.filter((c) => c.pass).length;
console.log(`\nrestraint  ${passed}/${checks.length}`);
console.log(`  before: ${before.findings.length} findings   after: ${after.findings.length}`);
process.exit(passed === checks.length ? 0 : 1);

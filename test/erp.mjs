// The dense-tool pair: the same purchase-order screen before and after
// references/erp.md.
//
//   node test/erp.mjs
//
// Asserts four things. That the audit's ERP mode catches what actually makes a
// grid unusable; that following the file clears all of it; that the marketing
// checks are correctly switched off (a tool must not be told to add 80px of
// section padding); and that the screen kept every word of its content while
// that happened.
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
import { runAudit } from "../tools/audit.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const checks = [];
const ok = (name, cond, detail = "") => {
  checks.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "  ok  " : "FAIL  "}${name}${cond || !detail ? "" : " — " + detail}`);
};

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

const before = await runAudit(`${base}/example/erp/before.html`, [1440, 900], "erp");
const after  = await runAudit(`${base}/example/erp/after.html`,  [1440, 900], "erp");
// the same page scored without the flag, to prove the detection works
const sniff  = await runAudit(`${base}/example/erp/after.html`,  [1440], null);
server.close();

const titles = (r) => r.findings.map((f) => f.title).join(" | ");

// --- the audit catches what makes a grid unusable
ok("before: the audit has plenty to say", before.findings.length >= 12,
   `${before.findings.length} findings`);
ok("before: flags the header that scrolls away", /header scrolls away/.test(titles(before)));
ok("before: flags the unpinned identity column", /no pinned identity column/.test(titles(before)));
ok("before: flags numbers that are not right-aligned", /not right-aligned/.test(titles(before)));
ok("before: flags headers misaligned to their column", /not aligned to their own column/.test(titles(before)));
ok("before: flags the missing tabular-nums", /without tabular-nums/.test(titles(before)));
ok("before: flags targets under 28px", /under 28px tall/.test(titles(before)));
ok("before: flags the missing focus ring", /focus-visible/.test(titles(before)));
ok("before: flags the row-height scatter", /different row heights/.test(titles(before)));
ok("before: flags a marketing-sized gutter", /gutter is marketing-sized/.test(titles(before)));
ok("before: flags the marketing-sized page title", /largest type on screen/.test(titles(before)));
ok("before: flags the type budget inside the grid", /font sizes inside the grid/.test(titles(before)));
ok("before: flags rows separated twice", /separating rows twice/.test(titles(before)));
ok("before: flags truncation with nothing behind it", /truncated element/.test(titles(before)));
ok("before: flags spacing off the 4px grid", /off the 4px grid/.test(titles(before)));
ok("before: flags the label-gap scatter", /label-to-field gaps/.test(titles(before)));
ok("before: flags the nested navigation tree", /nests 3 levels deep/.test(titles(before)));
ok("before: flags transitions too slow for a tool", /longer than 250ms/.test(titles(before)));
ok("before: flags the hue scatter past the semantic five", /accent hues/.test(titles(before)));

// --- the marketing checks are off, because they would make the tool worse
ok("before: does NOT ask for a marketing padding ladder",
   !/section paddings/.test(titles(before)), titles(before));
ok("before: does NOT grade the headline voice",
   !/headlines run/.test(titles(before)));
ok("before: does NOT ask for the em rhythm ladder",
   !/px gaps between stacked/.test(titles(before)));

// --- following the file clears it
ok("after: nothing countable is left", after.findings.length === 0, titles(after));
ok("after: the sticky header is counted as working", after.summary.headNotSticky === 0);
ok("after: a scroll container is not mistaken for a blocker",
   after.summary.stickyBlocked === 0 && after.summary.stickyOk >= 8,
   `${after.summary.stickyOk} working, ${after.summary.stickyBlocked} blocked`);
ok("after: every number is right-aligned and tabular",
   after.summary.numMisaligned === 0 && after.summary.numNotTabular === 0);
ok("after: one row height", after.summary.rowHeights === 1, `${after.summary.rowHeights} heights`);
ok("after: the page title is 28px or less", after.summary.biggestType <= 28,
   `${after.summary.biggestType}px`);
ok("after: every spacing value is on the 4px grid", after.summary.offGrid === 0);
ok("after: a focus ring exists", after.summary.focusVisible === true);
ok("after: no target under 28px", after.summary.smallTargets === 0);
ok("after: nothing fails WCAG AA", after.summary.contrastFails === 0,
   `${after.summary.contrastFails} failing`);
ok("after: the semantic set did not become an ink ladder", after.summary.inks <= 7,
   `${after.summary.inks} inks, badges exempt`);

// --- the mode is detected without the flag
ok("a dense screen is recognised without --mode erp", sniff.summary.dense === true);
ok("and it is scored as one", sniff.summary.mode === "erp", sniff.summary.mode);

// --- and it is still the same screen
const text = (f) => fs.readFileSync(path.join(ROOT, "example/erp", f), "utf8")
  .replace(/<style[\s\S]*?<\/style>/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ").trim()
  .replace(/^Nusantara Trading &middot; (before|after) /, "");
ok("every word of the content survived", text("before.html") === text("after.html"),
   "a fix that changes the data is not a fix");

const accent = (r) => Object.keys(r.byWidth[1440].inks).some((c) => /79, 70, 229/.test(c));
ok("the product kept its own accent", accent(before) && accent(after),
   "indigo, not Apple's blue");

const passed = checks.filter((c) => c.pass).length;
console.log(`\nerp  ${passed}/${checks.length}`);
console.log(`  before: ${before.findings.length} findings   after: ${after.findings.length}`);
process.exit(passed === checks.length ? 0 : 1);

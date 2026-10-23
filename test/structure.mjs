// Structural checks: the skill must load, every referenced file must exist,
// and no Apple-owned asset may be bundled.
import fs from "node:fs"; import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const SKILL = path.join(ROOT, "skills/apple-design");
const checks = [];
const ok = (name, cond, detail = "") => checks.push({ name, pass: !!cond, detail });

const skillMd = fs.readFileSync(path.join(SKILL, "SKILL.md"), "utf8");
const fm = skillMd.match(/^---\n([\s\S]*?)\n---\n/);
ok("SKILL.md has YAML frontmatter", fm);
const name = fm && fm[1].match(/^name:\s*(.+)$/m)?.[1].trim();
const desc = fm && fm[1].match(/^description:\s*(.+)$/m)?.[1].trim();
ok("frontmatter name is a valid slug", name && /^[a-z0-9-]+$/.test(name), name);
ok("frontmatter has a description", desc && desc.length > 40);
ok("description states when to use it", desc && /use (this skill )?wh(en|enever)/i.test(desc));
ok("description names concrete triggers", desc && /landing page|hero|marketing page/i.test(desc));

// every reference/asset the skill points at must exist
const refs = [...skillMd.matchAll(/`(references\/[\w.-]+|assets\/[\w.-]+)`/g)].map((m) => m[1]);
const uniq = [...new Set(refs)];
ok("SKILL.md references at least 5 files", uniq.length >= 5, `${uniq.length} refs`);
for (const r of uniq) ok(`referenced file exists: ${r}`, fs.existsSync(path.join(SKILL, r)));

// reference docs must not be empty stubs
for (const f of fs.readdirSync(path.join(SKILL, "references"))) {
  const size = fs.statSync(path.join(SKILL, "references", f)).size;
  ok(`reference has real content: ${f}`, size > 1500, `${size}B`);
}

// the audit tool is part of what ships
for (const t of ["tools/audit.mjs"]) {
  const f = path.join(ROOT, t);
  ok(`tool exists: ${t}`, fs.existsSync(f));
  if (fs.existsSync(f)) {
    const src = fs.readFileSync(f, "utf8");
    ok(`${t} is read-only (no page mutation)`, !/document\.write|innerHTML\s*=/.test(src));
    ok(`${t} measures more than one width`, /WIDTHS\s*=\s*\[[^\]]*,/.test(src));
  }
}
ok("SKILL.md points at the audit tool", /tools\/audit\.mjs/.test(skillMd));

// plugin manifests parse
for (const m of [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"]) {
  let parsed = null;
  try { parsed = JSON.parse(fs.readFileSync(path.join(ROOT, m), "utf8")); } catch {}
  ok(`${m} is valid JSON`, parsed);
}

// no Apple-owned binary assets anywhere in the repo
const walk = (d, acc = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
};
const files = walk(ROOT);
// Fonts are banned outright: shipping a typeface is how Apple's actual
// assets leak into a repo that claims to teach only the system.
const fonts = files.filter((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f));
ok("ships no font files", fonts.length === 0, fonts.map((f) => path.relative(ROOT, f)).join(", "));

// Pictures are allowed in exactly one place, because the example page needs a
// subject — a page of correct tokens with no imagery measures as soulless, see
// references/composition.md. Everywhere else they are still banned.
const MEDIA_DIR = path.join(ROOT, "example", "media");
const pictures = files.filter((f) => /\.(jpe?g|png|gif|webp|avif|mp4|mov|heic|svg)$/i.test(f));
const strays = pictures.filter((f) => !f.startsWith(MEDIA_DIR + path.sep));
ok("ships no images outside example/media", strays.length === 0,
   strays.map((f) => path.relative(ROOT, f)).join(", "));

// Every one of them has to be traceable to a licence. An image whose
// provenance nobody wrote down is the thing this rule exists to stop.
const creditsPath = path.join(ROOT, "example", "CREDITS.md");
const credits = fs.existsSync(creditsPath) ? fs.readFileSync(creditsPath, "utf8") : "";
ok("every bundled image is named in example/CREDITS.md",
   pictures.length === 0 || (credits.length > 0 &&
     pictures.every((f) => credits.includes(path.basename(f)))),
   pictures.map((f) => path.basename(f)).filter((b) => !credits.includes(b)).join(", "));

// ...and to a licence that permits redistribution without infecting the repo.
ok("bundled images are public domain or permissively licensed",
   pictures.length === 0 || /public domain|CC0|CC BY(?!-SA)/i.test(credits));
ok("attributes Apple trademarks", /trademarks of Apple/i.test(fs.readFileSync(path.join(ROOT, "README.md"), "utf8")));
ok("states it ships none of Apple's content", /ships none of Apple's content|carries none of Apple's content/i.test(skillMd + fs.readFileSync(path.join(ROOT, "README.md"), "utf8")));

export default checks;
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const c of checks) if (!c.pass) console.log("FAIL:", c.name, c.detail);
  const p = checks.filter((c) => c.pass).length;
  console.log(`structure: ${p}/${checks.length}`);
}

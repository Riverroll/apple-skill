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
const banned = files.filter((f) => /\.(woff2?|ttf|otf|eot|jpe?g|png|gif|webp|mp4|mov|heic|svg)$/i.test(f));
ok("ships no font/image/video assets", banned.length === 0, banned.map((f) => path.relative(ROOT, f)).join(", "));
ok("attributes Apple trademarks", /trademarks of Apple/i.test(fs.readFileSync(path.join(ROOT, "README.md"), "utf8")));
ok("states it ships none of Apple's content", /ships none of Apple's content|carries none of Apple's content/i.test(skillMd + fs.readFileSync(path.join(ROOT, "README.md"), "utf8")));

export default checks;
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const c of checks) if (!c.pass) console.log("FAIL:", c.name, c.detail);
  const p = checks.filter((c) => c.pass).length;
  console.log(`structure: ${p}/${checks.length}`);
}

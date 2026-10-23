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
// A dense tool and a marketing page are scored against different numbers.
// --mode erp forces the tool's set; --mode page forces the marketing set;
// omitted, it detects and says which it used.
const MODE = flag("mode");
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
    stickyBlocked: [], stickyScoped: [], stickyOk: 0,
    pxRhythm: [],
    dimmed: [],
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
      const cs = getComputedStyle(n);
      // A gradient has no single colour behind the text. Assuming the page
      // default here reported every element on a gradient page as 1:1, which
      // is noise, not a finding. Say "unknown" and skip the check instead.
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const v = rgba(cs.backgroundColor);
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
        // A status badge is meaning, not an ink step — a tool needs a semantic
        // set and it should not be charged against the three inks. Its
        // contrast is still checked below, where it matters more.
        if (!el.closest('[data-status], [role="status"], .badge, .status')) {
          bump(out.inks, key(cs.color));
          note(out.inksWhere, key(cs.color), pathOf(el));
        }
        const bg = bgBehind(el);
        const a = lum(c), b = bg ? lum(bg) : 0;
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
        if (bg && ratio < (large ? 3 : 4.5) && c.a > 0.3)
          out.contrast.push({ where: pathOf(el), colour: key(cs.color), ratio: +ratio.toFixed(2), size });
      }

      // an ancestor stuck below full opacity multiplies every ink step inside
      // it — a reveal that never completed, or a "subtle" wrapper
      let o = 1;
      for (let n = el; n && n !== document.body; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
      // an effective 0 is hidden, not dimmed — that is a reveal that has not
      // run, which is a different problem and would drown this one
      if (o < 0.95 && o > 0.05) out.dimmed.push({ where: pathOf(el), opacity: +o.toFixed(2) });

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
      // Only overflow hidden/clip makes sticky inert. A *scrollable* ancestor
      // is the sticky element's scrollport — that is exactly how a sticky
      // table header works, and calling it broken is how a correct grid gets
      // "fixed" into a broken one. A scroll container around a section that
      // was meant to pin to the viewport is a real but different problem, so
      // it is noted at low weight rather than failed.
      let p = el.parentElement, clipped = null, scoped = null;
      while (p && p !== document.documentElement) {
        const pc = getComputedStyle(p);
        if (["hidden", "clip"].includes(pc.overflowY) || ["hidden", "clip"].includes(pc.overflowX)) {
          clipped = nameOf(p); break;
        }
        if (!scoped && p !== document.body && ["auto", "scroll"].includes(pc.overflowY)) scoped = nameOf(p);
        p = p.parentElement;
      }
      if (clipped) out.stickyBlocked.push(nameOf(el) + "  <-- clipped by  " + clipped);
      else {
        out.stickyOk++;
        if (scoped && !/^(TH|TD|TR|THEAD)$/.test(el.tagName))
          out.stickyScoped.push(nameOf(el) + "  sticks inside  " + scoped);
      }
    }
  }

  for (const el of document.querySelectorAll("section, main > div, main > section")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none") continue;
    const pt = Math.round(parseFloat(cs.paddingTop));
    if (pt > 0) bump(out.sectionPad, pt + "px");
  }

  // ------------------------------------------------------------- the media
  // Moving pictures are a third of what a visitor sees on a product page, and
  // they fail in ways that are countable: a clip with nothing underneath it, a
  // clip the browser will refuse to play inline, one render letterboxed into
  // every width. See references/media.md.
  out.media = { clips: [], srcs: [], reducedMotionRule: false, moving: 0 };
  for (const v of document.querySelectorAll("video")) {
    const b = v.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    // a still "underneath" means in the same box, not merely nearby
    const parent = v.parentElement;
    const still = !!(v.getAttribute("poster") ||
      (parent && [...parent.querySelectorAll("img, picture")].some((n) => {
        const r = n.getBoundingClientRect();
        return r.width > b.width * 0.6 && r.height > b.height * 0.6;
      })));
    out.media.clips.push({
      still, muted: v.muted, inline: v.playsInline, preload: v.preload,
      autoplay: v.hasAttribute("autoplay"), loop: v.loop,
      named: !!(v.getAttribute("aria-label") || v.getAttribute("title")),
      stackNamed: !!(v.closest("[role=img][aria-label]")),
      w: v.videoWidth, h: v.videoHeight,
      boxW: Math.round(b.width), boxH: Math.round(b.height),
      fit: getComputedStyle(v).objectFit,
      src: (v.currentSrc || v.getAttribute("src") || "").split("/").pop(),
      where: pathOf(v),
    });
  }
  for (const n of document.querySelectorAll("img, video, source")) {
    const u = n.currentSrc || n.getAttribute("src") || "";
    if (u) out.media.srcs.push(u.split("/").pop());
  }
  for (const sheet of document.styleSheets) {
    try {
      for (const r of sheet.cssRules)
        if (r.conditionText && /prefers-reduced-motion/.test(r.conditionText)) out.media.reducedMotionRule = true;
    } catch (e) { /* cross-origin sheet */ }
  }
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (parseFloat(cs.transitionDuration) > 0 || cs.animationName !== "none") out.media.moving++;
  }
  return JSON.stringify(out);
}

// ------------------------------------------------------------- the erp probe
// A second probe, run only at the widest width. A dense tool is a desktop
// product: measuring its grid at 500px tells you about a layout nobody uses.
// Kept separate from probeFn so the page-mode path is untouched.
function probeErpFn() {
  const out = {
    tables: 0, rows: 0, rowH: {}, tableFonts: {},
    headNotSticky: [], firstColNotSticky: [],
    numMisaligned: [], numNotTabular: [], headerMisaligned: [],
    doubleSep: [], smallTargets: [], truncated: [],
    labelGaps: {}, focusVisible: false, outlineKilled: 0,
    navDepth: 0, contentPad: {}, offGrid: {}, biggestType: 0,
    statusHues: 0,
  };
  const bump = (o, k) => (o[k] = (o[k] || 0) + 1);
  const cap = (a, v) => { if (a.length < 8 && a.indexOf(v) === -1) a.push(v); };
  const nameOf = (el) => {
    const cls = typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + cls;
  };
  const rect = (el) => el.getBoundingClientRect();
  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return null;
    const b = rect(el);
    return b.width > 0 && b.height > 0 ? cs : null;
  };
  // "1.234,56"  "(2.300)"  "-17"  "88%"  "12,5 kg" — a cell the eye compares
  // by magnitude rather than reads
  const NUM = /^[\s(]*[-+]?(?:\d[\d.,\s]*)(?:%|[A-Za-z]{0,3})?\)?$/;
  const numeric = (t) => {
    const s = t.trim();
    return s.length > 0 && s.length < 24 && /\d/.test(s) && NUM.test(s);
  };

  // ------------------------------------------------------------------ tables
  for (const tbl of document.querySelectorAll('table, [role="grid"], [role="treegrid"]')) {
    if (!shown(tbl)) continue;
    out.tables++;
    const heads = [...tbl.querySelectorAll('thead th, [role="columnheader"]')];
    const rows = [...tbl.querySelectorAll('tbody tr, [role="row"]')].filter((r) => !r.querySelector("th") || r.querySelector("td"));
    out.rows += rows.length;

    if (heads.length) {
      const hcs = getComputedStyle(heads[0]);
      if (hcs.position !== "sticky" && rows.length > 8)
        cap(out.headNotSticky, nameOf(tbl) + "  (" + rows.length + " rows, header scrolls away)");
    }

    // a table wider than the box it sits in loses the row's identity on a
    // sideways scroll unless the identifying column is pinned
    const holder = tbl.parentElement;
    if (holder && tbl.scrollWidth > holder.clientWidth + 4) {
      const firstCell = rows[0] && rows[0].children[0];
      if (firstCell && getComputedStyle(firstCell).position !== "sticky")
        cap(out.firstColNotSticky, nameOf(tbl) + "  (" + tbl.scrollWidth + "px in a " + holder.clientWidth + "px box)");
    }

    // column alignment, read off the first body row
    const sample = rows.slice(0, 12);
    const colAlign = [];
    for (const r of sample) {
      [...r.children].forEach((cell, i) => {
        const cs = shown(cell);
        if (!cs) return;
        const t = cell.textContent || "";
        if (!numeric(t)) return;
        colAlign[i] = (colAlign[i] || 0) + 1;
        if (cs.textAlign !== "right" && cs.textAlign !== "end")
          cap(out.numMisaligned, nameOf(tbl) + " col " + (i + 1) + "  '" + t.trim().slice(0, 14) + "'  text-align: " + cs.textAlign);
        if (!/tabular-nums|tabular/.test(cs.fontVariantNumeric))
          cap(out.numNotTabular, nameOf(tbl) + " col " + (i + 1) + "  '" + t.trim().slice(0, 14) + "'");
      });
    }
    heads.forEach((h, i) => {
      if (!colAlign[i]) return;                       // not a numeric column
      const hcs = shown(h);
      if (hcs && hcs.textAlign !== "right" && hcs.textAlign !== "end")
        cap(out.headerMisaligned, nameOf(tbl) + " col " + (i + 1) + "  '" + (h.textContent || "").trim().slice(0, 18) + "'  header " + hcs.textAlign + " over right-aligned numbers");
    });

    // row height and the type budget inside the grid
    for (const r of rows.slice(0, 40)) {
      const h = Math.round(rect(r).height);
      if (h > 4) bump(out.rowH, h + "px");
    }
    for (const c of [...tbl.querySelectorAll("td, th")].slice(0, 120)) {
      const cs = shown(c);
      if (cs) bump(out.tableFonts, Math.round(parseFloat(cs.fontSize)) + "px");
    }

    // striping and borders are two grids drawn on top of each other
    if (rows.length > 2) {
      const bgOf = (r) => {
        const c = r.children[0];
        const v = c ? getComputedStyle(c).backgroundColor : "";
        return v && v !== "rgba(0, 0, 0, 0)" ? v : getComputedStyle(r).backgroundColor;
      };
      const striped = bgOf(rows[0]) !== bgOf(rows[1]);
      const cell = rows[1].children[0];
      const bordered = cell && (parseFloat(getComputedStyle(cell).borderTopWidth) > 0 ||
                                parseFloat(getComputedStyle(rows[1]).borderTopWidth) > 0);
      if (striped && bordered) cap(out.doubleSep, nameOf(tbl) + "  (zebra stripes and row borders)");
    }
  }

  // ------------------------------------------------- targets, truncation, type
  const INTERACTIVE = 'button, a, input, select, textarea, summary, [role="button"], [role="tab"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    const cs = shown(el);
    if (!cs) continue;
    if (cs.display === "inline") continue;            // a link inside a sentence is not a target
    const h = rect(el).height, w = rect(el).width;
    if (h > 0 && h < 28 && w > 0) cap(out.smallTargets, nameOf(el) + "  " + Math.round(w) + "×" + Math.round(h));
    if (cs.outlineStyle === "none" && !/inset/.test(cs.boxShadow)) out.outlineKilled++;
  }

  for (const el of document.querySelectorAll("body *")) {
    const cs = shown(el);
    if (!cs) continue;
    if (cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1 &&
        !el.title && !el.getAttribute("aria-label") && !el.querySelector("[title]"))
      cap(out.truncated, nameOf(el) + "  '" + (el.textContent || "").trim().slice(0, 20) + "…'  no title attribute");

    const ownsText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (ownsText) {
      const s = parseFloat(cs.fontSize);
      if (s > out.biggestType) out.biggestType = Math.round(s);
    }
  }

  // ------------------------------------------------------------------- forms
  for (const lab of document.querySelectorAll("label")) {
    const cs = shown(lab);
    if (!cs) continue;
    let ctrl = lab.control || null;
    if (!ctrl) {
      const n = lab.nextElementSibling;
      if (n && /^(INPUT|SELECT|TEXTAREA)$/.test(n.tagName)) ctrl = n;
      else if (lab.parentElement) ctrl = lab.parentElement.querySelector("input, select, textarea");
    }
    if (!ctrl || !shown(ctrl)) continue;
    const gap = Math.round(rect(ctrl).top - rect(lab).bottom);
    if (gap >= 0 && gap < 60) bump(out.labelGaps, gap + "px");
  }

  // ------------------------------------------------- focus, nav depth, gutters
  try {
    for (const sheet of document.styleSheets) {
      let rules = null;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      for (const r of rules) {
        if (r.cssText && r.cssText.indexOf(":focus-visible") !== -1) { out.focusVisible = true; break; }
      }
      if (out.focusVisible) break;
    }
  } catch (e) { /* cross-origin stylesheet */ }

  for (const li of document.querySelectorAll("nav li")) {
    let depth = 0;
    for (let n = li; n; n = n.parentElement) if (n.tagName === "LI") depth++;
    if (depth > out.navDepth) out.navDepth = depth;
  }

  for (const el of document.querySelectorAll('main, [role="main"], .content, .page, .view')) {
    const cs = shown(el);
    if (!cs) continue;
    const p = Math.round(Math.max(parseFloat(cs.paddingLeft), parseFloat(cs.paddingTop)));
    if (p > 0) bump(out.contentPad, p + "px");
  }

  // the 4px grid — every spacing value in a dense screen lands on it
  const scope = document.querySelector('main, [role="main"]') || document.body;
  for (const el of scope.querySelectorAll("*")) {
    const cs = shown(el);
    if (!cs) continue;
    for (const v of [cs.paddingTop, cs.paddingLeft, cs.marginBottom, cs.rowGap, cs.columnGap]) {
      const n = parseFloat(v);
      if (!n || n < 4 || n > 64 || /%/.test(v)) continue;   // 1-3px is a hairline, not spacing
      if (Math.abs(n - Math.round(n)) > 0.01) continue;   // sub-pixel from a flex calc
      if (Math.round(n) % 4 !== 0) bump(out.offGrid, Math.round(n) + "px");
    }
  }

  return JSON.stringify(out);
}

// ------------------------------------------------------------ the soul probe
// Restraint says what to take away. Nothing in it says what has to be there,
// so a page can score perfectly and still be a blank canvas with good margins.
// This measures what a visitor actually SEES at every screenful of scroll, and
// looks for the specific tells of a generated page.
//
// Measured on 8 apple.com product pages for the thresholds below:
//   media 38% · flat 51% · text 12% · gradient 6% · scale contrast x6.7
//   screens with no image at all: 22%
function probeSoulFn() {
  const out = {
    screens: 0, media: 0, gradient: 0, text: 0, flat: 0,
    deadScreens: 0, big: 0, bodySize: 0, scaleContrast: 0,
    tells: [], mediaCount: 0,
  };

  // Media often sits in a sibling layer BEHIND the copy, so walking up from
  // the topmost hit element finds a text wrapper and calls the screen empty.
  // The whole stack under the point is the only honest read.
  const classify = (x, y) => {
    const stack = document.elementsFromPoint(x, y);
    let grad = false, text = false;
    for (const n of stack) {
      if (n === document.body || n === document.documentElement) break;
      if (["IMG", "PICTURE", "VIDEO", "CANVAS", "IFRAME", "svg"].indexOf(n.tagName) !== -1) return "media";
      const cs = getComputedStyle(n);
      const bi = cs.backgroundImage;
      if (bi && bi !== "none") { if (/gradient/.test(bi)) grad = true; else return "media"; }
      if (!text) {
        for (const c of n.childNodes) if (c.nodeType === 3 && c.textContent.trim()) { text = true; break; }
      }
    }
    return grad ? "gradient" : text ? "text" : "flat";
  };

  const was = window.scrollY;
  const H = window.innerHeight, W = window.innerWidth;
  const total = document.body.scrollHeight;
  const counts = { media: 0, gradient: 0, text: 0, flat: 0 };
  let screens = 0, dead = 0;
  for (let top = 0; top + 80 < total && screens < 60; top += H) {
    window.scrollTo(0, top);
    let m = 0, g = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const k = classify((c + 0.5) * W / 8, (r + 0.5) * H / 8);
      counts[k]++;
      if (k === "media") m++;
      if (k === "gradient") g++;
    }
    if (m === 0 && g === 0) dead++;
    screens++;
  }
  window.scrollTo(0, was);
  const pts = Math.max(1, screens * 64);
  out.screens = screens;
  out.media = +(counts.media / pts).toFixed(3);
  out.gradient = +(counts.gradient / pts).toFixed(3);
  out.text = +(counts.text / pts).toFixed(3);
  out.flat = +(counts.flat / pts).toFixed(3);
  out.deadScreens = dead;

  // ------------------------------------------------------- scale contrast
  const sizes = {};
  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return null;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0 ? cs : null;
  };
  const all = [];
  for (const el of document.querySelectorAll("body *")) { const cs = shown(el); if (cs) all.push([el, cs]); }
  for (const [el, cs] of all) {
    let owns = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { owns = true; break; }
    if (!owns) continue;
    const s = Math.round(parseFloat(cs.fontSize));
    sizes[s] = (sizes[s] || 0) + 1;
    if (s > out.big) out.big = s;
  }
  const ranked = Object.entries(sizes).sort((a, b) => b[1] - a[1]);
  out.bodySize = ranked.length ? +ranked[0][0] : 0;
  out.scaleContrast = out.bodySize ? +(out.big / out.bodySize).toFixed(2) : 0;
  out.mediaCount = document.querySelectorAll("img, picture, video, canvas, iframe").length;

  // ------------------------------------------------------------- the tells
  const tell = (what, detail) => out.tells.push(detail ? what + " — " + detail : what);

  let gradText = 0;
  for (const [el, cs] of all) {
    if ((cs.webkitBackgroundClip === "text" || cs.backgroundClip === "text") &&
        /gradient/.test(cs.backgroundImage)) gradText++;
  }
  if (gradText) tell("a gradient on the type", gradText + " element(s); apple.com does this on zero headlines");

  let glass = 0;
  for (const [el, cs] of all) {
    const f = cs.backdropFilter || cs.webkitBackdropFilter || "";
    if (/blur/.test(f) && !el.closest("nav, header, [role=\"banner\"], [role=\"navigation\"]")) glass++;
  }
  if (glass >= 3) tell("glass cards", glass + " blurred panels outside the nav");

  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}]/u;
  let emoji = 0;
  for (const [el, cs] of all) {
    if (el.children.length) continue;            // the leaf that holds the glyph
    const t = (el.textContent || "").trim();
    if (t.length <= 4 && EMOJI.test(t)) emoji++;
  }
  if (emoji >= 2) tell("emoji used as icons", emoji + " of them");

  // three equal cards, over and over: one layout idea repeated until the page ends
  const sections = [];
  for (const el of document.querySelectorAll("section, main > div, .section")) {
    const cs = shown(el); if (cs) sections.push([el, cs]);
  }
  let triples = 0, centered = 0;
  const heights = [];
  for (const [sec, cs] of sections) {
    heights.push(Math.round(sec.getBoundingClientRect().height));
    if (cs.textAlign === "center") centered++;
    for (const box of sec.querySelectorAll("*")) {
      const bcs = getComputedStyle(box);
      if (!/grid|flex/.test(bcs.display)) continue;
      // three equal columns, however many cards are poured into them
      const tracks = (bcs.gridTemplateColumns || "").split(" ").map(parseFloat).filter((n) => n > 0);
      if (tracks.length === 3 && Math.max(...tracks) - Math.min(...tracks) <= 2 && tracks[0] > 80) {
        triples++; break;
      }
      const kids = [...box.children].filter((k) => getComputedStyle(k).display !== "none");
      if (kids.length !== 3) continue;
      const ws = kids.map((k) => Math.round(k.getBoundingClientRect().width));
      if (ws[0] > 80 && Math.max(...ws) - Math.min(...ws) <= 2) { triples++; break; }
    }
  }
  if (triples >= 3) tell("three equal cards in " + triples + " sections", "one layout idea repeated");
  if (sections.length >= 4 && centered / sections.length >= 0.8)
    tell("every section centered", centered + " of " + sections.length + "; centering applied everywhere emphasises nothing");

  // no loud, no quiet: a page where every screen weighs the same
  if (heights.length >= 4) {
    const mean = heights.reduce((a, b) => a + b, 0) / heights.length;
    const sd = Math.sqrt(heights.reduce((a, h) => a + (h - mean) ** 2, 0) / heights.length);
    out.sectionCv = +(sd / mean).toFixed(2);
    if (sd / mean < 0.18) tell("every section the same height", "cv " + (sd / mean).toFixed(2) + " — the page never changes pace");
  }

  const body = (document.body.innerText || "").toLowerCase();
  if (/lorem ipsum|dolor sit amet/.test(body)) tell("lorem ipsum shipped");
  const WORDS = ["elevate", "seamless", "unleash", "supercharge", "transform your", "empower",
    "revolutioniz", "unlock", "effortless", "game-chang", "next-level", "cutting-edge",
    "leverage", "holistic", "curated", "journey"];
  const heads = [...document.querySelectorAll("h1, h2, h3")].map((h) => (h.textContent || "").toLowerCase()).join(" ");
  const hits = WORDS.filter((w) => heads.indexOf(w) !== -1);
  if (hits.length >= 2) tell("generated-page vocabulary in the headlines", hits.join(", "));

  const srcs = [...document.querySelectorAll("img, source")].map((i) => i.src || i.srcset || "").join(" ");
  const bgs = all.map(([, cs]) => cs.backgroundImage).join(" ");
  if (/picsum\.photos|placehold|via\.placeholder|unsplash\.com\/random|source\.unsplash/.test(srcs + bgs))
    tell("placeholder image service in the markup", "a wireframe shipped as a design");

  let plates = 0;
  for (const [el, cs] of all) {
    const b = el.getBoundingClientRect();
    if (b.width < 32 || b.width > 72 || Math.abs(b.width - b.height) > 4) continue;
    const r = parseFloat(cs.borderTopLeftRadius);
    if (r >= 6 && r < b.width / 2 && el.querySelector("svg, img")) plates++;
  }
  if (plates >= 6) tell("icon plates", plates + " small rounded squares with a glyph in them — an icon is not media");

  return JSON.stringify(out);
}

// ------------------------------------------------------------------ driver
export async function runAudit(url, widths = WIDTHS, mode = null) {
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
  // Walk the page so scroll-triggered reveals actually fire. An instant jump
  // to the bottom does not give an IntersectionObserver anything to observe,
  // and everything below the fold then measures as opacity 0.
  await call("Runtime.evaluate", { expression: `(async () => {
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  })()`, awaitPromise: true });
  await sleep(800);
  const r = await call("Runtime.evaluate", { expression: `(${probeFn.toString()})()`, returnByValue: true });
  if (r.exceptionDetails) { console.error(r.exceptionDetails.text); throw new Error(r.exceptionDetails.text); }
  const page = JSON.parse(r.result.value);
  if (width === widths[0]) {
    const e = await call("Runtime.evaluate", { expression: `(${probeErpFn.toString()})()`, returnByValue: true });
    if (e.exceptionDetails) { console.error(e.exceptionDetails.text); throw new Error(e.exceptionDetails.text); }
    page.erp = JSON.parse(e.result.value);
    const sl = await call("Runtime.evaluate", { expression: `(${probeSoulFn.toString()})()`, returnByValue: true });
    if (sl.exceptionDetails) { console.error(sl.exceptionDetails.text); throw new Error(sl.exceptionDetails.text); }
    page.soul = JSON.parse(sl.result.value);
  }
  return page;
};

const byWidth = {};
try {
  for (const w of widths) byWidth[w] = await measure(w);
} finally {
  // a leaked headless Chrome survives the process and holds a core at 50%,
  // so the teardown runs whether the probe succeeded or threw
  ws.close(); chrome.kill(); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
}

const d = byWidth[widths[0]];
const e = d.erp || {};
const sl = d.soul || {};

// A dense tool is a different product with different numbers. Guessing is
// cheap and checkable: a real grid, or an aria grid role, or more rows than a
// marketing page would ever print.
const looksDense = (e.tables > 0 && e.rows >= 10) || e.rows >= 10 ||
  (e.tables > 0 && (e.headNotSticky.length || e.numMisaligned.length));
const useErp = mode === "erp" || (mode === null && looksDense);

// ---------------------------------------------------------------- findings
const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const findings = [];
const add = (weight, title, detail, fix, where) => findings.push({ weight, title, detail, fix, where });

const hues = Object.entries(d.chroma).filter(([, n]) => n >= 3);
const inks = Object.keys(d.inks).length;
const radii = Object.entries(d.radii).filter(([, n]) => n >= 3);
const pads = Object.keys(d.sectionPad).length;
const durs = Object.entries(d.durations).filter(([, n]) => n >= 3);

if (hues.length > (useErp ? 5 : 2))
  add(10, `${hues.length} accent hues in use`,
      hues.map(([h, n]) => `${h}° ×${n}`).join("  "),
      useErp
        ? "A tool gets one action colour plus four semantic ones — success, warning, critical, neutral. Five is the ceiling and status is the only thing allowed to use them. A hue per module or per document type is still the rainbow mistake. See references/erp.md."
        : "Apple ships one. Pick the hue that already means 'action' on this page and map the rest to ink steps. Almost always the single most visible change.",
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
if (!useErp && scaled.length)
  add(6, `${scaled.length} headline(s) scaled on phone instead of re-picked`,
      "the size changed but the tracking did not follow it",
      "Each size has its own tracking: 64px -> 40px means -0.009em -> 0em, not -0.009em at a smaller size.",
      scaled.slice(0, 4));
if (!useErp && frozen.length)
  add(5, `${frozen.length} large headline(s) never step down on phone`,
      "",
      "66 of Apple's 106 type classes change at a breakpoint. A 48px headline on a 500px viewport is two words per line.",
      frozen.slice(0, 4));

if (!useErp && pads > 3)
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

if (!useErp && (d.stickyScoped || []).length)
  add(3, `${d.stickyScoped.length} sticky element(s) stick to a scroll container, not the viewport`,
      "an ancestor scrolls, so the element pins inside that box instead of the page",
      "Fine for a table header — that is the intent. Wrong for a section meant to pin while the page scrolls past it: move the scroll container off the ancestor chain.",
      d.stickyScoped.slice(0, 4));

if (d.dimmed.length)
  add(7, `${d.dimmed.length} text element(s) sitting under a stuck opacity`,
      "every ink step inside them is multiplied by it",
      "opacity on an ancestor compounds, unlike a colour alpha. If this is a reveal, it never completed; if it is a 'subtle' wrapper, set the colour instead. See references/dark.md.",
      d.dimmed.slice(0, 4).map((x) => `${x.opacity} effective  ${x.where}`));

if (d.contrast.length)
  add(8, `${d.contrast.length} text element(s) below WCAG AA`,
      d.contrast.slice(0, 3).map((c) => `${c.ratio}:1 at ${Math.round(c.size)}px — ${c.colour}`).join("   "),
      "Supporting copy still has to be readable. If an ink step fails, it is decoration, not text.",
      d.contrast.slice(0, 4).map((c) => `${c.ratio}:1  ${c.where}`));

// voice
if (!useErp && d.headlines.length >= 3) {
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
if (!useErp && pxGaps.size > 6)
  add(4, `${pxGaps.size} different px gaps between stacked text elements`,
      [...pxGaps].sort((a, b) => a - b).slice(0, 12).join(", ") + "px",
      "The em ladder (0.4 / 0.8 / 1.6) replaces these so spacing scales with the type it follows. Lowest-visibility fix on this list — do it after the ones above.");


// ----------------------------------------------------------- dense-tool mode
// Different product, different numbers. A grid is scanned, not read: what
// breaks it is alignment, a header that scrolls away, and a row height nobody
// agreed on. See references/erp.md for where each number comes from.
if (useErp) {
  const topE = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

  if (e.headNotSticky.length)
    add(10, `${e.headNotSticky.length} table(s) whose header scrolls away`,
        "the column names leave the viewport while the rows keep going",
        "thead th { position: sticky; top: 0; z-index: 2 } with an opaque background. In a 400-row grid the reader otherwise scrolls back up to remember which column they are in, twice a minute.",
        e.headNotSticky);

  if (e.firstColNotSticky.length)
    add(9, `${e.firstColNotSticky.length} table(s) scroll sideways with no pinned identity column`,
        "once the first column is off-screen the rows are anonymous numbers",
        "Pin it: td:first-child { position: sticky; left: 0 }. Let the description column be the one that gives way, never the identifier.",
        e.firstColNotSticky);

  if (e.numMisaligned.length)
    add(9, `${e.numMisaligned.length} numeric cell group(s) not right-aligned`,
        "numbers are compared by magnitude, which only works when the places line up",
        ".num { text-align: right } — alignment follows the data type, not the layout. Text left, numbers right, and the header matches its column.",
        e.numMisaligned);

  if (e.headerMisaligned.length)
    add(8, `${e.headerMisaligned.length} column header(s) not aligned to their own column`,
        "a left-aligned header sitting over right-aligned numbers",
        "The header is part of the column. Give it the column's alignment and the eye stops hunting for which number belongs to which name.",
        e.headerMisaligned);

  if (e.numNotTabular.length)
    add(8, `${e.numNotTabular.length} numeric cell group(s) without tabular-nums`,
        "proportional digits make 1,111 narrower than 8,888, so the column has a jagged edge",
        "font-variant-numeric: tabular-nums. One declaration, and two rows become comparable at a glance. Mandatory anywhere a number sits under another number.",
        e.numNotTabular);

  if (e.smallTargets.length)
    add(7, `${e.smallTargets.length} interactive element(s) under 28px tall`,
        e.smallTargets.slice(0, 3).join("   "),
        "28px is the dense-desktop floor (44 is the touch figure and would blow the density budget). Give the control the full row height and centre the icon inside it — a 16px icon button in a 40px row is a 16px target with 24px of wasted padding.",
        e.smallTargets);

  if (!e.focusVisible)
    add(7, "no :focus-visible rule anywhere in the stylesheets",
        `${e.outlineKilled} interactive element(s) currently paint no outline`,
        "A tool is operated by keyboard by anyone who uses it all day. :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }. If the reset removes outlines, the replacement goes in the same commit.");

  const rowHs = Object.entries(e.rowH).filter(([, n]) => n >= 2);
  if (rowHs.length > 3)
    add(6, `${rowHs.length} different row heights`,
        topE(e.rowH).map(([h, n]) => `${h} ×${n}`).join("  "),
        "Derive the whole grid from one token: --row-h of 32 / 40 / 48. Cell, field, button and toolbar heights all come off it, which is also what makes two different modules line up.",
        rowHs.slice(0, 4).map(([h, n]) => `${h} on ${n} rows`));

  const fatPad = Object.entries(e.contentPad).filter(([k]) => parseInt(k) >= 48);
  if (fatPad.length)
    add(6, "the content gutter is marketing-sized",
        fatPad.map(([k, n]) => `${k} ×${n}`).join("  "),
        "16–24px in a dense tool. The 80–100px section ladder is for a page read once; here it costs rows. Space belongs in 24px blocks between field groups, not added to every edge.");

  if (e.biggestType > 32)
    add(6, `the largest type on screen is ${e.biggestType}px`,
        "a page title, not a headline",
        "28px is the ceiling for a view title and 20px is often right. A 48px headline above a data grid spends a row of screen on a word the user already knew.");

  const tFonts = Object.entries(e.tableFonts).filter(([, n]) => n >= 3);
  if (tFonts.length > 3)
    add(5, `${tFonts.length} font sizes inside the grid`,
        topE(e.tableFonts).map(([f, n]) => `${f} ×${n}`).join("  "),
        "Three: 14px values, 14px semibold headers, 12px ids and units. A fourth size is a decision nobody made.");

  if (e.doubleSep.length)
    add(5, `${e.doubleSep.length} table(s) separating rows twice`,
        "zebra striping and row borders at the same time",
        "Pick one. Two grids drawn on top of each other is why a table can look busy while containing nothing. Apple's own tables use a hairline between rows and no vertical rules at all.",
        e.doubleSep);

  if (e.truncated.length)
    add(5, `${e.truncated.length} truncated element(s) with no way to see the rest`,
        "text-overflow: ellipsis and no title attribute",
        "An ellipsis with nothing behind it is data loss presented as design. Carry the full value in title, and give the identifier column a min-width so the description is the thing that gives way.",
        e.truncated);

  const gaps = Object.entries(e.labelGaps);
  if (gaps.length > 2)
    add(4, `${gaps.length} different label-to-field gaps`,
        topE(e.labelGaps).map(([g, n]) => `${g} ×${n}`).join("  "),
        "8px, once, everywhere. The form reads as one grid instead of forty independent decisions.");

  const off = Object.entries(e.offGrid).filter(([, n]) => n >= 3);
  if (off.length > 2)
    add(4, `${off.length} spacing values off the 4px grid`,
        topE(e.offGrid).map(([v, n]) => `${v} ×${n}`).join("  "),
        "A dense screen uses 4 / 8 / 12 / 16 / 24 / 32 and nothing else. 10px, 14px and 18px are the values that make a tool feel assembled rather than designed.");

  if (e.navDepth > 2)
    add(3, `the navigation tree nests ${e.navDepth} levels deep`,
        "",
        "One level plus a search field over the whole menu. A five-level ERP menu is a sitemap standing in for an information architecture nobody decided.");

  const slow = Object.entries(d.durations).filter(([t]) => parseInt(t) > 250);
  if (slow.length)
    add(3, `${slow.length} transition(s) longer than 250ms`,
        slow.map(([t, n]) => `${t} ×${n}`).join("  "),
        "In a tool: 80ms hover, 150ms state, 200ms for a panel. Anything performed hundreds of times a day animates in 0ms — charming once, an obstacle the three-hundredth time.");
}


// ------------------------------------------------------------- is it alive
// A marketing page's job is to make someone want the thing. Restraint only
// says what to take away; these say what has to be there. Measured on eight
// apple.com product pages: 38% of what a visitor sees is a photograph or
// video, 12% is text, and the largest type is x6.7 the body size.
if (!useErp && sl.screens) {
  const pc = (n) => Math.round(n * 100) + "%";

  if (sl.media < 0.15)
    add(10, `only ${pc(sl.media)} of what a visitor sees is a picture`,
        `${pc(sl.flat)} of the page is flat colour, ${pc(sl.text)} is text, and there are ${sl.mediaCount} media element(s) in the markup`,
        "apple.com's median is 38% media against 12% text — roughly three times as much picture as copy. A page at this level has nothing to look at, and no amount of spacing fixes that. See references/composition.md for the ratios and references/imagery.md for where real images come from, including when the project arrives with none.");

  if (sl.deadScreens / sl.screens > 0.35)
    add(9, `${sl.deadScreens} of ${sl.screens} screenful(s) contain no image at all`,
        "a reader can scroll a whole viewport and see only colour and type",
        "Apple's own rate is about one screen in five, and those are the rests — spec tables, footnotes, the footer. A rest only reads as a rest if something came before it.");

  // The inverse failure, and the one that is easy to walk into while fixing
  // the first: a page that is nothing but full-bleed photography. apple.com
  // runs roughly 3 parts picture to 1 part text, not 60 to 1 — the copy is
  // what makes it a page rather than a gallery.
  if (sl.media > 0.5 && sl.text < 0.05)
    add(9, `the page is ${pc(sl.media)} picture and only ${pc(sl.text)} text`,
        `media ${pc(sl.media)} · flat ${pc(sl.flat)} · text ${pc(sl.text)}`,
        "apple.com's median is 38% media against 12% text, about three to one. Past roughly eight to one the pictures stop supporting an argument and become the whole page, and a reader has nothing to take away. Give each section its paragraph back. See references/composition.md.");

  if (sl.media >= 0.15 && sl.flat > 0.7)
    add(8, `${pc(sl.flat)} of the page is flat surface colour`,
        `media ${pc(sl.media)} · text ${pc(sl.text)} · gradient ${pc(sl.gradient)}`,
        "Apple's median is 51% flat, and that is with full-bleed media carrying the rest. Make the pictures bigger before adding anything new.");

  if (sl.scaleContrast && sl.scaleContrast < 4.5)
    add(7, `the largest type is only x${sl.scaleContrast} the body size`,
        `${sl.big}px over ${sl.bodySize}px`,
        "apple.com's median is x6.7 — 96px over 17px. Below about x4 everything on the page is talking at the same volume, which reads as a document rather than a page.");

  if ((sl.tells || []).length)
    add(8, `${sl.tells.length} tell(s) of a generated page`,
        "each one is in references/composition.md with what it costs",
        "Three or more of these and the page reads as slop regardless of how good the spacing is. They are all removable in an afternoon.",
        sl.tells);
}

// ------------------------------------------------------------------- media
// Moving pictures fail in countable ways. These run on a page, not on a tool:
// an ERP has no business carrying a hero clip. references/media.md.
if (!useErp) {
  const md = d.media || { clips: [], srcs: [], moving: 0 };
  const clips = md.clips || [];
  const narrow = (byWidth[WIDTHS[WIDTHS.length - 1]] || {}).media || { srcs: [] };

  const noStill = clips.filter((c) => !c.still);
  if (noStill.length)
    add(9, `${noStill.length} clip(s) with no still underneath`,
        noStill.map((c) => c.src || "(no src)").join("  "),
        "apple.com never ships a bare <video>. A <picture> of frame 0 sits in the same grid cell, so a slow connection, a failed load or a reduced-motion preference lands on a photograph instead of an empty box. The poster attribute is not enough on its own — it takes one URL and cannot be art-directed. See references/media.md.",
        noStill.map((c) => c.where).filter(Boolean));

  const refuses = clips.filter((c) => !c.muted || !c.inline);
  if (refuses.length)
    add(10, `${refuses.length} clip(s) a phone will refuse to play inline`,
        refuses.map((c) => `${c.src || "clip"}${c.muted ? "" : " not muted"}${c.inline ? "" : " not playsinline"}`).join("  "),
        "iOS renders an inline video only when it is muted and carries playsinline. Without both it either does nothing or takes over the screen. Apple's own markup sets both on every anim clip, and the files have no audio track at all.",
        refuses.map((c) => c.where).filter(Boolean));

  const eager = clips.filter((c) => c.preload === "auto");
  if (eager.length)
    add(6, `${eager.length} clip(s) with preload="auto"`,
        eager.map((c) => c.src || "clip").join("  "),
        'apple.com ships preload="none" with an empty src and writes the file in only when the scroll window opens — two viewports ahead of the clip, not at page load. A product page with fourteen clips downloads none of them up front. See references/media.md.',
        eager.map((c) => c.where).filter(Boolean));

  const unnamed = clips.filter((c) => !c.named && !c.stackNamed);
  if (unnamed.length)
    add(7, `${unnamed.length} clip(s) with no accessible name`,
        unnamed.map((c) => c.src || "clip").join("  "),
        'A clip is a picture that moves, so it gets one name for the whole thing: role="img" and an aria-label on the stack that wraps the video and its still, describing what happens in a sentence. Naming the <video> itself announces a player nobody can operate.',
        unnamed.map((c) => c.where).filter(Boolean));

  // A clip pillarboxed inside its slot: the subject ends up small and centred
  // while the layout around it is full-bleed. Checked at every width, because
  // the usual version of this is a desktop render dropped into a phone slot.
  const atWidth = WIDTHS.flatMap((w) => (((byWidth[w] || {}).media || {}).clips || [])
    .map((c) => ({ ...c, at: w })));
  const boxed = atWidth.filter((c) => c.w && c.h && c.boxW && c.boxH &&
    c.fit !== "cover" &&
    Math.abs((c.w / c.h) / (c.boxW / c.boxH) - 1) > 0.25);
  if (boxed.length)
    add(8, `${boxed.length} clip(s) letterboxed inside their slot`,
        boxed.map((c) => `${c.at}px: ${c.src || "clip"} ${c.w}x${c.h} in ${c.boxW}x${c.boxH} (object-fit: ${c.fit})`).join("  "),
        "The file's aspect and the box's aspect disagree by more than a quarter, and object-fit is not cover — so the clip is sitting in bars. Apple re-cuts the crop to the slot instead: the same three seconds ship at 0.88 on phones, 1.62 on tablets and 2.06 on desktop. Either cut a crop that matches this box or let it fill with object-fit: cover and accept the trim. See references/media.md.",
        boxed.map((c) => c.where).filter(Boolean));

  // art direction: the same files at 1440 and at 500 means one render stretched
  const wide = new Set(md.srcs || []), thin = new Set(narrow.srcs || []);
  const shared = [...wide].filter((u) => thin.has(u));
  if (wide.size >= 3 && shared.length === wide.size && wide.size === thin.size)
    add(7, `the same ${wide.size} media file(s) are served at 1440px and at 500px`,
        [...wide].slice(0, 6).join("  "),
        "Apple re-cuts the crop per breakpoint rather than scaling one render: the same three seconds ship as a 0.88 portrait on phones, a 1.62 on tablets and a 2.06 on desktop. A 16:9 render letterboxed into a phone slot leaves the subject small and centred while the layout around it is full-bleed, which is most of what reads as unfinished. See references/media.md and the art-direction rules in references/imagery.md.");

  if (md.moving > 0 && !md.reducedMotionRule)
    add(8, `${md.moving} element(s) animate and nothing honours reduced motion`,
        "no @media (prefers-reduced-motion) rule in any stylesheet the page can read",
        "With the preference set, apple.com does not slow its clips down — it never fetches them, drops the moving layer out of the layout and loads a still in its place. At minimum, clamp durations in a prefers-reduced-motion block. See references/media.md.");

  // the inverse: a product page where nothing moves at all
  if (!clips.length && md.moving === 0 && (sl.screens || 0) >= 3)
    add(8, "nothing on this page moves",
        `${md.moving} element(s) carry a transition or an animation, and there are no clips`,
        "A flagship product page on apple.com carries 6 to 14 short clips against 110 to 204 stills — roughly one clip per two or three sections, about 260 KB each. A category page carries none, and is right to. If this is a product page, it is missing a third of the vocabulary: references/media.md has the ffmpeg recipes and tools/make-clip.sh builds the ladder.");
}

findings.sort((a, b) => b.weight - a.weight);

// ------------------------------------------------------------------ output
const summary = {
  url, when: new Date().toISOString(),
  hues: hues.length, inks, radii: radii.length, pads, durs: durs.length,
  strayNormal: strayNormal.length, scaled: scaled.length, frozen: frozen.length,
  stickyBlocked: d.stickyBlocked.length, stickyScoped: (d.stickyScoped || []).length, stickyOk: d.stickyOk,
  contrastFails: d.contrast.length, dimmed: d.dimmed.length, nodes: d.nodes,
  mode: useErp ? "erp" : "page", dense: !!looksDense,
  clips: ((d.media || {}).clips || []).length,
  clipsNoStill: ((d.media || {}).clips || []).filter((c) => !c.still).length,
  moving: (d.media || {}).moving ?? 0,
  reducedMotionRule: (d.media || {}).reducedMotionRule ?? null,
  mediaShare: sl.media ?? null, flatShare: sl.flat ?? null, textShare: sl.text ?? null,
  screens: sl.screens ?? 0, deadScreens: sl.deadScreens ?? 0,
  scaleContrast: sl.scaleContrast ?? 0, mediaCount: sl.mediaCount ?? 0,
  tells: (sl.tells || []).length,
  tables: e.tables || 0, rows: e.rows || 0,
  headNotSticky: (e.headNotSticky || []).length,
  firstColNotSticky: (e.firstColNotSticky || []).length,
  numMisaligned: (e.numMisaligned || []).length,
  numNotTabular: (e.numNotTabular || []).length,
  headerMisaligned: (e.headerMisaligned || []).length,
  smallTargets: (e.smallTargets || []).length,
  focusVisible: !!e.focusVisible,
  rowHeights: Object.keys(e.rowH || {}).length,
  doubleSep: (e.doubleSep || []).length,
  truncated: (e.truncated || []).length,
  offGrid: Object.keys(e.offGrid || {}).length,
  biggestType: e.biggestType || 0,
};

  return { summary, findings, byWidth };
}

// --------------------------------------------------------------------- cli
function report(url, { summary, findings, byWidth }, widths = WIDTHS) {
  const d = byWidth[widths[0]];
  console.log(`\n  apple-design audit — ${url}`);
  console.log(`  measured at ${widths.join(" / ")}px · ${d.nodes} painted elements · ${d.stickyOk} working sticky element(s)`);
  if (summary.mode === "erp")
    console.log(`  dense-tool mode · ${summary.tables} table(s), ${summary.rows} rows · the marketing padding, headline and parallax checks are off`);
  else if (summary.dense)
    console.log(`  scored as a marketing page, but this looks like a tool — re-run with --mode erp`);
  if (summary.mode !== "erp" && summary.screens)
    console.log(`  what a visitor sees: ${Math.round(summary.mediaShare * 100)}% picture · ${Math.round(summary.textShare * 100)}% text · ${Math.round(summary.flatShare * 100)}% flat colour  (apple.com: 38 / 12 / 51)`);
  console.log("");
  if (!findings.length) {
    if (summary.mode === "erp") {
      console.log("  Nothing countable is off. What is left is judgement: whether the");
      console.log("  columns are the ones the job needs, whether the four grid states");
      console.log("  exist, and whether the whole task can be done from the keyboard.\n");
    } else {
      console.log("  Nothing countable is off. What is left is judgement: voice, art");
      console.log("  direction, and whether the page has one idea per section.\n");
    }
    return;
  }
  findings.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.title}`);
    if (f.detail) console.log(`     ${f.detail}`);
    for (const w of (f.where || []).slice(0, 4)) console.log(`       · ${w}`);
    console.log(`     -> ${f.fix}\n`);
  });
  if (summary.mode === "erp") {
    console.log("  Work top-down. Alignment and the sticky header are what makes the");
    console.log("  grid readable; the density tokens below them are what makes two");
    console.log("  modules look like one product.\n");
  } else {
    console.log("  Work top-down. The first two are what someone notices;");
    console.log("  rhythm and motion below them are what they feel.\n");
  }
}

function reportDelta(was, now) {
  const labels = {
    hues: "accent hues", inks: "text colours", radii: "corner radii",
    pads: "section paddings", durs: "durations", strayNormal: "sizes tracked normal",
    scaled: "headlines scaled not re-picked", frozen: "headlines frozen on phone",
    stickyBlocked: "sticky blocked", stickyScoped: "sticky scoped to a container", contrastFails: "below AA",
    dimmed: "text under a stuck opacity",
    headNotSticky: "tables with a scrolling header", firstColNotSticky: "tables with no pinned column",
    numMisaligned: "numeric cells not right-aligned", numNotTabular: "numeric cells not tabular",
    headerMisaligned: "headers misaligned to their column", smallTargets: "targets under 28px",
    rowHeights: "row heights", doubleSep: "tables separated twice",
    truncated: "truncations with no title", offGrid: "spacings off the 4px grid",
    biggestType: "largest type on screen",
    deadScreens: "screens with no image", tells: "generated-page tells",
    scaleContrast: "scale contrast", mediaCount: "media elements",
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
  const result = await runAudit(URL_, WIDTHS, MODE);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ summary: result.summary, byWidth: result.byWidth }, null, 2));
  report(URL_, result);
  if (BASELINE) reportDelta(JSON.parse(fs.readFileSync(BASELINE, "utf8")).summary, result.summary);
}

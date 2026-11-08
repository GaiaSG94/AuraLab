// AuraLab core — shell: validates config, builds the dashboard, binds everything,
// runs the loop. Knows categories and presentation; knows zero science.
import { validateConfig } from "./validate.js";
import { mergeCatalog, builtinInstruments } from "./catalog.js";
import { el, escapeHtml, hexToRgb, buildControls } from "./controls.js";
import { buildChips, buildCurve } from "./instruments.js";
import { buildNotebook } from "./notebook.js";
import { createClock } from "./time.js";

// source: config URL (fetch) or config object (standalone).
// buildLab(api, config): lab wiring, returns { state, step?, draw?, reset, resync, setSize?, measures() }.
// labManifest: { measures: [{id}] } extra measure ids beyond counts.*.
// packManifests: catalog contributions [{ laws, apparatus, measures }].
export async function boot(source, buildLab, labManifest, packManifests) {
  const root = document.getElementById("lab");
  root.innerHTML = "";
  let raw;
  if (typeof source === "string") {
    try {
      const res = await fetch(source, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      raw = await res.json();
    } catch (err) {
      root.appendChild(el("div", "error", `Could not load ${source}: ${String(err)}`));
      return null;
    }
  } else {
    raw = source;
  }

  const catalog = mergeCatalog(packManifests || []);
  const known = {
    laws: {},
    apparatus: Object.keys(catalog.apparatus),
    instruments: Object.keys(builtinInstruments),
    measures: [],
    surfaces: ["stage"],
  };
  Object.keys(catalog.laws).forEach((id) => {
    known.laws[id] = { defaults: catalog.laws[id].defaults || {} };
  });
  (packManifests || []).forEach((m) => {
    (m.measures || []).forEach((x) => known.measures.push(x.id));
  });
  ((labManifest && labManifest.measures) || []).forEach((x) => known.measures.push(x.id));

  const { config, warnings, errors } = validateConfig(raw, known);
  if (!config) {
    root.appendChild(el("div", "error", `Invalid config:\n- ${errors.join("\n- ")}`));
    return null;
  }
  if (warnings.length > 0) console.info("[auralab] auto-tuned config:", warnings);

  document.documentElement.style.setProperty("--accent", config.lab.accent);
  document.title = `${config.lab.title} — AuraLab`;

  // --- active flags (checkboxes) ---
  const active = {};
  const key = (cat, id) => `${cat}:${id}`;
  config.substances.forEach((s) => { active[key("substances", s.id)] = s.active; });
  config.material.forEach((m) => { active[key("material", m.id)] = m.active; });
  config.laws.forEach((l, i) => { active[key("laws", `${l.law}#${i}`)] = l.active; });
  const isActive = (cat, id) => active[key(cat, id)] !== false;
  const lawKey = (i) => `${config.laws[i].law}#${i}`;

  // --- layout ---
  const header = el("header", "lab-header");
  header.appendChild(el("h1", "", `${escapeHtml(config.lab.title).replace(/-([^-]*)$/, '<span class="dot">-$1</span>')}`));
  header.appendChild(el("p", "", escapeHtml(config.lab.subtitle)));
  header.appendChild(el("span", "template-tag", "auralab template"));
  const main = el("div", "lab-main");
  const stage = el("div", "stage");
  const canvas = el("canvas");
  stage.appendChild(canvas);
  const hud = el("div", "hud");
  stage.appendChild(hud);
  const sidebar = el("aside", "sidebar");
  main.appendChild(stage);
  main.appendChild(sidebar);
  root.appendChild(header);
  root.appendChild(main);

  // --- lab wiring ---
  const clock = createClock();
  const ctx = canvas.getContext("2d");
  const api = {
    stage: { canvas, ctx, W: 800, H: 600 },
    params: config,
    catalog,
    isActive,
    time: clock,
  };
  const lab = buildLab(api, config);

  const speckles = [];
  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(50, Math.floor(r.width * dpr));
    canvas.height = Math.max(50, Math.floor((window.innerHeight - 57) * dpr));
    api.stage.W = canvas.width / dpr;
    api.stage.H = canvas.height / dpr;
    if (lab.setSize) lab.setSize(api.stage.W, api.stage.H);
    speckles.length = 0;
    for (let i = 0; i < config.bench.speckles; i++) {
      speckles.push({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.3, a: 0.25 + Math.random() * 0.5 });
    }
    drawOnce();
  }
  window.addEventListener("resize", resize);

  // --- metrics + instruments ---
  const metricsById = {};
  config.metrics.forEach((m) => { metricsById[m.id] = m; });
  const metricValues = () => {
    const flat = lab.measures();
    const out = {};
    config.metrics.forEach((m) => { out[m.id] = flat[m.source]; });
    return out;
  };
  const instruments = [];
  const fpsChip = el("span", "chip", "fps <b>–</b>");
  hud.appendChild(fpsChip);
  const fpsVal = fpsChip.querySelector("b");
  config.instruments.forEach((entry) => {
    if (entry.type === "chips") instruments.push(buildChips(hud, entry, metricsById));
    else if (entry.type === "curve") instruments.push(buildCurve(stage, entry, metricsById));
  });

  // --- category sections with selectable rows ---
  const liveSpans = {};
  function noticeBlock(notice) {
    if (!notice) return null;
    return el(
      "div", "notice",
      `<b>${escapeHtml(notice.label || "")}</b><br>` +
      `<i>Rule:</i> ${escapeHtml(notice.formule || "–")}<br>` +
      `<i>Sources:</i> ${escapeHtml(notice.sources || "–")}<br>` +
      `<i>Limits:</i> ${escapeHtml(notice.limites || "–")}`
    );
  }
  function row(cat, id, label, swatch, notice, liveId) {
    const wrap = el("div", "elem-row");
    const box = el("input");
    box.type = "checkbox";
    box.checked = isActive(cat, id);
    box.setAttribute("aria-label", `Enable ${label}`);
    box.addEventListener("change", () => {
      active[key(cat, id)] = box.checked;
      drawOnce();
    });
    wrap.appendChild(box);
    if (swatch) {
      const s = el("span", "swatch");
      s.style.background = swatch;
      wrap.appendChild(s);
    }
    const nameBtn = el("button", "elem-name", escapeHtml(label));
    const nb = noticeBlock(notice);
    if (nb) {
      nb.style.display = "none";
      nameBtn.addEventListener("click", () => {
        nb.style.display = nb.style.display === "none" ? "" : "none";
      });
    } else {
      nameBtn.disabled = true;
    }
    wrap.appendChild(nameBtn);
    if (liveId) {
      const live = el("span", "live", "0");
      liveSpans[liveId] = live;
      wrap.appendChild(live);
    }
    const outer = el("div", "elem");
    outer.appendChild(wrap);
    if (nb) outer.appendChild(nb);
    return outer;
  }
  function section(title, rows) {
    if (rows.length === 0) return;
    const sec = el("section", "", `<h2>${escapeHtml(title)}</h2>`);
    rows.forEach((r) => sec.appendChild(r));
    sidebar.appendChild(sec);
  }
  function lawsTargeting(subId, lawIdx) {
    const entry = config.laws[lawIdx];
    if (entry.targets) return entry.targets.includes(subId);
    const pairs = entry.params && entry.params.pairs;
    if (pairs) return pairs.some((p) => p.includes(subId));
    return true;
  }
  section("Substances", config.substances.map((s) => {
    const lawNames = config.laws
      .map((l, i) => ({ l, i }))
      .filter(({ i }) => lawsTargeting(s.id, i))
      .map(({ l }) => (catalog.laws[l.law] ? catalog.laws[l.law].notice.label : l.law));
    return row("substances", s.id, s.label, s.color, {
      label: s.label,
      formule: `Group of ${s.count}: simulated by ${lawNames.join(", ") || "no law"}.`,
      sources: "Declared in this lab config.",
      limites: "Behavior comes from active laws only; uncheck a law to remove its effect.",
    }, `sub:${s.id}`);
  }));
  section("Material", config.material.map((m) => {
    const app = catalog.apparatus[m.kind];
    return row("material", m.id, m.label, m.color || null, app ? app.notice : null, null);
  }));
  section("Laws", config.laws.map((l, i) => {
    const mod = catalog.laws[l.law];
    const pairs = l.params && l.params.pairs ? ` (${l.params.pairs.map((p) => p.join("→")).join(", ")})` : "";
    const targets = l.targets ? ` → ${l.targets.join(", ")}` : pairs;
    return row("laws", lawKey(i), (mod ? mod.notice.label : l.law) + targets, null, mod ? mod.notice : null, null);
  }));

  // --- controls + time buttons ---
  const redrawStatic = () => {
    if (lab.resync) lab.resync();
    drawOnce();
  };
  buildControls(sidebar, config, lab.state, () => {
    if (lab.resync) lab.resync();
    if (!usesTime()) drawOnce();
  });
  const usesTime = () => typeof lab.step === "function";
  const runSec = el("section");
  const rowBtns = el("div", "btn-row");
  const pauseBtn = el("button", "", "Pause");
  const resetBtn = el("button", "", "Reset");
  const stepBtn = el("button", "", "+1 step");
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !usesTime()) {
    clock.running = false;
    pauseBtn.textContent = "Play";
  }
  if (!usesTime()) pauseBtn.disabled = true;
  pauseBtn.addEventListener("click", () => {
    clock.running = !clock.running;
    pauseBtn.textContent = clock.running ? "Pause" : "Play";
  });
  const doReset = () => {
    if (lab.reset) lab.reset();
    clock.reset();
    instruments.forEach((ins) => { if (ins.reset) ins.reset(); });
    drawOnce();
  };
  resetBtn.addEventListener("click", doReset);
  stepBtn.addEventListener("click", () => {
    if (usesTime() && !clock.running && lab.step) {
      lab.step(1 / 60, isActive);
      clock.advance(1 / 60);
      sampleOnce();
      drawOnce();
    }
  });
  rowBtns.appendChild(pauseBtn);
  rowBtns.appendChild(resetBtn);
  rowBtns.appendChild(stepBtn);
  runSec.appendChild(rowBtns);
  sidebar.appendChild(runSec);
  if (config.lab.note) sidebar.appendChild(el("p", "note", escapeHtml(config.lab.note)));
  if (warnings.length > 0) {
    sidebar.appendChild(el("p", "note", `Auto-tuned ${warnings.length} value(s) — see console.`));
  }

  // --- notebook ---
  const controlsSec = () => sidebar.querySelectorAll("section");
  buildNotebook(sidebar, config,
    () => ({
      t: clock.t,
      metrics: metricValues(),
      params: {
        substances: JSON.parse(JSON.stringify(config.substances)),
        material: JSON.parse(JSON.stringify(config.material)),
        laws: JSON.parse(JSON.stringify(config.laws)),
      },
    }),
    (params) => {
      config.substances = params.substances;
      config.material = params.material;
      config.laws = params.laws;
      if (lab.resync) lab.resync();
      controlsSec().forEach((sec) => { if (sec.refreshAll) sec.refreshAll(); });
      drawOnce();
    }
  );

  // --- loop ---
  resize();
  let last = performance.now();
  let fpsAcc = 0;
  let fpsN = 0;
  let fpsT = 0;
  let histT = 0;

  function sampleOnce() {
    const v = metricValues();
    instruments.forEach((ins) => ins.sample(v));
  }

  function drawOnce() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = config.bench.background;
    ctx.globalAlpha = config.bench.trail;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    for (const s of speckles) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = "#cdd6e0";
      ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    if (lab.draw) lab.draw(ctx, W, H, isActive, hexToRgb);
    const v = metricValues();
    instruments.forEach((ins) => ins.update(v));
    const flat = lab.measures();
    config.substances.forEach((s) => {
      const span = liveSpans[`sub:${s.id}`];
      if (span) span.textContent = String(flat[`counts.${s.id}`] === undefined ? "–" : flat[`counts.${s.id}`]);
    });
  }

  function draw(t) {
    requestAnimationFrame(draw);
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.05);
    fpsAcc += dt;
    fpsN += 1;
    fpsT += dt;
    if (fpsT >= 0.5) {
      fpsVal.textContent = String(Math.round(fpsN / fpsAcc));
      fpsAcc = 0;
      fpsN = 0;
      fpsT = 0;
    }
    if (clock.running && usesTime()) {
      lab.step(dt, isActive);
      clock.advance(dt);
      histT += dt;
      if (histT >= 0.25) {
        histT = 0;
        sampleOnce();
      }
    }
    drawOnce();
  }
  sampleOnce();
  requestAnimationFrame(draw);
  return { config, lab };
}

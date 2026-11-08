// AuraLab core — shell: validates config, builds the lab page, binds everything,
// runs the loop. Knows categories and presentation; knows zero science.
// Page: header (ghost, lab name, back link) / steps | bench | panel.
// Every lab built on this shell gets the same look; config only sets colors.
import { validateConfig } from "./validate.js";
import { mergeCatalog, builtinInstruments } from "./catalog.js";
import { el, escapeHtml, hexToRgb, buildControls } from "./controls.js";
import { buildChips, buildCurve } from "./instruments.js";
import { buildNotebook } from "./notebook.js";
import { createClock } from "./time.js";
import "./ghost.js"; // side effect: window.AuraGhost (logo + notebook guide)

const JAR = (c) =>
  `<svg viewBox="0 0 30 34" aria-hidden="true"><path d="M5 17h20v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="${c}"/>` +
  '<path d="M10 2h10M11 2v6L4 15v13a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V15l-7-7V2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const APPARATUS = (c) =>
  `<svg viewBox="0 0 30 34" aria-hidden="true"><circle cx="15" cy="17" r="12" fill="${c}" opacity=".35"/>` +
  `<circle cx="15" cy="17" r="6.5" fill="${c}" stroke="currentColor" stroke-width="2"/></svg>`;

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
  document.documentElement.style.setProperty("--page", config.lab.page);
  document.title = `${config.lab.title} — AuraLab`;

  // --- active flags (checkboxes and switches) ---
  const active = {};
  const key = (cat, id) => `${cat}:${id}`;
  config.substances.forEach((s) => { active[key("substances", s.id)] = s.active; });
  config.material.forEach((m) => { active[key("material", m.id)] = m.active; });
  config.laws.forEach((l, i) => { active[key("laws", `${l.law}#${i}`)] = l.active; });
  const isActive = (cat, id) => active[key(cat, id)] !== false;
  const lawKey = (i) => `${config.laws[i].law}#${i}`;
  const ghost = (host, theme) => {
    if (window.AuraGhost) window.AuraGhost.mount(host, theme);
    return host;
  };

  // --- layout ---
  const header = el("header", "lab-header");
  header.appendChild(ghost(el("span", "logo"), "white"));
  header.appendChild(el("h1", "", escapeHtml(config.lab.title)));
  const back = el("a", "back", "← all labs");
  back.href = config.lab.home;
  header.appendChild(back);

  const main = el("div", "lab-main");
  const rail = el("nav", "rail");
  rail.setAttribute("role", "tablist");
  rail.setAttribute("aria-label", "Lab steps");
  const bench = el("section", "bench");
  const benchHead = el("div", "zh", '<h2>Bench</h2><span class="hint">Watch it happen</span>');
  const fpsChip = el("span", "end fps", "– fps");
  benchHead.appendChild(fpsChip);
  const stage = el("div", "stage");
  const canvas = el("canvas");
  canvas.setAttribute("aria-label", `${config.lab.title} simulation`);
  stage.appendChild(canvas);
  bench.appendChild(benchHead);
  bench.appendChild(stage);
  const panel = el("section", "panel");
  main.appendChild(rail);
  main.appendChild(bench);
  main.appendChild(panel);
  root.appendChild(header);
  root.appendChild(main);

  // One step on the left = one pane on the right. Only declared parts get a step.
  const steps = [{ id: "lab", label: "Lab", hint: "Substances, material, instruments" }];
  if (config.laws.length > 0) steps.push({ id: "laws", label: "Laws", hint: "How it behaves" });
  if (config.controls.length > 0) steps.push({ id: "knobs", label: "Knobs", hint: "Change the amounts" });
  if (config.notebook.enabled) steps.push({ id: "notebook", label: "Notebook", hint: "Write what you see" });
  const panes = {};
  const tabs = [];
  const instruments = [];
  function select(id) {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.step === id)));
    Object.keys(panes).forEach((k) => panes[k].classList.toggle("on", k === id));
    instruments.forEach((ins) => { if (ins.redraw) ins.redraw(); });
  }
  steps.forEach((st, i) => {
    const tab = el("button", "tab", `<span class="no">${i + 1}</span><b>${st.label}</b><small>${st.hint}</small>`);
    tab.type = "button";
    tab.id = `tab-${st.id}`;
    tab.dataset.step = st.id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", `pane-${st.id}`);
    tab.addEventListener("click", () => select(st.id));
    rail.appendChild(tab);
    tabs.push(tab);
    const pane = el("div", "pane");
    pane.id = `pane-${st.id}`;
    pane.setAttribute("role", "tabpanel");
    pane.setAttribute("aria-labelledby", tab.id);
    const head = el("div", "zh", `<span class="no">${i + 1}</span><h2>${st.label}</h2><span class="hint">${st.hint}</span>`);
    if (st.id === "notebook") head.appendChild(ghost(el("span", "guide"), "inkpaper"));
    pane.appendChild(head);
    panel.appendChild(pane);
    panes[st.id] = pane;
  });
  rail.appendChild(el("div", "spacer"));

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
  const usesTime = () => typeof lab.step === "function";

  const speckles = [];
  let sized = false;
  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(50, Math.floor(r.width * dpr));
    canvas.height = Math.max(50, Math.floor(r.height * dpr));
    api.stage.W = canvas.width / dpr;
    api.stage.H = canvas.height / dpr;
    if (lab.setSize) lab.setSize(api.stage.W, api.stage.H);
    // First real size known: respawn so nothing starts outside the bench.
    if (!sized) {
      sized = true;
      if (lab.reset) lab.reset();
    }
    speckles.length = 0;
    for (let i = 0; i < config.bench.speckles; i++) {
      speckles.push({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.3, a: 0.25 + Math.random() * 0.5 });
    }
    drawOnce();
  }
  // The canvas always matches the bench's real pixel size: the scene is never stretched.
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);

  // --- rows ---
  const liveSpans = {};
  function noticeBlock(notice) {
    if (!notice) return null;
    const nb = el(
      "div", "notice",
      `<b>${escapeHtml(notice.label || "")}</b><br>` +
      `<i>Rule:</i> ${escapeHtml(notice.formule || "–")}<br>` +
      `<i>Sources:</i> ${escapeHtml(notice.sources || "–")}<br>` +
      `<i>Limits:</i> ${escapeHtml(notice.limites || "–")}`
    );
    nb.hidden = true;
    return nb;
  }
  function infoButton(nb, label) {
    const b = el("button", "ib", "i");
    b.type = "button";
    b.setAttribute("aria-label", `About ${label}`);
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", () => {
      nb.hidden = !nb.hidden;
      b.setAttribute("aria-expanded", String(!nb.hidden));
    });
    return b;
  }
  // kind: "check" (box) or "switch" (laws). Real checkbox, restyled in CSS.
  function toggle(cat, id, label, kind) {
    const wrap = el("label", kind);
    const box = el("input");
    box.type = "checkbox";
    box.checked = isActive(cat, id);
    box.setAttribute("aria-label", `Enable ${label}`);
    box.addEventListener("change", () => {
      active[key(cat, id)] = box.checked;
      drawOnce();
    });
    wrap.appendChild(box);
    wrap.appendChild(el("span"));
    return wrap;
  }
  // Substance / material row: icon, name, live text, notice button, enable box.
  function itemRow(cat, id, label, icon, notice) {
    const outer = el("div", "elem");
    const row = el("div", "elem-row", `<span class="icon">${icon}</span><span class="name">${escapeHtml(label)}</span>`);
    const live = el("span", "live", "");
    row.appendChild(live);
    const tools = el("span", "tools");
    const nb = noticeBlock(notice);
    if (nb) tools.appendChild(infoButton(nb, label));
    tools.appendChild(toggle(cat, id, label, "check"));
    row.appendChild(tools);
    outer.appendChild(row);
    if (nb) outer.appendChild(nb);
    return { outer, live };
  }
  function block(parent, title, cls) {
    const b = el("div", cls || "blk", `<h3 class="sub">${escapeHtml(title)}</h3>`);
    parent.appendChild(b);
    return b;
  }
  function lawsTargeting(subId, lawIdx) {
    const entry = config.laws[lawIdx];
    if (entry.targets) return entry.targets.includes(subId);
    const pairs = entry.params && entry.params.pairs;
    if (pairs) return pairs.some((p) => p.includes(subId));
    return true;
  }

  // Pane "Lab": substances, material and instruments, all visible at once.
  const subsBlk = block(panes.lab, "Substances");
  if (config.substances.length === 0) subsBlk.appendChild(el("p", "empty", "No substance in this lab."));
  config.substances.forEach((s) => {
    const lawNames = config.laws
      .map((l, i) => ({ l, i }))
      .filter(({ i }) => lawsTargeting(s.id, i))
      .map(({ l }) => (catalog.laws[l.law] ? catalog.laws[l.law].notice.label : l.law));
    const r = itemRow("substances", s.id, s.label, JAR(s.color), {
      label: s.label,
      formule: `Group of ${s.count}: simulated by ${lawNames.join(", ") || "no law"}.`,
      sources: "Declared in this lab config.",
      limites: "Behavior comes from active laws only; switch a law off to remove its effect.",
    });
    liveSpans[s.id] = r.live;
    subsBlk.appendChild(r.outer);
  });
  const matBlk = block(panes.lab, "Material");
  if (config.material.length === 0) matBlk.appendChild(el("p", "empty", "No material in this lab."));
  config.material.forEach((m) => {
    const app = catalog.apparatus[m.kind];
    const r = itemRow("material", m.id, m.label, APPARATUS(m.color || "#ffffff"), app ? app.notice : null);
    r.live.textContent = (app && app.label ? app.label : m.kind).toLowerCase();
    matBlk.appendChild(r.outer);
  });

  // Instruments are measuring devices (counter, curve), shown apart from substances.
  const metricsById = {};
  config.metrics.forEach((m) => { metricsById[m.id] = m; });
  const metricValues = () => {
    const flat = lab.measures();
    const out = {};
    config.metrics.forEach((m) => { out[m.id] = flat[m.source]; });
    return out;
  };
  if (config.instruments.length > 0) {
    const insBlk = block(panes.lab, "Instruments · measuring devices", "blk grow");
    const devs = el("div", "devs");
    insBlk.appendChild(devs);
    config.instruments.forEach((entry) => {
      if (entry.type === "chips") instruments.push(buildChips(devs, entry, metricsById));
      else if (entry.type === "curve") instruments.push(buildCurve(devs, entry, metricsById));
    });
    // A lone counter takes the free space; with a curve, the curve does.
    if (!config.instruments.some((x) => x.type === "curve")) instruments[0].element.classList.add("grow");
  }

  // Pane "Laws": one switch per law, with its notice.
  if (panes.laws) {
    config.laws.forEach((l, i) => {
      const mod = catalog.laws[l.law];
      const label = mod ? mod.notice.label : l.law;
      const pairs = l.params && l.params.pairs ? l.params.pairs.map((p) => p.join(" → ")).join(", ") : "";
      const scope = l.targets ? `on ${l.targets.join(", ")}` : pairs || "on everything";
      const outer = el("div", "elem");
      const row = el("div", "elem-row law");
      row.appendChild(toggle("laws", lawKey(i), label, "switch"));
      row.appendChild(el("span", "", `<span class="name">${escapeHtml(label)}</span><small>${escapeHtml(scope)}</small>`));
      const nb = noticeBlock(mod ? mod.notice : null);
      if (nb) row.appendChild(infoButton(nb, label));
      outer.appendChild(row);
      if (nb) outer.appendChild(nb);
      panes.laws.appendChild(outer);
    });
  }

  // Pane "Knobs": config-declared sliders.
  if (panes.knobs) {
    buildControls(panes.knobs, config, lab.state, () => {
      if (lab.resync) lab.resync();
      if (!usesTime()) drawOnce();
    });
  }

  // Bottom of the steps column: lab note + time buttons.
  if (config.lab.note) rail.appendChild(el("p", "note", escapeHtml(config.lab.note)));
  if (warnings.length > 0) rail.appendChild(el("p", "note", `Auto-tuned ${warnings.length} value(s), see console.`));
  const timeBox = el("div", "time");
  const pauseBtn = el("button", "btn ink big");
  const resetBtn = el("button", "btn line", "Reset");
  const stepBtn = el("button", "btn line", "+1 step");
  [pauseBtn, resetBtn, stepBtn].forEach((b) => {
    b.type = "button";
    timeBox.appendChild(b);
  });
  rail.appendChild(timeBox);
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !usesTime()) clock.running = false;
  const paintPause = () => { pauseBtn.textContent = clock.running ? "❚❚ Pause" : "▶ Play"; };
  paintPause();
  if (!usesTime()) pauseBtn.disabled = true;
  pauseBtn.addEventListener("click", () => {
    clock.running = !clock.running;
    paintPause();
  });
  resetBtn.addEventListener("click", () => {
    if (lab.reset) lab.reset();
    clock.reset();
    instruments.forEach((ins) => { if (ins.reset) ins.reset(); });
    drawOnce();
  });
  stepBtn.addEventListener("click", () => {
    if (usesTime() && !clock.running && lab.step) {
      lab.step(1 / 60, isActive);
      clock.advance(1 / 60);
      sampleOnce();
      drawOnce();
    }
  });

  // Pane "Notebook".
  if (panes.notebook) {
    buildNotebook(panes.notebook, config,
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
        root.querySelectorAll("section").forEach((sec) => { if (sec.refreshAll) sec.refreshAll(); });
        drawOnce();
      }
    );
  }
  select("lab");

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
      const span = liveSpans[s.id];
      const n = flat[`counts.${s.id}`];
      if (span) span.textContent = `× ${n === undefined ? "–" : n}`;
    });
  }

  function draw() {
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
      fpsChip.textContent = `${Math.round(fpsN / fpsAcc)} fps`;
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

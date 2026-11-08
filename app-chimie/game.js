// Chemistry Lab (design C4 "blown glass"): full-screen 3D bench + glass HUD, booted headless.
// lab.js stays the shell wiring used by the validator / MCP server; this is what the page runs.
import { bootHeadless } from "../core/headless.js";
import { getPath, setPath } from "../core/validate.js";
import { chimiePack } from "../engines/chimie/index.js";
import { createWorld } from "../engines/chimie/world.js";
import { buildBenchView } from "../engines/chimie/benchview.js";
import { buildChemHud } from "../engines/chimie/hud.js";

export const gameManifest = { measures: [{ id: "temp" }, { id: "ph" }, { id: "volume" }] };

export async function startGame(source) {
  const boot = await bootHeadless(source, [chimiePack], gameManifest);
  const { config, catalog, clock, isActive, setActive } = boot;
  const host = document.getElementById("game");
  host.innerHTML = "";
  // Full-screen host in both builds (the standalone page has no #game rule of its own).
  host.style.cssText = "position:fixed;inset:0;overflow:hidden;";
  document.documentElement.style.setProperty("--page", config.lab.page);

  const byId = (arr) => {
    const o = {};
    arr.forEach((x) => { o[x.id] = x; });
    return o;
  };
  const laws = config.laws.map((entry, i) => {
    const mod = catalog.laws[entry.law];
    return { id: `${entry.law}#${i}`, mod, targetIds: entry.targets || null, params: { ...mod.defaults, ...(entry.params || {}) } };
  });
  const world = createWorld({ substances: config.substances, material: config.material, laws });
  // Same state shape as lab.js: control paths (substances.x.count, material.x.strength) edit it live.
  const state = { substances: byId(config.substances), material: byId(config.material), laws: laws.map((l) => l.params), bench: config.bench };

  const bookKey = `labkit.${config.lab.id}.notebook`;
  let book = { notes: [], snapshots: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(bookKey) || "null");
    if (raw && typeof raw === "object") {
      book = { notes: Array.isArray(raw.notes) ? raw.notes : [], snapshots: Array.isArray(raw.snapshots) ? raw.snapshots : [] };
    }
  } catch {
    /* unreadable notebook: start a fresh one */
  }
  const saveBook = () => {
    try {
      localStorage.setItem(bookKey, JSON.stringify(book));
    } catch {
      /* private mode: notebook works for the session only */
    }
  };
  const shortOf = (s) => (view ? view.shortName(s.label) : s.label);
  let flashMsg = "";
  let flashUntil = 0;

  const ctx = {
    config, catalog, clock, isActive, setActive, world, state,
    tab: "lab",
    history: [],
    // Recompute what follows from the doses (volume, colour, pH) without advancing time.
    touch() { world.step(0, isActive); },
    flash(msg) { flashMsg = msg; flashUntil = performance.now() + 2200; },
    doseMax(id) {
      const c = config.controls.find((x) => x.path === `substances.${id}.count`);
      return c ? c.max : 3;
    },
    addDose(id) {
      const s = state.substances[id];
      if (!s) return;
      const max = ctx.doseMax(id);
      if ((s.count || 0) >= max) {
        ctx.flash(`No more ${shortOf(s).toLowerCase()}: ${max} dose${max > 1 ? "s" : ""} max`);
        return;
      }
      s.count = (s.count || 0) + 1;
      view.pour(id);
      ctx.touch();
    },
    setBurner(on) {
      setActive("material", "bruleur", on);
      const b = state.material.bruleur;
      if (on && b && !(b.strength > 0)) b.strength = 60;
      ctx.touch();
    },
    toggleBurner() { ctx.setBurner(!isActive("material", "bruleur")); },
    getControl(path) { return getPath(state, path); },
    setControl(path, v) {
      if (setPath(state, path, v)) ctx.touch();
    },
    togglePause() { clock.running = !clock.running; },
    emptyFlask() {
      config.substances.forEach((s) => { s.count = 0; });
      world.reset();
      clock.reset();
      ctx.history.length = 0;
      ctx.touch();
      ctx.history.push(world.temp);
      ctx.flash("Flask emptied and rinsed");
    },
    stepOnce() {
      if (clock.running) return;
      world.step(1 / 60, isActive);
      clock.advance(1 / 60);
      ctx.history.push(world.temp);
      if (ctx.history.length > 80) ctx.history.shift();
    },
    metricValues() {
      const flat = world.measures();
      const out = {};
      config.metrics.forEach((m) => { out[m.id] = flat[m.source]; });
      return out;
    },
    status() {
      if (flashMsg && performance.now() < flashUntil) return { text: flashMsg, colors: [] };
      const present = config.substances.filter((s) => (s.count || 0) > 0);
      const colors = present.map((s) => s.color);
      if (!present.length) return { text: "Empty flask: pour a solution", colors };
      if (world.temp >= 99.5) return { text: "Boiling!", colors };
      if (world.fizz) return { text: "Acid reaction: bubbles, heat, pH falls", colors };
      const d = world.doses();
      let text = d.bleu > 0 && d.jaune > 0 ? "Blue + yellow → green" : `${present.map((s) => shortOf(s)).join(" + ")} in the flask`;
      if (world.heating) text += " · heating";
      return { text, colors };
    },
    notebook() { return book; },
    addNote(text) { book.notes.push({ t: clock.t, text }); saveBook(); },
    deleteNote(i) { book.notes.splice(i, 1); saveBook(); },
    record() {
      book.snapshots.push({
        t: clock.t,
        metrics: ctx.metricValues(),
        params: {
          substances: JSON.parse(JSON.stringify(config.substances)),
          material: JSON.parse(JSON.stringify(config.material)),
          laws: JSON.parse(JSON.stringify(config.laws)),
        },
      });
      saveBook();
      ctx.flash("Measures saved to the notebook");
    },
    deleteSnapshot(i) { book.snapshots.splice(i, 1); saveBook(); },
    // Restore copies values into the live objects so the knobs, world and view keep their refs.
    restore(i) {
      const sn = book.snapshots[i];
      if (!sn || !sn.params) return;
      (sn.params.substances || []).forEach((p) => { if (state.substances[p.id]) state.substances[p.id].count = p.count; });
      (sn.params.material || []).forEach((p) => {
        const m = state.material[p.id];
        if (m && typeof p.strength === "number") m.strength = p.strength;
      });
      ctx.touch();
      ctx.flash("Recorded doses restored");
    },
    insets: () => (hud ? hud.insets() : null),
    onFrame: () => { if (hud) hud.layout(); },
  };

  let hud = null;
  const view = buildBenchView(host, ctx);
  hud = buildChemHud(host, ctx, view);
  view.resize();
  ctx.touch();
  ctx.history.push(world.temp);
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) clock.running = false;

  let acc = 0; // fixed-step accumulator: the chemistry must not depend on frame rate
  let hist = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.05);
    if (clock.running) {
      acc = Math.min(acc + dt, 0.25);
      let n = 0;
      while (acc >= 1 / 60 && n < 4) {
        world.step(1 / 60, isActive);
        clock.advance(1 / 60);
        acc -= 1 / 60;
        hist += 1 / 60;
        n++;
      }
      if (n === 4) acc = 0;
      while (hist >= 0.25) {
        hist -= 0.25;
        ctx.history.push(world.temp);
        if (ctx.history.length > 80) ctx.history.shift();
      }
    }
    view.render(dt);
    hud.refresh();
  }
  requestAnimationFrame(frame);
  return { ctx, view, hud };
}

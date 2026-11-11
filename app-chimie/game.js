// Chemistry Lab (design C4 "blown glass"): full-screen 3D bench + glass HUD, booted headless.
// lab.js stays the shell wiring used by the validator / MCP server / tests; this is what the page runs.
import { bootHeadless } from "../core/headless.js";
import { getPath, setPath } from "../core/validate.js";
import { chimiePack } from "../engines/chimie/index.js";
import { createWorld } from "../engines/chimie/world.js";
import { buildBenchView } from "../engines/chimie/benchview.js";
import { buildChemHud } from "../engines/chimie/hud.js";
import { describeState } from "../engines/chimie/narration.js";

export const gameManifest = {
  measures: [{ id: "temp" }, { id: "ph" }, { id: "volume" }, { id: "precipite" }, { id: "pression" }],
};

const BURETTE_MAX = 50;

export async function startGame(source) {
  const boot = await bootHeadless(source, [chimiePack], gameManifest);
  const { config, catalog, clock, isActive, setActive } = boot;
  const host = document.getElementById("game");
  host.innerHTML = "";
  host.style.cssText = "position:fixed;inset:0;overflow:hidden;";
  document.documentElement.style.setProperty("--page", config.lab.page);

  const byId = (arr) => {
    const o = {};
    arr.forEach((x) => { o[x.id] = x; });
    return o;
  };
  const laws = config.laws.map((entry, i) => {
    const mod = catalog.laws[entry.law];
    return {
      id: `${entry.law}#${i}`,
      mod,
      targetIds: entry.targets || null,
      params: { ...mod.defaults, ...(entry.params || {}) },
    };
  });
  const world = createWorld({ substances: config.substances, material: config.material, laws });
  const state = {
    substances: byId(config.substances),
    material: byId(config.material),
    laws: laws.map((l) => l.params),
    bench: config.bench,
  };
  const book = loadNotebook(config.lab.id);
  let flashMsg = "";
  let flashUntil = 0;

  const ctx = {
    config, catalog, clock, isActive, setActive, world, state,
    tab: "lab",
    history: [],
    touch() { world.step(0, isActive); },
    flash(msg) { flashMsg = msg; flashUntil = performance.now() + 2400; },
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
    removeDose(id) {
      const s = state.substances[id];
      if (!s || (s.count || 0) <= 0) return;
      s.count -= 1;
      ctx.touch();
    },
    // Titration: the burette dispenses NaOH 0.1 M in 1 mL or 5 mL steps.
    dispense(ml) {
      const b = state.material.burette;
      if (!b) return;
      const next = Math.min(BURETTE_MAX, (b.strength || 0) + ml);
      if (next === b.strength) {
        ctx.flash("Burette empty: reset the flask to refill it");
        return;
      }
      b.strength = next;
      view.dispense(ml);
      ctx.touch();
    },
    drainBurette() {
      const b = state.material.burette;
      if (b) b.strength = 0;
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
      ctx.drainBurette();
      world.reset();
      clock.reset();
      ctx.history.length = 0;
      ctx.touch();
      ctx.history.push(world.ph);
      ctx.flash("Flask emptied, rinsed, burette refilled");
    },
    stepOnce() {
      if (clock.running) return;
      world.step(1 / 60, isActive);
      clock.advance(1 / 60);
      ctx.history.push(world.ph);
      if (ctx.history.length > 200) ctx.history.shift();
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
      return describeState(world, present);
    },
    notebook() { return book.data; },
    addNote(text) { book.data.notes.push({ t: clock.t, text }); book.save(); },
    deleteNote(i) { book.data.notes.splice(i, 1); book.save(); },
    record() {
      book.data.snapshots.push({
        t: clock.t,
        metrics: ctx.metricValues(),
        params: {
          substances: JSON.parse(JSON.stringify(config.substances)),
          material: JSON.parse(JSON.stringify(config.material)),
          laws: JSON.parse(JSON.stringify(config.laws)),
        },
      });
      book.save();
      ctx.flash("Measures saved to the notebook");
    },
    deleteSnapshot(i) { book.data.snapshots.splice(i, 1); book.save(); },
    restore(i) {
      const sn = book.data.snapshots[i];
      if (!sn || !sn.params) return;
      (sn.params.substances || []).forEach((p) => {
        if (state.substances[p.id]) state.substances[p.id].count = p.count;
      });
      (sn.params.material || []).forEach((p) => {
        const m = state.material[p.id];
        if (m && typeof p.strength === "number") m.strength = p.strength;
      });
      ctx.touch();
      ctx.flash("Recorded doses and burette restored");
    },
    insets: () => (hud ? hud.insets() : null),
    onFrame: () => { if (hud) hud.layout(); },
  };

  let hud = null;
  const view = buildBenchView(host, ctx);
  hud = buildChemHud(host, ctx, view);
  view.resize();
  ctx.touch();
  ctx.history.push(world.ph);
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) clock.running = false;

  const loop = makeLoop(clock, world, ctx, view, hud, isActive);
  requestAnimationFrame(loop.frame);
  return { ctx, view, hud };
}

function shortOf(s) {
  const words = String(s.label).split(/\s+/).filter((w) => w && !/^(0\.1|solution|m)$/i.test(w));
  return words.sort((a, b) => b.length - a.length)[0] || s.label;
}

function loadNotebook(labId) {
  const key = `labkit.${labId}.notebook`;
  let data = { notes: [], snapshots: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    if (raw && typeof raw === "object") {
      data = {
        notes: Array.isArray(raw.notes) ? raw.notes : [],
        snapshots: Array.isArray(raw.snapshots) ? raw.snapshots : [],
      };
    }
  } catch {
    /* unreadable notebook: start a fresh one */
  }
  return {
    data,
    save() {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        /* private mode: notebook works for the session only */
      }
    },
  };
}

// Fixed-step accumulator: the chemistry must not depend on the frame rate.
function makeLoop(clock, world, ctx, view, hud, isActive) {
  let acc = 0;
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
        ctx.history.push(world.ph);
        if (ctx.history.length > 200) ctx.history.shift();
      }
    }
    view.render(dt);
    hud.refresh();
  }
  return { frame };
}

// Bridge Lab fullscreen game: one valley, one level at a time, a purse that
// grows with every ladder cleared. Boots headless (no shell DOM).
// gameManifest mirrors labManifest for the validator/MCP fallback.
import { bootHeadless } from "../core/headless.js";
import { pontsPack } from "../engines/ponts/index.js";
import { createWorld } from "../engines/ponts/world.js";
import { MATERIALS } from "../engines/ponts/materials.js";
import { levelSpec } from "../engines/ponts/levels.js";
import { buildMapView } from "../engines/ponts/mapview.js";
import { buildHud } from "../engines/ponts/hud.js";

export const gameManifest = {
  measures: [{ id: "fleche" }, { id: "contrainte" }, { id: "cout" }, { id: "score" }],
};

const SAVE_KEY = "labkit.ponts.save.v2";

function loadSave(startPurse) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return null;
    return {
      level: Math.max(1, Math.round(s.level) || 1),
      purse: Number.isFinite(s.purse) ? Math.max(0, s.purse) : startPurse,
      designs: s.designs || {},
      journal: Array.isArray(s.journal) ? s.journal : [],
    };
  } catch {
    return null;
  }
}

function resolveLaws(catalog, config) {
  return config.laws.map((entry, i) => {
    const mod = catalog.laws[entry.law];
    return {
      id: `${entry.law}#${i}`,
      mod,
      targetIds: entry.targets || null,
      params: { ...mod.defaults, ...(entry.params || {}) },
    };
  });
}

// Build the world of one level and restore its saved design, if any.
function buildLevelWorld(laws, spec, save) {
  const world = createWorld({ laws: laws.map((l) => ({ ...l, params: { ...l.params } })), site: spec });
  const charge = world.params()["charge-flottante"];
  if (charge) {
    charge.poids = spec.ladder.heaviest;
    charge.echelons = spec.ladder.rungs;
  }
  const design = save.designs[spec.id];
  if (Array.isArray(design)) {
    for (const st of design) {
      if (!st || !MATERIALS[st.mat]) continue;
      if (!Number.isInteger(st.a) || !Number.isInteger(st.b)) continue;
      if (st.a < 0 || st.b < 0 || st.a >= world.nodes.length || st.b >= world.nodes.length) continue;
      world.place(st.a, st.b, st.mat);
    }
  }
  return world;
}

export async function startGame(source) {
  const boot = await bootHeadless(source, [pontsPack], gameManifest);
  const { config, catalog, clock, isActive, setActive } = boot;
  const host = document.getElementById("game");
  host.innerHTML = "";
  host.style.cssText = "position:fixed;inset:0;overflow:hidden;";
  document.documentElement.style.setProperty("--page", "#ffd6ad");

  const rules = config.levels;
  const startPurse = (rules && rules.purse && rules.purse.start) || 90;
  const save = loadSave(startPurse) || { level: 1, purse: startPurse, designs: {}, journal: [] };
  const persist = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      /* private mode: session only */
    }
  };

  const laws = resolveLaws(catalog, config);
  // The level IS the site: the valley is rebuilt around it on every level change.
  let spec = levelSpec(save.level, save.purse, rules);
  config.sites = [spec];
  const worlds = {};
  worlds[spec.id] = { site: spec, world: buildLevelWorld(laws, spec, save), laws };
  let activeId = spec.id;
  const active = () => worlds[activeId];
  // Set when the ladder is cleared: the finished bridge stays on screen and the
  // Next button opens the next level. Edits stay locked until then, so the
  // purse can be banked exactly once.
  let pending = 0;
  const NEXT_HINT = "Level cleared — click Next level to open a wider gap.";

  const ctx = {
    config, catalog, clock, isActive, setActive, save, persist, rules,
    worlds,
    tool: "bois",
    selected: -1,
    message: "Build the ROAD on the pale row, then TEST.",
    activeId: () => activeId,
    spec: () => spec,
    purse: () => save.purse,
    level: () => save.level,
    pendingLevel: () => pending,
    setTool(t) {
      ctx.tool = t;
      ctx.selected = -1;
      ctx.announce(
        t === "gomme"
          ? "Eraser: click a node to remove its bars."
          : `Selected: ${MATERIALS[t] ? MATERIALS[t].label : t} — click one node, then another.`,
      );
      hud.refresh(true);
    },
    announce(m) { ctx.message = m; },
    place(a, b) {
      if (pending) return ctx.announce(NEXT_HINT);
      const w = active().world;
      const r = w.place(a, b, ctx.tool);
      if (r.ok) {
        ctx.saveDesign();
        ctx.announce(`${MATERIALS[ctx.tool].label} placed.`);
      } else {
        ctx.announce(r.why);
      }
    },
    eraseNode(i) {
      if (pending) return ctx.announce(NEXT_HINT);
      const w = active().world;
      let n = 0;
      for (let k = w.sticks.length - 1; k >= 0; k--) {
        if (w.sticks[k].a === i || w.sticks[k].b === i) {
          w.sticks.splice(k, 1);
          n++;
        }
      }
      if (n > 0) {
        w.dirty = true;
        w.version++;
        ctx.saveDesign();
        ctx.announce(`${n} bar(s) removed, budget refunded.`);
      } else {
        ctx.announce("No bars on this node.");
      }
    },
    undo() {
      if (pending) return ctx.announce(NEXT_HINT);
      const w = active().world;
      if (w.testing) {
        ctx.announce("Test running…");
        return;
      }
      if (w.sticks.length === 0) {
        ctx.announce("Nothing to undo.");
        return;
      }
      w.removeStick(w.sticks.length - 1);
      ctx.selected = -1;
      ctx.saveDesign();
      ctx.announce("Last bar removed, budget refunded.");
    },
    saveDesign() {
      const w = active().world;
      save.designs[activeId] = w.sticks.map((s) => ({ a: s.a, b: s.b, mat: s.mat }));
      persist();
    },
    test() {
      if (pending) return ctx.announce(NEXT_HINT);
      const w = active().world;
      const r = w.startTest();
      ctx.announce(r.ok ? `Test: ${r.rungs} ghosts, up to ${r.heaviest} t` : r.why);
    },
    repair() {
      active().world.resetPhysics();
      ctx.announce("Bridge repaired (the drawing is kept).");
    },
    clearAll() {
      if (pending) return ctx.announce(NEXT_HINT);
      const w = active().world;
      if (w.testing) {
        ctx.announce("Test running…");
        return;
      }
      w.sticks = [];
      w.reset();
      save.designs[activeId] = [];
      persist();
      ctx.announce("Site cleared, budget refunded.");
    },
    // "Ghost 2/4 · 10 t" while the ladder is running.
    ladderStatus(w) {
      const n = w.ghosts.length || 1;
      const i = Math.min(n, w.ghostIndex + 1);
      const g = w.ghosts[w.ghostIndex];
      return `Ghost ${i}/${n} · ${g ? g.weight : 0} t · stress ${Math.round((w.maxStrain || 0) * 100)}%`;
    },
    // The whole ladder crossed: bank the reward. The next level is built when
    // the player asks for it, so the cleared bridge stays on screen.
    levelCleared(reward) {
      if (pending) return;
      save.purse = Math.max(0, save.purse - active().world.spent()) + reward;
      save.level += 1;
      delete save.designs[activeId];
      persist();
      pending = save.level;
    },
    // Next: tear the valley down and rebuild it around the new level.
    nextLevel() {
      if (!pending) return;
      const n = pending;
      pending = 0;
      ctx.goToLevel(n);
    },
    goToLevel(n) {
      pending = 0;
      spec = levelSpec(n, save.purse, rules);
      config.sites = [spec];
      worlds[spec.id] = { site: spec, world: buildLevelWorld(laws, spec, save), laws };
      activeId = spec.id;
      ctx.selected = -1;
      ctx.tool = spec.materials.includes(ctx.tool) ? ctx.tool : spec.materials[0];
      view.rebuild();
      hud.setLevel(spec);
      hud.refresh(true);
      ctx.announce(levelBlurb(spec, save.purse));
    },
    // Levels cleared so far (the purse is the real score).
    totalScore() {
      return save.level - 1;
    },
    journal(text, metrics) {
      save.journal.unshift({
        when: new Date().toLocaleString("en-US"),
        site: activeId,
        text,
        metrics: metrics || null,
      });
      if (save.journal.length > 40) save.journal.length = 40;
      persist();
    },
  };

  let view = buildMapView(host, ctx);
  const hud = buildHud(host, ctx);
  if (active().world.sticks.length > 0) ctx.message = "Road restored — TEST it or keep building.";
  else ctx.announce(levelBlurb(spec, save.purse));

  const lastStatut = {};
  const lastRung = {};
  let acc = 0; // fixed-step accumulator: holds/breaks must not depend on frame rate
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.05);
    if (clock.running) {
      const w = active().world;
      acc = Math.min(acc + dt, 0.25);
      let n = 0;
      while (acc >= 1 / 60 && n < 4) {
        w.step(1 / 60, isActive);
        clock.advance(1 / 60);
        acc -= 1 / 60;
        n++;
      }
      if (n === 4) acc = 0;
      if (w.testing) ctx.message = ctx.ladderStatus(w);
      trackRungs(w, activeId, lastRung, ctx);
      if (w.statut !== (lastStatut[activeId] ?? -1)) {
        lastStatut[activeId] = w.statut;
        if (w.statut === 1) onCleared(w, ctx, spec, lastRung, activeId);
        else if (w.statut === 0) {
          ctx.journal("Collapsed!", w.measures());
          ctx.announce("COLLAPSED! Repair, reinforce, retest.");
        }
      }
    }
    view.render(dt);
    hud.refresh(false);
  }
  requestAnimationFrame(frame);
  return { ctx, view, hud };
}

function levelBlurb(spec, purse) {
  return `Level ${spec.level}: ${spec.width} m gap, ${spec.ladder.rungs} ghosts up to ` +
    `${spec.ladder.heaviest} t. Purse ${purse} — build the ROAD, then TEST.`;
}

// Journal each rung the moment the ladder advances past it.
function trackRungs(w, id, lastRung, ctx) {
  const rung = w.ghostIndex;
  if (!w.testing || rung === (lastRung[id] ?? 0)) return;
  for (let k = lastRung[id] ?? 0; k < rung; k++) {
    const t = w.ghosts[k] ? w.ghosts[k].weight : 0;
    ctx.journal(`Ghost ${k + 1}/${w.ghosts.length} (${t} t) crossed.`, w.measures());
  }
  lastRung[id] = rung;
}

// The whole ladder crossed: bank the reward and open the next level.
function onCleared(w, ctx, spec, lastRung, id) {
  const m = w.measures();
  const n = w.ghosts.length || 1;
  ctx.journal(`Ghost ${n}/${n} (${w.passed} t) crossed.`, m);
  ctx.journal(`Level ${spec.level} cleared! Reward +${spec.reward}.`, m);
  lastRung[id] = 0;
  ctx.announce(`Level ${spec.level} cleared! +${spec.reward} — the next gap is wider.`);
  ctx.levelCleared(spec.reward);
}

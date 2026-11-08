// Bridge Lab fullscreen game: valley map, 3 river sites, HUD. Boots headless (no shell DOM).
// gameManifest mirrors labManifest for the validator/MCP fallback.
import { bootHeadless } from "../core/headless.js";
import { pontsPack } from "../engines/ponts/index.js";
import { createWorld } from "../engines/ponts/world.js";
import { buildMapView } from "../engines/ponts/mapview.js";
import { buildHud } from "../engines/ponts/hud.js";

export const gameManifest = {
  measures: [{ id: "fleche" }, { id: "contrainte" }, { id: "cout" }, { id: "score" }],
};

const SAVE_KEY = "labkit.ponts.save.v1";

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return null;
    return {
      designs: s.designs || {},
      cleared: s.cleared || {},
      journal: Array.isArray(s.journal) ? s.journal : [],
    };
  } catch {
    return null;
  }
}

export async function startGame(source) {
  const boot = await bootHeadless(source, [pontsPack], gameManifest);
  const { config, catalog, clock, isActive, setActive } = boot;
  const host = document.getElementById("game");
  host.innerHTML = "";
  // Full-screen host in both builds (the standalone page has no #game rule of its own).
  host.style.cssText = "position:fixed;inset:0;overflow:hidden;";
  document.documentElement.style.setProperty("--page", "#ffd6ad");
  const save = loadSave() || { designs: {}, cleared: {}, journal: [] };
  const persist = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      /* private mode: session only */
    }
  };
  // One world per site, laws wired from config (same shape as shell labs).
  const worlds = {};
  for (const site of config.sites) {
    const laws = config.laws.map((entry, i) => {
      const mod = catalog.laws[entry.law];
      return {
        id: `${entry.law}#${i}`,
        mod,
        targetIds: entry.targets || null,
        params: { ...mod.defaults, ...(entry.params || {}) },
      };
    });
    const world = createWorld({ laws, site });
    const design = save.designs[site.id];
    if (Array.isArray(design)) {
      for (const st of design) {
        if (!st || (st.type !== "poutre" && st.type !== "cable")) continue;
        if (!Number.isInteger(st.a) || !Number.isInteger(st.b)) continue;
        if (st.a < 0 || st.b < 0 || st.a >= world.nodes.length || st.b >= world.nodes.length) continue;
        world.place(st.a, st.b, st.type);
      }
    }
    worlds[site.id] = { site, world, laws };
  }
  let activeId = config.sites[0].id;
  const active = () => worlds[activeId];
  // Shared game context for the 3D view and the HUD.
  const ctx = {
    config, catalog, clock, isActive, setActive, save, persist,
    worlds,
    tool: "poutre",
    selected: -1,
    message: "Build the ROAD on the pale row, then TEST.",
    activeId: () => activeId,
    setSite(id) {
      if (!worlds[id] || id === activeId) return;
      activeId = id;
      ctx.selected = -1;
      view.setSite(id);
      hud.refresh(true);
    },
    setTool(t) {
      ctx.tool = t;
      ctx.selected = -1;
      ctx.announce(t === "gomme"
        ? "Eraser: click a node to remove its bars."
        : "Click one node, then another, to place.");
      hud.refresh(true);
    },
    announce(m) { ctx.message = m; },
    place(a, b) {
      const w = active().world;
      const r = w.place(a, b, ctx.tool);
      if (r.ok) {
        ctx.saveDesign();
        ctx.announce(`${ctx.tool === "poutre" ? "Beam" : "Cable"} placed.`);
      } else {
        ctx.announce(r.why);
      }
    },
    eraseNode(i) {
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
      save.designs[activeId] = w.sticks.map((s) => ({ a: s.a, b: s.b, type: s.type }));
      persist();
    },
    test() {
      const w = active().world;
      const r = w.startTest();
      ctx.announce(r.ok ? "Testing… the ghost is crossing!" : r.why);
    },
    repair() {
      active().world.resetPhysics();
      ctx.announce("Bridge repaired (the drawing is kept).");
    },
    clearAll() {
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
    totalScore() {
      return Object.values(save.cleared).reduce((t, s) => t + s, 0);
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
  const view = buildMapView(host, ctx);
  const hud = buildHud(host, ctx);
  if (active().world.sticks.length > 0) ctx.message = "Road restored — TEST it or keep building.";
  const lastStatut = {};
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
      if (w.testing) ctx.message = `Testing… the ghost is crossing! · stress ${Math.round((w.maxStrain || 0) * 100)}%`;
      if (w.statut !== (lastStatut[activeId] ?? -1)) {
        lastStatut[activeId] = w.statut;
        if (w.statut === 1) {
          const m = w.measures();
          if (m.score > (save.cleared[activeId] || 0)) {
            save.cleared[activeId] = m.score;
            persist();
          }
          const site = active().site;
          const at = config.sites.findIndex((s) => s.id === activeId);
          const level = `Level ${at + 1}/${config.sites.length} — ${site.label}`;
          ctx.journal(`${level}: Holding! Score ${m.score}.`, m);
          ctx.announce(`${level}: Holding! Score: ${m.score}.`);
        } else if (w.statut === 0) {
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

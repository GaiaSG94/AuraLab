// Particle pack — world: holds groups, attractors and particles; runs active laws.
// DOM-free: importable in browsers and Node. Laws plug in; the world schedules them.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// defs: { substances: [live defs], material: [live attractor defs],
//         laws: [{ mod, targets: [groupIdx]|null, params }], bounds }
export function createWorld(defs, seed = 1337) {
  const rng = mulberry32(seed);
  const groups = defs.substances.map((def) => ({ def }));
  const attractors = defs.material
    .filter((def) => def.kind === "attractor")
    .map((def) => ({ def, px: 0, py: 0 }));
  const particles = [];
  const stats = { consumed: 0, born: 0 };
  let W = 800;
  let H = 600;
  let time = 0;

  const world = {
    rng, particles, groups, attractors, stats, bounds: defs.bounds || "wrap",
    get W() { return W; },
    get H() { return H; },
    get time() { return time; },
    step, reset, spawn, syncCounts, counts, measures,
    nearest, steer, wanderStep, groupIndex, draw, setSize,
  };

  function groupIndex(id) {
    return groups.findIndex((g) => g.def.id === id);
  }

  function layoutAttractors() {
    for (const a of attractors) {
      a.px = a.def.x * W;
      a.py = a.def.y * H;
    }
  }

  function targetsOf(entry) {
    if (!entry.targetIds) return groups.map((_, i) => i);
    return entry.targetIds.map((id) => groupIndex(id)).filter((i) => i >= 0);
  }

  function spawn(g, edge = false) {
    const def = groups[g].def;
    const p = {
      e: g,
      x: edge ? (rng() < 0.5 ? rng() * W : W - rng() * 4) : rng() * W,
      y: rng() * H,
      vx: 0, vy: 0, ax: 0, ay: 0,
      r: def.radius * (0.7 + rng() * 0.6),
      seed: rng() * Math.PI * 2,
    };
    let claimed = false;
    for (const entry of defs.laws) {
      if (entry.mod.place && targetsOf(entry).includes(g)) {
        claimed = entry.mod.place(world, p, def) || claimed;
      }
    }
    if (!claimed) {
      const ang = rng() * Math.PI * 2;
      const sp = def.speed * (0.3 + rng() * 0.7);
      p.vx = Math.cos(ang) * sp;
      p.vy = Math.sin(ang) * sp;
    }
    particles.push(p);
    stats.born += 1;
    return p;
  }

  function reset() {
    particles.length = 0;
    stats.consumed = 0;
    stats.born = 0;
    time = 0;
    layoutAttractors();
    groups.forEach((g, i) => {
      for (let k = 0; k < g.def.count; k++) spawn(i);
    });
  }

  function syncCounts() {
    const countsArr = new Array(groups.length).fill(0);
    for (const p of particles) countsArr[p.e] += 1;
    groups.forEach((g, i) => {
      while (countsArr[i] < g.def.count) {
        spawn(i, true);
        countsArr[i] += 1;
      }
    });
    for (let k = particles.length - 1; k >= 0; k--) {
      const i = particles[k].e;
      if (countsArr[i] > groups[i].def.count) {
        particles.splice(k, 1);
        countsArr[i] -= 1;
      }
    }
  }

  function nearest(groupIdx, x, y, exclude) {
    let best = null;
    let bestD2 = Infinity;
    for (const q of particles) {
      if (q.e !== groupIdx || q === exclude) continue;
      const dx = q.x - x;
      const dy = q.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = q;
      }
    }
    return best === null ? null : { p: best, d: Math.sqrt(bestD2) };
  }

  function steer(p, dx, dy, rate, dt) {
    const k = Math.min(1, rate * dt);
    p.vx += (dx - p.vx) * k;
    p.vy += (dy - p.vy) * k;
  }

  function wanderStep(p, def, turn, dt) {
    p.seed += (rng() - 0.5) * turn * dt;
    steer(p, Math.cos(p.seed) * def.speed, Math.sin(p.seed) * def.speed, 2, dt);
  }

  function step(dt, active) {
    time += dt;
    const isActive = active || (() => true);
    for (const p of particles) {
      p.ax = 0;
      p.ay = 0;
    }
    for (const entry of defs.laws) {
      if (!isActive("laws", entry.id)) continue;
      const targets = targetsOf(entry);
      if (entry.mod.apply) entry.mod.apply(world, dt, entry.params, targets, isActive);
    }
    for (const p of particles) {
      if (!isActive("substances", groups[p.e].def.id)) continue; // frozen while off
      p.vx += p.ax * dt;
      p.vy += p.ay * dt;
      const sp2 = p.vx * p.vx + p.vy * p.vy;
      const maxV = 900;
      if (sp2 > maxV * maxV) {
        const k = maxV / Math.sqrt(sp2);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (world.bounds === "bounce") {
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        if (p.x > W) { p.x = W; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        if (p.y > H) { p.y = H; p.vy = -Math.abs(p.vy); }
      } else {
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20;
        if (p.y > H + 20) p.y = -20;
      }
    }
  }

  function counts() {
    const out = new Array(groups.length).fill(0);
    for (const p of particles) out[p.e] += 1;
    return out;
  }

  function measures() {
    const out = {};
    groups.forEach((g, i) => {
      out[`counts.${g.def.id}`] = counts()[i];
    });
    out.consumed = stats.consumed;
    return out;
  }

  function draw(ctx, Wpx, Hpx, isActive, hexToRgb) {
    for (const a of attractors) {
      if (!isActive("material", a.def.id)) continue;
      const g = ctx.createRadialGradient(a.px, a.py, 0, a.px, a.py, a.def.radius * 3);
      const [r, gg, b] = hexToRgb(a.def.color);
      g.addColorStop(0, `rgba(${r},${gg},${b},0.9)`);
      g.addColorStop(0.35, `rgba(${r},${gg},${b},0.28)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(a.px, a.py, a.def.radius * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = a.def.color;
      ctx.beginPath();
      ctx.arc(a.px, a.py, Math.max(2, a.def.radius * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }
    // Links first (under particles).
    groups.forEach((g, i) => {
      if (!g.def.links || !isActive("substances", g.def.id)) return;
      const pts = particles.filter((p) => p.e === i);
      const maxD = g.def.links.distance;
      ctx.lineWidth = 1;
      for (let a2 = 0; a2 < pts.length; a2++) {
        for (let b = a2 + 1; b < pts.length; b++) {
          const dx = pts[a2].x - pts[b].x;
          const dy = pts[a2].y - pts[b].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxD * maxD) {
            const [r, gg, bl] = hexToRgb(g.def.color);
            ctx.strokeStyle = `rgba(${r},${gg},${bl},${(0.28 * (1 - Math.sqrt(d2) / maxD)).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(pts[a2].x, pts[a2].y);
            ctx.lineTo(pts[b].x, pts[b].y);
            ctx.stroke();
          }
        }
      }
    });
    for (const p of particles) {
      if (!isActive("substances", groups[p.e].def.id)) continue;
      ctx.fillStyle = groups[p.e].def.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function setSize(w, h) {
    W = Math.max(50, w);
    H = Math.max(50, h);
    layoutAttractors();
  }

  reset();
  return world;
}

// Bridge world: nodes + sticks (Verlet), ghost test, budget, score. Pure logic, no rendering.
const COST = { poutre: 10, cable: 5 };
const MAXLEN = { poutre: 6.5, cable: 12 };

function makeNode(x, y, deck, fixed) {
  return { x, y, rx: x, ry: y, px: x, py: y, ax: 0, ay: 0, deck, fixed };
}

function buildLayout(half) {
  const nodes = [];
  const deckX = [];
  for (let x = -half; x <= half + 0.01; x += 4) deckX.push(Math.round(x * 10) / 10);
  deckX.forEach((x) => {
    nodes.push(makeNode(x, 0, true, Math.abs(Math.abs(x) - half) < 0.01));
  });
  for (let i = 0; i < deckX.length - 1; i++) {
    nodes.push(makeNode((deckX[i] + deckX[i + 1]) / 2, 4, false, false));
  }
  nodes.push(makeNode(-half / 2, 8, false, true));
  nodes.push(makeNode(half / 2, 8, false, true));
  return { nodes, deckCount: deckX.length };
}

export function createWorld({ laws, site }) {
  site = site || { width: 28, budget: 120 };
  const half = site.width / 2;
  const layout = buildLayout(half);
  const world = {
    site,
    half,
    nodes: layout.nodes,
    deckCount: layout.deckCount,
    sticks: [],
    laws: laws || [],
    ghost: { x: -half - 2, y: 1.8, tilt: 0, falling: false },
    testing: false,
    statut: -1,
    score: 0,
    maxStrain: 0,
    dirty: true,
    version: 0,
    params() {
      const p = {};
      for (const l of this.laws) p[l.mod.id] = l.params;
      return p;
    },
    budget() {
      const c = this.params().chantier;
      return this.site.budget || (c && c.budget) || 120;
    },
    spent() {
      return this.sticks.reduce((t, s) => t + (COST[s.type] || 0), 0);
    },
    canPlace(a, b, type) {
      if (a === b) return { ok: false, why: "Two different nodes!" };
      if (this.testing) return { ok: false, why: "Test running…" };
      if (this.sticks.some((s) => (s.a === a && s.b === b) || (s.a === b && s.b === a))) {
        return { ok: false, why: "Already linked." };
      }
      const A = this.nodes[a];
      const B = this.nodes[b];
      if (!A || !B) return { ok: false, why: "Nœud inconnu." };
      const len = Math.hypot(B.rx - A.rx, B.ry - A.ry);
      if (len > MAXLEN[type]) {
        return { ok: false, why: type === "poutre" ? "Too long for a beam." : "Too long even for a cable." };
      }
      if (this.spent() + COST[type] > this.budget()) return { ok: false, why: "Budget spent!" };
      return { ok: true };
    },
    place(a, b, type) {
      const chk = this.canPlace(a, b, type);
      if (!chk.ok) return chk;
      const A = this.nodes[a];
      const B = this.nodes[b];
      this.sticks.push({
        a, b,
        rest: Math.hypot(B.rx - A.rx, B.ry - A.ry),
        type,
        broken: false,
        strain: 0,
      });
      this.dirty = true;
      this.version++;
      return { ok: true };
    },
    removeStick(i) {
      if (this.testing) return;
      if (i >= 0 && i < this.sticks.length) {
        this.sticks.splice(i, 1);
        this.dirty = true;
        this.version++;
      }
    },
    clearDesign() {
      if (this.testing) return;
      this.sticks = [];
      this.reset();
    },
    hasRoad() {
      // Deck nodes are indices 0..7; anchors are 0 (-14) and 7 (+14).
      const adj = new Map();
      for (let i = 0; i < this.deckCount; i++) adj.set(i, []);
      for (const s of this.sticks) {
        if (s.broken) continue;
        if (adj.has(s.a) && adj.has(s.b)) {
          adj.get(s.a).push(s.b);
          adj.get(s.b).push(s.a);
        }
      }
      const seen = new Set([0]);
      const q = [0];
      while (q.length > 0) {
        const i = q.pop();
        if (i === this.deckCount - 1) return true;
        for (const j of adj.get(i)) {
          if (!seen.has(j)) { seen.add(j); q.push(j); }
        }
      }
      return false;
    },
    startTest() {
      if (this.testing) return { ok: false, why: "Test running…" };
      if (!this.hasRoad()) return { ok: false, why: "No road: link both banks along the BOTTOM!" };
      this.resetPhysics();
      this.testing = true;
      this.statut = -1;
      return { ok: true };
    },
    finishTest() {
      this.testing = false;
      const broken = this.sticks.some((s) => s.broken);
      const charge = this.params()["charge-flottante"] || {};
      const poids = charge.poids || 20;
      if (broken || this.ghost.falling) {
        this.statut = 0;
        this.score = -this.spent();
      } else {
        this.statut = 1;
        this.score = Math.max(0, Math.round(poids * 10 - this.spent()));
      }
    },
    deckYAt(x) {
      const deck = [];
      for (let i = 0; i < this.deckCount; i++) deck.push(this.nodes[i]);
      if (x <= deck[0].rx) return deck[0].y;
      for (let i = 0; i < deck.length - 1; i++) {
        const A = deck[i];
        const B = deck[i + 1];
        if (x >= A.rx && x <= B.rx) {
          const t = (x - A.rx) / (B.rx - A.rx || 1);
          return A.y + (B.y - A.y) * t;
        }
      }
      return deck[deck.length - 1].y;
    },
    resetPhysics() {
      for (const n of this.nodes) {
        n.x = n.rx; n.y = n.ry; n.px = n.rx; n.py = n.ry; n.ax = 0; n.ay = 0;
      }
      for (const s of this.sticks) { s.broken = false; s.strain = 0; }
      this.ghost.x = -this.half - 2; this.ghost.y = 1.8; this.ghost.tilt = 0; this.ghost.falling = false;
      this.testing = false;
      this.statut = -1;
      this.maxStrain = 0;
      this.dirty = true;
      this.version++;
    },
    reset() {
      this.resetPhysics();
      this.score = 0;
    },
    rebind() { /* no config refs held */ },
    step(dt, isActive) {
      // Build phase is frozen: physics only runs while the ghost crosses.
      if (!this.testing) return;
      dt = Math.min(dt, 1 / 30);
      for (const n of this.nodes) { n.ax = 0; n.ay = 0; }
      for (const l of this.laws) {
        if (isActive("laws", l.id)) l.mod.apply(this, dt, l.params, l.targetIds, isActive);
      }
      const rup = this.laws.find((l) => l.mod.id === "rupture");
      if (!rup || !isActive("laws", rup.id)) {
        for (const s of this.sticks) s.strain = 0;
        this.maxStrain = 0;
      }
      const linked = new Set();
      for (const s of this.sticks) {
        if (!s.broken) { linked.add(s.a); linked.add(s.b); }
      }
      for (const s of this.sticks) s.load = 0;
      const SUB = 3;
      const ITER = 20;
      this.loadNorm = SUB * ITER;
      const sub = SUB;
      const h = dt / sub;
      for (let k = 0; k < sub; k++) {
        for (const n of this.nodes) {
          if (n.fixed || !linked.has(this.nodes.indexOf(n))) continue;
          const nx = n.x + (n.x - n.px) * 0.999 + n.ax * h * h;
          const ny = n.y + (n.y - n.py) * 0.999 + n.ay * h * h;
          n.px = n.x; n.py = n.y; n.x = nx; n.y = ny;
        }
        for (let it = 0; it < ITER; it++) {
          for (const s of this.sticks) {
            if (s.broken) continue;
            const A = this.nodes[s.a];
            const B = this.nodes[s.b];
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const len = Math.hypot(dx, dy) || 0.0001;
            if (s.type === "cable" && len < s.rest) continue;
            const diff = (len - s.rest) / len;
            const wa = A.fixed ? 0 : 1;
            const wb = B.fixed ? 0 : 1;
            const w = wa + wb;
            if (!w) continue;
            const stiff = s.type === "poutre" ? 1 : 0.5;
            s.load = (s.load || 0) + Math.abs(diff);
            const f = (diff * stiff) / w;
            A.x += dx * f * wa; A.y += dy * f * wa;
            B.x -= dx * f * wb; B.y -= dy * f * wb;
          }
        }
      }
      for (const n of this.nodes) {
        if (!n.fixed && n.y < -10) { n.y = -10; n.px = n.x; n.py = n.y; }
      }
      // The ghost hovers over the deck, or plunges if the bridge gives way.
      if (this.testing) {
        if (this.sticks.some((s) => s.broken)) this.ghost.falling = true;
        if (this.ghost.falling) {
          this.ghost.y = Math.max(-9.4, this.ghost.y - 14 * dt);
          this.ghost.tilt = Math.min(0.9, this.ghost.tilt + 1.5 * dt);
          if (this.ghost.y <= -9.3) this.finishTest();
        } else {
          this.ghost.y = this.deckYAt(this.ghost.x) + 1.8;
        }
      }
    },
    measures() {
      let sag = 0;
      for (let i = 0; i < this.deckCount; i++) {
        const n = this.nodes[i];
        if (!n.fixed) sag = Math.max(sag, n.ry - n.y);
      }
      return {
        fleche: Math.max(0, Math.round(sag * 1000)),
        contrainte: Math.round(this.maxStrain * 100),
        cout: this.spent(),
        score: this.score,
      };
    },
  };
  return world;
}

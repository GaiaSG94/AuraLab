// Chemistry world: stoichiometric aqueous chemistry in a 500 mL Erlenmeyer.
// Pure simulation state (no DOM, no Three.js): runs identically in browser and Node.
export function createWorld({ substances, material, laws }) {
  const byId = (arr) => {
    const o = {};
    (arr || []).forEach((x) => { o[x.id] = x; });
    return o;
  };
  return {
    groups: byId(substances),
    material: byId(material),
    laws: laws || [],
    t: 0,
    temp: 20,
    ph: 7,
    volume: 0,
    volL: 0.025,
    buretteMl: 0,
    precipite: 0,
    precipiteColor: null,
    pression: 101.3,
    fizz: 0,
    gasFizz: 0,
    heating: false,
    boiling: false,
    eqPoint: false,
    cuComplex: false,
    liquidHex: "#cfe9f2",
    mmol: null,
    _neutMmol: 0,
    _co2Mmol: 0,
    W: 800,
    H: 600,
    doses() {
      const g = this.groups;
      return {
        hcl: (g.hcl && g.hcl.count) || 0,
        ch3cooh: (g.ch3cooh && g.ch3cooh.count) || 0,
        naoh: (g.naoh && g.naoh.count) || 0,
        nh3: (g.nh3 && g.nh3.count) || 0,
        cuso4: (g.cuso4 && g.cuso4.count) || 0,
        nahco3: (g.nahco3 && g.nahco3.count) || 0,
        agno3: (g.agno3 && g.agno3.count) || 0,
        bbt: (g.bbt && g.bbt.count) || 0,
      };
    },
    rebind(subs, mat) {
      this.groups = byId(subs);
      this.material = byId(mat);
    },
    reset() {
      this.t = 0;
      this.temp = 20;
      this.ph = 7;
      this.volume = 0;
      this.volL = 0.025;
      this.buretteMl = 0;
      this.precipite = 0;
      this.precipiteColor = null;
      this.pression = 101.3;
      this.fizz = 0;
      this.gasFizz = 0;
      this.heating = false;
      this.boiling = false;
      this.eqPoint = false;
      this.cuComplex = false;
      this.liquidHex = "#cfe9f2";
      this.mmol = null;
      this._neutMmol = 0;
      this._co2Mmol = 0;
    },
    setSize(w, h) { this.W = w; this.H = h; },
    step(dt, isActive) {
      this.t += dt;
      this.fizz = 0;
      this.heating = false;
      this.boiling = false;
      if (this.material.burette) {
        this.buretteMl = Math.max(0, Math.min(50, this.material.burette.strength || 0));
      }
      for (const l of this.laws) {
        if (isActive("laws", l.id)) l.mod.apply(this, dt, l.params, l.targetIds, isActive);
      }
    },
    measures() {
      const out = {
        temp: Math.round(this.temp * 10) / 10,
        ph: this.ph,
        volume: Math.round(this.volume),
        precipite: this.precipite,
        pression: this.pression,
      };
      for (const id of Object.keys(this.groups)) out[`counts.${id}`] = this.groups[id].count || 0;
      return out;
    },
    draw() { /* 3D rendering handled by benchview.js */ },
  };
}

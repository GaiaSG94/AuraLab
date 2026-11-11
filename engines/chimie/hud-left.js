// Chemistry HUD left column: the bench list.
// Substances (with dose controls), instruments (live measures) and laws
// (switches + notices) all live here, so the 3D bench keeps the right half
// of the screen to itself.
import { chEsc } from "./hud-shared.js";

export function buildLeftColumn({ add, config, ctx }) {
  const col = add('<aside class="ch-left ch-gx"></aside>');

  const substances = buildSubstances(col, config, ctx);
  const instruments = buildInstruments(col, config, ctx);
  const laws = buildLaws(col, config, ctx);

  function refresh() {
    substances.refresh();
    instruments.refresh();
    laws.refresh();
  }

  return { element: col, refresh };
}

// --- substances: one row per reagent, with its dose controls ---------------

function buildSubstances(col, config, ctx) {
  const card = section(col, "Substances", "click a flask or use −/+");
  const rows = config.substances.map((s) => {
    const row = document.createElement("div");
    row.className = "ch-sub";
    row.style.setProperty("--c", s.color);
    row.innerHTML =
      '<span class="dot" aria-hidden="true"></span>' +
      '<span class="nm"></span>' +
      '<span class="ct">×0</span>' +
      '<button type="button" class="sq minus" aria-label="Take one dose back">&#8722;</button>' +
      '<button type="button" class="sq plus" aria-label="Pour one dose">+</button>';
    row.querySelector(".nm").textContent = s.label;
    row.querySelector(".nm").title = s.label;
    const minus = row.querySelector(".minus");
    const plus = row.querySelector(".plus");
    plus.addEventListener("click", () => ctx.addDose(s.id));
    minus.addEventListener("click", () => ctx.removeDose(s.id));
    card.appendChild(row);
    return { s, row, ct: row.querySelector(".ct"), plus, minus, last: "" };
  });

  return {
    refresh() {
      for (const r of rows) {
        const n = r.s.count || 0;
        const max = ctx.doseMax(r.s.id);
        const key = `${n}/${max}`;
        if (key === r.last) continue;
        r.last = key;
        r.ct.textContent = `×${n}`;
        r.plus.disabled = n >= max;
        r.minus.disabled = n <= 0;
      }
    },
  };
}

// --- instruments: one live readout per declared metric ---------------------

function buildInstruments(col, config, ctx) {
  const card = section(col, "Instruments", "live");
  const rows = config.metrics.map((m) => {
    const row = document.createElement("div");
    row.className = "ch-ins";
    row.innerHTML =
      `<span class="cap">${chEsc(m.label)}</span>` +
      `<span class="val"><b>0</b>${m.unit ? `<small>${chEsc(m.unit)}</small>` : ""}</span>` +
      '<span class="tag" hidden></span>';
    card.appendChild(row);
    return {
      m,
      b: row.querySelector("b"),
      tag: row.querySelector(".tag"),
      last: "",
    };
  });

  const fmt = (v, src) =>
    src === "volume" ? String(Math.round(v)) :
    src === "precipite" ? v.toFixed(3) :
    (Math.round(v * 10) / 10).toFixed(1);

  return {
    refresh() {
      const vals = ctx.metricValues();
      for (const r of rows) {
        const v = vals[r.m.id] || 0;
        const txt = fmt(v, r.m.source);
        if (txt === r.last) continue;
        r.last = txt;
        r.b.textContent = txt;
        if (r.m.source === "ph") {
          r.tag.hidden = false;
          r.tag.textContent = v < 6 ? "acid" : v > 8 ? "basic" : "neutral";
          r.tag.className = `tag ${v < 6 ? "acid" : v > 8 ? "base" : "neutral"}`;
        } else if (r.m.source === "precipite") {
          const hex = ctx.world.precipiteColor;
          r.tag.hidden = !(hex && v > 0);
          r.tag.textContent = hex === "#0ea5e9" ? "Cu(OH)2" : "AgCl";
          r.tag.className = "tag solid";
        } else if (r.m.source === "pression") {
          r.tag.hidden = v <= 105;
          r.tag.textContent = "CO2";
          r.tag.className = "tag gas";
        } else if (r.m.source === "temp") {
          r.tag.hidden = !ctx.world.boiling;
          r.tag.textContent = "boiling";
          r.tag.className = "tag hot";
        }
      }
    },
  };
}

// --- laws: one switch per law, with its notice -----------------------------

function buildLaws(col, config, ctx) {
  const card = section(col, "Laws", `${config.laws.length} active`);
  const boxes = config.laws.map((l, i) => {
    const mod = ctx.catalog.laws[l.law];
    const label = mod ? mod.notice.label : l.law;
    const key = `${l.law}#${i}`;
    const row = document.createElement("div");
    row.className = "ch-law";
    row.innerHTML =
      `<label class="ch-sw"><input type="checkbox" aria-label="Enable ${chEsc(label)}"><span></span></label>` +
      `<span class="nm">${chEsc(label)}</span>`;
    const box = row.querySelector("input");
    box.checked = ctx.isActive("laws", key);
    box.addEventListener("change", () => {
      ctx.setActive("laws", key, box.checked);
      ctx.touch();
    });
    card.appendChild(row);
    if (mod && mod.notice) {
      const ib = document.createElement("button");
      ib.type = "button";
      ib.className = "ch-ib";
      ib.textContent = "i";
      ib.setAttribute("aria-label", `About ${label}`);
      ib.setAttribute("aria-expanded", "false");
      row.appendChild(ib);
      const nb = document.createElement("div");
      nb.className = "ch-notice";
      nb.innerHTML =
        `<b>${chEsc(label)}</b><br>Rule: ${chEsc(mod.notice.formule)}<br>` +
        `Sources: ${chEsc(mod.notice.sources)}<br>Limits: ${chEsc(mod.notice.limites)}`;
      ib.addEventListener("click", () => ib.setAttribute("aria-expanded", String(nb.classList.toggle("open"))));
      card.appendChild(nb);
    }
    return box;
  });

  return {
    refresh() {
      boxes.forEach((box, i) => {
        const key = `${config.laws[i].law}#${i}`;
        if (box.checked !== ctx.isActive("laws", key)) box.checked = ctx.isActive("laws", key);
      });
    },
  };
}

function section(parent, title, hint) {
  const card = document.createElement("section");
  card.className = "ch-lsec";
  card.innerHTML =
    `<h3>${chEsc(title)}${hint ? `<small>${chEsc(hint)}</small>` : ""}</h3>`;
  parent.appendChild(card);
  return card;
}


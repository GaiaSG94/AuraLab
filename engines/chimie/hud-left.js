import { chEsc, CH_INSTRUMENTS } from "./hud-shared.js";

const INSTRUMENTS = CH_INSTRUMENTS;

export function buildLeftColumn({ add, config, ctx }) {
  const col = add('<aside class="ch-left ch-gx"></aside>');
  const instruments = buildInstruments(col, config, ctx);

  return {
    element: col,
    refresh() {
      instruments.refresh();
    },
  };
}

function buildInstruments(col, config, ctx) {
  const card = section(col, "Instruments", "select your lab equipment");
  const metrics = new Map(config.metrics.map((m) => [m.source, m]));
  const rows = INSTRUMENTS.map((instrument) => {
    const metric = metrics.get(instrument.metric);
    const row = document.createElement("div");
    row.className = "ch-instrument";
    row.innerHTML = '<label class="ch-check"><input type="checkbox"><span></span></label><span class="nm"></span><span class="readout"></span>';
    row.querySelector(".nm").textContent = instrument.label;
    const box = row.querySelector("input");
    box.checked = ctx.instrumentActive ? ctx.instrumentActive(instrument) : true;
    box.setAttribute("aria-label", `Use ${instrument.label}`);
    box.addEventListener("change", () => ctx.setInstrument(instrument, box.checked));
    if (instrument.control) {
      const control = document.createElement("input");
      control.type = "range";
      control.min = instrument.id === "burette" ? "0" : "0";
      control.max = String(instrument.controlMax || 100);
      control.step = String(instrument.controlStep || 5);
      control.className = "ch-instrument-control";
      control.value = String(ctx.getControl(instrument.control) || 0);
      control.addEventListener("input", () => ctx.setControl(instrument.control, Number(control.value)));
      row.appendChild(control);
      if (instrument.id === "burette") {
        const quick = document.createElement("div");
        quick.className = "ch-instrument-quick";
        quick.innerHTML =
          '<button type="button" class="ink" data-ml="1">+1</button>' +
          '<button type="button" data-ml="5">+5</button>' +
          '<button type="button" data-ml="drain">Drain</button>';
        quick.querySelectorAll("button").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (btn.dataset.ml === "drain") ctx.drainBurette();
            else ctx.dispense(Number(btn.dataset.ml));
          });
        });
        row.appendChild(quick);
      }
    }
    if (metric) row.dataset.metric = metric.id;
    card.appendChild(row);
    return { instrument, row, box, control: row.querySelector(".ch-instrument-control"), quick: row.querySelector(".ch-instrument-quick"), readout: row.querySelector(".readout") };
  });
  return {
    refresh() {
      const values = ctx.metricValues();
      rows.forEach((r) => {
        const on = ctx.instrumentActive ? ctx.instrumentActive(r.instrument) : true;
        r.box.checked = on;
        r.row.classList.toggle("off", !on);
        if (r.control) {
          r.control.value = String(ctx.getControl(r.instrument.control) || 0);
          r.control.disabled = !on;
        }
        if (r.quick) r.quick.querySelectorAll("button").forEach((b) => { b.disabled = !on; });
        const metric = metrics.get(r.instrument.metric);
        if (!metric) return;
        const value = values[metric.id] || 0;
        r.readout.textContent = on ? `${Math.round(value * 10) / 10}${metric.unit ? ` ${metric.unit}` : ""}` : "off";
      });
    },
  };
}

function section(parent, title, hint) {
  const card = document.createElement("section");
  card.className = "ch-lsec";
  card.innerHTML = `<h3>${chEsc(title)}${hint ? `<small>${chEsc(hint)}</small>` : ""}</h3>`;
  parent.appendChild(card);
  return card;
}

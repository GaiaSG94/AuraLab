// LabKit core — instruments as measuring devices: a counter (live readouts)
// and a curve (history chart). Fed by metric values; the lab decides what they mean.
import { el, escapeHtml } from "./controls.js";

const GAUGE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17a9 9 0 0 1 18 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
  '<path d="M12 17l5-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17" r="2" fill="currentColor"/></svg>';

function device(name, hint) {
  const box = el("div", "dev");
  box.appendChild(el("div", "dh", `${GAUGE}<b>${escapeHtml(name)}</b><span>${escapeHtml(hint)}</span>`));
  return box;
}

// Counter ("chips" type): one readout per metric. Returns { update(values), sample() }.
export function buildChips(parent, entry, metricsById, L) {
  const box = device(L.counter, L.liveValues);
  const screen = el("div", entry.metrics.length > 3 ? "lcd cols2" : "lcd");
  const cells = entry.metrics.map((id) => {
    const m = metricsById[id];
    const unit = m.unit ? `<span class="unit">${escapeHtml(m.unit)}</span>` : "";
    const r = el("div", "rd", `<span><i style="background:${m.color}"></i>${escapeHtml(m.label)}</span><b>0</b>`);
    if (unit) r.querySelector("b").insertAdjacentHTML("afterend", unit);
    screen.appendChild(r);
    return r.querySelector("b");
  });
  box.appendChild(screen);
  parent.appendChild(box);
  return {
    element: box,
    update(values) {
      entry.metrics.forEach((id, i) => {
        const v = values[id];
        cells[i].textContent = v === undefined ? "–" : String(Math.round(v * 100) / 100);
      });
    },
    sample() {},
  };
}

// Curve: one line per metric over a sliding window; sized to its box.
export function buildCurve(parent, entry, metricsById, L) {
  const box = device(L.curve, entry.title || L.history);
  box.classList.add("grow");
  const screen = el("div", "lcd plot");
  screen.appendChild(el("div", "lg", entry.metrics.map((id) => {
    const m = metricsById[id];
    return `<span><i style="background:${m.color}"></i>${escapeHtml(m.label)}</span>`;
  }).join("")));
  const plot = el("div", "plotbox");
  const hc = el("canvas");
  plot.appendChild(hc);
  screen.appendChild(plot);
  box.appendChild(screen);
  parent.appendChild(box);
  const ctx = hc.getContext("2d");
  const samples = entry.samples || 120;
  const series = entry.metrics.map(() => []);

  function draw() {
    const w = plot.clientWidth;
    const h = plot.clientHeight;
    if (!w || !h) return; // hidden pane: redrawn on next sample once visible
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (hc.width !== Math.round(w * dpr) || hc.height !== Math.round(h * dpr)) {
      hc.width = Math.round(w * dpr);
      hc.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let peak = 4;
    for (const s of series) for (const v of s) if (v > peak) peak = v;
    series.forEach((s, i) => {
      if (s.length < 2) return;
      ctx.strokeStyle = metricsById[entry.metrics[i]].color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.forEach((v, k) => {
        const x = (k / (samples - 1)) * w;
        const y = h - 4 - (v / peak) * (h - 10);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  return {
    element: box,
    update() {},
    sample(values) {
      entry.metrics.forEach((id, i) => {
        series[i].push(values[id] === undefined ? 0 : values[id]);
        if (series[i].length > samples) series[i].shift();
      });
      draw();
    },
    reset() {
      series.forEach((s) => { s.length = 0; });
      draw();
    },
    redraw: draw,
  };
}

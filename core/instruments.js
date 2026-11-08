// AuraLab core — instruments: chips (live values) and curve (history chart).
// Fed by metric values each frame; the lab decides what metrics mean.
import { el, escapeHtml } from "./controls.js";

// Returns { update(values), sample() } where values = {metricId: number}.
export function buildChips(hud, entry, metricsById) {
  const cells = entry.metrics.map((id) => {
    const m = metricsById[id];
    const c = el(
      "span",
      "chip",
      `<span class="swatch" style="background:${m.color}"></span>${escapeHtml(m.label)}: <b>0</b>${m.unit ? ` <span class="unit">${escapeHtml(m.unit)}</span>` : ""}`
    );
    hud.appendChild(c);
    return c.querySelector("b");
  });
  const box = el("span", "chip", "");
  box.style.display = "none";
  return {
    element: null,
    update(values) {
      entry.metrics.forEach((id, i) => {
        const v = values[id];
        cells[i].textContent = v === undefined ? "–" : String(Math.round(v * 100) / 100);
      });
    },
    sample() {},
    setVisible() {},
  };
}

// Small multiples-free single chart; one line per metric.
export function buildCurve(stage, entry, metricsById) {
  const box = el("div", "history", `<h2>${escapeHtml(entry.title || "History")}</h2>`);
  const hc = el("canvas");
  hc.width = 440;
  hc.height = 128;
  box.appendChild(hc);
  stage.appendChild(box);
  const ctx = hc.getContext("2d");
  const samples = entry.samples || 120;
  const series = entry.metrics.map(() => []);
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
      series.forEach((s) => {
        s.length = 0;
      });
      draw();
    },
    setVisible(v) {
      box.style.display = v ? "" : "none";
    },
  };
  function draw() {
    const hw = 440;
    const hh = 128;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, hw, hh);
    ctx.fillStyle = "#0b0e11";
    ctx.fillRect(0, 0, hw, hh);
    let peak = 4;
    for (const s of series) for (const v of s) if (v > peak) peak = v;
    series.forEach((s, i) => {
      if (s.length < 2) return;
      ctx.strokeStyle = metricsById[entry.metrics[i]].color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.forEach((v, k) => {
        const x = (k / (samples - 1)) * hw;
        const y = hh - 6 - (v / peak) * (hh - 14);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }
}

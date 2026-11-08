// AuraLab core — controls: build config-declared sliders bound to live state paths.
import { getPath, setPath } from "./validate.js";

export function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export function hexToRgb(hex) {
  const h = String(hex).replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

// parent: sidebar element; onChange called after every input (for resync/redraw).
export function buildControls(parent, config, state, onChange) {
  if (config.controls.length === 0) return;
  const sec = el("section", "", "<h2>Controls</h2>");
  for (const c of config.controls) {
    const wrap = el("div", "control");
    const label = el("label", "", `${escapeHtml(c.label)} <output></output>`);
    const out = label.querySelector("output");
    const input = el("input");
    input.type = "range";
    input.min = String(c.min);
    input.max = String(c.max);
    input.step = String(c.step);
    const show = (v) => {
      out.textContent = String(Math.round(v * 100) / 100);
    };
    const current = () => getPath(state, c.path);
    input.value = String(current());
    show(current());
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      if (setPath(state, c.path, v)) {
        show(v);
        onChange(c.path);
      }
    });
    // Refresh shown value when state changes elsewhere (snapshot restore).
    wrap.refresh = () => {
      input.value = String(current());
      show(current());
    };
    wrap.appendChild(label);
    wrap.appendChild(input);
    sec.appendChild(wrap);
  }
  sec.refreshAll = () => {
    sec.querySelectorAll(":scope > .control").forEach((w) => {
      if (w.refresh) w.refresh();
    });
  };
  parent.appendChild(sec);
}

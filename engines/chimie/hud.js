// Chemistry HUD (design C4 "blown glass"): frosted-glass panels floating on the page colour
// over the 3D bench. Top: brand, steps as tabs, home. Right: measures (Lab) or the Laws,
// Knobs and Notebook sheets. Under each bottle: its dose pill. Bottom: time + status + Measure.
import "../../core/ghost.js"; // side effect: window.AuraGhost (flask ghost logo)

const CH_ICONS = {
  back: '<path d="M15 6l-6 6 6 6"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13" stroke-width="2.8"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  empty: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
  step: '<path d="M6 5v14M10 12h9M15 8l4 4-4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  next: '<path d="M9 6l6 6-6 6"/>',
};
const chIcon = (k) => `<svg class="ch-i" viewBox="0 0 24 24" aria-hidden="true">${CH_ICONS[k]}</svg>`;
const chEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const CH_CSS = `
.ch-root{position:absolute;inset:0;pointer-events:none;color:#0b2a17;font-family:"Archivo","Segoe UI",system-ui,sans-serif;font-size:13px;line-height:1.35;z-index:5;-webkit-font-smoothing:antialiased}
.ch-root *{box-sizing:border-box}
.ch-root p{margin:0}
.ch-root :where(button){font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0;margin:0}
.ch-root :where(button,a,input,textarea,label):focus-visible{outline:3px solid #0b2a17;outline-offset:2px}
.ch-gx{pointer-events:auto;background:rgba(255,255,255,.38);-webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);border:1px solid rgba(255,255,255,.62);box-shadow:0 20px 40px -24px rgba(5,45,20,.6),inset 0 1px 0 rgba(255,255,255,.75);border-radius:22px}
.ch-pill{border-radius:999px}
.ch-i{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;display:block;flex:none}
.ch-brand{position:absolute;left:24px;top:16px;height:46px;display:flex;align-items:center;gap:10px;pointer-events:auto}
.ch-logo{width:40px;display:block;flex:none}
.ch-brand b{font-weight:900;font-stretch:70%;font-size:31px;line-height:1;letter-spacing:-.01em;white-space:nowrap}
.ch-tabs{position:absolute;left:50%;top:16px;height:46px;transform:translateX(-50%);padding:5px;display:flex;gap:2px}
.ch-tabs button{height:36px;padding:0 18px;border-radius:999px;font-weight:600;font-size:13.5px;white-space:nowrap;position:relative}
.ch-tabs button:hover{background:rgba(255,255,255,.45)}
.ch-tabs button[aria-selected="true"]{background:#0b2a17;color:#fff}
.ch-tabs .badge{position:absolute;top:-3px;right:-2px;min-width:17px;height:17px;border-radius:9px;background:#ff5a3d;color:#fff;font:700 10px/17px "JetBrains Mono",ui-monospace,monospace;text-align:center;padding:0 4px}
.ch-home{position:absolute;right:24px;top:16px;height:46px;padding:0 18px 0 12px;display:flex;align-items:center;gap:6px;font-weight:700;color:#0b2a17;text-decoration:none;white-space:nowrap}
.ch-home .ch-i{width:16px;height:16px}
.ch-side{position:absolute;right:24px;top:84px;bottom:96px;width:236px;display:flex;flex-direction:column;gap:12px}
.ch-side>[hidden]{display:none!important}
.ch-widgets{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px}
.ch-card{padding:14px 16px;display:flex;flex-direction:column;gap:7px;min-height:0}
.ch-cap{font:700 10.5px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(11,42,23,.6)}
.ch-wh{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ch-chip{font-weight:700;font-size:11px;background:#ff5a3d;color:#fff;border-radius:999px;padding:3px 9px;white-space:nowrap}
.ch-chip.cool{background:#3b82f6}
.ch-chip.boil{background:#b91c1c}
.ch-mut{font-weight:600;font-size:12px;color:rgba(11,42,23,.6);white-space:nowrap}
.ch-num{font-family:"Archivo","Arial Narrow",sans-serif;font-stretch:66%;font-weight:900;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:.9;white-space:nowrap}
.ch-num sup{font-size:.34em;font-stretch:100%;font-weight:700;vertical-align:top;margin-left:3px;position:relative;top:.3em;letter-spacing:0}
.ch-big{font-size:68px}
.ch-mid{font-size:44px}
.ch-temp{flex:1}
.ch-spark{width:100%;flex:1;min-height:30px;display:block;overflow:visible}
.ch-phb{height:10px;border-radius:5px;background:linear-gradient(90deg,#e53935,#fb8c00,#fdd835,#43a047,#1e88e5,#5e35b1);position:relative;margin-top:4px}
.ch-phb u{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#fff;border:3px solid #0b2a17;transition:left .4s}
.ch-phl{display:flex;justify-content:space-between;font-size:10.5px;color:rgba(11,42,23,.55)}
.ch-vb{height:10px;border-radius:5px;background:rgba(11,42,23,.12);overflow:hidden;margin-top:4px}
.ch-vb i{display:block;height:100%;width:0;background:#0b2a17;border-radius:5px;transition:width .4s}
.ch-sheet{flex:1;overflow:auto;gap:10px;overscroll-behavior:contain}
.ch-sheet>*{flex-shrink:0}
.ch-sheet h3{margin:0;font-weight:900;font-stretch:70%;font-size:22px;line-height:1}
.ch-row{display:flex;align-items:center;gap:9px;min-height:30px}
.ch-row .nm{flex:1;min-width:0;font-weight:600;font-size:13px}
.ch-row .nm small{display:block;font-weight:500;font-size:11px;color:rgba(11,42,23,.55)}
.ch-sw{position:relative;width:36px;height:22px;flex:none}
.ch-sw input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;cursor:pointer}
.ch-sw span{position:absolute;inset:0;border-radius:999px;background:rgba(11,42,23,.2);transition:background .15s;pointer-events:none}
.ch-sw span::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
.ch-sw input:checked+span{background:#0b2a17}
.ch-sw input:checked+span::after{left:17px}
.ch-sw input:focus-visible+span{outline:3px solid #0b2a17;outline-offset:2px}
.ch-ib{width:22px;height:22px;border-radius:50%;border:1.5px solid #0b2a17;font:800 11px/19px "Archivo",sans-serif;text-align:center;flex:none}
.ch-notice{display:none;font-size:12px;line-height:1.45;color:rgba(11,42,23,.8);background:rgba(255,255,255,.55);border-radius:12px;padding:8px 10px}
.ch-notice.open{display:block}
.ch-notice b{color:#0b2a17}
.ch-ctl label{display:flex;justify-content:space-between;align-items:baseline;font-weight:600;font-size:13px;margin-bottom:8px}
.ch-ctl output{font:700 12px "JetBrains Mono",ui-monospace,monospace}
.ch-ctl input{width:100%;margin:0;accent-color:#0b2a17}
.ch-prompts,.ch-list{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:12.5px}
.ch-prompts li{background:rgba(255,255,255,.55);border-radius:12px;padding:8px 10px;font-weight:600}
.ch-root textarea{width:100%;min-height:74px;resize:vertical;border:1px solid rgba(11,42,23,.15);border-radius:12px;background:rgba(255,255,255,.72);padding:9px 10px;font:inherit;color:inherit}
.ch-acts{display:flex;gap:6px}
.ch-btn{height:34px;padding:0 14px;border-radius:999px;font-weight:700;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;border:1.5px solid #0b2a17!important;white-space:nowrap}
.ch-btn.ink{background:#0b2a17;color:#fff}
.ch-btn i{width:8px;height:8px;border-radius:50%;background:#ff5a3d}
.ch-list li{display:flex;align-items:flex-start;gap:8px;background:rgba(255,255,255,.55);border-radius:12px;padding:7px 8px 7px 10px}
.ch-list .t{font:600 11px "JetBrains Mono",ui-monospace,monospace;color:rgba(11,42,23,.55);padding-top:1px}
.ch-list .txt{flex:1;min-width:0;overflow-wrap:break-word}
.ch-list button{font-weight:700;font-size:11.5px;padding:2px 6px;border-radius:8px}
.ch-list button:hover{background:rgba(11,42,23,.08)}
.ch-sheet.ch-book{overflow:hidden}
.ch-book>.ch-feed{flex:1 1 0;min-height:0;overflow:hidden;align-content:start}
.ch-feed li.snap{background:rgba(255,255,255,.8)}
.ch-feed li .txt{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer}
.ch-feed li.open .txt{display:block}
.ch-feed li.empty{color:rgba(11,42,23,.6);font-weight:600}
.ch-book textarea{flex:0 1 64px;min-height:40px!important;resize:none!important}
.ch-q{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.55);border-radius:12px;padding:7px 6px 7px 10px;font-weight:600;font-size:12.5px;line-height:1.35}
.ch-q span{flex:1;min-width:0}
.ch-q button{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;flex:none}
.ch-q button:hover{background:rgba(11,42,23,.08)}
.ch-q .ch-i{width:14px;height:14px}
.ch-pager{display:flex;align-items:center;justify-content:space-between;gap:6px;font:600 11px "JetBrains Mono",ui-monospace,monospace;color:rgba(11,42,23,.6)}
.ch-pager[hidden]{display:none}
.ch-pager button{font:700 12px "Archivo",sans-serif;color:#0b2a17;padding:4px 10px;border-radius:999px;border:1.5px solid rgba(11,42,23,.25)!important}
.ch-pager button:disabled{opacity:.35;cursor:default}
.ch-bl{position:absolute;left:-400px;top:-400px;transform:translate(-50%,0);display:flex;align-items:center;gap:7px;padding:5px 5px 5px 11px;white-space:nowrap;font-weight:700;font-size:12.5px}
.ch-bl small{font:600 11px "JetBrains Mono",ui-monospace,monospace;color:rgba(11,42,23,.6)}
.ch-bl button{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#0b2a17;color:#fff}
.ch-bl button .ch-i{width:13px;height:13px;stroke-width:2.6}
.ch-bl button:disabled{opacity:.3;cursor:default}
.ch-bl::before{content:"";display:none;width:10px;height:10px;border-radius:50%;background:var(--c);flex:none;box-shadow:inset 0 -2px 3px rgba(0,0,0,.2)}
.ch-root.compact .ch-bl{padding-left:9px}
.ch-root.compact .ch-bl::before{display:block}
.ch-root.compact .ch-bl>span{display:none}
.ch-root.tiny .ch-bl{padding:3px;gap:0}
.ch-root.tiny .ch-bl::before,.ch-root.tiny .ch-bl>span,.ch-root.tiny .ch-bl small{display:none}
.ch-root.tiny .ch-bl button{box-shadow:0 0 0 3px var(--c)}
.ch-tag{position:absolute;left:-400px;top:-400px;transform:translate(-100%,-50%);display:flex;flex-direction:row-reverse;align-items:center;font-weight:700;font-size:12px;white-space:nowrap;pointer-events:none}
.ch-tag i{width:22px;height:1.5px;background:#0b2a17;position:relative;flex:none}
.ch-tag i::before{content:"";position:absolute;right:-4px;top:-3px;width:7px;height:7px;border-radius:50%;background:#0b2a17}
.ch-tag span{padding:5px 11px}
.ch-bar{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);height:58px;max-width:calc(100% - 40px);padding:8px;display:flex;align-items:center;gap:6px}
.ch-ib2{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.62);flex:none}
.ch-ib2.ink{background:#0b2a17;color:#fff}
.ch-ib2:disabled{opacity:.35;cursor:default}
.ch-sep{width:1px;height:24px;background:rgba(11,42,23,.18);margin:0 6px;flex:none}
.ch-stat{display:flex;align-items:center;gap:8px;font-weight:600;font-size:13.5px;white-space:nowrap;min-width:0;max-width:340px}
.ch-stat .dots{display:flex;flex:none}
.ch-stat .dots b{width:14px;height:14px;border-radius:50%;display:block;box-shadow:inset 0 -2px 3px rgba(0,0,0,.2),0 0 0 2px rgba(255,255,255,.65)}
.ch-stat .dots b+b{margin-left:-4px}
.ch-stat span{overflow:hidden;text-overflow:ellipsis}
.ch-measure{height:42px;border-radius:999px;padding:0 18px 0 14px;display:flex;align-items:center;gap:7px;font-weight:700;font-size:13.5px;white-space:nowrap;background:#0b2a17;color:#fff;flex:none}
.ch-measure i{width:8px;height:8px;border-radius:50%;background:#ff5a3d}
@media (max-width:900px){
  .ch-tabs{top:70px}
  .ch-side{left:16px;right:16px;top:auto;bottom:88px;width:auto;height:150px}
  .ch-side.sheet{height:min(440px,calc(100% - 222px))}
  .ch-widgets{flex-direction:row}
  .ch-widgets>.ch-card{flex:1;min-width:0}
  .ch-big{font-size:44px}.ch-mid{font-size:34px}
  .ch-bar{bottom:16px}
  .ch-home{right:16px}.ch-brand{left:16px}
}
@media (max-width:640px){
  .ch-brand b{font-size:24px}
  .ch-tabs button{padding:0 12px;font-size:12.5px}
  .ch-home span{display:none}
  .ch-home{padding:0 12px}
  .ch-stat,.ch-bar .ch-sep:last-of-type{display:none}
  .ch-widgets .ch-phl,.ch-widgets .ch-spark,.ch-widgets .of{display:none}
}
@media (prefers-reduced-motion: reduce){.ch-root *{transition:none!important}}
`;

export function buildChemHud(host, ctx, view) {
  if (!document.getElementById("ch-style")) {
    const st = document.createElement("style");
    st.id = "ch-style";
    st.textContent = CH_CSS;
    document.head.appendChild(st);
  }
  const { config, world, state } = ctx;
  const root = document.createElement("div");
  root.className = "ch-root";
  host.appendChild(root);
  const add = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    const n = t.content.firstElementChild;
    root.appendChild(n);
    return n;
  };

  // Top: brand, tabs, home.
  const brand = add('<div class="ch-brand"><span class="ch-logo"></span><b></b></div>');
  brand.querySelector("b").textContent = String(config.lab.title || "lab").toLowerCase();
  if (window.AuraGhost) window.AuraGhost.mount(brand.querySelector(".ch-logo"), "white");
  const steps = [{ id: "lab", label: "Lab" }];
  if (config.laws.length > 0) steps.push({ id: "laws", label: "Laws" });
  if (config.controls.length > 0) steps.push({ id: "knobs", label: "Knobs" });
  if (config.notebook.enabled) steps.push({ id: "notebook", label: "Notebook" });
  const tabs = add('<nav class="ch-gx ch-pill ch-tabs" role="tablist" aria-label="Lab steps"></nav>');
  const tabBtns = {};
  steps.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.textContent = s.label;
    b.addEventListener("click", () => select(s.id));
    tabs.appendChild(b);
    tabBtns[s.id] = b;
  });
  const home = add(`<a class="ch-gx ch-pill ch-home">${chIcon("back")}<span>all labs</span></a>`);
  home.setAttribute("href", config.lab.home || "../index.html");

  // Right column: measures (Lab) or one sheet per step.
  const side = add('<div class="ch-side"></div>');
  const panes = {};
  const widgets = document.createElement("div");
  widgets.className = "ch-widgets";
  side.appendChild(widgets);
  panes.lab = widgets;
  const sheet = (id) => {
    const s = document.createElement("section");
    s.className = "ch-gx ch-card ch-sheet";
    s.setAttribute("role", "tabpanel");
    s.hidden = true;
    side.appendChild(s);
    panes[id] = s;
    return s;
  };

  // Measure cards, one per config metric (temperature, pH, volume have their own look).
  const cards = config.metrics.map((m) => {
    const card = document.createElement("div");
    card.className = "ch-gx ch-card";
    const unit = m.unit ? `<sup>${chEsc(m.unit)}</sup>` : "";
    if (m.source === "temp") {
      card.classList.add("ch-temp");
      card.innerHTML = `<div class="ch-wh"><p class="ch-cap">${chEsc(m.label)}</p><span class="ch-chip" hidden></span></div>` +
        `<p class="ch-num ch-big"><span class="v">0</span>${unit}</p>` +
        '<svg class="ch-spark" viewBox="0 0 200 50" preserveAspectRatio="none" aria-hidden="true"><path class="area" fill="#ff5a3d" fill-opacity=".16"/><path class="line" fill="none" stroke="#ff5a3d" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>';
    } else if (m.source === "ph") {
      card.innerHTML = `<div class="ch-wh"><p class="ch-cap">${chEsc(m.label)}</p><span class="ch-mut lab"></span></div>` +
        `<p class="ch-num ch-mid"><span class="v">0</span>${unit}</p>` +
        '<div class="ch-phb"><u></u></div><div class="ch-phl"><span>acid</span><span>basic</span></div>';
    } else if (m.source === "volume") {
      card.innerHTML = `<div class="ch-wh"><p class="ch-cap">${chEsc(m.label)}</p><span class="ch-mut of">of 500 ${chEsc(m.unit || "")}</span></div>` +
        `<p class="ch-num ch-mid"><span class="v">0</span>${unit}</p><div class="ch-vb"><i></i></div>`;
    } else {
      card.innerHTML = `<p class="ch-cap">${chEsc(m.label)}</p><p class="ch-num ch-mid"><span class="v">0</span>${unit}</p>`;
    }
    widgets.appendChild(card);
    return { m, card, v: card.querySelector(".v"), last: "" };
  });

  // Laws sheet.
  if (steps.some((s) => s.id === "laws")) {
    const s = sheet("laws");
    s.insertAdjacentHTML("beforeend", '<h3>Laws</h3><p class="ch-mut" style="white-space:normal">Switch a law off to see what it does.</p>');
    config.laws.forEach((l, i) => {
      const mod = ctx.catalog.laws[l.law];
      const label = mod ? mod.notice.label : l.law;
      const key = `${l.law}#${i}`;
      const row = document.createElement("div");
      row.className = "ch-row";
      row.innerHTML = `<label class="ch-sw"><input type="checkbox" aria-label="Enable ${chEsc(label)}"><span></span></label><span class="nm">${chEsc(label)}</span>`;
      const box = row.querySelector("input");
      box.checked = ctx.isActive("laws", key);
      box.addEventListener("change", () => {
        ctx.setActive("laws", key, box.checked);
        ctx.touch();
      });
      s.appendChild(row);
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
        nb.innerHTML = `<b>${chEsc(label)}</b><br>Rule: ${chEsc(mod.notice.formule)}<br>Sources: ${chEsc(mod.notice.sources)}<br>Limits: ${chEsc(mod.notice.limites)}`;
        ib.addEventListener("click", () => ib.setAttribute("aria-expanded", String(nb.classList.toggle("open"))));
        s.appendChild(nb);
      }
    });
  }

  // Knobs sheet: config sliders + the burner switch.
  const sliders = [];
  let burnerBox = null;
  if (steps.some((s) => s.id === "knobs")) {
    const s = sheet("knobs");
    s.insertAdjacentHTML("beforeend", "<h3>Knobs</h3>");
    if (state.material.bruleur) {
      const row = document.createElement("div");
      row.className = "ch-row";
      row.innerHTML = '<label class="ch-sw"><input type="checkbox" aria-label="Burner on"><span></span></label><span class="nm">Burner on<small>or click the burner</small></span>';
      burnerBox = row.querySelector("input");
      burnerBox.addEventListener("change", () => ctx.setBurner(burnerBox.checked));
      s.appendChild(row);
    }
    config.controls.forEach((c, i) => {
      const w = document.createElement("div");
      w.className = "ch-ctl";
      w.innerHTML = `<label for="ch-ctl-${i}"><span>${chEsc(c.label)}</span><output></output></label><input id="ch-ctl-${i}" type="range" min="${c.min}" max="${c.max}" step="${c.step}">`;
      const input = w.querySelector("input");
      const out = w.querySelector("output");
      input.addEventListener("input", () => {
        ctx.setControl(c.path, parseFloat(input.value));
        out.textContent = input.value;
      });
      s.appendChild(w);
      sliders.push({ c, input, out, last: null });
    });
  }

  // Notebook sheet (same storage as the shell notebook).
  let renderBook = () => {};
  if (steps.some((s) => s.id === "notebook")) {
    // No scrollbar: the sheet keeps a fixed layout and the entries are paged to what fits.
    const s = sheet("notebook");
    s.classList.add("ch-book");
    s.insertAdjacentHTML("beforeend", "<h3>Notebook</h3>");
    const prompts = config.notebook.prompts || [];
    if (prompts.length > 0) {
      const pq = document.createElement("div");
      pq.className = "ch-q";
      pq.innerHTML = '<span></span>' + (prompts.length > 1 ? '<button type="button" aria-label="Next question">' + chIcon("next") + "</button>" : "");
      let qi = 0;
      const show = () => { pq.querySelector("span").textContent = prompts[qi]; };
      show();
      const nb = pq.querySelector("button");
      if (nb) nb.addEventListener("click", () => { qi = (qi + 1) % prompts.length; show(); });
      s.appendChild(pq);
    }
    const area = document.createElement("textarea");
    area.placeholder = "Write what you see…";
    area.setAttribute("aria-label", "Notebook note");
    s.appendChild(area);
    const acts = document.createElement("div");
    acts.className = "ch-acts";
    acts.innerHTML = '<button type="button" class="ch-btn ink">Note</button><button type="button" class="ch-btn"><i></i>Record measures</button>';
    s.appendChild(acts);
    const [noteBtn, recBtn] = acts.querySelectorAll("button");
    const saveNote = () => {
      const text = area.value.trim();
      if (!text) return;
      ctx.addNote(text);
      area.value = "";
      renderBook();
    };
    noteBtn.addEventListener("click", saveNote);
    area.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveNote(); });
    recBtn.addEventListener("click", () => { ctx.record(); renderBook(); });
    // One feed, newest first: notes (✎) and recorded measures (●), paged without scrolling.
    const feed = document.createElement("ul");
    feed.className = "ch-list ch-feed";
    const pager = document.createElement("div");
    pager.className = "ch-pager";
    pager.innerHTML = '<button type="button" class="new">Newer</button><span></span><button type="button" class="old">Older</button>';
    s.appendChild(feed);
    s.appendChild(pager);
    const [newerBtn, olderBtn] = pager.querySelectorAll("button");
    const pagerTxt = pager.querySelector("span");
    let starts = [0]; // first entry of each page seen so far
    let shown = 0;
    let total = 0;
    newerBtn.addEventListener("click", () => { if (starts.length > 1) { starts.pop(); renderBook(true); } });
    olderBtn.addEventListener("click", () => { starts.push(starts[starts.length - 1] + shown); renderBook(true); });
    const fmtT = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
    const opened = new Set();
    const entryLi = (e) => {
      const li = document.createElement("li");
      if (e.kind === "note") {
        li.innerHTML = `<span class="t">${fmtT(e.n.t)}</span><span class="txt"></span><button type="button" aria-label="Delete note">×</button>`;
        const txt = li.querySelector(".txt");
        txt.textContent = e.n.text;
        txt.title = "Click to read the whole note";
        if (opened.has(e.n)) li.classList.add("open");
        // Long notes show two lines; a click opens the whole note (the page re-fits around it).
        txt.addEventListener("click", () => {
          if (opened.has(e.n)) opened.delete(e.n);
          else opened.add(e.n);
          renderBook(true);
        });
        li.querySelector("button").addEventListener("click", () => { ctx.deleteNote(e.i); renderBook(); });
      } else {
        const summary = config.metrics.map((m) => {
          const v = Math.round((e.n.metrics[m.id] || 0) * 10) / 10;
          return m.unit ? `${v} ${m.unit}` : `${m.label} ${v}`;
        }).join(" · ");
        li.className = "snap";
        li.innerHTML = `<span class="t">${fmtT(e.n.t)}</span><span class="txt"></span><button type="button">Restore</button><button type="button" aria-label="Delete measures">×</button>`;
        li.querySelector(".txt").textContent = summary;
        const [restore, del] = li.querySelectorAll("button");
        restore.addEventListener("click", () => ctx.restore(e.i));
        del.addEventListener("click", () => { ctx.deleteSnapshot(e.i); renderBook(); });
      }
      return li;
    };
    renderBook = (keepPage) => {
      const book = ctx.notebook();
      const all = [
        ...book.notes.map((n, i) => ({ kind: "note", n, i, k: i })),
        ...book.snapshots.map((n, i) => ({ kind: "snap", n, i, k: i })),
      ].sort((a, b) => (b.n.t - a.n.t) || (b.k - a.k));
      total = all.length;
      if (!keepPage) starts = [0];
      while (starts.length > 1 && starts[starts.length - 1] >= total) starts.pop();
      const start = starts[starts.length - 1];
      feed.innerHTML = "";
      shown = 0;
      if (!total) feed.innerHTML = '<li class="empty">Nothing yet: write a note or press Measure.</li>';
      // Add entries until the next one would not fit (always at least one).
      pager.hidden = false;
      for (let j = start; j < total; j++) {
        const li = entryLi(all[j]);
        feed.appendChild(li);
        if (shown > 0 && li.getBoundingClientRect().bottom > feed.getBoundingClientRect().bottom + 0.5) {
          li.remove();
          break;
        }
        shown++;
      }
      const multi = start > 0 || start + shown < total;
      pager.hidden = !multi;
      newerBtn.disabled = start === 0;
      olderBtn.disabled = start + shown >= total;
      pagerTxt.textContent = shown ? `${start + 1}–${start + shown} of ${total}` : "";
    };
    renderBook();
    window.addEventListener("resize", () => { if (ctx.tab === "notebook") renderBook(true); });
  }

  function select(id) {
    ctx.tab = id;
    steps.forEach((s) => {
      tabBtns[s.id].setAttribute("aria-selected", String(s.id === id));
      panes[s.id].hidden = s.id !== id;
    });
    side.classList.toggle("sheet", id !== "lab");
    if (id === "notebook") renderBook();
  }
  select("lab");

  // Dose pill under each bottle; flask tag at the neck.
  const pills = config.substances.map((s) => {
    const el = add(`<div class="ch-gx ch-pill ch-bl"><span></span><small></small><button type="button">${chIcon("plus")}</button></div>`);
    el.style.setProperty("--c", s.color);
    el.querySelector("span").textContent = view.shortName(s.label);
    const btn = el.querySelector("button");
    btn.setAttribute("aria-label", `Pour one dose of ${s.label}`);
    btn.addEventListener("click", () => ctx.addDose(s.id));
    return { s, el, count: el.querySelector("small"), btn, last: "" };
  });
  const flaskMat = config.material.find((m) => m.kind === "recipient");
  const tag = add('<div class="ch-tag"><i></i><span class="ch-gx ch-pill"></span></div>');
  tag.querySelector("span").textContent = flaskMat ? flaskMat.label.replace(/\s+(\d+\s*mL)$/i, " · $1") : "Flask";
  tag.hidden = !flaskMat;

  // Bottom bar: time, status, Measure.
  const bar = add('<div class="ch-gx ch-pill ch-bar"></div>');
  bar.innerHTML =
    `<button type="button" class="ch-ib2 ink play">${chIcon("pause")}</button>` +
    `<button type="button" class="ch-ib2 empty" title="Empty the flask (R)" aria-label="Empty the flask">${chIcon("empty")}</button>` +
    `<button type="button" class="ch-ib2 step" title="One step" aria-label="One step">${chIcon("step")}</button>` +
    '<span class="ch-sep"></span><p class="ch-stat" role="status" aria-live="polite"><span class="dots"></span><span class="txt"></span></p><span class="ch-sep"></span>' +
    '<button type="button" class="ch-measure"><i></i>Measure</button>';
  const playBtn = bar.querySelector(".play");
  const stepBtn = bar.querySelector(".step");
  const dotsEl = bar.querySelector(".dots");
  const statEl = bar.querySelector(".txt");
  playBtn.addEventListener("click", () => ctx.togglePause());
  bar.querySelector(".empty").addEventListener("click", () => ctx.emptyFlask());
  stepBtn.addEventListener("click", () => ctx.stepOnce());
  bar.querySelector(".ch-measure").addEventListener("click", () => { ctx.record(); renderBook(); });

  // Keyboard: Space play/pause, R empty, B burner, 1–9 pour, Esc back to Lab.
  window.addEventListener("keydown", (e) => {
    const tgt = e.target instanceof Element ? e.target : null;
    if (tgt && tgt.closest("input:not([type='range']), textarea, select")) return;
    if (e.key === " ") {
      if (tgt && tgt.closest("button, a, label")) return;
      e.preventDefault();
      ctx.togglePause();
    } else if (e.key === "r" || e.key === "R") ctx.emptyFlask();
    else if (e.key === "b" || e.key === "B") ctx.toggleBurner();
    else if (/^[1-9]$/.test(e.key)) {
      const s = config.substances[Number(e.key) - 1];
      if (s) ctx.addDose(s.id);
    } else if (e.key === "Escape") select("lab");
  });

  // Free area left to the 3D scene (CSS px), measured from the panels.
  function insets() {
    const r = host.getBoundingClientRect();
    const sb = side.getBoundingClientRect();
    const bb = bar.getBoundingClientRect();
    const top = Math.max(brand.getBoundingClientRect().bottom, tabs.getBoundingClientRect().bottom, home.getBoundingClientRect().bottom) - r.top + 14;
    const sideOnRight = sb.left - r.left > r.width / 2;
    const right = sideOnRight ? r.right - sb.left + 16 : 16;
    // An open sheet grows over the scene on small screens: frame for the 150px strip only.
    const bottom = r.bottom - Math.min(bb.top, sideOnRight ? bb.top : Math.max(sb.top, sb.bottom - 150)) + 10;
    return { top, right, bottom, left: r.width > 900 ? 24 : 16 };
  }
  // Place the pills and the tag on their 3D anchors (after every camera fit).
  function layout() {
    const xs = [];
    for (const p of pills) {
      const a = view.anchors.bottle(p.s.id) || { x: -400, y: -400 };
      xs.push(a.x);
      p.el.style.left = `${a.x.toFixed(1)}px`;
      p.el.style.top = `${(a.y + 10).toFixed(1)}px`;
    }
    // Bottles close together on screen: drop the names, then the counts, so pills never touch.
    const fits = () => pills.every((p, i) => i === 0 || Math.abs(xs[i] - xs[i - 1]) >= (pills[i - 1].el.offsetWidth + p.el.offsetWidth) / 2 + 6);
    root.classList.remove("compact", "tiny");
    if (!fits()) {
      root.classList.add("compact");
      if (!fits()) {
        root.classList.remove("compact");
        root.classList.add("tiny");
      }
    }
    const n = view.anchors.neck();
    tag.style.left = `${n.x.toFixed(1)}px`;
    tag.style.top = `${n.y.toFixed(1)}px`;
  }

  let lastStat = "";
  let lastSpark = "";
  let lastPlay = null;
  let lastBadge = -1;
  const fmt = (v, src) => (src === "volume" ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1));
  function refresh() {
    const vals = ctx.metricValues();
    for (const c of cards) {
      const v = vals[c.m.id] || 0;
      const txt = fmt(v, c.m.source);
      if (txt === c.last) continue;
      c.last = txt;
      c.v.textContent = txt;
      if (c.m.source === "ph") {
        c.card.querySelector(".ch-phb u").style.left = `${Math.max(0, Math.min(100, (v / 14) * 100)).toFixed(1)}%`;
        c.card.querySelector(".lab").textContent = v < 6.5 ? "acid" : v > 7.5 ? "basic" : "neutral";
      } else if (c.m.source === "volume") {
        c.card.querySelector(".ch-vb i").style.width = `${Math.min(100, (v / 500) * 100).toFixed(1)}%`;
      }
    }
    // Temperature trend chip + sparkline.
    const h = ctx.history;
    const sparkKey = `${h.length}:${h.length ? h[h.length - 1] : 0}`;
    if (sparkKey !== lastSpark) {
      lastSpark = sparkKey;
      const tc = cards.find((c) => c.m.source === "temp");
      if (tc && h.length) {
        const chip = tc.card.querySelector(".ch-chip");
        const now = world.temp;
        const before = h.length > 4 ? h[h.length - 5] : now;
        if (now >= 99.5) { chip.hidden = false; chip.className = "ch-chip boil"; chip.textContent = "boiling"; }
        else if (now - before > 0.4) { chip.hidden = false; chip.className = "ch-chip"; chip.textContent = "↗ heating"; }
        else if (before - now > 0.4) { chip.hidden = false; chip.className = "ch-chip cool"; chip.textContent = "↘ cooling"; }
        else chip.hidden = true;
        const n = Math.max(2, h.length);
        const pts = h.map((v, i) => `${((i / (n - 1)) * 200).toFixed(1)} ${(46 - (Math.max(0, Math.min(100, v)) / 100) * 42).toFixed(1)}`);
        if (pts.length === 1) pts.push(`200 ${pts[0].split(" ")[1]}`);
        tc.card.querySelector(".line").setAttribute("d", `M${pts.join("L")}`);
        tc.card.querySelector(".area").setAttribute("d", `M${pts.join("L")}V50H0Z`);
      }
    }
    // Dose pills.
    for (const p of pills) {
      const n = p.s.count || 0;
      const max = ctx.doseMax(p.s.id);
      const key = `${n}/${max}`;
      if (key === p.last) continue;
      p.last = key;
      p.count.textContent = `×${n}`;
      p.btn.disabled = n >= max;
    }
    // Knobs follow changes made elsewhere (pills, keys, restore).
    for (const sl of sliders) {
      const v = ctx.getControl(sl.c.path);
      if (v === sl.last) continue;
      sl.last = v;
      sl.input.value = String(v);
      sl.out.textContent = String(Math.round(v * 100) / 100);
    }
    if (burnerBox) burnerBox.checked = ctx.isActive("material", "bruleur");
    // Status line.
    const st = ctx.status();
    const sk = st.text + st.colors.join();
    if (sk !== lastStat) {
      lastStat = sk;
      statEl.textContent = st.text;
      dotsEl.innerHTML = st.colors.map((c) => `<b style="background:${c}"></b>`).join("");
    }
    if (ctx.clock.running !== lastPlay) {
      lastPlay = ctx.clock.running;
      playBtn.innerHTML = chIcon(lastPlay ? "pause" : "play");
      playBtn.setAttribute("aria-label", lastPlay ? "Pause" : "Play");
      stepBtn.disabled = lastPlay;
    }
    const nb = ctx.notebook();
    const count = nb.notes.length + nb.snapshots.length;
    if (count !== lastBadge && tabBtns.notebook) {
      lastBadge = count;
      let b = tabBtns.notebook.querySelector(".badge");
      if (!count && b) b.remove();
      if (count) {
        if (!b) { b = document.createElement("span"); b.className = "badge"; tabBtns.notebook.appendChild(b); }
        b.textContent = String(count);
      }
    }
  }
  refresh();
  return { refresh, layout, insets, select, renderBook };
}

// Bridge HUD: golden-hour glass interface floating over the full-screen 3D valley.
// Top: brand, sites, score, home. Left: tool dock. Right: sensors card (laws, ghost, log).
// Bottom: budget ring, hint, repair, Test. Same ctx contract as the game expects.
import "../../core/ghost.js"; // side effect: window.AuraGhost (flask ghost logo)

const PH_ICONS = {
  beam: '<rect x="3" y="9.5" width="18" height="5" rx="1.5"/><path d="M8 9.5v5M12 9.5v5M16 9.5v5"/>',
  cable: '<path d="M4 18L20 6"/><circle cx="4" cy="18" r="2" fill="currentColor"/><circle cx="20" cy="6" r="2" fill="currentColor"/>',
  erase: '<path d="M8.5 19.5L3.8 14.8a1.8 1.8 0 0 1 0-2.6l8.4-8.4a1.8 1.8 0 0 1 2.6 0l5.4 5.4a1.8 1.8 0 0 1 0 2.6L13 19.5zM8.5 19.5H20M7 11l7 7"/>',
  undo: '<path d="M9 6L4 11l5 5M4 11h10.5a5 5 0 0 1 0 10H12"/>',
  clear: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="currentColor"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
};
const phIcon = (k) => `<svg class="ph-i" viewBox="0 0 24 24" aria-hidden="true">${PH_ICONS[k]}</svg>`;

const PH_CSS = `
.ph-root{position:absolute;inset:0;pointer-events:none;color:#1b1530;font-family:"Archivo","Segoe UI",system-ui,sans-serif;font-size:13px;line-height:1.35;z-index:5;-webkit-font-smoothing:antialiased}
.ph-root *{box-sizing:border-box}
.ph-root p{margin:0}
.ph-root :where(button){font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0;margin:0}
.ph-root button:focus-visible,.ph-root a:focus-visible,.ph-root summary:focus-visible,.ph-root input:focus-visible{outline:3px solid #1b1530;outline-offset:2px}
.ph-gx{pointer-events:auto;background:rgba(255,255,255,.5);-webkit-backdrop-filter:blur(18px) saturate(1.5);backdrop-filter:blur(18px) saturate(1.5);border:1px solid rgba(255,255,255,.72);box-shadow:0 18px 38px -22px rgba(30,20,70,.55),inset 0 1px 0 rgba(255,255,255,.85);border-radius:22px}
.ph-i{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;display:block;flex:none}
.ph-brand{position:absolute;left:22px;top:18px;height:50px;padding:0;pointer-events:none;display:flex;align-items:center;gap:8px;border-radius:999px}
.ph-logo{width:36px;display:block;flex:none}
.ph-brand b{font-weight:900;font-stretch:70%;font-size:26px;line-height:1;letter-spacing:-.01em;white-space:nowrap}
.ph-sites{position:absolute;left:50%;top:18px;transform:translateX(-50%);height:50px;padding:6px;display:flex;gap:2px;border-radius:999px}
.ph-sites button{height:38px;padding:0 17px;border-radius:999px;font-weight:600;font-size:13.5px;display:flex;align-items:center;gap:5px;white-space:nowrap}
.ph-sites button:hover{background:rgba(255,255,255,.45)}
.ph-sites button.on{background:#fff;box-shadow:0 4px 12px -6px rgba(30,20,70,.5)}
.ph-sites .ph-i{width:13px;height:13px;color:#f59e0b}
.ph-tr{position:absolute;right:20px;top:18px;display:flex;gap:8px}
.ph-score{height:50px;padding:0 16px;border-radius:999px;display:flex;align-items:center;gap:7px;font-weight:600;white-space:nowrap}
.ph-score b{font:700 15px "JetBrains Mono",ui-monospace,Consolas,monospace}
.ph-home{height:50px;padding:0 18px 0 12px;border-radius:999px;display:flex;align-items:center;gap:6px;font-weight:700;color:#1b1530;text-decoration:none;white-space:nowrap}
.ph-home .ph-i{width:16px;height:16px}
.ph-dock{position:absolute;left:20px;top:50%;transform:translateY(-50%);width:80px;padding:8px;display:flex;flex-direction:column;gap:6px}
.ph-dock button{height:58px;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-weight:600;font-size:11px}
.ph-dock button small{font:600 10px "JetBrains Mono",ui-monospace,monospace;opacity:.6}
.ph-dock button:hover{background:rgba(255,255,255,.55)}
.ph-dock button.on{background:#1b1530;color:#fff}
.ph-dock button.act{height:50px}
.ph-dock .ph-sep{height:1px;background:rgba(27,21,48,.14);margin:2px 8px}
.ph-card{position:absolute;right:20px;top:86px;width:236px;max-height:calc(100% - 192px);overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:8px;overscroll-behavior:contain}
.ph-card>*{flex-shrink:0}
.ph-cap{font:700 10.5px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(27,21,48,.55)}
.ph-kv{display:flex;justify-content:space-between;align-items:baseline;font-weight:600}
.ph-kv b{font:700 20px "JetBrains Mono",ui-monospace,monospace;letter-spacing:-.02em}
.ph-kv i{font-style:normal}
.ph-kv small{font:600 11px "Archivo",sans-serif;color:rgba(27,21,48,.55)}
.ph-bar{height:6px;border-radius:3px;background:rgba(27,21,48,.12);overflow:hidden;margin-top:-3px}
.ph-bar i{display:block;height:100%;width:100%;border-radius:3px;background:linear-gradient(90deg,#22c55e,#facc15 55%,#fb923c 80%,#ef4444);clip-path:inset(0 calc(100% - var(--p,0%)) 0 0 round 3px);transition:clip-path .2s}
.ph-sepl{height:1px;background:rgba(27,21,48,.12);margin:2px 0}
.ph-sec summary{list-style:none;display:flex;align-items:center;gap:6px;min-height:30px;font-weight:600;cursor:pointer;border-radius:8px}
.ph-sec summary::-webkit-details-marker{display:none}
.ph-sec summary small{margin-left:auto;font-size:11.5px;font-weight:500;color:rgba(27,21,48,.55)}
.ph-sec summary .ph-i{width:14px;height:14px;opacity:.5;transition:transform .2s}
.ph-sec[open] summary .ph-i{transform:rotate(90deg)}
.ph-sec>div{padding:6px 0 8px;display:flex;flex-direction:column;gap:8px}
.ph-law{display:flex;align-items:center;gap:8px}
.ph-law .nm{flex:1;min-width:0;font-weight:600;font-size:12.5px}
.ph-sw{position:relative;width:34px;height:20px;flex:none}
.ph-sw input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;cursor:pointer}
.ph-sw span{position:absolute;inset:0;border-radius:999px;background:rgba(27,21,48,.2);transition:background .15s;pointer-events:none}
.ph-sw span::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
.ph-sw input:checked+span{background:#1b1530}
.ph-sw input:checked+span::after{left:17px}
.ph-sw input:focus-visible+span{outline:3px solid #1b1530;outline-offset:2px}
.ph-ib{width:20px;height:20px;border-radius:50%;border:1.5px solid #1b1530;font:800 11px/17px "Archivo",sans-serif;text-align:center;flex:none}
.ph-notice{display:none;font-size:12px;line-height:1.45;color:rgba(27,21,48,.78);background:rgba(255,255,255,.6);border-radius:10px;padding:8px 10px}
.ph-notice.open{display:block}
.ph-notice b{color:#1b1530}
.ph-slider label{display:flex;justify-content:space-between;font-weight:600;font-size:12.5px;margin-bottom:6px}
.ph-slider output{font:700 12px "JetBrains Mono",ui-monospace,monospace}
.ph-slider input{width:100%;margin:0;accent-color:#1b1530}
.ph-prompts,.ph-entries{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:12px}
.ph-prompts li{background:rgba(255,181,71,.25);border-radius:10px;padding:7px 9px;font-weight:600}
.ph-entries{max-height:160px;overflow:auto}
.ph-entries li{background:rgba(255,255,255,.6);border-radius:10px;padding:7px 9px;line-height:1.4}
.ph-entries .w{font:500 10.5px "JetBrains Mono",ui-monospace,monospace;color:rgba(27,21,48,.55)}
.ph-note{display:flex;gap:6px}
.ph-note input{flex:1;min-width:0;height:34px;border:1px solid rgba(27,21,48,.15);border-radius:10px;background:rgba(255,255,255,.75);padding:0 10px;font:inherit;color:inherit}
.ph-note button{height:34px;padding:0 12px;border-radius:10px;background:#1b1530;color:#fff;font-weight:700}
.ph-go{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);height:64px;max-width:calc(100% - 40px);padding:8px 8px 8px 10px;display:flex;align-items:center;gap:12px;border-radius:999px}
.ph-ring{width:44px;height:44px;flex:none}
.ph-bt{flex:none}
.ph-bt small{display:block;font-weight:600;font-size:10.5px;color:rgba(27,21,48,.55)}
.ph-bt b{font:700 15px "JetBrains Mono",ui-monospace,monospace;white-space:nowrap}
.ph-go .ph-sep{width:1px;height:28px;background:rgba(27,21,48,.15);flex:none}
.ph-hint{display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px;min-width:0;max-width:400px}
.ph-hint span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ph-hint::before{content:"";width:8px;height:8px;border-radius:50%;flex:none;background:#8a8399;box-shadow:0 0 0 3px rgba(138,131,153,.22)}
.ph-hint.run::before{background:#ff8a3d;box-shadow:0 0 0 3px rgba(255,138,61,.28)}
.ph-hint.good::before{background:#16c063;box-shadow:0 0 0 3px rgba(22,192,99,.25)}
.ph-hint.bad::before{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.25)}
.ph-fix{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.65);flex:none}
.ph-fix .ph-i{width:18px;height:18px}
.ph-test{height:48px;padding:0 24px 0 18px;border-radius:999px;background:#1b1530;color:#fff;display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;white-space:nowrap;flex:none}
.ph-test .ph-i{width:16px;height:16px}
.ph-test[aria-busy="true"]{background:#ff8a3d}
@media (max-width:900px){.ph-card,.ph-score{display:none}}
@media (max-width:640px){
  .ph-brand b{display:none}
  .ph-sites{top:76px}
  .ph-dock{top:auto;bottom:96px;left:50%;transform:translateX(-50%);width:auto;flex-direction:row}
  .ph-dock button,.ph-dock button.act{width:54px;height:54px}
  .ph-dock .ph-sep{width:1px;height:auto;margin:8px 2px}
  .ph-go .ph-sep,.ph-hint{display:none}
}
@media (prefers-reduced-motion: reduce){.ph-root *{transition:none!important}}
`;

export function buildHud(host, ctx) {
  if (!document.getElementById("ph-style")) {
    const st = document.createElement("style");
    st.id = "ph-style";
    st.textContent = PH_CSS;
    document.head.appendChild(st);
  }
  const root = document.createElement("div");
  root.className = "ph-root";
  const home = ctx.config.lab.home || "../index.html";
  root.innerHTML =
    '<div class="ph-brand"><span class="ph-logo"></span><b></b></div>' +
    '<nav class="ph-gx ph-sites" aria-label="Sites"></nav>' +
    '<div class="ph-tr"><span class="ph-gx ph-score" title="Total score">Score <b>0</b></span>' +
    `<a class="ph-gx ph-home">${phIcon("back")}all labs</a></div>` +
    '<nav class="ph-gx ph-dock" aria-label="Tools">' +
    `<button type="button" class="tool" data-tool="poutre" aria-pressed="false" title="Beam (1)">${phIcon("beam")}Beam<small>10</small></button>` +
    `<button type="button" class="tool" data-tool="cable" aria-pressed="false" title="Cable (2)">${phIcon("cable")}Cable<small>5</small></button>` +
    `<button type="button" class="tool" data-tool="gomme" aria-pressed="false" title="Eraser (3)">${phIcon("erase")}Eraser</button>` +
    '<span class="ph-sep"></span>' +
    `<button type="button" class="act undo" title="Remove the last bar (Ctrl+Z)">${phIcon("undo")}Undo</button>` +
    `<button type="button" class="act clear" title="Clear this site">${phIcon("clear")}Clear</button>` +
    "</nav>" +
    '<aside class="ph-gx ph-card" aria-label="Sensors">' +
    '<p class="ph-cap">Sensors</p>' +
    '<div class="ph-kv"><span>Sag</span><b><i data-v="fleche">0</i> <small>mm</small></b></div>' +
    '<div class="ph-kv"><span>Max stress</span><b><i data-v="contrainte">0</i> <small>%</small></b></div>' +
    '<div class="ph-bar"><i></i></div>' +
    '<div class="ph-kv"><span>Cost</span><b><i data-v="cout">0</i> <small data-v="budget">/ 0</small></b></div>' +
    '<div class="ph-sepl"></div>' +
    `<details class="ph-sec"><summary>Laws<small data-v="laws"></small>${phIcon("chev")}</summary><div class="ph-laws"></div></details>` +
    `<details class="ph-sec"><summary>Ghost<small data-v="ghost"></small>${phIcon("chev")}</summary><div class="ph-ghost"></div></details>` +
    `<details class="ph-sec"><summary>Log<small data-v="log"></small>${phIcon("chev")}</summary><div class="ph-journal"></div></details>` +
    "</aside>" +
    '<div class="ph-gx ph-go">' +
    '<svg class="ph-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(27,21,48,.12)" stroke-width="5"/>' +
    '<circle class="arc" cx="22" cy="22" r="18" fill="none" stroke="#1b1530" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 113.1" transform="rotate(-90 22 22)"/></svg>' +
    '<div class="ph-bt"><small>Budget</small><b data-v="spent">0 / 0</b></div>' +
    '<span class="ph-sep"></span>' +
    '<p class="ph-hint" role="status" aria-live="polite"><span></span></p>' +
    `<button type="button" class="ph-fix" title="Repair (R)" aria-label="Repair the bridge">${phIcon("reset")}</button>` +
    `<button type="button" class="ph-test" title="Test (Space)">${phIcon("play")}<span>Test</span></button>` +
    "</div>";
  host.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const V = (k) => root.querySelector(`[data-v="${k}"]`);
  $(".ph-brand b").textContent = String(ctx.config.lab.title || "lab").toLowerCase();
  $(".ph-home").setAttribute("href", home);
  if (window.AuraGhost) window.AuraGhost.mount($(".ph-logo"), "ink");
  const sitesEl = $(".ph-sites");
  const scoreEl = $(".ph-score b");
  const hintEl = $(".ph-hint");
  const hintText = $(".ph-hint span");
  const arcEl = $(".ph-ring .arc");
  const barEl = $(".ph-bar i");
  const testBtn = $(".ph-test");
  const lawsEl = $(".ph-laws");
  const ghostEl = $(".ph-ghost");
  const journalEl = $(".ph-journal");

  // Site tabs.
  const siteBtns = {};
  for (const s of ctx.config.sites) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.site = s.id;
    b.addEventListener("click", () => ctx.setSite(s.id));
    sitesEl.appendChild(b);
    siteBtns[s.id] = b;
  }
  // Tools + actions.
  root.querySelectorAll("button.tool").forEach((b) => {
    b.addEventListener("click", () => ctx.setTool(b.dataset.tool));
  });
  const undo = () => {
    if (ctx.undo) ctx.undo();
    refresh(true);
  };
  $(".undo").addEventListener("click", undo);
  $(".clear").addEventListener("click", () => {
    ctx.clearAll();
    refresh(true);
  });
  $(".ph-fix").addEventListener("click", () => {
    ctx.repair();
    refresh(true);
  });
  testBtn.addEventListener("click", () => {
    ctx.test();
    refresh(true);
  });

  // Laws: switch + catalog notice.
  const lawBoxes = [];
  ctx.config.laws.forEach((entry, i) => {
    const mod = ctx.catalog.laws[entry.law];
    const label = mod ? mod.notice.label : entry.law;
    const key = `${entry.law}#${i}`;
    const row = document.createElement("div");
    row.className = "ph-law";
    const sw = document.createElement("label");
    sw.className = "ph-sw";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = ctx.isActive("laws", key);
    box.setAttribute("aria-label", `Enable ${label}`);
    box.addEventListener("change", () => {
      ctx.setActive("laws", key, box.checked);
      refresh(true);
    });
    sw.appendChild(box);
    sw.appendChild(document.createElement("span"));
    const nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = label;
    row.appendChild(sw);
    row.appendChild(nm);
    lawsEl.appendChild(row);
    if (mod && mod.notice) {
      const ib = document.createElement("button");
      ib.type = "button";
      ib.className = "ph-ib";
      ib.textContent = "i";
      ib.setAttribute("aria-label", `About ${label}`);
      ib.setAttribute("aria-expanded", "false");
      const nb = document.createElement("div");
      nb.className = "ph-notice";
      nb.innerHTML = `<b>${label}</b><br>Rule: ${mod.notice.formule}<br>Sources: ${mod.notice.sources}<br>Limits: ${mod.notice.limites}`;
      ib.addEventListener("click", () => {
        const open = nb.classList.toggle("open");
        ib.setAttribute("aria-expanded", String(open));
      });
      row.appendChild(ib);
      lawsEl.appendChild(nb);
    }
    lawBoxes.push({ box, key });
  });

  // Ghost sliders (shared across worlds).
  function chargeParams() {
    const out = [];
    for (const id of Object.keys(ctx.worlds)) {
      const w = ctx.worlds[id];
      const law = w.laws.find((l) => l.mod.id === "charge-flottante");
      if (law) out.push(law.params);
    }
    return out;
  }
  function slider(label, min, max, step, get, set) {
    const wrap = document.createElement("div");
    wrap.className = "ph-slider";
    const lab = document.createElement("label");
    const out = document.createElement("output");
    lab.textContent = label;
    lab.appendChild(out);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.setAttribute("aria-label", label);
    input.addEventListener("input", () => {
      set(parseFloat(input.value));
      out.textContent = input.value;
      refresh(true);
    });
    wrap.appendChild(lab);
    wrap.appendChild(input);
    ghostEl.appendChild(wrap);
    return {
      sync() {
        const v = get();
        input.value = String(v);
        out.textContent = String(v);
      },
    };
  }
  const hasCharge = chargeParams().length > 0;
  const poidsSlider = hasCharge ? slider("Weight (t) — ghost size", 8, 40, 1,
    () => chargeParams()[0].poids,
    (v) => chargeParams().forEach((p) => { p.poids = v; })) : null;
  const vitesseSlider = hasCharge ? slider("Speed", 2, 12, 1,
    () => chargeParams()[0].vitesse,
    (v) => chargeParams().forEach((p) => { p.vitesse = v; })) : null;

  // Log: prompts + entries + note input.
  const prompts = document.createElement("ul");
  prompts.className = "ph-prompts";
  for (const p of ctx.config.notebook.prompts || []) {
    const li = document.createElement("li");
    li.textContent = p;
    prompts.appendChild(li);
  }
  journalEl.appendChild(prompts);
  const entries = document.createElement("ul");
  entries.className = "ph-entries";
  journalEl.appendChild(entries);
  const noteRow = document.createElement("div");
  noteRow.className = "ph-note";
  const noteInput = document.createElement("input");
  noteInput.placeholder = "Note an observation…";
  noteInput.setAttribute("aria-label", "Note an observation");
  const noteBtn = document.createElement("button");
  noteBtn.type = "button";
  noteBtn.textContent = "Note";
  const addNote = () => {
    const text = noteInput.value.trim();
    if (!text) return;
    ctx.journal(text);
    noteInput.value = "";
    refresh(true);
  };
  noteBtn.addEventListener("click", addNote);
  noteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addNote();
  });
  noteRow.appendChild(noteInput);
  noteRow.appendChild(noteBtn);
  journalEl.appendChild(noteRow);

  // Keyboard shortcuts.
  window.addEventListener("keydown", (e) => {
    const tgt = e.target instanceof Element ? e.target : null;
    if (tgt && tgt.closest("input:not([type='range']), textarea, select")) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      undo();
    } else if (e.key === " ") {
      if (tgt && tgt.closest("button, summary, a")) return;
      e.preventDefault();
      ctx.test();
    } else if (e.key === "Enter") {
      if (tgt && tgt.closest("button, summary, a")) return;
      ctx.test();
    } else if (e.key === "r" || e.key === "R") {
      ctx.repair();
    } else if (e.key === "1") {
      ctx.setTool("poutre");
    } else if (e.key === "2") {
      ctx.setTool("cable");
    } else if (e.key === "3" || e.key.toLowerCase() === "g") {
      ctx.setTool("gomme");
    } else if (e.key === "Escape") {
      ctx.selected = -1;
      root.querySelectorAll(".ph-sec[open]").forEach((d) => { d.open = false; });
    }
  });

  let lastJournalLen = -1;
  let lastHint = "";
  let lastTop = "";
  let lastSens = "";
  function siteLabel(id) {
    const s = ctx.config.sites.find((x) => x.id === id);
    return s ? s.label : id;
  }
  function refresh(force) {
    const w = ctx.worlds[ctx.activeId()].world;
    const spent = w.spent();
    const budget = w.budget();
    const top = `${ctx.activeId()}|${ctx.totalScore()}|${spent}|${budget}|${ctx.tool}|${JSON.stringify(ctx.save.cleared)}|${w.testing}|${w.statut}`;
    if (force || top !== lastTop) {
      lastTop = top;
      for (const s of ctx.config.sites) {
        const b = siteBtns[s.id];
        b.innerHTML = "";
        b.appendChild(document.createTextNode(s.label));
        if (ctx.save.cleared[s.id]) b.insertAdjacentHTML("beforeend", phIcon("star"));
        b.classList.toggle("on", s.id === ctx.activeId());
        b.setAttribute("aria-pressed", String(s.id === ctx.activeId()));
      }
      scoreEl.textContent = String(ctx.totalScore());
      V("spent").textContent = `${spent} / ${budget}`;
      const frac = budget > 0 ? Math.min(1, spent / budget) : 0;
      arcEl.setAttribute("stroke-dasharray", `${(frac * 113.1).toFixed(1)} 113.1`);
      arcEl.style.visibility = frac > 0 ? "visible" : "hidden";
      root.querySelectorAll("button.tool").forEach((b) => {
        const on = b.dataset.tool === ctx.tool;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      let active = 0;
      for (const { box, key } of lawBoxes) {
        box.checked = ctx.isActive("laws", key);
        if (box.checked) active++;
      }
      V("laws").textContent = `${active} active`;
      if (poidsSlider) poidsSlider.sync();
      if (vitesseSlider) vitesseSlider.sync();
      V("ghost").textContent = hasCharge ? `${chargeParams()[0].poids} t` : "";
      testBtn.setAttribute("aria-busy", String(!!w.testing));
      testBtn.querySelector("span").textContent = w.testing ? "Testing…" : "Test";
      hintEl.classList.toggle("run", !!w.testing);
      hintEl.classList.toggle("good", !w.testing && w.statut === 1);
      hintEl.classList.toggle("bad", !w.testing && w.statut === 0);
    }
    const m = w.measures();
    const sens = `${m.fleche}|${m.contrainte}|${spent}|${budget}`;
    if (force || sens !== lastSens) {
      lastSens = sens;
      V("fleche").textContent = String(m.fleche);
      V("contrainte").textContent = String(m.contrainte);
      barEl.style.setProperty("--p", `${Math.min(100, m.contrainte)}%`);
      V("cout").textContent = String(spent);
      V("budget").textContent = `/ ${budget}`;
    }
    if (force || ctx.message !== lastHint) {
      lastHint = ctx.message;
      hintText.textContent = ctx.message;
      hintEl.title = ctx.message;
    }
    if (force || ctx.save.journal.length !== lastJournalLen) {
      lastJournalLen = ctx.save.journal.length;
      const n = ctx.save.journal.length;
      V("log").textContent = n === 1 ? "1 note" : `${n} notes`;
      entries.innerHTML = "";
      for (const e of ctx.save.journal) {
        const li = document.createElement("li");
        const head = document.createElement("span");
        head.className = "w";
        head.textContent = `${e.when} · ${siteLabel(e.site)}`;
        li.appendChild(head);
        li.appendChild(document.createElement("br"));
        li.appendChild(document.createTextNode(e.text));
        if (e.metrics) {
          const mm = document.createElement("span");
          mm.className = "w";
          mm.textContent = ` sag ${e.metrics.fleche}mm · stress ${e.metrics.contrainte}%`;
          li.appendChild(mm);
        }
        entries.appendChild(li);
      }
      if (n === 0) {
        const li = document.createElement("li");
        li.textContent = "Tested trials will appear here.";
        entries.appendChild(li);
      }
    }
  }
  refresh(true);
  return { refresh };
}

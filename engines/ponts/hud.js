// Ponts HUD: top bar, tools, laws/sliders/journal panels, hints. Game-styled DOM.
export function buildHud(host, ctx) {
  if (!document.getElementById("ph-style")) {
    const st = document.createElement("style");
    st.id = "ph-style";
    st.textContent = [
      ".ph-root{position:absolute;inset:0;pointer-events:none;color:#f1f5f9;font-family:'Segoe UI',system-ui,sans-serif;z-index:5}",
      ".ph-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:10px;padding:10px 14px;background:linear-gradient(rgba(8,12,32,.92),rgba(8,12,32,.55) 80%,transparent);pointer-events:none}",
      ".ph-title{font-weight:900;letter-spacing:1px;font-size:17px}",
      ".ph-title em{font-style:normal;color:#7dd3fc}",
      ".ph-sites{display:flex;gap:6px;margin-left:8px;pointer-events:auto}",
      ".ph-sites button{background:rgba(20,30,70,.85);color:#f1f5f9;border:1px solid #475569;border-radius:999px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer}",
      ".ph-sites button.on{border-color:#7dd3fc;background:rgba(38,70,130,.9)}",
      ".ph-sites button .star{color:#fbbf24}",
      ".ph-score{margin-left:auto;font-size:13px;font-family:Consolas,monospace}",
      ".ph-score b{color:#6ee7a0}",
      ".ph-home{pointer-events:auto;color:#0b1230;background:#7dd3fc;border-radius:999px;padding:7px 14px;font-size:13px;font-weight:800;text-decoration:none;white-space:nowrap}",
      ".ph-tools{position:absolute;left:12px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:8px;pointer-events:auto}",
      ".ph-tools button{background:rgba(10,16,38,.85);color:#f1f5f9;border:1px solid #7dd3fc;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:800;cursor:pointer;text-align:left;min-width:132px}",
      ".ph-tools button.on{background:#7dd3fc;color:#0b1230}",
      ".ph-tools button.go{border-color:#6ee7a0;background:rgba(8,60,34,.88);margin-top:8px}",
      ".ph-tools button.warn{border-color:#f87171}",
      ".ph-budget{font-size:12.5px;font-family:Consolas,monospace;background:rgba(10,16,38,.8);border:1px solid #475569;border-radius:10px;padding:8px 10px}",
      ".ph-budget b{color:#7dd3fc}",
      ".ph-right{position:absolute;right:12px;top:64px;width:288px;display:flex;flex-direction:column;gap:8px;pointer-events:auto;max-height:calc(100% - 140px);overflow-y:auto}",
      ".ph-right details{background:rgba(10,16,38,.85);border:1px solid #475569;border-radius:12px;padding:8px 10px}",
      ".ph-right summary{font-weight:800;font-size:13px;cursor:pointer;letter-spacing:.5px}",
      ".ph-law{display:flex;align-items:flex-start;gap:8px;margin-top:8px;font-size:13px}",
      ".ph-law input{width:18px;height:18px;margin:1px 0 0;flex:none;accent-color:#7dd3fc}",
      ".ph-law .nm{flex:1;min-width:0;font-weight:700}",
      ".ph-law .ib{width:20px;height:20px;border-radius:50%;border:1.5px solid #7dd3fc;background:none;color:#7dd3fc;font-size:11px;font-weight:800;cursor:pointer;flex:none}",
      ".ph-notice{display:none;font-size:12px;color:#cbd5e1;margin:4px 0 4px 26px;line-height:1.45}",
      ".ph-notice.open{display:block}",
      ".ph-notice b{color:#fff}",
      ".ph-slider{margin-top:10px;font-size:13px}",
      ".ph-slider label{display:flex;justify-content:space-between;margin-bottom:4px}",
      ".ph-slider output{font-family:Consolas,monospace;color:#7dd3fc}",
      ".ph-slider input{width:100%;accent-color:#7dd3fc}",
      ".ph-prompts{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px;font-size:12.5px}",
      ".ph-prompts li{background:rgba(125,211,252,.1);border-radius:8px;padding:6px 9px}",
      ".ph-entries{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px;font-size:12.5px;max-height:180px;overflow-y:auto}",
      ".ph-entries li{background:rgba(241,245,249,.07);border-radius:8px;padding:6px 9px;line-height:1.4}",
      ".ph-entries .w{font-family:Consolas,monospace;font-size:11px;color:#94a3b8}",
      ".ph-note{display:flex;gap:6px;margin-top:8px}",
      ".ph-note input{flex:1;min-width:0;background:rgba(241,245,249,.08);border:1px solid #475569;border-radius:8px;color:#fff;padding:7px 9px;font-size:13px}",
      ".ph-note button{background:#7dd3fc;color:#0b1230;border:0;border-radius:8px;padding:7px 12px;font-weight:800;cursor:pointer}",
      ".ph-hint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);background:rgba(10,16,38,.85);border:1px solid #475569;border-radius:999px;padding:8px 18px;font-size:13px;max-width:min(90%,720px);text-align:center}",
      ".ph-hint b{color:#7dd3fc}",
      "@media (max-width:900px){.ph-right{display:none}.ph-tools{min-width:0}.ph-tools button{min-width:0}}",
    ].join("\n");
    document.head.appendChild(st);
  }
  const root = document.createElement("div");
  root.className = "ph-root";
  const home = ctx.config.lab.home || "../index.html";
  root.innerHTML =
    '<div class="ph-top"><span class="ph-title">BRIDGE <em>LAB</em></span>' +
    '<div class="ph-sites"></div>' +
    '<span class="ph-score">Total score: <b>0</b></span>' +
    `<a class="ph-home" href="${home}">← labs</a></div>` +
    '<div class="ph-tools">' +
    '<button type="button" data-tool="poutre" class="tool on">Beam · 10</button>' +
    '<button type="button" data-tool="cable" class="tool">Cable · 5</button>' +
    '<button type="button" data-tool="gomme" class="tool">Eraser</button>' +
    '<button type="button" class="go">TEST</button>' +
    '<button type="button" class="fix">Repair</button>' +
    '<button type="button" class="warn clear">Clear all</button>' +
    '<div class="ph-budget"></div></div>' +
    '<div class="ph-right">' +
    '<details open><summary>LAWS</summary><div class="ph-laws"></div></details>' +
    '<details><summary>GHOST</summary><div class="ph-ghost"></div></details>' +
    '<details><summary>LOG</summary><div class="ph-journal"></div></details>' +
    "</div>" +
    '<div class="ph-hint"></div>';
  host.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const sitesEl = $(".ph-sites");
  const scoreEl = $(".ph-score b");
  const budgetEl = $(".ph-budget");
  const hintEl = $(".ph-hint");
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
  root.querySelector(".go").addEventListener("click", () => ctx.test());
  root.querySelector(".fix").addEventListener("click", () => ctx.repair());
  root.querySelector(".clear").addEventListener("click", () => ctx.clearAll());
  // Laws with catalog notices.
  const lawBoxes = [];
  ctx.config.laws.forEach((entry, i) => {
    const mod = ctx.catalog.laws[entry.law];
    const label = mod ? mod.notice.label : entry.law;
    const row = document.createElement("div");
    row.className = "ph-law";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = ctx.isActive("laws", `${entry.law}#${i}`);
    box.setAttribute("aria-label", `Enable ${label}`);
    box.addEventListener("change", () => ctx.setActive("laws", `${entry.law}#${i}`, box.checked));
    const nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = label;
    row.appendChild(box);
    row.appendChild(nm);
    if (mod && mod.notice) {
      const ib = document.createElement("button");
      ib.type = "button";
      ib.className = "ib";
      ib.textContent = "i";
      ib.setAttribute("aria-label", `About ${label}`);
      const nb = document.createElement("div");
      nb.className = "ph-notice";
      nb.innerHTML = `<b>${label}</b><br>Rule: ${mod.notice.formule}<br>Sources: ${mod.notice.sources}<br>Limits: ${mod.notice.limites}`;
      ib.addEventListener("click", () => nb.classList.toggle("open"));
      row.appendChild(ib);
      lawsEl.appendChild(row);
      lawsEl.appendChild(nb);
    } else {
      lawsEl.appendChild(row);
    }
    lawBoxes.push({ box, key: `${entry.law}#${i}` });
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
    input.addEventListener("input", () => set(parseFloat(input.value)));
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
  const poidsSlider = slider("Weight (t) — ghost size", 8, 40, 1,
    () => chargeParams()[0].poids,
    (v) => chargeParams().forEach((p) => { p.poids = v; }));
  const vitesseSlider = slider("Speed", 2, 12, 1,
    () => chargeParams()[0].vitesse,
    (v) => chargeParams().forEach((p) => { p.vitesse = v; }));
  // Journal: prompts + entries + note input.
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
    if (e.target.closest("input, textarea, select")) return;
    if (e.key === " ") {
      if (e.target.closest("button")) return;
      e.preventDefault();
      ctx.test();
    } else if (e.key === "Enter") {
      if (e.target.closest("button")) return;
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
    }
  });

  let lastJournalLen = -1;
  let lastHint = "";
  let lastTop = "";
  function siteLabel(id) {
    const s = ctx.config.sites.find((x) => x.id === id);
    return s ? s.label : id;
  }
  function refresh(force) {
    const w = ctx.worlds[ctx.activeId()].world;
    const top = `${ctx.activeId()}|${ctx.totalScore()}|${w.spent()}|${w.budget()}|${ctx.tool}|${JSON.stringify(ctx.save.cleared)}`;
    if (force || top !== lastTop) {
      lastTop = top;
      for (const s of ctx.config.sites) {
        const b = siteBtns[s.id];
        const star = ctx.save.cleared[s.id] ? ' <span class="star">★</span>' : "";
        b.innerHTML = `${s.label}${star}`;
        b.classList.toggle("on", s.id === ctx.activeId());
      }
      scoreEl.textContent = String(ctx.totalScore());
      budgetEl.innerHTML = `Budget: <b>${w.spent()} / ${w.budget()}</b>`;
      root.querySelectorAll("button.tool").forEach((b) => {
        b.classList.toggle("on", b.dataset.tool === ctx.tool);
      });
      for (const { box, key } of lawBoxes) {
        box.checked = ctx.isActive("laws", key);
      }
      poidsSlider.sync();
      vitesseSlider.sync();
    }
    if (force || ctx.message !== lastHint) {
      lastHint = ctx.message;
      hintEl.textContent = ctx.message;
    }
    if (force || ctx.save.journal.length !== lastJournalLen) {
      lastJournalLen = ctx.save.journal.length;
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
      if (ctx.save.journal.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Tested trials will appear here.";
        entries.appendChild(li);
      }
    }
  }
  refresh(true);
  return { refresh };
}

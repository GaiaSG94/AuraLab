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

import { CH_CSS } from "./hud-css.js";


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
      card.innerHTML = `<div class="ch-wh"><p class="ch-cap">${chEsc(m.label)}</p><span class="ch-eq" hidden>equivalence</span><span class="ch-mut lab"></span></div>` +
        `<p class="ch-num ch-mid"><span class="v">0</span>${unit}</p>` +
        '<div class="ch-phb"><u></u></div><div class="ch-phl"><span>acid</span><span>basic</span></div>';
    } else if (m.source === "volume") {
      card.innerHTML = `<div class="ch-wh"><p class="ch-cap">${chEsc(m.label)}</p><span class="ch-mut of">of 500 ${chEsc(m.unit || "")}</span></div>` +
        `<p class="ch-num ch-mid"><span class="v">0</span>${unit}</p><div class="ch-vb"><i></i></div>`;
    } else if (m.source === "precipite") {
      card.innerHTML = `<div class="ch-wh"><p class="ch-cap">${chEsc(m.label)}</p><span class="ch-mut sw" hidden></span></div>` +
        `<p class="ch-num ch-mid"><span class="v">0</span>${unit}</p>`;
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

  // Knobs sheet: config sliders + the burner switch + the burette buttons.
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
    if (state.material.burette) {
      const b = document.createElement("div");
      b.className = "ch-bur";
      b.innerHTML =
        '<button type="button" class="ink" data-ml="1">+1 mL</button>' +
        '<button type="button" data-ml="5">+5 mL</button>' +
        '<button type="button" data-ml="drain">Drain</button>' +
        '<small>NaOH 0.1 M</small>';
      b.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const ml = btn.dataset.ml;
          if (ml === "drain") ctx.drainBurette();
          else ctx.dispense(Number(ml));
        });
      });
      s.appendChild(b);
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
    const el = add(`<div class="ch-gx ch-pill ch-bl"><span></span><small></small><button type="button" class="minus" aria-label="Take one dose back">&#8722;</button><button type="button">${chIcon("plus")}</button></div>`);
    el.style.setProperty("--c", s.color);
    el.querySelector("span").textContent = view.shortName(s.label);
    const btn = el.querySelector("button:not(.minus)");
    btn.setAttribute("aria-label", `Pour one dose of ${s.label}`);
    btn.addEventListener("click", () => ctx.addDose(s.id));
    el.querySelector("button.minus").addEventListener("click", () => ctx.removeDose(s.id));
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
  const fmt = (v, src) =>
    src === "volume" ? String(Math.round(v)) :
    src === "precipite" ? v.toFixed(3) :
    (Math.round(v * 10) / 10).toFixed(1);
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
        c.card.querySelector(".ch-eq").hidden = !ctx.world.eqPoint;
      } else if (c.m.source === "volume") {
        c.card.querySelector(".ch-vb i").style.width = `${Math.min(100, (v / 500) * 100).toFixed(1)}%`;
      } else if (c.m.source === "precipite") {
        const sw = c.card.querySelector(".sw");
        const hex = ctx.world.precipiteColor;
        sw.hidden = !(hex && v > 0);
        if (hex) {
          sw.textContent = hex === "#0ea5e9" ? "Cu(OH)2" : "AgCl";
          sw.style.color = hex === "#f1f5f9" ? "#475569" : hex;
        }
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

// Chemistry HUD (design C4 "blown glass"): frosted-glass panels floating on the page colour
// over the 3D bench. Top: brand + home. Left: substances and the instruments the student
// selects. Right: the measures of the selected instruments. Bottom: time + status + notebook
// + Measure.
import "../../core/ghost.js"; // side effect: window.AuraGhost (flask ghost logo)

import { chIcon, chEsc, CH_INSTRUMENTS } from "./hud-shared.js";
import { buildLeftColumn } from "./hud-left.js";


import { CH_CSS } from "./hud-css.js";


export function buildChemHud(host, ctx, view) {
  if (!document.getElementById("ch-style")) {
    const st = document.createElement("style");
    st.id = "ch-style";
    st.textContent = CH_CSS;
    document.head.appendChild(st);
  }
  const { config, world } = ctx;
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

  // Top: brand, home.
  const brand = add('<div class="ch-brand"><span class="ch-logo"></span><b></b></div>');
  brand.querySelector("b").textContent = String(config.lab.title || "lab").toLowerCase();
  if (window.AuraGhost) window.AuraGhost.mount(brand.querySelector(".ch-logo"), "white");
  const home = add(`<a class="ch-gx ch-pill ch-home">${chIcon("back")}<span>all labs</span></a>`);
  home.setAttribute("href", config.lab.home || "../index.html");

  // Right column: measures.
  const side = add('<div class="ch-side"></div>');
  const widgets = document.createElement("div");
  widgets.className = "ch-widgets";
  side.appendChild(widgets);
  const panes = { lab: widgets };
  const sheet = (id) => {
    const s = document.createElement("section");
    s.className = "ch-gx ch-card ch-sheet";
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

  // Controls live in the left instrument list now.

  let renderBook = () => {};
  if (config.notebook.enabled) {
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

  let nbBtn = null;
  function select(id) {
    ctx.tab = id;
    const notebookOpen = id === "notebook" && panes.notebook;
    if (notebookOpen) {
      widgets.hidden = true;
      panes.notebook.hidden = false;
      side.classList.add("sheet");
      renderBook();
    } else {
      widgets.hidden = false;
      if (panes.notebook) panes.notebook.hidden = true;
      side.classList.remove("sheet");
    }
    if (nbBtn) nbBtn.classList.toggle("on", notebookOpen);
  }
  select("lab");

  // Left column: substances, instruments and laws (the bench list).
  const left = buildLeftColumn({ add, config, ctx });
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
    '<span class="ch-sep"></span><p class="ch-stat" role="status" aria-live="polite"><span class="dots"></span><span class="txt"></span></p>' +
    '<button type="button" class="ch-measure"><i></i>Measure</button>';
  const playBtn = bar.querySelector(".play");
  const stepBtn = bar.querySelector(".step");
  const dotsEl = bar.querySelector(".dots");
  const statEl = bar.querySelector(".txt");
  playBtn.addEventListener("click", () => ctx.togglePause());
  bar.querySelector(".empty").addEventListener("click", () => ctx.emptyFlask());
  stepBtn.addEventListener("click", () => ctx.stepOnce());
  nbBtn = bar.querySelector(".notebook");
  nbBtn.addEventListener("click", () => {
    select(ctx.tab === "notebook" ? "lab" : "notebook");
  });
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
    const top = Math.max(brand.getBoundingClientRect().bottom, home.getBoundingClientRect().bottom) - r.top + 14;
    const sideOnRight = sb.left - r.left > r.width / 2;
    const right = sideOnRight ? r.right - sb.left + 16 : 16;
    // An open sheet grows over the scene on small screens: frame for the 150px strip only.
    const bottom = r.bottom - Math.min(bb.top, sideOnRight ? bb.top : Math.max(sb.top, sb.bottom - 150)) + 10;
    const lb = left.element.getBoundingClientRect();
    const leftInset = lb.width > 0 && lb.left - r.left < r.width / 2 ? lb.right - r.left + 16 : 16;
    return { top, right, bottom, left: Math.max(r.width > 900 ? 24 : 16, leftInset) };
  }
  // Place the flask tag on its 3D anchor (after every camera fit).
  function layout() {
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
    // Measures follow the instruments selected on the left: a deselected
    // instrument loses its card (and its 3D object via ctx.setInstrument).
    for (const c of cards) {
      const def = CH_INSTRUMENTS.find((i) => i.metric === c.m.source);
      c.card.hidden = !!(def && !ctx.instrumentActive(def));
    }
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
    left.refresh();
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
    if (count !== lastBadge) lastBadge = count;
  }
  refresh();
  return { refresh, layout, insets, select, renderBook };
}

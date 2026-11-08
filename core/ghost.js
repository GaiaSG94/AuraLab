// AuraLab core — the flask ghost (logo + notebook guide).
// Classic script on purpose (no import/export): the portal loads it with a
// plain <script src>, the shell imports it for its side effect, and the
// standalone build inlines it as is. Exposes window.AuraGhost.mount(host, theme).
(function () {
  if (typeof window === "undefined" || window.AuraGhost) return;

  const BODY =
    "M41 22 H59 V36 Q81 45 81 68 V86 Q75.8 80 70.7 86 Q65.5 92 60.3 86 Q55.2 80 50 86 " +
    "Q44.8 92 39.7 86 Q34.5 80 29.3 86 Q24.2 92 19 86 V68 Q19 45 41 36 Z";
  const THEMES = {
    white: { body: "#fbf8ff", eye: "#17141f", hl: "#fbf8ff", bub: "#17141f", cheek: "#ff8a3d" },
    ink: { body: "#17141f", eye: "#fbf8ff", hl: "#17141f", bub: "#fbf8ff", cheek: "#ff8a3d" },
    inkpaper: { body: "#17141f", eye: "#fbf8ff", hl: "#17141f", bub: "#ff8a3d", cheek: "#ff8a3d" },
  };
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ghosts = [];
  let started = false;

  const style = document.createElement("style");
  style.textContent =
    ".aura-ghost{display:block}.aura-ghost svg{display:block;width:100%;height:auto;overflow:visible}" +
    ".aura-ghost .happy{display:none}.aura-ghost.joy .pupil,.aura-ghost.joy .hl{display:none}.aura-ghost.joy .happy{display:inline}" +
    ".aura-ghost .pupil{transform-box:fill-box;transform-origin:center;animation:aura-blink 6s infinite}" +
    "@keyframes aura-blink{0%,95%,100%{transform:scaleY(1)}97.5%{transform:scaleY(.08)}}" +
    "@media (prefers-reduced-motion: reduce){.aura-ghost .pupil{animation:none}}";
  document.head.appendChild(style);

  function eye(cx, t) {
    return `<g><ellipse class="pupil" cx="${cx}" cy="62" rx="5.2" ry="6.9" fill="${t.eye}"/>` +
      `<g class="hlg"><circle class="hl" cx="${cx - 1.6}" cy="59.4" r="1.6" fill="${t.hl}"/>` +
      `<circle class="hl" cx="${cx + 1.7}" cy="64.8" r=".75" fill="${t.hl}"/></g></g>`;
  }

  function svg(t) {
    return `<svg viewBox="0 0 100 100" aria-hidden="true">` +
      `<rect x="36" y="18" width="28" height="6" rx="3" fill="${t.body}"/><path d="${BODY}" fill="${t.body}"/>` +
      `<ellipse cx="31.5" cy="71" rx="4.6" ry="2.6" fill="${t.cheek}" opacity=".6"/>` +
      `<ellipse cx="68.5" cy="71" rx="4.6" ry="2.6" fill="${t.cheek}" opacity=".6"/>` +
      `<path d="M46.5 71.5 Q50 75 53.5 71.5" fill="none" stroke="${t.eye}" stroke-width="1.7" stroke-linecap="round"/>` +
      `<g class="eyes">${eye(41, t)}${eye(59, t)}` +
      `<path class="happy" d="M36.8 64 Q41 57.6 45.2 64 M54.8 64 Q59 57.6 63.2 64" fill="none" stroke="${t.eye}" stroke-width="2.6" stroke-linecap="round"/></g>` +
      `<g class="bubl"></g></svg>`;
  }

  // Eyes follow the pointer; hovering the ghost closes its eyes (^ ^).
  function onPointer(ev) {
    for (const g of ghosts) {
      const r = g.host.getBoundingClientRect();
      if (!r.width) continue;
      const dx = ev.clientX - (r.left + r.width / 2);
      const dy = ev.clientY - (r.top + r.height * 0.6);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 260);
      g.tx = (dx / d) * 3.2 * k;
      g.ty = (dy / d) * 2.6 * k;
      g.host.classList.toggle("joy", ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom);
    }
  }

  // Bubbles rise from the flask neck, sway, then pop.
  function update(g, dt) {
    if (!reduce) {
      const sm = Math.min(1, dt * 9);
      g.ex += (g.tx - g.ex) * sm;
      g.ey += (g.ty - g.ey) * sm;
    }
    g.eyes.setAttribute("transform", `translate(${g.ex.toFixed(2)} ${g.ey.toFixed(2)})`);
    g.hls.forEach((h) => h.setAttribute("transform", `translate(${(-g.ex * 0.55).toFixed(2)} ${(-g.ey * 0.55).toFixed(2)})`));
    if (reduce) return;
    g.next -= dt;
    if (g.next <= 0 && g.bubs.length < 4) {
      g.bubs.push({ x: 47 + Math.random() * 6, y: 40, r: 0.9, R: 2.4 + Math.random() * 1.8, vy: -(13 + Math.random() * 6), ph: Math.random() * 6.28, life: 0, max: 1.7 + Math.random() * 0.6, pop: 0, px: 0 });
      g.next = 0.6 + Math.random() * 0.9;
    }
    let out = "";
    g.bubs = g.bubs.filter((b) => {
      b.life += dt;
      if (!b.pop) {
        b.y += b.vy * dt;
        b.r += (b.R - b.r) * Math.min(1, dt * 1.6);
        const x = b.x + (b.y < 20 ? Math.sin(b.life * 4 + b.ph) * (20 - b.y) * 0.12 : 0);
        if (b.life <= b.max) {
          out += `<circle cx="${x.toFixed(2)}" cy="${b.y.toFixed(2)}" r="${b.r.toFixed(2)}" fill="${g.col}"/>`;
          return true;
        }
        b.pop = 0.001;
        b.px = x;
      }
      b.pop += dt;
      if (b.pop > 0.3) return false;
      const k = b.pop / 0.3;
      out += `<circle cx="${b.px.toFixed(2)}" cy="${b.y.toFixed(2)}" r="${(b.r * (1 + k * 1.2)).toFixed(2)}" fill="none" stroke="${g.col}" stroke-width="${(1 - k * 0.8).toFixed(2)}" opacity="${(1 - k).toFixed(2)}"/>`;
      return true;
    });
    g.bubl.innerHTML = out;
  }

  let last = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    for (let i = ghosts.length - 1; i >= 0; i--) {
      if (!ghosts[i].host.isConnected) ghosts.splice(i, 1);
      else update(ghosts[i], dt);
    }
    requestAnimationFrame(frame);
  }

  function mount(host, themeName) {
    const t = THEMES[themeName] || THEMES.white;
    host.classList.add("aura-ghost");
    host.innerHTML = svg(t);
    const s = host.querySelector("svg");
    const g = {
      host, col: t.bub, eyes: s.querySelector(".eyes"), hls: [...s.querySelectorAll(".hlg")],
      bubl: s.querySelector(".bubl"), tx: 0, ty: 0, ex: 0, ey: 0, bubs: [], next: Math.random(),
    };
    if (reduce) g.bubl.innerHTML = `<circle cx="54" cy="12" r="3" fill="${t.bub}"/>`;
    ghosts.push(g);
    if (!started) {
      started = true;
      window.addEventListener("pointermove", onPointer);
      requestAnimationFrame(frame);
    }
    return host;
  }

  window.AuraGhost = { mount };
})();

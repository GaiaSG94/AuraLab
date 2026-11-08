// Ponts map view (Three.js via global THREE): fullscreen dusk valley with one river
// site per config entry, per-site bridge dynamics, orbit camera. No imports:
// vendor/three.min.js (modular) or the inlined bundle (standalone) provides window.THREE.
export function buildMapView(host, ctx) {
  const THREE = window.THREE;
  if (!THREE) throw new Error("THREE missing: load vendor/three.min.js first");

  const SKY = 0x1b2452;
  const RED = new THREE.Color(0xef4444);
  const BEAM = new THREE.Color(0xc7d2e8);
  const CABLE = new THREE.Color(0x7d8aa5);
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sites = ctx.config.sites;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 60, 150);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 600);

  scene.add(new THREE.HemisphereLight(0x8fb7ff, 0x3a2e1f, 0.85));
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -38; sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 38; sun.shadow.camera.bottom = -38;
  sun.shadow.camera.near = 5; sun.shadow.camera.far = 130;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  const lambert = (color) => new THREE.MeshLambertMaterial({ color });
  function mulberry(seed) {
    let a = seed;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry(20261108);

  // Site layout along X.
  const siteX = {};
  sites.forEach((s, i) => { siteX[s.id] = (i - (sites.length - 1) / 2) * 75; });
  const halfOf = (id) => ctx.worlds[id].world.half;

  // Ground: vertex-colored (grass, sand near rivers, rock far), dipped riverbeds.
  const groundGeo = new THREE.PlaneGeometry(300, 130, 75, 32);
  groundGeo.rotateX(-Math.PI / 2);
  {
    const pos = groundGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grass = new THREE.Color(0x4d7c0f);
    const sand = new THREE.Color(0xb59a6a);
    const rock = new THREE.Color(0x55606e);
    const tmp = new THREE.Color();
    const smooth = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let bed = 0; // 1 = riverbed
      for (const s of sites) {
        const dx = Math.abs(x - siteX[s.id]);
        const waterHalf = halfOf(s.id) + 1;
        bed = Math.max(bed, 1 - smooth(waterHalf, waterHalf + 8, dx));
      }
      pos.setY(i, -11 * bed + (bed > 0.02 ? 0 : rnd() * 0.5));
      const far = smooth(95, 140, Math.abs(x));
      tmp.copy(grass).lerp(sand, bed * 0.9).lerp(rock, far * 0.8);
      const v = 0.92 + rnd() * 0.16;
      colors[i * 3] = tmp.r * v; colors[i * 3 + 1] = tmp.g * v; colors[i * 3 + 2] = tmp.b * v;
    }
    groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);

  // Rivers (animated water strips, one per site).
  const waters = [];
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x1e5f9e, specular: 0xaad4ff, shininess: 140, transparent: true, opacity: 0.93,
  });
  for (const s of sites) {
    const half = halfOf(s.id);
    const g = new THREE.PlaneGeometry((half + 1) * 2, 34, 14, 6);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, waterMat);
    m.position.set(siteX[s.id], -10, 0);
    m.receiveShadow = true;
    scene.add(m);
    waters.push({ geo: g, base: g.attributes.position.array.slice() });
  }

  // Dressing: rocks, pines, hills, clouds, stars.
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = lambert(0x6b7280);
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2, 6);
  const trunkMat = lambert(0x5b4a33);
  const pineGeo = new THREE.ConeGeometry(1.8, 5, 8);
  const pineMat = lambert(0x2f5d33);
  function onLand(x, z) {
    if (Math.abs(x) > 135 || Math.abs(z) > 55) return false;
    for (const s of sites) {
      if (Math.abs(x - siteX[s.id]) < halfOf(s.id) + 10 && Math.abs(z) < 24) return false;
    }
    return true;
  }
  for (let i = 0; i < 14; i++) {
    const x = (rnd() - 0.5) * 260;
    const z = (rnd() - 0.5) * 100;
    if (!onLand(x, z)) continue;
    const r = new THREE.Mesh(rockGeo, rockMat);
    r.position.set(x, -0.4, z);
    r.scale.setScalar(0.8 + rnd() * 2.2);
    r.rotation.y = rnd() * 6.28;
    r.castShadow = true; r.receiveShadow = true;
    scene.add(r);
  }
  for (let i = 0; i < 18; i++) {
    const x = (rnd() - 0.5) * 260;
    const z = (rnd() - 0.5) * 100;
    if (!onLand(x, z)) continue;
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1;
    const pine = new THREE.Mesh(pineGeo, pineMat);
    pine.position.y = 5;
    pine.castShadow = true;
    g.add(trunk); g.add(pine);
    g.position.set(x, 0, z);
    g.scale.setScalar(0.8 + rnd() * 0.9);
    scene.add(g);
  }
  const hillMat = lambert(0x24355a);
  for (const [hx, hz, hs] of [[-120, -70, 40], [-40, -85, 55], [50, -75, 45], [120, -60, 35], [0, 70, 50]]) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(hs, 12, 8), hillMat);
    hill.position.set(hx, -hs * 0.72, hz);
    hill.scale.y = 0.5;
    scene.add(hill);
  }
  const clouds = [];
  const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
  const cloudMat = lambert(0xe8eefc);
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const n = 2 + (i % 3);
    for (let k = 0; k < n; k++) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      puff.position.set(k * 3.2, (k % 2) * 1.2, 0);
      puff.scale.set(4.5, 1.6, 2.4);
      g.add(puff);
    }
    g.position.set(-110 + i * 44, 20 + (i % 3) * 3, -30 - (i % 2) * 18);
    scene.add(g);
    clouds.push({ g, speed: 0.3 + (i % 3) * 0.15 });
  }
  {
    const starGeo = new THREE.BufferGeometry();
    const pts = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      pts[i * 3] = (rnd() - 0.5) * 400;
      pts[i * 3 + 1] = 40 + rnd() * 120;
      pts[i * 3 + 2] = -60 - rnd() * 120;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.4, sizeAttenuation: false })));
  }

  // Per-site statics: abutments, towers, deck guide, ROAD label.
  function box(w, h, d, color, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function routeSprite() {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 64;
    const c = cv.getContext("2d");
    c.font = "700 34px system-ui, sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#dbeafe";
    c.fillText("— ROAD —", 128, 34);
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false }));
    sp.scale.set(15, 3.75, 1);
    return sp;
  }
  const siteGroups = {};
  for (const s of sites) {
    const half = halfOf(s.id);
    const g = new THREE.Group();
    g.position.x = siteX[s.id];
    scene.add(g);
    const abW = 2.5 + half * 0.18;
    const abD = 4 + half * 0.2;
    box(abW, 12, abD, 0x9ca3af, -(half + abW / 2 + 0.5), -6, 0, g);
    box(abW, 12, abD, 0x9ca3af, half + abW / 2 + 0.5, -6, 0, g);
    for (const tx of [-half / 2, half / 2]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 16, 10), lambert(0x8a94a0));
      tower.position.set(tx, 0, 0);
      tower.castShadow = true;
      g.add(tower);
      box(0.9, 0.9, 5, 0x8a94a0, tx, 8, 0, g);
      box(3, 2, 3, 0x9ca3af, tx, -9, 0, g);
    }
    // Deck guide: dashed line along the road row.
    const world = ctx.worlds[s.id].world;
    const guidePts = [];
    for (let i = 0; i < world.deckCount; i++) guidePts.push(new THREE.Vector3(world.nodes[i].rx, 0.15, 0));
    const guideGeo = new THREE.BufferGeometry().setFromPoints(guidePts);
    const guide = new THREE.Line(guideGeo, new THREE.LineDashedMaterial({
      color: 0x67e8f9, transparent: true, opacity: 0.9, dashSize: 1.2, gapSize: 0.7,
    }));
    guide.computeLineDistances();
    g.add(guide);
    const tag = routeSprite();
    tag.position.set(0, 10.5, 0);
    g.add(tag);
    siteGroups[s.id] = g;
  }

  // Per-site dynamics (nodes, sticks, road). Only the active site animates.
  const nodeGeo = new THREE.SphereGeometry(0.5, 12, 10);
  const hitGeo = new THREE.SphereGeometry(1.3, 8, 6);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  hitMat.colorWrite = false;
  const beamGeo = new THREE.BoxGeometry(1, 0.45, 0.45);
  const cableGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 6);
  const roadGeo = new THREE.BoxGeometry(1, 0.14, 2.0);
  const roadMat = lambert(0x3f3f46);
  const dyn = {};
  const BASE_EMISSIVE = { fixed: 0x000000, deck: 0x0e7490, top: 0x554400 };
  const BASE_COLOR = { fixed: 0x94a3b8, deck: 0x67e8f9, top: 0xf5d76e };
  function nodeKind(n) {
    if (n.fixed) return "fixed";
    return n.deck ? "deck" : "top";
  }
  function clearSite(id) {
    const d = dyn[id];
    if (!d) return;
    for (const m of [...d.nodes, ...d.sticks]) {
      if (m.material && m.material.dispose) m.material.dispose();
    }
    d.group.clear();
    dyn[id] = null;
  }
  function buildSite(id) {
    clearSite(id);
    const world = ctx.worlds[id].world;
    const group = new THREE.Group();
    siteGroups[id].add(group);
    const d = { group, nodes: [], hits: [], sticks: [], roads: [], version: world.version };
    world.nodes.forEach((n, i) => {
      const kind = nodeKind(n);
      const m = new THREE.Mesh(nodeGeo, new THREE.MeshLambertMaterial({
        color: BASE_COLOR[kind], emissive: BASE_EMISSIVE[kind],
      }));
      m.castShadow = true;
      m.userData.index = i;
      m.userData.kind = kind;
      m.position.set(n.x, n.y, 0);
      group.add(m);
      d.nodes.push(m);
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.userData.index = i;
      hit.position.set(n.x, n.y, 0);
      group.add(hit);
      d.hits.push(hit);
    });
    world.sticks.forEach((s, i) => {
      const m = new THREE.Mesh(
        s.type === "poutre" ? beamGeo : cableGeo,
        new THREE.MeshLambertMaterial({ color: (s.type === "poutre" ? BEAM : CABLE).clone() })
      );
      m.castShadow = true;
      m.userData.stick = i;
      group.add(m);
      d.sticks.push(m);
      const A = world.nodes[s.a];
      const B = world.nodes[s.b];
      if (A.deck && B.deck) {
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.userData.stick = i;
        group.add(road);
        d.roads.push(road);
      }
    });
    dyn[id] = d;
    updateSite(id);
  }
  const tmpC = new THREE.Color();
  function placeBeam(mesh, A, B) {
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    mesh.position.set((A.x + B.x) / 2, (A.y + B.y) / 2, 0);
    mesh.rotation.z = Math.atan2(B.y - A.y, B.x - A.x);
    mesh.scale.set(Math.max(0.01, len), 1, 1);
  }
  function updateSite(id) {
    const world = ctx.worlds[id].world;
    const d = dyn[id];
    if (!d) return;
    const isActive = id === ctx.activeId();
    for (let i = 0; i < d.nodes.length; i++) {
      const n = world.nodes[i];
      d.nodes[i].position.set(n.x, n.y, 0);
      d.hits[i].position.set(n.x, n.y, 0);
      if (isActive) {
        const mat = d.nodes[i].material;
        if (i === ctx.selected) {
          mat.emissive.setHex(0xff8800);
          const s = 1 + Math.sin(t * 6) * 0.15;
          d.nodes[i].scale.set(s, s, s);
        } else {
          const kind = d.nodes[i].userData.kind;
          mat.emissive.setHex(i === hovered ? 0x886600 : BASE_EMISSIVE[kind]);
          d.nodes[i].scale.set(1, 1, 1);
        }
      }
    }
    for (let i = 0; i < d.sticks.length; i++) {
      const s = world.sticks[i];
      const mesh = d.sticks[i];
      mesh.visible = !s.broken;
      if (!s.broken) {
        placeBeam(mesh, world.nodes[s.a], world.nodes[s.b]);
        tmpC.copy(s.type === "poutre" ? BEAM : CABLE).lerp(RED, Math.min(1, s.strain || 0));
        mesh.material.color.copy(tmpC);
      }
    }
    for (const road of d.roads) {
      const s = world.sticks[road.userData.stick];
      road.visible = s && !s.broken;
      if (road.visible) {
        const A = world.nodes[s.a];
        const B = world.nodes[s.b];
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        road.position.set((A.x + B.x) / 2, (A.y + B.y) / 2 + 0.32, 0);
        road.rotation.z = Math.atan2(B.y - A.y, B.x - A.x);
        road.scale.set(Math.max(0.01, len), 1, 1);
      }
    }
  }
  let t = 0;
  let hovered = -1;
  for (const s of sites) buildSite(s.id);

  // Test ghost (single, follows the active site).
  const ghost = new THREE.Group();
  const ghostMat = new THREE.MeshLambertMaterial({
    color: 0xf8fafc, emissive: 0x3d3d5c, transparent: true, opacity: 0.96,
  });
  const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), ghostMat);
  gHead.position.y = 1.5;
  gHead.castShadow = true;
  ghost.add(gHead);
  const gBody = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 1.6, 16), ghostMat);
  gBody.position.y = 0.5;
  gBody.castShadow = true;
  ghost.add(gBody);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111122 });
  for (const ex of [-0.32, 0.32]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), eyeMat);
    eye.position.set(ex, 1.6, 0.78);
    ghost.add(eye);
  }
  scene.add(ghost);
  function chargePoids() {
    const w = ctx.worlds[ctx.activeId()];
    const law = w.laws.find((l) => l.mod.id === "charge-flottante");
    return (law && law.params.poids) || 20;
  }

  // Camera: orbit around the active site, animated transitions.
  const orbit = { theta: 0.6, phi: 1.12, radius: 47, tx: siteX[ctx.activeId()], ty: 0.5 };
  let camAnim = null;
  function radiusFor(id) {
    return 26 + ctx.worlds[id].world.half * 2 * 0.5;
  }
  function updateCamera() {
    const { theta, phi, radius, tx, ty } = orbit;
    camera.position.set(
      tx + radius * Math.sin(phi) * Math.sin(theta),
      ty + radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(tx, ty, 0);
    sun.position.set(tx + 28, 42, 24);
    sun.target.position.set(tx, 0, 0);
    sun.target.updateMatrixWorld();
  }
  orbit.radius = radiusFor(ctx.activeId());
  updateCamera();

  // Picking + orbit.
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let downAt = null;
  let dragged = false;
  function setPtr(e) {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }
  function pickNode(e) {
    setPtr(e);
    ray.setFromCamera(ptr, camera);
    const d = dyn[ctx.activeId()];
    if (!d) return -1;
    const hits = ray.intersectObjects(d.hits, false);
    return hits.length > 0 ? hits[0].object.userData.index : -1;
  }
  canvas.addEventListener("pointerdown", (e) => {
    downAt = { x: e.clientX, y: e.clientY };
    dragged = false;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (downAt) {
      const dx = e.clientX - downAt.x;
      const dy = e.clientY - downAt.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) dragged = true;
      if (dragged) {
        orbit.theta -= (e.movementX || 0) * 0.005;
        orbit.phi = Math.min(1.4, Math.max(0.2, orbit.phi - (e.movementY || 0) * 0.005));
        updateCamera();
        return;
      }
    }
    hovered = pickNode(e);
    canvas.style.cursor = hovered >= 0 ? "pointer" : "grab";
  });
  canvas.addEventListener("pointerup", (e) => {
    const wasDrag = dragged;
    downAt = null;
    dragged = false;
    if (wasDrag) return;
    const i = pickNode(e);
    if (i < 0) {
      ctx.selected = -1;
      return;
    }
    if (ctx.tool === "gomme") {
      ctx.eraseNode(i);
      return;
    }
    if (ctx.selected < 0) {
      ctx.selected = i;
      ctx.announce("Premier nœud choisi… clique le second.");
      return;
    }
    ctx.place(ctx.selected, i);
    ctx.selected = -1;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    orbit.radius = Math.min(110, Math.max(20, orbit.radius * (1 + e.deltaY * 0.001)));
    updateCamera();
  }, { passive: false });

  // Resize follows the host box.
  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    renderer.setSize(r.width, r.height, false);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host);
  else window.addEventListener("resize", resize);
  resize();

  function render(dt) {
    if (!REDUCED) t += dt;
    const id = ctx.activeId();
    const w = ctx.worlds[id].world;
    if (!dyn[id] || dyn[id].version !== w.version) buildSite(id);
    updateSite(id);
    // Ghost.
    const gs = 0.7 + (chargePoids() / 40) * 0.9;
    ghost.scale.set(gs, gs, gs);
    const gh = w.ghost;
    const bob = REDUCED ? 0 : Math.sin(t * (w.testing ? 3 : 2)) * (w.testing ? 0.15 : 0.25);
    if (!w.testing && w.statut === -1) {
      ghost.position.set(siteX[id] - w.half - 2, 1.8 + bob, 0);
      ghost.rotation.z = 0;
    } else {
      ghost.position.set(siteX[id] + gh.x, gh.y + bob, 0);
      ghost.rotation.z = -gh.tilt;
    }
    // Water + clouds drift.
    if (!REDUCED) {
      for (const wtr of waters) {
        const pos = wtr.geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const bx = wtr.base[i * 3];
          const bz = wtr.base[i * 3 + 2];
          pos.array[i * 3 + 1] = Math.sin(bx * 0.3 + t * 1.6) * 0.3 + Math.cos(bz * 0.4 + t * 1.1) * 0.2;
        }
        pos.needsUpdate = true;
        wtr.geo.computeVertexNormals();
      }
      for (const c of clouds) {
        c.g.position.x += c.speed * dt;
        if (c.g.position.x > 130) c.g.position.x = -130;
      }
    }
    // Camera transition.
    if (camAnim) {
      camAnim.t += dt / 0.9;
      const k = camAnim.t >= 1 ? 1 : camAnim.t * camAnim.t * (3 - 2 * camAnim.t);
      orbit.tx = camAnim.from.tx + (camAnim.to.tx - camAnim.from.tx) * k;
      orbit.radius = camAnim.from.r + (camAnim.to.r - camAnim.from.r) * k;
      updateCamera();
      if (camAnim.t >= 1) camAnim = null;
    }
    renderer.render(scene, camera);
  }

  function setSite(id) {
    camAnim = {
      t: 0,
      from: { tx: orbit.tx, r: orbit.radius },
      to: { tx: siteX[id], r: radiusFor(id) },
    };
  }

  return { render, setSite };
}

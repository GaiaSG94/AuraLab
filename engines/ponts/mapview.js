// Bridge map view (Three.js via global THREE): full-screen golden-hour valley, one river
// site per config entry, per-site bridge dynamics, orbit camera. No imports:
// vendor/three.min.js (modular) or the inlined bundle (standalone) provides window.THREE.
export function buildMapView(host, ctx) {
  const THREE = window.THREE;
  if (!THREE) throw new Error("THREE missing: load vendor/three.min.js first");
  // Hex colours are sRGB, lighting runs in linear space (same pipeline as the design boards).
  if (THREE.ColorManagement && "legacyMode" in THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

  const HORIZON = 0xffd6ad;
  const RED = new THREE.Color(0xef4444);
  const BEAM = new THREE.Color(0xf1e9da);
  const CABLE = new THREE.Color(0x2a2340);
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sites = ctx.config.sites;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(HORIZON, 80, 260);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1500);

  // Sky: gradient dome (no fog), warm low sun, cool sky fill.
  {
    const R = 600;
    const g = new THREE.SphereGeometry(R, 32, 24);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const zen = new THREE.Color(0x6d9cf0);
    const mid = new THREE.Color(0xb8d2ff);
    const hor = new THREE.Color(HORIZON);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const k = p.getY(i) / R;
      if (k <= 0) c.copy(hor);
      else if (k < 0.12) c.copy(hor).lerp(mid, k / 0.12);
      else c.copy(mid).lerp(zen, Math.min(1, (k - 0.12) / 0.5));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
  }
  scene.add(new THREE.HemisphereLight(0xd8e7ff, 0x7d8f50, 0.85));
  const sun = new THREE.DirectionalLight(0xffd09a, 1.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 5; sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

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
  const smooth = (a, b, x) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };

  // Site layout along X.
  const siteX = {};
  sites.forEach((s, i) => { siteX[s.id] = (i - (sites.length - 1) / 2) * 75; });
  const halfOf = (id) => ctx.worlds[id].world.half;
  const radiusFor = (id) => 30 + 1.4 * halfOf(id);
  const START = { theta: 0.6, phi: 1.25 };
  const BED = -7.5; // riverbed depth (visual)
  const WATER = -3.6; // water surface (visual)

  // Terrain: shallow riverbeds at each site (the physics floor stays at -10, under the
  // water: a falling ghost simply sinks out of sight), flat banks
  // around the bridges, rolling hills up the valley and on the far sides.
  const waterGap = (x) => {
    let d = Infinity;
    for (const s of sites) d = Math.min(d, Math.abs(x - siteX[s.id]) - halfOf(s.id));
    return d;
  };
  const bedAt = (x, z) => {
    let bed = 0;
    for (const s of sites) {
      const wh = halfOf(s.id) + 1;
      bed = Math.max(bed, 1 - smooth(wh, wh + 3.5, Math.abs(x - siteX[s.id])));
    }
    return bed * (1 - smooth(46, 62, Math.abs(z)));
  };
  const heightAt = (x, z) => {
    const bed = bedAt(x, z);
    const hills = smooth(28, 60, Math.abs(z)) * (6 + 3 * Math.sin(x * 0.06 + 1) + 2.5 * Math.cos(x * 0.11 + z * 0.05))
      + smooth(108, 150, Math.abs(x)) * 12;
    const bumps = 0.45 * Math.sin(x * 0.9 + z * 0.3) * Math.cos(z * 0.8 - x * 0.15) * smooth(10, 18, waterGap(x));
    return BED * bed + (1 - bed) * (hills + bumps);
  };
  {
    const g0 = new THREE.PlaneGeometry(300, 130, 150, 65);
    g0.rotateX(-Math.PI / 2);
    const p0 = g0.attributes.position;
    for (let i = 0; i < p0.count; i++) p0.setY(i, heightAt(p0.getX(i), p0.getZ(i)));
    const geo = g0.toNonIndexed();
    g0.dispose();
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const grass = [0x8fd063, 0x86c95a, 0x9ad66c, 0x80c257].map((h) => new THREE.Color(h));
    const sand = new THREE.Color(0xeedaa5);
    const wet = new THREE.Color(0xc4c290);
    const rock = new THREE.Color(0xc9bda8);
    const c = new THREE.Color();
    // One flat colour per facet: the low-poly look.
    for (let i = 0; i < p.count; i += 3) {
      const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
      const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
      const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
      if (y < WATER + 0.3) c.copy(wet);
      else if (bedAt(x, z) > 0.25 && y < 0.8) c.copy(sand);
      else if (y > 9 || Math.abs(x) > 130) c.copy(rock);
      else c.copy(grass[(rnd() * grass.length) | 0]);
      c.offsetHSL(0, 0, (rnd() - 0.5) * 0.035);
      for (let k = 0; k < 3; k++) {
        col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b;
      }
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // Rivers (animated water strips, one per site).
  const waters = [];
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x58b8ff, roughness: 0.14, metalness: 0.05, transparent: true, opacity: 0.9 });
  for (const s of sites) {
    const half = halfOf(s.id);
    const g = new THREE.PlaneGeometry((half + 4) * 2, 100, 18, 30);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, waterMat);
    m.position.set(siteX[s.id], WATER, 0);
    m.receiveShadow = true;
    scene.add(m);
    waters.push({ geo: g, base: g.attributes.position.array.slice() });
  }

  // Dressing: low-poly trees (instanced), rocks, far mountains, clouds.
  {
    const segDist = (px, pz, ax, az, bx, bz) => {
      const vx = bx - ax, vz = bz - az;
      const k = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
      return Math.hypot(px - ax - k * vx, pz - az - k * vz);
    };
    // Keep the default view of every bridge clear of trunks.
    const views = sites.map((s) => {
      const r = radiusFor(s.id);
      return [siteX[s.id] + r * Math.sin(START.phi) * Math.sin(START.theta), r * Math.sin(START.phi) * Math.cos(START.theta), siteX[s.id]];
    });
    const trees = [];
    for (let n = 0; n < 480 && trees.length < 170; n++) {
      const x = (rnd() - 0.5) * 290;
      const z = (rnd() - 0.5) * 124;
      const s = 0.8 + rnd() * 1.1;
      const round = rnd() > 0.72;
      const li = (rnd() * 4) | 0;
      const rot = rnd() * 6.283;
      if (bedAt(x, z) > 0.01 || waterGap(x) < 9) continue;
      if (Math.abs(z) < 26 && waterGap(x) < 18) continue;
      if (views.some(([cx, cz, tx]) => segDist(x, z, cx, cz, tx, 0) < 10 || Math.hypot(x - cx, z - cz) < 24)) continue;
      trees.push({ x, y: heightAt(x, z) - 0.15, z, s, round, li, rot });
    }
    const cone = new THREE.ConeGeometry(1, 1, 7); cone.translate(0, 0.5, 0);
    const stem = new THREE.CylinderGeometry(0.13, 0.18, 1, 6); stem.translate(0, 0.5, 0);
    const ball = new THREE.IcosahedronGeometry(1, 0);
    const leafMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, flatShading: true, roughness: 1 });
    const leaves = [0x3f9d4f, 0x52b25a, 0x2f8a46, 0x67bd5c].map((h) => new THREE.Color(h));
    const nRound = trees.filter((t) => t.round).length;
    const stems = new THREE.InstancedMesh(stem, woodMat, trees.length);
    const cones = new THREE.InstancedMesh(cone, leafMat, trees.length - nRound);
    const balls = new THREE.InstancedMesh(ball, leafMat, nRound);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    let ic = 0;
    let ib = 0;
    trees.forEach((t, i) => {
      q.setFromEuler(e.set(0, t.rot, 0));
      stems.setMatrixAt(i, m4.compose(v.set(t.x, t.y, t.z), q, sc.set(t.s, 0.9 * t.s, t.s)));
      if (t.round) {
        balls.setMatrixAt(ib, m4.compose(v.set(t.x, t.y + 1.7 * t.s, t.z), q, sc.setScalar(1.15 * t.s)));
        balls.setColorAt(ib++, leaves[t.li]);
      } else {
        cones.setMatrixAt(ic, m4.compose(v.set(t.x, t.y + 0.55 * t.s, t.z), q, sc.set(1.15 * t.s, 3 * t.s, 1.15 * t.s)));
        cones.setColorAt(ic++, leaves[t.li]);
      }
    });
    for (const im of [stems, cones, balls]) {
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false; // instances spread far from the geometry's own bounds
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      scene.add(im);
    }
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b8, flatShading: true, roughness: 1 });
    for (let i = 0, placed = 0; i < 60 && placed < 16; i++) {
      const x = (rnd() - 0.5) * 280;
      const z = (rnd() - 0.5) * 110;
      const s = 0.6 + rnd() * 1.6;
      if (bedAt(x, z) > 0.01 || waterGap(x) < 8 || (Math.abs(z) < 20 && waterGap(x) < 14)) continue;
      const r = new THREE.Mesh(rockGeo, rockMat);
      r.position.set(x, heightAt(x, z) - 0.2, z);
      r.scale.set(s, s * 0.7, s);
      r.rotation.y = rnd() * 6.28;
      r.castShadow = true; r.receiveShadow = true;
      scene.add(r);
      placed++;
    }
    // Hazy mountain ring beyond the valley (no fog: they read as distant silhouettes).
    const hazes = [0xf3dfc9, 0xeedac6, 0xe8d6c5].map((h) => new THREE.MeshStandardMaterial({ color: h, flatShading: true, roughness: 1, fog: false }));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rnd() * 0.2;
      const R = 300 + rnd() * 40;
      const h = 22 + rnd() * 22;
      const m = new THREE.Mesh(new THREE.ConeGeometry(60 + rnd() * 30, h, 5 + (i % 3), 1), hazes[i % 3]);
      m.position.set(Math.cos(a) * R * 1.25, h / 2 - 14, Math.sin(a) * R);
      m.rotation.y = rnd() * 6.28;
      scene.add(m);
    }
  }
  const clouds = [];
  {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe2c4, emissiveIntensity: 0.35, flatShading: true, roughness: 1, fog: false });
    const puff = [[0, 0, 0, 1.5], [1.6, -0.25, 0.2, 1.1], [-1.5, -0.35, -0.1, 1.05], [0.5, 0.6, -0.2, 1.05], [-0.4, 0.45, 0.5, 0.9]];
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (const [a, b, c, r] of puff) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(a, b, c);
        m.scale.setScalar(r);
        g.add(m);
      }
      g.position.set(-170 + i * 40 + rnd() * 10, 34 + rnd() * 14, -120 + rnd() * 160);
      g.scale.setScalar(3 + rnd() * 2.5);
      scene.add(g);
      clouds.push({ g, speed: 0.6 + rnd() * 0.8 });
    }
  }

  // Per-site statics: abutments, white pylons, deck guide, ROAD label.
  const concrete = new THREE.MeshStandardMaterial({ color: 0xe4ddd0, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  function box(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function roadSprite() {
    const cv = document.createElement("canvas");
    cv.width = 320; cv.height = 80;
    const c = cv.getContext("2d");
    const r = 32;
    c.beginPath();
    c.moveTo(r + 4, 8); c.lineTo(316 - r, 8); c.arc(316 - r, 40, r, -Math.PI / 2, Math.PI / 2);
    c.lineTo(r + 4, 72); c.arc(r + 4, 40, r, Math.PI / 2, (Math.PI * 3) / 2);
    c.closePath();
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.fill();
    c.font = '800 34px Archivo, "Segoe UI", system-ui, sans-serif';
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#1b1530";
    c.fillText("ROAD ↓", 160, 42);
    const tex = new THREE.CanvasTexture(cv);
    if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
    else tex.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    sp.scale.set(6, 1.5, 1);
    return sp;
  }
  const siteGroups = {};
  const siteTags = {};
  const roadDone = {};
  for (const s of sites) {
    const half = halfOf(s.id);
    const g = new THREE.Group();
    g.position.x = siteX[s.id];
    scene.add(g);
    const abW = 2.5 + half * 0.18;
    const abD = 4 + half * 0.2;
    box(abW, -BED + 0.5, abD, concrete, -(half + abW / 2 + 0.5), (BED - 0.5) / 2, 0, g);
    box(abW, -BED + 0.5, abD, concrete, half + abW / 2 + 0.5, (BED - 0.5) / 2, 0, g);
    // Slim H pylons around the fixed anchors (half/2, 8): the road passes between the legs.
    for (const tx of [-half / 2, half / 2]) {
      for (const tz of [-1.6, 1.6]) box(0.55, 8.6 - BED, 0.55, white, tx, (8.6 + BED) / 2, tz, g);
      box(0.55, 0.55, 3.75, white, tx, 7.2, 0, g);
      box(2.6, 1.6, 4.4, concrete, tx, BED + 0.5, 0, g);
    }
    // Deck guide: dashed line along the road row.
    const world = ctx.worlds[s.id].world;
    const guidePts = [];
    for (let i = 0; i < world.deckCount; i++) guidePts.push(new THREE.Vector3(world.nodes[i].rx, 0.15, 0));
    const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints(guidePts), new THREE.LineDashedMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9, dashSize: 1.2, gapSize: 0.7,
    }));
    guide.computeLineDistances();
    g.add(guide);
    const tag = roadSprite();
    tag.position.set(0, 10.2, 0);
    g.add(tag);
    siteTags[s.id] = tag;
    siteGroups[s.id] = g;
  }

  // Per-site dynamics (nodes, sticks, road). Only the active site animates.
  const nodeGeo = new THREE.SphereGeometry(0.5, 16, 12);
  const hitGeo = new THREE.SphereGeometry(1.9, 8, 6);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  hitMat.colorWrite = false;
  const beamGeo = new THREE.BoxGeometry(1, 0.45, 0.45);
  const cableGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
  cableGeo.rotateZ(Math.PI / 2); // along X, like the beams, so placeBeam can stretch it
  const roadGeo = new THREE.BoxGeometry(1, 0.16, 2.0);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: 0.85 });
  const dyn = {};
  const BASE_COLOR = { fixed: 0x3b3550, deck: 0xffffff, top: 0xffb547 };
  const BASE_EMISSIVE = { fixed: 0x000000, deck: 0x3a3428, top: 0x3a2200 };
  const HOVER = 0x9a6400;
  const PICKED = 0xff7a1a;
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
      const m = new THREE.Mesh(nodeGeo, new THREE.MeshStandardMaterial({
        color: BASE_COLOR[kind], emissive: BASE_EMISSIVE[kind], roughness: 0.45,
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
      const beam = s.type === "poutre";
      const m = new THREE.Mesh(
        beam ? beamGeo : cableGeo,
        new THREE.MeshStandardMaterial({ color: (beam ? BEAM : CABLE).clone(), roughness: beam ? 0.6 : 0.45 })
      );
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.stick = i;
      group.add(m);
      d.sticks.push(m);
      const A = world.nodes[s.a];
      const B = world.nodes[s.b];
      if (A.deck && B.deck) {
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.castShadow = true;
        road.receiveShadow = true;
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
          mat.emissive.setHex(PICKED);
          const s = 1 + Math.sin(t * 6) * 0.15;
          d.nodes[i].scale.set(s, s, s);
        } else {
          const kind = d.nodes[i].userData.kind;
          mat.emissive.setHex(i === hovered ? HOVER : BASE_EMISSIVE[kind]);
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

  // Test ghost: the flask ghost of the logo, turned on a lathe (single, follows the active site).
  const ghost = new THREE.Group(); // position + yaw towards the camera
  const ghostTilt = new THREE.Group(); // falling tilt
  ghost.add(ghostTilt);
  // Open body: below PH_HEM the lathe is pushed into scallops that sway (ghost hem).
  const PH_HEM = 0.42;
  const PH_LOBES = 7;
  const PH_LOBE = 0.17;
  const ghostEyes = [];
  const ghostInner = new THREE.Group();
  let hemGeo = null;
  let hemBase = null;
  {
    const prof = [[0.8, 0], [0.795, 0.07], [0.79, 0.14], [0.785, 0.21], [0.78, 0.28], [0.78, 0.35], [0.78, PH_HEM], [0.745, 0.716], [0.641, 0.94], [0.468, 1.116], [0.225, 1.25], [0.225, 1.6], [0.35, 1.6], [0.35, 1.75], [0, 1.75]]
      .map((p) => new THREE.Vector2(p[0], p[1]));
    const ink = new THREE.MeshStandardMaterial({ color: 0x17141f, roughness: 0.3 });
    const cheek = new THREE.MeshStandardMaterial({ color: 0xff9a62, roughness: 0.6 });
    const inner = ghostInner;
    hemGeo = new THREE.LatheGeometry(prof, 96);
    hemBase = Float32Array.from(hemGeo.attributes.position.array);
    const body = new THREE.Mesh(hemGeo, new THREE.MeshStandardMaterial({ color: 0xfbf8ff, roughness: 0.38, side: THREE.DoubleSide }));
    body.castShadow = true;
    inner.add(body);
    const eyeGeo = new THREE.SphereGeometry(0.085, 16, 12);
    const cheekGeo = new THREE.SphereGeometry(0.1, 16, 10);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, ink);
      eye.scale.set(1, 1.3, 0.55);
      eye.position.set(sx * 0.225, 0.62, 0.72);
      eye.userData.sx = sx;
      ghostEyes.push(eye);
      inner.add(eye);
      const ch = new THREE.Mesh(cheekGeo, cheek);
      ch.scale.set(1.2, 0.55, 0.3);
      ch.position.set(sx * 0.46, 0.4, 0.62);
      inner.add(ch);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.017, 8, 16, Math.PI), ink);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.45, 0.77);
    inner.add(smile);
    inner.scale.setScalar(1.4);
    inner.position.y = -0.6 + PH_LOBE * 1.4; // scallop tips where the old round bottom was
    ghostTilt.add(inner);
  }
  scene.add(ghost);
  function waveHem(phase) {
    const p = hemGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const y0 = hemBase[i + 1];
      if (y0 >= PH_HEM) continue;
      const x = hemBase[i];
      const z = hemBase[i + 2];
      const a = Math.atan2(x, z);
      const k = 1 - y0 / PH_HEM;
      const lobe = 0.5 + 0.5 * Math.cos(PH_LOBES * a + phase);
      const sway = 1 + 0.06 * k * Math.sin(PH_LOBES * a + phase * 1.7);
      p[i] = x * sway;
      p[i + 1] = y0 - PH_LOBE * lobe * k * k;
      p[i + 2] = z * sway;
    }
    hemGeo.attributes.position.needsUpdate = true;
    hemGeo.computeVertexNormals();
  }
  waveHem(0);
  // Eyes: follow the pointer, look ahead while testing, glance around otherwise; blink now and then.
  const ghostLook = { x: 0, y: 0 };
  let ghostPtr = { x: 0, y: 0, at: -1e9 };
  window.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    ghostPtr = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1, at: performance.now() };
  });
  let blinkAt = 2.5;
  const headV = new THREE.Vector3();
  const aheadV = new THREE.Vector3();
  function moveGhostEyes(dt, testing) {
    ghostInner.localToWorld(headV.set(0, 0.62, 0.7));
    const head = headV.clone().project(camera);
    let tx;
    let ty;
    if (performance.now() - ghostPtr.at < 2500) {
      tx = ghostPtr.x;
      ty = ghostPtr.y;
    } else {
      // Ahead along the bridge while testing, otherwise a slow glance left and right.
      ghostInner.localToWorld(aheadV.set(0, 0.62, 0.7));
      aheadV.x += testing ? 6 : Math.sin(t * 0.6) * 5;
      aheadV.y += testing ? -1.5 : 0;
      const a = aheadV.project(camera);
      tx = a.x;
      ty = a.y;
    }
    const r = host.getBoundingClientRect();
    let dx = ((tx - head.x) * r.width) / 2;
    let dy = (-(ty - head.y) * r.height) / 2;
    const len = Math.hypot(dx, dy);
    const k = Math.min(1, len / 160) / (len || 1);
    dx *= k;
    dy *= k;
    const ease = Math.min(1, dt * 9);
    ghostLook.x += (dx - ghostLook.x) * ease;
    ghostLook.y += (dy - ghostLook.y) * ease;
    const blinking = t > blinkAt && t < blinkAt + 0.13;
    if (t > blinkAt + 0.13) blinkAt = t + 2.4 + Math.random() * 3.2;
    const bodyR = (y) => 0.78 - ((y - PH_HEM) / (0.716 - PH_HEM)) * (0.78 - 0.745);
    ghostEyes.forEach((e) => {
      const x = e.userData.sx * 0.225 + ghostLook.x * 0.085;
      const y = 0.62 - ghostLook.y * 0.07;
      const rr = bodyR(y);
      e.position.set(x, y, Math.sqrt(Math.max(0, rr * rr - x * x)) - 0.01);
      e.rotation.y = Math.asin(Math.max(-1, Math.min(1, x / rr)));
      e.scale.y = blinking ? 0.15 : 1.3;
    });
  }
  function chargePoids() {
    const w = ctx.worlds[ctx.activeId()];
    const law = w.laws.find((l) => l.mod.id === "charge-flottante");
    return (law && law.params.poids) || 20;
  }

  // Camera: orbit around the active site, animated transitions.
  const orbit = { theta: START.theta, phi: START.phi, radius: 47, tx: siteX[ctx.activeId()], ty: 0.5 };
  let camAnim = null;
  function updateCamera() {
    const { theta, phi, radius, tx, ty } = orbit;
    camera.position.set(
      tx + radius * Math.sin(phi) * Math.sin(theta),
      ty + radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(tx, ty, 0);
    // Low warm sun from the left: long shadows across the valley.
    sun.position.set(tx - 34, 26, 22);
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
      ctx.announce("First node picked… click the second.");
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

  // Resize follows the host box. On wide screens the picture is nudged left so the
  // bridge stays clear of the sensors card on the right.
  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const shift = r.width > 900 ? Math.round(Math.min(70, r.width * 0.045)) : 0;
    const fw = r.width + 2 * shift;
    camera.aspect = fw / r.height;
    if (shift) camera.setViewOffset(fw, r.height, 2 * shift, 0, r.width, r.height);
    else camera.clearViewOffset();
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
    if (!dyn[id] || dyn[id].version !== w.version) {
      buildSite(id);
      roadDone[id] = w.hasRoad(); // the ROAD hint goes once the road links both banks
    }
    for (const s of sites) siteTags[s.id].visible = s.id === id && !roadDone[s.id];
    updateSite(id);
    // Ghost.
    const gs = 0.7 + (chargePoids() / 40) * 0.9;
    ghost.scale.set(gs, gs, gs);
    const gh = w.ghost;
    const bob = REDUCED ? 0 : Math.sin(t * (w.testing ? 3 : 2)) * (w.testing ? 0.15 : 0.25);
    if (!w.testing && w.statut === -1) {
      ghost.position.set(siteX[id] - w.half - 2, 1.8 + bob, 0);
      ghostTilt.rotation.z = 0;
    } else {
      ghost.position.set(siteX[id] + gh.x, gh.y + bob, 0);
      ghostTilt.rotation.z = -gh.tilt;
    }
    ghost.rotation.y = Math.atan2(camera.position.x - ghost.position.x, camera.position.z - ghost.position.z);
    if (!REDUCED) waveHem(t * (w.testing ? 4 : 2.4));
    ghost.updateMatrixWorld(true);
    moveGhostEyes(REDUCED ? 1 : dt, w.testing);
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
        if (c.g.position.x > 190) c.g.position.x = -190;
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

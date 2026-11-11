// Bridge map view (Three.js via global THREE): full-screen golden-hour valley, one river
// site per config entry, per-site bridge dynamics, orbit camera. No imports:
// vendor/three.min.js (modular) or the inlined bundle (standalone) provides window.THREE.
import { MATERIALS } from "./materials.js";
import { dressValley } from "./valley-dressing.js";
import { buildSiteStatics } from "./site-statics.js";
import { buildTestGhost } from "./test-ghost.js";
import { buildSky } from "./sky.js";
import { buildMemberPreview } from "./member-preview.js";
import { buildCameraRig } from "./camera-rig.js";

// Public entry point: a thin shell so the valley can be torn down and rebuilt
// when the level changes (new gap width, new river, new abutments).
export function buildMapView(host, ctx) {
  let inner = constructMapView(host, ctx);
  return {
    render: (dt) => inner.render(dt),
    setSite: (id) => inner.setSite(id),
    rebuild() {
      inner.dispose();
      inner = constructMapView(host, ctx);
    },
    dispose() {
      inner.dispose();
    },
  };
}

function constructMapView(host, ctx) {
  const THREE = window.THREE;
  if (!THREE) throw new Error("THREE missing: load vendor/three.min.js first");
  // Hex colours are sRGB, lighting runs in linear space (same pipeline as the design boards).
  if (THREE.ColorManagement && "legacyMode" in THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

  const HORIZON = 0xffd6ad;
  const RED = new THREE.Color(0xef4444);
  const BROKEN = new THREE.Color(0x7f1d1d);
  const MAT_COLOR = {};
  for (const id of Object.keys(MATERIALS)) MAT_COLOR[id] = new THREE.Color(MATERIALS[id].color);
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

  // Sky: gradient dome (no fog), warm low sun, cool sky fill.
  const sun = buildSky(THREE, scene, HORIZON);

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

  // Dressing: trees, rocks, mountain ring and drifting clouds.
  const clouds = dressValley(THREE, scene, {
    rnd, sites, siteX, radiusFor, heightAt, bedAt, waterGap, START,
  });

  // Per-site statics: abutments, pylons, deck guide, ROAD label.
  const { siteGroups, siteTags, roadDone } = buildSiteStatics(THREE, {
    scene, ctx, sites, siteX, halfOf, BED,
  });

  // Per-site dynamics (nodes, sticks, road). Only the active site animates.
  const nodeGeo = new THREE.SphereGeometry(0.5, 16, 12);
  const hitGeo = new THREE.SphereGeometry(1.9, 8, 6);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  hitMat.colorWrite = false;
  // One cross-section per material: thickness and shape read as the family.
  const bambooGeo = new THREE.BoxGeometry(1, 0.34, 0.34);
  const beamGeo = new THREE.BoxGeometry(1, 0.45, 0.45);
  const steelGeo = new THREE.BoxGeometry(1, 0.5, 0.5);
  const glulamGeo = new THREE.BoxGeometry(1, 0.55, 0.4);
  const trussGeo = new THREE.BoxGeometry(1, 0.7, 0.42);
  const archGeo = new THREE.BoxGeometry(1, 0.62, 0.62);
  const pierGeo = new THREE.BoxGeometry(1, 0.75, 0.75);
  const cableGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
  const chainGeo = new THREE.CylinderGeometry(0.13, 0.13, 1, 6);
  const ropeGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 6);
  for (const g of [cableGeo, chainGeo, ropeGeo]) g.rotateZ(Math.PI / 2); // along X, so placeBeam can stretch it
  const GEO = {
    bambou: bambooGeo, bois: beamGeo, lamelle: glulamGeo, acier: steelGeo,
    treillis: trussGeo, arche: archGeo, pilier: pierGeo,
    cable: cableGeo, chaine: chainGeo, corde: ropeGeo,
  };
  function geoFor(id) {
    return GEO[id] || beamGeo;
  }
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
      const def = MATERIALS[s.mat] || MATERIALS.bois;
      const m = new THREE.Mesh(
        geoFor(s.mat),
        new THREE.MeshStandardMaterial({ color: MAT_COLOR[s.mat].clone(), roughness: def.kind === "cable" ? 0.45 : 0.6 })
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
  const BEAM_FALLBACK = new THREE.Color(0xf1e9da);
  // A broken member is drawn as a 40% stub hanging from its first node.
  function placeStub(mesh, A, B) {
    mesh.position.set(A.x + (B.x - A.x) * 0.2, A.y + (B.y - A.y) * 0.2 - 0.4, 0);
    mesh.rotation.z = Math.atan2(B.y - A.y, B.x - A.x) + 0.5;
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    mesh.scale.set(Math.max(0.01, len * 0.4), 1, 1);
  }
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
      const A = world.nodes[s.a];
      const B = world.nodes[s.b];
      if (s.broken) {
        // Snapped: keep a short dark stub at the fixed end so the failure is visible.
        mesh.visible = true;
        mesh.material.color.copy(BROKEN);
        placeStub(mesh, A, B);
      } else {
        placeBeam(mesh, A, B);
        tmpC.copy(MAT_COLOR[s.mat] || BEAM_FALLBACK).lerp(RED, Math.min(1, s.strain || 0));
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

  const preview = buildMemberPreview(THREE, {
    scene, ctx, beamGeo, placeBeam, getHovered: () => hovered,
  });

  // Camera, sun and node picking live in their own module.
  const rig = buildCameraRig(THREE, {
    scene, canvas, ctx, dyn, siteX, radiusFor, START, sun,
    onHover: (i) => { hovered = i; },
  });
  const camera = rig.camera;
  const orbit = rig.orbit;
  const updateCamera = rig.updateCamera;

  // Load ladder: up to 6 test ghosts, each heavier — and bigger — than the last.
  const MAX_GHOSTS = 6;
  const ghostPool = [];
  for (let i = 0; i < MAX_GHOSTS; i++) {
    ghostPool.push(buildTestGhost(THREE, { scene, host, ctx, camera }));
  }
  const chargePoids = ghostPool[0].chargePoids;

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
  const ro = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host);
  else window.addEventListener("resize", resize);
  resize();

  function render(dt) {
    preview.update();
    if (!REDUCED) t += dt;
    const id = ctx.activeId();
    const w = ctx.worlds[id].world;
    if (!dyn[id] || dyn[id].version !== w.version) {
      buildSite(id);
      roadDone[id] = w.hasRoad(); // the ROAD hint goes once the road links both banks
    }
    for (const s of sites) siteTags[s.id].visible = s.id === id && !roadDone[s.id];
    updateSite(id);
    // The load ladder: each ghost waits its turn and grows with its weight.
    const ladder = w.ghosts.length ? w.ghosts : null;
    const heaviest = ladder ? ladder[ladder.length - 1].weight : chargePoids();
    const bob = REDUCED ? 0 : Math.sin(t * (w.testing ? 3 : 2)) * (w.testing ? 0.15 : 0.25);
    ghostPool.forEach((api, i) => {
      const g = api.group;
      const st = ladder ? ladder[i] : null;
      if (!st) {
        // No test running: park a single idle ghost on the left bank.
        if (i !== 0) { g.visible = false; return; }
        g.visible = true;
        const idle = 0.7 + (chargePoids() / 40) * 0.9;
        g.scale.set(idle, idle, idle);
        g.position.set(siteX[id] - w.half - 2, 1.8 + bob, 0);
        api.tilt.rotation.z = 0;
      } else {
        g.visible = true;
        // Weight drives the size: the heaviest ghost is unmistakably the biggest.
        const gs = 0.55 + (st.weight / (heaviest || 1)) * 0.75;
        g.scale.set(gs, gs, gs);
        if (st.state === "done") {
          g.position.set(siteX[id] + w.half + 2.2 + i * 2.2, 1.8 + bob, 0);
          api.tilt.rotation.z = 0;
        } else if (st.state === "crossing" || st.state === "fallen") {
          g.position.set(siteX[id] + st.x, st.y + bob, 0);
          api.tilt.rotation.z = -st.tilt;
        } else {
          g.position.set(siteX[id] + st.x, 1.8 + bob, 0);
          api.tilt.rotation.z = 0;
        }
      }
      g.rotation.y = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
      if (!REDUCED) api.waveHem(t * (w.testing ? 4 : 2.4) + i * 1.7);
      g.updateMatrixWorld(true);
      api.moveEyes(REDUCED ? 1 : dt, t, w.testing && (!ladder || ladder[i].state === "crossing"));
    });
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
    rig.tick(dt);
    renderer.render(scene, camera);
  }

  function setSite(id) {
    rig.focus(id);
  }

  function dispose() {
    if (ro) ro.disconnect();
    else window.removeEventListener("resize", resize);
    rig.dispose();
    for (const api of ghostPool) api.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    });
    renderer.dispose();
    if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
  }

  return { render, setSite, dispose };
}

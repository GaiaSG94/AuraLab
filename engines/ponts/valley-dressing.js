// Valley dressing (Three.js via the global THREE): instanced low-poly trees,
// rocks, a hazy mountain ring and drifting clouds.
// Pure scene dressing: no game state, no DOM, no per-frame logic except clouds.

// Distance from a point to a segment, used to keep the default camera views clear.
function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const k = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(px - ax - k * vx, pz - az - k * vz);
}

function pickTreeSpots({ rnd, sites, siteX, radiusFor, heightAt, bedAt, waterGap, START }) {
  // Keep the default view of every bridge clear of trunks.
  const views = sites.map((s) => {
    const r = radiusFor(s.id);
    return [
      siteX[s.id] + r * Math.sin(START.phi) * Math.sin(START.theta),
      r * Math.sin(START.phi) * Math.cos(START.theta),
      siteX[s.id],
    ];
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
  return trees;
}

function addTrees(THREE, scene, trees) {
  const cone = new THREE.ConeGeometry(1, 1, 7);
  cone.translate(0, 0.5, 0);
  const stem = new THREE.CylinderGeometry(0.13, 0.18, 1, 6);
  stem.translate(0, 0.5, 0);
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
}

function addRocks(THREE, scene, { rnd, heightAt, bedAt, waterGap }) {
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
    r.castShadow = true;
    r.receiveShadow = true;
    scene.add(r);
    placed++;
  }
}

// Hazy mountain ring beyond the valley (no fog: they read as distant silhouettes).
function addMountains(THREE, scene, rnd) {
  const hazes = [0xf3dfc9, 0xeedac6, 0xe8d6c5].map(
    (h) => new THREE.MeshStandardMaterial({ color: h, flatShading: true, roughness: 1, fog: false }),
  );
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

function addClouds(THREE, scene, rnd) {
  const clouds = [];
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffe2c4, emissiveIntensity: 0.35, flatShading: true, roughness: 1, fog: false,
  });
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
  return clouds;
}

export function dressValley(THREE, scene, deps) {
  const { rnd, sites, siteX, radiusFor, heightAt, bedAt, waterGap, START } = deps;
  addTrees(THREE, scene, pickTreeSpots(deps));
  addRocks(THREE, scene, deps);
  addMountains(THREE, scene, rnd);
  return addClouds(THREE, scene, rnd);
}

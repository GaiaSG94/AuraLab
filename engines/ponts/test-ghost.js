// Test ghost (Three.js via the global THREE): the flask mascot of the logo,
// turned on a lathe, that walks the deck during a load test and plunges when
// the bridge gives way. Open body with a scalloped, swaying hem; eyes that
// follow the pointer, look ahead while testing, and blink.
const PH_HEM = 0.42;
const PH_LOBES = 7;
const PH_LOBE = 0.17;
const PROFILE = [
  [0.8, 0], [0.795, 0.07], [0.79, 0.14], [0.785, 0.21], [0.78, 0.28], [0.78, 0.35],
  [0.78, PH_HEM], [0.745, 0.716], [0.641, 0.94], [0.468, 1.116], [0.225, 1.25],
  [0.225, 1.6], [0.35, 1.6], [0.35, 1.75], [0, 1.75],
];

// deps: { scene, host, ctx, camera }
export function buildTestGhost(THREE, deps) {
  const { scene, host, ctx, camera } = deps;
  const group = new THREE.Group(); // position + yaw towards the camera
  const tilt = new THREE.Group(); // falling tilt
  group.add(tilt);
  const eyes = [];
  const inner = new THREE.Group();
  let hemGeo = null;
  let hemBase = null;

  const prof = PROFILE.map((p) => new THREE.Vector2(p[0], p[1]));
  const ink = new THREE.MeshStandardMaterial({ color: 0x17141f, roughness: 0.3 });
  const cheek = new THREE.MeshStandardMaterial({ color: 0xff9a62, roughness: 0.6 });
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
    eyes.push(eye);
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
  tilt.add(inner);
  scene.add(group);
  waveHem(0);

  const look = { x: 0, y: 0 };
  let ptr = { x: 0, y: 0, at: -1e9 };
  window.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    ptr = {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: -((e.clientY - r.top) / r.height) * 2 + 1,
      at: performance.now(),
    };
  });
  let blinkAt = 2.5;
  const headV = new THREE.Vector3();
  const aheadV = new THREE.Vector3();

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

  // Eyes: follow the pointer, look ahead while testing, glance around otherwise.
  function moveEyes(dt, t, testing) {
    inner.localToWorld(headV.set(0, 0.62, 0.7));
    const head = headV.clone().project(camera);
    let tx;
    let ty;
    if (performance.now() - ptr.at < 2500) {
      tx = ptr.x;
      ty = ptr.y;
    } else {
      inner.localToWorld(aheadV.set(0, 0.62, 0.7));
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
    look.x += (dx - look.x) * ease;
    look.y += (dy - look.y) * ease;
    const blinking = t > blinkAt && t < blinkAt + 0.13;
    if (t > blinkAt + 0.13) blinkAt = t + 2.4 + Math.random() * 3.2;
    const bodyR = (y) => 0.78 - ((y - PH_HEM) / (0.716 - PH_HEM)) * (0.78 - 0.745);
    eyes.forEach((e) => {
      const x = e.userData.sx * 0.225 + look.x * 0.085;
      const y = 0.62 - look.y * 0.07;
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

  return { group, tilt, waveHem, moveEyes, chargePoids };
}

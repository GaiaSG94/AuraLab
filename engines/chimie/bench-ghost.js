// The flask ghost mascot for the Chemistry bench (Three.js via the global THREE).
// Open body with a scalloped, swaying hem; eyes that follow the pointer, the
// falling drop or the flask; moods that rotate, look at the viewer or fly.
// Pure scene object: the bench view owns the camera and the render loop.
import { lathe, shadows } from "./glassware.js";

const HEM = 0.42;
const LOBES = 7;
const LOBE = 0.17;
const EYE_Y = 0.62;
const PROFILE = [
  [0.8, 0], [0.795, 0.07], [0.79, 0.14], [0.785, 0.21], [0.78, 0.28],
  [0.78, 0.35], [0.78, HEM], [0.745, 0.716], [0.641, 0.94], [0.468, 1.116],
  [0.225, 1.25], [0.225, 1.6], [0.35, 1.6], [0.35, 1.75], [0, 1.75],
];
const MOODS = { watch: 0.4, audience: 0.25, spin: 0.18, fly: 0.17 };

export function buildFlaskGhost(THREE, opts) {
  const { toScreen, reduced } = opts;
  const group = new THREE.Group();
  const eyes = [];
  const bodyGeo = lathe(THREE, PROFILE, 96);
  const hemBase = Float32Array.from(bodyGeo.attributes.position.array);
  const ink = new THREE.MeshStandardMaterial({ color: 0x17141f, roughness: 0.3 });
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbf8ff, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide,
  });
  group.add(shadows(new THREE.Mesh(bodyGeo, bodyMat)));
  const cheekMat = new THREE.MeshStandardMaterial({ color: 0xff9a62, roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), ink);
    eye.scale.set(1, 1.3, 0.55);
    eye.position.set(sx * 0.225, EYE_Y, 0.72);
    eye.userData.sx = sx;
    group.add(eye);
    eyes.push(eye);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), cheekMat);
    cheek.scale.set(1.2, 0.55, 0.3);
    cheek.position.set(sx * 0.46, 0.4, 0.62);
    group.add(cheek);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.017, 8, 16, Math.PI), ink);
  smile.rotation.z = Math.PI;
  smile.position.set(0, 0.45, 0.77);
  group.add(smile);
  group.scale.setScalar(0.85);

  const state = {
    home: { x: 2.25, y: -1.2 + LOBE * 0.85 + 0.06 },
    mood: { kind: "watch", start: 0, until: 4, dir: 1, yaw: null, wave: 0 },
    look: { x: 0, y: 0 },
    blinkAt: 2.5,
    t: 0,
    hop: 0,
    pointer: { x: 0, y: 0, at: -1e9 },
  };
  group.position.set(state.home.x, state.home.y, -0.1);

  waveHem(THREE, bodyGeo, hemBase, 0);

  function pickMood(t, rnd) {
    const m = state.mood;
    const roll = rnd();
    let acc = 0;
    let kind = "watch";
    for (const [name, share] of Object.entries(MOODS)) {
      acc += share;
      if (roll < acc) { kind = name; break; }
    }
    if (kind === m.kind && kind !== "watch") kind = "watch";
    const len = { watch: 3.5 + rnd() * 3, audience: 2.5 + rnd() * 2, spin: 1.8, fly: 3.4 }[kind];
    m.kind = kind;
    m.start = t;
    m.until = t + len;
    m.dir = rnd() < 0.5 ? -1 : 1;
  }

  function aim(dt, target) {
    const head = toScreen(group.position.x, group.position.y + EYE_Y * 0.85, group.position.z);
    let dx = target.x - head.x;
    let dy = target.y - head.y;
    const len = Math.hypot(dx, dy);
    const k = Math.min(1, len / 160) / (len || 1);
    dx *= k;
    dy *= k;
    const ease = Math.min(1, dt * 9);
    state.look.x += (dx - state.look.x) * ease;
    state.look.y += (dy - state.look.y) * ease;
    const t = state.t;
    const blinking = t > state.blinkAt && t < state.blinkAt + 0.13;
    if (t > state.blinkAt + 0.13) state.blinkAt = t + 2.4 + Math.random() * 3.2;
    for (const eye of eyes) {
      const x = eye.userData.sx * 0.225 + state.look.x * 0.05;
      const y = EYE_Y - state.look.y * 0.045;
      const r = bodyRadiusAt(y);
      eye.position.set(x, y, Math.sqrt(Math.max(0, r * r - x * x)) + 0.005);
      eye.rotation.y = Math.asin(Math.max(-1, Math.min(1, x / r)));
      eye.scale.y = blinking ? 0.15 : 1.3;
    }
  }

  // One frame: bob, hop, mood, hem sway, eye target.
  function update(dt, focus, camera) {
    if (camera) state.camera = camera;
    const step = reduced ? 0 : dt;
    state.t += step;
    state.hop = Math.max(0, state.hop - dt * 2.2);
    if (!reduced && state.t >= state.mood.until) pickMood(state.t, Math.random);
    const m = state.mood;
    const k = Math.min(1, (state.t - m.start) / Math.max(0.01, m.until - m.start));
    const smooth = (x) => x * x * (3 - 2 * x);
    const lift = m.kind === "fly" ? Math.sin(Math.PI * smooth(k)) * 0.9 : 0;
    const spin = m.kind === "spin" ? m.dir * Math.PI * 2 * smooth(k) : 0;
    const camYaw = state.camera
      ? Math.atan2(state.camera.position.x - group.position.x, state.camera.position.z - group.position.z)
      : 0;
    const yawGoal = camYaw - (m.kind === "audience" ? 0.05 : m.kind === "fly" ? 0.2 : 0.38);
    if (m.yaw === null) m.yaw = yawGoal;
    m.yaw += (yawGoal - m.yaw) * Math.min(1, (reduced ? 1 : dt) * 3);
    const bob = reduced ? 0 : Math.abs(Math.sin(state.t * 2.2)) * 0.05;
    group.position.y = state.home.y + bob + lift + Math.sin(state.hop * Math.PI) * 0.35;
    group.position.x = state.home.x + (m.kind === "fly" ? Math.sin(k * Math.PI * 2) * 0.12 : 0);
    group.rotation.y = m.yaw + spin;
    group.rotation.z = m.kind === "fly" ? Math.sin(k * Math.PI * 3) * 0.08 : 0;
    if (!reduced) {
      m.wave += dt * (m.kind === "fly" ? 5.5 : 2.4);
      waveHem(THREE, bodyGeo, hemBase, m.wave);
    }
    aim(reduced ? 1 : dt, focus);
  }

  return {
    group,
    update,
    hop: () => { state.hop = 1; },
    lookAtPointer: (x, y) => { state.pointer = { x, y, at: performance.now() }; },
    pointerTarget: () => state.pointer,
  };
}

function bodyRadiusAt(y) {
  return 0.78 - ((y - HEM) / (0.716 - HEM)) * (0.78 - 0.745);
}

// Push the vertices below HEM into scallops that sway with `phase`.
function waveHem(THREE, geometry, base, phase) {
  const p = geometry.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const y0 = base[i + 1];
    if (y0 >= HEM) continue;
    const x = base[i];
    const z = base[i + 2];
    const a = Math.atan2(x, z);
    const k = 1 - y0 / HEM;
    const lobe = 0.5 + 0.5 * Math.cos(LOBES * a + phase);
    const sway = 1 + 0.06 * k * Math.sin(LOBES * a + phase * 1.7);
    p[i] = x * sway;
    p[i + 1] = y0 - LOBE * lobe * k * k;
    p[i + 2] = z * sway;
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
}

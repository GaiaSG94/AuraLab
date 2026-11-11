// Chemistry bench view (Three.js via the global THREE): full-screen 3D glassware
// on the lab's page colour. Erlenmeyer on a tripod over a Bunsen burner, graduated
// burette for titration, thermometer dipped in, manometer for the CO2 headspace,
// one slim dropper bottle per reagent, and the flask ghost watching.
// Geometry lives in glassware.js, the mascot in bench-ghost.js.
import {
  lathe, glassMaterial, metalMaterial, shadows,
  buildFlask, buildThermometer, buildBurner, buildBurette, buildManometer,
  liquidLevelOf, flaskInnerRadius,
} from "./glassware.js";
import { buildFlaskGhost } from "./bench-ghost.js";

const BOTTLE_PROFILE = [
  [0, 0], [0.26, 0], [0.3, 0.04], [0.31, 0.12], [0.31, 0.95],
  [0.28, 1.05], [0.2, 1.13], [0.12, 1.17], [0.11, 1.21], [0.11, 1.31], [0.085, 1.31],
];
const STOP_WORDS = new Set(["solution", "mild", "dilute", "weak", "strong", "sodium", "0.1"]);
const FOV = 24;
const BUBBLES = 40;

export function buildBenchView(host, ctx) {
  const THREE = window.THREE;
  if (!THREE) throw new Error("THREE missing: load three.min.js first");
  if (THREE.ColorManagement && "legacyMode" in THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const world = ctx.world;
  const page = ctx.config.lab.page || "#6cc95a";

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(page, 1);
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 200);
  const DIR = V(0.06, 0.1, 1).normalize();
  // Declared before any toScreen() call: function declarations hoist, but this
  // const does not, and the ghost looks at the flask during construction.
  const tmp = new THREE.Vector3();
  buildEnvironment(THREE, renderer, scene, page);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(-4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8; key.shadow.camera.right = 8;
  key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(page).getHex(), 0.35));

  const flask = buildFlask(THREE);
  scene.add(flask.group);
  let level = liquidLevelOf(world.volume, 500);
  flask.shape(level);

  const thermometer = buildThermometer(THREE);
  scene.add(thermometer.group);

  const burner = buildBurner(THREE);
  scene.add(burner.group, burner.flame, burner.glow, burner.hit);
  scene.add(tripod(THREE));

  const burette = buildBurette(THREE);
  burette.group.scale.setScalar(0.62);
  burette.group.position.set(0, 2.42, -0.28);
  scene.add(burette.group);

  const manometer = buildManometer(THREE);
  manometer.group.scale.setScalar(0.78);
  // Behind and left of the flask: keeps it clear of the ghost (x = 2.25) and
  // clear of the two rows of reagent bottles (x <= -1.75).
  manometer.group.position.set(-1.05, -0.5, -1.2);
  scene.add(manometer.group);

  const bottles = buildBottles(THREE, scene, ctx.config.substances, ctx.config.controls || []);
  const ghost = buildFlaskGhost(THREE, { toScreen, reduced: REDUCED });
  scene.add(ghost.group);
  ghost.update(0, toScreen(-0.3, 0.6, 0));

  const effects = buildEffects(THREE, scene, flask);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.2;
  ground.receiveShadow = true;
  scene.add(ground);

  const box = { x0: -4.95, x1: 3.0, y0: -1.72, y1: 4.2 };
  const center = V((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, 0);
  const tanH = Math.tan(((FOV / 2) * Math.PI) / 180);

  // Screen position (CSS px inside the host) of a world point, for HUD labels.
  function toScreen(x, y, z) {
    const r = host.getBoundingClientRect();
    tmp.set(x, y, z).project(camera);
    return { x: ((tmp.x + 1) / 2) * r.width, y: ((1 - tmp.y) / 2) * r.height };
  }

  // Fit the scene into the area the HUD leaves free, then shift it to the centre.
  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const W = r.width;
    const H = r.height;
    const ins = (ctx.insets && ctx.insets()) || { top: 80, right: 24, bottom: 96, left: 24 };
    const freeW = Math.max(160, W - ins.left - ins.right);
    const freeH = Math.max(140, H - ins.top - ins.bottom);
    const dH = ((box.y1 - box.y0) / 2 / tanH) * (H / freeH);
    const dW = ((box.x1 - box.x0) / 2 / (tanH * (W / H))) * (W / freeW);
    const d = Math.max(dH, dW) * 1.05;
    camera.position.copy(center).addScaledVector(DIR, d);
    camera.lookAt(center);
    const dx = W / 2 - (ins.left + freeW / 2);
    const dy = H / 2 - (ins.top + freeH / 2);
    const fw = W + 2 * Math.abs(dx);
    const fh = H + 2 * Math.abs(dy);
    camera.fov = (2 * Math.atan(tanH * (fh / H)) * 180) / Math.PI;
    camera.aspect = fw / fh;
    camera.setViewOffset(fw, fh, Math.abs(dx) + dx, Math.abs(dy) + dy, W, H);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    bottles.forEach((b) => {
      b.g.rotation.y = Math.atan2(camera.position.x - b.g.position.x, camera.position.z - b.g.position.z);
    });
    manometer.group.rotation.y = Math.atan2(camera.position.x - manometer.group.position.x, camera.position.z - manometer.group.position.z);
    renderer.setSize(W, H, false);
    if (ctx.onFrame) ctx.onFrame();
  }

  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host);
  else window.addEventListener("resize", resize);

  let hoverId = null;
  const hits = [...bottles.map((b) => b.hit), burner.hit, burette.hit];
  wirePicking(canvas, camera, hits, ctx, ghost, (id) => { hoverId = id; });

  let t = 0;
  function render(dt) {
    const step = REDUCED ? 0 : dt;
    t += step;
    updateLiquid(flask, world, level, dt, REDUCED, (l) => { level = l; });
    updateBubbles(effects, world, level, step);
    updateSteam(effects, world, t, REDUCED);
    updateThermometer(thermometer, world);
    updateBurner(burner, world, ctx, t, REDUCED);
    burette.setFill(1 - Math.min(1, (world.buretteMl || 0) / 50));
    manometer.needle.rotation.z = Math.PI * 0.5 - ((world.pression - 90) / 170) * 2.4;
    bottles.forEach((b) => { b.hover = hoverId === b.id; shapeBottle(b, dt); });
    updateDrops(effects, scene, level, dt, REDUCED);
    ghost.update(step || 0.0001, ghostFocus(ghost, effects, toScreen), camera);
    renderer.render(scene, camera);
  }

  return {
    render,
    pour(id) { effects.pour(id, bottles); ghost.hop(); },
    dispense(ml) { effects.dispense(ml, burette); ghost.hop(); },
    resize,
    toScreen,
    shortName,
    setHover: (id) => { hoverId = id; },
    anchors: {
      neck: () => toScreen(-0.3, 1.9, 0),
      bottle: (id) => {
        const b = bottles.find((x) => x.id === id);
        return b ? toScreen(b.g.position.x, -1.2, b.g.position.z) : null;
      },
      burette: () => toScreen(0.32, 2.9, -0.28),
    },
  };
}

// --- scene furniture -------------------------------------------------------

function buildEnvironment(THREE, renderer, scene, page) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const R = 40;
  const g = new THREE.SphereGeometry(R, 32, 16);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const top = new THREE.Color("#ffffff");
  const hor = new THREE.Color("#e3f6dd");
  const bot = new THREE.Color(page).multiplyScalar(0.7);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const k = p.getY(i) / R;
    if (k > 0) c.copy(hor).lerp(top, Math.min(1, k * 1.6));
    else c.copy(hor).lerp(bot, Math.min(1, -k * 2));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  env.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, pos, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(16, 5, new THREE.Vector3(0, 18, 8), 6);
  panel(5, 14, new THREE.Vector3(-16, 6, 7), 3.5);
  panel(5, 14, new THREE.Vector3(16, 5, -4), 2.4);
  scene.environment = pm.fromScene(env, 0.02).texture;
  pm.dispose();
}

function tripod(THREE) {
  const group = new THREE.Group();
  const dark = metalMaterial(THREE, 0x2f3431, 0.4);
  const ring = shadows(new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.032, 10, 64), dark));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.035;
  const gauze = shadows(
    new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.012, 1.35), metalMaterial(THREE, 0x4a504c, 0.75)),
    true,
  );
  gauze.position.y = -0.01;
  group.add(ring, gauze);
  for (const a of [Math.PI / 2, (Math.PI * 7) / 6, (Math.PI * 11) / 6]) {
    const top = new THREE.Vector3(Math.cos(a), -0.035, Math.sin(a));
    const bot = new THREE.Vector3(Math.cos(a) * 1.28, -1.2, Math.sin(a) * 1.28);
    const d = new THREE.Vector3().subVectors(bot, top);
    const leg = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, d.length(), 10), dark));
    leg.position.copy(top).addScaledVector(d, 0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    group.add(leg);
  }
  return group;
}

function shortName(label) {
  const words = String(label).split(/\s+/).filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  return (words.sort((a, b) => b.length - a.length)[0] || String(label)).replace(/^./, (c) => c.toUpperCase());
}

function labelTexture(THREE, name, color) {
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 96;
  const c = cv.getContext("2d");
  c.fillStyle = "#fbfaf5";
  c.fillRect(0, 0, 512, 96);
  c.font = '800 30px Archivo, "Segoe UI", system-ui, sans-serif';
  c.textBaseline = "middle";
  const text = name.toUpperCase();
  const tw = c.measureText(text).width;
  const x0 = 256 - (tw + 30) / 2;
  c.fillStyle = color;
  c.beginPath(); c.arc(x0 + 10, 48, 11, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#0b2a17";
  c.fillText(text, x0 + 30, 50);
  const t = new THREE.CanvasTexture(cv);
  if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
  else t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4;
  return t;
}

// Eight reagents in two rows of four on the left of the bench.
function buildBottles(THREE, scene, substances, controls) {
  const doseMax = {};
  for (const c of controls) {
    const m = /^substances\.([^.]+)\.count$/.exec(c.path);
    if (m) doseMax[m[1]] = c.max;
  }
  const glass = glassMaterial(THREE);
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1f1d24, roughness: 0.6 });
  return substances.map((s, i) => {
    const g = new THREE.Group();
    const lm = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.15, emissive: s.color, emissiveIntensity: 0.18 });
    const liq = shadows(new THREE.Mesh(new THREE.BufferGeometry(), lm));
    const body = new THREE.Mesh(lathe(THREE, BOTTLE_PROFILE, 64), glass);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.315, 0.315, 0.3, 64, 1, true),
      new THREE.MeshStandardMaterial({ map: labelTexture(THREE, shortName(s.label), s.color), roughness: 0.75, side: THREE.DoubleSide }),
    );
    band.position.y = 0.5;
    band.rotation.y = Math.PI;
    const cap = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.13, 32), rubber));
    cap.position.y = 1.37;
    const bulb = shadows(new THREE.Mesh(new THREE.SphereGeometry(0.105, 32, 16), rubber));
    bulb.position.y = 1.53;
    bulb.scale.y = 1.35;
    g.add(liq, band, cap, bulb, body);
    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 1.95, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.position.y = 0.8;
    hit.userData.substance = s.id;
    g.add(hit);
    const col = i % 4;
    const row = Math.floor(i / 4);
    g.position.set(-1.75 - col * 0.92, -1.2, row === 0 ? 0.62 : -0.62);
    g.scale.setScalar(0.92);
    scene.add(g);
    return { id: s.id, s, g, liq, hit, built: -1, color: s.color, max: doseMax[s.id] || 1 };
  });
}

function shapeBottle(b, dt) {
  const left = Math.max(0, b.max - (b.s.count || 0));
  const lv = 0.2 + 0.72 * (left / (b.max || 1));
  if (Math.abs(lv - b.built) > 0.001) {
    b.built = lv;
    b.liq.geometry.dispose();
    b.liq.geometry = lathe(window.THREE, [[0, 0.04], [0.27, 0.04], [0.28, 0.1], [0.28, lv], [0, lv]], 48);
  }
  const goal = -1.2 + (b.hover ? 0.06 : 0);
  b.g.position.y += (goal - b.g.position.y) * Math.min(1, (dt || 0) * 12);
}

// --- per-frame updates -----------------------------------------------------

function updateLiquid(flask, world, level, dt, reduced, commit) {
  const goal = liquidLevelOf(world.volume, 500);
  const next = level + (goal - level) * (reduced ? 1 : Math.min(1, dt * 4));
  commit(next);
  flask.shape(next);
  const THREE = window.THREE;
  const tint = new THREE.Color(world.liquidHex || "#cfe9f2");
  flask.liquidMat.color.copy(tint).multiplyScalar(0.85);
  flask.liquidMat.emissive.copy(tint).multiplyScalar(0.5);
  flask.menMat.color.copy(tint).lerp(new THREE.Color(0xffffff), 0.12);
  flask.menMat.emissive.copy(tint).multiplyScalar(0.45);
  flask.setSediment(world.precipite || 0, world.precipiteColor);
}

function buildEffects(THREE, scene, flask) {
  const bubbles = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.05, emissive: 0xe6fff0,
      emissiveIntensity: 0.55, transparent: true, opacity: 0.85, depthTest: false,
    }),
    BUBBLES,
  );
  bubbles.count = 0;
  bubbles.renderOrder = 10;
  bubbles.frustumCulled = false;
  flask.group.add(bubbles);
  const bubs = [];
  for (let i = 0; i < BUBBLES; i++) {
    bubs.push({ a: Math.random() * 6.28, r: Math.random(), y: Math.random(), v: 0.18 + Math.random() * 0.3, s: 0.03 + Math.random() * 0.035 });
  }
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const steam = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), steamMat.clone());
    m.visible = false;
    scene.add(m);
    steam.push({ m, ph: i / 6 });
  }
  const ripple = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.008, 6, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false }),
  );
  ripple.renderOrder = 11;
  ripple.rotation.x = Math.PI / 2;
  ripple.visible = false;
  scene.add(ripple);
  const drops = [];
  return {
    bubbles, bubs, steam, ripple, drops, rippleT: 1,
    dropGeo: new THREE.SphereGeometry(0.075, 20, 14),
    pour(id, bottles) {
      const b = bottles.find((x) => x.id === id);
      if (!b) return;
      const m = new THREE.Mesh(this.dropGeo, new THREE.MeshStandardMaterial({
        color: b.color, roughness: 0.1, emissive: b.color, emissiveIntensity: 0.2,
      }));
      m.scale.y = 1.35;
      m.position.set(b.g.position.x * 0.35, 3.9, 0);
      scene.add(m);
      drops.push({ m, t: 0, x: m.position.x });
    },
    dispense(ml, burette) {
      for (let i = 0; i < Math.min(6, Math.max(1, Math.round(ml / 2))); i++) {
        const m = new THREE.Mesh(this.dropGeo, new THREE.MeshStandardMaterial({
          color: 0xc4b5fd, roughness: 0.1, emissive: 0x7c3aed, emissiveIntensity: 0.25,
        }));
        m.scale.setScalar(0.5);
        m.position.set(0, 2.3, -0.28);
        scene.add(m);
        drops.push({ m, t: 0.18 * i, x: 0 });
      }
      burette.group.position.y = 2.42;
    },
  };
}

function updateBubbles(fx, world, level, step) {
  const THREE = window.THREE;
  const vigorous = world.gasFizz > 0.05 || world.boiling;
  const n = world.volume > 0 && world.fizz ? BUBBLES : vigorous ? 18 : world.heating && world.temp > 55 ? 12 : 0;
  fx.bubbles.count = n;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pv = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const b = fx.bubs[i];
    b.y += b.v * step * (1 + world.gasFizz);
    if (b.y > 1) b.y = 0.05;
    const top = Math.max(0.12, level - 0.04);
    const y = 0.1 + b.y * (top - 0.1);
    const rr = flaskInnerRadius(y) * 0.78 * b.r;
    fx.bubbles.setMatrixAt(i, m4.compose(pv.set(Math.cos(b.a) * rr, y, Math.sin(b.a) * rr), q, sc.setScalar(b.s)));
  }
  fx.bubbles.instanceMatrix.needsUpdate = true;
}

function updateSteam(fx, world, t, reduced) {
  const hot = Math.max(0, Math.min(1, (world.temp - 75) / 20));
  for (const p of fx.steam) {
    const k = ((reduced ? 0.3 : t) * 0.35 + p.ph) % 1;
    p.m.visible = hot > 0.01;
    p.m.position.set(Math.sin(k * 6 + p.ph * 9) * 0.12, 2.5 + k * 0.85, 0);
    p.m.scale.setScalar(0.5 + k * 1.2);
    p.m.material.opacity = hot * 0.35 * Math.sin(k * Math.PI);
  }
}

function updateThermometer(th, world) {
  const h = 0.12 + (Math.max(0, Math.min(100, world.temp)) / 100) * 2.3;
  th.column.scale.y = h;
  th.column.position.y = h / 2 + 0.08;
}

function updateBurner(burner, world, ctx, t, reduced) {
  const b = world.material.bruleur;
  const lit = !!(b && ctx.isActive("material", "bruleur") && b.strength > 0);
  burner.flame.visible = lit;
  burner.glow.visible = lit;
  if (!lit) return;
  const p = 0.45 + (b.strength / 100) * 0.75;
  const f = reduced ? 1 : 1 + Math.sin(t * 31) * 0.06 + Math.sin(t * 17) * 0.05;
  burner.flame.scale.set(p / Math.sqrt(f), p * f, p / Math.sqrt(f));
  burner.glow.intensity = 0.4 + p * 0.6;
}

function updateDrops(fx, scene, level, dt, reduced) {
  for (let i = fx.drops.length - 1; i >= 0; i--) {
    const d = fx.drops[i];
    d.t += reduced ? 1 : dt;
    const k = Math.min(1, Math.max(0, d.t / 0.55));
    const land = Math.max(0.12, level);
    d.m.position.y = 3.9 - (3.9 - land) * k * k;
    d.m.position.x = d.x * (1 - k);
    if (k >= 1) {
      scene.remove(d.m);
      d.m.material.dispose();
      fx.drops.splice(i, 1);
      fx.rippleT = 0;
    }
  }
  if (fx.rippleT < 1) {
    fx.rippleT += reduced ? 1 : dt / 0.6;
    fx.ripple.visible = fx.rippleT < 1 && level > 0.06;
    fx.ripple.position.y = level + 0.01;
    fx.ripple.scale.setScalar(1 + fx.rippleT * 3.5);
    fx.ripple.material.opacity = 0.8 * (1 - fx.rippleT);
  } else {
    fx.ripple.visible = false;
  }
}

function ghostFocus(ghost, fx, toScreen) {
  const ptr = ghost.pointerTarget();
  if (performance.now() - ptr.at < 2500) return { x: ptr.x, y: ptr.y };
  if (fx.drops.length) {
    const m = fx.drops[fx.drops.length - 1].m.position;
    return toScreen(m.x, m.y, m.z);
  }
  return toScreen(-0.3, 0.6, 0);
}

// --- camera, picking -------------------------------------------------------

function wirePicking(canvas, camera, hits, ctx, ghost, onHover) {
  const THREE = window.THREE;
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let hover = null;
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const h = ray.intersectObjects(hits, false)[0];
    return h ? h.object.userData : null;
  }
  canvas.addEventListener("pointermove", (e) => {
    hover = pick(e);
    canvas.style.cursor = hover ? "pointer" : "default";
    onHover(hover && hover.substance ? hover.substance : null);
    const r = canvas.getBoundingClientRect();
    ghost.lookAtPointer(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener("pointerleave", () => { hover = null; onHover(null); });
  canvas.addEventListener("click", (e) => {
    const h = pick(e) || hover;
    if (!h) return;
    if (h.substance) ctx.addDose(h.substance);
    else if (h.burner) ctx.toggleBurner();
    else if (h.burette) ctx.dispense(e.shiftKey ? 5 : 1);
  });
}

// Chemistry bench view (Three.js via global THREE): full-screen 3D glassware on the lab's
// page colour. Erlenmeyer on a tripod over a Bunsen burner, thermometer dipped in, one slim
// dropper bottle per substance, and the flask ghost watching. Reads the world every frame.
// No imports: three.min.js (modular page) or the inlined bundle (standalone) provides THREE.
export function buildBenchView(host, ctx) {
  const THREE = window.THREE;
  if (!THREE) throw new Error("THREE missing: load three.min.js first");
  // Hex colours are sRGB, lighting runs in linear space.
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
  renderer.setClearColor(page, 1); // the page colour, also what the glass refracts
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const FOV = 24;
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 200);
  const DIR = V(0.06, 0.1, 1).normalize();

  // Studio environment for reflections: soft gradient dome + three softboxes.
  {
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
    panel(16, 5, V(0, 18, 8), 6);
    panel(5, 14, V(-16, 6, 7), 3.5);
    panel(5, 14, V(16, 5, -4), 2.4);
    scene.environment = pm.fromScene(env, 0.02).texture;
    pm.dispose();
  }
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(-4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(page).getHex(), 0.35));

  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg || 72);
  const shade = (m, receive) => { m.castShadow = true; m.receiveShadow = !!receive; return m; };
  const glass = () => new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 0.12, ior: 1.48,
    clearcoat: 0.6, clearcoatRoughness: 0.03, envMapIntensity: 1.0, side: THREE.DoubleSide,
  });
  const metal = (c, rough) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.75, roughness: rough });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1f1d24, roughness: 0.6 });

  // ---- Erlenmeyer, liquid, bubbles, steam ----
  const FLASK = [[0, 0], [0.9, 0], [0.98, 0.035], [1.0, 0.1], [0.97, 0.2], [0.36, 1.5], [0.3, 1.63], [0.29, 2.3], [0.34, 2.33], [0.36, 2.37], [0.33, 2.4], [0.28, 2.37]];
  const rIn = (y) => (y < 0.2 ? 0.92 : 0.92 - (0.92 - 0.27) * Math.min(1, (y - 0.2) / 1.3));
  const levelOf = (volume) => {
    const f = Math.min(1, Math.max(0, volume / 500));
    return f > 0 ? 0.08 + Math.pow(f, 0.85) * 1.36 : 0;
  };
  const flask = new THREE.Group();
  scene.add(flask);
  const liquidMat = new THREE.MeshStandardMaterial({ color: 0x0b8f47, roughness: 0.18, emissive: 0x078a40, emissiveIntensity: 0.55 });
  const liquid = shade(new THREE.Mesh(new THREE.BufferGeometry(), liquidMat));
  flask.add(liquid);
  const menMat = new THREE.MeshStandardMaterial({ color: 0x22c06b, roughness: 0.1, emissive: 0x0f9d50, emissiveIntensity: 0.45 });
  const men = new THREE.Mesh(new THREE.CircleGeometry(1, 64), menMat);
  men.rotation.x = -Math.PI / 2;
  flask.add(men);
  flask.add(new THREE.Mesh(lathe(FLASK), glass()));
  let level = levelOf(world.volume);
  let builtLevel = -1;
  function shapeLiquid(L) {
    if (Math.abs(L - builtLevel) < 0.002) return;
    builtLevel = L;
    const on = L > 0.06;
    liquid.visible = on;
    men.visible = on;
    if (!on) return;
    liquid.geometry.dispose();
    liquid.geometry = lathe([[0, 0.05], [0.84, 0.05], [0.91, 0.12], [rIn(0.2), 0.2], [rIn(Math.max(0.21, L)), Math.max(0.21, L)], [0, Math.max(0.21, L)]]);
    men.scale.setScalar(rIn(L) - 0.01);
    men.position.y = Math.max(0.21, L) + 0.002;
  }
  shapeLiquid(level);
  const NB = 40;
  // Bubbles and the ripple sit inside the glass: drawn after it (no depth test) so the
  // refraction pass does not blur them away.
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, emissive: 0xe6fff0, emissiveIntensity: 0.55, transparent: true, opacity: 0.85, depthTest: false }), NB);
  bubbles.count = 0;
  bubbles.renderOrder = 10;
  bubbles.frustumCulled = false;
  flask.add(bubbles);
  const bubs = [];
  for (let i = 0; i < NB; i++) bubs.push({ a: Math.random() * 6.28, r: Math.random(), y: Math.random(), v: 0.18 + Math.random() * 0.3, s: 0.03 + Math.random() * 0.035 });
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const steam = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), steamMat.clone());
    m.visible = false;
    scene.add(m);
    steam.push({ m, ph: i / 6 });
  }

  // ---- Thermometer ----
  const red = new THREE.MeshStandardMaterial({ color: 0xff3b30, roughness: 0.2, emissive: 0xff3b30, emissiveIntensity: 0.25 });
  const thermo = new THREE.Group();
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 10), red);
  const tBulb = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), red);
  tBulb.position.y = 0.06;
  const tTube = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 2.6, 20), glass());
  tTube.position.y = 1.3;
  thermo.add(column, tBulb, tTube);
  thermo.position.set(0.12, 0.28, 0.05);
  thermo.rotation.z = -0.07;
  scene.add(thermo);

  // ---- Tripod, gauze, Bunsen burner, flame ----
  const dark = metal(0x2f3431, 0.4);
  const ring = shade(new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.032, 10, 64), dark));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.035;
  scene.add(ring);
  const gauze = shade(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.012, 1.35), new THREE.MeshStandardMaterial({ color: 0x4a504c, metalness: 0.35, roughness: 0.75 })), true);
  gauze.position.y = -0.01;
  scene.add(gauze);
  for (const a of [Math.PI / 2, (Math.PI * 7) / 6, (Math.PI * 11) / 6]) {
    const top = V(Math.cos(a), -0.035, Math.sin(a));
    const bot = V(Math.cos(a) * 1.28, -1.2, Math.sin(a) * 1.28);
    const d = new THREE.Vector3().subVectors(bot, top);
    const leg = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, d.length(), 10), dark));
    leg.position.copy(top).addScaledVector(d, 0.5);
    leg.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    scene.add(leg);
  }
  const steel = metal(0xa7b0ad, 0.28);
  const burner = new THREE.Group();
  const base = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 48), dark));
  base.position.y = -1.16;
  const pipe = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 32), steel));
  pipe.position.y = -0.87;
  const collar = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 32), steel));
  collar.position.y = -0.98;
  const valve = shade(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), steel));
  valve.position.set(0.24, -1.08, 0);
  burner.add(base, pipe, collar, valve);
  scene.add(burner);
  const flame = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.56, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  outer.position.y = 0.28;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  inner.position.y = 0.15;
  flame.add(outer, inner);
  flame.position.y = -0.62;
  scene.add(flame);
  const glow = new THREE.PointLight(0x5aa9ff, 0.8, 3, 2);
  glow.position.set(0, -0.3, 0);
  scene.add(glow);

  // ---- Slim dropper bottles, one per substance ----
  const BOTTLE = [[0, 0], [0.26, 0], [0.3, 0.04], [0.31, 0.12], [0.31, 0.95], [0.28, 1.05], [0.2, 1.13], [0.12, 1.17], [0.11, 1.21], [0.11, 1.31], [0.085, 1.31]];
  const STOP = new Set(["solution", "mild", "dilute", "weak", "strong", "doux", "douce", "solution"]);
  const shortName = (label) => {
    const words = String(label).split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()));
    return (words.sort((a, b) => b.length - a.length)[0] || String(label)).replace(/^./, (c) => c.toUpperCase());
  };
  function labelTex(name, color) {
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
    if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  const doseMax = {};
  for (const c of ctx.config.controls || []) {
    const m = /^substances\.([^.]+)\.count$/.exec(c.path);
    if (m) doseMax[m[1]] = c.max;
  }
  const subs = ctx.config.substances;
  const bottles = subs.map((s, i) => {
    const g = new THREE.Group();
    const lm = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.15, emissive: s.color, emissiveIntensity: 0.18 });
    const liq = shade(new THREE.Mesh(new THREE.BufferGeometry(), lm));
    const body = new THREE.Mesh(lathe(BOTTLE, 64), glass());
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.3, 64, 1, true), new THREE.MeshStandardMaterial({ map: labelTex(shortName(s.label), s.color), roughness: 0.75, side: THREE.DoubleSide }));
    band.position.y = 0.5;
    band.rotation.y = Math.PI;
    const cap = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.13, 32), rubber));
    cap.position.y = 1.37;
    const bulb = shade(new THREE.Mesh(new THREE.SphereGeometry(0.105, 32, 16), rubber));
    bulb.position.y = 1.53;
    bulb.scale.y = 1.35;
    g.add(liq, band, cap, bulb, body);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.95, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.8;
    hit.userData.substance = s.id;
    g.add(hit);
    const k = subs.length - 1 - i;
    g.position.set(-1.95 - k * 1.0, -1.2, [0.25, 0.45, 0.15][i % 3]);
    scene.add(g);
    return { id: s.id, s, g, liq, hit, built: -1, color: s.color, max: doseMax[s.id] || 1 };
  });
  function shapeBottle(b) {
    const left = Math.max(0, b.max - (b.s.count || 0));
    const lv = 0.2 + 0.72 * (left / (b.max || 1));
    if (Math.abs(lv - b.built) < 0.001) return;
    b.built = lv;
    b.liq.geometry.dispose();
    b.liq.geometry = lathe([[0, 0.04], [0.27, 0.04], [0.28, 0.1], [0.28, lv], [0, lv]], 48);
  }
  bottles.forEach(shapeBottle);
  const burnerHit = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.25, 12), new THREE.MeshBasicMaterial({ visible: false }));
  burnerHit.position.y = -0.7;
  burnerHit.userData.burner = true;
  scene.add(burnerHit);

  // ---- The flask ghost of the logo, watching the flask ----
  // Open body (no flat bottom): the hem below HEM is pushed into scallops that sway.
  const ghost = new THREE.Group();
  const HEM = 0.42;
  const LOBES = 7;
  const LOBE = 0.17;
  const ghostEyes = [];
  let hemGeo = null;
  let hemBase = null;
  {
    const prof = [[0.8, 0], [0.795, 0.07], [0.79, 0.14], [0.785, 0.21], [0.78, 0.28], [0.78, 0.35], [0.78, HEM], [0.745, 0.716], [0.641, 0.94], [0.468, 1.116], [0.225, 1.25], [0.225, 1.6], [0.35, 1.6], [0.35, 1.75], [0, 1.75]];
    const ink = new THREE.MeshStandardMaterial({ color: 0x17141f, roughness: 0.3 });
    hemGeo = lathe(prof, 96);
    hemBase = Float32Array.from(hemGeo.attributes.position.array);
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xfbf8ff, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
    ghost.add(shade(new THREE.Mesh(hemGeo, bodyMat)));
    const eyeG = new THREE.SphereGeometry(0.085, 16, 12);
    const chG = new THREE.SphereGeometry(0.1, 16, 10);
    const cheek = new THREE.MeshStandardMaterial({ color: 0xff9a62, roughness: 0.6 });
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(eyeG, ink);
      e.scale.set(1, 1.3, 0.55);
      e.position.set(sx * 0.225, 0.62, 0.72);
      e.userData.sx = sx;
      ghost.add(e);
      ghostEyes.push(e);
      const ch = new THREE.Mesh(chG, cheek);
      ch.scale.set(1.2, 0.55, 0.3);
      ch.position.set(sx * 0.46, 0.4, 0.62);
      ghost.add(ch);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.017, 8, 16, Math.PI), ink);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.45, 0.77);
    ghost.add(smile);
  }
  ghost.scale.setScalar(0.85);
  const GHOST_Y = -1.2 + LOBE * 0.85 + 0.06; // floats: the scallop tips stay clear of the bench
  ghost.position.set(2.25, GHOST_Y, -0.1);
  scene.add(ghost);
  let hop = 0;
  const mood = { kind: "watch", start: 0, until: 4, dir: 1, yaw: null, wave: 0 };
  // Wavy hem: each vertex below HEM drops by a scallop that fades out going up.
  function waveHem(phase) {
    const p = hemGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const y0 = hemBase[i + 1];
      if (y0 >= HEM) continue;
      const x = hemBase[i];
      const z = hemBase[i + 2];
      const a = Math.atan2(x, z);
      const k = 1 - y0 / HEM;
      const lobe = 0.5 + 0.5 * Math.cos(LOBES * a + phase);
      const sway = 1 + 0.06 * k * Math.sin(LOBES * a + phase * 1.7);
      p[i] = x * sway;
      p[i + 1] = y0 - LOBE * lobe * k * k;
      p[i + 2] = z * sway;
    }
    hemGeo.attributes.position.needsUpdate = true;
    hemGeo.computeVertexNormals();
  }
  waveHem(0);
  // Eyes: follow the pointer, otherwise the falling drop or the flask; blink now and then.
  const look = { x: 0, y: 0 };
  let lastPtr = -1e9;
  let ptrX = 0;
  let ptrY = 0;
  window.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    ptrX = e.clientX - r.left;
    ptrY = e.clientY - r.top;
    lastPtr = performance.now();
  });
  let blinkAt = 2.5;
  const EYE_Y = 0.62;
  const bodyR = (y) => 0.78 - ((y - HEM) / (0.716 - HEM)) * (0.78 - 0.745);
  function moveEyes(dt, target) {
    const head = toScreen(ghost.position.x, ghost.position.y + EYE_Y * 0.85, ghost.position.z);
    let dx = target.x - head.x;
    let dy = target.y - head.y;
    const len = Math.hypot(dx, dy);
    const k = Math.min(1, len / 160) / (len || 1);
    dx *= k;
    dy *= k;
    const ease = Math.min(1, dt * 9);
    look.x += (dx - look.x) * ease;
    look.y += (dy - look.y) * ease;
    const blinking = t > blinkAt && t < blinkAt + 0.13;
    if (t > blinkAt + 0.13) blinkAt = t + 2.4 + Math.random() * 3.2;
    ghostEyes.forEach((e) => {
      const x = e.userData.sx * 0.225 + look.x * 0.05;
      const y = EYE_Y - look.y * 0.045;
      const r = bodyR(y);
      e.position.set(x, y, Math.sqrt(Math.max(0, r * r - x * x)) + 0.005);
      e.rotation.y = Math.asin(Math.max(-1, Math.min(1, x / r)));
      e.scale.y = blinking ? 0.15 : 1.3;
    });
  }

  // ---- Drops poured from the bottles, ripple on the liquid ----
  const drops = [];
  const dropGeo = new THREE.SphereGeometry(0.075, 20, 14);
  const ripple = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false }));
  ripple.renderOrder = 11;
  ripple.rotation.x = Math.PI / 2;
  ripple.visible = false;
  scene.add(ripple);
  let rippleT = 1;
  function pour(id) {
    const s = subs.find((x) => x.id === id);
    if (!s) return;
    const m = new THREE.Mesh(dropGeo, new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.1, emissive: s.color, emissiveIntensity: 0.2 }));
    m.scale.y = 1.35;
    m.position.set(0, 3.7, 0);
    scene.add(m);
    drops.push({ m, t: 0 });
    hop = 1;
  }

  // ---- Ground: only the shadows show on the page colour ----
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- Framing: fit the scene into the area the HUD leaves free ----
  const left = bottles.length ? bottles[0].g.position.x - 0.45 : -2.4;
  const box = { x0: Math.min(-2.4, left), x1: 3.0, y0: -1.72, y1: 2.95 }; // y0 leaves room for the bottle labels
  const center = V((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, 0);
  const tanH = Math.tan(((FOV / 2) * Math.PI) / 180);
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
    // Shift the picture so the scene centre lands in the middle of the free area.
    const dx = W / 2 - (ins.left + freeW / 2);
    const dy = H / 2 - (ins.top + freeH / 2);
    const fw = W + 2 * Math.abs(dx);
    const fh = H + 2 * Math.abs(dy);
    camera.fov = (2 * Math.atan(tanH * (fh / H)) * 180) / Math.PI;
    camera.aspect = fw / fh;
    camera.setViewOffset(fw, fh, Math.abs(dx) + dx, Math.abs(dy) + dy, W, H);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // Labels on the bottles face the camera.
    bottles.forEach((b) => { b.g.rotation.y = Math.atan2(camera.position.x - b.g.position.x, camera.position.z - b.g.position.z); });
    renderer.setSize(W, H, false);
    if (ctx.onFrame) ctx.onFrame();
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host);
  else window.addEventListener("resize", resize);

  // Screen position (CSS px inside the host) of a world point, for the HUD labels.
  const tmp = new THREE.Vector3();
  function toScreen(x, y, z) {
    const r = host.getBoundingClientRect();
    tmp.set(x, y, z).project(camera);
    return { x: ((tmp.x + 1) / 2) * r.width, y: ((1 - tmp.y) / 2) * r.height };
  }
  const anchors = {
    neck: () => toScreen(-0.3, 1.9, 0),
    bottle: (id) => {
      const b = bottles.find((x) => x.id === id);
      return b ? toScreen(b.g.position.x, -1.2, b.g.position.z) : null;
    },
  };

  // ---- Picking: click a bottle to pour, click the burner to light it ----
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const hits = [...bottles.map((b) => b.hit), burnerHit];
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
  });
  canvas.addEventListener("pointerleave", () => { hover = null; });
  canvas.addEventListener("click", (e) => {
    const h = pick(e);
    if (!h) return;
    if (h.substance) ctx.addDose(h.substance);
    else if (h.burner) ctx.toggleBurner();
  });

  // ---- Per-frame update ----
  const tint = new THREE.Color();
  const target = new THREE.Color();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pv = new THREE.Vector3();
  let t = 0;
  function liquidColor() {
    const d = world.doses();
    if (d.bleu > 0 && d.jaune > 0) return d.acide > 0 ? "#5a9a0c" : "#0b8f47";
    if (d.bleu > 0) return "#1d4ed8";
    if (d.jaune > 0) return "#eab308";
    if (d.acide > 0) return "#ea580c";
    return "#0b8f47";
  }
  tint.set(liquidColor());
  function render(dt) {
    const step = REDUCED ? 0 : dt;
    t += step;
    // Level and colour glide to the world's values.
    const goal = levelOf(world.volume);
    level += (goal - level) * (REDUCED ? 1 : Math.min(1, dt * 4));
    shapeLiquid(level);
    target.set(liquidColor());
    tint.lerp(target, REDUCED ? 1 : Math.min(1, dt * 3));
    liquidMat.color.copy(tint).multiplyScalar(0.8);
    liquidMat.emissive.copy(tint).multiplyScalar(0.95);
    menMat.color.copy(tint).lerp(new THREE.Color(0xffffff), 0.12);
    menMat.emissive.copy(tint).multiplyScalar(0.8);
    // Bubbles: many when it fizzes or boils, a few when it is hot.
    const n = liquid.visible ? (world.fizz ? NB : world.heating && world.temp > 55 ? 12 : 0) : 0;
    bubbles.count = n;
    for (let i = 0; i < n; i++) {
      const b = bubs[i];
      b.y += b.v * step;
      const top = Math.max(0.12, level - 0.04);
      if (b.y > 1) b.y = 0.05;
      const y = 0.1 + b.y * (top - 0.1);
      const rr = rIn(y) * 0.78 * b.r;
      bubbles.setMatrixAt(i, m4.compose(pv.set(Math.cos(b.a) * rr, y, Math.sin(b.a) * rr), q, sc.setScalar(b.s)));
    }
    bubbles.instanceMatrix.needsUpdate = true;
    // Steam above the neck when hot.
    const hot = Math.max(0, Math.min(1, (world.temp - 75) / 20));
    steam.forEach((p) => {
      const k = (t * 0.35 + p.ph) % 1;
      p.m.visible = hot > 0.01;
      p.m.position.set(Math.sin(k * 6 + p.ph * 9) * 0.12, 2.5 + k * 0.85, 0);
      p.m.scale.setScalar(0.5 + k * 1.2);
      p.m.material.opacity = hot * 0.35 * Math.sin(k * Math.PI);
    });
    // Thermometer column.
    const colH = 0.12 + (Math.max(0, Math.min(100, world.temp)) / 100) * 2.3;
    column.scale.y = colH;
    column.position.y = colH / 2 + 0.08;
    // Flame follows the burner state and power.
    const bru = world.material.bruleur;
    const lit = !!(bru && ctx.isActive("material", "bruleur") && bru.strength > 0);
    flame.visible = lit;
    glow.visible = lit;
    if (lit) {
      const p = 0.45 + (bru.strength / 100) * 0.75;
      const f = REDUCED ? 1 : 1 + Math.sin(t * 31) * 0.06 + Math.sin(t * 17) * 0.05;
      flame.scale.set(p / Math.sqrt(f), p * f, p / Math.sqrt(f));
      glow.intensity = 0.4 + p * 0.6;
    }
    // Bottles: remaining liquid, hover lift.
    bottles.forEach((b) => {
      shapeBottle(b);
      const up = hover && hover.substance === b.id ? 0.06 : 0;
      b.g.position.y += (-1.2 + up - b.g.position.y) * Math.min(1, dt * 12 || 1);
    });
    // Drops fall into the neck; a ripple spreads where they land.
    for (let i = drops.length - 1; i >= 0; i--) {
      const dr = drops[i];
      dr.t += REDUCED ? 1 : dt;
      const k = Math.min(1, dr.t / 0.55);
      const land = Math.max(0.12, level);
      dr.m.position.y = 3.7 - (3.7 - land) * k * k;
      if (k >= 1) {
        scene.remove(dr.m);
        dr.m.material.dispose();
        drops.splice(i, 1);
        rippleT = 0;
      }
    }
    if (rippleT < 1) {
      rippleT += REDUCED ? 1 : dt / 0.6;
      ripple.visible = rippleT < 1 && liquid.visible;
      ripple.position.y = level + 0.01;
      ripple.scale.setScalar(1 + rippleT * 3.5);
      ripple.material.opacity = 0.8 * (1 - rippleT);
    } else ripple.visible = false;
    // Ghost: gentle bob, a hop when something is poured, eyes on the flask.
    hop = Math.max(0, hop - dt * 2.2);
    const bob = REDUCED ? 0 : Math.abs(Math.sin(t * 2.2)) * 0.05;
    // Mood: watch the experiment, look at the viewer, turn around, or fly up and land.
    if (!REDUCED && t >= mood.until) {
      const r = Math.random();
      const prev = mood.kind;
      let kind = r < 0.4 ? "watch" : r < 0.65 ? "audience" : r < 0.83 ? "spin" : "fly";
      if (kind === prev && kind !== "watch") kind = "watch";
      const len = { watch: 3.5 + Math.random() * 3, audience: 2.5 + Math.random() * 2, spin: 1.8, fly: 3.4 }[kind];
      mood.kind = kind;
      mood.start = t;
      mood.until = t + len;
      mood.dir = Math.random() < 0.5 ? -1 : 1;
    }
    const mk = Math.min(1, (t - mood.start) / Math.max(0.01, mood.until - mood.start));
    const smooth = (x) => x * x * (3 - 2 * x);
    const lift = mood.kind === "fly" ? Math.sin(Math.PI * smooth(mk)) * 0.9 : 0;
    const spin = mood.kind === "spin" ? mood.dir * Math.PI * 2 * smooth(mk) : 0;
    const camYaw = Math.atan2(camera.position.x - ghost.position.x, camera.position.z - ghost.position.z);
    const yawGoal = camYaw - (mood.kind === "audience" ? 0.05 : mood.kind === "fly" ? 0.2 : 0.38);
    if (mood.yaw === null) mood.yaw = yawGoal;
    mood.yaw += (yawGoal - mood.yaw) * Math.min(1, (REDUCED ? 1 : dt) * 3);
    ghost.position.y = GHOST_Y + bob + lift + Math.sin(hop * Math.PI) * 0.35;
    ghost.position.x = 2.25 + (mood.kind === "fly" ? Math.sin(mk * Math.PI * 2) * 0.12 : 0);
    ghost.rotation.y = mood.yaw + spin;
    ghost.rotation.z = mood.kind === "fly" ? Math.sin(mk * Math.PI * 3) * 0.08 : 0;
    if (!REDUCED) {
      mood.wave += dt * (mood.kind === "fly" ? 5.5 : 2.4);
      waveHem(mood.wave);
    }
    let goal2;
    const headPt = () => toScreen(ghost.position.x, ghost.position.y + EYE_Y * 0.85, ghost.position.z);
    if (performance.now() - lastPtr < 2500) goal2 = { x: ptrX, y: ptrY };
    else if (mood.kind === "audience" || mood.kind === "spin") goal2 = headPt();
    else if (mood.kind === "fly") {
      const h = headPt();
      goal2 = { x: h.x, y: h.y + 120 }; // looks down at the bench below
    } else if (drops.length) {
      const m = drops[drops.length - 1].m.position;
      goal2 = toScreen(m.x, m.y, m.z);
    } else goal2 = toScreen(-0.3 + (REDUCED ? 0 : Math.sin(t * 0.5) * 0.6), 0.6, 0);
    moveEyes(REDUCED ? 1 : dt, goal2);
    renderer.render(scene, camera);
  }

  return { render, pour, resize, anchors, toScreen, shortName };
}

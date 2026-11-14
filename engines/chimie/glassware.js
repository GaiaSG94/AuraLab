// Chemistry glassware factories (Three.js via the global THREE).
// Pure geometry builders: no scene, no animation loop, no DOM.
// Every builder returns the meshes the bench view needs to animate.

const FLASK_PROFILE = [
  [0, 0], [0.9, 0], [0.98, 0.035], [1.0, 0.1], [0.97, 0.2],
  [0.36, 1.5], [0.3, 1.63], [0.29, 2.3], [0.34, 2.33], [0.36, 2.37],
  [0.33, 2.4], [0.28, 2.37],
];

export function lathe(THREE, points, segments) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments || 72);
}

export function glassMaterial(THREE) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.12,
    ior: 1.48,
    clearcoat: 0.6,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
  });
}

export function metalMaterial(THREE, color, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness });
}

export function shadows(mesh, receive) {
  mesh.castShadow = true;
  mesh.receiveShadow = !!receive;
  return mesh;
}

// Inner radius of the flask at height y, used to clip the liquid column.
export function flaskInnerRadius(y) {
  return y < 0.2 ? 0.92 : 0.92 - (0.92 - 0.27) * Math.min(1, (y - 0.2) / 1.3);
}

export function liquidLevelOf(volume, capacity) {
  const f = Math.min(1, Math.max(0, volume / (capacity || 500)));
  return f > 0 ? 0.08 + Math.pow(f, 0.85) * 1.36 : 0;
}

// Erlenmeyer with its liquid column, meniscus disc and a sediment bed for precipitate.
export function buildFlask(THREE) {
  const group = new THREE.Group();
  const liquidMat = new THREE.MeshStandardMaterial({
    color: 0x0b8f47,
    roughness: 0.18,
    emissive: 0x078a40,
    emissiveIntensity: 0.55,
  });
  const liquid = shadows(new THREE.Mesh(new THREE.BufferGeometry(), liquidMat));
  const menMat = new THREE.MeshStandardMaterial({
    color: 0x22c06b,
    roughness: 0.1,
    emissive: 0x0f9d50,
    emissiveIntensity: 0.45,
  });
  const men = new THREE.Mesh(new THREE.CircleGeometry(1, 64), menMat);
  men.rotation.x = -Math.PI / 2;
  // Sediment: a flattened cone resting on the flask floor, grown by precipitate mass.
  const sedMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.85 });
  const sediment = shadows(new THREE.Mesh(new THREE.ConeGeometry(0.82, 1, 40, 1), sedMat));
  sediment.rotation.x = Math.PI;
  sediment.position.y = 0.09;
  sediment.scale.set(1, 0.001, 1);
  group.add(liquid, men, sediment, new THREE.Mesh(lathe(THREE, FLASK_PROFILE), glassMaterial(THREE)));

  function shape(level) {
    const on = level > 0.06;
    liquid.visible = on;
    men.visible = on;
    sediment.visible = on;
    if (!on) return;
    const top = Math.max(0.21, level);
    liquid.geometry.dispose();
    liquid.geometry = lathe(THREE, [
      [0, 0.05], [0.84, 0.05], [0.91, 0.12],
      [flaskInnerRadius(0.2), 0.2], [flaskInnerRadius(top), top], [0, top],
    ]);
    men.scale.setScalar(flaskInnerRadius(level) - 0.01);
    men.position.y = top + 0.002;
  }

  function setSediment(mass, hex) {
    const h = Math.min(0.42, mass * 0.5);
    sediment.scale.y = Math.max(0.001, h);
    sediment.position.y = 0.09 + h / 2;
    sediment.visible = h > 0.004;
    if (hex) {
      sedMat.color.set(hex);
      sedMat.emissive = sedMat.emissive || new THREE.Color(0x000000);
    }
  }

  return { group, liquid, men, sediment, liquidMat, menMat, shape, setSediment };
}

export function buildThermometer(THREE) {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    roughness: 0.2,
    emissive: 0xff3b30,
    emissiveIntensity: 0.25,
  });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 10), red);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), red);
  bulb.position.y = 0.06;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 2.6, 20), glassMaterial(THREE));
  tube.position.y = 1.3;
  group.add(column, bulb, tube);
  group.position.set(0.12, 0.28, 0.05);
  group.rotation.z = -0.07;
  return { group, column };
}

export function buildBurner(THREE) {
  const dark = metalMaterial(THREE, 0x2f3431, 0.4);
  const steel = metalMaterial(THREE, 0xa7b0ad, 0.28);
  const group = new THREE.Group();
  const base = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 48), dark));
  base.position.y = -1.16;
  const pipe = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 32), steel));
  pipe.position.y = -0.87;
  const collar = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 32), steel));
  collar.position.y = -0.98;
  const valve = shadows(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), steel));
  valve.position.set(0.24, -1.08, 0);
  group.add(base, pipe, collar, valve);

  const flame = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.56, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x3b82f6, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  outer.position.y = 0.28;
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.065, 0.3, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xbfe6ff, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  inner.position.y = 0.15;
  flame.add(outer, inner);
  flame.position.y = -0.62;
  const glow = new THREE.PointLight(0x5aa9ff, 0.8, 3, 2);
  glow.position.set(0, -0.3, 0);
  return { group, flame, glow, hit: burnerHit(THREE) };
}

function burnerHit(THREE) {
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.25, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.y = -0.7;
  hit.userData.burner = true;
  return hit;
}

// Graduated burette holding the NaOH titrant, with a stopcock and a drain spout.
export function buildBurette(THREE) {
  const group = new THREE.Group();
  const glass = glassMaterial(THREE);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.6, 28, 1, true), glass);
  tube.position.y = 1.3;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.055, 0.34, 20), glass);
  tip.position.y = -0.16;
  const cock = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16), metalMaterial(THREE, 0x1f1d24, 0.5));
  cock.rotation.z = Math.PI / 2;
  cock.position.set(0.13, 0.06, 0);
  const fillMat = new THREE.MeshStandardMaterial({
    color: 0xc4b5fd, roughness: 0.15, transparent: true, opacity: 0.85,
    emissive: 0x7c3aed, emissiveIntensity: 0.18,
  });
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 1, 24), fillMat);
  fill.position.y = 1.3;
  group.add(tube, tip, cock, fill);
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 2.9, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.y = 1.3;
  hit.userData.burette = true;
  group.add(hit);

  // fraction: 0..1 of titrant still in the tube.
  function setFill(fraction) {
    const f = Math.max(0, Math.min(1, fraction));
    fill.scale.y = Math.max(0.001, f);
    fill.position.y = 2.6 - (2.6 * f) / 2 + 0.02;
    fill.visible = f > 0.005;
  }
  return { group, hit, setFill, fillMat };
}

// Round manometer with a needle, reading the flask headspace pressure in kPa.
export function buildManometer(THREE) {
  const group = new THREE.Group();
  const case_ = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.1, 40),
    metalMaterial(THREE, 0xdde3df, 0.35),
  );
  case_.rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.38, 40), new THREE.MeshStandardMaterial({ color: 0xfafaf7, roughness: 0.6 }));
  face.position.z = 0.056;
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.3, 0.012),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }),
  );
  needle.position.set(0, 0.12, 0.07);
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), metalMaterial(THREE, 0x1f1d24, 0.4));
  pivot.position.z = 0.07;
  group.add(case_, face, needle, pivot);
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.rotation.x = Math.PI / 2;
  group.add(hit);
  return { group, needle };
}

// Plain glass beaker resting on the bench, left of the reagent bottles.
export function buildBeaker(THREE) {
  const group = new THREE.Group();
  const glass = glassMaterial(THREE);
  const body = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.8, 36, 1, true), glass));
  body.position.y = 0.4;
  const rim = shadows(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 10, 40), glass));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.8;
  const bottom = shadows(new THREE.Mesh(new THREE.CircleGeometry(0.34, 36), glass));
  bottom.rotation.x = -Math.PI / 2;
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x9fd8ef, roughness: 0.15, transparent: true, opacity: 0.7 });
  const water = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.42, 32), waterMat));
  water.position.y = 0.21;
  group.add(body, rim, bottom, water);
  group.position.set(-1.7, -1.2, 0.35);
  return { group };
}

// Magnetic stirrer plate with its dial, parked right of the flask.
export function buildStirrer(THREE) {
  const group = new THREE.Group();
  const plate = shadows(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.65), metalMaterial(THREE, 0xe8ece9, 0.3)));
  plate.position.y = 0.05;
  const dial = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24), metalMaterial(THREE, 0x0f172a, 0.35)));
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.2, 0.08, 0.14);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.5, 28, 1, true), glassMaterial(THREE));
  cup.position.y = 0.35;
  group.add(plate, dial, cup);
  group.position.set(1.45, -1.2, 0.3);
  return { group };
}

// Wooden rack holding five empty test tubes, back-left of the bench.
export function buildTestTubeRack(THREE) {
  const group = new THREE.Group();
  const wood = metalMaterial(THREE, 0x8b5e3c, 0.65);
  const board = shadows(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.5), wood));
  const top = shadows(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.16), wood));
  top.position.set(0, 0.34, 0);
  group.add(board, top);
  for (let i = -2; i <= 2; i++) {
    const tube = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.7, 18, 1, true), glassMaterial(THREE)));
    tube.position.set(i * 0.22, 0.36, 0);
    group.add(tube);
  }
  group.position.set(-1.15, -1.2, -1.35);
  return { group };
}

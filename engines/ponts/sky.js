// Golden-hour sky (Three.js via the global THREE): a vertex-coloured gradient
// dome, a cool hemisphere fill and the low warm sun with its shadow rig.
export function buildSky(THREE, scene, horizon) {
  const R = 600;
  const g = new THREE.SphereGeometry(R, 32, 24);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const zen = new THREE.Color(0x6d9cf0);
  const mid = new THREE.Color(0xb8d2ff);
  const hor = new THREE.Color(horizon);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const k = p.getY(i) / R;
    if (k <= 0) c.copy(hor);
    else if (k < 0.12) c.copy(hor).lerp(mid, k / 0.12);
    else c.copy(mid).lerp(zen, Math.min(1, (k - 0.12) / 0.5));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  })));

  scene.add(new THREE.HemisphereLight(0xd8e7ff, 0x7d8f50, 0.85));
  const sun = new THREE.DirectionalLight(0xffd09a, 1.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  return sun;
}

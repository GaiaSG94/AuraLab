// Camera + picking rig (Three.js via the global THREE).
// Owns the camera, the warm low sun, the orbit animation and every canvas
// pointer listener — so the map view can be rebuilt without leaking one.

export function buildCameraRig(THREE, deps) {
  const { scene, canvas, ctx, dyn, siteX, radiusFor, START, onHover, sun } = deps;

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1500);

  const orbit = { theta: START.theta, phi: START.phi, radius: 47, tx: siteX[ctx.activeId()], ty: 0.5 };
  let camAnim = null;

  function updateCamera() {
    const { theta, phi, radius, tx, ty } = orbit;
    camera.position.set(
      tx + radius * Math.sin(phi) * Math.sin(theta),
      ty + radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(tx, ty, 0);
    sun.position.set(tx - 34, 26, 22);
    sun.target.position.set(tx, 0, 0);
    sun.target.updateMatrixWorld();
  }
  orbit.radius = radiusFor(ctx.activeId());
  updateCamera();

  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  function pickNode(e) {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const d = dyn[ctx.activeId()];
    if (!d) return -1;
    const hits = ray.intersectObjects(d.hits, false);
    return hits.length > 0 ? hits[0].object.userData.index : -1;
  }

  let downAt = null;
  let dragged = false;
  const listeners = [];
  function on(type, fn, opts) {
    canvas.addEventListener(type, fn, opts);
    listeners.push([type, fn, opts]);
  }

  on("pointerdown", (e) => {
    downAt = { x: e.clientX, y: e.clientY };
    dragged = false;
    canvas.setPointerCapture(e.pointerId);
  });
  on("pointermove", (e) => {
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
    const hovered = pickNode(e);
    canvas.style.cursor = hovered >= 0 ? "pointer" : "grab";
    if (onHover) onHover(hovered);
  });
  on("pointerup", (e) => {
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
  on("wheel", (e) => {
    e.preventDefault();
    orbit.radius = Math.min(110, Math.max(20, orbit.radius * (1 + e.deltaY * 0.001)));
    updateCamera();
  }, { passive: false });

  // Animated move to another level: the gap width changes, so the framing does too.
  function focus(id) {
    camAnim = { t: 0, from: { tx: orbit.tx, r: orbit.radius }, to: { tx: siteX[id], r: radiusFor(id) } };
  }

  function tick(dt) {
    if (!camAnim) return;
    camAnim.t += dt / 0.9;
    const k = camAnim.t >= 1 ? 1 : camAnim.t * camAnim.t * (3 - 2 * camAnim.t);
    orbit.tx = camAnim.from.tx + (camAnim.to.tx - camAnim.from.tx) * k;
    orbit.radius = camAnim.from.r + (camAnim.to.r - camAnim.from.r) * k;
    updateCamera();
    if (camAnim.t >= 1) camAnim = null;
  }

  function dispose() {
    for (const [type, fn, opts] of listeners) canvas.removeEventListener(type, fn, opts);
    listeners.length = 0;
  }

  return { camera, sun, orbit, updateCamera, focus, tick, dispose };
}

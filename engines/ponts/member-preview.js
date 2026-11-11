// Placement preview (Three.js via the global THREE): the translucent member you
// are about to place, coloured by the selected material and turned red when the
// span is longer than that material allows.
import { MATERIALS } from "./materials.js";

// deps: { scene, ctx, beamGeo, placeBeam, getHovered }
export function buildMemberPreview(THREE, deps) {
  const { scene, ctx, beamGeo, placeBeam, getHovered } = deps;
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false,
  });
  const mesh = new THREE.Mesh(beamGeo, material);
  mesh.visible = false;
  mesh.renderOrder = 5;
  scene.add(mesh);

  function update() {
    const world = ctx.worlds[ctx.activeId()] && ctx.worlds[ctx.activeId()].world;
    const from = ctx.selected;
    const hovered = getHovered();
    if (!world || from < 0 || hovered < 0 || hovered === from || ctx.tool === "gomme") {
      mesh.visible = false;
      return;
    }
    const def = MATERIALS[ctx.tool];
    const A = world.nodes[from];
    const B = world.nodes[hovered];
    if (!def || !A || !B) {
      mesh.visible = false;
      return;
    }
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const tooLong = len > def.maxLen;
    mesh.visible = true;
    placeBeam(mesh, A, B);
    material.color.set(tooLong ? 0xef4444 : def.color);
    material.opacity = tooLong ? 0.35 : 0.55;
  }

  return { mesh, material, update };
}

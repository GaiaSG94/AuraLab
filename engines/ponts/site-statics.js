// Bridge site statics (Three.js via the global THREE): abutments, white pylons,
// the dashed deck guide and the floating ROAD label. One group per site.
// Pure scene dressing: built once, no per-frame logic.

function box(THREE, w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function roadSprite(THREE) {
  const cv = document.createElement("canvas");
  cv.width = 320;
  cv.height = 80;
  const c = cv.getContext("2d");
  const r = 32;
  c.beginPath();
  c.moveTo(r + 4, 8);
  c.lineTo(316 - r, 8);
  c.arc(316 - r, 40, r, -Math.PI / 2, Math.PI / 2);
  c.lineTo(r + 4, 72);
  c.arc(r + 4, 40, r, Math.PI / 2, (Math.PI * 3) / 2);
  c.closePath();
  c.fillStyle = "rgba(255,255,255,0.9)";
  c.fill();
  c.font = '800 34px Archivo, "Segoe UI", system-ui, sans-serif';
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#1b1530";
  c.fillText("ROAD ↓", 160, 42);
  const tex = new THREE.CanvasTexture(cv);
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  else tex.encoding = THREE.sRGBEncoding;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  sp.scale.set(6, 1.5, 1);
  return sp;
}

// deps: { scene, ctx, sites, siteX, halfOf, BED }
export function buildSiteStatics(THREE, deps) {
  const { scene, ctx, sites, siteX, halfOf, BED } = deps;
  const concrete = new THREE.MeshStandardMaterial({ color: 0xe4ddd0, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const siteGroups = {};
  const siteTags = {};
  const roadDone = {};

  for (const s of sites) {
    const half = halfOf(s.id);
    const g = new THREE.Group();
    g.position.x = siteX[s.id];
    scene.add(g);
    const abW = 2.5 + half * 0.18;
    const abD = 4 + half * 0.2;
    box(THREE, abW, -BED + 0.5, abD, concrete, -(half + abW / 2 + 0.5), (BED - 0.5) / 2, 0, g);
    box(THREE, abW, -BED + 0.5, abD, concrete, half + abW / 2 + 0.5, (BED - 0.5) / 2, 0, g);
    // Slim H pylons around the fixed anchors (half/2, 8): the road passes between the legs.
    for (const tx of [-half / 2, half / 2]) {
      for (const tz of [-1.6, 1.6]) box(THREE, 0.55, 8.6 - BED, 0.55, white, tx, (8.6 + BED) / 2, tz, g);
      box(THREE, 0.55, 0.55, 3.75, white, tx, 7.2, 0, g);
      box(THREE, 2.6, 1.6, 4.4, concrete, tx, BED + 0.5, 0, g);
    }
    // Deck guide: dashed line along the road row.
    const world = ctx.worlds[s.id].world;
    const guidePts = [];
    for (let i = 0; i < world.deckCount; i++) guidePts.push(new THREE.Vector3(world.nodes[i].rx, 0.15, 0));
    const guide = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(guidePts),
      new THREE.LineDashedMaterial({
        color: 0xffffff, transparent: true, opacity: 0.9, dashSize: 1.2, gapSize: 0.7,
      }),
    );
    guide.computeLineDistances();
    g.add(guide);
    const tag = roadSprite(THREE);
    tag.position.set(0, 10.2, 0);
    g.add(tag);
    siteTags[s.id] = tag;
    siteGroups[s.id] = g;
  }

  return { siteGroups, siteTags, roadDone };
}

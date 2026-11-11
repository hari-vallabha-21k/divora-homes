// Divora clay-model 1BHK cutaway. Pure builder: pass in THREE, get a Group of named meshes (meters, y-up).
export const PALETTE = { ivory: 0xF7F4EC, forest: 0x243D32, gold: 0xB49A6C, sand: 0xDCD4C5, charcoal: 0x292923, white: 0xFFFFFF };
export const ROOMS = { living: [-3.4, 0.5, 1.5], kitchen: [-3.2, 1.0, -2.3], bedroom: [3.5, 0.6, -1.7], bath: [0.1, 0.8, -2.1], balcony: [3.2, 0.5, 2.6] };
export const VIEWS = {
  hero:    { pos: [13, 10.5, 14], target: [0.2, 0.4, 0], fov: 20.5, w: 1800, h: 1150 },
  plan:    { pos: [0, 30, 0.01], target: [0, 0, 0], fov: 21, w: 1600, h: 1150, up: [0, 0, -1] },
  living:  { pos: [3.2, 3.4, 8.2], target: [-3.2, 0.5, 0.6], fov: 30, w: 1600, h: 1150 },
  bedroom: { pos: [10.5, 4.6, 5.5], target: [3.3, 0.5, -1.4], fov: 26, w: 1600, h: 1150 },
  tall:    { pos: [11, 13, 12], target: [0.2, 0.2, 0], fov: 30, w: 1200, h: 1500 },
};

export function buildApartment(THREE) {
  const M = (name, color, rough = 0.92, metal = 0) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }); m.name = name; return m; };
  const mat = { plaster: M('plaster-ivory', PALETTE.ivory), sand: M('sand', PALETTE.sand), forest: M('forest', PALETTE.forest, 0.85), gold: M('muted-gold', PALETTE.gold, 0.6, 0.2), white: M('white', PALETTE.white, 0.8), charcoal: M('charcoal', PALETTE.charcoal, 0.8) };
  const g = new THREE.Group(); g.name = 'divora-apartment';
  const add = (mesh, name) => { mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
  const box = (name, m, w, h, d, x, y, z) => { const b = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat[m]), name); b.position.set(x, y + h / 2, z); return b; };
  const cyl = (name, m, rt, rb, h, x, y, z, seg = 36) => { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat[m]), name); c.position.set(x, y + h / 2, z); return c; };
  const ball = (name, m, r, x, y, z) => { const s = add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat[m]), name); s.position.set(x, y, z); return s; };
  const rbox = (name, m, w, h, d, x, y, z, r = 0.08) => {
    const b = Math.min(r * 0.5, h * 0.3), W = w - 2 * b, D = d - 2 * b, s = new THREE.Shape(), rr = Math.max(0.01, r - b);
    s.moveTo(-W / 2 + rr, -D / 2); s.lineTo(W / 2 - rr, -D / 2); s.absarc(W / 2 - rr, -D / 2 + rr, rr, -Math.PI / 2, 0, false);
    s.lineTo(W / 2, D / 2 - rr); s.absarc(W / 2 - rr, D / 2 - rr, rr, 0, Math.PI / 2, false);
    s.lineTo(-W / 2 + rr, D / 2); s.absarc(-W / 2 + rr, D / 2 - rr, rr, Math.PI / 2, Math.PI, false);
    s.lineTo(-W / 2, -D / 2 + rr); s.absarc(-W / 2 + rr, -D / 2 + rr, rr, Math.PI, Math.PI * 1.5, false);
    const geo = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 8 });
    geo.translate(0, 0, b); geo.rotateX(-Math.PI / 2);
    const mesh = add(new THREE.Mesh(geo, mat[m]), name); mesh.position.set(x, y, z); return mesh;
  };
  const T = 0.16;
  const wallShape = (u0, u1, h, holes) => {
    const s = new THREE.Shape(); s.moveTo(u0, 0); s.lineTo(u1, 0); s.lineTo(u1, h); s.lineTo(u0, h); s.closePath();
    (holes || []).forEach(o => {
      const p = new THREE.Path();
      if (o.circle) p.absarc(o.u, o.v, o.r, 0, Math.PI * 2, true);
      else if (o.arch) { const r = (o.u1 - o.u0) / 2; p.moveTo(o.u0, o.v0); p.lineTo(o.u0, o.v1 - r); p.absarc(o.u0 + r, o.v1 - r, r, Math.PI, 0, true); p.lineTo(o.u1, o.v0); p.closePath(); }
      else { p.moveTo(o.u0, o.v0); p.lineTo(o.u0, o.v1); p.lineTo(o.u1, o.v1); p.lineTo(o.u1, o.v0); p.closePath(); }
      s.holes.push(p);
    });
    return new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 24 });
  };
  const wallX = (name, x0, x1, z, h, holes, t = T) => { const geo = wallShape(x0, x1, h, holes); geo.scale(1, 1, t / T); const m = add(new THREE.Mesh(geo, mat.plaster), name); m.position.z = z - t / 2; return m; };
  const wallZ = (name, z0, z1, x, h, holes, t = T) => { const geo = wallShape(z0, z1, h, holes); geo.scale(1, 1, t / T); geo.rotateY(-Math.PI / 2); const m = add(new THREE.Mesh(geo, mat.plaster), name); m.position.x = x + t / 2; return m; };

  // Shell
  box('slab', 'plaster', 10.5, 0.3, 7.5, 0, -0.3, 0);
  box('floor-living', 'sand', 5.9, 0.02, 3.9, -2, 0, 1.5);
  box('floor-bedroom', 'sand', 3.9, 0.02, 4.9, 3, 0, -1);
  box('floor-kitchen', 'white', 3.9, 0.02, 2.9, -3, 0, -2);
  box('floor-bath', 'white', 1.9, 0.02, 2.9, 0, 0, -2);
  wallX('wall-back', -5.08, 5.08, -3.58, 2.6, [{ u0: -4.3, u1: -2.5, v0: 1.25, v1: 2.15 }, { circle: 1, u: 0.1, v: 1.75, r: 0.32 }, { arch: 1, u0: 2.75, u1: 4.25, v0: 1.2, v1: 2.35 }]);
  wallZ('wall-left', -3.5, 3.5, -5.08, 2.6, [{ u0: 0.5, u1: 2.7, v0: 0.85, v1: 2.15 }, { u0: -2.6, u1: -1.5, v0: 1.25, v1: 2.15 }]);
  box('sill-kitchen', 'gold', 1.9, 0.04, 0.24, -3.4, 1.21, -3.58);
  box('sill-living', 'gold', 0.24, 0.04, 2.3, -5.08, 0.81, 1.6);
  box('sill-bedroom', 'gold', 1.6, 0.04, 0.24, 3.5, 1.16, -3.58);
  const PH = 1.15, PT = 0.12;
  wallX('partition-living-a', -5, -2.6, -0.5, PH, null, PT); wallX('partition-living-b', -1.4, -0.3, -0.5, PH, null, PT); wallX('partition-living-c', 0.5, 1.06, -0.5, PH, null, PT);
  wallZ('partition-kitchen-bath', -3.5, -0.5, -1.06, PH, null, PT);
  wallZ('partition-bed-a', -3.5, -0.4, 0.94, PH, null, PT); wallZ('partition-bed-b', 0.5, 2.0, 0.94, PH, null, PT); wallZ('partition-balcony', 3.0, 3.5, 0.94, PH, null, PT);
  wallX('partition-bed-balcony', 1, 5.08, 1.5, PH, [{ u0: 1.7, u1: 3.1, v0: 0.5, v1: 1.15 }], PT);

  // Living
  rbox('rug', 'white', 2.9, 0.03, 2.1, -3.6, 0.02, 1.75, 0.1);
  rbox('sofa-base', 'forest', 2.3, 0.4, 0.95, -3.7, 0.02, 0.1, 0.12);
  rbox('sofa-back', 'forest', 2.3, 0.82, 0.26, -3.7, 0.02, -0.26, 0.1);
  rbox('sofa-arm-l', 'forest', 0.24, 0.6, 0.95, -4.75, 0.02, 0.1, 0.1); rbox('sofa-arm-r', 'forest', 0.24, 0.6, 0.95, -2.65, 0.02, 0.1, 0.1);
  rbox('cushion-gold', 'gold', 0.5, 0.42, 0.16, -4.25, 0.44, -0.06, 0.07).rotation.x = -0.25;
  rbox('cushion-ivory', 'plaster', 0.5, 0.42, 0.16, -3.2, 0.44, -0.06, 0.07).rotation.x = -0.25;
  cyl('coffee-table-top', 'gold', 0.5, 0.5, 0.05, -3.6, 0.36, 1.7, 48); cyl('coffee-table-leg', 'charcoal', 0.06, 0.2, 0.34, -3.6, 0.03, 1.7);
  const arm = rbox('armchair-seat', 'sand', 0.85, 0.42, 0.85, -1.55, 0.02, 1.5, 0.14); arm.rotation.y = -Math.PI / 2 - 0.3;
  const armB = rbox('armchair-back', 'sand', 0.2, 0.8, 0.85, -1.2, 0.02, 1.38, 0.09); armB.rotation.y = -0.3;
  box('tv-console', 'charcoal', 2.0, 0.42, 0.4, -3.6, 0.02, 3.2); box('tv', 'charcoal', 1.35, 0.78, 0.05, -3.6, 0.5, 3.25);
  cyl('lamp-stem', 'gold', 0.02, 0.02, 1.45, -4.6, 0.02, 3.0, 12); cyl('lamp-base', 'gold', 0.16, 0.16, 0.03, -4.6, 0.02, 3.0); cyl('lamp-shade', 'plaster', 0.14, 0.24, 0.3, -4.6, 1.4, 3.0);
  cyl('dining-top', 'white', 0.55, 0.55, 0.05, -0.4, 0.72, 2.6, 48); cyl('dining-leg', 'gold', 0.05, 0.22, 0.72, -0.4, 0.02, 2.6);
  cyl('stool-a', 'sand', 0.2, 0.17, 0.45, -1.15, 0.02, 2.75); cyl('stool-b', 'sand', 0.2, 0.17, 0.45, 0.25, 0.02, 2.2);
  cyl('plant-pot', 'gold', 0.2, 0.15, 0.36, 0.55, 0.02, -0.1); ball('plant-leaf-a', 'forest', 0.3, 0.55, 0.72, -0.1); ball('plant-leaf-b', 'forest', 0.22, 0.42, 1.02, -0.02); ball('plant-leaf-c', 'forest', 0.18, 0.68, 1.0, -0.2);

  // Kitchen
  box('counter-back', 'forest', 2.9, 0.86, 0.6, -3.45, 0.02, -3.18); box('counter-back-top', 'white', 2.96, 0.04, 0.64, -3.45, 0.88, -3.17);
  box('counter-side', 'forest', 0.6, 0.86, 1.5, -4.68, 0.02, -2.1); box('counter-side-top', 'white', 0.64, 0.04, 1.5, -4.67, 0.88, -2.1);
  box('hob', 'charcoal', 0.6, 0.015, 0.4, -3.9, 0.92, -3.18); cyl('sink', 'sand', 0.2, 0.2, 0.012, -2.7, 0.92, -3.18);
  rbox('fridge', 'white', 0.7, 1.75, 0.68, -1.5, 0.02, -3.12, 0.05); box('fridge-handle', 'gold', 0.03, 0.6, 0.03, -1.74, 0.85, -2.76);
  cyl('kettle', 'gold', 0.07, 0.09, 0.16, -4.68, 0.92, -1.7);

  // Bath
  box('vanity', 'sand', 0.9, 0.78, 0.45, -0.4, 0.02, -3.24); box('vanity-top', 'white', 0.94, 0.04, 0.48, -0.4, 0.8, -3.23);
  const mirror = cyl('mirror', 'gold', 0.27, 0.27, 0.03, -0.55, 1.3, -3.47); mirror.rotation.x = Math.PI / 2;
  rbox('tub', 'white', 0.75, 0.52, 1.6, 0.48, 0.02, -1.55, 0.2); rbox('tub-water', 'sand', 0.55, 0.02, 1.4, 0.48, 0.535, -1.55, 0.16);

  // Bedroom
  rbox('bed-base', 'sand', 1.8, 0.3, 2.15, 3.5, 0.02, -2.35, 0.08); rbox('mattress', 'white', 1.7, 0.2, 2.05, 3.5, 0.32, -2.35, 0.1);
  rbox('duvet', 'forest', 1.74, 0.1, 1.25, 3.5, 0.5, -1.92, 0.08);
  rbox('pillow-a', 'plaster', 0.68, 0.14, 0.42, 3.08, 0.52, -3.08, 0.1); rbox('pillow-b', 'plaster', 0.68, 0.14, 0.42, 3.92, 0.52, -3.08, 0.1);
  box('headboard', 'gold', 1.9, 1.05, 0.08, 3.5, 0.02, -3.46);
  cyl('side-table-a', 'plaster', 0.22, 0.22, 0.46, 2.25, 0.02, -3.15); cyl('side-table-b', 'plaster', 0.22, 0.22, 0.46, 4.72, 0.02, -3.15);
  cyl('bed-lamp-stem', 'gold', 0.015, 0.015, 0.22, 2.25, 0.48, -3.15, 10); ball('bed-lamp', 'white', 0.1, 2.25, 0.76, -3.15);
  cyl('bedroom-rug', 'white', 0.95, 0.95, 0.02, 3.3, 0.02, 0.1, 64);
  box('dresser', 'plaster', 0.5, 0.95, 1.5, 1.35, 0.02, -2.5); box('dresser-top', 'gold', 0.54, 0.03, 1.54, 1.35, 0.97, -2.5);
  box('desk-top', 'sand', 1.3, 0.05, 0.55, 3.9, 0.72, 1.1); box('desk-leg-a', 'charcoal', 0.04, 0.7, 0.5, 3.3, 0.02, 1.1); box('desk-leg-b', 'charcoal', 0.04, 0.7, 0.5, 4.5, 0.02, 1.1);
  box('laptop', 'charcoal', 0.34, 0.02, 0.24, 3.9, 0.77, 1.08); rbox('desk-chair', 'forest', 0.46, 0.46, 0.46, 3.9, 0.02, 0.5, 0.1);

  // Balcony
  box('balcony-deck', 'sand', 3.95, 0.02, 1.95, 3.05, 0, 2.55);
  for (let i = 0; i <= 10; i++) box('rail-post-front-' + i, 'gold', 0.03, 1.0, 0.03, 1.1 + i * 0.39, 0, 3.6);
  for (let i = 0; i <= 5; i++) box('rail-post-side-' + i, 'gold', 0.03, 1.0, 0.03, 5.1, 0, 1.6 + i * 0.4);
  box('rail-front', 'gold', 4.06, 0.05, 0.07, 3.1, 1.0, 3.6); box('rail-side', 'gold', 0.07, 0.05, 2.06, 5.1, 1.0, 2.6);
  rbox('balcony-chair-a', 'plaster', 0.55, 0.42, 0.55, 2.0, 0.02, 2.75, 0.14); rbox('balcony-chair-b', 'plaster', 0.55, 0.42, 0.55, 3.5, 0.02, 2.75, 0.14);
  cyl('balcony-table', 'gold', 0.26, 0.26, 0.04, 2.75, 0.5, 2.6); cyl('balcony-table-leg', 'charcoal', 0.03, 0.12, 0.5, 2.75, 0.02, 2.6, 16);
  box('planter', 'plaster', 0.45, 0.4, 1.3, 4.6, 0.02, 2.5);
  ball('bush-a', 'forest', 0.3, 4.6, 0.6, 2.1); ball('bush-b', 'forest', 0.34, 4.6, 0.66, 2.55); ball('bush-c', 'forest', 0.27, 4.6, 0.58, 2.98);
  return g;
}

// Renders named camera views to PNG data URLs with ONE shared WebGL context. Result cached per page.
export function renderViews(names) {
  const cache = (window.__divoraRenders = window.__divoraRenders || {});
  const key = names.join(',');
  if (!cache[key]) cache[key] = (async () => {
    const THREE = await import('https://unpkg.com/three@0.184.0/build/three.module.js');
    const scene = makeScene(THREE);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0x000000, 0);
    const out = {};
    for (const n of names) {
      const v = VIEWS[n]; renderer.setSize(v.w, v.h, false);
      const cam = makeCamera(THREE, v, v.w / v.h);
      renderer.render(scene, cam);
      const pts = {};
      for (const r in ROOMS) { const p = new THREE.Vector3(...ROOMS[r]).project(cam); pts[r] = { x: ((p.x + 1) / 2 * 100).toFixed(2) + '%', y: ((1 - p.y) / 2 * 100).toFixed(2) + '%' }; }
      out[n] = { url: renderer.domElement.toDataURL('image/png'), pts };
    }
    renderer.dispose(); renderer.forceContextLoss();
    return out;
  })();
  return cache[key];
}
export function makeCamera(THREE, v, aspect) {
  const cam = new THREE.PerspectiveCamera(v.fov, aspect, 0.1, 200);
  if (v.up) cam.up.set(...v.up);
  cam.position.set(...v.pos); cam.lookAt(...v.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); return cam;
}
export function makeScene(THREE) {
  const scene = new THREE.Scene();
  scene.add(buildApartment(THREE));
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xdcd4c5, 1.3));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.8); key.position.set(-7, 13, 6); key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(8, 6, 10); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.receiveShadow = true; scene.add(ground);
  return scene;
}

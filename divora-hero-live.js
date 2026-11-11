// Live three.js hero for Divora: pre-lit GLB, no lights, no tone mapping. Scroll-scrubbed camera, entry, idle drift, pointer tilt.
export const HERO = {
  ROT_Y: -25, FOV: 30,
  A: { elev: 40, azim: -8 },        // scroll 0%
  TOP: { elev: 84, azim: -25, distK: 0.62 },     // 0–35%: rise to a clear top-down plan, centring on the room
  DROP: { dist: 7.5 },                          // 35–65%: descend straight down into the room (no walls in the way)
  POV: { elev: 15, azim: 155, dist: 3.4, fov: 56 }, // 65–92%: swing down to an eye-level view inside the room
  ROOM: [-3.6, 0.85, 0.7],                      // model-local point (after centring): the hall / living room
  FIT_WIDTH: 0.66, FIT_WIDTH_MOBILE: 0.96, MAX_HEIGHT: 0.52,
  TILT_MAX: 1.5, DRIFT: 0.06,
};
const GLB = 'uploads/apartment_floor_plan-42f4f1f0.glb';
const ez = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = v => Math.max(0, Math.min(1, v));

export async function mountHero(host, opts = {}) {
  const THREE = await import('https://esm.sh/three@0.184.0');
  const { GLTFLoader } = await import('https://esm.sh/three@0.184.0/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(new URL(GLB, import.meta.url).href);
  const model = gltf.scene; model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  model.traverse(m => {
    if (!m.isMesh) return;
    const glass = /glass/i.test(m.name + ' ' + (m.material && m.material.name));
    if (glass) { m.material.depthWrite = false; m.renderOrder = 2; } else box.expandByObject(m);
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => { if (mt.map) { mt.map.colorSpace = THREE.SRGBColorSpace; mt.map.anisotropy = 8; } });
  });
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  model.position.set(-c.x, -box.min.y, -c.z);
  const pivot = new THREE.Group(), tilt = new THREE.Group();
  tilt.add(model); pivot.add(tilt); pivot.rotation.y = HERO.ROT_Y * Math.PI / 180;
  // contact shadow
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = Math.round(1024 * sz.z / sz.x);
  const pad = 0.16, g = sc.getContext('2d'); g.filter = 'blur(' + Math.round(sc.width * 0.018) + 'px)'; g.fillStyle = '#292923';
  g.fillRect(sc.width * pad, sc.height * pad, sc.width * (1 - 2 * pad), sc.height * (1 - 2 * pad));
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(sz.x / (1 - 2 * pad) * 0.98, sz.z / (1 - 2 * pad) * 0.98), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: 0.32, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.02; shadow.renderOrder = -1; tilt.add(shadow);
  const scene = new THREE.Scene(); scene.add(pivot);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1)); renderer.setClearColor(0, 0);
  const cv = renderer.domElement; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0';
  host.appendChild(cv);
  const cam = new THREE.PerspectiveCamera(HERO.FOV, 1, 0.05, 500);
  const corners = [];
  for (const x of [-sz.x / 2, sz.x / 2]) for (const y of [0, sz.y]) for (const z of [-sz.z / 2, sz.z / 2]) corners.push(new THREE.Vector3(x, y, z));
  const center0 = new THREE.Vector3(0, sz.y * 0.3, 0);
  const living = new THREE.Vector3(...HERO.ROOM);
  let W = 1, H = 1, baseDist = 40;

  const place = (elev, azim, dist, target) => {
    const el = elev * Math.PI / 180, az = azim * Math.PI / 180;
    cam.position.set(target.x + dist * Math.cos(el) * Math.sin(az), target.y + dist * Math.sin(el), target.z + dist * Math.cos(el) * Math.cos(az));
    cam.lookAt(target); cam.updateMatrixWorld();
  };
  const fit = () => {
    const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
    const fw = W < 768 ? HERO.FIT_WIDTH_MOBILE : HERO.FIT_WIDTH;
    pivot.updateMatrixWorld(true);
    const d0 = 40; place(HERO.A.elev, HERO.A.azim, d0, center0);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    corners.forEach(p => { const q = tilt.localToWorld(p.clone()).project(cam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
    const reg = opts.region ? opts.region(W, H) : { left: 0, right: W, cy: H / 2 };
    const fwPx = Math.min(fw * W, (reg.right - reg.left) * 0.98);
    baseDist = d0 * Math.max((x1 - x0) / 2 * W / fwPx, (y1 - y0) / (HERO.MAX_HEIGHT * 2));
    cam.clearViewOffset(); cam.fov = HERO.FOV; cam.updateProjectionMatrix(); place(HERO.A.elev, HERO.A.azim, baseDist, center0);
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    corners.forEach(p => { const q = tilt.localToWorld(p.clone()).project(cam); a0 = Math.min(a0, q.x); a1 = Math.max(a1, q.x); b0 = Math.min(b0, q.y); b1 = Math.max(b1, q.y); });
    const L0 = (a0 + 1) / 2 * W, R0 = (a1 + 1) / 2 * W, T0 = (1 - b1) / 2 * H, B0 = (1 - b0) / 2 * H;
    const dx = (reg.left + reg.right) / 2 - (L0 + R0) / 2, dy = reg.cy - (T0 + B0) / 2;
    cam.setViewOffset(W, H, -dx, -dy, W, H); cam.view.offsetX0 = -dx; cam.view.offsetY0 = -dy;
    opts.onLayout && opts.onLayout({ left: L0 + dx, right: R0 + dx, top: T0 + dy, bottom: B0 + dy, W, H });
  };
  fit();

  const state = { p: 0, entry: opts.reduced ? 1 : 0, tx: 0, ty: 0, px: 0, py: 0, visible: true, t0: performance.now(), entryStart: null };
  const frame = now => {
    const p = state.p;
    if (state.entryStart != null) state.entry = clamp((now - state.entryStart) / 1200);
    const e = opts.reduced ? 1 : ez(state.entry);
    const s1 = ez(clamp(p / 0.35)), s2 = ez(clamp((p - 0.35) / 0.3)), s3 = ez(clamp((p - 0.65) / 0.27));
    const tgtW = pivot.localToWorld(living.clone());
    const target = center0.clone().lerp(tgtW, s1);
    const d1 = baseDist * lerp(1, HERO.TOP.distK, s1);
    const d2 = d1 * Math.pow(HERO.DROP.dist / d1, s2);
    const dist = d2 * Math.pow(HERO.POV.dist / d2, s3);
    const elev = lerp(lerp(HERO.A.elev, HERO.TOP.elev, s1), HERO.POV.elev, s3);
    const azim = lerp(lerp(HERO.A.azim, HERO.TOP.azim, s1), HERO.POV.azim, s2);
    const fov = lerp(HERO.FOV, HERO.POV.fov, s3);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    if (cam.view) { cam.view.offsetX = cam.view.offsetX0 * (1 - s1); cam.view.offsetY = cam.view.offsetY0 * (1 - s1); cam.updateProjectionMatrix(); }
    place(elev, azim, dist, target);
    state.px += (state.tx - state.px) * 0.06; state.py += (state.ty - state.py) * 0.06;
    const t = (now - state.t0) / 1000, rad = Math.PI / 180, motion = opts.reduced ? 0 : 1;
    tilt.rotation.x = state.py * HERO.TILT_MAX * rad * motion;
    tilt.rotation.z = -state.px * HERO.TILT_MAX * rad * motion;
    tilt.position.y = (Math.sin(t * 0.7) * HERO.DRIFT) * motion - (1 - e) * 0.3;
    tilt.scale.setScalar(lerp(0.94, 1, e));
    cv.style.opacity = (e * (1 - ez(clamp((p - 0.9) / 0.1)))).toFixed(3);
    renderer.render(scene, cam);
  };
  let raf = 0, tmo = 0;
  const sched = () => { raf = requestAnimationFrame(loop); tmo = setTimeout(() => { if (raf) { cancelAnimationFrame(raf); loop(performance.now()); } }, 60); };
  const loop = now => { raf = 0; clearTimeout(tmo); frame(now); if (state.visible && !opts.reduced) sched(); };
  const kick = () => { if (!raf) sched(); };
  const io = new IntersectionObserver(es => { state.visible = es[0].isIntersecting; if (state.visible) kick(); }, { threshold: 0 });
  io.observe(host);
  const ro = new ResizeObserver(() => { fit(); kick(); }); ro.observe(host);
  kick();
  return {
    entry(delay = 0) { if (opts.reduced) { kick(); return; } setTimeout(() => { state.entryStart = performance.now(); kick(); }, delay); },
    setProgress(p) { state.p = p; frame(performance.now()); kick(); },
    setPointer(x, y) { state.tx = x; state.ty = y; kick(); },
    destroy() { cancelAnimationFrame(raf); clearTimeout(tmo); state.visible = false; io.disconnect(); ro.disconnect(); renderer.dispose(); renderer.forceContextLoss(); cv.remove(); },
  };
}

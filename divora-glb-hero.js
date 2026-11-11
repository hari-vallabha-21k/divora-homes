// Renders the pre-lit GLB (unlit/baked) to trimmed transparent PNGs for the Divora hero frames.
export const HERO_CONFIG = {
  ROT_Y: -25, FOV: 30,
  views: {
    hero:   { elev: 40, azim: 0,  w: 3000, h: 2000, trim: true },
    plan:   { elev: 65, azim: 0,  w: 3000, h: 2000, trim: true },
    mobile: { elev: 52, azim: 0,  w: 1200, h: 1500, trim: false, target: [-2.6, 0.4, 0.4], dist: 21 },
  },
};
const GLB = 'uploads/apartment_floor_plan-42f4f1f0.glb';

export function renderHeroViews(names = ['hero', 'plan', 'mobile']) {
  const cache = (window.__divoraGlb = window.__divoraGlb || {});
  const key = names.join(',');
  if (cache[key]) return cache[key];
  return (cache[key] = (async () => {
    const THREE = await import('https://esm.sh/three@0.184.0');
    const { GLTFLoader } = await import('https://esm.sh/three@0.184.0/examples/jsm/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(new URL(GLB, import.meta.url).href);
    const model = gltf.scene;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    model.traverse(m => {
      if (!m.isMesh) return;
      const isGlass = /glass/i.test(m.name + ' ' + (m.material && m.material.name));
      if (isGlass) { m.material.depthWrite = false; m.renderOrder = 2; }
      else box.expandByObject(m);
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach(mt => { if (mt.map) { mt.map.colorSpace = THREE.SRGBColorSpace; mt.map.anisotropy = 8; } });
    });
    const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const pivot = new THREE.Group();
    model.position.set(-c.x, -box.min.y, -c.z);
    pivot.add(model);
    pivot.rotation.y = HERO_CONFIG.ROT_Y * Math.PI / 180;
    // Contact shadow: blurred footprint texture on a ground plane, rotates with the model.
    const sc = document.createElement('canvas'); sc.width = 1024; sc.height = Math.round(1024 * sz.z / sz.x);
    const pad = 0.16, sx = sc.width, sy = sc.height, g = sc.getContext('2d');
    g.filter = 'blur(' + Math.round(sx * 0.018) + 'px)';
    g.fillStyle = 'rgba(41,41,35,1)';
    g.fillRect(sx * pad, sy * pad, sx * (1 - 2 * pad), sy * (1 - 2 * pad));
    const tex = new THREE.CanvasTexture(sc);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(sz.x / (1 - 2 * pad) * 0.98, sz.z / (1 - 2 * pad) * 0.98), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.34, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.02; shadow.renderOrder = -1;
    pivot.add(shadow);
    const scene = new THREE.Scene(); scene.add(pivot);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
    const out = {};
    for (const n of names) {
      const v = HERO_CONFIG.views[n];
      renderer.setSize(v.w, v.h, false);
      const cam = new THREE.PerspectiveCamera(HERO_CONFIG.FOV, v.w / v.h, 0.1, 500);
      pivot.updateMatrixWorld(true); const t = v.target ? pivot.localToWorld(new THREE.Vector3(...v.target)) : new THREE.Vector3(0, sz.y * 0.3, 0);
      const dist = v.dist || (sz.x * 0.62) / Math.tan(HERO_CONFIG.FOV * Math.PI / 360) / (v.w / v.h) * 1.05;
      const el = v.elev * Math.PI / 180, az = v.azim * Math.PI / 180;
      cam.position.set(t.x + dist * Math.cos(el) * Math.sin(az), t.y + dist * Math.sin(el), t.z + dist * Math.cos(el) * Math.cos(az));
      cam.lookAt(t);
      renderer.render(scene, cam);
      let url = renderer.domElement.toDataURL('image/png'), W = v.w, H = v.h;
      if (v.trim) {
        const cv = document.createElement('canvas'); cv.width = v.w; cv.height = v.h;
        const cx = cv.getContext('2d'); cx.drawImage(renderer.domElement, 0, 0);
        const d = cx.getImageData(0, 0, v.w, v.h).data;
        let x0 = v.w, y0 = v.h, x1 = 0, y1 = 0;
        for (let y = 0; y < v.h; y += 2) for (let x = 0; x < v.w; x += 2) if (d[(y * v.w + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        W = x1 - x0 + 2; H = y1 - y0 + 2;
        const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
        tc.getContext('2d').drawImage(cv, x0, y0, W, H, 0, 0, W, H);
        url = tc.toDataURL('image/png');
      }
      out[n] = { url, w: W, h: H };
    }
    renderer.dispose(); renderer.forceContextLoss();
    return out;
  })());
}

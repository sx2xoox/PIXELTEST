/* Atelier Viewer — .bbmodel 직접 해석 렌더러 + 이펙트 타임라인 재생기 (three.js r149, 브라우저 전용)
 * 어떤 도구로 만든 .bbmodel이든 Blockbench 규칙(그룹 계층, 박스/면 UV, 회전 ZYX, 5.0 애니메이션)대로 읽는다.
 * 데이터: window.__VIEWER_DATA = { title, sections:[{ id, title, desc, panes:[pane] }] }
 * pane: { label, kind:'model'|'player'|'fx'|'textures', model?, anim?, armor?, weapon?, timeline?, frames?, textures?, note? }
 */
(function () {
  const T = window.THREE;
  const D = window.__VIEWER_DATA;
  const rad = d => (d * Math.PI) / 180;
  const SHADE = { east: 0.6, west: 0.6, up: 1, down: 0.5, south: 0.8, north: 0.8 };
  const ORDER = ['east', 'west', 'up', 'down', 'south', 'north'];
  const FACES = ['north', 'east', 'south', 'west', 'up', 'down'];
  const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

  const texCache = new Map();
  function loadTex(src) {
    if (texCache.has(src)) return texCache.get(src);
    const t = new T.TextureLoader().load(src);
    t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; t.encoding = T.sRGBEncoding;
    texCache.set(src, t);
    return t;
  }

  // Blockbench 박스 UV (cube.js updateUV 규칙)
  function boxUV([u, v], [w, h, d], mirror) {
    const r = {
      east: [u, v + d, u + d, v + d + h], west: [u + d + w, v + d, u + 2 * d + w, v + d + h],
      up: [u + d + w, v + d, u + d, v], down: [u + d + 2 * w, v, u + d + w, v + d],
      south: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h], north: [u + d, v + d, u + d + w, v + d + h],
    };
    if (mirror) { for (const f of FACES) r[f] = [r[f][2], r[f][1], r[f][0], r[f][3]]; [r.east, r.west] = [r.west, r.east]; }
    return r;
  }

  /** .bbmodel → { root:Group, groupsByUuid, groupsByName, anims } */
  function buildBB(bb, { silhouette = false } = {}) {
    const resW = bb.resolution?.width ?? 16, resH = bb.resolution?.height ?? 16;
    const texs = (bb.textures || []).map(t => ({ tex: t.source ? loadTex(t.source) : null, uw: t.uv_width ?? resW, uh: t.uv_height ?? resH, uuid: t.uuid }));
    const root = new T.Group();
    const elemByUuid = new Map((bb.elements || []).map(e => [e.uuid, e]));
    const groupDefs = new Map((bb.groups || []).map(g => [g.uuid, g]));
    const groupsByUuid = new Map(), groupsByName = new Map();
    const mats = new Map();
    const matFor = ti => {
      const key = silhouette ? 'sil' : ti;
      if (mats.has(key)) return mats.get(key);
      const t = texs[ti];
      const m = silhouette ? new T.MeshBasicMaterial({ color: 0xf2f2f2, side: T.DoubleSide })
        : new T.MeshBasicMaterial({ map: t?.tex ?? null, color: t?.tex ? 0xffffff : 0xff00ff, vertexColors: true, alphaTest: 0.1, side: T.DoubleSide });
      mats.set(key, m);
      return m;
    };
    const hidden = new T.MeshBasicMaterial({ visible: false });
    function addCube(e, parent, parentPivot) {
      if (e.type && e.type !== 'cube') return;
      if (e.visibility === false || e.export === false) return;
      const infl = e.inflate || 0;
      const size = e.to.map((v, i) => Math.max(0.001, v - e.from[i] + infl * 2));
      const raw = e.to.map((v, i) => v - e.from[i]);
      const geo = new T.BoxGeometry(...size);
      let faces = {};
      if (e.box_uv) { const b = boxUV(e.uv_offset || [0, 0], raw.map(Math.floor), e.mirror_uv); for (const f of FACES) faces[f] = { uv: b[f], texture: (e.faces?.[f]?.texture ?? 0) }; }
      else faces = e.faces || {};
      const uv = geo.attributes.uv, colors = [], groups = [];
      ORDER.forEach((f, gi) => {
        const fc = faces[f];
        const ti = fc && fc.texture !== null && fc.texture !== undefined ? (typeof fc.texture === 'number' ? fc.texture : Math.max(0, texs.findIndex(t => t.uuid === fc.texture))) : -1;
        const t = texs[ti];
        for (let k = 0; k < 4; k++) {
          const idx = gi * 4 + k, uu = uv.getX(idx), vv = uv.getY(idx);
          if (fc && t) {
            const r = fc.uv;
            uv.setXY(idx, (r[0] + uu * (r[2] - r[0])) / t.uw, 1 - (r[1] + (1 - vv) * (r[3] - r[1])) / t.uh);
          }
          const s = e.light_emission ? 1 : SHADE[f];
          colors.push(s, s, s);
        }
        groups.push(ti);
      });
      geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      const matList = [], matIndex = new Map();
      geo.groups.forEach((g, gi) => {
        const ti = groups[gi];
        const key = ti < 0 ? 'h' : ti;
        if (!matIndex.has(key)) { matIndex.set(key, matList.length); matList.push(ti < 0 ? hidden : matFor(ti)); }
        g.materialIndex = matIndex.get(key);
      });
      const mesh = new T.Mesh(geo, matList);
      const origin = e.origin || [0, 0, 0];
      const piv = new T.Group();
      piv.position.set(origin[0] - parentPivot[0], origin[1] - parentPivot[1], origin[2] - parentPivot[2]);
      const rot = Array.isArray(e.rotation) ? e.rotation : [0, 0, 0];
      piv.rotation.order = 'ZYX'; piv.rotation.set(rad(rot[0]), rad(rot[1]), rad(rot[2]));
      const ctr = e.from.map((v, i) => (v + e.to[i]) / 2);
      mesh.position.set(ctr[0] - origin[0], ctr[1] - origin[1], ctr[2] - origin[2]);
      piv.add(mesh); parent.add(piv);
    }
    function walk(list, parent, parentPivot) {
      for (const item of list || []) {
        if (typeof item === 'string') { const e = elemByUuid.get(item); if (e) addCube(e, parent, parentPivot); continue; }
        const def = { ...(groupDefs.get(item.uuid) || {}), ...(item.name !== undefined ? item : {}) };
        if (def.visibility === false) continue;
        const o = def.origin || [0, 0, 0];
        const g = new T.Group();
        g.position.set(o[0] - parentPivot[0], o[1] - parentPivot[1], o[2] - parentPivot[2]);
        const r = def.rotation || [0, 0, 0];
        g.rotation.order = 'ZYX'; g.rotation.set(rad(r[0]), rad(r[1]), rad(r[2]));
        g.userData = { rest: { pos: g.position.clone(), rot: r.slice() }, name: def.name };
        parent.add(g);
        if (item.uuid) groupsByUuid.set(item.uuid, g);
        if (def.name) groupsByName.set(def.name, g);
        walk(item.children, g, o);
      }
    }
    if (bb.outliner && bb.outliner.length) walk(bb.outliner, root, [0, 0, 0]);
    else for (const e of bb.elements || []) addCube(e, root, [0, 0, 0]);
    // 아웃라이너에 빠진 요소도 그린다
    const drawn = new Set();
    (function collect(l) { for (const it of l || []) { if (typeof it === 'string') drawn.add(it); else collect(it.children); } })(bb.outliner);
    if (bb.outliner && bb.outliner.length) for (const e of bb.elements || []) if (!drawn.has(e.uuid)) addCube(e, root, [0, 0, 0]);
    return { root, groupsByUuid, groupsByName, anims: bb.animations || [] };
  }

  function sampleKeys(kfs, t) {
    const ks = kfs.slice().sort((a, b) => a.time - b.time);
    if (!ks.length) return null;
    const val = k => { const p = k.data_points?.[0] || {}; return [num(p.x), num(p.y), num(p.z)]; };
    if (t <= ks[0].time) return val(ks[0]);
    for (let i = 0; i < ks.length - 1; i++)
      if (t >= ks[i].time && t <= ks[i + 1].time) {
        if (ks[i].interpolation === 'step') return val(ks[i]);
        const u = (t - ks[i].time) / Math.max(1e-6, ks[i + 1].time - ks[i].time);
        const a = val(ks[i]), b = val(ks[i + 1]);
        return a.map((x, j) => x + (b[j] - x) * u);
      }
    return val(ks[ks.length - 1]);
  }
  function applyAnim(m, anim, t) {
    for (const g of m.groupsByUuid.values()) { const r = g.userData.rest; if (!r) continue; g.position.copy(r.pos); g.rotation.set(rad(r.rot[0]), rad(r.rot[1]), rad(r.rot[2])); g.scale.set(1, 1, 1); }
    for (const g of m.groupsByName.values()) { const r = g.userData.rest; if (!r) continue; g.position.copy(r.pos); g.rotation.set(rad(r.rot[0]), rad(r.rot[1]), rad(r.rot[2])); g.scale.set(1, 1, 1); }
    if (!anim) return;
    for (const [uuid, a] of Object.entries(anim.animators || {})) {
      const g = m.groupsByUuid.get(uuid) || m.groupsByName.get(a.name);
      if (!g || !g.userData.rest) continue;
      const byCh = {};
      for (const k of a.keyframes || []) (byCh[k.channel] ||= []).push(k);
      const r = g.userData.rest;
      if (byCh.rotation) { const v = sampleKeys(byCh.rotation, t); g.rotation.set(rad(r.rot[0] + v[0]), rad(r.rot[1] + v[1]), rad(r.rot[2] + v[2])); }
      if (byCh.position) { const v = sampleKeys(byCh.position, t); g.position.set(r.pos.x + v[0], r.pos.y + v[1], r.pos.z + v[2]); }
      if (byCh.scale) { const v = sampleKeys(byCh.scale, t); g.scale.set(v[0] || 1, v[1] || 1, v[2] || 1); }
    }
  }

  // ---------- 플레이어(기본 스킨 + 갑옷 + 무기) ----------
  const PARTS = [
    { p: 'head', from: [-4, 24, -4], to: [4, 32, 4], uv: [0, 0], ov: [32, 0], pivot: [0, 24, 0], ai: 1, au: [0, 0] },
    { p: 'body', from: [-4, 12, -2], to: [4, 24, 2], uv: [16, 16], ov: [16, 32], pivot: [0, 24, 0], ai: 1, au: [16, 16], li: 0.5 },
    { p: 'arm_r', from: [4, 12, -2], to: [8, 24, 2], uv: [40, 16], ov: [40, 32], pivot: [5, 22, 0], ai: 1, au: [40, 16] },
    { p: 'arm_l', from: [-8, 12, -2], to: [-4, 24, 2], uv: [32, 48], ov: [48, 48], pivot: [-5, 22, 0], ai: 1, au: [40, 16], mirror: true },
    { p: 'leg_r', from: [0, 0, -2], to: [4, 12, 2], uv: [0, 16], ov: [0, 32], pivot: [2, 12, 0], ai: 1, au: [0, 16], li: 0.5 },
    { p: 'leg_l', from: [-4, 0, -2], to: [0, 12, 2], uv: [16, 48], ov: [0, 48], pivot: [-2, 12, 0], ai: 1, au: [0, 16], li: 0.5, mirror: true },
  ];
  function buildPlayer({ skin, armor, weapon, silhouette }) {
    const texList = [{ source: skin, uv_width: 64, uv_height: 64, uuid: 's' }];
    if (armor?.humanoid) texList.push({ source: armor.humanoid, uv_width: 64, uv_height: 32, uuid: 'a1' });
    if (armor?.leggings) texList.push({ source: armor.leggings, uv_width: 64, uv_height: 32, uuid: 'a2' });
    const els = [], groups = [], outl = [];
    let n = 0;
    const cube = (part, uvOff, tex, inflate, mirror) => {
      const size = part.to.map((v, i) => v - part.from[i]);
      const b = boxUV(uvOff, size, mirror);
      const faces = {}; for (const f of FACES) faces[f] = { uv: b[f], texture: tex };
      const e = { uuid: 'e' + n++, from: part.from, to: part.to, origin: part.pivot, faces, inflate };
      els.push(e); return e.uuid;
    };
    for (const part of PARTS) {
      const ch = [cube(part, part.uv, 0, 0), cube(part, part.ov, 0, part.p === 'head' ? 0.5 : 0.25)];
      const a1 = texList.findIndex(t => t.uuid === 'a1'), a2 = texList.findIndex(t => t.uuid === 'a2');
      if (a1 > 0) ch.push(cube(part, part.au, a1, part.ai, part.mirror));
      if (a2 > 0 && part.li) ch.push(cube(part, part.au, a2, part.li, part.mirror));
      groups.push({ uuid: part.p, name: part.p, origin: part.pivot, rotation: [0, 0, 0] });
      outl.push({ uuid: part.p, children: ch });
    }
    const m = buildBB({ resolution: { width: 64, height: 64 }, textures: texList, elements: els, groups, outliner: outl }, { silhouette });
    if (weapon) {
      // 무기 규약: 쥐는 점 = 원점, 자루 = +Y. 손(팔 아래 끝)에 붙이고 자루를 앞(-Z)으로 눕힌다(바닐라 3인칭 들기와 같은 방향)
      const w = buildBB(weapon, { silhouette });
      const hold = new T.Group();
      hold.position.set(6 - 5, 13 - 22, 0 - 0); // arm_r 피벗(5,22,0) 기준 손 위치
      hold.rotation.set(rad(-90), 0, 0);
      hold.add(w.root);
      m.groupsByName.get('arm_r').add(hold);
      m.weapon = w;
    }
    return m;
  }
  function posePlayer(m, keys, tick) {
    for (const p of PARTS) { const g = m.groupsByName.get(p.p); if (g) g.rotation.set(0, 0, 0); }
    if (!keys || !keys.length) return;
    const ks = keys.slice().sort((a, b) => a.tick - b.tick);
    const parts = ['arm_r', 'arm_l', 'body', 'head', 'leg_r', 'leg_l'];
    for (const p of parts) {
      const kk = ks.filter(k => k[p]);
      if (!kk.length) continue;
      let v = kk[0][p];
      for (let i = 0; i < kk.length - 1; i++) if (tick >= kk[i].tick && tick <= kk[i + 1].tick) { const u = (tick - kk[i].tick) / Math.max(1e-6, kk[i + 1].tick - kk[i].tick); v = kk[i][p].map((x, j) => x + (kk[i + 1][p][j] - x) * u); }
      if (tick > kk[kk.length - 1].tick) v = kk[kk.length - 1][p];
      const g = m.groupsByName.get(p);
      if (g) { g.rotation.order = 'ZYX'; g.rotation.set(rad(v[0]), rad(v[1]), rad(v[2])); }
    }
  }

  // ---------- 이펙트 타임라인 ----------
  function buildFx(tl, frames) {
    const root = new T.Group();
    const tracks = (tl.tracks || []).map(tr => {
      const mats = (tr.frames || []).map(f => new T.MeshBasicMaterial({ map: frames[f] ? loadTex(frames[f]) : null, transparent: true, alphaTest: 0.02, depthWrite: false, side: T.DoubleSide, color: new T.Color(tr.tint || '#ffffff').convertSRGBToLinear() })); // 틴트 hex는 sRGB → 선형 변환(안 하면 분홍빛으로 옅어짐)
      const sz = tr.size || [1, 1];
      const mesh = new T.Mesh(new T.PlaneGeometry(sz[0] * 16, sz[1] * 16), mats[0] || new T.MeshBasicMaterial({ visible: false }));
      mesh.visible = false; mesh.renderOrder = 10;
      root.add(mesh);
      return { tr, mesh, mats };
    });
    function update(tick, camera) {
      for (const { tr, mesh, mats } of tracks) {
        const s = tr.start_tick ?? 0, e = tr.end_tick ?? tl.duration_ticks ?? 20;
        if (tick < s || tick > e || !mats.length) { mesh.visible = false; continue; }
        mesh.visible = true;
        const fi = Math.min(mats.length - 1, Math.floor((tick - s) / (tr.ticks_per_frame || 1)));
        mesh.material = mats[fi];
        const ks = (tr.keys || []).slice().sort((a, b) => a.tick - b.tick);
        const lerp = (key, def) => {
          const kk = ks.filter(k => k[key]);
          if (!kk.length) return def;
          if (tick <= kk[0].tick) return kk[0][key];
          for (let i = 0; i < kk.length - 1; i++) if (tick >= kk[i].tick && tick <= kk[i + 1].tick) { const u = (tick - kk[i].tick) / Math.max(1e-6, kk[i + 1].tick - kk[i].tick); return kk[i][key].map((x, j) => x + (kk[i + 1][key][j] - x) * u); }
          return kk[kk.length - 1][key];
        };
        const p = lerp('translation', [0, 0, 0]), r = lerp('rotation', [0, 0, 0]), sc = lerp('scale', [1, 1, 1]);
        mesh.position.set(p[0] * 16, p[1] * 16, p[2] * 16);
        mesh.scale.set(sc[0], sc[1], sc[2] ?? 1);
        if (tr.billboard === 'center' && camera) { mesh.quaternion.copy(camera.quaternion); mesh.rotateZ(rad(r[2])); }
        else if (tr.billboard === 'vertical' && camera) { mesh.rotation.set(0, Math.atan2(camera.position.x - mesh.position.x, camera.position.z - mesh.position.z), rad(r[2])); }
        else { mesh.rotation.order = 'XYZ'; mesh.rotation.set(rad(r[0]), rad(r[1]), rad(r[2])); }
      }
    }
    return { root, update };
  }

  // ---------- 스테이지(캔버스 하나) ----------
  class Stage {
    constructor(host, pane) {
      this.pane = pane; this.host = host;
      this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.renderer.outputEncoding = T.sRGBEncoding;
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      host.appendChild(this.renderer.domElement);
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(35, 1, 0.5, 5000);
      this.yaw = pane.yaw ?? -35; this.pitch = pane.pitch ?? 18; this.dist = 1; this.t = 0; this.playing = true; this.speed = 1;
      this.silhouette = false;
      this.build();
      this.bindInput();
      this.resize();
    }
    build() {
      while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
      const p = this.pane;
      const grid = new T.GridHelper(16 * 8, 8, 0x3a3340, 0x2a2530); grid.position.y = 0; this.scene.add(grid);
      this.model = null; this.player = null; this.fx = null;
      if (p.kind === 'model') { this.model = buildBB(p.model, { silhouette: this.silhouette }); this.scene.add(this.model.root); this.anim = (this.model.anims || []).find(a => a.name.endsWith(p.anim || '')) || null; }
      if (p.kind === 'player' || p.kind === 'fx') { this.player = buildPlayer({ skin: D.skin, armor: p.armor, weapon: p.weapon, silhouette: this.silhouette }); this.scene.add(this.player.root); }
      if (p.kind === 'fx') { this.fx = buildFx(p.timeline, p.frames || {}); this.scene.add(this.fx.root); }
      if (p.kind === 'weapon') { const w = buildBB(p.model, { silhouette: this.silhouette }); this.model = w; this.scene.add(w.root); }
      const box = new T.Box3().setFromObject(this.model?.root || this.player?.root);
      if (p.kind === 'fx') {
        // 이펙트가 닿는 범위까지 화면에 담는다(트랙 위치 ± 크기)
        for (const tr of p.timeline.tracks || []) for (const k of tr.keys || []) if (k.translation) {
          const [x, y, z] = k.translation.map(v => v * 16), h = ((tr.size || [1, 1])[1] * 16) / 2, w = ((tr.size || [1, 1])[0] * 16) / 2;
          box.expandByPoint(new T.Vector3(x - w, Math.max(0, y - h), z - w)).expandByPoint(new T.Vector3(x + w, y + h, z + w));
        }
      }
      this.center = box.getCenter(new T.Vector3());
      const s = box.getSize(new T.Vector3());
      this.dist = Math.max(s.x, s.y, s.z) * (p.kind === 'fx' ? 1.45 : 1.75) + 6;
    }
    bindInput() {
      const el = this.renderer.domElement;
      let drag = null;
      el.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, this.yaw, this.pitch]; el.setPointerCapture(e.pointerId); });
      el.addEventListener('pointermove', e => { if (!drag) return; this.yaw = drag[2] + (e.clientX - drag[0]) * 0.4; this.pitch = Math.max(-80, Math.min(85, drag[3] + (e.clientY - drag[1]) * 0.3)); });
      el.addEventListener('pointerup', () => (drag = null));
      el.addEventListener('wheel', e => { e.preventDefault(); this.dist *= e.deltaY > 0 ? 1.1 : 0.9; }, { passive: false });
    }
    resize() { const w = this.host.clientWidth || 300, h = this.host.clientHeight || 300; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    duration() {
      if (this.pane.kind === 'fx') return (this.pane.timeline.duration_ticks || 20) / 20;
      return this.anim?.length || 1;
    }
    frame(dt) {
      if (this.playing) this.t = (this.t + dt * this.speed) % Math.max(0.05, this.duration());
      const yaw = rad(this.yaw), pitch = rad(this.pitch);
      this.camera.position.set(this.center.x + Math.sin(yaw) * Math.cos(pitch) * this.dist * -1, this.center.y + Math.sin(pitch) * this.dist, this.center.z - Math.cos(yaw) * Math.cos(pitch) * this.dist);
      this.camera.lookAt(this.center);
      if (this.model && this.anim) applyAnim(this.model, this.anim, this.t);
      if (this.pane.kind === 'fx') { const tick = this.t * 20; posePlayer(this.player, this.pane.timeline.player, tick); this.fx.update(tick, this.camera); }
      this.renderer.render(this.scene, this.camera);
    }
    dispose() { this.renderer.dispose(); this.renderer.domElement.remove(); }
  }

  // ---------- UI ----------
  const nav = document.getElementById('nav'), main = document.getElementById('main');
  let stages = [];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function show(id) {
    stages.forEach(s => s.dispose()); stages = [];
    const sec = D.sections.find(s => s.id === id) || D.sections[0];
    [...nav.querySelectorAll('button')].forEach(b => b.setAttribute('aria-current', b.dataset.id === sec.id ? 'true' : 'false'));
    main.innerHTML = `<header class="sec-h"><h2>${esc(sec.title)}</h2>${sec.desc ? `<p>${esc(sec.desc)}</p>` : ''}</header><div class="panes"></div>`;
    const wrap = main.querySelector('.panes');
    sec.panes.forEach((p, i) => {
      const card = document.createElement('section');
      card.className = 'pane';
      card.innerHTML = `<div class="pane-h"><span class="tag">${esc(p.label)}</span>${p.note ? `<span class="note">${esc(p.note)}</span>` : ''}</div>`;
      if (p.kind === 'textures') {
        card.innerHTML += `<div class="tex">${p.textures.map(t => `<figure><img src="${t.src}" style="width:${t.w}px" alt="${esc(t.name)}"><figcaption>${esc(t.name)}</figcaption></figure>`).join('')}</div>`;
        wrap.appendChild(card); return;
      }
      const host = document.createElement('div'); host.className = 'stage'; card.appendChild(host);
      const ctl = document.createElement('div'); ctl.className = 'ctl';
      const anims = p.kind === 'model' ? (p.model.animations || []) : [];
      ctl.innerHTML = `<button class="play" type="button" aria-label="재생/정지">❚❚</button>
        <input class="scrub" type="range" min="0" max="1000" value="0" aria-label="시간">
        <span class="time">0.00s</span>
        ${anims.length ? `<select class="anim" aria-label="애니메이션">${anims.map(a => `<option ${a.name.endsWith(p.anim || '@@') ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>` : ''}
        <select class="speed" aria-label="속도"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select>
        <label class="sil"><input type="checkbox"> 실루엣</label>`;
      card.appendChild(ctl);
      if (p.desc) card.insertAdjacentHTML('beforeend', `<p class="desc">${esc(p.desc)}</p>`);
      wrap.appendChild(card);
      const st = new Stage(host, p); stages.push(st);
      const play = ctl.querySelector('.play'), scrub = ctl.querySelector('.scrub'), time = ctl.querySelector('.time');
      play.onclick = () => { st.playing = !st.playing; play.textContent = st.playing ? '❚❚' : '▶'; };
      scrub.oninput = () => { st.playing = false; play.textContent = '▶'; st.t = (scrub.value / 1000) * st.duration(); };
      ctl.querySelector('.speed').onchange = e => (st.speed = +e.target.value);
      ctl.querySelector('.sil input').onchange = e => { st.silhouette = e.target.checked; const keep = [st.yaw, st.pitch, st.dist]; st.build(); [st.yaw, st.pitch, st.dist] = keep; };
      const sel = ctl.querySelector('.anim'); if (sel) sel.onchange = () => { st.anim = anims.find(a => a.name === sel.value); st.t = 0; };
      st.ui = { scrub, time };
    });
    try { history.replaceState(null, '', '#' + sec.id); } catch (_) {}
  }
  nav.innerHTML = D.sections.map(s => `<button type="button" data-id="${s.id}">${esc(s.title)}</button>`).join('');
  nav.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.id); });
  window.addEventListener('resize', () => stages.forEach(s => s.resize()));
  let last = performance.now();
  (function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    for (const s of stages) { s.frame(window.__frozen ? 0 : dt); if (s.ui) { s.ui.time.textContent = s.pane.kind === 'fx' ? `${Math.floor(s.t * 20)} tick` : `${s.t.toFixed(2)}s`; if (s.playing) s.ui.scrub.value = Math.round((s.t / s.duration()) * 1000); } }
    requestAnimationFrame(loop);
  })(last);
  const start = (location.hash || '').slice(1);
  show(D.sections.some(s => s.id === start) ? start : D.sections[0].id);
  // 자동 캡처용 API(헤드리스 블라인드 렌더)
  window.__viewer = { show, stages: () => stages, setTime: t => stages.forEach(s => { s.playing = false; s.t = t; }), setView: (yaw, pitch) => stages.forEach(s => { s.yaw = yaw; s.pitch = pitch; }) };
})();

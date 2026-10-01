// byTruckar.js — food truckarna i byn (Byn och gästerna, 2D och 3D). Rivaler precis som krogarna:
// de står i listan, har stjärnor och lockar gäster efter typ. De parkerar på de tre platserna från
// paket 2 (torget, vid Måltidens hus, vid sjön) och byter plats mellan kvällarna.
// Talen här (stjärnor, preferenser, ätartid) är prototypens och hör hemma i balance.ts.
(function () {
  const SPOTS = {
    torget: { name: 'torget', pos: [1012, 468], a: 0, node: 'S', door: [1012, 494] },
    maltid: { name: 'Måltidens hus', pos: [292, 428], a: Math.PI / 2, node: 'CAM', door: [268, 428] },
    sjon: { name: 'sjön', pos: [585, 858], a: -0.13, node: 'L1', door: [587, 880] }
  };
  const TRUCKS = [
    { id: 'grill', name: 'Grillvagnen', kind: 'Burgare från vagnen', col: '#8a3f2c', awn: ['#e9c46a', '#8a3f2c'], stars: 2, pref: { student: 4, medel: 2.0, hog: 0.2, social: 1.6 } },
    { id: 'taco', name: 'Tacovagnen', kind: 'Tacos och lemonad', col: '#2f6b5a', awn: ['#f0e2c4', '#2f6b5a'], stars: 1, pref: { student: 4.5, medel: 1.5, hog: 0.1, social: 1.2 } }
  ];
  // Veckans schema: var vagnarna står varje kväll.
  const EVENINGS = [
    { label: 'Fredag · vecka 1 av 8', at: { grill: 'torget', taco: 'sjon' } },
    { label: 'Lördag · vecka 1 av 8', at: { grill: 'sjon', taco: 'maltid' } },
    { label: 'Fredag · vecka 2 av 8', at: { grill: 'maltid', taco: 'torget' } },
    { label: 'Lördag · vecka 2 av 8', at: { grill: 'torget', taco: 'maltid' } }
  ];
  const DRIVE = 120;

  function place(rs, spotId) {
    const s = SPOTS[spotId];
    rs.spot = spotId; rs.node = s.node; rs.door = s.door.slice(); rs.x = s.pos[0]; rs.y = s.pos[1]; rs.a = s.a;
    rs.box = [s.pos[0] - 40, s.pos[1] - 12, 80, 24];
    rs.sub = rs.kind + ' · vid ' + s.name;
  }
  function install(C, evening) {
    C.evening = evening ?? 1;
    TRUCKS.forEach((T) => {
      if (C.REST.some((r) => r.id === T.id)) return;
      const rs = { id: T.id, name: T.name, kind: T.kind, truck: true, col: T.col, awn: T.awn, stars: T.stars, closed: false };
      place(rs, EVENINGS[C.evening].at[T.id]);
      C.REST.push(rs);
      Object.keys(T.pref).forEach((k) => { C.PREF[k][T.id] = T.pref[k]; });
    });
  }
  function eat(C, w) {
    const rs = w.rest, c = C.counts[rs.id]; c[w.type] = (c[w.type] || 0) + w.n;
    C.pops.push({ x: w.x, y: w.y, until: C.t + 1.2, col: C.T[w.type].col, n: w.n });
    // Ställer sig vid luckan och äter stående, i kö längs vagnen.
    const k = C.walkers.filter((o) => o.ate && !o.gone && o.rest === rs).length;
    const ax = Math.cos(rs.a), ay = Math.sin(rs.a), ox = rs.door[0] - rs.x, oy = rs.door[1] - rs.y, ol = Math.hypot(ox, oy) || 1;
    const along = (k % 3 - 1) * 22, out = 10 + Math.floor(k / 3) * 18;
    w.x = rs.door[0] + ax * along + (ox / ol) * out; w.y = rs.door[1] + ay * along + (oy / ol) * out;
    w.ate = true; w.stop = 7 + Math.random() * 6; w.lookAt = { x: rs.x, y: rs.y }; w.pts = [[w.x, w.y]]; w.seg = 0;
  }
  function nextEvening(C) {
    C.evening = (C.evening + 1) % EVENINGS.length;
    const moves = [];
    C.REST.filter((r) => r.truck).forEach((rs) => {
      const to = EVENINGS[C.evening].at[rs.id]; if (to === rs.spot) return;
      const nodes = C.bfs(rs.node, SPOTS[to].node);
      rs.drive = { to, pts: [[rs.x, rs.y], ...nodes.map((k) => C.N[k].slice()), SPOTS[to].pos.slice()], seg: 0 };
      rs.closed = true; moves.push(rs.name + ' kör till ' + SPOTS[to].name);
    });
    // Ny kväll: räknarna börjar om, och ingen går mot en vagn som har kört.
    C.REST.forEach((r) => { C.counts[r.id] = { student: 0, medel: 0, hog: 0, social: 0, miljardar: 0 }; });
    C.walkers.forEach((w) => { if (w.rest && w.rest.truck && !w.ate) w.gone = true; });
    return moves.length ? moves.join('. ') + '.' : 'Vagnarna står kvar där de stod i går.';
  }
  function update(C, dt) {
    C.REST.forEach((rs) => {
      if (!rs.drive) return;
      const d = rs.drive, p = d.pts[d.seg + 1];
      if (!p) { place(rs, d.to); rs.drive = null; rs.closed = false; return; }
      const dx = p[0] - rs.x, dy = p[1] - rs.y, L = Math.hypot(dx, dy), sp = DRIVE * dt;
      if (L <= sp) { rs.x = p[0]; rs.y = p[1]; d.seg++; } else { rs.x += dx / L * sp; rs.y += dy / L * sp; }
      const ta = Math.atan2(dy, dx); rs.a += Math.atan2(Math.sin(ta - rs.a), Math.cos(ta - rs.a)) * Math.min(1, dt * 6);
      rs.box = [rs.x - 40, rs.y - 12, 80, 24];
    });
  }
  // ---------- 2D ----------
  function draw2d(C, x, V, t) {
    C.REST.forEach((rs) => {
      if (!rs.truck) return;
      x.save(); x.translate(rs.x, rs.y); x.rotate(rs.a);
      const side = rs.drive ? 1 : Math.sign((rs.door[0] - rs.x) * -Math.sin(rs.a) + (rs.door[1] - rs.y) * Math.cos(rs.a)) || 1;
      x.fillStyle = 'rgba(0,0,0,.4)'; V.rrect(x, -34, -13, 72, 32, 6); x.fill();
      x.fillStyle = rs.col; V.rrect(x, -36, -15, 72, 30, 6); x.fill();
      x.fillStyle = V.shade(rs.col, -0.35); V.rrect(x, 22, -13, 14, 26, 4); x.fill();
      x.fillStyle = 'rgba(255,240,210,.18)'; x.fillRect(-30, -11, 48, 3);
      if (!rs.drive) {
        // Luckan lyser, och markisen är utfälld mot gatan.
        for (let i = 0; i < 6; i++) { x.fillStyle = rs.awn[i % 2]; x.fillRect(-28 + i * 8, side * 15, 8, side * 9); }
        x.fillStyle = '#ffe2a0'; x.fillRect(-26, side > 0 ? 11 : -15, 40, 4);
      } else { x.fillStyle = '#ffe9b0'; x.fillRect(34, -11, 3, 5); x.fillRect(34, 6, 3, 5); }
      x.restore();
      if (!rs.drive) { x.globalCompositeOperation = 'lighter'; V.glow(x, rs.door[0], rs.door[1], 46 + Math.sin(t * 3) * 3, 'rgba(255,190,100,A)', 0.4); x.globalCompositeOperation = 'source-over'; }
    });
  }
  // ---------- 3D ----------
  function draw3d(C, M, S) {
    const THREE = M.THREE;
    C.truckGfx = C.truckGfx || new Map();
    C.REST.forEach((rs) => {
      if (!rs.truck) return;
      let G = C.truckGfx.get(rs);
      if (!G) {
        const g = new THREE.Group(), m = (c, r, e) => { const k = new THREE.MeshStandardMaterial({ color: c, roughness: r ?? 0.6 }); if (e) { k.emissive = new THREE.Color(e); k.emissiveIntensity = 1.2; } return k; };
        const add = (geo, mat, px, py, pz) => { const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
        add(new THREE.BoxGeometry(5.6, 2.5, 2.4), m(rs.col, 0.5), -0.4, 1.65, 0);
        add(new THREE.BoxGeometry(1.4, 1.7, 2.3), m('#' + new THREE.Color(rs.col).multiplyScalar(0.6).getHexString(), 0.4), 2.9, 1.25, 0);
        [-2.2, 1.0, 2.9].forEach((wx) => [-1.15, 1.15].forEach((wz) => { const wh = add(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), m('#1c1a19', 0.9), wx, 0.45, wz); wh.rotation.x = Math.PI / 2; }));
        const hatch = add(new THREE.BoxGeometry(3.6, 0.9, 0.06), m('#ffe2a0', 0.5, '#ffb050'), -0.6, 2.0, 1.22);
        const awn = new THREE.Group(); g.add(awn);
        for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 1.2), m(rs.awn[i % 2], 0.8)); s.position.set(-2.2 + i * 0.64, 2.6, 1.8); s.rotation.x = 0.25; s.castShadow = true; awn.add(s); }
        const light = new THREE.PointLight('#ffb060', 6, 9, 1.6); light.position.set(-0.6, 2.2, 2.4); g.add(light);
        S.scene.add(g); G = { g, hatch, awn, light }; C.truckGfx.set(rs, G);
      }
      const [a, b] = C.map(rs.x, rs.y); G.g.position.set(a, 0, b); G.g.rotation.y = -rs.a;
      const side = Math.sign((rs.door[0] - rs.x) * -Math.sin(rs.a) + (rs.door[1] - rs.y) * Math.cos(rs.a)) || 1;
      G.g.scale.z = side; // luckan och markisen mot gatan
      G.awn.visible = !rs.drive; G.light.intensity = rs.drive ? 0 : 6; G.hatch.visible = !rs.drive;
    });
  }
  window.BYT = { SPOTS, TRUCKS, EVENINGS, install, eat, nextEvening, update, draw2d, draw3d, label: (C) => EVENINGS[C.evening ?? 1].label };
})();

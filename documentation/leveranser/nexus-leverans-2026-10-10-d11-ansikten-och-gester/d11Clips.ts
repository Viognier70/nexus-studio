// d11Clips.ts — utdraget ur figureClips.ts: avsnittet D11 (läggs sist i filen, efter MOOD_GESTURES). Samma kod som i figureClips.ts här bredvid.
// ===== D11 ansiktsuttryck och gester (2026-10-10) ======================
// Anders 2026-10-09: spelaren ska kunna läsa gästerna (phronesis) utan symboler. Det mesta av gesterna finns redan
// (D1 stämningen, D9 och D10). Här är det som saknades: luta sig fram och prata, rycka på axlarna, nicka efter första
// smaken, personalens lutade huvud och avtorkningen vid bordet, gatans gångarter, stanna och titta, och hälsa.
// Gesterna i vinbaren finns också stående (…Stand) för vagnen: samma pose med ctx.seated = false.
// Kartan över vilken gest som hör till vilken stämning och situation ligger i gestureMap.ts.
// Huvudets lutning (head.roll) är ny i riggen (figureRig.ts PoseHead.roll), samma led.

reg(def({
  id: 'guest.leanTalk', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3.6, mood: 'content',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.laugh', 'guest.leanTalk', 'guest.nodApprove'],
  pose: function (u, c) {
    // Fram över bordet mot den hen pratar med, vänster underarm på bordet, höger hand som ritar i luften.
    const k = moodK(c), b = base(c, true), lean = win(u, 0.08, 0.92, 0.15), talk = Math.sin(u * TAU * 4) * win(u, 0.2, 0.85, 0.08);
    const seated = (b.hipDrop ?? 0) > 0;
    return breathe(withYaw(P(b, {
      torso: { pitch: (b.torso?.pitch ?? 0) + (seated ? 0.3 : 0.22) * k * lean },
      head: { pitch: 0.06 - 0.2 * lean + 0.05 * talk, roll: 0.08 * lean },
      armL: blendArm(b.armL ?? A(0, 0, 0), seated ? A(0.9, 0.14, 1.25) : A(0.55, 0.12, 1.5), lean),
      armR: blendArm(b.armR ?? A(0, 0, 0), A(0.95 + 0.14 * talk, 0.16, 1.25 - 0.2 * talk), lean)
    }), (c.yaw ?? 0) * 0.45 * lean, (c.yaw ?? 0) * 0.85 * lean), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.shrug', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, mood: 'waiting',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.checkWatch', 'guest.leanTalk'],
  pose: function (u, c) {
    // Underarmarna ut med handflatorna upp, kroppen lyfts (axlarna), huvudet på sned och lite bakåt. En gång, sedan ned.
    const k = moodK(c), b = base(c, true), s = win(u, 0.12, 0.8, 0.16), up = bell(u, 0.42, 0.13);
    const palm = A(0.55, 0.5 * k, 1.55);
    return withYaw(P(b, {
      lift: 0.028 * k * up,
      torso: { pitch: (b.torso?.pitch ?? 0) - 0.05 * s },
      head: { pitch: 0.04 - 0.12 * s, roll: 0.26 * k * s },
      armL: blendArm(b.armL ?? A(0, 0, 0), palm, s), armR: blendArm(b.armR ?? A(0, 0, 0), palm, s)
    }), (c.yaw ?? 0) * 0.3 * s, (c.yaw ?? 0) * 0.6 * s);
  }
}));

reg(def({
  id: 'guest.nodFirstBite', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 4.2, mood: 'content',
  from: 'seated', to: 'seated', needs: 'chair', holds: { L: 'knife', R: 'fork' }, ends: { L: 'knife', R: 'fork' }, events: [],
  next: ['guest.eat', 'guest.leanTalk', 'guest.seatedIdle'],
  pose: function (u, c) {
    // Gaffeln till munnen, tuggar med huvudet stilla, och sedan två nickar med gaffeln lyft mot tallriken: det här var gott.
    // Nöjd ger två nickar, glad (tempo stressat) tre och ett lyft i bålen.
    const k = moodK(c), b = base(c, true);
    const mouth = win(u, 0.1, 0.36, 0.1), chew = win(u, 0.34, 0.56, 0.05), nods = win(u, 0.56, 0.95, 0.06);
    const n = (c.stress ?? 0.3) > 0.7 ? 3 : 2, nod = 0.28 * k * Math.max(0, Math.sin((u - 0.56) / 0.39 * Math.PI * n)) * nods;
    return withYaw(P(b, {
      lift: 0.012 * k * nods * ((c.stress ?? 0.3) > 0.7 ? 1 : 0),
      torso: { pitch: (b.torso?.pitch ?? 0) + 0.08 * mouth - 0.06 * nods },
      head: { pitch: 0.1 - 0.06 * mouth + 0.04 * Math.sin(u * TAU * 9) * chew + nod },
      armR: blendArm(A(0.78, 0.1, 0.95), A(1.05, 0.08, 2.15), mouth),
      armL: A(0.78, 0.1, 0.95)
    }), (c.yaw ?? 0) * 0.2 * nods, (c.yaw ?? 0) * 0.6 * nods);
  }
}));

// Rekvisitans gester från raketerna, nu som gästens egna (stämningen nöjd). Samma pose, samma händelser.
reg({ ...CLIPS['rocket.smellWine'], id: 'guest.smellWine', group: 'guest', mood: 'content', next: ['guest.nodApprove', 'guest.seatedIdle', 'guest.leanTalk'] });
reg({ ...CLIPS['rocket.askPointMenu'], id: 'guest.pointMenu', group: 'guest', mood: 'content', next: ['guest.seatedIdle', 'guest.leanTalk'] });

// ----- stående, för vagnen -----
// D9:s tillaggClips.ts har stående klipp med namnen guest.checkWatch och guest.armsCrossed, samma namn som D1:s sittande.
// D11 ger de stående ett eget namn (…Stand). D9:s namn blir alias för dem i kön.
function standing(src: string, id: string, x?: Partial<ClipSpec>): void {
  const s = CLIPS[src];
  reg({ ...s, id: id, from: 'stand', to: 'stand', needs: 'floor', seatKind: undefined, holds: x?.holds ?? {}, ends: x?.ends ?? {}, events: x?.events ?? [],
    next: x?.next ?? ['staff.idle', 'guest.walk'], pose: function (u, c) { return s.pose(u, { ...c, seated: false }); } });
}
standing('guest.laugh', 'guest.laughStand');
standing('guest.leanTalk', 'guest.leanTalkStand');
standing('guest.shrug', 'guest.shrugStand');
standing('guest.checkWatch', 'guest.checkWatchStand');
standing('guest.armsCrossed', 'guest.armsCrossedStand');
standing('guest.nodApprove', 'guest.nodApproveStand');
standing('guest.waveWaiter', 'guest.waveWaiterStand');

reg(def({
  id: 'guest.nodFirstBiteStand', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 4.2, mood: 'content', handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: { R: 'any' }, ends: { R: 'any' }, events: [],
  next: ['staff.idle', 'guest.leanTalkStand', 'guest.walk'],
  pose: function (u, c) {
    // Vid ståbordet: korven eller tråget till munnen med höger hand, tugga, och nicka med blicken på det man äter.
    const k = moodK(c), mouth = win(u, 0.1, 0.36, 0.1), chew = win(u, 0.34, 0.56, 0.05), nods = win(u, 0.56, 0.95, 0.06);
    const nod = 0.28 * k * Math.max(0, Math.sin((u - 0.56) / 0.39 * Math.PI * 2)) * nods;
    return withYaw(P(STAND, {
      torso: { pitch: 0.06 + 0.08 * mouth },
      head: { pitch: 0.12 - 0.08 * mouth + 0.04 * Math.sin(u * TAU * 9) * chew + nod },
      armR: blendArm(CHEST_ARM, A(1.15, 0.1, 2.2), mouth), armL: A(0.25, 0.08, 0.9)
    }), 0, (c.yaw ?? 0) * 0.5 * nods);
  }
}));

reg(def({
  id: 'guest.waveStand', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, handed: true, mood: 'content',
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'guest.walk'],
  pose: function (u, c) {
    // Vid luckan eller vid bordet: handen upp över huvudet, två korta vinkningar. Lugnare än guest.waveWaiter.
    const up = win(u, 0.1, 0.86, 0.14), wv = Math.sin(u * TAU * 4) * win(u, 0.25, 0.72, 0.06);
    return withYaw(P(STAND, { torso: { pitch: -0.02, roll: 0.05 * up }, head: { pitch: -0.06 * up }, armR: A(0.1 + 2.5 * up, 0.12 + 0.16 * wv, 0.2 + 0.4 * up) }), (c.yaw ?? 0) * 0.3 * up, (c.yaw ?? 0) * 0.8 * up);
  }
}));

// ----- personalen -----

reg(def({
  id: 'staff.listenTilt', group: 'staff', roles: STAFF, loop: true, travel: false, base: 4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.listenTilt', 'staff.idle', 'staff.write', 'host.point', 'staff.walk', 'waiter.takeOrder'],
  pose: function (u, c) {
    // Lyssnar på en gäst: huvudet på sned mot gästen, lite framåt, händerna samlade framför. En nick per halvt varv.
    // Skillnaden mot staff.listen syns från 24 m: huvudets lutning och bålen som går mot gästen.
    const nod = 0.09 * Math.max(0, Math.sin(u * TAU * 2)), side = (c.yaw ?? 0) >= 0 ? 1 : -1;
    return breathe(withYaw(P(STAND, { torso: { pitch: 0.16, roll: 0.03 * side }, head: { pitch: 0.14 + nod, roll: 0.28 * side }, armL: A(0.4, 0.04, 1.35), armR: A(0.4, 0.04, 1.35) }), (c.yaw ?? 0) * 0.2, (c.yaw ?? 0) * 0.55), c.t ?? 0);
  }
}));

reg(def({
  id: 'waiter.wipeTable', group: 'waiter', roles: ['waiter', 'bartender', 'staff', 'host'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'napkin' }, ends: { R: 'napkin' }, events: [],
  next: ['waiter.wipeTable', 'staff.walk', 'staff.idle'],
  pose: function (u, c) {
    // Fram över bordet, vänster hand på kanten, höger med trasan i två breda svep per varv. Ståbordet (1,05 m) med ctx.high.
    const s = Math.sin(u * TAU * 2), hi = (c as any).high ? 1 : 0;
    return P(STAND, {
      lift: -0.04 * (1 - hi), torso: { pitch: 0.46 - 0.26 * hi, yaw: 0.14 * s }, head: { pitch: 0.34 - 0.1 * hi },
      armR: A(0.85 - 0.2 * hi + 0.05 * s, 0.14 + 0.24 * s, 0.35 + 0.25 * hi), armL: A(0.55 - 0.1 * hi, -0.04, 0.45),
      legL: { ...LEG_FRONT, knee: 0.22 * (1 - hi) + 0.08, ankle: 0.12 }, legR: { ...LEG_BACK, knee: 0.24 * (1 - hi) + 0.08 }
    });
  }
}));

// ----- gatan -----
// Gångarterna drivs av sträckan (ctx.phase) som guest.walk. Farten sätts av den som spelar dem (speed i manuset):
// lugn 0,85 × gästens gång, brådskande 1,45 ×, med barn 0,7 ×, med hund 0,9 ×.

reg(def({
  id: 'street.walkCalm', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.walkCalm', 'street.stopLook', 'street.greet', 'staff.idle', 'guest.walk'],
  pose: function (u, c) {
    // Promenaden: upprätt, korta armsvängar, blicken som går från sida till sida över fasaderna.
    const ph = c.phase ?? u, p = walking(P(STAND, { torso: { pitch: -0.03 } }), ph, (c.stride ?? 1) * 0.72, 'both');
    return withYaw({ ...p, head: { ...(p.head ?? {}), pitch: -0.02 } }, 0, 0.42 * Math.sin(ph * Math.PI * 0.35));
  }
}));

reg(def({
  id: 'street.walkHurried', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.walkHurried', 'street.walkCalm', 'staff.idle', 'guest.walk'],
  pose: function (u, c) {
    // Brådskande: bålen fram, huvudet ned, armarna böjda och pumpande, inga blickar åt sidan.
    const ph = c.phase ?? u, p = walking(P(STAND, { torso: { pitch: 0.16 } }), ph, (c.stride ?? 1) * 1.3, 'both');
    const s = Math.sin(ph * TAU);
    return { ...p, head: { pitch: 0.18, yaw: 0 }, armL: A(-0.55 * s, 0.1, 1.25), armR: A(0.55 * s, 0.1, 1.25) };
  }
}));

reg(def({
  id: 'street.walkWithChild', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.walkWithChild', 'street.stopLook', 'staff.idle'],
  pose: function (u, c) {
    // Den vuxna håller barnets hand med vänster hand (handed: höger med ctx.hand = 'L'): armen ned och ut, axeln sänkt
    // mot barnet, korta steg, blicken ned mot barnet var fjärde steg.
    const ph = c.phase ?? u, p = walking(STAND, ph, (c.stride ?? 1) * 0.7, 'R');
    const look = Math.max(0, Math.sin(ph * Math.PI * 0.5));
    return { ...p, torso: { ...(p.torso ?? {}), roll: -0.07 }, head: { pitch: 0.1 + 0.22 * look, yaw: -0.5 * look }, armL: A(0.14, 0.42, 0.12) };
  }
}));

reg(def({
  id: 'street.childWalk', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.childWalk', 'staff.idle'],
  pose: function (u, c) {
    // Barnet (heightMult 0,58) bredvid den vuxnas vänstra sida: höger arm upp till handen, studsande steg, blicken runt.
    const ph = c.phase ?? u, p = walking(STAND, ph, (c.stride ?? 1) * 1.15, 'L');
    return withYaw({ ...p, lift: (p.lift ?? 0) + 0.025 * Math.abs(Math.sin(ph * TAU)), armR: A(0.22, 1.05, 0.2) }, 0, 0.5 * Math.sin(ph * Math.PI * 0.6));
  }
}));

reg(def({
  id: 'street.walkWithDog', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: { R: 'any' }, ends: { R: 'any' }, events: [],
  next: ['street.walkWithDog', 'street.stopLook', 'staff.idle'],
  pose: function (u, c) {
    // Kopplet i höger hand, armen fram och ned mot hunden som går 0,9 m snett framför. Ett ryck i kopplet var tredje cykel.
    const ph = c.phase ?? u, p = walking(STAND, ph, (c.stride ?? 1) * 0.85, 'L');
    const tug = Math.max(0, Math.sin(ph * TAU / 3)) ** 6;
    return withYaw({ ...p, torso: { ...(p.torso ?? {}), pitch: (p.torso?.pitch ?? 0) + 0.03 * tug }, armR: A(0.55 + 0.12 * tug, 0.16, 0.42 - 0.1 * tug), head: { pitch: 0.16, yaw: 0 } }, 0.08, 0.25);
  }
}));

reg(def({
  id: 'street.stopLook', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 4.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.walkCalm', 'guest.walk', 'staff.idle'],
  pose: function (u, c) {
    // Stannar, vänder bålen och huvudet mot det som syns (ctx.yaw: skylten, ett upplyst fönster), lutar sig fram,
    // handen till hakan, en kort pekning med höger hand och tillbaka.
    const turn = win(u, 0.04, 0.94, 0.14), lean = win(u, 0.2, 0.8, 0.12), chin = win(u, 0.24, 0.56, 0.08), point = win(u, 0.58, 0.82, 0.06);
    return withYaw(P(STAND, {
      torso: { pitch: 0.04 + 0.1 * lean }, head: { pitch: 0.02 - 0.08 * lean },
      armR: blendArm(A(0.3 + 0.2 * chin, 0.12, 0.2 + 1.95 * chin), A(1.15, 0.28, 0.12), point / Math.max(0.001, point + chin)),
      armL: A(0.1 + 0.4 * chin, 0.06, 0.3 + 1.2 * chin)
    }), (c.yaw ?? 0) * 0.45 * turn, (c.yaw ?? 0) * 0.55 * turn);
  }
}));

reg(def({
  id: 'street.greet', group: 'guest', roles: ['guest', 'staff', 'host'], loop: false, travel: false, base: 3.8, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.62, type: 'give', hand: 'R', at: 'partner' }],
  next: ['street.walkCalm', 'staff.idle', 'guest.leanTalkStand'],
  pose: function (u, c) {
    // Ser någon man känner: handen högt och två vinkningar på håll, ett steg fram (root), handslag med nick, och tillbaka.
    // Båda spelar klippet mot varandra, den ena 0,25 s efter.
    const wave = win(u, 0.04, 0.38, 0.08), wv = Math.sin(u * TAU * 7) * win(u, 0.1, 0.34, 0.04);
    const shake = win(u, 0.5, 0.86, 0.06), pump = Math.sin(u * TAU * 8) * shake;
    return withYaw(P(STAND, {
      lift: 0.015 * wave, torso: { pitch: 0.02 + 0.1 * shake }, head: { pitch: -0.04 * wave + 0.12 * shake + 0.05 * pump },
      armR: blendArm(A(0.1 + 2.5 * wave, 0.18 + 0.16 * wv, 0.25 + 0.3 * wave), A(0.82, 0.06, 0.32 + 0.08 * pump), shake / Math.max(0.001, shake + wave))
    }), (c.yaw ?? 0) * 0.4, (c.yaw ?? 0) * 0.8);
  },
  root: function (u) { return [0, 0.32 * ramp(u, 0.36, 0.52), 0]; }
}));

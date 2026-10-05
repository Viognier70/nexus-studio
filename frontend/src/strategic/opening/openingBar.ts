// ORDER 308 — vinbarens två scener i öppningen: den tomma vinbaren och
// glimtarna av kvällen (Designs oppningManus emptyBar och glimpses). Var och
// en är en egen liten teater på en egen duk, som i prototypen (createTheatre i
// teaterScen.js): spelets vinbar (scene/wineBarRoom.ts) och spelets teater
// (scene/eventTheatre.ts, porten av teaterScen.js) med teaterns ljus, kamera
// och strålkastare. Inget hämtas från nätet; allt byggs i kod.

import * as THREE from 'three';
import { createWineBarRoom, updateCutaway, updateWineBarRoom, type MoodId, type WineBarRoom } from '../scene/wineBarRoom';
import { EventTheatre, theatreSeats } from '../scene/eventTheatre';
import type { EventScript } from '../scene/events/handelserManus';
import type { OpeningScene, OpeningView } from './oppningManus';
import { BAR_EXPOSURE_GAIN } from './openingLight';

/** Teaterns grundljus (teaterScen.js createTheatre: hemi 0,95, nyckel 1,5, fyll 0,25). */
const HEMI = 0.95;
const KEY = 1.5;
const FILL = 0.25;

export class OpeningBarStage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 200);
  readonly room: WineBarRoom;
  readonly theatre: EventTheatre;
  private readonly hemi: THREE.HemisphereLight;
  private readonly key: THREE.DirectionalLight;
  private readonly fill: THREE.DirectionalLight;
  private lastT = 0;

  constructor(canvas: HTMLCanvasElement, readonly script: OpeningScene) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // ORDER 308b — teaterns 1,3, höjd mot Designs skärmar (openingLight.ts).
    this.renderer.toneMappingExposure = 1.3 * BAR_EXPOSURE_GAIN;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#140d09');

    this.hemi = new THREE.HemisphereLight('#ffe0b8', '#3a2414', HEMI);
    this.key = new THREE.DirectionalLight('#ffd2a0', KEY);
    this.key.position.set(4, 14, 7);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -10, right: 10, top: 9, bottom: -9, near: 1, far: 50 });
    this.key.shadow.camera.updateProjectionMatrix();
    this.key.shadow.bias = -0.0004;
    this.fill = new THREE.DirectionalLight('#9aa4c8', FILL);
    this.fill.position.set(-6, 8, -4);
    this.scene.add(this.hemi, this.key, this.fill);

    // Rummet med golvet på y = 0 och utan tak (teaterScen.js load, set 'winebar').
    this.room = createWineBarRoom({ mood: (script.roomOpts?.mood ?? 'helg') as MoodId });
    this.room.group.position.y = -this.room.floorY;
    this.room.parts.roof.visible = false;
    this.room.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.scene.add(this.room.group);

    this.theatre = new EventTheatre(this.scene, 0, theatreSeats(this.room.seats), this.room.parts.djGlow);
    // Manuset har ingen takt-lista (beats): kameran står i scenens egen `cam`.
    this.theatre.load({ ...script, beats: { cam: [], spot: [], card: [], chapters: [] } } as EventScript);
  }

  /** Strålkastaren (teaterScen.js spot): resten av rummet ned till 1 − 0,55·k, en ljuspöl vid p. */
  spot(p: [number, number] | null, k: number): void {
    const d = 1 - 0.55 * k;
    this.hemi.intensity = HEMI * d;
    this.key.intensity = KEY * d;
    this.fill.intensity = FILL * d;
    this.room.group.traverse((o) => {
      const l = o as THREE.Light;
      if (!l.isLight) return;
      if (l.userData.base == null) l.userData.base = l.intensity;
      l.intensity = (l.userData.base as number) * d;
    });
    this.theatre.setSpot(p, k);
  }

  size(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /** En bildruta: scenens tid och kameran (teaterScen.js frame, setView, render). */
  draw(t: number, v: OpeningView): void {
    this.lastT = t;
    this.theatre.frame(t);
    const cp = Math.cos(v.pitch);
    this.camera.fov = v.fov || 42;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(v.tx + Math.sin(v.yaw) * cp * v.dist, v.ty + Math.sin(v.pitch) * v.dist, v.tz + Math.cos(v.yaw) * cp * v.dist);
    this.camera.lookAt(v.tx, v.ty, v.tz);
    updateCutaway(this.room, this.camera);
    updateWineBarRoom(this.room, this.lastT * 0.08, this.lastT);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.theatre.dispose();
    this.room.dispose();
    this.renderer.dispose();
  }
}

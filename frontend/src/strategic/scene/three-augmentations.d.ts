// three.js typaugmentation för ORDER 121:s figureRig.ts.
//
// Handoff-koden (`frontend/src/strategic/scene/figureRig.ts`, kopierad
// från `handoff/figureRig.ts`) läser `o.isMesh` och `o.geometry` i
// `measureFigure`-traversens callback. three.js sätter dessa flaggor på
// Mesh-instanser i runtime, men @types/three exponerar dem inte på
// basklassen `Object3D` — typechecken misslyckas mot handoff-källan
// som den står.
//
// Alternativet — att skriva om `measureFigure` med
// `instanceof THREE.Mesh` + `as THREE.BufferGeometry`-cast — skulle
// betyda en avvikelse i scenens kopia av figureRig.ts från handoff-
// leveransen. Denna .d.ts håller källan byte-identisk och isolerar
// kompatibilitetsfixen till en enda liten fil.
//
// Fälten är valfria för att inte tvinga andra Object3D-användningar i
// koden att hantera dem — en `if (o.isMesh)` är fortfarande frivillig
// och `o.geometry` kan vara undefined.

import 'three';

declare module 'three' {
  interface Object3D {
    /** three.js Mesh-instance-flagga; endast satt på Mesh-noder. */
    readonly isMesh?: boolean;
    /** Endast satt på Mesh-noder; kan vara undefined på andra Object3D. */
    readonly geometry?: BufferGeometry;
    /**
     * Endast satt på Mesh-noder. Tillagd 2026-08-30 (ORDER 142) för
     * `figureProps.ts:647` som läser `.material` på Object3D returnerad
     * av `Raycaster.intersectObject(head, true)[i].object`. Handoff-koden
     * antar single-material; call-sites gör null-check innan de rör `.color`.
     */
    readonly material?: Material | Material[];
  }
}

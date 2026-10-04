// ORDER 297b — drei <Instances> räknar om varje instans matris (decompose,
// compose) i varje bildruta som förval (frames = Infinity). Byns lager med
// stillastående instanser (träd, staket, gårdar, fönster …) behöver det bara
// när de har monterats eller renderats om: räknaren i <Instances> nollställs
// vid varje rendering, så de här bildrutorna räcker också efter en ändring.
// Tre, så att instansernas världsmatriser hunnit räknas av en rendering först.
export const STATIC_INSTANCE_FRAMES = 3;

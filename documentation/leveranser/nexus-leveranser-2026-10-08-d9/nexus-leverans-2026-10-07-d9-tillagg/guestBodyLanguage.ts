// guestBodyLanguage.ts — när kropparna utanför visar vad gästen känner. Tillägg till D9, 2026-10-07.
//
// Ingen stämningssymbol utomhus (beslut 2026-10-07). Spelaren läser gästerna på kroppsspråket. Klippen finns i
// tillaggClips.ts. Gränserna är platshållare från balance.ts.

export const STREET_BODY_LANGUAGE = {
  /** I kön: efter en stund tittar gästen på klockan, sedan igen med jämna mellanrum. Förskjutet per gäst. */
  queueWatch: { clip: 'guest.checkWatch', afterS: 'QUEUE.patienceS', everyS: 'QUEUE.watchEveryS', offsetPerGuestS: 1.5, prototype: { afterS: 7, everyS: 6 } },
  /** Kallt (truckWeather.ts cool): alla som står still har armarna i kors. Kön, de nyfikna och rivalens kö. */
  cold: { clip: 'guest.armsCrossed', who: ['queue', 'curious.hesitate', 'curious.shakeHead', 'rivalQueue'], notWhen: ['äter', 'håller något', 'går'] },
  /** De nyfikna: en blick på klockan mellan att lukta och tveka, och ett halvt steg mot kön medan de tvekar. */
  curious: ['guest.smellPoint', 'guest.checkWatch', 'guest.hesitate'],
  /** Fel svar på kortet: ett skakat huvud innan gästen går vidare. Nästan: en blick på klockan mitt i tvekan. */
  afterCard: { wrong: 'guest.shakeHead', ok: 'guest.checkWatch' }
};
